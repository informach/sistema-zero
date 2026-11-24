import { expect, test } from 'bun:test'
import { type CenaCompilada, lerCenaCompilada } from '@sistemazero/molda-cenarios-core/compilar'
import { codificarPngDeAlturas, digestDosBytes } from '@sistemazero/molda-cenarios-core/v2'
import { ArquivosDaCompilacao } from '../src/compilar/arquivos'
import { conferirConteudoCompilado } from '../src/compilar/conteudo'
import { gravarDadosDoTerreno } from '../src/compilar/terreno'
import { TerrenoDoPalco } from '../src/Terreno'
import { glb, exemplo as malhaDeEnsaio } from './fixtures/glb-compilacao'

function vazia() {
  return lerCenaCompilada({
    formato: 'molda-cena-compilada',
    versao: 1,
    nome: 'Ensaio',
    unidade: 'metro',
    eixoVertical: 'y',
    fonte: { cenario: 'c', revisao: 0, digest: 'a'.repeat(64) },
    arquivos: [],
    entidades: [],
    nos: [],
    colisoes: [],
    aguas: [],
    caminhos: [],
    marcadores: [],
    texturas: [],
    fontes: { modelos: [], texturas: [], conjuntos: [] },
    licencas: [],
    ambiente: { hora: 12 },
  })
}
async function exemplo(comBuracos = false) {
  const t = new TerrenoDoPalco(
      {
        tipo: 'terreno',
        cobertura: 'grade',
        origem: { x: -32, z: 16 },
        passo: 1,
        colunas: 64,
        linhas: 64,
        min: -0.1,
        max: 0.1,
        fundo: 0.1,
        pecas: [],
      },
      new Map(),
    ),
    a = new ArquivosDaCompilacao(new AbortController().signal)
  try {
    if (comBuracos) t.estado.buracos.celulas[3] = 1
    const meta = await gravarDadosDoTerreno(t, a, new AbortController().signal)
    return {
      cena: { ...vazia(), terreno: meta, arquivos: a.descrever() },
      arquivos: new Map(a.arquivos),
    }
  } finally {
    a.descartar()
    t.descartar()
  }
}
async function reassinar(cena: CenaCompilada, arquivos: Map<string, Uint8Array>) {
  for (const a of cena.arquivos) {
    const bytes = arquivos.get(a.caminho)!
    a.bytes = bytes.length
    a.digest = await digestDosBytes(bytes)
  }
}

test('conteúdo real conserva Float32 LE, PNG16 e máscara; arredondamento dos limites é válido', async () => {
  const p = await exemplo(true),
    antes = p.arquivos.get(p.cena.terreno.alturas)!.slice(),
    r = await conferirConteudoCompilado(p.cena, p.arquivos)
  expect(r.terreno!.alturas[0]).toBe(Math.fround(0.1))
  expect(r.terreno!.buracos![3]).toBe(1)
  r.terreno!.buracos![3] = 0
  expect(p.arquivos.get(p.cena.terreno.buracos!)![3]).toBe(1)
  expect(p.arquivos.get(p.cena.terreno.alturas)).toEqual(antes)
})

test('hash correto não transforma valores físicos inválidos em um pacote aprovado', async () => {
  for (const valor of [NaN, Infinity, 1]) {
    const p = await exemplo(),
      bytes = p.arquivos.get(p.cena.terreno.alturas)!
    new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).setFloat32(0, valor, true)
    await reassinar(p.cena, p.arquivos)
    await expect(conferirConteudoCompilado(p.cena, p.arquivos)).rejects.toThrow(/valor inválido/)
  }
})

test('PNG precisa corresponder às alturas físicas, resolução e profundidade de bits', async () => {
  const p = await exemplo(),
    bin = p.arquivos.get(p.cena.terreno.alturas)!
  new DataView(bin.buffer, bin.byteOffset, bin.byteLength).setFloat32(0, 0, true)
  await reassinar(p.cena, p.arquivos)
  await expect(conferirConteudoCompilado(p.cena, p.arquivos)).rejects.toThrow(/não correspondem/)
  const q = await exemplo()
  q.arquivos.set(
    q.cena.terreno.pngAlturas,
    await codificarPngDeAlturas({
      largura: 66,
      altura: 65,
      valores: new Float32Array(66 * 65).fill(1),
    }),
  )
  await reassinar(q.cena, q.arquivos)
  await expect(conferirConteudoCompilado(q.cena, q.arquivos)).rejects.toThrow(/dimensões reais/)
  const r = await exemplo()
  r.arquivos.get(r.cena.terreno.pngAlturas)![24] = 8
  await reassinar(r.cena, r.arquivos)
  await expect(conferirConteudoCompilado(r.cena, r.arquivos)).rejects.toThrow(/16 bits/)
})

