import { useEffect, useRef, useState } from 'react';
import type { ToolMeta } from '../../config/catalog';
import { isRasterFile } from '../../config/catalog';
import { useLang } from '../../i18n/lang';
import Dropzone from '../Dropzone';
import {
  convertGeneric,
  downloadBlob,
  formatBytes,
  keepFormat,
  probeImage,
  resizeImage,
  type CompressFormat,
  type ProcessResult,
} from '../../tools/images';
import { inspectImage, stripMetadata } from '../../tools/metadata';
import { generateFavicon, type FavSet } from '../../tools/favicon';
import { FileRow, ResultView, Seg, ShellTop, errText, useJob } from './shell';

function rasterCheck(f: File): string | null {
  return isRasterFile(f) ? null : 'badImg';
}

/* ---------------- Чистка метаданих ---------------- */

export function MetadataWS({ tool }: { tool: ToolMeta }) {
  const [findings, setFindings] = useState<string[] | null>(null);
  const [scanning, setScanning] = useState(false);
  const [removed, setRemoved] = useState<number | null>(null);
  // Лічильник сканувань: захищає від гонки, коли файл замінили під час аналізу
  // (інакше вердикт «чистий» може стосуватися попереднього файлу).
  const scanId = useRef(0);

  const j = useJob(rasterCheck, tool.maxSizeMB, (f) => {
    setFindings(null);
    setRemoved(null);
    setScanning(true);
    const id = ++scanId.current;
    inspectImage(f)
      .then((r) => id === scanId.current && setFindings(r))
      .catch(() => id === scanId.current && j.fail('read'))
      .finally(() => id === scanId.current && setScanning(false));
  });

  const run = () =>
    j.runWith(async () => {
      const out = await stripMetadata(j.file!, findings ?? []);
      setRemoved(out.removed);
      return out;
    });

  return (
    <div className="workspace">
      <ShellTop accept={tool.accept} extensions={tool.extensions} hint={j.t(`ws.hint.${tool.id}`)} onFile={j.handleFile} />
      {j.file && (
        <FileRow
          name={j.file.name}
          meta={`${formatBytes(j.file.size, j.lang)} · ${j.file.type || j.t('ws.unknownType')}`}
          thumb={j.preview}
          onRemove={() => {
            scanId.current++;
            j.clearFile();
            setFindings(null);
            setRemoved(null);
          }}
        />
      )}
      {scanning && <div className="status busy">{j.t('ws.stBusy')}</div>}
      {!scanning && findings && findings.length > 0 && (
        <div className="status error">{j.t('meta.found', { list: findings.map((k) => j.t(k)).join(' · ') })}</div>
      )}
      {!scanning && findings && findings.length === 0 && <div className="status ok">{j.t('meta.none')}</div>}

      <div className="action-row">
        <button
          className="btn btn-primary"
          onClick={run}
          disabled={!j.file || j.phase === 'busy'}
          style={{ opacity: !j.file ? 0.55 : 1 }}
        >
          {j.phase === 'busy' ? (
            <>
              <span className="spinner" aria-hidden="true" /> {j.t('ws.busy')}
            </>
          ) : (
            j.t('ws.clean')
          )}
        </button>
        {j.result && (
          <button className="btn btn-ghost" onClick={() => j.result && downloadBlob(j.result.blob, j.result.fileName)}>
            {j.t('ws.download')} · {j.result.fileName}
          </button>
        )}
      </div>

      {j.error && (
        <div className="status error" role="alert">
          {errText(j.t, j.error)}
        </div>
      )}
      {j.result && j.resultUrl && <ResultView result={j.result} url={j.resultUrl} />}
      {j.phase === 'done' && !j.error && removed !== null && (
        <div className="status ok">{j.t('meta.cleaned', { n: removed })}</div>
      )}
    </div>
  );
}

/* ---------------- Пакетна обробка ---------------- */

type BatchFmt = 'keep' | CompressFormat;

interface BatchRow {
  id: number;
  file: File;
  url: string;
  status: 'wait' | 'busy' | 'done' | 'error';
  note: string;
  blob: Blob | null;
  outName: string;
}

let batchSeq = 0;

