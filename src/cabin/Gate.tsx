import { useState } from 'react'
import { profile } from '../lib/content'
import './cabin.css'

/**
 * The boarding pass shown while the cabin loads. It lives outside the lazy cabin chunk so it
 * appears at once, then the cabin takes over the same card with real progress.
 */
export default function Gate({
  progress,
  ready,
  leaving = false,
  onBoard,
}: {
  progress: number
  ready: boolean
  leaving?: boolean
  onBoard?: (sound: boolean) => void
}) {
  const [sound, setSound] = useState(true)
  return (
    <div className={`gate ${leaving ? 'gate--out' : ''}`}>
      <div className="gate__card">
        <p className="gate__kicker">Boarding pass</p>
        <h1>
          {profile.shortName} <em>Parra</em>
        </h1>
        <dl className="gate__grid">
          <dt>Flight</dt>
          <dd>PP 1990</dd>
          <dt>From</dt>
          <dd>GRU · São Paulo</dd>
          <dt>To</dt>
          <dd>SIN · Singapore</dd>
          <dt>Seat</dt>
          <dd>32A · Window</dd>
        </dl>
        <div className="gate__bar">
          <span style={{ width: `${progress}%` }} />
        </div>
        <label className="gate__sound">
          <input type="checkbox" checked={sound} onChange={(e) => setSound(e.target.checked)} />
          <span>Cabin audio: engine hum, a little music, and the captain. Headphones recommended.</span>
        </label>
        <button className="btn btn--primary gate__board" disabled={!ready} onClick={() => onBoard?.(sound)}>
          {ready ? 'Board' : 'Preparing the cabin…'}
        </button>
        <p className="gate__note">Press M at any time to mute. Esc sits you back.</p>
      </div>
    </div>
  )
}
