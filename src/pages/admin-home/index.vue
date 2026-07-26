<!-- src/pages/admin-home/index.vue -->
<template>
  <div class="admin-container">
    <!-- 顶部数据概览 -->
    <div class="admin-header">
      <h2 class="title">{{ t('admin.title', '管理控制台') }}</h2>
      <p class="subtitle">{{ t('admin.subtitle', '全面掌控机械设备的销售与线索流转') }}</p>
      
      <!-- 升级为 2x2 网格以适配 4 项数据 -->
      <div class="data-board">
        <div class="data-item">
          <span class="num">128</span>
          <span class="label">本月新增线索</span>
        </div>
        <div class="data-item">
          <span class="num">356</span>
          <span class="label">本月跟进次数</span>
        </div>
        <div class="data-item">
          <span class="num">15</span>
          <span class="label">本月成交</span>
        </div>
        <div class="data-item">
          <span class="num">42</span>
          <span class="label">重点客户数量</span>
        </div>
      </div>
    </div>

    <!-- 核心功能宫格 -->
    <div class="section-container">
      <h3 class="section-title">业务管理</h3>
      <van-grid :column-num="3" :border="false" class="custom-grid">
        <van-grid-item icon="cluster-o" text="分配客户" to="/admin-customer-assign" />
        <van-grid-item icon="friends-o" text="查看客户池" to="/admin-customer-pool" />
        <van-grid-item icon="chart-trending-o" text="销售报表" />
        <van-grid-item icon="notes-o" text="工作报告" />
        <van-grid-item icon="orders-o" text="设备订单" />
        <van-grid-item icon="setting-o" text="系统设置" to="/admin-setting"  />
      </van-grid>
    </div>

    <!-- 员工数据模块 -->
    <div class="section-container">
      <h3 class="section-title">员工数据</h3>
      <!-- <van-cell-group inset>
        <van-cell title="新增员工" is-link icon="add-o" to="/admin-add-user" />
        <van-cell title="销售团队管理" is-link icon="manager-o" to="/admin-user-list" />
        <van-cell title="全局字典配置" is-link icon="apps-o" to="/admin-dict-manage" />
      </van-cell-group> -->
    </div>
    
  </div>
</template>

<script setup>
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';

const { t } = useI18n();
const router = useRouter();

</script>

<style scoped>
.admin-container {
  min-height: 100vh;
  background-color: #f7f8fa;
  padding-bottom: 20px;
}

.admin-header {
  background: linear-gradient(135deg, #1989fa, #005eb8);
  padding: 40px 20px 30px;
  color: #fff;
}

.title {
  margin: 0 0 8px;
  font-size: 24px;
}

.subtitle {
  margin: 0 0 20px;
  font-size: 14px;
  opacity: 0.8;
}

/* 升级为 CSS Grid 网格布局 (2行2列) */
.data-board {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px 0;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 20px 0;
  backdrop-filter: blur(10px);
}

.data-item {
  text-align: center;
  position: relative;
}

/* 为左侧的两个数据项添加右侧竖线分隔符 */
.data-item:nth-child(odd)::after {
  content: '';
  position: absolute;
  right: 0;
  top: 10%;
  height: 80%;
  width: 1px;
  background: rgba(255, 255, 255, 0.2);
}

.num {
  display: block;
  font-size: 22px;
  font-weight: bold;
  margin-bottom: 4px;
}

.label {
  font-size: 12px;
  opacity: 0.9;
}

.section-container {
  margin: 16px 16px 0;
}

.section-title {
  font-size: 16px;
  color: #323233;
  margin: 0 0 12px 8px;
  font-weight: 600;
}

.custom-grid {
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0,0,0,0.04);
}

.form-section {
  margin: 24px 16px;
}
</style>