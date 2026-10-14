import { describe, expect, test } from 'bun:test'
import type { LiveOccurrence, LiveRoomView } from '@sistemazero/core/live'
import {
  chapterSeconds,
  learnerSectionControl,
  nextSectionId,
  sectionLabel,
  teacherSectionControl,
} from '../src/lib/live/sections'

const sections = [
  { id: 'a', title: 'Conhecer o jogo' },
  { id: 'b', title: 'Mover o Dino' },
  { id: 'c', title: 'Pular os cactos' },
]

function room(
  state: LiveOccurrence['state'],
  control: LiveOccurrence['sections'] = undefined,
): LiveRoomView {
  return { occurrence: { state, sections: control } } as unknown as LiveRoomView
}

describe('partes conduzidas pela professora', () => {
  test('a criança só anda entre as abertas no encontro; antes, espera; depois, tudo livre', () => {
    const open = { openedIds: ['a', 'b'], currentId: 'b' }
    expect(learnerSectionControl(room('live', open))).toEqual(open)
    // Na recepção nenhuma parte abriu: a tela mostra a primeira e espera a professora.
    expect(learnerSectionControl(room('lobby'))).toEqual({ openedIds: [], currentId: null })
    // Gravação e prazo: a navegação é a de sempre.
    expect(learnerSectionControl(room('ended', open))).toBeNull()
    expect(learnerSectionControl(room('scheduled'))).toBeNull()
    expect(learnerSectionControl({ occurrence: null } as unknown as LiveRoomView)).toBeNull()
    expect(learnerSectionControl(null)).toBeNull()
    // Servidor anterior às partes: nunca prende a criança.
    expect(learnerSectionControl(room('live'))).toBeNull()
  })

  test('a professora vê todas abertas e acompanha a parte da turma', () => {
    expect(
      teacherSectionControl(room('live', { openedIds: ['a'], currentId: 'a' }), ['a', 'b']),
    ).toEqual({ openedIds: ['a', 'b'], currentId: 'a' })
    expect(teacherSectionControl(room('live'), ['a', 'b'])).toEqual({
      openedIds: ['a', 'b'],
      currentId: null,
    })
    expect(teacherSectionControl(room('lobby'), ['a'])).toBeNull()
    expect(teacherSectionControl(room('live'), [])).toBeNull()
  })

  test('"Próxima parte" abre a seguinte à atual, e para na última', () => {
    expect(nextSectionId(sections, null)).toBe('a')
    expect(nextSectionId(sections, { openedIds: [], currentId: null })).toBe('a')
    expect(nextSectionId(sections, { openedIds: ['a'], currentId: 'a' })).toBe('b')
    // Reaberta uma anterior, a próxima é a seguinte a ELA (a professora voltou para revisar).
    expect(nextSectionId(sections, { openedIds: ['a', 'b', 'c'], currentId: 'a' })).toBe('b')
    expect(nextSectionId(sections, { openedIds: ['a', 'b', 'c'], currentId: 'c' })).toBeNull()
    expect(nextSectionId(sections, { openedIds: ['x'], currentId: 'x' })).toBe('a')
    expect(nextSectionId([], { openedIds: [], currentId: null })).toBeNull()
  })

  test('o capítulo da parte na gravação, e o rótulo dos cartões', () => {
    const chapters = [
      { sectionId: 'a', seconds: 0 },
      { sectionId: 'b', seconds: 312 },
      { sectionId: 'b', seconds: 900 },
      { sectionId: 'c', seconds: -1 },
    ]
    expect(chapterSeconds(chapters, 'a')).toBe(0)
    expect(chapterSeconds(chapters, 'b')).toBe(312)
    expect(chapterSeconds(chapters, 'c')).toBeNull()
    expect(chapterSeconds(chapters, 'z')).toBeNull()
    expect(chapterSeconds(undefined, 'a')).toBeNull()
    expect(chapterSeconds(chapters, null)).toBeNull()
    expect(sectionLabel(sections, 'b')).toBe('Parte 2 · Mover o Dino')
    expect(sectionLabel(sections, 'z')).toBeNull()
    expect(sectionLabel(sections, null)).toBeNull()
  })
})
