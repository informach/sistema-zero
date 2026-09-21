/**
 * Validação do container Rive (`.riv`) enviado no Admin como arte da trilha Kids.
 *
 * Substituiu o allowlist de SVG (`module-illustration-svg.ts`, 249 linhas de
 * parse XML) em 09/2026. A troca encolheu o problema de segurança em vez de
 * movê-lo: um SVG público EXECUTA se aberto direto pela URL, e o que segurava
 * isso era um allowlist à mão, exposto a divergências entre o parser do
 * `@xmldom/xmldom` e o do navegador. Um `.riv` é binário opaco, servido como
 * `application/octet-stream`; não executa em lugar nenhum. O que resta validar é
 * só se é MESMO um `.riv` que este runtime consegue ler.
 *
 * Módulo PURO (sem `server-only`), como o `filenames.ts`: o teste unitário importa direto.
 */

/** Os 4 primeiros bytes de todo `.riv` são o ASCII `RIVE`. */
const MAGIC = [0x52, 0x49, 0x56, 0x45] as const

/**
 * Major do formato que o runtime instalado lê (`@rive-app/canvas` 2.42.x).
 *
 * ⚠️ Vem logo depois do magic, como varuint. Medido nos `.riv` do Zappy: `07 03`
 * em quatro arquivos e `07 04` no `fala.riv`, exportados do mesmo editor em datas
 * diferentes — ou seja, o MINOR anda sozinho e não pode ser preso. O MAJOR é
 * outra história: major diferente é formato que este runtime NÃO lê, e o sintoma
 * seria um canvas vazio no navegador da criança, sem erro nenhum. Recusar aqui,
 * com mensagem, é o contrário disso.
 *
 * ⚠️ Subir junto com o `@rive-app/react-canvas` do `community-kids` (é o runtime
 * que abre o arquivo; este pacote só valida e publica).
 */
export const RIVE_FORMAT_MAJOR = 7

export class InvalidRivFileError extends Error {
  readonly code = 'INVALID_RIV_FILE'
  constructor(message: string) {
    super(message)
    this.name = 'InvalidRivFileError'
  }
}

/** Assinatura `RIVE` nos 4 primeiros bytes, com pelo menos a versão em seguida. */
export function hasRiveMagic(bytes: Uint8Array): boolean {
  return bytes.length > MAGIC.length && MAGIC.every((b, i) => bytes[i] === b)
}

/**
 * Valida-ou-lança. Não reescreve nada: os bytes vão para o R2 como chegaram.
 */
export function assertRivFile(bytes: Uint8Array): void {
  if (!hasRiveMagic(bytes)) {
    throw new InvalidRivFileError(
      'Este arquivo não é uma animação Rive (.riv). Exporte de novo pelo editor do Rive.',
    )
  }
  const major = bytes[4] as number
  // Varuint de vários bytes (bit alto ligado) é, por definição, ≥ 128: nunca é o
  // nosso major, e ler só o primeiro byte daria um número errado.
  if (major >= 0x80 || major !== RIVE_FORMAT_MAJOR) {
    throw new InvalidRivFileError(
      'Este .riv foi exportado num formato que o app ainda não lê. Peça um arquivo exportado por uma versão mais antiga do Rive.',
    )
  }
}
