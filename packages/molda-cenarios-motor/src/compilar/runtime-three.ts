import {
  type CenaCompilada,
  criarConsultaDeEntidadesDoNo,
  criarFonteDeAlturasCompilada,
  type EntidadeCompilada,
  LIMITES_DA_EXPORTACAO,
  type PacoteCompilado,
} from '@sistemazero/molda-cenarios-core/compilar'
import type { FonteDeAlturas } from '@sistemazero/molda-cenarios-core/v2'
import {
  Group,
  type Intersection,
  Matrix4,
  type Mesh,
  type Object3D,
  type PerspectiveCamera,
  Scene,
  type Vector3,
} from 'three'
import { AmbienteDoPalco } from '../ambiente/ambiente'
import { lerGlb, type ModeloCarregado } from '../modelos'
import { type FonteDeColisao, MundoDoTeste } from '../teste/colisoes'
import { lerTextura, type TexturaCarregada } from '../texturas'
import { conferirConteudoCompilado } from './conteudo'
import { AguaDaCenaCompilada } from './runtime-agua'
import { custoDaInstanciaCompilada, instanciarModeloCompilado } from './runtime-modelos'

export interface OpcoesDoRuntimeCompilado {
  /** Capacidade real do renderer; 4096 é o padrão portátil, não uma medição do aparelho. */
  maxTextura?: number
  aguaDinamica?: boolean
  progresso?: (pronto: number, total: number) => void
}
export type AtorDaCenaCompilada = ReturnType<typeof instanciarModeloCompilado>
export interface CenaNoThree {
  readonly cena: Scene
  readonly raiz: Group
  readonly dados: CenaCompilada
  readonly colisoes: MundoDoTeste
  readonly agua: AguaDaCenaCompilada['consulta']
  readonly alturas: FonteDeAlturas | undefined
  readonly entidades: ReadonlyMap<string, EntidadeCompilada>
  readonly atores: ReadonlyMap<string, readonly AtorDaCenaCompilada[]>
  /** O faceIndex continua identificando a entidade mesmo após a junção estática. */
  entidade(contato: Pick<Intersection, 'object' | 'faceIndex'>): string | null
  /** Delta em segundos para clipes; os efeitos recebem tempo acumulado desde o carregamento. */
  atualizar(delta: number, movimentoReduzido?: boolean): void
  quadro(camera: PerspectiveCamera, alvo: Vector3): void
  descartar(): void
}

/** Carrega uma cena pronta sem Palco, autoria, renderer ou conta da plataforma.
 * Nenhum resultado parcial escapa: o chamador só recebe recursos depois da conferência integral. */
