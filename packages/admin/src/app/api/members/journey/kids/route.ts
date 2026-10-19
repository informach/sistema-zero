import { getKidsJourneyPolicy } from '@/server/kids-journey'
import { forwardKidsJourney } from '@/server/kids-journey-response'

export async function GET() {
  return forwardKidsJourney(await getKidsJourneyPolicy())
}
