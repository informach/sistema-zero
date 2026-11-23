import { describe, expect, test } from 'bun:test'
import { CELULAS_DA_PECA, malhaDeGradeNaPeca } from '@sistemazero/molda-cenarios-core/v2'
import { Box3, BufferAttribute, BufferGeometry, Matrix4, Vector3 } from 'three'
import {
  type CampoDeColisao,
  conferirCampo,
  limitesDoCampo,
  paraCadaTrianguloNaCaixa,
  rastrearNoCampo,
} from '../src/teste/campo'
import { MundoDoTeste } from '../src/teste/colisoes'

/**
 * A colisão pelo campo de alturas (plano "Mundos de 2 km", lote 1, 23/11/2026) precisa dar o
 * MESMO que a colisão de hoje, que lê as malhas do chão (`colisoes/chao-*.glb`, feitas por
 * `malhaDeGradeNaPeca`) por árvore (BVH): mesmos contatos, mesma normal, mesmos triângulos.
 */

function sorteador(semente: number) {
  return () => {
    semente = (semente * 1103515245 + 12345) % 2147483648
    return semente / 2147483648
  }
}

/** Um relevo de 128 × 128 células (2 × 2 peças), passo 2 m, com morros, degraus e buracos. */
function campoDeTeste(): CampoDeColisao {
  const colunas = 2 * CELULAS_DA_PECA,
    linhas = 2 * CELULAS_DA_PECA,
    sorteio = sorteador(11),
    alturas = new Float32Array((colunas + 1) * (linhas + 1)),
    buracos = new Uint8Array(colunas * linhas)
  for (let z = 0; z <= linhas; z++)
    for (let x = 0; x <= colunas; x++)
      alturas[z * (colunas + 1) + x] =
        8 * Math.sin(x / 9) * Math.cos(z / 13) + (x > 70 && x < 80 ? 3 : 0) + sorteio() * 0.6
  for (let i = 0; i < 60; i++)
    buracos[Math.floor(sorteio() * linhas) * colunas + Math.floor(sorteio() * colunas)] = 1
  return { origem: { x: -100, z: -60 }, passo: 2, colunas, linhas, alturas, buracos }
}

/** A colisão de hoje: uma malha de chão por peça, na árvore do `MundoDoTeste`. */
function mundoDasMalhas(campo: CampoDeColisao): MundoDoTeste {
  const fontes = []
  for (let linha = 0; linha < campo.linhas / CELULAS_DA_PECA; linha++)
    for (let coluna = 0; coluna < campo.colunas / CELULAS_DA_PECA; coluna++) {
      const malha = malhaDeGradeNaPeca(
        campo,
        { coluna, linha },
        (x, z) =>
          campo.alturas[
            (linha * CELULAS_DA_PECA + z) * (campo.colunas + 1) + coluna * CELULAS_DA_PECA + x
          ] as number,
        (gx, gz) => campo.buracos?.[gz * campo.colunas + gx] === 1,
      )
      const geometria = new BufferGeometry()
      geometria.setAttribute('position', new BufferAttribute(malha.vertices, 3))
      geometria.setIndex(new BufferAttribute(malha.indices, 1))
      fontes.push({
        geometria,
        matriz: new Matrix4().makeTranslation(malha.origem.x, 0, malha.origem.z),
      })
    }
  return new MundoDoTeste(fontes)
}

/** Distância do ponto (em x e z) à borda ou à diagonal da célula, em células. */
function pertoDeAresta(campo: CampoDeColisao, ponto: Vector3): boolean {
  const gx = (ponto.x - campo.origem.x) / campo.passo,
    gz = (ponto.z - campo.origem.z) / campo.passo,
    u = gx - Math.floor(gx),
    v = gz - Math.floor(gz)
  return Math.min(u, 1 - u, v, 1 - v, Math.abs(u + v - 1)) < 1e-4
}

