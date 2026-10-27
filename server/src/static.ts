import fs from 'node:fs'
import path from 'node:path'
import fastifyStatic from '@fastify/static'
import type { FastifyInstance } from 'fastify'
import type { GameEntry } from './manifest.js'

/**
 * Site derlemesini "/" altına, her bir oyunun dist klasörünü
 * kendi buildUrl'i (/games/<slug>/) altına bağlar.
 */
export async function registerStatic(app: FastifyInstance, siteDist: string | undefined, getEntries: () => GameEntry[]) {
  if (siteDist && fs.existsSync(path.join(siteDist, 'index.html'))) {
    await app.register(fastifyStatic, { root: siteDist, prefix: '/', index: 'index.html' })
  } else {
    console.warn('[static] site dist bulunamadı; yalnızca /api çalışacak')
  }

  for (const entry of getEntries()) {
    const dist = path.join(entry.dir, 'dist')
    if (!fs.existsSync(path.join(dist, 'index.html'))) {
      console.warn(`[static] ${entry.manifest.id} dist yok — önce oyunu derleyin: ${dist}`)
      continue
    }
    await app.register(fastifyStatic, {
      root: dist,
      prefix: entry.manifest.buildUrl,
      decorateReply: false,
      index: 'index.html',
    })
  }
}
