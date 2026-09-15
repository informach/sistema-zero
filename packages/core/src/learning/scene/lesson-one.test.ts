import { describe, expect, test } from 'bun:test'
import { isSceneAction } from './actions'
import { stepScene } from './engine'
import { evaluateExperimentation, sceneGoals } from './evaluate'
import { sceneReadout, sceneSituation } from './readout'
import { initialScene, type SceneState } from './state'

/**
 * As duas cenas que a Aula 1 do Corre Dino pedia (14/09/2026).
 *
 * O roteiro dela ensinava as duas por VÍDEO: coordenadas com "um marcador se move, sem arraste
 * nem parâmetros para a criança", e leitor de tela com uma captura de tela gravada. O fecho da
 * aula, porém, cobra as duas ("sabe que x maior é mais pra direita e y maior é mais pra baixo").
 */

const coord = () => initialScene({ scene: 'coordinates' })
const leitor = () => initialScene({ scene: 'screen-reader' })
const place = (s: SceneState, x: number, y: number) =>
  stepScene({ scene: 'coordinates' }, s, { type: 'place', x, y })

describe('o endereço na tela', () => {
  test('a cena abre em x 110, y 150 — os números que a Aula 1 pede no bloco', () => {
    // Não é detalhe: a cena e o projeto dela têm que mostrar o MESMO par, senão o número da
    // experiência não é o número que ela vai digitar.
    const s = coord()
    expect(s.place.x).toBe(110)
    expect(s.place.y).toBe(150)
    expect(sceneReadout('coordinates', s).map((r) => r.value)).toContain('110')
  })

  test('⚠️ a descoberta é por EIXO: mexer nos dois ao mesmo tempo não ensina qual foi', () => {
    // É a regra pedagógica da cena inteira. Com os dois eixos mudando junto, nada distingue o
    // que a largura fez do que a altura fez.
    const s = place(coord(), 300, 240)
    expect(s.evidence.discoveries).not.toContain('right')
    expect(s.evidence.discoveries).not.toContain('down')
    expect(s.caption).toContain('Mudaram os dois')
  })

  test('x maior leva para a direita, e a frase narra a mudança', () => {
    const s = place(coord(), 300, 150)
    expect(s.evidence.discoveries).toContain('right')
    expect(s.caption).toContain('para a direita')
    expect(s.caption).toContain('na mesma altura')
    // ⚠️ A narração VENCE o rótulo da meta, que o `observe` carimba no caption: o rótulo é do
    // relatório do professor, a narração é de quem está mexendo.
    expect(s.caption).not.toBe('x maior leva para a direita')
    expect(sceneSituation('coordinates', s)).toBe(s.caption)
  })

  test('⚠️ y maior leva para BAIXO — a surpresa que a aula existe para dar', () => {
    const desceu = place(coord(), 110, 210)
    expect(desceu.evidence.discoveries).toContain('down')
    expect(desceu.caption).toContain('DESCEU')
    // E subir não conta a descoberta: o que surpreende é o y CRESCENDO para baixo.
    const subiu = place(coord(), 110, 90)
    expect(subiu.evidence.discoveries).not.toContain('down')
    expect(subiu.caption).toContain('subiu')
  })

  test('mesmo x em duas alturas fecha a terceira descoberta', () => {
    const s = place(place(coord(), 110, 210), 110, 60)
    expect(s.evidence.discoveries).toContain('same-x')
  })

  test('o caminho completo fecha a cena, e o fantasma guarda de onde veio', () => {
    const s = place(place(place(coord(), 300, 150), 300, 240), 110, 240)
    expect(s.place.fromX).toBe(300)
    expect(s.place.fromY).toBe(240)
    expect(sceneGoals('coordinates', s).every((g) => g.complete)).toBe(true)
    expect(evaluateExperimentation('coordinates', s).passed).toBe(true)
  })

  test('⚠️ a ação só é legal DENTRO da tela, e só nesta cena', () => {
    // O endereço é desenhado direto no palco: um x de um milhão tiraria o sprite da tela sem
    // erro nenhum. E `place` numa cena de salto é ação de outro assunto.
    expect(isSceneAction({ type: 'place', x: 480, y: 270 }, 'coordinates')).toBe(true)
    expect(isSceneAction({ type: 'place', x: 481, y: 0 }, 'coordinates')).toBe(false)
    expect(isSceneAction({ type: 'place', x: -1, y: 0 }, 'coordinates')).toBe(false)
    expect(isSceneAction({ type: 'place', x: 10.5, y: 0 }, 'coordinates')).toBe(false)
    expect(isSceneAction({ type: 'place', x: 10, y: 10 }, 'gravity')).toBe(false)
  })
})

