import { describe, expect, test } from 'bun:test'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { SCENE_IDS, type SceneId } from './actions'
import { castText, type SceneCast } from './cast'
import { sceneGoalIds } from './catalog'
import { SCENE_QUESTIONS } from './questions'

/**
 * A ordem das alternativas e a retomada do palpite (lote 2 do Raio-X, 16/09/2026).
 *
 * ⚠️⚠️ Por que existe: a resposta certa era a PRIMEIRA em 80 das 84 perguntas do modelo, e o
 * player não embaralha. A criança aprende em três cenas que "a primeira é a certa", e a previsão
 * vira clique. O conserto foi alternar a ordem à mão, e o que impede a volta é este arquivo.
 */

/** Quantas perguntas têm a certa em primeiro lugar. */
function certaPrimeiro(
  perguntas: readonly { choices: { id: string }[]; correctChoiceId?: string }[],
) {
  return perguntas.filter((q) => q.choices[0]?.id === q.correctChoiceId).length
}

/**
 * O maior trecho em ALTERNÂNCIA perfeita (primeiro, segundo, primeiro…) e o maior trecho REPETIDO
 * numa sequência de "a certa está em primeiro?".
 *
 * ⚠️⚠️ As duas medidas, e não só a proporção (review do lote 2): com a certa em primeiro em 44 de 90,
 * a sequência do catálogo trocava de lado em 37 de 44 cenas vizinhas, com trechos de onze em
 * alternância perfeita. "A certa muda de lado a cada pergunta" é tão adivinhável quanto "a certa é
 * a primeira", e a guarda antiga (menos de 40 trocas) deixava passar.
 */
function trechos(seq: readonly boolean[]) {
  let alternando = 1
  let repetindo = 1
  let maiorAlternancia = seq.length ? 1 : 0
  let maiorRepeticao = seq.length ? 1 : 0
  for (let i = 1; i < seq.length; i++) {
    if (seq[i] !== seq[i - 1]) {
      alternando++
      repetindo = 1
    } else {
      repetindo++
      alternando = 1
    }
    maiorAlternancia = Math.max(maiorAlternancia, alternando)
    maiorRepeticao = Math.max(maiorRepeticao, repetindo)
  }
  return { maiorAlternancia, maiorRepeticao }
}
const primeiraCerta = (q: { choices: { id: string }[]; correctChoiceId?: string }) =>
  q.choices[0]?.id === q.correctChoiceId

const MODELO = SCENE_IDS.flatMap((scene) => [
  SCENE_QUESTIONS[scene].prediction,
  SCENE_QUESTIONS[scene].explain,
])

describe('a ordem das alternativas', () => {
  test('⚠️ a guarda morde: tudo com a certa em primeiro reprovaria', () => {
    const viciada = MODELO.map((q) => ({
      correctChoiceId: q.correctChoiceId,
      choices: [...q.choices].sort((a, b) =>
        a.id === q.correctChoiceId ? -1 : b.id === q.correctChoiceId ? 1 : 0,
      ),
    }))
    expect(certaPrimeiro(viciada) / viciada.length).toBeGreaterThan(0.6)
  })

  test('⚠️⚠️ a certa NÃO é a primeira em mais de 60% das perguntas do modelo', () => {
    const proporcao = certaPrimeiro(MODELO) / MODELO.length
    expect(MODELO.length).toBe(SCENE_IDS.length * 2)
    expect(proporcao).toBeLessThanOrEqual(0.6)
    // ⚠️ E nem o contrário: com a certa SEMPRE em segundo, a regra adivinhável só trocaria de lado.
    expect(proporcao).toBeGreaterThanOrEqual(0.4)
  })

  test('⚠️ sem padrão fácil: nem a previsão nem a explicação alternam cena sim, cena não', () => {
    for (const parte of ['prediction', 'explain'] as const) {
      const posicoes = SCENE_IDS.map((scene) => {
        const q = SCENE_QUESTIONS[scene][parte]
        return q.choices[0]?.id === q.correctChoiceId
      })
      const trocas = posicoes.slice(1).filter((p, i) => p !== posicoes[i]).length
      // Alternância estrita daria 44 trocas em 45 cenas; tudo igual daria 0.
      expect(trocas, parte).toBeGreaterThan(5)
      expect(trocas, parte).toBeLessThan(SCENE_IDS.length - 5)
    }
  })

  test('⚠️ a guarda dos trechos morde: alternância perfeita e repetição longa reprovariam', () => {
    const vaivem = SCENE_IDS.map((_, i) => i % 2 === 0)
    expect(trechos(vaivem).maiorAlternancia).toBeGreaterThan(4)
    const blocos = SCENE_IDS.map((_, i) => Math.floor(i / 4) % 2 === 0)
    expect(trechos(blocos).maiorRepeticao).toBeGreaterThan(3)
  })

  test('⚠️⚠️ sem VAIVÉM na ordem do catálogo: alternância perfeita até 4, repetição até 3', () => {
    for (const parte of ['prediction', 'explain'] as const) {
      const seq = SCENE_IDS.map((scene) => primeiraCerta(SCENE_QUESTIONS[scene][parte]))
      const { maiorAlternancia, maiorRepeticao } = trechos(seq)
      expect(maiorAlternancia, `${parte}: trecho em alternância perfeita`).toBeLessThanOrEqual(4)
      expect(maiorRepeticao, `${parte}: trecho do mesmo lado`).toBeLessThanOrEqual(3)
    }
  })

  test('⚠️ previsão e explicação da MESMA cena em lados opostos entre 40% e 60%', () => {
    // Com os dois sempre opostos, quem ouviu "E foi isso mesmo!" na primeira opção acertaria a
    // explicação (que vale nota) escolhendo a segunda.
    const opostas = SCENE_IDS.filter(
      (scene) =>
        primeiraCerta(SCENE_QUESTIONS[scene].prediction) !==
        primeiraCerta(SCENE_QUESTIONS[scene].explain),
    ).length
    expect(opostas / SCENE_IDS.length).toBeGreaterThanOrEqual(0.4)
    expect(opostas / SCENE_IDS.length).toBeLessThanOrEqual(0.6)
  })
})

