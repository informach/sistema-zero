import { isRecord } from './actions'

/**
 * O ELENCO da cena: quem está no palco.
 *
 * As cenas ensinam conceitos que os três cursos repetem — criar não é desenhar, a área
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

/** Um papel do elenco. O gênero não é enfeite: sem ele o artigo sai errado em metade das frases. */
export interface SceneActor {
  /** Como a criança chama: "nave", "asteroide", "Dino". Sem artigo. */
  name: string
  gender: 'm' | 'f'
  /** Só quando o plural não é `name` + "s" (o caso de "pedra" é regular; "canhão" não é). */
  plural?: string
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

export function isSceneActor(value: unknown): value is SceneActor {
  if (!isRecord(value)) return false
  if (typeof value.name !== 'string' || value.name.trim().length === 0 || value.name.length > 24)
    return false
  if (value.gender !== 'm' && value.gender !== 'f') return false
  if (value.plural !== undefined && (typeof value.plural !== 'string' || value.plural.length > 28))
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

const plural = (a: SceneActor) => a.plural ?? `${a.name}s`

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
const RE = new RegExp(
  `(^|[\\s("'“‘])(?:(${DET_ALT})\\s+)?((?:(?:${alternancia(ANTES_INDEX)})\\s+)*)(${TERMO_ALT})(\\s+(?:${alternancia(DEPOIS_INDEX)}))?(?=$|[\\s.,;:!?)"'”’])`,
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
      offset: number,
      todo: string,
    ) => {
      const achado = TERMOS.find((t) => t.termo === termo)
      const ator = achado && cast[achado.papel]
      if (!achado || !ator) return inteiro
      const chave = det?.toLowerCase()
      const muitos = chave ? (DETERMINANTES[chave]?.plural ?? achado.muitos) : achado.muitos
      const nome = muitos ? plural(ator) : ator.name
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
      const cauda = posposto ? ` ${concorda(posposto.trim(), DEPOIS_INDEX)}` : ''

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
