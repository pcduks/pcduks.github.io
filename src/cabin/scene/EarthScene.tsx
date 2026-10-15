import { useMemo, useRef, type RefObject } from 'react'
import { useFrame } from '@react-three/fiber'
import { Stars, useTexture } from '@react-three/drei'
import * as THREE from 'three'
import { earthVertex, earthFragment, cloudFragment, haloVertex, haloFragment } from './earthShader'
import { chapterTarget, pathPoint, slerp, sunDirection, vecToLatLon } from '../route'
import { useCabin } from '../store'
import { asset } from '../../lib/content'

const R = 1
const ALTITUDE = 0.42 // far above a real cruising altitude, for the view

/** Published so the IFE can say where the window is looking. */
export const windowState = { lat: 1.35, lon: 103.8, sunUp: false }

export default function EarthScene({ cameraRef }: { cameraRef: RefObject<THREE.PerspectiveCamera | null> }) {
  const [day, night, clouds, ocean] = useTexture([asset('earth/day.jpg'), asset('earth/night.jpg'), asset('earth/clouds.jpg'), asset('earth/ocean.jpg')])
  const earthMat = useRef<THREE.ShaderMaterial>(null)
  const cloudMat = useRef<THREE.ShaderMaterial>(null)
  const haloMat = useRef<THREE.ShaderMaterial>(null)
  const wing = useRef<THREE.Group>(null)
  const strobe = useRef<THREE.Mesh>(null)

  const sun = useMemo(() => sunDirection(), [])
  const uniforms = useMemo(
    () => ({
      uDay: { value: day },
      uNight: { value: night },
      uOcean: { value: ocean },
      uSun: { value: sun.clone() },
      uCamera: { value: new THREE.Vector3() },
    }),
    [day, night, ocean, sun],
  )
  const cloudUniforms = useMemo(
    () => ({ uClouds: { value: clouds }, uSun: { value: sun.clone() }, uCamera: { value: new THREE.Vector3() }, uTime: { value: 0 } }),
    [clouds, sun],
  )
  const haloUniforms = useMemo(() => ({ uSunView: { value: new THREE.Vector3() } }), [])

  useMemo(() => {
    for (const t of [day, night, clouds, ocean]) {
      t.colorSpace = THREE.NoColorSpace
      t.anisotropy = 8
      t.wrapS = THREE.RepeatWrapping
    }
    day.colorSpace = THREE.SRGBColorSpace
    night.colorSpace = THREE.SRGBColorSpace
  }, [day, night, clouds, ocean])

  // Flight state: a point on the sphere and a heading, eased towards the current chapter.
  const pos = useRef(pathPoint(0.6))
  const ahead = useRef(pathPoint(0.6 + 0.01))
  const idleU = useRef(0.6)
  const tmpA = useMemo(() => new THREE.Vector3(), [])
  const tmpB = useMemo(() => new THREE.Vector3(), [])
  const tmpC = useMemo(() => new THREE.Vector3(), [])
  const lastSun = useRef(0)

  useFrame((state, dt) => {
    const camera = cameraRef.current
    if (!camera) return
    const chapter = useCabin.getState().chapter
    let targetPos: THREE.Vector3
    let targetAhead: THREE.Vector3
    if (chapter >= 0) {
      const { to, from } = chapterTarget(chapter)
      // Sit a little short of the city so it is in the lower half of the window, heading towards it.
      targetPos = slerp(from, to, 0.93, tmpA)
      targetAhead = to
    } else {
      idleU.current += dt / 480 // the full loop takes eight minutes
      targetPos = pathPoint(idleU.current, tmpA)
      targetAhead = pathPoint(idleU.current + 0.004, tmpB)
    }
    const k = 1 - Math.exp(-dt * (chapter >= 0 ? 0.9 : 3))
    pos.current.lerp(targetPos, k).normalize()
    ahead.current.lerp(targetAhead, k).normalize()

    // Camera: above the point, looking along the heading towards the horizon.
    // From altitude h the horizon sits acos(R/(R+h)) away, about 45 degrees here; aim a little below it.
    camera.position.copy(pos.current).multiplyScalar(R + ALTITUDE)
    tmpC.copy(ahead.current).addScaledVector(pos.current, -pos.current.dot(ahead.current)).normalize() // heading tangent
    const theta = 0.62 // radians ahead along the surface
    tmpC.multiplyScalar(Math.sin(theta)).addScaledVector(pos.current, Math.cos(theta)).multiplyScalar(R * 1.01)
    camera.up.copy(pos.current)
    camera.lookAt(tmpC)
    // bank gently with the pointer so the view feels alive
    camera.rotateZ(state.pointer.x * 0.02)

    // Sun moves with the real clock; refresh once a minute.
    if (state.clock.elapsedTime - lastSun.current > 60) {
      lastSun.current = state.clock.elapsedTime
      sunDirection(new Date(), sun)
      uniforms.uSun.value.copy(sun)
      cloudUniforms.uSun.value.copy(sun)
    }
    uniforms.uCamera.value.copy(camera.position)
    cloudUniforms.uCamera.value.copy(camera.position)
    cloudUniforms.uTime.value = state.clock.elapsedTime
    haloUniforms.uSunView.value.copy(sun).transformDirection(camera.matrixWorldInverse)

    const ll = vecToLatLon(pos.current)
    windowState.lat = ll.lat
    windowState.lon = ll.lon
    windowState.sunUp = pos.current.dot(sun) > -0.1

    // Wing fixed to the camera, strobe flashing twice a second-and-a-bit.
    if (wing.current) {
      wing.current.position.copy(camera.position)
      wing.current.quaternion.copy(camera.quaternion)
    }
    if (strobe.current) {
      const t = state.clock.elapsedTime % 1.4
      const on = t < 0.06 || (t > 0.16 && t < 0.22)
      ;(strobe.current.material as THREE.MeshBasicMaterial).opacity = on ? 1 : 0.08
      strobe.current.scale.setScalar(on ? 2.2 : 1)
    }
  })

  return (
    <>
      <Stars radius={60} depth={30} count={3000} factor={2.4} saturation={0} fade speed={0.2} />
      <mesh>
        <sphereGeometry args={[R, 128, 96]} />
        <shaderMaterial ref={earthMat} vertexShader={earthVertex} fragmentShader={earthFragment} uniforms={uniforms} />
      </mesh>
      <mesh scale={1.008}>
        <sphereGeometry args={[R, 96, 72]} />
        <shaderMaterial ref={cloudMat} vertexShader={earthVertex} fragmentShader={cloudFragment} uniforms={cloudUniforms} transparent depthWrite={false} />
      </mesh>
      <mesh scale={1.09}>
        <sphereGeometry args={[R, 64, 48]} />
        <shaderMaterial ref={haloMat} vertexShader={haloVertex} fragmentShader={haloFragment} uniforms={haloUniforms} transparent side={THREE.BackSide} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>
      {/* The wing, in camera space: a dark swept slab low on the right with a nav light and a strobe. */}
      <group ref={wing}>
        <group position={[0.22, -0.36, -0.9]} rotation={[0.18, -0.35, 0.12]}>
          <mesh>
            <boxGeometry args={[1.6, 0.025, 0.42]} />
            <meshStandardMaterial color="#0a0e1c" roughness={0.6} metalness={0.4} />
          </mesh>
          <mesh position={[0.74, 0.02, 0.1]}>
            <boxGeometry args={[0.12, 0.09, 0.03]} />
            <meshStandardMaterial color="#0a0e1c" roughness={0.6} metalness={0.4} />
          </mesh>
          <mesh position={[0.8, 0.03, 0.12]}>
            <sphereGeometry args={[0.012, 12, 12]} />
            <meshBasicMaterial color="#2bff6a" toneMapped={false} />
          </mesh>
          <mesh ref={strobe} position={[0.8, 0.06, 0.08]}>
            <sphereGeometry args={[0.01, 10, 10]} />
            <meshBasicMaterial color="#ffffff" transparent opacity={0.1} toneMapped={false} />
          </mesh>
        </group>
      </group>
      <directionalLight position={sun.clone().multiplyScalar(10)} intensity={1.2} />
      <ambientLight intensity={0.08} />
    </>
  )
}
