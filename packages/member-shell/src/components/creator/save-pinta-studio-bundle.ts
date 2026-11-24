import type { PersonalAssetInput } from '@sistemazero/studio/personal-assets'

type PintaStudioAssetInput = PersonalAssetInput & { width: number; height: number }

/** Shared host boundary: the library commits the complete map bundle atomically. */
export async function savePintaStudioBundle(
  input: PintaStudioAssetInput & { maps?: PintaStudioAssetInput[] },
  namespace: string,
  signal?: AbortSignal,
) {
  signal?.throwIfAborted()
  const library = await import('@sistemazero/studio/personal-assets')
  signal?.throwIfAborted()
  const inputs = [input, ...(input.maps ?? [])]
  const result = await library.savePersonalAssetBundle(inputs, {
    namespace,
    signal,
  })
  if (!result.ok) return result
  const savedById = new Map(result.assets.map((asset) => [asset.id, asset]))
  const withRevision = (source: PintaStudioAssetInput) => {
    const saved = savedById.get(source.id)
    if (!saved) throw new Error('A biblioteca não devolveu um dos mapas solicitados.')
    const { regional: _untrusted, ...fields } = source
    return {
      ...fields,
      ...(saved.regional ? { regional: saved.regional } : {}),
      name: saved.name,
      libRevision: saved.updatedAt,
    }
  }
  const { maps, ...source } = input
  return {
    ok: true as const,
    asset: {
      ...withRevision(source),
      ...(maps?.length ? { maps: maps.map(withRevision) } : {}),
    },
  }
}
