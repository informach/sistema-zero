import fs from 'node:fs'
import path from 'node:path'
import ts from 'typescript'

const validation = JSON.parse(
  fs.readFileSync(new URL('./validation-profile.json', import.meta.url), 'utf8'),
)

// A data-only compiler host. No project config, plugin, loader or npm script is executed.
const root = fs.realpathSync(process.cwd())
const dependencies = fs.realpathSync(new URL('./node_modules', import.meta.url))
const inside = (candidate, parent) => {
  const normalize = (value) =>
    process.platform === 'win32' ? path.resolve(value).toLowerCase() : path.resolve(value)
  const target = normalize(candidate),
    directory = normalize(parent)
  return target === directory || target.startsWith(directory + path.sep)
}
function allowed(file) {
  const absolute = path.resolve(file)
  if (!inside(absolute, root) && !inside(absolute, dependencies)) return false
  try {
    const real = fs.realpathSync(absolute)
    return inside(real, root) || inside(real, dependencies)
  } catch {
    return false
  }
}
const readFile = (file) => (allowed(file) ? ts.sys.readFile(file) : undefined)
const fileExists = (file) => allowed(file) && ts.sys.fileExists(file)
const directoryExists = (file) => allowed(file) && ts.sys.directoryExists(file)
const readDirectory = (directory, extensions, excludes, includes, depth) =>
  allowed(directory)
    ? ts.sys
        .readDirectory(directory, extensions, excludes, includes, Math.min(depth ?? 12, 12))
        .filter(allowed)
    : []
const configuration = fileExists(path.join(root, 'tsconfig.json'))
  ? 'tsconfig.json'
  : fileExists(path.join(root, 'jsconfig.json'))
    ? 'jsconfig.json'
    : null
const config = configuration
  ? ts.readConfigFile(path.join(root, configuration), readFile)
  : {
      config: {
        compilerOptions: {
          target: 'ES2022',
          module: 'ESNext',
          moduleResolution: 'Bundler',
          lib: ['ES2022', 'DOM', 'DOM.Iterable'],
          strict: true,
          allowJs: true,
          checkJs: false,
          skipLibCheck: true,
          types: ['vite/client'],
        },
        include: ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx'],
        exclude: ['node_modules', 'dist', 'vite.config.*'],
      },
    }
const parsed = ts.parseJsonConfigFileContent(
  config.config ?? {},
  {
    useCaseSensitiveFileNames: ts.sys.useCaseSensitiveFileNames,
    readDirectory,
    fileExists,
    readFile,
  },
  root,
  { noEmit: true, noCheck: false, incremental: false, composite: false },
  configuration ? path.join(root, configuration) : undefined,
)
// An HTML/CSS-only project has no source program; an explicit config selecting nothing is still an error.
const diagnostics = [
  ...(config.error ? [config.error] : []),
  ...parsed.errors.filter(
    (item) => configuration || parsed.fileNames.length || item.code !== 18003,
  ),
]
const error = (message, node) => ({
  category: ts.DiagnosticCategory.Error,
  code: 63000,
  file: node?.getSourceFile(),
  start: node?.getStart(),
  length: node?.getWidth(),
  messageText: message,
})
if (parsed.projectReferences?.length)
  diagnostics.push(
    error('Referências a outros projetos não são suportadas pelo verificador remoto.'),
  )
if (
  parsed.fileNames.length > 80 ||
  parsed.fileNames.some((file) => !inside(path.resolve(file), root) || !allowed(file))
)
  diagnostics.push(error('O tsconfig inclui arquivos fora dos limites da revisão.'))
if (parsed.options.plugins?.length)
  diagnostics.push(error('Plugins TypeScript precisam ser executados no terminal local.'))
const pkg = JSON.parse(readFile(path.join(root, 'package.json')) ?? '{}')
const declared = new Set([
  ...Object.keys(pkg.dependencies ?? {}),
  ...Object.keys(pkg.devDependencies ?? {}),
])
const host = ts.createCompilerHost(parsed.options)
host.readFile = readFile
host.fileExists = fileExists
host.directoryExists = directoryExists
host.readDirectory = readDirectory
host.getDirectories = (directory) =>
  allowed(directory)
    ? ts.sys.getDirectories(directory).filter((part) => allowed(path.join(directory, part)))
    : []
host.realpath = (file) => (allowed(file) ? fs.realpathSync(file) : file)
host.writeFile = () => {
  throw new Error('O verificador não emite arquivos.')
}
// createCompilerHost's default getSourceFile captures the original system reader. Replace it too.
host.getSourceFile = (file, languageVersion, onError) => {
  const text = readFile(file)
  if (text === undefined) {
    onError?.(`Arquivo indisponível: ${file}`)
    return undefined
  }
  return ts.createSourceFile(file, text, languageVersion, true)
}
if (!diagnostics.length) {
  const program = ts.createProgram(parsed.fileNames, parsed.options, host)
  for (const source of program.getSourceFiles()) {
    if (
      source.isDeclarationFile ||
      !inside(source.fileName, root) ||
      source.fileName.includes('/node_modules/')
    )
      continue
    const visit = (node) => {
      const specifier =
        ts.isImportDeclaration(node) || ts.isExportDeclaration(node)
          ? node.moduleSpecifier
          : ts.isCallExpression(node) &&
              (node.expression.kind === ts.SyntaxKind.ImportKeyword ||
                (ts.isIdentifier(node.expression) && node.expression.text === 'require'))
            ? node.arguments[0]
            : undefined
      if (specifier && ts.isStringLiteral(specifier)) {
        const name = specifier.text
        if (!name.startsWith('.') && !name.startsWith('/')) {
          const packageName = name.startsWith('@')
            ? name.split('/').slice(0, 2).join('/')
            : name.split('/')[0]
          const mapped = Object.keys(parsed.options.paths ?? {}).some((pattern) => {
            const [prefix, suffix] = pattern.split('*')
            return pattern.includes('*')
              ? name.startsWith(prefix) && name.endsWith(suffix)
              : name === pattern
          })
          if (!mapped && !declared.has(packageName))
            diagnostics.push(
              error(
                `A biblioteca ${packageName} não está declarada no package.json. Instale-a pelo terminal.`,
                specifier,
              ),
            )
        }
      }
      ts.forEachChild(node, visit)
    }
    visit(source)
  }
  diagnostics.push(...ts.getPreEmitDiagnostics(program))
}
const failures = diagnostics.filter((item) => item.category === ts.DiagnosticCategory.Error)
if (failures.length) {
  console.error(
    ts
      .formatDiagnostics(failures.slice(0, 80), {
        getCanonicalFileName: (file) => path.relative(root, file),
        getCurrentDirectory: () => root,
        getNewLine: () => '\n',
      })
      .slice(0, 16000),
  )
  process.exitCode = 1
} else {
  fs.writeFileSync(
    path.join(root, 'typecheck-result.json'),
    JSON.stringify({
      status: 'passed',
      files: parsed.fileNames.length,
      typescript: ts.version,
      checkJs: parsed.options.checkJs === true,
      validation,
    }),
  )
}
