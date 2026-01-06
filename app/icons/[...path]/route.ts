import { NextRequest, NextResponse } from 'next/server'
import { readFile } from 'fs/promises'
import { join, resolve } from 'path'
import { existsSync } from 'fs'

/**
 * GET /icons/[...path]
 * Serve SVG files directly from sharded storage
 * Example: /icons/shard-0/icon-name.svg
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  try {
    const path = params.path.join('/')

    // Security: Only allow SVG files and shard directories
    if (!path.match(/^shard-\d+\/.+\.svg$/i)) {
      return NextResponse.json({ error: 'Invalid path' }, { status: 400 })
    }

    // Get base storage path (resolve to absolute path)
    let baseStoragePath = process.env.STORAGE_BASE_PATH
    if (process.env.NODE_ENV === 'development' && !baseStoragePath) {
      baseStoragePath = join(process.cwd(), 'data')
    }
    const absoluteBasePath = resolve(baseStoragePath)

    // Build full file path
    const fullPath = join(absoluteBasePath, 'icons', path)

    // Security: Normalize path and ensure it's within storage directory
    const normalizedPath = resolve(fullPath)
    if (!normalizedPath.startsWith(absoluteBasePath)) {
      return NextResponse.json({ error: 'Invalid path' }, { status: 403 })
    }

    // Check if file exists
    if (!existsSync(normalizedPath)) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 })
    }

    // Read file
    const svgContent = await readFile(normalizedPath, 'utf-8')

    // Validate SVG content
    if (!svgContent.includes('<svg') || !svgContent.includes('</svg>')) {
      return NextResponse.json({ error: 'Invalid SVG file' }, { status: 400 })
    }

    // Return SVG with caching headers
    return new NextResponse(svgContent, {
      status: 200,
      headers: {
        'Content-Type': 'image/svg+xml',
        'Cache-Control': 'public, max-age=31536000, immutable', // 1年缓存
        'X-Content-Type-Options': 'nosniff',
      },
    })
  } catch (error) {
    console.error('Failed to serve icon file:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
