/**
 * AI Worker Process
 * Run this in a separate process to handle AI analysis tasks
 *
 * Usage:
 *   npx tsx scripts/worker.ts
 */

import { startAIWorker } from '../lib/ai-queue'

async function main() {
  console.log('🎯 Starting AI Worker Process...\n')

  const worker = startAIWorker()

  if (!worker) {
    console.error('❌ Failed to start AI worker (Redis not available)')
    process.exit(1)
  }

  // Graceful shutdown
  const shutdown = async () => {
    console.log('\n🛑 Shutting down AI Worker...')
    await worker.close()
    console.log('✅ AI Worker stopped')
    process.exit(0)
  }

  process.on('SIGINT', shutdown)
  process.on('SIGTERM', shutdown)

  console.log('✅ AI Worker is running, waiting for tasks...\n')
  console.log('Press Ctrl+C to stop')
}

main().catch((error) => {
  console.error('❌ Fatal error:', error)
  process.exit(1)
})
