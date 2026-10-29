import { expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { caminhoAula, listarArquivosAulas } from './caminhos'
import {
  COMMON_COURSE_SLUGS,
  cursoEditorialComum,
  manifestoParaDestino,
} from './destinos-publicacao'

test('os destinos reconhecem as cinco ofertas, sem confundir slugs semelhantes', () => {
  for (const curso of COMMON_COURSE_SLUGS) {
    expect(cursoEditorialComum(curso)).toBe(curso)
    expect(cursoEditorialComum(`${curso}-adulto`)).toBe(curso)
  }
  expect(cursoEditorialComum('outro-curso')).toBeUndefined()
})

test('todas as aulas projetam somente o vínculo do curso, sem mutar a fonte ou seus projetos', () => {
  const arquivos = listarArquivosAulas().filter((n) => n.endsWith('.manifesto.json'))
  expect(arquivos).toHaveLength(48)
  for (const nome of arquivos) {
    const origem = JSON.parse(readFileSync(caminhoAula(nome), 'utf8'))
    // Os moldes plannedVideo são válidos no formato editorial, conferido pelo validador da autoria.
    const destino = { courseSlug: `${origem.courseSlug}-adulto`, lessonSlug: origem.lessonSlug }
    const antes = JSON.stringify(origem)
    const adaptado = manifestoParaDestino(origem, destino)
    expect(adaptado.courseSlug).toBe(destino.courseSlug)
    expect(adaptado.blocks).toEqual(origem.blocks)
    expect(adaptado.sections).toEqual(origem.sections)
    expect(JSON.stringify(origem)).toBe(antes)
    expect(() => manifestoParaDestino(origem, { ...destino, lessonSlug: 'outra-aula' })).toThrow(
      'identificador',
    )
    expect(() =>
      manifestoParaDestino(origem, { ...destino, courseSlug: 'curso-incorreto' }),
    ).toThrow('mesmo curso')
  }
})
