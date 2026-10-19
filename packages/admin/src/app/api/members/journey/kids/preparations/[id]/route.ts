import { getKidsJourneyPreparation } from '@/server/kids-journey'
import { forwardKidsJourney } from '@/server/kids-journey-response'

type Context = { params: Promise<{ id: string }> }

export async function GET(_request: Request, { params }: Context) {
  return forwardKidsJourney(await getKidsJourneyPreparation((await params).id))
}
