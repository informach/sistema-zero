/** Encodes fresh UTF-8 bytes and proves their backing buffer is not shared. */
export function encodeOwnedUtf8(text: string): Uint8Array<ArrayBuffer> {
  const encoded = new TextEncoder().encode(text)
  const buffer = encoded.buffer
  if (!(buffer instanceof ArrayBuffer))
    throw new TypeError('O codificador UTF-8 não retornou um ArrayBuffer próprio.')
  // A view only: preserve the encoder's backing bytes, offset and length without copying.
  return new Uint8Array(buffer, encoded.byteOffset, encoded.byteLength)
}
