import { useCallback, useEffect, useState } from 'react';
import { snapshot, subscribe, type HistItem } from './history';

/* ------------------------------------------------------------------ маршрут */

export type Route =
  | { name: 'home' }
  | { name: 'tool'; id: string }
  | { name: 'recent' }
  | { name: 'favorites' };

/**
 * Hash-маршрутизація замість history API: сайт збирається як статика на
 * GitHub Pages з `base: './'`, тому pushState-роутер там плутає шляхи,
 * а хеш працює всюди і лишає кнопку «назад» живою.
 */
function parse(hash: string): Route {
  const path = hash.replace(/^#\/?/, '');
  if (path.startsWith('tool/')) {
    const id = path.slice('tool/'.length);
    return id ? { name: 'tool', id } : { name: 'home' };
  }
  if (path === 'recent') return { name: 'recent' };
  if (path === 'favorites') return { name: 'favorites' };
  return { name: 'home' };
}

export function useRoute(): Route {
  const [route, setRoute] = useState<Route>(() =>
    typeof window === 'undefined' ? { name: 'home' } : parse(window.location.hash),
  );

  useEffect(() => {
    const onChange = () => setRoute(parse(window.location.hash));
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);

  return route;
}

/** Перехід у новий запис історії браузера. */
export function go(path: string): void {
  window.location.hash = path;
}

/* -------------------------------------------------------------- улюблені */

const FAV_KEY = 'ut-favs';

function loadFavs(): string[] {
  try {
    const raw = localStorage.getItem(FAV_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

export function useFavorites(): {
  favs: string[];
  has: (id: string) => boolean;
  toggle: (id: string) => void;
} {
  const [favs, setFavs] = useState<string[]>(loadFavs);

  useEffect(() => {
    try {
      localStorage.setItem(FAV_KEY, JSON.stringify(favs));
    } catch {
      /* ignore */
    }
  }, [favs]);

  const toggle = useCallback(
    (id: string) =>
      setFavs((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id])),
    [],
  );

  const has = useCallback((id: string) => favs.includes(id), [favs]);

  return { favs, has, toggle };
}

/* ------------------------------------------------------------- історія */

/** Той самий знімок, що й у history.ts, але з реактивністю на pub/sub. */
export function useHistory(): HistItem[] {
  const [, force] = useState(0);

  useEffect(() => subscribe(() => force((n) => n + 1)), []);

  return snapshot();
}
