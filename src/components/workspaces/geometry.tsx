import { useEffect, useRef, useState } from 'react';
import type { ToolMeta } from '../../config/catalog';
import { isRasterFile } from '../../config/catalog';
import {
  cropImage,
  downloadBlob,
  formatBytes,
  keepFormat,
  probeImage,
  resizeImage,
  transformImage,
  type CropRect,
} from '../../tools/images';
import { FileRow, ResultView, RunBar, Seg, ShellTop, errText, useJob } from './shell';

function rasterCheck(f: File): string | null {
  return isRasterFile(f) ? null : 'badImg';
}

export function ResizeWS({ tool }: { tool: ToolMeta }) {
  const [pct, setPct] = useState(50);
  const [custom, setCustom] = useState(false);
  const [cw, setCw] = useState(800);
  const [ch, setCh] = useState(600);
  const [lock, setLock] = useState(true);
  const [orig, setOrig] = useState<{ w: number; h: number } | null>(null);
  // Гонка: якщо файл замінили під час probe, відповідь попереднього — ігноруємо
  const probeId = useRef(0);

  const j = useJob(rasterCheck, tool.maxSizeMB, (f) => {
    setOrig(null);
    const id = ++probeId.current;
    probeImage(f)
      .then((d) => {
        if (id !== probeId.current) return;
        setOrig(d);
        setCw(Math.max(1, Math.round((d.w * pct) / 100)));
        setCh(Math.max(1, Math.round((d.h * pct) / 100)));
      })
      .catch(() => id === probeId.current && setOrig(null));
  });

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

  return (
    <div className="workspace">
      <ShellTop accept={tool.accept} extensions={tool.extensions} hint={j.t(`ws.hint.${tool.id}`)} onFile={j.handleFile} />
      {j.file && (
        <FileRow
          name={j.file.name}
          meta={`${formatBytes(j.file.size, j.lang)} · ${orig ? `${orig.w}×${orig.h}px` : '…'}`}
          thumb={j.preview}
          onRemove={() => {
            probeId.current++;
            j.clearFile();
            setOrig(null);
          }}
        />
      )}
      <div className="controls">
        <Seg<number>
          legend={j.t('ws.scale')}
          value={custom ? -1 : pct}
          onPick={(p) => {
            if (p === -1) {
              setCustom(true);
              return;
            }
            setCustom(false);
            setPct(p);
            if (orig) {
              setCw(Math.max(1, Math.round((orig.w * p) / 100)));
              setCh(Math.max(1, Math.round((orig.h * p) / 100)));
            }
          }}
          options={[
            { value: 25, label: '25%' },
            { value: 50, label: '50%' },
            { value: 75, label: '75%' },
            { value: -1, label: j.t('ws.exact') },
          ]}
        />
        {custom && (
          <div className="num-grid">
            <label className="field">
              {j.t('ws.width')}
              <input type="number" min={1} max={8000} value={cw} onChange={(e) => onCw(Math.max(1, Number(e.target.value) || 1))} />
            </label>
            <label className="field">
              {j.t('ws.height')}
              <input type="number" min={1} max={8000} value={ch} onChange={(e) => onCh(Math.max(1, Number(e.target.value) || 1))} />
            </label>
            <label className="check">
              <input type="checkbox" checked={lock} onChange={(e) => setLock(e.target.checked)} />
              {j.t('ws.lock')}
            </label>
          </div>
        )}
        {orig && outW > 0 && <div className="status busy">{j.t('ws.outSize', { w: outW, h: outH })}</div>}
      </div>
      <RunBar
        canRun={!!j.file}
        busy={j.phase === 'busy'}
        onRun={() =>
          j.runWith(async () => {
            const dims = orig ?? (await probeImage(j.file!));
            const w = custom ? cw : Math.max(1, Math.round((dims.w * pct) / 100));
            const h = custom ? ch : Math.max(1, Math.round((dims.h * pct) / 100));
            return resizeImage(j.file!, { width: w, height: h, format: keepFormat(j.file!), quality: 0.9 });
          })
        }
        result={j.result}
      />
      {j.error && (
        <div className="status error" role="alert">
          {errText(j.t, j.error)}
        </div>
      )}
      {j.result && j.resultUrl && <ResultView result={j.result} url={j.resultUrl} />}
      {j.phase === 'done' && !j.error && <div className="status ok">{j.t('ws.done')}</div>}
    </div>
  );
}

