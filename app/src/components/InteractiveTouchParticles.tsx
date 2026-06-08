import { useEffect, useRef } from 'react'
import * as THREE from 'three'

/**
 * Codrops-inspired interactive particles (touch texture displaces points).
 * @see https://tympanus.net/codrops/2019/01/17/interactive-particles-with-three-js/
 */

const VERTEX_SHADER = `
  uniform float uTime;
  uniform sampler2D uTouch;
  uniform vec2 uResolution;
  attribute float aRandom;
  attribute float aPhase;
  varying float vMix;

  void main() {
    vec3 pos = position;
    vec2 touchUv = vec2(pos.x / uResolution.x, 1.0 - pos.y / uResolution.y);
    float touch = texture2D(uTouch, touchUv).r;

    float wobble = sin(uTime * 0.6 + aPhase) * 0.35;
    pos.x += cos(aRandom * 6.28) * touch * 22.0;
    pos.y += sin(aRandom * 6.28) * touch * 22.0;
    pos.z += touch * 28.0 + wobble;

    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
    vMix = touch;
    gl_PointSize = (2.0 + touch * 2.5) * (240.0 / -mvPosition.z);
    gl_Position = projectionMatrix * mvPosition;
  }
`

const FRAGMENT_SHADER = `
  uniform vec3 uColor;
  varying float vMix;

  void main() {
    vec2 c = gl_PointCoord - 0.5;
    float r = dot(c, c);
    if (r > 0.25) discard;
    float alpha = smoothstep(0.25, 0.0, r) * (0.35 + vMix * 0.55);
    gl_FragColor = vec4(uColor, alpha);
  }
`

type InteractiveTouchParticlesProps = {
  className?: string
  color?: string
  density?: number
}

export default function InteractiveTouchParticles({
  className,
  color = '#9B8FA8',
  density = 9000,
}: InteractiveTouchParticlesProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const frameRef = useRef<number>(0)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const width = container.clientWidth
    const height = container.clientHeight

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(50, width / height, 1, 2000)
    camera.position.z = 320

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setSize(width, height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setClearColor(0x000000, 0)
    container.appendChild(renderer.domElement)

    const touchSize = 128
    const touchCanvas = document.createElement('canvas')
    touchCanvas.width = touchSize
    touchCanvas.height = touchSize
    const touchCtx = touchCanvas.getContext('2d')
    if (touchCtx) {
      touchCtx.fillStyle = '#000000'
      touchCtx.fillRect(0, 0, touchSize, touchSize)
    }
    const touchTexture = new THREE.CanvasTexture(touchCanvas)
    touchTexture.minFilter = THREE.LinearFilter
    touchTexture.magFilter = THREE.LinearFilter

    const threeColor = new THREE.Color(color)
    const cols = Math.ceil(Math.sqrt((width * height) / density))
    const rows = Math.ceil((width * height) / density / cols)
    const positions: number[] = []
    const randoms: number[] = []
    const phases: number[] = []

    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const px = (x / Math.max(cols - 1, 1)) * width + (Math.random() - 0.5) * (width / cols) * 0.35
        const py = (y / Math.max(rows - 1, 1)) * height + (Math.random() - 0.5) * (height / rows) * 0.35
        positions.push(px, py, (Math.random() - 0.5) * 6)
        randoms.push(Math.random())
        phases.push(Math.random() * Math.PI * 2)
      }
    }

    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
    geometry.setAttribute('aRandom', new THREE.Float32BufferAttribute(randoms, 1))
    geometry.setAttribute('aPhase', new THREE.Float32BufferAttribute(phases, 1))

    const material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uTouch: { value: touchTexture },
        uResolution: { value: new THREE.Vector2(width, height) },
        uColor: { value: threeColor },
      },
      vertexShader: VERTEX_SHADER,
      fragmentShader: FRAGMENT_SHADER,
      transparent: true,
      depthWrite: false,
      blending: THREE.NormalBlending,
    })

    const points = new THREE.Points(geometry, material)
    scene.add(points)

    const mouse = { x: width / 2, y: height / 2, active: false }

    const stampTouch = (x: number, y: number, radius = 28) => {
      if (!touchCtx) return
      const ux = (x / width) * touchSize
      const uy = (1 - y / height) * touchSize
      const grad = touchCtx.createRadialGradient(ux, uy, 0, ux, uy, radius)
      grad.addColorStop(0, 'rgba(255,255,255,0.95)')
      grad.addColorStop(1, 'rgba(255,255,255,0)')
      touchCtx.fillStyle = grad
      touchCtx.beginPath()
      touchCtx.arc(ux, uy, radius, 0, Math.PI * 2)
      touchCtx.fill()
    }

    const fadeTouch = () => {
      if (!touchCtx) return
      touchCtx.fillStyle = 'rgba(0,0,0,0.1)'
      touchCtx.fillRect(0, 0, touchSize, touchSize)
    }

    const handlePointerMove = (event: PointerEvent) => {
      const rect = container.getBoundingClientRect()
      mouse.x = event.clientX - rect.left
      mouse.y = event.clientY - rect.top
      mouse.active = true
      stampTouch(mouse.x, mouse.y, 32)
      touchTexture.needsUpdate = true
    }

    const handlePointerLeave = () => {
      mouse.active = false
    }

    window.addEventListener('pointermove', handlePointerMove)
    container.addEventListener('pointerleave', handlePointerLeave)

    let start = performance.now()
    const animate = () => {
      const elapsed = (performance.now() - start) / 1000
      material.uniforms.uTime.value = elapsed
      fadeTouch()
      if (mouse.active) stampTouch(mouse.x, mouse.y, 26)
      touchTexture.needsUpdate = true
      renderer.render(scene, camera)
      frameRef.current = requestAnimationFrame(animate)
    }
    animate()

    const resize = () => {
      const w = container.clientWidth
      const h = container.clientHeight
      if (w === 0 || h === 0) return
      camera.aspect = w / h
      camera.updateProjectionMatrix()
      renderer.setSize(w, h)
      material.uniforms.uResolution.value.set(w, h)
    }

    const observer = new ResizeObserver(resize)
    observer.observe(container)

    return () => {
      observer.disconnect()
      window.removeEventListener('pointermove', handlePointerMove)
      container.removeEventListener('pointerleave', handlePointerLeave)
      cancelAnimationFrame(frameRef.current)
      geometry.dispose()
      material.dispose()
      touchTexture.dispose()
      renderer.dispose()
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement)
      }
    }
  }, [color, density])

  return (
    <div
      ref={containerRef}
      className={className}
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 0,
      }}
      aria-hidden
    />
  )
}
