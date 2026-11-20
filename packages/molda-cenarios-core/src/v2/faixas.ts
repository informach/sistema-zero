import type { DocumentoDeCenario } from './documento'
import { AparenciaDaAguaSchema } from './parametros-de-agua'

/**
 * As FAMÍLIAS de ferramentas da oficina de cenários e as faixas em que elas se liberam, no mesmo
 * mecanismo do Molda (`@sistemazero/molda/tools`): os nomes das faixas são os mesmos, então o host
 * traduz a jornada com a régua que já usa no Molda (`KIDS_MOLDA_BAND_CAPABILITIES`).
 *
 * ⚠️ Trancar tira a AUTORIA, nunca a leitura: um cenário que já usa uma família trancada abre,
 * testa e exporta intacto, e mexer em outra coisa nele continua valendo. O que fica trancado é
 * CRIAR ou MUDAR aquilo. Desfazer, refazer e voltar a uma versão do histórico não são autoria.
 *
 * O servidor confere o mesmo catálogo no lote (`familiasMudadas`), para quem não é da equipe:
 * assim um agente também não passa por cima. Algumas famílias só se distinguem na tela (o relevo
 * esculpido não guarda qual ferramenta o fez); essas ficam com `servidor: false`.
 */

export const FAIXAS_DA_OFICINA = ['basic', 'intermediate', 'professional'] as const
export type FaixaDaOficina = (typeof FAIXAS_DA_OFICINA)[number]

export type AbaDaOficina = 'terreno' | 'agua' | 'objetos' | 'caminhos' | 'jogo' | 'luz'

export interface FamiliaDaOficina {
  id: string
  aba: AbaDaOficina
  faixa: FaixaDaOficina
  /** Como a família aparece em "Ferramentas que vêm por aí": curto, na língua da criança. */
  rotulo: string
  /** O servidor reconhece a família no documento (senão, só a tela a tranca). */
  servidor: boolean
}

