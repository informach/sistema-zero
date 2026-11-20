import { creativeToolAccessRef } from '@sistemazero/core/creations'
import type { Ator } from '../../domain/cenarios/cenarios'
import type { AccessCheckService } from '../access-check/access-check.service'
import type { AdultJourneyService } from '../adult-journey/adult-journey.service'
import {
  onToolOwnershipInvalidated,
  rememberToolOwned,
  toolOwnershipCached,
  toolOwnershipGeneration,
} from '../creations/tool-ownership-cache'
import type { KidsJourneyQueryService } from '../kids-journey/kids-journey-query.service'

/**
 * O Molda de quem pede, para abrir os cenários fora da equipe (modos `lista` e `aberto`). A mesma
 * régua da página do Molda nos dois apps:
 * - o PRODUTO pela conta (grants OU communities, sem a chave-mestra de cursos), com o cache curto
 *   da posse das criações, que a revogação de uma matrícula apaga na hora;
 * - a ferramenta LIBERADA na jornada de quem pede: no Kids, a capacidade `molda` do perfil da
 *   criança; no adulto, a da jornada adulta.
 *
 * A oficina pergunta muitas vezes por minuto (a gaveta, a edição ao vivo), então a liberação da
 * jornada também fica 60 s na memória. Ela nunca regride (conquista não se perde), e só o "pode" é
 * guardado: uma recusa volta a consultar (a criança acabou de chegar ao posto e tenta de novo).
 * Leitura que falha conta como recusa, sem guardar nada.
 */
const JORNADA_TTL_MS = 60_000

export function criarConferenciaDoMolda(deps: {
  accessCheck: Pick<AccessCheckService, 'execute'>
  kidsJourney: Pick<KidsJourneyQueryService, 'get'>
  adultJourney: Pick<AdultJourneyService, 'get'>
  agora?: () => number
}): (ator: Ator) => Promise<boolean> {
  const agora = deps.agora ?? Date.now
  const jornada = new Map<string, number>()
  onToolOwnershipInvalidated((contas) => {
    const fora = new Set(contas)
    for (const chave of jornada.keys()) if (fora.has(chave.split(':')[0]!)) jornada.delete(chave)
  })

  async function temProduto(contaId: string, audiencia: 'kids' | 'adult'): Promise<boolean> {
    if (toolOwnershipCached(contaId, 'molda', agora(), audiencia)) return true
    const desde = toolOwnershipGeneration()
    const ref = creativeToolAccessRef('molda', audiencia)
    const acesso = await deps.accessCheck.execute(contaId, [ref])
    if (!acesso.grants.includes(ref) && !acesso.communities.includes(ref)) return false
    rememberToolOwned(contaId, 'molda', agora(), desde, audiencia)
    return true
  }

  async function liberadoNaJornada(ator: Ator, audiencia: 'kids' | 'adult'): Promise<boolean> {
    const chave = `${ator.contaId}:${ator.usuarioId}:${audiencia}`
    const ate = jornada.get(chave)
    if (ate !== undefined && ate > agora()) return true
    const desde = toolOwnershipGeneration()
    const capacidades =
      audiencia === 'kids'
        ? (await deps.kidsJourney.get({ userId: ator.usuarioId, accountId: ator.contaId })).earned
            .capabilities
        : (await deps.adultJourney.get(ator.usuarioId)).capabilities
    if (!(capacidades as readonly string[]).includes('molda')) return false
    if (desde === toolOwnershipGeneration()) {
      jornada.set(chave, agora() + JORNADA_TTL_MS)
      if (jornada.size > 5_000)
        for (const [k, vence] of jornada) if (vence <= agora()) jornada.delete(k)
    }
    return true
  }

  return async (ator) => {
    // O gateway só injeta a conta numa sessão de perfil, e o Molda do Kids mora no perfil.
    const audiencia = (ator.perfil ?? ator.usuarioId !== ator.contaId) ? 'kids' : 'adult'
    try {
      return (
        (await temProduto(ator.contaId, audiencia)) && (await liberadoNaJornada(ator, audiencia))
      )
    } catch {
      return false
    }
  }
}
