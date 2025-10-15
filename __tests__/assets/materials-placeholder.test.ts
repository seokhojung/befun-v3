import { existsSync, statSync } from 'fs'

describe('Materials placeholder asset', () => {
  it('placeholder image exists in public/materials', () => {
    const p = 'public/materials/placeholder.png'
    expect(existsSync(p)).toBe(true)
    const s = statSync(p)
    expect(s.isFile()).toBe(true)
  })
})

