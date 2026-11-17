import {
  conferirImagemDeCenario,
  digestDosBytes,
  MAX_BYTES_DE_TEXTURA_CENARIO,
  type TexturaDoCenario,
} from '@sistemazero/molda-cenarios-core/v2'
import { RepeatWrapping, SRGBColorSpace, Texture } from 'three'

interface ImagemDecodificada {
  imagem: TexImageSource
  largura: number
  altura: number
  descartar(): void
}
type Decodificar = (
  bytes: Uint8Array,
  mime: string,
  sinal: AbortSignal,
) => Promise<ImagemDecodificada>
export interface TexturaCarregada {
  textura: Texture
  descartar(): void
}

/** A mesma via <img> usada pelo GLTFLoader do Molda: respeita img-src blob: dos hosts. */
const decodificarImagem: Decodificar = (bytes, mime, sinal) =>
  new Promise((resolver, rejeitar) => {
    sinal.throwIfAborted()
    const url = URL.createObjectURL(new Blob([bytes.slice().buffer], { type: mime }))
    const imagem = new Image()
    let terminou = false
    const limpar = () => {
      imagem.onload = null
      imagem.onerror = null
      sinal.removeEventListener('abort', cancelar)
      URL.revokeObjectURL(url)
    }
    const cancelar = () => {
      if (terminou) return
      terminou = true
      limpar()
      imagem.src = ''
      rejeitar(sinal.reason)
    }
    sinal.addEventListener('abort', cancelar, { once: true })
    imagem.onload = () => {
      if (terminou) return
      terminou = true
      limpar()
      resolver({
        imagem,
        largura: imagem.naturalWidth,
        altura: imagem.naturalHeight,
        descartar: () => {
          imagem.src = ''
        },
      })
    }
    imagem.onerror = () => {
      if (terminou) return
      terminou = true
      limpar()
      imagem.src = ''
      rejeitar(Error('Não consegui decodificar a imagem da textura'))
    }
    imagem.src = url
  })

export async function lerTextura(
  bytes: ArrayBuffer,
  digest: string,
  sinal: AbortSignal,
  decodificar: Decodificar = decodificarImagem,
): Promise<TexturaCarregada> {
  sinal.throwIfAborted()
  const dados = new Uint8Array(bytes)
  if (!dados.length || dados.length > MAX_BYTES_DE_TEXTURA_CENARIO)
    throw Error('A textura excede o limite de tamanho')
  const mime = dados[0] === 137 ? 'image/png' : 'image/webp'
  const medidas = conferirImagemDeCenario(dados, mime)
  if ((await digestDosBytes(dados)) !== digest)
    throw Error('A textura não corresponde à versão guardada')
  sinal.throwIfAborted()
  const imagem = await decodificar(dados, mime, sinal)
  let textura: Texture | undefined
  try {
    sinal.throwIfAborted()
    if (imagem.largura !== medidas.largura || imagem.altura !== medidas.altura)
      throw Error('As dimensões da textura decodificada não correspondem ao arquivo')
    textura = new Texture(imagem.imagem)
    textura.colorSpace = SRGBColorSpace
    textura.wrapS = textura.wrapT = RepeatWrapping
    textura.needsUpdate = true
    const pronta = textura
    let descartada = false
    return {
      textura: pronta,
      descartar() {
        if (descartada) return
        descartada = true
        pronta.dispose()
        pronta.image = null
        imagem.descartar()
      },
    }
  } catch (erro) {
    textura?.dispose()
    imagem.descartar()
    throw erro
  }
}

export interface EstadoDasTexturas {
  carregando: number
  falhas: { digest: string; nome: string; mensagem: string }[]
}
type Pedido = { ref: TexturaDoCenario; controle: AbortController } & (
  | { estado: 'esperando' | 'carregando' }
  | { estado: 'pronto'; valor: TexturaCarregada }
  | { estado: 'erro'; mensagem: string }
)

/** Cache por conteúdo utilizado, com quatro leituras no máximo e proteção contra respostas antigas. */
export class TexturasDoPalco {
  private readonly pedidos = new Map<string, Pedido>()
  private ativos = 0
  private destruido = false
  constructor(
    private readonly carregar: (
      ref: TexturaDoCenario,
      sinal: AbortSignal,
    ) => Promise<TexturaCarregada>,
    private readonly aoMudar: (estado: EstadoDasTexturas) => void,
  ) {}
  definir(referencias: readonly TexturaDoCenario[]): void {
    if (this.destruido) return
    const usadas = new Map(referencias.map((ref) => [ref.digest, ref]))
    for (const [digest, pedido] of this.pedidos)
      if (!usadas.has(digest)) {
        this.pedidos.delete(digest)
        pedido.controle.abort()
        if (pedido.estado === 'pronto') pedido.valor.descartar()
      }
    for (const [digest, ref] of usadas)
      if (!this.pedidos.has(digest))
        this.pedidos.set(digest, { ref, controle: new AbortController(), estado: 'esperando' })
    this.iniciar()
    this.avisar()
  }
  obter(digest: string): TexturaCarregada | undefined {
    const p = this.pedidos.get(digest)
    return p?.estado === 'pronto' ? p.valor : undefined
  }
  repetirFalhas(): void {
    const refs = [...this.pedidos.values()].map((p) => p.ref)
    for (const [digest, p] of this.pedidos) if (p.estado === 'erro') this.pedidos.delete(digest)
    this.definir(refs)
  }
  private iniciar() {
    for (const [digest, pedido] of this.pedidos) {
      if (this.ativos >= 4) break
      if (pedido.estado !== 'esperando') continue
      const leitura: Pedido = { ...pedido, estado: 'carregando' }
      this.pedidos.set(digest, leitura)
      this.ativos++
      Promise.resolve()
        .then(() => {
          leitura.controle.signal.throwIfAborted()
          return this.carregar(leitura.ref, leitura.controle.signal)
        })
        .then(
          (valor) => {
            if (this.destruido || this.pedidos.get(digest) !== leitura) {
              valor.descartar()
              return
            }
            this.pedidos.set(digest, { ...leitura, estado: 'pronto', valor })
          },
          (erro) => {
            if (this.destruido || this.pedidos.get(digest) !== leitura) return
            this.pedidos.set(digest, {
              ...leitura,
              estado: 'erro',
              mensagem: erro instanceof Error ? erro.message : 'Não consegui carregar a textura',
            })
          },
        )
        .finally(() => {
          this.ativos--
          if (!this.destruido) {
            this.iniciar()
            this.avisar()
          }
        })
    }
  }
  private avisar() {
    this.aoMudar({
      carregando: [...this.pedidos.values()].filter(
        (p) => p.estado === 'esperando' || p.estado === 'carregando',
      ).length,
      falhas: [...this.pedidos.values()].flatMap((p) =>
        p.estado === 'erro'
          ? [{ digest: p.ref.digest, nome: p.ref.nome ?? 'Textura', mensagem: p.mensagem }]
          : [],
      ),
    })
  }
  descartar() {
    this.destruido = true
    for (const p of this.pedidos.values()) {
      p.controle.abort()
      if (p.estado === 'pronto') p.valor.descartar()
    }
    this.pedidos.clear()
  }
}
