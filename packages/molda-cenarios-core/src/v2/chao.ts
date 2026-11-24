import { CenarioInvalido } from '../validacao'
import { apoioNaAgua, transformacaoDoApoioNaAgua } from './apoio-na-agua'
import type { MontagemDeConjunto } from './conjuntos-schema'
import type {
  BaseDeCenario,
  DocumentoDeCenario,
  InstanciaDeCenario,
  Transformacao,
} from './documento'
import { comEncosta, giroDaNormal, normalDaEncosta, raioDaEncosta, semEncosta } from './encosta'
import { estruturaDoCaminho } from './estrutura-de-caminho'
import { volumeDaReferencia } from './fontes'
import { lembrar } from './memoria-da-validacao'
import { type FonteDeAlturas, PecaDeTerrenoAusente } from './terreno'
import { destransformarPonto, transformarPonto, transformarVolume } from './volume'

type BaseComModelos = Pick<DocumentoDeCenario, 'base'> &
  Partial<
    Pick<
      DocumentoDeCenario,
      'modelos' | 'formas' | 'instancias' | 'montagens' | 'aguas' | 'caminhos'
    >
  >
type ObjetoComModelo = Pick<InstanciaDeCenario, 'transformacao' | 'apoio'> &
  Partial<Pick<InstanciaDeCenario, 'modelo'>>

/** A projeção autoral sem bytes conserva a posição gravada; o palco usa a fonte carregada. */
export function posicaoDaMontagem(
  doc: Pick<DocumentoDeCenario, 'base'>,
  m: MontagemDeConjunto,
  fonte?: FonteDeAlturas,
) {
  const p = m.transformacao.posicao
  return m.apoio?.tipo === 'terreno' && (doc.base.tipo !== 'terreno' || fonte)
    ? { ...p, y: alturaDoChao(doc.base, p.x, p.z, fonte) + m.apoio.deslocamento }
    : { ...p }
}
export function alteracoesDoGestoDaMontagem(
  doc: Pick<DocumentoDeCenario, 'base'>,
  m: MontagemDeConjunto,
  mundo: Transformacao,
  fonte?: FonteDeAlturas,
): Partial<Omit<MontagemDeConjunto, 'id'>> {
  return {
    transformacao: mundo,
    ...(m.apoio?.tipo === 'terreno'
      ? {
          apoio: {
            ...m.apoio,
            deslocamento:
              mundo.posicao.y - alturaDoChao(doc.base, mundo.posicao.x, mundo.posicao.z, fonte),
          },
        }
      : {}),
  }
}

/**
 * A inclinação do relevo debaixo do objeto apoiado com `inclinar`, ou nulo (chão plano, sem a
 * opção, ou relevo ainda sem bytes: a projeção autoral não inventa encosta).
 */
function encostaDe(
  doc: BaseComModelos,
  o: ObjetoComModelo,
  fonte?: FonteDeAlturas,
): Transformacao['rotacao'] | null {
  if (o.apoio.tipo !== 'terreno' || !o.apoio.inclinar || doc.base.tipo !== 'terreno' || !fonte)
    return null
  const p = o.transformacao.posicao
  const raio = raioDaEncosta(volumeDaReferencia(doc, o.modelo), o.transformacao.escala)
  const encosta = giroDaNormal(normalDaEncosta((x, z) => fonte(x, z), p.x, p.z, raio))
  // Chão plano: nenhuma conta a mais, e o giro guardado sai exatamente como está.
  return Math.abs(encosta.x) < 1e-12 && Math.abs(encosta.z) < 1e-12 ? null : encosta
}

/** O giro resolvido de quem se apoia no relevo: o do objeto, mais a encosta quando inclina. */
function giroResolvido(
  doc: BaseComModelos,
  o: ObjetoComModelo,
  fonte?: FonteDeAlturas,
): Transformacao['rotacao'] {
  const encosta = encostaDe(doc, o, fonte)
  return encosta ? comEncosta(o.transformacao.rotacao, encosta) : { ...o.transformacao.rotacao }
}

/**
 * Na encosta, o centro da base pousa no chão (não o canto mais baixo do volume girado: esse
 * deixaria o lado de baixo flutuando).
 */
function elevacaoNaEncosta(
  doc: BaseComModelos,
  o: ObjetoComModelo,
  giro: Transformacao['rotacao'],
): number {
  if (!(o.apoio.tipo === 'terreno' && o.apoio.referencia === 'volume')) return 0
  const volume = volumeDaReferencia(doc, o.modelo)
  if (!volume) return 0
  const base = {
    x: (volume.min.x + volume.max.x) / 2,
    y: volume.min.y,
    z: (volume.min.z + volume.max.z) / 2,
  }
  return -transformarPonto(base, {
    posicao: { x: 0, y: 0, z: 0 },
    rotacao: giro,
    escala: o.transformacao.escala,
  }).y
}

