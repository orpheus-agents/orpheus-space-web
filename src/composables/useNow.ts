import { onMounted, onUnmounted, readonly, ref } from 'vue'
import { createPolling } from './usePolling'

const now = ref(Date.now())
let subscribers = 0
const clock = createPolling(async () => {
  now.value = Date.now()
}, 10_000)

/** All relative timestamps share one visibility-aware clock. */
export function useNow() {
  onMounted(() => {
    if (++subscribers === 1) clock.start()
  })
  onUnmounted(() => {
    if (--subscribers === 0) clock.stop()
  })
  return readonly(now)
}
