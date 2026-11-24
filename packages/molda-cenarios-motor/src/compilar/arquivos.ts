import {
  type ArquivoCompilado,
  ArquivoCompiladoSchema,
  conferirCaminhoCompilado,
  LIMITES_DA_EXPORTACAO,
} from '@sistemazero/molda-cenarios-core/compilar'
import { digestDosBytes } from '@sistemazero/molda-cenarios-core/v2'

export type MetadadosDoArquivoCompilado = Omit<ArquivoCompilado, 'caminho' | 'bytes' | 'digest'>

/** Inventário de uma execução. Só registra bytes próprios após todas as conferências. */
export class ArquivosDaCompilacao {
  readonly arquivos = new Map<string, Uint8Array>()
  private readonly referencias = new Map<string, ArquivoCompilado>()
  private readonly conteudos = new Map<string, ArquivoCompilado>()
  private readonly nomes = new Set<string>()
  private bytes = 0
  private descartado = false
  private gravando = false
  constructor(private readonly sinal: AbortSignal) {}
  async adicionar(caminho: string, entrada: Uint8Array, metadados: MetadadosDoArquivoCompilado) {
    return this.registrar(caminho, entrada, metadados, false)
  }
  /** Retorna o caminho efetivo; conteúdo idêntico de mesmo papel não cria outro arquivo. */
  async adicionarDeduplicado(
    caminho: string,
    entrada: Uint8Array,
    metadados: MetadadosDoArquivoCompilado,
  ) {
    return this.registrar(caminho, entrada, metadados, true)
  }
  private async registrar(
    caminho: string,
    entrada: Uint8Array,
    metadados: MetadadosDoArquivoCompilado,
    deduplicar: boolean,
  ) {
    this.sinal.throwIfAborted()
    if (this.descartado) throw Error('O inventário da compilação já foi descartado.')
    if (this.gravando) throw Error('Registre os arquivos da compilação em sequência.')
    conferirCaminhoCompilado(caminho)
    if (!deduplicar && this.nomes.has(caminho.toLowerCase()))
      throw Error(`O arquivo “${caminho}” já está no pacote.`)
    if (
      entrada.byteLength > LIMITES_DA_EXPORTACAO.bytesDoPacote ||
      (!deduplicar &&
        (this.arquivos.size >= LIMITES_DA_EXPORTACAO.arquivos ||
          this.bytes + entrada.byteLength > LIMITES_DA_EXPORTACAO.bytesDoPacote))
    )
      throw Error('Os arquivos excedem o orçamento do pacote compilado.')
    // O schema é conferido antes da cópia; o hash real substitui só o campo de digest.
    const base = ArquivoCompiladoSchema.parse({
      ...metadados,
      caminho,
      bytes: entrada.length,
      digest: '0'.repeat(64),
    })
    this.gravando = true
    try {
      const bytes = new Uint8Array(entrada),
        digest = await digestDosBytes(bytes)
      this.sinal.throwIfAborted()
      if (this.descartado) throw Error('O inventário foi descartado durante a compilação.')
      const chave = `${base.papel}:${base.mime}:${digest}`,
        existente = this.conteudos.get(chave)
      if (deduplicar && existente) {
        for (const campo of [
          'bytes',
          'malhas',
          'triangulos',
          'verticesMaximos',
          'largura',
          'altura',
        ] as const)
          if (existente[campo] !== base[campo])
            throw Error('Os metadados diferem para o mesmo conteúdo compilado.')
        return { ...existente }
      }
      if (this.nomes.has(caminho.toLowerCase()))
        throw Error(`O arquivo “${caminho}” já está no pacote.`)
      if (
        this.arquivos.size >= LIMITES_DA_EXPORTACAO.arquivos ||
        this.bytes + bytes.length > LIMITES_DA_EXPORTACAO.bytesDoPacote
      )
        throw Error('Os arquivos excedem o orçamento do pacote compilado.')
      const referencia = { ...base, digest }
      this.arquivos.set(caminho, bytes)
      this.referencias.set(caminho, referencia)
      this.conteudos.set(chave, referencia)
      this.nomes.add(caminho.toLowerCase())
      this.bytes += bytes.length
      return { ...referencia }
    } finally {
      this.gravando = false
    }
  }
  descrever(): ArquivoCompilado[] {
    return [...this.referencias.values()].map((a) => ({ ...a }))
  }
  descartar() {
    this.descartado = true
    this.arquivos.clear()
    this.referencias.clear()
    this.conteudos.clear()
    this.nomes.clear()
    this.bytes = 0
  }
}
