import { useCallback, useEffect, useState } from 'react';
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

export default function App() {
  const { t } = useLang();
  const route = useRoute();
  const { favs, has, toggle } = useFavorites();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const [quick, setQuick] = useState<ToolMeta | null>(null);

  const tool = route.name === 'tool' ? (getTool(route.id) ?? null) : null;

  // Історія підписує завантаження інструментом, який відкритий зараз:
  // сторінка має пріоритет, потім модалка швидкого режиму.
  useEffect(() => {
    setContextTool(tool?.id ?? quick?.id ?? '');
  }, [tool, quick]);

  const openTool = useCallback((t: ToolMeta) => go(`/tool/${t.id}`), []);
  const closeQuick = useCallback(() => setQuick(null), []);

  const navActive: 'all' | 'recent' | 'favorites' =
    route.name === 'recent' ? 'recent' : route.name === 'favorites' ? 'favorites' : 'all';
  const tabActive: 'tools' | 'recent' | 'favorites' =
    route.name === 'recent' ? 'recent' : route.name === 'favorites' ? 'favorites' : 'tools';

  return (
    <>
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
    </>
  );
}
