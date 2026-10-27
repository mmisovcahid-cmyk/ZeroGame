import './style.css';
import * as THREE from 'three';
import { CONFIG, BIOME_LEN, BIOMES } from './config.js';
import { Storage } from './storage.js';
import { AudioSys } from './audio.js';
import { Input } from './input.js';
import { World } from './world.js';
import { Effects, isHit } from './effects.js';
import { Player } from './player.js';
import { Bullets, Orbs, Boss } from './enemies.js';
import { Spawner } from './spawn.js';
import { UI } from './ui.js';

class Game {
  constructor() {
    this.settings = Storage.loadSettings();
    const q = this.settings.quality;

    this.renderer = new THREE.WebGLRenderer({ antialias: q !== 'low', powerPreference: 'high-performance' });
    this.renderer.setSize(innerWidth, innerHeight);
    this.applyPixelRatio();
    document.getElementById('app').appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(70, innerWidth / innerHeight, 0.1, 500);
    this.camera.position.set(0, 5.4, 9.2);
    this.camera.lookAt(0, 2.0, -30);

    this.audio = new AudioSys(this.settings);
    this.world = new World(this.scene, q);
    this.effects = new Effects(this.scene, q);
    this.player = new Player(this.scene, this);
    this.bullets = new Bullets(this.scene);
    this.orbs = new Orbs(this.scene);
    this.spawner = new Spawner(this.scene, this);
    this.ui = new UI(this);
    this.ui.syncSettings();
    this.input = new Input(this);

    this.state = 'menu';
    this.time = 0;
    this.speed = CONFIG.baseSpeed;
    this.boss = null; this.bossLevel = 0; this.bossActive = false; this.bossDead = false;
    this._lastBiome = 0;
    this.lastSaved = false;
    this.ui.renderScores();

    window.addEventListener('resize', () => {
      this.camera.aspect = innerWidth / innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(innerWidth, innerHeight);
    });

    this.clock = new THREE.Clock();
    this._loop = this.loop.bind(this);
    requestAnimationFrame(this._loop);
  }