/** Elevação de quem se apoia no relevo, contando a encosta quando o objeto inclina. */
function elevacaoNoRelevo(doc: BaseComModelos, o: ObjetoComModelo, fonte?: FonteDeAlturas) {
  const encosta = encostaDe(doc, o, fonte)
  return encosta
    ? elevacaoNaEncosta(doc, o, comEncosta(o.transformacao.rotacao, encosta))
    : elevacaoDoVolume(doc, o)
}

/**
 * Do que o palco mostra (giro já inclinado) ao que o documento guarda: tira a encosta do lugar
 * novo. Sem `inclinar`, devolve a mesma transformação.
 */
export function transformacaoSemEncosta(
  doc: BaseComModelos,
  o: ObjetoComModelo,
  mundo: Transformacao,
  fonte?: FonteDeAlturas,
): Transformacao {
  const encosta = encostaDe(doc, { ...o, transformacao: mundo }, fonte)
  return encosta ? { ...mundo, rotacao: semEncosta(mundo.rotacao, encosta) } : mundo
}

function elevacaoDoVolume(doc: BaseComModelos, o: ObjetoComModelo): number {
  if (
    !(o.apoio.tipo === 'terreno' && o.apoio.referencia === 'volume') &&
    !(o.apoio.tipo === 'objeto' && o.apoio.contato)
  )
    return 0
  const volume = volumeDaReferencia(doc, o.modelo)
  if (!volume) return 0
  return -transformarVolume(volume, { ...o.transformacao, posicao: { x: 0, y: 0, z: 0 } }).min.y
}

/**
 * Altura do chão num ponto. No chão plano é sempre zero. A base `perfil` (relevo calculado por
 * um jogo) também responde zero aqui: o relevo de verdade só existe depois da conversão em
 * terreno, e até lá o cenário abre sobre o plano.
 */
export function alturaDoChao(
  base: BaseDeCenario,
  x: number,
  z: number,
  fonte?: FonteDeAlturas,
): number {
  if (base.tipo === 'terreno') {
    if (!fonte) throw new PecaDeTerrenoAusente('O relevo ainda não foi carregado')
    return fonte(x, z)
  }
  return 0
}

/** Onde o objeto fica no mundo, resolvendo o apoio. É o que o palco desenha e o que se exporta. */
export function posicaoNoMundo(
  doc: BaseComModelos,
  o: ObjetoComModelo,
  fonte?: FonteDeAlturas,
  cadeia: readonly string[] = [],
): { x: number; y: number; z: number } {
  const p = o.transformacao.posicao
  if (o.apoio.tipo === 'agua') return transformacaoDoApoioNaAgua(doc, o.apoio).posicao
  if (o.apoio.tipo === 'terreno')
    return {
      x: p.x,
      y:
        alturaDoChao(doc.base, p.x, p.z, fonte) +
        o.apoio.deslocamento +
        elevacaoNoRelevo(doc, o, fonte),
      z: p.z,
    }
  if (o.apoio.tipo === 'objeto' && o.apoio.contato) {
    const caminho = doc.caminhos?.find((c) => o.apoio.tipo === 'objeto' && c.id === o.apoio.objeto)
    if (caminho) {
      // Projeção autoral sem bytes não inventa a forma do terreno nem do GLB.
      if (
        (doc.base.tipo === 'terreno' && !fonte) ||
        (fonte?.parteDoCaminho &&
          o.apoio.parte &&
          !fonte.parteDoCaminho(caminho.id, o.apoio.parte)) ||
        (o.apoio.parte?.startsWith('pilar/') && !fonte?.parteDoCaminho)
      )
        return { ...p }
      const parte = superficieDoCaminho(doc, caminho.id, o.apoio.parte, fonte),
        q = transformarPonto(o.apoio.contato, parte.transformacao)
      if (parte.perfilVertical) {
        const { inferior, superior } = perfilVertical(parte, q)
        q.y = inferior + (o.apoio.contato.y + 0.5) * (superior - inferior)
      }
      if (parte.noTerreno) q.y += alturaDoChao(doc.base, q.x, q.z, fonte)
      return { x: q.x, y: q.y + o.apoio.deslocamento + elevacaoDoVolume(doc, o), z: q.z }
    }
    const suporte = suporteDoObjeto(doc, o.apoio.objeto, fonte)
    if (cadeia.length >= 64 || cadeia.includes(o.apoio.objeto))
      throw new CenarioInvalido(['Ciclo de apoios'])
    const t = transformacaoResolvida(doc, suporte, fonte, [...cadeia, o.apoio.objeto])
    const q = transformarPonto(refletirContato(doc, suporte, o.apoio.contato), t)
    return { x: q.x, y: q.y + o.apoio.deslocamento + elevacaoDoVolume(doc, o), z: q.z }
  }
  return { x: p.x, y: p.y, z: p.z }
}

