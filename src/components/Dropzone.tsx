import { useEffect, useRef, useState } from 'react';
import { useLang } from '../i18n/lang';
import { usePending } from '../state/pending';

interface Props {
  accept: string;
  extensions: string;
  multiple?: boolean;
  onFile?: (file: File) => void;
  onFiles?: (files: File[]) => void;
}

/**
 * Універсальна зона завантаження: drag-and-drop + клік + клавіатура.
 *
 * Окрім прямого вибору файлу, підхоплює чергу з головної сторінки: користувач
 * кинув файл там, обрав інструмент — і тут він вже готовий до роботи, без
 * повторного вибору (саме так працює Convertio).
 */
export default function Dropzone({ accept, extensions, multiple, onFile, onFiles }: Props) {
  const { t } = useLang();
  const pending = usePending();
  const inputRef = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);
  const counter = useRef(0);
  const consumed = useRef(false);

  const pick = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    if (multiple && onFiles) onFiles(Array.from(files));
    else onFile?.(files[0]);
  };

  // Підхоплення файлів, уже закинутих на головній. Рівно один раз на монтаж:
  // consumed лишається після обробки, тож оновлення пропів не споживуть чергу вдруге.
  useEffect(() => {
    if (consumed.current || !pending || pending.files.length === 0) return;
    const batch = pending.take(multiple && onFiles ? pending.files.length : 1);
    if (batch.length === 0) return;
    consumed.current = true;
    if (multiple && onFiles) onFiles(batch);
    else onFile?.(batch[0]);
  }, [pending, multiple, onFile, onFiles]);

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
