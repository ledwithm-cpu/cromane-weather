import { Navigate } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { useHomeSauna } from '@/hooks/use-home-sauna';

const DiscoverMap = lazy(() => import('./DiscoverMap'));

const LoadingScreen = () => (
  <div
    className="flex min-h-dvh items-center justify-center bg-background"
    role="status"
    aria-label="Loading"
  >
    <div className="h-8 w-8 animate-spin rounded-full border-2 border-muted border-t-primary" />
  </div>
);

const Home = () => {
  const { homeSauna, loading } = useHomeSauna();

  if (loading) return <LoadingScreen />;

  if (homeSauna) {
    return <Navigate to={`/sauna/${homeSauna}`} replace />;
  }

  return (
    <Suspense fallback={<LoadingScreen />}>
      <DiscoverMap />
    </Suspense>
  );
};

export default Home;
