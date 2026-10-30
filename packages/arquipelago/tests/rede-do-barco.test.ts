import { expect, test } from 'bun:test'
import { readFile } from 'node:fs/promises'
import { ilha, ilhaAberta } from '@sistemazero/arquipelago-contracts'
import { fonteDosPortos } from '../scripts/gerar-portos'
import {
  centroNoAnel,
  giroDaIlha,
  ilhasEmVolta,
  rodasDaIlhaNoModelo,
  trajetoDaPonte,
} from '../src/mundo/medidas'
import { PORTOS_DA_ARTE } from '../src/mundo/portos-da-arte'
import {
  amostrarRota,
  BARCO,
  criarTravessia,
  embarcar,
  type PortoId,
  passoDaTravessia,
} from '../src/sistemas/barco'
import {
  caisPronto,
  destinosDoPorto,
  LIGACOES_DO_BARCO,
  ligacaoAberta,
  portoDoPainel,
} from '../src/sistemas/rede-do-barco'

export function viagemEntre(a: PortoId, b: PortoId) {
  const centro = (id: PortoId) => (id === 'sua-ilha' ? null : { ...centroNoAnel(ilha(id)), y: 0 })
  return criarTravessia(
    [PORTOS_DA_ARTE[a], PORTOS_DA_ARTE[b]],
    { x: 1, y: 0.5, z: 0 },
    [centro(a), centro(b)],
    [a, b],
  )
}

test('âncoras preparadas são exatamente as dos GLBs; porto das Nuvens está na água', async () => {
  expect(await readFile(new URL('../src/mundo/portos-da-arte.json', import.meta.url), 'utf8')).toBe(
    await fonteDosPortos(),
  )
  expect(Object.keys(PORTOS_DA_ARTE)).toHaveLength(7)
  for (const porto of Object.values(PORTOS_DA_ARTE)) expect(porto.barco.y).toBeCloseTo(0, 3)
  expect(PORTOS_DA_ARTE.nuvens.embarque.y).toBeCloseTo(0.89, 2)
})

test('sete ligações bidirecionais, somente vizinhas e central a Recife, sem pular jornada', () => {
  expect(LIGACOES_DO_BARCO).toHaveLength(7)
  for (let jornada = 1; jornada <= 8; jornada++)
    for (const [origem, destino] of LIGACOES_DO_BARCO) {
      const pode =
        ilhaAberta('recife', jornada) && ilhaAberta(origem, jornada) && ilhaAberta(destino, jornada)
      expect(ligacaoAberta(origem, destino, jornada)).toBe(pode)
      expect(destinosDoPorto(destino, jornada).includes(origem)).toBe(pode)
    }
  expect(ligacaoAberta('bosque', 'pico', 8)).toBe(false)
  expect(destinosDoPorto('sua-ilha', 8)).toEqual(['recife'])
  expect(new Set(destinosDoPorto('recife', 8))).toEqual(new Set(['sua-ilha', 'vila-doce', 'pico']))
  expect(portoDoPainel('barco:nuvens')).toBe('nuvens')
  expect(portoDoPainel('barco:farol')).toBeNull()
  expect(caisPronto('farol', new Set())).toBe(false)
})

