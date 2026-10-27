import * as THREE from 'three';
import { CONFIG } from './config.js';

export function addEdges(mesh, color, opacity = 0.9) {
  const e = new THREE.LineSegments(
    new THREE.EdgesGeometry(mesh.geometry),
    new THREE.LineBasicMaterial({ color, transparent: true, opacity })
  );
  mesh.add(e);
  return e;
}

export class Player {
  constructor(scene, game) {
    this.game = game;
    this.group = new THREE.Group();
    this.hover = 0.95;   // süzülme yüksekliği
    this.x = 0;
    this.y = 0;          // zıplama yüksekliği
    this.vy = 0;
    this.lane = 0;
    this.targetX = 0;
    this.mouseIntent = false;
    this.jumping = false;
    this.sliding = false;
    this.slideT = 0;
    this.cool = 0;
    this.invul = 0;
    this.trailT = 0;

    // ---- Gemi ----
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(1.15, 0.42, 2.1),
      new THREE.MeshBasicMaterial({ color: 0x11163a })
    );
    addEdges(body, 0x00e5ff);
    this.group.add(body);

    const cockpit = new THREE.Mesh(
      new THREE.SphereGeometry(0.34, 10, 8),
      new THREE.MeshBasicMaterial({ color: 0x7afcff, transparent: true, opacity: 0.85 })
    );
    cockpit.position.set(0, 0.28, 0.15);
    this.group.add(cockpit);

    for (const s of [-1, 1]) {
      const wing = new THREE.Mesh(
        new THREE.BoxGeometry(1.05, 0.09, 0.55),
        new THREE.MeshBasicMaterial({ color: 0x0d1230 })
      );
      wing.position.set(s * 0.95, -0.06, 0.25);
      wing.rotation.z = s * 0.28;
      addEdges(wing, 0xff2bd6);
      this.group.add(wing);

      const engine = new THREE.Mesh(
        new THREE.SphereGeometry(0.17, 8, 6),
        new THREE.MeshBasicMaterial({ color: 0x00e5ff, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending })
      );
      engine.position.set(s * 0.42, 0, 1.12);
      this.group.add(engine);
      this.engineGlow = engine;
    }

    const fin = new THREE.Mesh(
      new THREE.BoxGeometry(0.08, 0.5, 0.7),
      new THREE.MeshBasicMaterial({ color: 0xff2bd6 })
    );
    fin.position.set(0, 0.45, 0.85);
    this.group.add(fin);

    // namlu işaretleme noktası
    this.muzzle = new THREE.Object3D();
    this.muzzle.position.set(0, 0.05, -1.25);
    this.group.add(this.muzzle);

    // kalkan baloncuğu
    this.shieldMesh = new THREE.Mesh(
      new THREE.SphereGeometry(1.55, 14, 10),
      new THREE.MeshBasicMaterial({ color: 0x00e5ff, transparent: true, opacity: 0.22, blending: THREE.AdditiveBlending, depthWrite: false })
    );
    this.shieldMesh.visible = false;
    this.group.add(this.shieldMesh);

    scene.add(this.group);
    this.group.position.set(0, this.hover, 0);

