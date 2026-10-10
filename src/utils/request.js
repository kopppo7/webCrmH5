// src/utils/request.js
import axios from 'axios';
import { storage } from './storage';
import router from '../router';
import { showToast, showDialog } from 'vant';

const service = axios.create({
  baseURL: '',
  // baseURL: 'http://43.133.112.157:3000',
  // baseURL: 'https://51f736d5.r12.cpolar.top', 
  timeout: 15000,
});

// ==========================================
// 🌟 核心新增：解析 JWT Token 判断是否濒临过期
// ==========================================
const isTokenExpired = (token) => {
  if (!token) return true;
  try {
    // 1. 拆解 JWT 的 Payload 部分
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(window.atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    
    const payload = JSON.parse(jsonPayload);
    
    // 2. 获取过期时间 (JWT 的 exp 单位是秒，转成毫秒)
    const expTime = payload.exp * 1000; 
    const nowTime = Date.now();
    
    // 3. 核心业务逻辑：设定 5 分钟 (300000 毫秒) 的安全缓冲期
    // 如果当前时间距离过期时间不足 5 分钟，为了防止表单填一半突然过期，直接判定为过期
    return (expTime - nowTime) < 300000; 
  } catch (error) {
    return true; // 解析失败、Token被篡改等异常情况，直接视为过期
  }
};

// ==========================================
// 1. 请求拦截器 (发送前端主动校验)
// ==========================================
service.interceptors.request.use(
  config => {
    // 排除掉不需要校验 Token 的登录接口
    if (config.url.includes('/login')) return config;

    const token = storage.getStorageSync('Token');
    
    // 🌟 在请求真正发出去之前，进行前端本地拦截
    if (token) {
      if (isTokenExpired(token)) {
        // 如果发现快过期了，直接在前端掐断请求，保护用户正在填写的表单数据不乱飞
        storage.removeStorageSync('Token');
        storage.removeStorageSync('UserInfo');
        
        showDialog({
          title: '安全提示',
          message: '为了您的数据安全，登录状态即将失效，请重新登录。',
          confirmButtonText: '去登录'
        }).then(() => {
          router.replace('/login');
        });
        
        // 返回一个 Promise.reject 中断本次 Axios 请求
        return Promise.reject(new Error('Token Expired Pre-Check'));
      }
      
      // 未过期，正常挂载
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  error => Promise.reject(error)
);

// ==========================================
// 2. 响应拦截器 (作为最后的兜底)
// ==========================================
service.interceptors.response.use(
  response => {
    const res = response.data;

    if (res.code === 200) {
      return res;
    } 
    
    // 这里的 401 现在只作为“异地登录”或“Token被后端强制吊销”的兜底拦截
    if (res.code === 401) {
      if (response.config.url.includes('/login')) {
        showToast(res.message || '账号或密码错误');
      } else {
        showToast('登录状态异常，请重新登录');
        storage.removeStorageSync('Token');
        storage.removeStorageSync('UserInfo');
        router.replace('/login');
      }
      return Promise.reject(new Error(res.message || 'Error'));
    }

    showToast(res.message || '系统错误');
    return Promise.reject(new Error(res.message || 'Error'));
  },
  error => {
    // 处理被我们 request 拦截器主动取消的请求，避免弹出“网络异常”
    if (error.message === 'Token Expired Pre-Check') {
      return Promise.reject(error); 
    }
    showToast('网络连接异常，请检查后端服务');
    return Promise.reject(error);
  }
)

export default service;