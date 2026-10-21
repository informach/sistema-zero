import {
  contextoDeEdicao,
  type IntervencaoKids,
  type ParteFalado,
  prepararFala,
  renderizarClipe,
  semTags,
} from './roteiro-elevenlabs'

/** Trechos transferíveis: a professora grava o master inteiro, inclusive a intervenção. */
export interface ParticipacaoAvatar {
  /** Trecho literal e único da professora. A criança entra logo depois dele. */
  after: string
  speech: string
  /** Preparação falada, somente quando a frase precisa ser citada como pensamento. */
  leadIn?: string
  beforeScreen: string
  afterScreen: string
  /** Ponte curta da professora, exclusiva do vídeo, antes de retomar o texto existente. */
  reply?: string
}

interface SecaoComAvatar {
  key: string
  videoKey?: string
  avatar?: ParticipacaoAvatar | ParticipacaoAvatar[]
}

export function participacoes(section: SecaoComAvatar): ParticipacaoAvatar[] {
  if (!section.avatar) return []
  return Array.isArray(section.avatar) ? section.avatar : [section.avatar]
}

export function avatarDaAula(index: number): 'Debinha' | 'Dedé' {
  if (!Number.isInteger(index) || index < 0) throw new Error('Ordem da aula inválida')
  return index % 2 === 0 ? 'Debinha' : 'Dedé'
}

export function orientacaoAvatares(index: number): string {
  return `**Produção:** a professora grava toda a fala principal. Na montagem kids, ${avatarDaAula(index)} substitui somente os trechos da tabela, com a mesma frase e sem voz sobreposta. O master funciona sozinho no adulto. Notas e recados da página não são gravados. [Direção de voz e edição](../../aulas-interativas-tecnico/DIRETRIZES-VOZ-ELEVENLABS.md).`
}

function dividirFala(section: SecaoComAvatar, speech: string[]) {
  const fala = speech.join('\n\n')
  const entradas = participacoes(section)
  if (!entradas.length) return { entradas, trechos: [fala] }
  if (!section.videoKey) throw new Error(`${section.key}: avatar exige vídeo`)
  const trechos: string[] = []
  let cursor = 0
  for (const a of entradas) {
    for (const field of ['after', 'speech', 'beforeScreen', 'afterScreen'] as const) {
      if (!a[field]?.trim()) throw new Error(`${section.key}: ${field} vazio`)
    }
    const offset = fala.indexOf(a.after)
    if (offset < 0 || fala.indexOf(a.after, offset + 1) >= 0) {
      throw new Error(`${section.videoKey}: âncora ausente ou repetida: ${a.after}`)
    }
    const split = offset + a.after.length
    if (split <= cursor)
      throw new Error(`${section.videoKey}: entradas fora de ordem ou no mesmo ponto`)
    trechos.push(fala.slice(cursor, split).trim())
    cursor = split
  }
  const after = fala.slice(cursor).trim()
  if (!after) throw new Error(`${section.videoKey}: falta retomada da professora`)
  trechos.push(after)
  return { entradas, trechos }
}

export function palavrasDoVideo(section: SecaoComAvatar, speech: string[]): number {
  return semTags(comporMaster(section, speech, 0).texto).split(/\s+/).length
}

export function roteiroComAvatar(
  section: SecaoComAvatar,
  speech: string[],
  screen: string,
  index: number,
): string {
  const parte = comporMaster(section, speech, index)
  const notas = participacoes(section).map(
    (a, n) =>
      `- \`${parte.intervencoes[n]?.id}\`: entrada — ${a.beforeScreen} Saída — ${a.afterScreen}`,
  )
  return (
    renderizarClipe(parte, screen) +
    (notas.length
      ? `\n**Imagem nas substituições kids (não gravar):**\n\n${notas.join('\n')}\n`
      : '')
  )
}

/** Texto comum à proposta e ao plannedVideo, com âncora e fala completas. */
export function planoAvatar(section: SecaoComAvatar, speech: string[], index: number): string {
  const parte = comporMaster(section, speech, index)
  return parte.intervencoes.length
    ? `A professora grava toda a fala. Substituições kids, sem sobrepor vozes:\n\n${parte.intervencoes.map((i) => `${i.id}: ${i.personagem} substitui “${i.falaPrincipal}”. Antes: “${i.ancoraAntes}”. Depois: “${i.ancoraDepois}”.`).join('\n\n')}`
    : 'Master integral da professora; sem substituição kids neste clipe.'
}

/** Integra as perguntas úteis ao discurso; reações vazias não viram obrigação de edição. */
export function comporMaster(
  section: SecaoComAvatar,
  speech: string[],
  index: number,
): ParteFalado {
  if (!section.videoKey) throw new Error(`${section.key}: exige vídeo`)
  const { entradas, trechos } = dividirFala(section, speech)
  let texto = trechos[0] ?? ''
  const marcadas: { id: string; frase: string; antes: string; depois: string }[] = []
  for (const [n, a] of entradas.entries()) {
    const retoma = `${a.reply ? `${a.reply} ` : ''}${trechos[n + 1] ?? ''}`.trim()
    const frase = a.speech.trim()
    // A preparação pertence à autoria. Perguntas diretas entram na conversa sem
    // um cabeçalho automático; só pensamentos citados recebem a preparação escrita.
    const antes = contextoDeEdicao(`${texto} ${a.leadIn ?? ''}`, 'antes')
    const depois = retoma
    texto += a.leadIn ? `\n\n${a.leadIn} “${frase}”\n\n${depois}` : `\n\n${frase}\n\n${depois}`
    marcadas.push({ id: `${section.videoKey}-K${n + 1}`, frase, antes, depois })
  }
  const principal = semTags(texto)
  const intervencoes: IntervencaoKids[] = marcadas.map((m) => {
    const pos = principal.indexOf(m.frase, principal.indexOf(m.antes))
    const ocorrencia = principal.slice(0, pos).split(m.frase).length
    return {
      id: m.id,
      clipe: section.videoKey ?? section.key,
      personagem: avatarDaAula(index),
      falaPrincipal: m.frase,
      falaPersonagem: m.frase,
      ancoraAntes: m.antes,
      ancoraDepois: contextoDeEdicao(m.depois, 'depois'),
      ocorrencia,
      tags: [m.frase.endsWith('?') ? '[curious]' : '[thoughtful]'],
    }
  })
  return { clipe: section.videoKey, texto: prepararFala(texto), intervencoes }
}
