import { useCallback } from 'react';
import type { ReaderSettings, PaginationMode } from '../../types/settings';

interface ReaderSettingsPanelProps {
  visible: boolean;
  settings: ReaderSettings;
  onUpdateSettings: (partial: Partial<ReaderSettings>) => void;
  onClose: () => void;
}

function NumberInput({ label, value, min, max, step, onChange, unit = '' }: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (val: number) => void;
  unit?: string;
}) {
  return (
    <div>
      <label className="text-xs font-medium mb-1.5 block opacity-70">{label}: {value}{unit}</label>
      <input
        type="number"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={e => {
          const val = Number(e.target.value);
          if (!isNaN(val)) onChange(Math.min(max, Math.max(min, val)));
        }}
        className="w-full px-2 py-1 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
      />
    </div>
  );
}

export default function ReaderSettingsPanel({ visible, settings: rs, onUpdateSettings, onClose }: ReaderSettingsPanelProps) {
  const themeNames: Record<string, string> = { light: '☀️ Light', dark: '🌙 Dark', sepia: '📜 Sepia' };
  const fontNames: Record<string, string> = { system: 'System', serif: 'Serif', 'sans-serif': 'Sans-serif', monospace: 'Mono' };

  const handleBackdropClick = useCallback(() => {
    onClose();
  }, [onClose]);

  return (
    <div
      className={`fixed top-[56px] left-0 right-0 bottom-0 z-30 flex items-end justify-center transition-opacity duration-300 ease-out ${visible ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      onClick={handleBackdropClick}
    >
      {/* Semi-transparent backdrop */}
      <div className="absolute inset-0 bg-black/40" />

      {/* Settings Panel Card - slides up from bottom */}
      <div
        className={`relative z-10 w-full max-w-2xl max-h-[75vh] overflow-y-auto rounded-t-2xl shadow-2xl border-t transition-transform duration-300 ease-out ${visible ? 'translate-y-0' : 'translate-y-full'
          }`}
        style={{ backgroundColor: 'var(--reader-bg)', borderColor: 'var(--reader-border)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Handle bar */}
        <div className="flex items-center justify-center py-2 border-b" style={{ borderColor: 'var(--reader-border)' }}>
          <div className="w-10 h-1 rounded-full opacity-30" style={{ backgroundColor: 'var(--reader-text)' }} />
        </div>

        {/* Header row */}
        <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: 'var(--reader-border)' }}>
          <h2 className="font-semibold text-sm" style={{ color: 'var(--reader-text)' }}>Reader Settings</h2>
          <button
            onClick={onClose}
            className="py-1 px-2 rounded-lg hover:opacity-70 transition-colors"
            style={{ color: 'var(--reader-text)' }}
            aria-label="Close settings"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-4 py-3 space-y-3" style={{ color: 'var(--reader-text)' }}>
          <div>
            <label className="text-xs font-medium mb-1.5 block opacity-70">Theme</label>
            <div className="flex gap-2">
              {(['light', 'dark', 'sepia'] as const).map(t => (
                <button key={t} onClick={() => onUpdateSettings({ theme: t })} className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${rs.theme === t ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700'}`}>{themeNames[t]}</button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-medium mb-1.5 block opacity-70">Font</label>
            <div className="flex gap-2 flex-wrap">
              {(['system', 'serif', 'sans-serif', 'monospace'] as const).map(f => (
                <button key={f} onClick={() => onUpdateSettings({ fontFamily: f })} className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${rs.fontFamily === f ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700'}`}>{fontNames[f]}</button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-medium mb-1.5 block opacity-70">Pagination</label>
            <div className="flex gap-2">
              {(['chapter', 'page'] as PaginationMode[]).map(m => (
                <button
                  key={m}
                  onClick={() => onUpdateSettings({ paginationMode: m })}
                  className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${rs.paginationMode === m
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                >
                  {m === 'chapter' ? '📖 Chapter' : '📄 Page'}
                </button>
              ))}
            </div>
          </div>

          <hr className="opacity-20" />

          <div className="grid grid-cols-2 gap-3">
            <NumberInput label="Size" value={rs.fontSize} min={14} max={32} step={1} unit="px" onChange={v => onUpdateSettings({ fontSize: v })} />
            <NumberInput label="Line Height" value={rs.lineHeight} min={1.4} max={2} step={0.1} onChange={v => onUpdateSettings({ lineHeight: v })} />
          </div>
          <hr className="opacity-20" />

          <div>
            <label className="text-xs font-medium mb-1.5 block opacity-70">Padding</label>
            <div className="grid grid-cols-4 gap-3">
              <NumberInput label="Top" value={rs.paddingTop} min={8} max={64} step={2} unit="px" onChange={v => onUpdateSettings({ paddingTop: v })} />
              <NumberInput label="Bottom" value={rs.paddingBottom} min={8} max={64} step={2} unit="px" onChange={v => onUpdateSettings({ paddingBottom: v })} />
              <NumberInput label="Left" value={rs.paddingLeft} min={8} max={64} step={2} unit="px" onChange={v => onUpdateSettings({ paddingLeft: v })} />
              <NumberInput label="Right" value={rs.paddingRight} min={8} max={64} step={2} unit="px" onChange={v => onUpdateSettings({ paddingRight: v })} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}