export const FAMILIAS_DA_OFICINA = [
  // ── básico: o que a criança encontra ao abrir a oficina ───────────────────────
  {
    id: 'terreno.esculpir',
    aba: 'terreno',
    faixa: 'basic',
    rotulo: 'Elevar, abaixar, aplainar e suavizar',
    servidor: false,
  },
  {
    id: 'terreno.pintar',
    aba: 'terreno',
    faixa: 'basic',
    rotulo: 'Pintar o chão',
    servidor: false,
  },
  {
    id: 'terreno.receitas',
    aba: 'terreno',
    faixa: 'basic',
    rotulo: 'Começar de um relevo pronto',
    servidor: false,
  },
  { id: 'agua.mar-e-lago', aba: 'agua', faixa: 'basic', rotulo: 'Mar e lago', servidor: false },
  {
    id: 'objetos.basico',
    aba: 'objetos',
    faixa: 'basic',
    rotulo: 'Pôr, mover, girar, tamanho, copiar e apagar',
    servidor: false,
  },
  {
    id: 'objetos.espalhar',
    aba: 'objetos',
    faixa: 'basic',
    rotulo: 'Espalhar árvores, pedras e flores',
    servidor: false,
  },
  {
    id: 'caminhos.trilha-e-praca',
    aba: 'caminhos',
    faixa: 'basic',
    rotulo: 'Trilha e praça',
    servidor: false,
  },
  {
    id: 'jogo.marcadores',
    aba: 'jogo',
    faixa: 'basic',
    rotulo: 'Início do personagem e marcadores',
    servidor: false,
  },
  {
    id: 'luz.hora-ceu-nevoa',
    aba: 'luz',
    faixa: 'basic',
    rotulo: 'Hora do dia, céu e névoa',
    servidor: false,
  },
  // ── intermediário ──────────────────────────────────────────────────────────────
  {
    id: 'terreno.formas',
    aba: 'terreno',
    faixa: 'intermediate',
    rotulo: 'Rampa, platô, nivelar, morro, cratera e ruído',
    servidor: false,
  },
  {
    id: 'terreno.camadas',
    aba: 'terreno',
    faixa: 'intermediate',
    rotulo: 'Mais camadas de chão e pintura automática',
    servidor: true,
  },
  {
    id: 'agua.rio-represa-cachoeira',
    aba: 'agua',
    faixa: 'intermediate',
    rotulo: 'Rio, represa e cachoeira',
    servidor: true,
  },
  {
    id: 'objetos.precisao',
    aba: 'objetos',
    faixa: 'intermediate',
    rotulo: 'Tamanho por eixo, espelho, alinhar e repetir',
    servidor: true,
  },
  {
    id: 'objetos.conjuntos',
    aba: 'objetos',
    faixa: 'intermediate',
    rotulo: 'Conjuntos',
    servidor: true,
  },
  {
    id: 'objetos.formas',
    aba: 'objetos',
    faixa: 'intermediate',
    rotulo: 'Blocos de rascunho',
    servidor: true,
  },
  {
    id: 'objetos.aparencia',
    aba: 'objetos',
    faixa: 'intermediate',
    rotulo: 'Cor e textura de cada objeto',
    servidor: true,
  },
  {
    id: 'caminhos.construcoes',
    aba: 'caminhos',
    faixa: 'intermediate',
    rotulo: 'Estrada, cerca, muro e ponte',
    servidor: true,
  },
  {
    id: 'caminhos.curvas',
    aba: 'caminhos',
    faixa: 'intermediate',
    rotulo: 'Curvas suaves',
    servidor: true,
  },
  {
    id: 'jogo.zonas-e-rotas',
    aba: 'jogo',
    faixa: 'intermediate',
    rotulo: 'Zonas e rotas',
    servidor: true,
  },
  {
    id: 'luz.sol-e-ambiente',
    aba: 'luz',
    faixa: 'intermediate',
    rotulo: 'Sol e luz ambiente',
    servidor: true,
  },
  // ── profissional ───────────────────────────────────────────────────────────────
  {
    id: 'terreno.erosao',
    aba: 'terreno',
    faixa: 'professional',
    rotulo: 'Erosão',
    servidor: false,
  },
  {
    id: 'terreno.buraco',
    aba: 'terreno',
    faixa: 'professional',
    rotulo: 'Buracos e cavernas',
    servidor: true,
  },
  {
    id: 'terreno.tamanho',
    aba: 'terreno',
    faixa: 'professional',
    rotulo: 'Tamanho, resolução e mapa de alturas',
    servidor: true,
  },
  {
    id: 'agua.aparencia',
    aba: 'agua',
    faixa: 'professional',
    rotulo: 'Cor, ondas, espuma e área de nado',
    servidor: true,
  },
  {
    id: 'objetos.colisao',
    aba: 'objetos',
    faixa: 'professional',
    rotulo: 'Colisão de cada objeto',
    servidor: true,
  },
  {
    id: 'jogo.propriedades',
    aba: 'jogo',
    faixa: 'professional',
    rotulo: 'Propriedades personalizadas',
    servidor: true,
  },
  { id: 'jogo.cameras', aba: 'jogo', faixa: 'professional', rotulo: 'Câmeras', servidor: true },
  {
    id: 'luz.luzes-e-sombra',
    aba: 'luz',
    faixa: 'professional',
    rotulo: 'Luzes pontuais, focos e qualidade da sombra',
    servidor: true,
  },
] as const satisfies readonly FamiliaDaOficina[]

export type FamiliaDaOficinaId = (typeof FAMILIAS_DA_OFICINA)[number]['id']

const FAMILIA_POR_ID: ReadonlyMap<string, FamiliaDaOficina> = new Map(
  FAMILIAS_DA_OFICINA.map((f) => [f.id, f]),
)

export function familiaDaOficina(id: string): FamiliaDaOficina | undefined {
  return FAMILIA_POR_ID.get(id)
}

/** As famílias liberadas por um conjunto de faixas (a lista FECHADA que o host passa). */
export function familiasDasFaixas(faixas: readonly string[]): FamiliaDaOficinaId[] {
  return FAMILIAS_DA_OFICINA.filter((f) => faixas.includes(f.faixa)).map((f) => f.id)
}

/** Qual família cada ferramenta da tela usa. Ferramenta fora do mapa é do básico. */
export const FAMILIA_DA_FERRAMENTA: Readonly<
  Record<AbaDaOficina | 'luzes', Readonly<Record<string, FamiliaDaOficinaId>>>
