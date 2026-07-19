import { z } from 'zod'
import type { ProjectAsset } from '#core'
import { SZIRSchema } from '#ir'
import type { ExtensionManifest } from './types'

export const ExtensionPermissionSchema = z.enum([
  'canvas',
  'keyboard',
  'mouse',
  'audio',
  'storage',
  'network',
])

// Pré-guarda de profundidade/tamanho do IR de exemplo. O SZIRSchema é recursivo
// (z.lazy em HTML/CSS/JS), então um exemplo HOSTIL/malformado (aninhamento
// profundo) poderia estourar a pilha ANTES da validação do schema. Espelha os
// limites do caminho de import de IR (sanitizeImportedIR em state/projectStore),
// aplicados ANTES do parse — endurecimento proativo. Mantido auto-contido aqui
// para não acoplar o barril #extensions (avaliado no boot de toda extensão) ao
// grafo do projectStore (zustand/idb-keyval).
const IR_EXAMPLE_LIMITS = {
  maxChars: 4_000_000,
  maxContainerNodes: 20_000,
  maxDepth: 80,
  maxArrayItems: 25_000,
  maxObjectKeys: 250,
  maxStringChars: 2_000_000,
} as const

function isPlainRecord(value: object): value is Record<string, unknown> {
  const proto = Object.getPrototypeOf(value)
  return proto === Object.prototype || proto === null
}

/**
 * Percorre `value` iterativamente (pilha própria, sem recursão) e devolve `false`
 * se exceder profundidade, nº de containers, tamanho total ou se contiver ciclos/
 * valores não-JSON. Idêntico em espírito ao `isJsonShapeWithinLimits` do caminho
 * de import — barra a entrada antes do parse recursivo do Zod.
 */
function isIrExampleWithinLimits(value: unknown): boolean {
  const limits = IR_EXAMPLE_LIMITS
  const stack: Array<{ value: unknown; depth: number }> = [{ value, depth: 0 }]
  const seen = new WeakSet<object>()
  let chars = 0
  let containerNodes = 0

  const addChars = (amount: number): boolean => {
    chars += amount
    return chars <= limits.maxChars
  }

  while (stack.length > 0) {
    const current = stack.pop()
    if (!current) continue
    const { value: item, depth } = current
    if (depth > limits.maxDepth) return false
    if (item == null) continue

    if (typeof item === 'string') {
      if (item.length > limits.maxStringChars) return false
      if (!addChars(item.length)) return false
      continue
    }
    if (typeof item === 'number') {
      if (!Number.isFinite(item)) return false
      if (!addChars(String(item).length)) return false
      continue
    }
    if (typeof item === 'boolean') {
      if (!addChars(item ? 4 : 5)) return false
      continue
    }
    if (typeof item !== 'object') return false
    if (seen.has(item)) return false
    seen.add(item)

    containerNodes += 1
    if (containerNodes > limits.maxContainerNodes) return false

    if (Array.isArray(item)) {
      if (item.length > limits.maxArrayItems) return false
      for (let index = item.length - 1; index >= 0; index -= 1) {
        stack.push({ value: item[index], depth: depth + 1 })
      }
      continue
    }
    if (!isPlainRecord(item)) return false
    const entries = Object.entries(item)
    if (entries.length > limits.maxObjectKeys) return false
    for (const [key, child] of entries) {
      if (!addChars(key.length)) return false
      stack.push({ value: child, depth: depth + 1 })
    }
  }
  return true
}

/**
 * Schema do IR de exemplo COM a pré-guarda de profundidade/tamanho aplicada antes
 * do parse recursivo. `superRefine` roda a pré-checagem; se passar, o
 * `SZIRSchema` valida a forma. (z.preprocess não dá para lançar; aqui o refine
 * adiciona uma issue e o pipe para o SZIRSchema só ocorre se shape passou.)
 */
const BoundedExampleIRSchema = z
  .custom<unknown>((value) => isIrExampleWithinLimits(value), {
    error: 'IR de exemplo excede o tamanho ou a profundidade máxima permitida.',
  })
  .pipe(SZIRSchema)

