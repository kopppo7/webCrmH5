<!-- src/App.vue -->
<template>
  <!-- 路由视图入口，所有页面都在这里渲染 -->
  <router-view />
</template>

<script setup>
// 根组件目前不需要复杂的业务逻辑
</script>

<style>
/* 可以在这里做一些简单的全局样式重置，对标 app.wxss */
html, body {
  margin: 0;
  padding: 0;
  width: 100%;
  height: 100%;
  background-color: #f7f8fa; /* Vant 推荐的默认底色 */
  -webkit-font-smoothing: antialiased;
}

#app {
  width: 100%;
  height: 100%;
}
</style>