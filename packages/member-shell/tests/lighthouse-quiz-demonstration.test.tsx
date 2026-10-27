import { expect, test } from 'bun:test'
import { renderToStaticMarkup } from 'react-dom/server'
import {
  cadeTodoMundo,
  farol,
} from '../../../docs/aulas-interativas-tecnico/qa/quizzes-cursos-curtos'
import { PredictionQuiz } from '../src/components/prediction-quiz'
import { QuizScene } from '../src/components/quiz-lighthouse-scene'

test.each([0, 3])('a demonstração %i observa a regra, sem depender do ID da resposta', (index) => {
  const render = (choice: string) => {
    const props = { index, phase: 2, choice }
    return renderToStaticMarkup(<QuizScene {...props} />)
  }
  const canonical = render('b')
  expect(render('resposta-renomeada')).toBe(canonical)
  expect(render('a')).toBe(canonical)
  expect(canonical).toContain(index === 0 ? 'Ficou dentro.' : 'teste sem chave também foi feito.')
})

test('a conclusão do Farol não mostra o resumo do jardim; Cadê preserva seu resumo', () => {
  const render = (content: typeof farol.content | typeof cadeTodoMundo.content) =>
    renderToStaticMarkup(
      <PredictionQuiz
        blockId="quiz"
        content={content}
        quizState={{ passed: true, lastScore: 100, attemptsCount: 1, retryAvailableAt: null }}
      />,
    )
  expect(render(farol.content)).toContain('Revisão concluída.')
  expect(render(farol.content)).not.toContain('Achados guarda um valor')
  expect(render(farol.content)).not.toContain('esconderijo escolhido')
  expect(render(cadeTodoMundo.content)).toContain('Achados guarda um valor')
})
