import { describe, expect, test } from 'bun:test'
import type { SectionProgressView } from '@sistemazero/core/learning'
import { vistaProgressoAula } from '@/lib/lesson-progress'

const progressoReal: SectionProgressView = {
  revision: 'r1',
  sections: [],
  completed: 2,
  total: 3,
  percent: (2 / 3) * 100,
}

describe('a barra do topo da aula', () => {
  test('com o progresso do servidor, mede a CONCLUSÃO das seções', () => {
    const vista = vistaProgressoAula(progressoReal, { index: 0, total: 3 })
    expect(vista.medivel).toBe(true)
    expect(Math.round(vista.percent)).toBe(67)
    expect(vista.numero).toBe('67%')
    expect(vista.texto).toBe('2 de 3 seções concluídas')
  })

  test('o progresso do servidor VENCE a posição', () => {
    // Os dois chegam juntos o tempo todo; se a posição ganhasse, a barra deixaria
    // de falar de conclusão justamente para quem tem a medida de verdade.
    const vista = vistaProgressoAula(progressoReal, { index: 2, total: 3 })
    expect(vista.numero).toBe('67%')
  })

  test('sem o progresso do servidor, mede a POSIÇÃO no percurso', () => {
    // É o caso da conta de EQUIPE (o members não manda `sectionProgress` para
    // privilegiado) e o da aula em que nenhuma seção tem critério de conclusão.
    const vista = vistaProgressoAula(undefined, { index: 1, total: 5 })
    expect(vista.medivel).toBe(true)
    expect(vista.percent).toBe(40)
    expect(vista.numero).toBe('Seção 2 de 5')
    expect(vista.texto).toBe('Seção 2 de 5')
  })

  test('com uma seção só, mede as ATIVIDADES obrigatórias', () => {
    // Toda aula legada é assim: a migration 0080 agrupou os blocos antigos numa
    // seção sem critérios. "Seção 1 de 1" ali encheria a barra dizendo que a
    // criança terminou o que ela nem começou.
    const vista = vistaProgressoAula(undefined, { index: 0, total: 1 }, [
      { complete: true },
      { complete: false },
    ])
    expect(vista.percent).toBe(50)
    expect(vista.numero).toBe('1 de 2 atividades')
    expect(vista.texto).toBe('1 de 2 atividades concluídas nesta aula')
  })

  test('uma atividade só concorda no singular', () => {
    const vista = vistaProgressoAula(undefined, { index: 0, total: 1 }, [{ complete: false }])
    expect(vista.numero).toBe('0 de 1 atividade')
    expect(vista.texto).toBe('0 de 1 atividade concluída nesta aula')
  })

  test('sem NADA a medir, não inventa número', () => {
    // Uma seção só e nenhuma atividade obrigatória: o player desenha o espaçador.
    // Encher a barra ou cravar 100% seria mentir sobre o trabalho da criança.
    expect(vistaProgressoAula(undefined, { index: 0, total: 1 }, []).medivel).toBe(false)
    expect(vistaProgressoAula(undefined, null).medivel).toBe(false)
  })

  test('a posição ainda desconhecida não derruba a barra', () => {
    // O aviso do player chega no efeito seguinte à montagem; neste quadro a barra
    // cai nas atividades em vez de lançar.
    const vista = vistaProgressoAula(undefined, null, [{ complete: true }, { complete: true }])
    expect(vista.percent).toBe(100)
    expect(vista.numero).toBe('2 de 2 atividades')
  })
})
