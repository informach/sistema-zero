import type { PensaCapabilitySnapshot } from '@sistemazero/core/pensa'
import { SERVER_EXAMPLES_INDEX } from '@sistemazero/studio/server-examples'
import { expandedTerms, scoreTokens, searchTerms, tokenizeSearchable } from '../zappy-search'

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/** "Invasores do Espaço (na mão)" → "Invasores do Espaço": o nome como aparece no texto. */
function baseName(name: string): string {
  return name.replace(/\s*\([^)]*\)\s*$/, '').trim()
}

/** O texto da mecânica sem o NOME do exemplo nem o jargão interno ("na mão", "núcleo"). */
function anonymous(text: string, name: string): string {
  const base = baseName(name)
  let out = text
  if (base.length >= 3) out = out.replace(new RegExp(escapeRegExp(base), 'giu'), 'o jogo')
  return out
    .replace(/\s*\(na mão\)/giu, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Mecânicas concretas do Estúdio que o Zappy conhece por dentro. Exigir todos os blocos evita
 * ensinar uma mecânica que só cabe parcialmente no posto; a montagem da criança ainda precisa de
 * teste.
 *
 * ⚠️⚠️ ANÔNIMAS, pela mesma decisão de produto do tutor do Estúdio (CLAUDE.md, lote "Zappy mais
 * inteligente"): a criança NÃO sabe que os exemplos existem e não pode saber. O que vai ao modelo
 * é só como funciona e quais blocos, sem `key` nem `name`; e o nome do exemplo é tirado do texto
 * ("Jogar Space Invaders feito somente com o núcleo", da promessa, chegava inteiro ao modelo).
 */
export function journeyRecipes(query: string, capabilities: PensaCapabilitySnapshot) {
  const terms = expandedTerms(searchTerms(query))
  const blocks = new Set(capabilities.blockIds)
  return SERVER_EXAMPLES_INDEX.filter(
    (recipe) =>
      recipe.blockTypes.length > 0 &&
      recipe.blockTypes.every((id) => blocks.has(id)) &&
      recipe.requires.every((id) => capabilities.extensionIds.includes(id)),
  )
    .map((recipe) => ({
      recipe,
      score: scoreTokens(
        terms,
        tokenizeSearchable(
          `${recipe.description} ${recipe.concepts?.join(' ') ?? ''} ${recipe.promise} ${recipe.scenario}`,
        ),
      ),
    }))
    .sort((a, b) => b.score - a.score || a.recipe.blockTypes.length - b.recipe.blockTypes.length)
    .slice(0, 4)
    .map(({ recipe }) => ({
      mecanicas: (recipe.concepts ?? []).slice(0, 8),
      // O roteiro de jogo (controles, regra, vitória) é a mecânica; a "promessa" e a descrição
      // citam o nome do exemplo e o jogo famoso em que ele se inspira, e ficam só na busca.
      comoFunciona: anonymous(recipe.scenario, recipe.name).slice(0, 400),
      blocos: [...new Set(recipe.blockTypes)].slice(0, 14),
      extensoes: [...recipe.requires],
    }))
}
