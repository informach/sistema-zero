import { isInteractiveBlock, type ProjectPlayActivity } from '@sistemazero/core/learning'
import type { Project } from '@sistemazero/studio/project'
import { prepareProjectForHost } from '@sistemazero/studio/project-validation'

export const PROJECT_PLAY_MAX_CHARS = 1_500_000
export const PROJECT_PLAY_TEXT = {
  title: 'Conheça o jogo',
  instructions: 'Experimente o jogo que você vai construir.',
  hints: [] as string[],
}

export function newProjectPlayActivity(): ProjectPlayActivity {
  return {
    type: 'project-play',
    completion: 'participation',
    project: {},
    stage: { width: 800, height: 480 },
    targets: [],
  }
}

export function validProjectPlayActivity(activity: ProjectPlayActivity): boolean {
  return isInteractiveBlock({
    kind: 'interactive',
    ...PROJECT_PLAY_TEXT,
    required: false,
    activity,
  })
}

/** Só devolve um substituto depois de validar. Quem chamou conserva o anterior em caso de erro. */
export async function prepareProjectPlaySnapshot(raw: unknown): Promise<Project> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw))
    throw new Error('Escolha um projeto exportado pelo Estúdio.')
  if ('kind' in raw && raw.kind === 'pro')
    throw new Error(
      'Projetos Pro ainda não são suportados neste bloco. Use um projeto clássico do Estúdio.',
    )
  if (JSON.stringify(raw).length > PROJECT_PLAY_MAX_CHARS)
    throw new Error('O projeto excede o limite de 1.500.000 caracteres, incluindo os recursos.')
  const project = await prepareProjectForHost(raw)
  if (!project || !validProjectPlayActivity({ ...newProjectPlayActivity(), project })) {
    throw new Error('O arquivo não contém um projeto clássico válido para este jogo.')
  }
  return project
}

export async function readProjectPlayFile(text: string): Promise<Project> {
  if (text.length > PROJECT_PLAY_MAX_CHARS)
    throw new Error('O arquivo excede o limite de 1.500.000 caracteres, incluindo os recursos.')
  let raw: unknown
  try {
    raw = JSON.parse(text)
  } catch {
    throw new Error('Não foi possível ler o JSON. Escolha um arquivo exportado pelo Estúdio.')
  }
  return prepareProjectPlaySnapshot(raw)
}
