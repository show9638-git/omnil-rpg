/* 全零〈オムニル〉 v0.2 — 外部音源なしで動くチップ・アンビエント音響 */
window.OMNIL_AUDIO = (() => {
  'use strict';

  let ctx = null;
  let master = null;
  let musicGain = null;
  let sfxGain = null;
  let scheduler = null;
  let step = 0;
  let theme = 'title';
  let started = false;
  let settings = { music: true, sfx: true, volume: 0.52 };

  const NOTE = {
    A2:110.00, Bb2:116.54, G2:98.00, C3:130.81, D3:146.83, E3:164.81, F3:174.61, G3:196.00, A3:220.00, B3:246.94,
    C4:261.63, D4:293.66, E4:329.63, F4:349.23, G4:392.00, A4:440.00, B4:493.88,
    C5:523.25, D5:587.33, E5:659.25, F5:698.46, G5:783.99, A5:880.00,
    REST: 0,
  };

  const THEMES = {
    title: {
      stepMs: 320, wave: 'triangle', root: 'D3',
      melody: ['D4','A4','F4','A4','E4','A4','G4','A4','D5','A4','F4','E4','D4','REST','A3','REST'],
      bass:   ['D3','REST','D3','REST','F3','REST','C3','REST','D3','REST','A3','REST','G3','REST','A3','REST'],
      pad:    ['D4','F4','A4','D5'],
    },
    world: {
      stepMs: 270, wave: 'triangle', root: 'G3',
      melody: ['G4','B4','D5','B4','A4','G4','A4','B4','D5','E5','D5','B4','A4','G4','REST','D4'],
      bass:   ['G3','REST','D3','REST','E3','REST','C3','REST','G3','REST','D3','REST','E3','REST','D3','REST'],
      pad:    ['G4','B4','D5','G5'],
    },
    town: {
      stepMs: 300, wave: 'sine', root: 'C3',
      melody: ['E4','G4','A4','G4','E4','D4','E4','G4','A4','C5','A4','G4','E4','D4','C4','REST'],
      bass:   ['C3','REST','G3','REST','A3','REST','F3','REST','C3','REST','G3','REST','F3','REST','G3','REST'],
      pad:    ['C4','E4','G4','C5'],
    },
    plain: {
      stepMs: 255, wave: 'triangle', root: 'A3',
      melody: ['A4','C5','E5','C5','B4','A4','G4','A4','C5','E5','D5','C5','B4','A4','REST','E4'],
      bass:   ['A3','REST','E3','REST','F3','REST','D3','REST','A3','REST','E3','REST','F3','REST','E3','REST'],
      pad:    ['A4','C5','E5','A5'],
    },
    forest: {
      stepMs: 335, wave: 'sine', root: 'E3',
      melody: ['E4','G4','B4','REST','A4','G4','E4','REST','D4','E4','G4','A4','B4','G4','E4','REST'],
      bass:   ['E3','REST','B3','REST','D3','REST','A3','REST','E3','REST','B3','REST','C3','REST','B3','REST'],
      pad:    ['E4','G4','B4','D5'],
    },
    ruins: {
      stepMs: 390, wave: 'sine', root: 'D3',
      melody: ['D4','REST','A4','REST','C5','REST','F4','REST','D4','REST','G4','REST','E4','REST','C4','REST'],
      bass:   ['D3','REST','D3','REST','C3','REST','A3','REST','D3','REST','D3','REST','Bb2','REST','A2','REST'],
      pad:    ['D4','F4','A4','C5'],
    },
    battle: {
      stepMs: 180, wave: 'square', root: 'D3',
      melody: ['D4','D4','F4','A4','D5','A4','F4','D4','E4','E4','G4','B4','E5','B4','G4','E4'],
      bass:   ['D3','D3','D3','D3','F3','F3','A3','A3','E3','E3','E3','E3','G3','G3','B3','B3'],
      pad:    ['D4','F4','A4','C5'],
    },
    boss: {
      stepMs: 155, wave: 'sawtooth', root: 'D3',
      melody: ['D4','F4','A4','D5','C5','A4','F4','D4','Eb4','G4','Bb4','D5','C5','Bb4','G4','Eb4'],
      bass: ['D3','D3','A2','A2','C3','C3','G2','G2','Eb3','Eb3','Bb2','Bb2','D3','D3','A2','A2'],
      pad: ['D4','F4','A4','C5'],
    },
    frost: {
      stepMs: 360, wave: 'sine', root: 'F3',
      melody: ['F4','A4','C5','A4','G4','F4','E4','REST','F4','C5','D5','C5','A4','G4','F4','REST'],
      bass: ['F3','REST','C3','REST','D3','REST','Bb2','REST','F3','REST','C3','REST','D3','REST','C3','REST'],
      pad: ['F4','A4','C5','F5'],
    },
    cave: {
      stepMs: 405, wave: 'sine', root: 'C3',
      melody: ['C4','REST','G4','REST','Eb4','REST','Bb4','REST','C5','REST','G4','REST','Eb4','REST','D4','REST'],
      bass: ['C3','REST','G2','REST','Bb2','REST','F2','REST','C3','REST','G2','REST','Bb2','REST','G2','REST'],
      pad: ['C4','Eb4','G4','Bb4'],
    },
    marsh: {
      stepMs: 350, wave: 'sine', root: 'A2',
      melody: ['A3','C4','E4','REST','D4','C4','A3','REST','G3','A3','C4','D4','E4','C4','A3','REST'],
      bass: ['A2','REST','E3','REST','F3','REST','D3','REST','A2','REST','E3','REST','G2','REST','E3','REST'],
      pad: ['A3','C4','E4','G4'],
    },
    coast: {
      stepMs: 285, wave: 'triangle', root: 'E3',
      melody: ['E4','G4','B4','E5','B4','G4','F4','E4','D4','F4','A4','D5','A4','F4','E4','REST'],
      bass: ['E3','REST','B3','REST','C3','REST','A2','REST','D3','REST','A3','REST','B2','REST','E3','REST'],
      pad: ['E4','G4','B4','E5'],
    },
    dusk: {
      stepMs: 375, wave: 'triangle', root: 'D3',
      melody: ['D4','F4','A4','C5','A4','F4','Eb4','D4','C4','Eb4','G4','Bb4','G4','Eb4','D4','REST'],
      bass: ['D3','REST','A2','REST','Bb2','REST','F2','REST','C3','REST','G2','REST','A2','REST','D3','REST'],
      pad: ['D4','F4','A4','C5'],
    },
  };

  function init() {
    if (ctx) return true;
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return false;
    ctx = new AudioContext();
    master = ctx.createGain(); master.gain.value = 0.65;
    musicGain = ctx.createGain(); musicGain.gain.value = 0.0001;
    sfxGain = ctx.createGain(); sfxGain.gain.value = 0.0001;
    musicGain.connect(master); sfxGain.connect(master); master.connect(ctx.destination);
    return true;
  }

  function resume() {
    if (!init()) return false;
    if (ctx.state === 'suspended') ctx.resume();
    started = true;
    applyGains();
    if (settings.music && !scheduler) startLoop();
    return true;
  }

  function applyGains() {
    if (!ctx) return;
    const now = ctx.currentTime;
    const vol = Math.max(0, Math.min(1, Number(settings.volume ?? 0.52)));
    musicGain.gain.cancelScheduledValues(now);
    sfxGain.gain.cancelScheduledValues(now);
    musicGain.gain.linearRampToValueAtTime(settings.music ? 0.095 * vol : 0.0001, now + 0.12);
    sfxGain.gain.linearRampToValueAtTime(settings.sfx ? 0.15 * vol : 0.0001, now + 0.06);
  }

  function tone(freq, duration, when, options = {}) {
    if (!ctx || !freq || freq <= 0) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = options.wave || 'triangle';
    osc.frequency.setValueAtTime(freq, when);
    if (options.detune) osc.detune.setValueAtTime(options.detune, when);
    const peak = options.volume ?? 0.08;
    gain.gain.setValueAtTime(0.0001, when);
    gain.gain.exponentialRampToValueAtTime(peak, when + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, when + Math.max(0.06, duration));
    osc.connect(gain); gain.connect(options.destination || musicGain);
    osc.start(when); osc.stop(when + duration + 0.04);
  }

  function playStep() {
    if (!ctx || !settings.music || !started) return;
    const data = THEMES[theme] || THEMES.title;
    const now = ctx.currentTime + 0.01;
    const idx = step % 16;
    const dur = data.stepMs / 1000 * 0.88;
    const melody = NOTE[data.melody[idx]] || 0;
    const bass = NOTE[data.bass[idx]] || 0;
    tone(melody, dur, now, { wave: data.wave, volume: 0.062 });
    tone(bass, dur * 0.88, now, { wave: 'sine', volume: 0.045, detune: -6 });
    if (idx === 0) {
      data.pad.forEach((name, i) => tone(NOTE[name], data.stepMs / 1000 * 4.6, now + i * 0.018, { wave: 'sine', volume: 0.011, detune: i % 2 ? 4 : -4 }));
    }
    // 小さな環境音：街は鈴、草原は風、森と遺構は低い残響。
    if (theme === 'town' && [3, 11].includes(idx)) tone(NOTE[idx === 3 ? 'E5' : 'G5'], .16, now, { wave: 'sine', volume: .025 });
    if (theme === 'plain' && [6, 14].includes(idx)) tone(NOTE[idx === 6 ? 'A5' : 'E5'], .10, now, { wave: 'triangle', volume: .018 });
    if (theme === 'forest' && idx === 9) tone(NOTE.D5, .22, now, { wave: 'sine', volume: .018, detune: 14 });
    if (theme === 'ruins' && idx === 12) tone(NOTE.A3, .42, now, { wave: 'sine', volume: .020, detune: -22 });
    step += 1;
  }

  function startLoop() {
    if (!ctx || scheduler) return;
    step = 0;
    playStep();
    const ms = (THEMES[theme] || THEMES.title).stepMs;
    scheduler = window.setInterval(playStep, ms);
  }

  function stopLoop() {
    if (scheduler) window.clearInterval(scheduler);
    scheduler = null;
  }

  function setTheme(nextTheme) {
    const normalized = THEMES[nextTheme] ? nextTheme : 'title';
    if (normalized === theme && scheduler) return;
    theme = normalized;
    if (!started || !settings.music) return;
    stopLoop(); startLoop();
  }

  function configure(nextSettings = {}) {
    settings = { ...settings, ...nextSettings };
    if (!settings.music) stopLoop();
    applyGains();
    if (started && settings.music && !scheduler) startLoop();
  }

  function sfx(kind = 'tap') {
    if (!settings.sfx || !resume()) return;
    const now = ctx.currentTime + 0.01;
    if (kind === 'hit') {
      tone(NOTE.C3, .09, now, { destination: sfxGain, wave: 'square', volume: .12 });
      tone(NOTE.G2, .13, now + .02, { destination: sfxGain, wave: 'sawtooth', volume: .07 });
    } else if (kind === 'heal') {
      tone(NOTE.C5, .18, now, { destination: sfxGain, wave: 'sine', volume: .06 });
      tone(NOTE.E5, .21, now + .08, { destination: sfxGain, wave: 'sine', volume: .055 });
      tone(NOTE.G5, .25, now + .16, { destination: sfxGain, wave: 'sine', volume: .05 });
    } else if (kind === 'victory') {
      ['C4','E4','G4','C5'].forEach((n, i) => tone(NOTE[n], .32, now + i*.12, { destination: sfxGain, wave: 'triangle', volume: .075 }));
    } else if (kind === 'unlock') {
      ['A4','C5','E5'].forEach((n, i) => tone(NOTE[n], .20, now + i*.08, { destination: sfxGain, wave: 'triangle', volume: .06 }));
    } else {
      tone(NOTE.E5, .07, now, { destination: sfxGain, wave: 'square', volume: .04 });
    }
  }

  function stopAll() { stopLoop(); if (ctx) ctx.suspend(); started = false; }

  return { resume, configure, setTheme, sfx, stopAll };
})();
