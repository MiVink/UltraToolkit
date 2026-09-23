import { useEffect, useState } from 'react';
import type { ToolMeta } from '../config/catalog';
import Dropzone from './Dropzone';
import { useLang } from '../i18n/lang';
import {
  compressImage,
  convertJpgToPng,
  convertPngToJpg,
  convertSvgToPng,
  downloadBlob,
  errorCode,
  formatBytes,
  type CompressFormat,
  type ProcessResult,
} from '../tools/images';

const GLYPHS: Record<string, string> = {
  'png-to-jpg': 'PJ',
  'jpg-to-png': 'JP',
  'svg-to-png': 'SV',
  compress: 'CQ',
};

type Phase = 'idle' | 'ready' | 'busy' | 'done';

export default function ToolCard({ tool, open, onToggle }: { tool: ToolMeta; open: boolean; onToggle: () => void }) {
  const { t } = useLang();
  return (
    <article className={`tool-card${open ? ' open' : ''}`}>
      <div className="tool-top">
        <span className="tool-glyph" aria-hidden="true">
          {GLYPHS[tool.id] ?? 'UT'}
        </span>
        <div>
          <h3>{tool.title}</h3>
          <div className="tool-tagline">{t(`tool.${tool.id}.tag`)}</div>
        </div>
      </div>
      <p className="tool-desc">{t(`tool.${tool.id}.desc`)}</p>
      <div className="tool-foot">
        {tool.badge && <span className={`chip${tool.badge === 'hit' ? ' hot' : ''}`}>{t(`badge.${tool.badge}`)}</span>}
        <span className="chip">{tool.extensions}</span>
        <button className="tool-open-btn" onClick={onToggle} aria-expanded={open}>
          {open ? t('card.close') : t('card.open')}
        </button>
      </div>
      {open && <Workspace tool={tool} />}
    </article>
  );
}

