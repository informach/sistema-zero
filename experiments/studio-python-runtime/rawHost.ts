import { createPythonBootResourceBroker } from '../../packages/studio/src/runtime/python/bootResourceBroker'
import { preparePythonBootResourceHost } from '../../packages/studio/src/runtime/python/bootResourceHost'

/** Raw worker QA transport only; production sessions and their authentication have separate tests. */
const config = await (await fetch('/configuration')).json()
const frame = document.createElement('iframe')
frame.sandbox.value = 'allow-scripts'
const owner = new AbortController()
let started = false
addEventListener('pagehide', () => owner.abort(), { once: true })
addEventListener('message', async (event) => {
  if (event.source !== frame.contentWindow || event.origin !== 'null' || event.data?.protocol !== 1)
    return
  if (event.data.type === 'python-probe-stopped') {
    owner.abort()
    return
  }
  if (started || event.data.type !== 'python-probe-boot-ready') return
  started = true
  let transferred: MessagePort | undefined
  try {
    const host = await preparePythonBootResourceHost({
      frameURL: new URL(config.providerFrameURL),
      runtimeManifestSha256: config.runtime.manifestSha256,
      signal: owner.signal,
    })
    owner.signal.throwIfAborted()
    const channel = new MessageChannel()
    transferred = channel.port2
    createPythonBootResourceBroker({
      port: channel.port1,
      manifest: host.manifest,
      store: host.store,
      signal: owner.signal,
      onError: (error) => {
        owner.abort(error)
        reportError(error)
      },
    })
    frame.contentWindow!.postMessage({ type: 'python-probe-boot-init', protocol: 1 }, '*', [
      transferred,
    ])
  } catch (error) {
    transferred?.close()
    owner.abort(error)
    reportError(error)
  }
})
frame.src = config.rawFrameURL
document.body.append(frame)
