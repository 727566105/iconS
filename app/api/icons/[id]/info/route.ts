import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const icon = await prisma.icon.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        name: true,
        fileName: true,
        description: true,
        status: true,
        viewCount: true,
        downloadCount: true,
        category: {
          select: {
            id: true,
            name: true,
          },
        },
        tags: {
          select: {
            tag: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    })

    if (!icon) {
      return NextResponse.json(
        { error: 'Icon not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(icon)
  } catch (error) {
    console.error('Error fetching icon info:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
