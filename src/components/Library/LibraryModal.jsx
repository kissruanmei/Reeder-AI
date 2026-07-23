import React, { useState, useEffect } from 'react';
import { BookOpen, Zap, Clock, Plus, Trash2, Play, Trophy, X, Sparkles, CheckCircle2 } from 'lucide-react';
import { LibraryService } from '../../services/libraryService';

export const LibraryModal = ({ isOpen, onClose, onSelectBook, onDeleteBook, onImportNewEpub, currentBookId }) => {
  const [library, setLibrary] = useState([]);
  const [stats, setStats] = useState({ todayMinutes: 0, totalMinutes: 0, streakDays: 1, dailyGoalMinutes: 30 });

  useEffect(() => {
    if (isOpen) {
      setLibrary(LibraryService.getLibrary());
      setStats(LibraryService.getStats());
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleRemoveBook = (e, bookId) => {
    e.stopPropagation();
    if (confirm('确定从书架中移除本书及其阅读进度吗？')) {
      LibraryService.removeBook(bookId);
      const remaining = LibraryService.getLibrary();
      setLibrary(remaining);
      if (onDeleteBook) {
        onDeleteBook(bookId, remaining);
      }
    }
  };

  const todayGoalPercent = Math.min(100, Math.round((stats.todayMinutes / stats.dailyGoalMinutes) * 100));

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-card glass-panel"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '720px',
          maxWidth: '92vw',
          maxHeight: '88vh',
          borderRadius: 'var(--radius-lg)',
          padding: '24px',
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-color)',
          boxShadow: 'var(--shadow-lg)',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px',
          overflow: 'hidden'
        }}
      >
        {/* Header Bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: 'var(--radius-md)',
                background: 'var(--accent-light)',
                color: 'var(--accent-color)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <BookOpen size={20} />
            </div>
            <div>
              <h3 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)' }}>我的书架</h3>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>已保存的电子书与阅读数据仪表盘</p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              onClick={() => {
                onImportNewEpub();
                onClose();
              }}
              className="btn-primary"
              style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}
            >
              <Plus size={16} /> 导入 EPUB 电子书
            </button>
            <button onClick={onClose} className="btn-icon" style={{ width: '32px', height: '32px' }}>
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Reading Insights & Goal Banner (Apple Books Style) */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '12px',
            background: 'var(--bg-secondary)',
            padding: '16px',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-subtle)'
          }}
        >
          {/* Today Goal */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: 'var(--radius-full)',
                background: 'rgba(217, 107, 39, 0.15)',
                color: 'var(--accent-color)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}
            >
              <Clock size={20} />
            </div>
            <div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>今日阅读</div>
              <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>
                {stats.todayMinutes} <span style={{ fontSize: '12px', fontWeight: 400 }}>/ {stats.dailyGoalMinutes} 分钟</span>
              </div>
              <div style={{ fontSize: '11px', color: 'var(--accent-color)', fontWeight: 500 }}>
                {todayGoalPercent >= 100 ? '🎉 已完成今日打卡！' : `目标达成 ${todayGoalPercent}%`}
              </div>
            </div>
          </div>

          {/* Streak Days */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', borderLeft: '1px solid var(--border-color)', paddingLeft: '12px' }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: 'var(--radius-full)',
                background: 'rgba(234, 179, 8, 0.15)',
                color: '#eab308',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}
            >
              <Zap size={20} />
            </div>
            <div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>连续专注阅读</div>
              <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>
                {stats.streakDays} <span style={{ fontSize: '12px', fontWeight: 400 }}>天</span>
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>沉浸沉淀好习惯</div>
            </div>
          </div>

          {/* Total Accumulated */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', borderLeft: '1px solid var(--border-color)', paddingLeft: '12px' }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: 'var(--radius-full)',
                background: 'rgba(16, 185, 129, 0.15)',
                color: '#10b981',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}
            >
              <Trophy size={20} />
            </div>
            <div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>累计阅读时长</div>
              <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>
                {Math.floor(stats.totalMinutes / 60)} <span style={{ fontSize: '12px', fontWeight: 400 }}>小时</span> {stats.totalMinutes % 60} <span style={{ fontSize: '12px', fontWeight: 400 }}>分</span>
              </div>
              <div style={{ fontSize: '11px', color: '#10b981', fontWeight: 500 }}>知识积累与陪伴</div>
            </div>
          </div>
        </div>

        {/* Bookshelf Grid */}
        <div style={{ flex: 1, overflowY: 'auto', paddingRight: '4px' }}>
          <h4 style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '12px' }}>
            已入库图书 ({library.length})
          </h4>

          {library.length > 0 ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px' }}>
              {library.map((b) => {
                const isCurrent = b.id === currentBookId;
                const progress = b.progressPercent || 0;

                return (
                  <div
                    key={b.id}
                    onClick={() => {
                      onSelectBook(b);
                      onClose();
                    }}
                    className="glass-panel"
                    style={{
                      padding: '12px',
                      borderRadius: 'var(--radius-md)',
                      border: isCurrent ? '2px solid var(--accent-color)' : '1px solid var(--border-color)',
                      background: isCurrent ? 'var(--accent-light)' : 'var(--bg-surface)',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '10px',
                      position: 'relative',
                      transition: 'transform 0.2s, box-shadow 0.2s',
                      boxShadow: 'var(--shadow-sm)'
                    }}
                  >
                    {/* Book Cover / Placeholder */}
                    <div
                      style={{
                        width: '100%',
                        height: '140px',
                        borderRadius: 'var(--radius-sm)',
                        overflow: 'hidden',
                        background: 'var(--bg-secondary)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        position: 'relative'
                      }}
                    >
                      {b.cover ? (
                        <img src={b.cover} alt={b.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <div style={{ textAlign: 'center', padding: '12px', color: 'var(--text-muted)' }}>
                          <BookOpen size={32} style={{ margin: '0 auto 6px auto', opacity: 0.6 }} />
                          <div style={{ fontSize: '11px', fontWeight: 600 }}>{b.title}</div>
                        </div>
                      )}

                      {/* Remove Button */}
                      <button
                        onClick={(e) => handleRemoveBook(e, b.id)}
                        className="btn-icon"
                        style={{
                          position: 'absolute',
                          top: '6px',
                          right: '6px',
                          background: 'rgba(0,0,0,0.6)',
                          color: '#ffffff',
                          width: '24px',
                          height: '24px',
                          borderRadius: 'var(--radius-full)'
                        }}
                        title="从书架移除"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>

                    {/* Meta */}
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <div
                        style={{
                          fontSize: '13px',
                          fontWeight: 600,
                          color: 'var(--text-primary)',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis'
                        }}
                        title={b.title}
                      >
                        {b.title}
                      </div>

                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        {b.author || '未知作者'}
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                        <span>已读 {progress}%</span>
                        {isCurrent && <span style={{ color: 'var(--accent-color)', fontWeight: 600 }}>当前阅读</span>}
                      </div>

                      <div
                        style={{
                          width: '100%',
                          height: '4px',
                          background: 'var(--bg-secondary)',
                          borderRadius: 'var(--radius-full)',
                          overflow: 'hidden'
                        }}
                      >
                        <div
                          style={{
                            width: `${progress}%`,
                            height: '100%',
                            background: 'var(--accent-color)',
                            borderRadius: 'var(--radius-full)',
                            transition: 'width 0.3s'
                          }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
              书架暂无保存的书籍。点击上方【导入 EPUB 电子书】添加！
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
