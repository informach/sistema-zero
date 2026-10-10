/** Participações editoriais no vídeo; não alteram a fala da página nem os passos do Mapa. */
export interface ParticipacaoAvatar {
  /** Trecho literal e único da professora. A criança entra logo depois dele. */
  after: string
  speech: string
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
  return `**Vozes e edição:** Professora conduz; ${avatarDaAula(index)} é o avatar desta aula inteira. A criança entra, fala e sai nos pontos marcados, sem cobrir o jogo, os campos ou os encaixes. Não interromper um arraste de bloco. A professora retoma antes de passar a vez a quem assiste. Zappy não tem voz dentro do vídeo; seu diálogo e o botão Ouvir pertencem à página. Nos clipes sem participação marcada, fala só a professora. Gravação, edição e publicação desta versão não confirmadas. [Direção de produção](../AVATARES-NOS-VIDEOS.md).`
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
  return [...speech, ...participacoes(section).flatMap((a) => [a.speech, a.reply ?? ''])]
    .join(' ')
    .trim()
    .split(/\s+/).length
}

function turno(papel: string, tela: string, fala: string): string {
  return `**Na tela:** ${tela}\n\n**${papel}:**\n\n> “${fala.replaceAll('\n\n', '\n>\n> ')}”\n`
}

export function roteiroComAvatar(
  section: SecaoComAvatar,
  speech: string[],
  screen: string,
  index: number,
): string {
  const { entradas, trechos } = dividirFala(section, speech)
  if (!entradas.length) return turno('Professora', screen, trechos[0]!)
  const nome = avatarDaAula(index)
  const lines = [
    `**Direção geral do clipe:** ${screen} Executar cada gesto junto da fala correspondente; as notas abaixo delimitam as entradas do avatar.`,
    '',
    turno('Professora', entradas[0]!.beforeScreen, trechos[0]!),
  ]
  for (const [i, a] of entradas.entries()) {
    lines.push(
      `**ID de edição:** \`${section.videoKey}-avatar-${String(i + 1).padStart(2, '0')}\`.`,
      '',
      turno(
        `${nome} (avatar)`,
        `${nome} entra com o resultado anterior à vista. Manter os gestos parados durante a fala; não adiantar a demonstração seguinte.`,
        a.speech,
      ),
      turno(
        'Professora',
        `${nome} sai antes da resposta. ${a.afterScreen}${entradas[i + 1] ? ` ${entradas[i + 1]!.beforeScreen}` : ''}`,
        `${a.reply ? `${a.reply} ` : ''}${trechos[i + 1]}`,
      ),
    )
  }
  return lines.join('\n')
}

/** Texto comum à proposta e ao plannedVideo, com âncora e fala completas. */
export function planoAvatar(section: SecaoComAvatar, speech: string[], index: number): string {
  const { entradas, trechos } = dividirFala(section, speech)
  if (!entradas.length)
    return 'Somente a professora neste clipe. Zappy permanece na página, sem voz no vídeo.'
  const nome = avatarDaAula(index)
  const pontos = entradas
    .map((a, i) => {
      const proximoParagrafo = trechos[i + 1]!.split('\n\n')[0]!
      const inicio = proximoParagrafo.match(/^.*?[.!?](?=\s|$)/)?.[0] ?? proximoParagrafo
      const retomada = `${a.reply ? `${a.reply} ` : ''}${inicio}`
      return `ID ${section.videoKey}-avatar-${String(i + 1).padStart(2, '0')}. Professora até “${a.after}”. Antes: ${a.beforeScreen} ${nome}: “${a.speech}”. Retomada da professora: “${retomada}”. Depois: ${a.afterScreen}`
    })
    .join('\n\n')
  return `${nome} entra com os gestos parados em cada ponto e sai antes da resposta. Zappy não tem voz no vídeo. Gravação, edição e publicação desta versão não confirmadas.\n\n${pontos}`
}
