import type { ZappyKnowledgeSourceType } from '../ports/zappy-knowledge-repository.port'
export interface PreparedCourseKnowledge {
  sourceHash: string
  sources: { sourceRef: string; sourceType: ZappyKnowledgeSourceType; content: string }[]
}
