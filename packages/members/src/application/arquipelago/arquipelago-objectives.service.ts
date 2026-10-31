import { DomainError, ValidationError } from '@sistemazero/core/errors'
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
  type SectionProjectCheck,
  type SectionPythonProjectCheck,
  sectionProjectChecksEnvironmentIssue,
} from '@sistemazero/core/learning'
import type { StudioProjectCuration } from '@sistemazero/core/studio/project-capabilities'
import { studioProjectContinuityIssue } from '@sistemazero/core/studio/project-continuity'
import { StudioProjectDocumentSchema } from '@sistemazero/core/studio/project-document'
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
import { StudioPythonProjectCheckUnavailableError } from '../../domain/studio/python-project-check.errors'
import type { SectionProgressionService } from '../learning/section-progression.service'
import { blocosACompletar } from './blocos-a-completar'

/**
 * Os objetivos dos desafios do Arquipélago (plano `docs/plans/2026-10-27-arquipelago-desafios.md`),
 * conferidos com o MESMO verificador das aulas (`SectionProgressionService.evaluateObjectives`):
 * estrutura no members, execução no executor, sem captura (o cache do executor vale) e sem guardar
 * nada. Os formatos de resposta são o `AnaliseDosMembrosSchema` e o `VerificacaoDosMembrosSchema`
 * de `arquipelago-contracts/src/membros.ts` (o Members não importa o contrato).
 *
 * C02 (30/10/2026): além dos projetos JavaScript em blocos, valem o JavaScript em texto (Ponte,
 * que é o mesmo projeto clássico), o JavaScript Pro (o executor recebe o modelo do projeto
 * inicial) e o Python clássico (o `PythonProjectCheckerService` das aulas, por
 * `evaluatePythonObjectives`). Python Pro continua recusado.
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
  /** Só Python: o perfil do ambiente do projeto inicial. */
  profileId?: string
  /** Só Python: as linhas de entrada de um objetivo que roda o programa. */
  stdin?: string[]
  rule: Record<string, unknown>
}

/**
 * A curadoria do desafio Python. Na aula ela vem do bloco de Estúdio; o desafio não tem bloco, e
 * o que a criança alcança já foi decidido pelo jogo (ilha aberta). Vazia = os modos e extensões que
 * a release aprovada oferece; a política de runtime continua conferindo release, modo e extensões.
 */
export const CURADORIA_DO_DESAFIO_PYTHON: StudioProjectCuration = Object.freeze({})

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

function linguagemDoProjeto(projeto: Projeto): 'javascript' | 'python' {
  return projeto.programmingLanguage === 'python' ? 'python' : 'javascript'
}

function modeloPro(projeto: Projeto): unknown {
  const meta = projeto.proMeta
  return meta !== null && typeof meta === 'object'
    ? (meta as { templateId?: unknown }).templateId
    : undefined
}

/** Só o JavaScript clássico tem blocos do catálogo do servidor (Python e Pro não). */
function temBlocos(projeto: Projeto): boolean {
  return linguagemDoProjeto(projeto) === 'javascript' && tipoDoProjeto(projeto) === 'classic'
}

const ehPython = (check: SectionProjectCheck): check is SectionPythonProjectCheck =>
  check.programmingLanguage === 'python'
const ehJavaScript = (check: SectionProjectCheck): check is SectionJavaScriptProjectCheck =>
  check.programmingLanguage !== 'python'

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

/** O objetivo só com os campos do `SectionProjectCheck` (JavaScript ou Python), se for válido. */
function objetivoValido(objetivo: ObjetivoRecebido): SectionProjectCheck | undefined {
  const python = objetivo.programmingLanguage === 'python'
  // Perfil e entradas fora do Python não têm sentido: o objetivo é recusado, não aparado.
  if (!python && (objetivo.profileId !== undefined || objetivo.stdin !== undefined))
    return undefined
  const check = {
    id: objetivo.id,
    label: objetivo.label,
    rule: objetivo.rule,
    ...(objetivo.programmingLanguage === undefined
      ? {}
      : { programmingLanguage: objetivo.programmingLanguage }),
    ...(objetivo.hint ? { hint: objetivo.hint } : {}),
    ...(objetivo.optional ? { optional: true as const } : {}),
    ...(objetivo.profileId === undefined ? {} : { profileId: objetivo.profileId }),
    ...(objetivo.stdin === undefined ? {} : { stdin: objetivo.stdin }),
  }
  const completion = { version: 1 as const, blockIds: [], projectChecks: [check] }
  if (!isSectionCompletion(completion)) return undefined
  return completion.projectChecks?.[0]
}

function aspas(texto: string) {
  return `"${texto}"`
}

