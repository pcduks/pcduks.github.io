import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { PerspectiveCamera, RenderTexture, RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import EarthScene from './EarthScene'
import { fabricTexture, paneTexture } from './textures'
import { useCabin } from '../store'

/**
 * Cabin layout (metres, roughly). The viewer sits at the origin facing -z.
 * The window is on the left wall, the seat in front carries the screen.
 */
export const LAYOUT = {
  window: { x: -0.56, y: 0.2, z: -0.52, w: 0.34, h: 0.46, r: 0.1 },
  screen: { x: -0.02, y: 0.12, z: -0.7, w: 0.5, h: 0.3125 },
}

function roundedRect(w: number, h: number, r: number) {
  const s = new THREE.Shape()
  s.moveTo(-w / 2 + r, -h / 2)
  s.lineTo(w / 2 - r, -h / 2)
  s.quadraticCurveTo(w / 2, -h / 2, w / 2, -h / 2 + r)
  s.lineTo(w / 2, h / 2 - r)
  s.quadraticCurveTo(w / 2, h / 2, w / 2 - r, h / 2)
  s.lineTo(-w / 2 + r, h / 2)
  s.quadraticCurveTo(-w / 2, h / 2, -w / 2, h / 2 - r)
  s.lineTo(-w / 2, -h / 2 + r)
  s.quadraticCurveTo(-w / 2, -h / 2, -w / 2 + r, -h / 2)
  return s
}

function WallWithWindow() {
  const { w, h, r } = LAYOUT.window
  const geo = useMemo(() => {
    const wall = new THREE.Shape()
    wall.moveTo(-1.4, -1.2)
    wall.lineTo(1.4, -1.2)
    wall.lineTo(1.4, 1.2)
    wall.lineTo(-1.4, 1.2)
    wall.closePath()
    const hole = roundedRect(w, h, r)
    wall.holes.push(new THREE.Path(hole.getPoints(24)))
    const g = new THREE.ExtrudeGeometry(wall, { depth: 0.06, bevelEnabled: false })
    g.translate(0, 0, -0.06)
    return g
  }, [w, h, r])
  const bezel = useMemo(() => {
    const outer = roundedRect(w + 0.06, h + 0.06, r + 0.03)
    outer.holes.push(new THREE.Path(roundedRect(w, h, r).getPoints(24)))
    const g = new THREE.ExtrudeGeometry(outer, { depth: 0.025, bevelEnabled: true, bevelSize: 0.008, bevelThickness: 0.008, bevelSegments: 3 })
    return g
  }, [w, h, r])
  return (
    <group position={[LAYOUT.window.x, LAYOUT.window.y, LAYOUT.window.z]} rotation={[0, Math.PI / 2 - 0.42, 0.0]}>
      <mesh geometry={geo} receiveShadow>
        <meshStandardMaterial color="#aaa192" roughness={0.9} metalness={0} />
      </mesh>
      <mesh geometry={bezel} position={[0, 0, 0.001]}>
        <meshStandardMaterial color="#cfc7b8" roughness={0.6} />
      </mesh>
      <WindowGlass />
      <Shade />
    </group>
  )
}

function WindowGlass() {
  const { w, h } = LAYOUT.window
  const pane = useMemo(() => paneTexture(), [])
  const outsideCam = useRef<THREE.PerspectiveCamera>(null)
  return (
    <group>
      {/* The world outside, rendered to a texture by its own camera. */}
      <mesh position={[0, 0, -0.05]}>
        <planeGeometry args={[w * 1.25, h * 1.25]} />
        <meshBasicMaterial toneMapped={false}>
          <RenderTexture attach="map" width={768} height={1024} anisotropy={4}>
            <PerspectiveCamera ref={outsideCam} makeDefault manual fov={58} aspect={w / h} near={0.02} far={120} position={[0, 0, 1.5]} />
            <color attach="background" args={['#02030a']} />
            <EarthScene cameraRef={outsideCam} />
          </RenderTexture>
        </meshBasicMaterial>
      </mesh>
      {/* Inner pane: frost at the edges, faint reflections. */}
      <mesh position={[0, 0, 0.012]}>
        <planeGeometry args={[w, h]} />
        <meshPhysicalMaterial map={pane} transparent roughness={0.15} metalness={0} reflectivity={0.6} clearcoat={1} clearcoatRoughness={0.2} opacity={0.9} depthWrite={false} />
      </mesh>
      {/* Light from outside spilling onto the wall and seat. */}
      <pointLight position={[0, 0, -0.08]} intensity={0.7} distance={2.4} decay={1.7} color="#6c86d8" />
    </group>
  )
}

function Shade() {
  const { w, h } = LAYOUT.window
  const ref = useRef<THREE.Mesh>(null)
  useFrame((_, dt) => {
    const target = useCabin.getState().shade
    if (!ref.current) return
    const y = ref.current.position.y
    const goal = h / 2 + h * 0.52 - target * h * 1.02
    ref.current.position.y += (goal - y) * (1 - Math.exp(-dt * 6))
  })
  return (
    <mesh ref={ref} position={[0, h, 0.02]}>
      <planeGeometry args={[w + 0.02, h * 1.04]} />
      <meshStandardMaterial color="#d8d2c4" roughness={0.9} side={THREE.DoubleSide} />
    </mesh>
  )
}

function Seatback() {
  const fabric = useMemo(() => fabricTexture(), [])
  const s = LAYOUT.screen
  const glow = useRef<THREE.PointLight>(null)
  useFrame(({ clock }) => {
    if (glow.current) glow.current.intensity = 0.55 + Math.sin(clock.elapsedTime * 0.7) * 0.05
  })
  return (
    <group position={[s.x, 0, s.z - 0.05]}>
      {/* The seat shell, slightly curved by rotation of its two halves. */}
      <RoundedBox args={[0.56, 1.1, 0.08]} radius={0.04} smoothness={6} position={[0, -0.12, 0]} castShadow receiveShadow>
        <meshStandardMaterial color="#1b2340" roughness={0.95} bumpMap={fabric} bumpScale={0.004} />
      </RoundedBox>
      {/* Headrest */}
      <RoundedBox args={[0.5, 0.2, 0.07]} radius={0.035} smoothness={6} position={[0, 0.52, -0.01]}>
        <meshStandardMaterial color="#232c4f" roughness={0.95} bumpMap={fabric} bumpScale={0.004} />
      </RoundedBox>
      {/* Screen bezel */}
      <RoundedBox args={[s.w + 0.04, s.h + 0.04, 0.025]} radius={0.012} smoothness={4} position={[0, s.y, 0.05]}>
        <meshStandardMaterial color="#0d1018" roughness={0.35} metalness={0.2} />
      </RoundedBox>
      {/* Emissive panel behind the HTML, so the screen glows even where the DOM is transparent. */}
      <mesh position={[0, s.y, 0.0635]}>
        <planeGeometry args={[s.w, s.h]} />
        <meshBasicMaterial color="#0b1222" toneMapped={false} />
      </mesh>
      <pointLight ref={glow} position={[0, s.y, 0.35]} intensity={0.55} distance={1.6} decay={1.8} color="#8fb0ff" />
      {/* Tray table, latched */}
      <RoundedBox args={[0.42, 0.26, 0.02]} radius={0.01} smoothness={4} position={[0, s.y - 0.3, 0.055]}>
        <meshStandardMaterial color="#2b3357" roughness={0.7} />
      </RoundedBox>
      <mesh position={[0, s.y - 0.155, 0.07]} rotation={[0, 0, 0]}>
        <boxGeometry args={[0.06, 0.02, 0.012]} />
        <meshStandardMaterial color="#9aa3b8" roughness={0.4} metalness={0.6} />
      </mesh>
      {/* Seat pocket */}
      <RoundedBox args={[0.48, 0.16, 0.03]} radius={0.01} smoothness={3} position={[0, s.y - 0.52, 0.055]}>
        <meshStandardMaterial color="#161d36" roughness={0.95} bumpMap={fabric} bumpScale={0.004} />
      </RoundedBox>
    </group>
  )
}

function Surroundings() {
  const fabric = useMemo(() => fabricTexture(), [])
  const light = useRef<THREE.SpotLight>(null)
  const lens = useRef<THREE.Mesh>(null)
  useFrame((_, dt) => {
    const on = useCabin.getState().readingLight
    if (light.current) light.current.intensity += ((on ? 6 : 0) - light.current.intensity) * (1 - Math.exp(-dt * 8))
    if (lens.current) (lens.current.material as THREE.MeshBasicMaterial).color.setHex(on ? 0xfff2cc : 0x33301f)
  })
  return (
    <group>
      {/* Own seat cushion, bottom of frame */}
      <RoundedBox args={[0.6, 0.12, 0.5]} radius={0.04} smoothness={5} position={[0.02, -0.52, -0.1]}>
        <meshStandardMaterial color="#1b2340" roughness={0.95} bumpMap={fabric} bumpScale={0.004} />
      </RoundedBox>
      {/* Armrest on the left under the window, with the remote cradle */}
      <RoundedBox args={[0.08, 0.06, 0.5]} radius={0.02} smoothness={4} position={[-0.34, -0.36, -0.12]}>
        <meshStandardMaterial color="#2a3150" roughness={0.6} />
      </RoundedBox>
      {/* Ceiling panel with the reading light and seatbelt sign */}
      <mesh position={[0, 0.95, -0.4]} rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[3, 2]} />
        <meshStandardMaterial color="#d9d3c6" roughness={0.9} />
      </mesh>
      <mesh ref={lens} position={[-0.1, 0.94, -0.3]} rotation={[Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.02, 24]} />
        <meshBasicMaterial color="#33301f" toneMapped={false} />
      </mesh>
      <spotLight ref={light} position={[-0.1, 0.94, -0.3]} target-position={[0.05, -0.2, -0.5]} angle={0.45} penumbra={0.6} intensity={0} distance={3} decay={1.5} color="#ffe6b8" castShadow />
      <SeatbeltSign />
      {/* Floor and far wall so the dark has a shape */}
      <mesh position={[0, -0.75, -0.4]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[3, 3]} />
        <meshStandardMaterial color="#141a2e" roughness={1} />
      </mesh>
      <mesh position={[0.9, 0, -1.2]}>
        <planeGeometry args={[2, 3]} />
        <meshStandardMaterial color="#1a2140" roughness={1} />
      </mesh>
    </group>
  )
}

function SeatbeltSign() {
  const ref = useRef<THREE.Mesh>(null)
  useFrame((_, dt) => {
    const on = useCabin.getState().seatbelt
    if (!ref.current) return
    const m = ref.current.material as THREE.MeshBasicMaterial
    m.opacity += ((on ? 1 : 0.12) - m.opacity) * (1 - Math.exp(-dt * 6))
  })
  return (
    <mesh ref={ref} position={[0.12, 0.939, -0.3]} rotation={[Math.PI / 2, 0, 0]}>
      <planeGeometry args={[0.06, 0.035]} />
      <meshBasicMaterial color="#ffb347" transparent opacity={0.12} toneMapped={false} />
    </mesh>
  )
}

export default function Cabin() {
  return (
    <group>
      <ambientLight intensity={0.08} color="#5c6fa8" />
      <hemisphereLight intensity={0.1} color="#8aa0d8" groundColor="#0a0d18" />
      {/* A warm, dim aisle light from the right, as cabins have at night. */}
      <pointLight position={[1.1, 0.7, -0.2]} intensity={0.35} distance={3} decay={1.8} color="#ffb374" />
      <WallWithWindow />
      <Seatback />
      <Surroundings />
    </group>
  )
}
