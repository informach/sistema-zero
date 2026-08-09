import {
  BEHAVIOR_AREAS,
  type BehaviorArea,
  PROJECT_AREAS,
  type ProjectAreaKind,
} from '../core/behaviorAreas'

export interface ProjectAreaDefinition {
  kind: ProjectAreaKind
  frame: string
}

/** Fonte única que liga cada área pedagógica ao seu frame Blockly. */
export const PROJECT_AREA_FRAMES = {
  structure: 'sz_frame_structure',
  appearance: 'sz_frame_appearance',
  molds: 'sz_frame_molds',
  start: 'sz_frame_start',
  events: 'sz_frame_events',
  loops: 'sz_frame_loops',
} as const satisfies Readonly<Record<ProjectAreaKind, string>>

export const PROJECT_AREA_DEFINITIONS: readonly ProjectAreaDefinition[] = PROJECT_AREAS.map(
  (kind) => ({ kind, frame: PROJECT_AREA_FRAMES[kind] }),
)

export const FRAME_STRUCTURE = PROJECT_AREA_FRAMES.structure
export const FRAME_APPEARANCE = PROJECT_AREA_FRAMES.appearance
export const FRAME_MOLDS = PROJECT_AREA_FRAMES.molds
export const FRAME_START = PROJECT_AREA_FRAMES.start
export const FRAME_EVENTS = PROJECT_AREA_FRAMES.events
export const FRAME_LOOPS = PROJECT_AREA_FRAMES.loops
export const FRAME_BEHAVIOR_LEGACY = 'sz_frame_behavior'

export const PROJECT_AREA_BY_FRAME: ReadonlyMap<string, ProjectAreaKind> = new Map(
  PROJECT_AREA_DEFINITIONS.map(({ kind, frame }) => [frame, kind]),
)

export const BEHAVIOR_AREA_BY_FRAME: ReadonlyMap<string, BehaviorArea> = new Map(
  BEHAVIOR_AREAS.map((area) => [PROJECT_AREA_FRAMES[area], area]),
)

export const PROJECT_AREA_FRAME_TYPES: ReadonlySet<string> = new Set(
  PROJECT_AREA_DEFINITIONS.map(({ frame }) => frame),
)
