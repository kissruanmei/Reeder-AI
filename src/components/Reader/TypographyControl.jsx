import React from 'react';
import { Type, Minus, Plus, AlignLeft, Check } from 'lucide-react';

export const THEMES = [
  { id: 'paper', name: '羊皮纸', bg: '#f7f4ed', fg: '#2c2925', border: '#eee9dd' },
  { id: 'white', name: '羊脂白', bg: '#ffffff', fg: '#111827', border: '#e5e7eb' },
  { id: 'dark', name: 'OLED 暗夜', bg: '#0d0d0e', fg: '#e5e5e7', border: '#242427' },
  { id: 'sepia', name: '墨绿护眼', bg: '#e8f0e6', fg: '#233827', border: '#d8e4d5' },
  { id: 'slate', name: '北欧灰', bg: '#1e293b', fg: '#f1f5f9', border: '#334155' },
  { id: 'warm', name: '暖阳复古', bg: '#fdf6e3', fg: '#073642', border: '#eee8d5' },
];

export const FONTS = [
  { id: 'serif', name: '衬线体 (Serif)', family: 'var(--font-serif)' },
  { id: 'sans', name: '无衬线 (Sans)', family: 'var(--font-sans)' },
  { id: 'mono', name: '等宽体 (Mono)', family: 'var(--font-mono)' },
];

export const TypographyControl = ({
  theme,
  setTheme,
  fontSize,
  setFontSize,
  fontFamily,
  setFontFamily,
  lineHeight,
  setLineHeight,
  maxWidth,
  setMaxWidth,
  onClose
}) => {
  return (
    <div
      className="glass-panel"
      style={{
        position: 'absolute',
        top: '56px',
        right: '80px',
        width: '320px',
        padding: '18px',
        borderRadius: 'var(--radius-lg)',
        boxShadow: 'var(--shadow-lg)',
        border: '1px solid var(--border-color)',
        zIndex: 80,
        animation: 'slideUp 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px'
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h4 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>外观与排版</h4>
        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Apple Books Style</span>
      </div>

      {/* Theme Presets */}
      <div>
        <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '8px' }}>
          主题预设 (6款风格)
        </label>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
          {THEMES.map((t) => {
            const isSelected = theme === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTheme(t.id)}
                style={{
                  background: t.bg,
                  color: t.fg,
                  border: isSelected ? '2px solid var(--accent-color)' : `1px solid ${t.border}`,
                  borderRadius: 'var(--radius-sm)',
                  padding: '8px 4px',
                  fontSize: '12px',
                  fontWeight: 500,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '4px',
                  boxShadow: isSelected ? 'var(--shadow-sm)' : 'none',
                  cursor: 'pointer',
                  transition: 'all 0.15s'
                }}
              >
                {isSelected && <Check size={12} style={{ color: 'var(--accent-color)' }} />}
                <span>{t.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Font Size Selector */}
      <div>
        <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '8px' }}>
          字号调节 ({fontSize}px)
        </label>
        <div 
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between',
            background: 'var(--bg-secondary)', 
            padding: '4px 8px', 
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border-color)' 
          }}
        >
          <button 
            onClick={() => setFontSize(Math.max(12, fontSize - 1))}
            className="btn-icon" 
            title="减小字号"
            disabled={fontSize <= 12}
          >
            <Minus size={16} />
          </button>
          <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>Aa</span>
          <button 
            onClick={() => setFontSize(Math.min(32, fontSize + 1))}
            className="btn-icon" 
            title="增大字号"
            disabled={fontSize >= 32}
          >
            <Plus size={16} />
          </button>
        </div>
      </div>

      {/* Font Family Selector */}
      <div>
        <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '8px' }}>
          字体风格
        </label>
        <div style={{ display: 'flex', gap: '6px', background: 'var(--bg-secondary)', padding: '3px', borderRadius: 'var(--radius-sm)' }}>
          {FONTS.map((f) => {
            const active = fontFamily === f.id;
            return (
              <button
                key={f.id}
                onClick={() => setFontFamily(f.id)}
                style={{
                  flex: 1,
                  padding: '6px 8px',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '12px',
                  background: active ? 'var(--bg-surface)' : 'transparent',
                  color: active ? 'var(--text-primary)' : 'var(--text-secondary)',
                  fontWeight: active ? 600 : 400,
                  boxShadow: active ? 'var(--shadow-sm)' : 'none',
                  border: active ? '1px solid var(--border-color)' : 'none'
                }}
              >
                {f.name.split(' ')[0]}
              </button>
            );
          })}
        </div>
      </div>

      {/* Line Height & Margins */}
      <div style={{ display: 'flex', gap: '12px' }}>
        <div style={{ flex: 1 }}>
          <label style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
            行间距 ({lineHeight})
          </label>
          <input
            type="range"
            min="1.2"
            max="2.2"
            step="0.1"
            value={lineHeight}
            onChange={(e) => setLineHeight(parseFloat(e.target.value))}
            style={{ width: '100%', accentColor: 'var(--accent-color)' }}
          />
        </div>
        <div style={{ flex: 1 }}>
          <label style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
            版心宽度 ({maxWidth}px)
          </label>
          <input
            type="range"
            min="560"
            max="960"
            step="20"
            value={maxWidth}
            onChange={(e) => setMaxWidth(parseInt(e.target.value, 10))}
            style={{ width: '100%', accentColor: 'var(--accent-color)' }}
          />
        </div>
      </div>
    </div>
  );
};
