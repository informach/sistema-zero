import { prepareKidsJourney } from '@/server/kids-journey'
import { postKidsJourney } from '@/server/kids-journey-response'

export async function POST(request: Request) {
  return postKidsJourney(request, prepareKidsJourney)
}
