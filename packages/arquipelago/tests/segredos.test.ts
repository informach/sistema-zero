import { describe, expect, test } from 'bun:test'
import { join } from 'node:path'
import {
  BIT_DA_SEGREDO_MAXIMO,
  criarSalvamentoInicial,
  ILHAS,
  POSTOS_DA_JORNADA,
} from '@sistemazero/arquipelago-contracts'
import { type Mesh, Raycaster, Vector3 } from 'three'
import {
  COLISORES_DO_FAROL,
  COLISORES_DO_PIER,
  colisoresDaCasa,
  colisoresDasArvores,
  deslocar,
  GRUPOS,
} from '../src/mundo/colisao-da-ilha-central'
import { lerColisores } from '../src/mundo/colisores-da-ilha'
import {
  CHAO_DO_SEGREDO_NO_MODELO,
  peDoSegredo,
  ventoDoSegredo,
} from '../src/mundo/lugares-dos-segredos'
import { GRAVIDADE, ilhasEmVolta, NIVEL_DA_AGUA } from '../src/mundo/medidas'
import { segredosDoAlbum } from '../src/sistemas/album'
import { CHAVES_DA_CASA } from '../src/sistemas/chaves-da-casa'
import { alturaDoPulo, CORPO } from '../src/sistemas/corpo'
import { naColunaDaCorrente, subidaDaCorrente } from '../src/sistemas/planador'
import {
  ALCANCE_DO_BAU,
  abrirSegredo,
  falaDoSegredo,
  falaDoVento,
  PAGINA_EXTRA,
  paginasExtras,
  SEGREDOS,
  segredoAchado,
  TODOS_OS_SEGREDOS,
  VENTO_DO_SEGREDO,
} from '../src/sistemas/segredos'
import { arquivoDaIlha, bate, carregarGlb, type Forma } from './ajuda-colisores'

const AGORA = new Date('2026-10-30T12:00:00Z')
const formas = (lista: ReturnType<typeof lerColisores>) =>
  lista.filter((k): k is Forma => k.forma !== 'malha')

/** A coluna do vento e o lugar do baú livres: o centro e uma volta no raio, até o alto. */
function colunaLivre(pe: { x: number; y: number; z: number }, solidos: readonly Forma[]) {
  const { corrente, bau } = ventoDoSegredo(SEGREDOS[0]!, pe)
  const batidas = new Set<string>()
  const pontos: Vector3[] = [new Vector3(bau.x, bau.y, bau.z)]
  for (let h = 0.4; h <= corrente.topo - pe.y + 0.6; h += 0.4) {
    pontos.push(new Vector3(pe.x, pe.y + h, pe.z))
    for (let a = 0; a < 8; a++)
      pontos.push(
        new Vector3(
          pe.x + Math.cos((a * Math.PI) / 4) * corrente.raio,
          pe.y + h,
          pe.z + Math.sin((a * Math.PI) / 4) * corrente.raio,
        ),
      )
  }
  for (const p of pontos) for (const f of solidos) if (bate(f, p)) batidas.add(f.nome)
  return [...batidas]
}

