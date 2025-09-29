import * as THREE from 'three'

export const DEFAULT_DIMENSIONS = {
  width: 1.2, // 120cm
  depth: 0.6, // 60cm
  height: 0.75 // 75cm
}

export const DIMENSION_LIMITS = {
  width: { min: 0.8, max: 2.0, step: 0.01 }, // 80cm - 200cm
  depth: { min: 0.4, max: 0.8, step: 0.01 }, // 40cm - 80cm
  height: { min: 0.7, max: 0.85, step: 0.01 } // 70cm - 85cm
}

export function createDeskGeometry(
  width: number = DEFAULT_DIMENSIONS.width,
  depth: number = DEFAULT_DIMENSIONS.depth,
  height: number = DEFAULT_DIMENSIONS.height
): THREE.BoxGeometry {
  return new THREE.BoxGeometry(width, height * 0.1, depth) // 상판 두께는 높이의 10%
}

export function createDeskMesh(
  geometry: THREE.BoxGeometry,
  material: THREE.Material
): THREE.Mesh {
  const mesh = new THREE.Mesh(geometry, material)

  // 그림자 설정
  mesh.castShadow = true
  mesh.receiveShadow = true

  // 책상을 바닥에 위치시킴
  mesh.position.y = 0

  return mesh
}

export function updateDeskDimensions(
  mesh: THREE.Mesh,
  newDimensions: { width?: number; depth?: number; height?: number }
) {
  const currentGeometry = mesh.geometry as THREE.BoxGeometry
  const currentWidth = currentGeometry.parameters.width
  const currentHeight = currentGeometry.parameters.height
  const currentDepth = currentGeometry.parameters.depth

  const width = newDimensions.width ?? currentWidth
  const height = newDimensions.height ?? currentHeight * 10 // 높이에서 두께 복원
  const depth = newDimensions.depth ?? currentDepth

  // 기존 지오메트리 dispose
  currentGeometry.dispose()

  // 새 지오메트리 생성 및 적용
  mesh.geometry = createDeskGeometry(width, depth, height)
}