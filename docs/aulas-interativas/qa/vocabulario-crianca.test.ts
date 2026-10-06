import { describe, expect, test } from 'bun:test'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

/**
 * Vocabulário da aventura (Diretrizes, seção 6, 06/10/2026): tudo o que a criança lê numa aula
 * fala de aventura, fase, parte, Mapa da Aventura e guia. Por dentro (chaves, `plannedVideo`,
 * objetivo da seção, projeto do Estúdio) a equipe continua falando curso, aula, seção e caderno.
 *
 * O validador de roteiros confere a narração; este teste confere o texto dos manifestos que
 * vira tela: título da aula e das seções, Zappy, experiências, quiz, materiais e certificado.
 */
export const PALAVRAS_DA_ESCOLA =
  /\b(?:aulas?|cursos?|professor(?:a|as|es)?|alun[oa]s?|seç(?:ão|ões)|cadernos?|etapas?|nota m[ií]nima)\b/i

const AULAS = join(import.meta.dir, '..', 'aulas')

/** Campos que a criança não lê: identificadores, direção de produção e o código do jogo. */
const INTERNOS = new Set([
  'key',
  'id',
  'url',
  'courseSlug',
  'lessonSlug',
  'plannedVideo',
  'objective',
  'intent',
  'blockKeys',
  'workspaceKey',
  'externalTool',
  'completion',
  'retireBlockKeys',
  'initialProject',
  'project',
  'showcase',
  'allowBlocks',
  'chain',
  'scene',
  'cenario',
  'initialAsset',
])

export function textosVisiveis(valor: unknown, caminho = ''): { caminho: string; texto: string }[] {
  if (typeof valor === 'string') return [{ caminho, texto: valor }]
  if (Array.isArray(valor))
    return valor.flatMap((item, i) => textosVisiveis(item, `${caminho}[${i}]`))
  if (typeof valor !== 'object' || valor === null) return []
  return Object.entries(valor).flatMap(([chave, item]) =>
    INTERNOS.has(chave) ? [] : textosVisiveis(item, caminho ? `${caminho}.${chave}` : chave),
  )
}

const manifestos = readdirSync(AULAS)
  .filter((nome) => nome.endsWith('.manifesto.json'))
  .map((nome) => ({ nome, manifesto: JSON.parse(readFileSync(join(AULAS, nome), 'utf8')) }))

describe('vocabulário da criança nos manifestos', () => {
  test('nenhuma palavra da escola no que vira tela', () => {
    // Guarda que não lê nada aprova tudo, e em silêncio.
    expect(manifestos.length).toBe(37)
    const achados = manifestos.flatMap(({ nome, manifesto }) =>
      textosVisiveis(manifesto)
        .filter(({ texto }) => PALAVRAS_DA_ESCOLA.test(texto))
        .map(({ caminho, texto }) => `${nome} ${caminho}: ${texto.slice(0, 120)}`),
    )
    expect(achados).toEqual([])
  })

  test('o detector lê os campos certos e ignora os internos', () => {
    const textos = textosVisiveis({
      title: 'Fase 1',
      sections: [
        { key: 'secao-caderno', title: 'Seu Mapa da Aventura', objective: 'Ver o caderno' },
      ],
      blocks: [
        { key: 'video-aula', plannedVideo: 'Gravar a aula' },
        { key: 'zappy', content: { kind: 'dialogue', text: 'Clique em Próxima seção.' } },
      ],
    }).map(({ texto }) => texto)
    expect(textos).toContain('Seu Mapa da Aventura')
    expect(textos).not.toContain('Ver o caderno')
    expect(textos).not.toContain('Gravar a aula')
    expect(textos.filter((texto) => PALAVRAS_DA_ESCOLA.test(texto))).toEqual([
      'Clique em Próxima seção.',
    ])
    expect(PALAVRAS_DA_ESCOLA.test('Passe no quiz (nota mínima 70%)')).toBe(true)
    expect(PALAVRAS_DA_ESCOLA.test('Toque a nota dó')).toBe(false)
    expect(PALAVRAS_DA_ESCOLA.test('Verificar esta parte')).toBe(false)
  })
})
