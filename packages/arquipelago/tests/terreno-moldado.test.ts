import { describe, expect, test } from 'bun:test'
import {
  ALTURA_MAXIMA_DO_TERRENO,
  criarSalvamentoInicial,
  type Obra,
  type Terreno,
  TerrenoSchema,
} from '@sistemazero/arquipelago-contracts'
import { BufferGeometry, Float32BufferAttribute, Mesh, PlaneGeometry } from 'three'
import { criarLojaDaConstrucao, type FonteDoTerreno } from '../src/estado/construcao'
import { criarLoja } from '../src/estado/loja'
import { moldarMalhas, verticesMoldados } from '../src/mundo/terreno-moldado'
import { QUARTO_DE_EXEMPLO } from '../src/plataforma/falsa'
import { arrasta, celulasDoTerreno } from '../src/sistemas/construcao/ferramentas'
import { type Celula, LOTE_DA_CASA, loteDaCasa } from '../src/sistemas/construcao/lote'
import {
  alturaDaCelula,
  alturaDoCanto,
  celulasPlanas,
  FALA_DO_TERRENO,
  MEIO_METRO,
  moldar,
  moldarCelulas,
  POSICAO_DO_TERRENO,
  podeMoldar,
  podeMoldarOTerreno,
  terrenoComAObra,
} from '../src/sistemas/construcao/terreno'

const AGORA = new Date('2026-10-31T12:00:00Z')
const LOTE = loteDaCasa(POSICAO_DO_TERRENO)
const OBRA = structuredClone(LOTE_DA_CASA.obraInicial) as Obra

/** Uma célula livre do quintal, longe da casa e da borda (as quatro vizinhas também livres). */
function celulaLivre(): Celula {
  const planas = celulasPlanas(OBRA, LOTE)
  const { x0, z0, x1, z1 } = LOTE.area
  for (let x = x0 + 2; x < x1 - 2; x++)
    for (let z = z0 + 2; z < z1 - 2; z++) {
      const viz = [-1, 0, 1].flatMap((dx) => [-1, 0, 1].map((dz) => ({ x: x + dx, z: z + dz })))
      if (viz.every((c) => podeMoldar(c, LOTE, planas))) return { x, z }
    }
  throw new Error('sem célula livre')
}

