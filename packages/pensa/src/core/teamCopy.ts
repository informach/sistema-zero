/**
 * As palavras da EQUIPE do plano (26/09/2026), num lugar só: a janela, os chips do cartão, o
 * "Entrar com um código" da home e o aviso de "alguém mexeu". Sem travessão e sem jargão: é a
 * criança quem lê. O código chega CRU do servidor (`AAAAAB`); quem o veste com o prefixo é o
 * `displayShareCode`, o espelho do `formatShareCode` do members.
 */
export const SHARE_CODE_PREFIX = 'ZAP'

export function displayShareCode(code: string): string {
  const upper = code.trim().toUpperCase()
  return upper.startsWith(`${SHARE_CODE_PREFIX}-`) ? upper : `${SHARE_CODE_PREFIX}-${upper}`
}

/** O 1º nome de alguém da equipe, ou "Colega" quando o servidor não soube. */
export function personName(firstName: string | null): string {
  return firstName?.trim() || 'Colega'
}

export const TEAM_COPY = {
  button: 'Equipe',
  dialogTitle: 'Equipe do plano',
  ownerLead: (name: string) => `Quem entrar pelo código vê e mexe em tudo do plano "${name}".`,
  // "Vocês" e não "vocês dois": a equipe pode ter mais gente.
  memberLead: (owner: string) => `Este plano é de ${owner}. Vocês mexem no mesmo plano.`,
  eachBuildsAlone:
    'Cada um constrói no seu Estúdio, no seu Pinta e no seu Molda. O que vocês dividem é o plano.',
  seats: (used: number, max: number) =>
    used === 1 ? `1 de ${max} lugares` : `${used} de ${max} lugares`,
  noCode: 'Ninguém entra sem um código. Crie um e mande para quem vai planejar com você.',
  codeLabel: 'Código do plano',
  codeHint: 'Quem tem o Pensa digita este código na tela dos planos e entra na equipe.',
  createCode: 'Criar um código',
  rotateCode: 'Gerar outro código',
  rotateHint: 'O código antigo deixa de valer na hora.',
  disableCode: 'Desligar o código',
  copy: 'Copiar',
  copied: 'Código copiado!',
  copyFailed: 'Não deu para copiar. Selecione o código e copie você mesmo.',
  you: 'você',
  owner: 'dono do plano',
  remove: 'Tirar',
  removeConfirm: (name: string) => `Tirar ${name} da equipe?`,
  removeYes: 'Tirar mesmo',
  removeNo: 'Deixar',
  leave: 'Sair da equipe',
  leaveConfirm: 'Sair da equipe? Você perde o acesso a este plano.',
  leaveYes: 'Sair mesmo',
  leaveNo: 'Ficar',
  working: 'Um instante…',
  close: 'Fechar',
  loading: 'Buscando a equipe…',
  emptyMembers: 'Ainda não entrou ninguém.',
  chipTeam: (count: number) => `Em equipe · ${count}`,
  chipFrom: (owner: string) => `De ${owner}`,
  joinButton: 'Entrar com um código',
  joinLabel: 'Código do plano de um colega',
  joinPlaceholder: 'Ex.: ZAP-7K3QM2',
  joinSubmit: 'Entrar',
  joinBusy: 'Entrando…',
  changed: 'Alguém da equipe mexeu no plano.',
  reload: 'Atualizar',
} as const

/**
 * Um nome no MEIO de uma frase. Sem nome, "alguém da equipe": o "Colega" do `personName` é
 * rótulo de lista ("Missão de Colega" não se lê).
 * ⚠️ "de Bia", nunca "da Bia"/"do Leo": a tela não sabe se é menina ou menino, e o artigo
 * errado é pior que a ausência dele.
 */
const someone = (name: string | null): string => name?.trim() || 'alguém da equipe'

/**
 * As palavras da equipe no Pensa v2 (14/10/2026): duas funções (quem programa, no Estúdio; quem
 * faz as artes, no Pinta e no Molda). Nada de "usuário", "membro" ou "papel": é a criança quem lê.
 */
export const JOURNEY_TEAM_COPY = {
  dialogTitle: 'Equipe do jogo',
  ownerLead: (name: string) =>
    `Quem entrar pelo código planeja "${name}" com você, e cada pessoa cuida de uma parte do jogo.`,
  memberLead: (owner: string | null) =>
    `Este jogo é de ${someone(owner)}. Vocês planejam juntos, e cada pessoa cuida de uma parte.`,
  codeShareHint:
    'Quem tem o Pensa aperta "Entrar com um código" na tela dos jogos e digita este código.',
  rolesTitle: 'Funções',
  codeLegend: 'Quem programa (Estúdio)',
  codeHint: 'O jogo fica no Estúdio de quem programa.',
  codeLocked:
    'O jogo já começou no Estúdio de quem programa. Essa função não muda mais neste plano.',
  artLegend: 'Quem faz as artes (Pinta e Molda)',
  artHint: 'Ninguém marcado: quem programa também desenha.',
  artNobody: (programmer: string) => `${programmer} programa e também desenha.`,
  saveRoles: 'Guardar as funções',
  rolesSaved: 'Funções guardadas!',
  rolesSolo: 'Quando alguém entrar, você escolhe quem programa e quem faz as artes.',
  rolesReadOnly: 'Só quem criou o plano escolhe as funções.',
  removeProgrammer: (name: string | null) =>
    name
      ? `O jogo está no Estúdio de ${name}. Se ${name} sair, o jogo fica com ${name}.`
      : 'O jogo está no Estúdio de quem programa. Se essa pessoa sair, o jogo fica com ela.',
  leaveProgrammer: 'O jogo está no seu Estúdio. Se você sair, o jogo fica com você.',
  programmerOnly: (name: string | null) =>
    name
      ? `Quem testa e guarda as versões é ${name}.`
      : 'Quem testa e guarda as versões é quem programa o jogo.',
  yourMission: 'Sua missão',
  missionOf: (name: string | null) => `Missão de ${someone(name)}`,
  missionOfArtTeam: 'Missão das artes da equipe',
  waitingCode: (name: string | null) => `Esperando a programação de ${someone(name)}`,
  waitingArt: (name: string | null) => `Esperando a arte de ${someone(name)}`,
  waitingArtTeam: 'Esperando as artes da equipe',
  waitingLead: 'Enquanto isso, você pode ver o caminho e guardar ideias para depois.',
  seePath: 'Ver o caminho',
  keepIdea: 'Guardar uma ideia',
  you: 'você',
} as const
