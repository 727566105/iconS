import { initRedis } from './cache'

let initialized = false

/**
 * Ensure services are initialized (call at app startup)
 */
export async function ensureServicesInitialized() {
  if (!initialized) {
    await initRedis()
    initialized = true
  }
}
