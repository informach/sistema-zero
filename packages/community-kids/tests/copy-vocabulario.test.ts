import { expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import {
  COMMON_LESSON_COPY,
  conclusaoRecusada,
  PALAVRAS_DA_ESCOLA,
} from '@sistemazero/member-shell/lib/lesson-copy'
import { KIDS_LESSON_COPY } from '../src/lib/lesson-copy'
import { listarFontes, literaisVisiveis, naoETextoDeTela, varrerCopy } from './helpers/copy-scan'

const pacotes = join(import.meta.dir, '../..')
const raizes = ['community-kids/src', 'community/src', 'member-shell/src']

test('as duas comunidades usam o mesmo contrato e mantêm os dois marcos acessíveis distintos', () => {
  expect(KIDS_LESSON_COPY).toBe(COMMON_LESSON_COPY)
  expect(COMMON_LESSON_COPY.secoes.indice).not.toBe(COMMON_LESSON_COPY.secoes.lista)
  expect(COMMON_LESSON_COPY.secoes.proxima).toBe('Próxima parte')
  expect(COMMON_LESSON_COPY.estudio.enviar).toBe('Enviar meu projeto')
})

test('os rótulos antigos não reaparecem em textos visíveis das duas comunidades', () => {
  const arquivos = raizes.flatMap((r) => listarFontes(join(pacotes, r)))
  expect(arquivos.length).toBeGreaterThan(300)
  const problemas = arquivos.flatMap((arquivo) =>
    literaisVisiveis(readFileSync(arquivo, 'utf8'), arquivo)
      .filter((t) => !naoETextoDeTela(t) && PALAVRAS_DA_ESCOLA.test(t.texto))
      .map((t) => `${relative(pacotes, arquivo)}:${t.linha}: ${t.texto}`),
  )
  expect(problemas).toEqual([])
})

test('a página inicial, o catálogo e as trilhas nomeiam cursos e aulas', () => {
  const arquivos = listarFontes(join(pacotes, 'community-kids/src/app/(app)')).filter((p) =>
    /(?:cursos[\\/]|[\\/]page.tsx$)/.test(p),
  )
  expect(arquivos.length).toBeGreaterThan(15)
  const problemas = arquivos.flatMap((p) =>
    literaisVisiveis(readFileSync(p, 'utf8'), p)
      .filter(
        (t) =>
          !naoETextoDeTela(t) &&
          /(?:aventura pronta|aventuras prontas|Acessar aventura|Minhas aventuras|lista de fases|Próxima fase)/i.test(
            t.texto,
          ),
      )
      .map((t) => `${p}:${t.linha}: ${t.texto}`),
  )
  expect(problemas).toEqual([])
})

test('o detector protege navegação sem proibir curso, aula ou um nível do jogo', () => {
  for (const t of [
    'Concluir fase',
    'Próxima seção',
    'Próxima etapa',
    'Mapa da Aventura',
    'Enviar para o professor',
  ])
    expect(PALAVRAS_DA_ESCOLA.test(t)).toBe(true)
  for (const t of ['Curso', 'Aula', 'Concluir aula', 'Próxima parte', 'Fase do jogo'])
    expect(PALAVRAS_DA_ESCOLA.test(t)).toBe(false)
})

test('jargão interno de autoria continua fora da interface kids', () => {
  const jargao = (t: string) =>
    /curso[\s-]base|(?:iniciante|intermediário|avançado)\s+(?:2d|3d)/i.test(t)
  expect(varrerCopy(jargao)).toEqual([])
})

test('a troca de aventura por curso conserva a concordância nas duas plataformas', () => {
  const erro =
    /\b(?:as|suas|das|duas|uma|a primeira|a próxima)\s+(?:seus\s+)?(?:próximos\s+)?cursos?\b|\bcursos? (?:extros?|inteirinhas?|completas?|liberadas?|(?:estão sendo |está sendo )?criadas?)\b/i
  expect(erro.test('As próximos cursos estão em preparação.')).toBe(true)
  expect(erro.test('Cursos liberados')).toBe(false)
  const problemas = raizes
    .flatMap((r) => listarFontes(join(pacotes, r)))
    .flatMap((p) =>
      literaisVisiveis(readFileSync(p, 'utf8'), p)
        .filter((t) => !naoETextoDeTela(t) && erro.test(t.texto))
        .map((t) => `${relative(pacotes, p)}:${t.linha}: ${t.texto}`),
    )
  expect(problemas).toEqual([])
})

test('pendências, erros de rede e sessão de suporte têm instrução comum', () => {
  expect(COMMON_LESSON_COPY.itemPendente({ kind: 'QUIZ_GATE_NOT_PASSED', text: 'Meta 70%' })).toBe(
    'Passe no quiz (meta: 70% de acertos)',
  )
  expect(COMMON_LESSON_COPY.erroDoServidor(new TypeError('Failed to fetch'), 'Tente de novo')).toBe(
    'Tente de novo',
  )
  expect(conclusaoRecusada({ code: 'QUIZ_GATE_NOT_PASSED' })).toBe(
    'Passe no quiz desta aula para concluir.',
  )
  expect(conclusaoRecusada({ code: 'IMPERSONATION_READONLY' })).toContain('Ative o modo de edição')
})
