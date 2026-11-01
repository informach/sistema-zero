// The isolated bundler needs the same browser process shim that Next supplies in the app.
import process from 'next/dist/compiled/process'

Object.defineProperty(globalThis, 'process', { value: process, configurable: true })
