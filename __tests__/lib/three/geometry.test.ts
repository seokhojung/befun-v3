import {
  createDeskGeometry,
  createDeskMesh,
  updateDeskDimensions,
  DEFAULT_DIMENSIONS,
  DIMENSION_LIMITS
} from '@/lib/three/geometry'
import * as THREE from 'three'

describe('Geometry Library', () => {
  describe('DEFAULT_DIMENSIONS', () => {
    test('should have valid default dimensions', () => {
      expect(DEFAULT_DIMENSIONS.width).toBe(1.2)
      expect(DEFAULT_DIMENSIONS.depth).toBe(0.6)
      expect(DEFAULT_DIMENSIONS.height).toBe(0.75)
    })
  })

  describe('DIMENSION_LIMITS', () => {
    test('should have valid dimension limits', () => {
      expect(DIMENSION_LIMITS.width.min).toBe(0.8)
      expect(DIMENSION_LIMITS.width.max).toBe(2.0)
      expect(DIMENSION_LIMITS.depth.min).toBe(0.4)
      expect(DIMENSION_LIMITS.depth.max).toBe(0.8)
      expect(DIMENSION_LIMITS.height.min).toBe(0.7)
      expect(DIMENSION_LIMITS.height.max).toBe(0.85)
    })
  })

  describe('createDeskGeometry', () => {
    test('should create geometry with default dimensions', () => {
      const geometry = createDeskGeometry()

      expect(geometry).toBeInstanceOf(THREE.BoxGeometry)
      expect(geometry.parameters.width).toBeCloseTo(1.2)
      expect(geometry.parameters.height).toBeCloseTo(0.075) // 75cm * 0.1
      expect(geometry.parameters.depth).toBeCloseTo(0.6)
    })

    test('should create geometry with custom dimensions', () => {
      const geometry = createDeskGeometry(1.5, 0.8, 0.8)

      expect(geometry.parameters.width).toBeCloseTo(1.5)
      expect(geometry.parameters.height).toBeCloseTo(0.08) // 80cm * 0.1
      expect(geometry.parameters.depth).toBeCloseTo(0.8)
    })
  })

  describe('createDeskMesh', () => {
    test('should create mesh with correct properties', () => {
      const geometry = createDeskGeometry()
      const material = new THREE.MeshPhongMaterial({ color: 0xcccccc })
      const mesh = createDeskMesh(geometry, material)

      expect(mesh).toBeInstanceOf(THREE.Mesh)
      expect(mesh.geometry).toBe(geometry)
      expect(mesh.material).toBe(material)
      expect(mesh.castShadow).toBe(true)
      expect(mesh.receiveShadow).toBe(true)
      expect(mesh.position.y).toBe(0)
    })
  })

  describe('updateDeskDimensions', () => {
    test('should update mesh dimensions correctly', () => {
      const geometry = createDeskGeometry()
      const material = new THREE.MeshPhongMaterial({ color: 0xcccccc })
      const mesh = createDeskMesh(geometry, material)

      updateDeskDimensions(mesh, { width: 1.8, depth: 0.7, height: 0.8 })

      const newGeometry = mesh.geometry as THREE.BoxGeometry
      expect(newGeometry.parameters.width).toBeCloseTo(1.8)
      expect(newGeometry.parameters.depth).toBeCloseTo(0.7)
      expect(newGeometry.parameters.height).toBeCloseTo(0.08) // 80cm * 0.1
    })

    test('should update only specified dimensions', () => {
      const geometry = createDeskGeometry()
      const material = new THREE.MeshPhongMaterial({ color: 0xcccccc })
      const mesh = createDeskMesh(geometry, material)

      updateDeskDimensions(mesh, { width: 1.5 })

      const newGeometry = mesh.geometry as THREE.BoxGeometry
      expect(newGeometry.parameters.width).toBe(1.5)
      expect(newGeometry.parameters.depth).toBe(0.6) // unchanged
    })
  })
})