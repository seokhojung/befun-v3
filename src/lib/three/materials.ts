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
  },
  {
    id: 'metal',
    name: '메탈',
    color: '#C0C0C0', // 실버
    properties: {
      type: 'metal',
      metalness: 1.0,
      roughness: 0.1
    }
  },
  {
    id: 'glass',
    name: '유리',
    color: '#E0F7FA', // 라이트 시안
    properties: {
      type: 'glass',
      metalness: 0.0,
      roughness: 0.05
    }
  },
  {
    id: 'fabric',
    name: '패브릭',
    color: '#8D6E63', // 브라운 그레이
    properties: {
      type: 'fabric',
      metalness: 0.0,
      roughness: 1.0
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

    case 'metal':
      return new THREE.MeshStandardMaterial({
        color: materialConfig.color,
        metalness: properties.metalness || 1.0,
        roughness: properties.roughness || 0.1
      })

    case 'glass':
      return new THREE.MeshPhysicalMaterial({
        color: materialConfig.color,
        metalness: properties.metalness || 0.0,
        roughness: properties.roughness || 0.05,
        transmission: 0.9,
        transparent: true,
        opacity: 0.5
      })

    case 'fabric':
      return new THREE.MeshLambertMaterial({
        color: materialConfig.color
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