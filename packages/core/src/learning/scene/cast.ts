import { isRecord, type SceneId } from './actions'
import { CENARIO_DA_FIGURA, isSceneCenario, type SceneCenarioId } from './cenario'

/**
 * "1 cacto" e "3 cactos": o número e o nome concordando.
 *
 * ⚠️ É o que a criança LÊ embaixo do palco e na faixa de estado, e estava saindo "1 vidas e 1
 * pontos", "1 saltos e 1 sons", "1 cactos nos bastidores", "1 Dinos na tela" e "lupa 1 vezes" —
 * quase sempre no PRIMEIRO acontecimento da cena, que é quando ela lê com mais atenção.
 *
 * ⚠️⚠️ Mora AQUI, e não no `readout`, porque quem escreve essas frases são DOIS: o leitor (a
 * faixa e a situação) e o MOTOR (o `caption` de cada ação). O defeito do `draw-loop` era do
 * motor, e um helper privado do leitor não o alcançava. Este é o módulo do português que a
 * plataforma GERA — a concordância é o mesmo assunto da flexão do elenco.
 *
 * ⚠️ As duas formas ficam à vista no call site de propósito: quem veste o texto depois é o
 * elenco, e a régua dele flexiona o que está COLADO ao nome. Escolher singular ou plural é
 * decisão da frase, não dele.
 */
export const quantos = (n: number, um: string, varios: string) => `${n} ${n === 1 ? um : varios}`

/**
 * Um número como a criança escreve: vírgula no decimal ("0,5 s") e o sinal de menos do conteúdo
 * (U+2212) no negativo ("−9").
 *
 * ⚠️ Mora aqui pelo mesmo motivo do `quantos`: quem escreve número na tela são o MOTOR (a frase
 * da recarga), o LEITOR (a faixa) e a BANCADA do member-shell (o valor ao lado do deslizante). A
 * instrução do Dia 2 escreve "−9" e a faixa escrevia "-9" com o hífen do teclado, na mesma tela.
 */
export const decimal = (n: number) => String(Math.abs(n)).replace('.', ',')
export const numero = (n: number) => (n < 0 ? `−${decimal(n)}` : decimal(n))

/**
 * O ELENCO da cena: quem está no palco.
 *
 * As cenas ensinam conceitos que os três cursos repetem — criar e mostrar são diferentes, a área
 * da batida, o placar que só conta jogando, as quatro telas da partida. Mas os textos delas só
 * sabiam falar de Dino e de cacto, então o Desafio do Primeiro Jogo (nave e asteroide) e O Jogo
 * do Meu Jeito não podiam usar nenhuma: cada uma estava presa a um curso. O levantamento das
 * 282 seções mostrou o tamanho disso — 14 cenas, cada uma usada UMA vez.
 *
 * O elenco troca os NOMES, nunca o motor: a mesma cena, a mesma avaliação, as mesmas metas.
 *
 * ⚠️⚠️ E troca em PORTUGUÊS, o que é o trabalho de verdade. "Faça o Dino aparecer" com um
 * elenco feminino tem que virar "Faça a nave aparecer", e "a batida do cacto" tem que virar "a
 * batida do asteroide" — artigo, contração e plural. Uma substituição crua de palavra por
 * palavra produziria "Faça o nave aparecer", que é como a criança percebe que ninguém escreveu
 * aquilo para ela.
 */

/**
 * As FIGURAS que o palco sabe desenhar. Lista fechada: é o que o member-shell tem desenhado à mão.
 *
 * ⚠️⚠️ O elenco trocava só os NOMES (Raio-X, lote 3, 16/09/2026): a criança do Desafio lia
 * "nave" e via um dinossauro azul na grama, e a de O Jogo do Meu Jeito lia "pedra" e "chama" em
 * cima de um Dino e três árvores. A figura é o que faz o DESENHO seguir o texto.
 *
 * ⚠️ Figura nova entra aqui E ganha um desenho no `scene-figures.tsx` do member-shell no mesmo
 * lote (o `Record<SceneFigure, …>` de lá reprova a falta). Se ela for do espaço, entra também em
 * `FIGURAS_DO_ESPACO`.
 */
export const SCENE_FIGURES = [
  'dino',
  'cacto',
  'floresta',
  'nave',
  'asteroide',
  'pedra',
  'tiro',
  'chama',
  'gorila',
  'banana',
  'predio',
  'estrelas',
  'coelho',
  'arbusto',
  'flores',
  'personagem-farol',
  'chave-farol',
  'farol',
] as const
export type SceneFigure = (typeof SCENE_FIGURES)[number]

