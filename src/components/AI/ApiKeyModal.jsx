import React, { useState, useEffect } from 'react';
import { Key, Globe, Cpu, CheckCircle2, AlertCircle, RefreshCw, X, ShieldCheck } from 'lucide-react';
import { LLMService, PRESET_PROVIDERS } from '../../services/llmService';

export const ApiKeyModal = ({ isOpen, onClose }) => {
  const [config, setConfig] = useState(LLMService.getConfig());
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null); // { success: boolean, message: string }

  useEffect(() => {
    if (isOpen) {
      setConfig(LLMService.getConfig());
      setTestResult(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleVendorChange = (vendorId) => {
    const provider = PRESET_PROVIDERS.find(p => p.id === vendorId);
    if (provider) {
      setConfig(prev => ({
        ...prev,
        vendor: provider.id,
        baseUrl: provider.baseUrl,
        model: provider.defaultModel
      }));
    }
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await LLMService.testConnection(config);
      setTestResult({ success: true, message: res.message });
    } catch (err) {
      setTestResult({ success: false, message: err.message });
    } finally {
      setTesting(false);
    }
  };

  const handleSave = () => {
    LLMService.saveConfig(config);
    onClose();
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-card glass-panel"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '460px',
          maxWidth: '90vw',
          borderRadius: 'var(--radius-lg)',
          padding: '24px',
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-color)',
          boxShadow: 'var(--shadow-lg)',
          display: 'flex',
          flexDirection: 'column',
          gap: '18px'
        }}
      >
        {/* Header */}
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
              <Key size={20} />
            </div>
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)' }}>第三方 AI 大模型 API Key</h3>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>手动接入大模型提供商（DeepSeek / ChatGPT / Kimi等）</p>
            </div>
          </div>
          <button onClick={onClose} className="btn-icon" style={{ width: '32px', height: '32px' }}>
            <X size={18} />
          </button>
        </div>

        {/* Security Alert Banner */}
        <div 
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '8px', 
            background: 'var(--bg-secondary)', 
            padding: '10px 12px', 
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border-subtle)',
            fontSize: '12px',
            color: 'var(--text-secondary)'
          }}
        >
          <ShieldCheck size={16} style={{ color: '#10b981', flexShrink: 0 }} />
          <span>隐私保证：所有 API Key 仅加密保存在本地设备，不上传任何服务器。</span>
        </div>

        {/* Vendor Selector */}
        <div>
          <label style={{ fontSize: '13px', fontWeight: 500, display: 'block', marginBottom: '6px', color: 'var(--text-primary)' }}>
            选择模型服务厂商
          </label>
          <select
            value={config.vendor}
            onChange={(e) => handleVendorChange(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 12px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border-color)',
              background: 'var(--bg-secondary)',
              color: 'var(--text-primary)',
              fontSize: '13px',
              outline: 'none'
            }}
          >
            {PRESET_PROVIDERS.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>

        {/* Base URL Input */}
        <div>
          <label style={{ fontSize: '13px', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px', color: 'var(--text-primary)' }}>
            <Globe size={14} /> Base URL (Endpoint)
          </label>
          <input
            type="text"
            value={config.baseUrl}
            onChange={(e) => setConfig({ ...config, baseUrl: e.target.value })}
            placeholder="https://api.deepseek.com/v1"
            style={{
              width: '100%',
              padding: '10px 12px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border-color)',
              background: 'var(--bg-secondary)',
              color: 'var(--text-primary)',
              fontSize: '13px',
              outline: 'none'
            }}
          />
        </div>

        {/* API Key Input */}
        <div>
          <label style={{ fontSize: '13px', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px', color: 'var(--text-primary)' }}>
            <Key size={14} /> API Key
          </label>
          <input
            type="password"
            value={config.apiKey}
            onChange={(e) => setConfig({ ...config, apiKey: e.target.value })}
            placeholder="sk-xxxxxxxxxxxxxxxxxxxxxxxx"
            style={{
              width: '100%',
              padding: '10px 12px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border-color)',
              background: 'var(--bg-secondary)',
              color: 'var(--text-primary)',
              fontSize: '13px',
              outline: 'none'
            }}
          />
        </div>

        {/* Model Name Input */}
        <div>
          <label style={{ fontSize: '13px', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px', color: 'var(--text-primary)' }}>
            <Cpu size={14} /> Model Name (模型名称)
          </label>
          <input
            type="text"
            value={config.model}
            onChange={(e) => setConfig({ ...config, model: e.target.value })}
            placeholder="deepseek-chat"
            style={{
              width: '100%',
              padding: '10px 12px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border-color)',
              background: 'var(--bg-secondary)',
              color: 'var(--text-primary)',
              fontSize: '13px',
              outline: 'none'
            }}
          />
        </div>

        {/* Test Result Message */}
        {testResult && (
          <div 
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px', 
              padding: '10px 12px', 
              borderRadius: 'var(--radius-sm)',
              background: testResult.success ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
              color: testResult.success ? '#059669' : '#dc2626',
              fontSize: '12px',
              border: `1px solid ${testResult.success ? '#10b981' : '#ef4444'}`
            }}
          >
            {testResult.success ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
            <span>{testResult.message}</span>
          </div>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px' }}>
          <button
            type="button"
            onClick={handleTestConnection}
            disabled={testing}
            className="btn-secondary"
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            {testing ? <RefreshCw size={14} className="spin" style={{ animation: 'spin 1s linear infinite' }} /> : null}
            <span>{testing ? '测试中...' : '🧪 测试 API 连接'}</span>
          </button>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={onClose} className="btn-secondary">取消</button>
            <button onClick={handleSave} className="btn-primary">保存配置</button>
          </div>
        </div>
      </div>
    </div>
  );
};
