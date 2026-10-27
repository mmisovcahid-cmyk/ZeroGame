const SKEY = 'zs_scores_v1';
const CKEY = 'zs_settings_v1';

const DEFAULTS = { sound: 70, sens: 100, quality: 'med' };

export const Storage = {
  loadScores() {
    try { return JSON.parse(localStorage.getItem(SKEY)) || []; } catch { return []; }
  },
  saveScore(entry) {
    const list = this.loadScores();
    entry.date = new Date().toISOString().slice(0, 10);
    list.push(entry);
    list.sort((a, b) => b.score - a.score);
    const cut = list.slice(0, 8);
    try { localStorage.setItem(SKEY, JSON.stringify(cut)); } catch {}
    return cut;
  },
  loadSettings() {
    try { return { ...DEFAULTS, ...(JSON.parse(localStorage.getItem(CKEY)) || {}) }; } catch { return { ...DEFAULTS }; }
  },
  saveSettings(s) {
    try { localStorage.setItem(CKEY, JSON.stringify(s)); } catch {}
  },
};
