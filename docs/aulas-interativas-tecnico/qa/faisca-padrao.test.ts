/**
 * O padrão do Faísca nos cursos já revisados (levantado em 23/11/2026 a partir do Cadê Todo Mundo?,
 * da Chave do Farol e da Ilha do Farol). Cada curso entra em `CURSOS` quando a revisão dele fica
 * pronta; a Ilha é a referência. O teste confere, aula por aula:
 * - a Debinha (Aula 1) ou o Dedé (Aula 2) nas frases marcadas, na tabela do roteiro e na voz;
 * - nenhuma fala nem recado espera o "Salvo";
 * - o envio fecha a última construção, sem parte só de envio, e depois dele só vêm fechamentos;
 * - o Na tela das construções abre o Estúdio e usa os gestos do envio em dois cliques;
 * - as frases fixas de verificar e de sair de cada construção, e o recado do material.
 */
import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { avatarDaAula } from './avatares-video'
import { cabanaAulas } from './cabana-conteudo'
import { ilhaAulas } from './ilha-do-farol-conteudo'
import { meuDesenhoAula } from './meu-desenho-conteudo'
import { moedasAulas } from './moedas-conteudo'
import { ponteAulas } from './ponte-conteudo'
import { extrairPartesElevenLabs } from './roteiro-elevenlabs'
import { simbolosAulas } from './simbolos-conteudo'

type Trecho = {
  key: string
  kind: string
  text: string
  screen: string
  kids?: string[]
  recado?: string
  ponte?: string
}
type Curso = {
  nome: string
  pasta: string
  /** O nome dos arquivos de uma aula, sem a extensão. */
  arquivo: (slug: string) => string
  aulas: { slug: string; trechos: Trecho[] }[]
}

const faisca = resolve(import.meta.dirname, '../../aulas-interativas/faisca')
const CURSOS: Curso[] = [
  { nome: 'A Ilha do Farol', pasta: 'a-ilha-do-farol', arquivo: (s) => s, aulas: ilhaAulas },
  {
    nome: 'Moedas no caminho',
    pasta: 'poder-moedas-no-caminho',
    arquivo: (s) => `moedas-${s}`,
    aulas: moedasAulas,
  },
  {
    nome: 'O segredo da cabana',
    pasta: 'poder-o-segredo-da-cabana',
    arquivo: (s) => `cabana-${s}`,
    aulas: cabanaAulas,
  },
  {
    nome: 'A ponte apressada',
    pasta: 'poder-a-ponte-apressada',
    arquivo: (s) => `ponte-${s}`,
    aulas: ponteAulas,
  },
  {
    nome: 'O baú dos símbolos',
    pasta: 'poder-o-bau-dos-simbolos',
    arquivo: (s) => `simbolos-${s}`,
    aulas: simbolosAulas,
  },
  {
    nome: 'Meu primeiro desenho no Pinta',
    pasta: 'meu-primeiro-desenho-no-pinta',
    arquivo: (s) => `meu-desenho-${s}`,
    aulas: [meuDesenhoAula],
  },
]

const RECADO_DO_MATERIAL =
  'Este é o seu Passo a passo do projeto! Quando precisar de um passo, você pode ler aqui mesmo ou baixar para guardar. Para continuar, clique em Próxima parte.'
const recadoDe = (t: Trecho) => t.recado ?? t.ponte ?? ''
// As partes de montar no Estúdio (no Pinta, a troca da imagem: o desenho não é no Estúdio).
const ehMontagem = (t: Trecho) => ['build', 'delivery', 'swap'].includes(t.kind)

type Secao = {
  key: string
  intent: string
  completion: { projectChecks?: unknown[]; submissionUpToDate?: boolean }
}

