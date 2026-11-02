import { describe, expect, test } from 'bun:test'
import {
  discoveryGuidance,
  type ExperimentationActivity,
  openScene,
  type SceneAction,
  type SceneStart,
  type SceneState,
  stepScene,
} from '@sistemazero/core/learning/scene'
import type { ReactElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { DiscoveryContext } from '../src/components/scene-discovery-frame'
import { LivreGravity, proximoGestoDaGravidade } from '../src/components/scene-livre/gravity'
import { LivreImpulse, proximoGestoDoImpulso } from '../src/components/scene-livre/impulse'
import { LivreJumpSound, proximoGestoDoSom } from '../src/components/scene-livre/jump-sound'
import {
  LivreScreenReader,
  proximoGestoDoLeitor,
} from '../src/components/scene-livre/screen-reader'
import { LivreStageSize, proximoGestoDaTela } from '../src/components/scene-livre/stage-size'

/**
 * As cinco telas livres que só o Corre Dino usa (02/11/2026, frente B): só a IDEIA na tela (nada de
 * bloco, regra, Se, então, senão, área do Estúdio nem nome de bloco); o que cada caso faz só aparece
 * depois de testado; e o botão em destaque é o gesto que a fala do Zappy pede.
 */
const ATIVIDADES = {
  'stage-size': {
    type: 'experimentation',
    scene: 'stage-size',
    cenario: 'corre-dino',
    setup: { freeExploration: true, goals: ['border-on', 'resized', 'target'] },
  },
  'screen-reader': {
    type: 'experimentation',
    scene: 'screen-reader',
    cenario: 'corre-dino',
    setup: { freeExploration: true, goals: ['heard-empty', 'says-goal', 'says-control'] },
  },
  gravity: {
    type: 'experimentation',
    scene: 'gravity',
    cenario: 'corre-dino',
    setup: { freeExploration: true, goals: ['floating', 'landed'] },
  },
  impulse: {
    type: 'experimentation',
    scene: 'impulse',
    cenario: 'corre-dino',
    setup: { freeExploration: true, goals: ['first-height', 'other-height'] },
  },
  'jump-sound': {
    type: 'experimentation',
    scene: 'jump-sound',
    cenario: 'corre-dino',
    setup: { freeExploration: true, goals: ['false-sound', 'silent-jump', 'every-jump'] },
  },
} satisfies Record<string, ExperimentationActivity>
type Cena = keyof typeof ATIVIDADES

const TELAS: Record<Cena, () => ReactElement> = {
  'stage-size': () => <LivreStageSize />,
  'screen-reader': () => <LivreScreenReader />,
  gravity: () => <LivreGravity />,
  impulse: () => <LivreImpulse />,
  'jump-sound': () => <LivreJumpSound />,
}

const jogar = (cena: Cena, acoes: SceneAction[]): SceneState => {
  const start: SceneStart = { scene: cena, setup: ATIVIDADES[cena].setup }
  return acoes.reduce((s, a) => stepScene(start, s, a), openScene(start))
}
const tela = (cena: Cena, state: SceneState) =>
  renderToStaticMarkup(
    <DiscoveryContext.Provider
      value={{
        activity: ATIVIDADES[cena],
        state,
        dispatch: () => {},
        running: false,
        setRunning: () => {},
        tick: () => {},
        instruction: 'Fala do Zappy',
        dialogue: (text) => <p>{text}</p>,
        tools: null,
      }}
    >
      {TELAS[cena]()}
    </DiscoveryContext.Provider>,
  )
const texto = (html: string) =>
  html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
/** Só os controles, a lista e a figura da ideia: o palco é o de sempre, reaproveitado. */
const semPalco = (html: string) => html.replace(/<svg[\s\S]*?<\/svg>/g, ' ')
/** O rótulo de cada botão com o tom de gesto (o destaque). */
const destaques = (html: string) =>
  [...html.matchAll(/<button[^>]*data-tom="gesto"[^>]*>([\s\S]*?)<\/button>/g)].map((m) =>
    texto(m[1] ?? '').trim(),
  )
const SO_A_IDEIA =
  /\bregra|\bbloco|\bent[aã]o\b|\bsen[aã]o\b|\bcomando|\bc[oó]digo|\bEst[uú]dio|(^|\s)áreas?\b|Ao iniciar|Enquanto estiver|\bA cada (\d+ )?quadros?\b|Tocar efeito|Quando apertar|Quando o (Dino|sprite) pular|Aplicar a gravidade|Gravidade ao Dino|Mostrar a borda|Preparar o jogo|Descrever o jogo|força do pulo|Controlar o dinossauro|\baperte\b/i

const s1: SceneAction = { type: 'advance', seconds: 1 }
const s2 = [s1, s1]
const instante: SceneAction = { type: 'advance', seconds: 0.2 }
const borda = (visible: boolean): SceneAction => ({ type: 'border', visible })
const tam = (width: number, height: number): SceneAction => ({ type: 'stage', width, height })
const ouvir: SceneAction = { type: 'listen' }
const FRASE = 'Corra com o dino e pule os cactos apertando espaço'
const escrever: SceneAction = { type: 'describe', text: FRASE }
const pular: SceneAction = { type: 'jump', input: 'tap' }
const espaco: SceneAction = { type: 'jump', input: 'key' }
const gravidade = (enabled: boolean): SceneAction => ({ type: 'connect', port: 'gravity', enabled })
const impulso = (force: number): SceneAction => ({ type: 'impulse', force })
const somNoPulo = (enabled: boolean): SceneAction => ({ type: 'connect', port: 'sound', enabled })
const teclaFeita = [espaco, instante, espaco, ...s2, pular, ...s2]

/** Estados de cada cena que a tela precisa atravessar sem falar de bloco. */
const ESTADOS: Record<Cena, SceneAction[][]> = {
  'stage-size': [[], [borda(true), tam(600, 480)], [borda(true), tam(480, 480), tam(480, 270)]],
  'screen-reader': [[], [ouvir], [ouvir, escrever, ouvir]],
  gravity: [[], [pular, ...s2], [pular, ...s2, gravidade(true), s1, s1, s1]],
  impulse: [[], [pular, ...s2], [pular, ...s2, impulso(14), pular, ...s2]],
  'jump-sound': [[], teclaFeita, [...teclaFeita, somNoPulo(true), espaco, ...s2, pular, ...s2]],
}

const ROTULOS: Record<Cena, string[]> = {
  'stage-size': [
    'Ligar a borda',
    'Largura 800',
    'Largura 600',
    'Largura 480',
    'Altura 480',
    'Altura 300',
    'Altura 270',
  ],
  'screen-reader': ['Ouvir a tela', 'Descrição do jogo'],
  gravity: ['Pular', 'Ligar a gravidade'],
  impulse: ['Impulso 5', 'Impulso 9', 'Impulso 14', 'Pular'],
  'jump-sound': [
    'Quando a tecla Espaço é apertada',
    'Quando o Dino pula',
    'Apertar Espaço',
    'Tocar para pular',
  ],
}

describe('Dino B: as telas livres falam só da ideia', () => {
  test.each(Object.keys(ATIVIDADES) as Cena[])('%s: rótulos sem bloco, regra nem área', (cena) => {
    for (const acoes of ESTADOS[cena]) {
      const lido = texto(semPalco(tela(cena, jogar(cena, acoes))))
      expect(lido).not.toMatch(SO_A_IDEIA)
      expect(lido).not.toMatch(/\bSe\b/)
    }
    const lido = texto(tela(cena, jogar(cena, [])))
    for (const rotulo of ROTULOS[cena]) expect(lido).toContain(rotulo)
    expect(lido).toContain('Recomeçar experiência')
  })

  test('a tela da borda não mostra o 480 por 270 antes de a criança chegar nele', () => {
    const html = tela('stage-size', jogar('stage-size', [borda(true)]))
    expect(html).not.toContain('data-alvo')
  })
})

describe('Dino B: o que cada caso faz só aparece depois do teste', () => {
  const casos: [Cena, SceneAction[], string, SceneAction[]][] = [
    ['stage-size', [], 'é ali que a tela do jogo acaba', [borda(true)]],
    ['stage-size', [borda(true)], 'O contorno muda junto', [borda(true), tam(600, 480)]],
    [
      'stage-size',
      [borda(true), tam(480, 480)],
      'é a tela do seu jogo',
      [borda(true), tam(480, 480), tam(480, 270)],
    ],
    ['screen-reader', [], 'o programa não vê o desenho', [ouvir]],
    ['screen-reader', [ouvir, escrever], 'é ela que conta o jogo', [ouvir, escrever, ouvir]],
    ['gravity', [pular, instante], 'e o Dino não volta', [pular, ...s2]],
    [
      'gravity',
      [pular, ...s2, gravidade(true)],
      'o Dino volta ao chão',
      [pular, ...s2, gravidade(true), s1, s1, s1],
    ],
    ['impulse', [pular, instante], 'a marca guarda a altura do salto', [pular, ...s2]],
    [
      'impulse',
      [pular, ...s2, impulso(14), pular],
      'o 14 vai muito acima do 9',
      [pular, ...s2, impulso(14), pular, ...s2],
    ],
    ['jump-sound', [espaco], 'o segundo som veio sem pulo', [espaco, instante, espaco]],
    ['jump-sound', [], 'o pulo ficou sem som', [pular]],
    [
      'jump-sound',
      [somNoPulo(true), espaco, ...s2],
      'Um som em cada pulo, venha da tecla ou do toque',
      [somNoPulo(true), espaco, ...s2, pular],
    ],
  ]
  test.each(
    casos,
  )('%s: "%s" antes não mostra, depois do teste mostra', (cena, antes, frase, depois) => {
    expect(texto(tela(cena, jogar(cena, antes)))).not.toContain(frase)
    expect(texto(tela(cena, jogar(cena, depois)))).toContain(frase)
  })
})

describe('Dino B: o botão em destaque é o gesto que o Zappy pede', () => {
  const casos: [Cena, SceneAction[], string[]][] = [
    ['stage-size', [], ['Ligar a borda']],
    ['stage-size', [tam(600, 480)], ['Ligar a borda']],
    ['stage-size', [borda(true)], ['Largura 600']],
    ['stage-size', [tam(600, 480), borda(true)], ['Largura 800']],
    ['stage-size', [borda(true), tam(600, 480)], ['Largura 480']],
    ['stage-size', [borda(true), tam(480, 480)], ['Altura 270']],
    ['stage-size', [borda(true), borda(false)], ['Ligar a borda']],
    ['screen-reader', [], ['Ouvir a tela']],
    ['screen-reader', [ouvir], []],
    ['screen-reader', [ouvir, escrever], ['Ouvir a tela']],
    ['gravity', [], ['Pular']],
    ['gravity', [pular, instante], []],
    ['gravity', [pular, ...s2], ['Ligar a gravidade']],
    ['gravity', [gravidade(true), pular, ...s2], ['Desligar a gravidade']],
    ['gravity', [gravidade(true), pular, ...s2, gravidade(false)], ['Pular']],
    ['impulse', [], ['Pular']],
    ['impulse', [pular, ...s2], ['Impulso 14']],
    ['impulse', [pular, ...s2, impulso(14)], ['Pular']],
    ['impulse', [impulso(14), pular, ...s2], ['Impulso 9']],
    ['jump-sound', [], ['Apertar Espaço']],
    ['jump-sound', [espaco, instante, espaco], ['Tocar para pular']],
    ['jump-sound', teclaFeita, ['Quando o Dino pula']],
    ['jump-sound', [...teclaFeita, somNoPulo(true)], ['Apertar Espaço']],
    [
      'jump-sound',
      [somNoPulo(true), espaco, ...s2, pular, ...s2],
      ['Quando a tecla Espaço é apertada'],
    ],
  ]
  test.each(casos)('%s depois de %j: destaque em %j', (cena, acoes, esperado) => {
    const s = jogar(cena, acoes)
    const fala = discoveryGuidance(ATIVIDADES[cena], s)?.id
    expect([fala, destaques(tela(cena, s))]).toEqual([fala, esperado])
  })

  test('as funções de gesto não destacam nada depois de concluir', () => {
    expect(proximoGestoDaTela('stage-size-complete', { width: 480 })).toBeNull()
    expect(proximoGestoDoLeitor('screen-reader-complete')).toBeNull()
    expect(proximoGestoDaGravidade('gravity-complete', { gravity: true })).toBeNull()
    expect(proximoGestoDoImpulso('impulse-complete', { force: 14 })).toBeNull()
    expect(proximoGestoDoSom('jump-sound-complete')).toBeNull()
  })
})
