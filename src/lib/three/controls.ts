import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'

export function createOrbitControls(
  camera: THREE.PerspectiveCamera,
  domElement: HTMLElement
): OrbitControls {
  const controls = new OrbitControls(camera, domElement)

  // 기본 설정
  controls.enableDamping = true
  controls.dampingFactor = 0.05

  // 회전 제한
  controls.maxPolarAngle = Math.PI * 0.75 // 135도까지만 회전
  controls.minPolarAngle = Math.PI * 0.1 // 18도 이상 회전

  // 줌 제한
  controls.minDistance = 2
  controls.maxDistance = 10

  // 팬 제한 (수평 이동 제한)
  controls.enablePan = true
  controls.panSpeed = 0.5

  // 자동 회전 비활성화
  controls.autoRotate = false

  // 모바일 최적화
  controls.touches = {
    ONE: THREE.TOUCH.ROTATE,
    TWO: THREE.TOUCH.DOLLY_PAN
  }

  return controls
}

export function setupCameraInitialPosition(camera: THREE.PerspectiveCamera): void {
  // 책상을 잘 보이는 초기 위치 설정
  camera.position.set(5, 5, 5)
  camera.lookAt(0, 0, 0)
}

export function createPerspectiveCamera(
  fov: number = 75,
  aspect: number = window.innerWidth / window.innerHeight,
  near: number = 0.1,
  far: number = 1000
): THREE.PerspectiveCamera {
  const camera = new THREE.PerspectiveCamera(fov, aspect, near, far)
  setupCameraInitialPosition(camera)
  return camera
}