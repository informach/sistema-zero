import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { Box3, LoopOnce, Vector3 } from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { colisoresDaFesta, PECAS_DAS_FESTAS } from '../src/mundo/arranjo-da-festa'
import { iluminarArte } from '../src/mundo/arte-animada'
import {
  copiarPecaDaFesta,
  emendasDoVaral,
  luzDaFesta,
  soltarCatalogo,
} from '../src/mundo/catalogo-da-festa'
import { lerColisores } from '../src/mundo/colisores-da-ilha'
import {
  CALENDARIO_DAS_FESTAS,
  carnavalDoAno,
  chaveDoAvisoDaFesta,
  type Festa,
  festaDoDia,
  lerFesta,
  pascoaDoAno,
} from '../src/sistemas/festas'
import { ITENS } from '../src/sistemas/itens'
import { comer } from '../src/sistemas/necessidades'
import { cozinhar, receitaPeloId } from '../src/sistemas/receitas'
import {
  arquivoDaIlha,
  bate,
  CENTRO_DO_CORPO,
  carregarGlb,
  type Forma,
  TAMPO,
} from './ajuda-colisores'

async function catalogo(festa: Festa) {
  const b = readFileSync(join(import.meta.dir, '../src/assets/festas', `${festa}.glb`))
  return new GLTFLoader().parseAsync(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength), '')
}

describe('calendário civil de São Paulo', () => {
  test('Páscoa e Carnaval, inclusive exceções do computus', () => {
    for (const [ano, pascoa, carnaval] of [
      [2024, '03-31', '02-13'],
      [2025, '04-20', '03-04'],
      [2026, '04-05', '02-17'],
      [2027, '03-28', '02-09'],
      [2038, '04-25', '03-09'],
      [2000, '04-23', '03-07'],
    ] as const) {
      expect(pascoaDoAno(ano)).toBe(`${ano}-${pascoa}`)
      expect(carnavalDoAno(ano)).toBe(`${ano}-${carnaval}`)
      expect(festaDoDia(new Date(`${ano}-${carnaval}T12:00:00Z`))).toBe('carnaval')
    }
    expect(() => pascoaDoAno(1500)).toThrow()
    expect(() => pascoaDoAno(Number.NaN)).toThrow()
  })
  test('começo e fim de junho são locais, não UTC; calendário desconhecido não ativa festa', () => {
    expect(festaDoDia(new Date('2026-06-01T02:59:59Z'))).toBeNull()
    expect(festaDoDia(new Date('2026-06-01T03:00:00Z'))).toBe('junina')
    expect(festaDoDia(new Date('2026-07-01T02:59:59Z'))).toBe('junina')
    expect(festaDoDia(new Date('2026-07-01T03:00:00Z'))).toBeNull()
    expect(festaDoDia(new Date('invalid'))).toBeNull()
    for (const data of ['2026-12-20', '2026-12-31', '2027-01-06', '2026-08-15'])
      expect(festaDoDia(new Date(`${data}T12:00:00Z`))).toBeNull()
    expect(CALENDARIO_DAS_FESTAS['fim-de-ano'].aprovada).toBe(false)
    expect(CALENDARIO_DAS_FESTAS.lanternas.data).toBeNull()
  })
  test('override só aceita os quatro nomes e avisos separam perfis e festas', () => {
    expect(lerFesta('toString')).toBeNull()
    expect(lerFesta('lanternas')).toBe('lanternas')
    expect(chaveDoAvisoDaFesta('a', 'junina')).not.toBe(chaveDoAvisoDaFesta('b', 'junina'))
    expect(chaveDoAvisoDaFesta('a', 'junina')).not.toBe(chaveDoAvisoDaFesta('a', 'carnaval'))
  })
})

test('pipoca usa milho e repõe diversão pelo sistema existente, sem expirar', () => {
  const r = receitaPeloId('pipoca-de-festa')
  expect(r?.onde).toBe('fogueira')
  if (!r) throw Error('Receita ausente')
  expect(cozinhar({}, r)).toBeNull()
  expect(cozinhar({ milho: 2, 'pipoca-de-festa': 1 }, r)).toEqual({
    milho: 1,
    'pipoca-de-festa': 2,
  })
  const item = ITENS['pipoca-de-festa']
  if (!item) throw Error('Item ausente')
  expect(comer({ fome: 30, energia: 40, diversao: 20 }, item)).toEqual({
    fome: 45,
    energia: 40,
    diversao: 50,
  })
  expect(comer({ fome: 100, energia: 100, diversao: 90 }, item).diversao).toBe(100)
})

