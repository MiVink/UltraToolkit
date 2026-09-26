import { useEffect, useState } from 'react';
import type { ToolMeta } from '../config/catalog';
import { isRasterFile } from '../config/catalog';
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
  probeImage,
  resizeImage,
  transformImage,
  type CompressFormat,
  type ProcessResult,
} from '../tools/images';

const GLYPHS: Record<string, string> = {
  'png-to-jpg': 'PJ',
  'jpg-to-png': 'JP',
  'svg-to-png': 'SV',
  compress: 'CQ',
  resize: 'RZ',
  rotate: 'RT',
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
          <h3>{t(`tool.${tool.id}.title`)}</h3>
          <div className="tool-tagline">{t(`tool.${tool.id}.tag`)}</div>
        </div>
      </div>
      <p className="tool-desc">{t(`tool.${tool.id}.desc`)}</p>
      <div className="tool-foot">
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

  // compress
  const [quality, setQuality] = useState(0.8);
  const [format, setFormat] = useState<CompressFormat>('image/jpeg');
  // svg
  const [svgSize, setSvgSize] = useState(1024);
  // resize
  const [orig, setOrig] = useState<{ w: number; h: number } | null>(null);
  const [pct, setPct] = useState(50);
  const [custom, setCustom] = useState(false);
  const [cw, setCw] = useState(800);
  const [ch, setCh] = useState(600);
  const [lock, setLock] = useState(true);
  // rotate
  const [deg, setDeg] = useState<0 | 90 | 180 | 270>(0);
  const [flipH, setFlipH] = useState(false);
  const [flipV, setFlipV] = useState(false);

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
    setOrig(null);
    setDeg(0);
    setFlipH(false);
    setFlipV(false);
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
    if ((tool.id === 'compress' || tool.id === 'resize' || tool.id === 'rotate') && !isRasterFile(f)) {
      setError(fail('badImg'));
      setFile(null);
      return;
    }
    setError(null);
    setFile(f);
    setPhase('ready');
    if (tool.id === 'resize') {
      setOrig(null);
      probeImage(f)
        .then((d) => {
          setOrig(d);
          setCw(Math.max(1, Math.round((d.w * pct) / 100)));
          setCh(Math.max(1, Math.round((d.h * pct) / 100)));
        })
        .catch(() => setOrig(null));
    }
  };

  const outW = orig ? (custom ? cw : Math.max(1, Math.round((orig.w * pct) / 100))) : 0;
  const outH = orig ? (custom ? ch : Math.max(1, Math.round((orig.h * pct) / 100))) : 0;

  const onCw = (v: number) => {
    setCw(v);
    if (lock && orig && orig.w > 0) setCh(Math.max(1, Math.round((v * orig.h) / orig.w)));
  };
  const onCh = (v: number) => {
    setCh(v);
    if (lock && orig && orig.h > 0) setCw(Math.max(1, Math.round((v * orig.w) / orig.h)));
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
      else if (tool.id === 'resize') {
        let dims = orig;
        if (!dims) dims = await probeImage(file);
        const w = custom ? cw : Math.max(1, Math.round((dims.w * pct) / 100));
        const h = custom ? ch : Math.max(1, Math.round((dims.h * pct) / 100));
        const fmt: CompressFormat =
          file.type === 'image/png' ? 'image/png' : file.type === 'image/webp' ? 'image/webp' : 'image/jpeg';
        out = await resizeImage(file, { width: w, height: h, format: fmt, quality: 0.9 });
      } else if (tool.id === 'rotate') {
        out = await transformImage(file, { rotate: deg, flipH, flipV });
      } else out = await compressImage(file, quality, format);
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

      {file && preview && tool.id !== 'rotate' && (
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
              {tool.id === 'resize' && orig && ` · ${orig.w}×${orig.h}px`}
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

      {file && preview && tool.id === 'rotate' && (
        <div className="preview-big">
          <img
            src={preview}
            alt={file.name}
            style={{ transform: `rotate(${deg}deg) scaleX(${flipH ? -1 : 1}) scaleY(${flipV ? -1 : 1})` }}
          />
          <div className="fname">{file.name} · {formatBytes(file.size, lang)}</div>
        </div>
      )}

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

        {tool.id === 'resize' && (
          <>
            <div className="seg" role="group" aria-label={t('ws.scale')}>
              {[25, 50, 75].map((p) => (
                <button
                  key={p}
                  className={!custom && pct === p ? 'on' : ''}
                  onClick={() => {
                    setCustom(false);
                    setPct(p);
                    if (orig) {
                      setCw(Math.max(1, Math.round((orig.w * p) / 100)));
                      setCh(Math.max(1, Math.round((orig.h * p) / 100)));
                    }
                  }}
                >
                  {p}%
                </button>
              ))}
              <button className={custom ? 'on' : ''} onClick={() => setCustom(true)}>
                {t('ws.exact')}
              </button>
            </div>
            {custom && (
              <div className="num-grid">
                <label className="field">
                  {t('ws.width')}
                  <input
                    type="number"
                    min={1}
                    max={8000}
                    value={cw}
                    onChange={(e) => onCw(Math.max(1, Number(e.target.value) || 1))}
                  />
                </label>
                <label className="field">
                  {t('ws.height')}
                  <input
                    type="number"
                    min={1}
                    max={8000}
                    value={ch}
                    onChange={(e) => onCh(Math.max(1, Number(e.target.value) || 1))}
                  />
                </label>
                <label className="check">
                  <input type="checkbox" checked={lock} onChange={(e) => setLock(e.target.checked)} />
                  {t('ws.lock')}
                </label>
              </div>
            )}
            {orig && outW > 0 && <div className="status busy">{t('ws.outSize', { w: outW, h: outH })}</div>}
          </>
        )}

        {tool.id === 'rotate' && (
          <div className="seg" role="group" aria-label={t(`tool.${tool.id}.title`)}>
            <button onClick={() => setDeg(((deg + 270) % 360) as 0 | 90 | 180 | 270)}>{t('ws.rotL')}</button>
            <button onClick={() => setDeg(((deg + 90) % 360) as 0 | 90 | 180 | 270)}>{t('ws.rotR')}</button>
            <button className={flipH ? 'on' : ''} onClick={() => setFlipH((v) => !v)}>
              {t('ws.flipH')}
            </button>
            <button className={flipV ? 'on' : ''} onClick={() => setFlipV((v) => !v)}>
              {t('ws.flipV')}
            </button>
            <button
              onClick={() => {
                setDeg(0);
                setFlipH(false);
                setFlipV(false);
              }}
            >
              {t('ws.reset')}
            </button>
          </div>
        )}
      </div>

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
