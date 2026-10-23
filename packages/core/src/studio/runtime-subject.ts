import { z } from 'zod'
import { studioSourceAtPath } from './code-anchor'
import { StudioProjectCapabilityInputSchema } from './project-capabilities'
import { type StudioProjectDocument, StudioProjectIdSchema } from './project-document'
import {
  StudioProjectKindSchema,
  StudioProjectModeSchema,
  StudioPythonProjectConfigSchema,
  StudioRuntimeSelectionSchema,
  studioModesForKind,
} from './project-environment'
import { isStudioDocumentTemplateId } from './project-format'

const common = {
  formatVersion: z.literal(3),
  id: StudioProjectIdSchema,
  kind: StudioProjectKindSchema,
  mode: StudioProjectModeSchema,
  runtime: StudioRuntimeSelectionSchema,
  installedExtensions: StudioProjectCapabilityInputSchema.shape.installedExtensions,
  proMeta: z.strictObject({ templateId: z.string().refine(isStudioDocumentTemplateId) }).optional(),
}

/** Only authority-relevant metadata. Never an upload, semantic document check or source attestation. */
export const StudioRuntimeSubjectSchema = z
  .discriminatedUnion('programmingLanguage', [
    z.strictObject({ ...common, programmingLanguage: z.literal('javascript') }),
    z.strictObject({
      ...common,
      programmingLanguage: z.literal('python'),
      python: StudioPythonProjectConfigSchema,
      requirements: z.string().max(1_500_000),
    }),
  ])
  .superRefine((subject, context) => {
    if ((subject.kind === 'pro') !== Boolean(subject.proMeta))
      context.addIssue({
        code: 'custom',
        path: ['proMeta'],
        message: 'O modelo precisa corresponder ao tipo do projeto.',
      })
    if (!studioModesForKind(subject.kind).includes(subject.mode))
      context.addIssue({
        code: 'custom',
        path: ['mode'],
        message: 'O modo precisa corresponder ao tipo do projeto.',
      })
    if (
      new Set(subject.installedExtensions.map((extension) => extension.id)).size !==
      subject.installedExtensions.length
    )
      context.addIssue({
        code: 'custom',
        path: ['installedExtensions'],
        message: 'Há extensões repetidas.',
      })
  })
export type StudioRuntimeSubject = z.infer<typeof StudioRuntimeSubjectSchema>

/** Call on a document already validated by its editor/reader. Does not read any visual cache/media. */
export function studioRuntimeSubject(project: StudioProjectDocument): StudioRuntimeSubject {
  return StudioRuntimeSubjectSchema.parse({
    formatVersion: 3,
    id: project.id,
    programmingLanguage: project.programmingLanguage,
    kind: project.kind,
    mode: project.mode,
    runtime: project.runtime,
    installedExtensions: project.installedExtensions.map(({ id, version }) => ({ id, version })),
    ...(project.kind === 'pro' ? { proMeta: { templateId: project.proMeta.templateId } } : {}),
    ...(project.programmingLanguage === 'python'
      ? {
          python: project.python,
          requirements: studioSourceAtPath(project, 'requirements.txt') ?? '',
        }
      : {}),
  })
}
