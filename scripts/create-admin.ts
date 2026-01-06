import { PrismaClient } from '@prisma/client'
import * as crypto from 'crypto'
import * as readline from 'readline'

const prisma = new PrismaClient()

/**
 * Hash password using SHA-256
 */
function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex')
}

/**
 * Prompt user for input
 */
function prompt(query: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  })

  return new Promise((resolve) => {
    rl.question(query, (answer) => {
      rl.close()
      resolve(answer)
    })
  })
}

/**
 * Create admin user
 */
async function createAdmin() {
  try {
    console.log('=== Create Admin User ===\n')

    // Check if admin already exists
    const existingAdmin = await prisma.adminUser.findFirst()
    if (existingAdmin) {
      console.log(`Admin user already exists: ${existingAdmin.username}`)
      const reset = await prompt('Do you want to reset the password? (yes/no): ')

      if (reset.toLowerCase() !== 'yes') {
        console.log('Aborted.')
        return
      }

      // Delete existing admin
      await prisma.adminUser.delete({
        where: { id: existingAdmin.id },
      })
      console.log('Existing admin user deleted.')
    }

    // Get username
    const username = await prompt('Enter admin username (default: admin): ')
    const adminUsername = username.trim() || 'admin'

    // Get password
    const password = await prompt('Enter admin password: ')
    if (!password || password.length < 6) {
      console.error('Password must be at least 6 characters long.')
      process.exit(1)
    }

    // Hash password
    const passwordHash = hashPassword(password)

    // Create admin user
    const admin = await prisma.adminUser.create({
      data: {
        username: adminUsername,
        passwordHash,
      },
    })

    console.log('\n✅ Admin user created successfully!')
    console.log(`Username: ${admin.username}`)
    console.log(`ID: ${admin.id}`)
    console.log('\nYou can now login at /admin/login')
  } catch (error) {
    console.error('Error creating admin user:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

// Run if called directly
if (require.main === module) {
  createAdmin()
}

export { createAdmin }
