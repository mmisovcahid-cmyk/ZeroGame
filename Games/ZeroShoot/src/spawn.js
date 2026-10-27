import * as THREE from 'three';
import { CONFIG } from './config.js';
import { droneMesh } from './enemies.js';
import { addEdges } from './player.js';

const LANES = [-CONFIG.laneWidth, 0, CONFIG.laneWidth];

export class Spawner {
  constructor(scene, game) {
    this.game = game;
    this.scene = scene;
    this.pools = { block: [], barrier: [], gate: [] };
    this.coinPool = [];
    this.pupPool = [];
    this.dronePool = [];
    this.obstacles = [];      // { kind, mesh }
    this.coins = [];
    this.pups = [];
    this.drones = [];
    this.nextAt = 22;
    this.pupAt = 380;
    this.rng = Math.random;
  }

  reset() {
    for (const o of this.obstacles) this._hide(o.mesh);
    this.obstacles.length = 0;
    for (const c of this.coins) this._hide(c.mesh);
    this.coins.length = 0;
    for (const p of this.pups) this._hide(p.mesh);
    this.pups.length = 0;
    for (const d of this.drones) this._hide(d.mesh);
    this.drones.length = 0;
    this.nextAt = 22;
    this.pupAt = 380;
  }

  _hide(m) { m.visible = false; }

  _getPooled(pool, maker) {
    let m = pool.find(p => !p.visible);
    if (!m) { m = maker(); this.scene.add(m); pool.push(m); }
    m.visible = true;
    return m;
  }

  // ---- Fabrikalar ----
  _block() {
    const m = new THREE.Mesh(
      new THREE.BoxGeometry(2.1, 2.7, 0.8),
      new THREE.MeshBasicMaterial({ color: 0x24102b })
    );
    addEdges(m, 0xff2bd6);
    m.position.y = 1.35; // yerde durur
    return m;
  }

  _barrierM() {
    const tex = this.game.world.hazardTex;
    const m = new THREE.Mesh(
      new THREE.BoxGeometry(9.0, 0.9, 0.42),
      new THREE.MeshBasicMaterial({ map: tex })
    );
    m.position.y = 0.45;
    return m;
  }

  _gateM() {
    const g = new THREE.Group();
    const bar = new THREE.Mesh(
      new THREE.BoxGeometry(9.0, 1.25, 0.5),
      new THREE.MeshBasicMaterial({ color: 0x2a1040 })
    );
    bar.position.y = 2.3;
    addEdges(bar, 0xff2bd6);
    g.add(bar);
    const strip = new THREE.Mesh(
      new THREE.BoxGeometry(9.0, 0.08, 0.52),
      new THREE.MeshBasicMaterial({ color: 0xff2bd6 })
    );
    strip.position.y = 1.72;
    g.add(strip);
    for (const s of [-1, 1]) {
      const post = new THREE.Mesh(
        new THREE.BoxGeometry(0.35, 2.9, 0.5),
        new THREE.MeshBasicMaterial({ color: 0x2a1040 })
      );
      post.position.set(s * 4.35, 1.45, 0);
      addEdges(post, 0x7c4dff);
      g.add(post);
    }
    return g;
  }

