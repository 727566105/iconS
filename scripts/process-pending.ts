import { PrismaClient } from '@prisma/client'
import { analyzeIcon } from '../lib/ai'
import * as fs from 'fs'
import * as path from 'path'

const prisma = new PrismaClient()

async function processPendingIcons() {
  console.log('🔍 查找待处理的图标...\n')

  // 获取所有PENDING状态的图标
  const pendingIcons = await prisma.icon.findMany({
    where: { status: 'PENDING' },
    take: 10, // 每次处理10个
  })

  if (pendingIcons.length === 0) {
    console.log('✅ 没有待处理的图标')
    return
  }

  console.log(`📊 找到 ${pendingIcons.length} 个待处理的图标\n`)

  const baseStoragePath = process.env.STORAGE_BASE_PATH || './data'

  for (const icon of pendingIcons) {
    console.log(`\n处理图标: ${icon.name}`)
    console.log(`ID: ${icon.id}`)
    console.log(`文件: ${icon.fileName}`)
    console.log(`分片: ${icon.shardId}`)

    try {
      // 读取SVG文件
      const svgPath = path.join(baseStoragePath, 'icons', `shard-${icon.shardId}`, icon.fileName)
      const svgContent = await fs.promises.readFile(svgPath, 'utf-8')

      console.log('📝 文件读取成功,开始AI分析...')

      // 调用AI分析
      const result = await analyzeIcon(svgContent)

      console.log('AI分析结果:', result)

      // 更新图标
      await prisma.icon.update({
        where: { id: icon.id },
        data: {
          aiTags: result.tags,
          aiCategory: result.category,
          status: 'PUBLISHED',
        },
      })

      // 创建或查找标签
      const tagPromises = result.tags.map(async (tagName) => {
        return prisma.tag.upsert({
          where: { name: tagName },
          update: {
            usageCount: { increment: 1 },
          },
          create: {
            name: tagName,
            usageCount: 1,
          },
        })
      })

      const tags = await Promise.all(tagPromises)

      // 关联标签到图标
      const iconTagPromises = tags.map((tag) =>
        prisma.iconTag.upsert({
          where: {
            iconId_tagId: {
              iconId: icon.id,
              tagId: tag.id,
            },
          },
          update: {},
          create: {
            iconId: icon.id,
            tagId: tag.id,
          },
        })
      )

      await Promise.all(iconTagPromises)

      console.log(`✅ 图标 "${icon.name}" 处理完成!`)
      console.log(`   标签: ${result.tags.join(', ')}`)
      console.log(`   分类: ${result.category}`)
    } catch (error) {
      console.error(`❌ 处理图标 "${icon.name}" 失败:`, error)

      // 即使失败也发布图标
      await prisma.icon.update({
        where: { id: icon.id },
        data: { status: 'PUBLISHED' },
      })
    }
  }

  console.log('\n🎉 所有图标处理完成!')
}

processPendingIcons()
  .catch((error) => {
    console.error('❌ 处理失败:', error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
