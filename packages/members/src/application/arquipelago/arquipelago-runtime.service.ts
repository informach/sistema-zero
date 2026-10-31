import { canonicalJson, sha256Hex } from '@sistemazero/core/creations'
import { ValidationError } from '@sistemazero/core/errors'
import { studioProjectContinuityIssue } from '@sistemazero/core/studio/project-continuity'
import { StudioProjectDocumentSchema } from '@sistemazero/core/studio/project-document'
import { copyStudioProjectJson } from '@sistemazero/core/studio/project-json'
import {
  StudioArquipelagoRuntimeDecisionSchema,
  StudioArquipelagoRuntimeRequestSchema,
} from '@sistemazero/core/studio/runtime-authorization'
import { studioRuntimeSubject } from '@sistemazero/core/studio/runtime-subject'
import { MAX_STUDIO_PROJECT_CHARS } from '../../domain/course/lesson-block'
import { AccessDeniedError } from '../../domain/entitlement/entitlement.errors'
import type { StudioRuntimePolicy } from '../../domain/studio/runtime-policy'
import { CURADORIA_DO_DESAFIO_PYTHON } from './arquipelago-objectives.service'

/** O que o Estúdio de desafio pode fazer com o Python: nada de exportar, publicar, Zappy ou REPL. */
const CAPACIDADES_DO_DESAFIO = ['edit', 'execute', 'pause'] as const

/**
 * C02b (30/10/2026): o ambiente Python de um desafio aberto no jogo. Quem atesta o desafio é o
 * serviço do jogo (token do Arquipélago): ele já conferiu quem joga, a revisão publicada e a ilha,
 * e manda o projeto INICIAL dela. Aqui o pedido do Estúdio só passa se for o mesmo projeto aberto,
 * no mesmo ambiente do inicial (release, extensões e travas do Python), e a política de runtime
 * decide com a curadoria do desafio, a mesma da conferência dos objetivos. Não depende do Estúdio
 * Completo (vendido à parte): o desafio é do jogo.
 */
export class ArquipelagoRuntimeService {
  constructor(
    private readonly politica: StudioRuntimePolicy | undefined,
    private readonly relogio: () => number = Date.now,
  ) {}

  async autorizar(input: {
    requester: string
    accountId: string
    audience: 'kids' | 'adult'
    projetoInicial: unknown
    pedido: unknown
  }) {
    if (!this.politica)
      throw new AccessDeniedError('O ambiente de execução ainda não está disponível.')
    const pedido = StudioArquipelagoRuntimeRequestSchema.safeParse(input.pedido)
    if (!pedido.success) throw new ValidationError('O pedido do ambiente é inválido.')
    const { context, subject, operation, revision } = pedido.data
    if (context.audience !== input.audience)
      throw new AccessDeniedError('O público precisa corresponder a quem joga.')
    const inicial = projetoInicial(input.projetoInicial)
    if (
      subject.programmingLanguage !== 'python' ||
      subject.kind !== 'classic' ||
      studioProjectContinuityIssue(subject, studioRuntimeSubject(inicial)) !== null
    )
      throw new AccessDeniedError('O projeto aberto não é do ambiente deste desafio.')
    const resolvido = this.politica.authorize({
      project: subject,
      operation,
      curation: CURADORIA_DO_DESAFIO_PYTHON,
      grantedExtensionIds: inicial.installedExtensions.map(({ id }) => id),
      grantedCapabilities: [...CAPACIDADES_DO_DESAFIO],
    })
    const emitidoEm = this.relogio()
    return StudioArquipelagoRuntimeDecisionSchema.parse({
      version: 1,
      actor: { userId: input.requester, accountId: input.accountId },
      context,
      projectId: subject.id,
      revision,
      subjectSha256: await sha256Hex(canonicalJson(subject)),
      runtime: subject.runtime,
      operation,
      releaseStatus: resolvido.releaseStatus,
      capabilities: resolvido.capabilities.filter(
        (capacidade): capacidade is (typeof CAPACIDADES_DO_DESAFIO)[number] =>
          (CAPACIDADES_DO_DESAFIO as readonly string[]).includes(capacidade),
      ),
      grantedExtensionIds: resolvido.grantedExtensionIds,
      catalog: resolvido.catalog,
      blockIds: resolvido.blockIds,
      curation: CURADORIA_DO_DESAFIO_PYTHON,
      frame: resolvido.frame,
      issuedAt: emitidoEm,
      expiresAt: emitidoEm + 30_000,
    })
  }
}

function projetoInicial(valor: unknown) {
  let copia: unknown
  try {
    copia = copyStudioProjectJson(valor)
  } catch {
    throw new ValidationError('O projeto inicial do desafio é inválido.')
  }
  const tipo = copia as { programmingLanguage?: unknown; kind?: unknown } | null
  if (tipo?.programmingLanguage !== 'python' || tipo.kind !== 'classic')
    throw new AccessDeniedError('Este desafio não usa o ambiente Python.')
  const serializado = JSON.stringify(copia)
  const lido = StudioProjectDocumentSchema.safeParse(copia)
  if (
    !lido.success ||
    lido.data.programmingLanguage !== 'python' ||
    serializado.length > MAX_STUDIO_PROJECT_CHARS
  )
    throw new ValidationError('O projeto inicial do desafio é inválido.')
  return lido.data
}