for (const curso of CURSOS) {
  const dir = resolve(faisca, curso.pasta)
  describe(`${curso.nome}: padrão do Faísca`, () => {
    test.each(
      curso.aulas.map((aula, i) => [aula.slug, i] as const),
    )('%s: a Debinha ou o Dedé nas frases marcadas, na tabela e na voz', (slug, i) => {
      const aula = curso.aulas[i]!
      const personagem = avatarDaAula(i)
      const trocas = extrairPartesElevenLabs(
        readFileSync(resolve(dir, `${curso.arquivo(slug)}.roteiro.md`), 'utf8'),
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
          `${curso.arquivo(slug)}.${personagem === 'Dedé' ? 'dede' : 'debinha'}.elevenlabs.txt`,
        ),
        'utf8',
      )
      expect(voz.split('[long pause]').map((f) => f.trim())).toEqual(
        trocas.map((t) => `${t.tags.join(' ')} ${t.falaPersonagem}`),
      )
    })

    test.each(
      curso.aulas.map((aula) => [aula.slug, aula] as const),
    )('%s: nenhuma fala nem recado espera o "Salvo"', (_, aula) => {
      for (const t of aula.trechos) {
        expect(`${t.key}: ${t.text}`).not.toMatch(/\bSalvo\b/)
        expect(`${t.key}: ${recadoDe(t)}`).not.toMatch(/\bSalvo\b/)
      }
    })

    test.each(
      curso.aulas.map((aula) => [aula.slug, aula] as const),
    )('%s: o envio fecha a última construção, e depois dele só vêm fechamentos', (slug, aula) => {
      const manifesto = JSON.parse(
        readFileSync(resolve(dir, `${curso.arquivo(slug)}.manifesto.json`), 'utf8'),
      ) as { sections: Secao[] }
      const s = manifesto.sections
      const entrega = s.findIndex((x) => x.intent === 'delivery')
      expect(entrega).toBeGreaterThan(0)
      expect(s.filter((x) => x.intent === 'delivery')).toHaveLength(1)
      expect(s.slice(entrega + 1).every((x) => x.intent === 'closing')).toBe(true)
      // O envio do projeto é o último com envio em dia: a entrega, ou o fechamento do Pinta
      // (que entrega o desenho antes e o jogo por último).
      const envio = s.map((x) => x.completion.submissionUpToDate === true).lastIndexOf(true)
      expect(envio).toBeGreaterThanOrEqual(entrega)
      expect(s[envio]!.completion.projectChecks?.length).toBeGreaterThan(0)
      // Sem parte só de envio: no Na tela da parte do envio há montagem, não só os cliques do envio.
      const trecho = aula.trechos.find((t) => t.key === s[envio]!.key)
      expect(trecho?.screen ?? '').toMatch(/\[(encaixar|escolher|soltar|abrir campo|mover) /)
    })

    test.each(
      curso.aulas.map((aula) => [aula.slug, aula] as const),
    )('%s: o Na tela das construções abre o Estúdio e envia em dois cliques', (_, aula) => {
      for (const t of aula.trechos.filter(ehMontagem)) {
        expect(`${t.key}: ${t.screen}`).toContain('[expandir estúdio]')
        expect(t.screen).not.toContain('[enviar projeto]')
        expect((t.screen.match(/\[[^\]]+\]/g) ?? []).length).toBeGreaterThan(8)
      }
      const envio = aula.trechos.filter(ehMontagem).at(-1)!
      expect(envio.screen).toContain('[clicar "Enviar meu projeto"]')
      expect(envio.screen).toContain('[clicar "Enviar"]')
    })

    test.each(
      curso.aulas.map((aula) => [aula.slug, aula] as const),
    )('%s: as frases fixas de verificar e de sair, e o recado do material', (_, aula) => {
      for (const t of aula.trechos.filter(ehMontagem)) {
        expect(`${t.key}: ${t.text}`).toMatch(
          /(Funcionou\?|Agora) clique em Verificar projeto\. Se faltar alguma coisa, corrija os blocos e clique novamente\./i,
        )
        expect(`${t.key}: ${t.text}`).toContain('Quando aparecer Objetivo cumprido!, clique em')
      }
      for (const t of aula.trechos.filter((x) => x.kind === 'material'))
        expect(recadoDe(t)).toBe(RECADO_DO_MATERIAL)
    })
  })
}
