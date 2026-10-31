import { describe, expect, test } from 'bun:test'
import { join } from 'node:path'
import {
  CRESCIMENTO_DO_CEU_MS,
  criarSalvamentoInicial,
  FOSSEIS_DO_VALE,
  type Salvamento,
  SEMENTES_DO_CEU,
} from '@sistemazero/arquipelago-contracts'
import { PONTOS_DA_FLORADA } from '../src/mundo/florada'
import { LUGARES_NA_VITRINE } from '../src/mundo/fosseis-do-museu'
import { albumDoSalvamento } from '../src/sistemas/album'
import { conciliarSalvamento } from '../src/sistemas/conciliar-salvamento'
import {
  escavarFossil,
  fosseisAchados,
  fosseisLiberados,
  fossilNaAreia,
  NOME_DO_FOSSIL,
  TEXTOS_DOS_FOSSEIS,
} from '../src/sistemas/fosseis'
import {
  canteiroDoPainel,
  colherNoJardim,
  painelDoCanteiroDoCeu,
  plantarNoJardim,
  quandoFloresce,
  TEXTOS_DO_JARDIM_DO_CEU,
} from '../src/sistemas/jardim-do-ceu'
import { arquivoDaIlha, carregarGlb } from './ajuda-colisores'

/**
 * Os fósseis do museu (B4), as pegadas e os fósseis no álbum (B5), o jardim do céu e a ilha que
 * floresce (B6), 31/10/2026.
 */
const DIA = 24 * 60 * 60 * 1000
const MUSEU_EM = new Date('2026-10-31T15:00:00Z')

function comMuseu(): Salvamento {
  const s = criarSalvamentoInicial(new Date('2026-10-01T12:00:00Z'))
  return {
    ...s,
    vale: { ...s.vale, escavacao: 3 },
    projetos: {
      museu: { ganhoEm: MUSEU_EM.toISOString(), aparencia: null, aparencias: [] },
    },
  }
}

describe('os fósseis do museu', () => {
  test('sem o primeiro osso e o museu, a areia não mostra fóssil', () => {
    const s = criarSalvamentoInicial(MUSEU_EM)
    expect(fosseisLiberados(s, MUSEU_EM)).toBe(0)
    expect(fossilNaAreia(s, MUSEU_EM)).toBeNull()
  })

  test('um fóssil novo por dia, a contar do dia do museu; quem demora não perde nenhum', () => {
    let s = comMuseu()
    expect(fosseisLiberados(s, MUSEU_EM)).toBe(1)
    const r = escavarFossil(s, MUSEU_EM, true)
    expect(r?.fossil).toBe(FOSSEIS_DO_VALE[0])
    s = r?.salvamento ?? s
    expect(fossilNaAreia(s, MUSEU_EM)).toBeNull()
    // Dez dias depois: os cinco que faltam esperam na areia, um de cada vez.
    const depois = new Date(MUSEU_EM.getTime() + 10 * DIA)
    for (const id of FOSSEIS_DO_VALE.slice(1)) {
      expect(fossilNaAreia(s, depois)).toBe(id)
      s = escavarFossil(s, depois, true)?.salvamento ?? s
    }
    expect(fosseisAchados(s)).toEqual([...FOSSEIS_DO_VALE])
    expect(s.vale.fosseis).toBe(63)
    expect(escavarFossil(s, depois, true)).toBeNull()
  })

  test('pausado ou só olhando, não escava', () => {
    expect(escavarFossil(comMuseu(), MUSEU_EM, false)).toBeNull()
  })

  test('duas sessões juntam os fósseis achados', () => {
    const base = comMuseu()
    const depois = new Date(MUSEU_EM.getTime() + 3 * DIA)
    const local = escavarFossil(base, depois, true)?.salvamento ?? base
    const remoto = {
      ...base,
      vale: { ...base.vale, fosseis: 2 },
    }
    expect(conciliarSalvamento(base, local, remoto)?.vale.fosseis).toBe(3)
  })

  test('cada fóssil tem nome, lugar na vitrine e entra no álbum; os textos seguem a regra', () => {
    expect(LUGARES_NA_VITRINE).toHaveLength(FOSSEIS_DO_VALE.length)
    const album = albumDoSalvamento({ ...comMuseu(), vale: { ...comMuseu().vale, fosseis: 5 } })
    expect(album.fosseis.conta).toEqual({ tem: 2, total: 6, faltam: 4 })
    expect(album.pegadas.itens.map((p) => p.id)).toEqual([
      'pegada-rex',
      'pegada-triceratopo',
      'pegada-capivara',
      'pegada-passaro',
    ])
    const textos = [
      ...Object.values(NOME_DO_FOSSIL),
      TEXTOS_DOS_FOSSEIS.escavar,
      TEXTOS_DOS_FOSSEIS.achou('Garra fóssil'),
      TEXTOS_DOS_FOSSEIS.amanha,
      TEXTOS_DOS_FOSSEIS.todos,
      TEXTOS_DO_JARDIM_DO_CEU.escolher,
      TEXTOS_DO_JARDIM_DO_CEU.colheu(3),
      TEXTOS_DO_JARDIM_DO_CEU.colheu(20),
      ...album.pegadas.itens.map((p) => p.texto),
    ]
    for (const t of textos) {
      expect(t).not.toMatch(/[—–!]/)
      expect(t.trimStart()[0]).not.toBe('?')
    }
  })

  test('os seis fósseis estão no GLB dos props do Vale', async () => {
    const props = await carregarGlb(arquivoDaIlha('vale-dos-dinos-props.glb'))
    for (const id of FOSSEIS_DO_VALE)
      expect([id, Boolean(props.getObjectByName(id))]).toEqual([id, true])
  })
})

