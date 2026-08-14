import { describe, expect, it } from 'bun:test'
import { resolveCourseBack, trilhaHrefForCourse } from '../src/lib/course-return'

/**
 * A setinha da página do curso: ela volta para a trilha que LISTA o curso, senão a criança
 * cai numa lista que não tem o curso dela.
 *
 * ⭐ O desempate morreu em 14/08. Até então o Iniciante 2D era dividido entre Faísca
 * (curso-base) e Construtor(a) (o resto), e era preciso escolher o dono pelo `careerSlot`,
 * cobrir o fail-open do catálogo não etiquetado e ainda blindar slug desconhecido. Com o
 * degrau de entrada próprio, **cada degrau tem um único dono** e a função é a composição
 * `degrau → dono`.
 */

describe('trilha dona do curso', () => {
  it('o curso de ENTRADA vai para a trilha da Faísca', () => {
    expect(trilhaHrefForCourse({ level: 'primeiros-passos', track: '2d', careerSlot: 1 })).toBe(
      '/cursos/trilha/noob',
    )
    // O bônus do degrau de entrada mora na MESMA trilha — é o que a Faísca não tinha antes.
    expect(trilhaHrefForCourse({ level: 'primeiros-passos', track: '2d', careerSlot: null })).toBe(
      '/cursos/trilha/noob',
    )
  })

  it('o Iniciante 2D inteiro é do Construtor(a), com posição ou sem', () => {
    for (const careerSlot of [1, 3, null]) {
      expect(trilhaHrefForCourse({ level: 'iniciante', track: '2d', careerSlot })).toBe(
        '/cursos/trilha/coder',
      )
    }
  })

  it('degraus de nível único vão direto ao dono do degrau', () => {
    expect(trilhaHrefForCourse({ level: 'iniciante', track: '3d' })).toBe('/cursos/trilha/hacker')
    expect(trilhaHrefForCourse({ level: 'intermediario', track: '2d' })).toBe(
      '/cursos/trilha/explorer',
    )
    expect(trilhaHrefForCourse({ level: 'avancado', track: '3d' })).toBe('/cursos/trilha/champion')
  })

  it('`track` ausente conta como 2D (members antigo)', () => {
    expect(trilhaHrefForCourse({ level: 'intermediario' })).toBe('/cursos/trilha/explorer')
  })

  it('curso da Lenda (bônus da formatura) vai p/ a trilha da Lenda', () => {
    expect(trilhaHrefForCourse({ level: 'lenda' })).toBe('/cursos/trilha/god')
  })

  it('curso sem dificuldade não tem trilha', () => {
    expect(trilhaHrefForCourse({})).toBeNull()
  })

  it('par que não é degrau da carreira não vira URL de trilha', () => {
    // Só existe `primeiros-passos-2d`. Sem o guard do `courseTierOf`, isto produziria
    // `/cursos/trilha/noob` para um curso que a trilha da Faísca não lista.
    expect(trilhaHrefForCourse({ level: 'primeiros-passos', track: '3d' })).toBeNull()
  })
})

describe('destino da volta na página do curso', () => {
  const curso = { level: 'primeiros-passos', track: '2d', careerSlot: 1 } as const

  it('vindo da home, volta pra home', () => {
    expect(resolveCourseBack('inicio', curso)).toEqual({ href: '/', label: 'Voltar ao início' })
  })

  it('sem origem (link direto, favorito, volta da aula), volta pra trilha do curso', () => {
    expect(resolveCourseBack(undefined, curso)).toEqual({
      href: '/cursos/trilha/noob',
      label: 'Voltar à trilha',
    })
  })

  it('origem desconhecida é ignorada — `?de=` vem da URL e é allowlist', () => {
    expect(resolveCourseBack('https://evil.example', curso)).toEqual({
      href: '/cursos/trilha/noob',
      label: 'Voltar à trilha',
    })
  })

  it('curso sem degrau cai no mapa', () => {
    expect(resolveCourseBack(undefined, {})).toEqual({ href: '/cursos', label: 'Voltar ao mapa' })
  })
})
