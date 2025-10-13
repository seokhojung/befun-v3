import { createMaterial, getMaterialById, getDefaultMaterial, MATERIAL_CONFIGS } from '@/lib/three/materials'
import * as THREE from 'three'

describe('Materials Library', () => {
  describe('MATERIAL_CONFIGS', () => {
    test('should include baseline required materials and allow extensions', () => {
      const required = ['wood', 'mdf', 'steel']
      const actual = MATERIAL_CONFIGS.map(m => m.id)

      // 최소 요구 소재는 포함되어야 함
      expect(actual).toEqual(expect.arrayContaining(required))
      // 확장 소재 허용: 전체 개수는 최소 3 이상
      expect(actual.length).toBeGreaterThanOrEqual(required.length)
    })

    test('should have valid color values', () => {
      MATERIAL_CONFIGS.forEach(material => {
        expect(material.color).toMatch(/^#[0-9A-Fa-f]{6}$/)
      })
    })
  })

  describe('createMaterial', () => {
    test('should create MeshPhongMaterial for wood', () => {
      const woodConfig = getMaterialById('wood')!
      const material = createMaterial(woodConfig)

      expect(material).toBeInstanceOf(THREE.MeshPhongMaterial)
      expect((material as THREE.MeshPhongMaterial).color.getHex()).toBe(0xD2691E)
    })

    test('should create MeshLambertMaterial for MDF', () => {
      const mdfConfig = getMaterialById('mdf')!
      const material = createMaterial(mdfConfig)

      expect(material).toBeInstanceOf(THREE.MeshLambertMaterial)
      expect((material as THREE.MeshLambertMaterial).color.getHex()).toBe(0xF5DEB3)
    })

    test('should create MeshStandardMaterial for steel', () => {
      const steelConfig = getMaterialById('steel')!
      const material = createMaterial(steelConfig)

      expect(material).toBeInstanceOf(THREE.MeshStandardMaterial)
      expect((material as THREE.MeshStandardMaterial).color.getHex()).toBe(0x708090)
      expect((material as THREE.MeshStandardMaterial).metalness).toBe(0.8)
      expect((material as THREE.MeshStandardMaterial).roughness).toBe(0.2)
    })
  })

  describe('getMaterialById', () => {
    test('should return correct material for valid ID', () => {
      const material = getMaterialById('wood')
      expect(material?.id).toBe('wood')
      expect(material?.name).toBe('원목')
    })

    test('should return undefined for invalid ID', () => {
      const material = getMaterialById('invalid')
      expect(material).toBeUndefined()
    })
  })

  describe('getDefaultMaterial', () => {
    test('should return wood as default material', () => {
      const defaultMaterial = getDefaultMaterial()
      expect(defaultMaterial.id).toBe('wood')
      expect(defaultMaterial.name).toBe('원목')
    })
  })
})
