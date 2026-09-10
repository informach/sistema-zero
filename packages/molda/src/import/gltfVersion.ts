import { GltfInputError, gltfRecord, requireGltf } from './gltfInput'

type Version = readonly [major: string, minor: string]

function version(value: unknown, path: string): Version {
  requireGltf(
    typeof value === 'string' && /^[0-9]+\.[0-9]+$/.test(value),
    path,
    'A versão precisa ter dois números separados por ponto.',
  )
  const [major, minor] = value.split('.')
  // No Number conversion: arbitrarily large version digits must not round or overflow.
  return [major!.replace(/^0+(?=\d)/, ''), minor!.replace(/^0+(?=\d)/, '')]
}

function compare(a: Version, b: Version): number {
  for (const i of [0, 1] as const) {
    if (a[i].length !== b[i].length) return a[i].length - b[i].length
    if (a[i] !== b[i]) return a[i] < b[i] ? -1 : 1
  }
  return 0
}

/** glTF 2.0 §3.2: minVersion, when present, determines client compatibility. */
export function checkGltfVersion(json: Record<string, unknown>): void {
  const asset = gltfRecord(json.asset, 'asset')
  const declared = version(asset.version, 'asset.version')
  const minimum =
    asset.minVersion === undefined ? null : version(asset.minVersion, 'asset.minVersion')
  if (minimum)
    requireGltf(
      compare(minimum, declared) <= 0,
      'asset.minVersion',
      'A versão mínima não pode ser maior que a versão do arquivo.',
    )
  if (minimum ? minimum[0] !== '2' || minimum[1] !== '0' : declared[0] !== '2')
    throw new GltfInputError(
      'unsupported',
      minimum ? 'asset.minVersion' : 'asset.version',
      'Este arquivo precisa de uma versão do glTF que o Molda ainda não lê.',
    )
}
