import { describe, expect, test } from 'bun:test'
import { isSceneAction } from './actions'
import { openScene, sceneDescriptionSays, stepScene } from './engine'
import { evaluateExperimentation, sceneGoals } from './evaluate'
import { sceneReadout, sceneSituation, screenReaderSays } from './readout'
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
    // ⚠️ Mudou de propósito (lote 5): "na mesma altura" virou "O y ficou igual", o nome do eixo.
    expect(s.caption).toContain('O y ficou igual')
    // ⚠️ A narração VENCE o rótulo da meta, que o `observe` carimba no caption: o rótulo é do
    // relatório do professor, a narração é de quem está mexendo.
    expect(s.caption).not.toBe('x maior leva para a direita')
    expect(sceneSituation('coordinates', s)).toBe(s.caption)
  })

  test('⚠️ y maior leva para BAIXO — a surpresa que a aula existe para dar', () => {
    const desceu = place(coord(), 110, 210)
    expect(desceu.evidence.discoveries).toContain('down')
    // ⚠️ Mudou de propósito (lote 5): "DESCEU, sem sair do lugar na largura" gritava a resposta.
    expect(desceu.caption).toBe('y foi de 150 para 210: o Dino desceu. O x ficou igual.')
    // E subir não conta a descoberta: o que surpreende é o y CRESCENDO para baixo.
    const subiu = place(coord(), 110, 90)
    expect(subiu.evidence.discoveries).not.toContain('down')
    expect(subiu.caption).toContain('subiu')
  })

  test('⚠️⚠️ a terceira descoberta é CHEGAR no 0, 0, e não repetir a segunda (lote 5)', () => {
    // A meta antiga ("mesmo x, altura diferente") caía junto com `down`: o x de fábrica já contava
    // como visitado. Três bolinhas para duas descobertas.
    const desceu = place(coord(), 110, 210)
    expect(desceu.evidence.discoveries).toEqual(['down'])
    // Metade do caminho não é chegar: com o x em 0 e o y longe, nada cai.
    const meio = place(desceu, 0, 210)
    expect(meio.evidence.discoveries).not.toContain('origin')
    const canto = place(meio, 0, 0)
    expect(canto.evidence.discoveries).toContain('origin')
    expect(canto.caption).toBe('y foi de 210 para 0: o Dino subiu. O x ficou igual.')
    // ⚠️ Um caso que abre no canto não entrega a meta: reenviar o mesmo endereço não é chegar.
    const start = {
      scene: 'coordinates' as const,
      setup: { actions: [{ type: 'place' as const, x: 0, y: 0 }] },
    }
    const aberto = openScene(start)
    expect(stepScene(start, aberto, { type: 'place', x: 0, y: 0 }).evidence.discoveries).toEqual([])
  })

  test('o caminho completo fecha a cena, e o fantasma guarda de onde veio', () => {
    const s = place(place(place(place(coord(), 300, 150), 300, 240), 0, 240), 0, 0)
    expect(s.place.fromX).toBe(0)
    expect(s.place.fromY).toBe(240)
    expect(sceneGoals('coordinates', s).every((g) => g.complete)).toBe(true)
    expect(evaluateExperimentation('coordinates', s).passed).toBe(true)
  })

  test('⚠️⚠️ a TELA é a do caso: o Desafio abre em 800 por 480, e o endereço fica preso nela', () => {
    const desafio = {
      scene: 'coordinates' as const,
      setup: {
        actions: [
          { type: 'stage' as const, width: 800, height: 480 },
          { type: 'place' as const, x: 400, y: 40 },
        ],
      },
    }
    const aberto = openScene(desafio)
    expect([aberto.place.width, aberto.place.height]).toEqual([800, 480])
    expect([aberto.place.x, aberto.place.y]).toEqual([400, 40])
    expect(aberto.evidence.discoveries).toEqual([])
    // A faixa diz a tela só quando o caso a trocou.
    const tela = sceneReadout('coordinates', aberto).find((r) => r.label === 'tela')
    expect(tela?.value).toBe('800 por 480')
    expect(sceneReadout('coordinates', coord()).some((r) => r.label === 'tela')).toBe(false)
    // Numa tela de 800 o x 700 fica; na de fábrica (480) ele para na borda.
    expect(stepScene(desafio, aberto, { type: 'place', x: 700, y: 40 }).place.x).toBe(700)
    expect(place(coord(), 700, 150).place.x).toBe(480)
    // Trocar a tela para uma menor traz o endereço para dentro dela.
    const menor = stepScene(desafio, aberto, { type: 'stage', width: 320, height: 180 })
    expect([menor.place.x, menor.place.y]).toEqual([320, 40])
  })

  test('⚠️ a ação só é legal DENTRO da maior tela, e só nesta cena', () => {
    // O endereço é desenhado direto no palco: um x de um milhão tiraria o sprite da tela sem
    // erro nenhum. E `place` numa cena de salto é ação de outro assunto.
    // ⚠️ Mudou de propósito (lote 5): a faixa vai até 800 × 480, a maior tela de um caso; quem
    // prende o endereço na tela do caso é o motor.
    expect(isSceneAction({ type: 'place', x: 800, y: 480 }, 'coordinates')).toBe(true)
    expect(isSceneAction({ type: 'place', x: 801, y: 0 }, 'coordinates')).toBe(false)
    expect(isSceneAction({ type: 'stage', width: 800, height: 480 }, 'coordinates')).toBe(true)
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
    // ⚠️ Mudou de propósito (review do lote 2): "o desenho não informa nada sozinho" era a resposta
    // do "Agora explique", embaixo do palco antes de a pergunta aparecer.
    expect(s.caption).toBe('A pessoa ouviu só isso.')
  })

  test('a frase precisa dizer o objetivo E o controle', () => {
    const so_objetivo = ouvir(escrever(leitor(), 'Desvie de tudo que vier'))
    expect(so_objetivo.evidence.discoveries).toContain('says-goal')
    expect(so_objetivo.evidence.discoveries).not.toContain('says-control')
    expect(so_objetivo.caption).toContain('Falta dizer como jogar')

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

  test('⚠️⚠️ frases certas de CRIANÇA passam: o reconhecimento é por radical, sem acento nem maiúscula', () => {
    // O bloco é OBRIGATÓRIO, e a lista de palavras exatas reprovava as duas primeiras: quem
    // escreveu o que a aula pediu ficava preso em "Ainda falta: A frase diz o que fazer no jogo".
    const certas = [
      'Salte por cima dos cactos usando a barra de espaço',
      'Um dinossauro que foge dos cactos. Use as setinhas',
      'Um dinossauro que foge dos cactos, use as setas',
      'PULE OS CACTOS COM A BARRA DE ESPAÇO',
      'corra e desvie dos cactos apertando espaco',
      'Pulando os cactos com a tecla de cima',
      'Escape dos asteroides com as setas do teclado',
      'Atire nos asteroides clicando com o mouse',
      'Pegue as moedas tocando na tela',
      'Clique para voar e fugir das pedras',
      'Voe com a nave usando W A S D',
      'Ande para os lados com A e D',
      'Mova a nave com o dedo e colete as estrelas',
      'Toque na tela para pular',
      'Aperte Enter para começar e fuja dos cactos',
      // ⚠️ As duas que o review do lote 1 pegou reprovando, frases comuns de criança.
      'Evite os cactos clicando',
      'Não bata nos cactos! Use o espaço',
      // ⚠️ O "o" antes de "espaço" é a tecla (lote 5): só a preposição de LUGAR tira a conta.
      'Pule os cactos apertando o espaço',
      'Corra com o Dino e pule com espaço',
      'Sobreviva o máximo que puder apertando as setas',
    ]
    for (const frase of certas)
      expect(sceneDescriptionSays(frase), frase).toEqual({ goal: true, control: true })
    // E pelo motor, que é o que a criança vive: ouvir a tela vazia e depois a frase fecha a cena.
    for (const frase of certas.slice(0, 2)) {
      const s = ouvir(escrever(ouvir(leitor()), frase))
      expect(evaluateExperimentation('screen-reader', s).passed, frase).toBe(true)
    }
  })

  test('⚠️ e o que NÃO diz nada continua sem passar', () => {
    const nada = [
      'Meu jogo é legal',
      'Um jogo com um dinossauro e cactos',
      'Socorro, que jogo bonito',
      // ⚠️ "espaço" é palavra inteira: "espaçonave" é o personagem do Desafio, não a tecla.
      'A espaçonave é azul e bonita',
      // ⚠️ "foge" é forma exata: um radical "fog" casaria "fogo".
      'O fogo da nave é laranja',
      // ⚠️ "a" é artigo, e não a tecla A. "sete" não é "seta".
      'A nave tem sete cores',
      // ⚠️ "bater" é forma exata: um radical "bat" casaria "batata".
      'O dinossauro gosta de batata',
      // ⚠️⚠️ "no espaço" é LUGAR, e não a tecla (lote 5; a suspeita S2 do review do lote 1).
      'Uma nave bonita no espaço',
      'Estrelas brilhando pelo espaço',
    ]
    for (const frase of nada)
      expect(sceneDescriptionSays(frase), frase).toEqual({ goal: false, control: false })
    const s = ouvir(escrever(ouvir(leitor()), 'Meu jogo é legal'))
    expect(evaluateExperimentation('screen-reader', s).passed).toBe(false)
  })

  test('⭐ o painel guarda as DUAS escutas: ouvir vazio de novo não apaga a frase (lote 5)', () => {
    const frase = 'Pule os cactos apertando espaço'
    const comFrase = ouvir(escrever(ouvir(leitor()), frase))
    expect(comFrase.description.said).toBe(`Tela do jogo. ${frase}`)
    expect(comFrase.description.listens).toBe(2)
    expect(screenReaderSays(comFrase)).toEqual({ goal: true, control: true })
    const deNovoVazio = ouvir(escrever(comFrase, ''))
    expect(deNovoVazio.description.heard).toBe('Tela do jogo. Imagem.')
    expect(deNovoVazio.description.said).toBe(`Tela do jogo. ${frase}`)
    // ⚠️ Ouvir a MESMA frase de novo conta mais uma escuta: é o gatilho da voz no palco.
    expect(ouvir(comFrase).description.listens).toBe(3)
    expect(screenReaderSays(leitor())).toBeNull()
  })

  test('⚠️ os selos da faixa só mudam numa ESCUTA, e a frase nova é dita na situação', () => {
    const escrita = escrever(ouvir(leitor()), 'Pule apertando espaço')
    const faixa = (s: SceneState) => sceneReadout('screen-reader', s).map((r) => [r.label, r.value])
    expect(faixa(escrita)).toEqual([
      ['descrição', 'escrita'],
      ['diz o que fazer', 'ainda não'],
      ['diz como jogar', 'ainda não'],
    ])
    expect(sceneSituation('screen-reader', { ...escrita, caption: '' })).toBe(
      'A descrição tem uma frase que a pessoa ainda não ouviu.',
    )
    const ouvida = ouvir(escrita)
    expect(faixa(ouvida).slice(1)).toEqual([
      ['diz o que fazer', 'sim'],
      ['diz como jogar', 'sim'],
    ])
    expect(sceneSituation('screen-reader', { ...ouvida, caption: '' })).toBe(
      'A descrição do jogo tem uma frase escrita.',
    )
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
