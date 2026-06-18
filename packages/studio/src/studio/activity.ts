import { createContext, useContext } from 'react'

/**
 * Atividades com AUTO-CORREÇÃO do `<StudioLesson>` (fase 2).
 *
 * O professor define uma atividade (enunciado + checagens) e o próprio editor
 * corrige na hora, dá feedback e ajuda o aluno a consertar — sem correção manual.
 *
 * **Correção híbrida:** o CLIENTE roda TODAS as checagens (feedback instantâneo,
 * formativo); o SERVIDOR (members) RECALCULA só as de `structure` (anda o IR
 * submetido — barato, sem executar) e REGISTRA o resultado reportado pelo cliente
 * para `behavior`/`testcase`/`code`. Por isso `structure` é a única à prova de
 * fraude no gate.
 *
 * ⚠️ **Trade-off (vazamento aceito):** para o feedback instantâneo, as definições
 * (saídas esperadas, `code` do professor) vão no conteúdo do bloco enviado ao
 * browser. É uma plataforma FORMATIVA — o anti-cola do gate é o `structure`
 * recalculado no servidor.
 *
 * A condicional vive na leitura `useStudioActivity()` do layout (default `null` →
 * nada renderiza): o `<StudioEditor>` nunca provê este contexto, então o editor
 * puro jamais paga pela feature de aula.
 */

/** Valor JSON literal (entradas/esperados de checagem). */
export type JsonValue = string | number | boolean | null | JsonValue[] | { [k: string]: JsonValue }

/** Campos comuns a toda checagem. */
export interface ActivityCheckBase {
  /** Id estável (idempotência da correção + feedback por checagem). */
  id: string
  /** Rótulo curto exibido ao aluno (o que esta checagem cobra). */
  label: string
  /** Dica mostrada quando a checagem FALHA — ajuda o aluno a consertar. */
  hint?: string
  /** Peso na nota (default 1). */
  weight?: number
}

/** Regra de uma checagem de ESTRUTURA (recalculável no servidor, anda o IR). */
export type StructureRule =
  | { type: 'usesLoop' }
  | { type: 'declaresVariable'; name: string }
  | { type: 'definesFunction'; name: string }
  | { type: 'callsFunction'; name: string }
  | { type: 'usesBlock'; blockType: string }

/**
 * ESTRUTURA: inspeciona o projeto SEM rodar (IR dos blocos / código). É a única
 * verificada também no servidor.
 */
export interface StructureCheck extends ActivityCheckBase {
  kind: 'structure'
  rule: StructureRule
}

/** Regra de uma checagem de COMPORTAMENTO (roda no sandbox e observa o resultado). */
export type BehaviorRule =
  | { type: 'consoleContains'; text: string }
  | { type: 'domSelectorExists'; selector: string }
  | { type: 'domSelectorText'; selector: string; text: string }
  | { type: 'globalEquals'; name: string; value: JsonValue }

/** COMPORTAMENTO: roda o programa no sandbox e verifica o resultado observável. */
export interface BehaviorCheck extends ActivityCheckBase {
  kind: 'behavior'
  rule: BehaviorRule
}

/** CASO DE TESTE: chama uma função do aluno com entradas e compara o retorno. */
export interface TestCaseCheck extends ActivityCheckBase {
  kind: 'testcase'
  /** Nome da função global definida pelo aluno (script clássico → `window[functionName]`). */
  functionName: string
  /** Casos: entradas (`args`) → retorno esperado (`expected`). `id` é só p/ a UI de autoria. */
  cases: { id?: string; args: JsonValue[]; expected: JsonValue }[]
}

/**
 * CÓDIGO (escape hatch): asserção em JS escrita pelo professor. Roda no MESMO
 * sandbox null-origin do aluno (loopGuard/CSP/permissionGuard valem); recebe um
 * contexto controlado e deve devolver booleano (ou lançar). Só verificável no
 * cliente.
 */
export interface CodeCheck extends ActivityCheckBase {
  kind: 'code'
  /** Corpo JS da asserção. Ver o harness para o contexto disponível. */
  source: string
}

/** União das checagens (a "combinação"). */
export type ActivityCheck = StructureCheck | BehaviorCheck | TestCaseCheck | CodeCheck

export type ActivityCheckKind = ActivityCheck['kind']

/** Atividade fixada pelo professor para um bloco Estúdio de aula. */
export interface LessonActivity {
  /** Enunciado (markdown) mostrado ao aluno no painel de atividade. */
  instructions: string
  /** Checagens combinadas que o editor roda para auto-corrigir. */
  checks: readonly ActivityCheck[]
  /** Nota mínima (0–100) para "passar"; ausente = só formativo (sem gate). */
  passingScore?: number
}

/** Quem verificou uma checagem: o servidor (recalculou) ou o cliente (reportado). */
export type CheckVerifiedBy = 'server' | 'client'

/** Resultado de UMA checagem. */
export interface CheckResult {
  checkId: string
  kind: ActivityCheckKind
  passed: boolean
  /** Mensagem opcional (ex.: "esperado 6, obtido 5" / erro do `code`). */
  message?: string
  /** Quem produziu este resultado. No cliente é sempre 'client'. */
  verifiedBy: CheckVerifiedBy
}

/** Resultado de uma rodada de correção (média ponderada das checagens). */
export interface ActivityRunResult {
  results: CheckResult[]
  /** 0–100, inteiro (soma dos pesos das passadas / soma dos pesos). */
  score: number
  /** `score >= passingScore` (ou `true` quando formativa, sem `passingScore`). */
  passed: boolean
}

// Contexto INTERNO (como o StudioConfigProvider, não exportado pelo index):
// `null` = sem atividade → o painel não renderiza nada. Provido SÓ pelo
// StudioCore quando o <StudioLesson> recebe uma `activity`.
const StudioActivityContext = createContext<LessonActivity | null>(null)

export const StudioActivityProvider = StudioActivityContext.Provider

/** Atividade da instância atual (`null` fora de uma aula com atividade). */
export function useStudioActivity(): LessonActivity | null {
  return useContext(StudioActivityContext)
}
