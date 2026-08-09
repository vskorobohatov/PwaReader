import { useEffect } from 'react';
import { useAppSettings } from '../hooks/useSettings';
import { useHeader } from '../components/ui/Layout';
import Button from '../components/ui/Button';
import { exportLibrary, importLibrary } from '../lib/import-export';
import { useState } from 'react';

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: () => void; label: string }) {
  return (
    <button onClick={onChange} className="flex items-center justify-between w-full py-3" role="switch" aria-checked={checked}>
      <span className="text-sm text-gray-700 dark:text-gray-300">{label}</span>
      <div className={`w-11 h-6 rounded-full transition-colors relative ${checked ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'}`}>
        <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${checked ? 'translate-x-5' : ''}`} />
      </div>
    </button>
  );
}

function useToast() {
  const [msg, setMsg] = useState<string | null>(null);
  const show = (m: string) => { setMsg(m); setTimeout(() => setMsg(null), 3000); };
  return { msg, show };
}

export default function Settings() {
  const { settings, updateSettings } = useAppSettings();
  const [loading, setLoading] = useState(false);
  const { msg: toast, show: showToast } = useToast();
  const header = useHeader();

  useEffect(() => {
    header.setTitle('Settings');
    header.setRightContent(null);
  }, [header]);

  const handleExport = async () => {
    setLoading(true);
    try {
      const { blob, filename } = await exportLibrary();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = filename; a.click();
      URL.revokeObjectURL(url);
      showToast('Library exported successfully');
    } catch { showToast('Export failed'); }
    finally { setLoading(false); }
  };

  const handleImport = async () => {
    const input = document.createElement('input');
    input.type = 'file'; input.accept = '.zip';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      setLoading(true);
      try {
        const result = await importLibrary(file);
        showToast(`Imported: ${result.imported}. Skipped: ${result.skipped}`);
        if (result.errors.length) console.warn(result.errors);
      } catch { showToast('Import failed'); }
      finally { setLoading(false); }
    };
    input.click();
  };

  return (
    <div className="space-y-6">
        {/* App Theme */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4">
          <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Appearance</h2>
          <div className="space-y-1">
            <Toggle checked={settings.appTheme === 'light'} onChange={() => updateSettings({ appTheme: settings.appTheme === 'light' ? 'dark' : 'light' })} label="Dark Mode" />
          </div>
        </div>

        {/* Reading */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4">
          <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Reading</h2>
          <Toggle checked={settings.openLastBook} onChange={() => updateSettings({ openLastBook: !settings.openLastBook })} label="Open last book on startup" />
        </div>

        {/* Data */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4">
          <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">Data Management</h2>
          <div className="space-y-3">
            <Button onClick={handleExport} disabled={loading} fullWidth>
              {loading ? 'Processing...' : 'Export Library'}
            </Button>
            <Button onClick={handleImport} disabled={loading} variant="outline" fullWidth>
              Import Backup
            </Button>
          </div>
        </div>

        {/* About */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4">
          <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">About</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
            Local Book Reader is a progressive web app for reading FB2 books. All your books and reading progress are stored locally on this device. No data is sent to any server.
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">Version 0.1.0</p>
        </div>
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-3 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl shadow-lg text-sm">
          {toast}
        </div>
      )}
    </div>
  );
}