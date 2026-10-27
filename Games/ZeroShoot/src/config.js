export const CONFIG = {
  laneWidth: 2.6,
  spawnZ: -240,
  despawnZ: 14,
  baseSpeed: 14,
  maxSpeed: 44,
  speedGain: 0.016,     // metre başına hız artışı
  gravity: 34,
  jumpVel: 12.5,
  slideTime: 0.55,
  shootCooldown: 0.15,
  bulletSpeed: 95,
  bulletLife: 1.3,
  hearts: 3,
  invulnTime: 1.5,
  bossEvery: 1500,      // metre
  droneScore: 150,
  coinScore: 25,
  orbScore: 60,
  bossBaseHp: 26,
  magnetTime: 8,
  boostTime: 4,
  doubleTime: 10,
};

export const BIOMES = [
  { name: 'NEON ŞEHİR',  bg:0x060214, ground:0x15153a, rail:0x00e5ff, deco:0xff2bd6, track:0x101033 },
  { name: 'WARP TÜNELİ', bg:0x0b0326, ground:0x1d1040, rail:0x7c4dff, deco:0x00ffe1, track:0x180b3d },
  { name: 'ASTEROİT ALANI', bg:0x160408, ground:0x2a0f14, rail:0xff5c2e, deco:0xffd166, track:0x240b10 },
];

// Biyom eşikleri (metre): her THRESHOLD mesafede biyom değişir, ardından döngü
export const BIOME_LEN = 1400;
