export interface ImportJsonPolicy {
  jsonDepth: number
  jsonStructure: number
  error(reason: 'invalid' | 'budget', path: string, message: string): Error
}

/** Allocation preflight only. JSON.parse remains the grammar and duplicate-key authority. */
function checkStructure(bytes: Uint8Array, policy: ImportJsonPolicy): void {
  let quoted = false,
    depth = 0,
    structure = 0
  for (let i = 0; i < bytes.length; i++) {
    const byte = bytes[i]
    if (quoted) {
      if (byte === 0x5c) i++
      else if (byte === 0x22) quoted = false
    } else if (byte === 0x22) quoted = true
    else {
      if (byte === 0x7b || byte === 0x5b) {
        depth++
        structure++
      } else if (byte === 0x7d || byte === 0x5d) depth--
      else if (byte === 0x2c || byte === 0x3a) structure++
      if (depth > policy.jsonDepth || structure > policy.jsonStructure)
        throw policy.error(
          'budget',
          'json',
          'A estrutura deste arquivo é grande demais para abrir no Molda.',
        )
    }
  }
}

/** Caller checks the byte budget and exclusive ArrayBuffer before entering this reader. */
export function readImportJson(bytes: Uint8Array, policy: ImportJsonPolicy): unknown {
  checkStructure(bytes, policy)
  try {
    // fatal rejects malformed UTF-8; default BOM handling tolerates the optional UTF-8 BOM.
    return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes))
  } catch {
    throw policy.error('invalid', 'json', 'Não foi possível ler o JSON deste arquivo como UTF-8.')
  }
}
