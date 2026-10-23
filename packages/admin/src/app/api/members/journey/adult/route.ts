import { getAdultJourneyPolicy, saveAdultJourneyPolicy } from '@/server/adult-journey'
import { forwardUpstream } from '@/server/forward'
export async function GET() {
  return forwardUpstream(await getAdultJourneyPolicy())
}
export async function PUT(request: Request) {
  return forwardUpstream(await saveAdultJourneyPolicy(await request.json().catch(() => null)))
}
