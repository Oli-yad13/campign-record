'use client';

import { useEffect, useState } from 'react';

type Theme = 'light' | 'dark' | 'system';

function getSystemTheme(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>('system');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('campaignmrs:theme') as Theme | null;
      const initial = saved || 'system';
      setTheme(initial);
      const effective = initial === 'system' ? getSystemTheme() : initial;
      document.documentElement.setAttribute('data-theme', effective);
    } catch {
      // ignore
    }
    setMounted(true);
  }, []);

  function cycleTheme() {
    const next: Theme = theme === 'system' ? 'light' : theme === 'light' ? 'dark' : 'system';
    setTheme(next);
    const effective = next === 'system' ? getSystemTheme() : next;
    try { localStorage.setItem('campaignmrs:theme', next); } catch {}
    document.documentElement.setAttribute('data-theme', effective);
  }

  const effective = theme === 'system' ? (mounted ? getSystemTheme() : 'light') : theme;
  const label = theme === 'system' ? `System (${effective})` : theme;

  return (
    <button
      onClick={cycleTheme}
      aria-label="Toggle theme"
      title={`Theme: ${label}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        height: 36,
        padding: '0 12px',
        borderRadius: 999,
        border: '1px solid var(--border)',
        background: 'transparent',
        color: 'var(--text)',
        cursor: 'pointer'
      }}
    >
      <span style={{ fontSize: 14 }}>
        {!mounted ? '🖌️' : (effective === 'light' ? '🌞' : effective === 'dark' ? '🌙' : '🖥️')}
      </span>
      <span style={{ fontSize: 12, opacity: 0.9 }} suppressHydrationWarning>{mounted ? label : 'Theme'}</span>
    </button>
  );
}


