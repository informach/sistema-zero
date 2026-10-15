/** Shared by the host and the editor. No React, Blockly or provider dependencies. */
export type StudioTutorKind = 'classic' | 'pro'
export const STUDIO_TUTOR_POLICY_VERSION = 1

export function studioTutorPolicy(kind: StudioTutorKind) {
  return kind === 'pro'
    ? { version: STUDIO_TUTOR_POLICY_VERSION, pedagogy: 'code' as const, code: true, blocks: false }
    : {
        version: STUDIO_TUTOR_POLICY_VERSION,
        pedagogy: 'blocks' as const,
        code: false,
        blocks: true,
      }
}

export function studioTutorContextHint(kind: StudioTutorKind): string {
  return kind === 'pro'
    ? 'Abra o arquivo relacionado, rode o jogo ou copie a mensagem de erro.'
    : 'Selecione o bloco, rode o jogo ou conte qual mecânica travou.'
}

export type StudioTutorModeViolation = 'code-in-blocks' | 'blocks-in-pro'

/** Defense in depth for answers, suggestion chips and legacy conversation memory. */
export function studioTutorModeViolation(
  text: string,
  kind: StudioTutorKind,
): StudioTutorModeViolation | null {
  const plain = text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
  if (kind === 'pro') {
    // A JavaScript code block is valid; dragging a Blockly block is not.
    const visualBlocks = plain.replace(
      /blocos? de (?:codigo|pedra|madeira|terra|gelo|metal)\b/g,
      'objeto',
    )
    if (
      /\b(?:selecione|selecionar|arraste|arrastar|encaixe|encaixar|conecte|conectar|adicione|adicionar|use|usar|uso|pegue|clique|procure)\b[^.!?\n]{0,70}\bblocos?\b/.test(
        visualBlocks,
      ) ||
      /\b(?:paleta de blocos|blockly|bloco\s+["“])/.test(visualBlocks)
    )
      return 'blocks-in-pro'
    return null
  }
  const unwrapped = text.replace(/`([^`]+)`/g, '$1')
  if (
    /```|\b(?:const|let|var|function)\b|=>/.test(unwrapped) ||
    /<[a-z][a-z0-9]*\s+[a-z-]+=/i.test(unwrapped) ||
    (unwrapped.match(/<\/[a-z][a-z0-9]*>/gi) ?? []).length >= 2 ||
    /\b(?:npm|pnpm|yarn|bun)\s+(?:install|add|run|exec|create)\b/.test(plain) ||
    /\b(?:escreva|escrever|digite|digitar|cole|colar|edite|editar|programe|programar|crie|criar|abra|abrir)\b[^.!?\n]{0,80}\b(?:codigo|javascript|typescript|script|arquivo\s+\S+\.(?:js|ts|tsx|jsx))\b/.test(
      plain,
    ) ||
    /\b(?:programacao textual|terminal|editor de codigo)\b/.test(plain)
  )
    return 'code-in-blocks'
  return null
}
