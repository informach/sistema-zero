import { cameraDoMarcador, type VistaDeCamera } from '../v2/camera'
import { posicaoDaMontagem, transformacaoResolvida } from '../v2/chao'
import { resolverConjuntos } from '../v2/conjuntos'
import type { MontagemDeConjunto } from '../v2/conjuntos-schema'
import type {
  AguaDeCenario,
  CaminhoDeCenario,
  DocumentoDeCenario,
  InstanciaDeCenario,
  MarcadorDeCenario,
  ModeloDoCenario,
  TexturaDoCenario,
  Transformacao,
} from '../v2/documento'
import type { FormaDeCenario } from '../v2/formas'
import { rotaDoMarcador, transformacaoDoMarcador } from '../v2/marcadores'
import { indiceDaOrganizacao } from '../v2/organizacao'
import { referenciasDoTerreno } from '../v2/recursos-de-terreno'
import type { FonteDeAlturas } from '../v2/terreno'
import { validarDocumento } from '../v2/validacao'
import { type FonteDaCompilacao, FonteDaCompilacaoSchema } from './fonte'
import {
  type ContextoDeLicencas,
  conferirLicencasDaCompilacao,
  type LicencaDaBiblioteca,
} from './licencas'

export interface MarcadorPreparado {
  marcador: MarcadorDeCenario
  transformacao: Transformacao
  rota?: ReturnType<typeof rotaDoMarcador>
  camera?: VistaDeCamera
}
export interface PreparacaoDaCena {
  fonte: FonteDaCompilacao
  /** Projeção completa para os geradores compartilhados; não é o manifesto de distribuição. */
  documento: DocumentoDeCenario
  /** Somente visíveis, já em posição absoluta. Apoios não serão aplicados uma segunda vez. */
  objetos: InstanciaDeCenario[]
  aguas: AguaDeCenario[]
  caminhos: CaminhoDeCenario[]
  marcadores: MarcadorPreparado[]
  montagens: MontagemDeConjunto[]
  origens: ReadonlyMap<string, string>
  modelos: ModeloDoCenario[]
  formas: FormaDeCenario[]
  texturas: TexturaDoCenario[]
  terreno: ReturnType<typeof referenciasDoTerreno>
  licencas: LicencaDaBiblioteca[]
}

/** Preparação numérica comum. O adaptador fornece alturas/superfícies reais e confere os GLBs.
 * Não faz IO, não supõe terreno plano quando falta o campo e não altera a revisão autoral. */
export function prepararCenaParaCompilacao(
  entrada: DocumentoDeCenario,
  fonte: FonteDaCompilacao,
  contexto: ContextoDeLicencas,
  alturas?: FonteDeAlturas,
): PreparacaoDaCena {
  const origem = FonteDaCompilacaoSchema.parse(fonte),
    original = validarDocumento(entrada)
  if (origem.cenario !== original.id) throw Error('A fonte da compilação pertence a outro cenário.')
  if (original.base.tipo === 'perfil')
    throw Error('Converta o relevo do perfil em terreno antes de exportar.')
  if (original.base.tipo === 'terreno' && !alturas)
    throw Error('Carregue as alturas reais do relevo antes de exportar.')
  const organizacaoOriginal = indiceDaOrganizacao(original),
    montagens = (original.montagens ?? [])
      .filter((m) => !organizacaoOriginal.flags.get(m.id)?.oculto)
      .map((m) => ({
        ...m,
        apoio: { tipo: 'absoluto' as const },
        transformacao: { ...m.transformacao, posicao: posicaoDaMontagem(original, m, alturas) },
      })),
    resolvida = resolverConjuntos(original, alturas),
    documento = resolvida.documento,
    organizacao = indiceDaOrganizacao(documento),
    visivel = (e: { id: string }) => !organizacao.flags.get(e.id)?.oculto,
    objetos = documento.instancias.filter(visivel).map((o) => ({
      ...o,
      apoio: { tipo: 'absoluto' as const },
      transformacao: transformacaoResolvida(documento, o, alturas),
    })),
    aguas = documento.aguas.filter(visivel),
    caminhos = documento.caminhos.filter(visivel),
    marcadores = documento.marcadores.filter(visivel).map(
      (marcador): MarcadorPreparado => ({
        marcador,
        transformacao: transformacaoDoMarcador(documento, marcador, alturas),
        ...(marcador.configuracao?.tipo === 'rota'
          ? { rota: rotaDoMarcador(documento, marcador, alturas) }
          : {}),
        ...(marcador.configuracao?.tipo === 'camera'
          ? { camera: cameraDoMarcador(documento, marcador, alturas) }
          : {}),
      }),
    ),
    idsModelos = new Set<string>(),
    idsTexturas = new Set<string>(),
    bibliotecas = new Set<string>()
  for (const o of objetos) {
    idsModelos.add(o.modelo)
    if (o.aparencia?.textura) idsTexturas.add(o.aparencia.textura.id)
  }
  for (const a of aguas)
    if ((a.tipo === 'lago' || a.tipo === 'represa') && a.modelo) idsModelos.add(a.modelo)
  for (const c of caminhos) {
    if (c.acabamento) idsModelos.add(c.acabamento)
    if (c.aparencia?.textura) idsTexturas.add(c.aparencia.textura.id)
  }
  if (documento.base.tipo === 'terreno')
    for (const c of documento.base.solo?.camadas ?? []) if (c.textura) idsTexturas.add(c.textura.id)
  if (documento.iluminacao.ceu?.tipo === 'panorama')
    idsTexturas.add(documento.iluminacao.ceu.textura)
  const modelos = documento.modelos.filter((m) => idsModelos.has(m.id)),
    formas = (documento.formas ?? []).filter((f) => idsModelos.has(f.id)),
    texturas = (documento.texturas ?? []).filter((t) => idsTexturas.has(t.id))
  for (const r of [...modelos, ...texturas]) bibliotecas.add(r.biblioteca)
  const definicoes = new Map(original.definicoesConjuntos?.map((d) => [d.id, d]))
  for (const m of montagens) {
    const d = definicoes.get(m.definicao)
    if (!d) throw Error('A definição do conjunto não está disponível para a compilação.')
    bibliotecas.add(d.biblioteca)
  }
  const licencas = conferirLicencasDaCompilacao([...bibliotecas], contexto)
  return {
    fonte: origem,
    documento,
    objetos,
    aguas,
    caminhos,
    marcadores,
    montagens,
    origens: resolvida.origens,
    modelos,
    formas,
    texturas,
    terreno: documento.base.tipo === 'terreno' ? referenciasDoTerreno(documento.base) : [],
    licencas,
  }
}
