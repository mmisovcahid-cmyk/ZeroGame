import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import type Database from 'better-sqlite3'
import { insertScore, topScores } from '../db.js'
import type { GameManifest } from '../manifest.js'

const PostScoreSchema = z.object({
  player: z.string().trim().min(1).max(24),
  score: z.number().int().min(0).max(9_999_999),
  dist: z.number().int().min(0).max(9_999_999).optional(),
})

export function scoreRoutes(app: FastifyInstance, db: Database.Database, getManifests: () => GameManifest[]) {
  app.post('/api/games/:id/scores', async (request, reply) => {
    const { id } = request.params as { id: string }
    if (!getManifests().some((game) => game.id === id)) {
      return reply.status(404).send({ error: 'Oyun bulunamadı' })
    }
    const parsed = PostScoreSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.status(400).send({
        error: 'Geçersiz skor verisi',
        details: parsed.error.issues.map((issue) => ({ path: issue.path.join('.'), message: issue.message })),
      })
    }
    const { player, score, dist } = parsed.data
    const { rank } = insertScore(db, id, player, score, dist ?? 0)
    return reply.status(201).send({ ok: true, rank })
  })

  app.get('/api/games/:id/scores', async (request, reply) => {
    const { id } = request.params as { id: string }
    if (!getManifests().some((game) => game.id === id)) {
      return reply.status(404).send({ error: 'Oyun bulunamadı' })
    }
    const query = request.query as { limit?: string }
    const limit = Math.min(Math.max(Number.parseInt(query.limit ?? '10', 10) || 10, 1), 25)
    const rows = topScores(db, id, limit)
    return rows.map((row) => ({
      player: row.player,
      score: row.score,
      dist: row.dist,
      createdAt: row.created_at,
    }))
  })
}