// Tetos defensivos: um manifest é só metadados + docs, então strings imensas
// indicam dados malformados/maliciosos. Limites generosos para não atrapalhar
// extensões reais (o docs oficial tem ~1 KB) mas finitos para evitar exaustão
// de memória se um dia carregarmos extensões de terceiros.
const MAX_NAME_CHARS = 80
const MAX_DESCRIPTION_CHARS = 500
const MAX_CATEGORY_CHARS = 60
// A `docs` é o manual do ALUNO (markdown renderizado no "Saiba mais", um modal
// com scroll) — o teto é só uma trava de sanidade, não um limite de UI, e não
// entra no contexto da IA (esse é o `promptContext`, separado). Subiu de 20k
// porque DUAS extensões oficiais já batiam nele (game-2d e game-2d-advanced), e
// aí cada kit novo custava enxugar seção antiga em vez de explicar melhor.
// Subiu de novo (32k → 40k) pelo MESMO motivo, no 4º kit do Jogo 2D Avançado: com
// 242 blocos, 32k dá ~130 caracteres por bloco — o teto passou a decidir o que a
// criança pode ler, que é exatamente o que ele não deve fazer. Uma trava de
// sanidade contra dados malformados não precisa ser apertada.
// E de novo (40k → 48k), no 6º review: com 274 blocos (🛤️ Caminhos + 🏰 Kit
// Defesa de Torre), 40k já apertava. Mesma lógica: é sanidade, não limite de UI.
// E de novo (48k → 60k), no R30 (cartas + tabuleiro + chefes): ~35 blocos e um
// Kit Cartas novos deixaram a doc do Jogo 2D Avançado em 47,9k/48k — sem folga
// para explicar os gêneros novos. Sanidade, não UI.
const MAX_DOCS_CHARS = 60_000
// Espelho do MAX_DOCS_CHARS para o CONTEXTO DA IA (ExtensionDefinition.ai.
// promptContext): ele é concatenado CRU no system prompt (state/aiAdapter →
// ai/prompts.buildSystemPrompt) e NÃO tem teto em runtime DE PROPÓSITO —
// truncar cortaria uma receita no meio e a IA passaria a ensinar errado. A
// trava é de SANIDADE, validada em teste (extensions/__tests__/manifest.test.ts)
// contra TODAS as extensões oficiais. Hoje o maior (game-2d-advanced) tem ~30k;
// estourou o teto? ENXUGUE o ai.ts — cada char daqui custa em toda chamada.
// Subiu 36k → 42k no R30 (as receitas de cartas/tabuleiro/chefe não cabiam).
export const MAX_PROMPT_CONTEXT_CHARS = 42_000
const MAX_EXAMPLES = 50

export const ExtensionExampleSchema = z.object({
  name: z.string().min(1).max(MAX_NAME_CHARS),
  experience: z.enum(['game', 'demo', 'exploration']),
  description: z.string().max(MAX_DESCRIPTION_CHARS).optional(),
  // Pré-guarda de profundidade/tamanho ANTES do parse recursivo do SZIRSchema.
  ir: BoundedExampleIRSchema,
  // Assets embutidos (só imagens minúsculas). Forma permissiva (custom mantém
  // width/height/source/libId e infere ProjectAsset — espelha o `ir` acima); a
  // sanitização real é do projectStore ao criar o projeto.
  assets: z
    .array(
      z.custom<ProjectAsset>(
        (v) =>
          typeof v === 'object' &&
          v !== null &&
          typeof (v as { id?: unknown }).id === 'string' &&
          typeof (v as { name?: unknown }).name === 'string' &&
          typeof (v as { kind?: unknown }).kind === 'string' &&
          typeof (v as { dataUrl?: unknown }).dataUrl === 'string',
        { error: 'asset de exemplo malformado' },
      ),
    )
    .optional(),
})

export const ExtensionManifestSchema = z.object({
  id: z
    .string()
    .min(2)
    .max(40)
    .regex(/^[a-z0-9-]+$/, 'id deve ser kebab-case (apenas a-z, 0-9 e -)'),
  name: z.string().min(1).max(MAX_NAME_CHARS),
  version: z.string().regex(/^\d+\.\d+\.\d+$/, 'version deve ser semver simples (ex.: 0.1.0)'),
  description: z.string().min(1).max(MAX_DESCRIPTION_CHARS),
  category: z.string().min(1).max(MAX_CATEGORY_CHARS),
  official: z.literal(true),
  enabledByDefault: z.boolean(),
  permissions: z.array(ExtensionPermissionSchema),
  docs: z.string().max(MAX_DOCS_CHARS),
  examples: z.array(ExtensionExampleSchema).max(MAX_EXAMPLES),
}) satisfies z.ZodType<ExtensionManifest>

export function validateManifest(input: unknown): ExtensionManifest {
  return ExtensionManifestSchema.parse(input)
}
