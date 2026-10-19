import { publishKidsJourneyPreparation } from '@/server/kids-journey'
import { postKidsJourney } from '@/server/kids-journey-response'

type Context = { params: Promise<{ id: string }> }

export async function POST(request: Request, { params }: Context) {
  const { id } = await params
  return postKidsJourney(request, (body) => publishKidsJourneyPreparation(id, body))
}