> = {
  terreno: {
    elevar: 'terreno.esculpir',
    abaixar: 'terreno.esculpir',
    aplainar: 'terreno.esculpir',
    suavizar: 'terreno.esculpir',
    pintar: 'terreno.pintar',
    nivelar: 'terreno.formas',
    plato: 'terreno.formas',
    rampa: 'terreno.formas',
    morro: 'terreno.formas',
    cratera: 'terreno.formas',
    ruido: 'terreno.formas',
    erosao: 'terreno.erosao',
    furar: 'terreno.buraco',
    fechar: 'terreno.buraco',
  },
  agua: {
    mar: 'agua.mar-e-lago',
    lago: 'agua.mar-e-lago',
    rio: 'agua.rio-represa-cachoeira',
    represa: 'agua.rio-represa-cachoeira',
    cachoeira: 'agua.rio-represa-cachoeira',
  },
  objetos: {},
  caminhos: {
    trilha: 'caminhos.trilha-e-praca',
    praca: 'caminhos.trilha-e-praca',
    estrada: 'caminhos.construcoes',
    cerca: 'caminhos.construcoes',
    muro: 'caminhos.construcoes',
    ponte: 'caminhos.construcoes',
  },
  jogo: {
    inicio: 'jogo.marcadores',
    ponto: 'jogo.marcadores',
    regua: 'jogo.marcadores',
    escala: 'jogo.marcadores',
    caixa: 'jogo.zonas-e-rotas',
    esfera: 'jogo.zonas-e-rotas',
    poligono: 'jogo.zonas-e-rotas',
    rota: 'jogo.zonas-e-rotas',
    camera: 'jogo.cameras',
  },
  luz: {},
  luzes: { pontual: 'luz.luzes-e-sombra', foco: 'luz.luzes-e-sombra' },
}

// ── a conferência do servidor ─────────────────────────────────────────────────

/** JSON com as chaves em ordem: o mesmo valor vindo do banco ou do lote compara igual. */
function estavel(valor: unknown): string {
  if (valor === undefined) return 'null'
  if (valor === null || typeof valor !== 'object') return JSON.stringify(valor)
  if (Array.isArray(valor)) return `[${valor.map(estavel).join(',')}]`
  const registro = valor as Record<string, unknown>
  return `{${Object.keys(registro)
    .filter((k) => registro[k] !== undefined)
    .sort()
    .map((k) => `${JSON.stringify(k)}:${estavel(registro[k])}`)
    .join(',')}}`
}

const CAMADAS_DO_BASICO = 5
const APARENCIA_PADRAO = estavel(AparenciaDaAguaSchema.parse({}))
const AGUAS_AVANCADAS = new Set(['rio', 'represa', 'cachoeira'])
const CAMINHOS_AVANCADOS = new Set(['estrada', 'cerca', 'muro', 'ponte'])

/**
 * As marcas de autoria do documento: para cada uso de uma família reconhecida pelo servidor,
 * uma chave (a família e o elemento) e uma assinatura (o que a família decide naquele elemento).
 * Mover um objeto que já tem tamanho por eixo não muda a assinatura da escala; criar um rio novo
 * cria uma chave nova.
 */
