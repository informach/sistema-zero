import { canonicalJson, sha256Hex } from '@sistemazero/core/creations'
import { studioPortableFileConflict } from '@sistemazero/core/studio/project-environment'
import { SZ_AUDIO_MODULE_DESCRIPTOR } from '@sistemazero/core/studio/python-provided-modules-sz-audio'
import {
  createStudioRuntimeCatalog,
  type StudioRuntimeCatalog,
  type StudioRuntimeRelease,
  selectStudioRuntimeRelease,
} from '@sistemazero/core/studio/runtime-catalog'
import type { PythonAssetBundle } from '../core/pythonAssets'
import type { PythonProjectDocument } from '../core/pythonProject'
import { buildPythonAudioNativeBundle } from '../runtime/python/audio/nativeExport'
import type { ExportFileMap } from './fileMap'

/** This describes a preserved snapshot, not a native execution or dependency certificate. */
export async function buildPythonSourceMetadata(input: {
  project: PythonProjectDocument
  sourceFiles: Record<string, string>
  directories: string[]
  assets: PythonAssetBundle['manifest']
  occupiedFiles: string[]
  runtimeCatalog: StudioRuntimeCatalog | null
}): Promise<{ files: ExportFileMap; warnings: string[] }> {
  const { project, sourceFiles, assets } = input
  const directories = [...input.directories].sort()
  const occupied = [...input.occupiedFiles]
  const files: ExportFileMap = {}
  const warnings: string[] = []
  const available = (path: string) => !studioPortableFileConflict([...occupied, path], directories)
  const allocate = (candidate: (index: number) => string) => {
    for (let index = 1; ; index++) {
      const path = candidate(index)
      if (!available(path)) continue
      occupied.push(path)
      return path
    }
  }
  const instructionsPath = allocate(
    (index) => `LEIA-ME-Sistema-Zero${index === 1 ? '' : `-${index}`}.txt`,
  )
  const manifestPath = allocate(
    (index) => `.sistemazero${index === 1 ? '' : `-${index}`}/export-manifest.json`,
  )
  let release: StudioRuntimeRelease | null = null
  try {
    if (input.runtimeCatalog) {
      const catalog = await createStudioRuntimeCatalog(input.runtimeCatalog)
      const selected = selectStudioRuntimeRelease(catalog, project.runtime)
      if (selected?.manifest.python?.version === project.python.dependencyLock.pythonVersion)
        release = selected
    }
  } catch {
    // Rescuing authored files must remain possible without verified runtime metadata.
  }
  if (!release)
    warnings.push(
      'Nesta exportação, não foi possível conferir a release exata do projeto. Seus arquivos e materiais foram preservados, mas nenhuma biblioteca fornecida pelo estúdio foi anexada por suposição. Confira os imports e as dependências antes de executar no computador.',
    )
  const modules = release?.manifest.python?.providedModules ?? []
  const audioAvailable = modules.some(
    (module) => canonicalJson(module.descriptor) === canonicalJson(SZ_AUDIO_MODULE_DESCRIPTOR),
  )
  const nativeAudio = audioAvailable
    ? await buildPythonAudioNativeBundle({ files: occupied, directories })
    : null
  if (nativeAudio) {
    Object.assign(files, nativeAudio.files)
    occupied.push(...Object.keys(nativeAudio.files))
  }
  const runtimeModules = {
    status: release ? 'known-release' : 'unresolved-release',
    modules: modules.map(({ descriptor }) => {
      const included = canonicalJson(descriptor) === canonicalJson(SZ_AUDIO_MODULE_DESCRIPTOR)
      if (!included)
        warnings.push(
          `A implementação nativa de ${descriptor.importName} ${descriptor.version} desta release não está disponível nesta exportação. Sua fonte foi preservada; nenhuma versão diferente foi inserida.`,
        )
      return {
        importName: descriptor.importName,
        version: descriptor.version,
        nativePackage: included ? 'included' : 'unavailable',
      }
    }),
  }
  const version = project.python.dependencyLock.pythonVersion
  const [major, minor] = version.split('.').map(Number)
  const requirementsPath = Object.keys(sourceFiles).find(
    (path) => path.toLowerCase() === 'requirements.txt',
  )
  const requirements = requirementsPath ? sourceFiles[requirementsPath]! : ''
  const requirementsMatch =
    (await sha256Hex(requirements)) === project.python.dependencyLock.requirementsSha256
  const hasNativeDependencyReview =
    requirements.trim() !== '' ||
    !requirementsMatch ||
    project.python.dependencyLock.packages.length !== 0
  if (!available('pyproject.toml')) {
    warnings.push(
      'A configuração pyproject.toml do projeto foi preservada e não foi validada para o computador. Nenhum arquivo ou pasta existente foi sobrescrito.',
    )
  }
  if (hasNativeDependencyReview) {
    warnings.push(
      `Confira as dependências nativas antes de executar no computador. Os requisitos autorais foram preservados; o lock do navegador não resolve pacotes nativos.${nativeAudio ? ' A biblioteca portátil sz_audio tem uma instalação separada, descrita nas instruções.' : ''}`,
    )
  } else if (available('pyproject.toml')) {
    files['pyproject.toml'] = `[project]
name = "sistema-zero-project"
version = "0.0.0"
requires-python = ">=${version},<${major}.${minor! + 1}"
dependencies = []
`
    occupied.push('pyproject.toml')
  }
  // Tk anterior a 8.6 só abre GIF em PhotoImage/register_shape; os PNG do projeto
  // continuam os bytes originais, então o requisito precisa constar no pacote.
  const pngLimit = assets.assets.some((asset) => asset.mime === 'image/png')
    ? 'Imagens PNG usadas como forma ou fundo do Turtle exigem Tk 8.6 ou mais recente no computador; versões anteriores do Tk só abrem GIF.'
    : null
  const sourceEntries = []
  for (const path of Object.keys(sourceFiles).sort()) {
    const content = sourceFiles[path]!
    sourceEntries.push({
      path,
      bytes: new TextEncoder().encode(content).byteLength,
      sha256: await sha256Hex(content),
    })
  }
  const source = { files: sourceEntries, directories }
  const sourceSha256 = await sha256Hex(canonicalJson(source))
  const manifest = {
    formatVersion: 1,
    language: 'python',
    kind: project.kind,
    entrypoint: project.python.entrypoint,
    pythonReferenceVersion: version,
    runtime: project.runtime,
    installedExtensions: project.installedExtensions,
    browserDependencyLock: project.python.dependencyLock,
    source,
    sourceSha256,
    assets,
    runtimeModules,
    ...(nativeAudio ? { portableAudio: nativeAudio.manifest } : {}),
    desktopExecution: 'not-observed',
    portabilityAnalysis: 'not-performed',
    knownLimits: [
      'O runtime e o lock identificam o navegador; não são uma instalação ou resolução de pacotes nativos.',
      'A exportação preserva a fonte, mas não analisa todos os imports, caminhos, código dinâmico ou configurações autorais.',
      'Turtle nativo usa a biblioteca padrão e exige suporte gráfico Tk instalado no computador.',
      ...(pngLimit ? [pngLimit] : []),
    ],
    generatedFiles: [instructionsPath, manifestPath, ...Object.keys(files)].sort(),
    warnings,
  }
  files[manifestPath] = `${JSON.stringify(manifest, null, 2)}\n`
  files[instructionsPath] = `Seu projeto Python do Sistema Zero

1. Instale o Python ${version} e o VS Code no computador.
2. Abra esta pasta no VS Code. No terminal, mantenha esta pasta como diretório atual.
3. Crie um ambiente: python -m venv .venv
4. No Windows, use .venv\\Scripts\\python.exe nos comandos seguintes.
   No macOS ou Linux, use .venv/bin/python.
5. Se o projeto usa pacotes externos, confira as dependências nativas e os requisitos preservados antes de instalar:
   python -m pip install -r ${requirementsPath ?? 'requirements.txt'}
6. Execute: python ${project.python.entrypoint}

Nos passos 5 e 6, substitua python pelo caminho do ambiente do passo 4.

${
  nativeAudio
    ? `Se o programa usa import sz_audio, instale também a biblioteca portátil que acompanha este pacote:
python -m pip install -r ${nativeAudio.manifest.requirementsPath}
Execute esse comando na pasta principal da exportação, usando o Python do ambiente do passo 4.
Essa instalação atende inclusive programas cujo arquivo inicial está em uma subpasta.
Ela não altera seu requirements.txt nem instala o adaptador do navegador. Se você criou um módulo
próprio chamado sz_audio, o seu módulo mantém a precedência normal do Python.
Os comandos, limites e diferenças entre navegador e computador estão em ${nativeAudio.manifest.referencePath}.
play começa o som sem esperar seu fim e não mantém o processo Python aberto. Em um jogo Turtle,
mantenha o laço normal do programa com turtle.done() ou turtle.mainloop(). Encerrar o programa encerra o áudio.

`
    : ''
}Turtle faz parte da biblioteca padrão do Python. Não instale um pacote chamado turtle pelo pip.

Para projetos Turtle, teste o suporte gráfico com: python -m tkinter
Esse comando precisa abrir uma janela. Algumas instalações de Python no Linux exigem instalar o suporte a Tk separadamente.
${pngLimit ? `${pngLimit}\nPara conferir a versão do Tk: python -c "import tkinter; print(tkinter.TkVersion)"\n` : ''}
Seus arquivos e materiais foram preservados. O programa usa Python nativo no computador.
O adaptador gráfico do navegador não faz parte deste pacote.
${
  nativeAudio
    ? `O código da biblioteca portátil sz_audio acompanha a exportação em ${nativeAudio.manifest.requirementsPath.replace('/install.txt', '')}.
`
    : ''
}Versões de pacotes feitas para o navegador não são instaladas no computador: o pip seleciona as distribuições nativas compatíveis.
Se um pacote não oferecer suporte ao seu computador, consulte sua documentação antes de mudar o projeto.

Esta exportação não executou seu projeto no computador nem certifica sua portabilidade.
O manifesto ${manifestPath} identifica fontes, materiais, licenças, versões e limites deste pacote.
${warnings.length ? `\nAvisos para revisar:\n${warnings.map((warning) => `- ${warning}`).join('\n')}\n` : ''}`
  return { files, warnings }
}
