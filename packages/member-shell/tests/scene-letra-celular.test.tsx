import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  openScene,
  SCENE_IDS,
  type SceneActivity,
  type SceneId,
  type SceneStart,
  type SceneState,
  sceneTrial,
  stepScene,
} from '@sistemazero/core/learning/scene'
import { Glob } from 'bun'
import { renderToStaticMarkup } from 'react-dom/server'
import { scenePaths } from '../../core/tests/fixtures/exploration-paths'
import { ExperienceComparison } from '../src/components/experience-scene'
import { ExplorationStage } from '../src/components/exploration-stage'
import {
  LARGURA_NOMINAL_DA_CENA,
  LarguraConhecidaDaCena,
  PISO_DA_LETRA,
  palcoDe,
} from '../src/components/scene-canvas'

/**
 * A letra dos desenhos no celular (conserto "letra no celular", 16/09/2026).
 *
 * ⚠️⚠️ O achado ALTO do review da onda A do lote 5 (T2): os palcos são SVG de 480 a 640 unidades com
 * `fontSize` de 10 a 15, o `viewBox` escala o desenho para a largura da coluna, e num celular de 390px a
 * letra de verdade caía para 5 a 8px — em várias cenas justo onde mora a descoberta. Nenhum palco sabia a
 * própria escala, então cada ajuste de tamanho tinha sido feito para a coluna do computador.
 *
 * Esta varredura CALCULA, para as 45 cenas, a menor letra efetiva de cada desenho a 390 e a 600px, a
 * partir do que o markup declara: o `viewBox`, a largura do desenho e o `font-size` de cada `<text>`
 * (com as escalas dos `transform` em volta). E reprova abaixo de `PISO_DA_LETRA`.
 *
 * ⚠️ As larguras são as da banca do aluno (`tmp/storyboard/g7`): a janela menos o `p-4` (32), o cartão
 * da aula (42: 20 de recuo e 1 de borda de cada lado) e a moldura da faixa (2). A 390px o palco tem
 * 314px; na coluna de 600px do computador, 524px (a medida que o review usou).
 * ⚠️ A largura de cada `<svg>` NÃO é lida do componente e aceita de olhos fechados: ela é conferida
 * contra o modelo da moldura (um desenho só ou empilhado = a moldura inteira; lado a lado = metade, com
 * a divisória de 2px no da esquerda). Sem isso um `data-largura-do-desenho` inventado aprovaria tudo.
 * Os estados vêm da abertura e dos gestos da experimentação, além dos blocos
 * dos manifestos. O que se sobrepõe ou corta não se calcula sem layout: isso é o
 * `tmp/storyboard/letra-celular/auditar.mjs`, no navegador.
 */

const JANELAS = { 390: 314, 600: 524 } as const

const DOCS = join(import.meta.dir, '../../../docs/aulas-interativas')

/** Todo bloco de cena dos manifestos v6 (com elenco, caso ou roteiro próprio). */
function usosDosManifestos(): SceneActivity[] {
  const usos: SceneActivity[] = []
  const visitar = (no: unknown) => {
    if (Array.isArray(no)) for (const item of no) visitar(item)
    else if (no && typeof no === 'object') {
      const registro = no as Record<string, unknown>
      if (
        typeof registro.scene === 'string' &&
        (SCENE_IDS as readonly string[]).includes(registro.scene) &&
        registro.type === 'experimentation'
      )
        usos.push(registro as unknown as SceneActivity)
      for (const valor of Object.values(registro)) visitar(valor)
    }
  }
  for (const arquivo of new Glob('*-v6/**/manifesto.json').scanSync(DOCS))
    visitar(JSON.parse(readFileSync(join(DOCS, arquivo), 'utf8')))
  return usos
}

const USOS = usosDosManifestos()

function atividades(cena: SceneId): SceneActivity[] {
  return [
    { type: 'experimentation', scene: cena } as SceneActivity,
    ...USOS.filter((u) => u.scene === cena),
  ]
}

