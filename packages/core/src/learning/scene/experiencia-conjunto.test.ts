import { describe, expect, test } from 'bun:test'
import { readdirSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  type InteractiveBlock,
  isInteractiveBlock,
  learningHints,
  publicInteractiveBlock,
  scenePredictionTemplate,
} from '../index'
import { SCENE_IDS, type SceneId } from './actions'
import { castText } from './cast'
import { sceneModel } from './catalog'
import { openScene, stepScene } from './engine'
import {
  evaluateExperimentation,
  sceneGoals,
  sceneHint,
  sceneHintDone,
  sceneHintStep,
} from './evaluate'
import { type SceneActivity, sceneModelFor, sceneStart } from './index'
import { LAYERS_CAMADAS } from './pilha'
import { metasDaPista, PISTA_DA_META, pistaCumprida } from './pistas'
import { SCENE_QUESTIONS } from './questions'
import { sceneReadout, sceneSituation } from './readout'
import type { SceneState } from './state'

/**
 * O full review de EXPERIÊNCIA do conjunto das 45 cenas (16/09/2026), no MOTOR e no conteúdo.
 *
 * Relatório: `community-kids/tmp/storyboard/implementacao/full-review-experiencia.md`; os consertos em
 * `consertos-full-exp.md` (mesma pasta). Cada `describe` reprova sem o conserto dele.
 */

/** O estado de abertura com estas descobertas já feitas (só a evidência: a escada lê só ela). */
function comDescobertas(scene: SceneId, metas: readonly string[]): SceneState {
  const s = openScene({ scene })
  return { ...s, evidence: { ...s.evidence, discoveries: [...metas] } }
}

describe('M1 · a pista pula o degrau cuja meta já caiu', () => {
  test('a tabela cobre as 45 cenas com três degraus, e toda meta citada existe no modelo', () => {
    for (const scene of SCENE_IDS) {
      const metas = PISTA_DA_META[scene]
      expect(metas.length, scene).toBe(3)
      const doModelo = sceneModel(scene).goals.map((g) => g.id)
      for (const degrau of metas)
        for (const meta of metasDaPista(degrau))
          expect(doModelo, `${scene}: ${meta}`).toContain(meta)
    }
  })

  test('⚠️⚠️ nas 45 cenas, depois de cada meta da missão de fábrica, NENHUM nível mostra um degrau já cumprido', () => {
    for (const scene of SCENE_IDS) {
      const missao = sceneModel(scene)
        .goals.filter((g) => !g.soNoCaso)
        .map((g) => g.id)
      for (let k = 0; k < missao.length; k++) {
        const feitas = missao.slice(0, k)
        const estado = comDescobertas(scene, feitas)
        for (const nivel of [1, 2, 3]) {
          const passo = sceneHintStep(scene, estado, nivel)
          expect(
            passo.texto.length,
            `${scene} · ${feitas.join('+')} · nível ${nivel}`,
          ).toBeGreaterThan(0)
          // O degrau mostrado ainda serve a alguma coisa que falta.
          expect(
            pistaCumprida(passo.metas, feitas),
            `${scene} · feitas ${feitas.join('+') || 'nada'} · nível ${nivel}: "${passo.texto}"`,
          ).toBe(false)
        }
      }
    }
  })

  test('⚠️ stage-size com a borda à vista: a pista 1 manda mexer na largura, e não apertar a borda', () => {
    const s = comDescobertas('stage-size', ['border-on'])
    const texto = sceneHint('stage-size', s, 1)
    expect(texto).toContain('Com a borda à vista, diminua a largura e olhe a borda.')
    expect(texto).not.toContain('Aperte o botão da borda.')
    // Com 2 de 3, o degrau do alvo.
    expect(
      sceneHint('stage-size', comDescobertas('stage-size', ['border-on', 'resized']), 1),
    ).toContain('Deixe 480 de largura e 270 de altura')
  })

  test('⚠️ coordinates com x e y feitos: "Agora leve o Dino para x 0 e y 0.", com o elenco', () => {
    const s = comDescobertas('coordinates', ['right', 'down'])
    expect(sceneHint('coordinates', s, 1)).toContain('Agora leve o Dino para x 0 e y 0.')
    expect(sceneHint('coordinates', s, 1)).not.toContain('Mexa só no x')
    const nave = { hero: { name: 'nave', gender: 'f' as const } }
    expect(sceneHint('coordinates', s, 2, nave)).toBe('Agora leve a nave para x 0 e y 0.')
  })

  test('o degrau vira "feito" quando a meta dele cai, e só então', () => {
    const antes = comDescobertas('stage-size', [])
    const passo = sceneHintStep('stage-size', antes, 1)
    expect(sceneHintDone(passo, antes)).toBe(false)
    expect(sceneHintDone(passo, comDescobertas('stage-size', ['border-on']))).toBe(true)
    // `algumaDe`: tocar em "Criar Dino" na `world` é provado por qualquer uma das duas metas.
    const criar = sceneHintStep('world', comDescobertas('world', []), 2)
    expect(sceneHintDone(criar, comDescobertas('world', ['hidden']))).toBe(true)
  })

  test('sem degrau que sirva, a escada cai no pedido da meta que falta', () => {
    // As três pistas da `velocity` servem a `moves` e `left`: com as duas feitas, falta `stopped`.
    const s = comDescobertas('velocity', ['moves', 'left'])
    const passo = sceneHintStep('velocity', s, 2)
    expect(passo.texto).toBe(
      sceneModel('velocity').goals.find((g) => g.id === 'stopped')?.pedido ?? '',
    )
    expect(metasDaPista(passo.metas)).toEqual(['stopped'])
  })
})

