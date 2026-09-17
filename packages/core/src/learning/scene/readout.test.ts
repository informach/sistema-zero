import { describe, expect, test } from 'bun:test'
import { SCENE_IDS, type SceneAction, type SceneId, scenePorts } from './actions'
import type { SceneCast } from './cast'
import { SCENE_MODELS } from './catalog'
import { openScene, stepScene } from './engine'
import { sceneReadout, sceneSituation } from './readout'
import { initialScene, type SceneState } from './state'

const nasce = (scene: SceneId): SceneState => initialScene({ scene })
/**
 * A abertura, menos em `controls`: lá a chave do toque só entra na faixa depois do primeiro toque
 * recusado (review do lote 2). Cena alheia volta a abertura.
 */
const toqueRecusado = (scene: SceneId): SceneState =>
  scene === 'controls'
    ? stepScene({ scene }, nasce(scene), { type: 'start', input: 'tap' })
    : // ⚠️ Mudou de propósito (lote 5 do Raio-X): na `spawn` o par ("nasce" e "nasceram") só existe
      // depois de nascer alguém, pela mesma razão do toque da `controls`.
      scene === 'spawn'
      ? stepScene({ scene }, nasce(scene), { type: 'advance', seconds: 0.2 })
      : nasce(scene)
/** A cena com toda chave dela virada (cada fio e cada liga/desliga). Ação alheia é no-op. */
const ligaTudo = (scene: SceneId): SceneState[] => {
  const acoes: SceneAction[] = [
    ...scenePorts(scene).map((port): SceneAction => ({ type: 'connect', port, enabled: true })),
    { type: 'see-points', level: 'tudo' },
    { type: 'shade', on: true },
    { type: 'loop', on: true },
    { type: 'erase', on: true },
    { type: 'onion', on: true },
    { type: 'mirror-mode', mode: 'x' },
  ]
  return [acoes.reduce((e, a) => stepScene({ scene }, e, a), nasce(scene))]
}
/**
 * A cena com todo FIO dela desligado. ⚠️ Lote 5 do Raio-X: a `acceleration` abre com a condição
 * LIGADA, e só desligando ela a outra posição da chave aparece na faixa.
 */
