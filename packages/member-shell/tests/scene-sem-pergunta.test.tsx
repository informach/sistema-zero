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
 * A Aula 1 do Corre Dino tem quatro cenas seguidas, cada uma com previsão E pergunta: oito
 * momentos de responder na primeira aula da criança. A pergunta do fim ficou só em duas, e o
 * campo novo é `semPerguntaFinal`. Aqui se mede o lado do PLAYER: o que ele recebe (a projeção
 * pública sem pergunta nenhuma) e o que ele DESENHA no lugar dela.
 */

const AULA_1 = resolve(
  import.meta.dir,
  '../../../docs/aulas-interativas/corre-dino-v6/aula-01/manifesto.json',
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

describe('a Aula 1 do Corre Dino chega ao player com a pergunta em duas cenas', () => {
  const cenas = blocosDaAula()

  // ⚠️ Eram QUATRO até `a4597d67 docs(corre-dino): retirar leitor de tela da aula inicial`, que
  // tirou a `experiencia-leitor-de-tela` do manifesto e deixou este teste para trás. O que ele
  // guarda segue sendo o mesmo: toda cena da Aula 1 chega com PREVISÃO, e só duas com pergunta.
  test('as três cenas continuam lá, e as três PREVISÕES também', () => {
    expect([...cenas.keys()].sort()).toEqual([
      'descoberta',
      'experiencia-coordenadas',
      'experiencia-tela',
    ])
    for (const [chave, bloco] of cenas)
      expect(publicInteractiveBlock(bloco).prediction, chave).toBeDefined()
  })

  test('⚠️⚠️ só `coordinates` e `world` mandam pergunta ao navegador', () => {
    const comPergunta = [...cenas]
      .filter(([, bloco]) => publicInteractiveBlock(bloco).checkpoint !== undefined)
      .map(([chave]) => chave)
      .sort()
    expect(comPergunta).toEqual(['descoberta', 'experiencia-coordenadas'])
    // E a que sobra diz isso por escrito, em vez de ter perdido a pergunta por acidente.
    for (const chave of ['experiencia-tela'])
      expect(cenas.get(chave)?.semPerguntaFinal, chave).toBe(true)
  })

  test('o campo de autoria não vaza para o navegador', () => {
    const publico = publicInteractiveBlock(cenas.get('experiencia-tela') as InteractiveBlock)
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
