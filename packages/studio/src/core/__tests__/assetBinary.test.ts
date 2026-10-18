import { expect, test } from 'bun:test'
import { decodeProjectAsset } from '../assetBinary'

test('base64 material decoding preserves every byte and browser validation rules', () => {
  for (const length of [0, 1, 2, 3, 255, 256, 257, 8191, 8192, 8193, 1_048_577]) {
    const source = Uint8Array.from({ length }, (_, index) => (index * 173 + 41) % 256)
    const base64 = Buffer.from(source).toString('base64')
    for (const raw of [base64, base64.replace(/=+$/, '')]) {
      const decoded = decodeProjectAsset(`data:IMAGE/PNG;base64,${raw}`)
      expect(decoded.mime).toBe('image/png')
      expect(decoded.bytes).toEqual(source)
    }
  }
  for (const raw of ['a', '%%%%', '😀', 'AA-_']) {
    expect(() => atob(raw)).toThrow()
    expect(() => decodeProjectAsset(`data:audio/wav;base64,${raw}`)).toThrow()
  }
  expect(
    decodeProjectAsset('data:image/svg+xml,%3Csvg%3E%C3%A7%F0%9F%90%A2%3C/svg%3E').bytes,
  ).toEqual(new TextEncoder().encode('<svg>ç🐢</svg>'))
})
