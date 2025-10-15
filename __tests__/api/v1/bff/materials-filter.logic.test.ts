import { filterMaterials } from '@/app/api/v1/bff/configurator/route'

describe('filterMaterials (Story 2.3A.3)', () => {
  it('filters out inactive and id=="disabled"', () => {
    const input = [
      { id: 'wood', is_active: true },
      { id: 'glass', is_active: false },
      { id: 'disabled', is_active: true },
      { id: 'metal', is_active: true },
      { id: 'mdf' }, // defaults to included when is_active not explicitly false
    ]
    const out = filterMaterials(input)
    const ids = out.map(m => m.id)
    expect(ids).toEqual(expect.arrayContaining(['wood', 'metal', 'mdf']))
    expect(ids).not.toContain('glass')
    expect(ids).not.toContain('disabled')
  })
})

