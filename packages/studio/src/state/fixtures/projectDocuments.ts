import { StudioProjectDocumentSchema } from '@sistemazero/core/studio/project-document'
import type {
  StudioProjectKind,
  StudioProjectLanguage,
} from '@sistemazero/core/studio/project-environment'

/** Structural fixtures only: these identities do not grant a runtime or executable capability. */
export function documentFixture(language: StudioProjectLanguage, kind: StudioProjectKind) {
  const runtime = {
    profileId: `${language}-test`,
    releaseId: 'test-1',
    manifestSha256: 'a'.repeat(64),
  }
  const common = {
    formatVersion: 3,
    id: `${language}-${kind}`,
    name: 'Meu jogo',
    createdAt: 10,
    updatedAt: 20,
    programmingLanguage: language,
    kind,
    mode: kind === 'pro' ? 'code' : 'bridge',
    runtime,
    installedExtensions: [],
    ir: null,
    blocksState: null,
    assets: [
      { id: 'hero', name: 'Hero', kind: 'image', dataUrl: 'data:image/png;base64,aGVybw==' },
    ],
    coverAssetName: 'Hero',
    projectTools: [],
  }
  const proMeta = {
    templateId: `${language}-blank`,
    origin: { projectId: 'original', revision: 2 },
    publication: { playId: '00000000-0000-0000-0000-000000000001' },
    assistance: {
      version: 1,
      briefing: 'Pegar estrelas',
      decisions: [{ id: '1', text: 'Pular', provenance: 'learner', confirmed: true }],
    },
  }
  if (language === 'javascript')
    return StudioProjectDocumentSchema.parse({
      ...common,
      files: { 'index.html': '<canvas></canvas>', 'style.css': 'body{}', 'script.js': 'let n = 1' },
      extraFiles: [{ name: 'helpers.ts', language: 'typescript', content: 'export const n = 2' }],
      ...(kind === 'pro'
        ? {
            tree: {
              src: { kind: 'dir' },
              'src/main.ts': { kind: 'file', content: 'console.log(42)' },
            },
            proMeta: { ...proMeta, devScript: 'dev' },
          }
        : {}),
    })
  const python = {
    entrypoint: kind === 'pro' ? 'src/main.py' : 'main.py',
    dependencyLock: {
      lockVersion: 1,
      target: 'browser',
      pythonVersion: '3.14.2',
      runtimeManifestSha256: runtime.manifestSha256,
      requirementsSha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      packages: [],
    },
  }
  return StudioProjectDocumentSchema.parse({
    ...common,
    python,
    ...(kind === 'pro'
      ? {
          tree: {
            src: { kind: 'dir' },
            'src/main.py': { kind: 'file', content: 'from helper import n\nprint(n)' },
            'src/helper.py': { kind: 'file', content: 'n = 42' },
            'requirements.txt': { kind: 'file', content: '' },
          },
          proMeta,
        }
      : {
          files: {
            'main.py': 'from helper import n\nprint(n)',
            'helper.py': 'n = 42',
            'requirements.txt': '',
          },
        }),
  })
}
