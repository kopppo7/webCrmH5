<!-- src/pages/sales-data/index.vue -->
<template>
  <div class="sales-data-container">
    <van-nav-bar
      :title="t('title.salesData')"
      :left-text="t('common.back')"
      left-arrow
      @click-left="handleBack"
      fixed
      placeholder
    />

    <!-- 
      🌟 swipeable: 允许滑动切换 
      🌟 lazy-render (默认自带): 只有该标签被激活时，内部内容才会渲染
    -->
    <van-tabs 
      v-model:active="activeTab" 
      color="#1989fa" 
      sticky 
      offset-top="46"
      swipeable
    >
      <van-tab :title="t('salesData.tabs.daily')" name="daily">
        <DailyFollowUp v-if="activeTab === 'daily'" />
      </van-tab>
      
      <van-tab :title="t('salesData.tabs.team')" name="team">
        <TeamData v-if="activeTab === 'team'" />
      </van-tab>
      
      <van-tab :title="t('salesData.tabs.funnel')" name="funnel">
        <FunnelAnalysis v-if="activeTab === 'funnel'" />
      </van-tab>
      
      <van-tab :title="t('salesData.tabs.overview')" name="overview">
        <DataOverview v-if="activeTab === 'overview'" />
      </van-tab>
    </van-tabs>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n'; // 🌟 引入 i18n

// 引入拆分的子组件
import DailyFollowUp from './components/DailyFollowUp.vue';
import TeamData from './components/TeamData.vue';
import FunnelAnalysis from './components/FunnelAnalysis.vue';
import DataOverview from './components/DataOverview.vue';

const router = useRouter();
const { t } = useI18n(); // 🌟 解构 t 函数
const activeTab = ref('daily');

const handleBack = () => {
  router.push('/');
};
</script>

<style scoped>
.sales-data-container {
  min-height: 100vh;
  background-color: #f4f6f9;
}
/* 穿透修改 tabs 样式，确保内容区有足够底边距 */
:deep(.van-tabs__content) {
  padding-bottom: 20px;
}
</style>