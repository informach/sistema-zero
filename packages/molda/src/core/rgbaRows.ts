/** Reverse only an owned RGBA8 buffer. Uses one scratch row, preserving alpha and byte-view bounds. */
export function reverseRgbaRowsInPlace(pixels: Uint8Array, width: number, height: number): void {
  if (
    !(pixels instanceof Uint8Array) ||
    !Number.isSafeInteger(width) ||
    width < 1 ||
    !Number.isSafeInteger(height) ||
    height < 1 ||
    pixels.length !== width * height * 4
  )
    throw new RangeError('RGBA rows do not match their dimensions')
  if (height === 1) return
  const stride = width * 4
  const scratch = new Uint8Array(stride)
  for (let row = 0; row < Math.floor(height / 2); row++) {
    const first = row * stride,
      last = (height - 1 - row) * stride
    scratch.set(pixels.subarray(first, first + stride))
    pixels.copyWithin(first, last, last + stride)
    pixels.set(scratch, last)
  }
}
