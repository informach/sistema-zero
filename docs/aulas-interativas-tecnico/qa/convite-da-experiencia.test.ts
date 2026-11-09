import { describe, expect, test } from 'bun:test'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
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
    expect(c.fala).toContain('Você escolhe por onde começar')
    // Na tela o vídeo só amplia a experiência: nada de apontar um controle dela.
    expect(c.tela).not.toMatch(/\[apontar "/)
  })

  test.each(
    casos.map((c) => [`${c.aula}/${c.parte}`, c] as const),
  )('%s: a instrução da página diz o que comparar, sem sequência de cliques', (_nome, c) => {
    const instrucao = c.experiencia.content?.instructions ?? ''
    expect(instrucao).not.toMatch(/\bClique em\b/)
    expect(instrucao.split(/[.!?](?:\s|$)/).filter((f) => f.trim()).length).toBeLessThanOrEqual(3)
  })
})
