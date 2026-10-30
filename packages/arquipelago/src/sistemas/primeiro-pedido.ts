import { cabeColheita, colher, estagio, type Salvamento } from '@sistemazero/arquipelago-contracts'
import { contextoDaColheita } from './colheita'
import { ganharProjeto } from './construcao/projeto-azul'
import { adicionar } from './itens'

export interface PrimeiroPedido {
  etapa: 'porta' | 'plantar' | 'regar' | 'crescer' | 'colher'
  texto: string
}

/** O próprio projeto ganho é a conclusão. Não há segunda marca nem relógio salvo. */
export function primeiroPedido(
  s: Pick<Salvamento, 'casa' | 'horta' | 'projetos'>,
  agoraMs: number,
): PrimeiroPedido | null {
  if (s.projetos.geladeira) return null
  if (!s.casa.portaNova)
    return { etapa: 'porta', texto: 'Abra a porta nova do quarto para conhecer sua horta.' }
  const fases = s.horta.map((c) => estagio(c, agoraMs))
  if (fases.includes('maduro'))
    return {
      etapa: 'colher',
      texto: 'Colha um alimento na horta para ganhar o projeto da geladeira.',
    }
  if (fases.includes('semente'))
    return { etapa: 'regar', texto: 'Regue o canteiro que você plantou na sua horta.' }
  if (fases.some((f) => f === 'brotando' || f === 'crescendo'))
    return {
      etapa: 'crescer',
      texto: 'A planta está crescendo. Você pode explorar e voltar para colher.',
    }
  return { etapa: 'plantar', texto: 'Plante uma semente da mochila em um canteiro da sua horta.' }
}

/** Colheita manual inteira: só entrega a primeira função depois de guardar alimento e semente. */
export function colherNaIlha(s: Salvamento, indice: number, agora: Date, jornada: number) {
  const canteiro = s.horta[indice]
  const colheita = canteiro && colher(canteiro, agora.getTime(), contextoDaColheita(s, jornada))
  if (!colheita) return { ok: false as const, motivo: 'imatura' as const }
  if (!cabeColheita(s.inventario, colheita.item, colheita.qtd))
    return { ok: false as const, motivo: 'mochila' as const }
  const horta = s.horta.map((c, i) => (i === indice ? colheita.canteiro : c))
  const inventario = adicionar(
    adicionar(s.inventario, colheita.item, colheita.qtd),
    `semente-${colheita.item}`,
    1,
  )
  return {
    ok: true as const,
    salvamento: ganharProjeto({ ...s, horta, inventario }, 'geladeira', agora),
    ganhouGeladeira: !s.projetos.geladeira,
    colheita,
  }
}
