/**
 * Reeder AI - Large Language Model Service Client
 * Supports OpenAI API standard (DeepSeek, ChatGPT, Moonshot, Qwen, Claude, Custom Endpoint)
 */

const STORAGE_KEY = 'reeder_ai_llm_config';

export const DEFAULT_LLM_CONFIG = {
  vendor: 'deepseek', // 'deepseek' | 'openai' | 'custom'
  baseUrl: 'https://api.deepseek.com/v1',
  apiKey: '',
  model: 'deepseek-chat',
  temperature: 0.7,
  systemPrompt: '你是一位博学且友善的阅读辅助助手。在回答用户关于书中词汇、段落或知识点的提问时，请提供精准、透彻且易于理解的解释。'
};

export const PRESET_PROVIDERS = [
  {
    id: 'deepseek',
    name: 'DeepSeek (深度求索)',
    baseUrl: 'https://api.deepseek.com/v1',
    defaultModel: 'deepseek-chat',
    models: ['deepseek-chat', 'deepseek-reasoner']
  },
  {
    id: 'openai',
    name: 'OpenAI (ChatGPT)',
    baseUrl: 'https://api.openai.com/v1',
    defaultModel: 'gpt-4o-mini',
    models: ['gpt-4o-mini', 'gpt-4o', 'gpt-3.5-turbo']
  },
  {
    id: 'moonshot',
    name: 'Moonshot (Kimi)',
    baseUrl: 'https://api.moonshot.cn/v1',
    defaultModel: 'moonshot-v1-8k',
    models: ['moonshot-v1-8k', 'moonshot-v1-32k']
  },
  {
    id: 'qwen',
    name: 'Qwen (阿里通义千问)',
    baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    defaultModel: 'qwen-plus',
    models: ['qwen-turbo', 'qwen-plus', 'qwen-max']
  },
  {
    id: 'custom',
    name: 'Custom Endpoint (自定义/本地Ollama)',
    baseUrl: 'http://localhost:11434/v1',
    defaultModel: 'llama3',
    models: ['llama3', 'qwen2', 'custom']
  }
];

export class LLMService {
  static getConfig() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return { ...DEFAULT_LLM_CONFIG, ...JSON.parse(saved) };
      }
    } catch (e) {
      console.error('Failed to load LLM config:', e);
    }
    return DEFAULT_LLM_CONFIG;
  }

  static saveConfig(config) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
      return true;
    } catch (e) {
      console.error('Failed to save LLM config:', e);
      return false;
    }
  }

  /**
   * Test current API connection
   */
  static async testConnection(config) {
    const targetConfig = config || this.getConfig();
    if (!targetConfig.apiKey && targetConfig.vendor !== 'custom') {
      throw new Error('请先填写 API Key！');
    }

    const cleanBaseUrl = targetConfig.baseUrl.replace(/\/+$/, '');
    const endpoint = `${cleanBaseUrl}/chat/completions`;

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${targetConfig.apiKey}`
        },
        body: JSON.stringify({
          model: targetConfig.model,
          messages: [
            { role: 'system', content: 'You are a test assistant.' },
            { role: 'user', content: 'Hi, respond with OK.' }
          ],
          max_tokens: 10
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP Error ${response.status}: ${errorText || response.statusText}`);
      }

      const data = await response.json();
      if (data.choices && data.choices.length > 0) {
        return { success: true, message: 'API 连接成功！模型响应正常。' };
      } else {
        throw new Error('API 返回格式不符合预期');
      }
    } catch (err) {
      throw new Error(err.message || '连接失败，请检查 Base URL 与 API Key 是否有效。');
    }
  }

  /**
   * Stream completion response
   */
  static async streamChat({ messages, onChunk, onError, onFinish }) {
    const config = this.getConfig();
    
    // Check key
    if (!config.apiKey && config.vendor !== 'custom') {
      onError?.(new Error('未配置 API Key，请点击顶部⚙️图标配置您的第三方 API Key。'));
      return;
    }

    const cleanBaseUrl = config.baseUrl.replace(/\/+$/, '');
    const endpoint = `${cleanBaseUrl}/chat/completions`;

    const fullMessages = [
      { role: 'system', content: config.systemPrompt || DEFAULT_LLM_CONFIG.systemPrompt },
      ...messages
    ];

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.apiKey}`
        },
        body: JSON.stringify({
          model: config.model,
          messages: fullMessages,
          temperature: config.temperature ?? 0.7,
          stream: true
        })
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        const errMsg = errJson?.error?.message || `HTTP ${response.status} ${response.statusText}`;
        throw new Error(errMsg);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let fullText = '';
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Keep incomplete trailing chunk in buffer

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith(':')) continue;
          if (trimmed === 'data: [DONE]') {
            onFinish?.(fullText);
            return;
          }

          if (trimmed.startsWith('data: ')) {
            try {
              const jsonStr = trimmed.substring(6);
              const parsed = JSON.parse(jsonStr);
              const deltaContent = parsed.choices?.[0]?.delta?.content || '';
              if (deltaContent) {
                fullText += deltaContent;
                onChunk?.(deltaContent, fullText);
              }
            } catch (e) {
              // Ignore single malformed JSON line in stream
            }
          }
        }
      }

      onFinish?.(fullText);
    } catch (err) {
      console.error('LLM Stream Error:', err);
      onError?.(err);
    }
  }
}