for (const [a, b] of LIGACOES_DO_BARCO) {
  test(`${a} a ${b}: ida e volta, pausa e espera genérica dos dois cais`, () => {
    const v = viagemEntre(a, b)
    v.prontos = [true, true]
    for (const origem of [0, 1] as const) {
      embarcar(v, origem, v.portos[origem].embarque)
      const antes = JSON.stringify(v)
      passoDaTravessia(v, 1 / 60, true)
      expect(JSON.stringify(v)).toBe(antes)
      let n = 0
      while (v.fase !== 'atracado' && n++ < 18000) {
        const giroAnterior = v.pose.giro
        passoDaTravessia(v, 1 / 60, false)
        const giro = v.pose.giro - giroAnterior
        const perto = Math.min(v.distancia, v.rota.comprimento - v.distancia) <= BARCO.manobra
        if (perto) expect(Math.abs(Math.atan2(Math.sin(giro), Math.cos(giro)))).toBeLessThan(0.15)
        else {
          const esperado = { x: 0, y: 0, z: 0, giro: 0 }
          amostrarRota(v.rota, v.distancia, esperado)
          const diferenca = v.pose.giro - esperado.giro - (v.destino === 0 ? Math.PI : 0)
          // Fora da manobra, o barco segue a curva, sem extrapolar o alinhamento do cais.
          expect(Math.cos(diferenca)).toBeCloseTo(1, 8)
        }
      }
      expect(v.fase).toBe('atracado')
      expect(v.devolvendo).toBe(false)
      for (const eixo of ['x', 'y', 'z'] as const)
        expect(v.pe[eixo]).toBeCloseTo(v.portos[v.destino].embarque[eixo], 6)
    }
    // Falha no destino devolve à origem, sem trocar de destino de novo.
    embarcar(v, 0, v.portos[0].embarque)
    v.prontos = [true, false]
    let n = 0
    while (v.fase !== 'espera' && n++ < 18000) passoDaTravessia(v, 1 / 60, false)
    expect(v.fase).toBe('espera')
    expect(Math.hypot(v.pose.x - v.centros[1]!.x, v.pose.z - v.centros[1]!.z)).toBeGreaterThan(
      BARCO.esperaDaIlha - 0.3,
    )
    while (v.fase !== 'atracado' && n++ < 36000) passoDaTravessia(v, 1 / 60, false)
    expect(v.fase).toBe('atracado')
    expect(v.devolvendo).toBe(true)
    for (const eixo of ['x', 'y', 'z'] as const)
      expect(v.pe[eixo]).toBeCloseTo(v.portos[0].embarque[eixo], 6)
  })
  test(`${a} a ${b}: curva longe das pontes e de outras ilhas`, () => {
    const v = viagemEntre(a, b)
    const pontes = ilhasEmVolta().flatMap(({ ilha }) => trajetoDaPonte(ilha, 100))
    const rodas = ilhasEmVolta()
      .filter(({ ilha }) => ilha.id !== a && ilha.id !== b)
      .flatMap(({ ilha, centro }) => {
        const giro = giroDaIlha(ilha)
        return rodasDaIlhaNoModelo(ilha, 19).map((roda) => ({
          x: centro.x + roda.x * Math.cos(giro) + roda.z * Math.sin(giro),
          z: centro.z - roda.x * Math.sin(giro) + roda.z * Math.cos(giro),
          raio: roda.livre,
        }))
      })
    let menorPonte = Infinity,
      menorFolga = Infinity
    // Mesma malha de amostras, agregada: não criar milhões de objetos de asserção no ensaio.
    for (const p of v.rota.pontos) {
      for (const tabua of pontes)
        menorPonte = Math.min(menorPonte, Math.hypot(p.x - tabua.x, p.z - tabua.z))
      for (const roda of rodas)
        menorFolga = Math.min(menorFolga, Math.hypot(p.x - roda.x, p.z - roda.z) - roda.raio)
    }
    expect(menorPonte).toBeGreaterThan(4.5)
    expect(menorFolga).toBeGreaterThan(2.8)
  })
}

test('falha também no porto de retorno fica em segurança, sem alternar destinos', () => {
  const v = viagemEntre('bosque', 'vila-doce')
  embarcar(v, 0, v.portos[0].embarque)
  v.prontos = [false, false]
  for (let i = 0; i < 30000; i++) passoDaTravessia(v, 1 / 60, false)
  expect(v.fase).toBe('espera')
  expect(v.destino).toBe(0)
  expect(v.devolvendo).toBe(true)
  expect(v.pe.y).toBeGreaterThan(0)
})
