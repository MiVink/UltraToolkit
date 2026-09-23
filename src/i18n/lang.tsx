import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { translate, type Lang } from './dict';

interface LangCtx {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
}

const Ctx = createContext<LangCtx>({ lang: 'uk', setLang: () => undefined, t: (k) => k });

function initialLang(): Lang {
  try {
    const saved = localStorage.getItem('ut-lang');
    if (saved === 'en' || saved === 'uk') return saved;
  } catch {
    /* ignore */
  }
  return 'uk';
}

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(initialLang);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    try {
      localStorage.setItem('ut-lang', l);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const t = useCallback((key: string, vars?: Record<string, string | number>) => translate(lang, key, vars), [lang]);

  return <Ctx.Provider value={{ lang, setLang, t }}>{children}</Ctx.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export const useLang = () => useContext(Ctx);
