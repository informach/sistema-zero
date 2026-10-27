import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

/**
 * A experiência de descoberta AMPLIADA ocupa a janela (27/10/2026, print dela no Cadê, "O toque
 * faz o jogo responder").
 *
 * Dois defeitos juntos: (1) o jardim embrulhava o `Frame` numa `div` sem flex, e a altura do
 * diálogo parava nela: a experiência crescia até 1071px numa janela de 960 e quem rolava era o
 * cartão de fora; (2) o painel da cena ficava preso no alto (`align-self: start` + `sticky`) e,
 * ampliado, encolhia para 395px com barra própria. O `scene.css` só passa a altura por
 * `.sz-scene-workspace-body > fieldset > fieldset > .sz-scene-workspace-body`.
 *
 * A prova de verdade é medir no navegador; este teste só impede que as duas regras sumam.
 */
const dir = resolve(import.meta.dir, '..', 'src', 'components')
const ler = (nome: string) => readFileSync(resolve(dir, nome), 'utf8')

describe('a descoberta ampliada ocupa a janela', () => {
  test('o painel da cena estica no ampliado', () => {
    const css = ler('scene-discovery.css')
    const inicio = css.indexOf(
      '\n.sz-scene-workspace--expanded .sz-discovery-proposed .sz-scene-console-visual {',
    )
    expect(inicio).toBeGreaterThan(-1)
    const corpo = css.slice(inicio, css.indexOf('}', inicio))
    expect(corpo).toMatch(/align-self:\s*stretch/)
    expect(corpo).toMatch(/position:\s*relative/)
  })

  test('nenhuma descoberta embrulha o Frame numa caixa que corta a altura', () => {
    for (const nome of ['scene-discovery-garden.tsx', 'scene-discovery-controls.tsx']) {
      const fonte = ler(nome)
      expect(fonte).toContain('<Frame')
      expect(fonte).not.toMatch(/return \(\s*<div[^>]*>\s*<Frame/)
    }
  })
})