async function processOne(f: File, fmt: BatchFmt, quality: number, maxSide: number): Promise<ProcessResult> {
  const target: CompressFormat = fmt === 'keep' ? keepFormat(f) : fmt;
  const d = await probeImage(f);
  if (maxSide > 0 && Math.max(d.w, d.h) > maxSide) {
    const k = maxSide / Math.max(d.w, d.h);
    return resizeImage(f, {
      width: Math.round(d.w * k),
      height: Math.round(d.h * k),
      format: target,
      quality,
    });
  }
  return convertGeneric(f, target, quality);
}

function BatchRowView({ row }: { row: BatchRow }) {
  const { lang, t } = useLang();
  const sub =
    row.status === 'wait'
      ? formatBytes(row.file.size, lang)
      : row.status === 'busy'
        ? t('ws.stBusy')
        : row.status === 'done'
          ? row.note
          : t('ws.stErr');
  return (
    <div className="file-row">
      <img className="thumb" src={row.url} alt={row.file.name} />
      <div style={{ minWidth: 0 }}>
        <div className="fname">{row.file.name}</div>
        <div className="fsize">{sub}</div>
      </div>
      <span className={`batch-dot ${row.status}`} aria-hidden="true" />
    </div>
  );
}

export function BatchWS({ tool }: { tool: ToolMeta }) {
  const { lang, t } = useLang();
  const [rows, setRows] = useState<BatchRow[]>([]);
  const [format, setFormat] = useState<BatchFmt>('keep');
  const [quality, setQuality] = useState(0.85);
  const [maxSide, setMaxSide] = useState(0);
  const [busy, setBusy] = useState(false);
  const [summary, setSummary] = useState<{ ok: number; total: number } | null>(null);
  const [prog, setProg] = useState<{ ok: number; total: number } | null>(null);

  // Дзеркало рядків для прибирання object URL при розмонтуванні
  // (воркспейс розмонтується при згорнутті картки — без цього URL-и течуть).
  const rowsRef = useRef(rows);
  rowsRef.current = rows;
  useEffect(() => () => rowsRef.current.forEach((r) => URL.revokeObjectURL(r.url)), []);

  const patch = (id: number, p: Partial<BatchRow>) => setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...p } : r)));

  const addFiles = (files: File[]) => {
    const max = (tool.maxSizeMB ?? 30) * 1024 * 1024;
    const next: BatchRow[] = files.slice(0, 20).map((f) => {
      const bad = f.size === 0 || f.size > max || !isRasterFile(f);
      return {
        id: ++batchSeq,
        file: f,
        url: URL.createObjectURL(f),
        status: bad ? 'error' : 'wait',
        note: '',
        blob: null,
        outName: f.name,
      } as BatchRow;
    });
    setRows((rs) => [...rs, ...next]);
    setSummary(null);
  };

  const clear = () => {
    rows.forEach((r) => URL.revokeObjectURL(r.url));
    setRows([]);
    setSummary(null);
  };

  const processAll = async () => {
    const pending = rows.filter((r) => r.status === 'wait');
    if (pending.length === 0 || busy) return;
    setBusy(true);
    setSummary(null);
    setProg({ ok: 0, total: pending.length });
    let ok = 0;
    let processed = 0;
    for (const r of pending) {
      patch(r.id, { status: 'busy' });
      try {
        const out = await processOne(r.file, format, quality, maxSide);
        patch(r.id, {
          status: 'done',
          note: `${formatBytes(r.file.size, lang)} → ${formatBytes(out.blob.size, lang)}`,
          blob: out.blob,
          outName: out.fileName,
        });
        ok++;
      } catch {
        patch(r.id, { status: 'error' });
      }
      processed++;
      setProg({ ok: processed, total: pending.length });
    }
    setBusy(false);
    setSummary({ ok, total: pending.length });
  };

  const downloadAll = async () => {
    for (const r of rows.filter((r) => r.status === 'done' && r.blob)) {
      downloadBlob(r.blob!, r.outName);
      await new Promise((res) => setTimeout(res, 700));
    }
  };

  const hasWait = rows.some((r) => r.status === 'wait');
  const hasDone = rows.some((r) => r.status === 'done');

  return (
    <div className="workspace">
      <Dropzone accept={tool.accept} extensions={tool.extensions} multiple onFiles={addFiles} />
      <div className="status busy">{t(`ws.hint.${tool.id}`)}</div>
      {rows.length > 0 && (
        <>
          <div className="batch-list">
            {rows.map((r) => (
              <BatchRowView key={r.id} row={r} />
            ))}
          </div>
          <div className="controls">
            <Seg<BatchFmt>
              legend={t('ws.formatOut')}
              value={format}
              onPick={setFormat}
              options={[
                { value: 'keep', label: t('ws.formatKeep') },
                { value: 'image/jpeg', label: 'JPEG' },
                { value: 'image/webp', label: 'WebP' },
                { value: 'image/png', label: 'PNG' },
              ]}
            />
            {format !== 'image/png' && (
              <div className="slider-row">
                <label>
                  {t('ws.quality')} <b>{Math.round(quality * 100)}%</b>
                </label>
                <input
                  type="range"
                  min={10}
                  max={100}
                  value={Math.round(quality * 100)}
                  onChange={(e) => setQuality(Number(e.target.value) / 100)}
                  aria-label={t('ws.quality')}
                />
              </div>
            )}
            <Seg<number>
              legend={t('ws.maxSide')}
              value={maxSide}
              onPick={setMaxSide}
              options={[
                { value: 0, label: t('ws.noChange') },
                { value: 1280, label: '1280px' },
                { value: 1920, label: '1920px' },
              ]}
            />
          </div>
          <div className="action-row">
            <button className="btn btn-primary" onClick={processAll} disabled={busy || !hasWait}>
              {busy ? (
                <>
                  <span className="spinner" aria-hidden="true" /> {t('ws.busy')}
                </>
              ) : (
                t('ws.processAll')
              )}
            </button>
            {hasDone && (
              <button className="btn btn-ghost" onClick={downloadAll}>
                {t('ws.downloadAll')}
              </button>
            )}
            <button className="btn btn-ghost" onClick={clear}>
              {t('ws.remove')}
            </button>
          </div>
          <div className="status busy">
            {busy && prog ? t('ws.batchProgress', prog) : t('ws.batchNote')}
          </div>
          {summary && (
            <div className="status ok">{t('ws.batchDone', { ok: summary.ok, n: summary.total })}</div>
          )}
        </>
      )}
    </div>
  );
}

