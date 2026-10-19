import { advanceKidsJourneyPreparation } from '@/server/kids-journey'
import { forwardKidsJourney } from '@/server/kids-journey-response'

type Context = { params: Promise<{ id: string }> }

export async function POST(_request: Request, { params }: Context) {
  return forwardKidsJourney(await advanceKidsJourneyPreparation((await params).id))
}