/** Um papel do elenco. O gênero não é enfeite: sem ele o artigo sai errado em metade das frases. */
export interface SceneActor {
  /** Como a criança chama: "nave", "asteroide", "Dino". Sem artigo. */
  name: string
  gender: 'm' | 'f'
  /** Só quando o plural não é `name` + "s" (o caso de "pedra" é regular; "canhão" não é). */
  plural?: string
  /**
   * O que o palco DESENHA para este papel. Sem ela, a figura sai do nome (`actorFigure`).
   *
   * ⚠️ Opcional de propósito: os manifestos já publicados não têm o campo e ganham o desenho
   * certo pelo nome, sem reimportação. Declarar só é preciso quando o nome não diz a figura
   * ("Zé" desenhado como nave).
   */
  figure?: SceneFigure
}

/**
 * Quem entra no lugar de quem.
 *
 * Os papéis são os três que aparecem no texto das cenas. Papel omitido mantém o elenco de
 * fábrica — um curso que só troca o personagem não precisa declarar o resto.
 */
export interface SceneCast {
  /** O personagem que a criança controla. De fábrica: o Dino. */
  hero?: SceneActor
  /** O que atrapalha. De fábrica: o cacto. */
  obstacle?: SceneActor
  /** O cenário que entra na conta das camadas. De fábrica: a floresta. */
  scenery?: SceneActor
}

/** O elenco de fábrica, que é o do Corre Dino. É contra ele que o texto do catálogo foi escrito. */
export const DEFAULT_CAST: Required<SceneCast> = {
  hero: { name: 'Dino', gender: 'm' },
  obstacle: { name: 'cacto', gender: 'm' },
  scenery: { name: 'floresta', gender: 'f' },
}

/** Algumas experiências nascem no jogo da nave, mesmo sem elenco preenchido no bloco. */
export const NAVE_E_TIRO_CAST: SceneCast = {
  hero: { name: 'nave', gender: 'f', figure: 'nave' },
  scenery: { name: 'tiro', gender: 'm', figure: 'tiro' },
}

export const TIROS_E_PEDRAS_CAST: SceneCast = {
  ...NAVE_E_TIRO_CAST,
  obstacle: { name: 'asteroide', gender: 'm', figure: 'asteroide' },
}

export function sceneNativeCast(scene: SceneId, cast?: SceneCast): SceneCast | undefined {
  if (scene === 'fixed-vs-read') return { ...NAVE_E_TIRO_CAST, ...cast }
  if (scene === 'collision-pair') return { ...TIROS_E_PEDRAS_CAST, ...cast }
  if (scene === 'invincibility')
    return { hero: TIROS_E_PEDRAS_CAST.hero, obstacle: TIROS_E_PEDRAS_CAST.obstacle, ...cast }
  if (scene === 'motion-amount')
    return { hero: { name: 'pedra', gender: 'f', figure: 'pedra' }, ...cast }
  if (scene === 'two-clocks')
    return { hero: TIROS_E_PEDRAS_CAST.hero, obstacle: TIROS_E_PEDRAS_CAST.obstacle, ...cast }
  if (scene === 'copy-vs-original' || scene === 'published-copy')
    return { hero: TIROS_E_PEDRAS_CAST.hero, ...cast }
  if (scene === 'same-rules-new-skin') return { ...TIROS_E_PEDRAS_CAST, ...cast }
  return cast
}

