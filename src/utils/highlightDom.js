/**
 * Reeder AI - 章节 DOM 文本偏移计算与跨段高亮渲染工具
 */

function collectTextNodes(container) {
  const nodes = [];
  if (!container) return { nodes, fullText: '' };

  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, null);
  let offset = 0;
  let current = walker.nextNode();

  while (current) {
    const text = current.nodeValue || '';
    const length = text.length;
    if (length > 0) {
      nodes.push({
        node: current,
        start: offset,
        end: offset + length
      });
      offset += length;
    }
    current = walker.nextNode();
  }

  return {
    nodes,
    fullText: nodes.map((item) => item.node.nodeValue || '').join('')
  };
}

/**
 * 清除容器内所有高亮包裹标签并归一化文本节点，恢复干净 DOM
 */
export function unwrapHighlights(container) {
  if (!container) return;
  const marks = container.querySelectorAll('mark.reeder-highlight');
  if (!marks.length) return;

  marks.forEach((mark) => {
    const parent = mark.parentNode;
    if (!parent) return;
    while (mark.firstChild) {
      parent.insertBefore(mark.firstChild, mark);
    }
    parent.removeChild(mark);
  });

  container.normalize();
}

/**
 * 计算用户当前选区在章节容器内的全局字符偏移量（支持跨自然段）
 */
export function getSelectionOffsets(container, range) {
  if (!container || !range) return null;
  if (!container.contains(range.startContainer) || !container.contains(range.endContainer)) {
    return null;
  }

  try {
    const preStart = document.createRange();
    preStart.selectNodeContents(container);
    preStart.setEnd(range.startContainer, range.startOffset);
    let startOffset = preStart.toString().length;

    const preEnd = document.createRange();
    preEnd.selectNodeContents(container);
    preEnd.setEnd(range.endContainer, range.endOffset);
    let endOffset = preEnd.toString().length;

    if (endOffset <= startOffset) return null;

    const { fullText } = collectTextNodes(container);
    let rawSlice = fullText.slice(startOffset, endOffset);

    // 去除首尾空白并同步微调偏移量，确保高亮范围紧贴有效文字
    const leadingSpaces = rawSlice.match(/^\s*/)?.[0].length || 0;
    const trailingSpaces = rawSlice.match(/\s*$/)?.[0].length || 0;
    startOffset += leadingSpaces;
    endOffset -= trailingSpaces;

    if (endOffset <= startOffset) return null;

    const quote = fullText.slice(startOffset, endOffset);
    if (!quote.trim()) return null;

    return {
      quote,
      startOffset,
      endOffset,
      prefix: fullText.slice(Math.max(0, startOffset - 24), startOffset),
      suffix: fullText.slice(endOffset, endOffset + 24),
      fullText
    };
  } catch (error) {
    console.warn('Failed to calculate selection offsets:', error);
    return null;
  }
}

/**
 * 校验并解析单条高亮在当前章节文本中的精确范围（含上下文兜底恢复）
 */
function resolveNoteRange(fullText, note) {
  if (!fullText || !note?.quote) return null;
  const quote = note.quote;

  if (
    Number.isInteger(note.startOffset) &&
    Number.isInteger(note.endOffset) &&
    note.startOffset >= 0 &&
    note.endOffset <= fullText.length &&
    fullText.slice(note.startOffset, note.endOffset) === quote
  ) {
    return { start: note.startOffset, end: note.endOffset };
  }

  // 上下文兜底定位
  const pattern = `${note.prefix || ''}${quote}${note.suffix || ''}`;
  if (pattern.length > quote.length) {
    const idx = fullText.indexOf(pattern);
    if (idx !== -1) {
      const start = idx + (note.prefix || '').length;
      return { start, end: start + quote.length };
    }
  }

  const fallbackIdx = fullText.indexOf(quote);
  if (fallbackIdx !== -1) {
    return { start: fallbackIdx, end: fallbackIdx + quote.length };
  }

  return null;
}

/**
 * 将当前章节的所有高亮渲染到正文 DOM 中（支持跨段落，安全无重叠）
 */
