import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import type { LearningPrediction } from '@sistemazero/core/learning'
import { createRef } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { ScenePrediction } from '../src/components/scene-prediction'
import { ScenePredictionPreview } from '../src/components/scene-prediction-preview'

/**
 * O PALPITE PREPARA O OLHAR, mostra a cena e só então pergunta. A pergunta e as escolhas ficam
 * juntas, e um controle citado aparece como representação estática, nunca como ação antecipada.
 */

const prediction: LearningPrediction = {
  context: {
    label: 'Ouvir a tela',
    explanation: 'Nesta experiência, vamos descobrir como o leitor de tela apresenta um botão.',
  },
  prompt: 'O que você acha que ele vai ler quando apertarmos o botão?',
  choices: [
    { id: 'le', label: 'Ele lê o texto do botão.' },
    { id: 'nao-le', label: 'Ele não lê nada.' },
  ],
}

const ARQUIVO_DA_CENA_ABERTA = resolve(import.meta.dir, '../src/components/scene-activity.tsx')

describe('o palpite e a cena ocupam a largura útil da atividade', () => {
  test('mostra contexto, cena, pergunta e escolhas nessa ordem', () => {
    const html = renderToStaticMarkup(
      <ScenePrediction
        prediction={prediction}
        escolha=""
        onEscolher={() => {}}
        trocavel
        revelado={false}
        demonstracao={false}
        bloqueado={false}
        preview={<div data-testid="preview-do-palpite">Cena inicial</div>}
        renderDialogue={(text) => <p data-dialogue={text}>{text}</p>}
        dialogueRef={createRef<HTMLDivElement>()}
      />,
    )

    const contexto = html.indexOf(prediction.context.explanation)
    const previa = html.indexOf('data-testid="preview-do-palpite"')
    const pergunta = html.indexOf(prediction.prompt)
    const escolha = html.indexOf(prediction.choices[0].label)

    expect(html).toContain(prediction.context.explanation)
    expect(html).toContain(prediction.prompt)
    expect(contexto).toBeLessThan(previa)
    expect(previa).toBeLessThan(pergunta)
    expect(pergunta).toBeLessThan(escolha)
    expect(html).toContain(`<legend class="sr-only">${prediction.prompt}</legend>`)
    expect(html).not.toContain('Hoje vamos usar:')
  })

  test('mostra de forma estática o controle citado, mas sem teto, centralização ou interação', () => {
    const html = renderToStaticMarkup(
      <ScenePredictionPreview
        activity={{ type: 'experimentation', scene: 'screen-reader' }}
        contextLabel={prediction.context.label}
      />,
    )
    const moldura = html.match(/<div(?=[^>]*data-testid="scene-prediction-preview")[^>]*>/)?.[0]

    expect(moldura).toBeDefined()
    expect(moldura).toContain('w-full')
    expect(moldura).toContain('Ouvir a tela')
    expect(moldura).toContain('Você vai usar este botão depois do seu palpite.')
    expect(moldura).toContain('[&amp;_button]:hidden')
    expect(moldura).not.toContain('max-w-scene')
    expect(moldura).not.toContain('mx-auto')
    expect(html).toContain('data-preview-control')
    expect(html).not.toContain('<button')
    expect(html).not.toContain('role="button"')
  })

  test('abre a mesma cena sem teto de largura na moldura do palco', () => {
    const source = readFileSync(ARQUIVO_DA_CENA_ABERTA, 'utf8')

    expect(source).toContain('className={`w-full overflow-hidden rounded-2xl border border-border')
    expect(source).not.toContain(
      'className={`mx-auto w-full max-w-scene overflow-hidden rounded-2xl border border-border',
    )
  })
})