describe('a colisão pelo campo de alturas', () => {
  const campo = campoDeTeste()
  const mundo = mundoDasMalhas(campo)

  test('confere a forma do campo', () => {
    expect(() => conferirCampo(campo)).not.toThrow()
    expect(() => conferirCampo({ ...campo, alturas: new Float32Array(3) })).toThrow(
      'As alturas não correspondem à grade do campo.',
    )
    expect(() => conferirCampo({ ...campo, buracos: new Uint8Array(3) })).toThrow(
      'Os buracos não correspondem à grade do campo.',
    )
    const ruim = Float32Array.from(campo.alturas)
    ruim[5] = Number.NaN
    expect(() => conferirCampo({ ...campo, alturas: ruim })).toThrow(
      'O campo tem uma altura inválida.',
    )
  })

  test('os limites cobrem a grade e as alturas', () => {
    const caixa = limitesDoCampo(campo)
    expect(caixa.min.x).toBe(-100)
    expect(caixa.max.x).toBe(-100 + 128 * 2)
    expect(caixa.max.z).toBe(-60 + 128 * 2)
    expect(caixa.min.y).toBe(Math.min(...(campo.alturas as Float32Array)))
  })

  test('2.000 segmentos dão o mesmo contato que a malha do chão', () => {
    const sorteio = sorteador(29)
    let contatos = 0,
      vazios = 0
    for (let caso = 0; caso < 2000; caso++) {
      // Fora e dentro da grade, raios verticais (o apoio), horizontais e inclinados (a câmera).
      const de = new Vector3(-120 + sorteio() * 300, -15 + sorteio() * 40, -80 + sorteio() * 300)
      const tipo = caso % 4,
        comprimento = 1 + sorteio() * 60
      const direcao =
        tipo === 0
          ? new Vector3(0, -1, 0)
          : tipo === 1
            ? new Vector3(sorteio() - 0.5, 0, sorteio() - 0.5)
            : new Vector3(sorteio() - 0.5, sorteio() - 0.7, sorteio() - 0.5)
      const ate = de.clone().addScaledVector(direcao.normalize(), comprimento)
      const esperado = mundo.rastrear(de, ate)
      const obtido = rastrearNoCampo(campo, de, ate)
      expect(obtido === null, `caso ${caso}`).toBe(esperado === null)
      if (!esperado || !obtido) {
        vazios++
        continue
      }
      contatos++
      expect(Math.abs(obtido.distancia - esperado.distancia), `caso ${caso}`).toBeLessThan(1e-4)
      expect(obtido.ponto.distanceTo(esperado.ponto), `caso ${caso}`).toBeLessThan(1e-4)
      if (!pertoDeAresta(campo, esperado.ponto))
        expect(obtido.normal.dot(esperado.normal), `caso ${caso}`).toBeGreaterThan(0.9999)
    }
    // A amostra precisa ter dos dois: contatos e segmentos que não tocam o chão.
    expect(contatos).toBeGreaterThan(400)
    expect(vazios).toBeGreaterThan(200)
  })

  test('os triângulos numa caixa são os mesmos da malha do chão', () => {
    const sorteio = sorteador(53)
    const chave = (p: ArrayLike<number>, i: number) =>
      [0, 1, 2, 3, 4, 5, 6, 7, 8].map((k) => Math.round((p[i + k] as number) * 1000)).join(',')
    const normalizar = (lista: string[]) =>
      lista.map((t) => {
        const v = t.split(',').map(Number)
        const pontos = [v.slice(0, 3), v.slice(3, 6), v.slice(6, 9)].map((q) => q.join(','))
        return pontos.sort().join('|')
      })
    for (let caso = 0; caso < 60; caso++) {
      const x = -110 + sorteio() * 270,
        z = -70 + sorteio() * 270,
        y = -10 + sorteio() * 20,
        caixa = new Box3(
          new Vector3(x, y, z),
          new Vector3(x + sorteio() * 12, y + 6, z + sorteio() * 12),
        )
      const daMalha = mundo.triangulosNaCaixa(caixa)
      const esperado: string[] = []
      for (let i = 0; i < daMalha.length; i += 9) esperado.push(chave(daMalha, i))
      const obtido: string[] = []
      const caixaDoTriangulo = new Box3()
      paraCadaTrianguloNaCaixa(
        campo,
        caixa.min.x,
        caixa.min.z,
        caixa.max.x,
        caixa.max.z,
        (_, a, b, c) => {
          caixaDoTriangulo.setFromPoints([a, b, c])
          if (caixaDoTriangulo.intersectsBox(caixa))
            obtido.push(chave([a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z], 0))
          return undefined
        },
      )
      expect(normalizar(obtido).sort(), `caso ${caso}`).toEqual(normalizar(esperado).sort())
    }
  })

  test('um buraco não tem chão; a borda da grade também não', () => {
    const i = Array.from(campo.buracos as Uint8Array).indexOf(1),
      ix = i % campo.colunas,
      iz = Math.floor(i / campo.colunas),
      x = campo.origem.x + (ix + 0.3) * campo.passo,
      z = campo.origem.z + (iz + 0.3) * campo.passo
    expect(rastrearNoCampo(campo, new Vector3(x, 50, z), new Vector3(x, -50, z))).toBeNull()
    expect(rastrearNoCampo(campo, new Vector3(-101, 50, 0), new Vector3(-101, -50, 0))).toBeNull()
  })
})

