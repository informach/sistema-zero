import data from './result-copy.json'

interface GoalCopy {
  practice: string
  school: string
  home: string
  continued: string
}
interface SceneCopy {
  returns: Record<string, string>
  options: string[][]
  narrative: string
}
export const RESULT_COPY = data as unknown as {
  skills: Record<string, { name: string; headline: string }>
  sceneSkills: Record<string, string>
  goalsByAge: Record<string, Record<string, GoalCopy>>
  implications: Record<string, Record<string, SceneCopy>>
  reach: Record<string, Record<string, SceneCopy>>
}
