import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { storageService } from '@/lib/storage'

/**
 * POST /api/icons/[id]/download
 * Download icon file and increment download count
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const icon = await prisma.icon.findUnique({
      where: { id: params.id },
    })

    if (!icon) {
      return NextResponse.json({ error: 'Icon not found' }, { status: 404 })
    }

    // 读取 SVG 文件
    const svgContent = await storageService.readIcon(icon.id, icon.fileName, icon.shardId)

    // 增加下载次数
    await prisma.icon.update({
      where: { id: params.id },
      data: {
        downloadCount: {
          increment: 1,
        },
      },
    })

    // 返回 SVG 文件
    return new NextResponse(svgContent, {
      status: 200,
      headers: {
        'Content-Type': 'image/svg+xml',
        'Content-Disposition': `attachment; filename="${icon.fileName}"`,
        'Cache-Control': 'public, max-age=31536000',
      },
    })
  } catch (error) {
    console.error('Failed to download icon:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