export function applyHighlights(container, notes) {
  if (!container) return;
  unwrapHighlights(container);
  if (!Array.isArray(notes) || notes.length === 0) return;

  const { nodes, fullText } = collectTextNodes(container);
  if (!nodes.length || !fullText) return;

  const resolved = [];
  notes.forEach((note) => {
    const range = resolveNoteRange(fullText, note);
    if (range && range.end > range.start) {
      resolved.push({ note, start: range.start, end: range.end });
    }
  });

  if (!resolved.length) return;

  // 按起始偏移排序并跳过任何意外重叠
  resolved.sort((a, b) => a.start - b.start);
  const nonOverlapping = [];
  let lastEnd = 0;
  resolved.forEach((item) => {
    if (item.start >= lastEnd) {
      nonOverlapping.push(item);
      lastEnd = item.end;
    }
  });

  // 为每个高亮预先计算涉及的文本节点片段，再从后往前包裹，避免前序 splitText 破坏后续节点索引
  const operations = [];

  nonOverlapping.forEach(({ note, start, end }) => {
    const segments = [];
    for (let i = 0; i < nodes.length; i += 1) {
      const item = nodes[i];
      if (item.end <= start) continue;
      if (item.start >= end) break;

      const localStart = Math.max(0, start - item.start);
      const localEnd = Math.min(item.end - item.start, end - item.start);
      const sliceText = (item.node.nodeValue || '').slice(localStart, localEnd);

      // 跳过段间纯空白文本节点，避免空白区域出现多余高亮条
      if (sliceText.trim().length > 0) {
        segments.push({
          nodeIndex: i,
          node: item.node,
          localStart,
          localEnd
        });
      }
    }

    if (segments.length > 0) {
      segments.forEach((seg, segIdx) => {
        operations.push({
          ...seg,
          note,
          isLastSegment: segIdx === segments.length - 1
        });
      });
    }
  });

  // 倒序执行 DOM 包裹（按节点索引倒序，同节点内按 localStart 倒序）
  operations.sort((a, b) => {
    if (b.nodeIndex !== a.nodeIndex) return b.nodeIndex - a.nodeIndex;
    return b.localStart - a.localStart;
  });

  operations.forEach(({ node, localStart, localEnd, note, isLastSegment }) => {
    if (!node.parentNode) return;
    const textLength = (node.nodeValue || '').length;
    if (localStart < 0 || localEnd > textLength || localStart >= localEnd) return;

    let targetNode = node;
    if (localEnd < textLength) {
      targetNode.splitText(localEnd);
    }
    if (localStart > 0) {
      targetNode = targetNode.splitText(localStart);
    }

    const mark = document.createElement('mark');
    const hasNote = Boolean((note.note || '').trim());
    mark.className = `reeder-highlight reeder-hl-${note.color || 'amber'}${hasNote ? ' has-note' : ''}`;
    mark.dataset.noteId = note.id;
    mark.dataset.noteColor = note.color || 'amber';
    if (hasNote && isLastSegment) {
      mark.dataset.noteEnd = 'true';
    }

    targetNode.parentNode.insertBefore(mark, targetNode);
    mark.appendChild(targetNode);
  });
}

/**
 * 滚动并闪烁定位到指定笔记的高亮位置
 */
export function scrollToHighlight(container, noteId) {
  if (!container || !noteId) return false;
  const escaped = typeof CSS !== 'undefined' && CSS.escape ? CSS.escape(noteId) : noteId.replace(/["\\]/g, '\\$&');
  const marks = container.querySelectorAll(`mark.reeder-highlight[data-note-id="${escaped}"]`);
  if (!marks.length) return false;

  marks[0].scrollIntoView({ behavior: 'smooth', block: 'center' });
  marks.forEach((mark) => {
    mark.classList.remove('reeder-highlight-flash');
    // 触发重排以重播动画
    void mark.offsetWidth;
    mark.classList.add('reeder-highlight-flash');
  });

  window.setTimeout(() => {
    marks.forEach((mark) => mark.classList.remove('reeder-highlight-flash'));
  }, 1600);

  return true;
}
