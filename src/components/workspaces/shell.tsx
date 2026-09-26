import { useEffect, useState } from 'react';
import { useLang } from '../../i18n/lang';
import Dropzone from '../Dropzone';
import { downloadBlob, formatBytes, errorCode, type ProcessResult } from '../../tools/images';

export type Phase = 'idle' | 'ready' | 'busy' | 'done';

interface Err {
  code: string;
  vars?: Record<string, string | number>;
}

export interface Job {
  lang: string;
  t: (key: string, vars?: Record<string, string | number>) => string;
  file: File | null;
  preview: string | null;
  phase: Phase;
  error: Err | null;
  result: ProcessResult | null;
  resultUrl: string | null;
  fail: (code: string, vars?: Record<string, string | number>) => void;
  handleFile: (f: File) => void;
  clearFile: () => void;
  runWith: (fn: () => Promise<ProcessResult>) => Promise<void>;
}

/**
 * Спільний стан одного файлу: превʼю, фаза, помилки (кодами → i18n), результат.
 * Перевірка типу — через check(), ліміт розміру — через maxMB.
 */
export function useJob(check: (f: File) => string | null, maxMB = 30, onFile?: (f: File) => void): Job {
  const { lang, t } = useLang();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>('idle');
  const [error, setError] = useState<Err | null>(null);
  const [result, setResult] = useState<ProcessResult | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);

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

  const fail = (code: string, vars?: Record<string, string | number>) => {
    setError({ code, vars });
    setPhase('ready');
  };

  const handleFile = (f: File) => {
    setResult(null);
    if (f.size === 0) {
      setFile(null);
      setError({ code: 'empty' });
      setPhase('idle');
      return;
    }
    if (f.size > maxMB * 1024 * 1024) {
      setFile(null);
      setError({ code: 'tooBig', vars: { size: formatBytes(f.size, lang), limit: maxMB } });
      setPhase('idle');
      return;
    }
    const code = check(f);
    if (code) {
      setFile(null);
      setError({ code });
      setPhase('idle');
      return;
    }
    setError(null);
    setFile(f);
    setPhase('ready');
    onFile?.(f);
  };

  const clearFile = () => {
    setFile(null);
    setResult(null);
    setError(null);
    setPhase('idle');
  };

  const runWith = async (fn: () => Promise<ProcessResult>) => {
    if (!file) {
      setError({ code: 'noFile' });
      return;
    }
    setError(null);
    setResult(null);
    setPhase('busy');
    try {
      await new Promise((r) => setTimeout(r, 30));
      const out = await fn();
      setResult(out);
      setPhase('done');
    } catch (e) {
      setError({ code: errorCode(e) });
      setPhase('ready');
    }
  };

  return { lang, t, file, preview, phase, error, result, resultUrl, fail, handleFile, clearFile, runWith };
}

export function errText(t: Job['t'], e: Err | null): string | null {
  if (!e) return null;
  const s = t(`err.${e.code}`, e.vars);
  return s === `err.${e.code}` ? t('err.unknown') : s;
}

export function FileRow({
  name,
  meta,
  thumb,
  onRemove,
}: {
  name: string;
  meta: string;
  thumb: string | null;
  onRemove: () => void;
}) {
  const { t } = useLang();
  return (
    <div className="file-row">
      {thumb && <img className="thumb" src={thumb} alt={name} />}
      <div style={{ minWidth: 0 }}>
        <div className="fname">{name}</div>
        <div className="fsize">{meta}</div>
      </div>
      <button className="linklike" onClick={onRemove}>
        {t('ws.remove')}
      </button>
    </div>
  );
}

export function ResultView({ result, url }: { result: ProcessResult; url: string }) {
  const { lang, t } = useLang();
  const saving =
    result.sizeBefore > 0 ? Math.round((1 - result.sizeAfter / result.sizeBefore) * 100) : 0;
  return (
    <div className="result">
      <img src={url} alt={result.fileName} />
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
  );
}

export function RunBar({
  canRun,
  busy,
  onRun,
  result,
}: {
  canRun: boolean;
  busy: boolean;
  onRun: () => void;
  result: ProcessResult | null;
}) {
  const { t } = useLang();
  return (
    <div className="action-row">
      <button className="btn btn-primary" onClick={onRun} disabled={!canRun || busy} style={{ opacity: !canRun ? 0.55 : 1 }}>
        {busy ? (
          <>
            <span className="spinner" aria-hidden="true" /> {t('ws.busy')}
          </>
        ) : (
          t('ws.convert')
        )}
      </button>
      {result && (
        <button className="btn btn-ghost" onClick={() => downloadBlob(result.blob, result.fileName)}>
          {t('ws.download')} · {result.fileName}
        </button>
      )}
    </div>
  );
}

export function Seg<T extends string | number>({
  legend,
  options,
  value,
  onPick,
}: {
  legend: string;
  options: { value: T; label: string }[];
  value: T;
  onPick: (v: T) => void;
}) {
  return (
    <div className="seg" role="group" aria-label={legend}>
      {options.map((o) => (
        <button key={String(o.value)} className={value === o.value ? 'on' : ''} onClick={() => onPick(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function ShellTop({
  accept,
  extensions,
  hint,
  onFile,
}: {
  accept: string;
  extensions: string;
  hint: string;
  onFile: (f: File) => void;
}) {
  return (
    <>
      <Dropzone accept={accept} extensions={extensions} onFile={onFile} />
      <div className="status busy">{hint}</div>
    </>
  );
}
