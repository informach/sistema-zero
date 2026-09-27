import { base64ToBytes } from '../core/skinCodec'

export interface ImportDataUri {
  encoding: 'base64' | 'percent'
  payload: string
  byteLength: number
}
export interface ImportDataUriPolicy {
  fileBytes: number
  byteBudget(length: number, path: string): void
  error(reason: 'invalid' | 'unsupported' | 'budget', path: string, message: string): Error
}

// RFC 2396 urlchar, excluding '%' (handled as exactly two hex digits).
const URL_BYTE = /^[A-Za-z0-9\-_.!~*'();/?:@&=+$,]$/

function requireData(
  condition: unknown,
  path: string,
  message: string,
  policy: ImportDataUriPolicy,
): asserts condition {
  if (!condition) throw policy.error('invalid', path, message)
}
function percentByte(
  payload: string,
  offset: number,
  path: string,
  policy: ImportDataUriPolicy,
): number {
  const hex = payload.slice(offset + 1, offset + 3)
  requireData(
    /^[0-9a-f]{2}$/i.test(hex),
    path,
    'O recurso contém um octeto escapado inválido.',
    policy,
  )
  return Number.parseInt(hex, 16)
}

/** Inspect before decoded byte allocation. Caller bounds the enclosing URI text first. */
export function inspectImportDataPayload(
  payload: string,
  encoding: ImportDataUri['encoding'],
  path: string,
  policy: ImportDataUriPolicy,
): ImportDataUri {
  let byteLength = 0
  if (encoding === 'base64') {
    try {
      payload = decodeURIComponent(payload)
    } catch {
      throw policy.error('invalid', path, 'O recurso embutido contém caracteres inválidos.')
    }
    requireData(
      payload.length % 4 === 0 && /^[A-Za-z0-9+/]*={0,2}$/.test(payload),
      path,
      'O recurso embutido não contém base64 válido.',
      policy,
    )
    const padding = payload.endsWith('==') ? 2 : payload.endsWith('=') ? 1 : 0
    byteLength = (payload.length / 4) * 3 - padding
  } else {
    for (let i = 0; i < payload.length; i++) {
      if (payload[i] === '%') {
        percentByte(payload, i, path, policy)
        i += 2
      } else
        requireData(
          URL_BYTE.test(payload[i]!),
          path,
          'O recurso contém um octeto não escapado.',
          policy,
        )
      byteLength++
    }
  }
  policy.byteBudget(byteLength, path)
  return { encoding, payload, byteLength }
}

/** Only inspected metadata, after the caller's aggregate budget check. */
export function decodeImportDataUri(
  data: ImportDataUri,
  path: string,
  policy: ImportDataUriPolicy,
): Uint8Array {
  if (data.encoding === 'base64') {
    const bytes = base64ToBytes(data.payload)
    requireData(
      bytes !== null && bytes.byteLength === data.byteLength,
      path,
      'Não foi possível decodificar o recurso embutido.',
      policy,
    )
    return bytes
  }
  const bytes = new Uint8Array(data.byteLength)
  for (let i = 0, output = 0; i < data.payload.length; i++, output++) {
    if (data.payload[i] === '%') {
      bytes[output] = percentByte(data.payload, i, path, policy)
      i += 2
    } else bytes[output] = data.payload.charCodeAt(i)
  }
  return bytes
}

/** Raster MIME only, not a content decoder. Parameters/additional media need explicit support. */
export function inspectRasterDataUri(uri: string, path: string, policy: ImportDataUriPolicy) {
  if (uri.length > policy.fileBytes)
    throw policy.error('budget', path, 'A imagem embutida é grande demais para abrir.')
  const prefix = /^data:(image\/(?:png|jpeg))(;base64)?,/i.exec(uri)
  if (!prefix)
    throw policy.error('unsupported', path, 'Este tipo de imagem embutida não é suportado.')
  return {
    mimeType: prefix[1]!.toLowerCase(),
    data: inspectImportDataPayload(
      uri.slice(prefix[0].length),
      prefix[2] ? 'base64' : 'percent',
      path,
      policy,
    ),
  }
}
