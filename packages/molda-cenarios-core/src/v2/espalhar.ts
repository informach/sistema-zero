import { CenarioInvalido } from '../validacao'
import { quantidadeDeObjetosDoCenario, resolverConjuntos } from './conjuntos'
import {
  type DocumentoDeCenario,
  type InstanciaDeCenario,
  InstanciaSchema,
  LIMITES_CENARIO_V2,
} from './documento'
import { dominioDoChao } from './dominio-do-chao'
import {
  type AmostraSemId,
  LIMITES_ESPALHAMENTO,
  type PinceladaDeObjetos,
  PinceladaDeObjetosSchema,
  type PrototipoDeEspalhamento,
  type ReceitaDeEspalhamento,
  ReceitaDeEspalhamentoSchema,
} from './espalhar-schema'
import { volumeDaReferencia } from './fontes'
import { indiceDaOrganizacao } from './organizacao'
import { volumeNoMundo } from './organizar'
import { girarNaVertical } from './rotacao'
import { criarSorteio } from './sorteio'
import type { FonteDeAlturas } from './terreno'
import { transformarVolume, type VolumeDeComposicao } from './volume'

type Ponto = { x: number; z: number }
type Retangulo = { minX: number; minZ: number; maxX: number; maxZ: number }
const falhar = (mensagem: string): never => {
  throw new CenarioInvalido([mensagem])
}
const retangulo = (v: VolumeDeComposicao): Retangulo => ({
  minX: v.min.x,
  minZ: v.min.z,
  maxX: v.max.x,
  maxZ: v.max.z,
})
const sobrepoe = (a: Retangulo, b: Retangulo) =>
  a.minX < b.maxX && a.maxX > b.minX && a.minZ < b.maxZ && a.maxZ > b.minZ

/** Grade esparsa; o tamanho da célula garante até 81 entradas por volume. */
class GradeDeVolumes {
  private readonly celulas = new Map<string, Retangulo[]>()
  constructor(readonly passo: number) {}
  private *chaves(r: Retangulo) {
    for (let z = Math.floor(r.minZ / this.passo); z <= Math.floor(r.maxZ / this.passo); z++)
      for (let x = Math.floor(r.minX / this.passo); x <= Math.floor(r.maxX / this.passo); x++)
        yield `${x}:${z}`
  }
  por(r: Retangulo) {
    for (const chave of this.chaves(r)) {
      const lista = this.celulas.get(chave) ?? []
      lista.push(r)
      this.celulas.set(chave, lista)
    }
  }
  ocupado(r: Retangulo, consumir: () => boolean): boolean | null {
    const vistos = new Set<Retangulo>()
    for (const chave of this.chaves(r))
      for (const outro of this.celulas.get(chave) ?? []) {
        if (vistos.has(outro)) continue
        vistos.add(outro)
        if (!consumir()) return null
        if (sobrepoe(r, outro)) return true
      }
    return false
  }
}

class GradeDeAfastamento {
  private readonly pontos = new Map<string, Ponto[]>()
  constructor(private readonly distancia: number) {}
  cabe(p: Ponto) {
    const cx = Math.floor(p.x / this.distancia),
      cz = Math.floor(p.z / this.distancia)
    for (let z = cz - 1; z <= cz + 1; z++)
      for (let x = cx - 1; x <= cx + 1; x++)
        for (const outro of this.pontos.get(`${x}:${z}`) ?? [])
          if ((p.x - outro.x) ** 2 + (p.z - outro.z) ** 2 < this.distancia ** 2) return false
    return true
  }
  por(p: Ponto) {
    const chave = `${Math.floor(p.x / this.distancia)}:${Math.floor(p.z / this.distancia)}`,
      lista = this.pontos.get(chave) ?? []
    lista.push(p)
    this.pontos.set(chave, lista)
  }
}

function conferirDestino(doc: DocumentoDeCenario, r: ReceitaDeEspalhamento) {
  const indice = indiceDaOrganizacao(doc)
  if (r.grupo && !indice.grupos.has(r.grupo)) falhar('A pasta de destino não existe')
  if (r.grupo && indice.flags.get(r.grupo)?.bloqueado) falhar('A pasta de destino está bloqueada')
  if (r.camada && !indice.camadas.has(r.camada)) falhar('A camada de destino não existe')
  if (r.camada && indice.camadas.get(r.camada)?.bloqueado)
    falhar('A camada de destino está bloqueada')
  for (const p of r.prototipos) {
    if (!volumeDaReferencia(doc, p.modelo)) falhar(`Confira as medidas do modelo: ${p.nome}`)
    if (p.aparencia?.textura && !doc.texturas?.some((t) => t.id === p.aparencia!.textura!.id))
      falhar('A textura do pincel não está neste cenário')
  }
}