describe('M4 · a arrumação final da layers é uma META, e não uma condição escondida', () => {
  const start = { scene: 'layers' as const }
  const trocar = (s: SceneState, front: boolean) => stepScene(start, s, { type: 'layer', front })

  test('⚠️⚠️ duas trocas dão 2 de 3 (e não "2 de 2" sem concluir); a terceira conclui', () => {
    let s = openScene(start)
    s = trocar(trocar(s, true), false)
    const metas = sceneGoals('layers', s)
    expect(metas.map((g) => g.id)).toEqual(['front', 'covered', 'back-in-front'])
    expect(metas.filter((g) => g.complete).length).toBe(2)
    expect(evaluateExperimentation('layers', s).passed).toBe(false)
    expect(evaluateExperimentation('layers', s).feedback).toBe(
      'Leve o Dino de novo para o fim da ordem de desenhar.',
    )
    s = trocar(s, true)
    expect(s.evidence.discoveries).toContain('back-in-front')
    expect(evaluateExperimentation('layers', s).passed).toBe(true)
  })

  test('o Dino na frente de SAÍDA não fecha a terceira: ela pede ter escondido antes', () => {
    const s = trocar(openScene(start), true)
    expect(s.evidence.discoveries).toEqual(['front'])
  })

  test('uma missão só de `front` conclui com a descoberta, sem exigir o arranjo', () => {
    const s = trocar(trocar(openScene(start), true), false)
    expect(evaluateExperimentation('layers', s, true, undefined, ['front']).passed).toBe(true)
  })

  test('a frase da situação só diz o que se vê (o gesto mora na pista e no "Conferir")', () => {
    const s = trocar(trocar(openScene(start), true), false)
    expect(sceneSituation('layers', s)).toBe('Só um pedacinho do Dino aparece no desenho.')
    expect(sceneHint('layers', s, 2)).toBe('Leve o Dino de novo para o fim da ordem de desenhar.')
  })
})

