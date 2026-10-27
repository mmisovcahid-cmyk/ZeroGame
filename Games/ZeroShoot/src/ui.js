import { Storage } from './storage.js';
import { submitScore, fetchTopScores } from './api.js';
import { CONFIG } from './config.js';

const $ = (id) => document.getElementById(id);

export class UI {
  constructor(game) {
    this.game = game;
    this.el = {
      hud: $('hud'), menu: $('menu'), pause: $('pause'), gameover: $('gameover'),
      settings: $('settings'), scores: $('scores'), toast: $('toast'), vignette: $('vignette'),
      score: $('score'), dist: $('dist'), speed: $('speed'), coins: $('coins'), hearts: $('hearts'),
      powerRow: $('powerRow'), bossBar: $('bossBar'), bossBarFill: $('bossBarFill'), hint: $('hint'),
      goStats: $('goStats'), nameRow: $('nameRow'), nameInput: $('nameInput'),
      saveStatus: $('saveStatus'), globalTable: $('globalTable'),
      scoreTable: $('scoreTable'),
      setSound: $('setSound'), setSens: $('setSens'),
    };
    this.toastTimer = null;
    this._bindButtons(game);
    this.lastHud = 0;
  }

  _bindButtons(g) {
    $('btnPlay').onclick = () => g.start();
    $('btnScores').onclick = () => { this.renderScores(); this.show('scores'); };
    $('btnScoresBack').onclick = () => { if (this._from === 'gameover') this.show('gameover'); else this.show('menu'); };
    $('btnSettings').onclick = () => { this._from = 'menu'; this.syncSettings(); this.show('settings'); };
    $('btnSettingsBack').onclick = () => this.show('menu');
    $('btnPause').onclick = () => g.pause();
    $('btnResume').onclick = () => g.resume();
    $('btnRestart').onclick = () => g.start();
    $('btnRestart2').onclick = () => g.start();
    $('btnMenu').onclick = () => g.toMenu();
    $('btnMenu2').onclick = () => g.toMenu();
    $('btnSaveScore').onclick = () => this.saveScore(g);
    this.el.nameInput.onkeydown = (e) => { if (e.key === 'Enter') $('btnSaveScore').click(); };
    document.querySelectorAll('.qbtn').forEach(b => {
      b.onclick = () => { g.applyQuality(b.dataset.q); this.syncSettings(); };
    });
    this.el.setSound.oninput = (e) => g.setSound(+e.target.value);
    this.el.setSens.oninput = (e) => g.setSens(+e.target.value);
  }

  syncSettings() {
    const s = this.game.settings;
    this.el.setSound.value = s.sound;
    this.el.setSens.value = s.sens;
    document.querySelectorAll('.qbtn').forEach(b => b.classList.toggle('selected', b.dataset.q === s.quality));
  }

  show(name) {
    for (const k of ['menu', 'pause', 'gameover', 'settings', 'scores', 'hud']) {
      this.el[k].classList.toggle('hidden', k !== name);
    }
  }

  hideAll() {
    for (const k of ['menu', 'pause', 'gameover', 'settings', 'scores', 'hud']) this.el[k].classList.add('hidden');
  }

  startHud() {
    const touch = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;
    this.el.hint.innerHTML = touch
      ? '<b>⬅➡</b> kaydır: şerit &nbsp;•&nbsp; <b>⬆</b> zıpla &nbsp;•&nbsp; <b>⬇</b> kay &nbsp;•&nbsp; <b>tap</b> ateş'
      : '← → şerit &nbsp;•&nbsp; ↑/Boşluk zıpla &nbsp;•&nbsp;↓ kay &nbsp;•&nbsp; Tık/F ateş';
    this.el.hint.classList.remove('hidden');
    clearTimeout(this._hintT);
    this._hintT = setTimeout(() => this.el.hint.classList.add('hidden'), 5000);
  }

  updateHUD(g) {
    // 60 fps'te her kare DOM yazmak yerine güncelleme kırpma
    this.el.score.textContent = Math.floor(g.score).toLocaleString('tr-TR');
    this.el.dist.textContent = Math.floor(g.dist) + ' m';
    if (this._lastSpeed == null || Math.abs(g.speed - this._lastSpeed) > 0.6) {
      this._lastSpeed = g.speed;
      this.el.speed.textContent = Math.round(g.speed * 3.6) + ' km/s';
    }
    if (g.coins !== this._lastCoins) {
      this._lastCoins = g.coins;
      this.el.coins.textContent = '◉ ' + g.coins;
    }
    if (g.player.hearts !== this._lastHearts || g.player.shield !== this._lastShield) {
      this._lastHearts = g.player.hearts;
      this._lastShield = g.player.shield;
      const h = '♥'.repeat(Math.max(0, g.player.hearts)) + '♡'.repeat(Math.max(0, CONFIG.hearts - Math.max(0, g.player.hearts)));
      this.el.hearts.textContent = h;
      const p = g.player;
      this.el.powerRow.innerHTML =
        `<div class="pdot ${p.shield > 0 ? 'shield' : ''}"></div>` +
        `<div class="pdot ${p.magnet > 0 ? 'magnet' : ''}"></div>` +
        `<div class="pdot ${p.boost > 0 ? 'boost' : ''}"></div>` +
        `<div class="pdot ${p.double > 0 ? 'double' : ''}"></div>`;
    }
    if (g.boss && !g.bossDead) {
      this.el.bossBar.classList.remove('hidden');
      this.el.bossBarFill.style.width = Math.max(0, (g.boss.hp / g.boss.maxHp) * 100) + '%';
    } else {
      this.el.bossBar.classList.add('hidden');
    }
  }

