import { expect, test } from 'bun:test'
import { digestDosBytes, type TexturaDoCenario } from '@sistemazero/molda-cenarios-core/v2'
import {
  BoxGeometry,
  BufferGeometry,
  Float32BufferAttribute,
  Group,
  Matrix4,
  MeshStandardMaterial,
  RepeatWrapping,
  SRGBColorSpace,
  Texture,
  Vector3,
} from 'three'
import {
  geometriaParaTextura,
  materializarUvDaTextura,
  uvDaSuperficie,
} from '../src/projecao-textura'
import { RepresentacoesDoModelo } from '../src/representacoes'
import { lerTextura, type TexturaCarregada, TexturasDoPalco } from '../src/texturas'

const png = Uint8Array.from(
  Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
    'base64',
  ),
)
const pausa = () => Bun.sleep(0)

test('textura só é decodificada depois de conferir formato, tamanho e digest; descarte é idempotente', async () => {
  const digest = await digestDosBytes(png)
  let decodificadas = 0,
    soltas = 0,
    gpu = 0
  const decodificar = async () => {
    decodificadas++
    return {
      imagem: { width: 1, height: 1 } as ImageData,
      largura: 1,
      altura: 1,
      descartar() {
        soltas++
      },
    }
  }
  const sinal = new AbortController().signal
  await expect(lerTextura(png.buffer, '0'.repeat(64), sinal, decodificar)).rejects.toThrow('versão')
  await expect(
    lerTextura(new ArrayBuffer(4 * 1024 * 1024 + 1), digest, sinal, decodificar),
  ).rejects.toThrow('limite')
  await expect(
    lerTextura(new Uint8Array([0, 1, 2]).buffer, digest, sinal, decodificar),
  ).rejects.toThrow()
  expect(decodificadas).toBe(0)
  const valor = await lerTextura(png.buffer, digest, sinal, decodificar)
  expect(valor.textura.wrapS).toBe(RepeatWrapping)
  expect(valor.textura.wrapT).toBe(RepeatWrapping)
  expect(valor.textura.colorSpace).toBe(SRGBColorSpace)
  valor.textura.addEventListener('dispose', () => gpu++)
  valor.descartar()
  valor.descartar()
  expect(soltas).toBe(1)
  expect(gpu).toBe(1)
  expect(valor.textura.image).toBeNull()
  await expect(
    lerTextura(png.buffer, digest, sinal, async () => ({
      imagem: {} as ImageData,
      largura: 2,
      altura: 1,
      descartar() {
        soltas++
      },
    })),
  ).rejects.toThrow('dimensões')
  expect(soltas).toBe(2)
  const controle = new AbortController()
  await expect(
    lerTextura(png.buffer, digest, controle.signal, async () => {
      controle.abort(Error('Fechou'))
      return {
        imagem: {} as ImageData,
        largura: 1,
        altura: 1,
        descartar() {
          soltas++
        },
      }
    }),
  ).rejects.toThrow('Fechou')
  expect(soltas).toBe(3)
})

const referencia = (n: number): TexturaDoCenario => ({
  id: `t${n}`,
  biblioteca: 'biblioteca',
  textura: `item${n}`,
  digest: n.toString(16).padStart(64, '0'),
})

test('cache limita quatro leituras, compartilha conteúdo, cancela fila e descarta respostas antigas', async () => {
  const pendentes: {
    ref: TexturaDoCenario
    sinal: AbortSignal
    resolver(v: TexturaCarregada): void
  }[] = []
  let avisos = 0,
    descartes = 0
  const valor = (): TexturaCarregada => ({
    textura: new Texture(),
    descartar() {
      descartes++
    },
  })
  const cache = new TexturasDoPalco(
    (ref, sinal) => new Promise((resolver) => pendentes.push({ ref, sinal, resolver })),
    () => avisos++,
  )
  cache.definir([
    referencia(1),
    referencia(1),
    referencia(2),
    referencia(3),
    referencia(4),
    referencia(5),
  ])
  await pausa()
  expect(pendentes).toHaveLength(4)
  cache.definir([referencia(1)])
  expect(pendentes[1]!.sinal.aborted).toBe(true)
  pendentes[0]!.resolver(valor())
  for (const p of pendentes.slice(1)) p.resolver(valor())
  await pausa()
  expect(pendentes).toHaveLength(4)
  expect(descartes).toBe(3)
  expect(cache.obter(referencia(1).digest)).toBeDefined()
  cache.definir([])
  expect(descartes).toBe(4)
  cache.definir([referencia(1)])
  await pausa()
  expect(pendentes).toHaveLength(5)
  cache.descartar()
  const avisosAntes = avisos
  pendentes[4]!.resolver(valor())
  await pausa()
  expect(descartes).toBe(5)
  expect(avisos).toBe(avisosAntes)
  expect(cache.obter(referencia(1).digest)).toBeUndefined()
})

test('erro explícito pode ser repetido sem recarregar as texturas já prontas', async () => {
  let chamadas = 0
  const falhas: string[] = []
  const cache = new TexturasDoPalco(
    async () => {
      if (++chamadas === 1) throw Error('Sem conexão')
      return { textura: new Texture(), descartar() {} }
    },
    (estado) => falhas.push(...estado.falhas.map((f) => f.mensagem)),
  )
  cache.definir([referencia(1)])
  await pausa()
  expect(falhas).toContain('Sem conexão')
  cache.repetirFalhas()
  await pausa()
  expect(cache.obter(referencia(1).digest)).toBeDefined()
  cache.definir([referencia(1), { ...referencia(1), id: 'outro' }])
  expect(chamadas).toBe(2)
  cache.descartar()
})

