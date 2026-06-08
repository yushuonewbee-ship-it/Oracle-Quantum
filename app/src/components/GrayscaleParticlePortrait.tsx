import { useCallback, useEffect, useRef, useState } from 'react'

type Particle = {
  x: number
  y: number
  /** 0 = 黑, 1 = 白 */
  lum: number
}

type GrayscaleParticlePortraitProps = {
  /** 初始图片 URL（如放在 public/ 下的路径） */
  initialSrc?: string
  className?: string
  /** 采样画布最大边，控制粒子数量 */
  maxSampleEdge?: number
  /** 采样步长（像素，越小越密） */
  sampleGap?: number
  /** 粒子基底半径（CSS 像素） */
  particleRadius?: number
}

function luminance(r: number, g: number, b: number): number {
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255
}

const BG_SAMPLE = '#F2F0F5'

export default function GrayscaleParticlePortrait({
  initialSrc,
  className = '',
  maxSampleEdge = 480,
  sampleGap = 3,
  particleRadius = 1.15,
}: GrayscaleParticlePortraitProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const particlesRef = useRef<Particle[]>([])
  const sampleSizeRef = useRef({ w: 1, h: 1 })
  const disposedRef = useRef(false)
  const [src, setSrc] = useState<string | undefined>(initialSrc)
  const [error, setError] = useState('')
  const [label, setLabel] = useState('选择一张图片，将按亮度生成灰度粒子')

  const buildFromImageUrl = useCallback(
    (url: string) => {
      if (!url) return
      const canvas = canvasRef.current
      if (!canvas) return
      const ctx = canvas.getContext('2d')
      if (!ctx) return

      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.onload = () => {
        if (disposedRef.current) return
        setError('')
        const iw = img.naturalWidth
        const ih = img.naturalHeight
        if (!iw || !ih) {
          setError('无法读取图片尺寸')
          return
        }

        const scale = Math.min(1, maxSampleEdge / Math.max(iw, ih))
        const sw = Math.max(1, Math.round(iw * scale))
        const sh = Math.max(1, Math.round(ih * scale))

        const off = document.createElement('canvas')
        off.width = sw
        off.height = sh
        const octx = off.getContext('2d')
        if (!octx) return
        octx.drawImage(img, 0, 0, sw, sh)
        const data = octx.getImageData(0, 0, sw, sh).data

        const list: Particle[] = []
        const gap = Math.max(2, sampleGap)

        for (let y = 0; y < sh; y += gap) {
          for (let x = 0; x < sw; x += gap) {
            const i = (Math.floor(y) * sw + Math.floor(x)) * 4
            const a = data[i + 3]
            if (a < 28) continue
            const r = data[i]
            const g = data[i + 1]
            const b = data[i + 2]
            const lum = luminance(r, g, b)
            if (lum < 0.02 && a < 200) continue
            list.push({ x, y, lum })
          }
        }

        particlesRef.current = list
        sampleSizeRef.current = { w: sw, h: sh }

        const parent = canvas.parentElement
        const maxCssW = parent ? Math.min(parent.clientWidth || 640, 720) : 640
        const cssW = Math.min(maxCssW, sw)
        const cssH = (cssW * sh) / sw

        canvas.style.width = `${cssW}px`
        canvas.style.height = `${cssH}px`
        const dpr = Math.min(window.devicePixelRatio || 1, 2)
        canvas.width = Math.floor(cssW * dpr)
        canvas.height = Math.floor(cssH * dpr)
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
        setLabel(`已生成 ${list.length} 粒 · 亮度 → 灰度 (L,L,L)`)
      }
      img.onerror = () => {
        if (disposedRef.current) return
        setError('图片加载失败（跨域时请改用本地上传）')
        particlesRef.current = []
      }
      img.src = url
    },
    [maxSampleEdge, sampleGap],
  )

  useEffect(() => {
    disposedRef.current = false
    if (src) buildFromImageUrl(src)
    return () => {
      disposedRef.current = true
      if (src?.startsWith('blob:')) URL.revokeObjectURL(src)
    }
  }, [src, buildFromImageUrl])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    let frame = 0

    const draw = () => {
      if (disposedRef.current) return
      const cssW = canvas.clientWidth
      const cssH = canvas.clientHeight
      if (cssW < 2 || cssH < 2) {
        frame = requestAnimationFrame(draw)
        return
      }

      const particles = particlesRef.current
      const { w: sw, h: sh } = sampleSizeRef.current
      const sx = cssW / sw
      const sy = cssH / sh

      ctx.fillStyle = BG_SAMPLE
      ctx.fillRect(0, 0, cssW, cssH)

      if (particles.length === 0) {
        frame = requestAnimationFrame(draw)
        return
      }

      const t = performance.now() * 0.001
      for (const p of particles) {
        const px = p.x * sx
        const py = p.y * sy
        const wobble = Math.sin(t * 1.7 + px * 0.02 + py * 0.02) * 0.35
        const v = Math.round(Math.min(255, Math.max(0, p.lum * 255 + wobble * 8)))
        const rad = particleRadius * (0.55 + 0.45 * p.lum)
        ctx.fillStyle = `rgb(${v},${v},${v})`
        ctx.globalAlpha = 0.15 + 0.85 * p.lum
        ctx.beginPath()
        ctx.arc(px, py, rad, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.globalAlpha = 1
      frame = requestAnimationFrame(draw)
    }
    frame = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(frame)
  }, [particleRadius, src])

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) return
    setSrc(URL.createObjectURL(f))
    setLabel(`加载中：${f.name}…`)
  }

  return (
    <div className={`panel p-4 ${className}`} style={{ background: 'var(--bg-panel)' }}>
      <div className="section-label mb-2">Pixel → Grayscale Particles</div>
      <p className="text-[11px] mb-3 leading-relaxed" style={{ color: 'var(--text-muted)' }}>
        按像素亮度采样：每个粒子颜色为 (L,L,L)，L 为线性亮度；暗处粒子略大、略实。可上传任意照片（例如薛定谔肖像）。
      </p>
      <label className="inline-flex cursor-pointer items-center gap-2 text-xs mb-3" style={{ color: 'var(--quantum-blue)' }}>
        <input type="file" accept="image/*" className="hidden" onChange={onFile} />
        <span className="rounded border px-3 py-1.5 font-data text-[10px] tracking-wider uppercase" style={{ borderColor: 'var(--border-default)' }}>
          选择图片
        </span>
      </label>
      {error && <p className="text-[11px] mb-2" style={{ color: 'var(--risk-red)' }}>{error}</p>}
      <p className="font-data text-[9px] mb-2" style={{ color: 'var(--text-dim)' }}>{label}</p>
      <div className="flex justify-center overflow-hidden rounded" style={{ background: BG_SAMPLE }}>
        <canvas ref={canvasRef} className="max-w-full" style={{ display: 'block' }} />
      </div>
    </div>
  )
}
