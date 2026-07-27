// src/locales/index.js
import { createI18n } from "vue-i18n";
import { storage } from "../utils/storage";

import en from "./en";
import zh from "./zh";
import th from "./th";
import vi from "./vi";

const messages = { en, zh, th, vi };

// 初始化优先逻辑：
// 1. 优先读取本地 storage 中用户存的语言设置
// 2. 如果没有，默认使用 'en' (英文)
const currentLang = storage.getStorageSync("UserLang") || "en";

const i18n = createI18n({
  legacy: false, // 必须设置为 false 才能使用 Vue 3 的 Composition API
  locale: currentLang,
  fallbackLocale: "en", // 如果某个词条在当前语言找不到，默认回退到英文
  messages,
});

export default i18n;
