export const ANALYTICS_RETENTION_DAYS = 90
export const ANALYTICS_SESSION_MS = 30 * 60 * 1000
export const ANALYTICS_COOKIE_DAYS = 30
export const CONVERSION_DAYS = 7

export type AnalyticsEnvironment = 'production' | 'development'
export type AnalyticsEventName =
  | 'page_view'
  | 'section_view'
  | 'element_view'
  | 'click'
  | 'details_open'
  | 'image_zoom'
  | 'video_start'
  | 'video_progress'
  | 'quiz_question_view'
  | 'form_error'

export interface PageContext {
  id: string
  path: string
  kind: string
  funnel: string | null
  publicText: boolean
}

export interface QuizQuestionSnapshot {
  id: string
  title: string
  position: number
  type: string
  revision: string
  options: { value: string; label: string }[]
}
export interface QuizDefinition {
  id: string
  funnel: string
  version: string
  questions: QuizQuestionSnapshot[]
}

export interface BrowserAnalyticsEvent {
  id: string
  pageViewId: string
  name: AnalyticsEventName
  path: string
  revision: string
  at: string
  elementId?: string
  label?: string
  sectionId?: string
  destination?: string
  quizDefinitionId?: string
  quizAttemptId?: string
  questionId?: string
  position?: number
  progress?: number
  errorCode?: string
  viewport?: number
  x?: number
  y?: number
}

export interface AnalyticsBootstrap {
  sessionId: string
  expiresAt: string
}

export interface AnalyticsFilter {
  from: Date
  to: Date
  environment: AnalyticsEnvironment
  funnel?: string
  source?: string
  campaign?: string
  page?: string
  revision?: string
}
