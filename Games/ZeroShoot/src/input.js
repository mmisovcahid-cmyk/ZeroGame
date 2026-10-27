// Giriş yönetimi: klavye + fare + dokunmatik birleşik.
const MAX_LAT = 3.0; // yatay sınır

export class Input {
  constructor(game) {
    this.game = game;
    this.mouseLockT = 0;   // klavye şerit değişiminden sonra fareyi sustur
    this.autoFire = false;
    this.touch = null;     // { x,y,t,hUsed,vUsed,moved }
    this._bind();
  }

  _bind() {
    const canvas = this.game.renderer.domElement;

    // --- Klavye ---
    window.addEventListener('keydown', (e) => {
      if (e.repeat && e.code !== 'KeyF' && e.code !== 'KeyJ') { if(e.code.startsWith('Arrow')||['Space'].includes(e.code)) e.preventDefault(); return; }
      switch (e.code) {
        case 'ArrowLeft': case 'KeyA': this._lane(-1); break;
        case 'ArrowRight': case 'KeyD': this._lane(1); break;
        case 'ArrowUp': case 'KeyW': case 'Space': this._jump(); break;
        case 'ArrowDown': case 'KeyS': case 'ShiftLeft': case 'ShiftRight': this._slide(); break;
        case 'KeyF': case 'KeyJ': this.autoFire = true; break;
        case 'Escape': case 'KeyP': this.game.togglePause(); break;
        case 'Enter': if (this.game.state === 'menu') this.game.start(); break;
      }
      if (e.code.startsWith('Arrow') || e.code === 'Space' || e.code === 'KeyF' || e.code === 'KeyJ') e.preventDefault();
      this.game.audio.unlock();
    });
    window.addEventListener('keyup', (e) => {
      if (e.code === 'KeyF' || e.code === 'KeyJ') this.autoFire = false;
    });

    // --- Fare / Dokunmatik (Pointer) ---
    canvas.addEventListener('pointerdown', (e) => {
      this.game.audio.unlock();
      if (this.game.state !== 'playing') return;
      const pt = e.pointerType || 'mouse';
      if (pt === 'touch') {
        this.touch = { x: e.clientX, y: e.clientY, t: performance.now(), hUsed: false, vUsed: false, moved: 0 };
        this.autoFire = false;
      } else {
        // fare: basılı tut = sürekli ateş; hareket = yönlendirme
        this.autoFire = true;
        this.game.player.shoot();
      }
      canvas.setPointerCapture?.(e.pointerId);
    });

    canvas.addEventListener('pointermove', (e) => {
      const pt = e.pointerType || 'mouse';
      if (pt === 'touch') {
        if (!this.touch || this.game.state !== 'playing') return;
        const dx = e.clientX - this.touch.x;
        const dy = e.clientY - this.touch.y;
        this.touch.moved = Math.max(this.touch.moved, Math.abs(dx) + Math.abs(dy));
        if (!this.touch.hUsed && Math.abs(dx) > 30) {
          this.touch.hUsed = true;
          this._lane(dx > 0 ? 1 : -1);
        } else if (!this.touch.vUsed && Math.abs(dy) > 38) {
          this.touch.vUsed = true;
          if (dy < 0) this._jump(); else this._slide();
        }
      } else {
        if (this.game.state !== 'playing') return;
        if (this.mouseLockT > 0) return;
        const nx = (e.clientX / window.innerWidth) * 2 - 1;
        this.game.player.setMouseX(nx);
      }
    });

    canvas.addEventListener('pointerup', (e) => {
      const pt = e.pointerType || 'mouse';
      if (pt === 'touch') {
        const dt = performance.now() - (this.touch?.t || 0);
        const moved = this.touch?.moved || 0;
        this.touch = null;
        if (this.game.state === 'playing' && dt < 260 && moved < 14) {
          this.game.player.shoot(); // tap = ateş
        }
      } else {
        this.autoFire = false;
      }
    });
    canvas.addEventListener('pointercancel', () => { this.autoFire = false; this.touch = null; });

    // sağ tık menü engelle
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());

    // sekme değişince duraklat
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && this.game.state === 'playing') this.game.pause();
    });
  }

  _lane(dir) {
    if (this.game.state !== 'playing') return;
    this.mouseLockT = 0.45;
    this.game.player.moveLane(dir);
  }
  _jump() {
    if (this.game.state !== 'playing') return;
    this.game.player.jump();
  }
  _slide() {
    if (this.game.state !== 'playing') return;
    this.game.player.slide();
  }

  update(dt) {
    if (this.mouseLockT > 0) this.mouseLockT -= dt;
  }

  get firing() { return this.autoFire; }
}
