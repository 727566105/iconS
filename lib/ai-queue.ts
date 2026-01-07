import { Queue, Worker, Job } from 'bullmq'
import { redis } from './cache'
import { prisma } from './db'
import { analyzeIcon } from './ai'

export interface AIAnalysisJobData {
  iconId: string
  svgContent: string
}

let aiQueueInstance: Queue | null = null

/**
 * Get or create AI analysis queue
 */
export function getAIQueue(): Queue | null {
  if (!redis) {
    return null
  }

  if (!aiQueueInstance) {
    aiQueueInstance = new Queue('ai-analysis', {
      connection: redis,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
      },
    })
  }

  return aiQueueInstance
}

// 向后兼容的导出
export const aiQueue = {
  add: async (...args: any[]) => {
    const queue = getAIQueue()
    if (!queue) {
      throw new Error('Redis not available, queue not initialized')
    }
    return (queue as any).add(...args)
  }
}

/**
 * Process AI analysis job
 */
async function processAIAnalysis(job: Job<AIAnalysisJobData>) {
  const { iconId, svgContent } = job.data

  console.log(`📊 Processing AI analysis for icon ${iconId}`)
  job.updateProgress(10)

  try {
    // Call AI service
    const result = await analyzeIcon(svgContent)
    job.updateProgress(50)

    console.log(`AI result for icon ${iconId}:`, result)

    // Update icon with AI results
    await prisma.icon.update({
      where: { id: iconId },
      data: {
        aiTags: result.tags,
        aiCategory: result.category,
        status: 'PUBLISHED', // Auto-publish after AI analysis
      },
    })

    job.updateProgress(70)

    // Create or find tags
    const tagPromises = result.tags.map(async (tagName) => {
      return prisma.tag.upsert({
        where: { name: tagName },
        update: {
          usageCount: {
            increment: 1,
          },
        },
        create: {
          name: tagName,
          usageCount: 1,
        },
      })
    })

    const tags = await Promise.all(tagPromises)
    job.updateProgress(90)

    // Link tags to icon
    const iconTagPromises = tags.map((tag) =>
      prisma.iconTag.upsert({
        where: {
          iconId_tagId: {
            iconId,
            tagId: tag.id,
          },
        },
        update: {},
        create: {
          iconId,
          tagId: tag.id,
        },
      })
    )

    await Promise.all(iconTagPromises)

    job.updateProgress(100)
    console.log(`✅ AI analysis completed for icon ${iconId}`)

    return {
      iconId,
      tags: result.tags,
      category: result.category,
    }
  } catch (error) {
    console.error(`❌ AI analysis failed for icon ${iconId}:`, error)

    // Update icon status to show AI failed
    await prisma.icon.update({
      where: { id: iconId },
      data: {
        status: 'PUBLISHED', // Still publish, just without AI data
      },
    })

    throw error
  }
}

/**
 * Start AI worker (call this in separate process)
 */
export function startAIWorker() {
  if (!redis) {
    console.warn('⚠️  Redis not available, AI worker not started')
    console.warn('⚠️  AI analysis will use synchronous fallback during upload')
    return null
  }

  const worker = new Worker<AIAnalysisJobData>(
    'ai-analysis',
    processAIAnalysis,
    {
      connection: redis,
      limiter: {
        max: 10, // 10 requests per second (Qwen API quota)
        duration: 1000,
      },
      concurrency: 3, // Process 3 jobs concurrently
    }
  )

  worker.on('completed', (job) => {
    console.log(`✅ Job ${job.id} completed for icon ${job.data.iconId}`)
  })

  worker.on('failed', (job, err) => {
    console.error(`❌ Job ${job?.id} failed for icon ${job?.data.iconId}:`, err.message)
  })

  worker.on('progress', (job) => {
    if (job.progress === 100) {
      console.log(`⏳ Job ${job.id} in progress for icon ${job.data.iconId}`)
    }
  })

  console.log('🚀 AI Worker started (Redis-based)')
  return worker
}

/**
 * Add icon to AI queue
 */
export async function queueIconForAIAnalysis(iconId: string, svgContent: string) {
  const queue = getAIQueue()
  if (!queue) {
    console.warn('⚠️  Redis not available, skipping AI queue')
    return null
  }

  const job = await queue.add('analyze-icon', {
    iconId,
    svgContent,
  })

  console.log(`📤 Icon ${iconId} added to AI queue (job ${job.id})`)
  return job
}
