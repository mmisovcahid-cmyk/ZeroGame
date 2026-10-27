# ZeroShoot 🚀

3D neon sonsuz koşucu + atış oyunu. Tarayıcıda oynanır (Three.js).

## Çalıştırma

```bash
npm install
npm run dev
```

Tarayıcıda `http://localhost:5173` açılır.

Statik build için: `npm run build` (sonuç `dist/` klasörüne düşer, GitHub Pages vb. yükleyebilirsin).

## Kontroller

| Aksiyon | Klavye | Fare/Dokunmatik |
|---|---|---|
| Şerit değişimi | ← → veya A D | Fare hareketi / yatay kaydırma |
| Zıpla | ↑ / W / Boşluk | Yukarı kaydırma |
| Kay | ↓ / S / Shift | Aşağı kaydırma |
| Ateş | F / J (basılı tut) | Tık / Tap |

ESC = duraklat.

## Oynanış

- Mesafe arttıkça hız YÜKSELİR
- Önden gelen droneleri vur: +150 puan
- Her 1500 m'de BOSS gelir — vurma sırası sende
- Coin, kalkan, mıknatıs, hız patlaması ve çift puan topla
- 3 biyom: Neon Şehir → Warp Tüneli → Asteroit Alanı