describe('a retomada do palpite', () => {
  const FEMININO: SceneCast = {
    hero: { name: 'nave', gender: 'f' },
    obstacle: { name: 'pedra', gender: 'f' },
    scenery: { name: 'chama', gender: 'f' },
  }

  test('⚠️⚠️ toda previsão do modelo diz qual META a responde, e a meta existe na cena', () => {
    for (const scene of SCENE_IDS) {
      const { revealOn } = SCENE_QUESTIONS[scene].prediction
      expect(revealOn, scene).toBeDefined()
      expect(sceneGoalIds(scene), scene).toContain(revealOn as string)
    }
  })

  test('toda opção ERRADA diz o que olhar, e a certa não', () => {
    for (const scene of SCENE_IDS) {
      const p = SCENE_QUESTIONS[scene].prediction
      for (const c of p.choices) {
        if (c.id === p.correctChoiceId) expect(c.shows, `${scene} · ${c.id}`).toBeUndefined()
        else expect(c.shows?.trim().length ?? 0, `${scene} · ${c.id}`).toBeGreaterThan(10)
      }
      // O `shows` é da previsão: a explicação decide o `passed` e tem recado próprio.
      for (const c of SCENE_QUESTIONS[scene].explain.choices)
        expect(c.shows, `${scene} · explicação`).toBeUndefined()
    }
  })

  test('⚠️⚠️ o `shows` sobrevive ao elenco e à voz da casa', () => {
    const PRONOME = /\b(ele|dele|nele|eles|deles|neles)\b/i
    let lidos = 0
    for (const scene of SCENE_IDS)
      for (const c of SCENE_QUESTIONS[scene].prediction.choices) {
        if (!c.shows) continue
        const vestido = castText(c.shows, FEMININO)
        expect(vestido, scene).not.toMatch(/Dino|cactos?\b|floresta/i)
        if (vestido !== c.shows) expect(c.shows, scene).not.toMatch(PRONOME)
        expect(c.shows, scene).not.toContain('—')
        lidos++
      }
    expect(lidos).toBeGreaterThanOrEqual(SCENE_IDS.length)
  })
})

/**
 * ⚠️ As perguntas que o PROFESSOR escreve nos manifestos passam pela mesma régua: são as que a
 * criança recebe no lugar das do modelo, e elas tinham o mesmo vício (a certa sempre em primeiro
 * na explicação, sempre em segundo na previsão — um padrão igualmente adivinhável).
 */
describe('as perguntas dos manifestos v6', () => {
  const docs = resolve(import.meta.dir, '../../../../../docs/aulas-interativas')
  const PACOTES = ['corre-dino-v6', 'desafio-primeiro-jogo-v6', 'o-jogo-do-meu-jeito-v6']
  type Bloco = {
    kind?: string
    activity?: { type?: string; scene?: SceneId }
    prediction?: {
      choices: { id: string; shows?: string }[]
      correctChoiceId?: string
      revealOn?: string
    }
    checkpoint?: { choices: { id: string }[]; correctChoiceId: string }
  }
  const blocos: { onde: string; bloco: Bloco }[] = []
  const andar = (valor: unknown, onde: string) => {
    if (Array.isArray(valor)) for (const v of valor) andar(v, onde)
    else if (valor && typeof valor === 'object') {
      const b = valor as Bloco
      if (b.kind === 'interactive' && b.activity?.type === 'experimentation')
        blocos.push({ onde, bloco: b })
      for (const v of Object.values(valor)) andar(v, onde)
    }
  }
  for (const pacote of PACOTES) {
    const pasta = resolve(docs, pacote)
    if (!existsSync(pasta)) continue
    for (const aula of readdirSync(pasta, { withFileTypes: true })) {
      const arquivo = resolve(pasta, aula.name, 'manifesto.json')
      if (aula.isDirectory() && existsSync(arquivo))
        andar(JSON.parse(readFileSync(arquivo, 'utf8')), `${pacote}/${aula.name}`)
    }
  }

  test('a varredura LEU os blocos de cena (laço vazio aprova tudo)', () => {
    expect(blocos.length).toBeGreaterThan(25)
    expect(blocos.filter((b) => b.bloco.prediction).length).toBeGreaterThanOrEqual(6)
  })

  test('⚠️ e a certa não fica sempre no mesmo lugar', () => {
    const escritas = blocos.flatMap(({ bloco }) =>
      [bloco.prediction, bloco.checkpoint].filter((q) => q !== undefined),
    )
    const proporcao = certaPrimeiro(escritas) / escritas.length
    expect(escritas.length).toBeGreaterThanOrEqual(10)
    expect(proporcao).toBeLessThanOrEqual(0.6)
    expect(proporcao).toBeGreaterThanOrEqual(0.3)
    for (const parte of ['prediction', 'checkpoint'] as const) {
      const daParte = blocos.flatMap(({ bloco }) => (bloco[parte] ? [bloco[parte]] : []))
      const primeiro = certaPrimeiro(daParte)
      // Nem todas em primeiro, nem todas em segundo, dentro de cada tipo.
      expect(primeiro, parte).toBeGreaterThan(0)
      expect(primeiro, parte).toBeLessThan(daParte.length)
    }
  })
})
