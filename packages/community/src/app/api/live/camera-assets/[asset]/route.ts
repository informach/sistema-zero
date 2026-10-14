import { serveLiveCameraAsset } from '@sistemazero/member-shell/server/live-camera-assets'

// Os fundos da câmera da sala (desfoque e imagens), servidos da própria origem.
export async function GET(_request: Request, context: { params: Promise<{ asset: string }> }) {
  return serveLiveCameraAsset((await context.params).asset)
}
