// BFF Configurator 유틸
export function filterMaterials(materials: any[]): any[] {
  if (!Array.isArray(materials)) return []
  return materials.filter((m: any) => m?.is_active !== false && m?.id !== 'disabled')
}

