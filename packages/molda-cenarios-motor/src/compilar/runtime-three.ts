import {
  type CenaCompilada,
  criarConsultaDeEntidadesDoNo,
  criarFonteDeAlturasCompilada,
  criarPlanoDaCarga,
  type EntidadeCompilada,
  LIMITES_DA_EXPORTACAO,
  type PacoteCompilado,
  regiaoDoPonto,
} from '@sistemazero/molda-cenarios-core/compilar'
import { type FonteDeAlturas, lerPngDePesos } from '@sistemazero/molda-cenarios-core/v2'
import {
  BoxGeometry,
  type Camera,
  Fog,
  Group,
  type Intersection,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  type Object3D,
  Scene,
  Vector3,
} from 'three'
import { AmbienteDoPalco } from '../ambiente/ambiente'
import { LuzesLocaisDoPalco } from '../ambiente/luzes-locais'
import { type CacheDeImagens, lerGlb, type ModeloCarregado } from '../modelos'
import type { CampoDeColisao } from '../teste/campo'
import {
  type CacheDeArvores,
  type FonteDeColisao,
  liberarArvores,
  MundoDoTeste,
} from '../teste/colisoes'
import { lerTextura, type TexturaCarregada } from '../texturas'
import { conferirConteudoCompilado } from './conteudo'
import { AguaDaCenaCompilada } from './runtime-agua'
import { custoDaInstanciaCompilada, instanciarModeloCompilado } from './runtime-modelos'
import { RelevoNoThree } from './runtime-relevo'

export type { TrianguloDaConsulta } from '../teste/colisoes'
export { resolverInicioDaCena } from './inicio'

export interface OpcoesDoRuntimeCompilado {
  /** O jogo pode conservar seu céu/ciclo do dia e receber somente as luzes locais autorais. */
  ambiente?: 'completo' | 'luzes-locais'
  /** Capacidade real do renderer; 4096 é o padrão portátil, não uma medição do aparelho. */
  maxTextura?: number
  aguaDinamica?: boolean
  /** Hospedeiros com oceano compartilhado conservam sua água/fundo mundial. */
  marExterno?: boolean
  /** Entidades cujos clipes são conduzidos pelo sistema nativo de personagens. */
  animacaoExterna?: ReadonlySet<string>
  /** Entidades cujos colisores são instalados pelo hospedeiro, mantendo a representação visual. */
  colisoresExternos?: ReadonlySet<string>
  /**
   * `'tudo'` (o padrão) carrega a cena inteira, como sempre. `'regioes'` carrega, numa cena com
   * regiões, só a janela de onde o foco do `quadro` está (lote 6 da conclusão, 22/11/2026); numa
   * cena sem regiões é o mesmo que `'tudo'`. O Arquipélago, o GLB único e a exportação portátil
   * ficam no padrão.
   */
  carga?: 'tudo' | 'regioes'
  progresso?: (pronto: number, total: number) => void
}
export type AtorDaCenaCompilada = ReturnType<typeof instanciarModeloCompilado>
/** Como está a carga por regiões (`null` quando a cena carrega inteira). */
export interface EstadoDasRegioes {
  /** A região onde o foco está (nenhuma fora de todas). */
  atual: string | null
  carregadas: readonly string[]
  carregando: readonly string[]
  /** As regiões que falharam e esperam a próxima tentativa (1, 4 e 15 s). */
  falhas: readonly string[]
  /** O recado da primeira falha, uma vez (o chão do relevo segura quem está lá). */
  aviso: string | null
  /** Quantos arquivos (modelos e colisões) e imagens estão na memória agora. */
  arquivos: number
  imagens: number
}
/** O que o bloco de região pergunta: um ponto no chão, um objeto do three ou uma entidade. */
export type AlvoDaRegiao =
  | { x: number; z: number }
  | { position: { x: number; z: number } }
  | { mesh: { position: { x: number; z: number } } }