export function RotateWS({ tool }: { tool: ToolMeta }) {
  const j = useJob(rasterCheck, tool.maxSizeMB);
  const [deg, setDeg] = useState<0 | 90 | 180 | 270>(0);
  const [flipH, setFlipH] = useState(false);
  const [flipV, setFlipV] = useState(false);

  return (
    <div className="workspace">
      <ShellTop accept={tool.accept} extensions={tool.extensions} hint={j.t(`ws.hint.${tool.id}`)} onFile={j.handleFile} />
      {j.file && j.preview && (
        <div className="preview-big">
          <img
            src={j.preview}
            alt={j.file.name}
            style={{ transform: `rotate(${deg}deg) scaleX(${flipH ? -1 : 1}) scaleY(${flipV ? -1 : 1})` }}
          />
          <div className="fname">
            {j.file.name} · {formatBytes(j.file.size, j.lang)}
          </div>
        </div>
      )}
      <div className="controls">
        <div className="seg" role="group" aria-label={j.t(`tool.${tool.id}.title`)}>
          <button onClick={() => setDeg(((deg + 270) % 360) as 0 | 90 | 180 | 270)}>{j.t('ws.rotL')}</button>
          <button onClick={() => setDeg(((deg + 90) % 360) as 0 | 90 | 180 | 270)}>{j.t('ws.rotR')}</button>
          <button className={flipH ? 'on' : ''} onClick={() => setFlipH((v) => !v)}>
            {j.t('ws.flipH')}
          </button>
          <button className={flipV ? 'on' : ''} onClick={() => setFlipV((v) => !v)}>
            {j.t('ws.flipV')}
          </button>
          <button
            onClick={() => {
              setDeg(0);
              setFlipH(false);
              setFlipV(false);
            }}
          >
            {j.t('ws.reset')}
          </button>
        </div>
      </div>
      <RunBar
        canRun={!!j.file}
        busy={j.phase === 'busy'}
        onRun={() => j.runWith(() => transformImage(j.file!, { rotate: deg, flipH, flipV }))}
        result={j.result}
      />
      {j.error && (
        <div className="status error" role="alert">
          {errText(j.t, j.error)}
        </div>
      )}
      {j.result && j.resultUrl && <ResultView result={j.result} url={j.resultUrl} />}
      {j.phase === 'done' && !j.error && <div className="status ok">{j.t('ws.done')}</div>}
    </div>
  );
}

type Ratio = { label: string; v: number | null };

const RATIOS: Ratio[] = [
  { label: 'free', v: null },
  { label: '1:1', v: 1 },
  { label: '16:9', v: 16 / 9 },
  { label: '9:16', v: 9 / 16 },
];

interface Sel {
  x: number;
  y: number;
  w: number;
  h: number;
  scale: number; // natural px per displayed px
}

