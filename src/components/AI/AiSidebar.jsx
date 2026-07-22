import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, X, Send, Bot, User, Trash2, Copy, Check, RefreshCw, MessageSquare, Quote } from 'lucide-react';
import { LLMService } from '../../services/llmService';

export const AiSidebar = ({ isOpen, onClose, selectedText, promptAction, onClearSelectedText }) => {
  const [messages, setMessages] = useState([
    {
      id: 'init-msg',
      role: 'assistant',
      content: '你好！我是你的 AI 阅读助手。在阅读过程中选中任何难词、长句或词条，你可以点击悬浮浮条或直接在此向我提问！'
    }
  ]);
  const [inputMsg, setInputMsg] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [copiedId, setCopiedId] = useState(null);
  const messagesEndRef = useRef(null);

  // Auto scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isStreaming]);

  // React to incoming text selection prompt action
  useEffect(() => {
    if (selectedText && promptAction) {
      handlePromptAction(promptAction, selectedText);
    }
  }, [selectedText, promptAction]);

  const handlePromptAction = (action, text) => {
    let promptText = '';
    if (action === 'explain') {
      promptText = `请结合上下文，详细解释并分析词汇/概念“${text}”的涵义与使用背景。`;
    } else if (action === 'translate') {
      promptText = `请将以下段落翻译为优雅流畅的中文：\n\n"${text}"`;
    } else if (action === 'summarize') {
      promptText = `请提取并总结以下段落的核心要点：\n\n"${text}"`;
    } else if (action === 'ask') {
      promptText = `请简述我对该段文本的解读，并回答相关疑问：\n\n"${text}"`;
    }

    if (promptText) {
      sendMessage(promptText, text);
    }
  };

  const sendMessage = async (userPrompt, quoteText = null) => {
    if (!userPrompt.trim() || isStreaming) return;

    const userMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: userPrompt,
      quote: quoteText || selectedText
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInputMsg('');
    setIsStreaming(true);

    // Prepare Assistant response placeholder
    const assistantId = (Date.now() + 1).toString();
    const placeholderMsg = {
      id: assistantId,
      role: 'assistant',
      content: 'thinking...'
    };

    setMessages([...newMessages, placeholderMsg]);

    // Format chat history for API payload
    const apiMessages = newMessages
      .filter(m => m.id !== 'init-msg')
      .map(m => ({ role: m.role, content: m.content }));

    let currentResponse = '';

    await LLMService.streamChat({
      messages: apiMessages,
      onChunk: (chunk, fullText) => {
        currentResponse = fullText;
        setMessages(prev =>
          prev.map(m => m.id === assistantId ? { ...m, content: fullText } : m)
        );
      },
      onError: (err) => {
        setIsStreaming(false);
        setMessages(prev =>
          prev.map(m =>
            m.id === assistantId
              ? { ...m, content: `⚠️ 请求失败: ${err.message}` }
              : m
          )
        );
      },
      onFinish: () => {
        setIsStreaming(false);
      }
    });
  };

  const handleCopy = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleClearHistory = () => {
    setMessages([
      {
        id: 'init-msg',
        role: 'assistant',
        content: '对话记录已清空。您可以继续选中书文中内容随时提问！'
      }
    ]);
  };

  if (!isOpen) return null;

  return (
    <aside
      className="glass-panel"
      style={{
        position: 'absolute',
        top: '56px',
        right: '0',
        bottom: '0',
        width: '380px',
        maxWidth: '100vw',
        borderLeft: '1px solid var(--border-color)',
        zIndex: 75,
        display: 'flex',
        flexDirection: 'column',
        boxShadow: 'var(--shadow-lg)',
        animation: 'fadeIn 0.2s ease-out'
      }}
    >
      {/* Sidebar Header */}
      <div
        style={{
          padding: '14px 16px',
          borderBottom: '1px solid var(--border-color)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'var(--bg-secondary)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Sparkles size={18} style={{ color: 'var(--accent-color)' }} />
          <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>AI 阅读助理</h3>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <button 
            onClick={handleClearHistory} 
            className="btn-icon" 
            style={{ width: '28px', height: '28px' }}
            title="清空对话历史"
          >
            <Trash2 size={15} />
          </button>
          <button onClick={onClose} className="btn-icon" style={{ width: '28px', height: '28px' }}>
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Selected Text Highlight Card (If active) */}
      {selectedText && (
        <div
          style={{
            margin: '12px 12px 0 12px',
            padding: '10px 12px',
            background: 'var(--accent-light)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--accent-color)',
            fontSize: '12px',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--accent-color)', fontWeight: 600 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Quote size={12} /> 当前划选文本
            </span>
            <button onClick={onClearSelectedText} style={{ fontSize: '11px', color: 'var(--text-muted)' }}>释放</button>
          </div>
          <div style={{ color: 'var(--text-primary)', fontStyle: 'italic', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
            “{selectedText}”
          </div>
        </div>
      )}

      {/* Messages Scroll Area */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '14px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {messages.map((m) => {
          const isUser = m.role === 'user';
          return (
            <div
              key={m.id}
              style={{
                display: 'flex',
                gap: '10px',
                alignItems: 'flex-start',
                flexDirection: isUser ? 'row-reverse' : 'row'
              }}
            >
              <div
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: 'var(--radius-full)',
                  background: isUser ? 'var(--accent-color)' : 'var(--bg-secondary)',
                  color: isUser ? '#ffffff' : 'var(--accent-color)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  fontSize: '12px',
                  fontWeight: 600
                }}
              >
                {isUser ? <User size={15} /> : <Bot size={15} />}
              </div>

              <div
                style={{
                  maxWidth: '82%',
                  background: isUser ? 'var(--accent-color)' : 'var(--bg-surface)',
                  color: isUser ? '#ffffff' : 'var(--text-primary)',
                  padding: '10px 14px',
                  borderRadius: isUser ? '14px 4px 14px 14px' : '4px 14px 14px 14px',
                  fontSize: '13px',
                  lineHeight: '1.5',
                  boxShadow: 'var(--shadow-sm)',
                  border: isUser ? 'none' : '1px solid var(--border-color)',
                  position: 'relative'
                }}
              >
                {m.quote && isUser && (
                  <div style={{ fontSize: '11px', opacity: 0.85, paddingBottom: '6px', borderBottom: '1px solid rgba(255,255,255,0.2)', marginBottom: '6px' }}>
                    引用: “{m.quote.substring(0, 30)}...”
                  </div>
                )}

                <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                  {m.content === 'thinking...' ? (
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px', opacity: 0.7 }}>
                      <RefreshCw size={13} className="spin" style={{ animation: 'spin 1s linear infinite' }} /> 思考中...
                    </span>
                  ) : (
                    m.content
                  )}
                </div>

                {!isUser && m.content !== 'thinking...' && (
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '6px' }}>
                    <button
                      onClick={() => handleCopy(m.content, m.id)}
                      style={{ opacity: 0.6, fontSize: '11px', display: 'flex', alignItems: 'center', gap: '3px' }}
                      title="复制回答"
                    >
                      {copiedId === m.id ? <Check size={12} style={{ color: '#10b981' }} /> : <Copy size={12} />}
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Footer Chat Input */}
      <div style={{ padding: '12px', borderTop: '1px solid var(--border-color)', background: 'var(--bg-secondary)' }}>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            sendMessage(inputMsg);
          }}
          style={{ display: 'flex', gap: '8px', alignItems: 'center' }}
        >
          <input
            type="text"
            value={inputMsg}
            onChange={(e) => setInputMsg(e.target.value)}
            placeholder={selectedText ? "输入针对选中文本的问题..." : "询问 AI 任何问题..."}
            disabled={isStreaming}
            style={{
              flex: 1,
              padding: '10px 14px',
              borderRadius: 'var(--radius-full)',
              border: '1px solid var(--border-color)',
              background: 'var(--bg-surface)',
              color: 'var(--text-primary)',
              fontSize: '13px',
              outline: 'none'
            }}
          />
          <button
            type="submit"
            disabled={!inputMsg.trim() || isStreaming}
            className="btn-primary"
            style={{
              width: '38px',
              height: '38px',
              borderRadius: 'var(--radius-full)',
              padding: 0,
              flexShrink: 0
            }}
          >
            <Send size={16} />
          </button>
        </form>
      </div>
    </aside>
  );
};
