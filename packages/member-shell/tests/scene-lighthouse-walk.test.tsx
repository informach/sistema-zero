import { describe, expect, test } from 'bun:test'
import { publicInteractiveBlock } from '@sistemazero/core/learning'
import {
  type ExperimentationActivity,
  LIGHTHOUSE_WALK,
  openScene,
  type SceneAction,
  type SceneState,
  stepScene,
} from '@sistemazero/core/learning/scene'
import { FAROL_LAYOUT } from '@sistemazero/studio/arte'
import { isValidElement, type ReactElement, type ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { SceneButton } from '../src/components/exploration-stage'
import { SceneActivityView } from '../src/components/scene-activity'
import { Chave, Escolha } from '../src/components/scene-bench'
import { LessonSceneControls } from '../src/components/scene-lesson-controls'
import {
  LighthouseWalkControls,
  LighthouseWalkStage,
} from '../src/components/scene-lighthouse-walk'

/**
 * A cena do Dia 1 do Desafio do Farol (05/10/2026): o andar quadro a quadro. Os rótulos dos controles
 * são citados pelos roteiros letra por letra, e cada caso (`setup.goals`) mostra só os controles dele.
 */
const start = { scene: 'lighthouse-walk' } as const
const play = (actions: SceneAction[], from: SceneState = openScene(start)) =>
  actions.reduce((s, a) => stepScene(start, s, a), from)
const QUADRO: SceneAction = { type: 'advance', seconds: 1 / 30 }
const quadros = (n: number) => Array.from({ length: n }, () => QUADRO)
const SETA: SceneAction = { type: 'hold-arrow', held: true }

const CASOS = {
  andar: ['still-without-arrow', 'moves-each-frame'],
  velocidade: ['step-speed-3', 'step-speed-1'],
  limite: ['left-the-screen', 'stayed-inside'],
} as const
const metas = (ids: readonly string[], feitas: readonly string[] = []) =>
  ids.map((id) => ({ id, complete: feitas.includes(id) }))

const bancada = (
  state: SceneState,
  goals: readonly string[],
  extra: { tocando?: boolean; feitas?: readonly string[]; cenario?: 'nave' | 'farol' } = {},
) =>
  renderToStaticMarkup(
    <LighthouseWalkControls
      state={state}
      dispatch={() => {}}
      goals={metas(goals, extra.feitas)}
      cenario={extra.cenario}
      tocando={extra.tocando}
      onRunning={() => {}}
    />,
  )
/** O tom do botão de um rótulo (`data-tom` vem antes do texto no mesmo elemento). */
const tomDe = (html: string, rotulo: string) =>
  html.match(new RegExp(`data-tom="(\\w+)"[^>]*>${rotulo}<`))?.[1]

/** Os elementos de um tipo na árvore que o componente devolve (sem montar: só as props). */
function achar(no: ReactNode, tipo: unknown): ReactElement<Record<string, unknown>>[] {
  if (Array.isArray(no)) return no.flatMap((n) => achar(n, tipo))
  if (!isValidElement(no)) return []
  const el = no as ReactElement<Record<string, unknown>>
  const dentro = achar(el.props.children as ReactNode, tipo)
  return el.type === tipo ? [el, ...dentro] : dentro
}
const texto = (no: ReactNode): string => {
  if (typeof no === 'string' || typeof no === 'number') return String(no)
  if (Array.isArray(no)) return no.map(texto).join('')
  if (isValidElement(no)) return texto((no.props as { children?: ReactNode }).children)
  return ''
}

describe('lighthouse-walk: o palco', () => {
  test('a régua do core espelha o layout do Farol (tela de 480, personagem de 64)', () => {
    expect(LIGHTHOUSE_WALK.screen).toBe(FAROL_LAYOUT.palco.w)
    expect(LIGHTHOUSE_WALK.hero).toBe(FAROL_LAYOUT.personagem.w)
  })

  test('mostra o mapa, o personagem, a borda da tela e a faixa de fora', () => {
    const html = renderToStaticMarkup(<LighthouseWalkStage state={openScene(start)} />)
    expect(html).toContain('data-fundo="farol"')
    expect(html).toContain('data-personagem="dentro"')
    expect(html).toContain('data-borda-da-tela')
    expect(html).toContain('data-fora-da-tela')
    expect(html).toContain('>fora<')
    expect(html).toContain('>da tela<')
    // Fundo limpo: nada da chave, do farol nem do barco.
    expect(html).not.toContain('Encontre a chave')
    // ⚠️ A `<desc>` diz o DESENHO; quadro, x e seta moram na frase da situação e nos ladrilhos.
    expect(html).toContain('O personagem está inteiro dentro da tela, antes da borda da direita.')
    expect(html).not.toContain('No quadro')
    expect(html).not.toContain('x 208')
  })

  test('uma marca por quadro, e o espaçamento é a velocidade', () => {
    const marcas = (s: SceneState) =>
      [
        ...renderToStaticMarkup(<LighthouseWalkStage state={s} />).matchAll(/data-marca="(\d+)"/g),
      ].map((m) => Number(m[1]))
    const tres = marcas(play([SETA, ...quadros(4)]))
    expect(tres).toHaveLength(5)
    expect(tres.slice(1).map((x, i) => x - (tres[i] ?? 0))).toEqual([3, 3, 3, 3])
    const um = marcas(play([{ type: 'walk-speed', speed: 1 }, SETA, ...quadros(4)]))
    expect(um.slice(1).map((x, i) => x - (um[i] ?? 0))).toEqual([1, 1, 1, 1])
    // Só as últimas 10: com 30 no rastro, as marcas de 1 em 1 virariam um borrão no celular.
    expect(marcas(play([SETA, ...quadros(20)]))).toHaveLength(10)
  })

  test('o passo do último quadro sai escrito entre as duas últimas marcas (+3, +1, +0)', () => {
    const passo = (s: SceneState) =>
      renderToStaticMarkup(<LighthouseWalkStage state={s} />).match(
        /data-passo="(\d+)"[^>]*>([^<]*)</,
      )
    expect(passo(openScene(start))).toBeNull()
    expect(passo(play([SETA, QUADRO]))?.slice(1)).toEqual(['3', '+3'])
    expect(passo(play([{ type: 'walk-speed', speed: 1 }, SETA, QUADRO]))?.slice(1)).toEqual([
      '1',
      '+1',
    ])
    expect(passo(play([QUADRO]))?.slice(1)).toEqual(['0', '+0'])
  })

  test('"parte" é medida pelo CORPO do personagem, e não pela caixa de 64', () => {
    const onde = (n: number) =>
      renderToStaticMarkup(<LighthouseWalkStage state={play([SETA, ...quadros(n)])} />).match(
        /data-personagem="(\w+)"/,
      )?.[1]
    // x 433: a caixa já passou da borda (433 + 64 > 480), mas o corpo (16 a 46) ainda não.
    expect(play([SETA, ...quadros(75)]).walk.x).toBe(433)
    expect(onde(75)).toBe('dentro')
    // x 436: o corpo cruza a borda.
    expect(onde(76)).toBe('parte')
    // x 466: o corpo começa em 482, inteiro fora (a caixa ainda tem 14 dentro).
    expect(onde(86)).toBe('fora')
  })

  test('saindo pela borda: parte, depois inteiro fora; o contorno tracejado marca a parte de fora', () => {
    const parte = renderToStaticMarkup(<LighthouseWalkStage state={play([SETA, ...quadros(80)])} />)
    expect(parte).toContain('data-personagem="parte"')
    expect(parte).toContain('Parte do personagem já passou da borda da direita')
    // A parte de fora: 60% e o contorno do corpo tracejado na tinta da faixa (os 3:1 de gráfico).
    expect(parte).toMatch(/data-fantasma=""[^>]*><g opacity="0.6">/)
    expect(parte).toMatch(/data-contorno-fantasma=""[^>]*stroke-dasharray/)
    // A parte de fora segue desenhada, esmaecida, numa cópia SEM os dados do palco (que saem uma vez).
    expect(parte).toContain('data-fantasma')
    expect(parte.match(/data-personagem=/g) ?? []).toHaveLength(1)
    expect(parte.match(/data-rastro=/g) ?? []).toHaveLength(1)
    const fora = renderToStaticMarkup(<LighthouseWalkStage state={play([SETA, ...quadros(100)])} />)
    expect(fora).toContain('data-personagem="fora"')
    expect(fora).not.toContain('Manter dentro da tela')
    const preso = play([{ type: 'keep-on-screen', enabled: true }, SETA, ...quadros(100)])
    const comLimite = renderToStaticMarkup(<LighthouseWalkStage state={preso} />)
    expect(comLimite).toContain('data-personagem="dentro"')
    expect(comLimite).not.toContain('data-contorno-fantasma')
  })
})

describe('lighthouse-walk: a bancada, por caso, com os rótulos dos roteiros', () => {
  const aberta = openScene(start)

  test('o andar: a seta e o tempo, sem velocidade nem limite', () => {
    const html = bancada(aberta, CASOS.andar)
    expect(html).toContain('Segurar a seta para a direita: desligado')
    expect(html).toContain('>Avançar 1 quadro<')
    expect(html).toContain('>Rodar<')
    expect(html).toContain('>Recomeçar<')
    expect(html).not.toContain('Velocidade 1')
    expect(html).not.toContain('Velocidade 3')
    expect(html).not.toContain('Manter dentro da tela')
    // A regra nos blocos do Dia 1, com os rótulos de VERDADE do Estúdio, sem o terceiro bloco.
    expect(html).toContain('A cada quadro do jogo')
    expect(html).toContain('Mover sprite personagem em 4 direções com setas, velocidade 3')
    expect(html).not.toContain('dentro da tela</')
    expect(bancada(play([SETA]), CASOS.andar)).toContain('Segurar a seta para a direita: ligado')
    // Os rótulos longos quebram linha (`.sz-scene-quebra`, scene.css): no celular estouravam.
    expect(html).toMatch(/^<div class="sz-scene-quebra/)
  })

  test('o azul cheio segue a META que falta: Avançar no andar e na velocidade, Rodar no limite', () => {
    const aberta2 = openScene(start)
    expect(tomDe(bancada(aberta2, CASOS.andar), 'Avançar 1 quadro')).toBe('gesto')
    expect(tomDe(bancada(aberta2, CASOS.andar), 'Rodar')).toBe('ferramenta')
    expect(tomDe(bancada(aberta2, CASOS.velocidade), 'Avançar 1 quadro')).toBe('gesto')
    // Feitas as metas de passo, o Rodar (ver de novo andando) volta a ser o destaque.
    const feitas = bancada(aberta2, CASOS.andar, { feitas: CASOS.andar })
    expect(tomDe(feitas, 'Rodar')).toBe('gesto')
    expect(tomDe(feitas, 'Avançar 1 quadro')).toBe('ferramenta')
    // O limite pede o Rodar desde o começo.
    expect(tomDe(bancada(aberta2, CASOS.limite), 'Rodar')).toBe('gesto')
    expect(tomDe(bancada(aberta2, CASOS.limite), 'Avançar 1 quadro')).toBe('ferramenta')
    // Rodando, o destaque é o Parar.
    expect(tomDe(bancada(aberta2, CASOS.andar, { tocando: true }), 'Parar')).toBe('gesto')
  })

  test('a velocidade: os dois botões, o escolhido em tom ligado, e a regra acompanha', () => {
    const html = bancada(aberta, CASOS.velocidade)
    expect(html).toContain('>Velocidade 1<')
    expect(html).toContain('>Velocidade 3<')
    expect(html).toMatch(/data-tom="ligado"[^>]*>Velocidade 3</)
    expect(html).toMatch(/aria-current="true"[^>]*>Velocidade 3</)
    expect(html).not.toContain('Manter dentro da tela')
    // A escolha é a `Escolha` da bancada (um `fieldset` com a legenda), não botões soltos.
    expect(html).toContain('<legend class="px-1">Velocidade</legend>')
    const um = bancada(play([{ type: 'walk-speed', speed: 1 }]), CASOS.velocidade)
    expect(um).toMatch(/data-tom="ligado"[^>]*>Velocidade 1</)
    expect(um).toContain('Mover sprite personagem em 4 direções com setas, velocidade 1')
  })

  test('o limite: a chave e o terceiro bloco, fora da regra enquanto desligado', () => {
    const html = bancada(aberta, CASOS.limite)
    expect(html).toContain('Manter dentro da tela: desligado')
    expect(html).toContain('Manter o sprite personagem dentro da tela')
    expect(html).toContain('data-estado="fora"')
    expect(html).toContain('(desligado)')
    expect(html).not.toContain('Velocidade 1')
    const ligado = bancada(play([{ type: 'keep-on-screen', enabled: true }]), CASOS.limite)
    expect(ligado).toContain('Manter dentro da tela: ligado')
    expect(ligado).not.toContain('data-estado="fora"')
  })

  test('Rodar vira Parar enquanto roda; com o personagem fora, Rodar fecha e o Recomeçar é o passo', () => {
    expect(bancada(aberta, CASOS.andar, { tocando: true })).toContain('>Parar<')
    const fora = play([SETA, ...quadros(100)])
    const html = bancada(fora, CASOS.limite)
    expect(html).toMatch(/aria-disabled="true"[^>]*>Rodar</)
    expect(html).toMatch(/data-tom="gesto"[^>]*>Recomeçar</)
    // ⚠️ Fechado não é escondido: a nota diz o caminho, ligada ao Rodar pelo aria-describedby.
    const nota = html.match(/<p id="([^"]+)"[^>]*>([^<]*)<\/p>/)
    expect(nota?.[2]).toBe(
      'O personagem saiu da tela. Clique em Recomeçar ou ligue Manter dentro da tela.',
    )
    expect(html).toMatch(new RegExp(`aria-describedby="${nota?.[1]}"[^>]*>Rodar<`))
    // O Avançar segue aberto: um quadro a mais com o personagem fora é só mais um x.
    expect(html).not.toMatch(/aria-disabled="true"[^>]*>Avançar 1 quadro</)
    // Sem a chave do limite no caso, a nota não oferece o que não existe.
    expect(bancada(fora, CASOS.andar)).toContain('O personagem saiu da tela. Clique em Recomeçar.<')
    expect(bancada(aberta, CASOS.limite)).not.toContain('saiu da tela')
    // Com o limite ligado depois, o próximo quadro o traz de volta: Rodar abre de novo.
    const comLimite = play([{ type: 'keep-on-screen', enabled: true }], fora)
    expect(bancada(comLimite, CASOS.limite)).toMatch(/data-tom="gesto"[^>]*>Rodar</)
  })

  test('cada controle manda o gesto certo ao motor e ao relógio do player', () => {
    const acoes: SceneAction[] = []
    const relogio: boolean[] = []
    // A árvore que o componente devolve, chamada DENTRO de um render (ele usa `useId`).
    const arvore = (tocando: boolean) => {
      let capturada: ReactNode = null
      function Captura() {
        capturada = LighthouseWalkControls({
          state: openScene(start),
          dispatch: (a) => acoes.push(a),
          goals: metas([...CASOS.velocidade, ...CASOS.limite]),
          tocando,
          onRunning: (v) => relogio.push(v),
        })
        return null
      }
      renderToStaticMarkup(<Captura />)
      return capturada
    }
    const botao = (tocando: boolean, rotulo: string) => {
      const achado = achar(arvore(tocando), SceneButton).find((b) => texto(b) === rotulo)
      if (!achado) throw new Error(`sem o botão ${rotulo}`)
      return achado.props.onClick as () => void
    }
    const chave = (rotulo: string) => {
      const achada = achar(arvore(false), Chave).find((c) => c.props.label === rotulo)
      if (!achada) throw new Error(`sem a chave ${rotulo}`)
      return achada.props.onToggle as (v: boolean) => void
    }
    botao(false, 'Rodar')()
    botao(true, 'Parar')()
    expect(relogio).toEqual([true, false])
    botao(false, 'Avançar 1 quadro')()
    expect(acoes.at(-1)).toEqual({ type: 'advance', seconds: 1 / 30 })
    const escolha = achar(arvore(false), Escolha)[0]
    if (!escolha) throw new Error('sem a escolha da velocidade')
    ;(escolha.props.onChange as (v: number) => void)(1)
    expect(acoes.at(-1)).toEqual({ type: 'walk-speed', speed: 1 })
    botao(false, 'Recomeçar')()
    expect(acoes.at(-1)).toEqual({ type: 'restart-walk' })
    chave('Segurar a seta para a direita')(true)
    expect(acoes.at(-1)).toEqual({ type: 'hold-arrow', held: true })
    chave('Manter dentro da tela')(true)
    expect(acoes.at(-1)).toEqual({ type: 'keep-on-screen', enabled: true })
    // Avançar e Recomeçar param o Rodar antes do gesto.
    expect(relogio).toEqual([true, false, false, false])
  })

  test('a bancada da aula (`LessonSceneControls`) monta esta, com as metas do caso', () => {
    const html = renderToStaticMarkup(
      <LessonSceneControls
        scene="lighthouse-walk"
        state={openScene(start)}
        dispatch={() => {}}
        goals={metas(CASOS.limite)}
        onRunning={() => {}}
      />,
    )
    expect(html).toContain('Manter dentro da tela: desligado')
    expect(html).toContain('>Rodar<')
  })

  test('na Nave (`cenario: "nave"`) a regra cita os blocos do projeto da Nave', () => {
    const html = renderToStaticMarkup(
      <LessonSceneControls
        scene="lighthouse-walk"
        state={play([SETA, ...quadros(100)])}
        dispatch={() => {}}
        cenario="nave"
        goals={metas(CASOS.limite)}
        onRunning={() => {}}
      />,
    )
    expect(html).toContain('Mover o sprite nave com as setas &lt;- -&gt; (velocidade 3)')
    expect(html).toContain('Manter o sprite nave dentro da tela')
    expect(html).toContain(
      'A nave saiu da tela. Clique em Recomeçar ou ligue Manter dentro da tela.',
    )
    expect(html).not.toContain('personagem')
  })
})

describe('lighthouse-walk: a experiência inteira, nos três usos do Dia 1', () => {
  const render = (goals: readonly string[]) => {
    const activity: ExperimentationActivity = {
      type: 'experimentation',
      scene: 'lighthouse-walk',
      cenario: 'farol',
      setup: { goals: [...goals] },
    }
    const content = publicInteractiveBlock({
      kind: 'interactive',
      required: true,
      semPerguntaFinal: true,
      title: 'Como o personagem anda',
      instructions: 'Avance os quadros e olhe o x.',
      hints: [],
      activity,
    })
    return renderToStaticMarkup(
      <SceneActivityView
        block={{ id: `experiencia-${goals[0]}`, kind: 'interactive', sortOrder: 0, content }}
        content={content}
        activity={activity}
      />,
    )
  }

  test('o tempo é o da bancada: sem o ▶ "Tempo", sem "Mais devagar" e um Recomeçar só', () => {
    for (const goals of Object.values(CASOS)) {
      const html = render(goals)
      expect(html).toContain('>Avançar 1 quadro<')
      expect(html).toContain('>Rodar<')
      expect(html).not.toContain('Soltar o tempo')
      expect(html).not.toContain('Mais devagar')
      expect(html.match(/>Recomeçar</g) ?? []).toHaveLength(1)
      expect(html).not.toContain('>Recomeçar</span>')
      // Os ladrilhos: quadro, x e velocidade.
      expect(html).toMatch(/>quadro<\/dt>/)
      expect(html).toMatch(/>velocidade<\/dt>/)
    }
  })

  test('cada uso mostra só os controles dele', () => {
    const andar = render(CASOS.andar)
    expect(andar).not.toContain('Velocidade 1')
    expect(andar).not.toContain('Manter dentro da tela')
    const velocidade = render(CASOS.velocidade)
    expect(velocidade).toContain('>Velocidade 1<')
    expect(velocidade).not.toContain('Manter dentro da tela')
    const limite = render(CASOS.limite)
    expect(limite).toContain('Manter dentro da tela: desligado')
    expect(limite).not.toContain('>Velocidade 1<')
  })
})
