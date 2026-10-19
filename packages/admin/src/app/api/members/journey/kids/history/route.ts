import { getKidsJourneyHistory } from '@/server/kids-journey'
import { forwardKidsJourney } from '@/server/kids-journey-response'

export async function GET(request: Request) {
  return forwardKidsJourney(await getKidsJourneyHistory(new URL(request.url).searchParams))
}
