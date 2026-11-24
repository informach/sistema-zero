import { expect, test } from 'bun:test'
import {
  criarAmostradorDeEspalhamento,
  criarDocumentoVazio,
  digestDosBytes,
} from '@sistemazero/molda-cenarios-core/v2'
import type { GestoDeEspalhamento } from '@sistemazero/molda-cenarios-motor'
import { criarControlador } from '../src/oficina/controlador'
import { criarHostEmMemoria } from '../src/oficina/host-memoria'
import {
  comandosParaEspalhar,
  escolhaDaBiblioteca,
  escolhasDaSelecao,
  prepararPaleta,
} from '../src/oficina/pincel-de-objetos'
import type { ModeloDeBiblioteca } from '../src/oficina/portas'

const biblioteca: ModeloDeBiblioteca = {
  id: 'arvore',
  bibliotecaId: 'acervo',
  nome: 'Árvore',
  digest: 'a'.repeat(64),
  pasta: '',
  etiquetas: [],
  bytes: 100,
  triangulos: 12,
  min: [-1, -0.5, -1],
  max: [1, 4, 1],
  miniatura: null,
}
function origem() {
  const d = criarDocumentoVazio('c', 'Jardim')
  d.formas = [{ id: 'f', nome: 'Flor', tipo: 'caixa', largura: 0.3, altura: 0.6, comprimento: 0.3 }]
  d.texturas = [{ id: 't', biblioteca: 'acervo', textura: 't', digest: 'b'.repeat(64) }]
  d.instancias = [
    {
      id: 'o',
      nome: 'Flor',
      modelo: 'f',
      grupo: null,
      bloqueado: false,
      oculto: false,
      colisao: 'caixa',
      apoio: { tipo: 'absoluto' },
      espelho: { x: true, y: false, z: false },
      aparencia: { cor: '#334455', textura: { id: 't', repeticaoMetros: 2 } },
      propriedades: { 'jardim.tipo': 'flor' },
      transformacao: {
        posicao: { x: 0, y: 0, z: 0 },
        rotacao: { x: 0, y: 0.4, z: 0 },
        escala: { x: 2, y: 0.5, z: 1 },
      },
    },
  ]
  return d
}

test('biblioteca entra no pincel em proporção nativa, sem gravar modelo nem objeto', () => {
  const doc = criarDocumentoVazio('c', 'Jardim'),
    antes = structuredClone(doc)
  const escolha = escolhaDaBiblioteca(biblioteca),
    paleta = prepararPaleta(doc, [escolha, escolha])
  expect(escolha.prototipo.escala).toEqual({ x: 1, y: 1, z: 1 })
  expect(escolha.modelo!.volume!.min.y).toBe(-0.5)
  expect(paleta.modelos).toHaveLength(1)
  expect(paleta.prototipos).toHaveLength(2)
  expect(doc).toEqual(antes)
})

test('seleção conserva aparência e proporção, deduplica giro plano e congela a fonte ao apagar a peça', () => {
  const doc = origem()
  for (let i = 1; i < 12; i++)
    doc.instancias.push({
      ...structuredClone(doc.instancias[0]!),
      id: `o${i}`,
      nome: `Flor ${i}`,
      transformacao: { ...doc.instancias[0]!.transformacao, rotacao: { x: 0, y: i / 10, z: 0 } },
    })
  const antes = structuredClone(doc),
    escolhas = escolhasDaSelecao(
      doc,
      doc.instancias.map((o) => o.id),
    )
  expect(escolhas).toHaveLength(1)
  expect(escolhas[0]!.prototipo.escala).toEqual({ x: 2, y: 0.5, z: 1 })
  expect(escolhas[0]!.prototipo.aparencia).toEqual(doc.instancias[0]!.aparencia)
  expect(escolhas[0]!.prototipo.espelho).toEqual(doc.instancias[0]!.espelho)
  expect(escolhas[0]!.prototipo.propriedades).toEqual(doc.instancias[0]!.propriedades)
  expect(doc).toEqual(antes)
  doc.instancias = []
  doc.formas = []
  doc.texturas = []
  const paleta = prepararPaleta(doc, escolhas)
  expect(paleta.formas).toEqual(antes.formas!)
  expect(paleta.texturas).toEqual(antes.texturas!)
  expect(paleta.prototipos[0]!.aparencia).toEqual(antes.instancias[0]!.aparencia)
})