export interface CenaNoThree {
  readonly cena: Scene
  readonly raiz: Group
  readonly dados: CenaCompilada
  readonly colisoes: MundoDoTeste
  readonly agua: AguaDaCenaCompilada['consulta']
  readonly alturas: FonteDeAlturas | undefined
  readonly entidades: ReadonlyMap<string, EntidadeCompilada>
  readonly atores: ReadonlyMap<string, readonly AtorDaCenaCompilada[]>
  /** Instâncias visuais por nó, inclusive peças sem identidade de entidade. */
  readonly instancias: ReadonlyMap<string, AtorDaCenaCompilada>
  /** O faceIndex continua identificando a entidade mesmo após a junção estática. */
  entidade(contato: Pick<Intersection, 'object' | 'faceIndex'>): string | null
  /** Delta em segundos para clipes; os efeitos recebem tempo acumulado desde o carregamento. */
  atualizar(delta: number, movimentoReduzido?: boolean): void
  /** Na carga por regiões, o `alvo` é o foco que decide o que fica carregado. */
  quadro(camera: Camera, alvo: Vector3): void
  estadoDasRegioes(): EstadoDasRegioes | null
  /** O relevo em campo desenhado em pedaços (`null` no terreno de sempre). */
  estadoDoRelevo(): ReturnType<RelevoNoThree['estado']> | null
  /**
   * A região (pelo nome) onde está o `alvo` (um ponto `{x, z}`, um objeto com `position` ou uma
   * entidade com `mesh.position`), com a tolerância de meio metro na borda para quem estava em
   * `anterior`; `null` fora de todas, sem alvo ou numa cena sem regiões. É o que o bloco "Quando
   * entrar na região" pergunta a cada quadro; com `esperado`, um nome que a cena não tem é
   * avisado uma vez no console (que o Estúdio mostra em Mensagens do jogo).
   */
  regiao(
    alvo: AlvoDaRegiao | null | undefined,
    anterior?: string | null,
    esperado?: string,
  ): string | null
  descartar(): void
}

/** As esperas entre as tentativas de carregar uma região que falhou, em segundos. */
const NOVAS_TENTATIVAS = [1, 4, 15] as const

/** Carrega uma cena pronta sem Palco, autoria, renderer ou conta da plataforma.
 * Nenhum resultado parcial escapa: o chamador só recebe recursos depois da conferência integral. */
