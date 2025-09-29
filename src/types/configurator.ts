import * as THREE from 'three'

export interface Material {
  id: string
  name: string
  color: string
  texture?: string
  properties: MaterialProperties
}

export interface MaterialProperties {
  metalness?: number
  roughness?: number
  type: 'wood' | 'mdf' | 'steel'
}

export interface DimensionRange {
  min: number
  max: number
  default: number
  step: number
}

export interface ConfiguratorSettings {
  material: string
  dimensions: {
    width: number
    depth: number
    height: number
  }
}

export interface ConfiguratorData {
  materials: Material[]
  dimensions: {
    width: DimensionRange
    depth: DimensionRange
    height: DimensionRange
  }
  defaultSettings: ConfiguratorSettings
}

export interface SceneObjects {
  scene: THREE.Scene
  camera: THREE.PerspectiveCamera
  renderer: THREE.WebGLRenderer
  controls: import('three/examples/jsm/controls/OrbitControls.js').OrbitControls
  deskMesh: THREE.Mesh
  lights: {
    directional: THREE.DirectionalLight
    ambient: THREE.AmbientLight
  }
}

export interface ConfiguratorState {
  isLoading: boolean
  error: string | null
  currentMaterial: string
  dimensions: {
    width: number
    depth: number
    height: number
  }
  performance: {
    fps: number
    frameTime: number
    memoryUsage?: number
  }
}