  // ---- ayarlar ----
  applyPixelRatio() {
    const cap = this.settings.quality === 'low' ? 1 : this.settings.quality === 'med' ? 1.5 : 2;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, cap));
  }
  applyQuality(q) {
    this.settings.quality = q;
    Storage.saveSettings(this.settings);
    this.applyPixelRatio();
  }
  setSound(v) {
    this.settings.sound = v;
    Storage.saveSettings(this.settings);
    this.audio.setVolume(v / 100);
  }
  setSens(v) {
    this.settings.sens = v;
    Storage.saveSettings(this.settings);
  }

  spawnBulletFrom(player) {
    const p = player.muzzleWorld();
    if (this.bullets.spawn(p.x, p.y, p.z)) this.audio.shoot();
  }

  addScore(v) {
    this.score += v * (this.player.double > 0 ? 2 : 1);
  }

  // ---- durum makinesi ----
  start() {
    this.audio.unlock();
    this.dist = 0; this.score = 0; this.coins = 0; this.kills = 0;
    this.speed = CONFIG.baseSpeed;
    this.nextBossAt = CONFIG.bossEvery;
    this.bossLevel = 0; this.bossActive = false; this.bossDead = false;
    this._lastBiome = 0; this.milestone = 500;
    this._gateHintShown = false;
    this.lastSaved = false;
    if (this.boss) { this.scene.remove(this.boss.mesh); this.boss = null; }
    this.orbs.clear(); this.bullets.clear();
    this.spawner.reset();
    this.player.reset();
    this.world.setBiome(0);
    this.state = 'playing';
    this.ui.show('hud');
    this.ui.startHud();
    this.audio.startMusic();
  }

  pause() {
    if (this.state !== 'playing') return;
    this.state = 'paused';
    this.ui.show('pause');
    this.audio.stopMusic();
  }

  resume() {
    if (this.state !== 'paused') return;
    this.state = 'playing';
    this.ui.show('hud');
    this.audio.startMusic();
  }

  togglePause() {
    if (this.state === 'playing') this.pause();
    else if (this.state === 'paused') this.resume();
  }

  toMenu() {
    this.state = 'menu';
    if (this.boss) { this.scene.remove(this.boss.mesh); this.boss = null; }
    this.bossActive = false; this.bossDead = false;
    this.orbs.clear(); this.bullets.clear();
    this.spawner.reset();
    this.player.reset();
    this.ui.show('menu');
    this.audio.stopMusic();
  }

  gameOver() {
    if (this.state !== 'playing') return;
    this.state = 'gameover';
    this.audio.explode();
    this.audio.stopMusic();
    this.effects.burst(this.player.x, this.player.group.position.y, 0, 0xff3860, 80, 10, 1.6, 1.2);
    this.effects.burst(this.player.x, this.player.group.position.y, 0, 0xffd60a, 40, 8, 1.2, 1.0);
    this.effects.shake(1.2);
    this.player.group.visible = false;
    const scores = Storage.loadScores();
    const s = Math.floor(this.score);
    const isHigh = s > 0 && (scores.length < 8 || s > scores[scores.length - 1].score);
    this.ui.showGameOver({ score: s, dist: Math.floor(this.dist), coins: this.coins, kills: this.kills }, isHigh);
  }

  // ---- boss ----
  startBoss() {
    this.bossActive = true;
    this.spawner.clearAll();
    this.bossLevel++;
    this.boss = new Boss(this.scene, this.bossLevel);
    this.bossDead = false;
    this.audio.bossHorn();
    this.ui.toast('◈ BOSS GELDİ! VUR! ◈', '#ff3860', 2600);
  }

  killBoss() {
    const b = this.boss;
    const p = b.mesh.position;
    for (let i = 0; i < 4; i++) {
      this.effects.burst(p.x + (Math.random() - 0.5) * 4, p.y + (Math.random() - 0.5) * 3, p.z,
        i % 2 ? 0xff3860 : 0xffd60a, 30, 9, 1.5, 1.1);
    }
    this.effects.shake(1.0);
    this.audio.explode();
    this.scene.remove(b.mesh);
    this.boss = null; this.bossDead = true; this.bossActive = false;
    const bonus = 1200 + this.bossLevel * 600;
    this.addScore(bonus);
    this.nextBossAt = this.dist + CONFIG.bossEvery;
    this.orbs.clear();
    this.ui.toast('BOSS DEVRİLDİ! +' + bonus, '#7cff4f', 2400);
  }

  applyPup(kind) {
    const p = this.player;
    if (kind === 'shield') p.shield = Math.min(2, p.shield + 1);
    else if (kind === 'magnet') p.magnet = CONFIG.magnetTime;
    else if (kind === 'boost') p.boost = CONFIG.boostTime;
    else if (kind === 'double') p.double = CONFIG.doubleTime;
    this.audio.power();
    this.ui.flash(kind === 'shield' ? 'cy' : 'gold');
  }

  // ---- döngü ----
  loop() {
    requestAnimationFrame(this._loop);
    const dt = Math.min(0.05, this.clock.getDelta());
    this.time += dt;

    if (this.state === 'playing') this.update(dt);
    else if (this.state === 'menu') this.updateMenu(dt);
    else if (this.state === 'gameover') this.updateDead(dt);

    this.input.update(dt);
    this._camera(dt);
    this.renderer.render(this.scene, this.camera);
  }

  update(dt) {
    const mul = this.player.boost > 0 ? 1.5 : 1;
    const target = Math.min(CONFIG.maxSpeed, CONFIG.baseSpeed + this.dist * CONFIG.speedGain) * mul;
    this.speed += (target - this.speed) * Math.min(1, dt * 2.5);
    this.dist += this.speed * dt;
    this.score += this.speed * dt * 0.55 * (this.player.double > 0 ? 2 : 1);

    // biyom
    const bio = this.world.biomeIndexFor(this.dist);
    if (bio !== this._lastBiome) {
      this._lastBiome = bio;
      this.world.setBiome(bio);
      const c = BIOMES[bio].rail.toString(16).padStart(6, '0');
      this.ui.toast('BÖLGE: ' + BIOMES[bio].name, '#' + c, 2000);
      this.audio.way();
    }

    // boss tetikleme
    if (!this.bossActive && this.dist >= this.nextBossAt) this.startBoss();

    this.world.update(dt, this.speed, this.dist);
    this.player.update(dt, this.speed);
    this.bullets.update(dt);

    if (this.bossActive && this.boss && this.boss.update(dt, this.speed, this.player.x)) {
      const p = this.boss.mesh.position;
      this.orbs.spawn(p.x, p.y - 0.8, p.z + 1.5, this.speed);
      this.audio.orb();
    }
    this.orbs.update(dt, this.player.x, this.speed);
    this.spawner.update(dt);
    this.effects.update(dt);
    this.audio.update(this.speed);
    this.ui.updateHUD(this);
    this.collisions();

    // ilk kapı ipucu
    if (!this._gateHintShown) {
      const gate = this.spawner.obstacles.find(o => o.kind === 'gate');
      if (gate && gate.mesh.position.z > -14 && gate.mesh.position.z < -5) {
        this._gateHintShown = true;
        this.ui.toast('↓ KAY! ↓', '#ff2bd6', 2000);
      }
    }

    // kilometre taşları
    if (this.dist >= this.milestone) {
      this.ui.toast(this.milestone + ' m!', '#00e5ff', 1300);
      this.milestone += 500;
    }
  }

  updateMenu(dt) {
    this.world.update(dt, 6, this.time * 6);
    this.effects.update(dt);
    // oyuncu vitrinde süzülür
    const p = this.player;
    p.group.visible = true;
    p.group.position.x = Math.sin(this.time * 0.7) * 1.2;
    p.group.position.y = 1.1 + Math.sin(this.time * 2.1) * 0.16;
    p.group.rotation.z = Math.sin(this.time * 0.7) * -0.12;
    p.group.rotation.y = Math.sin(this.time * 0.5) * 0.2;
    this.camera.position.x = Math.sin(this.time * 0.23) * 1.6;
  }

  updateDead(dt) {
    this.world.update(dt, 4, this.time * 4);
    this.effects.update(dt);
    this.bullets.update(dt);
    if (this.boss) this.boss.update(dt, 4, 0);
    this._lastCamX = 0;
  }

  _camera(dt) {
    const shake = this.effects.shakeT;
    const px = this.state === 'playing' ? this.player.x : 0;
    const tx = px * 0.28 + (Math.random() - 0.5) * shake * 0.7;
    const ty = 5.4 + (Math.random() - 0.5) * shake * 0.7;
    this.camera.position.x += (tx - this.camera.position.x) * Math.min(1, dt * 6);
    this.camera.position.y += (ty - this.camera.position.y) * Math.min(1, dt * 6);
    const fov = this.state === 'playing' ? Math.min(84, 70 + (this.speed - 14) * 0.45) : 70;
    if (Math.abs(this.camera.fov - fov) > 0.05) {
      this.camera.fov += (fov - this.camera.fov) * Math.min(1, dt * 2);
      this.camera.updateProjectionMatrix();
    }
    this.camera.lookAt(px * 0.35, 1.9 + (Math.random() - 0.5) * shake * 0.5, -28);
  }

  // ---- çarpışmalar ----
  collisions() {
    const p = this.player;
    const pbox = p.box();
    const S = this.spawner;

    // engeller
    for (let i = S.obstacles.length - 1; i >= 0; i--) {
      const o = S.obstacles[i];
      const mpos = o.mesh.position;
      if (mpos.z > 2 || mpos.z < -3) continue;
      let box;
      if (o.kind === 'block') box = { x: mpos.x, y: 1.35, z: mpos.z, hx: 1.05, hy: 1.35, hz: 0.4 };
      else if (o.kind === 'barrier') box = { x: mpos.x, y: 0.45, z: mpos.z, hx: 4.5, hy: 0.45, hz: 0.21 };
      else box = { x: mpos.x, y: 2.35, z: mpos.z, hx: 4.5, hy: 1.0, hz: 0.25 }; // gate: alt boşluğu > kayan geminin tepesi
      if (isHit(pbox, box)) {
        S._hide(o.mesh); S.obstacles.splice(i, 1);
        p.hurt(this.effects);
        this.effects.burst(mpos.x, mpos.y, mpos.z, 0xff2bd6, 20, 5, 0.8, 0.6);
        if (this.state !== 'playing') return;
      }
    }

    // coinler
    for (let i = S.coins.length - 1; i >= 0; i--) {
      const c = S.coins[i];
      const mp = c.mesh.position;
      if (mp.z > 2 || mp.z < -3) continue;
      if (isHit(pbox, { x: mp.x, y: mp.y, z: mp.z, hx: 0.55, hy: 0.6, hz: 0.7 })) {
        S._hide(c.mesh); S.coins.splice(i, 1);
        this.coins++;
        this.addScore(CONFIG.coinScore);
        this.audio.coin();
        this.effects.burst(mp.x, mp.y, mp.z, 0xffd166, 8, 3.5, 0.3, 0.4);
      }
    }

    // power-up
    for (let i = S.pups.length - 1; i >= 0; i--) {
      const u = S.pups[i];
      const mp = u.mesh.position;
      if (mp.z > 2.5 || mp.z < -3) continue;
      if (isHit(pbox, { x: mp.x, y: mp.y, z: mp.z, hx: 0.9, hy: 0.9, hz: 0.9 })) {
        const col = u.mesh.userData.color || 0xffd60a;
        S._hide(u.mesh); S.pups.splice(i, 1);
        this.applyPup(u.kind);
        this.effects.burst(mp.x, mp.y, mp.z, col, 22, 5, 0.7, 0.7);
        this.ui.toast(POWER_NAMES[u.kind] || '', '#' + (col >>> 0).toString(16).padStart(6, '0'), 1300);
      }
    }

    // droneler (oyuncuya çarpan) + mermi isabetleri
    for (let i = S.drones.length - 1; i >= 0; i--) {
      const d = S.drones[i];
      const mp = d.mesh.position;
      if (mp.z > 2.5 || mp.z < -110) continue;
      if (isHit(pbox, d.box())) {
        S._hide(d.mesh); S.drones.splice(i, 1);
        this.effects.burst(mp.x, mp.y, mp.z, 0xff2bd6, 24, 6, 0.9, 0.7);
        p.hurt(this.effects);
        if (this.state !== 'playing') return;
        continue;
      }
      // mermiler
      for (let j = this.bullets.live.length - 1; j >= 0; j--) {
        const b = this.bullets.live[j];
        const bp = b.m.position;
        if (Math.abs(bp.z - mp.z) < 1.4 && Math.abs(bp.x - mp.x) < 1.0 && Math.abs(bp.y - mp.y) < 1.0) {
          this.effects.burst(mp.x, mp.y, mp.z, 0xff2bd6, 20, 5.5, 0.7, 0.6);
          S._hide(d.mesh); S.drones.splice(i, 1);
          b.m.visible = false; this.bullets.live.splice(j, 1);
          this.kills++;
          this.addScore(CONFIG.droneScore);
          this.audio.laserHit();
          break;
        }
      }
    }

    // mermiler vs boss + küreler
    for (let j = this.bullets.live.length - 1; j >= 0; j--) {
      const b = this.bullets.live[j];
      const bp = b.m.position;
      let consumed = false;

      // küreler
      for (let k = this.orbs.live.length - 1; k >= 0; k--) {
        const o = this.orbs.live[k];
        const op = o.m.position;
        if (Math.abs(bp.z - op.z) < 1.3 && Math.abs(bp.x - op.x) < 0.9 && Math.abs(bp.y - op.y) < 0.9) {
          this.effects.burst(op.x, op.y, op.z, 0xff8a3d, 14, 4.5, 0.5, 0.5);
          this.orbs.destroy(o);
          this.addScore(CONFIG.orbScore);
          this.audio.laserHit();
          consumed = true;
          break;
        }
      }
      // boss
      if (!consumed && this.boss && this.state === 'playing') {
        const bpos = this.boss.mesh.position;
        if (Math.abs(bp.z - bpos.z) < 2.6 && Math.abs(bp.x - bpos.x) < 2.7 && Math.abs(bp.y - bpos.y) < 2.3) {
          this.effects.burst(bp.x, bp.y, bp.z, 0xffd60a, 10, 4, 0.5, 0.4);
          if (this.boss.hit()) this.killBoss();
          else this.audio.laserHit();
          this.addScore(40);
          consumed = true;
        }
      }
      if (consumed) { b.m.visible = false; this.bullets.live.splice(j, 1); }
    }

    // küreler vs oyuncu
    for (let k = this.orbs.live.length - 1; k >= 0; k--) {
      const o = this.orbs.live[k];
      const op = o.m.position;
      if (op.z > 2 || op.z < -2) continue;
      if (isHit(pbox, { x: op.x, y: op.y, z: op.z, hx: 0.55, hy: 0.55, hz: 0.55 })) {
        this.effects.burst(op.x, op.y, op.z, 0xff8a3d, 18, 5, 0.6, 0.6);
        this.orbs.destroy(o);
        p.hurt(this.effects);
        if (this.state !== 'playing') return;
      }
    }
  }
}

const POWER_NAMES = {
  shield: 'KALKAN!', magnet: 'MIKNATIS!', boost: 'TURBO!', double: 'ÇİFT PUAN!',
};

const game = new Game();
// debug/test için
window.__ZS = game;

// HMR sırasında çift oyun örneği oluşmasın — tam yenile
if (import.meta.hot) {
  import.meta.hot.accept(() => { window.location.reload(); });
}
