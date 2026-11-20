import { creativeToolAccessRef } from '@sistemazero/core/creations'
import { KIDS_MOLDA_BAND_CAPABILITIES } from '@sistemazero/core/journey'
import { FAIXAS_DA_OFICINA, type FaixaDaOficina } from '@sistemazero/molda-cenarios-core/v2'
import type { Ator } from '../../domain/cenarios/cenarios'
import { CenariosIndisponiveisError } from '../../domain/cenarios/cenarios.errors'
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
 * Leitura que falha vira 424 (`CenariosIndisponiveisError`), sem guardar nada.
 */
const JORNADA_TTL_MS = 60_000

export function criarConferenciaDoMolda(deps: {
  accessCheck: Pick<AccessCheckService, 'execute'>
  kidsJourney: Pick<KidsJourneyQueryService, 'get'>
  adultJourney: Pick<AdultJourneyService, 'get'>
  agora?: () => number
}): {
  /** O Molda de quem pede: o produto e a ferramenta liberada na jornada (o básico). */
  produto(ator: Ator): Promise<boolean>
  /** As faixas de ferramentas que a jornada de quem pede liberou. */
  faixas(ator: Ator): Promise<readonly FaixaDaOficina[]>
} {
  const agora = deps.agora ?? Date.now
  const jornada = new Map<string, { ate: number; faixas: readonly FaixaDaOficina[] }>()
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

  /**
   * As faixas pela jornada, a mesma régua do Molda: no Kids, uma capacidade por faixa; no adulto,
   * a política antiga (sem currículo) dava todas com o `molda`, e a de currículo é por faixa
   * (`adultMoldaOpenBands` do member-shell).
   */
  async function faixasDaJornada(
    ator: Ator,
    audiencia: 'kids' | 'adult',
  ): Promise<readonly FaixaDaOficina[]> {
    const chave = `${ator.contaId}:${ator.usuarioId}:${audiencia}`
    const guardada = jornada.get(chave)
    if (guardada && guardada.ate > agora()) return guardada.faixas
    const desde = toolOwnershipGeneration()
    let faixas: FaixaDaOficina[]
    if (audiencia === 'kids') {
      const capacidades: readonly string[] = (
        await deps.kidsJourney.get({ userId: ator.usuarioId, accountId: ator.contaId })
      ).earned.capabilities
      faixas = FAIXAS_DA_OFICINA.filter((f) =>
        capacidades.includes(KIDS_MOLDA_BAND_CAPABILITIES[f]),
      )
    } else {
      const visao = await deps.adultJourney.get(ator.usuarioId)
      const capacidades: readonly string[] = visao.capabilities
      faixas =
        !visao.curriculum && capacidades.includes('molda')
          ? [...FAIXAS_DA_OFICINA]
          : FAIXAS_DA_OFICINA.filter((f) => capacidades.includes(KIDS_MOLDA_BAND_CAPABILITIES[f]))
    }
    // Só o "pode" fica guardado: sem o básico, a próxima pergunta consulta de novo.
    if (faixas.includes('basic') && desde === toolOwnershipGeneration()) {
      jornada.set(chave, { ate: agora() + JORNADA_TTL_MS, faixas })
      if (jornada.size > 5_000)
        for (const [k, v] of jornada) if (v.ate <= agora()) jornada.delete(k)
    }
    return faixas
  }

  // O gateway só injeta a conta numa sessão de perfil, e o Molda do Kids mora no perfil.
  const audienciaDe = (ator: Ator) =>
    (ator.perfil ?? ator.usuarioId !== ator.contaId) ? 'kids' : 'adult'

  // Leitura que falha (banco, jornada inicializando) NÃO é "não tem": vira 424, que a oficina
  // trata como "tente de novo". Como recusa, ela travava a oficina e perdia o que estava na fila.
  const indisponivel = (causa: unknown): never => {
    throw new CenariosIndisponiveisError(causa)
  }
  return {
    async produto(ator) {
      const audiencia = audienciaDe(ator)
      try {
        return (
          (await temProduto(ator.contaId, audiencia)) &&
          (await faixasDaJornada(ator, audiencia)).includes('basic')
        )
      } catch (erro) {
        return indisponivel(erro)
      }
    },
    async faixas(ator) {
      try {
        return await faixasDaJornada(ator, audienciaDe(ator))
      } catch (erro) {
        return indisponivel(erro)
      }
    },
  }
}
