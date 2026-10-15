import { useEffect, useRef } from 'react'
import { audio } from './engine'
import { useCabin } from '../store'
import { profile } from '../../lib/content'

/**
 * Connects the store to the sound engine: toggles, the welcome on boarding,
 * and an announcement a moment after a leg is chosen.
 */
export default function AudioDirector() {
  const timer = useRef<number | null>(null)
  useEffect(() => {
    audio.bind({
      caption: (c) => useCabin.getState().setCaption(c),
      speaking: (s) => useCabin.getState().setSeatbelt(s),
    })
    let prev = useCabin.getState()
    const unsub = useCabin.subscribe((st) => {
      if (st.soundOn !== prev.soundOn) audio.setEnabled(st.soundOn)
      if (st.musicOn !== prev.musicOn) audio.setMusic(st.musicOn)
      if (st.voiceOn !== prev.voiceOn) audio.setVoice(st.voiceOn)
      if (st.phase === 'cruise' && prev.phase !== 'cruise') {
        window.setTimeout(() => audio.announce('welcome', { once: true }), 1400)
      }
      if (st.screen !== prev.screen || st.film !== prev.film) audio.click()
      if (st.chapter !== prev.chapter && st.chapter >= 0) {
        if (timer.current) window.clearTimeout(timer.current)
        const id = profile.legs[st.chapter].id
        timer.current = window.setTimeout(() => audio.announce(id, { once: true }), 1600)
      }
      prev = st
    })
    return unsub
  }, [])
  return null
}
