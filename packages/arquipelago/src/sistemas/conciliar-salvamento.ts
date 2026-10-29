import type { Salvamento } from '@sistemazero/arquipelago-contracts'
import { juntarFilhotes } from './filhote-do-vale'

/** Compara dados JSON, sem depender da ordem das chaves de um inventário. */
export function mesmosDados(a: unknown, b: unknown): boolean {
  if (a === b) return true
  if (!a || !b || typeof a !== 'object' || typeof b !== 'object') return false
  if (Array.isArray(a) || Array.isArray(b))
    return (
      Array.isArray(a) &&
      Array.isArray(b) &&
      a.length === b.length &&
      a.every((v, i) => mesmosDados(v, b[i]))
    )
  const aa = a as Record<string, unknown>
  const bb = b as Record<string, unknown>
  const chaves = Object.keys(aa)
  return (
    chaves.length === Object.keys(bb).length &&
    chaves.every((k) => Object.hasOwn(bb, k) && mesmosDados(aa[k], bb[k]))
  )
}

/**
 * Só os campos de progresso com regra de união explícita ficam fora desta transação. Horta,
 * mochila, Capi, bicho, construção e projetos azuis podem consumir/transferir itens entre si.
 * Não somar snapshots nem escolher cada campo isoladamente. Novos campos de versões futuras
 * ficam conservadoramente neste grupo até terem uma regra própria, evitando descarte silencioso.
 */
function economia(s: Salvamento) {
  const {
    casa: _casa,
    pontesVistas: _pontes,
    percursos: _percursos,
    posicao: _posicao,
    vale: _vale,
    pico: _pico,
    nuvens: _nuvens,
    farol: _farol,
    clima: _clima,
    ...transacao
  } = s
  return transacao
}

export function conciliarSalvamento(
  base: Salvamento | null,
  local: Salvamento,
  remoto: Salvamento | null,
): Salvamento | null {
  if (mesmosDados(local, remoto)) return local
  if (mesmosDados(base, remoto)) return local
  if (mesmosDados(base, local)) return remoto
  if (!base || !remoto || base.criadoEm !== local.criadoEm || base.criadoEm !== remoto.criadoEm)
    return null
  const eb = economia(base)
  const el = economia(local)
  const er = economia(remoto)
  const comum = mesmosDados(el, er) || mesmosDados(eb, er) ? el : mesmosDados(eb, el) ? er : null
  if (!comum) return null
  // A preferência não transfere itens. Mudanças distintas nas duas sessões pedem escolha.
  const clima =
    local.clima === remoto.clima || base.clima === remoto.clima
      ? local.clima
      : base.clima === local.clima
        ? remoto.clima
        : null
  if (clima === null) return null

  const percursos = { ...remoto.percursos }
  for (const [id, resultado] of Object.entries(local.percursos)) {
    const chave = id as keyof Salvamento['percursos']
    const outro = remoto.percursos[chave]
    if (!resultado) continue
    percursos[chave] = outro
      ? {
          estrelas: {
            chegada: resultado.estrelas.chegada || outro.estrelas.chegada,
            tempo: resultado.estrelas.tempo || outro.estrelas.tempo,
            vagalumes: resultado.estrelas.vagalumes || outro.estrelas.vagalumes,
          },
          melhorTempoMs: Math.min(resultado.melhorTempoMs, outro.melhorTempoMs),
        }
      : resultado
  }
  return {
    ...remoto,
    ...comum,
    clima,
    casa: { portaNova: local.casa.portaNova || remoto.casa.portaNova },
    pontesVistas: [...new Set([...remoto.pontesVistas, ...local.pontesVistas])],
    percursos,
    // Descobertas não consomem itens nem se desfazem: juntar as conquistas das duas sessões.
    vale: {
      pegadas: local.vale.pegadas || remoto.vale.pegadas,
      escavacao: Math.max(local.vale.escavacao, remoto.vale.escavacao),
      ninhos: [...new Set([...remoto.vale.ninhos, ...local.vale.ninhos])],
      // O filhote só avança cuidando (a comida sai do inventário, que já se concilia): o mais adiantado.
      filhote: juntarFilhotes(local.vale.filhote, remoto.vale.filhote),
    },
    // Levar um instrumento ao palco também não gasta nada: os bits das duas sessões (fase3-08).
    pico: { banda: local.pico.banda | remoto.pico.banda },
    nuvens: { constelacoes: local.nuvens.constelacoes | remoto.nuvens.constelacoes },
    farol: {
      pagina: local.farol.pagina || remoto.farol.pagina,
      concluido: local.farol.concluido || remoto.farol.concluido,
    },
    posicao: mesmosDados(base.posicao, local.posicao) ? remoto.posicao : local.posicao,
  }
}