describe('o que o leitor de tela lê', () => {
  const ouvir = (s: SceneState) => stepScene({ scene: 'screen-reader' }, s, { type: 'listen' })
  const escrever = (s: SceneState, text: string) =>
    stepScene({ scene: 'screen-reader' }, s, { type: 'describe', text })

  test('⚠️ sem descrição, a pessoa ouve o que o desenho NÃO informa', () => {
    // A descoberta que abre a cena. Ouvir o vazio é o que torna a frase dela necessária.
    const s = ouvir(leitor())
    expect(s.description.heard).toBe('Tela do jogo. Imagem.')
    expect(s.evidence.discoveries).toContain('heard-empty')
    expect(s.caption).toContain('não informa nada')
  })

  test('a frase precisa dizer o objetivo E o controle', () => {
    const so_objetivo = ouvir(escrever(leitor(), 'Desvie de tudo que vier'))
    expect(so_objetivo.evidence.discoveries).toContain('says-goal')
    expect(so_objetivo.evidence.discoveries).not.toContain('says-control')
    expect(so_objetivo.caption).toContain('Falta dizer como se joga')

    const so_controle = ouvir(escrever(leitor(), 'Use a barra de espaço'))
    expect(so_controle.evidence.discoveries).toContain('says-control')
    expect(so_controle.evidence.discoveries).not.toContain('says-goal')
  })

  test('a frase canônica da Aula 1 fecha a cena', () => {
    // É a frase que o roteiro manda a criança escrever no bloco. Se ela não fechasse a cena,
    // a experiência estaria cobrando outra coisa do que a aula ensina.
    const s = ouvir(escrever(ouvir(leitor()), 'Corra com o dino e pule os cactos apertando espaço'))
    expect(s.description.heard).toBe(
      'Tela do jogo. Corra com o dino e pule os cactos apertando espaço',
    )
    expect(sceneGoals('screen-reader', s).every((g) => g.complete)).toBe(true)
    expect(evaluateExperimentation('screen-reader', s).passed).toBe(true)
  })

  test('escrever NÃO conta como ouvir: a descoberta é do que a pessoa recebe', () => {
    const s = escrever(leitor(), 'Corra e pule apertando espaço')
    expect(s.description.heard).toBe('')
    expect(s.evidence.discoveries).toHaveLength(0)
  })

  test('a faixa de estado mostra a descrição vazia em tom de alerta', () => {
    const vazio = sceneReadout('screen-reader', leitor())
    expect(vazio[0]?.value).toBe('vazia')
    expect(vazio[0]?.tone).toBe('alert')
    const escrito = sceneReadout('screen-reader', escrever(leitor(), 'Pule apertando espaço'))
    expect(escrito[0]?.value).toBe('escrita')
    expect(escrito[0]?.tone).toBe('a')
  })

  test('⚠️ o texto tem teto e é só texto', () => {
    expect(isSceneAction({ type: 'describe', text: 'x'.repeat(200) }, 'screen-reader')).toBe(true)
    expect(isSceneAction({ type: 'describe', text: 'x'.repeat(201) }, 'screen-reader')).toBe(false)
    expect(isSceneAction({ type: 'describe', text: 42 }, 'screen-reader')).toBe(false)
    expect(isSceneAction({ type: 'listen' }, 'world')).toBe(false)
  })
})
