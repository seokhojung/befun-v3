/**
 * Material Utility Functions
 * Centralized material-related helper functions
 */

/**
 * Material types
 */
export type Material = 'wood' | 'mdf' | 'steel' | 'metal' | 'glass' | 'fabric'

/**
 * Material name mappings (Korean)
 */
const MATERIAL_NAMES_KO: Record<Material, string> = {
  wood: '원목',
  mdf: 'MDF',
  steel: '스틸',
  metal: '메탈',
  glass: '유리',
  fabric: '패브릭',
}

/**
 * Get Korean material name
 * @param material - Material type
 * @returns Korean name of the material
 */
export function getMaterialKorean(material: string): string {
  return MATERIAL_NAMES_KO[material as Material] || material
}

/**
 * Validate material type
 * @param material - Material string to validate
 * @returns true if material is valid
 */
export function isValidMaterial(material: string): material is Material {
  return Object.keys(MATERIAL_NAMES_KO).includes(material)
}

/**
 * Get all valid material types
 */
export function getAllMaterials(): Material[] {
  return Object.keys(MATERIAL_NAMES_KO) as Material[]
}