describe('A1 · pilha: camadas, a layers com o painel Camadas do Pinta', () => {
  const pedraEChama = {
    hero: { name: 'pedra', gender: 'f' as const },
    scenery: { name: 'chama', gender: 'f' as const },
  }
  const camadas: SceneActivity = {
    type: 'experimentation',
    scene: 'layers',
    pilha: 'camadas',
    cast: pedraEChama,
  }

  test('⚠️⚠️ a pilha atravessa a projeção pública (senão a bancada voltaria à lista do Estúdio)', () => {
    const bloco: InteractiveBlock = {
      kind: 'interactive',
      title: 'Camadas',
      instructions: 'Mude as camadas.',
      hints: [],
      required: false,
      activity: camadas,
    }
    expect(isInteractiveBlock(bloco)).toBe(true)
    const publico = publicInteractiveBlock(bloco)
    expect((publico.activity as SceneActivity).pilha).toBe('camadas')
  })

  test('a faixa diz quem está na frente e quem está atrás, vestida pelo elenco', () => {
    const s = openScene(sceneStart(camadas))
    expect(
      sceneReadout('layers', s, pedraEChama, 'camadas').map((r) => `${r.label}: ${r.value}`),
    ).toEqual(['na frente: a chama', 'atrás: a pedra'])
    // Sem a pilha, a ordem de desenhar do Estúdio, como sempre.
    expect(sceneReadout('layers', s, pedraEChama).map((r) => r.label)).toEqual([
      '1º a desenhar',
      '2º a desenhar',
    ])
  })

  test('⚠️⚠️ a escada e os pedidos falam de camada, e nunca do "fim da lista" (que no Pinta é o fundo)', () => {
    const hints = learningHints({ activity: camadas, hints: [] })
    expect(hints).toEqual(LAYERS_CAMADAS.hints.map((h) => castText(h, pedraEChama)))
    expect(sceneModelFor(camadas).hints[2]).toBe('Mande a chama uma camada para trás.')
    let s = openScene(sceneStart(camadas))
    const todos: string[] = [...hints]
    for (const front of [true, false, true]) {
      for (const g of sceneGoals('layers', s, pedraEChama, undefined, 'camadas'))
        todos.push(g.pedido ?? '')
      for (const nivel of [1, 2, 3])
        todos.push(sceneHint('layers', s, nivel, pedraEChama, 'camadas'))
      todos.push(
        evaluateExperimentation('layers', s, true, pedraEChama, undefined, 'camadas').feedback,
      )
      s = stepScene(sceneStart(camadas), s, { type: 'layer', front })
    }
    for (const texto of todos) {
      expect(texto, texto).not.toMatch(/fim da (lista|ordem)|ordem de desenhar/)
    }
    expect(todos.join(' ')).toContain('Mande a chama uma camada para trás.')
    expect(todos.join(' ')).toContain('mande a chama uma camada para a frente.')
  })

  test('os pedidos de camadas, feitos ao pé da letra no motor, derrubam as três metas em ordem', () => {
    // "Mande a floresta uma camada para trás" = o Dino vai para a frente (layer front: true).
    let s = openScene({ scene: 'layers' })
    s = stepScene({ scene: 'layers' }, s, { type: 'layer', front: true })
    expect(s.evidence.discoveries).toEqual(['front'])
    // "Com o Dino em cima da lista Camadas, mande a floresta uma camada para a frente."
    s = stepScene({ scene: 'layers' }, s, { type: 'layer', front: false })
    expect(s.evidence.discoveries).toEqual(['front', 'covered'])
    // "Mande a floresta uma camada para trás de novo."
    s = stepScene({ scene: 'layers' }, s, { type: 'layer', front: true })
    expect(evaluateExperimentation('layers', s, true, undefined, undefined, 'camadas').passed).toBe(
      true,
    )
  })
})

