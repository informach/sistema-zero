# MediaPipe Selfie Segmenter

`selfie_segmenter_landscape.tflite` is the unmodified Google MediaPipe Selfie
Segmenter landscape float16 model, version 1, distributed under Apache License 2.0.

- Source: https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_segmenter_landscape/float16/1/selfie_segmenter_landscape.tflite
- Model card and license: https://storage.googleapis.com/mediapipe-assets/Model%20Card%20MediaPipe%20Selfie%20Segmentation.pdf
- SHA-256: `490e9ea734313e0de10fa0cd9e3c6133e36ea4db2b7a49bde9ef019f72796b8e`
- Runtime: `@mediapipe/tasks-vision` 1.1.0 (Apache-2.0), pinned in package.json/bun.lock.

The runtime, WebAssembly and model are served from the same application origin.
Images are processed locally in a worker; camera frames are never sent to Google.
The model is for visual background effects only, not identity or attention analysis.
Segmentation is imperfect and may include other people in the background. Effects
are optional and the camera closes on processing failure instead of exposing raw video.
