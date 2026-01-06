import crypto from 'crypto'
import fs from 'fs/promises'
import path from 'path'

export interface StorageConfig {
  basePath: string
  shardCount: number
}

/**
 * File storage service with sharding strategy
 * Files are distributed across shard-0 to shard-15 directories
 */
export class StorageService {
  private config: StorageConfig

  constructor(config?: Partial<StorageConfig>) {
    this.config = {
      basePath: config?.basePath || process.env.STORAGE_BASE_PATH || '/app/data',
      shardCount: config?.shardCount || 16,
    }
  }

  /**
   * Calculate shard ID using UUID modulo 16
   */
  getShardId(iconId: string): number {
    const hash = parseInt(iconId.slice(0, 8), 16)
    return hash % this.config.shardCount
  }

  /**
   * Calculate shard ID from content hash
   */
  getShardIdFromHash(contentHash: string): number {
    const hash = parseInt(contentHash.slice(0, 8), 16)
    return hash % this.config.shardCount
  }

  /**
   * Get full file path for an icon
   */
  getIconPath(iconId: string, fileName?: string): string {
    const shardId = this.getShardId(iconId)
    const safeFileName = fileName || `${iconId}.svg`
    return path.join(this.config.basePath, 'icons', `shard-${shardId}`, safeFileName)
  }

  /**
   * Get thumbnail path for an icon
   */
  getThumbnailPath(iconId: string): string {
    const shardId = this.getShardId(iconId)
    return path.join(this.config.basePath, 'thumbnails', `shard-${shardId}`, `${iconId}.png`)
  }

  /**
   * Get temp upload path
   */
  getTempPath(fileName: string): string {
    return path.join(this.config.basePath, 'temp', fileName)
  }

  /**
   * Save icon file to sharded storage
   */
  async saveIcon(iconId: string, content: string | Buffer, fileName?: string): Promise<string> {
    const filePath = this.getIconPath(iconId, fileName)
    const dir = path.dirname(filePath)

    // Ensure directory exists
    await fs.mkdir(dir, { recursive: true })

    // Write file
    if (typeof content === 'string') {
      await fs.writeFile(filePath, content, 'utf-8')
    } else {
      await fs.writeFile(filePath, content)
    }

    return filePath
  }

  /**
   * Read icon file
   * @param iconId Icon ID
   * @param fileName File name
   * @param shardId Optional shard ID (uses calculated shard if not provided)
   */
  async readIcon(iconId: string, fileName?: string, shardId?: number): Promise<string> {
    const filePath = shardId !== undefined
      ? this.getIconPathWithShard(shardId, fileName || `${iconId}.svg`)
      : this.getIconPath(iconId, fileName)
    return await fs.readFile(filePath, 'utf-8')
  }

  /**
   * Delete icon file
   */
  async deleteIcon(iconId: string, fileName?: string): Promise<void> {
    const filePath = this.getIconPath(iconId, fileName)
    await fs.unlink(filePath).catch(() => {
      // File not found is not an error
      console.warn(`File not found: ${filePath}`)
    })
  }

  /**
   * Check if icon file exists
   */
  async iconExists(iconId: string, fileName?: string): Promise<boolean> {
    try {
      const filePath = this.getIconPath(iconId, fileName)
      await fs.access(filePath)
      return true
    } catch {
      return false
    }
  }

  /**
   * Calculate MD5 hash of file content
   */
  calculateContentHash(content: string | Buffer): string {
    return crypto
      .createHash('md5')
      .update(typeof content === 'string' ? content : content.toString())
      .digest('hex')
  }

  /**
   * Get icon path with custom shard ID
   */
  getIconPathWithShard(shardId: number, fileName: string): string {
    return path.join(this.config.basePath, 'icons', `shard-${shardId}`, fileName)
  }
}

// Singleton instance
export const storage = new StorageService()
export const storageService = storage
