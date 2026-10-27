import path from 'node:path'
import Fastify from 'fastify'
import { loadGameEntries, type GameEntry, type GameManifest } from './manifest.js'
import { openDb } from './db.js'
import { gameRoutes } from './routes/games.js'
import { scoreRoutes } from './routes/scores.js'
import { registerStatic } from './static.js'

export interface ServerOptions {
  /** SQLite dosya yolu (DATABASE_PATH) */
  dbPath?: string
  /** Games kök dizini (GAMES_DIR) */
  gamesDir?: string
  /** ZeroGame site derlemesi (SITE_DIST); boşsa statik mount atlanır */
  siteDist?: string
  logger?: boolean
}

/** cwd "server" klasörü olduğunda proje kökü bir üst seviye alınır. */
function resolveRootDir(): string {
  const cwd = process.cwd()
  return path.basename(cwd) === 'server' ? path.resolve(cwd, '..') : cwd
}

export async function buildServer(options: ServerOptions = {}) {
  const rootDir = resolveRootDir()
  const gamesDir = options.gamesDir ?? process.env.GAMES_DIR ?? path.resolve(rootDir, 'Games')
  const dbPath = options.dbPath ?? process.env.DATABASE_PATH ?? path.resolve(rootDir, 'server', 'data', 'zerogame.db')
  const siteDist = options.siteDist !== undefined ? options.siteDist : (process.env.SITE_DIST ?? path.resolve(rootDir, 'frontend', 'app', 'dist'))

  const app = Fastify({ logger: options.logger ?? true })

  // Katalog 2 s TTL cache ile dosyadan beslenir — yeni oyun restart'sız düşer.
  let cache: GameEntry[] = []
  let readAt = 0
  const getEntries = () => {
    if (Date.now() - readAt > 2000) {
      cache = loadGameEntries(gamesDir)
      readAt = Date.now()
    }
    return cache
  }
  const getManifests = (): GameManifest[] => getEntries().map((entry) => entry.manifest)

  const db = openDb(dbPath)
  app.addHook('onClose', async () => { db.close() })

  await registerStatic(app, siteDist, getEntries)
  gameRoutes(app, getManifests)
  scoreRoutes(app, db, getManifests)

  return Object.assign(app, { db })
}
