import { expect, test } from 'bun:test'
import { LIMITES_DA_EXPORTACAO } from '@sistemazero/molda-cenarios-core/compilar'
import { decodeProjectAsset } from '../core/assetBinary'
import { criarTransporteDeEnsaio } from './scene3dTransportFixture'

/**
 * Um mundo de 2 km (1024 × 1024 células de 2 m) pelo caminho de verdade: autoria, compilador em
 * campo e importação do Estúdio (plano "Mundos de 2 km", lote 3, 23/11/2026). Sem o campo, só o
 * relevo passaria de 80 MB; em campo, cabe com folga nos 24 MiB do projeto.
 */
test('um mundo de 2 km em campo cabe no Estúdio, sem lote nem colisão de terreno', async () => {
  const plano = await criarTransporteDeEnsaio({
    relevoEmCampo: true,
    colunas: 1024,
    passo: 2,
    origem: { x: -1024, z: -1024 },
  })
  const bytes = plano.assets.reduce(
    (soma, a) => soma + decodeProjectAsset(a.dataUrl).bytes.byteLength,
    0,
  )
  expect(bytes).toBeLessThan(LIMITES_DA_EXPORTACAO.studio.bytesDoProjeto)
  const cena = plano.assets.find((a) => a.kind === 'scene3d')!
  const envelope = JSON.parse(new TextDecoder().decode(decodeProjectAsset(cena.dataUrl).bytes)) as {
    cena: {
      terreno: { colunas: number; passo: number; relevo?: { pesos: string[] } }
      arquivos: Array<{ papel: string; bytes: number }>
      colisoes: Array<{ tipo: string }>
    }
  }
  expect(envelope.cena.terreno.colunas * envelope.cena.terreno.passo).toBe(2048)
  expect(envelope.cena.terreno.relevo?.pesos.length).toBe(1)
  expect(envelope.cena.arquivos.some((a) => a.papel === 'terreno')).toBe(false)
  expect(envelope.cena.colisoes.some((c) => c.tipo === 'terreno')).toBe(false)
}, 120_000)

test('em campo, a cena sai com os números curtos e as regiões conferem (lote 5)', async () => {
  // A rampa tem rotação e volume com muitas casas: sem o arredondamento, o teste reprova.
  const plano = await criarTransporteDeEnsaio({
    relevoEmCampo: true,
    comRegioes: true,
    comRampa: true,
  })
  const cena = plano.assets.find((a) => a.kind === 'scene3d')!
  const envelope = JSON.parse(new TextDecoder().decode(decodeProjectAsset(cena.dataUrl).bytes)) as {
    cena: {
      nos: Array<{ matriz: number[] }>
      colisoes: Array<{ matriz: number[]; volume: { min: { x: number } } }>
      regioes: Array<{ nos: string[] }>
    }
  }
  const casas = (v: number) => (String(v).split('.')[1] ?? '').length
  const algarismos = (v: number) =>
    String(Math.abs(v))
      .replace(/^0\.0*|\./g, '')
      .replace(/e.*$/, '').length
  let girados = 0
  for (const item of [...envelope.cena.nos, ...envelope.cena.colisoes]) {
    for (const i of [12, 13, 14]) expect(casas(item.matriz[i]!)).toBeLessThanOrEqual(3)
    for (const i of [0, 1, 2, 4, 5, 6, 8, 9, 10])
      expect(algarismos(item.matriz[i]!)).toBeLessThanOrEqual(7)
    if (item.matriz.some((v) => v !== 0 && Math.abs(v) !== 1 && !Number.isInteger(v))) girados++
  }
  expect(girados).toBeGreaterThan(0)
  for (const c of envelope.cena.colisoes)
    for (const v of [c.volume.min.x]) expect(casas(v)).toBeLessThanOrEqual(3)
  expect(envelope.cena.regioes.length).toBe(2)
})