export async function carregarCenaNoThree(
  pacote: PacoteCompilado,
  sinal: AbortSignal,
  opcoes: OpcoesDoRuntimeCompilado = {},
): Promise<CenaNoThree> {
  sinal.throwIfAborted()
  const maxTextura = opcoes.maxTextura ?? 4096
  if (!Number.isSafeInteger(maxTextura) || maxTextura < 16 || maxTextura > 32768)
    throw Error('O limite de textura do carregador é inválido.')
  const conferido = await conferirConteudoCompilado(pacote.cena, pacote.arquivos, sinal),
    dados = conferido.cena,
    cena = new Scene(),
    raiz = new Group(),
    modelos = new Map<string, ModeloCarregado>(),
    texturas = new Map<string, TexturaCarregada>(),
    copias: AtorDaCenaCompilada[] = [],
    atores = new Map<string, AtorDaCenaCompilada[]>(),
    entidades = new Map(dados.entidades.map((e) => [e.id, e])),
    identificadores = new WeakMap<Object3D, (triangulo: number) => string | null>()
  let descartado = false,
    colisoes: MundoDoTeste | undefined,
    aguas: AguaDaCenaCompilada | undefined,
    ambiente: AmbienteDoPalco | undefined,
    tempo = 0
  const descartar = () => {
    if (descartado) return
    descartado = true
    ambiente?.descartar()
    aguas?.descartar()
    colisoes?.descartar()
    for (const c of copias) c.descartar()
    for (const t of texturas.values()) t.descartar()
    for (const m of modelos.values()) m.descartar()
    copias.length = 0
    modelos.clear()
    texturas.clear()
    atores.clear()
    raiz.clear()
    cena.clear()
  }
  try {
    cena.add(raiz)
    raiz.name = dados.nome
    const usados = [...new Set([...dados.nos, ...dados.colisoes].map((n) => n.arquivo))],
      panoramas = dados.texturas.filter(
        (t) => dados.ambiente.ceu?.tipo === 'panorama' && t.id === dados.ambiente.ceu.textura,
      ),
      total = usados.length + panoramas.length
    let pronto = 0
    opcoes.progresso?.(pronto, total)
    for (const arquivo of usados) {
      sinal.throwIfAborted()
      // A cópia pertence ao loader; o inventário recebido permanece somente leitura.
      modelos.set(arquivo, await lerGlb(pacote.arquivos.get(arquivo)!.slice().buffer))
      sinal.throwIfAborted()
      opcoes.progresso?.(++pronto, total)
    }
    for (const t of panoramas) {
      sinal.throwIfAborted()
      const meta = dados.arquivos.find((a) => a.caminho === t.arquivo)!
      texturas.set(
        t.id,
        await lerTextura(pacote.arquivos.get(t.arquivo)!.slice().buffer, meta.digest, sinal),
      )
      sinal.throwIfAborted()
      opcoes.progresso?.(++pronto, total)
    }
    const custos = new Map<string, number>()
    let memoriaDasInstancias = 0
    for (const n of dados.nos) {
      let custo = custos.get(n.arquivo)
      if (custo === undefined) {
        const m = modelos.get(n.arquivo)!
        custo = custoDaInstanciaCompilada(m.raiz, m.animacoes ?? [])
        custos.set(n.arquivo, custo)
      }
      memoriaDasInstancias += custo
      if (memoriaDasInstancias > LIMITES_DA_EXPORTACAO.malha.bytesDaSaida)
        throw Error('As instâncias e animações excedem o orçamento de memória do carregador.')
    }
    const fontes: FonteDeColisao[] = [],
      fundos = new Map<string, FonteDeColisao[]>()
    for (const c of dados.colisoes) {
      sinal.throwIfAborted()
      const matriz = new Matrix4().fromArray(c.matriz)
      for (const p of modelos.get(c.arquivo)!.partes) {
        const f = {
          ...(c.entidade ? { objeto: c.entidade } : {}),
          geometria: p.geometria,
          matriz: matriz.clone().multiply(p.matriz),
        }
        fontes.push(f)
        if (c.tipo === 'agua' && c.entidade) {
          const fs = fundos.get(c.entidade) ?? []
          fs.push(f)
          fundos.set(c.entidade, fs)
        }
      }
    }
    colisoes = new MundoDoTeste(fontes)
    const alturas =
      dados.terreno && conferido.terreno
        ? criarFonteDeAlturasCompilada(
            dados.terreno,
            conferido.terreno.alturas,
            conferido.terreno.buracos,
          )
        : undefined
    aguas = new AguaDaCenaCompilada(
      conferido,
      fundos,
      alturas,
      maxTextura,
      opcoes.aguaDinamica !== false,
    )
    for (const n of dados.nos) {
      sinal.throwIfAborted()
      const modelo = modelos.get(n.arquivo)!,
        instancia = instanciarModeloCompilado(modelo.raiz, modelo.animacoes ?? []),
        grupo = new Group(),
        consulta = criarConsultaDeEntidadesDoNo(n)
      copias.push(instancia)
      grupo.name = n.id
      grupo.matrixAutoUpdate = false
      grupo.matrix.fromArray(n.matriz)
      grupo.add(instancia.raiz)
      raiz.add(grupo)
      instancia.raiz.traverse((no) => {
        const m = no as Mesh
        if (!m.isMesh) return
        m.castShadow = n.efeito !== 'agua'
        m.receiveShadow = true
        const nome = m.name
        identificadores.set(m, (triangulo) => consulta(nome, triangulo))
      })
      if (n.efeito === 'agua') aguas.aplicar(instancia.raiz, n.entidade!)
      if (!n.preservarHierarquia && !instancia.animavel) {
        // Matriz estática já fixada. O renderer não precisa recompor TRS de cada
        // pedra/árvore a cada quadro; conserva inclusive matrizes explícitas com shear.
        instancia.raiz.traverse((no) => {
          if (no.matrixAutoUpdate) {
            no.updateMatrix()
            no.matrixAutoUpdate = false
          }
        })
      }
      if (n.entidade && (n.preservarHierarquia || instancia.animavel)) {
        const as = atores.get(n.entidade) ?? []
        as.push(instancia)
        atores.set(n.entidade, as)
      }
    }
    cena.updateMatrixWorld(true)
    ambiente = new AmbienteDoPalco(cena, false, maxTextura)
    const estado = ambiente.definirCompilado(dados, (id) => ({
      textura: texturas.get(id)?.textura,
    }))
    if (estado.falhas.length || estado.carregando)
      throw Error(estado.falhas.join(' ') || 'O ambiente do pacote ficou incompleto.')
    sinal.throwIfAborted()
    const mundo = colisoes,
      agua = aguas,
      luz = ambiente
    return {
      cena,
      raiz,
      dados,
      colisoes: mundo,
      agua: agua.consulta,
      alturas,
      entidades,
      atores,
      entidade(hit) {
        if (descartado || !Number.isSafeInteger(hit.faceIndex) || hit.faceIndex! < 0) return null
        return identificadores.get(hit.object)?.(hit.faceIndex!) ?? null
      },
      atualizar(delta, movimentoReduzido = false) {
        if (descartado) throw Error('A cena compilada já foi descartada.')
        if (!Number.isFinite(delta) || delta < 0 || delta > 1)
          throw Error('O passo da cena deve ficar entre zero e um segundo.')
        tempo += delta
        for (const lista of atores.values())
          for (const c of lista) {
            if (!movimentoReduzido && c.animacoes.length) c.mixer.update(delta)
            c.raiz.updateWorldMatrix(true, true)
          }
        agua.atualizar(tempo, movimentoReduzido)
      },
      quadro(camera, alvo) {
        if (!descartado) luz.quadro(camera, alvo)
      },
      descartar,
    }
  } catch (erro) {
    descartar()
    throw erro
  }
}
