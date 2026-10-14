import { serveLiveCameraAsset } from '@sistemazero/member-shell/server/live-camera-assets'
export async function GET(_request: Request, context: { params: Promise<{ asset: string }> }) {
  return serveLiveCameraAsset((await context.params).asset)
}
