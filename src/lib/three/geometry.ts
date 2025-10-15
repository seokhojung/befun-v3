import * as THREE from 'three'

// Units: meters (Three.js). Desk spec uses centimeters; convert at call sites.
export const TOP_THICKNESS_M = 0.03 // 3cm
export const LEG_THICKNESS_M = 0.05 // 5cm (square leg)
export const LEG_INSET_M = 0.05 // 5cm inset from each edge

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
  _height: number = DEFAULT_DIMENSIONS.height
): THREE.BoxGeometry {
  // 상판 두께는 상수 사용 (TOP_THICKNESS_M)
  return new THREE.BoxGeometry(width, TOP_THICKNESS_M, depth)
}

export function createDeskMesh(
  geometry: THREE.BoxGeometry,
  material: THREE.Material
): THREE.Mesh {
  const mesh = new THREE.Mesh(geometry, material)

  // 그림자 설정
  mesh.castShadow = true
  mesh.receiveShadow = true

  // 상판 중심을 (height/2)로 올리므로, 상판 자체는 바닥에서 TOP_THICKNESS_M/2 만큼 위치하게 함
  mesh.position.y = TOP_THICKNESS_M / 2

  return mesh
}

export function updateDeskDimensions(
  mesh: THREE.Mesh,
  newDimensions: { width?: number; depth?: number; height?: number }
) {
  const currentGeometry = mesh.geometry as THREE.BoxGeometry
  const currentWidth = currentGeometry.parameters.width
  const currentTop = currentGeometry.parameters.height
  const currentDepth = currentGeometry.parameters.depth

  const width = newDimensions.width ?? currentWidth
  const height = newDimensions.height ?? (TOP_THICKNESS_M + 0.7) // fallback, 실제 값 필요 없음 여기선
  const depth = newDimensions.depth ?? currentDepth

  // 기존 지오메트리 dispose
  currentGeometry.dispose()

  // 새 지오메트리 생성 및 적용
  mesh.geometry = createDeskGeometry(width, depth, height)

  // 상판 위치 조정
  mesh.position.y = TOP_THICKNESS_M / 2

  // 다리 업데이트
  updateDeskLegs(mesh, width, depth, height)
}

/**
 * 상판 메시에 4개의 다리를 자식으로 부착합니다. 다리는 "desk-leg" 이름을 갖습니다.
 */
export function attachDeskLegs(
  mesh: THREE.Mesh,
  width: number,
  depth: number,
  height: number,
  material?: THREE.Material
) {
  // 기존 다리 제거
  const toRemove: THREE.Object3D[] = []
  mesh.children.forEach((c) => { if (c.name === 'desk-leg') toRemove.push(c) })
  toRemove.forEach((c) => mesh.remove(c))

  const legHeight = Math.max(height - TOP_THICKNESS_M, 0.01)
  const legGeom = new THREE.BoxGeometry(LEG_THICKNESS_M, legHeight, LEG_THICKNESS_M)
  const legMat = material || new THREE.MeshStandardMaterial({ color: '#888888', roughness: 0.6 })

  const halfW = width / 2 - LEG_INSET_M - LEG_THICKNESS_M / 2
  const halfD = depth / 2 - LEG_INSET_M - LEG_THICKNESS_M / 2

  const positions: Array<[number, number]> = [
    [ halfW,  halfD],
    [-halfW,  halfD],
    [ halfW, -halfD],
    [-halfW, -halfD],
  ]

  positions.forEach(([px, pz]) => {
    const leg = new THREE.Mesh(legGeom.clone(), legMat)
    leg.name = 'desk-leg'
    leg.castShadow = true
    leg.receiveShadow = true
    // 다리의 중심 y는 legHeight/2 이고, 상판 하단은 y=0 이므로 바로 배치
    leg.position.set(px, -TOP_THICKNESS_M / 2 - legHeight / 2, pz)
    mesh.add(leg)
  })
}

export function updateDeskLegs(
  mesh: THREE.Mesh,
  width: number,
  depth: number,
  height: number
) {
  const legHeight = Math.max(height - TOP_THICKNESS_M, 0.01)
  const halfW = width / 2 - LEG_INSET_M - LEG_THICKNESS_M / 2
  const halfD = depth / 2 - LEG_INSET_M - LEG_THICKNESS_M / 2
  const targets: Array<[number, number]> = [
    [ halfW,  halfD],
    [-halfW,  halfD],
    [ halfW, -halfD],
    [-halfW, -halfD],
  ]
  let idx = 0
  mesh.children.forEach((c) => {
    if (c.name === 'desk-leg' && (c as THREE.Mesh).geometry instanceof THREE.BoxGeometry) {
      const leg = c as THREE.Mesh
      // 재생성하여 높이 반영
      const oldGeom = leg.geometry as THREE.BoxGeometry
      oldGeom.dispose()
      leg.geometry = new THREE.BoxGeometry(LEG_THICKNESS_M, legHeight, LEG_THICKNESS_M)
      const [px, pz] = targets[idx] || [0,0]
      leg.position.set(px, -TOP_THICKNESS_M / 2 - legHeight / 2, pz)
      idx++
    }
  })
  // 다리가 없었다면 부착
  if (idx === 0) {
    attachDeskLegs(mesh, width, depth, height)
  }
}