export class ArquipelagoObjectivesService {
  constructor(
    private readonly deps: {
      verificador: Pick<
        SectionProgressionService,
        'evaluateObjectives' | 'evaluatePythonObjectives'
      >
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
      if (linguagemDoProjeto(projeto) === 'python') {
        if (tipoDoProjeto(projeto) === 'pro')
          impede(
            'PROJETO_PYTHON_PRO',
            `${nome} é Python Pro: os desafios do jogo aceitam Python clássico e JavaScript (blocos, Ponte ou Pro).`,
          )
        else if (!StudioProjectDocumentSchema.safeParse(projeto).success)
          impede(codigo, `${nome} não é um projeto Python válido do Estúdio.`)
      }
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
    const python = inicial !== undefined && linguagemDoProjeto(inicial) === 'python'
    if (inicial && gabarito) {
      // O gabarito prova o desafio só no mesmo ambiente que a criança vai receber.
      const outroTipo =
        linguagemDoProjeto(inicial) !== linguagemDoProjeto(gabarito) ||
        tipoDoProjeto(inicial) !== tipoDoProjeto(gabarito)
      const outroAmbiente =
        !outroTipo &&
        (python
          ? studioProjectContinuityIssue(gabarito, inicial) !== null
          : tipoDoProjeto(inicial) === 'pro' && modeloPro(inicial) !== modeloPro(gabarito))
      if (outroTipo || outroAmbiente)
        impede(
          'GABARITO_DE_OUTRO_AMBIENTE',
          'O gabarito usa outra linguagem, outro tipo de projeto, outra release Python ou outro modelo Pro que o projeto inicial.',
        )
    }

    // ── Os objetivos ──
    if (input.objetivos.length === 0) impede('SEM_OBJETIVOS', 'O desafio precisa de um objetivo.')
    if (input.objetivos.length > LIMITES_DOS_OBJETIVOS.objetivos)
      impede(
        'OBJETIVOS_DEMAIS',
        `O desafio tem ${input.objetivos.length} objetivos; o limite é ${LIMITES_DOS_OBJETIVOS.objetivos}.`,
      )
    const vistos = new Set<string>()
    const validos: SectionProjectCheck[] = []
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
      // A régua de autoria das aulas é do JavaScript; o Python foi conferido acima
      // (`validateSectionPythonProjectChecks`, dentro da conferência do ambiente).
      const autoria = projectCheckAuthoring({ initialProject: inicial })
      for (const check of validos)
        if (!ehPython(check))
          for (const mensagem of autoria.issues(check.rule))
            impede('REGRA_INVALIDA', `${aspas(check.label)}: ${mensagem}`, check.id)
      const espera = queRodam
        .filter((check) => !ehPython(check))
        .reduce(
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
      if (!projeto || !temBlocos(projeto)) return []
      try {
        return projectBlockTypes(projeto.blocksState)
      } catch (error) {
        if (!(error instanceof ProjectDocumentError)) throw error
        impede(codigo, `${nome}: ${error.message}`)
        return []
      }
    }
    const doGabarito = tipos(gabarito, 'O gabarito', 'GABARITO_INVALIDO')
    const doInicial = tipos(inicial, 'O projeto inicial', 'PROJETO_INICIAL_INVALIDO')
    let alterados: string[] = []
    if (inicial && gabarito && podeConferir && temBlocos(inicial) && temBlocos(gabarito)) {
      try {
        alterados = blocosACompletar(inicial.blocksState, gabarito.blocksState)
      } catch (error) {
        if (!(error instanceof ProjectDocumentError)) throw error
        impede('BLOCOS_INVALIDOS', error.message)
      }
    }
    // Apoio intocado não é tarefa. Completar o corpo ou mudar a condição de um tipo já
    // presente exige sua ferramenta, assim como acrescentar uma nova ocorrência.
    const blocosDoGabarito = alterados.filter((tipo) => {
      const bloco = CATALOGO.get(tipo)
      return bloco !== undefined && bloco.contract.domain !== 'frame'
    })
    const blocosDesconhecidos = [...new Set([...doInicial, ...doGabarito])]
      .filter((tipo) => !CATALOGO.has(tipo))
      .sort()
    for (const tipo of blocosDesconhecidos)
      impede('BLOCO_DESCONHECIDO', `O bloco ${tipo} não existe no catálogo do Estúdio.`)

    const vista = validos.slice(0, LIMITES_DOS_OBJETIVOS.objetivos).map(projectObjectiveView)
    if (!podeConferir || !inicial || !gabarito)
      return { blocosDoGabarito, blocosDesconhecidos, vista, problemas, gabarito: [], inicial: [] }

    // ── O gabarito e o inicial no verificador das aulas ──
    // `null` = não deu para conferir (executor fora): sai como `passou: false`, sem acusar o gabarito.
    let executorFora = false
    const conferirPython = async (projeto: Projeto): Promise<Map<string, boolean | null>> => {
      const semResposta = () => new Map<string, boolean | null>(validos.map((c) => [c.id, null]))
      if (executorFora) return semResposta()
      try {
        const avaliado = await this.deps.verificador.evaluatePythonObjectives({
          checks: validos.filter(ehPython),
          project: projeto,
          userId: REQUISITANTE_DA_ANALISE,
          accountId: REQUISITANTE_DA_ANALISE,
          curation: CURADORIA_DO_DESAFIO_PYTHON,
        })
        return new Map(avaliado.results.map((resultado) => [resultado.id, resultado.passed]))
      } catch (error) {
        if (error instanceof StudioPythonProjectCheckUnavailableError) {
          if (!executorFora)
            problema(
              'EXECUTOR_INDISPONIVEL',
              'Não consegui rodar o programa Python para conferir os objetivos. Analise de novo em instantes; nada foi aprovado.',
            )
          executorFora = true
        } else if (error instanceof DomainError)
          problema('PYTHON_RECUSOU', `O ambiente Python recusou o teste: ${error.message}`)
        else throw error
        return semResposta()
      }
    }
    const conferir = async (projeto: Projeto) => {
      if (python) return conferirPython(projeto)
      const javascript = validos.filter(ehJavaScript)
      const estrutura = javascript.filter((check) => !isExecutionRule(check.rule))
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
        if (!queRodam.length) return avaliar(javascript)
        if (!executorFora) {
          try {
            return await avaliar(javascript)
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
            else if (error instanceof ValidationError) {
              problema('PROJETO_INVALIDO', error.message)
              return new Map<string, boolean | null>(javascript.map((check) => [check.id, null]))
            } else throw error
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
    const conferirParPython = async (
      resposta: Projeto,
      partida: Projeto,
    ): Promise<readonly [Map<string, boolean | null>, Map<string, boolean | null>]> => {
      // Each checker owns a separate immutable input and sandbox. Their existing 150 s
      // deadlines share this request's 160 s window instead of adding up to 300 s.
      const [g, i] = await Promise.allSettled([conferir(resposta), conferir(partida)])
      // Settle both owners even if one has an unexpected failure.
      if (g.status === 'rejected') throw g.reason
      if (i.status === 'rejected') throw i.reason
      return [g.value, i.value]
    }
    const [doGabaritoConferido, doInicialConferido] = python
      ? await conferirParPython(gabarito, inicial)
      : [await conferir(gabarito), await conferir(inicial)]
    for (const check of validos) {
      if (doGabaritoConferido.get(check.id) === false)
        problema(
          'GABARITO_NAO_PASSA',
          `O gabarito não cumpre o objetivo ${check.optional ? 'extra' : 'obrigatório'} ${aspas(check.label)}. Ajuste o gabarito ou o objetivo.`,
          check.id,
        )
      if (doInicialConferido.get(check.id) === true)
        problema(
          'INICIAL_JA_CUMPRE_OBJETIVO',
          `O projeto inicial já cumpre ${aspas(check.label)}. Avalie uma regra que falta completar, não o apoio pronto.`,
          check.id,
        )
    }
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
    const checks = input.objetivos.map(objetivoValido)
    const completion = { version: 1 as const, blockIds: [], projectChecks: checks }
    if (
      !checks.length ||
      checks.some((check) => check === undefined) ||
      !isSectionCompletion(completion)
    )
      throw new ValidationError('Os objetivos do desafio têm valores inválidos.')
    const validos = checks as SectionProjectCheck[]
    const python = linguagemDoProjeto(inicial) === 'python'
    if (python && tipoDoProjeto(inicial) === 'pro')
      throw new ValidationError('Os desafios do jogo não conferem projetos Python Pro.')
    if (
      linguagemDoProjeto(inicial) !== linguagemDoProjeto(projeto) ||
      tipoDoProjeto(inicial) !== tipoDoProjeto(projeto) ||
      (python && studioProjectContinuityIssue(projeto, inicial) !== null)
    )
      throw new ValidationError('Este projeto não é do tipo deste desafio.')
    if (tipoDoProjeto(inicial) === 'pro' && modeloPro(inicial) !== modeloPro(projeto))
      throw new ValidationError('Este projeto usa outro modelo Pro que o deste desafio.')
    if (projeto.bridgeCodeAhead) throw new StudioProjectSyncingError()
    const ambiente =
      sectionProjectChecksEnvironmentIssue(validos, inicial) ??
      sectionProjectChecksEnvironmentIssue(validos, projeto)
    if (ambiente) throw new ValidationError(ambiente)
    if (python) {
      let avaliadoPython: Awaited<ReturnType<SectionProgressionService['evaluatePythonObjectives']>>
      try {
        avaliadoPython = await this.deps.verificador.evaluatePythonObjectives({
          checks: validos.filter(ehPython),
          project: projeto,
          userId: input.requester,
          accountId: input.requester,
          curation: CURADORIA_DO_DESAFIO_PYTHON,
        })
      } catch (error) {
        // Política de runtime (release, modo, extensão) recusada vira projeto recusado, nunca 5xx.
        if (
          error instanceof DomainError &&
          !(error instanceof StudioPythonProjectCheckUnavailableError) &&
          !(error instanceof ValidationError)
        )
          throw new ValidationError(error.message)
        throw error
      }
      return {
        passou: avaliadoPython.passed,
        resultados: avaliadoPython.results.map((r) => ({ id: r.id, passou: r.passed })),
      }
    }
    const avaliado = await this.deps.verificador.evaluateObjectives({
      checks: validos.filter(ehJavaScript),
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