const desligaTudo = (scene: SceneId): SceneState[] => [
  scenePorts(scene)
    .map((port): SceneAction => ({ type: 'connect', port, enabled: false }))
    .reduce((e, a) => stepScene({ scene }, e, a), nasce(scene)),
]

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
        expect(label).not.toMatch(/width|distance|force|screen|guarded|points/)
        // ⚠️ Mudou de propósito (consertos do review da onda A do lote 5): na `acceleration` "base" é a
        // palavra da aula (instrução, pistas, metas e frase), e a faixa passou a dizê-la.
        if (!(scene === 'acceleration' && label === 'base')) expect(label).not.toMatch(/base/)
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

  test('⚠️⚠️ `cleanup`: "na tela" conta só os que estão NA TELA; os que saíram ficam nos guardados', () => {
    // A faixa contava todos os vivos: "cactos na tela 17" com 8 desenhados, e "na tela 10 ·
    // guardados 10" justo quando a cena existe para mostrar que são números diferentes.
    const s = stepScene({ scene: 'cleanup' }, nasce('cleanup'), { type: 'advance', seconds: 8 })
    const valor = (label: string) =>
      sceneReadout('cleanup', s).find((l) => l.label === label)?.value
    const naTela = s.crowd.cacti.filter((c) => c.x >= 0 && c.x <= 480).length
    expect(s.crowd.cacti.length).toBeGreaterThan(naTela)
    // ⚠️ Mudou de propósito (lote 5 do Raio-X): "na tela", ao lado de "no grupo" e da chave.
    expect(valor('na tela')).toBe(String(naTela))
    // ⚠️ Mudou de propósito (review do lote 2): "no grupo", e não "guardados nos bastidores", que
    // era a certa da previsão ("continua guardado") escrita na faixa.
    expect(valor('no grupo')).toBe(String(s.crowd.born - s.crowd.removed))
    expect(valor('na tela')).not.toBe(valor('no grupo'))
  })

  test('⚠️⚠️ `spawn`: sem o relógio não há intervalo, nasce um a cada quadro', () => {
    // A faixa dizia "intervalo 1s" com o relógio desligado, e no Desafio a pergunta anexa tem o
    // distrator "um por segundo", que a faixa confirmava.
    const nasceQuando = (s: SceneState) =>
      sceneReadout('spawn', s).find((l) => l.label === 'nasce')?.value
    // ⚠️⚠️ Mudou de propósito (consertos do lote 1): na ABERTURA a linha não existe, porque "a
    // cada quadro" é a resposta da pergunta anexa do Dia 3 antes de a criança mexer em nada.
    expect(nasceQuando(openScene({ scene: 'spawn' }))).toBeUndefined()
    const semRelogio = stepScene({ scene: 'spawn' }, nasce('spawn'), {
      type: 'advance',
      seconds: 0.2,
    })
    expect(semRelogio.crowd.born).toBeGreaterThan(0)
    expect(nasceQuando(semRelogio)).toBe('a cada quadro')
    expect(sceneReadout('spawn', semRelogio).some((l) => /\d\s?s$/.test(l.value))).toBe(false)
    const comRelogio = [
      { type: 'connect' as const, port: 'timer' as const, enabled: true },
      { type: 'interval' as const, seconds: 0.5 },
    ].reduce((e, a) => stepScene({ scene: 'spawn' }, e, a), semRelogio)
    // Decimal com vírgula, como no botão.
    expect(nasceQuando(comRelogio)).toBe('a cada 0,5 s')
  })

  test('⚠️⚠️ ligado e desligado concordam com o RÓTULO, nas duas posições da chave', () => {
    // O `liga()` só sabia o feminino: "som no salto desligada", "começar por toque desligada",
    // "laço desligada", "raio-X desligada". ⚠️ A tabela é a régua: rótulo novo com chave entra
    // nela, e a guarda de que a varredura LEU as chaves impede o laço que aprova tudo.
    const GENERO: Record<string, 'm' | 'f'> = {
      // ⚠️ Mudou de propósito (lote 5): o `draw-loop` saiu da tabela (a faixa mostra quadro, x e
      // Dinos, e os botões dizem as chaves) e o `world` diz "desenho na tela".
      fantasma: 'm',
      // ⚠️ Mudou de propósito (lote 5, G4): o espelho virou ESCOLHA (desligado, lado a lado, cima e
      // baixo), e só o "desligado" é chave. Ele fica na tabela pelo gênero, sem a posição "ligado".
      espelho: 'm',
      'desenho na tela': 'm',
      gravidade: 'f',
      // ⚠️ Mudou de propósito (review do lote 2): "som no salto", "relógio dentro de Se jogando" e
      // "Somar ponto dentro de Se jogando" saíram da tabela porque deixaram de ser chaves ("o som
      // escuta: a tecla Espaço", "Relógio: fora de Se jogando"), com as palavras da frase.
      // ⚠️ Mudou de propósito (lote 5 do Raio-X): "nascimento por relógio", "remoção na saída" e
      // "começar por toque" saíram. A `spawn` e a `controls` dizem onde a PEÇA está ("nasce: a cada
      // quadro", "começa com: Enter") e a `cleanup` diz "remover quem sai: não".
      // ⚠️ Mudou de propósito (lote 5): a `restart` virou a escolha do toque ("no fim, o toque: vai para
      // o início") e a placa de limite da `acceleration` virou a condição do Estúdio.
      'a condição': 'f',
      laço: 'm',
      mira: 'f',
      correção: 'f',
      // ⚠️ Mudou de propósito (lote 5 do Raio-X): a `pool` diz o nome da chave ("reciclar quem saiu") e a
      // `mesh` saiu da tabela (a faixa diz o degrau de "ver os pontos", que não é ligado/desligado).
      'reciclar quem saiu': 'm',
      // ⚠️ Mudou de propósito (full review de experiência, B9): "remover quem sai: desligado", a palavra
      // da chave logo abaixo, e não "não".
      'remover quem sai': 'm',
      // ⚠️ Mudou de propósito (lote 5, G4): a `shading` diz "o sol está na" e "tons de azul".
    }
    const SO_DESLIGADO = new Set(['espelho'])
    const CHAVE = /^(des)?ligad[oa]$/
    const lidas = new Set<string>()
    for (const scene of SCENE_IDS)
      for (const estado of [
        nasce(scene),
        toqueRecusado(scene),
        ...ligaTudo(scene),
        ...desligaTudo(scene),
      ])
        for (const { label, value } of sceneReadout(scene, estado)) {
          if (!CHAVE.test(value)) continue
          const genero = GENERO[label]
          if (!genero) throw new Error(`${scene}: rótulo "${label}" sem gênero na tabela`)
          expect(value.endsWith(genero === 'm' ? 'o' : 'a'), `${scene}: ${label} ${value}`).toBe(
            true,
          )
          lidas.add(`${label} ${value}`)
        }
    // Todo rótulo da tabela apareceu, nas DUAS posições.
    expect(lidas.size).toBe(Object.keys(GENERO).length * 2 - SO_DESLIGADO.size)
  })

  test('o par de comparação usa os tons do desenho, nunca tudo igual', () => {
    // A e B são as cores com que a cena mostra a medida A contra a medida B. Uma faixa toda
    // `plain` perde justamente a ligação com o palco.
    // ⚠️ O primeiro tom não é sempre `a`: em `screen-reader` a descrição VAZIA nasce em
    // `alert`, porque é a ausência dela que a cena quer que salte aos olhos.
    // ⚠️ Mudou de propósito (review do lote 2): em `controls` a segunda leitura ("começar por
    // toque") só entra DEPOIS de a criança tocar, porque "desligado" embaixo da previsão ("você
    // aperta Toque para começar. O que acontece?") era a resposta. O par é conferido ali.
    for (const scene of SCENE_IDS) {
      const tons = sceneReadout(scene, toqueRecusado(scene)).map((l) => l.tone)
      expect(tons.filter((t) => t !== 'plain').length).toBeGreaterThanOrEqual(2)
    }
    expect(sceneReadout('controls', nasce('controls'))).toHaveLength(1)
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
    // Mudou de propósito (lote 2 do Raio-X): a frase diz onde o Dino está e o estado do desenho,
    // e não mais "nada foi mandado desenhar ainda", que puxava a resposta da previsão.
    expect(sceneSituation('world', semCaption)).toContain('O Dino está nos bastidores')
    expect(sceneSituation('world', semCaption)).toContain('desenho desligado')
  })

  test('⚠️⚠️ um é UM: a frase concorda em número com o que conta', () => {
    // A criança lia "1 vidas e 1 pontos", "1 saltos e 1 sons" e "1 cactos nos bastidores" —
    // sempre no PRIMEIRO acontecimento da cena, que é quando ela está lendo com mais atenção.
    // ⚠️ Sem o `caption`: com ele a frase é o ACONTECIMENTO ("O impulso iniciou o salto."), e o
    // que este teste cobra é a descrição da situação, que é o que fica na tela depois.
    // ⚠️ Mudou de propósito (review do lote 2): a frase da `jump-sound` deixou de contar saltos e
    // sons (a faixa e o desenho já contam, e eram os mesmos números três vezes). O caso de "um é
    // UM" passa a ser a `cooldown`, que conta apertos e tiros na frase.
    const recarga = [{ type: 'recharge' as const, seconds: 1 }, { type: 'shoot' as const }].reduce(
      (e, a) => stepScene({ scene: 'cooldown' }, e, a),
      nasce('cooldown'),
    )
    // ⚠️ Mudou de propósito (lote 5 do Raio-X, G5): a frase conta os tiros que SAÍRAM e os apertos que
    // NÃO viraram tiro, como a faixa e o palco ("2 apertos não viraram tiro").
    expect(sceneSituation('cooldown', { ...recarga, caption: '' })).toContain('1 tiro saiu.')
    const recusado = stepScene({ scene: 'cooldown' }, recarga, { type: 'shoot' })
    expect(sceneSituation('cooldown', { ...recusado, caption: '' })).toContain(
      '1 tiro saiu. 1 aperto não virou tiro.',
    )

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