describe('o jardim do céu e a ilha que floresce', () => {
  const AGORA = Date.parse('2026-10-31T12:00:00Z')

  test('plantar, esperar e colher: a flor vai para a florada da sua ilha', () => {
    const s = criarSalvamentoInicial(new Date(AGORA))
    const plantado = plantarNoJardim(s, 3, 'arco-iris-de-petala', AGORA)
    if (!plantado) throw new Error('não plantou')
    expect(quandoFloresce(plantado, 3, AGORA)).toBe('Floresce em 16 horas e 1 minuto.')
    expect(colherNoJardim(plantado, 3, AGORA + 1000)).toBeNull()
    const colhido = colherNoJardim(
      plantado,
      3,
      AGORA + CRESCIMENTO_DO_CEU_MS['arco-iris-de-petala'],
    )
    expect(colhido?.florada).toBe(1)
    expect(colhido?.ceu).toEqual([])
    expect(s.florada).toBe(0)
  })

  test('o painel de cada canteiro se reconhece', () => {
    for (let k = 1; k <= 6; k++) expect(canteiroDoPainel(painelDoCanteiroDoCeu(k))).toBe(k)
    expect(canteiroDoPainel('jardim-do-ceu:7')).toBeNull()
    expect(canteiroDoPainel(null)).toBeNull()
  })

  test('o terraço tem os seis canteiros e há um nó por planta e estágio', async () => {
    const nuvens = await carregarGlb(arquivoDaIlha('nuvens.glb'))
    for (let k = 1; k <= 6; k++) expect(nuvens.getObjectByName(`canteiro-ceu-${k}`)).toBeDefined()
    const plantas = await carregarGlb(
      join(import.meta.dir, '..', 'src', 'assets', 'itens', 'plantas-do-ceu.glb'),
    )
    for (const p of SEMENTES_DO_CEU)
      for (const e of ['broto', 'crescendo', 'maduro'])
        expect([p, e, Boolean(plantas.getObjectByName(`${p}-${e}`))]).toEqual([p, e, true])
  })

  test('a florada tem os três níveis e os 24 pontos', async () => {
    const florada = await carregarGlb(
      join(import.meta.dir, '..', 'src', 'assets', 'mundo', 'florada.glb'),
    )
    for (let n = 1; n <= 3; n++) expect(florada.getObjectByName(`florada-${n}`)).toBeDefined()
    for (let i = 1; i <= PONTOS_DA_FLORADA; i++)
      expect(florada.getObjectByName(`ponto-florada-${i}`)).toBeDefined()
  })
})
