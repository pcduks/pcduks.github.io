import { useFrame, useThree } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useCabin } from '../store'
import { LAYOUT } from './Cabin'

/**
 * The viewer's head. Framing differs by aspect ratio: wide screens see the window and the seatback
 * together; narrow ones look at the window only (the seatback UI is a DOM panel below the canvas).
 */
export default function CameraRig() {
  const { camera, size } = useThree()
  const target = useMemo(() => new THREE.Vector3(), [])
  const pos = useMemo(() => new THREE.Vector3(0, 0.08, 0.1), [])
  const look = useMemo(() => new THREE.Vector3(), [])
  const shake = useRef(0)

  useFrame((state, dt) => {
    const { compact, focus } = useCabin.getState()
    const aspect = size.width / size.height
    const sc = LAYOUT.screen
    let fov: number
    let parallax = 1
    if (compact) {
      fov = 50
      pos.set(-0.26, 0.12, -0.12)
      look.set(LAYOUT.window.x + 0.22, LAYOUT.window.y, LAYOUT.window.z - 0.5)
    } else if (focus === 'screen') {
      // Lean in: the screen fills most of the frame and stays readable.
      fov = aspect > 1.6 ? 36 : 44
      pos.set(sc.x + 0.02, sc.y + 0.02, sc.z + 0.72)
      look.set(sc.x, sc.y, sc.z)
      parallax = 0.35
    } else if (focus === 'window') {
      fov = 46
      pos.set(-0.16, 0.14, -0.02)
      look.set(LAYOUT.window.x + 0.16, LAYOUT.window.y - 0.02, LAYOUT.window.z - 0.45)
      parallax = 0.6
    } else {
      fov = aspect > 1.6 ? 58 : 66
      pos.set(0.0, 0.12, 0.08)
      look.set(-0.24, 0.12, -0.7)
    }
    // Pointer parallax: a few centimetres of head movement.
    const px = state.pointer.x * 0.035 * parallax
    const py = state.pointer.y * 0.02 * parallax
    // Turbulence: rare, gentle.
    shake.current = Math.max(0, shake.current - dt * 0.4)
    if (Math.random() < dt * 0.04) shake.current = 0.6 + Math.random() * 0.4
    const t = state.clock.elapsedTime
    const sx = Math.sin(t * 17.3) * 0.0025 * shake.current + Math.sin(t * 0.7) * 0.0012
    const sy = Math.cos(t * 13.1) * 0.0025 * shake.current + Math.sin(t * 0.9) * 0.0015

    target.set(pos.x + px + sx, pos.y + py + sy, pos.z)
    const k = 1 - Math.exp(-dt * 2.2)
    camera.up.set(0, 1, 0)
    camera.position.lerp(target, k)
    const cam = camera as THREE.PerspectiveCamera
    cam.fov += (fov - cam.fov) * k
    cam.updateProjectionMatrix()
    camera.lookAt(look.x + px * 0.5, look.y + py * 0.5, look.z)
  })
  return null
}
