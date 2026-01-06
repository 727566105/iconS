import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'
import { prisma } from '@/lib/db'
import { storageService } from '@/lib/storage'
import { queueIconForAIAnalysis } from '@/lib/ai-queue'

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
const MAX_BATCH_SIZE = 50 // 最多50个文件
const CONCURRENT_UPLOADS = 3 // 并发上传数

interface UploadResult {
  fileName: string
  success: boolean
  icon?: {
    id: string
    name: string
    fileName: string
    status: string
  }
  error?: string
}

interface BatchUploadResponse {
  success: boolean
  results: UploadResult[]
  summary: {
    total: number
    succeeded: number
    failed: number
  }
}

async function processFile(
  file: File,
  index: number
): Promise<UploadResult> {
  try {
    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      return {
        fileName: file.name,
        success: false,
        error: `File size exceeds ${MAX_FILE_SIZE / 1024 / 1024}MB limit`,
      }
    }

    // Check file type
    if (!file.type.includes('svg') && !file.name.endsWith('.svg')) {
      return {
        fileName: file.name,
        success: false,
        error: 'Only SVG files are allowed',
      }
    }

    // Read file content
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    const svgContent = buffer.toString('utf-8')

    // Validate SVG content
    if (!svgContent.includes('<svg') || !svgContent.includes('</svg>')) {
      return {
        fileName: file.name,
        success: false,
        error: 'Invalid SVG file',
      }
    }

    // Calculate content hash
    const contentHash = storageService.calculateContentHash(svgContent)

    // Check for duplicates
    const existingIcon = await prisma.icon.findUnique({
      where: { contentHash },
    })

    if (existingIcon) {
      return {
        fileName: file.name,
        success: false,
        error: 'Icon already exists',
      }
    }

    // Determine shard and file path
    const shardId = storageService.getShardIdFromHash(contentHash)
    const fileName = file.name.endsWith('.svg') ? file.name : `${file.name}.svg`

    // Get base storage path
    let baseStoragePath = process.env.STORAGE_BASE_PATH
    if (process.env.NODE_ENV === 'development' && !baseStoragePath) {
      baseStoragePath = process.cwd() + '/data'
    }

    // Build full path
    const fullPath = join(baseStoragePath, 'icons', `shard-${shardId}`, fileName)

    // Ensure shard directory exists
    const shardDir = join(baseStoragePath, 'icons', `shard-${shardId}`)
    if (!existsSync(shardDir)) {
      await mkdir(shardDir, { recursive: true })
    }

    // Save file
    await writeFile(fullPath, buffer)

    // Create database record
    const icon = await prisma.icon.create({
      data: {
        name: fileName.replace('.svg', ''),
        fileName,
        description: null,
        categoryId: null,
        contentHash,
        shardId,
        status: 'PENDING',
        viewCount: 0,
        downloadCount: 0,
      },
    })

    // Queue for AI analysis (async, don't wait)
    queueIconForAIAnalysis(icon.id, svgContent).catch((error) => {
      console.error(`Failed to queue icon ${icon.id} for AI analysis:`, error)
    })

    return {
      fileName: file.name,
      success: true,
      icon: {
        id: icon.id,
        name: icon.name,
        fileName: icon.fileName,
        status: icon.status,
      },
    }
  } catch (error) {
    console.error(`Error processing file ${file.name}:`, error)
    return {
      fileName: file.name,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

async function processBatchWithConcurrency<T, R>(
  items: T[],
  processor: (item: T, index: number) => Promise<R>,
  concurrency: number
): Promise<R[]> {
  const results: R[] = []
  const executing: Promise<void>[] = []

  for (let i = 0; i < items.length; i++) {
    const promise = processor(items[i], i).then((result) => {
      results[i] = result
      // Remove from executing array when done
      const index = executing.indexOf(promise as unknown as Promise<void>)
      if (index > -1) {
        executing.splice(index, 1)
      }
    })

    executing.push(promise as unknown as Promise<void>)

    if (executing.length >= concurrency) {
      await Promise.race(executing)
    }
  }

  await Promise.all(executing)
  return results
}

export async function POST(request: NextRequest) {
  try {
    // Parse form data
    const formData = await request.formData()
    const files = formData.getAll('files') as File[]

    // Validate files
    if (!files || files.length === 0) {
      return NextResponse.json(
        { error: 'No files uploaded' },
        { status: 400 }
      )
    }

    if (files.length > MAX_BATCH_SIZE) {
      return NextResponse.json(
        { error: `Maximum ${MAX_BATCH_SIZE} files allowed per batch` },
        { status: 400 }
      )
    }

    // Process files with concurrency control
    const results = await processBatchWithConcurrency(
      files,
      processFile,
      CONCURRENT_UPLOADS
    )

    // Calculate summary
    const summary = {
      total: results.length,
      succeeded: results.filter((r) => r.success).length,
      failed: results.filter((r) => !r.success).length,
    }

    const response: BatchUploadResponse = {
      success: true,
      results,
      summary,
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Batch upload error:', error)
    return NextResponse.json(
      { error: 'Internal server error during batch upload' },
      { status: 500 }
    )
  }
}

// Configure route to handle file uploads
export const config = {
  api: {
    bodyParser: false,
  },
}
