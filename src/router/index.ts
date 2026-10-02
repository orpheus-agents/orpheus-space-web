import { createRouter, createWebHistory } from 'vue-router'
import { watch } from 'vue'
import { i18n } from '../i18n'
export const sectionLinks = { schedules: '/schedules' }
export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', redirect: '/schedules' },
    { path: '/schedules', name: 'schedules', component: () => import('../views/SchedulesView.vue'), meta: { title: 'nav.schedules' } },
    { path: '/schedules/new', name: 'create', component: () => import('../views/ScheduleEditor.vue'), meta: { title: 'schedule.create' } },
    { path: '/schedules/:id', name: 'schedule', component: () => import('../views/ScheduleView.vue'), meta: { title: 'schedule.title' } },
    { path: '/schedules/:id/edit', name: 'edit', component: () => import('../views/ScheduleEditor.vue'), meta: { title: 'schedule.edit' } },
    { path: '/:pathMatch(.*)*', name: 'not-found', component: () => import('../views/NotFound.vue'), meta: { title: 'common.notFound' } },
  ],
  scrollBehavior: () => ({ top: 0 }),
})
function title() {
  document.title = `${i18n.global.t(String(router.currentRoute.value.meta.title ?? 'nav.schedules'))} / Orpheus Space`
}
router.afterEach(title)
watch(i18n.global.locale, title)
