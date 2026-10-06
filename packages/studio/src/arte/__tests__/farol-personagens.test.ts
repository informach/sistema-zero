import { describe, expect, test } from 'bun:test'
import {
  FAROL_ASSETS,
  FAROL_HITBOXES,
  FAROL_LAYOUT,
  FAROL_PERSONAGENS,
  type FarolAssetName,
  farolSvg,
} from '../farol-assets'
import { caixaDasFormas, lerFormas, mascara } from './silhuetaSvg'

/**
 * ⭐⭐ A seção do Farol em que a criança troca a IMAGEM do sprite `personagem` só funciona se a
 * troca não mudar nada no jogo. Todo personagem tem a caixa de 64 × 64, a MESMA área de contato
 * e um desenho que ocupa essa área como o original: cabeça começando perto de y 11, pés na mesma
 * linha do chão e o corpo entre x 16 e 46. A conta é feita na silhueta, numa grade de meio pixel.
 */
const PASSO = 0.5
const GRADE = { x0: 0, y0: 0, colunas: 64 / PASSO, linhas: 64 / PASSO, passo: PASSO }
const CORPO = { x: 16 / 64, y: 11 / 64, w: 30 / 64, h: 53 / 64 }

function medir(body: string) {
  const caixa = caixaDasFormas(lerFormas(body))
  const pontos = mascara({ viewBox: '0 0 64 64', body }, { x: 0, y: 0, w: 64, h: 64 }, GRADE)
  let dentro = 0
  let fora = 0
  for (let j = 0; j < GRADE.linhas; j++)
    for (let i = 0; i < GRADE.colunas; i++) {
      if (!pontos[j * GRADE.colunas + i]) continue
      const x = (i + 0.5) * PASSO
      const y = (j + 0.5) * PASSO
      const noContato = x >= 16 && x <= 46 && y >= 11 && y <= 64
      if (noContato) dentro++
      else fora++
    }
  return { caixa, pontos, dentro: dentro * PASSO * PASSO, fora: fora * PASSO * PASSO }
}

const ORIGINAL = medir(FAROL_ASSETS.personagem.body)

/** O que impede um desenho de entrar no lugar do original. Lista vazia = pode trocar. */
function problemas(body: string): string[] {
  const { caixa, dentro, fora } = medir(body)
  const lista: string[] = []
  if (caixa.x0 < 0 || caixa.y0 < 0 || caixa.x1 > 64 || caixa.y1 > 64)
    lista.push('o desenho sai da caixa de 64 × 64')
  if (Math.abs(caixa.y1 - ORIGINAL.caixa.y1) > 0.25)
    lista.push(`os pés estão em y ${caixa.y1.toFixed(2)}, e não em ${ORIGINAL.caixa.y1.toFixed(2)}`)
  if (caixa.y0 < 10 || caixa.y0 > 12.5)
    lista.push(`a cabeça começa em y ${caixa.y0.toFixed(2)}, longe de 11`)
  if (caixa.x0 < 15.75 || caixa.x1 > 46.25)
    lista.push(`o corpo vai de x ${caixa.x0.toFixed(2)} a ${caixa.x1.toFixed(2)}, fora de 16..46`)
  if (fora > 6) lista.push(`${fora} px² pintados fora da área de contato`)
  if (dentro < ORIGINAL.dentro * 0.9 || dentro > ORIGINAL.dentro * 1.15)
    lista.push(`ocupa ${dentro} px² da área de contato; o original ocupa ${ORIGINAL.dentro}`)
  return lista
}

/**
 * Espelho do `shape()` de `scripts/gen-farol-assets.py` (que o `--check` também roda nos
 * personagens): só estes elementos e atributos, caminho só com M/L/C/Z e números sem atalho.
 */
const CAMPOS: Record<string, readonly string[]> = {
  rect: ['x', 'y', 'width', 'height', 'rx'],
  ellipse: ['cx', 'cy', 'rx', 'ry'],
  line: ['x1', 'y1', 'x2', 'y2'],
  polygon: ['points'],
  path: ['d'],
}
const ESTILO = ['fill', 'stroke', 'stroke-width', 'stroke-linecap', 'stroke-linejoin', 'transform']
const NUMEROS_POR_COMANDO: Record<string, number> = { M: 2, L: 2, C: 6, Z: 0 }

function foraDoConversor(body: string): string[] {
  const lista: string[] = []
  if (body.replace(/<[a-zA-Z]+\b[^>]*\/>/g, '').trim() !== '')
    lista.push('há algo além de elementos simples fechados em si')
  for (const [, tag = '', resto = ''] of body.matchAll(/<([a-zA-Z]+)\b([^>]*?)\/>/g)) {
    const campos = CAMPOS[tag]
    if (!campos) {
      lista.push(`<${tag}> não é aceito`)
      continue
    }
    const attrs = Object.fromEntries(
      [...resto.matchAll(/([\w-]+)="([^"]*)"/g)].map(([, k = '', v = '']) => [k, v]),
    )
    for (const nome of Object.keys(attrs))
      if (!campos.includes(nome) && !ESTILO.includes(nome))
        lista.push(`<${tag}> com o atributo ${nome}`)
    if (attrs.transform && !/^rotate\([-\d.]+ [-\d.]+ [-\d.]+\)$/.test(attrs.transform))
      lista.push(`transformação ${attrs.transform}`)
    if (tag === 'path') {
      const d = attrs.d ?? ''
      if (!/^(?:[MLCZ]|-?\d+(?:\.\d+)?|[\s,])+$/.test(d)) lista.push(`caminho ${d.slice(0, 40)}…`)
      const tokens = d.match(/[A-Za-z]|-?\d+(?:\.\d+)?/g) ?? []
      for (let i = 0; i < tokens.length; ) {
        const comando = tokens[i++] ?? ''
        const n = NUMEROS_POR_COMANDO[comando]
        if (n === undefined || tokens.slice(i, i + n).some((t) => /[A-Za-z]/.test(t))) {
          lista.push(`caminho com ${comando} malformado`)
          break
        }
        i += n
      }
    }
  }
  return lista
}

