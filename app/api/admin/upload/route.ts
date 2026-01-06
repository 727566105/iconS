import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'
import { prisma } from '@/lib/db'
import { storageService } from '@/lib/storage'
import { queueIconForAIAnalysis } from '@/lib/ai-queue'
import { isAIConfigured } from '@/lib/ai'
import { rateLimitWrite } from '@/lib/rate-limiter'

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const ip = request.headers.get('x-forwarded-for') || 'unknown'
    const rateLimitResult = await rateLimitWrite(ip)
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 }
      )
    }

    // Parse form data
    const formData = await request.formData()
    const file = formData.get('file') as File
    const name = formData.get('name') as string
    const description = formData.get('description') as string
    const categoryId = formData.get('categoryId') as string

    // Validate file
    if (!file) {
      return NextResponse.json(
        { error: 'No file uploaded' },
        { status: 400 }
      )
    }

    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File size exceeds ${MAX_FILE_SIZE / 1024 / 1024}MB limit` },
        { status: 400 }
      )
    }

    // Check file type
    if (!file.type.includes('svg') && !file.name.endsWith('.svg')) {
      return NextResponse.json(
        { error: 'Only SVG files are allowed' },
        { status: 400 }
      )
    }

    // Read file content
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    const svgContent = buffer.toString('utf-8')

    // Validate SVG content
    if (!svgContent.includes('<svg') || !svgContent.includes('</svg>')) {
      return NextResponse.json(
        { error: 'Invalid SVG file' },
        { status: 400 }
      )
    }

    // Calculate content hash
    const contentHash = storageService.calculateContentHash(svgContent)

    // Check for duplicates
    const existingIcon = await prisma.icon.findUnique({
      where: { contentHash },
    })

    if (existingIcon) {
      return NextResponse.json(
        {
          error: 'Icon already exists',
          iconId: existingIcon.id,
          message: 'This icon has already been uploaded',
        },
        { status: 409 }
      )
    }

    // Determine shard and file path
    const shardId = storageService.getShardIdFromHash(contentHash)
    const fileName = file.name.endsWith('.svg') ? file.name : `${file.name}.svg`

    // Get base storage path (use local data directory in development)
    let baseStoragePath = process.env.STORAGE_BASE_PATH
    if (process.env.NODE_ENV === 'development' && !baseStoragePath) {
      baseStoragePath = process.cwd() + '/data'
    }

    if (!baseStoragePath) {
      return NextResponse.json(
        { error: 'Storage base path not configured' },
        { status: 500 }
      )
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
        name: name || fileName.replace('.svg', ''),
        fileName,
        description: description || null,
        categoryId: categoryId || null,
        contentHash,
        shardId,
        status: 'PENDING', // Will be processed by AI
        viewCount: 0,
        downloadCount: 0,
      },
    })

    // Queue for AI analysis (async, don't wait)
    const aiConfigured = await isAIConfigured()
    if (aiConfigured) {
      queueIconForAIAnalysis(icon.id, svgContent).catch((error) => {
        console.error(`Failed to queue icon ${icon.id} for AI analysis:`, error)
      })
    }

    return NextResponse.json({
      success: true,
      icon: {
        id: icon.id,
        name: icon.name,
        fileName: icon.fileName,
        status: icon.status,
      },
      message: aiConfigured
        ? 'Icon uploaded successfully. AI analysis in progress.'
        : 'Icon uploaded successfully. Please configure an AI provider for automatic analysis.',
    })
  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json(
      { error: 'Internal server error during upload' },
      { status: 500 }
    )
  }
}
