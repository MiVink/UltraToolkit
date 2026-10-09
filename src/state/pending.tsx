import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';

/**
 * Черга файлів, які користувач кинув на головній, але ще не обрав інструмент.
 *
 * Чому контекст, а не проп зверху: файли мають перетнути три рівні —
 * головна → сторінка інструмента → Dropzone всередині робочої зони.
 * Dropzone один на всі 11 інструментів, тому місце для передачі саме тут.
 */
export interface PendingApi {
  /** файли, які ще чекають на вибір інструмента */
  files: File[];
  /** замінити чергу (скидання на головній, звуження під конкретний інструмент) */
  set: (files: File[]) => void;
  /** забрати перші n файлів — той, хто забрав, і обробляє */
  take: (n: number) => File[];
}

export const PendingCtx = createContext<PendingApi | null>(null);

/** Для Dropzone та в'юшок: `null`, якщо компонент поза провайдером. */
export function usePending(): PendingApi | null {
  return useContext(PendingCtx);
}

/**
 * Власник стану — його викликає App.
 *
 * `files` живе у state (щоб реагувати рендером), але `set`/`take` тримають
 * актуальне значення у ref: інакше кожен новий файл перестворював би їх, і
 * глобальні слухачі drag-and-drop в App довелося б відшивати на кожен кадр.
 */
export function usePendingState(): PendingApi {
  const [files, setFiles] = useState<File[]>([]);
  const ref = useRef<File[]>(files);
  ref.current = files;

  const set = useCallback((next: File[]) => {
    ref.current = next;
    setFiles(next);
  }, []);

  const take = useCallback((n: number) => {
    const out = ref.current.slice(0, n);
    if (out.length > 0) {
      const rest = ref.current.slice(n);
      ref.current = rest;
      setFiles(rest);
    }
    return out;
  }, []);

  return useMemo(() => ({ files, set, take }), [files, set, take]);
}

export function PendingProvider({ api, children }: { api: PendingApi; children: ReactNode }) {
  return <PendingCtx.Provider value={api}>{children}</PendingCtx.Provider>;
}
