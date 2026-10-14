import { FilesetResolver, ImageSegmenter } from '@mediapipe/tasks-vision'
import type { LiveCameraEffect } from './media-camera-effects'

type WorkerMessage =
  | { type: 'init'; effect: LiveCameraEffect; assetBase: string }
  | { type: 'frame'; bitmap: ImageBitmap; timestamp: number }

let segmenter: ImageSegmenter | null = null
let effect: LiveCameraEffect = 'blur'
const output = new OffscreenCanvas(640, 360)
const outputContext = output.getContext('2d')!
const foreground = new OffscreenCanvas(640, 360)
const foregroundContext = foreground.getContext('2d')!
const maskCanvas = new OffscreenCanvas(256, 144)
const maskContext = maskCanvas.getContext('2d')!

function usesModuleLoader(): boolean {
  // Turbopack can emit a classic worker even when the source requests type: 'module'.
  // An empty importScripts performs no I/O; module workers reject it with TypeError.
  try {
    ;(self as typeof self & { importScripts: (...urls: string[]) => void }).importScripts()
    return false
  } catch (error) {
    if (error instanceof TypeError) return true
    throw error
  }
}

function background(frame: ImageBitmap) {
  outputContext.globalCompositeOperation = 'source-over'
  if (effect === 'blur') {
    outputContext.filter = 'blur(16px)'
    outputContext.drawImage(frame, -32, -18, 704, 396)
    outputContext.filter = 'none'
  } else {
    const gradient = outputContext.createLinearGradient(0, 0, 640, 360)
    gradient.addColorStop(0, effect === 'space' ? '#312e81' : '#0f766e')
    gradient.addColorStop(1, effect === 'space' ? '#0f172a' : '#075985')
    outputContext.fillStyle = gradient
    outputContext.fillRect(0, 0, 640, 360)
    outputContext.fillStyle = effect === 'space' ? '#fde68a' : '#5eead4'
    for (let i = 0; i < 20; i++) {
      const x = (i * 137 + 42) % 640,
        y = (i * 79 + 24) % 360
      outputContext.beginPath()
      outputContext.arc(x, y, effect === 'space' ? 2 : 10, 0, Math.PI * 2)
      outputContext.fill()
    }
  }
}

self.addEventListener('message', async (event: MessageEvent<WorkerMessage>) => {
  const message = event.data
  try {
    if (message.type === 'init') {
      effect = message.effect
      const files = await FilesetResolver.forVisionTasks(
        message.assetBase.replace(/\/$/, ''),
        usesModuleLoader(),
      )
      segmenter = await ImageSegmenter.createFromOptions(files, {
        baseOptions: {
          modelAssetPath: `${message.assetBase}selfie_segmenter_landscape.tflite`,
          delegate: 'CPU',
        },
        runningMode: 'VIDEO',
        outputCategoryMask: false,
        outputConfidenceMasks: true,
        canvas: new OffscreenCanvas(256, 144),
      })
      self.postMessage({ type: 'ready' })
      return
    }
    if (!segmenter) throw new Error('Camera effect not ready')
    const result = segmenter.segmentForVideo(message.bitmap, message.timestamp)
    try {
      // This pinned model returns one foreground-confidence plane. Some wrappers expose both.
      const masks = result.confidenceMasks
      const person = masks?.length === 1 ? masks[0] : masks?.length === 2 ? masks[1] : null
      if (!person) throw new Error('Unexpected segmentation output')
      const confidence = person.getAsFloat32Array()
      if (maskCanvas.width !== person.width || maskCanvas.height !== person.height) {
        maskCanvas.width = person.width
        maskCanvas.height = person.height
      }
      const pixels = maskContext.createImageData(person.width, person.height)
      for (let i = 0; i < confidence.length; i++) {
        pixels.data[i * 4] = 255
        pixels.data[i * 4 + 1] = 255
        pixels.data[i * 4 + 2] = 255
        pixels.data[i * 4 + 3] = Math.round(
          Math.max(0, Math.min(1, (confidence[i]! - 0.35) / 0.3)) * 255,
        )
      }
      maskContext.putImageData(pixels, 0, 0)
      foregroundContext.globalCompositeOperation = 'source-over'
      foregroundContext.clearRect(0, 0, 640, 360)
      foregroundContext.drawImage(message.bitmap, 0, 0, 640, 360)
      foregroundContext.globalCompositeOperation = 'destination-in'
      foregroundContext.drawImage(maskCanvas, 0, 0, 640, 360)
      background(message.bitmap)
      outputContext.drawImage(foreground, 0, 0)
      const bitmap = output.transferToImageBitmap()
      self.postMessage({ type: 'frame', bitmap }, { transfer: [bitmap] })
    } finally {
      result.close()
      message.bitmap.close()
    }
  } catch {
    if (message.type === 'frame') message.bitmap.close()
    segmenter?.close()
    segmenter = null
    self.postMessage({ type: 'error' })
  }
})
