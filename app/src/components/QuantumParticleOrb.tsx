import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'

const POINT_VERTEX_SHADER = `
  attribute float size;
  varying vec3 vColor;
  varying float vDistance;
  uniform float time;

  void main() {
    vColor = color;
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    vDistance = -mvPosition.z;
    float pulse = sin(time * 2.0 + length(position)) * 0.15 + 1.0;
    vec3 pos = position;
    pos.x += sin(time + position.z * 0.5) * 0.05;
    pos.y += cos(time + position.x * 0.5) * 0.05;
    pos.z += sin(time + position.y * 0.5) * 0.05;
    mvPosition = modelViewMatrix * vec4(pos, 1.0);
    gl_PointSize = size * (300.0 / -mvPosition.z) * pulse;
    gl_Position = projectionMatrix * mvPosition;
  }
`

const POINT_FRAGMENT_SHADER = `
  varying vec3 vColor;
  varying float vDistance;
  uniform float time;

  void main() {
    vec2 cxy = 2.0 * gl_PointCoord - 1.0;
    float r = dot(cxy, cxy);
    if (r > 1.0) discard;
    float glow = exp(-r * 2.5);
    float outerGlow = exp(-r * 1.5) * 0.3;
    vec3 finalColor = vColor * (0.95 + sin(time * 0.5) * 0.06);
    vec3 coolGlow = vec3(0.72, 0.66, 0.82);
    vec3 warmGlow = vec3(0.86, 0.80, 0.90);
    vec3 halo = mix(coolGlow, warmGlow, sin(time * 0.35) * 0.5 + 0.5);
    finalColor += halo * outerGlow * 0.32;
    float distanceFade = 1.0 - smoothstep(0.0, 50.0, vDistance);
    float intensity = mix(0.75, 1.0, distanceFade);
    float alpha = (glow * 0.85 + outerGlow * 0.45) * distanceFade;
    gl_FragColor = vec4(finalColor * intensity, alpha);
  }
`

// Muted slate / violet / pearl palette (low saturation, light-theme friendly)
const SPHERE_COLORS = [
  new THREE.Color(0x7a6e8e),
  new THREE.Color(0x8b7e9b),
  new THREE.Color(0x9b8fa8),
  new THREE.Color(0xb5a8c0),
  new THREE.Color(0xc4b8d0),
  new THREE.Color(0xd8d0e4),
]

function createPointMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: { time: { value: 0 } },
    vertexShader: POINT_VERTEX_SHADER,
    fragmentShader: POINT_FRAGMENT_SHADER,
    vertexColors: true,
    transparent: true,
    depthWrite: false,
    blending: THREE.NormalBlending,
  })
}

function createSpiralSphere(radius: number, particleCount: number, colors: THREE.Color[]) {
  const geometry = new THREE.BufferGeometry()
  const positions: number[] = []
  const particleColors: number[] = []
  const sizes: number[] = []

  for (let i = 0; i < particleCount; i++) {
    const phi = Math.acos(-1 + (2 * i) / particleCount)
    const theta = Math.sqrt(particleCount * Math.PI) * phi
    const x = radius * Math.sin(phi) * Math.cos(theta)
    const y = radius * Math.sin(phi) * Math.sin(theta)
    const z = radius * Math.cos(phi)
    positions.push(x, y, z)

    const colorPos = i / particleCount
    const color1 = colors[Math.floor(colorPos * (colors.length - 1))]
    const color2 = colors[Math.ceil(colorPos * (colors.length - 1))]
    const mixRatio = (colorPos * (colors.length - 1)) % 1
    const finalColor = new THREE.Color().lerpColors(color1, color2, mixRatio)
    particleColors.push(finalColor.r, finalColor.g, finalColor.b)
    sizes.push(Math.random() * 0.15 + 0.08)
  }

  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(particleColors, 3))
  geometry.setAttribute('size', new THREE.Float32BufferAttribute(sizes, 1))

  return new THREE.Points(geometry, createPointMaterial())
}

