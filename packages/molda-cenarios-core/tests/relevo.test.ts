import { describe, expect, test } from 'bun:test'
import {
  celulasDoNo,
  distanciaAoNo,
  type FormaDoRelevo,
  type NoDoRelevo,
  nivelMaximoDoRelevo,
  passoDoTerreno,
  relevoCabeNoEstudio,
  selecionarNosDoRelevo,
} from '../src/compilar/relevo'

/** O relevo em pedaços (plano "Mundos de 2 km", lote 1, 23/11/2026). */

function sorteador(semente: number) {
  return () => {
    semente = (semente * 1103515245 + 12345) % 2147483648
    return semente / 2147483648
  }
}

const MUNDO_2KM: FormaDoRelevo = {
  origem: { x: -1024, z: -1024 },
  passo: 2,
  colunas: 1024,
  linhas: 1024,
}
const MUNDO_384: FormaDoRelevo = {
  origem: { x: -192, z: -192 },
  passo: 1,
  colunas: 384,
  linhas: 384,
}
const MUNDO_LARGO: FormaDoRelevo = { origem: { x: 0, z: 0 }, passo: 2, colunas: 1024, linhas: 320 }

/** Cada célula da grade coberta exatamente uma vez. */
function conferirCobertura(forma: FormaDoRelevo, nos: NoDoRelevo[], celulasPorNo: number) {
  const vezes = new Uint8Array(forma.colunas * forma.linhas)
  for (const n of nos) {
    const c = celulasDoNo(forma, n, celulasPorNo)
    for (let z = c.z0; z < c.z1; z++)
      for (let x = c.x0; x < c.x1; x++) vezes[z * forma.colunas + x]!++
  }
  const erradas = vezes.filter((v) => v !== 1).length
  return erradas
}

/** O maior salto de nível entre dois pedaços que dividem uma aresta. */
function maiorSalto(forma: FormaDoRelevo, nos: NoDoRelevo[], celulasPorNo: number) {
  const nivelDa = new Int8Array(forma.colunas * forma.linhas).fill(-1)
  for (const n of nos) {
    const c = celulasDoNo(forma, n, celulasPorNo)
    for (let z = c.z0; z < c.z1; z++)
      for (let x = c.x0; x < c.x1; x++) nivelDa[z * forma.colunas + x] = n.nivel
  }
  let maior = 0
  for (let z = 0; z < forma.linhas; z++)
    for (let x = 0; x < forma.colunas; x++) {
      const aqui = nivelDa[z * forma.colunas + x]!
      if (x + 1 < forma.colunas)
        maior = Math.max(maior, Math.abs(aqui - nivelDa[z * forma.colunas + x + 1]!))
      if (z + 1 < forma.linhas)
        maior = Math.max(maior, Math.abs(aqui - nivelDa[(z + 1) * forma.colunas + x]!))
    }
  return maior
}

describe('o espaçamento da grade', () => {
  test('1 m até 1 km, 2 m até 2 km, 4 m até 4 km, 8 m até 8 km', () => {
    expect(passoDoTerreno(384)).toBe(1)
    expect(passoDoTerreno(1024)).toBe(1)
    expect(passoDoTerreno(1024.5)).toBe(2)
    expect(passoDoTerreno(2048)).toBe(2)
    expect(passoDoTerreno(2049)).toBe(4)
    expect(passoDoTerreno(4096)).toBe(4)
    expect(passoDoTerreno(8192)).toBe(8)
    expect(() => passoDoTerreno(8193)).toThrow('O mundo passa de 8 km de lado.')
    expect(() => passoDoTerreno(0)).toThrow('O tamanho do mundo é inválido.')
  })

  test('o relevo cabe no Estúdio até 1088 × 1088 células (as alturas num arquivo de 5 MiB)', () => {
    expect(relevoCabeNoEstudio(1024, 1024)).toBe(true)
    expect(relevoCabeNoEstudio(1088, 1088)).toBe(true)
    expect(relevoCabeNoEstudio(1152, 1152)).toBe(false)
    expect(relevoCabeNoEstudio(2048, 256)).toBe(true)
  })

  test('o nível mais alto cobre a grade inteira', () => {
    expect(nivelMaximoDoRelevo(MUNDO_2KM, 32)).toBe(5)
    expect(nivelMaximoDoRelevo(MUNDO_384, 32)).toBe(4)
    expect(nivelMaximoDoRelevo({ ...MUNDO_384, colunas: 32, linhas: 32 }, 32)).toBe(0)
  })
})

