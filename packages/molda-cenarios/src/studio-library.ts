import {
  conferirPreparoDeExportacao,
  type PacoteCompilado,
} from '@sistemazero/molda-cenarios-core/compilar'
import type { CenaDisponivelParaStudio } from '@sistemazero/molda-cenarios-core/studio'
import type { ProgressoDaCompilacao } from '@sistemazero/molda-cenarios-motor/compilar'
import { naFilaDeCompilacao } from './exportar/fila'
import type { CenariosHost } from './oficina/portas'

export { criarHostHttp } from './oficina/host-http'

/** No editor, renderer, global account switch or writes to personal-assets. */
export async function listarCenariosParaStudio(
  host: CenariosHost,
  sinal: AbortSignal,
): Promise<CenaDisponivelParaStudio[]> {
  sinal.throwIfAborted()
  const resultado: CenaDisponivelParaStudio[] = []
  for (const espaco of await host.espacos()) {
    sinal.throwIfAborted()
    for (const jogo of await host.listarMundos(espaco.id)) {
      sinal.throwIfAborted()
      if (jogo.bibliotecaConjuntosId) continue
      for (const cena of await host.listarCenarios(jogo.id)) {
        sinal.throwIfAborted()
        resultado.push({
          id: cena.id,
          nome: cena.nome,
          revisao: cena.revisao,
          jogo: { id: jogo.id, nome: jogo.nome },
          espaco: { id: espaco.id, nome: espaco.nome, tipo: espaco.tipo },
          miniatura: cena.capa,
          atualizadoEm: cena.atualizadoEm,
        })
      }
    }
  }
  sinal.throwIfAborted()
  return resultado.sort(
    (a, b) => b.atualizadoEm.localeCompare(a.atualizadoEm) || a.id.localeCompare(b.id),
  )
}

/** Região da junção quando o Estúdio pede para juntar peças (ver relevo-atlas no motor). */
export const REGIAO_DE_JUNCAO_DO_ESTUDIO = 128

export async function prepararCenarioParaStudio(
  host: CenariosHost,
  id: string,
  revisao: number,
  opcoes: {
    sinal: AbortSignal
    juntar?: boolean
    tamanhoDaRegiao?: number
    progresso?: (p: ProgressoDaCompilacao) => void
  },
): Promise<{ pacote: PacoteCompilado; avisos: string[] }> {
  const { sinal, juntar, tamanhoDaRegiao, progresso } = opcoes
  sinal.throwIfAborted()
  // The source/revision is checked by the server and again at this consumer boundary.
  const preparo = await conferirPreparoDeExportacao(
    await host.prepararExportacao(id, revisao, sinal),
    id,
    revisao,
  )
  sinal.throwIfAborted()
  return naFilaDeCompilacao(sinal, async () => {
    const { compilarCenario } = await import('@sistemazero/molda-cenarios-motor/compilar')
    sinal.throwIfAborted()
    const pacote = await compilarCenario(
      preparo.documento,
      preparo.fonte,
      preparo.contexto,
      {
        modelo: (ref, s) => host.conteudoDoModelo({ ...ref, espacoId: preparo.espacoId }, s),
        textura: (ref, s) => host.conteudoDaTextura({ ...ref, espacoId: preparo.espacoId }, s),
        terreno: (digest, s) => host.conteudoDoTerreno(preparo.fonte.cenario, digest, s),
      },
      sinal,
      {
        progresso,
        preservarHierarquia: (o) => Object.keys(o.propriedades ?? {}).length > 0,
        // 128 m: cada região junta 2x2 peças do relevo num atlas de 1024 px (sem perder resolução),
        // o bastante para uma ilha comum caber no orçamento de malhas do Estúdio.
        ...(juntar
          ? { juncaoEstatica: { tamanhoDaRegiao: tamanhoDaRegiao ?? REGIAO_DE_JUNCAO_DO_ESTUDIO } }
          : {}),
      },
    )
    sinal.throwIfAborted()
    if (pacote.cena.fonte.digest !== preparo.digest)
      throw Error('A compilação não corresponde à revisão conferida pelo servidor.')
    const confirmado = await conferirPreparoDeExportacao(
      await host.prepararExportacao(id, revisao, sinal),
      id,
      revisao,
    )
    sinal.throwIfAborted()
    if (
      confirmado.digest !== preparo.digest ||
      confirmado.espacoId !== preparo.espacoId ||
      JSON.stringify(confirmado.contexto) !== JSON.stringify(preparo.contexto)
    )
      throw Error(
        'A revisão ou as licenças mudaram durante o preparo. Confira o cenário novamente.',
      )
    return { pacote, avisos: (pacote.avisos ?? []).map((a) => a.mensagem) }
  })
}
