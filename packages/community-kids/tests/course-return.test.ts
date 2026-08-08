import { describe, expect, it } from 'bun:test'
import { resolveCourseBack, trilhaHrefForCourse } from '../src/lib/course-return'

/**
 * A setinha da página do curso. O caso que mais dói se errar é o Iniciante 2D:
 * ele é DIVIDIDO entre Faísca (curso-base) e Construtor (o resto), então mandar
 * para o nível errado joga a criança numa lista que não tem o curso dela.
 */

describe('trilha dona do curso', () => {
  it('divide o Iniciante 2D: curso-base vai p/ a Faísca, o resto p/ o Construtor', () => {
    expect(trilhaHrefForCourse({ level: 'iniciante', track: '2d', careerSlot: 1 })).toBe(
      '/cursos/trilha/noob',
    )
    expect(trilhaHrefForCourse({ level: 'iniciante', track: '2d', careerSlot: 3 })).toBe(
      '/cursos/trilha/coder',
    )
    // Bônus da etapa (`careerSlot` nulo) vive na trilha do Construtor, com o resto.
    expect(trilhaHrefForCourse({ level: 'iniciante', track: '2d', careerSlot: null })).toBe(
      '/cursos/trilha/coder',
    )
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

  it('rollout sem curso-base: a Faísca vai p/ a trilha DELA, não p/ a do Construtor', () => {
    // Enquanto a etapa não tem `careerSlot === 1`, o `coursesForLevel` não divide e
    // os dois níveis listam o degrau inteiro — mas o mapa só deixa a Faísca abrir a
    // trilha dela. Dividir pelo slot mandaria a criança p/ um nível com cadeado.
    const bonus = { level: 'iniciante', track: '2d', careerSlot: null } as const
    expect(trilhaHrefForCourse(bonus, 'noob')).toBe('/cursos/trilha/noob')
    expect(trilhaHrefForCourse(bonus, 'coder')).toBe('/cursos/trilha/coder')
  })

  it('o nível do aluno nunca REBAIXA a trilha do curso-base', () => {
    // Construtor revisitando o curso-base: ele vive na trilha da Faísca (slot 1), e
    // é p/ lá que a volta tem de ir — o desempate só sobe, nunca desce.
    const base = { level: 'iniciante', track: '2d', careerSlot: 1 } as const
    expect(trilhaHrefForCourse(base, 'coder')).toBe('/cursos/trilha/noob')
    expect(trilhaHrefForCourse(base, 'noob')).toBe('/cursos/trilha/noob')
  })

  it('aluno de outro degrau não desempata (nível ausente também não)', () => {
    const slot3 = { level: 'iniciante', track: '2d', careerSlot: 3 } as const
    expect(trilhaHrefForCourse(slot3, 'hacker')).toBe('/cursos/trilha/coder')
    expect(trilhaHrefForCourse(slot3, null)).toBe('/cursos/trilha/coder')
    expect(trilhaHrefForCourse(slot3)).toBe('/cursos/trilha/coder')
  })

  it('nível DESCONHECIDO (members à frente do deploy) não vira URL', () => {
    // `LEVEL_ORDER.indexOf` devolve -1 p/ slug novo, e `0 > -1` é verdadeiro — sem o
    // guard de degrau isso mandaria a criança p/ `/cursos/trilha/<slug>` → notFound().
    const bonus = { level: 'iniciante', track: '2d', careerSlot: null } as const
    expect(trilhaHrefForCourse(bonus, 'nivel-do-futuro' as never)).toBe('/cursos/trilha/coder')
  })
})

describe('destino da volta na página do curso', () => {
  const curso = { level: 'iniciante', track: '2d', careerSlot: 1 } as const

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
    expect(resolveCourseBack('https://example.com', curso).href).toBe('/cursos/trilha/noob')
    expect(resolveCourseBack('//example.com', curso).href).toBe('/cursos/trilha/noob')
    expect(resolveCourseBack('/quarto', curso).href).toBe('/cursos/trilha/noob')
  })

  it('curso sem dificuldade cai no mapa — nunca fica sem saída', () => {
    expect(resolveCourseBack(undefined, {})).toEqual({
      href: '/cursos',
      label: 'Voltar ao mapa',
    })
  })
})
