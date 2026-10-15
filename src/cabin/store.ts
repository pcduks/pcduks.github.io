import { create } from 'zustand'
import { profile } from '../lib/content'

export type Screen = 'home' | 'map' | 'captain' | 'log' | 'films' | 'menu' | 'dutyfree' | 'safety'
export type Phase = 'loading' | 'gate' | 'boarding' | 'cruise'
export type Focus = 'overview' | 'screen' | 'window'

type State = {
  phase: Phase
  screen: Screen
  focus: Focus
  film: string | null
  /** Index into profile.legs, or -1 while idling along the whole route. */
  chapter: number
  soundOn: boolean
  musicOn: boolean
  voiceOn: boolean
  shade: number // 0 open .. 1 closed
  readingLight: boolean
  seatbelt: boolean
  caption: string | null
  compact: boolean
  setPhase: (p: Phase) => void
  go: (s: Screen) => void
  setFocus: (f: Focus) => void
  setFilm: (repo: string | null) => void
  setChapter: (i: number) => void
  nextChapter: (dir: 1 | -1) => void
  setSound: (v: boolean) => void
  setMusic: (v: boolean) => void
  setVoice: (v: boolean) => void
  setShade: (v: number) => void
  toggleLight: () => void
  setSeatbelt: (v: boolean) => void
  setCaption: (c: string | null) => void
  setCompact: (v: boolean) => void
}

export const useCabin = create<State>((set, get) => ({
  phase: 'loading',
  screen: 'home',
  focus: 'overview',
  film: null,
  chapter: -1,
  soundOn: false,
  musicOn: true,
  voiceOn: true,
  shade: 0,
  readingLight: false,
  seatbelt: false,
  caption: null,
  compact: false,
  setPhase: (phase) => set({ phase }),
  go: (screen) => set({ screen, focus: screen === 'map' ? 'window' : 'screen', film: null }),
  setFocus: (focus) => set({ focus }),
  setFilm: (film) => set({ film }),
  setChapter: (chapter) => set({ chapter: Math.max(-1, Math.min(profile.legs.length - 1, chapter)) }),
  nextChapter: (dir) => {
    const c = get().chapter
    const n = c === -1 ? (dir === 1 ? 0 : profile.legs.length - 1) : c + dir
    set({ chapter: Math.max(0, Math.min(profile.legs.length - 1, n)) })
  },
  setSound: (soundOn) => set({ soundOn }),
  setMusic: (musicOn) => set({ musicOn }),
  setVoice: (voiceOn) => set({ voiceOn }),
  setShade: (shade) => set({ shade: Math.max(0, Math.min(1, shade)) }),
  toggleLight: () => set({ readingLight: !get().readingLight }),
  setSeatbelt: (seatbelt) => set({ seatbelt }),
  setCaption: (caption) => set({ caption }),
  setCompact: (compact) => set({ compact }),
}))
