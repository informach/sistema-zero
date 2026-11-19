/**
 * Cursos para pais (docs/aulas-interativas/pais/, 15/11/2026): o manifesto passa no validador REAL
 * do core, não usa as ferramentas da criança (a mesma régua que recusa publicar no Admin) e os
 * textos seguem a régua de linguagem do curso. Os cursos das crianças continuam nos testes deles.
 */
import { describe, expect, test } from 'bun:test'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { parentsLessonIssues } from '../../../packages/core/src/course/learner'
import { isLearningManifest } from '../../../packages/core/src/learning'
import { isSectionCompletion } from '../../../packages/core/src/learning/section-progression'
import { PASTA_CURSOS } from './caminhos'

const PASTA_PAIS = resolve(PASTA_CURSOS, 'pais')
const cursos = readdirSync(PASTA_PAIS, { withFileTypes: true })
  .filter((entrada) => entrada.isDirectory())
  .map((entrada) => entrada.name)

type Manifesto = {
  courseSlug: string
  lessonSlug: string
  blocks: Array<{
    key: string
    plannedVideo?: string
    content?: { kind: string } & Record<string, unknown>
  }>
  sections: Array<{
    key: string
    blockKeys: string[]
    completion: unknown
    workspaceKey: unknown
    externalTool: unknown
  }>
}

describe.each(cursos)('curso para pais %s', (curso) => {
  const pasta = resolve(PASTA_PAIS, curso)
  const arquivos = readdirSync(pasta)
  const manifestos = arquivos.filter((nome) => nome.endsWith('.manifesto.json')).sort()

  test('tem aulas, módulos, fontes e a apostila', () => {
    expect(manifestos.length).toBeGreaterThan(0)
    for (const nome of ['README.md', 'modulos.md', 'fontes.md', 'apostila.pdf'])
      expect(existsSync(resolve(pasta, nome))).toBe(true)
  })

  test.each(manifestos)('%s passa no validador do core', (nome) => {
    const manifesto = JSON.parse(readFileSync(resolve(pasta, nome), 'utf8')) as Manifesto
    expect(isLearningManifest(manifesto)).toBe(true)
    expect(manifesto.courseSlug).toBe(curso)
    expect(nome).toBe(`${manifesto.lessonSlug}.manifesto.json`)
    for (const secao of manifesto.sections) {
      expect(isSectionCompletion(secao.completion)).toBe(true)
      expect(secao.workspaceKey).toBeNull()
      expect(secao.externalTool).toBeNull()
    }
    const colocados = manifesto.sections.flatMap((secao) => secao.blockKeys)
    expect([...colocados].sort()).toEqual(manifesto.blocks.map((bloco) => bloco.key).sort())
    expect(new Set(colocados).size).toBe(colocados.length)
  })

  test.each(manifestos)('%s não usa Estúdio nem Pinta (régua de publicação)', (nome) => {
    const manifesto = JSON.parse(readFileSync(resolve(pasta, nome), 'utf8')) as Manifesto
    const blocos = manifesto.blocks
      .filter((bloco) => bloco.content)
      .map((bloco) => ({ id: bloco.key, content: { kind: String(bloco.content?.kind) } }))
    expect(parentsLessonIssues(blocos)).toEqual([])
  })

  test('sem travessão e com a fala para o ElevenLabs de cada aula', () => {
    for (const nome of arquivos.filter((n) => /\.(md|json)$/.test(n))) {
      const texto = readFileSync(resolve(pasta, nome), 'utf8')
      expect({ nome, travessao: /[—–]/.test(texto) }).toEqual({ nome, travessao: false })
    }
    for (const nome of arquivos.filter((n) => n.endsWith('.roteiro.md'))) {
      const roteiro = readFileSync(resolve(pasta, nome), 'utf8')
      // Desde 19/11/2026 a voz é gerada no ElevenLabs e a apresentadora é o avatar da Helena.
      expect(roteiro).toContain('**Fala para ElevenLabs:**')
      expect(roteiro).not.toContain('**Fala da Helena:**')
      const copiavel = nome.replace('.roteiro.md', '.elevenlabs.txt')
      expect({ copiavel, existe: arquivos.includes(copiavel) }).toEqual({ copiavel, existe: true })
      const texto = readFileSync(resolve(pasta, copiavel), 'utf8')
      // Só fala, tags e pausas: nada de título, rótulo ou nota de produção.
      expect({ copiavel, producao: /^(#|\*\*|Na tela|Clipe|Depoimento)/m.test(texto) }).toEqual({
        copiavel,
        producao: false,
      })
      expect({ copiavel, travessao: /[—–]/.test(texto) }).toEqual({ copiavel, travessao: false })
    }
  })

  // Decisão da dona (15/11/2026): o curso é da Helena. Ninguém mais é citado, e o curso não fala da
  // aula aberta que serviu de fonte. O `fontes.md` é interno e registra de onde veio o conteúdo.
  test('o que os pais leem não cita outra autora nem a palestra de origem', () => {
    const textoDoCurso = arquivos
      .filter((n) => /\.(roteiro\.md|manifesto\.json)$/.test(n) || /-aula-\d+\.md$/.test(n))
      .concat(['README.md', 'modulos.md'])
      .map((nome) => ({ nome, texto: readFileSync(resolve(pasta, nome), 'utf8') }))
    const apostila = resolve(import.meta.dir, `../recursos/${curso}/caderno-conteudo.json`)
    if (existsSync(apostila))
      textoDoCurso.push({ nome: 'caderno-conteudo.json', texto: readFileSync(apostila, 'utf8') })
    for (const { nome, texto } of textoDoCurso) {
      expect({ nome, citaVivianne: /viviann?e/i.test(texto) }).toEqual({
        nome,
        citaVivianne: false,
      })
      expect({
        nome,
        citaPalestra: /palestra de|na palestra|aula aberta|a plateia/i.test(texto),
      }).toEqual({
        nome,
        citaPalestra: false,
      })
    }
  })
})
