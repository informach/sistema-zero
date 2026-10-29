import { ValidationError } from '@sistemazero/core/errors'
import {
  EXECUTION_LIMITS,
  executionProjectChecks,
  executionRuleBudgetMs,
  isExecutionRule,
  isSectionCompletion,
  type ProjectObjectiveView,
  ProjectStructureAnalysisLimitError,
  projectObjectiveView,
  type SectionExecutionRule,
  type SectionJavaScriptProjectCheck,
  sectionProjectChecksEnvironmentIssue,
} from '@sistemazero/core/learning'
import { copyStudioProjectJson } from '@sistemazero/core/studio/project-json'
import { ProjectDocumentError, projectBlockTypes } from '@sistemazero/studio/project-document'
import { SERVER_BLOCK_CATALOG } from '@sistemazero/studio/server-catalog'
import { projectCheckAuthoring } from '@sistemazero/studio/server-project-checks'
import type { CourseAudience } from '../../domain/course/course'
import { MAX_STUDIO_PROJECT_CHARS } from '../../domain/course/lesson-block'
import {
  ProjectCheckBusyError,
  ProjectCheckRejectedError,
  ProjectCheckUnavailableError,
  StudioProjectSyncingError,
} from '../../domain/learning/learning.errors'
import type { SectionProgressionService } from '../learning/section-progression.service'

/**
 * Os objetivos dos desafios do Arquipélago (plano `docs/plans/2026-10-27-arquipelago-desafios.md`),
 * conferidos com o MESMO verificador das aulas (`SectionProgressionService.evaluateObjectives`):
 * estrutura no members, execução no executor, sem captura (o cache do executor vale) e sem guardar
 * nada. Os formatos de resposta são o `AnaliseDosMembrosSchema` e o `VerificacaoDosMembrosSchema`
 * de `arquipelago-contracts/src/membros.ts` (o Members não importa o contrato).
 */

/** Os desafios aceitam até 20 objetivos, e no máximo 8 deles rodam o jogo (o mesmo teto da parte). */
export const LIMITES_DOS_OBJETIVOS = {
  objetivos: 20,
  objetivosQueRodam: EXECUTION_LIMITS.maxObjectives,
  problemas: 100,
  mensagem: 500,
} as const

/** Quem pede a análise para o limite de frequência do executor (a equipe no Admin do jogo). */
export const REQUISITANTE_DA_ANALISE = 'arquipelago-admin'

/** O objetivo como chega do serviço do jogo (o formato já passou pela borda da rota). */
export interface ObjetivoRecebido {
  id: string
  label: string
  hint?: string
  optional?: true
  programmingLanguage?: string
  rule: Record<string, unknown>
}

export interface ProblemaDaAnalise {
  codigo: string
  mensagem: string
  objetivoId?: string
}

export interface ResultadoDoObjetivo {
  id: string
  passou: boolean
}

export interface AnaliseDoDesafio {
  blocosDoGabarito: string[]
  blocosDesconhecidos: string[]
  vista: ProjectObjectiveView[]
  problemas: ProblemaDaAnalise[]
  gabarito: ResultadoDoObjetivo[]
  inicial: ResultadoDoObjetivo[]
}

export interface VerificacaoDoDesafio {
  passou: boolean
  resultados: ResultadoDoObjetivo[]
}

const CATALOGO = new Map(SERVER_BLOCK_CATALOG.map((bloco) => [bloco.type, bloco]))

type Projeto = Record<string, unknown>

function tipoDoProjeto(projeto: Projeto): 'classic' | 'pro' {
  return projeto.kind === 'pro' ? 'pro' : 'classic'
}

/** Cópia limitada do projeto (a mesma das entregas das aulas); `undefined` = inválido ou grande. */
function copiarProjeto(valor: unknown): Projeto | undefined {
  let copia: unknown
  try {
    copia = copyStudioProjectJson(valor)
  } catch {
    return undefined
  }
  if (copia === null || typeof copia !== 'object' || Array.isArray(copia)) return undefined
  const serializado = JSON.stringify(copia)
  if (typeof serializado !== 'string' || serializado.length > MAX_STUDIO_PROJECT_CHARS)
    return undefined
  return copia as Projeto
}

