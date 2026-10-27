import fs from 'node:fs'
import path from 'node:path'
import Database from 'better-sqlite3'

export interface ScoreRow {
  id: number
  game_id: string
  player: string
  score: number
  dist: number
  created_at: string
}

export function openDb(dbPath: string): Database.Database {
  fs.mkdirSync(path.dirname(dbPath), { recursive: true })
  const db = new Database(dbPath)
  db.pragma('journal_mode = WAL')
  db.exec(`
    CREATE TABLE IF NOT EXISTS scores (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      game_id TEXT NOT NULL,
      player TEXT NOT NULL,
      score INTEGER NOT NULL,
      dist INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_scores_game_score ON scores (game_id, score DESC);
  `)
  return db
}

export function insertScore(db: Database.Database, gameId: string, player: string, score: number, dist: number): { id: number; rank: number } {
  const tx = db.transaction(() => {
    const info = db
      .prepare('INSERT INTO scores (game_id, player, score, dist) VALUES (?, ?, ?, ?)')
      .run(gameId, player, score, dist)
    const better = db
      .prepare('SELECT COUNT(*) AS c FROM scores WHERE game_id = ? AND score > ?')
      .get(gameId, score) as { c: number }
    return { id: Number(info.lastInsertRowid), rank: better.c + 1 }
  })
  return tx() as { id: number; rank: number }
}

export function topScores(db: Database.Database, gameId: string, limit: number): ScoreRow[] {
  return db
    .prepare('SELECT id, game_id, player, score, dist, created_at FROM scores WHERE game_id = ? ORDER BY score DESC, created_at ASC LIMIT ?')
    .all(gameId, limit) as ScoreRow[]
}
