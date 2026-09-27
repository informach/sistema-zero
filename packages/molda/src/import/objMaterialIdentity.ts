/** Stable declaration/UV-variant identity shared by selection and transport origin checks. */
export function objMaterialIdentity(
  library: number,
  material: number,
  useUvTextures: boolean,
): string {
  return `obj_material_${library}_${material}_${useUvTextures ? 'uv' : 'plain'}`
}
