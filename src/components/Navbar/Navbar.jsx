import React from 'react';
import { BookOpen, FolderOpen, Library, Plus, Settings, Sparkles, Type } from 'lucide-react';
import { ReederLogo } from '../Logo/ReederLogo';

export const Navbar = ({
  isHome, bookTitle, author, progressPercent, onGoHome, onOpenLibrary, onImport,
  onOpenToc, onOpenTypography, onToggleAiSidebar, onOpenApiKeyModal,
  isAiSidebarOpen, isTypographyOpen, isTocOpen
}) => (
  <header className={`glass-header app-navbar${isHome ? ' app-navbar-home' : ''}`}>
    <div className="navbar-group">
      <button className="navbar-logo" onClick={onGoHome} aria-label="返回书架首页"><ReederLogo size={isHome ? 34 : 28} showText /></button>
      <span className="navbar-divider" />
      <button onClick={onGoHome} className={`btn-secondary navbar-home${isHome ? ' active' : ''}`} aria-current={isHome ? 'page' : undefined} title="返回书架首页">
        <Library size={16} /> <span>书架</span>
      </button>
      <button onClick={onImport} className="btn-icon" title="打开本地 EPUB 电子书" aria-label="打开本地 EPUB 电子书"><FolderOpen size={18} /></button>
      <button onClick={isHome ? onOpenLibrary : onOpenToc} className={`btn-icon${isTocOpen && !isHome ? ' active' : ''}`} title={isHome ? '查看全部图书' : '图书目录'} aria-label={isHome ? '查看全部图书' : '图书目录'}><BookOpen size={18} /></button>
    </div>

    {!isHome && (
      <div className="navbar-book-info">
        <h1>{bookTitle || '未命名电子书'}</h1>
        <div>{author && <span>{author}</span>}<span className="navbar-progress"> · 已读 {progressPercent}%</span></div>
      </div>
    )}

    <div className="navbar-group navbar-actions">
      {isHome ? (
        <button onClick={onImport} className="btn-primary navbar-import"><Plus size={17} /> 导入书籍</button>
      ) : (
        <>
          <button onClick={onOpenTypography} className={`btn-icon${isTypographyOpen ? ' active' : ''}`} title="排版与主题设置 (Aa)" aria-label="排版与主题设置 (Aa)"><Type size={18} /></button>
          <button onClick={onToggleAiSidebar} className={`btn-icon${isAiSidebarOpen ? ' active' : ''}`} title="AI 侧边栏助手" aria-label="AI 侧边栏助手"><Sparkles size={18} /></button>
        </>
      )}
      <span className="navbar-divider" />
      <button onClick={onOpenApiKeyModal} className="btn-icon" title="配置第三方 API Key" aria-label="配置第三方 API Key"><Settings size={18} /></button>
    </div>
  </header>
);