/** Інтерактивна рамка обрізки: перетягування + кут SE, опційні пропорції. */
function Cropper({ src, ratio, onSel }: { src: string; ratio: number | null; onSel: (s: Sel | null) => void }) {
  const boxRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const [rect, setRect] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const drag = useRef<{ mode: 'move' | 'resize'; dx: number; dy: number } | null>(null);

  const fitRect = (dw: number, dh: number): { x: number; y: number; w: number; h: number } => {
    let w = dw * 0.8;
    let h = ratio ? w / ratio : dh * 0.8;
    if (h > dh * 0.9) {
      h = dh * 0.9;
      w = ratio ? h * ratio : dw * 0.8;
    }
    if (w > dw * 0.95) {
      w = dw * 0.95;
      h = ratio ? w / ratio : h;
    }
    return { x: (dw - w) / 2, y: (dh - h) / 2, w, h };
  };

  const emit = (r: { x: number; y: number; w: number; h: number } | null) => {
    const img = imgRef.current;
    if (!img || !r) {
      onSel(null);
      return;
    }
    const scale = img.naturalWidth / img.clientWidth || 1;
    onSel({ ...r, scale });
  };

  // Початкова рамка після завантаження картинки або зміни пропорцій
  useEffect(() => {
    const img = imgRef.current;
    if (!img) return;
    const init = () => {
      const r = fitRect(img.clientWidth, img.clientHeight);
      setRect(r);
      emit(r);
    };
    if (img.complete && img.naturalWidth > 0) init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src, ratio]);

  const toLocal = (clientX: number, clientY: number) => {
    const box = boxRef.current!.getBoundingClientRect();
    return { x: clientX - box.left, y: clientY - box.top };
  };

  const onPointerDownRect = (e: React.PointerEvent) => {
    if (!rect) return;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    const p = toLocal(e.clientX, e.clientY);
    drag.current = { mode: 'move', dx: p.x - rect.x, dy: p.y - rect.y };
  };

  const onPointerDownHandle = (e: React.PointerEvent) => {
    e.stopPropagation();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    drag.current = { mode: 'resize', dx: 0, dy: 0 };
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current;
    const box = boxRef.current;
    if (!d || !box || !rect) return;
    const { width: bw, height: bh } = box.getBoundingClientRect();
    const p = toLocal(e.clientX, e.clientY);
    if (d.mode === 'move') {
      const x = Math.min(Math.max(0, p.x - d.dx), bw - rect.w);
      const y = Math.min(Math.max(0, p.y - d.dy), bh - rect.h);
      const r = { ...rect, x, y };
      setRect(r);
      emit(r);
    } else {
      let w = Math.max(24, Math.min(p.x - rect.x, bw - rect.x));
      let h = ratio ? w / ratio : Math.max(24, Math.min(p.y - rect.y, bh - rect.y));
      if (ratio && rect.y + h > bh) {
        h = bh - rect.y;
        w = h * ratio;
      }
      const r = { ...rect, w: Math.round(w), h: Math.round(h) };
      setRect(r);
      emit(r);
    }
  };

  const onPointerUp = () => {
    drag.current = null;
  };

  return (
    <div className="cropper" ref={boxRef} onPointerMove={onPointerMove} onPointerUp={onPointerUp}>
      <img ref={imgRef} src={src} alt="" draggable={false} onLoad={() => {
        const img = imgRef.current;
        if (!img) return;
        const r = fitRect(img.clientWidth, img.clientHeight);
        setRect(r);
        emit(r);
      }} />
      {rect && (
        <div
          className="crop-rect"
          style={{ left: rect.x, top: rect.y, width: rect.w, height: rect.h }}
          onPointerDown={onPointerDownRect}
        >
          <span className="crop-handle" onPointerDown={onPointerDownHandle} />
        </div>
      )}
    </div>
  );
}

export function CropWS({ tool }: { tool: ToolMeta }) {
  const j = useJob(rasterCheck, tool.maxSizeMB);
  const [ratioIdx, setRatioIdx] = useState(0);
  const [sel, setSel] = useState<Sel | null>(null);
  const ratio = RATIOS[ratioIdx].v;

  return (
    <div className="workspace">
      <ShellTop accept={tool.accept} extensions={tool.extensions} hint={j.t(`ws.hint.${tool.id}`)} onFile={j.handleFile} />
      {j.file && j.preview && (
        <Cropper
          key={`${j.file.name}-${j.file.size}-${ratioIdx}`}
          src={j.preview}
          ratio={ratio}
          onSel={setSel}
        />
      )}
      {j.file && (
        <div className="controls">
          <Seg<number>
            legend="ratio"
            value={ratioIdx}
            onPick={setRatioIdx}
            options={RATIOS.map((r, i) => ({ value: i, label: r.label === 'free' ? j.t('ws.free') : r.label }))}
          />
          {sel && (
            <div className="status busy">
              {j.t('ws.outSize', { w: Math.max(1, Math.round(sel.w * sel.scale)), h: Math.max(1, Math.round(sel.h * sel.scale)) })}
            </div>
          )}
        </div>
      )}
      <div className="action-row">
        <button
          className="btn btn-primary"
          onClick={() =>
            j.runWith(async () => {
              if (!sel) throw new Error('ERR:noSel');
              const r: CropRect = {
                x: sel.x * sel.scale,
                y: sel.y * sel.scale,
                w: sel.w * sel.scale,
                h: sel.h * sel.scale,
              };
              return cropImage(j.file!, r);
            })
          }
          disabled={!j.file || !sel || j.phase === 'busy'}
          style={{ opacity: !j.file || !sel ? 0.55 : 1 }}
        >
          {j.phase === 'busy' ? (
            <>
              <span className="spinner" aria-hidden="true" /> {j.t('ws.busy')}
            </>
          ) : (
            j.t('ws.cropGo')
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
      {j.phase === 'done' && !j.error && <div className="status ok">{j.t('ws.done')}</div>}
    </div>
  );
}
