import React from 'react';
import {
  ArrowRight, BookOpen, CalendarDays, Clock3, HardHat, Image, Layers3, Music2, Plus
} from 'lucide-react';
import { BookCover } from '../Library/BookCover';
import './home.css';

function formatMinutes(value) {
  const minutes = Math.max(0, Math.floor(Number(value) || 0));
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return hours ? `${hours} 小时 ${rest} 分` : `${rest} 分钟`;
}

export const Home = ({ library, stats, onSelectBook, onOpenLibrary, onOpenGuide, onImport }) => {
  const recentBooks = library.slice(0, 5);
  const metrics = [
    { label: '累计阅读', value: formatMinutes(stats.totalMinutes), Icon: BookOpen },
    { label: '今日阅读', value: formatMinutes(stats.todayMinutes), Icon: Clock3 },
    { label: '已导入', value: `${library.length} 本`, Icon: Layers3 },
    { label: '连续阅读', value: `${stats.streakDays || 0} 天`, Icon: CalendarDays },
  ];

  return (
    <main className="home-page">
      <div className="home-content">
        <h1 className="home-title">我的书架</h1>

        <section className="reading-summary" aria-label="阅读统计">
          {metrics.map(({ label, value, Icon }) => (
            <div className="reading-metric" key={label}>
              <span className="home-icon-tile"><Icon size={24} strokeWidth={1.8} aria-hidden="true" /></span>
              <div className="reading-metric-copy">
                <span className="reading-metric-label">{label}</span>
                <strong>{value}</strong>
              </div>
            </div>
          ))}
        </section>

        <section className="recent-section" aria-labelledby="recent-heading">
          <div className="home-section-heading">
            <h2 id="recent-heading">最近阅读</h2>
            <button className="home-text-link" onClick={onOpenLibrary}>
              查看全部图书 <ArrowRight size={19} aria-hidden="true" />
            </button>
          </div>

          {recentBooks.length ? (
            <div className="recent-books">
              {recentBooks.map((book) => {
                const progress = Math.max(0, Math.min(100, Number(book.progressPercent) || 0));
                return (
                  <button className="recent-book" key={book.id} onClick={() => onSelectBook(book)} aria-label={`打开${book.title}，已读 ${progress}%`}>
                    <BookCover book={book} />
                    <span className="recent-book-title" title={book.title}>{book.title}</span>
                    <span className="recent-book-author" title={book.author}>{book.author || '未知作者'}</span>
                    <span className="recent-book-progress">
                      <span className="progress-track"><span style={{ width: `${progress}%` }} /></span>
                      <span>已读 {progress}%</span>
                    </span>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="home-empty">
              <BookOpen size={30} strokeWidth={1.5} aria-hidden="true" />
              <div><strong>书架还是空的</strong><p>导入一本 EPUB 电子书，开始阅读。</p></div>
              <button className="btn-primary" onClick={onImport}><Plus size={16} /> 导入书籍</button>
            </div>
          )}
        </section>

        <div className="home-bottom">
          <section className="home-panel guide-panel" aria-labelledby="guide-heading">
            <img className="guide-illustration" src="./images/guide-illustration.png" alt="" />
            <div className="guide-copy">
              <div className="panel-title"><BookOpen size={28} strokeWidth={1.7} aria-hidden="true" /><h2 id="guide-heading">使用指南</h2></div>
              <p>了解导入、阅读设置与 AI 助手。</p>
              <button className="btn-primary guide-button" onClick={onOpenGuide}>查看指南 <ArrowRight size={18} aria-hidden="true" /></button>
            </div>
          </section>

          <section className="home-panel roadmap-panel" aria-labelledby="roadmap-heading">
            <div className="roadmap-header">
              <HardHat size={26} strokeWidth={1.8} aria-hidden="true" />
              <div><h2 id="roadmap-heading">施工区</h2><p>以下功能正在规划中，敬请期待。</p></div>
            </div>
            <div className="roadmap-list">
              <div className="roadmap-item">
                <Image size={23} strokeWidth={1.8} aria-hidden="true" />
                <div><strong>自定义壁纸</strong><p>计划支持从本地选择图片作为阅读背景。</p></div>
                <span>计划中</span>
              </div>
              <div className="roadmap-item">
                <Music2 size={23} strokeWidth={1.8} aria-hidden="true" />
                <div><strong>音乐播放器</strong><p>为阅读增添音乐，营造沉浸氛围。</p></div>
                <span>计划中</span>
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
};
