import * as THREE from 'three'
import { Material, MaterialProperties } from '@/types/configurator'

export const MATERIAL_CONFIGS: Material[] = [
  {
    id: 'wood',
    name: '원목',
    color: '#D2691E', // 샌들우드
    properties: {
      type: 'wood',
      metalness: 0.0,
      roughness: 0.8
    }
  },
  {
    id: 'mdf',
    name: 'MDF',
    color: '#F5DEB3', // 휘트
    properties: {
      type: 'mdf',
      metalness: 0.0,
      roughness: 0.9
    }
  },
  {
    id: 'steel',
    name: '스틸',
    color: '#708090', // 슬레이트그레이
    properties: {
      type: 'steel',
      metalness: 0.8,
      roughness: 0.2
    }
  }
]

export function createMaterial(materialConfig: Material): THREE.Material {
  const { properties } = materialConfig

  switch (properties.type) {
    case 'wood':
      return new THREE.MeshPhongMaterial({
        color: materialConfig.color,
        shininess: 30
      })

    case 'mdf':
      return new THREE.MeshLambertMaterial({
        color: materialConfig.color
      })

    case 'steel':
      return new THREE.MeshStandardMaterial({
        color: materialConfig.color,
        metalness: properties.metalness || 0.8,
        roughness: properties.roughness || 0.2
      })

    default:
      return new THREE.MeshPhongMaterial({
        color: materialConfig.color
      })
  }
}

export function getMaterialById(id: string): Material | undefined {
  return MATERIAL_CONFIGS.find(material => material.id === id)
}

export function getDefaultMaterial(): Material {
  return MATERIAL_CONFIGS[0] // 원목이 기본값
}