/** O objetivo só com os campos do `SectionProjectCheck` JavaScript, se a regra for válida. */
function objetivoValido(objetivo: ObjetivoRecebido): SectionJavaScriptProjectCheck | undefined {
  const check = {
    id: objetivo.id,
    label: objetivo.label,
    rule: objetivo.rule,
    ...(objetivo.programmingLanguage === undefined
      ? {}
      : { programmingLanguage: objetivo.programmingLanguage }),
    ...(objetivo.hint ? { hint: objetivo.hint } : {}),
    ...(objetivo.optional ? { optional: true as const } : {}),
  }
  const completion = { version: 1 as const, blockIds: [], projectChecks: [check] }
  if (!isSectionCompletion(completion)) return undefined
  const [validado] = completion.projectChecks ?? []
  return validado?.programmingLanguage === 'python' ? undefined : validado
}

function aspas(texto: string) {
  return `"${texto}"`
}

export class ArquipelagoObjectivesService {
  constructor(
    private readonly deps: {
      verificador: Pick<SectionProgressionService, 'evaluateObjectives'>
    },
  ) {}

  /**
   * Confere um desafio antes de publicar: os blocos que o gabarito pede, a vista dos objetivos e o
   * que impede publicar (`problemas`, nunca erro HTTP). O gabarito e o projeto inicial passam pelo
   * verificador; com o executor fora, os objetivos que rodam o jogo ficam `passou: false` e entra
   * o problema `EXECUTOR_INDISPONIVEL` (nunca uma aprovação inventada).
   */
  async analisar(input: {
    audience: CourseAudience
    projetoInicial: unknown
    gabarito: unknown
    objetivos: readonly ObjetivoRecebido[]
  }): Promise<AnaliseDoDesafio> {
    const problemas: ProblemaDaAnalise[] = []
    const problema = (codigo: string, mensagem: string, objetivoId?: string) => {
      if (problemas.length >= LIMITES_DOS_OBJETIVOS.problemas) return
      problemas.push({
        codigo,
        mensagem: mensagem.slice(0, LIMITES_DOS_OBJETIVOS.mensagem),
        ...(objetivoId === undefined ? {} : { objetivoId }),
      })
    }
    // Só a autoria conferível chega ao executor: qualquer problema de formato impede a conferência.
    let podeConferir = true
    const impede = (codigo: string, mensagem: string, objetivoId?: string) => {
      podeConferir = false
      problema(codigo, mensagem, objetivoId)
    }

    const lerProjeto = (valor: unknown, nome: string, codigo: string) => {
      const projeto = copiarProjeto(valor)
      if (!projeto) {
        impede(codigo, `${nome} é inválido ou grande demais.`)
        return undefined
      }
      if (tipoDoProjeto(projeto) === 'pro')
        impede('PROJETO_PRO', `${nome} é do Pro: os desafios do jogo usam só projetos de blocos.`)
      else if (projeto.programmingLanguage === 'python')
        impede(
          'PROJETO_PYTHON',
          `${nome} é Python: os desafios do jogo usam só projetos de blocos (JavaScript).`,
        )
      if (projeto.bridgeCodeAhead)
        impede(
          'PROJETO_SINCRONIZANDO',
          `${nome} ainda está sincronizando o código e os blocos. Aguarde a sincronização e guarde de novo.`,
        )
      return projeto
    }
    const inicial = lerProjeto(
      input.projetoInicial,
      'O projeto inicial',
      'PROJETO_INICIAL_INVALIDO',
    )
    const gabarito = lerProjeto(input.gabarito, 'O gabarito', 'GABARITO_INVALIDO')

    // ── Os objetivos ──
    if (input.objetivos.length === 0) impede('SEM_OBJETIVOS', 'O desafio precisa de um objetivo.')
    if (input.objetivos.length > LIMITES_DOS_OBJETIVOS.objetivos)
      impede(
        'OBJETIVOS_DEMAIS',
        `O desafio tem ${input.objetivos.length} objetivos; o limite é ${LIMITES_DOS_OBJETIVOS.objetivos}.`,
      )
    const vistos = new Set<string>()
    const validos: SectionJavaScriptProjectCheck[] = []
    for (const objetivo of input.objetivos) {
      if (vistos.has(objetivo.id)) {
        impede(
          'OBJETIVO_REPETIDO',
          `Dois objetivos usam o mesmo identificador (${objetivo.id}).`,
          objetivo.id,
        )
        continue
      }
      vistos.add(objetivo.id)
      if (objetivo.programmingLanguage === 'python') {
        impede(
          'OBJETIVO_PYTHON',
          `${aspas(objetivo.label)}: objetivos em Python ainda não valem nos desafios do jogo. Use objetivos de blocos (JavaScript).`,
          objetivo.id,
        )
        continue
      }
      const valido = objetivoValido(objetivo)
      if (!valido) {
        impede(
          'OBJETIVO_INVALIDO',
          `${aspas(objetivo.label)}: o objetivo tem valores inválidos.`,
          objetivo.id,
        )
        continue
      }
      validos.push(valido)
    }
    if (input.objetivos.length > 0 && input.objetivos.every((objetivo) => objetivo.optional))
      problema(
        'SEM_OBRIGATORIO',
        'Objetivos extras não fecham o desafio. Marque ao menos um objetivo como obrigatório.',
      )
    const queRodam = executionProjectChecks(validos)
    if (queRodam.length > LIMITES_DOS_OBJETIVOS.objetivosQueRodam)
      impede(
        'OBJETIVOS_QUE_RODAM_DEMAIS',
        `${queRodam.length} objetivos rodam o jogo; o limite por desafio é ${LIMITES_DOS_OBJETIVOS.objetivosQueRodam}.`,
      )

    // ── A régua da publicação das aulas (`studioSectionCompletionReview`), com o inicial do desafio ──
    if (inicial && validos.length) {
      const ambiente = sectionProjectChecksEnvironmentIssue(validos, inicial)
      if (ambiente) impede('AMBIENTE', ambiente)
      const autoria = projectCheckAuthoring({ initialProject: inicial })
      for (const check of validos)
        for (const mensagem of autoria.issues(check.rule))
          impede('REGRA_INVALIDA', `${aspas(check.label)}: ${mensagem}`, check.id)
      const espera = queRodam.reduce(
        (soma, check) => soma + executionRuleBudgetMs(check.rule as SectionExecutionRule),
        0,
      )
      if (espera > EXECUTION_LIMITS.maxSectionWaitMs)
        impede(
          'ESPERA_DEMAIS',
          `Os objetivos que rodam o jogo deste desafio esperam ${Math.ceil(espera / 1000)} segundos somados; o teste aceita até ${EXECUTION_LIMITS.maxSectionWaitMs / 1000}. Encurte as esperas ou tire casos.`,
        )
    }

    // ── Os blocos do gabarito ──
    const tipos = (projeto: Projeto | undefined, nome: string, codigo: string) => {
      if (!projeto) return []
      try {
        return projectBlockTypes(projeto.blocksState)
      } catch (error) {
        if (!(error instanceof ProjectDocumentError)) throw error
        impede(codigo, `${nome}: ${error.message}`)
        return []
      }
    }
    const doGabarito = tipos(gabarito, 'O gabarito', 'GABARITO_INVALIDO')
    const doInicial = new Set(tipos(inicial, 'O projeto inicial', 'PROJETO_INICIAL_INVALIDO'))
    // Moldura (`contract.domain === 'frame'`) está sempre disponível, como no `projectCheckAuthoring`,
    // e o que já vem no inicial a criança não precisa saber montar.
    const blocosDoGabarito = doGabarito.filter((tipo) => {
      const bloco = CATALOGO.get(tipo)
      return bloco !== undefined && bloco.contract.domain !== 'frame' && !doInicial.has(tipo)
    })
    const blocosDesconhecidos = doGabarito.filter((tipo) => !CATALOGO.has(tipo))

    const vista = validos.slice(0, LIMITES_DOS_OBJETIVOS.objetivos).map(projectObjectiveView)
    if (!podeConferir || !inicial || !gabarito)
      return { blocosDoGabarito, blocosDesconhecidos, vista, problemas, gabarito: [], inicial: [] }

    // ── O gabarito e o inicial no verificador das aulas ──
    // `null` = não deu para conferir (executor fora): sai como `passou: false`, sem acusar o gabarito.
    let executorFora = false
    const conferir = async (projeto: Projeto) => {
      const estrutura = validos.filter((check) => !isExecutionRule(check.rule))
      const avaliar = async (checks: SectionJavaScriptProjectCheck[]) =>
        new Map(
          (
            await this.deps.verificador.evaluateObjectives({
              checks,
              project: projeto,
              initialProject: inicial,
              requester: REQUISITANTE_DA_ANALISE,
              screenshots: false,
            })
          ).results.map((resultado) => [resultado.id, resultado.passed]),
        )
      const comExecucao = async (): Promise<Map<string, boolean | null>> => {
        if (!queRodam.length) return avaliar(validos)
        if (!executorFora) {
          try {
            return await avaliar(validos)
          } catch (error) {
            if (error instanceof ProjectCheckRejectedError)
              problema(
                'EXECUTOR_RECUSOU',
                `O executor recusou o teste dos objetivos que rodam o jogo: ${error.reason}`,
              )
            else if (error instanceof ProjectCheckBusyError)
              problema(
                'EXECUTOR_OCUPADO',
                'O executor está com muitos testes seguidos. Espere alguns segundos e analise de novo.',
              )
            else if (error instanceof ProjectCheckUnavailableError)
              problema(
                'EXECUTOR_INDISPONIVEL',
                'Não consegui rodar o jogo para conferir os objetivos que rodam o jogo. Analise de novo em instantes; nada foi aprovado.',
              )
            else throw error
            executorFora = true
          }
        }
        // Executor fora: a estrutura ainda é conferida; os que rodam o jogo ficam sem resposta.
        const parcial: Map<string, boolean | null> = estrutura.length
          ? await avaliar(estrutura)
          : new Map()
        for (const check of queRodam) parcial.set(check.id, null)
        return parcial
      }
      try {
        return await comExecucao()
      } catch (error) {
        if (!(error instanceof ProjectStructureAnalysisLimitError)) throw error
        problema('ANALISE_INCOMPLETA', error.message)
        return new Map<string, boolean | null>(validos.map((check) => [check.id, null]))
      }
    }
    const doGabaritoConferido = await conferir(gabarito)
    const doInicialConferido = await conferir(inicial)
    for (const check of validos)
      if (!check.optional && doGabaritoConferido.get(check.id) === false)
        problema(
          'GABARITO_NAO_PASSA',
          `O gabarito não cumpre o objetivo obrigatório ${aspas(check.label)}. Ajuste o gabarito ou o objetivo.`,
          check.id,
        )
    const resultados = (conferido: Map<string, boolean | null>) =>
      validos.map((check) => ({ id: check.id, passou: conferido.get(check.id) === true }))
    return {
      blocosDoGabarito,
      blocosDesconhecidos,
      vista,
      problemas,
      gabarito: resultados(doGabaritoConferido),
      inicial: resultados(doInicialConferido),
    }
  }

