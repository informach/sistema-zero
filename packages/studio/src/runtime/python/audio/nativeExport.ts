import { canonicalJson, sha256Hex } from '@sistemazero/core/creations'
import { studioPortableFileConflict } from '@sistemazero/core/studio/project-environment'
import {
  renderPythonProvidedModuleReference,
  renderPythonProvidedModuleStub,
} from '@sistemazero/core/studio/python-provided-modules-render'
import { SZ_AUDIO_MODULE_DESCRIPTOR } from '@sistemazero/core/studio/python-provided-modules-sz-audio'
import { PYTHON_AUDIO_NATIVE_SOURCES } from './nativeSources.generated'

const { native, version, importName } = SZ_AUDIO_MODULE_DESCRIPTOR
const dependencies = native.dependencies

/** A separately installable package avoids changing import roots or author dependency files. */
export async function buildPythonAudioNativeBundle(input: {
  files: readonly string[]
  directories: readonly string[]
}) {
  let root = ''
  const sources = {
    ...Object.fromEntries(
      Object.entries(PYTHON_AUDIO_NATIVE_SOURCES).map(([path, text]) => [`sz_audio/${path}`, text]),
    ),
    'sz_audio/_module.json': canonicalJson(SZ_AUDIO_MODULE_DESCRIPTOR),
    'sz_audio/__init__.pyi': renderPythonProvidedModuleStub(SZ_AUDIO_MODULE_DESCRIPTOR),
    'sz_audio/py.typed': '',
    'REFERENCIA.txt': `${renderPythonProvidedModuleReference(SZ_AUDIO_MODULE_DESCRIPTOR)}\n`,
  }
  for (let index = 1; ; index++) {
    const candidate = `.sistemazero${index === 1 ? '' : `-${index}`}/python-audio`
    const folded = candidate.toLowerCase()
    // An existing namespace is authored even when it is an empty directory.
    if (
      [...input.files, ...input.directories].some(
        (path) => path.toLowerCase() === folded || path.toLowerCase().startsWith(`${folded}/`),
      )
    )
      continue
    const paths = [...Object.keys(sources), 'pyproject.toml', 'install.txt'].map(
      (path) => `${candidate}/${path}`,
    )
    if (studioPortableFileConflict([...input.files, ...paths], input.directories)) continue
    root = candidate
    break
  }
  const files: Record<string, string> = Object.fromEntries(
    Object.entries(sources).map(([path, text]) => [`${root}/${path}`, text]),
  )
  files[`${root}/pyproject.toml`] = `[build-system]
requires = ["setuptools==${dependencies.setuptools}"]
build-backend = "setuptools.build_meta"

[project]
name = "${native.distribution}"
version = "${version}"
requires-python = "${native.requiresPython}"
dependencies = ["miniaudio==${dependencies.miniaudio}", "cffi==${dependencies.cffi}", "pycparser==${dependencies.pycparser}"]

[tool.setuptools]
packages = ["sz_audio"]

[tool.setuptools.package-data]
sz_audio = ["_module.json", "__init__.pyi", "py.typed"]
`
  const requirementsPath = `${root}/install.txt`
  files[requirementsPath] = `./${root}\n`
  const entries = []
  for (const path of Object.keys(files).sort()) {
    const text = files[path]!
    entries.push({
      path,
      bytes: new TextEncoder().encode(text).byteLength,
      sha256: await sha256Hex(text),
    })
  }
  return {
    files,
    manifest: {
      package: native.distribution,
      importName,
      version,
      requirementsPath,
      referencePath: `${root}/REFERENCIA.txt`,
      dependencies,
      files: entries,
      filesSha256: await sha256Hex(canonicalJson(entries)),
      desktopExecution: 'not-observed',
    },
  }
}
