import { onMounted, onUnmounted } from 'vue'

export function createPolling(fn: (signal: AbortSignal) => Promise<void>, intervalMs: number) {
  let timer: ReturnType<typeof setTimeout> | undefined
  let controller: AbortController | undefined
  let generation = 0
  let active = false
  let delay = intervalMs

  function cancel() {
    ++generation
    clearTimeout(timer)
    controller?.abort()
  }

  async function refresh() {
    cancel()
    if (!active || document.hidden) return
    const current = generation
    const request = new AbortController()
    controller = request
    try {
      await fn(request.signal)
      if (current === generation) delay = intervalMs
    } catch {
      if (current === generation) delay = Math.min(delay * 2, Math.max(30_000, intervalMs * 8))
    } finally {
      if (active && current === generation && !document.hidden) timer = setTimeout(() => void refresh(), delay)
    }
  }

  function visibility() {
    if (document.hidden) cancel()
    else void refresh()
  }
  function start() {
    if (active) return
    active = true
    document.addEventListener('visibilitychange', visibility)
    void refresh()
  }
  function stop() {
    active = false
    cancel()
    document.removeEventListener('visibilitychange', visibility)
  }
  function reset() {
    delay = intervalMs
  }
  return { refresh, start, stop, cancel, reset }
}

export function usePolling(fn: (signal: AbortSignal) => Promise<void>, intervalMs: number) {
  const polling = createPolling(fn, intervalMs)
  onMounted(polling.start)
  onUnmounted(polling.stop)
  return polling
}
