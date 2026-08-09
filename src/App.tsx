import { HashRouter, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Library from './pages/Library';
import Reader from './pages/Reader';
import Settings from './pages/Settings';
import Layout from './components/ui/Layout';

function AppRouter() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Home />} />
        <Route path="/library" element={<Library />} />
        <Route path="/settings" element={<Settings />} />
      </Route>
      <Route path="/book/:bookId" element={<Reader />} />
    </Routes>
  );
}

function getFontFamily(font: string): string {
  switch (font) {
    case 'serif': return 'Georgia, serif';
    case 'sans-serif': return 'system-ui, sans-serif';
    case 'monospace': return 'Consolas, monospace';
    default: return 'system-ui, -apple-system, sans-serif';
  }
}

export default function App() {
  return (
    <HashRouter>
      <AppRouter />
    </HashRouter>
  );
}

export { getFontFamily };