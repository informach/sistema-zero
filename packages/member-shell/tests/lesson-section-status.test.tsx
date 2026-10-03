import { describe, expect, test } from 'bun:test'
import type { SectionPendingItem } from '@sistemazero/core/learning'
import { renderToStaticMarkup } from 'react-dom/server'
import { LessonSectionStatus } from '../src/components/lesson-section-status'

/**
 * "O que falta para seguir" (30/09/2026): a faixa do rodapé da aula.
 *
 * ⚠️ Cada caso tem a metade que precisa FALHAR: o ícone certo por `kind`, o "+N" só com mais de um
 * item, a mensagem de autoria trocada fora do ensaio, o estado pronto e o `fallback` do player.
 */

const item = (kind: SectionPendingItem['kind'], text: string): SectionPendingItem => ({
  kind,
  text,
})

function faixa(props: Parameters<typeof LessonSectionStatus>[0]) {
  return renderToStaticMarkup(<LessonSectionStatus {...props} />)
}

describe('LessonSectionStatus: a faixa "o que falta para seguir"', () => {
  test('a seção pronta vira a faixa verde, com um recado só', () => {
    const markup = faixa({
      items: [item('VIDEO_GATE_NOT_WATCHED', 'Veja o vídeo')],
      completed: true,
    })
    expect(markup).toContain('data-state="pronto"')
    expect(markup).toContain('Tudo pronto nesta parte. Pode seguir!')
    // Na ÚLTIMA seção não há o que seguir: o botão ao lado é "Concluir aula".
    const ultima = faixa({ items: [], completed: true, ultima: true })
    expect(ultima).toContain('Tudo pronto nesta parte!')
    expect(ultima).not.toContain('Pode seguir')
    // Pronta, os itens pendentes não aparecem (o estado vence a lista).
    expect(markup).not.toContain('Veja o vídeo')
    expect(markup).not.toContain('Para seguir:')
    expect(markup).toContain('role="status"')
  })

  test('um item só: o ícone da razão, o prefixo "Para seguir:" e nenhum "+N"', () => {
    const markup = faixa({
      items: [item('VIDEO_GATE_NOT_WATCHED', 'Veja o vídeo até o fim (você já viu 45%)')],
      completed: false,
    })
    expect(markup).toContain('data-state="pendente"')
    expect(markup).toContain('data-kind="VIDEO_GATE_NOT_WATCHED"')
    expect(markup).toContain('lucide-clapperboard')
    expect(markup).toContain('Para seguir:')
    expect(markup).toContain('Veja o vídeo até o fim (você já viu 45%)')
    expect(markup).not.toContain('sz-lesson-status-lista')
    expect(markup).not.toContain('sz-lesson-status-mais')
  })

  test('o ícone segue o `kind`: cada razão tem a sua figura', () => {
    const casos: [SectionPendingItem['kind'], string][] = [
      ['LEARNING_GATE_INCOMPLETE', 'lucide-flask-conical'],
      ['QUIZ_GATE_NOT_PASSED', 'lucide-list-checks'],
      ['STUDIO_GATE_NOT_SUBMITTED', 'lucide-code'],
      ['STUDIO_GATE_NOT_PASSED', 'lucide-code'],
      ['PINTA_GATE_NOT_SUBMITTED', 'lucide-palette'],
      ['MATERIAL_GATE_NOT_ACCESSED', 'lucide-backpack'],
      ['CERTIFICATE_GATE_NOT_ISSUED', 'lucide-award'],
      ['LESSON_COMING_SOON', 'lucide-hammer'],
      ['platform-action', 'lucide-sparkles'],
      ['project-check', 'lucide-target'],
      ['locked', 'lucide-lock'],
      ['lesson', 'lucide-flag'],
      ['other', 'lucide-flag'],
    ]
    for (const [kind, icone] of casos) {
      const markup = faixa({ items: [item(kind, 'Faça isto')], completed: false })
      expect(markup, kind).toContain(`data-kind="${kind}"`)
      expect(markup, kind).toContain(icone)
    }
    // O material que é o LIVRO ganha o livro, e não a mochila.
    const livro = faixa({
      items: [item('MATERIAL_GATE_NOT_ACCESSED', 'Abra o livro da aula')],
      completed: false,
    })
    expect(livro).toContain('lucide-book-open-text')
    expect(livro).not.toContain('lucide-backpack')
  })

  test('vários itens: UMA linha com o primeiro e um "+N" que abre os demais', () => {
    const markup = faixa({
      items: [
        item('VIDEO_GATE_NOT_WATCHED', 'Veja o vídeo até o fim'),
        item('QUIZ_GATE_NOT_PASSED', 'Passe no quiz (nota mínima 70%)'),
        item('STUDIO_GATE_NOT_SUBMITTED', 'Envie seu projeto para o professor'),
      ],
      completed: false,
    })
    expect(markup).toContain('<details class="sz-lesson-status-lista">')
    expect(markup).toContain('<summary')
    // O primeiro item é o da linha; o "+N" conta o RESTO.
    expect(markup).toMatch(/Para seguir:.*Veja o vídeo até o fim/)
    expect(markup).toContain('+2')
    expect(markup).toContain('<span class="sr-only"> itens</span>')
    // Os demais ficam na lista de dentro, na ordem em que vieram.
    const ul = markup.slice(markup.indexOf('<ul'))
    expect(ul.indexOf('Passe no quiz')).toBeGreaterThan(-1)
    expect(ul.indexOf('Passe no quiz')).toBeLessThan(ul.indexOf('Envie seu projeto'))
    // Só o primeiro leva o prefixo.
    expect(markup.split('Para seguir:').length - 1).toBe(1)
  })

  test('⚠️ a mensagem de AUTORIA é do professor: fora do ensaio vira a frase de criança', () => {
    const autoria = item(
      'authoring',
      'A verificação desta seção precisa ser configurada pelo professor.',
    )
    const criança = faixa({ items: [autoria], completed: false })
    expect(criança).toContain('Esta parte ainda está sendo preparada')
    expect(criança).not.toContain('configurada pelo professor')
    // É um estado, não um pedido: sem "Para seguir:".
    expect(criança).not.toContain('Para seguir:')
    expect(criança).toContain('lucide-wrench')

    // Dois `authoring` com textos diferentes viram UMA frase fora do ensaio (sem "+1").
    const dois = faixa({
      items: [autoria, item('authoring', 'Configure os critérios de conclusão desta seção.')],
      completed: false,
    })
    expect(dois.split('Esta parte ainda está sendo preparada').length - 1).toBe(1)
    expect(dois).not.toContain('sz-lesson-status-mais')

    const ensaio = faixa({ items: [autoria], completed: false, preview: true })
    expect(ensaio).toContain('A verificação desta seção precisa ser configurada pelo professor.')
    expect(ensaio).not.toContain('Esta parte ainda está sendo preparada')
  })

  test('sem itens da seção, o `fallback` do player vira o item da aula; sem nada, nada', () => {
    const comFallback = faixa({
      items: [],
      completed: false,
      fallback: 'Termine as atividades desta aula para concluir',
    })
    expect(comFallback).toContain('data-kind="lesson"')
    expect(comFallback).toContain('lucide-flag')
    expect(comFallback).toContain('Termine as atividades desta aula para concluir')
    // A razão da aula toda é um estado: sem "Para seguir:" (review do lote 2, M4).
    expect(comFallback).not.toContain('Para seguir:')
    expect(
      faixa({
        items: [item('LESSON_COMING_SOON', 'Espere a aula ficar pronta')],
        completed: false,
      }),
    ).not.toContain('Para seguir:')

    // Um `fallback` que não é texto (um nó do player) entra como está.
    const comNo = faixa({ items: [], completed: false, fallback: <em>Quase lá</em> })
    expect(comNo).toContain('<em>Quase lá</em>')
    expect(comNo).not.toContain('sz-lesson-status-item')

    expect(faixa({ items: [], completed: false })).toBe('')
    expect(faixa({ items: [], completed: false, fallback: null })).toBe('')
  })

  test('com itens da seção o `fallback` não aparece (a seção sabe melhor do que a aula)', () => {
    const markup = faixa({
      items: [item('QUIZ_GATE_NOT_PASSED', 'Passe no quiz')],
      completed: false,
      fallback: 'Termine as atividades desta aula para concluir',
    })
    expect(markup).toContain('Passe no quiz')
    expect(markup).not.toContain('Termine as atividades desta aula')
  })
})