describe('M5 · a previsão que afirma um estado que a tela ainda não mostra começa com "Imagine"', () => {
  /** O texto que a tela mostra na abertura: a faixa e a frase da situação. */
  const abertura = (activity: SceneActivity) => {
    const s = openScene(sceneStart(activity))
    return [
      ...sceneReadout(activity.scene, s, activity.cast).map((r) => `${r.label} ${r.value}`),
      sceneSituation(activity.scene, s, activity.cast),
    ].join(' · ')
  }
  /** As frases de PREMISSA (tudo antes da pergunta), com um número que a abertura não mostra. */
  const premissaSemTela = (prompt: string, tela: string) => {
    const frases = prompt.split(/(?<=[.!])\s+/).slice(0, -1)
    return frases.filter((f) => {
      // Condição, o futuro da demonstração ("Na parte 2…") e o próprio "Imagine" não afirmam a tela.
      if (/^(Se|Com|Depois|Quando|Imagine|Na parte)\b/.test(f)) return false
      const numeros = (f.match(/[−-]?\d+(?:,\d+)?(?!D)/g) ?? []).map((n) => n.replace('-', '−'))
      return numeros.some((n) => !new RegExp(`(^|[^\\d])${n}([^\\d]|$)`).test(tela))
    })
  }

  test('⚠️⚠️ nas 45 previsões do modelo', () => {
    for (const scene of SCENE_IDS) {
      const prompt = SCENE_QUESTIONS[scene].prediction.prompt
      const tela = abertura({ type: 'experimentation', scene })
      const fora = premissaSemTela(prompt, tela)
      expect(fora.length === 0 || /^Imagine\b/.test(prompt), `${scene}: ${prompt}`).toBe(true)
    }
  })

  test('as cinco da tabela do review (e a das vidas do modelo) começam com "Imagine"', () => {
    for (const scene of ['world', 'circle-collision', 'cooldown', 'variable', 'lives'] as const)
      expect(SCENE_QUESTIONS[scene].prediction.prompt, scene).toMatch(/^Imagine\b/)
    // O elenco veste a da `world`.
    const nave = { hero: { name: 'nave', gender: 'f' as const } }
    const bloco: InteractiveBlock = {
      kind: 'interactive',
      title: 'Criar',
      instructions: 'Crie.',
      hints: [],
      required: false,
      activity: { type: 'experimentation', scene: 'world', cast: nave },
    }
    expect(scenePredictionTemplate(bloco)?.prompt).toBe(
      'Imagine: a nave já está nos bastidores, mas ainda não apareceu na tela do jogo. Onde está a nave?',
    )
  })

  test('⚠️ nas previsões ESCRITAS nos manifestos atuais', () => {
    const raiz = resolve(import.meta.dir, '../../../../../docs/aulas-interativas/aulas')
    const manifestos = readdirSync(raiz)
      .filter((nome) => nome.endsWith('.manifesto.json'))
      .map((nome) => resolve(raiz, nome))
    expect(manifestos).toHaveLength(28)
    let vistas = 0
    const premissasAntecipadas: string[] = []
    const visitar = (o: unknown) => {
      if (Array.isArray(o)) return o.forEach(visitar)
      if (!o || typeof o !== 'object') return
      const b = o as Record<string, unknown>
      const a = b.activity as SceneActivity | undefined
      const p = b.prediction as { prompt: string } | undefined
      if (b.kind === 'interactive' && a?.scene && p) {
        vistas += 1
        const fora = premissaSemTela(p.prompt, abertura(a))
        if (fora.length > 0 && !/^Imagine\b/.test(p.prompt))
          premissasAntecipadas.push(`${a.scene}: ${p.prompt}`)
      }
      Object.values(b).forEach(visitar)
    }
    for (const arquivo of manifestos) visitar(JSON.parse(readFileSync(arquivo, 'utf8')))
    expect(vistas).toBeGreaterThan(7)
    expect(premissasAntecipadas).toEqual([])
  })
})

describe('M6 · a faixa não entrega o veredito da conta antes da primeira meta', () => {
  test('circle-collision: sem "a conta diz" até `touch`', () => {
    const s = openScene({ scene: 'circle-collision' })
    expect(sceneReadout('circle-collision', s).map((r) => r.label)).toEqual([
      'distância entre os centros',
      'soma dos raios',
    ])
    const tocou = { ...s, evidence: { ...s.evidence, discoveries: ['touch'] } }
    expect(sceneReadout('circle-collision', tocou).map((r) => r.label)).toContain('a conta diz')
  })
})

describe('M7 e textos · o que a tela diz', () => {
  test('⚠️ onion-skin: sem o fantasma, a legenda não afirma que o fogo mudou de tamanho', () => {
    const start = { scene: 'onion-skin' as const }
    let s = openScene(start)
    s = stepScene(start, s, { type: 'frame', index: 2 })
    s = stepScene(start, s, { type: 'shift', offset: 12 })
    expect(s.caption).toBe('Sem o fantasma, só o fogo 2 está na tela.')
    expect(s.caption).not.toContain('mudou')
  })

  test('B9 · cleanup: "remover quem sai: desligado", a palavra da chave', () => {
    const s = openScene({ scene: 'cleanup' })
    expect(sceneReadout('cleanup', s).find((r) => r.label === 'remover quem sai')?.value).toBe(
      'desligado',
    )
  })

  test('B8 e B11 · as opções e as frases do review', () => {
    expect(SCENE_QUESTIONS['onion-skin'].prediction.choices.map((c) => c.label)).toEqual([
      'Não dá para saber',
      'Dá, é só olhar o fogo 2',
    ])
    expect(SCENE_QUESTIONS['stage-size'].explain.explanation).toContain(
      'A borda só mostra esse limite. Ela não cria o limite.',
    )
    expect(SCENE_QUESTIONS['screen-reader'].explain.prompt).toBe(
      'Qual frase ajuda mais quem não está vendo a tela?',
    )
    expect(SCENE_QUESTIONS.controls.explain.explanation).not.toMatch(/escuta|promessa/)
  })
})