describe('o MundoDoTeste com o campo no lugar das malhas do chão', () => {
  const campo = campoDeTeste()
  // Uma caixa sólida por cima do relevo, nos dois mundos: o campo convive com as malhas.
  const caixa = new BufferGeometry()
  caixa.setAttribute(
    'position',
    new BufferAttribute(
      new Float32Array([0, 0, 0, 4, 0, 0, 4, 0, 4, 0, 0, 4, 0, 6, 0, 4, 6, 0, 4, 6, 4, 0, 6, 4]),
      3,
    ),
  )
  caixa.setIndex([
    0, 1, 2, 0, 2, 3, 4, 6, 5, 4, 7, 6, 0, 4, 5, 0, 5, 1, 1, 5, 6, 1, 6, 2, 2, 6, 7, 2, 7, 3, 3, 7,
    4, 3, 4, 0,
  ])
  const matrizDaCaixa = new Matrix4().makeTranslation(10, 2, 20)
  const fontesDoChao = () => {
    const lista = []
    for (let linha = 0; linha < campo.linhas / CELULAS_DA_PECA; linha++)
      for (let coluna = 0; coluna < campo.colunas / CELULAS_DA_PECA; coluna++) {
        const malha = malhaDeGradeNaPeca(
          campo,
          { coluna, linha },
          (x, z) =>
            campo.alturas[
              (linha * CELULAS_DA_PECA + z) * (campo.colunas + 1) + coluna * CELULAS_DA_PECA + x
            ] as number,
          (gx, gz) => campo.buracos?.[gz * campo.colunas + gx] === 1,
        )
        const geometria = new BufferGeometry()
        geometria.setAttribute('position', new BufferAttribute(malha.vertices, 3))
        geometria.setIndex(new BufferAttribute(malha.indices, 1))
        lista.push({
          geometria,
          matriz: new Matrix4().makeTranslation(malha.origem.x, 0, malha.origem.z),
        })
      }
    return lista
  }
  const antigo = new MundoDoTeste([
    ...fontesDoChao(),
    { objeto: 'caixa', geometria: caixa, matriz: matrizDaCaixa },
  ])
  const novo = new MundoDoTeste(
    [{ objeto: 'caixa', geometria: caixa, matriz: matrizDaCaixa }],
    undefined,
    campo,
  )

  test('o limite inferior é o mesmo', () => {
    expect(novo.limiteInferior).toBeCloseTo(antigo.limiteInferior!, 5)
  })

  test('300 cápsulas saem do chão do mesmo jeito', () => {
    const sorteio = sorteador(71)
    let empurradas = 0
    for (let caso = 0; caso < 300; caso++) {
      const x = -95 + sorteio() * 245,
        z = -55 + sorteio() * 245
      const pes = new Vector3(x, antigo.apoio(x, z, 0, 100, -100, -1)?.y ?? 0, z)
      pes.y += -0.6 + sorteio() * 0.8
      const a = antigo.resolver(pes, 1.8, 0.4),
        b = novo.resolver(pes, 1.8, 0.4)
      if (a.posicao.distanceTo(pes) > 1e-3) empurradas++
      expect(b.posicao.distanceTo(a.posicao), `caso ${caso}`).toBeLessThan(1e-4)
    }
    expect(empurradas).toBeGreaterThan(50)
  })

  test('o apoio e os triângulos numa caixa são os mesmos (a caixa sólida também conta)', () => {
    const sorteio = sorteador(97)
    for (let caso = 0; caso < 200; caso++) {
      const x = -95 + sorteio() * 245,
        z = -55 + sorteio() * 245,
        a = antigo.apoio(x, z, 0.4, 100, -100, 0.5),
        b = novo.apoio(x, z, 0.4, 100, -100, 0.5)
      expect(b === null, `caso ${caso}`).toBe(a === null)
      if (a && b) expect(b.y, `caso ${caso}`).toBeCloseTo(a.y, 4)
    }
    const caixaDaConsulta = new Box3(new Vector3(5, -20, 15), new Vector3(20, 20, 30))
    expect(novo.triangulosNaCaixa(caixaDaConsulta).length).toBe(
      antigo.triangulosNaCaixa(caixaDaConsulta).length,
    )
  })
})