test('PNG corrompido ou com dados após IEND não passa só porque possui hash confirmado', async () => {
  const p = await exemplo(),
    png = p.arquivos.get(p.cena.terreno.pngAlturas)!
  png[45]! ^= 1
  await reassinar(p.cena, p.arquivos)
  await expect(conferirConteudoCompilado(p.cena, p.arquivos)).rejects.toThrow(/corrompido/)
  const q = await exemplo(),
    original = q.arquivos.get(q.cena.terreno.pngAlturas)!,
    extra = new Uint8Array(original.length + 12)
  extra.set(original)
  q.arquivos.set(q.cena.terreno.pngAlturas, extra)
  await reassinar(q.cena, q.arquivos)
  await expect(conferirConteudoCompilado(q.cena, q.arquivos)).rejects.toThrow(/após o fim/)
})

test('máscara aceita só 0/1 e campo solto não pertence a um pacote sem terreno', async () => {
  const p = await exemplo(true)
  p.arquivos.get(p.cena.terreno.buracos!)![0] = 2
  await reassinar(p.cena, p.arquivos)
  await expect(conferirConteudoCompilado(p.cena, p.arquivos)).rejects.toThrow(/0 ou 1/)
  const a = new ArquivosDaCompilacao(new AbortController().signal)
  await a.adicionar('terreno/solto.bin', new Uint8Array(4), {
    mime: 'application/octet-stream',
    papel: 'alturas',
  })
  try {
    await expect(
      conferirConteudoCompilado({ ...vazia(), arquivos: a.descrever() }, a.arquivos),
    ).rejects.toThrow(/não pertence/)
  } finally {
    a.descartar()
  }
})

test('cancelamento não retorna alturas parciais', async () => {
  const p = await exemplo(),
    c = new AbortController()
  c.abort()
  await expect(conferirConteudoCompilado(p.cena, p.arquivos, c.signal)).rejects.toHaveProperty(
    'name',
    'AbortError',
  )
})

test('faixas conferem nomes e triângulos reais do GLB, além do total declarado', async () => {
  const origem = malhaDeEnsaio(),
    j = { ...origem.j, nodes: origem.j.nodes.map((n, i) => ({ ...n, name: `malha${i}` })) },
    bytes = glb(j, origem.bin),
    a = new ArquivosDaCompilacao(new AbortController().signal)
  try {
    await a.adicionar('modelos/lote.glb', bytes, {
      mime: 'model/gltf-binary',
      papel: 'modelo',
      malhas: 2,
      triangulos: 2,
      verticesMaximos: 3,
    })
    const cena: CenaCompilada = {
      ...vazia(),
      arquivos: a.descrever(),
      nos: [
        {
          id: 'lote',
          entidade: null,
          arquivo: 'modelos/lote.glb',
          matriz: [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1],
          volume: { min: { x: 0, y: 0, z: 0 }, max: { x: 0, y: 0, z: 0 } },
          faixas: [0, 1].map((i) => ({
            malha: `malha${i}`,
            entidade: null,
            primeiroTriangulo: 0,
            triangulos: 1,
          })),
        },
      ],
    }
    expect((await conferirConteudoCompilado(cena, a.arquivos)).cena.nos[0]!.faixas).toHaveLength(2)
    cena.nos[0]!.faixas![1]!.malha = 'inexistente'
    await expect(conferirConteudoCompilado(cena, a.arquivos)).rejects.toThrow(/malhas reais/)
    cena.nos[0]!.faixas = [{ malha: 'malha0', entidade: null, primeiroTriangulo: 0, triangulos: 2 }]
    await expect(conferirConteudoCompilado(cena, a.arquivos)).rejects.toThrow(/todas as malhas/)
  } finally {
    a.descartar()
  }
})

test('GLB e imagem são medidos pelo conteúdo mesmo quando o hash do inventário é válido', async () => {
  const { j, bin } = malhaDeEnsaio(),
    bytes = glb(j, bin),
    sinal = new AbortController().signal,
    a = new ArquivosDaCompilacao(sinal)
  await a.adicionar('modelos/a.glb', bytes, {
    mime: 'model/gltf-binary',
    papel: 'modelo',
    malhas: 2,
    triangulos: 2,
    verticesMaximos: 3,
  })
  try {
    const cena = { ...vazia(), arquivos: a.descrever() }
    expect((await conferirConteudoCompilado(cena, a.arquivos)).cena.arquivos[0]!.malhas).toBe(2)
    cena.arquivos[0]!.malhas = 1
    await expect(conferirConteudoCompilado(cena, a.arquivos)).rejects.toThrow(/medidas reais/)
  } finally {
    a.descartar()
  }
  const png = new Uint8Array(
      Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAFklEQVR4AWL6z8DwHwSZGEEkw38GAAAAAP//4+5legAAAAZJREFUAwBBDwb/5c5bAAAAAABJRU5ErkJggg==',
        'base64',
      ),
    ),
    imagens = new ArquivosDaCompilacao(sinal)
  try {
    await imagens.adicionar('texturas/a.png', png, {
      mime: 'image/png',
      papel: 'pintura',
      largura: 3,
      altura: 2,
    })
    await expect(
      conferirConteudoCompilado({ ...vazia(), arquivos: imagens.descrever() }, imagens.arquivos),
    ).rejects.toThrow(/dimensões reais/)
  } finally {
    imagens.descartar()
  }
})
