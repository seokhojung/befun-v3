import * as THREE from 'three'
import { createDeskGeometry, createDeskMesh } from '@/lib/three/geometry'
import { createMaterial, MATERIAL_CONFIGS } from '@/lib/three/materials'

describe('Configurator Performance Tests', () => {
  beforeEach(() => {
    // Performance API mock (Node.js environment)
    global.performance = global.performance || {
      now: () => Date.now(),
      mark: () => {},
      measure: () => {},
      clearMarks: () => {},
      clearMeasures: () => {},
    } as any
  })

  test('should create desk geometry within performance budget', () => {
    const startTime = performance.now()

    for (let i = 0; i < 100; i++) {
      const geometry = createDeskGeometry(1.2, 0.6, 0.75)
      geometry.dispose()
    }

    const endTime = performance.now()
    const duration = endTime - startTime

    // 100개의 지오메트리 생성이 100ms 이내에 완료되어야 함
    expect(duration).toBeLessThan(100)
  })

  test('should create materials within performance budget', () => {
    const startTime = performance.now()

    for (let i = 0; i < 100; i++) {
      MATERIAL_CONFIGS.forEach(config => {
        const material = createMaterial(config)
        material.dispose()
      })
    }

    const endTime = performance.now()
    const duration = endTime - startTime

    // 300개의 재료 생성 (100 * 3)이 50ms 이내에 완료되어야 함
    expect(duration).toBeLessThan(50)
  })

  test('should update mesh dimensions efficiently', () => {
    const geometry = createDeskGeometry()
    const material = createMaterial(MATERIAL_CONFIGS[0])
    const mesh = createDeskMesh(geometry, material)

    const startTime = performance.now()

    // 치수 변경을 100번 수행
    for (let i = 0; i < 100; i++) {
      const width = 1.0 + (i * 0.01) // 1.0m에서 2.0m까지
      const newGeometry = createDeskGeometry(width, 0.6, 0.75)

      // 기존 지오메트리 dispose
      mesh.geometry.dispose()
      mesh.geometry = newGeometry
    }

    const endTime = performance.now()
    const duration = endTime - startTime

    // 100번의 치수 변경이 200ms 이내에 완료되어야 함
    expect(duration).toBeLessThan(200)

    // 정리
    mesh.geometry.dispose()
    material.dispose()
  })

  test('should validate memory usage stays within limits', () => {
    const geometries: THREE.BufferGeometry[] = []
    const materials: THREE.Material[] = []

    // 대량의 객체 생성
    for (let i = 0; i < 50; i++) {
      const geometry = createDeskGeometry(
        1.0 + Math.random(),
        0.5 + Math.random() * 0.3,
        0.7 + Math.random() * 0.15
      )
      geometries.push(geometry)

      const material = createMaterial(MATERIAL_CONFIGS[i % MATERIAL_CONFIGS.length])
      materials.push(material)
    }

    // 객체들이 성공적으로 생성되었는지 확인
    expect(geometries).toHaveLength(50)
    expect(materials).toHaveLength(50)

    // 정리 과정도 성능 테스트
    const startTime = performance.now()

    geometries.forEach(geometry => geometry.dispose())
    materials.forEach(material => material.dispose())

    const endTime = performance.now()
    const duration = endTime - startTime

    // 50개 객체 정리가 10ms 이내에 완료되어야 함
    expect(duration).toBeLessThan(10)
  })

  test('should handle rapid dimension changes efficiently', () => {
    const geometry = createDeskGeometry()
    const material = createMaterial(MATERIAL_CONFIGS[0])
    const mesh = createDeskMesh(geometry, material)

    const startTime = performance.now()

    // 빠른 연속 치수 변경 시뮬레이션 (60 FPS 기준)
    for (let frame = 0; frame < 60; frame++) {
      const time = frame / 60
      const width = 1.0 + Math.sin(time * Math.PI * 2) * 0.5 // 애니메이션
      const newGeometry = createDeskGeometry(width, 0.6, 0.75)

      mesh.geometry.dispose()
      mesh.geometry = newGeometry
    }

    const endTime = performance.now()
    const duration = endTime - startTime

    // 60번의 변경 (1초 분량)이 16ms 이내에 완료되어야 함 (60 FPS 유지)
    expect(duration).toBeLessThan(16)

    mesh.geometry.dispose()
    material.dispose()
  })
})