function estados(activity: SceneActivity): SceneState[] {
  const start: SceneStart = {
    scene: activity.scene,
    setup: activity.setup,
    initialImpulse: activity.initialImpulse,
  }
  let estado = openScene(start)
  const lista = [estado]
  for (const acao of scenePaths[activity.scene]) {
    estado = stepScene(start, estado, acao)
    lista.push(estado)
  }
  return lista
}

/* ── O leitor do markup ─────────────────────────────────────────────────────────────────────── */

type No = { tag: string; attrs: Record<string, string> }

const VAZIOS = new Set(['br', 'hr', 'img', 'input', 'meta', 'link', 'source', 'wbr', 'col', 'area'])

function atributos(texto: string): Record<string, string> {
  const attrs: Record<string, string> = {}
  for (const m of texto.matchAll(/([\w:-]+)="([^"]*)"/g)) attrs[m[1] as string] = m[2] as string
  return attrs
}

/** O fator de escala de um `transform` (`scale(a)` ou `scale(a b)`); `rotate` e `translate` não mudam. */
function escalaDoTransform(transform: string | undefined): number {
  if (!transform) return 1
  let fator = 1
  for (const m of transform.matchAll(/scale\(\s*(-?[\d.]+)(?:[\s,]+(-?[\d.]+))?\s*\)/g)) {
    const a = Math.abs(Number(m[1]))
    const b = m[2] === undefined ? a : Math.abs(Number(m[2]))
    fator *= Math.sqrt(a * b)
  }
  return fator
}

export type Letra = {
  texto: string
  efetiva: number
  declarada: number | null
  larguraDoDesenho: number
  larguraEsperada: number
  /** A largura da moldura, e a da PARTE do palco que o palco deu a ela (quando ele se parte). */
  larguraDoPalco: number
  larguraDaParte: number | null
}

/**
 * Cada `<text>` do markup, com a letra efetiva na tela: `font-size` × escalas dos `transform` × (largura
 * do desenho / largura do `viewBox`). A largura do desenho é a do `data-largura-do-desenho` do `<svg>` de fora, e a
 * ESPERADA é a do modelo da moldura (`data-largura-do-palco` e o lado a lado).
 */
export function letrasDoMarkup(html: string): Letra[] {
  const pilha: No[] = []
  const letras: Letra[] = []
  const abertos: { no: No; texto: string; inicio: number }[] = []
  const tags = /<(\/?)([a-zA-Z][\w:-]*)((?:\s[^>]*?)?)(\/?)>/g
  for (let m = tags.exec(html); m; m = tags.exec(html)) {
    const [, fecha, tagCru, resto, auto] = m
    const tag = (tagCru as string).toLowerCase()
    if (fecha) {
      if (tag === 'text') {
        const aberto = abertos.pop()
        if (aberto) {
          const conteudo = html
            .slice(aberto.inicio, m.index)
            .replace(/<[^>]+>/g, '')
            .trim()
          const i = letras.length - 1
          const ultima = letras[i]
          if (ultima && !ultima.texto) ultima.texto = conteudo
        }
      }
      const i = pilha.map((n) => n.tag).lastIndexOf(tag)
      if (i >= 0) pilha.length = i
      continue
    }
    const no = { tag, attrs: atributos(resto ?? '') }
    if (tag === 'text') {
      const cadeia = [...pilha, no]
      const svgs = cadeia.filter((n) => n.tag === 'svg')
      const fora = svgs[0]
      if (fora) {
        const tamanho = [...cadeia].reverse().find((n) => n.attrs['font-size'])?.attrs['font-size']
        const declarada = tamanho === undefined ? null : Number(tamanho)
        const dentroDoSvg = cadeia.slice(cadeia.indexOf(fora))
        let fator = 1
        for (const n of dentroDoSvg) {
          fator *= escalaDoTransform(n.attrs.transform)
          // Um `<svg>` aninhado estica o conteúdo dele pela própria largura.
          if (n.tag === 'svg' && n !== fora && n.attrs.viewBox && n.attrs.width)
            fator *= Number(n.attrs.width) / Number(n.attrs.viewBox.split(/\s+/)[2])
        }
        const vbW = Number((fora.attrs.viewBox ?? '0 0 0 0').split(/\s+/)[2])
        const largura = Number(fora.attrs['data-largura-do-desenho'])
        const moldura = [...pilha].reverse().find((n) => n.attrs['data-largura-do-palco'])
        const doPalco = Number(moldura?.attrs['data-largura-do-palco'])
        // A coluna de cada lado é a filha direta da grade lado a lado; a da esquerda leva a divisória.
        const iDosLados = pilha
          .map((n) => n.attrs['data-lado-a-lado'] !== undefined)
          .lastIndexOf(true)
        const coluna = iDosLados >= 0 ? pilha[iDosLados + 1] : undefined
        const primeiroLado = (coluna?.attrs.class ?? '').split(/\s+/).includes('border-r-2')
        const esperada = iDosLados >= 0 ? doPalco / 2 - (primeiroLado ? 2 : 0) : doPalco
        const parte = [...pilha].reverse().find((n) => n.attrs['data-parte-da-cena'])
        letras.push({
          texto: '',
          efetiva: declarada === null ? 0 : declarada * fator * (largura / vbW),
          declarada,
          larguraDoDesenho: largura,
          larguraEsperada: esperada,
          larguraDoPalco: doPalco,
          larguraDaParte: parte ? Number(parte.attrs['data-parte-da-cena']) : null,
        })
      }
    }
    if (!auto && !VAZIOS.has(tag)) {
      pilha.push(no)
      if (tag === 'text') abertos.push({ no, texto: '', inicio: m.index + m[0].length })
    }
  }
  return letras
}

