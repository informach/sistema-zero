/** Licenças adultas são produtos próprios; compras Kids conservam suas referências. */
export function creativeToolAccessRef(ref: string, audience: 'adult' | 'kids'): string {
  return audience === 'adult' && ['estudio-completo', 'pinta', 'molda', 'pensa'].includes(ref)
    ? `adult-${ref}`
    : ref
}
