import * as THREE from 'three';
import { addEdges } from './player.js';
import { CONFIG } from './config.js';

// ---------- Mermiler ----------
export class Bullets {
  constructor(scene) {
    this.pool = [];
    for (let i = 0; i < 12; i++) {
      const m = new THREE.Mesh(
        new THREE.BoxGeometry(0.14, 0.14, 2.0),
        new THREE.MeshBasicMaterial({ color: 0x7afcff, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending })
      );
      m.visible = false;
      scene.add(m);
      this.pool.push(m);
    }
    this.live = [];
  }
  spawn(x, y, z) {
    const m = this.pool.find(p => !p.visible);
    if (!m) return false;
    m.visible = true;
    m.position.set(x, y, z);
    this.live.push({ m, life: CONFIG.bulletLife });
    return true;
  }
  update(dt) {
    for (let i = this.live.length - 1; i >= 0; i--) {
      const b = this.live[i];
      b.m.position.z -= CONFIG.bulletSpeed * dt;
      b.life -= dt;
      if (b.life <= 0) { b.m.visible = false; this.live.splice(i, 1); }
    }
  }
  clear() { for (const b of this.live) b.m.visible = false; this.live.length = 0; }
}

// ---------- Boss küreleri ----------
export class Orbs {
  constructor(scene) {
    this.scene = scene;
    this.pool = [];
    this.live = [];
  }
  spawn(x, y, z, speed) {
    let m = this.pool.find(p => !p.visible);
    if (!m) {
      m = new THREE.Mesh(
        new THREE.SphereGeometry(0.4, 10, 8),
        new THREE.MeshBasicMaterial({ color: 0xff8a3d, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending })
      );
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.05, 6, 14), new THREE.MeshBasicMaterial({ color: 0xff3860 }));
      m.add(ring);
      this.scene.add(m);
      this.pool.push(m);
    }
    m.visible = true;
    m.position.set(x, y, z);
    m.userData.speed = speed;
    this.live.push({ m, vx: 0 });
  }
  update(dt, playerX, worldSpeed) {
    for (let i = this.live.length - 1; i >= 0; i--) {
      const o = this.live[i];
      const m = o.m;
      // hafif homing
      o.vx += Math.sign(playerX - m.position.x) * dt * 3.2;
      o.vx = Math.max(-2.6, Math.min(2.6, o.vx));
      m.position.x += o.vx * dt;
      m.position.z += (worldSpeed * 0.6 + 9) * dt;
      m.rotation.z += dt * 4;
      if (m.position.z > 8) { m.visible = false; this.live.splice(i, 1); }
    }
  }
  destroy(o) { o.m.visible = false; this.live.splice(this.live.indexOf(o), 1); }
  clear() { for (const o of this.live) o.m.visible = false; this.live.length = 0; }
}

// ---------- Drone ----------
export function droneMesh() {
  const g = new THREE.Group();
  const core = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.55, 0),
    new THREE.MeshBasicMaterial({ color: 0x2a0a24 })
  );
  addEdges(core, 0xff2bd6);
  g.add(core);
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(0.8, 0.07, 6, 18),
    new THREE.MeshBasicMaterial({ color: 0xff5ce1 })
  );
  ring.rotation.x = Math.PI / 2;
  g.add(ring);
  const eye = new THREE.Mesh(
    new THREE.SphereGeometry(0.18, 8, 6),
    new THREE.MeshBasicMaterial({ color: 0xffd60a, blending: THREE.AdditiveBlending, transparent: true, opacity: 0.9 })
  );
  eye.position.set(0, 0, -0.45);
  g.add(eye);
  return g;
}

export class Drone {
  constructor(scene, kind) {
    this.mesh = droneMesh();
    this.kind = kind; // 'ground' | 'floater'
    this.hp = 1;
    this.phase = Math.random() * 6;
    scene.add(this.mesh);
  }
  update(dt, speed, t) {
    this.mesh.position.z += (speed + 5) * dt;
    this.mesh.rotation.y += dt * 2.2;
    if (this.kind === 'floater') {
      this.mesh.position.y = 2.15 + Math.sin(t * 3 + this.phase) * 0.35;
      this.mesh.position.x = this.mesh.userData.bx + Math.sin(t * 1.4 + this.phase) * 0.5;
    } else {
      this.mesh.position.y = 0.62 + Math.sin(t * 4 + this.phase) * 0.12;
    }
  }
  box() {
    const p = this.mesh.position;
    return { x: p.x, y: p.y, z: p.z, hx: 0.8, hy: this.kind === 'floater' ? 0.7 : 0.75, hz: 0.8 };
  }
}

