import { describe, expect, test } from 'bun:test'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  CONCORDANCIA_ERRADA,
  concordanciasErradas,
  GUIA_PESSOA,
  guiasPessoa,
  PALAVRAS_DA_ESCOLA,
  palavrasDaEscola,
} from './palavras-da-escola'

/**
 * Vocabulário da aventura (Diretrizes, seção 6, 06/10/2026): tudo o que a criança lê numa aula
 * fala de aventura, fase, parte, Mapa da Aventura e equipe. Por dentro (chaves, `plannedVideo`,
 * objetivo da seção, projeto do Estúdio) a equipe continua falando curso, aula, seção e caderno.
 *
 * O validador de roteiros confere a narração; este teste confere o texto dos manifestos que
 * vira tela: título da aula e das seções, Zappy, experiências, quiz, materiais, certificado, os
 * critérios que aparecem em "Objetivos desta parte" (`completion.projectChecks[].label`) e o
 * título e o resumo que já vêm prontos no Compartilhar (`showcase`). A régua é a única do repo,
 * em `palavras-da-escola.ts`.
 */

const AULAS = join(import.meta.dir, '..', 'aulas')

/**
 * Campos que a criança não lê: identificadores, direção de produção, o código do jogo e as
 * chaves técnicas dos blocos. `completion` e `showcase` NÃO estão aqui: o rótulo de cada
 * `projectChecks` aparece em "Objetivos desta parte" (`section-project-check.tsx`) e o `showcase`
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

const manifestos = readdirSync(AULAS)
  .filter((nome) => nome.endsWith('.manifesto.json'))
  .map((nome) => ({ nome, manifesto: JSON.parse(readFileSync(join(AULAS, nome), 'utf8')) }))

const roteiros = readdirSync(AULAS)
  .filter((nome) => nome.endsWith('.roteiro.md'))
  .map((nome) => ({ nome, texto: readFileSync(join(AULAS, nome), 'utf8') }))

describe('vocabulário da criança nos manifestos', () => {
  test('nenhuma palavra da escola no que vira tela', () => {
    // Guarda que não lê nada aprova tudo, e em silêncio.
    expect(manifestos.length).toBe(37)
    const achados = manifestos.flatMap(({ nome, manifesto }) =>
      textosVisiveis(manifesto)
        .filter(({ texto }) => PALAVRAS_DA_ESCOLA.test(texto))
        .map(
          ({ caminho, texto }) =>
            `${nome} ${caminho}: [${palavrasDaEscola(texto).join(', ')}] ${texto.slice(0, 120)}`,
        ),
    )
    expect(achados).toEqual([])
  })

  test('concordância: aventura, fase e parte são femininas; Mundo é masculino', () => {
    // A troca palavra por palavra deixa "o fase", "no parte" ou "na Mundo". Vale para o que vira
    // tela e para o roteiro inteiro (fala e notas), que a equipe copia para os manifestos.
    expect(roteiros.length).toBe(37)
    const achados = [
      ...manifestos.flatMap(({ nome, manifesto }) =>
        textosVisiveis(manifesto)
          .filter(({ texto }) => CONCORDANCIA_ERRADA.test(texto))
          .map(({ caminho, texto }) => `${nome} ${caminho}: ${concordanciasErradas(texto)}`),
      ),
      ...roteiros.flatMap(({ nome, texto }) =>
        texto
          .split('\n')
          .map((linha, i) => ({ linha, i }))
          .filter(({ linha }) => CONCORDANCIA_ERRADA.test(linha))
          .map(({ linha, i }) => `${nome}:${i + 1}: ${concordanciasErradas(linha)}`),
      ),
    ]
    expect(achados).toEqual([])
  })

  test('"guia" não é pessoa: quem recebe o projeto e responde os recados é a equipe', () => {
    // Decisão da dona, 06/10/2026, à noite: o botão diz o que a criança envia ("Enviar meu
    // projeto", "Enviar (1)") e quem lê é a equipe. Vale para o manifesto INTEIRO, porque o
    // `plannedVideo` cita os botões para quem grava, e para o roteiro inteiro (fala, ponte do
    // Zappy e notas de tela).
    const achados = [
      ...manifestos.flatMap(({ nome, manifesto }) =>
        todosOsTextos(manifesto)
          .filter(({ texto }) => GUIA_PESSOA.test(texto))
          .map(({ caminho, texto }) => `${nome} ${caminho}: ${guiasPessoa(texto).join(', ')}`),
      ),
      ...roteiros.flatMap(({ nome, texto }) =>
        texto
          .split('\n')
          .map((linha, i) => ({ linha, i }))
          .filter(({ linha }) => GUIA_PESSOA.test(linha))
          .map(({ linha, i }) => `${nome}:${i + 1}: ${guiasPessoa(linha).join(', ')}`),
      ),
    ]
    expect(achados).toEqual([])
    // A régua pega a pessoa e deixa passar o painel do Pensa e o verbo.
    for (const pessoa of [
      'Clique em Enviar para o guia.',
      'Envie o projeto para o guia',
      'Pedir ajuda ao seu guia',
      'Recados do guia',
      'Espere aparecer Recebido pelo seu guia.',
      'O seu guia vai olhar',
      'Guia',
    ])
      expect(GUIA_PESSOA.test(pessoa), pessoa).toBe(true)
    for (const outra of [
      'Guia do Pensa',
      'Abra o guia do Pensa',
      'Recados da equipe',
      'Clique em Enviar meu projeto e confirme em Enviar.',
      'Do primeiro movimento à luz que guia o barco.',
    ])
      expect(GUIA_PESSOA.test(outra), outra).toBe(false)
    expect(guiasPessoa('Enviar para o guia e Recados do guia')).toEqual(['o guia', 'do guia'])
  })

  test('o detector lê os campos certos e ignora os internos', () => {
    const textos = textosVisiveis({
      title: 'Fase 1',
      sections: [
        {
          key: 'secao-caderno',
          title: 'Seu Mapa da Aventura',
          objective: 'Ver o caderno',
          completion: {
            blockIds: ['video-aula'],
            projectChecks: [
              {
                id: 'check-aula',
                label: 'Mostre o placar da aula.',
                rule: { type: 'usesBlock', blockType: 'sz_aula', fields: { NAME: 'curso' } },
              },
            ],
          },
        },
      ],
      blocks: [
        { key: 'video-aula', plannedVideo: 'Gravar a aula' },
        {
          key: 'zappy',
          content: { kind: 'dialogue', pose: 'speaking', text: 'Clique em Próxima seção.' },
        },
        {
          key: 'estudio',
          content: {
            kind: 'studio',
            showcase: {
              title: 'Meu jogo da aula',
              summary: 'Um jogo do curso.',
              defaultCoverUrl: 'https://cdn.exemplo/curso/aula.png',
            },
          },
        },
      ],
    }).map(({ texto }) => texto)
    expect(textos).toContain('Seu Mapa da Aventura')
    expect(textos).not.toContain('Ver o caderno')
    expect(textos).not.toContain('Gravar a aula')
    expect(textos).not.toContain('video-aula')
    expect(textos).not.toContain('sz_aula')
    expect(textos).not.toContain('curso')
    expect(textos).not.toContain('https://cdn.exemplo/curso/aula.png')
    expect(textos).not.toContain('speaking')
    expect(textos.filter((texto) => PALAVRAS_DA_ESCOLA.test(texto))).toEqual([
      'Mostre o placar da aula.',
      'Clique em Próxima seção.',
      'Meu jogo da aula',
      'Um jogo do curso.',
    ])
  })

  test('a régua pega as palavras da escola e deixa passar o vocabulário da aventura', () => {
    for (const escola of [
      'Passe no quiz (nota mínima 70%)',
      'Abra o Caderno do Aluno',
      'Conclua a unidade 1',
      'Termine a atividade',
      'Faça a entrega',
      'O projeto foi entregue',
      'Hora de estudar',
      'Seus trabalhos',
      'A devolutiva do professor',
      'Sua formatura',
      'Seu diploma',
      'A lição de hoje',
    ])
      expect(PALAVRAS_DA_ESCOLA.test(escola), escola).toBe(true)
    for (const aventura of [
      'Toque a nota dó',
      'Verificar esta parte',
      'Abra o Estúdio',
      'estudio-completo',
      'Mural da Comunidade',
      'Use a sua criatividade',
      'Mapa da Aventura',
      'Concluir tarefa',
    ])
      expect(PALAVRAS_DA_ESCOLA.test(aventura), aventura).toBe(false)
    expect(palavrasDaEscola('A aula e a seção do curso')).toEqual(['aula', 'seção', 'curso'])
  })

  test('a concordância pega o artigo trocado e deixa passar o que está certo', () => {
    for (const errado of [
      'Clique em o parte',
      'Lembra do fase anterior?',
      'Clique no próximo parte',
      'Próximo parte',
      'um aventura nova',
      'Abra o baú da Mundo 1',
      'Chegue à Mundo 2',
    ])
      expect(CONCORDANCIA_ERRADA.test(errado), errado).toBe(true)
    for (const certo of [
      'Clique em Próxima parte',
      'Lembra da experiência da parte anterior?',
      'no fim da parte',
      'ao lado da parte',
      'um pedaço da parte',
      'o baú do Mundo 1',
      'a primeira fase',
      'Ela é mesmo parte do jogo',
      'Espere 3 segundos. Parte 2',
    ])
      expect(CONCORDANCIA_ERRADA.test(certo), certo).toBe(false)
  })
})
