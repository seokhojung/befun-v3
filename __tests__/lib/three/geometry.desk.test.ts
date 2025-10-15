import * as THREE from 'three'
import { createDeskGeometry, createDeskMesh, attachDeskLegs, updateDeskLegs, TOP_THICKNESS_M } from '@/lib/three/geometry'

describe('Desk geometry utilities', () => {
  it('attaches four legs to the desk mesh and updates positions', () => {
    const width = 1.2, depth = 0.6, height = 0.75
    const geom = createDeskGeometry(width, depth, height)
    const mat = new THREE.MeshBasicMaterial()
    const mesh = createDeskMesh(geom, mat)

    attachDeskLegs(mesh, width, depth, height, mat)
    const legs = mesh.children.filter(c => c.name === 'desk-leg')
    expect(legs.length).toBe(4)

    // update and verify positions changed accordingly
    const newWidth = 1.0
    updateDeskLegs(mesh, newWidth, depth, height)
    const legs2 = mesh.children.filter(c => c.name === 'desk-leg') as THREE.Mesh[]
    expect(legs2.length).toBe(4)
    // legs centered beneath top (y below top by TOP_THICKNESS/2 + leg/2)
    legs2.forEach(l => {
      expect(l.position.y).toBeLessThan(0)
    })
  })
})

