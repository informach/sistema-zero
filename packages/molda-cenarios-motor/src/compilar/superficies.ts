import {
  type ContextoDeLicencas,
  type FonteDaCompilacao,
  LIMITES_DA_EXPORTACAO,
  prepararCenaParaCompilacao,
} from '@sistemazero/molda-cenarios-core/compilar'
import {
  alturaDoChao,
  type DocumentoDeCenario,
  dominioDoChao,
  type FonteDeAlturas,
  type RecursoDeTerreno,
  validarDocumento,
} from '@sistemazero/molda-cenarios-core/v2'
import type { Texture } from 'three'
import { AguasDoPalco } from '../agua/aguas'
import { CaminhosDoPalco } from '../curvas/caminhos'
import { idsEscondidos } from '../matematica'
import type { ModeloCarregado } from '../modelos'
import { TerrenoDoPalco } from '../Terreno'

/** Constrói a região inteira com os geradores do palco, sem câmera, renderer ou LOD. */
export function montarSuperficiesDaCompilacao(
  entrada: DocumentoDeCenario,
  fonte: FonteDaCompilacao,
  contexto: ContextoDeLicencas,
  recursos: ReadonlyMap<string, RecursoDeTerreno>,
  modelo: (id: string) => ModeloCarregado | null,
  textura: (id: string) => Texture | null,
) {
  const original = validarDocumento(entrada)
  if (original.base.tipo === 'perfil') throw Error('Converta o relevo antes de compilar.')
  // O estado de edição usa doubles, pesos e máscara; as superfícies somam posições,
  // normais, cores, UVs e pesos. Limite conservador antes de construir essas cópias.
  if (original.base.tipo === 'terreno') {
    const b = original.base,
      amostras = (b.colunas + 1) * (b.linhas + 1),
      pecas = new Set(
        [...b.pecas, ...(b.solo?.pecas ?? []), ...(b.buracos ?? [])].map(
          (p) => `${p.coluna}/${p.linha}`,
        ),
      ).size,
      previsto =
        amostras * (8 + (b.solo?.camadas.length ?? 1)) + b.colunas * b.linhas + pecas * 65 * 65 * 64
    if (previsto > LIMITES_DA_EXPORTACAO.malha.bytesDaFonte)
      throw Error(
        'O terreno excede o orçamento de memória da compilação. Divida a região antes de exportar.',
      )
  }
  let terreno: TerrenoDoPalco | null = null
  const aguas = new AguasDoPalco(4096),
    caminhos = new CaminhosDoPalco()
  let descartado = false
  const descartar = () => {
    if (descartado) return
    descartado = true
    caminhos.descartar()
    aguas.descartar()
    terreno?.descartar()
  }
  try {
    terreno = original.base.tipo === 'terreno' ? new TerrenoDoPalco(original.base, recursos) : null
    terreno?.definirTexturas((id) => textura(id) ?? undefined)
    const alturas: FonteDeAlturas = terreno?.altura ?? ((x, z) => alturaDoChao(original.base, x, z))
    alturas.temChao ??= dominioDoChao(original.base)
    const dependencias = prepararCenaParaCompilacao(original, fonte, contexto, alturas),
      documento = {
        ...dependencias.documento,
        aguas: dependencias.aguas,
        caminhos: dependencias.caminhos,
      },
      escondidos = idsEscondidos(documento),
      estadoDasAguas = aguas.definir(documento, terreno, modelo, escondidos),
      estadoDosCaminhos = caminhos.definir(documento, terreno, modelo, textura, escondidos)
    const falhas = [...estadoDasAguas.falhas, ...estadoDosCaminhos.falhas]
    if (falhas.length) throw Error(falhas.map((f) => `${f.nome}: ${f.mensagem}`).join('; '))
    if (estadoDasAguas.carregando || estadoDosCaminhos.carregando)
      throw Error('A compilação exige todos os modelos e texturas usados pelas superfícies.')
    alturas.parteDoCaminho = (id, parte) => caminhos.parte(id, parte)
    const preparada = prepararCenaParaCompilacao(original, fonte, contexto, alturas)
    return {
      preparada,
      terreno,
      aguas,
      caminhos,
      alturas,
      avisos: estadoDosCaminhos.avisos,
      descartar,
    }
  } catch (erro) {
    descartar()
    throw erro
  }
}
