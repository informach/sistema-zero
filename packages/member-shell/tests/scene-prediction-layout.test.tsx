import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import type { LearningPrediction } from '@sistemazero/core/learning'
import { createRef } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { PalpiteContexto, PalpiteOpcoes, PalpitePergunta } from '../src/components/scene-prediction'
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
    // ⚠⚠ Desde 18/09/2026 quem MONTA essa ordem é o console (`scene-activity`), e não mais o
    // `ScenePrediction`: as três peças viraram `PalpiteContexto`, `PalpitePergunta` e
    // `PalpiteOpcoes`. A regra guardada é a MESMA — a cena fica NO MEIO dos dois balões, porque
    // juntar os dois faria a criança responder antes de olhar.
    const fonte = readFileSync(ARQUIVO_DA_CENA_ABERTA, 'utf8')
    const ramo = fonte.slice(
      fonte.indexOf('{previsaoPendente && palpite ? ('),
      fonte.indexOf('</SceneConsole>', fonte.indexOf('{previsaoPendente && palpite ? (')),
    )

    const contexto = ramo.indexOf('<PalpiteContexto')
    const previa = ramo.indexOf('<ScenePredictionPreview')
    const pergunta = ramo.indexOf('<PalpitePergunta')
    const escolha = ramo.indexOf('<PalpiteOpcoes')

    expect(contexto).toBeGreaterThan(-1)
    expect(contexto).toBeLessThan(previa)
    expect(previa).toBeLessThan(pergunta)
    expect(pergunta).toBeLessThan(escolha)
    // A prévia é o MUNDO do console, e a prancha fica à vista porém fechada.
    expect(ramo).toContain('<ConsoleMundo>')
    expect(ramo).toContain('pranchaDaCena(true)')
  })

  test('as peças do palpite continuam dizendo o que precisam dizer', () => {
    const contexto = renderToStaticMarkup(
      <PalpiteContexto
        prediction={prediction}
        renderDialogue={(text) => <p data-dialogue={text}>{text}</p>}
        dialogueRef={createRef<HTMLDivElement>()}
      />,
    )
    const pergunta = renderToStaticMarkup(
      <PalpitePergunta
        prediction={prediction}
        renderDialogue={(text) => <p data-dialogue={text}>{text}</p>}
      />,
    )
    const opcoes = renderToStaticMarkup(
      <PalpiteOpcoes prediction={prediction} escolha="" bloqueado={false} onEscolher={() => {}} />,
    )

    expect(contexto).toContain(prediction.context.explanation)
    expect(pergunta).toContain(prediction.prompt)
    // ⚠️ O enunciado à VISTA é o balão; no grupo ele fica em `sr-only` para o leitor não ouvir
    // a mesma frase duas vezes.
    expect(opcoes).toContain(`<legend class="sr-only">${prediction.prompt}</legend>`)
    // ⚠⚠ BOTÕES, nunca rádios: com rádios a SETA escolhia e mandava uma tentativa por seta.
    expect(opcoes).toContain('<button')
    expect(opcoes).not.toContain('type="radio"')
    expect(opcoes).toContain(prediction.choices[0]!.label)
  })

  test('mostra o controle citado como botão desativado, mas sem teto ou centralização', () => {
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
    expect(moldura).not.toContain('max-w-scene')
    expect(moldura).not.toContain('mx-auto')
    expect(html).toContain('[&amp;_button]:hidden')
    expect(html).toContain('data-preview-control')
    expect(html).toContain('<button')
    expect(html).toContain('disabled=""')
    expect(html).toContain('aria-describedby')
  })

  test('abre a mesma cena sem teto de largura na moldura do palco', () => {
    const source = readFileSync(ARQUIVO_DA_CENA_ABERTA, 'utf8')
    const consoleCss = readFileSync(
      resolve(import.meta.dir, '..', 'src', 'styles', 'scene.css'),
      'utf8',
    )
    const regra = consoleCss.slice(
      consoleCss.indexOf('.sz-scene-console {'),
      consoleCss.indexOf('}', consoleCss.indexOf('.sz-scene-console {')),
    )

    // ⚠️ Desde 18/09/2026 a moldura é o CONSOLE (`scene-console.tsx`), e não mais um `div` com as
    // classes escritas no `scene-activity`. O que este teste guarda continua sendo o MESMO: a cena
    // abre na largura inteira da atividade.
    expect(source).toContain('<SceneConsole>')
    expect(regra).toContain('width: 100%')
    expect(regra).not.toContain('max-width')
    expect(source).not.toContain('max-w-scene')
  })
})
