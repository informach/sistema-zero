import type { PreparoDeExportacao } from '@sistemazero/molda-cenarios-core/compilar'
import {
  compilarCenario,
  type ProgressoDaCompilacao,
} from '@sistemazero/molda-cenarios-motor/compilar'
import type { CenariosHost } from '../oficina/portas'

/** O que a compilação lê do host: só o conteúdo (a oficina, o agente sem janela). */
export type FonteDaCompilacao = Pick<
  CenariosHost,
  'conteudoDoModelo' | 'conteudoDaTextura' | 'conteudoDoTerreno'
>

/** Mesma compilação da revisão autorizada para arquivo e publicação; o chamador possui a fila. */
export async function compilarRevisaoDaOficina(
  host: FonteDaCompilacao,
  preparo: PreparoDeExportacao,
  /** `relevo: 'campo'`: o relevo em campo (plano "Mundos de 2 km"); sem ele, como sempre. */
  opcoes: { juntar: boolean; tamanhoDaRegiao: number; relevo?: 'campo' },
  sinal: AbortSignal,
  progresso: (p: ProgressoDaCompilacao) => void,
) {
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
      ...(opcoes.juntar ? { juncaoEstatica: { tamanhoDaRegiao: opcoes.tamanhoDaRegiao } } : {}),
      ...(opcoes.relevo ? { relevo: opcoes.relevo } : {}),
    },
  )
  if (pacote.cena.fonte.digest !== preparo.digest)
    throw Error('A compilação não corresponde ao cenário conferido pelo servidor.')
  return pacote
}
