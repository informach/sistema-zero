import { describe, expect, test } from 'bun:test'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { GESTO_NA_TELA } from './gestos-na-tela'
import { extrairPartesElevenLabs, semTags } from './roteiro-elevenlabs'

/**
 * O vídeo da experiência explica o conceito e convida a investigar, como no Cadê (decisão da
 * responsável, 02/11/2026; regra nas DIRETRIZES, "Exploração livre"). A investigação é da criança e
 * quem acompanha cada teste é o Zappy, dentro da experiência: o vídeo não aponta os controles, não
 * dita a sequência de testes e termina no convite com o fecho combinado.
 * Desde 09/11/2026 vale também para o Cadê e para a aula 1 do Desafio, que serão gravados de novo
 * (antes ficavam de fora por já estarem gravados).
 */
const RAIZ = resolve(import.meta.dir, '../../aulas-interativas')
const CURSOS = [
  'faisca/cade-todo-mundo',
  'faisca/desafio-primeiro-jogo',
  'faisca/a-ilha-do-farol',
  'faisca/poder-a-ponte-apressada',
  'faisca/poder-moedas-no-caminho',
  'faisca/poder-o-bau-dos-simbolos',
  'faisca/poder-o-segredo-da-cabana',
  'construtor/nave-contra-asteroides',
  'construtor/o-jogo-do-meu-jeito',
  'inventor/corre-dino',
]

interface Bloco {
  key: string
  plannedVideo?: string
  content?: { kind?: string; instructions?: string; activity?: { type?: string } }
}
interface Manifesto {
  blocks: Bloco[]
  sections: { key: string; blockKeys: string[] }[]
}

interface Caso {
  aula: string
  parte: string
  experiencia: Bloco
  fala: string
  tela: string
}

const casos: Caso[] = []
for (const curso of CURSOS) {
  const pasta = resolve(RAIZ, curso)
  for (const arquivo of readdirSync(pasta).filter((f) => f.endsWith('.manifesto.json'))) {
    const manifesto = JSON.parse(readFileSync(resolve(pasta, arquivo), 'utf8')) as Manifesto
    // ⚠️ O nome do arquivo, não o `lessonSlug` (que é curto: "dia-2", "aula-03").
    const aula = arquivo.replace('.manifesto.json', '')
    const caminho = resolve(pasta, `${aula}.roteiro.md`)
    if (!existsSync(caminho)) continue
    const roteiro = readFileSync(caminho, 'utf8')
    const partes = extrairPartesElevenLabs(roteiro)
    const porChave = new Map(manifesto.blocks.map((b) => [b.key, b]))
    for (const secao of manifesto.sections) {
      const blocos = secao.blockKeys.map((k) => porChave.get(k)).filter((b) => b !== undefined)
      const experiencia = blocos.find((b) => b.content?.activity?.type === 'experimentation')
      const video = blocos.find((b) => b.plannedVideo !== undefined)
      if (!experiencia || !video) continue
      const parte = partes.find((p) => p.clipe === video.key)
      if (!parte) continue
      const inicio = roteiro.indexOf(`**Clipe:** \`${video.key}\``)
      const tela = roteiro.slice(inicio).match(/\*\*Na tela:\*\*([^\n]*)/)?.[1] ?? ''
      casos.push({
        aula,
        parte: secao.key,
        experiencia,
        fala: semTags(parte.texto),
        tela,
      })
    }
  }
}

