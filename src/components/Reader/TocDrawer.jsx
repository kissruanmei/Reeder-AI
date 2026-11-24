import React, { useMemo, useState } from 'react';
import { BookOpen, ChevronRight, MessageSquareText, Search, Sparkles, StickyNote, Trash2, X } from 'lucide-react';
import { HIGHLIGHT_COLORS } from '../../services/noteService';

function formatTime(timestamp) {
  if (!timestamp) return '';
  try {
    const date = new Date(timestamp);
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hour = String(date.getHours()).padStart(2, '0');
    const minute = String(date.getMinutes()).padStart(2, '0');
    return `${month}-${day} ${hour}:${minute}`;
  } catch {
    return '';
  }
}

export const TocDrawer = ({
  chapters,
  currentChapterId,
  onSelectChapter,
  notes = [],
  activeTab = 'toc',
  onTabChange,
  onJumpToNote,
  onDeleteNote,
  onAskAiNote,
  isOpen,
  onClose
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [colorFilter, setColorFilter] = useState('all');
  const [onlyWithComment, setOnlyWithComment] = useState(false);

  const colorMap = useMemo(() => {
    const map = {};
    HIGHLIGHT_COLORS.forEach((item) => {
      map[item.id] = item.dot;
    });
    return map;
  }, []);

  const filteredGroups = useMemo(() => {
    const keyword = searchQuery.trim().toLowerCase();
    const filtered = notes.filter((item) => {
      if (colorFilter !== 'all' && item.color !== colorFilter) return false;
      if (onlyWithComment && !(item.note || '').trim()) return false;
      if (keyword) {
        const hay = `${item.quote || ''} ${item.note || ''} ${item.chapterTitle || ''}`.toLowerCase();
        if (!hay.includes(keyword)) return false;
      }
      return true;
    });

    const groups = [];
    const groupByChapter = new Map();
    filtered.forEach((item) => {
      const key = item.chapterIndex;
      if (!groupByChapter.has(key)) {
        const chapterMeta = chapters?.[key];
        const group = {
          chapterIndex: key,
          chapterTitle: item.chapterTitle || chapterMeta?.title || `第 ${key + 1} 章`,
          items: []
        };
        groupByChapter.set(key, group);
        groups.push(group);
      }
      groupByChapter.get(key).items.push(item);
    });

    return groups;
  }, [notes, chapters, searchQuery, colorFilter, onlyWithComment]);

  if (!isOpen) return null;

  return (
    <div
      className="glass-panel"
      style={{
        position: 'absolute',
        top: '56px',
        left: '16px',
        width: '340px',
        maxWidth: 'calc(100vw - 32px)',
        maxHeight: 'calc(100vh - 80px)',
        borderRadius: 'var(--radius-lg)',
        boxShadow: 'var(--shadow-lg)',
        border: '1px solid var(--border-color)',
        zIndex: 80,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        animation: 'slideUp 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
      }}
    >
      {/* Header with Dual Tabs */}
      <div
        style={{
          padding: '10px 12px',
          borderBottom: '1px solid var(--border-color)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '8px',
          background: 'var(--bg-secondary)'
        }}
      >
        <div className="drawer-tabs" role="tablist" aria-label="目录与笔记切换">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'toc'}
            className={`drawer-tab-btn${activeTab === 'toc' ? ' active' : ''}`}
            onClick={() => onTabChange?.('toc')}
          >
            <BookOpen size={14} style={{ color: activeTab === 'toc' ? 'var(--accent-color)' : undefined }} />
            <span>目录</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'notes'}
            className={`drawer-tab-btn${activeTab === 'notes' ? ' active' : ''}`}
            onClick={() => onTabChange?.('notes')}
          >
            <StickyNote size={14} style={{ color: activeTab === 'notes' ? 'var(--accent-color)' : undefined }} />
            <span>笔记</span>
            {notes.length > 0 && <span className="drawer-tab-badge">{notes.length}</span>}
          </button>
        </div>

        <button type="button" onClick={onClose} className="btn-icon" style={{ width: '28px', height: '28px' }} aria-label="关闭抽屉">
          <X size={16} />
        </button>
      </div>

      {/* Tab 1: Chapter List */}
      {activeTab === 'toc' ? (
        <div style={{ padding: '8px', overflowY: 'auto', flex: 1 }}>
          {chapters && chapters.length > 0 ? (
            chapters.map((ch, idx) => {
              const isActive = ch.id === currentChapterId;
              return (
                <button
                  key={ch.id || idx}
                  type="button"
                  onClick={() => {
                    onSelectChapter(ch);
                    onClose();
                  }}
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    padding: '10px 12px',
                    borderRadius: 'var(--radius-sm)',
                    marginBottom: '4px',
                    fontSize: '13px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    background: isActive ? 'var(--accent-light)' : 'transparent',
                    color: isActive ? 'var(--accent-color)' : 'var(--text-primary)',
                    fontWeight: isActive ? 600 : 400,
                    transition: 'all 0.15s'
                  }}
                >
                  <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flex: 1 }}>
                    {ch.title || `第 ${idx + 1} 章`}
                  </span>
                  <ChevronRight size={14} style={{ opacity: isActive ? 1 : 0.4 }} />
                </button>
              );
            })
          ) : (
            <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
              未找到章节目录
            </div>
          )}
        </div>
      ) : (
        /* Tab 2: Book Notes & Highlights */
        <>
          <div className="notes-filter-bar">
            <div style={{ position: 'relative' }}>
              <Search
                size={13}
                style={{
                  position: 'absolute',
                  left: '10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-muted)',
                  pointerEvents: 'none'
                }}
              />
              <input
                type="text"
                className="notes-search-input"
                placeholder="搜索高亮原文或短评…"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <button
                  type="button"
                  onClick={() => setColorFilter('all')}
                  style={{
                    fontSize: '11px',
                    padding: '2px 7px',
                    borderRadius: 'var(--radius-full)',
                    background: colorFilter === 'all' ? 'var(--accent-light)' : 'var(--bg-secondary)',
                    color: colorFilter === 'all' ? 'var(--accent-color)' : 'var(--text-secondary)',
                    fontWeight: colorFilter === 'all' ? 600 : 400
                  }}
                >
                  全部
                </button>
                {HIGHLIGHT_COLORS.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className={`hl-color-swatch${colorFilter === item.id ? ' is-selected' : ''}`}
                    style={{ width: '15px', height: '15px', backgroundColor: item.dot }}
                    title={`筛选${item.label}`}
                    aria-label={`筛选${item.label}`}
                    onClick={() => setColorFilter((prev) => (prev === item.id ? 'all' : item.id))}
                  />
                ))}
              </div>

              <button
                type="button"
                onClick={() => setOnlyWithComment((prev) => !prev)}
                style={{
                  fontSize: '11px',
                  padding: '3px 8px',
                  borderRadius: 'var(--radius-full)',
                  gap: '4px',
                  background: onlyWithComment ? 'var(--accent-light)' : 'var(--bg-secondary)',
                  color: onlyWithComment ? 'var(--accent-color)' : 'var(--text-secondary)',
                  fontWeight: onlyWithComment ? 600 : 400
                }}
              >
                <MessageSquareText size={11} />
                <span>仅看短评</span>
              </button>
            </div>
          </div>

          <div style={{ padding: '10px 10px 14px', overflowY: 'auto', flex: 1 }}>
            {notes.length === 0 ? (
              <div style={{ padding: '36px 16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px', lineHeight: 1.7 }}>
                <StickyNote size={26} style={{ opacity: 0.45, marginBottom: '8px' }} />
                <div>还没有任何高亮或短评</div>
                <div style={{ fontSize: '12px', marginTop: '4px' }}>在正文中划选喜欢的句子即可高亮或写下感悟</div>
              </div>
            ) : filteredGroups.length === 0 ? (
              <div style={{ padding: '28px 16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
                没有符合筛选条件的笔记
              </div>
            ) : (
              filteredGroups.map((group) => (
                <div key={group.chapterIndex} style={{ marginBottom: '12px' }}>
                  <div
                    style={{
                      fontSize: '11px',
                      fontWeight: 600,
                      color: 'var(--text-muted)',
                      padding: '2px 4px 6px',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}
                  >
                    {group.chapterTitle}（{group.items.length}）
                  </div>

                  {group.items.map((item) => {
                    const dotColor = colorMap[item.color] || colorMap.amber;
                    return (
                      <div
                        key={item.id}
                        className="note-list-card"
                        role="button"
                        tabIndex={0}
                        onClick={() => {
                          onJumpToNote?.(item);
                          onClose();
                        }}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            onJumpToNote?.(item);
                            onClose();
                          }
                        }}
                      >
                        <div className="note-list-quote" style={{ borderLeftColor: dotColor }}>
                          {item.quote}
                        </div>

                        {item.note && (
                          <div className="note-list-comment">
                            {item.note}
                          </div>
                        )}

                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '2px' }}>
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                            {formatTime(item.updatedAt || item.createdAt)}
                          </span>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                            <button
                              type="button"
                              className="btn-icon"
                              style={{ width: 'auto', height: '24px', padding: '0 6px', fontSize: '11px', gap: '3px', color: 'var(--accent-color)' }}
                              title="发给 AI 助手讨论"
                              onClick={(event) => {
                                event.stopPropagation();
                                onAskAiNote?.(item);
                              }}
                            >
                              <Sparkles size={12} />
                              <span>问 AI</span>
                            </button>
                            <button
                              type="button"
                              className="btn-icon"
                              style={{ width: '24px', height: '24px', color: 'var(--text-muted)' }}
                              title="删除此笔记"
                              aria-label="删除此笔记"
                              onClick={(event) => {
                                event.stopPropagation();
                                onDeleteNote?.(item.id);
                              }}
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
};