    this.reset();
  }

  reset() {
    this.x = 0; this.y = 0; this.vy = 0;
    this.lane = 0; this.targetX = 0; this.mouseIntent = false;
    this.jumping = false; this.sliding = false; this.slideT = 0;
    this.cool = 0; this.invul = 0;
    this.hearts = CONFIG.hearts;
    this.shield = 0; this.magnet = 0; this.boost = 0; this.double = 0;
    this.group.visible = true;
    this.group.position.set(0, this.hover, 0);
    this.shieldMesh.visible = false;
  }

  setMouseX(nx) {
    // hassasiyet ayarı: sens %'si
    const sens = (this.game.settings.sens ?? 100) / 100;
    this.targetX = Math.max(-MAX, Math.min(MAX, nx * MAX * 1.25 * sens));
    this.mouseIntent = true;
  }

  moveLane(dir) {
    const nl = Math.max(-1, Math.min(1, this.lane + dir));
    if (nl !== this.lane) {
      this.lane = nl;
      this.targetX = nl * CONFIG.laneWidth;
      this.mouseIntent = false;
      this.game.audio.way();
    }
  }

  jump() {
    if (this.jumping) return;
    if (this.sliding) { this.sliding = false; this.slideT = 0; }
    this.jumping = true;
    this.vy = CONFIG.jumpVel;
    this.game.audio.jump();
  }

  slide() {
    if (this.y > 0.4) { // havadayken hızlı in
      this.vy = Math.min(this.vy, -9);
      return;
    }
    if (this.sliding) return;
    this.sliding = true;
    this.slideT = CONFIG.slideTime;
    this.game.audio.slide();
  }

  shoot() {
    if (this.cool > 0) return;
    this.cool = CONFIG.shootCooldown;
    this.game.spawnBulletFrom(this);
    // namlu flaşı
    const p = this.muzzleWorld();
    this.game.effects.burst(p.x, p.y, p.z, 0x7afcff, 5, 2.5, 0.22, 0.2);
  }

  muzzleWorld() {
    return new THREE.Vector3(this.group.position.x + this.muzzle.position.x,
      this.group.position.y + this.muzzle.position.y, this.group.position.z + this.muzzle.position.z);
  }

  hurt(fx) {
    if (this.invul > 0) return false;
    if (this.shield > 0) {
      this.shield--;
      this.invul = 0.8;
      if (this.shield <= 0) this.shieldMesh.visible = false;
      fx.burst(this.x, this.group.position.y, 0, 0x00e5ff, 34, 7, 1.2, 0.8);
      fx.shake(0.35);
      this.game.audio.hit();
      this.game.ui.toast('KALKAN GİTTİ!', '#00e5ff');
      return true;
    }
    this.hearts--;
    this.invul = CONFIG.invulnTime;
    fx.burst(this.x, this.group.position.y, 0, 0xff3860, 42, 8, 1.4, 0.9);
    fx.shake(0.75);
    this.game.audio.hit();
    this.game.ui.flash();
    if (this.hearts <= 0) this.game.gameOver();
    return true;
  }

  get firing() { return this.game.input.firing; }

  update(dt, speed) {
    // --- yatay ---
    if (this.mouseIntent) { /* fare hedefi aktif */ }
    const rate = Math.min(1, dt * 9);
    this.x += (this.targetX - this.x) * rate;
    this.group.position.x = this.x;
    this.group.rotation.z = (this.targetX - this.x) * -0.35;
    this.group.rotation.y = (this.targetX - this.x) * -0.18;

    // --- dikey ---
    if (this.jumping) {
      this.vy -= CONFIG.gravity * dt;
      this.y += this.vy * dt;
      if (this.y <= 0) { this.y = 0; this.vy = 0; this.jumping = false; }
    }
    if (this.sliding) {
      this.slideT -= dt;
      if (this.slideT <= 0) this.sliding = false;
    }
    this.group.position.y = this.hover + this.y - (this.sliding ? 0.16 : 0);
    const scaleY = this.sliding ? 0.45 : 1;
    this.group.scale.y += (scaleY - this.group.scale.y) * Math.min(1, dt * 12);

    // --- zamanlayıcılar ---
    this.cool -= dt;
    this.invul -= dt;
    if (this.magnet > 0) this.magnet -= dt;
    if (this.boost > 0) this.boost -= dt;
    if (this.double > 0) this.double -= dt;

    // görünürlük (dokunulmazlık yanıp sönmesi)
    this.group.visible = this.invul > 0 ? (Math.floor(this.invul * 14) % 2 === 0) : true;

    // kalkan animasyonu
    if (this.shield > 0) {
      this.shieldMesh.visible = true;
      this.shieldMesh.rotation.y += dt * 1.6;
      this.shieldMesh.rotation.x += dt * 0.8;
    } else this.shieldMesh.visible = false;

    // mıknatıs halka animasyonu
    if (this.magnet > 0) {
      this.shieldMesh.visible = true;
      this.shieldMesh.material.color.setHex(0xff2bd6);
      this.shieldMesh.material.opacity = 0.14;
    } else {
      this.shieldMesh.material.color.setHex(0x00e5ff);
      this.shieldMesh.material.opacity = 0.22;
      if (this.shield <= 0) this.shieldMesh.visible = false;
    }

    // --- otomatik ateş ---
    if (this.firing) this.shoot();

    // engine izi
    this.trailT -= dt;
    if (this.trailT <= 0) {
      this.trailT = 0.03;
      this.game.effects.trail(this.x - 0.42, this.group.position.y - 0.05, 1.2, 0x00cfe5);
      this.game.effects.trail(this.x + 0.42, this.group.position.y - 0.05, 1.2, 0xff2bd6);
    }
  }

  // çarpışma kutusu
  box() {
    const halfH = this.sliding ? 0.30 : 0.85;
    const cy = this.group.position.y - (this.sliding ? 0.05 : 0);
    return { x: this.x, y: cy, z: 0, hx: 0.95, hy: halfH, hz: 1.0 };
  }
}

const MAX = 3.0;
