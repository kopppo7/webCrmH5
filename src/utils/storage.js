// src/utils/storage.js

export const storage = {
  setStorageSync(key, value) {
    try {
      // 自动处理对象序列化
      const data = JSON.stringify(value);
      window.localStorage.setItem(key, data);
    } catch (e) {
      console.error('存储失败:', e);
    }
  },

  getStorageSync(key) {
    try {
      const data = window.localStorage.getItem(key);
      return data ? JSON.parse(data) : null;
    } catch (e) {
      console.error('读取失败:', e);
      return null;
    }
  },

  removeStorageSync(key) {
    window.localStorage.removeItem(key);
  },

  clearStorageSync() {
    window.localStorage.clear();
  }
};