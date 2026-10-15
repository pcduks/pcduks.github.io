import * as THREE from 'three'

/** A fine woven fabric bump texture, generated once. */
export function fabricTexture(size = 256) {
  const c = document.createElement('canvas')
  c.width = c.height = size
  const ctx = c.getContext('2d')!
  const img = ctx.createImageData(size, size)
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const weave = ((x >> 1) + (y >> 1)) % 2 === 0 ? 150 : 105
      const n = Math.random() * 40 - 20
      const v = Math.max(0, Math.min(255, weave + n))
      const i = (y * size + x) * 4
      img.data[i] = img.data[i + 1] = img.data[i + 2] = v
      img.data[i + 3] = 255
    }
  }
  ctx.putImageData(img, 0, 0)
  const t = new THREE.CanvasTexture(c)
  t.wrapS = t.wrapT = THREE.RepeatWrapping
  t.repeat.set(14, 14)
  return t
}

/** Frost and faint scratches around the edge of the window pane. */
export function paneTexture(w = 512, h = 640) {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  const ctx = c.getContext('2d')!
  ctx.clearRect(0, 0, w, h)
  const g = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.32, w / 2, h / 2, Math.max(w, h) * 0.62)
  g.addColorStop(0, 'rgba(255,255,255,0)')
  g.addColorStop(0.8, 'rgba(220,230,255,0.05)')
  g.addColorStop(1, 'rgba(230,238,255,0.32)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, w, h)
  ctx.strokeStyle = 'rgba(255,255,255,0.06)'
  for (let i = 0; i < 40; i++) {
    ctx.beginPath()
    const x = Math.random() * w
    const y = Math.random() * h
    ctx.moveTo(x, y)
    ctx.lineTo(x + (Math.random() - 0.5) * 80, y + (Math.random() - 0.5) * 80)
    ctx.stroke()
  }
  const t = new THREE.CanvasTexture(c)
  return t
}
