import type {
  CenariosHost,
  FonteDeMoldes,
  FonteDeTexturas,
  ModeloDeBiblioteca,
  MoldeDisponivel,
} from '@sistemazero/molda-cenarios/oficina'
import type { CreationsCloud } from './creations-cloud'
import { dataUrlBase64ToBlob } from './data-url'

/** Leitura da galeria na conta, pelo mesmo cliente de criações que o Molda já usa.
 * Cada cópia aprovada vira um GLB fixado por hash no espaço da família. Uma atualização
 * na galeria não substitui silenciosamente o conteúdo dos objetos já colocados. */
export function criarFonteDeMoldes({
  perfilId,
  cloud,
  host,
}: {
  perfilId: string
  cloud: Pick<CreationsCloud, 'list' | 'download'>
  host: CenariosHost
}): FonteDeMoldes {
  const preparados = new Map<string, ModeloDeBiblioteca>()
  return {
    async listar(sinal) {
      const lista = await cloud.list({ signal: sinal })
      sinal?.throwIfAborted()
      return lista
        .filter((m) => m.kind === 'model')
        .map(
          (m): MoldeDisponivel => ({
            origem: 'molda',
            id: m.itemId,
            nome: m.name,
            miniatura: m.thumb,
            revisao: String(m.revision),
            atualizadoEm: m.itemUpdatedAt,
          }),
        )
    },
    async preparar(espacoId, molde, sinal, aceite) {
      sinal?.throwIfAborted()
      const chave = `${espacoId}:${molde.id}:${molde.revisao}`
      const pronto = preparados.get(chave)
      if (pronto) {
        const existe = (await host.listarBibliotecas(espacoId)).some(
          (b) => b.id === pronto.bibliotecaId,
        )
        sinal?.throwIfAborted()
        if (
          existe &&
          (await host.listarModelos(pronto.bibliotecaId, { digest: pronto.digest, limite: 1 }))
            .itens.length
        ) {
          sinal?.throwIfAborted()
          return { ok: true, modelo: pronto }
        }
        preparados.delete(chave)
      }
      const documento = await cloud.download(molde.id, { signal: sinal })
      sinal?.throwIfAborted()
      if (!documento) throw Error('Esse molde não está mais na sua conta')
      if (String(documento.summary.revision) !== molde.revisao)
        throw Error('Esse molde mudou. Atualize a lista antes de usar a nova versão')
      const { exportMoldaJsonForCenarios } = await import('@sistemazero/molda/cenarios-library')
      const resultado = await exportMoldaJsonForCenarios(documento.json, molde.id, {
        namespace: perfilId,
        storageRevision: documento.summary.revision,
        signal: sinal,
        acceptedReview: aceite,
      })
      sinal?.throwIfAborted()
      if (!resultado.ok) {
        if (resultado.reason === 'needs-review')
          return { ok: false, token: resultado.review.token, avisos: resultado.review.losses }
        throw Error(
          resultado.reason === 'asset-too-big'
            ? 'Esse molde passa do limite para um modelo de cenário'
            : 'Não consegui preparar esse molde. Abra e confira a criação no Molda',
        )
      }
      if (resultado.asset.kind !== 'model3d') throw Error('Escolha um modelo 3D do Molda')
      const { prepararArquivos } = await import('@sistemazero/molda-cenarios/oficina')
      const b = dataUrlBase64ToBlob(resultado.asset.dataUrl)
      const convertido = await prepararArquivos(
        [new File([b], `${molde.id}.glb`)],
        undefined,
        sinal,
      )
      const modelo = convertido.prontos[0]
      if (!modelo)
        throw Error(convertido.recusados[0]?.motivo ?? 'Não consegui preparar esse molde')
      modelo.nome = documento.summary.name.slice(0, 120)
      modelo.etiquetas = ['Molda']
      const biblioteca = await host.obterBibliotecaDoMolda(espacoId)
      sinal?.throwIfAborted()
      const jaExiste = (
        await host.listarModelos(biblioteca.id, { digest: modelo.digest, limite: 1 })
      ).itens[0]
      const guardado =
        jaExiste ??
        (await host.importarModelos(biblioteca.id, [modelo], undefined, sinal))[0] ??
        (await host.listarModelos(biblioteca.id, { digest: modelo.digest, limite: 1 })).itens[0]
      sinal?.throwIfAborted()
      if (!guardado) throw Error('Não consegui guardar a cópia do molde no cenário')
      const copia = { ...guardado, nome: documento.summary.name.slice(0, 120) }
      preparados.delete(chave)
      preparados.set(chave, copia)
      if (preparados.size > 128) preparados.delete(preparados.keys().next().value!)
      return { ok: true, modelo: copia }
    },
  }
}

/** A mesma galeria de criações: a textura escolhida é copiada para a biblioteca de destino. */
export function criarFonteDeTexturas({
  cloud,
  host,
  perfilId,
}: {
  perfilId: string
  cloud: Pick<CreationsCloud, 'list' | 'download'>
  host: CenariosHost
}): FonteDeTexturas {
  return {
    async listar(sinal) {
      const lista = await cloud.list({ signal: sinal })
      sinal?.throwIfAborted()
      return lista
        .filter((m) => m.kind === 'texture')
        .map((m) => ({
          origem: 'molda' as const,
          id: m.itemId,
          nome: m.name,
          miniatura: m.thumb,
          revisao: String(m.revision),
          atualizadoEm: m.itemUpdatedAt,
        }))
    },
    async preparar(bibliotecaId, item, sinal) {
      sinal?.throwIfAborted()
      const documento = await cloud.download(item.id, { signal: sinal })
      sinal?.throwIfAborted()
      if (
        !documento ||
        String(documento.summary.revision) !== item.revisao ||
        documento.summary.kind !== 'texture'
      )
        throw Error('Essa textura mudou. Atualize a lista e escolha novamente')
      const { exportMoldaJsonForCenarios } = await import('@sistemazero/molda/cenarios-library')
      const resultado = await exportMoldaJsonForCenarios(documento.json, item.id, {
        namespace: perfilId,
        storageRevision: documento.summary.revision,
        signal: sinal,
      })
      sinal?.throwIfAborted()
      if (!resultado.ok || resultado.asset.kind !== 'image')
        throw Error('Não consegui preparar esta textura. Abra e confira a criação no Molda')
      const { prepararChao } = await import('@sistemazero/molda-cenarios/oficina')
      const pronta = await prepararChao(
        new File([dataUrlBase64ToBlob(resultado.asset.dataUrl)], `${item.id}.png`, {
          type: 'image/png',
        }),
        sinal,
      )
      pronta.nome = documento.summary.name.slice(0, 120)
      pronta.etiquetas = ['Molda']
      const existente = (
        await host.listarTexturas(bibliotecaId, { digest: pronta.digest, limite: 1 })
      ).itens[0]
      sinal?.throwIfAborted()
      if (existente) return existente
      const guardada =
        (await host.importarTexturas(bibliotecaId, [pronta], undefined, sinal))[0] ??
        (await host.listarTexturas(bibliotecaId, { digest: pronta.digest, limite: 1 })).itens[0]
      sinal?.throwIfAborted()
      if (!guardada) throw Error('Não consegui guardar a textura na biblioteca')
      return guardada
    },
  }
}
