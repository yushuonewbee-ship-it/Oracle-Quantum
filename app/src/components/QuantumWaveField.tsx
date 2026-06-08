import { useRef, useEffect } from 'react'
import * as THREE from 'three'
import { gsap } from 'gsap'

const vertexShader = `
  uniform float u_time;
  uniform float u_waveMix;
  uniform float u_clickBlend;
  varying vec3 vPos;
  varying float vBaseWave;
  varying vec3 vHitPos;
  uniform vec3 vHitPosUniform;

  // Periodic noise
  vec3 mod289v3(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 mod289v4(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 permute(vec4 x) { return mod289v4(((x * 34.0) + 1.0) * x); }
  vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
  vec3 fade(vec3 t) { return t * t * t * (t * (t * 6.0 - 15.0) + 10.0); }

  float pnoise(vec3 P, vec3 rep) {
    vec3 Pi0 = mod289v3(mod(floor(P), rep));
    vec3 Pi1 = mod289v3(mod(Pi0 + vec3(1.0), rep));
    vec3 Pf0 = fract(P);
    vec3 Pf1 = Pf0 - vec3(1.0);
    vec4 ix = vec4(Pi0.x, Pi1.x, Pi0.x, Pi1.x);
    vec4 iy = vec4(Pi0.yy, Pi1.yy);
    vec4 iz0 = Pi0.zzzz;
    vec4 iz1 = Pi1.zzzz;

    vec4 ixy = permute(permute(ix) + iy);
    vec4 ixy0 = permute(ixy + iz0);
    vec4 ixy1 = permute(ixy + iz1);

    vec4 gx0 = ixy0 * (1.0 / 7.0);
    vec4 gy0 = fract(floor(gx0) * (1.0 / 7.0)) - 0.5;
    gx0 = fract(gx0);
    vec4 gz0 = vec4(0.5) - abs(gx0) - abs(gy0);
    vec4 sz0 = step(gz0, vec4(0.0));
    gx0 -= sz0 * (step(0.0, gx0) - 0.5);
    gy0 -= sz0 * (step(0.0, gy0) - 0.5);

    vec4 gx1 = ixy1 * (1.0 / 7.0);
    vec4 gy1 = fract(floor(gx1) * (1.0 / 7.0)) - 0.5;
    gx1 = fract(gx1);
    vec4 gz1 = vec4(0.5) - abs(gx1) - abs(gy1);
    vec4 sz1 = step(gz1, vec4(0.0));
    gx1 -= sz1 * (step(0.0, gx1) - 0.5);
    gy1 -= sz1 * (step(0.0, gy1) - 0.5);

    vec3 g000 = vec3(gx0.x, gy0.x, gz0.x);
    vec3 g100 = vec3(gx0.y, gy0.y, gz0.y);
    vec3 g010 = vec3(gx0.z, gy0.z, gz0.z);
    vec3 g110 = vec3(gx0.w, gy0.w, gz0.w);
    vec3 g001 = vec3(gx1.x, gy1.x, gz1.x);
    vec3 g101 = vec3(gx1.y, gy1.y, gz1.y);
    vec3 g011 = vec3(gx1.z, gy1.z, gz1.z);
    vec3 g111 = vec3(gx1.w, gy1.w, gz1.w);

    vec4 norm0 = taylorInvSqrt(vec4(dot(g000,g000), dot(g100,g100), dot(g010,g010), dot(g110,g110)));
    g000 *= norm0.x; g100 *= norm0.y; g010 *= norm0.z; g110 *= norm0.w;
    vec4 norm1 = taylorInvSqrt(vec4(dot(g001,g001), dot(g101,g101), dot(g011,g011), dot(g111,g111)));
    g001 *= norm1.x; g101 *= norm1.y; g011 *= norm1.z; g111 *= norm1.w;

    float n000 = dot(g000, Pf0);
    float n100 = dot(g100, vec3(Pf1.x, Pf0.y, Pf0.z));
    float n010 = dot(g010, vec3(Pf0.x, Pf1.y, Pf0.z));
    float n110 = dot(g110, vec3(Pf1.x, Pf1.y, Pf0.z));
    float n001 = dot(g001, vec3(Pf0.x, Pf0.y, Pf1.z));
    float n101 = dot(g101, vec3(Pf1.x, Pf0.y, Pf1.z));
    float n011 = dot(g011, vec3(Pf0.x, Pf1.y, Pf1.z));
    float n111 = dot(g111, vec3(Pf1.x, Pf1.y, Pf1.z));

    vec3 fade_xyz = fade(Pf0);
    vec4 n_z = mix(vec4(n000, n100, n010, n110), vec4(n001, n101, n011, n111), fade_xyz.z);
    vec2 n_yz = mix(n_z.xy, n_z.zw, fade_xyz.y);
    float n_xyz = mix(n_yz.x, n_yz.y, fade_xyz.x);
    return 2.2 * n_xyz;
  }

  void main() {
    vHitPos = vHitPosUniform;
    float baseWave = sin(position.x * 0.05 + u_time) * cos(position.y * 0.05 + u_time);
    vBaseWave = baseWave;

    float noise = pnoise(position * 0.02 + u_time * 0.1, vec3(100.0));
    float displacement = mix(baseWave, noise * 40.0, u_waveMix);

    if (u_clickBlend > 0.0) {
      float dist = distance(vHitPos, (modelMatrix * vec4(position, 1.0)).xyz);
      float ripple = sin(dist * 0.1 - u_time * 3.0) * exp(-dist * 0.05 + 1.0);
      displacement += ripple * u_clickBlend;
    }

    gl_Position = projectionMatrix * modelViewMatrix * vec4(position.x, position.y, position.z + displacement, 1.0);
    vPos = position;
  }
`

