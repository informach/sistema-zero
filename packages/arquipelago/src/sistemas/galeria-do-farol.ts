import {
  type AparenciaDoObjeto,
  CATALOGO_DE_OBJETOS,
  chaveDaExposicao,
  type ExposicaoDoFarol,
  type JogoDoMural,
  type Minijogo,
  OBJETOS_DA_CASA,
  type Salvamento,
  VAGAS_DA_GALERIA_DO_FAROL,
} from '@sistemazero/arquipelago-contracts'

/**
 * O modo livre da Lenda (fase4-12, 30/10/2026): depois do final no alto do Farol, todos os projetos
 * azuis chegam (`ganharProjetos`) e a sala do alto vira a galeria das criações dela. Seis vagas em
 * volta da lente, cada uma com uma criação: a aparência do Pinta ou do Molda que um objeto guarda,
 * um jogo publicado no Mural ou um minijogo aprovado no Desafio. O salvamento guarda a escolha
 * (`farol.galeria`, V20); o que se expõe sempre vem do que ela tem (nada é inventado).
 */
export const PAINEL_DA_GALERIA = 'galeria-do-farol'

/** As vagas no chão da sala, no referencial do `alto-do-farol.glb` (y = piso), e o giro de frente para a lente. */
export const VAGAS_DA_GALERIA: readonly { x: number; z: number; giro: number }[] = (() => {
  // Seis ângulos em volta da lente, longe da varanda (+x), da grade da escada e da mesa da Íris.
  const graus = [45, 80, 115, 200, 300, 330]
  const raio = 3.3
  return graus.map((g) => {
    const a = (g * Math.PI) / 180
    const x = Math.cos(a) * raio
    const z = Math.sin(a) * raio
    return { x, z, giro: Math.atan2(-x, -z) }
  })
})()

/** O pedestal: um cilindro baixo, com o tampo (um pouco mais largo) onde a criação fica. */
export const PEDESTAL = { raio: 0.32, altura: 0.9, raioDoTampo: 0.37, alturaDoTampo: 0.06 } as const

/**
 * A câmera da sala no modo livre: a vista fixa do final esconde as vagas do lado da porta, então a
 * galeria usa uma câmera que anda em volta da lente junto com a criança. Ela fica de lado (`desvio`
 * em radianos à frente do ângulo da criança, a `raio` do centro), abaixo do forro do domo (3,5 m)
 * e acima da lente (3,12 m), mirando o lado da criança (`raioDoAlvo`, `alturaDoAlvo`). De lado, a
 * linha até a criança e até o pedestal dela nunca passa pela lente, nem com ela encostada no vidro.
 */
export const CAMERA_DA_GALERIA = {
  desvio: (50 * Math.PI) / 180,
  raio: 3,
  altura: 3.25,
  raioDoAlvo: 2.6,
  alturaDoAlvo: 1,
  /** Rapidez do giro atrás da criança (1/s); com menos movimento ela acompanha na hora. */
  rapidez: 2.5,
} as const

/** Onde a câmera da galeria fica e para onde olha, no referencial da sala, para a criança em `angulo`. */
export function cameraDaGaleria(angulo: number): {
  posicao: { x: number; y: number; z: number }
  alvo: { x: number; y: number; z: number }
  /** O giro da câmera no formato do `rastro.giro` (olha para `-sin`, `-cos`). */
  giro: number
} {
  const k = CAMERA_DA_GALERIA
  const lado = angulo + k.desvio
  const posicao = { x: Math.cos(lado) * k.raio, y: k.altura, z: Math.sin(lado) * k.raio }
  const alvo = {
    x: Math.cos(angulo) * k.raioDoAlvo,
    y: k.alturaDoAlvo,
    z: Math.sin(angulo) * k.raioDoAlvo,
  }
  return { posicao, alvo, giro: Math.atan2(posicao.x - alvo.x, posicao.z - alvo.z) }
}

export function galeriaAberta(s: Salvamento): boolean {
  return s.farol.concluido
}

/** As seis vagas, com `null` nas vazias (o salvamento guarda só até a última cheia). */
export function vagasDaGaleria(s: Salvamento): (ExposicaoDoFarol | null)[] {
  return Array.from({ length: VAGAS_DA_GALERIA_DO_FAROL }, (_, i) => s.farol.galeria[i] ?? null)
}

function comVagas(s: Salvamento, vagas: (ExposicaoDoFarol | null)[]): Salvamento {
  const galeria = [...vagas]
  while (galeria.length > 0 && galeria.at(-1) === null) galeria.pop()
  return { ...s, farol: { ...s.farol, galeria } }
}

/**
 * Pôr uma criação numa vaga. Se ela já estava em outra vaga, muda de lugar (a mesma criação não fica
 * em duas). Sem o final concluído, ou fora das seis vagas, nada muda.
 */
