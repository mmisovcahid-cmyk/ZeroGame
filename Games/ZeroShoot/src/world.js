import * as THREE from 'three';
import { CONFIG, BIOMES, BIOME_LEN } from './config.js';

const WORLD_LEN = 280; // geri dönüşüm döngüsü uzunluğu

function gridTexture(hexTint) {
  const c = document.createElement('canvas');
  c.width = 128; c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = hexTint;
  g.fillRect(0, 0, 128, 128);
  g.strokeStyle = 'rgba(255,255,255,0.16)';
  g.lineWidth = 3;
  for (let i = 0; i <= 128; i += 32) {
    g.beginPath(); g.moveTo(i, 0); g.lineTo(i, 128); g.stroke();
    g.beginPath(); g.moveTo(0, i); g.lineTo(128, i); g.stroke();
  }
  g.strokeStyle = 'rgba(255,255,255,0.05)';
  g.lineWidth = 1;
  for (let i = 16; i < 128; i += 32) {
    g.beginPath(); g.moveTo(i, 0); g.lineTo(i, 128); g.stroke();
    g.beginPath(); g.moveTo(0, i); g.lineTo(128, i); g.stroke();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

function facadeTexture() {
  const c = document.createElement('canvas');
  c.width = 64; c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = '#0b0b1c';
  g.fillRect(0, 0, 64, 128);
  for (let y = 6; y < 128; y += 10) {
    for (let x = 5; x < 64; x += 10) {
      const r = Math.random();
      if (r < 0.28) g.fillStyle = 'rgba(255,255,255,0.85)';
      else if (r < 0.5) g.fillStyle = 'rgba(0,229,255,0.55)';
      else if (r < 0.62) g.fillStyle = 'rgba(255,43,214,0.5)';
      else g.fillStyle = 'rgba(20,20,45,0.9)';
      g.fillRect(x, y, 6, 5);
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

// Siyah-sarı tehlike şeritleri
function hazardTexture() {
  const c = document.createElement('canvas');
  c.width = 128; c.height = 64;
  const g = c.getContext('2d');
  g.fillStyle = '#c9a10a';
  g.fillRect(0, 0, 128, 64);
  g.strokeStyle = '#19132e';
  g.lineWidth = 22;
  for (let i = -2; i < 8; i++) {
    g.beginPath();
    g.moveTo(i * 32, -10); g.lineTo(i * 32 + 60, 74);
    g.stroke();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

export class World {
  constructor(scene, quality) {
    this.scene = scene;
    this.decoDensity = quality === 'low' ? 0.5 : quality === 'med' ? 0.8 : 1;
    this.portalSocket = null;

    // --- Renk hedefleri & mevcut ---
    this.cur = { bg: new THREE.Color(0x060214), ground: new THREE.Color(0x15153a), rail: new THREE.Color(0x00e5ff), deco: new THREE.Color(0xff2bd6), track: new THREE.Color(0x101033) };
    this.tgt = { bg: this.cur.bg.clone(), ground: this.cur.ground.clone(), rail: this.cur.rail.clone(), deco: this.cur.deco.clone(), track: this.cur.track.clone() };

    scene.background = this.cur.bg;
    scene.fog = new THREE.Fog(this.cur.bg.getHex(), 40, 235);

    // --- Zemin ---
    const groundGeo = new THREE.PlaneGeometry(70, 420);
    this.groundMat = new THREE.MeshBasicMaterial({ color: this.cur.ground });
    this.ground = new THREE.Mesh(groundGeo, this.groundMat);
    this.ground.rotation.x = -Math.PI / 2;
    this.ground.position.set(0, -0.05, -140);
    scene.add(this.ground);

    // --- Koşu pisti (kayan grid) ---
    const trackW = CONFIG.laneWidth * 3 + 1.2;
    this.trackTex = gridTexture('#1c1c46');
    this.trackTex.repeat.set(3, 30);
    this.trackMat = new THREE.MeshBasicMaterial({ map: this.trackTex, color: this.cur.track });
    const track = new THREE.Mesh(new THREE.PlaneGeometry(trackW, 420), this.trackMat);
    track.rotation.x = -Math.PI / 2;
    track.position.set(0, 0, -140);
    scene.add(track);

    // Şerit ayraç çizgileri
    const lineMat = new THREE.MeshBasicMaterial({ color: 0x55cdf0, transparent: true, opacity: 0.5 });
    for (const lx of [-CONFIG.laneWidth / 2, CONFIG.laneWidth / 2]) {
      const line = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.02, 420), lineMat);
      line.position.set(lx, 0.011, -140);
      scene.add(line);
    }

    // --- Yan korkuluklar (neon boru) ---
    this.railMat = new THREE.MeshBasicMaterial({ color: this.cur.rail });
    for (const s of [-1, 1]) {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.16, 420), this.railMat);
      rail.position.set(s * (trackW / 2 + 0.15), 0.34, -140);
      scene.add(rail);
      const rail2 = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.16, 420), this.railMat);
      rail2.position.set(s * (trackW / 2 + 0.15), 0.1, -140);
      scene.add(rail2);
    }

    // --- Binalar ---
    this.buildingTex = facadeTexture();
    this.buildingMat = new THREE.MeshBasicMaterial({ map: this.buildingTex, color: this.cur.deco });
    this.buildings = [];
    const bCount = Math.round(34 * this.decoDensity);
    for (let i = 0; i < bCount; i++) {
      const w = 1.6 + Math.random() * 3.4;
      const h = 4 + Math.random() * 24;
      const d = 2 + Math.random() * 5;
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), this.buildingMat);
      const side = i % 2 === 0 ? -1 : 1;
      m.position.set(side * (8.5 + Math.random() * 12), h / 2 - 0.5, -i * (WORLD_LEN / bCount) - Math.random() * 8);
      scene.add(m);
      this.buildings.push(m);
    }

    // --- Warp kemerleri (biyom 1) ---
    this.archMat = new THREE.MeshBasicMaterial({ color: this.cur.rail, transparent: true, opacity: 0.75 });
    this.arches = [];
    const archCount = 8;
    for (let i = 0; i < archCount; i++) {
      const a = new THREE.Mesh(new THREE.TorusGeometry(6.4, 0.22, 6, 22, Math.PI), this.archMat);
      a.position.set(0, 0, -i * (WORLD_LEN / archCount));
      a.visible = false;
      scene.add(a);
      this.arches.push(a);
    }

    // --- Asteroitler (biyom 2) ---
    this.astMat = new THREE.MeshBasicMaterial({ color: 0x8a5138 });
    this.astMat2 = new THREE.MeshBasicMaterial({ color: 0x515a66 });
    this.asteroids = [];
    const astCount = Math.round(18 * this.decoDensity);
    for (let i = 0; i < astCount; i++) {
      const r = 1 + Math.random() * 3.5;
      const m = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 0), i % 2 ? this.astMat : this.astMat2);
      const side = Math.random() < 0.5 ? -1 : 1;
      m.position.set(side * (10 + Math.random() * 20), Math.random() * 26 - 4, -i * (WORLD_LEN / astCount) - 10);
      m.rotation.set(Math.random() * 3, Math.random() * 3, Math.random() * 3);
      m.visible = false;
      scene.add(m);
      this.asteroids.push(m);
    }

    // --- Yıldız alanı ---
    const starCount = quality === 'low' ? 350 : 850;
    const pos = new Float32Array(starCount * 3);
    const col = new Float32Array(starCount * 3);
    const c1 = new THREE.Color(0xffffff), c2 = new THREE.Color(0x88bbff), c3 = new THREE.Color(0xffaadd);
    for (let i = 0; i < starCount; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 320;
      pos[i * 3 + 1] = Math.random() * 90 + 4;
      pos[i * 3 + 2] = -Math.random() * 420 + 60;
      const cc = Math.random() < 0.6 ? c1 : Math.random() < 0.5 ? c2 : c3;
      const b = 0.4 + Math.random() * 0.6;
      col[i * 3] = cc.r * b; col[i * 3 + 1] = cc.g * b; col[i * 3 + 2] = cc.b * b;
    }
    const sg = new THREE.BufferGeometry();
    sg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    sg.setAttribute('color', new THREE.BufferAttribute(col, 3));
    this.stars = new THREE.Points(sg, new THREE.PointsMaterial({ size: 0.55, vertexColors: true, fog: false, transparent: true, opacity: 0.95 }));
    scene.add(this.stars);

    this.decoMat = this.buildingMat;
    this.hazardTex = hazardTexture();
  }

  setBiome(idx) {
    const b = BIOMES[idx];
    this.tgt.bg.setHex(b.bg);
    this.tgt.ground.setHex(b.ground);
    this.tgt.rail.setHex(b.rail);
    this.tgt.deco.setHex(b.deco);
    this.tgt.track.setHex(b.track);
    this.trackedBiome = idx;
  }

  lerpCol(key, dt, rate = 1.4) {
    this.cur[key].lerp(this.tgt[key], Math.min(1, dt * rate));
  }

  update(dt, speed, dist) {
    // renk geçişi
    this.lerpCol('bg', dt); this.lerpCol('ground', dt); this.lerpCol('rail', dt); this.lerpCol('deco', dt); this.lerpCol('track', dt);
    this.scene.fog.color.copy(this.cur.bg);
    this.groundMat.color.copy(this.cur.ground);
    this.trackMat.color.copy(this.cur.track);
    this.railMat.color.copy(this.cur.rail);
    this.buildingMat.color.copy(this.cur.deco);
    this.archMat.color.copy(this.cur.rail);

    // pist kayması
    this.trackTex.offset.y -= speed * dt * (30 / 420); // 30 tekrar / 400 birim

    // geri dönüşüm
    const dz = speed * dt;
    for (const b of this.buildings) {
      b.position.z += dz;
      if (b.position.z > 26) b.position.z -= WORLD_LEN;
    }
    for (const a of this.arches) {
      a.position.z += dz;
      if (a.position.z > 14) a.position.z -= WORLD_LEN;
    }
    for (const m of this.asteroids) {
      m.position.z += dz;
      m.rotation.y += dt * 0.4;
      m.rotation.x += dt * 0.23;
      if (m.position.z > 30) m.position.z -= WORLD_LEN;
    }

    // biyom dekor görünürlüğü
    const bio = this.trackedBiome ?? 0;
    const archOn = bio === 1, astOn = bio === 2;
    for (const a of this.arches) a.visible = archOn;
    for (const m of this.asteroids) m.visible = astOn;

    this.stars.rotation.z += dt * 0.006;
    this.stars.rotation.y = Math.sin(dist * 0.0008) * 0.04;
  }

  biomeIndexFor(dist) {
    return Math.floor(dist / BIOME_LEN) % 3;
  }
}
