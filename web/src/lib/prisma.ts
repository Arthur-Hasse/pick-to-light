import { PrismaClient } from '@prisma/client'
import fs from 'fs'
import path from 'path'

function getDatabaseUrl(): string {
  // Se estiver na Vercel (onde /var/task é somente leitura e /tmp é gravável)
  if (process.env.VERCEL) {
    const tmpDbPath = '/tmp/dev.db'

    // Se o banco ainda não foi copiado para a pasta /tmp
    if (!fs.existsSync(tmpDbPath)) {
      const candidates = [
        path.join(process.cwd(), 'prisma', 'dev.db'),
        path.join(process.cwd(), 'web', 'prisma', 'dev.db'),
        path.resolve(process.cwd(), 'prisma/dev.db'),
        path.resolve(process.cwd(), 'web/prisma/dev.db'),
        path.join(__dirname, '..', '..', '..', 'prisma', 'dev.db'),
        path.join(__dirname, '..', '..', 'prisma', 'dev.db'),
        path.join(__dirname, '..', 'prisma', 'dev.db'),
      ]

      let copied = false
      for (const src of candidates) {
        if (fs.existsSync(src)) {
          try {
            fs.copyFileSync(src, tmpDbPath)
            copied = true
            console.log(`[PRISMA VERCEL] Banco copiado com sucesso de ${src} para ${tmpDbPath}`)
            break
          } catch (e) {
            console.warn(`[PRISMA VERCEL] Erro ao copiar de ${src}:`, e)
          }
        }
      }

      if (!copied) {
        console.warn('[PRISMA VERCEL] dev.db não encontrado, inicializando arquivo em /tmp')
        try {
          fs.writeFileSync(tmpDbPath, '')
        } catch (e) {
          console.error('[PRISMA VERCEL] Erro ao inicializar /tmp/dev.db:', e)
        }
      }
    }

    const vercelUrl = `file:${tmpDbPath}`
    process.env.DATABASE_URL = vercelUrl
    return vercelUrl
  }

  // Ambiente local (Windows / Dev)
  const localUrl = process.env.DATABASE_URL || 'file:./dev.db'
  process.env.DATABASE_URL = localUrl
  return localUrl
}

const dbUrl = getDatabaseUrl()

const prismaClientSingleton = () => {
  return new PrismaClient({
    datasources: {
      db: {
        url: dbUrl,
      },
    },
  })
}

type PrismaClientSingleton = ReturnType<typeof prismaClientSingleton>

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClientSingleton | undefined
}

const prisma = globalForPrisma.prisma ?? prismaClientSingleton()

export default prisma

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
