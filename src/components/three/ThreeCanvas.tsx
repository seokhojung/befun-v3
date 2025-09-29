'use client'

import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { createOrbitControls, createPerspectiveCamera } from '@/lib/three/controls'
import { PerformanceMonitor } from '@/lib/three/performance'
import { SceneObjects } from '@/types/configurator'

interface ThreeCanvasProps {
  onSceneReady?: (sceneObjects: SceneObjects) => void
  onPerformanceUpdate?: (metrics: { fps: number; frameTime: number; memoryUsage?: number }) => void
  className?: string
}

export default function ThreeCanvas({ onSceneReady, onPerformanceUpdate, className = '' }: ThreeCanvasProps) {
  const mountRef = useRef<HTMLDivElement>(null)
  const [webglSupported, setWebglSupported] = useState<boolean | null>(null)
  const [error, setError] = useState<string | null>(null)
  const sceneObjectsRef = useRef<SceneObjects | null>(null)

  useEffect(() => {
    if (!mountRef.current) return

    const mount = mountRef.current

    try {
      // WebGL 호환성 검사
      const canvas = document.createElement('canvas')
      const gl = canvas.getContext('webgl2') || canvas.getContext('webgl')

      if (!gl) {
        setWebglSupported(false)
        setError('WebGL이 지원되지 않는 브라우저입니다.')
        return
      }

      setWebglSupported(true)

      // Three.js 기본 설정
      const scene = new THREE.Scene()
      scene.background = new THREE.Color(0xf0f0f0)

      // 카메라 생성
      const camera = createPerspectiveCamera(
        75,
        mount.clientWidth / mount.clientHeight
      )

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

      // 부모 컴포넌트에 씬 객체 전달
      if (onSceneReady) {
        onSceneReady(sceneObjects)
      }

      // 성능 모니터링 설정
      const performanceMonitor = new PerformanceMonitor()

      // 렌더링 루프
      function animate() {
        requestAnimationFrame(animate)

        // 성능 메트릭 업데이트
        const metrics = performanceMonitor.update()
        if (onPerformanceUpdate) {
          onPerformanceUpdate(metrics)
        }

        controls.update()
        renderer.render(scene, camera)
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
    }
  }, [onSceneReady, onPerformanceUpdate])

  if (webglSupported === false) {
    return (
      <div className={`flex items-center justify-center bg-gray-100 ${className}`}>
        <div className="text-center p-8">
          <div className="text-red-500 text-lg mb-2">⚠️ WebGL 지원 안됨</div>
          <p className="text-gray-600">
            {error || '이 브라우저는 3D 기능을 지원하지 않습니다.'}
          </p>
          <p className="text-sm text-gray-500 mt-2">
            최신 브라우저를 사용해주세요.
          </p>
        </div>
      </div>
    )
  }

  if (webglSupported === null) {
    return (
      <div className={`flex items-center justify-center bg-gray-50 ${className}`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
          <p className="text-gray-600">3D 환경 초기화 중...</p>
        </div>
      </div>
    )
  }

  return (
    <div
      ref={mountRef}
      className={className}
      style={{ width: '100%', height: '100%' }}
    />
  )
}