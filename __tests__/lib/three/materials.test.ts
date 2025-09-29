import { createMaterial, getMaterialById, getDefaultMaterial, MATERIAL_CONFIGS } from '@/lib/three/materials'
import * as THREE from 'three'

describe('Materials Library', () => {
  describe('MATERIAL_CONFIGS', () => {
    test('should have all required materials', () => {
      const expectedMaterials = ['wood', 'mdf', 'steel']
      const actualMaterials = MATERIAL_CONFIGS.map(m => m.id)

      expect(actualMaterials).toEqual(expect.arrayContaining(expectedMaterials))
      expect(actualMaterials).toHaveLength(3)
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