function palcoNaLargura(largura: number, activity: SceneActivity, estado: SceneState) {
  return renderToStaticMarkup(
    <LarguraConhecidaDaCena.Provider value={largura}>
      <ExplorationStage activity={activity} state={estado} dispatch={() => {}} />
    </LarguraConhecidaDaCena.Provider>,
  )
}

describe('o leitor de letras mede o que declara (anti-vácuo)', () => {
  test('um rótulo de 13 num palco de 600 unidades a 314px dá 6,8px, e reprova', () => {
    const [letra] = letrasDoMarkup(
      '<div data-largura-do-palco="314"><svg viewBox="0 0 600 310" data-largura-do-desenho="314"><text font-size="13">selo</text></svg></div>',
    )
    expect(letra?.texto).toBe('selo')
    expect(letra?.efetiva).toBeCloseTo(6.8, 1)
    expect(letra?.efetiva ?? 99).toBeLessThan(PISO_DA_LETRA)
  })

  test('o tamanho do grupo, o `scale` do transform e o lado a lado entram na conta', () => {
    const letras = letrasDoMarkup(
      '<div data-largura-do-palco="524"><div data-lado-a-lado="true"><div class="border-r-2"><svg viewBox="0 0 300 250" data-largura-do-desenho="260"><g font-size="11" transform="translate(4 4) scale(2)"><text>a</text></g></svg></div><div><svg viewBox="0 0 300 250" data-largura-do-desenho="262"><text font-size="12">b</text></svg></div></div></div>',
    )
    expect(letras.map((l) => l.texto)).toEqual(['a', 'b'])
    expect(letras[0]?.efetiva).toBeCloseTo(11 * 2 * (260 / 300), 3)
    expect(letras[0]?.larguraEsperada).toBe(260)
    expect(letras[1]?.larguraEsperada).toBe(262)
  })

  test('o palco de fábrica, sem largura conhecida, é a coluna do computador', () => {
    expect(palcoDe(LARGURA_NOMINAL_DA_CENA, 600).escala).toBeCloseTo(0.873, 3)
    // E o piso vale com a fração: 12 / (314 / 600) = 22,93 → 23 unidades, e nunca 22,9.
    expect(palcoDe(314, 600).letra(13) * (314 / 600)).toBeGreaterThanOrEqual(PISO_DA_LETRA)
  })
})

