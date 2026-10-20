'use client'

import type { StudioMoldaLibraryAdapter, StudioPintaLibraryAdapter } from '@sistemazero/studio'
import { useLayoutEffect, useMemo } from 'react'

/** Same ownership, validation and namespace rules for classic and Pro hosts. */
export function useStudioCreationLibraries(
  viewerId: string | null,
  pintaOwned: boolean,
  moldaOwned: boolean,
) {
  const pintaOwner = useMemo(
    () => ({
      namespace: (viewerId ?? '').trim(),
      owned: pintaOwned,
      controller: new AbortController(),
    }),
    [viewerId, pintaOwned],
  )
  useLayoutEffect(() => {
    // StrictMode can start another lifetime on the same memoized owner. An old
    // operation retains its old signal and can never be revived by this setup.
    if (pintaOwner.controller.signal.aborted) pintaOwner.controller = new AbortController()
    return () => pintaOwner.controller.abort()
  }, [pintaOwner])
  // "Trazer do Pinta" (fluxo pull): o Estúdio lista a galeria do Pinta e importa
  // um desenho por id. O import GRAVA em personal-assets antes de devolver — é o
  // que liga o auto-update dos jogos (guard `getPersonalAsset` do resyncToStudio
  // no pinta-client) e o botão "editar desenho". Import dinâmico do SUBPATH
  // `studio-library` (⚠️ NUNCA a raiz `@sistemazero/pinta` — puxaria o app
  // inteiro do Pinta pro bundle do /estudio). Cada operação captura o namespace
  // explícito e o lifetime antes de qualquer await, sem alterar o perfil global.
  const pintaLibrary = useMemo<StudioPintaLibraryAdapter | undefined>(() => {
    if (!pintaOwner.owned) return undefined
    const namespace = pintaOwner.namespace
    const operationSignal = (signal?: AbortSignal) =>
      signal
        ? AbortSignal.any([pintaOwner.controller.signal, signal])
        : pintaOwner.controller.signal
    return {
      async list(options) {
        const signal = operationSignal(options?.signal)
        const includeImageSelection = options?.includeImageSelection === true
        signal.throwIfAborted()
        const lib = await import('@sistemazero/pinta/studio-library')
        signal.throwIfAborted()
        const drawings = await lib.listGalleryForStudio({
          namespace,
          signal,
          ...(includeImageSelection ? { includeImageSelection: true } : {}),
        })
        signal.throwIfAborted()
        return drawings.map((d) => ({
          id: d.id,
          name: d.name,
          role: d.role,
          style: d.style ?? undefined,
          updatedAt: d.updatedAt,
          thumbDataUrl: d.thumbDataUrl,
          ...(d.projectName ? { projectName: d.projectName } : {}),
          ...(d.imageSelection ? { imageSelection: d.imageSelection } : {}),
        }))
      },
      async inspectImage(drawingId, options) {
        const signal = operationSignal(options?.signal)
        signal.throwIfAborted()
        const lib = await import('@sistemazero/pinta/studio-library')
        signal.throwIfAborted()
        const provenance = await lib.inspectImageForStudio(drawingId, { namespace, signal })
        signal.throwIfAborted()
        return provenance
      },
      async previewImage(recipe, limits, options) {
        const signal = operationSignal(options?.signal)
        const input = structuredClone({
          recipe,
          limits,
          expectedProvenance: options?.expectedProvenance,
        })
        signal.throwIfAborted()
        const lib = await import('@sistemazero/pinta/studio-library')
        signal.throwIfAborted()
        const image = await lib.exportImageForStudio(input.recipe, input.limits, {
          namespace,
          signal,
          expectedProvenance: input.expectedProvenance,
        })
        signal.throwIfAborted()
        return image
      },
      async import(drawingId, options) {
        const signal = operationSignal(options?.signal)
        const imageRequest = options?.image ? structuredClone(options.image) : undefined
        if (imageRequest && imageRequest.recipe.drawingId !== drawingId)
          throw new Error('A seleção não corresponde ao desenho solicitado.')
        signal.throwIfAborted()
        const lib = await import('@sistemazero/pinta/studio-library')
        signal.throwIfAborted()
        const imageResult = imageRequest
          ? await lib.exportImageAndSourceForStudio(imageRequest.recipe, imageRequest.limits, {
              namespace,
              signal,
            })
          : undefined
        const result =
          imageResult ?? (await lib.exportAssetForStudio(drawingId, { namespace, signal }))
        signal.throwIfAborted()
        if (!result.ok) {
          if (result.reason === 'not-found') {
            return {
              ok: false,
              error: 'Esse desenho não está mais na galeria do Pinta.',
              code: 'not-found',
            }
          }
          if (result.reason === 'asset-too-big' || result.reason === 'sheet-too-big') {
            return {
              ok: false,
              error: 'Esse desenho é grande demais para o Estúdio.',
              code: 'too-big',
            }
          }
          return {
            ok: false,
            error: 'Não consegui preparar esse desenho agora. Tente de novo.',
            code: 'raster-failed',
          }
        }
        const bridge = await import('@sistemazero/studio/personal-assets')
        signal.throwIfAborted()
        const saved = await bridge.savePersonalAsset(result.asset, { namespace })
        signal.throwIfAborted()
        if (!saved.ok) {
          return {
            ok: false,
            error: saved.error ?? 'Não consegui trazer esse desenho agora. Tente de novo.',
          }
        }
        // O upsert pode sufixar o nome (colisão com OUTRO desenho) — o Estúdio
        // usa o nome salvo, senão os blocos referenciariam um nome divergente.
        return {
          ok: true,
          asset: {
            ...(imageResult?.ok
              ? {
                  id: result.asset.id,
                  dataUrl: imageResult.image.dataUrl,
                  width: imageResult.image.derivation.output.width,
                  height: imageResult.image.derivation.output.height,
                  pintaImage: imageResult.image.derivation,
                }
              : result.asset),
            name: saved.name ?? result.asset.name,
            libRevision: saved.updatedAt,
          },
        }
      },
    }
  }, [pintaOwner])

  // "Trazer do Molda" (fluxo pull, irmão do de cima): lista a galeria 3D e importa uma
  // criação por id. O `exportAssetForStudio` já devolve o binário validado pelos tetos
  // do Estúdio (modelo .glb, textura .png, céu .hdr); o import GRAVA em personal-assets
  // (com o `kind` e o nome do arquivo) antes de devolver, pelo selo "✓ no projeto".
  // Import dinâmico do SUBPATH `studio-library` (⚠️ NUNCA a raiz `@sistemazero/molda`,
  // que puxaria o app inteiro, com three.js, pro bundle do /estudio).
  const moldaLibrary = useMemo<StudioMoldaLibraryAdapter | undefined>(() => {
    if (!moldaOwned) return undefined
    return {
      async list() {
        const lib = await import('@sistemazero/molda/studio-library')
        lib.setMoldaStorageNamespace(viewerId ?? '')
        const items = await lib.listGalleryForStudio()
        return items.map((item) => ({
          id: item.id,
          name: item.name,
          kind: item.kind,
          updatedAt: item.updatedAt,
          thumbDataUrl: item.thumbDataUrl,
        }))
      },
      async import(creationId, options) {
        const lib = await import('@sistemazero/molda/studio-library')
        lib.setMoldaStorageNamespace(viewerId ?? '')
        const result = await lib.exportAssetForStudio(creationId, {
          namespace: viewerId ?? '',
          ...options,
        })
        if (!result.ok) {
          if (result.reason === 'needs-review') {
            return {
              ok: false,
              code: 'needs-review',
              error: 'Confira as mudanças nesta cópia.',
              review: result.review,
            }
          }
          if (result.reason === 'not-found') {
            return {
              ok: false,
              error: 'Essa criação não está mais na galeria do Molda.',
              code: 'not-found',
            }
          }
          if (result.reason === 'asset-too-big') {
            return {
              ok: false,
              error: 'Essa criação é grande demais para o Estúdio.',
              code: 'too-big',
            }
          }
          return {
            ok: false,
            error: 'Não consegui preparar essa criação agora. Tente de novo.',
            code: 'encode-failed',
          }
        }
        const bridge = await import('@sistemazero/studio/personal-assets')
        const saved = await bridge.savePersonalAsset(
          {
            id: result.asset.id,
            name: result.asset.name,
            kind: result.asset.kind,
            // A textura é imagem, mas NÃO é desenho do Pinta: sem a origem o painel
            // ofereceria "editar desenho" e abriria o Pinta num id do Molda.
            origin: 'molda',
            dataUrl: result.asset.dataUrl,
            originalFileName: result.asset.originalFileName,
            ...(result.asset.width !== undefined ? { width: result.asset.width } : {}),
            ...(result.asset.height !== undefined ? { height: result.asset.height } : {}),
          },
          { namespace: viewerId ?? '' },
        )
        if (!saved.ok) {
          return {
            ok: false,
            error: saved.error ?? 'Não consegui trazer essa criação agora. Tente de novo.',
          }
        }
        // O upsert pode sufixar o nome (colisão com OUTRA criação) — o Estúdio usa o
        // nome salvo, senão os blocos referenciariam um nome divergente.
        return {
          ok: true,
          asset: {
            id: result.asset.id,
            name: saved.name ?? result.asset.name,
            kind: result.asset.kind,
            dataUrl: result.asset.dataUrl,
            originalFileName: result.asset.originalFileName,
            ...(result.asset.width !== undefined ? { width: result.asset.width } : {}),
            ...(result.asset.height !== undefined ? { height: result.asset.height } : {}),
            ...(saved.updatedAt !== undefined ? { libRevision: saved.updatedAt } : {}),
          },
        }
      },
    }
  }, [moldaOwned, viewerId])

  return { pintaLibrary, moldaLibrary }
}
