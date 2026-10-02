import { createApp } from 'vue'
import App from './App.vue'
import { router } from './router'
import { i18n } from './i18n'
import '@fontsource/jetbrains-mono/400.css'
import './styles/main.css'
createApp(App).use(router).use(i18n).mount('#app')
