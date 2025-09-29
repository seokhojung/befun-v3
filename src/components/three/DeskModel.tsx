'use client'

import { useEffect } from 'react'
import * as THREE from 'three'
import { createDeskGeometry, createDeskMesh, updateDeskDimensions } from '@/lib/three/geometry'
import { createMaterial, getDefaultMaterial, getMaterialById } from '@/lib/three/materials'
import { SceneObjects, ConfiguratorSettings } from '@/types/configurator'

interface DeskModelProps {
  sceneObjects: SceneObjects
  settings: ConfiguratorSettings
  onSettingsChange?: (settings: ConfiguratorSettings) => void
}

export default function DeskModel({ sceneObjects, settings, onSettingsChange }: DeskModelProps) {

  useEffect(() => {
    if (!sceneObjects) return

    const { scene, deskMesh } = sceneObjects

    // 기존 책상이 씬에 있으면 제거
    if (scene.children.includes(deskMesh)) {
      scene.remove(deskMesh)
    }

    // 새로운 책상 지오메트리 생성
    const geometry = createDeskGeometry(
      settings.dimensions.width,
      settings.dimensions.depth,
      settings.dimensions.height
    )

    // 재료 설정
    const materialConfig = getMaterialById(settings.material) || getDefaultMaterial()
    const material = createMaterial(materialConfig)

    // 새로운 메시 생성
    const newDeskMesh = createDeskMesh(geometry, material)

    // SceneObjects의 deskMesh 업데이트
    sceneObjects.deskMesh = newDeskMesh

    // 씬에 추가
    scene.add(newDeskMesh)

    return () => {
      // 정리 함수
      geometry.dispose()
      if (material instanceof THREE.Material) {
        material.dispose()
      }
    }

  }, [sceneObjects, settings])

  useEffect(() => {
    // 재료 변경만 처리 - 메모리 누수 방지를 위해 cleanup 최적화
    if (!sceneObjects?.deskMesh) return

    const materialConfig = getMaterialById(settings.material) || getDefaultMaterial()
    const newMaterial = createMaterial(materialConfig)

    // 기존 재료 dispose
    const oldMaterial = sceneObjects.deskMesh.material
    if (oldMaterial instanceof THREE.Material) {
      oldMaterial.dispose()
    }

    // 새 재료 적용
    sceneObjects.deskMesh.material = newMaterial

    // cleanup에서 dispose하지 않음 - 메시가 사용 중
    // dispose는 컴포넌트가 언마운트될 때만 수행

  }, [settings.material, sceneObjects])

  useEffect(() => {
    // 치수 변경만 처리 - 불필요한 재렌더링 방지
    if (!sceneObjects?.deskMesh) return

    updateDeskDimensions(sceneObjects.deskMesh, settings.dimensions)

  }, [settings.dimensions, sceneObjects])

  // 이 컴포넌트는 UI를 렌더링하지 않음
  return null
}