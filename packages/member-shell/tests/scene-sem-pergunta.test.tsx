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
 * Desde a revisão de 05/10/2026, a Aula 1 tem o jogo pronto e quatro experiências, e todas
 * fecham sem a pergunta herdada do modelo (`semPerguntaFinal`), como pedem as Diretrizes.
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

  test('o jogo pronto e as quatro experiências estão lá, e nenhuma ganha palpite sem declaração', () => {
    expect([...cenas.keys()].sort()).toEqual([
      'descoberta',
      'experiencia-coordenadas',
      'experiencia-tela',
      'experiencia-uma-vez-e-sempre',
      'jogo-pronto',
    ])
    for (const [chave, bloco] of cenas)
      expect(publicInteractiveBlock(bloco).prediction, chave).toBeUndefined()
  })

  test('as quatro experiências fecham sem a pergunta herdada do modelo', () => {
    const experiencias = [...cenas].filter(([, bloco]) => bloco.activity.type === 'experimentation')
    expect(experiencias.map(([chave]) => chave).sort()).toEqual([
      'descoberta',
      'experiencia-coordenadas',
      'experiencia-tela',
      'experiencia-uma-vez-e-sempre',
    ])
    for (const [chave, bloco] of experiencias)
      expect(publicInteractiveBlock(bloco).checkpoint, chave).toBeUndefined()
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
