/**
 * Internal Error Tracker — Frontend SDK
 * Drop this into any Vue app for automatic error tracking.
 *
 * Usage:
 *   import { initErrorTracker } from './error-tracker'
 *   initErrorTracker({ project: 'rvm-web', apiUrl: '/api/log-error' })
 */

let config = {
  project: 'unknown',
  apiUrl: '/api/log-error',
  enabled: true,
  batch: true,
  batchInterval: 10000, // flush every 10s
  maxBatchSize: 10,
  includeUserAgent: true,
  dedupWindow: 5000 // ignore duplicate errors within 5s
}

let batchQueue = []
let recentErrors = new Map() // message -> timestamp
let flushTimer = null

/**
 * Initialize the error tracker
 */
export function initErrorTracker(opts = {}) {
  config = { ...config, ...opts }

  if (typeof window === 'undefined') return // server-side

  // Global error handler — uncaught exceptions
  window.addEventListener('error', (event) => {
    captureError({
      message: event.message,
      stack: event.error?.stack,
      url: window.location.href,
      level: 'error',
      tags: { type: 'uncaught_error', source: event.filename, line: event.lineno }
    })
    return false // don't suppress default
  })

  // Unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason
    captureError({
      message: reason?.message || String(reason),
      stack: reason?.stack,
      url: window.location.href,
      level: 'error',
      tags: { type: 'unhandled_promise' }
    })
  })

  // Start batch flush timer
  if (config.batch) {
    flushTimer = setInterval(flushBatch, config.batchInterval)
  }

  console.log(`[ErrorTracker] Initialized for ${config.project}`)
}

/**
 * Manually capture an error
 */
export function captureError(opts = {}) {
  if (!config.enabled) return

  const dedupKey = opts.message || 'unknown'
  const now = Date.now()
  const lastSeen = recentErrors.get(dedupKey)

  // Deduplicate within window
  if (lastSeen && (now - lastSeen) < config.dedupWindow) return
  recentErrors.set(dedupKey, now)

  // Clean old dedup entries
  if (recentErrors.size > 100) {
    const cutoff = now - 30000
    for (const [key, ts] of recentErrors) {
      if (ts < cutoff) recentErrors.delete(key)
    }
  }

  const entry = {
    project: config.project,
    level: opts.level || 'error',
    message: typeof opts.message === 'string' ? opts.message.slice(0, 1000) : String(opts.message || 'Unknown error'),
    stack_trace: opts.stack || null,
    url: opts.url || (typeof window !== 'undefined' ? window.location.href : null),
    user_id: opts.userId || null,
    context: {
      ...(config.includeUserAgent && typeof navigator !== 'undefined' ? {
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        language: navigator.language
      } : {}),
      ...(opts.context || {})
    },
    tags: opts.tags || {},
    occurred_at: new Date().toISOString()
  }

  if (config.batch) {
    batchQueue.push(entry)
    if (batchQueue.length >= config.maxBatchSize) {
      flushBatch()
    }
  } else {
    sendError(entry)
  }
}

/**
 * Flush batch queue
 */
function flushBatch() {
  if (batchQueue.length === 0) return
  const batch = batchQueue.splice(0, config.maxBatchSize)
  sendError(batch.length === 1 ? batch[0] : batch)
}

/**
 * Send error(s) to the API
 */
async function sendError(payload) {
  try {
    const response = await fetch(config.apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
    if (!response.ok) {
      console.warn('[ErrorTracker] Failed to send error:', response.status)
    }
  } catch (err) {
    // Silent fail — don't cause cascading errors
    console.warn('[ErrorTracker] Network error:', err.message)
  }
}

/**
 * Wrap an async function with error tracking
 */
export function wrapAsync(fn, context = {}) {
  return async (...args) => {
    try {
      return await fn(...args)
    } catch (err) {
      captureError({
        message: err.message,
        stack: err.stack,
        ...context
      })
      throw err // re-throw so caller still knows
    }
  }
}

/**
 * Create a Vue plugin that auto-captures Vue errors
 */
export function createVueErrorPlugin(project, apiUrl) {
  return {
    install(app, options) {
      initErrorTracker({ project, apiUrl, ...options })

      // Vue error handler
      app.config.errorHandler = (err, vm, info) => {
        captureError({
          message: err.message,
          stack: err.stack,
          level: 'error',
          tags: { type: 'vue_error', info: info },
          context: {
            component: vm?.$options?.name || vm?.$options?._componentTag || 'unknown',
            props: vm?.$props ? JSON.stringify(vm.$props).slice(0, 500) : null
          }
        })
      }
    }
  }
}

/**
 * Vue directive: v-track-error — track errors on elements
 */
export const vTrackError = {
  mounted(el, binding) {
    el.addEventListener('error', (event) => {
      captureError({
        message: `Element error: ${binding.value || 'image/script load failed'}`,
        tags: { type: 'element_error', src: event.target?.src || event.target?.href }
      })
    }, true)
  }
}

/**
 * Stop the tracker (cleanup)
 */
export function stopErrorTracker() {
  config.enabled = false
  flushBatch()
  if (flushTimer) {
    clearInterval(flushTimer)
    flushTimer = null
  }
}
