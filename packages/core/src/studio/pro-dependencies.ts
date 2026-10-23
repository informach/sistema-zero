/** Packages installed in the isolated, network-free build image. Versions are exact. */
export const STUDIO_PRO_REMOTE_PACKAGES = {
  vite: '8.1.6',
  typescript: '5.9.3',
  '@vitejs/plugin-react': '6.0.2',
  react: '19.2.0',
  'react-dom': '19.2.0',
  '@types/react': '19.2.15',
  '@types/react-dom': '19.2.3',
  three: '0.180.0',
  '@types/three': '0.180.0',
  phaser: '3.90.0',
} as const

export type StudioProRemotePackage = keyof typeof STUDIO_PRO_REMOTE_PACKAGES
export interface StudioProRemoteDependencies {
  dependencies: Record<string, string>
  devDependencies: Record<string, string>
}

function object(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null
}

/** Never execute manifest scripts or resolve URLs. npm lock decides an installed range. */
export function resolveStudioProRemoteDependencies(
  packageJson: string,
  packageLock?: string,
): StudioProRemoteDependencies {
  let manifest: Record<string, unknown> | null
  let lock: Record<string, unknown> | null = null
  try {
    manifest = object(JSON.parse(packageJson))
    if (packageLock !== undefined) lock = object(JSON.parse(packageLock))
  } catch {
    throw new Error('O package.json ou package-lock.json não é um JSON válido.')
  }
  if (!manifest || (packageLock !== undefined && !lock))
    throw new Error('O manifesto de dependências é inválido.')
  if (
    manifest.workspaces ||
    manifest.overrides ||
    manifest.resolutions ||
    manifest.optionalDependencies
  )
    throw new Error(
      'O compilador remoto ainda não aceita workspaces, overrides ou dependências opcionais. Use o terminal local para este projeto.',
    )
  const packages = object(lock?.packages)
  const root = object(packages?.[''])
  if (lock && (!packages || !root || ![2, 3].includes(Number(lock.lockfileVersion))))
    throw new Error('O compilador remoto precisa de um package-lock.json npm v2 ou v3 completo.')
  const result: StudioProRemoteDependencies = { dependencies: {}, devDependencies: {} }
  for (const field of ['dependencies', 'devDependencies'] as const) {
    const entries = manifest[field] === undefined ? {} : object(manifest[field])
    if (!entries) throw new Error(`O campo ${field} do package.json é inválido.`)
    for (const [name, range] of Object.entries(entries)) {
      if (!Object.hasOwn(STUDIO_PRO_REMOTE_PACKAGES, name))
        throw new Error(
          `A biblioteca ${name} ainda não está disponível no compilador remoto. Execute este projeto pelo terminal local.`,
        )
      const version = STUDIO_PRO_REMOTE_PACKAGES[name as StudioProRemotePackage]
      if (typeof range !== 'string') throw new Error(`A versão de ${name} é inválida.`)
      const locked = object(packages?.[`node_modules/${name}`])
      // Exact versions are usable before the first install. Ranges require a matching
      // lock and root specifier, so an interrupted npm install cannot look complete.
      if (
        range !== version &&
        (!lock ||
          object(root?.[field])?.[name] !== range ||
          !new RegExp(`^[~^]${version.replaceAll('.', '\\.')}$`).test(range))
      )
        throw new Error(
          `O compilador remoto usa ${name}@${version}. Instale essa versão pelo terminal e aguarde a conclusão.`,
        )
      if (
        lock &&
        (!locked ||
          locked.version !== version ||
          locked.link ||
          object(root?.[field])?.[name] !== range)
      )
        throw new Error(
          `O lock de ${name} não corresponde à versão ${version} do compilador remoto. Conclua a instalação antes de compilar.`,
        )
      result[field][name] = version
    }
  }
  if (manifest.peerDependencies && Object.keys(object(manifest.peerDependencies) ?? {}).length)
    throw new Error(
      'Declare as bibliotecas do aplicativo em dependencies para compilar remotamente.',
    )
  return result
}
