import { PrismaClient } from '@prisma/client'
import * as crypto from 'crypto'

const prisma = new PrismaClient()

/**
 * Hash password using SHA-256
 */
function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex')
}

/**
 * Create admin user (non-interactive)
 */
async function createAdminQuick() {
  try {
    const username = 'admin'
    const password = 'test123456'

    console.log('=== Create Admin User (Quick Mode) ===\n')

    // Check if admin already exists
    const existingAdmin = await prisma.adminUser.findFirst({
      where: { username },
    })

    if (existingAdmin) {
      console.log(`⚠️  Admin user already exists: ${existingAdmin.username}`)
      console.log('Deleting existing admin user...')

      await prisma.adminUser.delete({
        where: { id: existingAdmin.id },
      })
      console.log('✅ Existing admin user deleted.')
    }

    // Hash password
    const passwordHash = hashPassword(password)

    // Create admin user
    const admin = await prisma.adminUser.create({
      data: {
        username,
        passwordHash,
      },
    })

    console.log('\n✅ Admin user created successfully!')
    console.log(`Username: ${admin.username}`)
    console.log(`Password: ${password}`)
    console.log(`ID: ${admin.id}`)
    console.log('\n⚠️  Please change the password after first login!')
    console.log('Login at: http://localhost:3000/admin/login')
  } catch (error) {
    console.error('❌ Error creating admin user:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

createAdminQuick()