for (const festa of Object.keys(PECAS_DAS_FESTAS) as Festa[]) {
  test(`${festa}: cópias só dos nós escolhidos, luz noturna, clipes e descarte próprios`, async () => {
    const g = await catalogo(festa)
    for (const p of PECAS_DAS_FESTAS[festa]) {
      const copia = copiarPecaDaFesta(g.scene, g.animations, p)
      expect(copia.raiz.children[0]?.children.length).toBe(p.nos.length)
      const original = g.scene.getObjectByName(p.nos[0] ?? '')?.position.clone()
      copia.mixer.update(0.3)
      expect(
        g.scene.getObjectByName(p.nos[0] ?? '')?.position.equals(original ?? new Vector3()),
      ).toBe(true)
      iluminarArte(copia.luzes, false)
      expect(copia.luzes.every((l) => l.material.emissiveIntensity === 0)).toBe(true)
      iluminarArte(copia.luzes, true)
      expect(copia.luzes.every((l) => l.material.emissiveIntensity === l.forca)).toBe(true)
      if (p.clipe === 'estourar') {
        const acao = copia.mixer.existingAction(g.animations[0]!)
        expect(acao?.loop).toBe(LoopOnce)
        expect(acao?.clampWhenFinished).toBe(true)
        copia.mixer.update(10)
        expect(acao?.paused).toBe(true)
      }
      let descartados = 0
      for (const l of copia.luzes) l.material.addEventListener('dispose', () => descartados++)
      copia.soltar()
      expect(descartados).toBe(copia.luzes.length)
    }
    soltarCatalogo(g.scene)
    expect(luzDaFesta('fogo')).toBe(true)
    expect(luzDaFesta('madeira')).toBe(false)
  })
  test(`${festa}: peças sólidas não ocupam os colisores, chegada, lojas ou percurso`, async () => {
    const vila = await carregarGlb(arquivoDaIlha('vila-doce.glb'))
    const existentes = lerColisores(vila).filter((c): c is Forma => c.forma !== 'malha')
    const novos = colisoresDaFesta(festa).filter((c): c is Forma => c.forma !== 'malha')
    for (const p of PECAS_DAS_FESTAS[festa]) {
      if (!p.caixa) continue
      for (const dx of [-p.caixa[0], 0, p.caixa[0]])
        for (const dz of [-p.caixa[2], 0, p.caixa[2]]) {
          const ponto = new Vector3(p.posicao[0] + dx, TAMPO + CENTRO_DO_CORPO, p.posicao[2] + dz)
          expect(existentes.filter((c) => bate(c, ponto)).map((c) => c.nome)).toEqual([])
          expect(Math.hypot(ponto.x, ponto.z)).toBeLessThan(12.8)
        }
    }
    for (const nome of [
      'chegada',
      'morador',
      'padaria',
      'sorveteria',
      ...Array.from({ length: 6 }, (_, i) => `barraca-${i + 1}`),
      ...['inicio', '1', '2', '3', 'fim'].map((i) => `telhados-${i}`),
      ...Array.from({ length: 4 }, (_, i) => `lumi-${i + 1}`),
    ]) {
      const ponto = vila.getObjectByName(nome)!.position.clone()
      ponto.y += CENTRO_DO_CORPO
      expect(novos.some((c) => bate(c, ponto))).toBe(false)
    }
    for (let x = 2.4; x <= 11.6; x += 0.25)
      expect(novos.some((c) => bate(c, new Vector3(x, TAMPO + CENTRO_DO_CORPO, 0)))).toBe(false)
    if (festa === 'junina') {
      // A aproximação pelo leste evita a barraca permanente e a árvore ao sul da fogueira.
      for (let z = 6; z <= 7; z += 0.1)
        expect(
          [...existentes, ...novos].some((c) =>
            bate(c, new Vector3(8.5, TAMPO + CENTRO_DO_CORPO, z)),
          ),
        ).toBe(false)
    }
    for (const z of [8.3, 10.5])
      for (let x = -0.5; x <= 4; x += 0.25)
        expect(novos.some((c) => bate(c, new Vector3(x, TAMPO + CENTRO_DO_CORPO, z)))).toBe(false)
  })
}

test('as bandeirinhas emendam exatamente pelas pontas reais, sem deslocar o catálogo', async () => {
  for (const festa of ['junina', 'lanternas'] as const) {
    const g = await catalogo(festa),
      p = PECAS_DAS_FESTAS[festa].find((p) => p.varal)!
    const emendas = emendasDoVaral(g.scene, p)
    const base = g.scene.getObjectByName(p.nos[0]!)!.position
    const esq = g.scene.getObjectByName('ponta-esq')!.position.clone().sub(base)
    const dir = g.scene.getObjectByName('ponta-dir')!.position.clone().sub(base)
    for (let i = 1; i < emendas.length; i++)
      expect(
        dir
          .clone()
          .add(new Vector3(...emendas[i - 1]!.posicao))
          .distanceTo(esq.clone().add(new Vector3(...emendas[i]!.posicao))),
      ).toBeLessThan(0.00001)
    const copia = copiarPecaDaFesta(g.scene, g.animations, emendas[0]!)
    expect(new Box3().setFromObject(copia.raiz).min.y).toBeGreaterThan(3.5)
    copia.soltar()
    soltarCatalogo(g.scene)
  }
})
