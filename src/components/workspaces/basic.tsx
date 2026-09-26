import { useState } from 'react';
import type { ToolMeta } from '../../config/catalog';
import { isRasterFile } from '../../config/catalog';
import {
  compressImage,
  convertGeneric,
  convertJpgToPng,
  convertPngToJpg,
  convertSvgToPng,
  formatBytes,
  type CompressFormat,
} from '../../tools/images';
import { FileRow, ResultView, RunBar, Seg, ShellTop, errText, useJob } from './shell';

function pngCheck(f: File): string | null {
  return f.type === 'image/png' || f.name.toLowerCase().endsWith('.png') ? null : 'badPng';
}
function jpgCheck(f: File): string | null {
  const n = f.name.toLowerCase();
  return f.type === 'image/jpeg' || n.endsWith('.jpg') || n.endsWith('.jpeg') ? null : 'badJpg';
}
function svgCheck(f: File): string | null {
  return f.type === 'image/svg+xml' || f.name.toLowerCase().endsWith('.svg') ? null : 'badSvg';
}
function rasterCheck(f: File): string | null {
  return isRasterFile(f) ? null : 'badImg';
}

export function PngToJpgWS({ tool }: { tool: ToolMeta }) {
  const j = useJob(pngCheck, tool.maxSizeMB);
  return (
    <div className="workspace">
      <ShellTop accept={tool.accept} extensions={tool.extensions} hint={j.t(`ws.hint.${tool.id}`)} onFile={j.handleFile} />
      {j.file && (
        <FileRow
          name={j.file.name}
          meta={`${formatBytes(j.file.size, j.lang)} · ${j.file.type || j.t('ws.unknownType')}`}
          thumb={j.preview}
          onRemove={j.clearFile}
        />
      )}
      <RunBar canRun={!!j.file} busy={j.phase === 'busy'} onRun={() => j.runWith(() => convertPngToJpg(j.file!))} result={j.result} />
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

export function JpgToPngWS({ tool }: { tool: ToolMeta }) {
  const j = useJob(jpgCheck, tool.maxSizeMB);
  return (
    <div className="workspace">
      <ShellTop accept={tool.accept} extensions={tool.extensions} hint={j.t(`ws.hint.${tool.id}`)} onFile={j.handleFile} />
      {j.file && (
        <FileRow
          name={j.file.name}
          meta={`${formatBytes(j.file.size, j.lang)} · ${j.file.type || j.t('ws.unknownType')}`}
          thumb={j.preview}
          onRemove={j.clearFile}
        />
      )}
      <RunBar canRun={!!j.file} busy={j.phase === 'busy'} onRun={() => j.runWith(() => convertJpgToPng(j.file!))} result={j.result} />
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

export function SvgToPngWS({ tool }: { tool: ToolMeta }) {
  const j = useJob(svgCheck, tool.maxSizeMB);
  const [size, setSize] = useState(1024);
  return (
    <div className="workspace">
      <ShellTop accept={tool.accept} extensions={tool.extensions} hint={j.t(`ws.hint.${tool.id}`)} onFile={j.handleFile} />
      {j.file && <FileRow name={j.file.name} meta={formatBytes(j.file.size, j.lang)} thumb={j.preview} onRemove={j.clearFile} />}
      <div className="controls">
        <Seg
          legend={j.t('ws.svgWidth')}
          value={size}
          onPick={setSize}
          options={[512, 1024, 2048].map((s) => ({ value: s, label: `${s}px` }))}
        />
      </div>
      <RunBar
        canRun={!!j.file}
        busy={j.phase === 'busy'}
        onRun={() => j.runWith(() => convertSvgToPng(j.file!, size))}
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

export function CompressWS({ tool }: { tool: ToolMeta }) {
  const j = useJob(rasterCheck, tool.maxSizeMB);
  const [quality, setQuality] = useState(0.8);
  const [format, setFormat] = useState<CompressFormat>('image/jpeg');
  return (
    <div className="workspace">
      <ShellTop accept={tool.accept} extensions={tool.extensions} hint={j.t(`ws.hint.${tool.id}`)} onFile={j.handleFile} />
      {j.file && (
        <FileRow
          name={j.file.name}
          meta={`${formatBytes(j.file.size, j.lang)} · ${j.file.type || j.t('ws.unknownType')}`}
          thumb={j.preview}
          onRemove={j.clearFile}
        />
      )}
      <div className="controls">
        <div className="slider-row">
          <label>
            {j.t('ws.quality')} <b>{Math.round(quality * 100)}%</b>
          </label>
          <input
            type="range"
            min={10}
            max={100}
            value={Math.round(quality * 100)}
            onChange={(e) => setQuality(Number(e.target.value) / 100)}
            aria-label={j.t('ws.quality')}
          />
        </div>
        <Seg<CompressFormat>
          legend="format"
          value={format}
          onPick={setFormat}
          options={[
            { value: 'image/jpeg', label: 'JPEG' },
            { value: 'image/webp', label: 'WebP' },
            { value: 'image/png', label: 'PNG' },
          ]}
        />
      </div>
      <RunBar
        canRun={!!j.file}
        busy={j.phase === 'busy'}
        onRun={() => j.runWith(() => compressImage(j.file!, quality, format))}
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

export function WebpWS({ tool }: { tool: ToolMeta }) {
  const j = useJob(rasterCheck, tool.maxSizeMB);
  const [quality, setQuality] = useState(0.85);
  const [format, setFormat] = useState<CompressFormat>('image/webp');
  return (
    <div className="workspace">
      <ShellTop accept={tool.accept} extensions={tool.extensions} hint={j.t(`ws.hint.${tool.id}`)} onFile={j.handleFile} />
      {j.file && (
        <FileRow
          name={j.file.name}
          meta={`${formatBytes(j.file.size, j.lang)} · ${j.file.type || j.t('ws.unknownType')}`}
          thumb={j.preview}
          onRemove={j.clearFile}
        />
      )}
      <div className="controls">
        <Seg<CompressFormat>
          legend={j.t('ws.formatOut')}
          value={format}
          onPick={setFormat}
          options={[
            { value: 'image/webp', label: 'WebP' },
            { value: 'image/jpeg', label: 'JPEG' },
            { value: 'image/png', label: 'PNG' },
          ]}
        />
        {format !== 'image/png' && (
          <div className="slider-row">
            <label>
              {j.t('ws.quality')} <b>{Math.round(quality * 100)}%</b>
            </label>
            <input
              type="range"
              min={10}
              max={100}
              value={Math.round(quality * 100)}
              onChange={(e) => setQuality(Number(e.target.value) / 100)}
              aria-label={j.t('ws.quality')}
            />
          </div>
        )}
      </div>
      <RunBar
        canRun={!!j.file}
        busy={j.phase === 'busy'}
        onRun={() => j.runWith(() => convertGeneric(j.file!, format, quality))}
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
