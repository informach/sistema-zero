import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { gradeLearningQuiz, isLearningManifest } from '../../../packages/core/src/learning'
import { problemasPedagogicos } from './diretrizes-pedagogicas'

function load(name: string) {
  const value = JSON.parse(
    readFileSync(resolve(import.meta.dir, `../aulas/${name}.manifesto.json`), 'utf8'),
  )
  if (!isLearningManifest(value)) throw new Error(name)
  return value
}

describe('diretrizes dos cursos curtos', () => {
  for (const [prefix, lessons, count] of [
    ['cade-todo-mundo', ['aula-1', 'aula-2', 'certificado'], 3],
    ['desafio', ['introducao', 'dia-1', 'dia-2', 'dia-3', 'certificado'], 4],
  ] as const) {
    test(`${prefix}: uma revisão final, sem vídeo, antes do certificado preservado`, () => {
      const manifests = lessons.map((lesson) => load(`${prefix}-${lesson}`))
      for (const [index, manifest] of manifests.entries()) {
        expect(problemasPedagogicos(manifest, true)).toEqual([])
        const script = readFileSync(
          resolve(import.meta.dir, `../aulas/${prefix}-${lessons[index]}.roteiro.md`),
          'utf8',
        )
        for (const block of manifest.blocks)
          if (block.content?.kind === 'dialogue')
            expect(script, `${prefix}/${lessons[index]}: ${block.key}`).toContain(
              block.content.text,
            )
      }
      expect(manifests.flatMap((m) => m.sections)).toHaveLength(10)
      expect(manifests.flatMap((m) => m.blocks).filter((b) => 'plannedVideo' in b)).toHaveLength(9)
      const quizzes = manifests.flatMap((m) => m.blocks).filter((b) => b.content?.kind === 'quiz')
      expect(quizzes).toHaveLength(1)
      const final = manifests.at(-1)!
      expect(final.sections.map((s) => s.key)).toEqual(['revisao-final', 'certificado'])
      expect(final.blocks.find((b) => b.key === 'certificado')?.content?.kind).toBe('certificate')
      const quiz = quizzes[0]?.content
      if (quiz?.kind !== 'quiz') throw new Error('Quiz ausente')
      expect(quiz.questions).toHaveLength(count)
      const answers = Object.fromEntries(quiz.questions.map((q) => [q.id, q.correctChoiceIds]))
      expect(gradeLearningQuiz(quiz, answers).passed).toBe(true)
      for (const question of quiz.questions) {
        expect(question.choices).toHaveLength(3)
        expect(question.correctChoiceIds).toHaveLength(1)
        expect(question.explanation?.length).toBeGreaterThan(40)
        const wrong = question.choices.find((c) => !question.correctChoiceIds.includes(c.id))!
        const grade = gradeLearningQuiz(quiz, { ...answers, [question.id]: [wrong.id] })
        expect(grade.passed).toBe(false)
        expect(grade.questions.find((q) => q.questionId === question.id)?.explanation).toBe(
          question.explanation,
        )
      }
    })
  }

  test('recusa quiz antes da fala e vídeo misturado ao quiz', () => {
    const m = load('desafio-certificado')
    m.sections[0]!.blockKeys.reverse()
    expect(problemasPedagogicos(m).some((e) => e.includes('Zappy antes do quiz'))).toBe(true)
    m.sections[0]!.blockKeys.reverse()
    m.sections[0]!.blockKeys.push('video-certificado-farol')
    expect(problemasPedagogicos(m).some((e) => e.includes('sem vídeo'))).toBe(true)
  })

  test('recusa ponte ausente mesmo em caderno e feedback ausente no quiz', () => {
    const m = load('cade-todo-mundo-aula-1')
    m.sections[1]!.blockKeys = m.sections[1]!.blockKeys.filter((k) => k !== 'ponte-a1-caderno')
    expect(problemasPedagogicos(m).some((e) => e.includes('ponte do Zappy'))).toBe(true)
    const final = load('cade-todo-mundo-certificado')
    const quiz = final.blocks.find((b) => b.content?.kind === 'quiz')?.content
    if (quiz?.kind !== 'quiz') throw new Error('Quiz ausente')
    delete quiz.questions[0]!.explanation
    expect(problemasPedagogicos(final).some((e) => e.includes('explicação'))).toBe(true)
  })

  test('recusa HTML/CSS na paleta e no projeto de jogo inicial', () => {
    const m = load('desafio-dia-1')
    const studio = m.blocks.find((b) => b.content?.kind === 'studio')?.content
    if (studio?.kind !== 'studio') throw new Error('Estúdio ausente')
    studio.allowBlocks?.push('sz_html_canvas')
    expect(problemasPedagogicos(m, true).some((e) => e.includes('sz_html_canvas'))).toBe(true)
    studio.allowBlocks?.pop()
    Object.assign(studio.initialProject, { ir: { css: [{ type: 'rule' }] } })
    expect(problemasPedagogicos(m, true).some((e) => e.includes('área css'))).toBe(true)
    expect(problemasPedagogicos(m, false)).toEqual([])
  })
})