  toast(msg, color = '#ffd60a', dur = 1700) {
    const t = this.el.toast;
    t.textContent = msg;
    t.style.color = color;
    t.style.textShadow = `0 0 22px ${color}`;
    t.classList.add('show');
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => t.classList.remove('show'), dur);
  }

  flash(kind = '') {
    const v = this.el.vignette;
    v.className = kind;
    v.classList.add('flash');
    setTimeout(() => { v.classList.remove('flash'); v.classList.add('fade'); setTimeout(() => v.className = '', 600); }, 70);
  }

  showGameOver(stats, isHigh) {
    this.el.goStats.innerHTML =
      `<div>PUAN: <b>${stats.score.toLocaleString('tr-TR')}</b></div>` +
      `<div>MESAFE: <b>${stats.dist} m</b></div>` +
      `<div>COIN: <b>${stats.coins}</b> &nbsp; DRONE: <b>${stats.kills}</b></div>` +
      (isHigh ? `<div class="hs">★ YENİ REKOR ★</div>` : '');
    this.el.nameRow.classList.toggle('hidden', !isHigh);
    this.el.saveStatus.classList.add('hidden');
    if (isHigh) {
      try { this.el.nameInput.value = localStorage.getItem('zs_name') || ''; } catch { this.el.nameInput.value = ''; }
      if (!this.el.nameInput.value) setTimeout(() => this.el.nameInput.focus(), 60);
    }
    this.show('gameover');
  }

  /** Yerel + global kayıt akışı; buton Enter ile de tetiklenebilir. */
  async saveScore(g) {
    const name = (this.el.nameInput.value.trim() || 'Pilot').slice(0, 12);
    try { localStorage.setItem('zs_name', name); } catch {}
    const score = Math.floor(g.score);
    const dist = Math.floor(g.dist);
    const list = Storage.saveScore({ name, score, dist });
    this.el.nameRow.classList.add('hidden');
    this.el.saveStatus.classList.remove('hidden');
    this.el.saveStatus.textContent = 'Gönderiliyor…';
    g.lastSaved = true;

    let rank = null;
    try {
      const res = await submitScore({ player: name, score, dist });
      rank = res.rank ?? null;
      this.el.saveStatus.textContent = rank && rank <= 10
        ? `🌍 Genel sıralaman: #${rank}`
        : '🌎 Global kaydedildi — genel top 10 dışında';
      if (rank && rank <= 10) this.toast(`🌍 GENEL TOP 10! #${rank}`, '#00e5ff', 2400);
    } catch {
      // Backend kapalı / çevrimdışı: skor zaten yerel olarak güvende
      this.el.saveStatus.textContent = '📡 Çevrimdışı — skor cihazına kaydedildi';
    }
    this._from = 'gameover';
    this.renderScores(list, { player: name, score, rank });
    this.show('scores');
  }

  async renderScores(list = null, ctx = null) {
    const rows = list || Storage.loadScores();
    this.el.scoreTable.innerHTML = rows.length
      ? rows.map((s, i) => this._scoreRow(i, s.name, s.score, s.date, ctx)).join('')
      : '<div class="scoreRow"><span class="nm">Henüz skor yok — ilk sen ol!</span></div>';

    const g = this.el.globalTable;
    g.innerHTML = '<div class="scoreRow loading"><span class="nm">Yükleniyor…</span></div>';
    try {
      const top = await fetchTopScores(10);
      g.innerHTML = top.length
        ? top.map((s, i) => this._scoreRow(i, s.player, s.score, (s.createdAt || '').slice(0, 10), ctx, s.dist)).join('')
        : '<div class="scoreRow"><span class="nm">Henüz kimse kayıt yapmamış — ilk sen ol!</span></div>';
    } catch {
      g.innerHTML = '<div class="scoreRow"><span class="nm">📡 Global skorlar alınamadı (çevrimdışı olabilir)</span></div>';
    }
  }

  _scoreRow(i, name, score, date, ctx, dist) {
    const isMe = ctx && ctx.player === name && ctx.score === score;
    const rankTag = isMe && ctx.rank ? ` <span class="flag">#${ctx.rank}</span>` : '';
    return `<div class="scoreRow${isMe ? ' me' : ''}"><span class="rank">${i + 1}.</span>` +
      `<span class="nm">${esc(name)}${rankTag}</span>` +
      `<span class="dt">${date || ''}${Number.isFinite(dist) ? ' • ' + dist.toLocaleString('tr-TR') + ' m' : ''}</span>` +
      `<span class="sc">${Number(score).toLocaleString('tr-TR')}</span></div>`;
  }
}

function esc(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
