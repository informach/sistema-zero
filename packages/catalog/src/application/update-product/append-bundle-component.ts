import type { ProductComponent } from '../../domain/product/product.aggregate'

/**
 * Monta a substituição aditiva usada por seeds: preserva ordem/primário e
 * devolve `null` quando o componente já está presente.
 */
export function appendBundleComponent(
  components: readonly ProductComponent[],
  componentProductId: string,
): ProductComponent[] | null {
  if (components.some((component) => component.componentProductId === componentProductId)) {
    return null
  }
  const sortOrder = components.reduce(
    (maximum, component) => Math.max(maximum, component.sortOrder + 1),
    0,
  )
  return [...components, { componentProductId, sortOrder, isPrimary: false }]
}
