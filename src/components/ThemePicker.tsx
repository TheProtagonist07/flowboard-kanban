import { useState, useEffect, useRef } from 'react';
import { Palette, Check } from 'lucide-react';
import { useBoardStore, type Theme } from '../store';

interface ThemeDef {
  id: Theme;
  name: string;
  description: string;
  preview: { bg: string; col: string; card: string; accent: string; text: string; accent2: string };
}

const THEMES: ThemeDef[] = [
  {
    id: 'midnight',
    name: 'Midnight',
    description: 'Deep space navy — the default',
    preview: { bg: '#020617', col: '#0f172a', card: '#1e293b', accent: '#818cf8', text: '#e2e8f0', accent2: '#c084fc' },
  },
  {
    id: 'light',
    name: 'Light',
    description: 'Clean and minimal, great for daylight',
    preview: { bg: '#f0f4ff', col: '#e8eef8', card: '#ffffff', accent: '#6366f1', text: '#1e293b', accent2: '#8b5cf6' },
  },
  {
    id: 'contrast',
    name: 'Contrast',
    description: 'Pure black/white — maximum readability',
    preview: { bg: '#000000', col: '#0a0a0a', card: '#111111', accent: '#ffff00', text: '#ffffff', accent2: '#00ffff' },
  },
  {
    id: 'hacker',
    name: 'Hacker',
    description: 'Matrix terminal green on black',
    preview: { bg: '#000500', col: '#001000', card: '#001800', accent: '#00ff41', text: '#00ff41', accent2: '#39ff14' },
  },
  {
    id: 'dracula',
    name: 'Dracula',
    description: 'The iconic dev theme — purple & pink',
    preview: { bg: '#1e1f29', col: '#282a36', card: '#44475a', accent: '#bd93f9', text: '#f8f8f2', accent2: '#ff79c6' },
  },
  {
    id: 'nord',
    name: 'Nord',
    description: 'Arctic muted blues and grays',
    preview: { bg: '#242933', col: '#2e3440', card: '#3b4252', accent: '#88c0d0', text: '#eceff4', accent2: '#81a1c1' },
  },
  {
    id: 'monokai',
    name: 'Monokai',
    description: 'Warm charcoal with golden accents',
    preview: { bg: '#1e1e1e', col: '#272822', card: '#323220', accent: '#e6db74', text: '#f8f8f2', accent2: '#a6e22e' },
  },
  {
    id: 'sunset',
    name: 'Sunset',
    description: 'Deep purple with pink & orange glow',
    preview: { bg: '#12051f', col: '#1c0a30', card: '#2a1040', accent: '#ff6eb4', text: '#fce4ff', accent2: '#ff9e64' },
  },
];

export default function ThemePicker() {
  const { theme, setTheme } = useBoardStore();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Apply saved theme on mount
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, []);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  const current = THEMES.find(t => t.id === theme) ?? THEMES[0];

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all tooltip"
        data-tip="Change theme"
        style={{
          background: open ? 'var(--accent-bg)' : 'var(--bg-input)',
          border: `1px solid ${open ? 'var(--accent-border)' : 'var(--border-subtle)'}`,
          color: open ? 'var(--accent)' : 'var(--text-3)',
        }}
      >
        <Palette size={13} />
        <span className="hidden sm:inline">{current.name}</span>
      </button>

      {open && (
        <div
          className="absolute right-0 top-full mt-2 w-72 rounded-2xl shadow-2xl overflow-hidden z-50 animate-slide-up"
          style={{ background: 'var(--bg-menu)', border: '1px solid var(--border-medium)' }}
        >
          {/* Header */}
          <div className="px-4 py-3 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
            <p className="text-xs font-semibold" style={{ color: 'var(--text-3)' }}>CHOOSE THEME</p>
          </div>

          {/* Theme list */}
          <div className="p-2">
            {THEMES.map(t => {
              const isActive = theme === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => { setTheme(t.id); setOpen(false); }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all mb-0.5 text-left group"
                  style={{
                    background: isActive ? 'var(--accent-bg)' : 'transparent',
                    border: isActive ? '1px solid var(--accent-border)' : '1px solid transparent',
                  }}
                >
                  {/* Mini preview swatch */}
                  <div className="flex-shrink-0 w-10 h-8 rounded-lg overflow-hidden relative" style={{ border: '1px solid rgba(255,255,255,0.1)' }}>
                    <div className="absolute inset-0" style={{ background: t.preview.bg }} />
                    {/* Column strip */}
                    <div className="absolute left-0.5 top-0.5 bottom-0.5 w-2 rounded-sm" style={{ background: t.preview.col }} />
                    {/* Card strip */}
                    <div className="absolute left-3 top-1 right-0.5 h-1.5 rounded-sm" style={{ background: t.preview.card }} />
                    <div className="absolute left-3 top-3.5 right-1 h-1 rounded-sm" style={{ background: t.preview.card }} />
                    {/* Accent dot */}
                    <div className="absolute right-1 bottom-1 w-1.5 h-1.5 rounded-full" style={{ background: t.preview.accent }} />
                  </div>

                  {/* Label */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate" style={{ color: isActive ? 'var(--accent)' : 'var(--text-1)' }}>
                      {t.name}
                    </p>
                    <p className="text-[10px] truncate mt-0.5" style={{ color: 'var(--text-3)' }}>
                      {t.description}
                    </p>
                  </div>

                  {/* Checkmark */}
                  {isActive && (
                    <div className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center"
                      style={{ background: 'var(--accent)', }}>
                      <Check size={11} className="text-white" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Footer */}
          <div className="px-4 py-2.5 border-t flex items-center gap-2" style={{ borderColor: 'var(--border-subtle)' }}>
            <div className="flex gap-1.5">
              {THEMES.map(t => (
                <button
                  key={t.id}
                  onClick={() => setTheme(t.id)}
                  className="w-4 h-4 rounded-full transition-all hover:scale-125"
                  style={{
                    background: t.preview.accent,
                    outline: theme === t.id ? `2px solid ${t.preview.accent}` : 'none',
                    outlineOffset: '2px',
                  }}
                  title={t.name}
                />
              ))}
            </div>
            <span className="text-[10px] ml-auto" style={{ color: 'var(--text-4)' }}>Click dots for quick switch</span>
          </div>
        </div>
      )}
    </div>
  );
}