const fragmentShader = `
  uniform float u_time;
  uniform float u_clickBlend;
  varying float vBaseWave;
  varying vec3 vPos;
  varying vec3 vHitPos;

  void main() {
    float heat = 1.0 - smoothstep(0.0, 15.0, distance(vHitPos, vPos));
    heat *= u_clickBlend;

    vec3 baseColor = vec3(0.05 + vBaseWave * 0.05, 0.05 + vBaseWave * 0.05, 0.15 + vBaseWave * 0.1);
    vec3 energyColor = vec3(0.8, 0.6, 1.0);
    vec3 finalColor = mix(baseColor, energyColor, heat * 0.5);

    vec3 normal = normalize(cross(dFdx(vPos), dFdy(vPos)));
    vec3 lightDir = normalize(vec3(100.0, 100.0, 50.0) - vPos);
    float diff = max(dot(normal, lightDir), 0.0);

    finalColor = finalColor * (0.2 + 0.8 * diff);
    finalColor *= (1.0 + u_clickBlend);

    gl_FragColor = vec4(finalColor, 0.9);
  }
`

export default function QuantumWaveField() {
  const containerRef = useRef<HTMLDivElement>(null)
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
  const frameRef = useRef<number>(0)

  useEffect(() => {
    if (!containerRef.current) return

    const container = containerRef.current
    const width = container.clientWidth
    const height = container.clientHeight

    // Scene setup
    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 5000)
    camera.position.set(0, 0, 1200)

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setSize(width, height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    container.appendChild(renderer.domElement)
    rendererRef.current = renderer

    // Create plane geometry
    const geometry = new THREE.PlaneGeometry(1200, 1200, 120, 120)

    const hitPoint = new THREE.Vector3(0, 0, 0)
    const uniforms = {
      u_time: { value: 0 },
      u_waveMix: { value: 0.5 },
      u_clickBlend: { value: 0 },
      vHitPosUniform: { value: hitPoint },
    }

    const shaderMaterial = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms,
      wireframe: false,
      blending: THREE.AdditiveBlending,
      transparent: true,
      side: THREE.DoubleSide,
    })

    const planeMesh = new THREE.Mesh(geometry, shaderMaterial)
    scene.add(planeMesh)

    // Raycaster for click interaction
    const raycaster = new THREE.Raycaster()
    const mouse = new THREE.Vector2()

    const handleClick = (event: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect()
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1

      raycaster.setFromCamera(mouse, camera)
      const intersects = raycaster.intersectObject(planeMesh)

      if (intersects.length > 0) {
        hitPoint.copy(intersects[0].point)
        shaderMaterial.uniforms.vHitPosUniform.value.copy(hitPoint)

        gsap.to(shaderMaterial.uniforms.u_clickBlend, {
          value: 1,
          duration: 0.15,
          ease: 'power4.out',
        })
        gsap.to(shaderMaterial.uniforms.u_clickBlend, {
          value: 0,
          duration: 1.5,
          delay: 0.5,
          ease: 'power2.inOut',
        })
      }
    }

    renderer.domElement.addEventListener('click', handleClick)

    // Animation loop
    let startTime = performance.now()
    const animate = () => {
      const elapsed = (performance.now() - startTime) / 1000
      shaderMaterial.uniforms.u_time.value = elapsed

      // Gentle rotation
      planeMesh.rotation.z = elapsed * 0.05
      planeMesh.rotation.x = Math.sin(elapsed * 0.1) * 0.1

      renderer.render(scene, camera)
      frameRef.current = requestAnimationFrame(animate)
    }
    animate()

    // Handle resize
    const handleResize = () => {
      const w = container.clientWidth
      const h = container.clientHeight
      camera.aspect = w / h
      camera.updateProjectionMatrix()
      renderer.setSize(w, h)
    }
    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      renderer.domElement.removeEventListener('click', handleClick)
      cancelAnimationFrame(frameRef.current)
      renderer.dispose()
      geometry.dispose()
      shaderMaterial.dispose()
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement)
      }
    }
  }, [])

  return (
    <div
      ref={containerRef}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: 1,
        pointerEvents: 'auto',
        cursor: 'crosshair',
      }}
    />
  )
}
