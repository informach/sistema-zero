import { describe, expect, test } from 'bun:test'
import { openScene, type SceneAction, stepScene } from '@sistemazero/core/learning/scene'
import { renderToStaticMarkup } from 'react-dom/server'
import {
  AVISOS_DOS_SIMBOLOS,
  SymbolSequenceControls,
  SymbolSequenceStage,
} from '../src/components/scene-symbol-sequence'

describe('o baú dos símbolos no player', () => {
  const start = { scene: 'symbol-sequence' } as const
  const initial = openScene(start)
  const run = (actions: SceneAction[], from = initial) =>
    actions.reduce((s, a) => stepScene(start, s, a), from)
  const tocar = (...ss: ('sol' | 'lua' | 'estrela')[]): SceneAction[] =>
    ss.map((symbol) => ({ type: 'touch-symbol', symbol }))

  test('o palco abre com as três pedras apagadas, o baú fechado e passo 0', () => {
    const html = renderToStaticMarkup(<SymbolSequenceStage state={initial} />)
    expect(html.match(/data-aceso="nao"/g)).toHaveLength(3)
    expect(html).toContain('data-bau="fechado"')
    expect(html).toContain('data-numero="0"')
    expect(html).toContain('passo: 0')
    expect(html).toContain(AVISOS_DOS_SIMBOLOS.inicio)
  })

  test('na ordem, as pedras acendem e o baú abre; o personagem vai à pedra tocada', () => {
    const lua = run(tocar('sol', 'lua'))
    const html = renderToStaticMarkup(<SymbolSequenceStage state={lua} />)
    expect(html.match(/data-aceso="sim"/g)).toHaveLength(2)
    expect(html).toContain('data-personagem="lua"')
    expect(html).toContain(AVISOS_DOS_SIMBOLOS.lua)
    const abriu = renderToStaticMarkup(<SymbolSequenceStage state={run(tocar('estrela'), lua)} />)
    expect(abriu).toContain('data-bau="aberto"')
    expect(abriu).toContain(AVISOS_DOS_SIMBOLOS.abriu)
  })

  test('fora da vez tudo apaga e o aviso pede para começar pelo sol', () => {
    const html = renderToStaticMarkup(<SymbolSequenceStage state={run(tocar('sol', 'estrela'))} />)
    expect(html.match(/data-aceso="nao"/g)).toHaveLength(3)
    expect(html).toContain(AVISOS_DOS_SIMBOLOS.errou)
  })

  test('a bancada tem os rótulos que pedidos e pistas citam e troca a regra no modo só contando', () => {
    const html = renderToStaticMarkup(
      <SymbolSequenceControls state={initial} dispatch={() => {}} />,
    )
    for (const rotulo of [
      'Tocar o sol',
      'Tocar a lua',
      'Tocar a estrela',
      'Na ordem',
      'Só contando',
      'Recomeçar a partida',
    ])
      expect(html).toContain(rotulo)
    expect(html).toContain('passo = 1')
    const contando = run([{ type: 'sequence-mode', mode: 'count' }])
    const outra = renderToStaticMarkup(
      <SymbolSequenceControls state={contando} dispatch={() => {}} />,
    )
    expect(outra).toContain('contados = 3')
    expect(outra).not.toContain('passo = 1')
  })
})
