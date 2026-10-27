import * as THREE from 'three';

// Parçacık havuzu: tek Points objesi, GPU dostu.
export class Effects {
  constructor(scene, quality) {
    this.max = quality === 'low' ? 420 : quality === 'med' ? 900 : 1700;
    this.head = 0;
    this.pos = new Float32Array(this.max * 3);
    this.colA = new Float32Array(this.max * 3); // canlı renk (yazılan)
    this.vel = new Float32Array(this.max * 3);
    this.life = new Float32Array(this.max);
    this.maxLife = new Float32Array(this.max);
    this.base = new Float32Array(this.max * 3);

    for (let i = 0; i < this.max; i++) { this.pos[i * 3 + 1] = -9999; }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(this.colA, 3));
    const mat = new THREE.PointsMaterial({ size: 0.42, vertexColors: true, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false });
    this.points = new THREE.Points(geo, mat);
    this.points.frustumCulled = false;
    this.baseGeo = geo;
    this.colorAttr = geo.getAttribute('color');
    this.posAttr = geo.getAttribute('position');
    scene.add(this.points);

    this.shakeAmt = 0;
    this.shakeT = 0;
  }

  burst(x, y, z, color, count, speed = 6, spread = 1, life = 0.7) {
    const c = new THREE.Color(color);
    for (let n = 0; n < count; n++) {
      const i = this.head; this.head = (this.head + 1) % this.max;
      const a = Math.random() * Math.PI * 2;
      const b = Math.random() * Math.PI - Math.PI / 2;
      const s = speed * (0.35 + Math.random() * 0.9);
      this.pos[i * 3] = x + (Math.random() - 0.5) * spread;
      this.pos[i * 3 + 1] = y + (Math.random() - 0.5) * spread;
      this.pos[i * 3 + 2] = z + (Math.random() - 0.5) * spread;
      this.vel[i * 3] = Math.cos(a) * Math.cos(b) * s;
      this.vel[i * 3 + 1] = Math.sin(b) * s + speed * 0.25;
      this.vel[i * 3 + 2] = Math.sin(a) * Math.cos(b) * s;
      this.base[i * 3] = c.r; this.base[i * 3 + 1] = c.g; this.base[i * 3 + 2] = c.b;
      this.life[i] = life * (0.6 + Math.random() * 0.7);
      this.maxLife[i] = this.life[i];
    }
  }

  trail(x, y, z, color) {
    const c = new THREE.Color(color);
    const i = this.head; this.head = (this.head + 1) % this.max;
    this.pos[i * 3] = x; this.pos[i * 3 + 1] = y; this.pos[i * 3 + 2] = z;
    this.vel[i * 3] = (Math.random() - 0.5) * 1.4;
    this.vel[i * 3 + 1] = Math.random() * 0.8;
    this.vel[i * 3 + 2] = 5 + Math.random() * 3;
    this.base[i * 3] = c.r; this.base[i * 3 + 1] = c.g; this.base[i * 3 + 2] = c.b;
    this.life[i] = 0.32; this.maxLife[i] = 0.32;
  }

  shake(v) {
    this.shakeAmt = Math.max(this.shakeAmt, v);
  }

  update(dt) {
    const n = this.max;
    for (let i = 0; i < n; i++) {
      if (this.life[i] <= 0) continue;
      this.life[i] -= dt;
      if (this.life[i] <= 0) { this.pos[i * 3 + 1] = -9999; this.colA[i * 3] = this.colA[i * 3 + 1] = this.colA[i * 3 + 2] = 0; continue; }
      const f = Math.pow(0.94, dt * 60);
      this.vel[i * 3] *= f; this.vel[i * 3 + 1] *= f; this.vel[i * 3 + 2] *= f;
      this.pos[i * 3] += this.vel[i * 3] * dt;
      this.pos[i * 3 + 1] += this.vel[i * 3 + 1] * dt;
      this.pos[i * 3 + 2] += this.vel[i * 3 + 2] * dt;
      const k = this.life[i] / this.maxLife[i];
      this.colA[i * 3] = this.base[i * 3] * k;
      this.colA[i * 3 + 1] = this.base[i * 3 + 1] * k;
      this.colA[i * 3 + 2] = this.base[i * 3 + 2] * k;
    }
    this.posAttr.needsUpdate = true;
    this.colorAttr.needsUpdate = true;

    if (this.shakeAmt > 0.001) {
      this.shakeAmt *= Math.pow(0.0025, dt);
      this.shakeT = this.shakeAmt;
    } else this.shakeT = 0;
  }
}

// Basit AABB çarpışma testi — a ve b: {x,y,z,hx,hy,hz}
export function isHit(a, b) {
  return Math.abs(a.x - b.x) < a.hx + b.hx &&
         Math.abs(a.y - b.y) < a.hy + b.hy &&
         Math.abs(a.z - b.z) < a.hz + b.hz;
}
