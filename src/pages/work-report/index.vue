<!-- src/pages/work-report/index.vue -->
<template>
  <div class="container">
    <div class="header">
      <span class="title">{{ t('workReport.menu.title') }}</span>
      <span class="subtitle">{{ t('workReport.menu.subtitle') }}</span>
    </div>
    
    <div class="card-list">
      <!-- 周工作计划 -->
      <div class="report-card" @click="goTo('weekly')">
        <div class="icon-wrap weekly-bg">📅</div>
        <div class="text-wrap">
          <span class="card-title">{{ t('workReport.menu.weekly') }}</span>
          <span class="card-desc">{{ t('workReport.menu.weeklyDesc') }}</span>
        </div>
        <div class="arrow">&gt;</div>
      </div>
      
      <!-- 每日工作汇报 -->
      <div class="report-card" @click="goTo('daily')">
        <div class="icon-wrap daily-bg">📝</div>
        <div class="text-wrap">
          <span class="card-title">{{ t('workReport.menu.daily') }}</span>
          <span class="card-desc">{{ t('workReport.menu.dailyDesc') }}</span>
        </div>
        <div class="arrow">&gt;</div>
      </div>

      <!-- 历史工作汇报 -->
      <div class="report-card" @click="goTo('history')">
        <div class="icon-wrap history-bg">🕒</div>
        <div class="text-wrap">
          <span class="card-title">{{ t('workReport.menu.history') }}</span>
          <span class="card-desc">{{ t('workReport.menu.historyDesc') }}</span>
        </div>
        <div class="arrow">&gt;</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';

const router = useRouter();
const { t } = useI18n();

// 统一管理路由跳转
const goTo = (type) => {
  const pathMap = {
    'weekly': '/work-report/weekly',
    'daily': '/work-report/daily',
    'history': '/work-report/history'
  };
  
  if (pathMap[type]) {
    router.push(pathMap[type]);
  }
};
</script>

<style scoped>
/* 容器及全局背景适配 H5 */
.container { 
  background: #f5f7fa; 
  padding: 20px 15px; 
  min-height: 100vh;
  box-sizing: border-box;
}

.header { 
  margin-bottom: 25px; 
  width: 100%;
}

.title { 
  font-size: 22px; 
  font-weight: bold; 
  color: #333; 
  display: block; 
}

.subtitle { 
  font-size: 14px; 
  color: #888; 
  margin-top: 6px; 
  display: block; 
}

.card-list {
  width: 100%;
}

.report-card { 
  background: #fff; 
  border-radius: 10px; 
  padding: 15px; 
  display: flex; 
  align-items: center; 
  margin-bottom: 15px; 
  box-shadow: 0 2px 8px rgba(0,0,0,0.03); 
  cursor: pointer;
  transition: all 0.2s ease;
}

.report-card:active {
  opacity: 0.8;
  transform: scale(0.98);
}

.icon-wrap { 
  width: 45px; 
  height: 45px; 
  border-radius: 12px; 
  display: flex; 
  align-items: center; 
  justify-content: center; 
  font-size: 22px; 
  margin-right: 15px; 
  flex-shrink: 0;
}

/* 图标底色 */
.weekly-bg { background: #e0f2fe; }
.daily-bg { background: #fef3c7; }
.history-bg { background: #eef2ff; color: #6366f1; }

.text-wrap { 
  flex: 1; 
  display: flex; 
  flex-direction: column; 
}

.card-title { 
  font-size: 16px; 
  font-weight: bold; 
  color: #333; 
  margin-bottom: 5px; 
}

.card-desc { 
  font-size: 12px; 
  color: #888; 
  line-height: 1.4;
}

.arrow { 
  font-size: 18px; 
  color: #ccc; 
  font-weight: bold; 
  font-family: monospace;
}
</style>