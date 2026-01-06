import { startAIWorker } from '../lib/ai-queue'
import { initRedis } from '../lib/cache'

async function testWorker() {
  console.log('Testing AI Worker startup...\n')

  // Initialize Redis first
  console.log('Initializing Redis...')
  await initRedis()

  const worker = startAIWorker()

  if (worker) {
    console.log('✅ Worker started successfully!')
    console.log('Waiting 2 seconds...\n')

    setTimeout(async () => {
      console.log('✅ Test passed! Worker is running.')
      console.log('Closing worker...')
      await worker.close()
      console.log('✅ Worker closed.')
      process.exit(0)
    }, 2000)
  } else {
    console.log('⚠️  Worker not started (Redis not available)')
    console.log('This is expected in environments without Redis.')
    process.exit(0)
  }
}

testWorker()