  _coin() {
    const geo = new THREE.CylinderGeometry(0.36, 0.36, 0.09, 14);
    geo.rotateX(Math.PI / 2);
    const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: 0xffd166 }));
    return m;
  }

  _pup(kind) {
    let m, color;
    if (kind === 'shield') {
      color = 0x00e5ff;
      m = new THREE.Mesh(new THREE.IcosahedronGeometry(0.55, 0), new THREE.MeshBasicMaterial({ color }));
      addEdges(m, color);
    } else if (kind === 'magnet') {
      color = 0xff2bd6;
      m = new THREE.Mesh(new THREE.TorusGeometry(0.48, 0.16, 8, 16), new THREE.MeshBasicMaterial({ color }));
    } else if (kind === 'boost') {
      color = 0xffd60a;
      m = new THREE.Mesh(new THREE.ConeGeometry(0.45, 1.0, 8), new THREE.MeshBasicMaterial({ color }));
      addEdges(m, color);
    } else { // double
      color = 0x7cff4f;
      m = new THREE.Mesh(new THREE.OctahedronGeometry(0.58, 0), new THREE.MeshBasicMaterial({ color }));
      addEdges(m, color);
    }
    m.userData.kind = kind;
    m.userData.color = color;
    return m;
  }

  _pupKinds() {
    const p = this.game.player;
    const k = ['magnet', 'boost', 'double', 'shield'];
    // ihtiyaca göre ağırlık: kalkan yoksa önce kalkan
    if (p.shield <= 0 && p.hearts < CONFIG.hearts) k.unshift('shield');
    return k[Math.floor(this.rng() * k.length)];
  }

  // ---- Desen ----
  _coinLine(lane, z0 = 0, n = 5, y = 1.1) {
    for (let i = 0; i < n; i++) {
      const m = this._getPooled(this.coinPool, this._coin.bind(this));
      m.position.set(lane, y, CONFIG.spawnZ - z0 - i * 2.2);
      m.userData.taken = false;
      this.coins.push({ mesh: m });
    }
  }

  _coinArc(lane, z0) {
    for (let i = 0; i < 5; i++) {
      const t = i / 4;
      const y = 1.4 + Math.sin(t * Math.PI) * 1.5;
      const m = this._getPooled(this.coinPool, this._coin.bind(this));
      m.position.set(lane, y, CONFIG.spawnZ - z0 - (i - 2) * 3.2);
      m.userData.taken = false;
      this.coins.push({ mesh: m });
    }
  }

  _addObstacle(kind, mesh, x, zOff = 0) {
    mesh.position.x = x;
    mesh.position.z = CONFIG.spawnZ - zOff;
    this.obstacles.push({ kind, mesh });
  }

  pattern() {
    const d = Math.min(1, this.game.dist / 2500);
    const r = this.rng();
    const z = CONFIG.spawnZ;
    let gapMul = 1;

    if (r < 0.22) {
      // tek blok + yanşerit coin
      const j = Math.floor(this.rng() * 3);
      const m = this._getPooled(this.pools.block, this._block.bind(this));
      this._addObstacle('block', m, LANES[j]);
      this._coinLine(LANES[(j + 1 + Math.floor(this.rng() * 2)) % 3], 0, 6);
    } else if (r < 0.34 + d * 0.14) {
      // iki blok (tek şerit açık)
      const open = Math.floor(this.rng() * 3);
      for (let i = 0; i < 3; i++) {
        if (i === open) continue;
        const m = this._getPooled(this.pools.block, this._block.bind(this));
        this._addObstacle('block', m, LANES[i]);
      }
      this._coinLine(LANES[open], 0, 6);
      gapMul = 1.25;
    } else if (r < 0.52) {
      // zıplama engeli (tam genişlik) + havada coin yayı
      const m = this._getPooled(this.pools.barrier, this._barrierM.bind(this));
      this._addObstacle('barrier', m, 0);
      const j = Math.floor(this.rng() * 3);
      this._coinArc(LANES[j], 3);
    } else if (r < 0.68) {
      // kayma kapısı (tam genişlik) + yerde coin
      const m = this._getPooled(this.pools.gate, this._gateM.bind(this));
      this._addObstacle('gate', m, 0);
      const j = Math.floor(this.rng() * 3);
      this._coinLine(LANES[j], -2, 5, 0.55);
      gapMul = 1.15;
    } else if (r < 0.82) {
      // drone dalgası
      const n = 1 + (this.rng() < d * 0.8 ? 1 : 0);
      for (let i = 0; i < n; i++) {
        const kind = this.rng() < 0.5 + d * 0.25 ? 'floater' : 'ground';
        const j = Math.floor(this.rng() * 3);
        const dm = this._getPooled(this.dronePool, droneMesh);
        const dr = new DroneDummy(dm, kind);
        dr.mesh.userData.bx = LANES[j];
        dr.mesh.position.set(LANES[j], kind === 'floater' ? 2.15 : 0.62, z - i * 7);
        this.drones.push(dr);
      }
      gapMul = 1.1;
    } else if (r < 0.92) {
      // zigzag coin yolu + belki tek blok
      let ln = Math.floor(this.rng() * 3);
      for (let i = 0; i < 3; i++) {
        this._coinLine(LANES[ln], i * 13, 4, 1.05);
        ln = Math.max(0, Math.min(2, ln + (this.rng() < 0.5 ? -1 : 1)));
      }
      if (d > 0.25 && this.rng() < 0.5) {
        const m = this._getPooled(this.pools.block, this._block.bind(this));
        this._addObstacle('block', m, LANES[Math.floor(this.rng() * 3)], 20);
      }
      gapMul = 1.5;
    } else {
      // kombo: kapı + blok
      const m = this._getPooled(this.pools.gate, this._gateM.bind(this));
      this._addObstacle('gate', m, 0);
      const j = Math.floor(this.rng() * 3);
      const b = this._getPooled(this.pools.block, this._block.bind(this));
      this._addObstacle('block', b, LANES[j], 11);
      gapMul = 1.35;
    }

    const speed = this.game.speed;
    const seconds = 1.25 - d * 0.35;
    this.nextAt = this.game.dist + speed * seconds * gapMul * (0.85 + this.rng() * 0.4);
  }

  update(dt) {
    const g = this.game;
    const speed = g.speed;

    // desen tetikleme & güç zampara
    if (!g.bossActive && g.dist >= this.nextAt) this.pattern();
    if (!g.bossActive && g.dist >= this.pupAt) {
      const kind = this._pupKinds();
      const m = this._getPooled(this.pupPool, () => this._pup(kind));
      m.userData.kind = kind;
      const j = Math.floor(this.rng() * 3);
      m.position.set(LANES[j], 1.35, CONFIG.spawnZ);
      this.pups.push({ mesh: m, kind });
      this.pupAt = g.dist + 430 + this.rng() * 300;
    }

    // hareket
    const dz = speed * dt;
    for (let i = this.obstacles.length - 1; i >= 0; i--) {
      const o = this.obstacles[i];
      o.mesh.position.z += dz;
      o.mesh.matrixAutoUpdate = false;
      o.mesh.updateMatrix();
      if (o.mesh.position.z > CONFIG.despawnZ) { this._hide(o.mesh); this.obstacles.splice(i, 1); }
    }
    for (let i = this.coins.length - 1; i >= 0; i--) {
      const c = this.coins[i];
      c.mesh.position.z += dz;
      c.mesh.rotation.y += dt * 3.2;
      // mıknatıs
      if (g.player.magnet > 0 && c.mesh.position.z > -34 && c.mesh.position.z < 4) {
        const p = g.player;
        const tx = p.x, ty = p.group.position.y;
        const k = Math.min(1, dt * 10);
        c.mesh.position.x += (tx - c.mesh.position.x) * k;
        c.mesh.position.y += (ty - c.mesh.position.y) * k;
        c.mesh.position.z += 16 * dt;
      }
      if (c.mesh.position.z > CONFIG.despawnZ) { this._hide(c.mesh); this.coins.splice(i, 1); }
    }
    for (let i = this.pups.length - 1; i >= 0; i--) {
      const p = this.pups[i];
      p.mesh.position.z += dz;
      p.mesh.rotation.y += dt * 2.4;
      p.mesh.position.y = 1.35 + Math.sin(g.time * 3) * 0.18;
      if (p.mesh.position.z > CONFIG.despawnZ) { this._hide(p.mesh); this.pups.splice(i, 1); }
    }
    for (let i = this.drones.length - 1; i >= 0; i--) {
      const dr = this.drones[i];
      dr.update(dt, speed, g.time);
      if (dr.mesh.position.z > CONFIG.despawnZ) { this._hide(dr.mesh); this.drones.splice(i, 1); }
    }
  }

  // boss başlarken sahayı temizle
  clearAll() {
    const fx = this.game.effects;
    for (const o of [...this.obstacles]) { fx.burst(o.mesh.position.x, o.mesh.position.y, o.mesh.position.z, 0xff2bd6, 6, 3, 0.6, 0.5); this._hide(o.mesh); }
    for (const c of [...this.coins]) this._hide(c.mesh);
    for (const p of [...this.pups]) this._hide(p.mesh);
    for (const d of [...this.drones]) { fx.burst(d.mesh.position.x, d.mesh.position.y, d.mesh.position.z, 0xff2bd6, 8, 3, 0.6, 0.5); this._hide(d.mesh); }
    this.obstacles.length = 0; this.coins.length = 0; this.pups.length = 0; this.drones.length = 0;
  }
}

// Drone sınıfını havuzla kullanan ince sarmalayıcı
class DroneDummy {
  constructor(mesh, kind) { this.mesh = mesh; this.kind = kind; this.hp = 1; this.phase = Math.random() * 6; }
  update(dt, speed, t) {
    const m = this.mesh;
    m.position.z += (speed + 5) * dt;
    m.rotation.y += dt * 2.2;
    if (this.kind === 'floater') {
      m.position.y = 2.15 + Math.sin(t * 3 + this.phase) * 0.35;
      m.position.x = m.userData.bx + Math.sin(t * 1.4 + this.phase) * 0.5;
    } else {
      m.position.y = 0.62 + Math.sin(t * 4 + this.phase) * 0.12;
    }
  }
  box() {
    const p = this.mesh.position;
    return { x: p.x, y: p.y, z: p.z, hx: 0.8, hy: 0.7, hz: 0.8 };
  }
}
