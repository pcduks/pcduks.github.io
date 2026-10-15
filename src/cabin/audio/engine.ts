import { asset, cabin } from '../../lib/content'

/**
 * The cabin's sound: a low hum synthesised from filtered noise, a two-tone chime, UI clicks,
 * a looping score, and the captain's announcements. Everything hangs off one AudioContext that is
 * created on a user gesture, and the master gain fades in and out with the sound setting.
 */
class AudioEngine {
  private ctx: AudioContext | null = null
  private master!: GainNode
  private humGain!: GainNode
  private musicGain!: GainNode
  private voiceGain!: GainNode
  private music: HTMLAudioElement | null = null
  private voice: HTMLAudioElement | null = null
  private enabled = false
  private musicWanted = true
  private voiceWanted = true
  private onCaption: (text: string | null) => void = () => {}
  private onSpeaking: (speaking: boolean) => void = () => {}
  private played = new Set<string>()

  bind(handlers: { caption: (t: string | null) => void; speaking: (s: boolean) => void }) {
    this.onCaption = handlers.caption
    this.onSpeaking = handlers.speaking
  }

  /** Must be called from a user gesture the first time. */
  private ensure() {
    if (this.ctx) return this.ctx
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    const ctx = new Ctx()
    this.ctx = ctx
    this.master = ctx.createGain()
    this.master.gain.value = 0
    this.master.connect(ctx.destination)

    // Cabin hum: brown noise through a low-pass, with a faint resonance where engines sit.
    const seconds = 4
    const buffer = ctx.createBuffer(1, ctx.sampleRate * seconds, ctx.sampleRate)
    const data = buffer.getChannelData(0)
    let last = 0
    for (let i = 0; i < data.length; i++) {
      const white = Math.random() * 2 - 1
      last = (last + 0.02 * white) / 1.02
      data[i] = last * 3.5
    }
    const noise = ctx.createBufferSource()
    noise.buffer = buffer
    noise.loop = true
    const lp = ctx.createBiquadFilter()
    lp.type = 'lowpass'
    lp.frequency.value = 220
    lp.Q.value = 0.7
    const peak = ctx.createBiquadFilter()
    peak.type = 'peaking'
    peak.frequency.value = 95
    peak.Q.value = 2
    peak.gain.value = 6
    this.humGain = ctx.createGain()
    this.humGain.gain.value = 0.22
    noise.connect(lp).connect(peak).connect(this.humGain).connect(this.master)
    noise.start()

    this.musicGain = ctx.createGain()
    this.musicGain.gain.value = 0
    this.musicGain.connect(this.master)
    this.voiceGain = ctx.createGain()
    this.voiceGain.gain.value = 1
    this.voiceGain.connect(this.master)

    this.music = new Audio(asset('audio/music.mp3'))
    this.music.loop = true
    this.music.crossOrigin = 'anonymous'
    this.music.preload = 'auto'
    ctx.createMediaElementSource(this.music).connect(this.musicGain)
    return ctx
  }

  setEnabled(on: boolean) {
    this.enabled = on
    if (!on && !this.ctx) return
    const ctx = this.ensure()
    if (ctx.state === 'suspended') void ctx.resume()
    const t = ctx.currentTime
    this.master.gain.cancelScheduledValues(t)
    this.master.gain.setTargetAtTime(on ? 0.9 : 0, t, on ? 0.8 : 0.35)
    if (on) this.startMusic()
    else this.stopVoice()
  }

  setMusic(on: boolean) {
    this.musicWanted = on
    if (!this.ctx) return
    if (on && this.enabled) this.startMusic()
    else this.musicGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.6)
  }

  setVoice(on: boolean) {
    this.voiceWanted = on
    if (!on) this.stopVoice()
  }

  private startMusic() {
    if (!this.ctx || !this.music || !this.musicWanted) return
    void this.music.play().catch(() => {})
    this.musicGain.gain.setTargetAtTime(this.voice ? 0.1 : 0.32, this.ctx.currentTime, 1.2)
  }

  chime() {
    if (!this.enabled || !this.ctx) return
    const ctx = this.ctx
    const notes = [659.25, 523.25]
    notes.forEach((f, i) => {
      const o = ctx.createOscillator()
      const g = ctx.createGain()
      o.type = 'sine'
      o.frequency.value = f
      const t0 = ctx.currentTime + i * 0.42
      g.gain.setValueAtTime(0, t0)
      g.gain.linearRampToValueAtTime(0.18, t0 + 0.02)
      g.gain.exponentialRampToValueAtTime(0.001, t0 + 1.4)
      o.connect(g).connect(this.master)
      o.start(t0)
      o.stop(t0 + 1.5)
    })
  }

  click() {
    if (!this.enabled || !this.ctx) return
    const ctx = this.ctx
    const len = Math.floor(ctx.sampleRate * 0.03)
    const b = ctx.createBuffer(1, len, ctx.sampleRate)
    const d = b.getChannelData(0)
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3)
    const s = ctx.createBufferSource()
    s.buffer = b
    const f = ctx.createBiquadFilter()
    f.type = 'bandpass'
    f.frequency.value = 1800
    const g = ctx.createGain()
    g.gain.value = 0.12
    s.connect(f).connect(g).connect(this.master)
    s.start()
  }

  /** The captain speaks once per announcement per visit; the chime comes first. */
  announce(id: string, opts: { once?: boolean } = {}) {
    const a = cabin.announcements.find((x) => x.id === id)
    if (!a || !this.enabled || !this.voiceWanted || !this.ctx) return
    if (opts.once && this.played.has(id)) return
    this.played.add(id)
    this.stopVoice()
    this.chime()
    const el = new Audio(asset(`audio/captain/${id}.mp3`))
    el.crossOrigin = 'anonymous'
    this.voice = el
    this.ctx.createMediaElementSource(el).connect(this.voiceGain)
    const ctx = this.ctx
    this.musicGain.gain.setTargetAtTime(0.08, ctx.currentTime, 0.4)
    this.humGain.gain.setTargetAtTime(0.1, ctx.currentTime, 0.4)
    this.onCaption(a.text)
    this.onSpeaking(true)
    const done = () => {
      if (this.voice !== el) return
      this.voice = null
      this.onCaption(null)
      this.onSpeaking(false)
      this.musicGain.gain.setTargetAtTime(this.musicWanted ? 0.32 : 0, ctx.currentTime, 1.5)
      this.humGain.gain.setTargetAtTime(0.22, ctx.currentTime, 1.5)
    }
    el.addEventListener('ended', done)
    el.addEventListener('error', done)
    window.setTimeout(() => void el.play().catch(done), 900)
  }

  stopVoice() {
    if (!this.voice) return
    const el = this.voice
    this.voice = null
    el.pause()
    this.onCaption(null)
    this.onSpeaking(false)
    if (this.ctx) {
      this.musicGain.gain.setTargetAtTime(this.musicWanted && this.enabled ? 0.32 : 0, this.ctx.currentTime, 1)
      this.humGain.gain.setTargetAtTime(0.22, this.ctx.currentTime, 1)
    }
  }
}

export const audio = new AudioEngine()
