import { useCallback, useEffect, useRef, useState } from 'react';
import Sidebar from './components/Sidebar';
import TopBar from './components/TopBar';
import ToolModal from './components/ToolModal';
import HomeView from './views/HomeView';
import ToolView from './views/ToolView';
import { FavoritesView, RecentView } from './views/ListsView';
import { getTool, type ToolMeta } from './config/catalog';
import { useLang } from './i18n/lang';
import { setContextTool } from './state/history';
import { go, useFavorites, useRoute } from './state/store';
import { PendingProvider, usePendingState } from './state/pending';

export default function App() {
  const { t } = useLang();
  const route = useRoute();
  const { favs, has, toggle } = useFavorites();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const [quick, setQuick] = useState<ToolMeta | null>(null);

  const pending = usePendingState();
  const setPending = pending.set;
  const [dragging, setDragging] = useState(false);
  const dragDepth = useRef(0);

  const tool = route.name === 'tool' ? (getTool(route.id) ?? null) : null;

  // Історія підписує завантаження інструментом, який відкритий зараз:
  // сторінка має пріоритет, потім модалка швидкого режиму.
  useEffect(() => {
    setContextTool(tool?.id ?? quick?.id ?? '');
  }, [tool, quick]);

  /**
   * Перетягування файлів над усією сторінкою — як на Convertio:
   * 1) `dragover` обов'язково скасовується, інакше браузер відкриє файл замість сторінки;
   * 2) лічильник входу/виходу (а не «ми просто зараз у зоні») — бо `dragover` б'є
   *    по кожному елементу під курсором і не має пари з `dragleave`;
   * 3) скидання в будь-якому місці головної потрапляє в чергу, а не тільки в дропзону.
   */
  useEffect(() => {
    const onEnter = (e: DragEvent) => {
      e.preventDefault();
      dragDepth.current++;
      setDragging(true);
    };
    const onLeave = () => {
      dragDepth.current = Math.max(0, dragDepth.current - 1);
      if (dragDepth.current === 0) setDragging(false);
    };
    const onOver = (e: DragEvent) => e.preventDefault();
    const onDrop = (e: DragEvent) => {
      e.preventDefault();
      dragDepth.current = 0;
      setDragging(false);
      const files = e.dataTransfer?.files;
      // лише на головній: на сторінці інструмента про чергу вже подбав Dropzone
      const atHome = window.location.hash.replace(/^#\/?/, '') === '';
      if (files && files.length > 0 && atHome) setPending(Array.from(files).slice(0, 20));
    };

    window.addEventListener('dragenter', onEnter);
    window.addEventListener('dragleave', onLeave);
    window.addEventListener('dragover', onOver);
    window.addEventListener('drop', onDrop);
    return () => {
      window.removeEventListener('dragenter', onEnter);
      window.removeEventListener('dragleave', onLeave);
      window.removeEventListener('dragover', onOver);
      window.removeEventListener('drop', onDrop);
    };
  }, [setPending]);

  const openTool = useCallback((t: ToolMeta) => go(`/tool/${t.id}`), []);
  const closeQuick = useCallback(() => setQuick(null), []);

  const navActive: 'all' | 'recent' | 'favorites' =
    route.name === 'recent' ? 'recent' : route.name === 'favorites' ? 'favorites' : 'all';
  const tabActive: 'tools' | 'recent' | 'favorites' =
    route.name === 'recent' ? 'recent' : route.name === 'favorites' ? 'favorites' : 'tools';

  return (
    <PendingProvider api={pending}>
      <div className="bg-stage" aria-hidden="true" />
      <div className="bg-vignette" aria-hidden="true" />
      <div className="bg-grain" aria-hidden="true" />

      <div className="app">
        <Sidebar
          active={navActive}
          category={category}
          onCategory={setCategory}
          onNavigate={go}
        />

        <div className="app-main">
          <TopBar active={tabActive} query={query} onQuery={setQuery} />

          <main className="content" id="about">
            {route.name === 'home' && (
              <HomeView
                route={route}
                query={query}
                onQuery={setQuery}
                category={category}
                onCategory={setCategory}
                onOpenTool={openTool}
                hasFav={has}
                onFav={toggle}
              />
            )}

            {route.name === 'tool' &&
              (tool ? (
                <ToolView
                  tool={tool}
                  fav={has(tool.id)}
                  onFav={() => toggle(tool.id)}
                  onQuick={() => setQuick(tool)}
                />
              ) : (
                <div className="empty">
                  <b>{t('tool.notFound')}</b>
                  <span>{t('tool.notFoundSub')}</span>
                  <button type="button" className="btn btn-ghost" onClick={() => go('/')}>
                    {t('nav.all')}
                  </button>
                </div>
              ))}

            {route.name === 'recent' && <RecentView />}

            {route.name === 'favorites' && (
              <FavoritesView favs={favs} hasFav={has} onFav={toggle} onOpenTool={openTool} />
            )}
          </main>
        </div>
      </div>

      {quick && <ToolModal tool={quick} onClose={closeQuick} />}

      {dragging && (
        <div className="drop-veil" aria-hidden="true">
          <div className="drop-veil-box">
            <span className="drop-veil-ico">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
                <path
                  d="M12 16V4m0 0L7.5 8.5M12 4l4.5 4.5"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M4 15v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
              </svg>
            </span>
            <b>{t('dz.dropHere')}</b>
            <span>{t('dz.dropHint')}</span>
          </div>
        </div>
      )}
    </PendingProvider>
  );
}
