import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { caminhoAula, listarArquivosAulas } from './caminhos'
import { concordanciasErradas, guiasPessoa, PALAVRAS_DA_ESCOLA } from './palavras-da-escola'

/**
 * Vocabulário da aventura (Diretrizes, seção 6, 06/10/2026): tudo o que a criança lê numa aula
 * fala de aventura, fase, parte, Mapa da Aventura e equipe. Por dentro (chaves, `plannedVideo`,
 * objetivo da seção, projeto do Estúdio) a equipe continua falando curso, aula, seção e caderno.
 *
 * O validador de roteiros confere a narração; este teste confere o texto dos manifestos que
 * vira tela: título da aula e das seções, Zappy, experiências, quiz, materiais, certificado, os
 * critérios que aparecem em "Objetivos do projeto" (`completion.projectChecks[].label`) e o
 * título e o resumo que já vêm prontos no Compartilhar (`showcase`). A régua é a única do repo,
 * em `palavras-da-escola.ts`.
 */

/**
 * Campos que a criança não lê: identificadores, direção de produção, o código do jogo e as
 * chaves técnicas dos blocos. `completion` e `showcase` NÃO estão aqui: o rótulo de cada
 * `projectChecks` aparece em "Objetivos do projeto" (`section-project-check.tsx`) e o `showcase`
 * preenche o título e o resumo do Compartilhar (`studio-block.tsx`). O que é técnico dentro deles
 * (`blockIds`, `rule`, `defaultCoverUrl`) fica de fora pelo nome.
 */
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
  'retireBlockKeys',
  'initialProject',
  'project',
  'allowBlocks',
  'chain',
  'scene',
  'cenario',
  'initialAsset',
  // Dentro de `completion`: as chaves dos blocos exigidos e a regra que confere o projeto.
  'blockIds',
  'rule',
  // Dentro de `showcase`: o endereço da capa pronta.
  'defaultCoverUrl',
  // Valores de enumeração do formato (tipo do bloco, pose do Zappy, propósito do material…).
  'kind',
  'type',
  'pose',
  'purpose',
  'level',
  'allowedModes',
  'correctChoiceIds',
  // Dentro da cena: metas, ações e figuras são ids; o texto da meta mora em `goalCopy`.
  'goals',
  'actions',
  'figure',
  'gender',
  'pilha',
])

/** Todos os textos de um manifesto, inclusive os internos (o `plannedVideo` cita os botões). */
function todosOsTextos(valor: unknown, caminho = ''): { caminho: string; texto: string }[] {
  if (typeof valor === 'string') return [{ caminho, texto: valor }]
  if (Array.isArray(valor))
    return valor.flatMap((item, i) => todosOsTextos(item, `${caminho}[${i}]`))
  if (typeof valor !== 'object' || valor === null) return []
  return Object.entries(valor).flatMap(([chave, item]) =>
    todosOsTextos(item, caminho ? `${caminho}.${chave}` : chave),
  )
}

export function textosVisiveis(valor: unknown, caminho = ''): { caminho: string; texto: string }[] {
  if (typeof valor === 'string') return [{ caminho, texto: valor }]
  if (Array.isArray(valor))
    return valor.flatMap((item, i) => textosVisiveis(item, `${caminho}[${i}]`))
  if (typeof valor !== 'object' || valor === null) return []
  return Object.entries(valor).flatMap(([chave, item]) =>
    INTERNOS.has(chave) ? [] : textosVisiveis(item, caminho ? `${caminho}.${chave}` : chave),
  )
}

const manifestos = listarArquivosAulas()
  .filter((nome) => nome.endsWith('.manifesto.json'))
  .map((nome) => ({ nome, manifesto: JSON.parse(readFileSync(caminhoAula(nome), 'utf8')) }))

const roteiros = listarArquivosAulas()
  .filter((nome) => nome.endsWith('.roteiro.md'))
  .map((nome) => ({ nome, texto: readFileSync(caminhoAula(nome), 'utf8') }))

test('quem recebe e responde é a equipe também nas notas e nos planos de vídeo', () => {
  for (const { nome, manifesto } of manifestos) {
    for (const item of todosOsTextos(manifesto))
      expect(guiasPessoa(item.texto), `${nome}: ${item.caminho}`).toEqual([])
  }
  for (const { nome, texto } of roteiros) expect(guiasPessoa(texto), nome).toEqual([])
})

describe('linguagem comum nos cursos', () => {
  test('as 51 aulas usam os mesmos rótulos de tela para os dois públicos', () => {
    expect(manifestos.length).toBe(51)
    const antigos = manifestos.flatMap(({ nome, manifesto }) =>
      textosVisiveis(manifesto)
        .filter(({ texto }) => PALAVRAS_DA_ESCOLA.test(texto))
        .map(({ caminho, texto }) => `${nome} ${caminho}: ${texto}`),
    )
    expect(antigos).toEqual([])
  })
  test('a concordância e o destinatário são conferidos no texto público', () => {
    const problemas = manifestos.flatMap(({ nome, manifesto }) =>
      textosVisiveis(manifesto).flatMap(({ texto }) =>
        [...concordanciasErradas(texto), ...guiasPessoa(texto)].map((m) => `${nome}: ${m}`),
      ),
    )
    expect(problemas).toEqual([])
  })
  test('o detector distingue o comando antigo do nome de um nível do jogo', () => {
    for (const t of [
      'Concluir fase',
      'Próxima seção',
      'Próxima etapa',
      'Mapa da Aventura',
      'Enviar para o professor',
    ])
      expect(PALAVRAS_DA_ESCOLA.test(t)).toBe(true)
    for (const t of [
      'Curso',
      'Aula',
      'Próxima parte',
      'Concluir aula',
      'Passo a passo do projeto',
      'Escolha a fase do jogo',
    ])
      expect(PALAVRAS_DA_ESCOLA.test(t)).toBe(false)
  })
  test('o scanner ignora projetos e identificadores, mas inclui objetivos e publicação', () => {
    const textos = textosVisiveis({
      key: 'curso',
      initialProject: { name: 'Concluir fase' },
      title: 'Curso',
      completion: {
        blockIds: ['id'],
        projectChecks: [{ label: 'Teste seu jogo', rule: { type: 'usesBlock' } }],
      },
      showcase: { summary: 'Seu jogo publicado' },
    }).map((t) => t.texto)
    expect(textos).toEqual(['Curso', 'Teste seu jogo', 'Seu jogo publicado'])
  })
})
