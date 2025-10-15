'use client'

import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { createDeskGeometry, createDeskMesh, updateDeskDimensions, attachDeskLegs, TOP_THICKNESS_M } from '@/lib/three/geometry'
import { createMaterial, getDefaultMaterial, getMaterialById } from '@/lib/three/materials'
import { SceneObjects, ConfiguratorSettings } from '@/types/configurator'
import { snapAndValidate, formatValidationMessage } from '@/lib/three/desk-validation'
import { toast } from '@/hooks/use-toast'

interface DeskModelProps {
  sceneObjects: SceneObjects
  settings: ConfiguratorSettings
  onSettingsChange?: (settings: ConfiguratorSettings) => void
}

export default function DeskModel({ sceneObjects, settings, onSettingsChange }: DeskModelProps) {
  const fpsSamples = useRef<number[]>([])
  const rafRef = useRef<number | null>(null)

  useEffect(() => {
    if (!sceneObjects) return

    const { scene, deskMesh } = sceneObjects

    // 기존 책상이 씬에 있으면 제거
    if (scene.children.includes(deskMesh)) {
      scene.remove(deskMesh)
    }

    const t0 = performance.now()
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
    // 다리 부착
    attachDeskLegs(newDeskMesh, settings.dimensions.width, settings.dimensions.depth, settings.dimensions.height, material)

    // SceneObjects의 deskMesh 업데이트
    sceneObjects.deskMesh = newDeskMesh

    // 씬에 추가
    scene.add(newDeskMesh)

    const initMs = Math.round(performance.now() - t0)
    console.log('perf:desk:init_ms', initMs)

    // 5초간 FPS 측정
    fpsSamples.current = []
    let last = performance.now()
    const loop = () => {
      const now = performance.now()
      const dt = now - last
      last = now
      const fps = 1000 / (dt || 16.7)
      fpsSamples.current.push(fps)
      if (fpsSamples.current.length < 300) {
        rafRef.current = requestAnimationFrame(loop)
      } else {
        const avg = Math.round(fpsSamples.current.reduce((a,b)=>a+b,0) / fpsSamples.current.length)
        const min = Math.round(Math.min(...fpsSamples.current))
        console.log('perf:desk:fps_avg', avg)
        console.log('perf:desk:fps_min', min)
      }
    }
    rafRef.current = requestAnimationFrame(loop)

    return () => {
      // 정리 함수
      geometry.dispose()
      if (material instanceof THREE.Material) {
        material.dispose()
      }
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
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
    if (!sceneObjects?.deskMesh) return

    const { snappedMeters: snapped, invalidField } = snapAndValidate(settings.dimensions)
    const changed = snapped.width !== settings.dimensions.width || snapped.depth !== settings.dimensions.depth || snapped.height !== settings.dimensions.height
    if (changed && onSettingsChange) {
      onSettingsChange({ ...settings, dimensions: snapped })
    }

    // 경계/스냅 피드백: Outline + 토스트
    const outline = ensureOutline(sceneObjects.deskMesh)
    if (invalidField) {
      outline.visible = true
      toast({ title: '입력값이 올바르지 않습니다', description: formatValidationMessage(invalidField), variant: 'destructive' as any })
    } else {
      outline.visible = false
      updateDeskDimensions(sceneObjects.deskMesh, snapped)
    }

  }, [settings.dimensions, sceneObjects, onSettingsChange, settings])

  function ensureOutline(mesh: THREE.Mesh): THREE.LineSegments {
    const existing = mesh.getObjectByName('desk-outline') as THREE.LineSegments | null
    if (existing) return existing
    const edges = new THREE.EdgesGeometry(mesh.geometry)
    const line = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: '#ff3333' }))
    line.name = 'desk-outline'
    line.visible = false
    // 살짝 올려서 z-fighting 방지
    line.position.y = 0.0001 + (mesh.position.y - TOP_THICKNESS_M/2)
    mesh.add(line)
    return line
  }

  // 이 컴포넌트는 UI를 렌더링하지 않음
  return null
}
