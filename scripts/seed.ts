import { PrismaClient } from '@prisma/client'
import * as crypto from 'crypto'

const prisma = new PrismaClient()

function generateMD5(content: string): string {
  return crypto.createHash('md5').update(content).digest('hex')
}

async function seed() {
  try {
    console.log('开始创建测试数据...\n')

    // 创建分类
    const categories = await Promise.all([
      prisma.category.upsert({
        where: { slug: 'ui-icons' },
        update: {},
        create: {
          name: 'UI图标',
          slug: 'ui-icons',
          description: '用户界面相关图标',
          iconCount: 0,
        },
      }),
      prisma.category.upsert({
        where: { slug: 'business' },
        update: {},
        create: {
          name: '商业',
          slug: 'business',
          description: '商业和金融相关图标',
          iconCount: 0,
        },
      }),
      prisma.category.upsert({
        where: { slug: 'social' },
        update: {},
        create: {
          name: '社交',
          slug: 'social',
          description: '社交媒体和网络图标',
          iconCount: 0,
        },
      }),
    ])

    console.log(`✅ 创建了 ${categories.length} 个分类`)

    // 创建标签
    const tags = await Promise.all([
      prisma.tag.upsert({
        where: { name: '箭头' },
        update: {},
        create: { name: '箭头', usageCount: 0 },
      }),
      prisma.tag.upsert({
        where: { name: 'home' },
        update: {},
        create: { name: 'home', usageCount: 0 },
      }),
      prisma.tag.upsert({
        where: { name: '用户' },
        update: {},
        create: { name: '用户', usageCount: 0 },
      }),
      prisma.tag.upsert({
        where: { name: '设置' },
        update: {},
        create: { name: '设置', usageCount: 0 },
      }),
      prisma.tag.upsert({
        where: { name: 'search' },
        update: {},
        create: { name: 'search', usageCount: 0 },
      }),
    ])

    console.log(`✅ 创建了 ${tags.length} 个标签`)

    // 创建测试图标
    const testIcons = [
      {
        name: 'Home Icon',
        fileName: 'home.svg',
        description: '首页图标',
        categoryId: categories[0].id,
        status: 'PUBLISHED',
        viewCount: 120,
        downloadCount: 45,
      },
      {
        name: 'Search Icon',
        fileName: 'search.svg',
        description: '搜索图标',
        categoryId: categories[0].id,
        status: 'PUBLISHED',
        viewCount: 200,
        downloadCount: 87,
      },
      {
        name: 'User Icon',
        fileName: 'user.svg',
        description: '用户图标',
        categoryId: categories[0].id,
        status: 'PUBLISHED',
        viewCount: 150,
        downloadCount: 62,
      },
      {
        name: 'Settings Icon',
        fileName: 'settings.svg',
        description: '设置图标',
        categoryId: categories[0].id,
        status: 'PUBLISHED',
        viewCount: 98,
        downloadCount: 34,
      },
      {
        name: 'Arrow Right',
        fileName: 'arrow-right.svg',
        description: '右箭头',
        categoryId: categories[0].id,
        status: 'PUBLISHED',
        viewCount: 180,
        downloadCount: 76,
      },
      {
        name: 'Chart Icon',
        fileName: 'chart.svg',
        description: '图表图标',
        categoryId: categories[1].id,
        status: 'PUBLISHED',
        viewCount: 110,
        downloadCount: 48,
      },
      {
        name: 'Facebook Icon',
        fileName: 'facebook.svg',
        description: 'Facebook社交图标',
        categoryId: categories[2].id,
        status: 'PUBLISHED',
        viewCount: 320,
        downloadCount: 145,
      },
      {
        name: 'Twitter Icon',
        fileName: 'twitter.svg',
        description: 'Twitter社交图标',
        categoryId: categories[2].id,
        status: 'PUBLISHED',
        viewCount: 280,
        downloadCount: 123,
      },
    ]

    const createdIcons = []

    for (const iconData of testIcons) {
      const hash = generateMD5(iconData.fileName).substring(0, 32)
      const shardId = Math.floor(Math.random() * 16)

      const icon = await prisma.icon.upsert({
        where: { contentHash: hash },
        update: {},
        create: {
          name: iconData.name,
          fileName: iconData.fileName,
          description: iconData.description,
          category: {
            connect: { id: iconData.categoryId },
          },
          contentHash: hash,
          shardId,
          status: iconData.status,
          viewCount: iconData.viewCount,
          downloadCount: iconData.downloadCount,
        },
      })

      createdIcons.push(icon)
    }

    console.log(`✅ 创建了 ${createdIcons.length} 个测试图标`)

    // 为部分图标添加标签
    await prisma.iconTag.upsert({
      where: {
        iconId_tagId: {
          iconId: createdIcons[0].id,
          tagId: tags[1].id, // home
        },
      },
      update: {},
      create: {
        iconId: createdIcons[0].id,
        tagId: tags[1].id,
      },
    })

    await prisma.iconTag.upsert({
      where: {
        iconId_tagId: {
          iconId: createdIcons[1].id,
          tagId: tags[4].id, // search
        },
      },
      update: {},
      create: {
        iconId: createdIcons[1].id,
        tagId: tags[4].id,
      },
    })

    await prisma.iconTag.upsert({
      where: {
        iconId_tagId: {
          iconId: createdIcons[2].id,
          tagId: tags[2].id, // 用户
        },
      },
      update: {},
      create: {
        iconId: createdIcons[2].id,
        tagId: tags[2].id,
      },
    })

    console.log('✅ 关联了标签')

    // 创建搜索历史
    await prisma.searchHistory.upsert({
      where: { queryHash: 'a5d3e9e0b0a1f2c3d4e5f6a7b8c9d0e1' },
      update: {},
      create: {
        query: 'home',
        queryHash: 'a5d3e9e0b0a1f2c3d4e5f6a7b8c9d0e1',
        count: 15,
      },
    })

    await prisma.searchHistory.upsert({
      where: { queryHash: 'b5d3e9e0b0a1f2c3d4e5f6a7b8c9d0e2' },
      update: {},
      create: {
        query: '用户',
        queryHash: 'b5d3e9e0b0a1f2c3d4e5f6a7b8c9d0e2',
        count: 12,
      },
    })

    console.log('✅ 创建了搜索历史记录')

    console.log('\n🎉 测试数据创建完成!')
    console.log(`\n统计信息:`)
    console.log(`- 分类: ${categories.length}`)
    console.log(`- 标签: ${tags.length}`)
    console.log(`- 图标: ${createdIcons.length}`)
    console.log('\n现在可以访问 http://localhost:3000 查看效果')
  } catch (error) {
    console.error('创建测试数据失败:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

seed()
