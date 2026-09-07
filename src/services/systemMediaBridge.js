export const SystemMediaBridge = {
  isSupported() {
    return false;
  },

  async connect() {
    return {
      connected: false,
      reason: '当前 Electron 渲染层无法直接访问 Windows GSMTC，需要安全的原生 WinRT 桥接模块。'
    };
  },

  async disconnect() {}
};