export function isSceneActor(value: unknown): value is SceneActor {
  if (!isRecord(value)) return false
  if (typeof value.name !== 'string' || value.name.trim().length === 0 || value.name.length > 24)
    return false
  if (value.gender !== 'm' && value.gender !== 'f') return false
  if (value.plural !== undefined && (typeof value.plural !== 'string' || value.plural.length > 28))
    return false
  if (value.figure !== undefined && !(SCENE_FIGURES as readonly unknown[]).includes(value.figure))
    return false
  // ⚠️ O nome entra em TEXTO exibido à criança, nunca em HTML nem em id: recusar o que não é
  // palavra evita que um manifesto adulterado escreva qualquer coisa dentro da frase da cena.
  return (
    /^[\p{L}\p{N} '-]+$/u.test(value.name) &&
    (!value.plural || /^[\p{L}\p{N} '-]+$/u.test(value.plural))
  )
}

export function isSceneCast(value: unknown): value is SceneCast {
  if (!isRecord(value)) return false
  for (const papel of ['hero', 'obstacle', 'scenery'] as const)
    if (value[papel] !== undefined && !isSceneActor(value[papel])) return false
  return true
}

/** O papel de um ator no elenco. */
export type SceneRole = keyof SceneCast

/** A figura de cada papel quando nem o campo nem o nome dizem outra coisa: o Corre Dino. */
const FIGURA_DO_PAPEL: Record<SceneRole, SceneFigure> = {
  hero: 'dino',
  obstacle: 'cacto',
  scenery: 'floresta',
}

/**
 * Os nomes que a criança e o professor usam para cada figura, escritos como se escreve (com
 * acento). Curto de propósito: sinônimo que não está aqui cai no padrão do papel, que é o desenho
 * de sempre, e isso é melhor que adivinhar.
 *
 * ⚠️ Exportado porque o editor do admin monta a nota "de onde a figura sai" A PARTIR DAQUI (review
 * do lote 3): a nota escrita à mão listava seis nomes e esquecia meteoro, rocha, laser, fogo,
 * dinossauro, árvore e mata.
 * ⚠️⚠️ "bala" SAIU (review do lote 3): no Brasil bala é DOCE, e um jogo de pegar balas desenharia
 * tiros no espaço. Quem quer o tiro com outro nome escolhe a figura.
 */
export const SCENE_FIGURE_NAMES: Readonly<Record<SceneFigure, readonly string[]>> = {
  dino: ['Dino', 'dinossauro'],
  cacto: ['cacto'],
  floresta: ['floresta', 'árvore', 'mata'],
  nave: ['nave', 'espaçonave', 'astronave', 'foguete', 'óvni', 'disco voador'],
  asteroide: ['asteroide', 'meteoro', 'meteorito', 'cometa'],
  pedra: ['pedra', 'pedrinha', 'pedregulho', 'rocha'],
  tiro: ['tiro', 'laser', 'disparo', 'projétil', 'míssil'],
  chama: ['chama', 'fogo', 'labareda'],
  gorila: ['gorila', 'macaco', 'símio'],
  banana: ['banana'],
  predio: ['prédio', 'edifício', 'torre'],
  estrelas: ['estrelas', 'fundo estrelado', 'céu estrelado'],
  coelho: ['coelho', 'coelhinho'],
  arbusto: ['arbusto', 'moita'],
  flores: ['flores', 'canteiro de flores'],
  'personagem-farol': ['personagem do farol'],
  'chave-farol': ['chave do farol'],
  farol: ['farol'],
}

const semAcento = (s: string) => s.normalize('NFD').replace(/\p{M}/gu, '')

/** Os mesmos nomes, normalizados (minúsculas, sem acento), apontando para a figura. */
const NOMES_DA_FIGURA = new Map<string, SceneFigure>(
  (Object.entries(SCENE_FIGURE_NAMES) as [SceneFigure, readonly string[]][]).flatMap(
    ([figura, nomes]) => nomes.map((nome) => [semAcento(nome.toLowerCase()), figura] as const),
  ),
)

/** Uma palavra casada com a lista: como está, e sem o "s" (ou o "es") do plural. */
function figuraDaPalavra(palavra: string): SceneFigure | null {
  for (const forma of [palavra, palavra.replace(/s$/, ''), palavra.replace(/es$/, '')]) {
    // ⚠️ `Map`, e não objeto: "constructor" é um nome válido de elenco e um objeto literal o
    // devolveria (é do protótipo), com uma função no lugar da figura.
    const achada = NOMES_DA_FIGURA.get(forma)
    if (achada) return achada
  }
  return null
}

/**
 * A figura que um NOME pede, ou `null` quando ele não pede nenhuma.
 *
 * O nome inteiro primeiro; depois cada palavra, na ordem — em português o núcleo vem na frente
 * ("nave espacial", "pedra grande"), e é por isso que "bola de fogo" ainda chega à chama pela
 * última palavra quando a primeira não diz nada.
 */
export function figureFromName(name: string): SceneFigure | null {
  const limpo = semAcento(name.trim().toLowerCase()).replace(/\s+/g, ' ')
  if (!limpo) return null
  const inteiro = figuraDaPalavra(limpo)
  if (inteiro) return inteiro
  for (const palavra of limpo.split(/[\s'-]+/)) {
    const achada = figuraDaPalavra(palavra)
    if (achada) return achada
  }
  return null
}

/**
 * O que o palco desenha para um papel: a figura declarada; senão a que o NOME pede; senão a de
 * fábrica do papel (hero Dino, obstacle cacto, scenery floresta).
 *
 * ⚠️⚠️ Derivar do nome é o que faz os manifestos JÁ publicados (que não têm `figure`) ganharem o
 * desenho certo sem reimportação: "nave", "tiro", "pedra", "asteroide" e "chama" são os nomes
 * que os cursos v6 já usam.
 */
export function actorFigure(cast: SceneCast | undefined, papel: SceneRole): SceneFigure {
  const ator = cast?.[papel]
  if (ator?.figure && (SCENE_FIGURES as readonly string[]).includes(ator.figure)) return ator.figure
  if (ator) {
    const peloNome = figureFromName(ator.name) ?? (ator.plural ? figureFromName(ator.plural) : null)
    if (peloNome) return peloNome
  }
  return FIGURA_DO_PAPEL[papel]
}

/**
 * O mundo em que o palco acontece é hoje o CENÁRIO — o jogo que a cena retrata (`cenario.ts`).
 *
 * ⚠️⚠️ Era `'terra' | 'espaco'`, e isso bastava enquanto o mundo era um retângulo de cor: o eixo
 * dizia só se havia chão. Com o mundo desenhado pela arte do Jogo 2D, a cena precisa saber QUAL
 * jogo ela retrata. Quem pergunta por chão usa `cenarioTemChao`, nunca uma
 * comparação com um valor literal.
 */
export type { SceneCenarioId } from './cenario'

/**
 * Os papéis que o PALCO de cada cena desenha (consertos do review do lote 3, 16/09/2026).
 *
 * ⚠️⚠️ O mundo olhava os três papéis, com ou sem desenho: um elenco `{obstacle: asteroide}` levava
 * a `spawn` para o espaço COM O DINO no céu de estrelas, e uma chama declarada como cenário numa
 * cena que nem desenha cenário mudava o mundo do Dino e dos cactos. A prévia do admin também
 * prometia "Nave, Cacto e Floresta" para cenas abstratas, que não desenham ninguém.
 *
 * ⚠️ É uma tabela LITERAL de propósito, e não algo descoberto: `tests/scene-figures.test.tsx` do
 * member-shell renderiza as 45 cenas e reprova se o palco desenhar papel a mais ou a menos que
 * isto. Uma descoberta sozinha não pegava o palco que desenhasse o obstáculo com o traço CRU do
 * cacto: o papel simplesmente sumia da lista e a cena passava por "abstrata".
 * ⚠️ Cena nova entra aqui no mesmo lote do palco dela (o `Record<SceneId, …>` reprova a falta).
 */
export const SCENE_ROLES: Readonly<Record<SceneId, readonly SceneRole[]>> = {
  'once-vs-always': ['hero', 'obstacle'],
  'fixed-vs-read': ['hero', 'scenery'],
  'collision-pair': ['hero', 'obstacle', 'scenery'],
  invincibility: ['hero', 'obstacle'],
  'number-line': [],
  'unique-names': [],
  'motion-amount': ['hero'],
  'two-clocks': ['hero', 'obstacle'],
  'copy-vs-original': ['hero'],
  'published-copy': ['hero'],
  'same-rules-new-skin': ['hero', 'obstacle'],
  coordinates: ['hero'],
  'screen-reader': ['hero', 'obstacle'],
  // A experiência é só a página e o viewport do jogo: nenhum personagem ou cenário disputa com a
  // descoberta de onde a tela termina.
  'stage-size': [],
  'draw-loop': ['hero'],
  // ⚠️⚠️ Sem papel desde o lote 5 do Raio-X: `frames`, `onion-skin` e `sheet-vs-sprite` desenham a
  // NAVE 32 × 32 da aula (o desenho que a criança fez no Pinta), e não uma figura do elenco. Com o
  // Dino do papel, a animação ensinava o personagem ANDANDO entre os quadros.
  frames: [],
  'onion-skin': [],
  symmetry: [],
  'pixel-vector': [],
  'sheet-vs-sprite': [],
  world: ['hero'],
  layers: ['hero', 'scenery'],
  gravity: ['hero'],
  impulse: ['hero'],
  'jump-sound': ['hero'],
  spawn: ['hero', 'obstacle'],
  // ⚠️ Sem o Dino desde o lote 5 do Raio-X: o palco é a tela e os bastidores do GRUPO de cactos.
  cleanup: ['obstacle'],
  'game-state': ['hero', 'obstacle'],
  controls: ['hero'],
  'touch-response': [],
  'lighthouse-key': [],
  restart: ['hero', 'obstacle'],
  hitbox: ['hero', 'obstacle'],
  // ⚠️ Lote 5 do Raio-X: a `score` ganhou o cacto que vem na partida; `random` e `acceleration`
  // perderam o Dino (a régua, as raias e a fileira são só dos cactos).
  score: ['hero', 'obstacle'],
  lives: ['hero', 'obstacle'],
  random: ['obstacle'],
  acceleration: ['obstacle'],
  velocity: ['hero'],
  'hold-vs-press': [],
  // ⚠️ Lote 5: a `variable` desenha os alvos que o tiro acerta (cada acerto soma 1).
  variable: ['hero', 'obstacle'],
  'group-loop': ['obstacle'],
  'enemy-type': ['obstacle'],
  camera: ['hero'],
  contact: ['hero', 'obstacle'],
  cooldown: ['hero'],
  aim: ['hero'],
  // ⚠️ Lote 5 do Raio-X (G5): a `diagonal` e a `tilemap` ganharam o personagem (o Dino que anda 1
  // segundo com o rastro, e o que cai até o primeiro bloco da coluna dele).
  diagonal: ['hero'],
  tilemap: ['hero'],
  pool: ['obstacle'],
  // ⚠️ Lote 5 do Raio-X: as TORRES do Jogo 3D Avançado, com a pose de cada estado. Não é papel do elenco.
  'entity-state': [],
  'delta-time': ['hero'],
  'circle-collision': [],
  'axis-z': [],
  'camera-3d': [],
  mesh: [],
  'pick-ray': [],
  'fill-stroke': [],
  shading: [],
}

/** Cenas que representam um jogo específico, sem papéis intercambiáveis do elenco. */
export const SCENE_FIXED_CENARIOS: Readonly<Partial<Record<SceneId, SceneCenarioId>>> = {
  'touch-response': 'jardim',
  'lighthouse-key': 'farol',
}

/**
 * Os cenários que UMA figura desenhada já decide sozinha.
 *
 * ⚠️⚠️ A ORDEM dos três passos abaixo é a régua antiga, preservada linha por linha, e ela é
 * sutil: a pedra e a chama ficam de FORA deste conjunto de propósito. Nos cursos elas SÃO o
 * asteroide e o fogo dele, então sozinhas puxam para o jogo delas; mas com um Dino declarado ao
 * lado, a cena é o Corre Dino com uma pedra no caminho. Pôr `meu-jeito` aqui devolveria o defeito
 * que a régua conserta: `{hero: Dino, obstacle: pedra}` punha o Dino no céu de estrelas.
 */
const CENARIOS_IMEDIATOS: readonly SceneCenarioId[] = ['nave', 'gorilas', 'jardim']
/** Os que só decidem quando mais nada decidiu (o terceiro passo). */
const CENARIOS_TARDIOS: readonly SceneCenarioId[] = ['meu-jeito']

const cenarioDaFigura = (f: SceneFigure, entre: readonly SceneCenarioId[]) => {
  if (f === 'estrelas' && entre.includes('nave')) return 'nave'
  const id = CENARIO_DA_FIGURA[f]
  return id && entre.includes(id) ? id : null
}

/**
 * O CENÁRIO de uma cena com este elenco: qual jogo ela retrata. Só contam os papéis que o palco
 * dela desenha (`SCENE_ROLES`); cena que não desenha ninguém fica no Corre Dino.
 *
 * A régua, na ordem:
 * 1. Uma figura de `nave` ou de `gorilas` desenhada → aquele cenário.
 * 2. Senão, algum papel desenhado DECLARADO no elenco com figura do Corre Dino (o professor
 *    escreveu um Dino, um cacto ou uma floresta) → `corre-dino`. É o caso da pedra no caminho.
 * 3. Senão, pedra ou chama desenhada → `meu-jeito`.
 *
 * ⚠️ O papel NÃO declarado não puxa para o Corre Dino: é ele que sobra de fábrica quando o curso
 * só troca um nome, e é justamente o caso que o aviso do editor do admin aponta.
 * ⚠️ `declarado` VENCE a derivação inteira: é o campo `cenario` da atividade, escrito pelo
 * professor. A derivação existe para os manifestos já publicados, que não o têm.
 */
export function sceneCenario(
  cast: SceneCast | undefined,
  scene: SceneId,
  declarado?: SceneCenarioId,
): SceneCenarioId {
  const fixo = SCENE_FIXED_CENARIOS[scene]
  if (fixo) return fixo
  if (declarado && isSceneCenario(declarado)) return declarado
  cast = sceneNativeCast(scene, cast)
  const papeis = SCENE_ROLES[scene] ?? []
  const figuras = papeis.map((p) => actorFigure(cast, p))
  if (scene === 'two-clocks' && figuras[0] === 'nave' && figuras[1] === 'asteroide')
    return 'meu-jeito'
  if (scene === 'published-copy' && figuras[0] === 'nave') return 'meu-jeito'
  if (scene === 'same-rules-new-skin') return 'meu-jeito'
  for (const f of figuras) {
    const id = cenarioDaFigura(f, CENARIOS_IMEDIATOS)
    if (id) return id
  }
  if (papeis.some((p) => cast?.[p] && CENARIO_DA_FIGURA[actorFigure(cast, p)] === 'corre-dino'))
    return 'corre-dino'
  for (const f of figuras) {
    const id = cenarioDaFigura(f, CENARIOS_TARDIOS)
    if (id) return id
  }
  return 'corre-dino'
}

/**
 * ⚠️ Aparado aqui também: o editor do admin guarda o nome como digitado e só apara ao sair do
 * campo (senão "nave espacial", digitado letra a letra, virava "naveespacial"), então um espaço
 * no fim pode chegar até a prévia.
 */
const nomeDe = (a: SceneActor) => a.name.trim()
const plural = (a: SceneActor) => a.plural?.trim() || `${nomeDe(a)}s`

/**
 * Os determinantes que aparecem antes dos termos no catálogo, e a preposição de cada um.
 *
 * ⚠️ Levantado do texto REAL do catálogo (`o Dino`, `do Dino`, `no Dino`, `ao Dino`, `os
 * cactos`, `dos cactos`, `da floresta`…), não de uma gramática inteira: o que não aparece lá
 * não precisa ser tratado, e tratar a mais é inventar caso sem teste.
 */
const DETERMINANTES: Record<string, { prep: '' | 'de' | 'em' | 'a'; plural: boolean }> = {
  o: { prep: '', plural: false },
  a: { prep: '', plural: false },
  os: { prep: '', plural: true },
  as: { prep: '', plural: true },
  do: { prep: 'de', plural: false },
  da: { prep: 'de', plural: false },
  dos: { prep: 'de', plural: true },
  das: { prep: 'de', plural: true },
  no: { prep: 'em', plural: false },
  na: { prep: 'em', plural: false },
  nos: { prep: 'em', plural: true },
  nas: { prep: 'em', plural: true },
  ao: { prep: 'a', plural: false },
  aos: { prep: 'a', plural: true },
  à: { prep: 'a', plural: false },
  às: { prep: 'a', plural: true },
}

/** O determinante certo para o ator novo: artigo, contração e número. */
function determinante(prep: '' | 'de' | 'em' | 'a', gender: 'm' | 'f', muitos: boolean): string {
  const artigo = gender === 'm' ? (muitos ? 'os' : 'o') : muitos ? 'as' : 'a'
  if (prep === '') return artigo
  if (prep === 'de') return `d${artigo}`
  if (prep === 'em') return `n${artigo}`
  return gender === 'm' ? (muitos ? 'aos' : 'ao') : muitos ? 'às' : 'à'
}

/** Os termos de fábrica, e o papel de cada um. A ordem importa: plural antes do singular. */
const TERMOS: { termo: string; papel: keyof SceneCast; muitos: boolean }[] = [
  { termo: 'Dinos', papel: 'hero', muitos: true },
  { termo: 'Dino', papel: 'hero', muitos: false },
  { termo: 'cactos', papel: 'obstacle', muitos: true },
  { termo: 'cacto', papel: 'obstacle', muitos: false },
  { termo: 'Cactos', papel: 'obstacle', muitos: true },
  { termo: 'Cacto', papel: 'obstacle', muitos: false },
  { termo: 'florestas', papel: 'scenery', muitos: true },
  { termo: 'floresta', papel: 'scenery', muitos: false },
  { termo: 'Florestas', papel: 'scenery', muitos: true },
  { termo: 'Floresta', papel: 'scenery', muitos: false },
]

const maiuscula = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

/**
 * As palavras que CONCORDAM com o termo, e as quatro formas de cada uma.
 *
 * ⚠️⚠️ Achado do full review: o artigo sozinho não basta. O texto real do catálogo diz
 * "o mesmo Dino", "um cacto", "Este cacto", "os cactos antigos" — e com um elenco feminino a
 * primeira versão produzia "o mesmo nave", "um pedra", "Este pedra", "as pedras antigos".
 * Onze ocorrências no catálogo, nenhuma pega pelo teste antigo (ele só olhava o artigo colado
 * ao nome). Concordar em gênero é a promessa inteira do elenco; sem isto ele entrega frase de
 * máquina, que é exatamente o que a criança percebe.
 *
 * Ordem das formas: masculino singular, feminino singular, masculino plural, feminino plural.
 */
type Formas = readonly [string, string, string, string]

/** Vêm ANTES do nome: determinantes indefinidos, demonstrativos e modificadores. */
const ANTES: readonly Formas[] = [
  ['um', 'uma', 'uns', 'umas'],
  ['este', 'esta', 'estes', 'estas'],
  ['esse', 'essa', 'esses', 'essas'],
  ['aquele', 'aquela', 'aqueles', 'aquelas'],
  ['nenhum', 'nenhuma', 'nenhuns', 'nenhumas'],
  ['algum', 'alguma', 'alguns', 'algumas'],
  ['todo', 'toda', 'todos', 'todas'],
  ['outro', 'outra', 'outros', 'outras'],
  ['mesmo', 'mesma', 'mesmos', 'mesmas'],
  ['próprio', 'própria', 'próprios', 'próprias'],
  ['novo', 'nova', 'novos', 'novas'],
  ['último', 'última', 'últimos', 'últimas'],
  ['primeiro', 'primeira', 'primeiros', 'primeiras'],
  ['segundo', 'segunda', 'segundos', 'segundas'],
  ['próximo', 'próxima', 'próximos', 'próximas'],
]

/**
 * Vêm DEPOIS do nome, colados nele.
 *
 * ⚠️ Lista curta de propósito. "primeiro" e "ultimo" ficam FORA daqui: pospostos eles quase
 * sempre são advérbio ("o Dino pula primeiro"), e flexioná-los ali produziria um erro novo no
 * lugar do que se conserta. Adjetivo posposto que não estiver nesta lista fica como está -
 * deixar um caso de fora é melhor que estragar uma frase que já estava certa.
 */
const DEPOIS: readonly Formas[] = [
  ['antigo', 'antiga', 'antigos', 'antigas'],
  ['novo', 'nova', 'novos', 'novas'],
  ['guardado', 'guardada', 'guardados', 'guardadas'],
  ['criado', 'criada', 'criados', 'criadas'],
  ['desenhado', 'desenhada', 'desenhados', 'desenhadas'],
  ['ligado', 'ligada', 'ligados', 'ligadas'],
  ['mesmo', 'mesma', 'mesmos', 'mesmas'],
]

/**
 * O PREDICATIVO: o adjetivo que chega depois de um verbo de ligação.
 *
 * ⚠️⚠️ Achado do review do lote A. O catálogo diz "O Dino está escondido atrás de quê?", o
 * motor diz "O Dino foi criado" e a cena das vidas diz "enquanto o Dino está vivo" — e o
 * elenco só sabia concordar com o que estivesse COLADO no nome. Com um elenco feminino as três
 * saem "A nave está escondido", "A nave foi criado", "a nave está vivo", e a primeira delas é a
 * PRIMEIRA PISTA que a criança lê quando trava.
 *
 * ⚠️ Só o adjetivo é flexionado; o verbo fica como está. O número vem do determinante do texto
 * original, que o elenco não muda, então "estão" continua "estão".
 */
const PREDICATIVOS: readonly Formas[] = [
  // ⚠️ `encostado` entrou com a pista 3 do `contact` ("Com o cacto encostado, troque para o
  // acontecimento"): sem ele uma turma de pedra lia "Com a pedra encostado".
  ['encostado', 'encostada', 'encostados', 'encostadas'],
  ['escondido', 'escondida', 'escondidos', 'escondidas'],
  ['criado', 'criada', 'criados', 'criadas'],
  ['guardado', 'guardada', 'guardados', 'guardadas'],
  ['desenhado', 'desenhada', 'desenhados', 'desenhadas'],
  ['coberto', 'coberta', 'cobertos', 'cobertas'],
  ['vivo', 'viva', 'vivos', 'vivas'],
  ['pronto', 'pronta', 'prontos', 'prontas'],
  ['parado', 'parada', 'parados', 'paradas'],
  ['sozinho', 'sozinha', 'sozinhos', 'sozinhas'],
  ['preso', 'presa', 'presos', 'presas'],
  ['salvo', 'salva', 'salvos', 'salvas'],
  ['ligado', 'ligada', 'ligados', 'ligadas'],
  ['novo', 'nova', 'novos', 'novas'],
]
/** Os verbos de ligação que o texto das cenas usa. Lista fechada: fora dela, nada é tocado. */
const LIGACAO = [
  'está',
  'estão',
  'estava',
  'estavam',
  'fica',
  'ficam',
  'ficou',
  'ficaram',
  'foi',
  'foram',
  'continua',
  'continuam',
  'parece',
  'parecem',
  'era',
  'eram',
]

const forma = (f: Formas, gender: 'm' | 'f', muitos: boolean) =>
  f[gender === 'm' ? (muitos ? 2 : 0) : muitos ? 3 : 1]

/** Da palavra escrita para as quatro formas dela. Reconhece qualquer uma das quatro. */
function indice(lista: readonly Formas[]): Map<string, Formas> {
  const mapa = new Map<string, Formas>()
  for (const f of lista) for (const p of f) if (!mapa.has(p)) mapa.set(p, f)
  return mapa
}
const ANTES_INDEX = indice(ANTES)
const DEPOIS_INDEX = indice(DEPOIS)
const PRED_INDEX = indice(PREDICATIVOS)
const alternancia = (mapa: Map<string, Formas>) =>
  [...mapa.keys()]
    .flatMap((p) => [p, p.charAt(0).toUpperCase() + p.slice(1)])
    .sort((a, b) => b.length - a.length)
    .join('|')

/**
 * ⚠️ Duas armadilhas de alternância, as duas pegas por teste:
 * 1. A forma MAIÚSCULA entra na lista. Sem ela "O Dino existe" não casava o determinante,
 *    caía no ramo sem artigo e saía "O nave existe" — justamente o erro que o elenco existe
 *    para não cometer.
 * 2. A ordem é por COMPRIMENTO decrescente. Numa alternância a primeira que casa vence, então
 *    com "o" antes de "os" o plural nunca seria reconhecido.
 */
const DET_ALT = Object.keys(DETERMINANTES)
  .flatMap((d) => [d, maiuscula(d)])
  .sort((a, b) => b.length - a.length)
  .join('|')
const TERMO_ALT = TERMOS.map((t) => t.termo)
  .sort((a, b) => b.length - a.length)
  .join('|')
/**
 * O sintagma inteiro: separador, artigo contraído, modificadores que concordam, o termo e um
 * adjetivo posposto. Tudo o que estiver aqui é reescrito junto; o resto da frase não é tocado.
 *
 * ⚠️ O termo tem que terminar em pontuação ou espaço, senão "Dinossauro" casaria "Dino".
 */
const LIGACAO_ALT = [...LIGACAO].sort((a, b) => b.length - a.length).join('|')
const RE = new RegExp(
  `(^|[\\s("'“‘])(?:(${DET_ALT})\\s+)?((?:(?:${alternancia(ANTES_INDEX)})\\s+)*)(${TERMO_ALT})(\\s+(?:${alternancia(DEPOIS_INDEX)}))?(\\s+(?:${LIGACAO_ALT})\\s+(?:${alternancia(PRED_INDEX)}))?(?=$|[\\s.,;:!?)"'”’])`,
  'gu',
)

/**
 * Veste um texto da cena com o elenco.
 *
 * Preserva o determinante (com a contração certa), os modificadores, o número, o adjetivo
 * posposto e a posição na frase. Sem elenco, ou com um elenco que não declara aquele papel, o
 * texto volta exatamente como estava.
 */
export function castText(text: string, cast?: SceneCast): string {
  if (!cast || (!cast.hero && !cast.obstacle && !cast.scenery)) return text
  return text.replace(
    RE,
    (
      inteiro: string,
      antes: string,
      det: string | undefined,
      mods: string,
      termo: string,
      posposto: string | undefined,
      predicativo: string | undefined,
      offset: number,
      todo: string,
    ) => {
      const achado = TERMOS.find((t) => t.termo === termo)
      const ator = achado && cast[achado.papel]
      if (!achado || !ator) return inteiro
      const chave = det?.toLowerCase()
      const muitos = chave ? (DETERMINANTES[chave]?.plural ?? achado.muitos) : achado.muitos
      const nome = muitos ? plural(ator) : nomeDe(ator)
      const g = ator.gender

      /** Reescreve uma palavra que concorda, preservando a caixa que ela tinha. */
      const concorda = (palavra: string, mapa: Map<string, Formas>) => {
        const f = mapa.get(palavra.toLowerCase())
        if (!f) return palavra
        const nova = forma(f, g, muitos)
        return palavra[0] === palavra[0]?.toUpperCase() ? maiuscula(nova) : nova
      }
      const modificados = mods
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .map((p) => concorda(p, ANTES_INDEX))
      // O adjetivo depois do verbo de ligação concorda igual; o verbo entre os dois não muda.
      const ligado = predicativo
        ? (() => {
            const partes = predicativo.trim().split(/\s+/)
            const adjetivo = partes.pop() ?? ''
            return ` ${[...partes, concorda(adjetivo, PRED_INDEX)].join(' ')}`
          })()
        : ''
      const cauda = (posposto ? ` ${concorda(posposto.trim(), DEPOIS_INDEX)}` : '') + ligado

      // ⚠️⚠️ A caixa vem do que ESTAVA lá, não de uma regra de posição.
      //
      // Com determinante é exato: "O Dino" tinha maiúscula no artigo, então o artigo novo
      // também tem ("A nave"); "o Dino" segue minúsculo. Foi a versão por posição de frase que
      // errou os dois casos que os testes pegaram — capitalizava depois de dois-pontos ("Olhe
      // os bastidores: O Dino…", que em português é minúsculo) e capitalizava um fragmento só
      // por ele começar com o termo.
      //
      // Sem determinante não há o que copiar: "Dino" é nome próprio e vive sempre maiúsculo,
      // enquanto "nave" é nome comum. Aí, e só aí, a posição de frase decide — e quem recebe a
      // maiúscula é a PRIMEIRA palavra do sintagma, que pode ser um modificador ("Este cacto").
      if (!det) {
        const comecaFrase = /(^|[.!?])\s*$/.test(todo.slice(0, offset) + antes)
        const partes = [...modificados, nome]
        if (comecaFrase && partes[0]) partes[0] = maiuscula(partes[0])
        return antes + partes.join(' ') + cauda
      }
      const novoDet = determinante(DETERMINANTES[chave ?? '']?.prep ?? '', g, muitos)
      const cabeca = det[0] === det[0]?.toUpperCase() ? maiuscula(novoDet) : novoDet
      return `${antes}${[cabeca, ...modificados, nome].join(' ')}${cauda}`
    },
  )
}
