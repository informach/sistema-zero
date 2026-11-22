import {
  type CenaCompilada,
  conferirInventarioCompilado,
  LIMITES_DA_EXPORTACAO,
  lerCenaCompilada,
  memoriaPorJanela,
} from '@sistemazero/molda-cenarios-core/compilar'
import { conferirImagemDeCenario, lerPngDeAlturas } from '@sistemazero/molda-cenarios-core/v2'
import { inspecionarGlbDaCompilacao, pixelsDasImagensNovas } from './inspecao-glb'

export { inspecionarGlbDaCompilacao }

export interface ConteudoConferidoDaCena {
  cena: CenaCompilada
  terreno?: { alturas: Float32Array; buracos?: Uint8Array }
}

/** Confere o conteúdo depois do inventário, antes de entregar qualquer nó ao runtime.
 * Imagens comuns passam pelo preflight compartilhado; o consumidor ainda deve
 * tratar falha do decoder nativo como falha de carregamento da cena inteira. */
export async function conferirConteudoCompilado(
  entrada: unknown,
  arquivos: ReadonlyMap<string, Uint8Array>,
  sinal?: AbortSignal,
): Promise<ConteudoConferidoDaCena> {
  const cena = lerCenaCompilada(entrada)
  await conferirInventarioCompilado(cena, arquivos, sinal)
  const faixasPorArquivo = new Map<string, typeof cena.nos>()
  for (const n of cena.nos)
    if (n.faixas) {
      const nos = faixasPorArquivo.get(n.arquivo) ?? []
      nos.push(n)
      faixasPorArquivo.set(n.arquivo, nos)
    }
  let memoria = 0
  const imagensContadas = new Set<string>()
  // Com regiões: o que cada arquivo ocupa decodificado, sem dividir imagem com outro arquivo (a
  // conta por janela fica do lado seguro).
  const memoriaDoArquivo = new Map<string, number>()
  for (const a of cena.arquivos) {
    sinal?.throwIfAborted()
    const bytes = arquivos.get(a.caminho)!
    if (a.mime === 'model/gltf-binary') {
      const r = inspecionarGlbDaCompilacao(bytes)
      if (
        r.malhas !== a.malhas ||
        r.triangulos !== a.triangulos ||
        r.verticesMaximos !== a.verticesMaximos
      )
        throw Error(`As medidas reais de “${a.caminho}” não correspondem ao manifesto.`)
      const nomes = new Map<string, typeof r.partesNomeadas>()
      for (const p of r.partesNomeadas) {
        const ps = nomes.get(p.nome) ?? []
        ps.push(p)
        nomes.set(p.nome, ps)
      }
      for (const n of faixasPorArquivo.get(a.caminho) ?? []) {
        if (r.animavel) throw Error('Um lote com faixas não pode conter animação ou deformação.')
        const malhas = new Map<string, number>()
        for (const f of n.faixas!) malhas.set(f.malha, (malhas.get(f.malha) ?? 0) + f.triangulos)
        if (malhas.size !== r.malhas)
          throw Error('As faixas não identificam todas as malhas do lote.')
        for (const [nome, triangulos] of malhas) {
          const partes = nomes.get(nome) ?? []
          if (
            partes.length !== 1 ||
            partes[0]!.primitivas !== 1 ||
            partes[0]!.triangulos !== triangulos
          )
            throw Error('As faixas não correspondem às malhas reais do GLB.')
        }
      }
      memoria += r.bytesDeMaterializacao + (await pixelsDasImagensNovas(r.imagens, imagensContadas))
      if (cena.regioes)
        memoriaDoArquivo.set(
          a.caminho,
          r.bytesDeMaterializacao + (await pixelsDasImagensNovas(r.imagens, new Set())),
        )
    } else if (a.mime === 'image/png' || a.mime === 'image/webp') {
      if (a.papel === 'alturas') {
        if (a.caminho !== cena.terreno?.pngAlturas)
          throw Error('O PNG de alturas não pertence ao terreno compilado.')
      } else {
        const r = conferirImagemDeCenario(bytes, a.mime)
        if (r.largura !== a.largura || r.altura !== a.altura)
          throw Error(`As dimensões reais de “${a.caminho}” não correspondem ao manifesto.`)
        memoria += r.largura * r.altura * 4
        if (cena.regioes) memoriaDoArquivo.set(a.caminho, r.largura * r.altura * 4)
      }
    } else if (a.caminho !== cena.terreno?.alturas && a.caminho !== cena.terreno?.buracos)
      throw Error('Um campo binário não pertence ao terreno compilado.')
    if (memoria > LIMITES_DA_EXPORTACAO.bytesDoPacote)
      throw Error('Os arquivos decodificados excedem o orçamento de memória do pacote.')
  }
  if (cena.regioes) {
    const relevo = cena.terreno
    // O campo de alturas é global (o chão onde a região não carregou): conta em toda janela.
    if (relevo) memoriaDoArquivo.set(relevo.alturas, (relevo.colunas + 1) * (relevo.linhas + 1) * 8)
    for (const [regiao, bytes] of Object.entries(memoriaPorJanela(cena, memoriaDoArquivo)))
      if (bytes > LIMITES_DA_EXPORTACAO.janela.bytesDecodificados)
        throw Error(
          `A região ${cena.regioes.find((r) => r.id === regiao)?.nome ?? regiao} com as vizinhas excede 128 MiB decodificados.`,
        )
  }
  const t = cena.terreno
  if (!t) return { cena }
  const png = arquivos.get(t.pngAlturas)!,
    n = (t.colunas + 1) * (t.linhas + 1)
  memoria += n * 8 + (t.buracos ? t.colunas * t.linhas : 0)
  if (memoria > LIMITES_DA_EXPORTACAO.bytesDoPacote)
    throw Error('O campo decodificado excede o orçamento de memória do pacote.')
  // Artefato do compilador: cinza16, envelope completo e trabalho de leitura limitado.
  if (png.length > n * 2 + t.linhas + 1 + 65_536 || png[24] !== 16 || png[25] !== 0)
    throw Error('O mapa compilado precisa ser PNG cinza de 16 bits, dentro do orçamento.')
  const envelope = new DataView(png.buffer, png.byteOffset, png.byteLength)
  let p = 8,
    partes = 0
  while (p < png.length) {
    if (++partes > 4096 || p + 12 > png.length)
      throw Error('O PNG de alturas tem um envelope inválido.')
    const tamanho = envelope.getUint32(p),
      fim = p + 12 + tamanho,
      tipo = envelope.getUint32(p + 4)
    if (fim > png.length || (tipo === 0x49454e44 && (fim !== png.length || tamanho !== 0)))
      throw Error('O PNG de alturas tem dados após o fim ou um bloco truncado.')
    p = fim
  }
  const imagem = await lerPngDeAlturas(png)
  sinal?.throwIfAborted()
  if (imagem.largura !== t.colunas + 1 || imagem.altura !== t.linhas + 1)
    throw Error('As dimensões reais do PNG de alturas não correspondem ao terreno.')
  const bin = arquivos.get(t.alturas)!,
    v = new DataView(bin.buffer, bin.byteOffset, bin.byteLength),
    alturas = new Float32Array(n),
    min = Math.fround(t.min),
    max = Math.fround(t.max),
    faixa = t.max - t.min
  for (let i = 0; i < n; i++) {
    const altura = v.getFloat32(i * 4, true)
    if (!Number.isFinite(altura) || altura < min || altura > max)
      throw Error('O campo de alturas compilado contém um valor inválido.')
    const referencia = imagem.valores[i]! * faixa + t.min,
      erroFloat = Math.max(
        Math.abs(Math.fround(referencia) - referencia),
        Math.abs(Math.fround(t.min) - t.min),
        Math.abs(Math.fround(t.max) - t.max),
      )
    if (Math.abs(altura - referencia) > faixa / 65535 + erroFloat + faixa * 1e-7)
      throw Error('O PNG e o campo físico de alturas não correspondem.')
    alturas[i] = altura
  }
  const buracos = t.buracos ? arquivos.get(t.buracos) : undefined
  if (buracos?.some((v) => v !== 0 && v !== 1))
    throw Error('A máscara de buracos só pode conter 0 ou 1.')
  sinal?.throwIfAborted()
  return { cena, terreno: { alturas, ...(buracos ? { buracos: buracos.slice() } : {}) } }
}
