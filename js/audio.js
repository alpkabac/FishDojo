/* FishDojo – tiny chiptune sound effects with WebAudio (no files needed). */
(function () {
  const FD = (window.FD = window.FD || {});
  let ac = null;

  function ctx() {
    if (!ac) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ac = new AC();
    }
    if (ac.state === 'suspended') ac.resume();
    return ac;
  }

  function tone(freq, dur, { type = 'square', vol = 0.05, when = 0, slide = null } = {}) {
    if (!FD.Sound.enabled) return;
    const a = ctx();
    if (!a) return;
    const t = a.currentTime + when;
    const o = a.createOscillator(), g = a.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(slide, t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(a.destination);
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  FD.Sound = {
    enabled: true,
    unlock: ctx,
    click: () => tone(880, 0.04, { vol: 0.03 }),
    deed: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.12, { when: i * 0.07, vol: 0.045 })),
    plop: () => tone(700, 0.15, { type: 'sine', vol: 0.09, slide: 180 }),
    chomp: () => {
      tone(260, 0.06, { vol: 0.05, slide: 120 });
      tone(200, 0.07, { vol: 0.045, when: 0.08, slide: 90 });
    },
    level: () => {
      [523, 659, 784, 1047, 784, 1047, 1319].forEach((f, i) => tone(f, i === 6 ? 0.4 : 0.12, { when: i * 0.09, vol: 0.05 }));
      tone(262, 0.7, { type: 'triangle', vol: 0.06 });
    },
    fanfare: () => {
      [392, 392, 523, 659, 784].forEach((f, i) => tone(f, i === 4 ? 0.45 : 0.13, { when: i * 0.12, vol: 0.05 }));
      tone(196, 0.8, { type: 'triangle', vol: 0.06 });
    },
    oops: () => tone(330, 0.2, { vol: 0.04, slide: 165 }),
  };
})();