function createOrbitRings(radius: number, count: number, thickness: number) {
  const group = new THREE.Group()

  for (let i = 0; i < count; i++) {
    const ringGeometry = new THREE.BufferGeometry()
    const positions: number[] = []
    const colors: number[] = []
    const sizes: number[] = []
    const particleCount = 3000

    for (let j = 0; j < particleCount; j++) {
      const angle = (j / particleCount) * Math.PI * 2
      const radiusVariation = radius + (Math.random() - 0.5) * thickness
      const x = Math.cos(angle) * radiusVariation
      const y = (Math.random() - 0.5) * thickness
      const z = Math.sin(angle) * radiusVariation
      positions.push(x, y, z)

      const ringHues = [0.58, 0.72, 0.12, 0.48, 0.65, 0.08]
      const hue = ringHues[i % ringHues.length] + (j / particleCount) * 0.04
      const saturation = 0.16 + (i / count) * 0.1
      const lightness = 0.32 + (j / particleCount) * 0.22
      const color = new THREE.Color().setHSL(hue, saturation, lightness)
      colors.push(color.r, color.g, color.b)
      sizes.push(Math.random() * 0.12 + 0.06)
    }

    ringGeometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
    ringGeometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
    ringGeometry.setAttribute('size', new THREE.Float32BufferAttribute(sizes, 1))

    const ring = new THREE.Points(ringGeometry, createPointMaterial())
    ring.rotation.x = Math.random() * Math.PI
    ring.rotation.y = Math.random() * Math.PI
    group.add(ring)
  }

  return group
}

type QuantumParticleOrbProps = {
  className?: string
}

export default function QuantumParticleOrb({ className }: QuantumParticleOrbProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const frameRef = useRef<number>(0)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const width = container.clientWidth
    const height = container.clientHeight

    const scene = new THREE.Scene()
    scene.fog = new THREE.FogExp2(0xf2f0f5, 0.016)

    const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000)
    camera.position.set(0, 5, 15)
    camera.lookAt(0, 0, 0)

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    })
    renderer.setSize(width, height)
    renderer.setClearColor(0x000000, 0)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    container.appendChild(renderer.domElement)

    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.dampingFactor = 0.06
    controls.rotateSpeed = 0.5
    controls.minDistance = 12
    controls.maxDistance = 28
    controls.enablePan = false

    const coreSphere = createSpiralSphere(4, 25000, SPHERE_COLORS)
    const orbitRings = createOrbitRings(5.8, 6, 0.4)

    const mainGroup = new THREE.Group()
    mainGroup.scale.set(1.2, 1.2, 1.2)
    mainGroup.add(coreSphere)
    mainGroup.add(orbitRings)
    scene.add(mainGroup)

    const disposables: Array<{ dispose: () => void }> = [coreSphere.geometry, coreSphere.material as THREE.Material]
    orbitRings.children.forEach((ring) => {
      const points = ring as THREE.Points
      disposables.push(points.geometry, points.material as THREE.Material)
    })

    let time = 0
    const animate = () => {
      time += 0.002

      const coreMat = coreSphere.material as THREE.ShaderMaterial
      coreMat.uniforms.time.value = time

      orbitRings.children.forEach((ring) => {
        const mat = (ring as THREE.Points).material as THREE.ShaderMaterial
        mat.uniforms.time.value = time
      })

      coreSphere.rotation.y += 0.001
      coreSphere.rotation.x = Math.sin(time * 0.5) * 0.15

      orbitRings.children.forEach((ring, index) => {
        const dynamicSpeed = 0.001 * (Math.sin(time * 0.2) + 2.0) * (index + 1)
        ring.rotation.z += dynamicSpeed
        ring.rotation.x += dynamicSpeed * 0.6
        ring.rotation.y += dynamicSpeed * 0.4
      })

      const breathe = 1 + Math.sin(time * 1.5) * 0.1
      coreSphere.scale.set(breathe, breathe, breathe)

      controls.update()
      renderer.render(scene, camera)
      frameRef.current = requestAnimationFrame(animate)
    }
    animate()

    const handleResize = () => {
      const w = container.clientWidth
      const h = container.clientHeight
      if (w === 0 || h === 0) return
      camera.aspect = w / h
      camera.updateProjectionMatrix()
      renderer.setSize(w, h)
    }

    const resizeObserver = new ResizeObserver(handleResize)
    resizeObserver.observe(container)

    return () => {
      resizeObserver.disconnect()
      cancelAnimationFrame(frameRef.current)
      disposables.forEach((d) => d.dispose())
      controls.dispose()
      renderer.dispose()
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement)
      }
    }
  }, [])

  return (
    <div
      ref={containerRef}
      className={className}
      style={{
        pointerEvents: 'auto',
        touchAction: 'none',
        cursor: 'grab',
      }}
      aria-hidden
    />
  )
}
