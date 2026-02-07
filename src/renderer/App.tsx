import { Suspense, lazy } from 'react';
import { I18nextProvider } from 'react-i18next';
import i18n from '../i18n';
import Sidebar from './components/Sidebar';
import LanguageSwitcher from './components/LanguageSwitcher';
import Home from './pages/Home';
import Settings from './pages/Settings';
import About from './pages/About';
import TestScreen from './TestScreen';
import { useNavigation } from './store';

// Lazy load Test page for better performance
const Test = lazy(() => import('./pages/Test'));

// Loading fallback component for Suspense
function LoadingFallback() {
  return (
    <div className="flex items-center justify-center h-full">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
    </div>
  );
}

function App() {
  const { currentPage, isTestActive } = useNavigation();

  // When test is active, render only the test screen (full screen, no sidebar)
  if (isTestActive) {
    return (
      <I18nextProvider i18n={i18n}>
        <TestScreen />
      </I18nextProvider>
    );
  }

  const renderPage = () => {
    switch (currentPage) {
      case 'home':
        return <Home />;
      case 'test':
        return (
          <Suspense fallback={<LoadingFallback />}>
            <Test />
          </Suspense>
        );
      case 'settings':
        return <Settings />;
      case 'about':
        return <About />;
      default:
        return <Home />;
    }
  };

  return (
    <I18nextProvider i18n={i18n}>
      <div className="flex h-screen">
        <Sidebar />
        <div className="flex-1 flex flex-col bg-gray-50 overflow-hidden">
          {/* Header with Language Switcher */}
          <header className="flex justify-end items-center px-6 py-4 bg-white border-b border-gray-200 shadow-sm">
            <LanguageSwitcher />
          </header>
          
          {/* Main Content */}
          <main className="flex-1 overflow-auto">
            {renderPage()}
          </main>
        </div>
      </div>
    </I18nextProvider>
  );
}

export default App;
