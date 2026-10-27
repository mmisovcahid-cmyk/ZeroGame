// Piksel portalı global skor API istemcisi.
// Portal içinde iframe ile ya da aynı sunucu üzerinde çalıştığı için
// göreceli adresler kullanılır; geliştirme ortamında vite proxy'i devreye girer.
const GAME_ID = 'zeroshoot';

async function request(url, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 2500);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      throw new Error(body?.error || 'HTTP ' + res.status);
    }
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

/** Bu oyuncunun skorunu global tabloya gönderir; dönen yanıt { ok, rank } içerir. */
export function submitScore({ player, score, dist = 0 }) {
  return request(`/api/games/${GAME_ID}/scores`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ player, score, dist }),
  });
}

/** Global top skor listesi: [{ player, score, dist, createdAt }] */
export function fetchTopScores(limit = 10) {
  return request(`/api/games/${GAME_ID}/scores?limit=${limit}`);
}