test('UV física mede distâncias na face inclinada, com escala não uniforme e repetição em metros', () => {
  const normal = new Vector3(0, 1, -1).normalize(),
    escala = new Vector3(2, 3, 5)
  const a = new Vector3(0.3, 0.7, 0.2),
    b = a.clone().add(new Vector3(1, 2, 2))
  const uvA = uvDaSuperficie(a, normal, escala, 2),
    uvB = uvDaSuperficie(b, normal, escala, 2)
  const distancia = b.clone().sub(a).multiply(escala).length()
  expect(Math.hypot(uvB[0] - uvA[0], uvB[1] - uvA[1])).toBeCloseTo(distancia / 2, 8)
  expect(() => uvDaSuperficie(a, normal, new Vector3(0, 1, 1), 2)).toThrow()
  expect(() => uvDaSuperficie(a, normal, escala, 0)).toThrow()
  expect(() => uvDaSuperficie(a, new Vector3(), escala, 1)).toThrow()
})

test('projeção respeita drawRange, matriz interna, winding espelhado e continuidade entre faces coplanares', () => {
  const g = new BufferGeometry()
  g.setAttribute(
    'position',
    new Float32BufferAttribute(
      [0, 0, 0, 2, 0, 0, 2, 0, 2, 0, 0, 2, 90, 0, 0, 91, 0, 0, 90, 0, 1],
      3,
    ),
  )
  g.setIndex([0, 2, 1, 0, 3, 2, 4, 6, 5])
  g.setDrawRange(0, 6)
  const antes = Array.from(g.getAttribute('position').array)
  const projetada = geometriaParaTextura(g, new Matrix4().makeScale(-1, 1, 1).setPosition(4, 1, 0))
  expect(projetada.getAttribute('position').count).toBe(6)
  expect(projetada.boundingBox!.max.x).toBe(4)
  expect(projetada.boundingBox!.min.x).toBe(2)
  const n = projetada.getAttribute('normalDaFace')
  expect(projetada.getAttribute('normal').count).toBe(6)
  for (let i = 0; i < 6; i++) expect(n.getY(i)).toBe(1)
  materializarUvDaTextura(projetada, new Vector3(2, 1, 3), 2)
  const pos = projetada.getAttribute('position'),
    uv = projetada.getAttribute('uv')
  for (let i = 0; i < 6; i++) {
    const esperado = uvDaSuperficie(
      new Vector3().fromBufferAttribute(pos, i),
      new Vector3().fromBufferAttribute(n, i),
      new Vector3(2, 1, 3),
      2,
    )
    expect(uv.getX(i)).toBeCloseTo(esperado[0], 6)
    expect(uv.getY(i)).toBeCloseTo(esperado[1], 6)
  }
  expect(Array.from(g.getAttribute('position').array)).toEqual(antes)
  g.dispose()
  projetada.dispose()
})

test('variantes compartilham geometrias e materiais por uso; restauração não altera o GLB original', () => {
  const g = new BoxGeometry(2, 2, 2),
    m = new MeshStandardMaterial({ color: '#884411' }),
    pai = new Group()
  g.computeBoundingBox()
  const representacoes = new RepresentacoesDoModelo(pai, {
    partes: [{ geometria: g, material: m, matriz: new Matrix4() }],
    caixa: g.boundingBox!.clone(),
    raiz: new Group(),
    triangulos: 12,
    descartar() {},
  })
  const textura = new Texture(),
    outra = new Texture()
  const a = representacoes.obter(undefined, { textura, repeticaoMetros: 2 })
  const b = representacoes.obter(undefined, { textura: outra, repeticaoMetros: 3 })
  const c = representacoes.obter({ x: true, y: false, z: false }, { textura, repeticaoMetros: 2 })
  for (const lote of [a, b, c]) lote.preencher([{ id: 'objeto', matriz: new Matrix4() }])
  expect(a.malhas[0]!.geometry).toBe(b.malhas[0]!.geometry)
  expect(a.malhas[0]!.material).toBe(c.malhas[0]!.material)
  expect(a.malhas[0]!.geometry).not.toBe(c.malhas[0]!.geometry)
  expect(representacoes.obter(undefined, { textura, repeticaoMetros: 2 })).toBe(a)
  let geo = 0,
    mat = 0,
    original = 0,
    imagem = 0
  a.malhas[0]!.geometry.addEventListener('dispose', () => geo++)
  const materialA = a.malhas[0]!.material
  if (Array.isArray(materialA)) throw Error('Esperado material único por parte')
  materialA.addEventListener('dispose', () => mat++)
  g.addEventListener('dispose', () => original++)
  m.addEventListener('dispose', () => original++)
  textura.addEventListener('dispose', () => imagem++)
  representacoes.manter(new Set([a]))
  expect(geo).toBe(0)
  expect(mat).toBe(0)
  representacoes.manter(new Set())
  expect(geo).toBe(1)
  expect(mat).toBe(1)
  expect(original).toBe(0)
  expect(imagem).toBe(0)
  const base = representacoes.obter()
  base.preencher([{ id: 'objeto', matriz: new Matrix4() }])
  expect(base.malhas[0]!.geometry).toBe(g)
  expect(base.malhas[0]!.material).toBe(m)
  expect(m.color.getHexString()).toBe('884411')
  representacoes.descartar()
  g.dispose()
  m.dispose()
  textura.dispose()
  outra.dispose()
})
