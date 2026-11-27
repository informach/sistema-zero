/**
 * O padrão das missões de posto (24/11/2026). O Jardim Secreto é a missão do Faísca, e A Estação de
 * Reciclagem (27/11/2026), a do Construtor. Uma missão não
 * ensina o passo a passo: montar o jogo é o desafio para subir de posto, e tudo já foi ensinado nos
 * cursos base, com outro tema. Este teste confere que:
 * - nenhum Na tela monta blocos nem envia (sem gestos de montagem, de paleta ou de envio);
 * - cada etapa diz em que aula do curso base aquilo foi ensinado e termina no Verificar projeto;
 * - a última etapa envia, e depois dela só vem o fim: o Passo a passo (o caderno) na primeira aula e
 *   a comemoração nas outras, porque o caderno é um só e traz todas as aulas;
 * - não há quiz, nem caderno antes do envio;
 * - a Debinha (Aula 1) e o Dedé (Aula 2) dizem as frases marcadas, na tabela e na voz.
 * Os outros cursos do Faísca, que ensinam montando no vídeo, ficam em faisca-padrao.test.ts.
 */
import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { avatarDaAula } from './avatares-video'
import { estacaoAulas } from './estacao-conteudo'
import { jardimAulas } from './jardim-conteudo'
import type { PoderTrecho } from './poder-gerador'
import { extrairPartesElevenLabs } from './roteiro-elevenlabs'

type Secao = { key: string; intent: string; blockKeys: string[] }
type Missao = {
  nome: string
  /** A pasta em docs/aulas-interativas/<trilha>. */
  trilha: string
  pasta: string
  arquivo: (slug: string) => string
  aulas: { slug: string; trechos: PoderTrecho[] }[]
  /** Os cursos base que a missão cita, para quem precisar voltar. */
  cursosBase: string[]
}

const aulasInterativas = resolve(import.meta.dirname, '../../aulas-interativas')
const MISSOES: Missao[] = [
  {
    nome: 'O Jardim Secreto',
    trilha: 'faisca',
    pasta: 'o-jardim-secreto',
    arquivo: (s) => s,
    aulas: jardimAulas,
    cursosBase: ['Chave do Farol', 'Ilha do Farol'],
  },
  {
    nome: 'A Estação de Reciclagem',
    trilha: 'construtor',
    pasta: 'estacao-de-reciclagem',
    arquivo: (s) => s,
    aulas: estacaoAulas,
    cursosBase: ['Nave Contra Asteroides', 'Patrulha Espacial'],
  },
]
/** Os gestos que montam, mexem nos blocos ou enviam (ESPEC-ROTEIRO, seção 9). */
const MONTAGEM =
  /\[(encaixar|soltar|mover|trocar|escolher|abrir campo|abrir categoria|categoria|jogar na lixeira|abrir "|apontar mais de|arrastar até|mostrar blocos|enviar projeto|clicar "Enviar)/
const etapas = (trechos: PoderTrecho[]) =>
  trechos.filter((t) => t.kind === 'build' || t.kind === 'delivery')

for (const missao of MISSOES) {
  const dir = resolve(aulasInterativas, missao.trilha, missao.pasta)
  const base = `(${missao.cursosBase.join('|')})`
  describe(`${missao.nome}: padrão da missão do posto`, () => {
    test.each(
      missao.aulas.map((a, i) => [a.slug, i] as const),
    )('%s: abertura, etapas, envio e o fim, sem quiz', (slug, i) => {
      const aula = missao.aulas[i]!
      const s = (
        JSON.parse(
          readFileSync(resolve(dir, `${missao.arquivo(slug)}.manifesto.json`), 'utf8'),
        ) as { sections: Secao[] }
      ).sections
      expect(s[0]!.blockKeys).toContain('jogo-pronto')
      const entrega = s.findIndex((x) => x.intent === 'delivery')
      expect(s.filter((x) => x.intent === 'delivery')).toHaveLength(1)
      expect(entrega).toBeGreaterThan(1)
      expect(s.slice(1, entrega).every((x) => x.intent === 'application')).toBe(true)
      expect(s.slice(entrega + 1).map((x) => x.intent)).toEqual(['closing'])
      // O caderno é um só: no fim da primeira aula; nas outras, o fim é só a comemoração.
      if (i === 0) expect(s.at(-1)!.blockKeys).toContain('materiais')
      else expect(s.some((x) => x.blockKeys.includes('materiais'))).toBe(false)
      expect(s.slice(0, entrega + 1).some((x) => x.blockKeys.includes('materiais'))).toBe(false)
      expect(s.some((x) => x.blockKeys.includes('quiz'))).toBe(false)
      expect(aula.trechos.some((t) => t.kind === 'quiz')).toBe(false)
    })

    test.each(
      missao.aulas.map((a) => [a.slug, a] as const),
    )('%s: o vídeo mostra o que fazer, diz onde voltar e nunca monta', (_, aula) => {
      for (const t of aula.trechos) {
        expect(`${t.key}: ${t.screen}`).not.toMatch(MONTAGEM)
        expect(`${t.key}: ${t.text}`).not.toMatch(/\bSalvo\b/)
      }
      for (const t of etapas(aula.trechos)) {
        expect(`${t.key}: ${t.screen}`).toContain('[expandir estúdio]')
        expect(`${t.key}: ${t.text}`).toMatch(new RegExp(`${base}[^.]*Aulas? \\d`))
        expect(`${t.key}: ${t.text}`).toContain('Se esquecer como faz, volte lá.')
        expect(`${t.key}: ${t.text}`).toContain(
          'Funcionou? Clique em Verificar projeto. Se faltar alguma coisa, corrija os blocos e clique novamente.',
        )
        expect(`${t.key}: ${t.ponte}`).toMatch(
          new RegExp(`Esqueceu como faz\\? Volte na ${base}, Aulas? \\d`),
        )
      }
      expect(etapas(aula.trechos).at(-1)!.text).toContain(
        'clique em Enviar meu projeto e confirme em Enviar',
      )
    })

    test.each(
      missao.aulas.map((a, i) => [a.slug, i] as const),
    )('%s: a Debinha ou o Dedé nas frases marcadas, na tabela e na voz', (slug, i) => {
      const aula = missao.aulas[i]!
      const personagem = avatarDaAula(i)
      const trocas = extrairPartesElevenLabs(
        readFileSync(resolve(dir, `${missao.arquivo(slug)}.roteiro.md`), 'utf8'),
      ).flatMap((p) => p.intervencoes)
      const marcadas = aula.trechos.flatMap((t) =>
        (t.kids ?? []).map((frase) => [`video-${t.key}`, frase]),
      )
      expect(marcadas.length).toBeGreaterThan(1)
      expect(trocas.map((t) => [t.clipe, t.falaPersonagem])).toEqual(marcadas)
      expect(new Set(trocas.map((t) => t.personagem))).toEqual(new Set([personagem]))
      const voz = readFileSync(
        resolve(
          dir,
          `${missao.arquivo(slug)}.${personagem === 'Dedé' ? 'dede' : 'debinha'}.elevenlabs.txt`,
        ),
        'utf8',
      )
      expect(voz.split('[long pause]').map((f) => f.trim())).toEqual(
        trocas.map((t) => `${t.tags.join(' ')} ${t.falaPersonagem}`),
      )
    })
  })
}
