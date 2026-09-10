import {
  BBMODEL_INPUT_LIMITS,
  BbmodelInputError,
  bbmodelRecord,
  requireBbmodel,
} from './bbmodelInput'
import { readImportJson } from './importJson'

export type BbmodelVersion = '4.9' | '4.10' | '5.0'

export interface BbmodelEnvelope {
  format: 'bbmodel'
  version: BbmodelVersion
  /** Declared format id, NOT an approval of Minecraft/plugin-specific capabilities. */
  modelFormat: string
  /** Owned JSON, not a validated model. Paths, scripts and expressions are inert data. */
  json: Record<string, unknown>
}

const policy = {
  jsonDepth: BBMODEL_INPUT_LIMITS.jsonDepth,
  jsonStructure: BBMODEL_INPUT_LIMITS.jsonStructure,
  error: (reason: 'invalid' | 'budget', path: string, message: string) =>
    new BbmodelInputError(reason, path, message),
}

function hasCompressedSignature(bytes: Uint8Array): boolean {
  let start = bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf ? 3 : 0
  while (
    bytes[start] === 0x20 ||
    bytes[start] === 0x09 ||
    bytes[start] === 0x0a ||
    bytes[start] === 0x0d
  )
    start++
  return (
    bytes[start] === 0x3c &&
    bytes[start + 1] === 0x6c &&
    bytes[start + 2] === 0x7a &&
    bytes[start + 3] === 0x3e
  )
}

/** JSON bbmodel only. Never invokes Blockbench, plugins, Molang, file IO or image decoding. */
export function readBbmodelEnvelope(bytes: Uint8Array): BbmodelEnvelope {
  if (bytes.byteLength > BBMODEL_INPUT_LIMITS.fileBytes)
    throw new BbmodelInputError(
      'budget',
      'file',
      'O arquivo ultrapassa o limite de 32 MiB do Molda.',
    )
  if (!(bytes.buffer instanceof ArrayBuffer))
    throw new BbmodelInputError(
      'unsupported',
      'file',
      'A leitura precisa de um arquivo sem memória compartilhada.',
    )
  requireBbmodel(bytes.byteLength > 0, 'file', 'O arquivo está vazio.')
  if (hasCompressedSignature(bytes))
    throw new BbmodelInputError(
      'unsupported',
      'file',
      'Este bbmodel está compactado. Salve uma cópia em JSON no Blockbench para importar.',
    )
  const json = bbmodelRecord(readImportJson(bytes, policy), 'json')
  const meta = bbmodelRecord(json.meta, 'meta')
  const version = meta.format_version
  requireBbmodel(
    typeof version === 'string' && /^[0-9]+\.[0-9]+(?:\.[0-9]+)?(?![\s\S])/.test(version),
    'meta.format_version',
    'O arquivo precisa declarar uma versão válida de bbmodel.',
  )
  // Explicit format revisions; never compare 4.9/4.10 as decimals or infer compatibility.
  if (version !== '4.9' && version !== '4.10' && version !== '5.0')
    throw new BbmodelInputError(
      'unsupported',
      'meta.format_version',
      'Esta versão de bbmodel ainda não é suportada. As versões previstas são 4.9, 4.10 e 5.0.',
    )
  const modelFormat = meta.model_format
  requireBbmodel(
    typeof modelFormat === 'string' && modelFormat.length > 0,
    'meta.model_format',
    'O arquivo precisa identificar o formato do projeto Blockbench.',
  )
  if (modelFormat.length > BBMODEL_INPUT_LIMITS.formatNameChars)
    throw new BbmodelInputError(
      'budget',
      'meta.model_format',
      'O identificador de formato é longo demais para abrir no Molda.',
    )
  return { format: 'bbmodel', version, modelFormat, json }
}