/** Uma única pose efetiva para desenho, volumes, contato, cópia e edição. */
export function transformacaoResolvida(
  doc: BaseComModelos,
  o: ObjetoComModelo,
  fonte?: FonteDeAlturas,
  cadeia: readonly string[] = [],
): Transformacao {
  if (o.apoio.tipo === 'agua') return transformacaoDoApoioNaAgua(doc, o.apoio)
  return {
    posicao: posicaoNoMundo(doc, o, fonte, cadeia),
    rotacao: giroResolvido(doc, o, fonte),
    escala: { ...o.transformacao.escala },
  }
}

const SEM_FONTE = Symbol('sem-fonte')

function suporteDoObjeto(doc: BaseComModelos, id: string, fonte?: FonteDeAlturas) {
  const instancias = doc.instancias
  // Apoio em objeto procurava a base numa lista de até 20 mil: quadrático numa validação.
  // O índice vale para o tamanho atual da lista (a expansão de conjuntos acrescenta objetos).
  const suporte = instancias
    ? (lembrar(instancias, instancias.length, () => new Map(instancias.map((o) => [o.id, o]))).get(
        id,
      ) ?? instancias.find((o) => o.id === id))
    : undefined
  if (suporte) return suporte
  const montagem = doc.montagens?.find((m) => m.id === id)
  // O contato pertence ao espaço da raiz; não muda ao reorganizar suas peças internas.
  if (montagem)
    return {
      ...montagem,
      transformacao: {
        ...montagem.transformacao,
        posicao: posicaoDaMontagem(doc, montagem, fonte),
      },
      apoio: { tipo: 'absoluto' as const },
    }
  throw new CenarioInvalido([`Apoio ausente: ${id}`])
}

function superficieDoCaminho(
  doc: BaseComModelos,
  id: string,
  chave: string | undefined,
  fonte?: FonteDeAlturas,
) {
  if (!chave) throw new CenarioInvalido(['Parte do caminho ausente'])
  const caminho = doc.caminhos?.find((c) => c.id === id)
  if (!caminho) throw new CenarioInvalido([`Apoio ausente: ${id}`])
  // A fonte do palco reutiliza as partes já usadas no desenho, inclusive a base real de
  // um pilar em GLB arqueado. Consultas puras sem esse cache usam o mesmo plano numérico.
  const parte: import('./terreno').SuperficieDeCaminho | null | undefined = fonte?.parteDoCaminho
    ? fonte.parteDoCaminho(id, chave)
    : lembrar(caminho, fonte ?? SEM_FONTE, () => {
        // Numa validação, a estrutura inteira sai uma vez e cada objeto apoiado só consulta.
        const pecas = estruturaDoCaminho(
          caminho,
          fonte ?? (() => 0),
          volumeDaReferencia(doc, caminho.acabamento ?? undefined),
        ).pecas
        return new Map(pecas.map((p) => [p.chave, p]))
      }).get(chave)
  if (!parte)
    throw new CenarioInvalido([`Parte do caminho sem superfície disponível: ${id}/${chave}`])
  const { posicao, rotacao, escala } = parte.transformacao
  if (
    ![...Object.values(posicao), ...Object.values(rotacao), ...Object.values(escala)].every(
      Number.isFinite,
    ) ||
    !Object.values(escala).every((v) => v > 0)
  )
    throw new CenarioInvalido(['A superfície do caminho tem uma transformação inválida'])
  return parte
}

function perfilVertical(
  superficie: import('./terreno').SuperficieDeCaminho,
  ponto: { x: number; z: number },
) {
  const perfil = superficie.perfilVertical!(ponto.x, ponto.z)
  if (
    !Number.isFinite(perfil.inferior) ||
    !Number.isFinite(perfil.superior) ||
    perfil.superior <= perfil.inferior + 1e-8
  )
    throw new CenarioInvalido(['A superfície do pilar não oferece um perfil vertical válido'])
  return perfil
}

/** Reflexão é a própria inversa. O contato permanece no espaço original do GLB. */
function refletirContato(
  doc: BaseComModelos,
  suporte: ObjetoComModelo & Partial<Pick<InstanciaDeCenario, 'espelho'>>,
  ponto: { x: number; y: number; z: number },
) {
  const volume = volumeDaReferencia(doc, suporte.modelo)
  if (suporte.espelho && Object.values(suporte.espelho).some(Boolean) && !volume)
    throw new CenarioInvalido(['Confira as medidas da superfície espelhada'])
  const q = { ...ponto }
  for (const e of ['x', 'y', 'z'] as const)
    if (suporte.espelho?.[e] && volume) q[e] = volume.min[e] + volume.max[e] - q[e]
  return q
}