describe('moldar o terreno do lote (E04, Nuvens)', () => {
  test('só das Nuvens em diante', () => {
    expect(podeMoldarOTerreno(POSICAO_DO_TERRENO - 1)).toBe(false)
    expect(podeMoldarOTerreno(POSICAO_DO_TERRENO)).toBe(true)
  })

  test('sobe e desce meio metro por vez, até 1,5 m, e o plano não se guarda', () => {
    const c = celulaLivre()
    let t: Terreno | null = null
    for (let i = 1; i <= ALTURA_MAXIMA_DO_TERRENO; i++) {
      const r = moldar(t, OBRA, LOTE, c, 1)
      if (!r.ok) throw new Error(r.motivo)
      t = r.terreno
      expect(alturaDaCelula(t, c)).toBe(i)
    }
    expect(moldar(t, OBRA, LOTE, c, 1)).toEqual({ ok: false, motivo: 'no-alto' })
    for (let i = ALTURA_MAXIMA_DO_TERRENO; i > 0; i--) {
      const r = moldar(t, OBRA, LOTE, c, -1)
      if (!r.ok) throw new Error(r.motivo)
      t = r.terreno
    }
    expect(t?.alturas).toEqual([])
    expect(moldar(t, OBRA, LOTE, c, -1)).toEqual({ ok: false, motivo: 'no-chao' })
    expect(TerrenoSchema.safeParse(t).success).toBe(true)
  })

  test('a casa, a borda e o que está posto ficam no plano', () => {
    // Dentro do quarto (o meio da casa).
    expect(moldar(null, OBRA, LOTE, { x: 0, z: -4 }, 1)).toEqual({ ok: false, motivo: 'com-obra' })
    expect(moldar(null, OBRA, LOTE, { x: LOTE.area.x1 + 3, z: 0 }, 1)).toEqual({
      ok: false,
      motivo: 'fora-do-lote',
    })
    const c = celulaLivre()
    const comCaminho: Obra = {
      ...OBRA,
      caminhos: [...OBRA.caminhos, { ...c, tipo: 'pedra' as const }],
    }
    expect(moldar(null, comCaminho, LOTE, c, 1)).toEqual({ ok: false, motivo: 'com-obra' })
    // O morrinho debaixo de um caminho novo volta ao plano.
    const r = moldar(null, OBRA, LOTE, c, 1)
    if (!r.ok) throw new Error(r.motivo)
    expect(terrenoComAObra(r.terreno, comCaminho, LOTE)?.alturas).toEqual([])
  })

  test('os cantos sobem pela maior célula em volta e ficam no plano junto do que é plano', () => {
    const c = celulaLivre()
    const r = moldarCelulas({ alturas: [[c.x, c.z, 1]] }, OBRA, LOTE, [c], 1)
    if (!r.ok) throw new Error(r.motivo)
    const planas = celulasPlanas(OBRA, LOTE)
    // Os quatro cantos da célula moldada estão a 1 m; os de fora, no chão.
    for (const [x, z] of [
      [c.x, c.z],
      [c.x + 1, c.z],
      [c.x, c.z + 1],
      [c.x + 1, c.z + 1],
    ] as const)
      expect(alturaDoCanto(r.terreno, LOTE, planas, x, z)).toBe(2 * MEIO_METRO)
    expect(alturaDoCanto(r.terreno, LOTE, planas, c.x - 1, c.z)).toBe(0)
    expect(alturaDoCanto(r.terreno, LOTE, planas, c.x + 2, c.z + 2)).toBe(0)
  })

  test('o arrasto molda cada célula uma vez e diz o motivo quando nenhuma muda', () => {
    const c = celulaLivre()
    const arrastado = celulasDoTerreno(
      OBRA,
      LOTE,
      { x: c.x + 0.5, z: c.z + 0.5 },
      {
        x: c.x + 1.5,
        z: c.z + 0.5,
      },
    )
    expect(arrasta('terreno')).toBe(true)
    expect(arrastado.celulas).toHaveLength(2)
    expect(arrastado.previa).toMatchObject({ tipo: 'celulas', ok: true })
    const r = moldarCelulas(null, OBRA, LOTE, arrastado.celulas, 1)
    if (!r.ok) throw new Error(r.motivo)
    expect(r.terreno.alturas).toHaveLength(2)
    expect(moldarCelulas(null, OBRA, LOTE, [{ x: 0, z: -4 }], 1)).toEqual({
      ok: false,
      motivo: 'com-obra',
    })
    for (const fala of Object.values(FALA_DO_TERRENO)) expect(fala).not.toMatch(/[—–!]|^\s*[¿?]/)
  })

  test('a loja do Construir molda pela fonte, recusa antes das Nuvens e desfaz à parte', () => {
    const montar = (jornada: number) => {
      const falas: string[] = []
      const loja = criarLoja({
        // Com as quatro chaves: o caminho do fim do teste não esbarra na tranca do quintal.
        salvamento: { ...criarSalvamentoInicial(AGORA), casa: { portaNova: true }, chaves: 15 },
        jornada,
        quarto: QUARTO_DE_EXEMPLO,
        avatar: {} as never,
        acesso: {
          liberado: true,
          motivo: null,
          limiteDiarioMinutos: null,
          usadoHojeSegundos: 0,
          contabilizaTempo: false,
        },
        aoMudar: () => {},
      })
      const dizer = loja.getState().dizer
      loja.setState({
        dizer: (f: string) => {
          falas.push(f)
          dizer(f)
        },
      } as never)
      let guardado: Terreno | null = null
      const fonte: FonteDoTerreno = {
        ler: () => guardado,
        gravar: (t) => {
          guardado = t
        },
      }
      const construcao = criarLojaDaConstrucao(loja)
      construcao.getState().registrarTerreno(fonte)
      construcao.getState().abrir()
      return { construcao, falas, terreno: () => guardado }
    }
    const c = celulaLivre()
    const antes = montar(POSICAO_DO_TERRENO - 1)
    expect(antes.construcao.getState().moldarTerreno([c])).toBe(false)
    expect(antes.terreno()).toBeNull()

    const m = montar(POSICAO_DO_TERRENO)
    const s = () => m.construcao.getState()
    s().escolher('terreno')
    expect(s().moldarTerreno([c])).toBe(true)
    expect(s().moldarTerreno([c])).toBe(true)
    expect(alturaDaCelula(m.terreno(), c)).toBe(2)
    s().escolherMoldar(-1)
    expect(s().moldarTerreno([c])).toBe(true)
    expect(alturaDaCelula(m.terreno(), c)).toBe(1)
    // A obra não mudou e o Desfazer do Terreno volta o chão passo a passo.
    expect(s().antes).toHaveLength(0)
    s().desfazer()
    expect(alturaDaCelula(m.terreno(), c)).toBe(2)
    s().desfazer()
    s().desfazer()
    expect(m.terreno()).toBeNull()
    expect(s().moldarTerreno([{ x: 0, z: -4 }])).toBe(false)
    expect(m.falas).toContain(FALA_DO_TERRENO['com-obra'])

    // Lacunas de 01/11/2026: um caminho por cima do morrinho achata o chão também no documento.
    s().escolherMoldar(1)
    expect(s().moldarTerreno([c])).toBe(true)
    expect(alturaDaCelula(m.terreno(), c)).toBe(1)
    const atual = structuredClone(OBRA)
    expect(
      s().aplicar({
        ok: true,
        obra: { ...atual, caminhos: [...atual.caminhos, { ...c, tipo: 'grama' }] },
      }),
    ).toBe(true)
    expect(alturaDaCelula(m.terreno(), c)).toBe(0)
  })

  test('o chão do lote e a colisão sobem pelos cantos', () => {
    const altura = (x: number, z: number) => (x === 2 && z === 3 ? 1 : 0)
    const plano = new PlaneGeometry(8, 8, 8, 8).rotateX(-Math.PI / 2)
    const v = verticesMoldados(plano, altura)
    const pos = plano.getAttribute('position')
    for (let i = 0; i < pos.count; i++) {
      const esperado = pos.getX(i) === 2 && pos.getZ(i) === 3 ? 1 : 0
      expect(v[i * 3 + 1]).toBeCloseTo(pos.getY(i) + esperado)
    }
    const g = new BufferGeometry().setAttribute(
      'position',
      new Float32BufferAttribute([2, 0.5, 3, 4, 0.5, 3, 2, 0.5, 5], 3),
    )
    const malha = new Mesh(g)
    moldarMalhas(malha, altura)
    expect(g.attributes.position?.getY(0)).toBeCloseTo(1.5)
    expect(g.attributes.position?.getY(1)).toBeCloseTo(0.5)
    // Volta ao plano sem acumular.
    moldarMalhas(malha, null)
    expect(g.attributes.position?.getY(0)).toBeCloseTo(0.5)
  })
})
