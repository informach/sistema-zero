import { describe, expect, test } from 'bun:test'
import { SCENE_IDS, type SceneId } from './actions'
import type { SceneCast } from './cast'
import { SCENE_MODELS } from './catalog'
import { openScene, stepScene } from './engine'
import { sceneReadout, sceneSituation } from './readout'
import { initialScene, type SceneState } from './state'

const nasce = (scene: SceneId): SceneState => initialScene({ scene })

describe('a faixa de estado', () => {
  test('toda cena tem leituras, e nenhuma passa de três', () => {
    // O limite é o motivo de a faixa caber numa linha. Uma cena nova que chegue com cinco
    // medidas quebra a leitura de relance e precisa escolher o que importa.
    for (const scene of SCENE_IDS) {
      const leituras = sceneReadout(scene, nasce(scene))
      expect(leituras.length).toBeGreaterThan(0)
      expect(leituras.length).toBeLessThanOrEqual(3)
      for (const l of leituras) {
        expect(l.label.length).toBeGreaterThan(0)
        expect(l.value.length).toBeGreaterThan(0)
      }
    }
  })

  test('⚠️ o rótulo é o nome da criança, nunca o do campo', () => {
    // Sem isto a faixa vira depuração: `contact.width` não significa nada para quem tem 9 anos.
    // ⚠️ A primeira versão deste teste tinha uma asserção MORTA no meio
    // (`toBe(cond ? label : label)`, que é sempre verdadeira) — achado do full review.
    for (const scene of SCENE_IDS)
      for (const { label } of sceneReadout(scene, nasce(scene))) {
        expect(label).not.toMatch(/[.[\]_]/)
        expect(label).not.toMatch(/width|distance|force|screen|guarded|points|base/)
      }
  })

  test('⚠️⚠️ a faixa inteira concorda com o elenco, rótulo E valor', () => {
    // Achado do full review: `sceneReadout` vestia só o rótulo, então em `layers` o VALOR (que
    // é o nome do personagem) continuava dizendo "o Dino" numa turma de nave. E os rótulos com
    // particípio ("Dino criado") produziam "nave criado", que é a frase de máquina que o
    // elenco existe para evitar.
    const FEMININO: SceneCast = {
      hero: { name: 'nave', gender: 'f' },
      obstacle: { name: 'pedra', gender: 'f' },
      scenery: { name: 'asa-delta', gender: 'f' },
    }
    const NOMES = 'nave|naves|pedra|pedras|asa-delta'
    const ANTES = 'o|os|um|este|esse|mesmo|novo|antigo|criado|criados|guardado|guardados|desenhado'
    const DEPOIS = 'criado|criados|guardado|guardados|desenhado|antigo|antigos|novo|novos'
    const masculinoGrudado = new RegExp(
      `\\b(?:${ANTES})\\s+(?:${NOMES})\\b|\\b(?:${NOMES})\\s+(?:${DEPOIS})\\b`,
      'i',
    )
    // A guarda de que a regex morde (sem ela, laço que aprova tudo).
    expect('nave criado').toMatch(masculinoGrudado)
    expect('nave criada').not.toMatch(masculinoGrudado)

    let vistos = 0
    for (const scene of SCENE_IDS) {
      const estado = nasce(scene)
      for (const { label, value } of sceneReadout(scene, estado, FEMININO)) {
        for (const texto of [label, value]) {
          if (masculinoGrudado.test(texto)) throw new Error(`${scene}: "${texto}"`)
          expect(texto).not.toContain('Dino')
          expect(texto).not.toContain('cacto')
          vistos++
        }
      }
      const frase = sceneSituation(scene, estado, FEMININO)
      if (masculinoGrudado.test(frase)) throw new Error(`${scene}: "${frase}"`)
      expect(frase).not.toContain('Dino')
      expect(frase).not.toContain('cacto')
    }
    expect(vistos).toBeGreaterThan(50)
  })

  test('o valor acompanha o mundo: mexer no controle muda a leitura', () => {
    const inicio = nasce('hitbox')
    const perto = stepScene({ scene: 'hitbox' }, inicio, { type: 'move', distance: 25 })
    const antes = sceneReadout('hitbox', inicio)
    const depois = sceneReadout('hitbox', perto)
    expect(antes[0]?.value).not.toBe(depois[0]?.value)
    // E o encosto salta aos olhos: é o único tom de alerta da cena.
    expect(depois.some((l) => l.tone === 'alert')).toBe(true)
    expect(antes.some((l) => l.tone === 'alert')).toBe(false)
  })

  test('o par de comparação usa os tons do desenho, nunca tudo igual', () => {
    // A e B são as cores com que a cena mostra a medida A contra a medida B. Uma faixa toda
    // `plain` perde justamente a ligação com o palco.
    // ⚠️ O primeiro tom não é sempre `a`: em `screen-reader` a descrição VAZIA nasce em
    // `alert`, porque é a ausência dela que a cena quer que salte aos olhos.
    for (const scene of SCENE_IDS) {
      const tons = sceneReadout(scene, nasce(scene)).map((l) => l.tone)
      expect(tons.filter((t) => t !== 'plain').length).toBeGreaterThanOrEqual(2)
    }
  })
})

