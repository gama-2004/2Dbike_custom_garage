import { useEffect } from 'react';
import { Header } from './components/Header';
import { AdminPage } from './pages/AdminPage';
import { ComparePage } from './pages/ComparePage';
import { CustomizePage } from './pages/CustomizePage';
import { MyPage } from './pages/MyPage';
import { SelectPage } from './pages/SelectPage';
import { TopPage } from './pages/TopPage';
import { useRoute } from './router';
import { useCatalog } from './catalog';
import { useSaves } from './store/saves';

export function App() {
  const route = useRoute();
  const refresh = useSaves((st) => st.refresh);
  const load = useCatalog((c) => c.load);
  useEffect(() => {
    void refresh();
    void load();
  }, [refresh, load]);

  // 管理画面は利用者画面のヘッダーを出さず、管理者用のヘッダーを自分で持つ
  if (route === 'admin') return <AdminPage />;
  return (
    <>
      <Header />
      <main className="app-main">
        {route === 'top' && <TopPage />}
        {route === 'select' && <SelectPage />}
        {route === 'custom' && <CustomizePage />}
        {route === 'compare' && <ComparePage />}
        {route === 'mypage' && <MyPage />}
      </main>
    </>
  );
}
