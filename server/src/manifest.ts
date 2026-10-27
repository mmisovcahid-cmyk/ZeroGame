import fs from 'node:fs'
import path from 'node:path'
import { z } from 'zod'

const ManifestSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/, 'id küçük harf, rakam ve tire içerebilir'),
  title: z.string().min(1).max(60),
  category: z.string().min(1).max(24),
  description: z.string().min(1).max(600),
  controls: z.array(z.string().max(40)).max(8).default([]),
  duration: z.string().max(40).optional(),
  players: z.string().max(24).optional(),
  buildUrl: z.string().startsWith('/games/'),
  thumbnailUrl: z.string().optional(),
  devPort: z.number().int().min(1).max(65535).optional(),
  featured: z.boolean().optional(),
  isNew: z.boolean().optional(),
})

export type GameManifest = z.infer<typeof ManifestSchema>

/** Manifest + diskteki gerçek klasör bilgisi (URL slug'ı ile klasör adı farklı olabilir). */
export interface GameEntry {
  manifest: GameManifest
  dir: string
}

/** Games/<Slug>/game.json dosyalarını tarar ve doğrular; geçersizler uyarıyla atlanır. */
export function loadGameEntries(gamesDir: string): GameEntry[] {
  const found: GameEntry[] = []
  if (!fs.existsSync(gamesDir)) return found
  for (const entry of fs.readdirSync(gamesDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue
    const file = path.join(gamesDir, entry.name, 'game.json')
    if (!fs.existsSync(file)) continue
    try {
      const raw: unknown = JSON.parse(fs.readFileSync(file, 'utf8'))
      const parsed = ManifestSchema.parse(raw)
      // id ↔ klasör adı büyük/küçük harf duyarsız eşleşir (Windows ↔ Linux güvenliği)
      if (parsed.id.toLowerCase() !== entry.name.toLowerCase()) {
        throw new Error(`game.json içindeki id (${parsed.id}) klasör adıyla (${entry.name}) uyuşmuyor`)
      }
      found.push({ manifest: parsed, dir: path.join(gamesDir, entry.name) })
    } catch (err) {
      console.warn(`[manifest] ${entry.name} atlandı: ${(err as Error).message}`)
    }
  }
  return found
}

/** Katalog sıralaması: önce öne çıkanlar, sonra A–Z (Türkçe). */
export function sortManifests(list: GameManifest[]): GameManifest[] {
  return [...list].sort((a, b) => {
    if (Boolean(b.featured) !== Boolean(a.featured)) return Number(Boolean(b.featured)) - Number(Boolean(a.featured))
    return a.title.localeCompare(b.title, 'tr-TR')
  })
}