export function exporNaVaga(s: Salvamento, vaga: number, e: ExposicaoDoFarol): Salvamento {
  if (!galeriaAberta(s) || vaga < 0 || vaga >= VAGAS_DA_GALERIA_DO_FAROL) return s
  const chave = chaveDaExposicao(e)
  const vagas = vagasDaGaleria(s).map((x) => (x && chaveDaExposicao(x) === chave ? null : x))
  vagas[vaga] = e
  return comVagas(s, vagas)
}

/** Esvaziar uma vaga. */
export function tirarDaVaga(s: Salvamento, vaga: number): Salvamento {
  const vagas = vagasDaGaleria(s)
  if (!vagas[vaga]) return s
  vagas[vaga] = null
  return comVagas(s, vagas)
}

/** Em que vaga a criação está (ou -1). */
export function vagaDaExposicao(s: Salvamento, e: ExposicaoDoFarol): number {
  const chave = chaveDaExposicao(e)
  return vagasDaGaleria(s).findIndex((x) => x !== null && chaveDaExposicao(x) === chave)
}

const NOME_DA_ORIGEM: Readonly<Record<string, string>> = {
  pinta: 'do Pinta',
  molda: 'do Molda',
  criacao: 'feita por você',
}

/** Uma criação que dá para expor, com o nome que a tela mostra. */
export interface CriacaoParaExpor {
  exposicao: ExposicaoDoFarol
  titulo: string
  tipo: 'aparencia' | 'mural' | 'minijogo'
}

/**
 * O que ela pode expor: as aparências feitas por ela (do Pinta, do Molda ou guardadas, nunca as da
 * galeria de compras) que os objetos guardam, os minijogos aprovados e os jogos do Mural (as duas
 * listas vêm do serviço; sem elas, só as aparências).
 */
export function criacoesParaExpor(
  s: Salvamento,
  minijogos: readonly Minijogo[],
  mural: readonly JogoDoMural[],
): CriacaoParaExpor[] {
  const aparencias = OBJETOS_DA_CASA.flatMap((objeto) =>
    (s.projetos[objeto]?.aparencias ?? [])
      .filter((a) => a.origem !== 'galeria')
      .map(
        (a): CriacaoParaExpor => ({
          exposicao: ['a', objeto, a.id],
          titulo: tituloDaAparencia(objeto, a),
          tipo: 'aparencia',
        }),
      ),
  )
  return [
    ...aparencias,
    ...minijogos.map(
      (m): CriacaoParaExpor => ({
        exposicao: ['d', m.desafioId],
        titulo: m.titulo,
        tipo: 'minijogo',
      }),
    ),
    ...mural.map(
      (j): CriacaoParaExpor => ({ exposicao: ['j', j.playId], titulo: j.titulo, tipo: 'mural' }),
    ),
  ]
}

function tituloDaAparencia(objeto: (typeof OBJETOS_DA_CASA)[number], a: AparenciaDoObjeto): string {
  const nome = CATALOGO_DE_OBJETOS[objeto].molde.nome
  return `${nome} ${NOME_DA_ORIGEM[a.origem] ?? ''}`.trim()
}

/** A aparência que a exposição aponta, se o objeto ainda a guarda (senão a vaga mostra vazia). */
export function aparenciaDaExposicao(
  s: Salvamento,
  e: ExposicaoDoFarol,
): { objeto: (typeof OBJETOS_DA_CASA)[number]; aparencia: AparenciaDoObjeto } | null {
  if (e[0] !== 'a') return null
  const aparencia = s.projetos[e[1]]?.aparencias.find(
    (a) => a.id === e[2] && a.origem !== 'galeria',
  )
  return aparencia ? { objeto: e[1], aparencia } : null
}

/** O nome da criação exposta (o do jogo vem da lista do serviço; sem ela, um nome geral). */
export function tituloDaExposicao(
  s: Salvamento,
  e: ExposicaoDoFarol,
  minijogos: readonly Minijogo[],
  mural: readonly JogoDoMural[],
): string {
  if (e[0] === 'a') {
    const achada = aparenciaDaExposicao(s, e)
    return achada
      ? tituloDaAparencia(achada.objeto, achada.aparencia)
      : 'Criação que não está mais guardada'
  }
  if (e[0] === 'd') return minijogos.find((m) => m.desafioId === e[1])?.titulo ?? 'Minijogo'
  return mural.find((j) => j.playId === e[1])?.titulo ?? 'Jogo do Mural'
}

export const FALA_DO_MODO_LIVRE =
  'O modo livre começou. Todos os projetos azuis chegaram para você montar a casa do seu jeito, e o alto do Farol agora é a sua galeria.'
export const FALA_DA_GALERIA_VAZIA =
  'Escolha uma criação sua para esta vaga. Ela fica em exposição no alto do Farol.'
