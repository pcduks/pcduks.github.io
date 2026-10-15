import { Suspense, useEffect, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { Html, useProgress } from '@react-three/drei'
import Gate from './Gate'
import { Bloom, EffectComposer, Noise, Vignette } from '@react-three/postprocessing'
import Cabin, { LAYOUT } from './scene/Cabin'
import CameraRig from './scene/CameraRig'
import IFE, { channels } from './ife/IFE'
import AudioDirector from './audio/AudioDirector'
import { audio } from './audio/engine'
import { useCabin } from './store'
import './cabin.css'

const SCREEN_CSS_W = 1120 // CSS pixels drawn onto the seatback screen
// drei's transform mode maps 400 CSS px to 10 world units at scale 1, i.e. 1 px = 1/40 unit.
const CSS_PX_PER_UNIT = 40

function SeatbackScreen() {
  const s = LAYOUT.screen
  const compact = useCabin((st) => st.compact)
  if (compact) return null
  return (
    <Html
      transform
      position={[s.x, s.y, s.z + 0.022]}
      scale={(s.w / SCREEN_CSS_W) * CSS_PX_PER_UNIT}
      style={{ width: SCREEN_CSS_W, height: Math.round((SCREEN_CSS_W * s.h) / s.w) }}
      zIndexRange={[5, 0]}
    >
      <IFE />
    </Html>
  )
}

function Boarding({ onBoard }: { onBoard: (sound: boolean) => void }) {
  const { progress, active } = useProgress()
  const phase = useCabin((s) => s.phase)
  const ready = !active && progress >= 100
  useEffect(() => {
    if (ready && phase === 'loading') useCabin.getState().setPhase('gate')
  }, [ready, phase])
  if (phase === 'cruise') return null
  return <Gate progress={Math.min(100, progress)} ready={ready} leaving={phase === 'boarding'} onBoard={onBoard} />
}

function Captions() {
  const caption = useCabin((s) => s.caption)
  if (!caption) return null
  return (
    <div className="captions" role="status" aria-live="polite">
      <span className="captions__who">Captain</span>
      <p>{caption}</p>
    </div>
  )
}

export default function CabinExperience() {
  const setCompact = useCabin((s) => s.setCompact)
  const compact = useCabin((s) => s.compact)
  const phase = useCabin((s) => s.phase)
  const [hidden, setHidden] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 820px), (max-aspect-ratio: 1/1)')
    const apply = () => setCompact(mq.matches)
    apply()
    mq.addEventListener('change', apply)
    const onVis = () => setHidden(document.hidden)
    document.addEventListener('visibilitychange', onVis)
    return () => {
      mq.removeEventListener('change', apply)
      document.removeEventListener('visibilitychange', onVis)
    }
  }, [setCompact])

  // Keyboard: the armrest remote.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const st = useCabin.getState()
      if (st.phase !== 'cruise' || e.metaKey || e.ctrlKey || e.altKey) return
      const t = e.target as HTMLElement
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA')) return
      const order: (typeof st.screen)[] = ['home', ...channels.map((c) => c.id)]
      const i = order.indexOf(st.screen)
      switch (e.key) {
        case 'ArrowRight':
          st.go(order[(i + 1) % order.length])
          break
        case 'ArrowLeft':
          st.go(order[(i - 1 + order.length) % order.length])
          break
        case 'ArrowDown':
          e.preventDefault()
          st.nextChapter(1)
          if (st.screen !== 'map' && st.screen !== 'log') st.go('map')
          break
        case 'ArrowUp':
          e.preventDefault()
          st.nextChapter(-1)
          if (st.screen !== 'map' && st.screen !== 'log') st.go('map')
          break
        case 'Escape':
          if (st.film) st.setFilm(null)
          else if (st.screen !== 'home') st.go('home')
          else st.setFocus('overview')
          break
        case '?':
          st.go('safety')
          break
        case 'l':
        case 'L':
          st.toggleLight()
          break
        case 'w':
        case 'W':
          st.setShade(st.shade > 0.5 ? 0 : 1)
          break
        case 'm':
        case 'M':
          st.setSound(!st.soundOn)
          break
        default: {
          const ch = channels.find((c) => c.key === e.key)
          if (ch) st.go(ch.id)
        }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const sitBack = (e: React.MouseEvent) => {
    const t = e.target as HTMLElement
    if (t.closest('.ife') || t.closest('.gate')) return
    useCabin.getState().setFocus('overview')
  }

  const board = (sound: boolean) => {
    // Inside the click, so the browser lets the AudioContext start.
    if (sound) {
      useCabin.getState().setSound(true)
      audio.setEnabled(true)
    }
    useCabin.getState().setPhase('boarding')
    window.setTimeout(() => useCabin.getState().setPhase('cruise'), 900)
    // Seven seconds of window, then lean in to the screen unless the visitor already did something.
    window.setTimeout(() => {
      const st = useCabin.getState()
      if (st.focus === 'overview' && st.screen === 'home' && !st.compact) st.setFocus('screen')
    }, 7500)
  }

  return (
    <div className={`cabin ${compact ? 'cabin--compact' : ''}`} onClick={sitBack}>
      <div className="cabin__canvas">
        <Canvas
          shadows
          dpr={[1, 1.5]}
          camera={{ position: [0.03, 0.1, 0.12], fov: 52, near: 0.02, far: 50 }}
          gl={{ antialias: true, powerPreference: 'high-performance', preserveDrawingBuffer: new URLSearchParams(window.location.search).has('shot') }}
          frameloop={hidden ? 'never' : 'always'}
        >
          <color attach="background" args={['#05070f']} />
          <Suspense fallback={null}>
            <Cabin />
            <SeatbackScreen />
            <EffectComposer multisampling={0}>
              <Bloom luminanceThreshold={0.55} luminanceSmoothing={0.3} intensity={0.55} mipmapBlur />
              <Noise opacity={0.035} />
              <Vignette eskil={false} offset={0.2} darkness={0.75} />
            </EffectComposer>
          </Suspense>
          <CameraRig />
        </Canvas>
      </div>
      {compact && phase === 'cruise' && (
        <div className="cabin__panel">
          <IFE />
        </div>
      )}
      <Captions />
      <AudioDirector />
      <Boarding onBoard={board} />
    </div>
  )
}