describe('a escolha dos pedaços', () => {
  const sorteio = sorteador(5)
  const casos = Array.from({ length: 40 }, (_, i) => {
    const forma = [MUNDO_2KM, MUNDO_384, MUNDO_LARGO][i % 3]!
    const largura = forma.colunas * forma.passo,
      fundo = forma.linhas * forma.passo
    return {
      forma,
      foco: {
        x: forma.origem.x - 50 + sorteio() * (largura + 100),
        z: forma.origem.z - 50 + sorteio() * (fundo + 100),
      },
      celulasPorNo: [16, 32, 64][i % 3]!,
      fator: [0.6, 1, 1.5, 2.5][i % 4]!,
    }
  })

  test('cobrem a grade sem buraco nem sobreposição, e vizinhos têm no máximo um nível de diferença', () => {
    for (const [i, c] of casos.entries()) {
      const nos = selecionarNosDoRelevo(c.forma, c.foco, {
        celulasPorNo: c.celulasPorNo,
        fator: c.fator,
        alcance: Number.POSITIVE_INFINITY,
        maximoDeNos: 400,
      })
      expect(conferirCobertura(c.forma, nos, c.celulasPorNo), `caso ${i}`).toBe(0)
      expect(maiorSalto(c.forma, nos, c.celulasPorNo), `caso ${i}`).toBeLessThanOrEqual(1)
      expect(nos.length, `caso ${i}`).toBeLessThanOrEqual(400)
    }
  })

  test('o pedaço do foco tem o detalhe máximo, e o detalhe cai com a distância', () => {
    const foco = { x: 100, z: -300 }
    const nos = selecionarNosDoRelevo(MUNDO_2KM, foco, {
      celulasPorNo: 32,
      fator: 1.5,
      alcance: Number.POSITIVE_INFINITY,
      maximoDeNos: 400,
    })
    expect(nos[0]).toMatchObject({ nivel: 0 })
    // O primeiro da lista contém o foco.
    const c = celulasDoNo(MUNDO_2KM, nos[0]!, 32)
    expect(MUNDO_2KM.origem.x + c.x0 * 2).toBeLessThanOrEqual(foco.x)
    expect(MUNDO_2KM.origem.x + c.x1 * 2).toBeGreaterThanOrEqual(foco.x)
    expect(Math.max(...nos.map((n) => n.nivel))).toBeGreaterThanOrEqual(3)
    // Longe, o detalhe cai: além de 600 m, todo pedaço tem pelo menos o nível 2.
    const longe = nos.filter((n) => distanciaAoNo(MUNDO_2KM, n, 32, foco) > 600)
    expect(longe.length).toBeGreaterThan(0)
    expect(longe.every((n) => n.nivel >= 2)).toBe(true)
  })

  test('o teto vale, e com ele o detalhe cai em todo o mundo (a árvore segue equilibrada)', () => {
    for (const maximo of [1, 4, 16, 40]) {
      const nos = selecionarNosDoRelevo(
        MUNDO_2KM,
        { x: 3, z: 7 },
        {
          celulasPorNo: 32,
          fator: 3,
          alcance: Number.POSITIVE_INFINITY,
          maximoDeNos: maximo,
        },
      )
      expect(nos.length).toBeLessThanOrEqual(maximo)
      expect(conferirCobertura(MUNDO_2KM, nos, 32)).toBe(0)
      expect(maiorSalto(MUNDO_2KM, nos, 32)).toBeLessThanOrEqual(1)
    }
  })

  test('o alcance tira só o que está longe', () => {
    const tudo = selecionarNosDoRelevo(
      MUNDO_2KM,
      { x: -900, z: -900 },
      {
        celulasPorNo: 32,
        fator: 1.5,
        alcance: Number.POSITIVE_INFINITY,
        maximoDeNos: 400,
      },
    )
    const perto = selecionarNosDoRelevo(
      MUNDO_2KM,
      { x: -900, z: -900 },
      {
        celulasPorNo: 32,
        fator: 1.5,
        alcance: 600,
        maximoDeNos: 400,
      },
    )
    expect(perto.length).toBeLessThan(tudo.length)
    expect(perto).toEqual(tudo.slice(0, perto.length))
  })

  test('recusa opções inválidas', () => {
    const base = { celulasPorNo: 32, fator: 1, alcance: 100, maximoDeNos: 10 }
    expect(() =>
      selecionarNosDoRelevo(MUNDO_384, { x: 0, z: 0 }, { ...base, celulasPorNo: 0 }),
    ).toThrow()
    expect(() =>
      selecionarNosDoRelevo(MUNDO_384, { x: 0, z: 0 }, { ...base, maximoDeNos: 0 }),
    ).toThrow()
  })
})

describe('o detalhe forçado perto dos caminhos', () => {
  test('a área de detalhe perto do foco desce ao nível 0; longe do foco, não', () => {
    const caixa = { x0: 400, z0: -20, x1: 900, z1: 20 }
    const opcoes = {
      celulasPorNo: 32,
      fator: 1,
      alcance: Number.POSITIVE_INFINITY,
      maximoDeNos: 400,
      detalhe: { caixas: [caixa], alcance: 300 },
    }
    const nos = selecionarNosDoRelevo(MUNDO_2KM, { x: 350, z: 0 }, opcoes)
    const tocam = (n: NoDoRelevo) => {
      const c = celulasDoNo(MUNDO_2KM, n, 32)
      const x0 = -1024 + c.x0 * 2,
        x1 = -1024 + c.x1 * 2,
        z0 = -1024 + c.z0 * 2,
        z1 = -1024 + c.z1 * 2
      return caixa.x0 <= x1 && caixa.x1 >= x0 && caixa.z0 <= z1 && caixa.z1 >= z0
    }
    const perto = nos.filter(
      (n) => tocam(n) && distanciaAoNo(MUNDO_2KM, n, 32, { x: 350, z: 0 }) < 300,
    )
    expect(perto.length).toBeGreaterThan(0)
    expect(perto.every((n) => n.nivel === 0)).toBe(true)
    // Sem a área, o mesmo trecho fica mais grosso.
    const sem = selecionarNosDoRelevo(
      MUNDO_2KM,
      { x: 350, z: 0 },
      { ...opcoes, detalhe: undefined },
    )
    expect(sem.filter(tocam).some((n) => n.nivel > 0)).toBe(true)
    expect(conferirCobertura(MUNDO_2KM, nos, 32)).toBe(0)
    expect(maiorSalto(MUNDO_2KM, nos, 32)).toBeLessThanOrEqual(1)
  })
})
