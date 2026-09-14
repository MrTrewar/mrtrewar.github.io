export class SkateAudio {
  constructor() { this.enabled = false; this.context = null; this.layers = null; }
  async enable(value) {
    this.enabled = Boolean(value);
    if (!value) { this.silence(); return; }
    try {
      if (!this.context) {
        this.context = new (window.AudioContext || window.webkitAudioContext)();
        const c = this.context;
        this.noise = c.createBuffer(1, c.sampleRate * 2, c.sampleRate);
        const data = this.noise.getChannelData(0);
        for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
        this.layers = {};
        for (const [name, frequency, type] of [['wind', 450, 'lowpass'], ['wood', 750, 'bandpass'], ['rail', 2100, 'highpass']]) {
          const source = c.createBufferSource(), filter = c.createBiquadFilter(), gain = c.createGain();
          source.buffer = this.noise; source.loop = true;
          filter.type = type; filter.frequency.value = frequency; filter.Q.value = .6;
          gain.gain.value = 0;
          source.connect(filter); filter.connect(gain); gain.connect(c.destination); source.start();
          this.layers[name] = { source, filter, gain };
        }
      }
      await this.context.resume();
    } catch { this.enabled = false; this.silence(); }
  }
  silence() {
    if (!this.layers) return;
    for (const layer of Object.values(this.layers)) layer.gain.gain.setTargetAtTime(0, this.context.currentTime, .025);
  }
  update(run, playing) {
    if (!this.layers) return;
    if (!this.enabled || !playing) { this.silence(); return; }
    const t = this.context.currentTime, speed = run.speed / 25;
    this.layers.wind.gain.gain.setTargetAtTime(.018 + speed * speed * .09, t, .1);
    this.layers.wind.filter.frequency.setTargetAtTime(220 + speed * 900, t, .1);
    const rumble = .6 + .4 * Math.abs(Math.sin(run.distance * Math.PI / 1.15));
    this.layers.wood.gain.gain.setTargetAtTime(run.support && !run.rail ? .055 * speed * rumble : 0, t, .025);
    this.layers.rail.gain.gain.setTargetAtTime(run.rail ? .045 + Math.abs(run.balance) * .05 : 0, t, .035);
    this.layers.rail.filter.frequency.setTargetAtTime(1400 + speed * 1600, t, .06);
  }
  hit(kind) {
    if (!this.enabled || this.context?.state !== 'running') return;
    const c = this.context, now = c.currentTime, length = kind === 'crash' ? .55 : kind === 'aftershock' ? .2 : .13;
    const noise = c.createBufferSource(), filter = c.createBiquadFilter(), gain = c.createGain();
    noise.buffer = this.noise;
    filter.type = 'bandpass'; filter.frequency.value = kind === 'grind' ? 2400 : kind === 'crash' ? 340 : kind === 'aftershock' ? 250 : 650;
    gain.gain.setValueAtTime(kind === 'crash' ? .2 : kind === 'aftershock' ? .075 : .12, now);
    gain.gain.exponentialRampToValueAtTime(.001, now + length);
    noise.connect(filter); filter.connect(gain); gain.connect(c.destination);
    noise.onended = () => { noise.disconnect(); filter.disconnect(); gain.disconnect(); };
    noise.start(); noise.stop(now + length);
    if (kind === 'land') this.tone(85, .12, .065);
    if (kind === 'crash') this.tone(65, .35, .08);
    if (kind === 'aftershock') this.tone(95, .16, .025);
    if (kind === 'perfect' || kind === 'bank') { this.tone(660, .12, .035); this.tone(990, .18, .02); }
  }
  tone(frequency, duration, volume) {
    const c = this.context, osc = c.createOscillator(), gain = c.createGain(), t = c.currentTime;
    osc.frequency.setValueAtTime(frequency, t); osc.frequency.exponentialRampToValueAtTime(frequency * .7, t + duration);
    gain.gain.setValueAtTime(volume, t); gain.gain.exponentialRampToValueAtTime(.001, t + duration);
    osc.connect(gain); gain.connect(c.destination);
    osc.onended = () => { osc.disconnect(); gain.disconnect(); };
    osc.start(); osc.stop(t + duration);
  }
}
