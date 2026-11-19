import { expect, test } from 'bun:test'
import {
  AMOSTRAS_DA_PECA,
  codificarPecaDeAlturas,
  criarDocumentoVazio,
} from '@sistemazero/molda-cenarios-core/v2'
import { compilarCenario } from '@sistemazero/molda-cenarios-motor/compilar'

test('cancelamento anterior à compilação não lê recursos nem altera o documento', async () => {
  const d = criarDocumentoVazio('c', 'Cancelamento'),
    antes = JSON.stringify(d),
    controller = new AbortController()
  controller.abort()
  let chamadas = 0
  const ler = async () => {
    chamadas++
    return new ArrayBuffer(0)
  }
  await expect(
    compilarCenario(
      d,
      { cenario: d.id, revisao: 0 },
      { equipe: true, bibliotecas: [] },
      { modelo: ler, textura: ler, terreno: ler },
      controller.signal,
    ),
  ).rejects.toHaveProperty('name', 'AbortError')
  expect(chamadas).toBe(0)
  expect(JSON.stringify(d)).toBe(antes)
})

test('fonte divergente e licença restrita são recusadas antes de baixar modelos', async () => {
  const d = criarDocumentoVazio('c', 'Licença'),
    s = new AbortController().signal
  d.modelos = [{ id: 'm', nome: 'Modelo', biblioteca: 'pack', modelo: 'm', digest: 'a'.repeat(64) }]
  d.instancias = [
    {
      id: 'o',
      nome: 'Objeto',
      modelo: 'm',
      grupo: null,
      oculto: false,
      bloqueado: false,
      colisao: 'malha',
      apoio: { tipo: 'absoluto' },
      transformacao: {
        posicao: { x: 0, y: 0, z: 0 },
        rotacao: { x: 0, y: 0, z: 0 },
        escala: { x: 1, y: 1, z: 1 },
      },
    },
  ]
  let chamadas = 0
  const ler = async () => {
      chamadas++
      return new ArrayBuffer(0)
    },
    portas = { modelo: ler, textura: ler, terreno: ler },
    contexto = {
      equipe: false,
      bibliotecas: [{ id: 'pack', nome: 'Pack privado', licenca: 'restrita' as const }],
    }
  await expect(
    compilarCenario(d, { cenario: 'outro', revisao: 0 }, contexto, portas, s),
  ).rejects.toThrow(/cenário/)
  await expect(
    compilarCenario(d, { cenario: d.id, revisao: 0 }, contexto, portas, s),
  ).rejects.toThrow(/Pack privado/)
  expect(chamadas).toBe(0)
})

test('alturas com bytes corretos e hash trocado não geram um pacote parcial', async () => {
  const d = criarDocumentoVazio('c', 'Integridade'),
    s = new AbortController().signal,
    bytes = codificarPecaDeAlturas(new Float64Array(AMOSTRAS_DA_PECA), -1, 1)
  d.base = {
    tipo: 'terreno',
    origem: { x: 0, z: 0 },
    passo: 1,
    colunas: 64,
    linhas: 64,
    min: -1,
    max: 1,
    fundo: 0,
    pecas: [{ coluna: 0, linha: 0, digest: 'a'.repeat(64) }],
  }
  const antes = JSON.stringify(d)
  let chamadas = 0
  const ler = async () => {
    chamadas++
    return bytes.slice().buffer
  }
  await expect(
    compilarCenario(
      d,
      { cenario: d.id, revisao: 0 },
      { equipe: true, bibliotecas: [] },
      { modelo: ler, textura: ler, terreno: ler },
      s,
    ),
  ).rejects.toThrow(/versão|conteúdo|hash/)
  expect(chamadas).toBe(1)
  expect(d.base.pecas[0]!.digest).toBe('a'.repeat(64))
  expect(JSON.stringify(d)).toBe(antes)
})