describe('os segredos das ilhas (N12)', () => {
  test('um por ilha antes do Pico, com bit próprio', () => {
    const postoDoPico = ILHAS.find((i) => i.id === 'pico')?.posto
    const ordem = (posto: string | undefined) =>
      (POSTOS_DA_JORNADA as readonly string[]).indexOf(posto ?? '')
    expect(new Set(SEGREDOS.map((s) => s.bit)).size).toBe(SEGREDOS.length)
    for (const s of SEGREDOS) {
      expect(s.bit).toBeLessThanOrEqual(BIT_DA_SEGREDO_MAXIMO)
      const posto = ILHAS.find((i) => i.id === s.ilha)?.posto
      expect(ordem(posto)).toBeLessThan(ordem(postoDoPico))
    }
    expect(SEGREDOS.map((s) => s.ilha)).toEqual(['sua-ilha', 'bosque', 'vila-doce', 'recife'])
  })

  test('abrir o baú guarda o bit uma vez só, sem item de coleção', () => {
    const s = criarSalvamentoInicial(AGORA)
    const g = SEGREDOS[1]!
    const um = abrirSegredo(s, g)
    expect(segredoAchado(um.segredos, g)).toBe(true)
    expect(um.inventario).toEqual(s.inventario)
    expect(abrirSegredo(um, g)).toBe(um)
    // Os quatro do vento e, desde 31/10/2026 (B11), os cinco dos outros movimentos.
    expect(segredosDoAlbum(um).conta).toMatchObject({ tem: 1, total: 9 })
  })

  test('sem planador o pulo não chega; com ele, o vento leva até o baú', () => {
    const pe = { x: 0, y: 1, z: 0 }
    const { corrente, bau } = ventoDoSegredo(SEGREDOS[0]!, pe)
    const noAltoDoPulo = {
      x: pe.x,
      y: pe.y + CORPO.doCentroAoPe + alturaDoPulo(GRAVIDADE),
      z: pe.z,
    }
    expect(
      Math.hypot(bau.x - noAltoDoPulo.x, bau.y - noAltoDoPulo.y, bau.z - noAltoDoPulo.z),
    ).toBeGreaterThan(ALCANCE_DO_BAU + 1)
    // No alto do vento (o pé do corpo para perto do topo), o baú fica ao alcance.
    const noTopo = { x: pe.x, y: corrente.topo - 0.3 + CORPO.doCentroAoPe, z: pe.z }
    expect(naColunaDaCorrente([corrente], noTopo.x, noTopo.y, noTopo.z)).toBe(true)
    expect(subidaDaCorrente([corrente], pe.x, pe.y + 1, pe.z)).toBeGreaterThan(0)
    expect(Math.hypot(bau.x - noTopo.x, bau.y - noTopo.y, bau.z - noTopo.z)).toBeLessThanOrEqual(
      ALCANCE_DO_BAU,
    )
  })

  test('as falas seguem as regras dos textos da criança', () => {
    for (const t of [...SEGREDOS.map(falaDoSegredo), falaDoVento(true), falaDoVento(false)]) {
      expect(t).not.toContain('—')
      expect(t).not.toContain('!')
      expect(t.trimStart().startsWith('Por que')).toBe(false)
    }
  })

  test('na sua ilha: coluna livre, em terra, longe das pontes, das chaves e do lote', async () => {
    const terreno = await carregarGlb(
      join(import.meta.dir, '..', 'src', 'assets', 'mundo', 'terreno.glb'),
    )
    terreno.updateMatrixWorld(true)
    const solidos: Forma[] = [
      ...deslocar(colisoresDaCasa(true), GRUPOS.casa),
      ...deslocar(COLISORES_DO_FAROL, GRUPOS.farol),
      ...deslocar(COLISORES_DO_PIER, GRUPOS.pier),
      ...colisoresDasArvores(),
      ...formas(lerColisores(terreno)),
    ]
    const g = SEGREDOS[0]!
    const pe = peDoSegredo(g)
    expect(pe.y).toBeGreaterThan(NIVEL_DA_AGUA + 0.3)
    expect(colunaLivre(pe, solidos)).toEqual([])
    for (const { centro } of ilhasEmVolta()) {
      const r = Math.hypot(centro.x, centro.z)
      const t = Math.max(0, (pe.x * centro.x + pe.z * centro.z) / (r * r))
      expect(Math.hypot(pe.x - centro.x * t, pe.z - centro.z * t)).toBeGreaterThan(4)
    }
    for (const c of CHAVES_DA_CASA) expect(Math.hypot(c.x - pe.x, c.z - pe.z)).toBeGreaterThan(4)
  }, 120_000)

  for (const g of SEGREDOS.filter((s) => s.ilha !== 'sua-ilha')) {
    test(`no modelo de ${g.ilha}: chão a 1 m, sem teto e a coluna livre`, async () => {
      const raiz = await carregarGlb(arquivoDaIlha(`${g.ilha}.glb`))
      raiz.updateMatrixWorld(true)
      const terreno = raiz.getObjectByName('col-terreno') as Mesh
      const ray = new Raycaster()
      ray.set(new Vector3(g.x, 40, g.z), new Vector3(0, -1, 0))
      const chao = ray.intersectObject(terreno, false)[0]?.point.y
      expect(chao).toBeCloseTo(CHAO_DO_SEGREDO_NO_MODELO, 1)
      ray.set(new Vector3(g.x, CHAO_DO_SEGREDO_NO_MODELO + 0.2, g.z), new Vector3(0, 1, 0))
      expect(ray.intersectObject(terreno, false)).toHaveLength(0)
      const pe = { x: g.x, y: CHAO_DO_SEGREDO_NO_MODELO, z: g.z }
      expect(colunaLivre(pe, formas(lerColisores(raiz)))).toEqual([])
      expect(VENTO_DO_SEGREDO.altura).toBeGreaterThan(5)
    }, 120_000)
  }
})

describe('as páginas extras dos baús (§6.28, A39)', () => {
  test('cada baú guarda uma página, que aparece só depois de aberto', () => {
    const fechadas = paginasExtras(0)
    expect(fechadas.map((p) => p.id)).toEqual(TODOS_OS_SEGREDOS.map((s) => s.id))
    expect(fechadas.every((p) => !p.achada && p.texto === null)).toBe(true)
    const umaAberta = paginasExtras(SEGREDOS[1]?.bit ?? 0)
    expect(umaAberta.filter((p) => p.achada).map((p) => p.id)).toEqual(['bosque'])
    expect(umaAberta[1]?.texto).toBe(PAGINA_EXTRA.bosque)
  })

  test('os textos seguem as regras da criança e não contam o final', () => {
    for (const texto of [...Object.values(PAGINA_EXTRA), ...SEGREDOS.map(falaDoSegredo)]) {
      expect(texto).not.toMatch(/[—!]/)
      expect(texto.trim()[0]).not.toBe('¿')
      expect(texto).not.toMatch(/^\s*(Por que|Como|Onde|Quando|Quem|O que)\b/)
      expect(texto).not.toMatch(/Cinza|faísca/i)
    }
  })
})
