import type { ExportFileMap } from './fileMap'

const object = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

/** Describe only commands declared by the exported project. This never runs package scripts. */
export function proSourceInstructions(files: ExportFileMap, preferredScript?: string) {
  const warnings: string[] = []
  let manifest: Record<string, unknown> = {}
  let manifestValid = false
  try {
    const raw: unknown = JSON.parse(
      typeof files['package.json'] === 'string' ? files['package.json'] : '',
    )
    if (!object(raw)) throw new Error('manifest')
    manifest = raw
    manifestValid = true
  } catch {
    warnings.push(
      'O package.json está ausente ou inválido. Confira esse arquivo antes de instalar e executar o projeto.',
    )
  }
  const scripts = object(manifest.scripts) ? manifest.scripts : {}
  const hasScript = (name: string) =>
    /^[a-zA-Z0-9][\w:.-]*$/.test(name) &&
    typeof scripts[name] === 'string' &&
    Boolean(scripts[name].trim())
  const dev = [preferredScript, 'dev', 'start'].find((name): name is string =>
    Boolean(name && hasScript(name)),
  )
  if (!dev)
    warnings.push(
      'Não foi encontrado um script de desenvolvimento. Consulte scripts no package.json para executar este projeto.',
    )
  if (!hasScript('build'))
    warnings.push(
      'Este projeto não declara o script build. O ZIP contém a fonte; a etapa de publicação precisa ser definida no projeto.',
    )
  const locks = [
    { manager: 'npm', paths: ['npm-shrinkwrap.json', 'package-lock.json'] },
    { manager: 'pnpm', paths: ['pnpm-lock.yaml'] },
    { manager: 'yarn', paths: ['yarn.lock'] },
    { manager: 'bun', paths: ['bun.lock', 'bun.lockb'] },
  ].filter((item) => item.paths.some((path) => path in files))
  const declared = typeof manifest.packageManager === 'string' ? manifest.packageManager : ''
  const parsed = /^(npm|pnpm|yarn|bun)@(\d+)(?:[.\w+-]*)$/.exec(declared)
  const manager =
    parsed?.[1] ?? (locks.length === 1 ? locks[0]?.manager : declared ? undefined : 'npm')
  const conflicting = locks.length > 1 || (locks.length === 1 && manager !== locks[0]?.manager)
  if (conflicting)
    warnings.push(
      'Há lockfiles de gerenciadores diferentes ou incompatíveis com packageManager. Escolha o gerenciador e corrija os lockfiles antes de instalar.',
    )
  if (declared && !parsed)
    warnings.push(
      'O campo packageManager não identifica um gerenciador e versão reconhecidos. Confira a documentação do projeto.',
    )
  const locked = locks.some((item) => item.manager === manager)
  let lockValid = true
  if (manager === 'npm' && locked) {
    const path = 'npm-shrinkwrap.json' in files ? 'npm-shrinkwrap.json' : 'package-lock.json'
    try {
      const raw: unknown = JSON.parse(typeof files[path] === 'string' ? files[path] : '')
      if (!object(raw)) throw new Error('lockfile')
    } catch {
      lockValid = false
      warnings.push(
        `O ${path} não contém JSON válido. Corrija o lockfile antes de instalar as dependências.`,
      )
    }
  }
  const commandsAvailable = manifestValid && manager && !conflicting && (!declared || parsed)
  let install: string | undefined
  if (commandsAvailable && lockValid) {
    if (manager === 'npm') install = locked ? 'npm ci' : 'npm install'
    else if (manager === 'yarn')
      install =
        locked && parsed
          ? Number(parsed[2]) >= 2
            ? 'yarn install --immutable'
            : 'yarn install --frozen-lockfile'
          : 'yarn install'
    else install = `${manager} install${locked ? ' --frozen-lockfile' : ''}`
  }
  const node =
    object(manifest.engines) && typeof manifest.engines.node === 'string'
      ? manifest.engines.node.slice(0, 200)
      : null
  const run = (name: string) => `${manager} run ${name}`
  const text = [
    'Seu projeto Pro do Sistema Zero',
    '================================',
    '',
    'Esta pasta contém o código-fonte e os materiais para continuar no VSCode ou em outro editor.',
    '',
    'Como abrir e testar:',
    '1. Abra ESTA pasta no VSCode (Arquivo > Abrir Pasta) e abra o terminal.',
    node
      ? `2. Use uma versão do Node.js compatível com engines.node: ${node}.`
      : '2. Confira a versão de Node.js exigida pelas dependências e pela documentação do projeto.',
    parsed
      ? `Gerenciador declarado: ${declared}. Use essa versão.`
      : manager
        ? `Gerenciador identificado: ${manager}.`
        : 'Confira qual gerenciador de pacotes este projeto utiliza.',
    install
      ? `3. Instale as dependências: ${install}`
      : '3. Corrija os avisos abaixo antes de escolher o comando de instalação.',
    dev && commandsAvailable
      ? `4. Inicie o projeto: ${run(dev)}`
      : '4. Consulte os scripts do package.json e o README para iniciar o projeto.',
    '5. Abra no navegador o endereço mostrado pelo terminal.',
    '',
    hasScript('build') && commandsAvailable
      ? `Para gerar a versão final: ${run('build')}. A pasta de saída depende da configuração do projeto.`
      : 'A configuração de publicação deve ser conferida no projeto.',
    hasScript('preview') && commandsAvailable ? `Para testar o build: ${run('preview')}.` : '',
    locked
      ? 'Mantenha o lockfile no projeto. Se a instalação indicar conflito, confira o manifesto e regenere o lockfile com o gerenciador correto; o download não valida uma instalação.'
      : 'Guarde o lockfile gerado pela primeira instalação para poder repetir as mesmas versões.',
    '',
    'Não execute a fonte abrindo index.html com dois cliques. TypeScript, imports e materiais dependem do servidor e dos scripts deste projeto.',
    'public/ contém materiais estáticos; studio-assets/manifest.json dentro dessa pasta relaciona IDs, caminhos e metadados. Caminhos de materiais personalizados são preservados.',
    'Leia README.md, CREDITS.md e ASSET-CREDITS.md, quando presentes, para controles e condições de uso dos materiais.',
    'Este ZIP leva a fonte e os materiais. Histórico de conversa, credenciais da plataforma e estado temporário do editor não são necessários para executá-lo.',
    ...(warnings.length
      ? ['', 'Avisos para conferir:', ...warnings.map((warning) => `- ${warning}`)]
      : []),
    '',
  ].join('\n')
  return { text, warnings }
}
