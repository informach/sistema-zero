import { publishLessonDraft } from '@/server/lesson-draft-publication'
export const maxDuration = 300
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return publishLessonDraft(request, (await params).id, 'publish')
}