test('aliases das três tabelas não sobrescrevem definições existentes e são reutilizados', () => {
  const doc = origem(),
    escolha = escolhasDaSelecao(doc, ['o'])[0]!
  const destino = criarDocumentoVazio('d', 'Destino')
  destino.formas = [{ ...doc.formas![0]!, altura: 3 }]
  destino.texturas = [{ ...doc.texturas![0]!, digest: 'c'.repeat(64) }]
  destino.modelos = [{ ...escolhaDaBiblioteca(biblioteca).modelo!, digest: 'd'.repeat(64) }]
  const antes = structuredClone(destino),
    paleta = prepararPaleta(destino, [escolha, escolhaDaBiblioteca(biblioteca)])
  expect(paleta.prototipos[0]!.modelo).not.toBe('f')
  expect(paleta.prototipos[0]!.aparencia!.textura!.id).not.toBe('t')
  expect(paleta.prototipos[1]!.modelo).not.toBe('arvore')
  expect(destino).toEqual(antes)
  const segunda = prepararPaleta(
    {
      ...destino,
      modelos: [...destino.modelos, ...paleta.modelos],
      formas: [...destino.formas!, ...paleta.formas],
      texturas: [...destino.texturas!, ...paleta.texturas],
    },
    [escolha, escolhaDaBiblioteca(biblioteca)],
  )
  expect(segunda.modelos).toEqual([])
  expect(segunda.formas).toEqual([])
  expect(segunda.texturas).toEqual([])
  expect(segunda.prototipos).toEqual(paleta.prototipos)
})

test('medida ausente exige fonte real; seleção vazia ou mais de oito variações não vira pincel parcial', () => {
  const doc = origem()
  doc.modelos = [{ ...escolhaDaBiblioteca(biblioteca).modelo!, volume: undefined }]
  doc.instancias[0]!.modelo = 'arvore'
  expect(() => escolhasDaSelecao(doc, ['o'])).toThrow('medidas')
  const medida = { min: { x: -1, y: 0, z: -1 }, max: { x: 1, y: 4, z: 1 } }
  expect(escolhasDaSelecao(doc, ['o'], () => medida)[0]!.modelo!.volume).toEqual(medida)
  expect(doc.modelos[0]!.volume).toBeUndefined()
  expect(() => escolhasDaSelecao(doc, [])).toThrow('Escolha objetos')
  for (let i = 1; i < 9; i++)
    doc.instancias.push({
      ...structuredClone(doc.instancias[0]!),
      id: `v${i}`,
      aparencia: { cor: `#00000${i}` },
    })
  expect(() =>
    escolhasDaSelecao(
      doc,
      doc.instancias.map((o) => o.id),
      () => medida,
    ),
  ).toThrow('oito')
})

test('um gesto grava definições e amostras numa revisão; retomada preserva undo/redo e recusa cabeça alterada', async () => {
  const host = criarHostEmMemoria(),
    mundo = await host.criarMundo('conta', 'Mundo'),
    c = await host.criarCenario(mundo.id, 'Jardim')
  const ctl = criarControlador(host, await host.abrirCenario(c.id)),
    doc = ctl.getState().documento
  const b = await host.criarBiblioteca('conta', { nome: 'Texturas', licenca: 'propria' })
  const bytes = new Uint8Array([1, 2, 3]),
    digest = await digestDosBytes(bytes)
  const [t] = await host.importarTexturas(b.id, [
    {
      nome: 'Textura de teste',
      pasta: '',
      etiquetas: [],
      digest,
      largura: 1,
      altura: 1,
      repeticaoMetros: 2,
      conteudo: new Blob([bytes], { type: 'image/png' }),
    },
  ])
  const fonte = origem()
  fonte.texturas = [{ id: 't', biblioteca: b.id, textura: t!.id, digest }]
  const paleta = prepararPaleta(doc, escolhasDaSelecao(fonte, ['o']))
  const receita = {
    prototipos: paleta.prototipos,
    traco: [{ x: 0, z: 0 }],
    raio: 5,
    densidade: 20,
    afastamento: 1,
    giro: Math.PI,
    tamanhoMin: 0.8,
    tamanhoMax: 1.2,
    semente: 77,
    limite: 50,
    evitarObjetos: true,
    grupo: null,
    camada: null,
  }
  const consulta = { ...doc, formas: paleta.formas, texturas: paleta.texturas }
  const gesto: GestoDeEspalhamento = {
    documentoDeOrigem: doc,
    receita,
    amostras: criarAmostradorDeEspalhamento(consulta, receita).gerar().amostras,
    modelos: paleta.modelos,
    formas: paleta.formas,
    texturas: paleta.texturas,
  }
  let i = 0
  const lote = comandosParaEspalhar(doc, gesto, () => `flor-${i++}`)
  expect(lote.ids.length).toBeGreaterThan(5)
  expect(lote.comandos.map((c) => c.tipo)).toEqual([
    'forma.definir',
    'textura.definir',
    'objetos.espalhar',
  ])
  expect(() => comandosParaEspalhar(structuredClone(doc), gesto)).toThrow('mudou')
  expect(ctl.executar(lote.comandos)).toBe(true)
  await ctl.terminar()
  const salvo = await host.abrirCenario(c.id)
  expect(salvo.revisao).toBe(1)
  expect(salvo.historico.desfazer).toBe(1)
  expect(salvo.documento.instancias.map((o) => o.id)).toEqual(lote.ids)
  const retomado = criarControlador(host, salvo)
  await retomado.desfazer()
  expect(retomado.getState().documento).toEqual(doc)
  await retomado.refazer()
  expect(retomado.getState().documento).toEqual(salvo.documento)
})
