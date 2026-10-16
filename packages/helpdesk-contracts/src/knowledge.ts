export const KNOWLEDGE_AUDIENCES = [
  'staff_only',
  'customer_adult',
  'customer_parent',
  'customer_all',
] as const
export type KnowledgeAudience = (typeof KNOWLEDGE_AUDIENCES)[number]
export const KNOWLEDGE_PRODUCTS = ['all', 'community', 'kids', 'studio'] as const
export type KnowledgeProduct = (typeof KNOWLEDGE_PRODUCTS)[number]
export const KNOWLEDGE_INDEX_STATES = ['pending', 'processing', 'ready', 'failed'] as const
export type KnowledgeIndexState = (typeof KNOWLEDGE_INDEX_STATES)[number]

export interface KnowledgeMetadata {
  audience: KnowledgeAudience
  product: KnowledgeProduct
  ownerName: string
  origin: string
  validUntil: string | null
}

export interface KnowledgeRevisionView extends KnowledgeMetadata {
  id: string
  articleId: string
  number: number
  title: string
  content: string
  contentHash: string
  indexState: KnowledgeIndexState
  indexError: string | null
  createdByName: string | null
  createdAt: string
}

/** Referências resolvidas pelo servidor, nunca links produzidos pelo LLM. */
export interface KnowledgeEvidence {
  chunkId: string
  articleId: string
  revisionId: string
  revisionNumber: number
  title: string
  section: string
  text: string
  audience: KnowledgeAudience
  product: KnowledgeProduct
}

export interface KnowledgeSearchInput {
  query: string
  audience: KnowledgeAudience
  product: KnowledgeProduct
  limit: number
}
