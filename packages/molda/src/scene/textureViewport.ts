export interface TextureCamera {
  x: number
  y: number
  scale: number
}
export interface TextureFrame {
  width: number
  height: number
}

/** Camera units are source texels. Zoom changes the view, never the image or its UVs. */
export function fitTextureCamera(frame: TextureFrame, image: TextureFrame): TextureCamera {
  const scale = Math.max(
    0.01,
    Math.min(64, (frame.width - 112) / image.width, (frame.height - 112) / image.height),
  )
  return {
    x: (frame.width - image.width * scale) / 2,
    y: (frame.height - image.height * scale) / 2,
    scale,
  }
}

export function zoomTextureCamera(
  camera: TextureCamera,
  scale: number,
  anchor: { x: number; y: number },
): TextureCamera {
  const next = Math.max(0.01, Math.min(64, scale))
  return {
    x: anchor.x - ((anchor.x - camera.x) * next) / camera.scale,
    y: anchor.y - ((anchor.y - camera.y) * next) / camera.scale,
    scale: next,
  }
}

/** Integer texel sizes at close range keep pixel art sharp; fit may use a fractional scale. */
export function textureZoomStep(scale: number, direction: number) {
  return scale >= 1
    ? direction > 0
      ? Math.floor(scale) + 1
      : Math.max(0.5, Math.ceil(scale) - 1)
    : direction > 0
      ? Math.min(1, scale * 1.5)
      : scale / 1.5
}