describe('⭐⭐ a letra dos desenhos das 45 cenas, a 390 e a 600px', () => {
  for (const [janela, largura] of Object.entries(JANELAS)) {
    test(`a ${janela}px (palco de ${largura}px) nenhum texto fica abaixo de ${PISO_DA_LETRA}px`, () => {
      const abaixo: string[] = []
      const larguraErrada: string[] = []
      const semTexto: string[] = []
      const menorPorCena: Record<string, string> = {}
      let medidos = 0
      for (const cena of SCENE_IDS) {
        let menor: Letra | null = null
        for (const activity of atividades(cena))
          for (const estado of estados(activity)) {
            const letras = letrasDoMarkup(palcoNaLargura(largura, activity, estado))
            medidos += letras.length
            for (const l of letras) {
              if (!menor || l.efetiva < menor.efetiva) menor = l
              if (l.efetiva < PISO_DA_LETRA - 0.01)
                abaixo.push(
                  `${cena} (${activity.type}): "${l.texto}" com ${l.efetiva.toFixed(1)}px (font-size ${l.declarada})`,
                )
              if (Math.abs(l.larguraDoDesenho - l.larguraEsperada) > 1)
                larguraErrada.push(
                  `${cena}: desenho de ${l.larguraDoDesenho}px, a moldura diz ${l.larguraEsperada}px`,
                )
              // ⚠️ A moldura usa a largura da coluna (ou a da parte que o palco deu a ela, que o palco
              // declara em `data-parte-da-cena`): uma moldura que inventasse a própria largura passaria.
              if (Math.abs(l.larguraDoPalco - (l.larguraDaParte ?? largura)) > 1)
                larguraErrada.push(
                  `${cena}: moldura de ${l.larguraDoPalco}px numa coluna de ${l.larguraDaParte ?? largura}px`,
                )
            }
          }
        if (menor) menorPorCena[cena] = `${menor.efetiva.toFixed(1)}px "${menor.texto}"`
        else semTexto.push(cena)
      }
      expect([...new Set(abaixo)]).toEqual([])
      expect([...new Set(larguraErrada)]).toEqual([])
      // Anti-vácuo: as cenas foram MEDIDAS. A `mesh` não escreve nada no desenho, e no celular a
      // `diagonal` também não (os nomes dos fantasmas moram na legenda embaixo dele).
      const esperadas = largura === JANELAS[390] ? ['diagonal', 'mesh'] : ['mesh']
      expect(semTexto).toEqual(esperadas)
      expect(Object.keys(menorPorCena)).toHaveLength(SCENE_IDS.length - esperadas.length)
      expect(medidos).toBeGreaterThan(2000)
    })
  }

  test('a comparação guardada da `hitbox` (duas cenas lado a lado) também', () => {
    const activity = { type: 'experimentation', scene: 'hitbox' } as SceneActivity
    const start: SceneStart = { scene: 'hitbox' }
    let estado = openScene(start)
    estado = stepScene(start, estado, { type: 'move', distance: 40 })
    const trials = [sceneTrial(openScene(start), 'Antes'), sceneTrial(estado, 'Depois')]
    for (const largura of Object.values(JANELAS)) {
      const letras = letrasDoMarkup(
        renderToStaticMarkup(
          <LarguraConhecidaDaCena.Provider value={largura}>
            <ExperienceComparison activity={activity} trials={trials} current={estado} />
          </LarguraConhecidaDaCena.Provider>,
        ),
      )
      expect(letras.length).toBeGreaterThan(4)
      for (const l of letras) {
        expect(l.efetiva, `${largura}px: "${l.texto}"`).toBeGreaterThanOrEqual(PISO_DA_LETRA - 0.01)
        expect(Math.abs(l.larguraDoDesenho - l.larguraEsperada)).toBeLessThanOrEqual(1)
      }
    }
  })
})
