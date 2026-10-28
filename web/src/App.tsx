import { useEffect } from 'react';
import { Header } from './components/Header';
import { ComparePage } from './pages/ComparePage';
import { CustomizePage } from './pages/CustomizePage';
import { MyPage } from './pages/MyPage';
import { SelectPage } from './pages/SelectPage';
import { TopPage } from './pages/TopPage';
import { useRoute } from './router';
import { useSaves } from './store/saves';

export function App() {
  const route = useRoute();
  const refresh = useSaves((st) => st.refresh);
  useEffect(() => {
    refresh();
  }, [refresh]);

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
