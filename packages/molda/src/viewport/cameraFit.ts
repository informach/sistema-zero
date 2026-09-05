function radians(degrees: number): number {
  return (degrees * Math.PI) / 180
}

/** Distância da câmera até uma esfera para que ela caiba no campo de visão. */
export function perspectiveFitDistance(
  radius: number,
  verticalFovDegrees: number,
  aspect: number,
): number {
  if (!(aspect > 0)) throw new RangeError('aspect precisa ser positivo')
  const verticalHalfFov = radians(verticalFovDegrees) / 2
  const horizontalHalfFov = Math.atan(Math.tan(verticalHalfFov) * aspect)
  return radius / Math.sin(Math.min(verticalHalfFov, horizontalHalfFov))
}
