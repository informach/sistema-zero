import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  type InteractiveBlock,
  isInteractiveBlock,
  publicInteractiveBlock,
} from '@sistemazero/core/learning'
import { renderToStaticMarkup } from 'react-dom/server'
import { SceneConclusion } from '../src/components/scene-conclusion'

/**
 * A CENA QUE ENTRA SEM A PERGUNTA DO FIM (decisão da dona, 17/09/2026).
 *
 * A Aula 1 atual tem três cenas, com perguntas herdadas do modelo. Também testamos o contrato
 * do player caso uma aula futura use `semPerguntaFinal`.
 */

const AULA_1 = resolve(
  import.meta.dir,
  '../../../docs/aulas-interativas/aulas/corre-dino-aula-01.manifesto.json',
)

function blocosDaAula() {
  const manifesto = JSON.parse(readFileSync(AULA_1, 'utf8')) as {
    blocks: Array<{ key: string; content?: unknown }>
  }
  const cenas = new Map<string, InteractiveBlock>()
  for (const bloco of manifesto.blocks)
    if (isInteractiveBlock(bloco.content)) cenas.set(bloco.key, bloco.content)
  return cenas
}

describe('a Aula 1 atual do Corre Dino chega ao player', () => {
  const cenas = blocosDaAula()

  test('as três cenas continuam lá, e as três PREVISÕES também', () => {
    expect([...cenas.keys()].sort()).toEqual([
      'descoberta',
      'experiencia-coordenadas',
      'experiencia-tela',
    ])
    for (const [chave, bloco] of cenas)
      expect(publicInteractiveBlock(bloco).prediction, chave).toBeDefined()
  })

  test('as três cenas mandam a pergunta herdada do modelo', () => {
    const comPergunta = [...cenas]
      .filter(([, bloco]) => publicInteractiveBlock(bloco).checkpoint !== undefined)
      .map(([chave]) => chave)
      .sort()
    expect(comPergunta).toEqual(['descoberta', 'experiencia-coordenadas', 'experiencia-tela'])
  })

  test('uma cena marcada sem pergunta perde o checkpoint, e o campo de autoria não vaza', () => {
    const publico = publicInteractiveBlock({
      ...(cenas.get('experiencia-tela') as InteractiveBlock),
      semPerguntaFinal: true,
    })
    expect(publico.checkpoint).toBeUndefined()
    expect(publico).not.toHaveProperty('semPerguntaFinal')
  })
})

describe('o que o palco desenha quando a cena fecha sem pergunta', () => {
  const desenhar = (pergunta?: { prompt: string; choices: { id: string; label: string }[] }) =>
    renderToStaticMarkup(
      <SceneConclusion
        pergunta={pergunta}
        regra="A tela tem um limite, e o limite é uma escolha sua!"
        resposta=""
        certa={null}
        feedback=""
        aguardaCena={false}
        bloqueada={false}
        onResponder={() => {}}
        faixaRef={null}
        perguntaRef={null}
      />,
    )

  test('“✓ Você descobriu!” e a REGRA na hora, sem “Agora explique”', () => {
    const html = desenhar()
    expect(html).toContain('Você descobriu!')
    expect(html).toContain('A tela tem um limite')
    expect(html).not.toContain('Agora explique')
  })

  test('anti-vácuo: com pergunta, a regra espera e o palco pede a explicação', () => {
    const html = desenhar({
      prompt: 'Por que a borda apareceu?',
      choices: [
        { id: 'a', label: 'Porque liguei a borda' },
        { id: 'b', label: 'Porque a tela mudou' },
      ],
    })
    expect(html).toContain('Agora explique')
    expect(html).toContain('Por que a borda apareceu?')
    expect(html).not.toContain('A tela tem um limite')
  })
})