function marcas(doc: DocumentoDeCenario): Map<string, string> {
  const m = new Map<string, string>()
  const marcar = (familia: FamiliaDaOficinaId, elemento: string, assinatura: unknown) =>
    m.set(`${familia}|${elemento}`, estavel(assinatura))

  const base = doc.base
  if (base.tipo === 'terreno') {
    if (base.buracos?.length) marcar('terreno.buraco', 'base', base.buracos)
    if ((base.solo?.camadas.length ?? 0) > CAMADAS_DO_BASICO)
      marcar('terreno.camadas', 'base', base.solo!.camadas)
  }

  for (const agua of doc.aguas) {
    if (AGUAS_AVANCADAS.has(agua.tipo)) marcar('agua.rio-represa-cachoeira', agua.id, agua)
    // A água nova já nasce com a aparência padrão e com nado: só o que foge disso é autoria.
    const aparencia =
      agua.aparencia && estavel(agua.aparencia) !== APARENCIA_PADRAO ? agua.aparencia : null
    const semNado = agua.tipo !== 'cachoeira' && agua.nado === false
    if (aparencia || semNado) marcar('agua.aparencia', agua.id, [aparencia, semNado])
  }

  for (const c of doc.caminhos) {
    if (CAMINHOS_AVANCADOS.has(c.tipo)) marcar('caminhos.construcoes', c.id, c)
    if (c.suave) marcar('caminhos.curvas', c.id, c.suave)
  }

  for (const i of doc.instancias) {
    const e = i.transformacao.escala
    if (e.x !== e.y || e.y !== e.z) marcar('objetos.precisao', `escala:${i.id}`, e)
    if (i.espelho && (i.espelho.x || i.espelho.y || i.espelho.z))
      marcar('objetos.precisao', `espelho:${i.id}`, i.espelho)
    if (i.aparencia) marcar('objetos.aparencia', i.id, i.aparencia)
  }
  for (const f of doc.formas ?? []) marcar('objetos.formas', f.id, f)
  for (const d of doc.definicoesConjuntos ?? []) marcar('objetos.conjuntos', `definicao:${d.id}`, d)
  for (const mo of doc.montagens ?? [])
    marcar('objetos.conjuntos', `montagem:${mo.id}`, mo.definicao)

  for (const mk of doc.marcadores) {
    const tipo = mk.configuracao?.tipo
    if (tipo === 'zona' || tipo === 'rota') marcar('jogo.zonas-e-rotas', mk.id, mk.configuracao)
    else if (tipo === 'camera') marcar('jogo.cameras', mk.id, mk.configuracao)
    else if (tipo === 'luz') marcar('luz.luzes-e-sombra', mk.id, mk.configuracao)
  }

  const entidades = [
    ...doc.instancias,
    ...doc.grupos,
    ...doc.caminhos,
    ...doc.aguas,
    ...doc.marcadores,
    ...(doc.montagens ?? []),
  ]
  for (const e of entidades)
    if (e.propriedades && Object.keys(e.propriedades).length)
      marcar('jogo.propriedades', e.id, e.propriedades)

  const luz = doc.iluminacao
  if (luz.sol) marcar('luz.sol-e-ambiente', 'sol', luz.sol)
  if (luz.ambiente) marcar('luz.sol-e-ambiente', 'ambiente', luz.ambiente)
  if (luz.sombras) marcar('luz.luzes-e-sombra', 'sombras', luz.sombras)
  return m
}

/**
 * As famílias que este lote CRIOU ou MUDOU (reconhecidas pelo servidor), comparando o documento
 * antes e depois. Tirar um uso não conta (apagar é do básico); o tamanho do terreno conta só
 * quando muda um terreno que já existia; a colisão, só num objeto que já existia (o objeto novo
 * nasce com a colisão que a ferramenta de pôr escolhe).
 */
export function familiasMudadas(
  antes: DocumentoDeCenario,
  depois: DocumentoDeCenario,
): FamiliaDaOficinaId[] {
  const mudadas = new Set<FamiliaDaOficinaId>()
  const marcasAntes = marcas(antes)
  for (const [chave, assinatura] of marcas(depois))
    if (marcasAntes.get(chave) !== assinatura)
      mudadas.add(chave.slice(0, chave.indexOf('|')) as FamiliaDaOficinaId)

  const a = antes.base,
    d = depois.base
  if (
    (a.tipo === 'terreno' &&
      d.tipo === 'terreno' &&
      estavel([a.origem, a.passo, a.colunas, a.linhas]) !==
        estavel([d.origem, d.passo, d.colunas, d.linhas])) ||
    (a.tipo === 'plano' &&
      d.tipo === 'plano' &&
      (a.largura !== d.largura || a.comprimento !== d.comprimento))
  )
    mudadas.add('terreno.tamanho')

  const colisaoAntes = new Map(antes.instancias.map((i) => [i.id, i.colisao]))
  for (const i of depois.instancias) {
    const anterior = colisaoAntes.get(i.id)
    if (anterior !== undefined && anterior !== i.colisao) mudadas.add('objetos.colisao')
  }
  return FAMILIAS_DA_OFICINA.filter((f) => mudadas.has(f.id)).map((f) => f.id)
}

/** As famílias mudadas que estas faixas não liberam. Vazio = pode gravar. */
export function familiasTrancadas(
  antes: DocumentoDeCenario,
  depois: DocumentoDeCenario,
  faixas: readonly string[],
): FamiliaDaOficina[] {
  return familiasMudadas(antes, depois)
    .map((id) => FAMILIA_POR_ID.get(id)!)
    .filter((f) => !faixas.includes(f.faixa))
}