const anguloNormal = (v: number) =>
  ((((v + Math.PI) % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2)) - Math.PI
function transformacao(p: PrototipoDeEspalhamento, a: AmostraSemId) {
  const giro = girarNaVertical(p.rotacao, a.giro)
  return {
    posicao: { x: a.x, y: 0, z: a.z },
    rotacao: { x: anguloNormal(giro.x), y: anguloNormal(giro.y), z: anguloNormal(giro.z) },
    escala: { x: p.escala.x * a.fator, y: p.escala.y * a.fator, z: p.escala.z * a.fator },
  }
}
function naArea(p: Ponto, r: ReceitaDeEspalhamento) {
  return r.traco.some(
    (centro) => (p.x - centro.x) ** 2 + (p.z - centro.z) ** 2 <= r.raio ** 2 + 1e-8,
  )
}

export interface ResultadoDeEspalhamento {
  amostras: AmostraSemId[]
  tentativas: number
  saturou: boolean
  /** A densidade sugeriu mais peças do que couberam, sem prometer ocupar toda área. */
  faltouEspaco: boolean
}

/** Prepara medidas e ocupação uma vez; mover o pincel não volta a percorrer o documento inteiro. */
export function criarAmostradorDeEspalhamento(
  doc: DocumentoDeCenario,
  entrada: unknown,
  fonte?: FonteDeAlturas,
) {
  const r = ReceitaDeEspalhamentoSchema.parse(entrada)
  conferirDestino(doc, r)
  if (doc.base.tipo === 'perfil') falhar('Converta o perfil em terreno antes de espalhar objetos')
  if (doc.base.tipo === 'terreno' && !fonte) falhar('Aguarde o carregamento das alturas do terreno')
  const quantidade = quantidadeDeObjetosDoCenario(doc)
  if (quantidade >= LIMITES_CENARIO_V2.objetos) falhar('O cenário atingiu o limite de objetos')
  const dominio = dominioDoChao(structuredClone(doc.base)),
    temChao = (p: { x: number; z: number }) => dominio(p) && (!fonte?.temChao || fonte.temChao(p)),
    volumes = r.prototipos.map((p) => structuredClone(volumeDaReferencia(doc, p.modelo)!))
  const consulta = r.evitarObjetos ? resolverConjuntos(doc, fonte).documento : doc
  const ocupados = r.evitarObjetos
    ? consulta.instancias.map((o) => retangulo(volumeNoMundo(consulta, o, fonte)))
    : []
  // Raio da esfera local limita a projeção XZ para qualquer giro e escala permitidos.
  const maior = Math.max(
    r.afastamento,
    ...volumes.map((v, i) => {
      const escala = r.prototipos[i]!.escala,
        s = Math.max(escala.x, escala.y, escala.z) * r.tamanhoMax
      return (
        2 *
        Math.hypot(
          Math.max(Math.abs(v.min.x), Math.abs(v.max.x)),
          Math.max(Math.abs(v.min.y), Math.abs(v.max.y)),
          Math.max(Math.abs(v.min.z), Math.abs(v.max.z)),
        ) *
        s
      )
    }),
    ...ocupados.map((v) => Math.max(v.maxX - v.minX, v.maxZ - v.minZ)),
  )
  const passo = Math.max(0.1, maior / 8),
    existentes = new GradeDeVolumes(passo)
  for (const v of ocupados) existentes.por(v)
  const limite = Math.max(0, Math.min(r.limite, LIMITES_CENARIO_V2.objetos - quantidade))

  return {
    gerar(traco: ReceitaDeEspalhamento['traco'] = r.traco): ResultadoDeEspalhamento {
      const receita = ReceitaDeEspalhamentoSchema.parse({ ...r, traco })
      const amostras: AmostraSemId[] = [],
        proximos = new GradeDeAfastamento(r.afastamento),
        novos = new GradeDeVolumes(passo),
        visitadas = new Set<string>()
      const celula = Math.sqrt(100 / r.densidade)
      let tentativas = 0,
        consultas = 0,
        desejadas = 0,
        saturou = limite === 0
      const consumir = () => ++consultas <= LIMITES_ESPALHAMENTO.consultas
      tracoCompleto: for (const centro of receita.traco) {
        for (
          let cz = Math.floor((centro.z - r.raio) / celula);
          cz <= Math.floor((centro.z + r.raio) / celula);
          cz++
        )
          for (
            let cx = Math.floor((centro.x - r.raio) / celula);
            cx <= Math.floor((centro.x + r.raio) / celula);
            cx++
          ) {
            if (
              amostras.length >= limite ||
              tentativas >= LIMITES_ESPALHAMENTO.tentativas ||
              consultas >= LIMITES_ESPALHAMENTO.consultas
            ) {
              saturou = true
              break tracoCompleto
            }
            tentativas++
            const chave = `${cx}:${cz}`
            if (visitadas.has(chave)) continue
            // Um candidato irregular por célula, estável no mundo. Sobrepor discos não duplica a densidade.
            const hash = (Math.imul(cx ^ r.semente, 0x45d9f3b) ^ Math.imul(cz, 0x27d4eb2d)) >>> 0,
              sorteio = criarSorteio(hash)
            const x = (cx + sorteio()) * celula,
              z = (cz + sorteio()) * celula
            if ((x - centro.x) ** 2 + (z - centro.z) ** 2 > r.raio ** 2) continue
            visitadas.add(chave)
            if (!temChao({ x, z })) continue
            desejadas++
            if (!proximos.cabe({ x, z })) continue
            const prototipo = Math.min(
                r.prototipos.length - 1,
                Math.floor(sorteio() * r.prototipos.length),
              ),
              p = r.prototipos[prototipo]!
            const a: AmostraSemId = {
              x,
              z,
              prototipo,
              fator: r.tamanhoMin + sorteio() * (r.tamanhoMax - r.tamanhoMin),
              giro: (sorteio() * 2 - 1) * r.giro,
            }
            if (fonte && !Number.isFinite(fonte(x, z)))
              falhar('A altura do terreno não está disponível')
            if (r.evitarObjetos) {
              const caixa = retangulo(transformarVolume(volumes[prototipo]!, transformacao(p, a)))
              const anterior = existentes.ocupado(caixa, consumir),
                novo = novos.ocupado(caixa, consumir)
              if (anterior === null || novo === null) {
                saturou = true
                break tracoCompleto
              }
              if (anterior || novo) continue
              novos.por(caixa)
            }
            amostras.push(a)
            proximos.por(a)
          }
      }
      return { amostras, tentativas, saturou, faltouEspaco: amostras.length < desejadas }
    },
  }
}

/** Construção comum à prévia e à aplicação; não escreve no documento nem valida permissões. */
export function instanciaDoEspalhamento(
  r: ReceitaDeEspalhamento,
  a: AmostraSemId,
  id: string,
  ordem: number,
): InstanciaDeCenario {
  const p = r.prototipos[a.prototipo]
  if (!p) falhar('O protótipo da peça não existe')
  return {
    nome: `${p!.nome.slice(0, 108)} ${ordem + 1}`,
    modelo: p!.modelo,
    colisao: p!.colisao,
    ...(p!.espelho ? { espelho: p!.espelho } : {}),
    ...(p!.aparencia ? { aparencia: p!.aparencia } : {}),
    ...(p!.propriedades ? { propriedades: p!.propriedades } : {}),
    id,
    grupo: r.grupo,
    camada: r.camada,
    bloqueado: false,
    oculto: false,
    apoio: { tipo: 'terreno', deslocamento: 0, referencia: 'volume', inclinar: false },
    transformacao: transformacao(p!, a),
  }
}

/** Receitas e amostras aceitas são autorais: o replay não depende de ler alturas novamente. */
export function materializarEspalhamento(
  doc: DocumentoDeCenario,
  entrada: PinceladaDeObjetos,
): InstanciaDeCenario[] {
  const { receita: r, amostras } = PinceladaDeObjetosSchema.parse(entrada)
  conferirDestino(doc, r)
  if (
    amostras.length > r.limite ||
    amostras.length + quantidadeDeObjetosDoCenario(doc) > LIMITES_CENARIO_V2.objetos
  )
    falhar('A pincelada ultrapassa o limite de objetos')
  const ids = new Set(doc.instancias.map((o) => o.id)),
    entidades = new Set(
      [
        ...doc.grupos,
        ...doc.caminhos,
        ...doc.aguas,
        ...doc.marcadores,
        ...(doc.montagens ?? []),
      ].map((e) => e.id),
    ),
    temChao = dominioDoChao(doc.base),
    proximos = new GradeDeAfastamento(r.afastamento)
  return amostras.map((a, i) => {
    if (ids.has(a.id) || entidades.has(a.id)) falhar('A pincelada tem um identificador repetido')
    ids.add(a.id)
    const p = r.prototipos[a.prototipo]
    if (
      !p ||
      !naArea(a, r) ||
      !temChao(a) ||
      a.fator < r.tamanhoMin ||
      a.fator > r.tamanhoMax ||
      Math.abs(a.giro) > r.giro
    )
      falhar('Uma peça está fora dos limites da pincelada')
    if (!proximos.cabe(a)) falhar('As peças não respeitam o afastamento da pincelada')
    proximos.por(a)
    return InstanciaSchema.parse(instanciaDoEspalhamento(r, a, a.id, i))
  })
}
