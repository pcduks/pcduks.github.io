import { lazy, Suspense } from 'react'
import StaticSite from './static/StaticSite'
import Gate from './cabin/Gate'
import { useReducedMotion, useStaticPreference, useWebGL } from './lib/hooks'

const CabinExperience = lazy(() => import('./cabin/CabinExperience'))

/**
 * Two ways in: the cabin (a window seat on a night flight, WebGL) or the static page.
 * Reduced motion, no WebGL, or an explicit choice (?static, or the toggle) picks the page.
 */
export default function App() {
  const reduced = useReducedMotion()
  const webgl = useWebGL()
  const [staticPref] = useStaticPreference()
  const forced = new URLSearchParams(window.location.search).has('static')
  if (webgl === null) return null
  const live = webgl && !reduced && !staticPref && !forced
  if (!live) return <StaticSite />
  return (
    <Suspense fallback={<Gate progress={8} ready={false} />}>
      <CabinExperience />
    </Suspense>
  )
}