describe('a frase da situação', () => {
  test('⚠️ o acontecimento do motor VENCE a descrição do estado', () => {
    // O `caption` narra o que acabou de acontecer e é sempre mais específico. Se esta função
    // passasse na frente dele, a cena perderia a única frase que fala do gesto da criança.
    const state = { ...nasce('impulse'), caption: 'Pulou! O som acompanhou.' }
    expect(sceneSituation('impulse', state)).toBe('Pulou! O som acompanhou.')
  })

  test('sem acontecimento, toda cena descreve a própria situação', () => {
    for (const scene of SCENE_IDS) {
      const frase = sceneSituation(scene, nasce(scene))
      expect(frase.length).toBeGreaterThan(20)
      expect(frase).not.toBe('Siga a missão e observe o resultado.')
    }
  })

  test('⚠️ a frase é DIFERENTE em cada cena', () => {
    // O defeito que este lote conserta era uma frase só para as catorze. Repetir texto entre
    // duas cenas reintroduz o problema em escala menor.
    const frases = SCENE_IDS.map((scene) => sceneSituation(scene, nasce(scene)))
    expect(new Set(frases).size).toBe(SCENE_IDS.length)
  })

  test('a frase muda com o mundo, e conta o que mudou', () => {
    const inicio = nasce('world')
    const criado = stepScene({ scene: 'world' }, inicio, { type: 'create' })
    const semCaption = { ...criado, caption: '' }
    expect(sceneSituation('world', { ...inicio, caption: '' })).toContain('vazios')
    expect(sceneSituation('world', semCaption)).toContain('já existe')
  })

  test('⚠️⚠️ um é UM: a frase concorda em número com o que conta', () => {
    // A criança lia "1 vidas e 1 pontos", "1 saltos e 1 sons" e "1 cactos nos bastidores" —
    // sempre no PRIMEIRO acontecimento da cena, que é quando ela está lendo com mais atenção.
    // ⚠️ Sem o `caption`: com ele a frase é o ACONTECIMENTO ("O impulso iniciou o salto."), e o
    // que este teste cobra é a descrição da situação, que é o que fica na tela depois.
    const salto = {
      ...stepScene({ scene: 'jump-sound' }, nasce('jump-sound'), { type: 'jump', input: 'tap' }),
      caption: '',
    }
    expect(sceneSituation('jump-sound', salto)).toContain('1 salto e')
    expect(sceneSituation('jump-sound', salto)).not.toContain('1 saltos')

    // ⚠️ Com o relógio no meio: no ar, um segundo toque não é um segundo salto (é a descoberta
    // `quiet-air` da própria cena), então sem o pouso a contagem não sairia de um.
    let voo = salto
    for (let i = 0; i < 10; i++)
      voo = stepScene({ scene: 'jump-sound' }, voo, { type: 'advance', seconds: 0.2 })
    const doisSaltos = {
      ...stepScene({ scene: 'jump-sound' }, voo, { type: 'jump', input: 'tap' }),
      caption: '',
    }
    expect(sceneSituation('jump-sound', doisSaltos)).toContain('2 saltos')

    // A varredura que impede o próximo: NENHUMA frase de NENHUMA cena escreve "1 <coisa>s".
    //
    // ⚠️⚠️ Ela cobre as TRÊS superfícies de texto e TODO passo do roteiro, e cada uma dessas
    // extensões nasceu de um defeito que a versão anterior deixava passar:
    //  - a **faixa de estado**, que ficava de fora e abria `pixel-vector` com "lupa 1 vezes";
    //  - o **`caption` do motor**, que o teste antigo APAGAVA (`caption: ''`) para isolar a
    //    situação — e era do motor o "Desenhou de novo sem limpar: 1 Dinos na tela" do
    //    `draw-loop`;
    //  - **cada passo**, e não só o fim do roteiro: contador chega a UM no meio do caminho e
    //    volta a passar de um depois, então olhar só as pontas é olhar onde o defeito não está.
    const achados: string[] = []
    for (const scene of SCENE_IDS) {
      const start = { scene }
      let s = openScene(start)
      const ve = () => {
        for (const l of sceneReadout(scene, s)) achados.push(`${scene}: ${l.label} ${l.value}`)
        achados.push(`${scene}: ${sceneSituation(scene, s)}`)
      }
      ve()
      for (const passo of SCENE_MODELS[scene].script)
        for (const acao of passo.actions) {
          s = stepScene(start, s, acao)
          ve()
        }
    }
    expect(achados.filter((f) => /(^|\s)1 \p{L}+s\b/u.test(f))).toEqual([])
  })

  test('sem travessão: a voz da casa vale também aqui', () => {
    for (const scene of SCENE_IDS) {
      expect(sceneSituation(scene, nasce(scene))).not.toContain('—')
      for (const l of sceneReadout(scene, nasce(scene))) expect(l.label).not.toContain('—')
    }
  })
})