export function apoioNaSuperficie(
  doc: BaseComModelos,
  id: string,
  ponto: { x: number; y: number; z: number },
  fonte?: FonteDeAlturas,
  parte?: string,
): InstanciaDeCenario['apoio'] {
  if (doc.caminhos?.some((c) => c.id === id)) {
    if (parte?.startsWith('pilar/') && !fonte?.parteDoCaminho)
      throw new CenarioInvalido(['Carregue as tampas reais do pilar antes de criar o contato'])
    const superficie = superficieDoCaminho(doc, id, parte, fonte),
      q = { ...ponto }
    if (superficie.noTerreno) q.y -= alturaDoChao(doc.base, q.x, q.z, fonte)
    const contato = destransformarPonto(q, superficie.transformacao)
    if (superficie.perfilVertical) {
      const { inferior, superior } = perfilVertical(superficie, q)
      contato.y = (q.y - inferior) / (superior - inferior) - 0.5
    }
    return {
      tipo: 'objeto',
      objeto: id,
      deslocamento: 0,
      parte,
      contato,
    }
  }
  if (parte) throw new CenarioInvalido(['Parte de caminho aplicada a outro tipo de objeto'])
  const suporte = suporteDoObjeto(doc, id, fonte)
  const t = transformacaoResolvida(doc, suporte, fonte)
  return {
    tipo: 'objeto',
    objeto: id,
    deslocamento: 0,
    contato: refletirContato(doc, suporte, destransformarPonto(ponto, t)),
  }
}

/**
 * O que gravar depois de um gesto que deixou o objeto em `mundo` (coordenadas de mundo).
 * Quem pisa no chão guarda a distância até ele, para acompanhar o terreno quando ele mudar.
 */
export function alteracoesDoGesto(
  doc: BaseComModelos,
  o: Pick<InstanciaDeCenario, 'apoio'> &
    Partial<Pick<InstanciaDeCenario, 'modelo' | 'transformacao'>>,
  mundo: Transformacao,
  fonte?: FonteDeAlturas,
): Pick<InstanciaDeCenario, 'transformacao' | 'apoio'> {
  if (o.apoio.tipo === 'agua')
    return { transformacao: mundo, apoio: apoioNaAgua(doc, o.apoio.agua, mundo) }
  if (o.apoio.tipo === 'objeto' && o.apoio.contato && o.transformacao) {
    const atual = posicaoNoMundo(doc, { ...o, transformacao: o.transformacao }, fonte)
    const mesmaPosicao =
      Math.hypot(atual.x - mundo.posicao.x, atual.y - mundo.posicao.y, atual.z - mundo.posicao.z) <
      1e-6
    if (mesmaPosicao) return { transformacao: mundo, apoio: o.apoio }
    const q = {
      ...mundo.posicao,
      y:
        atual.y -
        elevacaoDoVolume(doc, { ...o, transformacao: o.transformacao }) -
        o.apoio.deslocamento,
    }
    const apoio = apoioNaSuperficie(doc, o.apoio.objeto, q, fonte, o.apoio.parte)
    if (apoio.tipo !== 'objeto') throw new CenarioInvalido(['Superfície inválida'])
    return {
      transformacao: mundo,
      apoio: {
        ...apoio,
        deslocamento: mundo.posicao.y - q.y - elevacaoDoVolume(doc, { ...o, transformacao: mundo }),
      },
    }
  }
  if (o.apoio.tipo !== 'terreno') return { transformacao: mundo, apoio: o.apoio }
  const chao = alturaDoChao(doc.base, mundo.posicao.x, mundo.posicao.z, fonte)
  const mantemApoio =
    o.apoio.referencia === 'volume' &&
    o.transformacao &&
    Math.abs(
      posicaoNoMundo(doc, { ...o, transformacao: o.transformacao }, fonte).y - mundo.posicao.y,
    ) < 1e-6
  // O palco entrega o giro já inclinado; o documento guarda o do objeto, sem a encosta.
  const guardado = transformacaoSemEncosta(
    doc,
    { ...o, transformacao: mundo } as ObjetoComModelo,
    mundo,
    fonte,
  )
  const deslocamento = mantemApoio
    ? o.apoio.deslocamento
    : Math.round(
        (guardado.posicao.y -
          chao -
          elevacaoNoRelevo(doc, { ...o, transformacao: guardado }, fonte)) *
          1000,
      ) / 1000
  return {
    transformacao: { ...guardado, posicao: { ...guardado.posicao, y: chao + deslocamento } },
    apoio: { ...o.apoio, deslocamento },
  }
}