/* ---------------- Генератор favicon ---------------- */

export function FaviconWS({ tool }: { tool: ToolMeta }) {
  const [set, setFav] = useState<FavSet | null>(null);
  const j = useJob(rasterCheck, tool.maxSizeMB, () => setFav(null));

  const run = () =>
    j.runWith(async () => {
      const s = await generateFavicon(j.file!);
      setFav(s);
      return {
        blob: s.ico,
        fileName: 'favicon.ico',
        width: 48,
        height: 48,
        sizeBefore: j.file!.size,
        sizeAfter: s.ico.size,
        mime: 'image/x-icon',
      };
    });

  return (
    <div className="workspace">
      <ShellTop
        accept={tool.accept}
        extensions={tool.extensions}
        hint={j.t(`ws.hint.${tool.id}`)}
        onFile={j.handleFile}
      />
      {j.file && (
        <FileRow
          name={j.file.name}
          meta={formatBytes(j.file.size, j.lang)}
          thumb={j.preview}
          onRemove={() => {
            j.clearFile();
            setFav(null);
          }}
        />
      )}
      <div className="action-row">
        <button
          className="btn btn-primary"
          onClick={run}
          disabled={!j.file || j.phase === 'busy'}
          style={{ opacity: !j.file ? 0.55 : 1 }}
        >
          {j.phase === 'busy' ? (
            <>
              <span className="spinner" aria-hidden="true" /> {j.t('ws.busy')}
            </>
          ) : (
            j.t('ws.generate')
          )}
        </button>
        {set && (
          <button className="btn btn-ghost" onClick={() => downloadBlob(set.ico, 'favicon.ico')}>
            {j.t('ws.download')} · favicon.ico
          </button>
        )}
      </div>
      {set && (
        <div className="batch-list">
          {set.pngs.map((p) => (
            <div key={p.size} className="file-row">
              <div style={{ minWidth: 0 }}>
                <div className="fname">{p.fileName}</div>
                <div className="fsize">
                  {p.size}×{p.size}px · {formatBytes(p.blob.size, j.lang)}
                </div>
              </div>
              <button className="tool-open-btn" onClick={() => downloadBlob(p.blob, p.fileName)}>
                {j.t('ws.download')}
              </button>
            </div>
          ))}
        </div>
      )}
      {j.error && (
        <div className="status error" role="alert">
          {errText(j.t, j.error)}
        </div>
      )}
      {j.phase === 'done' && !j.error && <div className="status ok">{j.t('ws.done')}</div>}
    </div>
  );
}