function Workspace({ tool }: { tool: ToolMeta }) {
  const { lang, t } = useLang();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>('idle');
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ProcessResult | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);

  const [quality, setQuality] = useState(0.8);
  const [format, setFormat] = useState<CompressFormat>('image/jpeg');
  const [svgSize, setSvgSize] = useState(1024);

  useEffect(() => {
    if (!file) {
      setPreview(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  useEffect(() => {
    if (!result) {
      setResultUrl(null);
      return;
    }
    const url = URL.createObjectURL(result.blob);
    setResultUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [result]);

  useEffect(() => {
    setFile(null);
    setResult(null);
    setError(null);
    setPhase('idle');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tool.id, lang]);

  const fail = (code: string, vars?: Record<string, string | number>) =>
    t(`err.${code}`, vars) === `err.${code}` ? t('err.unknown') : t(`err.${code}`, vars);

  const handleFile = (f: File) => {
    const max = (tool.maxSizeMB ?? 30) * 1024 * 1024;
    setResult(null);
    if (f.size === 0) {
      setFile(null);
      setError(fail('empty'));
      setPhase('idle');
      return;
    }
    if (f.size > max) {
      setFile(null);
      setError(fail('tooBig', { size: formatBytes(f.size, lang), limit: tool.maxSizeMB ?? 30 }));
      setPhase('idle');
      return;
    }
    const name = f.name.toLowerCase();
    if (tool.id === 'png-to-jpg' && !(f.type === 'image/png' || name.endsWith('.png'))) {
      setError(fail('badPng'));
      setFile(null);
      return;
    }
    if (tool.id === 'jpg-to-png' && !(f.type === 'image/jpeg' || name.endsWith('.jpg') || name.endsWith('.jpeg'))) {
      setError(fail('badJpg'));
      setFile(null);
      return;
    }
    if (tool.id === 'svg-to-png' && !(f.type === 'image/svg+xml' || name.endsWith('.svg'))) {
      setError(fail('badSvg'));
      setFile(null);
      return;
    }
    if (
      tool.id === 'compress' &&
      !['image/jpeg', 'image/png', 'image/webp'].includes(f.type) &&
      !/\.(jpe?g|png|webp)$/.test(name)
    ) {
      setError(fail('badImg'));
      setFile(null);
      return;
    }
    setError(null);
    setFile(f);
    setPhase('ready');
  };

  const run = async () => {
    if (!file) {
      setError(fail('noFile'));
      return;
    }
    setError(null);
    setResult(null);
    setPhase('busy');
    try {
      await new Promise((r) => setTimeout(r, 30));
      let out: ProcessResult;
      if (tool.id === 'png-to-jpg') out = await convertPngToJpg(file);
      else if (tool.id === 'jpg-to-png') out = await convertJpgToPng(file);
      else if (tool.id === 'svg-to-png') out = await convertSvgToPng(file, svgSize);
      else out = await compressImage(file, quality, format);
      setResult(out);
      setPhase('done');
    } catch (e) {
      setPhase('ready');
      setError(fail(errorCode(e)));
    }
  };

  const saving = result && result.sizeBefore > 0 ? Math.round((1 - result.sizeAfter / result.sizeBefore) * 100) : 0;

  return (
    <div className="workspace">
      <Dropzone accept={tool.accept} extensions={tool.extensions} onFile={handleFile} />
      <div className="status busy">{t(`ws.hint.${tool.id}`)}</div>

      {file && preview && (
        <div className="file-row">
          {tool.id === 'svg-to-png' ? (
            <span className="tool-glyph" aria-hidden="true" style={{ width: 44, height: 44 }}>
              SVG
            </span>
          ) : (
            <img className="thumb" src={preview} alt={file.name} />
          )}
          <div style={{ minWidth: 0 }}>
            <div className="fname">{file.name}</div>
            <div className="fsize">
              {formatBytes(file.size, lang)} · {file.type || t('ws.unknownType')}
            </div>
          </div>
          <button
            className="linklike"
            onClick={() => {
              setFile(null);
              setResult(null);
              setPhase('idle');
            }}
          >
            {t('ws.remove')}
          </button>
        </div>
      )}

      {(tool.id === 'compress' || tool.id === 'svg-to-png') && (
        <div className="controls">
          {tool.id === 'compress' && (
            <>
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
              <div className="seg" role="group" aria-label="format">
                {(
                  [
                    ['image/jpeg', 'JPEG'],
                    ['image/webp', 'WebP'],
                    ['image/png', 'PNG'],
                  ] as [CompressFormat, string][]
                ).map(([v, label]) => (
                  <button key={v} className={format === v ? 'on' : ''} onClick={() => setFormat(v)}>
                    {label}
                  </button>
                ))}
              </div>
            </>
          )}
          {tool.id === 'svg-to-png' && (
            <div className="seg" role="group" aria-label={t('ws.svgWidth')}>
              {[512, 1024, 2048].map((s) => (
                <button key={s} className={svgSize === s ? 'on' : ''} onClick={() => setSvgSize(s)}>
                  {s}px
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="action-row">
        <button
          className="btn btn-primary"
          onClick={run}
          disabled={!file || phase === 'busy'}
          style={{ opacity: !file ? 0.55 : 1 }}
        >
          {phase === 'busy' ? (
            <>
              <span className="spinner" aria-hidden="true" /> {t('ws.busy')}
            </>
          ) : (
            t('ws.convert')
          )}
        </button>
        {result && (
          <button className="btn btn-ghost" onClick={() => result && downloadBlob(result.blob, result.fileName)}>
            {t('ws.download')} · {result.fileName}
          </button>
        )}
      </div>

      {error && (
        <div className="status error" role="alert">
          {error}
        </div>
      )}

      {result && resultUrl && (
        <div className="result">
          <img src={resultUrl} alt={result.fileName} />
          <div className="rmeta">
            <b>{result.fileName}</b>
            <br />
            {t('ws.meta', {
              w: result.width,
              h: result.height,
              a: formatBytes(result.sizeBefore, lang),
              b: formatBytes(result.sizeAfter, lang),
            })}
            {saving > 0 && (
              <>
                {' '}
                · <span className="save">{t('ws.saved', { p: saving })}</span>
              </>
            )}
            {saving < 0 && (
              <>
                {' '}
                · <span className="save">{t('ws.grew', { p: Math.abs(saving) })}</span>
              </>
            )}
          </div>
        </div>
      )}
      {phase === 'done' && !error && <div className="status ok">{t('ws.done')}</div>}
    </div>
  );
}
