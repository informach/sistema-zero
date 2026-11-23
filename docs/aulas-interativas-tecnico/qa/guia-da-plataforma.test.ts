import { describe, expect, test } from 'bun:test'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  CONTEUDO_DO_GUIA,
  type CursoDoGuia,
  capturasDoCurso,
  marcasDaTela,
  paginasDoCurso,
} from '../recursos/guia-da-plataforma/guia'
import { concordanciasErradas, guiasPessoa, PALAVRAS_DA_ESCOLA } from './palavras-da-escola'

/**
 * As páginas "Conheça a plataforma" dos Passo a passo (14/11/2026): o texto segue a régua das
 * aulas, e cada botão citado em negrito numa legenda é um controle que está no print daquela tela,
 * com o nome que a criança vê. Assim, se a tela mudar e alguém capturar de novo, o teste aponta a
 * legenda que ficou velha.
 */

const CURSOS: CursoDoGuia[] = ['cade-todo-mundo', 'desafio-primeiro-jogo', 'ilha-do-farol']
const PASTA = resolve(import.meta.dir, '../recursos/guia-da-plataforma')

/** Rótulos citados que não são uma marca da própria tela, mas aparecem nela ou na mesma área. */
const CITADOS_FORA_DA_MARCA = new Set([
  'Ouvir',
  'Anterior',
  'Ao iniciar',
  'Quando acontecer',
  'Enquanto estiver rodando',
  'Jogo menor',
])

function textos(): string[] {
  return [
    ...CONTEUDO_DO_GUIA.paginas.flatMap((p) => [p.titulo, p.texto, p.nota ?? '']),
    ...Object.values(CONTEUDO_DO_GUIA.telas).flatMap((t) => [
      t.legenda,
      ...Object.values(t.marcas),
    ]),
  ].filter(Boolean)
}

const negritos = (texto: string) => [...texto.matchAll(/<b>([^<]+)<\/b>/g)].map((m) => m[1] ?? '')
const norm = (texto: string) => texto.normalize('NFC').toLocaleLowerCase('pt-BR')

test('o texto do guia segue a régua das aulas', () => {
  for (const texto of textos()) {
    expect(texto, texto).not.toContain('—')
    expect(PALAVRAS_DA_ESCOLA.test(texto), texto).toBe(false)
    expect(concordanciasErradas(texto), texto).toEqual([])
    expect(guiasPessoa(texto), texto).toEqual([])
  }
})

describe.each(CURSOS)('prints de %s', (curso) => {
  const capturas = capturasDoCurso(curso)

  test('toda tela das páginas do curso tem print, e todo print existe', () => {
    expect(paginasDoCurso(curso).length).toBeGreaterThan(0)
    for (const pagina of paginasDoCurso(curso))
      for (const tela of pagina.telas) {
        expect(capturas[tela], `${curso}/${tela}`).toBeDefined()
        expect(
          existsSync(resolve(PASTA, 'telas', curso, capturas[tela]?.arquivo ?? '')),
          tela,
        ).toBe(true)
      }
  })

  test('as marcas cabem na imagem e têm legenda', () => {
    for (const tela of Object.keys(capturas)) {
      const marcas = marcasDaTela(curso, tela)
      expect(marcas.length, tela).toBeGreaterThan(0)
      for (const [id, , m] of marcas) {
        expect(m.x, `${tela}/${id}`).toBeGreaterThanOrEqual(-1)
        expect(m.y, `${tela}/${id}`).toBeGreaterThanOrEqual(-1)
        expect(m.x + m.w, `${tela}/${id}`).toBeLessThanOrEqual(101)
        expect(m.y + m.h, `${tela}/${id}`).toBeLessThanOrEqual(101)
      }
    }
  })

  test('os botões citados nas legendas são os da tela, com o mesmo nome', () => {
    for (const tela of Object.keys(capturas)) {
      const nomes = marcasDaTela(curso, tela).map(([, , m]) => norm(m.nome))
      for (const [id, texto] of marcasDaTela(curso, tela))
        for (const rotulo of negritos(texto)) {
          if (CITADOS_FORA_DA_MARCA.has(rotulo)) continue
          expect(
            nomes.some((nome) => nome.includes(norm(rotulo))),
            `${curso}/${tela}/${id}: "${rotulo}" não aparece no print`,
          ).toBe(true)
        }
    }
  })
})

/** Todos os textos de um JSON de conteúdo, menos os campos técnicos (ids, nomes de desenho…). */
function textosDoCaderno(valor: unknown, chave = ''): string[] {
  if (typeof valor === 'string')
    return [
      'id',
      'kind',
      'name',
      'tone',
      'scene',
      'category',
      'header',
      'image',
      'icon',
      'n',
    ].includes(chave)
      ? []
      : [valor]
  if (Array.isArray(valor)) return valor.flatMap((item) => textosDoCaderno(item, chave))
  if (typeof valor !== 'object' || valor === null) return []
  return Object.entries(valor).flatMap(([k, v]) => textosDoCaderno(v, k))
}

test.each([
  'a-ponte-apressada',
  'cade-todo-mundo',
  'desafio-farol',
  'ilha-farol',
  'jardim-secreto',
  'meu-primeiro-desenho',
  'moedas-no-caminho',
  'o-bau-dos-simbolos',
  'o-segredo-da-cabana',
  'transformando-o-vilao-em-aliado',
])('o texto do Passo a passo de %s segue a régua das aulas', (curso) => {
  const conteudo = JSON.parse(
    readFileSync(resolve(import.meta.dir, `../recursos/${curso}/caderno-conteudo.json`), 'utf8'),
  )
  const textos = textosDoCaderno(conteudo)
  expect(textos.length).toBeGreaterThan(20)
  for (const texto of textos) {
    expect(texto, texto).not.toContain('—')
    expect(PALAVRAS_DA_ESCOLA.test(texto), texto).toBe(false)
    expect(concordanciasErradas(texto), texto).toEqual([])
    expect(guiasPessoa(texto), texto).toEqual([])
  }
})
