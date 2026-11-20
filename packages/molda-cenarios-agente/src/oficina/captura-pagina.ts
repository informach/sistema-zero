import type { DocumentoDeCenario } from '@sistemazero/molda-cenarios-core/v2'
import { criarPalco } from '@sistemazero/molda-cenarios-motor'

/**
 * A página mínima da captura sem janela: o palco do motor num canvas do tamanho pedido. Ela só
 * fala com o servidor local do agente (porta do próprio computador), que lê o cenário, os
 * modelos, as texturas e as peças do relevo pelo cliente da oficina, com o token.
 */

export interface PedidoDaPagina {
  documento: DocumentoDeCenario
  largura: number
  vista: 'livre' | 'cima' | 'frente' | 'lado'
  enquadrar?: string[]
}

async function ler(endereco: string, sinal?: AbortSignal): Promise<ArrayBuffer> {
  const resposta = await fetch(endereco, sinal ? { signal: sinal } : {})
  if (!resposta.ok) throw Error(`Não consegui ler ${endereco} (${resposta.status}).`)
  return resposta.arrayBuffer()
}

const proximoQuadro = () => new Promise<void>((r) => requestAnimationFrame(() => r()))

function paraBase64(bytes: Uint8Array): string {
  let texto = ''
  for (let i = 0; i < bytes.length; i += 0x8000)
    texto += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  return btoa(texto)
}

async function capturarNaPagina(pedido: PedidoDaPagina): Promise<string> {
  const canvas = document.querySelector('canvas')
  if (!canvas) throw Error('A página da captura está sem canvas.')
  const palco = criarPalco(canvas, {
    carregarModelo: (m, sinal) =>
      ler(`/modelo?biblioteca=${encodeURIComponent(m.biblioteca)}&digest=${m.digest}`, sinal),
    carregarTextura: (t, sinal) =>
      ler(`/textura?biblioteca=${encodeURIComponent(t.biblioteca)}&digest=${t.digest}`, sinal),
    carregarTerreno: (digest, sinal) => ler(`/terreno/${digest}`, sinal),
    movimentoReduzido: true,
  })
  try {
    palco.definirDocumento(pedido.documento)
    await palco.aguardarRecursos()
    palco.enquadrar(pedido.enquadrar)
    if (pedido.vista !== 'livre') palco.definirVista(pedido.vista)
    // Dois quadros: o laço ajusta o desenho ao tamanho do canvas antes da foto.
    await proximoQuadro()
    await proximoQuadro()
    const imagem = await palco.capturar(pedido.largura)
    if (!imagem) throw Error('A captura não gerou imagem.')
    return paraBase64(new Uint8Array(await imagem.arrayBuffer()))
  } finally {
    palco.destruir()
  }
}

declare global {
  /** A ponte com o agente: ele chama pela página do Chromium e recebe a imagem em base64. */
  var capturarCenario: ((pedido: PedidoDaPagina) => Promise<string>) | undefined
}
globalThis.capturarCenario = capturarNaPagina
