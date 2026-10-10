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
  avatar?: ParticipacaoAvatar
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
  const a = section.avatar
  if (!a) return { before: fala, after: '' }
  if (!section.videoKey) throw new Error(`${section.key}: avatar exige vídeo`)
  for (const field of ['after', 'speech', 'beforeScreen', 'afterScreen'] as const) {
    if (!a[field]?.trim()) throw new Error(`${section.key}: ${field} vazio`)
  }
  const offset = fala.indexOf(a.after)
  if (offset < 0 || fala.indexOf(a.after, offset + 1) >= 0) {
    throw new Error(`${section.videoKey}: âncora ausente ou repetida: ${a.after}`)
  }
  const split = offset + a.after.length
  const after = fala.slice(split).trim()
  if (!after) throw new Error(`${section.videoKey}: falta retomada da professora`)
  return { before: fala.slice(0, split).trim(), after }
}

export function palavrasDoVideo(section: SecaoComAvatar, speech: string[]): number {
  return [...speech, section.avatar?.speech ?? '', section.avatar?.reply ?? '']
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
  const { before, after } = dividirFala(section, speech)
  const a = section.avatar
  if (!a) return turno('Professora', screen, before)
  const nome = avatarDaAula(index)
  return [
    `**Direção geral do clipe:** ${screen} Executar cada gesto junto da fala correspondente; as notas abaixo delimitam o corte do avatar.`,
    '',
    `**ID de edição:** \`${section.videoKey}-avatar-01\`.`,
    '',
    turno('Professora', a.beforeScreen, before),
    turno(
      `${nome} (avatar)`,
      `${nome} entra com o resultado anterior à vista. Manter os gestos parados durante a fala; não adiantar a demonstração seguinte.`,
      a.speech,
    ),
    turno(
      'Professora',
      `${nome} sai antes da resposta. ${a.afterScreen}`,
      `${a.reply ? `${a.reply} ` : ''}${after}`,
    ),
  ].join('\n')
}

/** Texto comum à proposta e ao plannedVideo, com âncora e fala completas. */
export function planoAvatar(section: SecaoComAvatar, speech: string[], index: number): string {
  const { after } = dividirFala(section, speech)
  const a = section.avatar
  if (!a) return 'Somente a professora neste clipe. Zappy permanece na página, sem voz no vídeo.'
  const nome = avatarDaAula(index)
  const retomada = `${a.reply ? `${a.reply} ` : ''}${after.split('\n\n')[0]}`
  return `ID ${section.videoKey}-avatar-01. Professora até “${a.after}”. Antes da entrada: ${a.beforeScreen} ${nome} entra, com os gestos parados, e fala: “${a.speech}”. ${nome} sai antes da resposta. Retomada da professora: “${retomada}”. Na retomada: ${a.afterScreen} Zappy não tem voz no vídeo. Gravação, edição e publicação desta versão não confirmadas.`
}
