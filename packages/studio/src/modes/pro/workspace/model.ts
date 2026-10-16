import type { ProjectTree } from '../../../core/proProject'

/** Presentation only. Never serialized into the game document or its export. */
export interface ProWorkspacePreferences {
  openFiles: string[]
  activeFile: string
  temporaryFile: string | null
  collapsed: string[]
  layout: 'split' | 'code' | 'game'
  sizes: number[]
  bottom: 'closed' | 'problems' | 'console' | 'terminal'
}

export function emptyWorkspace(): ProWorkspacePreferences {
  return {
    openFiles: [],
    activeFile: '',
    temporaryFile: null,
    collapsed: [],
    layout: 'split',
    sizes: [22, 43, 35],
    bottom: 'closed',
  }
}

export function initialWorkspace(tree: ProjectTree): ProWorkspacePreferences {
  const paths = Object.keys(tree).filter((path) => tree[path]?.kind === 'file')
  const path =
    ['src/main.tsx', 'src/main.ts', 'src/main.js', 'src/App.tsx', 'index.html'].find((candidate) =>
      paths.includes(candidate),
    ) ?? paths[0]
  return path ? openWorkspaceFile(emptyWorkspace(), path) : emptyWorkspace()
}

export function openWorkspaceFile(
  state: ProWorkspacePreferences,
  path: string,
  pinned = false,
): ProWorkspacePreferences {
  if (state.openFiles.includes(path))
    return {
      ...state,
      activeFile: path,
      temporaryFile: pinned && state.temporaryFile === path ? null : state.temporaryFile,
    }
  const openFiles = state.openFiles.filter((file) => pinned || file !== state.temporaryFile)
  return {
    ...state,
    openFiles: [...openFiles, path],
    activeFile: path,
    temporaryFile: pinned ? state.temporaryFile : path,
  }
}

export function pinWorkspaceFile(
  state: ProWorkspacePreferences,
  path: string,
): ProWorkspacePreferences {
  return state.temporaryFile === path ? { ...state, temporaryFile: null } : state
}

export function closeWorkspaceFile(
  state: ProWorkspacePreferences,
  path: string,
): ProWorkspacePreferences {
  const index = state.openFiles.indexOf(path)
  const openFiles = state.openFiles.filter((file) => file !== path)
  return {
    ...state,
    openFiles,
    activeFile:
      state.activeFile === path
        ? (openFiles[index] ?? openFiles[index - 1] ?? '')
        : state.activeFile,
    temporaryFile: state.temporaryFile === path ? null : state.temporaryFile,
  }
}

export function reconcileWorkspace(
  state: ProWorkspacePreferences,
  tree: ProjectTree,
): ProWorkspacePreferences {
  let next = state
  for (const path of state.openFiles)
    if (tree[path]?.kind !== 'file') next = closeWorkspaceFile(next, path)
  const collapsed = next.collapsed.filter((path) => tree[path]?.kind === 'dir')
  if (collapsed.length !== next.collapsed.length) next = { ...next, collapsed }
  return next
}

export function remapWorkspace(
  state: ProWorkspacePreferences,
  paths: Readonly<Record<string, string>>,
): ProWorkspacePreferences {
  const remap = (path: string) => paths[path] ?? path
  return {
    ...state,
    openFiles: [...new Set(state.openFiles.map(remap))],
    activeFile: remap(state.activeFile),
    temporaryFile: state.temporaryFile ? remap(state.temporaryFile) : null,
    collapsed: [...new Set(state.collapsed.map(remap))],
  }
}

function paths(value: unknown): value is string[] {
  return (
    Array.isArray(value) &&
    value.length <= 512 &&
    value.every((path) => typeof path === 'string' && path.length <= 240)
  )
}

export function parseWorkspace(value: unknown, tree: ProjectTree): ProWorkspacePreferences | null {
  if (
    !value ||
    typeof value !== 'object' ||
    !('openFiles' in value) ||
    !paths(value.openFiles) ||
    !('activeFile' in value) ||
    typeof value.activeFile !== 'string' ||
    !('temporaryFile' in value) ||
    (value.temporaryFile !== null && typeof value.temporaryFile !== 'string') ||
    !('collapsed' in value) ||
    !paths(value.collapsed) ||
    !('layout' in value) ||
    !['split', 'code', 'game'].includes(String(value.layout)) ||
    !('sizes' in value) ||
    !Array.isArray(value.sizes) ||
    value.sizes.length !== 3 ||
    !value.sizes.every(
      (size) => typeof size === 'number' && Number.isFinite(size) && size >= 10 && size <= 80,
    )
  )
    return null
  const layout = value.layout === 'code' ? 'code' : value.layout === 'game' ? 'game' : 'split'
  const openFiles = [...new Set(value.openFiles)]
  const state = reconcileWorkspace(
    {
      openFiles,
      activeFile: openFiles.includes(value.activeFile) ? value.activeFile : (openFiles[0] ?? ''),
      temporaryFile:
        value.temporaryFile && openFiles.includes(value.temporaryFile) ? value.temporaryFile : null,
      collapsed: [...new Set(value.collapsed)],
      layout,
      sizes: value.sizes,
      bottom:
        'bottom' in value &&
        (value.bottom === 'problems' || value.bottom === 'console' || value.bottom === 'terminal')
          ? value.bottom
          : 'closed',
    },
    tree,
  )
  return state
}
