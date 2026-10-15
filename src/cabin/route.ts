import { Vector3 } from 'three'
import { profile } from '../lib/content'

const D2R = Math.PI / 180

/**
 * Lat/lon to a unit vector in the convention three.js uses for an equirectangular texture on a
 * SphereGeometry: longitude 0 faces +x, east goes towards -z.
 */
export function toVec(lat: number, lon: number, r = 1, out = new Vector3()) {
  const phi = lat * D2R
  const lambda = lon * D2R
  return out.set(r * Math.cos(phi) * Math.cos(lambda), r * Math.sin(phi), -r * Math.cos(phi) * Math.sin(lambda))
}

/** Spherical interpolation between two unit vectors. */
export function slerp(a: Vector3, b: Vector3, t: number, out = new Vector3()) {
  const dot = Math.min(1, Math.max(-1, a.dot(b)))
  const omega = Math.acos(dot)
  if (omega < 1e-5) return out.copy(a)
  const s = Math.sin(omega)
  return out
    .copy(a)
    .multiplyScalar(Math.sin((1 - t) * omega) / s)
    .addScaledVector(b, Math.sin(t * omega) / s)
}

export type Waypoint = { name: string; lat: number; lon: number }

/** The whole flight path, as the route in profile.json: a loop so idling never stops. */
export const path: Waypoint[] = profile.route as Waypoint[]

/** Position along the full path at parameter u in [0, 1). */
export function pathPoint(u: number, out = new Vector3()) {
  const n = path.length
  const f = ((u % 1) + 1) % 1
  const seg = Math.floor(f * n)
  const t = f * n - seg
  const a = toVec(path[seg].lat, path[seg].lon)
  const b = toVec(path[(seg + 1) % n].lat, path[(seg + 1) % n].lon)
  return slerp(a, b, t, out)
}

/** The city a chapter looks at, and the city it came from (for heading). */
export function chapterTarget(i: number) {
  const leg = profile.legs[i]
  const prev = profile.legs[Math.min(profile.legs.length - 1, i + 1)] // older leg = where we flew from
  return { to: toVec(leg.lat, leg.lon), from: toVec(prev.lat, prev.lon), label: leg.city }
}

/** Subsolar point for a date: where the sun is directly overhead. Good to a degree or two. */
export function sunDirection(date = new Date(), out = new Vector3()) {
  const start = Date.UTC(date.getUTCFullYear(), 0, 0)
  const day = (date.getTime() - start) / 86400000
  const decl = -23.44 * Math.cos(((360 / 365) * (day + 10)) * D2R)
  const hours = date.getUTCHours() + date.getUTCMinutes() / 60 + date.getUTCSeconds() / 3600
  const lon = -15 * (hours - 12)
  return toVec(decl, lon, 1, out)
}

/** A readable name for the stretch of Earth under the window. */
export function regionName(lat: number, lon: number) {
  const l = ((lon + 540) % 360) - 180
  if (lat > -10 && lat < 25 && l > 80 && l < 100) return 'the Bay of Bengal'
  if (lat > -10 && lat < 10 && l > 95 && l < 110) return 'the Strait of Malacca'
  if (lat > 20 && lat < 45 && l > 125 && l < 150) return 'the Sea of Japan'
  if (lat > -35 && lat < 5 && l > -75 && l < -35) return 'Brazil'
  if (lat > 25 && lat < 50 && l > -125 && l < -70) return 'the United States'
  if (lat > 35 && lat < 60 && l > -10 && l < 30) return 'Europe'
  if (lat > -40 && lat < 40 && l > -40 && l < 60) return 'Africa'
  if (lat > 5 && lat < 35 && l > 60 && l < 90) return 'the Indian subcontinent'
  if (lat > -45 && lat < 10 && l > -180 && l < -80) return 'the Pacific'
  if (lat > 0 && lat < 60 && l > -75 && l < -10) return 'the Atlantic'
  if (lat > -45 && lat < 10 && l > 40 && l < 110) return 'the Indian Ocean'
  return 'open ocean'
}

export function vecToLatLon(v: Vector3) {
  const lat = Math.asin(Math.max(-1, Math.min(1, v.y))) / D2R
  const lon = Math.atan2(-v.z, v.x) / D2R
  return { lat, lon }
}
