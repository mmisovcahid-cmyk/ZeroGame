# Piksel (ZeroGame)

Tarayıcıda çalışan, indirmesiz oyun portalı: küçük web oyunlarına **tek tıkla** oyna. Fastify backend,
manifest tabanlı katalog ve global skor tablosu içerir.

```
├── frontend/app        Piksel portal sitesi (React + Vite)      → /  (ana sayfa)
├── Games/<Slug>/       Her bir oyun bağımsız bir Vite projesi   → /games/<id>/  (iframe ile gömülür)
└── server              Fastify API + statik servis + SQLite     → /api/*
```

## Oyun nasıl eklenir?

1. `Games/<Slug>/` altına yeni bir **vite projesi** bırak (dist'e derlenebilir olsun).
2. `vite.config.js` içinde `base: '/games/<id>/'` ayarla.
3. Klasöre `game.json` manifişini ekle:

```json
{
  "id": "<slug>",            // klasör adıyla eşleşmeli (büyük/küçük harf duyarsız)
  "title": "Oyun Adı",
  "category": "Kategori",
  "description": "Bir iki cümle tanıtım.",
  "controls": ["← → şerit", "Space zıpla"],
  "buildUrl": "/games/<slug>/",
  "thumbnailUrl": "/games/<slug>/thumbnail.png",
  "featured": false
}
```

Katalog **2 saniyelik TTL cache** ile diskten okunur: yeni oyunu restart'sız düşürür.

## Skor sistemi

- **Global skorlar:** SQLite (`server/data/zerogame.db`, WAL). `scores` tablosu; oyun başına top-10.
  - `POST /api/games/:id/scores` → `{ player, score, dist? }` → `{ ok: true, rank }`
  - `GET /api/games/:id/scores?limit=10` → sıralı liste
- **Yerel skorlar:** oyunlar `localStorage`'da tutar (çevrimdışıyken bile çalışır).
- **Favoriler:** portal sitesi `localStorage` (`piksel-favorites`) kullanır; backend'e taşınmaz.

Oyun içi entegrasyon örneği: `Games/ZeroShoot/src/api.js` (2.5 s timeout, hata durumunda yerleşik fallback).

## Geliştirme

```bash
npm run dev:server    # Fastify + API + statik servis   → http://localhost:3001
npm run dev:site      # Piksel portal dev sunucusu      → http://localhost:3000  (/api → 3001)
npm run dev:game      # ZeroShoot dev sunucusu          → http://localhost:5173  (/api → 3001, base /games/zeroshoot/)
npm test              # server birim testleri (vitest)
```

Portal 3000'de çalışırken oyun `http://localhost:3000/games/zeroshoot/` altından iframe ile açılır
(vite proxy ZeroShoot'u 5173'e taşır). Üretimde her şey tek sunucuda (3001) tek origin altında servis edilir.

## Üretim derlemesi

```bash
npm run build        # site + oyun dist'leri
npm start            # server → dist'leri ve API'yi 3001 portunda servis eder
```

Ortam değişkenleri:

| Değişken        | Varsayılan                     | Açıklama                        |
|-----------------|--------------------------------|---------------------------------|
| `PORT`          | `3001`                         | Sunucu portu                    |
| `DATABASE_PATH` | `server/data/zerogame.db`      | SQLite dosya yolu               |
| `GAMES_DIR`     | `Games/`                       | Oyun manifest tarama kökü       |
| `SITE_DIST`     | `frontend/app/dist`            | Portal statik derlemesi         |

## Render'a deploy

- **Web Service** olarak kur: Build Command `npm install && npm run build`, Start Command `npm start`.
- Node ortamı: derleme için Node ≥ 20 önerilir.
- Kalıcılık: Render'ın ücretsiz/ephemeral katmanında **disk her deploy'da sıfırlanır**, yani SQLite
  skorları silinir. Skorların kalıcı olmasını istiyorsan `DATABASE_PATH`'i Render **Disk** ile
  maplenmiş bir yola ver (ör. `/var/data/zerogame.db`).

## Sağlık kontrolü

```bash
curl http://localhost:3001/api/health
curl http://localhost:3001/api/games
```
