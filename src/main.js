import { createApp } from 'vue';
import App from './App.vue';
import router from './router';
import i18n from './locales/index'; // 引入 i18n

import Vant from 'vant';
import 'vant/lib/index.css';

const app = createApp(App);

app.use(router);
app.use(Vant);
app.use(i18n); // 挂载 i18n

app.mount('#app');