describe('o vídeo da experiência explica o conceito e convida a investigar', () => {
  test('a varredura encontrou os vídeos de experiência dos cursos', () => {
    expect(casos.length).toBeGreaterThan(60)
  })

  test.each(
    casos.map((c) => [`${c.aula}/${c.parte}`, c] as const),
  )('%s: sem tour pelos controles nem roteiro de testes', (_nome, c) => {
    expect(c.fala).not.toMatch(/Olha aqui: nesta experi[eê]ncia/i)
    expect(c.fala).not.toMatch(/\baqui voc[eê] v[eê]\b/i)
    expect(c.fala).not.toMatch(
      /\b(este|estes|esta|estas) (bot[aã]o|bot[õo]es|campo|campos|lista|r[ée]gua|controle|controles|caixa|chave de)\b/i,
    )
    expect(c.fala).not.toMatch(
      /\bnas duas vezes\b|\bdepois,? teste\b|\bteste mais (uma|duas|tr[eê]s)\b/i,
    )
    expect(c.fala).toContain('O Zappy vai te mostrando o que testar')
    // Na tela o vídeo só amplia a experiência: nenhum gesto num controle dela (os mesmos gestos
    // que video-experiencia.test.ts reprova) e nenhum "Olha aqui".
    expect(c.tela).not.toMatch(GESTO_NA_TELA)
    expect(c.tela).not.toMatch(/Olha aqui/)
  })

  test.each(
    casos.map((c) => [`${c.aula}/${c.parte}`, c] as const),
  )('%s: a instrução da página diz o que comparar, sem sequência de cliques', (_nome, c) => {
    const instrucao = c.experiencia.content?.instructions ?? ''
    expect(instrucao).not.toMatch(/\bClique em\b/)
    expect(instrucao.split(/[.!?](?:\s|$)/).filter((f) => f.trim()).length).toBeLessThanOrEqual(3)
  })
})

/**
 * A retomada em outra parte lembra o conceito ou o que se observou, nunca um botão ou um
 * interruptor da experiência (decisão de 09/11/2026): a experiência pode mudar o nome e o visual
 * dos controles sem pedir voz nova. "Ligado a"/"ligada ao" é o conceito ("a reação ligada ao
 * toque", "o som ligado ao pulo") e continua valendo.
 */
const INTERRUPTOR = /\bdesligad[oa]s?\b|\bligad[oa]s?\b(?! ao? )/i
const BOTAO = /\bbot(?:ão|ões)(?![\p{L}\p{N}])/iu

interface Retomada {
  onde: string
  trecho: string
}

const retomadas: Retomada[] = []
for (const curso of CURSOS) {
  const pasta = resolve(RAIZ, curso)
  for (const arquivo of readdirSync(pasta).filter((f) => f.endsWith('.roteiro.md'))) {
    for (const parte of extrairPartesElevenLabs(readFileSync(resolve(pasta, arquivo), 'utf8'))) {
      const frases = semTags(parte.texto)
        .split(/(?<=[.!?])\s+/)
        .filter((f) => f.trim())
      frases.forEach((frase, n) => {
        if (!/Lembra da experiência/i.test(frase)) return
        retomadas.push({
          onde: `${arquivo.replace('.roteiro.md', '')}/${parte.clipe}`,
          trecho: [frase, frases[n + 1] ?? ''].join(' ').trim(),
        })
      })
    }
  }
}

describe('a retomada lembra o conceito, não um controle da experiência', () => {
  test('a varredura encontrou as retomadas dos cursos', () => {
    expect(retomadas.length).toBeGreaterThan(10)
  })

  test.each(
    retomadas.map((r) => [r.onde, r] as const),
  )('%s: sem botão nem interruptor ligado/desligado', (_nome, r) => {
    expect(r.trecho).not.toMatch(INTERRUPTOR)
    expect(r.trecho).not.toMatch(BOTAO)
  })

  test('a regra reprova o interruptor e aceita o conceito ligado a alguma coisa', () => {
    expect('Com o limite da tela ligado, o jogo puxava ele.').toMatch(INTERRUPTOR)
    expect('Com a memória desligada, nada mudava.').toMatch(INTERRUPTOR)
    expect('Com a pergunta ligada, a porta respondia.').toMatch(INTERRUPTOR)
    expect('Você apertou o botão da cerca.').toMatch(BOTAO)
    expect(
      'O toque só deixava o esconderijo invisível quando a reação estava ligada a ele.',
    ).not.toMatch(INTERRUPTOR)
    expect('O som ligado ao pulo tocava em cada salto.').not.toMatch(INTERRUPTOR)
  })
})