describe('os personagens do Farol se trocam sem mudar o jogo', () => {
  test('a lista começa pelo original e só tem nomes curtos, sem acento nem espaço', () => {
    expect(FAROL_PERSONAGENS[0]).toBe('personagem')
    expect(FAROL_PERSONAGENS.length).toBeGreaterThanOrEqual(5)
    expect(new Set(FAROL_PERSONAGENS).size).toBe(FAROL_PERSONAGENS.length)
    for (const nome of FAROL_PERSONAGENS) expect(nome).toMatch(/^[a-z]{4,12}$/)
  })

  test('todos têm a caixa de 64 × 64 do sprite e a MESMA área de contato', () => {
    for (const nome of FAROL_PERSONAGENS) {
      const { width, height } = FAROL_ASSETS[nome]
      expect([width, height], nome).toEqual([FAROL_LAYOUT.personagem.w, FAROL_LAYOUT.personagem.h])
      expect(
        farolSvg(nome).startsWith(
          '<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">',
        ),
      ).toBe(true)
      expect(FAROL_HITBOXES[nome], nome).toEqual(CORPO)
    }
  })

  test('quem tem a área de contato do corpo está na lista (nada esquecido fora dela)', () => {
    const comCorpo = (Object.keys(FAROL_HITBOXES) as FarolAssetName[]).filter(
      (nome) => JSON.stringify(FAROL_HITBOXES[nome]) === JSON.stringify(CORPO),
    )
    expect(comCorpo.sort()).toEqual([...FAROL_PERSONAGENS].sort())
  })

  test('o desenho cabe na caixa, apoia os pés na linha do original e ocupa o contato como ele', () => {
    const falhas = FAROL_PERSONAGENS.flatMap((nome) =>
      problemas(FAROL_ASSETS[nome].body).map((p) => `${nome}: ${p}`),
    )
    expect(falhas).toEqual([])
  })

  test('só usa o que o conversor do Farol aceita', () => {
    const falhas = FAROL_PERSONAGENS.flatMap((nome) =>
      foraDoConversor(FAROL_ASSETS[nome].body).map((p) => `${nome}: ${p}`),
    )
    expect(falhas).toEqual([])
  })

  test('as silhuetas são diferentes entre si (a lista de miniaturas não repete desenho)', () => {
    const medidas = FAROL_PERSONAGENS.map((nome) => [nome, medir(FAROL_ASSETS[nome].body)] as const)
    for (let a = 0; a < medidas.length; a++)
      for (let b = a + 1; b < medidas.length; b++) {
        const [nomeA, ma] = medidas[a] as (typeof medidas)[number]
        const [nomeB, mb] = medidas[b] as (typeof medidas)[number]
        let diferentes = 0
        for (let i = 0; i < ma.pontos.length; i++) if (ma.pontos[i] !== mb.pontos[i]) diferentes++
        // o par mais parecido hoje (o boné e o chapéu) difere em ~53 px²
        expect(diferentes * PASSO * PASSO, `${nomeA} × ${nomeB}`).toBeGreaterThan(35)
      }
  })

  test('anti-vácuo: o original pinta de verdade e ocupa a área de contato', () => {
    expect(ORIGINAL.dentro).toBeGreaterThan(800)
    expect(ORIGINAL.fora).toBe(0)
    expect(problemas(FAROL_ASSETS.personagem.body)).toEqual([])
  })

  test('a régua MORDE: desenho que sai da caixa, pés fora da linha e elemento não aceito', () => {
    const original = FAROL_ASSETS.personagem.body
    const vazando = `${original}<rect x="60" y="30" width="6" height="4" fill="#ff0000"/>`
    expect(problemas(vazando).join(' ')).toContain('sai da caixa')
    expect(problemas(vazando).join(' ')).toContain('fora de 16..46')

    const semSapato = original.replace(/<rect x="29\.33" y="61\.92"[^>]*\/>/, '')
    expect(semSapato).not.toBe(original)
    expect(problemas(semSapato).join(' ')).toContain('os pés estão em')

    expect(foraDoConversor('<circle cx="1" cy="1" r="1"/>')).toEqual(['<circle> não é aceito'])
    expect(foraDoConversor('<rect x="1" y="1" width="2" height="2" opacity="0.5"/>')).toEqual([
      '<rect> com o atributo opacity',
    ])
    expect(foraDoConversor('<path d="M 1 1 Q 2 2 3 3 Z"/>').length).toBeGreaterThan(0)
    expect(foraDoConversor('<path d="M .5 1 L 2 2 Z"/>').length).toBeGreaterThan(0)
    expect(
      foraDoConversor('<ellipse cx="1" cy="1" rx="1" ry="1" transform="translate(2 2)"/>'),
    ).toEqual(['transformação translate(2 2)'])
  })
})
