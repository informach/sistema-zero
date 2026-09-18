import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import type { LearningPrediction } from '@sistemazero/core/learning'
import { createRef } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { ScenePrediction } from '../src/components/scene-prediction'
import { ScenePredictionPreview } from '../src/components/scene-prediction-preview'

/**
 * O PALPITE EXPLICA A CENA, mas não cria uma caixa que se parece com mais uma opção.
 * A prévia e o palco aberto usam a largura disponível do cartão; proporção e altura pertencem
 * ao palco interno, nunca a um teto artificial nesta moldura.
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
  test('mantém a explicação no balão, sem criar uma falsa alternativa de recurso', () => {
    const html = renderToStaticMarkup(
      <ScenePrediction
        prediction={prediction}
        escolha=""
        onEscolher={() => {}}
        trocavel
        revelado={false}
        demonstracao={false}
        bloqueado={false}
        preview={null}
        renderDialogue={(text) => <p>{text}</p>}
        dialogueRef={createRef<HTMLDivElement>()}
      />,
    )

    expect(html).toContain(prediction.context.explanation)
    expect(html).toContain(prediction.prompt)
    expect(html).not.toContain('Hoje vamos usar:')
  })

  test('mantém a prévia segura, mas sem teto ou centralização próprios', () => {
    const html = renderToStaticMarkup(
      <ScenePredictionPreview
        activity={{ type: 'experimentation', scene: 'screen-reader' }}
        contextLabel={prediction.context.label}
      />,
    )
    const moldura = html.match(/<div(?=[^>]*data-testid="scene-prediction-preview")[^>]*>/)?.[0]

    expect(moldura).toBeDefined()
    expect(moldura).toContain('w-full')
    expect(moldura).toContain('[&amp;_button]:hidden')
    expect(moldura).not.toContain('max-w-scene')
    expect(moldura).not.toContain('mx-auto')
  })

  test('abre a mesma cena sem teto de largura na moldura do palco', () => {
    const source = readFileSync(ARQUIVO_DA_CENA_ABERTA, 'utf8')

    expect(source).toContain('className={`w-full overflow-hidden rounded-2xl border border-border')
    expect(source).not.toContain(
      'className={`mx-auto w-full max-w-scene overflow-hidden rounded-2xl border border-border',
    )
  })
})