  /**
   * Confere o projeto de quem joga, como o "Verificar esta parte" das aulas, sem guardar nada.
   * Passa quando todos os OBRIGATÓRIOS passam (sem obrigatório, não passa). Erros: projeto
   * inválido ou de outro tipo (400), sincronizando (409), executor fora (424) ou ocupado (429).
   */
  async verificar(input: {
    requester: string
    audience: CourseAudience
    objetivos: readonly ObjetivoRecebido[]
    projetoInicial: unknown
    projeto: unknown
  }): Promise<VerificacaoDoDesafio> {
    const projeto = copiarProjeto(input.projeto)
    if (!projeto) throw new ValidationError('Projeto inválido ou muito grande.')
    const inicial = copiarProjeto(input.projetoInicial)
    if (!inicial) throw new ValidationError('O projeto inicial do desafio é inválido.')
    if (input.objetivos.some((objetivo) => objetivo.programmingLanguage === 'python'))
      throw new ValidationError('Os desafios do jogo só conferem objetivos de blocos (JavaScript).')
    const checks = input.objetivos.map(objetivoValido)
    const completion = { version: 1 as const, blockIds: [], projectChecks: checks }
    if (
      !checks.length ||
      checks.some((check) => check === undefined) ||
      !isSectionCompletion(completion)
    )
      throw new ValidationError('Os objetivos do desafio têm valores inválidos.')
    const validos = checks as SectionJavaScriptProjectCheck[]
    if (tipoDoProjeto(inicial) === 'pro')
      throw new ValidationError('Os desafios do jogo não conferem projetos Pro.')
    if (tipoDoProjeto(inicial) !== tipoDoProjeto(projeto))
      throw new ValidationError('Este projeto não é do tipo deste desafio.')
    if (projeto.bridgeCodeAhead) throw new StudioProjectSyncingError()
    const ambiente =
      sectionProjectChecksEnvironmentIssue(validos, inicial) ??
      sectionProjectChecksEnvironmentIssue(validos, projeto)
    if (ambiente) throw new ValidationError(ambiente)
    const avaliado = await this.deps.verificador.evaluateObjectives({
      checks: validos,
      project: projeto,
      initialProject: inicial,
      requester: input.requester,
      screenshots: false,
    })
    return {
      passou: avaliado.passed,
      resultados: avaliado.results.map((resultado) => ({
        id: resultado.id,
        passou: resultado.passed,
      })),
    }
  }
}
