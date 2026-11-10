import React, { useEffect, useRef } from 'react';
import { BookOpen, X } from 'lucide-react';

const sections = [
  {
    title: '导入与打开图书',
    text: '点击右上角“导入书籍”，选择 EPUB 文件。新书从第一章开始；再次打开已读图书时，会回到该书上次阅读的章节。'
  },
  {
    title: '管理书架',
    text: '首页展示最近阅读的图书和各自的阅读进度。点击“查看全部图书”可浏览完整书架、打开图书或移除不需要的图书。'
  },
  {
    title: '阅读与排版',
    text: '阅读时使用左上角目录或页面底部的上一章、下一章切换章节；点击右上角的排版按钮，可以调整主题、字号、字体、行距和版心宽度。点击插图可放大查看。'
  },
  {
    title: '使用 AI 助手',
    text: '先在右上角设置中选择服务商，填写 API Key 和模型并测试连接。阅读时选中文本，可选择解释、翻译、摘要或向 AI 提问，也可以直接在侧栏输入问题。'
  },
  {
    title: '数据保存在何处',
    text: '图书和阅读进度保存在本机。API Key 也保存在本机浏览器存储中，但未加密；使用 AI 时，请求会发送给所选服务商。'
  }
];

export const GuideModal = ({ isOpen, onClose }) => {
  const closeRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return undefined;
    closeRef.current?.focus();
    const onKeyDown = (event) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <section className="guide-modal" role="dialog" aria-modal="true" aria-labelledby="guide-modal-title" onClick={(event) => event.stopPropagation()}>
        <header className="guide-modal-header">
          <div className="guide-modal-heading"><span className="home-icon-tile"><BookOpen size={23} /></span><div><h2 id="guide-modal-title">Reeder 使用指南</h2><p>从导入书籍到使用 AI 助手</p></div></div>
          <button ref={closeRef} className="btn-icon" onClick={onClose} aria-label="关闭使用指南"><X size={20} /></button>
        </header>
        <div className="guide-modal-content">
          {sections.map((section, index) => (
            <section className="guide-step" key={section.title}>
              <span className="guide-step-number">{index + 1}</span>
              <div><h3>{section.title}</h3><p>{section.text}</p></div>
            </section>
          ))}
        </div>
      </section>
    </div>
  );
};