// ---------- Boss ----------
export function bossMesh() {
  const g = new THREE.Group();
  const core = new THREE.Mesh(
    new THREE.IcosahedronGeometry(1.7, 0),
    new THREE.MeshBasicMaterial({ color: 0x33060f })
  );
  addEdges(core, 0xff3860);
  g.add(core);

  const ring1 = new THREE.Mesh(new THREE.TorusGeometry(2.6, 0.16, 8, 30), new THREE.MeshBasicMaterial({ color: 0xff5c2e }));
  g.add(ring1);
  const ring2 = new THREE.Mesh(new THREE.TorusGeometry(3.1, 0.09, 8, 30), new THREE.MeshBasicMaterial({ color: 0xffd166 }));
  ring2.rotation.x = Math.PI / 2.4;
  g.add(ring2);

  const eye = new THREE.Mesh(
    new THREE.SphereGeometry(0.55, 12, 8),
    new THREE.MeshBasicMaterial({ color: 0xff3860, blending: THREE.AdditiveBlending, transparent: true, opacity: 0.95 })
  );
  eye.position.z = -1.4;
  g.add(eye);

  for (const s of [-1, 1]) {
    const pod = new THREE.Mesh(
      new THREE.ConeGeometry(0.5, 1.4, 6),
      new THREE.MeshBasicMaterial({ color: 0x24101e })
    );
    pod.position.set(s * 2.2, 0.2, 0.4);
    addEdges(pod, 0xff5c2e);
    g.add(pod);
  }
  g.userData = { ring1, ring2, eye, core };
  return g;
}

export class Boss {
  constructor(scene, level) {
    this.mesh = bossMesh();
    this.scene = scene;
    this.level = level;
    this.maxHp = CONFIG.bossBaseHp + level * 7;
    this.hp = this.maxHp;
    this.state = 'enter';
    this.t = 0;
    this.fireT = 2.2;
    this.mesh.position.set(0, 3.0, -140);
    this.mesh.visible = true;
    scene.add(this.mesh);
  }
  update(dt, speed, playerX) {
    this.t += dt;
    const u = this.mesh.userData;
    u.ring1.rotation.z += dt * (1.5 + this.level * 0.35);
    u.ring2.rotation.x += dt * (1.1 + this.level * 0.28);
    u.ring2.rotation.y += dt * 0.7;

    if (this.state === 'enter') {
      const target = -30;
      this.mesh.position.z += (target - this.mesh.position.z) * Math.min(1, dt * 1.6);
      this.mesh.position.y = 3.0 + Math.sin(this.t * 2) * 0.5;
      if (Math.abs(this.mesh.position.z - target) < 0.6) this.state = 'fight';
    } else {
      this.mesh.position.x = Math.sin(this.t * (1.1 + this.level * 0.16)) * 3.4;
      this.mesh.position.y = 2.9 + Math.sin(this.t * 2.3) * 0.7;
      this.fireT -= dt;
      if (this.fireT <= 0) {
        this.fireT = Math.max(0.65, 1.5 - this.level * 0.16);
        return true; // ateş zamanı: oyun küreyi oluşturur
      }
    }
    return false;
  }
  shouldFire() { return this.state === 'fight' && this.fireT <= 0; }
  hit() {
    this.hp--;
    const flash = 1 - this.hp / this.maxHp;
    this.mesh.userData.eye.material.color.setRGB(1, 0.25 + flash * 0.4, 0.38);
    this.mesh.scale.setScalar(1 + Math.sin(this.t * 30) * 0.06);
    return this.hp <= 0;
  }
  box() {
    const p = this.mesh.position;
    return { x: p.x, y: p.y, z: p.z, hx: 2.6, hy: 2.2, hz: 2.2 };
  }
}
