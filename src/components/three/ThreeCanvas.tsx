'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import * as THREE from 'three'
import { createOrbitControls, createPerspectiveCamera } from '@/lib/three/controls'
import { PerformanceMonitor } from '@/lib/three/performance'
import { SceneObjects } from '@/types/configurator'

interface ThreeCanvasProps {
  onSceneReady?: (sceneObjects: SceneObjects) => void
  onPerformanceUpdate?: (metrics: { fps: number; frameTime: number; memoryUsage?: number }) => void
  onInitError?: (message: string) => void
  className?: string
}

export default function ThreeCanvas({ onSceneReady, onPerformanceUpdate, onInitError, className = '' }: ThreeCanvasProps) {
  console.debug('[ThreeCanvas] function render start')
  const mountRef = useRef<HTMLDivElement | null>(null)
  const [mountReady, setMountReady] = useState(false)
  const [webglSupported, setWebglSupported] = useState<boolean | null>(null)
  const [error, setError] = useState<string | null>(null)
  const sceneObjectsRef = useRef<SceneObjects | null>(null)

  // Store latest callbacks in refs to avoid useEffect re-runs
  const onSceneReadyRef = useRef(onSceneReady)
  const onPerformanceUpdateRef = useRef(onPerformanceUpdate)
  const onInitErrorRef = useRef(onInitError)

  // Update refs when callbacks change
  useEffect(() => {
    onSceneReadyRef.current = onSceneReady
  }, [onSceneReady])

  useEffect(() => {
    onPerformanceUpdateRef.current = onPerformanceUpdate
  }, [onPerformanceUpdate])

  useEffect(() => {
    onInitErrorRef.current = onInitError
  }, [onInitError])

  // mountReady 상태 변화 로깅
  useEffect(() => {
    console.debug('[ThreeCanvas] mountReady changed:', mountReady)
  }, [mountReady])

  // callback ref: ref가 실제 DOM에 붙은 이후에 초기화를 보장
  const setMount = useCallback((node: HTMLDivElement | null) => {
    console.debug('[ThreeCanvas] setMount called:', !!node)
    mountRef.current = node
    if (node) setMountReady(true)
  }, [])

  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return

    try {
      console.debug('[ThreeCanvas] init start. size:', mount.clientWidth, mount.clientHeight)
      // WebGL 호환성 검사
      const canvas = document.createElement('canvas')
      const gl = canvas.getContext('webgl2') || canvas.getContext('webgl')

      console.debug('[ThreeCanvas] webgl context acquired:', !!gl)
      if (!gl) {
        setWebglSupported(false)
        setError('WebGL이 지원되지 않는 브라우저입니다.')
        // 부모에 초기화 실패 알림 (로딩 해제/폴백 UI 전환)
        if (onInitErrorRef.current) {
          onInitErrorRef.current('WebGL not supported')
        }
        return
      }

      setWebglSupported(true)
      console.debug('[ThreeCanvas] setWebglSupported(true) applied')

      // Three.js 기본 설정
      const scene = new THREE.Scene()
      scene.background = new THREE.Color(0xf0f0f0)
      console.debug('[ThreeCanvas] scene created')

      // 카메라 생성
      const camera = createPerspectiveCamera(
        75,
        mount.clientWidth / mount.clientHeight
      )
      console.debug('[ThreeCanvas] camera created')

      // 렌더러 생성
      const renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        powerPreference: 'high-performance'
      })

      renderer.setSize(mount.clientWidth, mount.clientHeight)
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)) // 모바일 성능 최적화
      renderer.shadowMap.enabled = true
      renderer.shadowMap.type = THREE.PCFSoftShadowMap

      mount.appendChild(renderer.domElement)
      console.debug('[ThreeCanvas] renderer appended')

      // 조명 설정
      const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8)
      directionalLight.position.set(1, 1, 1)
      directionalLight.castShadow = true
      directionalLight.shadow.mapSize.width = 2048
      directionalLight.shadow.mapSize.height = 2048
      scene.add(directionalLight)

      const ambientLight = new THREE.AmbientLight(0x404040, 0.4)
      scene.add(ambientLight)

      // 컨트롤 설정
      const controls = createOrbitControls(camera, renderer.domElement)
      console.debug('[ThreeCanvas] controls created')

      // 임시 책상 메시 (빈 메시로 시작)
      const tempGeometry = new THREE.BoxGeometry(1, 1, 1)
      const tempMaterial = new THREE.MeshPhongMaterial({ color: 0xcccccc })
      const deskMesh = new THREE.Mesh(tempGeometry, tempMaterial)

      // SceneObjects 객체 생성
      const sceneObjects: SceneObjects = {
        scene,
        camera,
        renderer,
        controls,
        deskMesh,
        lights: {
          directional: directionalLight,
          ambient: ambientLight
        }
      }

      sceneObjectsRef.current = sceneObjects

      // 부모 컴포넌트에 씬 객체 전달 (ref 사용으로 stale closure 방지)
      if (onSceneReadyRef.current) {
        console.debug('[ThreeCanvas] calling onSceneReady')
        onSceneReadyRef.current(sceneObjects)
      }

      // 성능 모니터링 설정
      const performanceMonitor = new PerformanceMonitor()

      // 렌더링 루프
      let firstFrameLogged = false
      function animate() {
        requestAnimationFrame(animate)

        // 성능 메트릭 업데이트 (ref 사용으로 stale closure 방지)
        const metrics = performanceMonitor.update()
        if (onPerformanceUpdateRef.current) {
          onPerformanceUpdateRef.current(metrics)
        }

        controls.update()
        renderer.render(scene, camera)
        if (!firstFrameLogged) {
          firstFrameLogged = true
          console.debug('[ThreeCanvas] first frame rendered')
        }
      }
      animate()

      // 리사이즈 핸들러
      function handleResize() {
        if (!mount) return

        const width = mount.clientWidth
        const height = mount.clientHeight

        camera.aspect = width / height
        camera.updateProjectionMatrix()
        renderer.setSize(width, height)
      }

      window.addEventListener('resize', handleResize)

      // 정리 함수
      return () => {
        window.removeEventListener('resize', handleResize)

        if (mount && renderer.domElement) {
          mount.removeChild(renderer.domElement)
        }

        controls.dispose()
        renderer.dispose()
        tempGeometry.dispose()
        tempMaterial.dispose()
      }

    } catch (err) {
      console.error('Three.js 초기화 오류:', err)
      setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.')
      setWebglSupported(false)
      if (onInitErrorRef.current) {
        onInitErrorRef.current(err instanceof Error ? err.message : 'Unknown init error')
      }
    }
    // Empty dependency array: only run once on mount
    // Callbacks are accessed via refs to avoid re-runs
  }, [mountReady])

  // 항상 캔버스 컨테이너를 렌더하고, 로딩/에러는 오버레이로 표시
  return (
    <div className={`relative ${className}`} style={{ width: '100%', height: '100%' }}>
      <div ref={setMount} className="w-full h-full" />

      {webglSupported === null && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
            <p className="text-gray-600">3D 환경 초기화 중...</p>
          </div>
        </div>
      )}

      {webglSupported === false && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
          <div className="text-center p-8">
            <div className="text-red-500 text-lg mb-2">⚠️ WebGL 지원 안됨</div>
            <p className="text-gray-600">
              {error || '이 브라우저는 3D 기능을 지원하지 않습니다.'}
            </p>
            <p className="text-sm text-gray-500 mt-2">최신 브라우저를 사용해주세요.</p>
          </div>
        </div>
      )}
    </div>
  )
}

