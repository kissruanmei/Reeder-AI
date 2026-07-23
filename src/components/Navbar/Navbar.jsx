import React, { useRef } from 'react';
import { BookOpen, Type, Sparkles, Settings, FolderOpen, Library } from 'lucide-react';
import { ReederLogo } from '../Logo/ReederLogo';

export const Navbar = ({
  bookTitle,
  author,
  progressPercent,
  onOpenLibrary,
  onOpenToc,
  onOpenTypography,
  onToggleAiSidebar,
  onOpenApiKeyModal,
  onLoadEpubFile,
  isAiSidebarOpen,
  isTypographyOpen,
  isTocOpen,
  isLibraryOpen
}) => {
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      onLoadEpubFile(file);
    }
  };

  return (
    <header
      className="glass-header"
      style={{
        height: '56px',
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 20px',
        position: 'relative',
        zIndex: 90
      }}
    >
      {/* Left: Brand Logo, Library, File Import & TOC */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <ReederLogo size={28} showText={true} />
        <div style={{ width: '1px', height: '18px', background: 'var(--border-color)' }} />

        <button
          onClick={onOpenLibrary}
          className={`btn-secondary ${isLibraryOpen ? 'active' : ''}`}
          style={{ padding: '6px 12px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}
          title="打开我的书架与阅读打卡仪表盘"
        >
          <Library size={16} style={{ color: 'var(--accent-color)' }} />
          <span>书架</span>
        </button>

        <input
          type="file"
          ref={fileInputRef}
          accept=".epub"
          onChange={handleFileChange}
          style={{ display: 'none' }}
        />
        
        <button
          onClick={() => fileInputRef.current?.click()}
          className="btn-icon"
          title="打开本地 EPUB 电子书"
        >
          <FolderOpen size={18} />
        </button>

        <button
          onClick={onOpenToc}
          className={`btn-icon ${isTocOpen ? 'active' : ''}`}
          title="图书目录"
        >
          <BookOpen size={18} />
        </button>
      </div>

      {/* Center: Book Info & Progress */}
      <div style={{ textAlign: 'center', maxWidth: '40%', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        <h1 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {bookTitle || '未命名电子书'}
        </h1>
        <div style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
          {author && <span>{author}</span>}
          {typeof progressPercent === 'number' && (
            <span style={{ color: 'var(--accent-color)', fontWeight: 500 }}>
              · 已读 {progressPercent}%
            </span>
          )}
        </div>
      </div>

      {/* Right: Controls & AI */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <button
          onClick={onOpenTypography}
          className={`btn-icon ${isTypographyOpen ? 'active' : ''}`}
          title="排版与主题设置 (Aa)"
        >
          <Type size={18} />
        </button>

        <button
          onClick={onToggleAiSidebar}
          className={`btn-icon ${isAiSidebarOpen ? 'active' : ''}`}
          style={{
            background: isAiSidebarOpen ? 'var(--accent-light)' : 'transparent',
            color: isAiSidebarOpen ? 'var(--accent-color)' : 'var(--text-primary)'
          }}
          title="AI 侧边栏助手"
        >
          <Sparkles size={18} style={{ color: 'var(--accent-color)' }} />
        </button>

        <div style={{ width: '1px', height: '18px', background: 'var(--border-color)', margin: '0 4px' }} />

        <button
          onClick={onOpenApiKeyModal}
          className="btn-icon"
          title="配置第三方 API Key"
        >
          <Settings size={18} />
        </button>
      </div>
    </header>
  );
};