export async function carregarCenaNoThree(
  pacote: PacoteCompilado,
  sinal: AbortSignal,
  opcoes: OpcoesDoRuntimeCompilado = {},
): Promise<CenaNoThree> {
  sinal.throwIfAborted()
  // O chamador pode editar seu estado enquanto os recursos são conferidos.
  opcoes = {
    ...opcoes,
    animacaoExterna: new Set(opcoes.animacaoExterna),
    colisoresExternos: new Set(opcoes.colisoresExternos),
  }
  if (opcoes.ambiente !== undefined && !['completo', 'luzes-locais'].includes(opcoes.ambiente))
    throw Error('O modo de ambiente do cenário é inválido.')
  if (opcoes.carga !== undefined && !['tudo', 'regioes'].includes(opcoes.carga))
    throw Error('O modo de carga do cenário é inválido.')
  const maxTextura = opcoes.maxTextura ?? 4096
  if (!Number.isSafeInteger(maxTextura) || maxTextura < 16 || maxTextura > 32768)
    throw Error('O limite de textura do carregador é inválido.')
  const conferido = await conferirConteudoCompilado(pacote.cena, pacote.arquivos, sinal),
    dados = conferido.cena,
    cena = new Scene(),
    raiz = new Group(),
    modelos = new Map<string, { modelo: ModeloCarregado; usos: number }>(),
    texturas = new Map<string, TexturaCarregada>(),
    copias: AtorDaCenaCompilada[] = [],
    atualizaveis: AtorDaCenaCompilada[] = [],
    atores = new Map<string, AtorDaCenaCompilada[]>(),
    instancias = new Map<string, AtorDaCenaCompilada>(),
    entidades = new Map(dados.entidades.map((e) => [e.id, e])),
    identificadores = new WeakMap<Object3D, (triangulo: number) => string | null>(),
    nosCarregados = new Map<string, { grupo: Group; desfazerAgua: () => void }>(),
    colisoesCarregadas = new Set<string>(),
    arvores: CacheDeArvores = new Map()
  const animacoesExternas = new WeakSet<AtorDaCenaCompilada>()
  const regioes = opcoes.carga === 'regioes' && dados.regioes?.length ? dados.regioes : null
  let descartado = false,
    colisoes: MundoDoTeste | undefined,
    aguas: AguaDaCenaCompilada | undefined,
    ambiente: AmbienteDoPalco | undefined,
    locais: LuzesLocaisDoPalco | undefined,
    relevo: RelevoNoThree | undefined,
    ancora: Mesh | undefined,
    tempo = 0
  const descartar = () => {
    if (descartado) return
    descartado = true
    ambiente?.descartar()
    locais?.descartar()
    relevo?.descartar()
    for (const { desfazerAgua } of nosCarregados.values()) desfazerAgua()
    aguas?.descartar()
    colisoes?.descartar()
    for (const c of copias) c.descartar()
    for (const t of texturas.values()) t.descartar()
    for (const m of modelos.values()) m.modelo.descartar()
    liberarArvores(arvores, [...arvores.keys()])
    if (ancora) {
      ancora.geometry.dispose()
      ;(ancora.material as MeshBasicMaterial).dispose()
    }
    copias.length = 0
    atualizaveis.length = 0
    imagens.clear()
    usosDasImagens.clear()
    modelos.clear()
    texturas.clear()
    atores.clear()
    instancias.clear()
    nosCarregados.clear()
    colisoesCarregadas.clear()
    raiz.clear()
    cena.clear()
  }
  // O relevo em campo (plano "Mundos de 2 km", lote 2): a colisão lê as alturas conferidas, sem
  // malha do chão nem cópia (a régua do "× 8" do orçamento da janela).
  const campo: CampoDeColisao | undefined =
    dados.terreno?.relevo && conferido.terreno
      ? {
          origem: dados.terreno.origem,
          passo: dados.terreno.passo,
          colunas: dados.terreno.colunas,
          linhas: dados.terreno.linhas,
          alturas: conferido.terreno.alturas,
          ...(conferido.terreno.buracos ? { buracos: conferido.terreno.buracos } : {}),
        }
      : undefined
  const nosPorId = new Map(dados.nos.map((n) => [n.id, n])),
    colisoesPorId = new Map(dados.colisoes.map((c) => [c.id, c])),
    maresExternos = new Set(
      opcoes.marExterno ? dados.aguas.filter((a) => a.tipo === 'mar').map((a) => a.id) : [],
    )

  /** Os arquivos de um conjunto de nós e colisões, cada um uma vez, na ordem da cena. */
  const arquivosDe = (nos: Iterable<string>, cols: Iterable<string>) => [
    ...new Set([
      ...[...nos].map((id) => nosPorId.get(id)!.arquivo),
      ...[...cols].map((id) => colisoesPorId.get(id)!.arquivo),
    ]),
  ]
  const imagens: CacheDeImagens = new Map(),
    // Na carga por regiões o cache vive entre as cargas e é contado: a imagem sai quando o último
    // modelo que a usa sai (o atlas de um kit repetido nas regiões é decodificado uma vez).
    usosDasImagens = new Map<string, number>()
  /** Lê o arquivo (ou conta mais um uso dele). */
  const usarArquivo = async (arquivo: string) => {
    const ja = modelos.get(arquivo)
    if (ja) {
      ja.usos++
      return
    }
    // A cópia pertence ao loader; o inventário recebido permanece somente leitura.
    let modelo: Awaited<ReturnType<typeof lerGlb>>
    try {
      modelo = await lerGlb(pacote.arquivos.get(arquivo)!.slice().buffer, { imagens })
    } catch (erro) {
      // O loader pode ter posto uma imagem no cache antes de falhar noutra parte do mesmo
      // arquivo: sem modelo que a conte, ela ficaria na memória até o fim da cena (revisão do
      // lote 6). As cargas são uma por vez, então sem uso contado é desta.
      for (const chave of [...imagens.keys()]) if (!usosDasImagens.has(chave)) imagens.delete(chave)
      throw erro
    }
    if (descartado) {
      modelo.descartar()
      throw Error('A cena compilada foi descartada durante a carga.')
    }
    const outro = modelos.get(arquivo)
    if (outro) {
      // Duas cargas pediram o mesmo arquivo ao mesmo tempo: fica a primeira.
      outro.usos++
      modelo.descartar()
    } else {
      modelos.set(arquivo, { modelo, usos: 1 })
      for (const chave of modelo.imagensDoCache ?? [])
        usosDasImagens.set(chave, (usosDasImagens.get(chave) ?? 0) + 1)
    }
  }
  /** Um uso a menos; o último descarta o modelo e as árvores de colisão dele. */
  const soltarArquivo = (arquivo: string) => {
    const m = modelos.get(arquivo)
    if (!m || --m.usos > 0) return
    modelos.delete(arquivo)
    liberarArvores(
      arvores,
      m.modelo.partes.map((p) => p.geometria),
    )
    m.modelo.descartar()
    for (const chave of m.modelo.imagensDoCache ?? []) {
      const usos = (usosDasImagens.get(chave) ?? 1) - 1
      if (usos > 0) usosDasImagens.set(chave, usos)
      else {
        usosDasImagens.delete(chave)
        imagens.delete(chave)
      }
    }
  }

  const instanciarNo = (n: CenaCompilada['nos'][number]) => {
    const modelo = modelos.get(n.arquivo)!.modelo,
      instancia = instanciarModeloCompilado(modelo.raiz, modelo.animacoes ?? []),
      grupo = new Group(),
      consulta = criarConsultaDeEntidadesDoNo(n)
    copias.push(instancia)
    if (n.entidade && opcoes.animacaoExterna!.has(n.entidade)) animacoesExternas.add(instancia)
    if (n.preservarHierarquia || instancia.animavel) atualizaveis.push(instancia)
    instancias.set(n.id, instancia)
    grupo.name = n.id
    if (n.entidade && maresExternos.has(n.entidade)) grupo.visible = false
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
    const desfazerAgua =
      n.efeito === 'agua' ? aguas!.aplicar(instancia.raiz, n.entidade!) : () => {}
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
    grupo.updateMatrixWorld(true)
    nosCarregados.set(n.id, { grupo, desfazerAgua })
  }
  const descartarNo = (id: string) => {
    const carregado = nosCarregados.get(id),
      instancia = instancias.get(id)
    if (!carregado || !instancia) return
    nosCarregados.delete(id)
    instancias.delete(id)
    carregado.desfazerAgua()
    carregado.grupo.removeFromParent()
    instancia.descartar()
    for (const lista of [copias, atualizaveis]) {
      const i = lista.indexOf(instancia)
      if (i >= 0) lista.splice(i, 1)
    }
    const n = nosPorId.get(id)!
    if (n.entidade) {
      const as = atores.get(n.entidade)?.filter((a) => a !== instancia)
      if (as?.length) atores.set(n.entidade, as)
      else atores.delete(n.entidade)
    }
    soltarArquivo(n.arquivo)
  }
  /** O mundo de colisões das colisões carregadas, sem refazer árvore nenhuma. */
  const refazerColisoes = () => {
    const fontes: FonteDeColisao[] = []
    for (const c of dados.colisoes) {
      if (!colisoesCarregadas.has(c.id)) continue
      if (
        c.entidade &&
        (opcoes.colisoresExternos!.has(c.entidade) || maresExternos.has(c.entidade))
      )
        continue
      const matriz = new Matrix4().fromArray(c.matriz)
      for (const p of modelos.get(c.arquivo)!.modelo.partes)
        fontes.push({
          ...(c.entidade ? { objeto: c.entidade } : {}),
          geometria: p.geometria,
          matriz: matriz.clone().multiply(p.matriz),
        })
    }
    const anterior = colisoes
    colisoes = new MundoDoTeste(fontes, arvores, campo)
    anterior?.descartar()
  }

  // As listas das regiões e o que é de todas (não aparece em lista nenhuma).
  const nosListados = new Set(regioes?.flatMap((r) => r.nos) ?? []),
    colisoesListadas = new Set(regioes?.flatMap((r) => r.colisoes) ?? []),
    regiaoPorId = new Map((regioes ?? []).map((r) => [r.id, r]))
  /** Os nós e as colisões de um conjunto de regiões, com o que é de todas. A água: sempre. */
  const itensDasRegioes = (ids: Iterable<string>) => {
    const nos = new Set(dados.nos.filter((n) => !nosListados.has(n.id)).map((n) => n.id)),
      cols = new Set(
        dados.colisoes
          .filter((c) => !colisoesListadas.has(c.id) || c.tipo === 'agua')
          .map((c) => c.id),
      )
    for (const id of ids) {
      const r = regiaoPorId.get(id)
      if (!r) continue
      for (const n of r.nos) nos.add(n)
      for (const c of r.colisoes) cols.add(c)
    }
    return { nos, cols }
  }
  const plano = regioes ? criarPlanoDaCarga(regioes) : null
  let regioesCarregadas = new Set<string>(),
    atual: string | null = null,
    aviso: string | null = null,
    pedido: Set<string> | null = null,
    emCurso: Set<string> | null = null,
    aplicando: Promise<void> | null = null
  const falhas = new Map<string, { tentativa: number; proxima: number }>()
  /** Os nomes de região que o jogo pediu e a cena não tem (avisados uma vez). */
  const avisadas = new Set<string>()

  // O orçamento em execução (revisão do lote 6): a janela obrigatória (a região segura e as
  // vizinhas) sempre carrega; as outras (as que estão perto e a que ainda espera o descarte) só
  // entram enquanto o conjunto inteiro cabe nas malhas de uma janela. A memória decodificada fica
  // limitada pelo teto do pacote, conferido na abertura.
  // (`nosListados` e `regiaoPorId` são os de cima, das listas da cena.)
  const malhasDoArquivo = new Map(dados.arquivos.map((a) => [a.caminho, a.malhas ?? 0])),
    malhasDeTodas = dados.nos
      .filter((n) => !nosListados.has(n.id))
      .reduce((soma, n) => soma + (malhasDoArquivo.get(n.arquivo) ?? 0), 0)
  const malhasDoConjunto = (ids: Iterable<string>) => {
    const nos = new Set<string>()
    for (const id of ids) for (const n of regiaoPorId.get(id)?.nos ?? []) nos.add(n)
    let soma = malhasDeTodas
    for (const id of nos) soma += malhasDoArquivo.get(nosPorId.get(id)?.arquivo ?? '') ?? 0
    return soma
  }
  const dentroDoOrcamento = (
    estado: { obrigatorias: ReadonlySet<string>; carregadas: ReadonlySet<string> },
    foco: { x: number; z: number },
  ): Set<string> => {
    const conjunto = new Set(estado.obrigatorias)
    const distancia = (id: string) => {
      const c = regiaoPorId.get(id)?.caixa
      if (!c) return Infinity
      const dx = Math.max(0, c.x0 - foco.x, foco.x - c.x1),
        dz = Math.max(0, c.z0 - foco.z, foco.z - c.z1)
      return Math.hypot(dx, dz)
    }
    const opcionais = [...estado.carregadas]
      .filter((id) => !conjunto.has(id))
      .sort((a, b) => distancia(a) - distancia(b))
    for (const id of opcionais)
      if (malhasDoConjunto([...conjunto, id]) <= LIMITES_DA_EXPORTACAO.janela.malhas)
        conjunto.add(id)
    return conjunto
  }

  /** Leva a carga ao conjunto pedido: carrega o que entra, descarta o que sai. */
  const aplicar = async (alvo: Set<string>) => {
    const { nos, cols } = itensDasRegioes(alvo),
      novosNos = [...nos].filter((id) => !nosCarregados.has(id)),
      novasCols = [...cols].filter((id) => !colisoesCarregadas.has(id)),
      usados: string[] = []
    try {
      for (const arquivo of arquivosDe(novosNos, []).concat(arquivosDe([], novasCols))) {
        await usarArquivo(arquivo)
        usados.push(arquivo)
        // Cede entre os arquivos: a carga de uma região não trava os quadros do jogo.
        await new Promise((resolve) => setTimeout(resolve, 0))
        if (descartado) throw Error('A cena compilada foi descartada durante a carga.')
      }
    } catch (erro) {
      for (const arquivo of usados) soltarArquivo(arquivo)
      throw erro
    }
    // Os usos contados acima são dos nós e das colisões novos, um por arquivo; cada nó ou
    // colisão a mais do mesmo arquivo conta um uso também.
    const contados = new Set(usados)
    const contar = (arquivo: string) => {
      if (contados.has(arquivo)) contados.delete(arquivo)
      else modelos.get(arquivo)!.usos++
    }
    for (const id of novosNos) {
      const n = nosPorId.get(id)!
      contar(n.arquivo)
      instanciarNo(n)
    }
    for (const id of novasCols) {
      contar(colisoesPorId.get(id)!.arquivo)
      colisoesCarregadas.add(id)
    }
    for (const id of [...nosCarregados.keys()]) if (!nos.has(id)) descartarNo(id)
    let colisoesMudaram = novasCols.length > 0
    for (const id of [...colisoesCarregadas])
      if (!cols.has(id)) {
        colisoesCarregadas.delete(id)
        soltarArquivo(colisoesPorId.get(id)!.arquivo)
        colisoesMudaram = true
      }
    if (colisoesMudaram || !colisoes) refazerColisoes()
    regioesCarregadas = new Set(alvo)
  }

  /** Pede um conjunto; uma carga por vez, e o último pedido vence. */
  const pedir = (alvo: Set<string>) => {
    pedido = alvo
    if (aplicando) return
    const proximo = async () => {
      while (pedido && !descartado) {
        const vez = pedido
        pedido = null
        emCurso = vez
        const falhou = (id: string, erro: unknown) => {
          const f = falhas.get(id) ?? { tentativa: 0, proxima: 0 }
          f.proxima = tempo + NOVAS_TENTATIVAS[Math.min(f.tentativa, 2)]!
          f.tentativa++
          falhas.set(id, f)
          // O aviso vai ao console uma vez por episódio de falha (o Estúdio o mostra nas Mensagens):
          // só no `estadoDasRegioes()` ninguém o via (full review final). Sai quando tudo carrega.
          if (aviso === null) {
            aviso = `Não consegui carregar uma parte do cenário (${erro instanceof Error ? erro.message : 'erro'}). Vou tentar de novo.`
            console.warn(aviso)
          }
        }
        try {
          await aplicar(vez)
          for (const id of vez) falhas.delete(id)
          if (falhas.size === 0) aviso = null
        } catch (erro) {
          if (descartado) return
          // A falha mantém as regiões de antes; quem está na que falhou pisa no relevo. As
          // regiões novas do pedido são tentadas uma por uma: a que quebrou não segura as outras
          // (revisão do lote 6: com uma vizinha quebrada, a região boa nunca carregava).
          const novas = [...vez].filter((id) => !regioesCarregadas.has(id))
          if (novas.length <= 1) for (const id of novas) falhou(id, erro)
          else {
            const conjunto = new Set([...vez].filter((id) => regioesCarregadas.has(id)))
            for (const id of novas) {
              if (descartado || pedido) break
              try {
                await aplicar(new Set([...conjunto, id]))
                conjunto.add(id)
                falhas.delete(id)
                if (falhas.size === 0) aviso = null
              } catch (erroDaRegiao) {
                if (descartado) return
                falhou(id, erroDaRegiao)
              }
            }
          }
        } finally {
          emCurso = null
        }
      }
    }
    aplicando = proximo().finally(() => {
      aplicando = null
    })
  }

  try {
    for (const conjunto of [opcoes.animacaoExterna!, opcoes.colisoresExternos!])
      for (const id of conjunto)
        if (!entidades.has(id)) throw Error(`A entidade externa ${id} não existe na cena.`)
    cena.add(raiz)
    raiz.name = dados.nome
    // A janela inicial: a de onde a cena começa (o início, ou o meio de tudo).
    let inicial: { nos: Set<string>; cols: Set<string> }
    if (plano) {
      const inicio =
          dados.marcadores.find(
            (m) => m.configuracao?.tipo === 'inicio' && m.configuracao.principal,
          ) ?? dados.marcadores.find((m) => m.configuracao?.tipo === 'inicio'),
        meio = { x: 0, z: 0 }
      if (!inicio && dados.nos.length) {
        // O centro da caixa da cena, como `resolverInicioDaCena`: os motores põem o jogador ali,
        // e a média dos centros puxava a janela para onde há mais objetos (revisão do lote 6).
        let x0 = Infinity,
          x1 = -Infinity,
          z0 = Infinity,
          z1 = -Infinity
        for (const n of dados.nos) {
          x0 = Math.min(x0, n.volume.min.x)
          x1 = Math.max(x1, n.volume.max.x)
          z0 = Math.min(z0, n.volume.min.z)
          z1 = Math.max(z1, n.volume.max.z)
        }
        meio.x = (x0 + x1) / 2
        meio.z = (z0 + z1) / 2
      }
      const estado = plano.atualizar(inicio ? inicio.posicao : meio, 0)
      atual = estado.atual
      regioesCarregadas = new Set(estado.carregadas)
      inicial = itensDasRegioes(regioesCarregadas)
    } else
      inicial = {
        nos: new Set(dados.nos.map((n) => n.id)),
        cols: new Set(dados.colisoes.map((c) => c.id)),
      }
    const usados = arquivosDe(inicial.nos, inicial.cols),
      panoramas = dados.texturas.filter(
        (t) =>
          opcoes.ambiente !== 'luzes-locais' &&
          dados.ambiente.ceu?.tipo === 'panorama' &&
          t.id === dados.ambiente.ceu.textura,
      ),
      texturasDoRelevo = (dados.terreno?.relevo?.camadas ?? []).flatMap((c) =>
        c.textura ? [c.textura.id] : [],
      ),
      total =
        usados.length +
        panoramas.length +
        new Set(texturasDoRelevo).size +
        (dados.terreno?.relevo?.pesos.length ?? 0)
    let pronto = 0
    opcoes.progresso?.(pronto, total)
    // Cada imagem (o atlas de um kit repetido nos arquivos) é decodificada uma vez; na carga
    // inteira o cache só vive durante a carga: os modelos ficam com clones que dividem a imagem.
    try {
      for (const arquivo of usados) {
        sinal.throwIfAborted()
        await usarArquivo(arquivo)
        // Um uso por nó e por colisão: o arquivo sai quando o último deles sai.
        modelos.get(arquivo)!.usos = 0
        sinal.throwIfAborted()
        opcoes.progresso?.(++pronto, total)
      }
    } finally {
      if (!plano) imagens.clear()
    }
    for (const id of inicial.nos) modelos.get(nosPorId.get(id)!.arquivo)!.usos++
    for (const id of inicial.cols) modelos.get(colisoesPorId.get(id)!.arquivo)!.usos++
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
    if (dados.terreno?.relevo && campo) {
      const r = dados.terreno.relevo
      for (const id of new Set(texturasDoRelevo)) {
        if (texturas.has(id)) continue
        sinal.throwIfAborted()
        const t = dados.texturas.find((x) => x.id === id)!,
          meta = dados.arquivos.find((a) => a.caminho === t.arquivo)!
        texturas.set(
          id,
          await lerTextura(pacote.arquivos.get(t.arquivo)!.slice().buffer, meta.digest, sinal),
        )
        opcoes.progresso?.(++pronto, total)
      }
      const pesos: Uint8Array[] = []
      for (const caminho of r.pesos) {
        sinal.throwIfAborted()
        const img = await lerPngDePesos(pacote.arquivos.get(caminho)!)
        if (img.largura !== campo.colunas + 1 || img.altura !== campo.linhas + 1)
          throw Error('Os pesos do relevo não correspondem à grade.')
        pesos.push(img.rgba)
        opcoes.progresso?.(++pronto, total)
      }
      relevo = new RelevoNoThree({
        forma: campo,
        alturas: campo.alturas,
        ...(campo.buracos ? { buracos: campo.buracos } : {}),
        pesos,
        camadas: r.camadas,
      })
      relevo.definirTexturas((id) => texturas.get(id)?.textura)
    }
    const custos = new Map<string, number>()
    let memoriaDasInstancias = 0
    for (const id of inicial.nos) {
      const n = nosPorId.get(id)!
      let custo = custos.get(n.arquivo)
      if (custo === undefined) {
        const m = modelos.get(n.arquivo)!.modelo
        custo = custoDaInstanciaCompilada(m.raiz, m.animacoes ?? [])
        custos.set(n.arquivo, custo)
      }
      memoriaDasInstancias += custo
      if (memoriaDasInstancias > LIMITES_DA_EXPORTACAO.malha.bytesDaSaida)
        throw Error('As instâncias e animações excedem o orçamento de memória do carregador.')
    }
    // A água guarda os fundos de todas as águas (as colisões dela carregam sempre).
    const fundos = new Map<string, FonteDeColisao[]>()
    for (const c of dados.colisoes) {
      sinal.throwIfAborted()
      if (c.tipo !== 'agua' || !c.entidade || !inicial.cols.has(c.id)) continue
      const matriz = new Matrix4().fromArray(c.matriz),
        fs = fundos.get(c.entidade) ?? []
      for (const p of modelos.get(c.arquivo)!.modelo.partes)
        fs.push({
          objeto: c.entidade,
          geometria: p.geometria,
          matriz: matriz.clone().multiply(p.matriz),
        })
      fundos.set(c.entidade, fs)
    }
    for (const id of inicial.cols) colisoesCarregadas.add(id)
    refazerColisoes()
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
      opcoes.marExterno,
    )
    for (const n of dados.nos) {
      sinal.throwIfAborted()
      if (inicial.nos.has(n.id)) instanciarNo(n)
    }
    if (relevo && campo) {
      const inicio =
        dados.marcadores.find(
          (m) => m.configuracao?.tipo === 'inicio' && m.configuracao.principal,
        ) ?? dados.marcadores.find((m) => m.configuracao?.tipo === 'inicio')
      const foco = inicio
        ? inicio.posicao
        : {
            x: campo.origem.x + (campo.colunas * campo.passo) / 2,
            z: campo.origem.z + (campo.linhas * campo.passo) / 2,
          }
      relevo.atualizar(foco, 1000, true)
      raiz.add(relevo.grupo)
    }
    if (plano && dados.nos.length) {
      // Uma âncora invisível com a caixa da cena inteira: quem mede a cena pela raiz (o Mundo 3D)
      // continua medindo tudo, mesmo com só uma janela carregada.
      const min = new Vector3(Infinity, Infinity, Infinity),
        max = new Vector3(-Infinity, -Infinity, -Infinity)
      for (const n of dados.nos) {
        min.min(new Vector3(n.volume.min.x, n.volume.min.y, n.volume.min.z))
        max.max(new Vector3(n.volume.max.x, n.volume.max.y, n.volume.max.z))
      }
      const tamanho = max.clone().sub(min)
      ancora = new Mesh(
        new BoxGeometry(
          Math.max(tamanho.x, 1e-3),
          Math.max(tamanho.y, 1e-3),
          Math.max(tamanho.z, 1e-3),
        ),
        new MeshBasicMaterial(),
      )
      ancora.name = 'regioes:caixa-da-cena'
      ancora.visible = false
      ancora.castShadow = false
      ancora.receiveShadow = false
      ancora.raycast = () => {}
      ancora.position.copy(min.add(max).multiplyScalar(0.5))
      raiz.add(ancora)
    }
    cena.updateMatrixWorld(true)
    if (opcoes.ambiente === 'luzes-locais') {
      locais = new LuzesLocaisDoPalco()
      locais.definirCompiladas(
        dados.marcadores,
        Math.max(16, Math.min(512, 2 ** Math.floor(Math.log2(maxTextura / 4)))),
      )
      cena.add(locais.grupo)
    } else {
      ambiente = new AmbienteDoPalco(cena, false, maxTextura)
      const estado = ambiente.definirCompilado(dados, (id) => ({
        textura: texturas.get(id)?.textura,
      }))
      if (estado.falhas.length || estado.carregando)
        throw Error(estado.falhas.join(' ') || 'O ambiente do pacote ficou incompleto.')
    }
    sinal.throwIfAborted()
    const agua = aguas,
      luz = ambiente,
      posicaoDaCamera = new Vector3()
    return {
      cena,
      raiz,
      dados,
      get colisoes() {
        return colisoes!
      },
      agua: agua.consulta,
      alturas,
      entidades,
      atores,
      instancias,
      entidade(hit) {
        if (descartado || !Number.isSafeInteger(hit.faceIndex) || hit.faceIndex! < 0) return null
        return identificadores.get(hit.object)?.(hit.faceIndex!) ?? null
      },
      atualizar(delta, movimentoReduzido = false) {
        if (descartado) throw Error('A cena compilada já foi descartada.')
        if (!Number.isFinite(delta) || delta < 0 || delta > 1)
          throw Error('O passo da cena deve ficar entre zero e um segundo.')
        tempo += delta
        for (const c of atualizaveis) {
          if (!movimentoReduzido && c.animacoes.length && !animacoesExternas.has(c))
            c.mixer.update(delta)
          c.raiz.updateWorldMatrix(true, true)
        }
        agua.atualizar(tempo, movimentoReduzido)
      },
      quadro(camera, alvo) {
        if (descartado) return
        luz?.quadro(camera, alvo)
        if (relevo) {
          // Menos detalhe longe da CÂMERA; nada além do alcance dela nem da neblina, e a neblina
          // termina antes do fim da vista (o relevo não acaba numa borda seca).
          camera.getWorldPosition(posicaoDaCamera)
          const longe = (camera as Camera & { far?: number }).far,
            vista = typeof longe === 'number' && longe > 0 ? longe : 4000
          if (cena.fog instanceof Fog && cena.fog.far > vista * 0.95) {
            cena.fog.far = vista * 0.95
            cena.fog.near = Math.min(cena.fog.near, cena.fog.far * 0.6)
          }
          const alcance = cena.fog instanceof Fog ? Math.min(vista, cena.fog.far) : vista
          relevo.atualizar(
            Number.isFinite(posicaoDaCamera.x) && Number.isFinite(posicaoDaCamera.z)
              ? posicaoDaCamera
              : alvo,
            alcance,
          )
        }
        if (!plano) return
        // Um foco inválido (um "Levar … até" com NaN) mantém a carga como está: lançar aqui
        // derrubava o laço do jogo inteiro (revisão do lote 6).
        if (!Number.isFinite(alvo.x) || !Number.isFinite(alvo.z)) return
        camera.getWorldPosition(posicaoDaCamera)
        const semCamera = !Number.isFinite(posicaoDaCamera.x) || !Number.isFinite(posicaoDaCamera.z)
        const estado = plano.atualizar(
          { x: alvo.x, z: alvo.z },
          tempo,
          semCamera ? { x: alvo.x, z: alvo.z } : { x: posicaoDaCamera.x, z: posicaoDaCamera.z },
        )
        atual = estado.atual
        // A região que falhou espera a vez dela de tentar de novo.
        const alvoDaCarga = new Set(
          [...dentroDoOrcamento(estado, alvo)].filter((id) => {
            const f = falhas.get(id)
            return !f || f.proxima <= tempo || regioesCarregadas.has(id)
          }),
        )
        const igual =
          alvoDaCarga.size === regioesCarregadas.size &&
          [...alvoDaCarga].every((id) => regioesCarregadas.has(id))
        if (!igual) pedir(alvoDaCarga)
      },
      regiao(alvo, anterior = null, esperado) {
        const todas = dados.regioes ?? []
        if (
          esperado !== undefined &&
          !avisadas.has(esperado) &&
          !todas.some((r) => r.nome === esperado)
        ) {
          avisadas.add(esperado)
          console.warn(
            `O cenário não tem a região "${esperado}". Desenhe as regiões no Molda Cenários, na aba Jogo.`,
          )
        }
        const p = !alvo
          ? undefined
          : 'mesh' in alvo
            ? alvo.mesh.position
            : 'position' in alvo
              ? alvo.position
              : alvo
        if (!todas.length || !p || !Number.isFinite(p.x) || !Number.isFinite(p.z)) return null
        const antes =
          anterior === null ? null : (todas.find((r) => r.nome === anterior)?.id ?? null)
        const id = regiaoDoPonto(todas, { x: p.x, z: p.z }, antes)
        return id === null ? null : todas.find((r) => r.id === id)!.nome
      },
      estadoDoRelevo() {
        return relevo ? relevo.estado() : null
      },
      estadoDasRegioes() {
        if (!plano) return null
        return {
          atual,
          carregadas: [...regioesCarregadas],
          carregando: [...new Set([...(emCurso ?? []), ...(pedido ?? [])])].filter(
            (id) => !regioesCarregadas.has(id),
          ),
          falhas: [...falhas.keys()],
          aviso,
          arquivos: modelos.size,
          imagens: usosDasImagens.size,
        }
      },
      descartar,
    }
  } catch (erro) {
    descartar()
    throw erro
  }
}
