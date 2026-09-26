import { useRef, useState } from 'react';
import { useLang } from '../i18n/lang';

interface Props {
  accept: string;
  extensions: string;
  multiple?: boolean;
  onFile?: (file: File) => void;
  onFiles?: (files: File[]) => void;
}

/** Універсальна зона завантаження: drag-and-drop + клік + клавіатура. */
export default function Dropzone({ accept, extensions, multiple, onFile, onFiles }: Props) {
  const { t } = useLang();
  const inputRef = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);
  const counter = useRef(0);

  const pick = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    if (multiple && onFiles) onFiles(Array.from(files));
    else onFile?.(files[0]);
  };

  return (
    <div
      className={`dropzone${drag ? ' drag' : ''}`}
      role="button"
      tabIndex={0}
      aria-label={`${t('dz.title')} (${extensions})`}
      onClick={() => inputRef.current?.click()}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          inputRef.current?.click();
        }
      }}
      onDragEnter={(e) => {
        e.preventDefault();
        counter.current++;
        setDrag(true);
      }}
      onDragOver={(e) => e.preventDefault()}
      onDragLeave={(e) => {
        e.preventDefault();
        counter.current = Math.max(0, counter.current - 1);
        if (counter.current === 0) setDrag(false);
      }}
      onDrop={(e) => {
        e.preventDefault();
        counter.current = 0;
        setDrag(false);
        pick(e.dataTransfer.files);
      }}
    >
      <div className="dz-title">{drag ? t('dz.titleDrag') : t('dz.title')}</div>
      <div className="dz-sub">
        {t('dz.action')} · {extensions}
        <br />
        {t('dz.note')}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        hidden
        onChange={(e) => {
          pick(e.target.files);
          e.target.value = '';
        }}
      />
    </div>
  );
}
