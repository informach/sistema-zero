import { createPythonBootResourceBroker } from '../../packages/studio/src/runtime/python/bootResourceBroker'
import { preparePythonBootResourceHost } from '../../packages/studio/src/runtime/python/bootResourceHost'
import type {
  PythonFrameCommand,
  PythonFrameMessage,
} from '../../packages/studio/src/runtime/python/frameProtocol'
import type { StudioExecutionIdentity } from '../../packages/studio/src/runtime/types'

/** Harness for the product frame, without pretending the editor provider is integrated. */
type Command = PythonFrameCommand extends infer Value
  ? Value extends PythonFrameCommand
    ? Omit<Value, 'protocol' | 'challenge' | 'identity' | 'commandId'>
    : never
  : never
interface Probe {
  events: PythonFrameMessage[]
  prepare(name: string): Promise<void>
  send(command: Command, identityPatch?: Partial<StudioExecutionIdentity>): number
  destroy(): void
}
declare global {
  var supervisorProbe: Probe
}
const frame = document.createElement('iframe')
frame.sandbox.add('allow-scripts', 'allow-pointer-lock')
const challenge = [...crypto.getRandomValues(new Uint8Array(32))]
  .map((byte) => byte.toString(16).padStart(2, '0'))
  .join('')
const events: PythonFrameMessage[] = []
let identity: StudioExecutionIdentity
let port: MessagePort
let commandId = 0
const owner = new AbortController()
addEventListener('pagehide', () => owner.abort(), { once: true })
let resolveReady: () => void
const ready = new Promise<void>((resolve) => {
  resolveReady = resolve
})
addEventListener('message', (event) => {
  if (
    event.source === frame.contentWindow &&
    event.data?.type === 'python-frame-ready' &&
    event.data.challenge === challenge
  )
    resolveReady()
})
const config = await (await fetch('/configuration')).json()
frame.src = `${new URLSearchParams(location.search).has('distribution') ? config.providerFrameURL : config.frameURL}#${challenge}`
document.body.append(frame)
globalThis.supervisorProbe = {
  events,
  async prepare(name) {
    await ready
    const snapshot = await (await fetch(`/fixture/${encodeURIComponent(name)}`)).json()
    for (const file of snapshot.files) file.bytes = new Uint8Array(file.bytes)
    identity = {
      projectId: snapshot.projectId,
      revision: snapshot.revision,
      runtimeManifestSha256: snapshot.configuration.runtime.manifestSha256,
      instanceId: crypto.randomUUID(),
      runId: crypto.randomUUID(),
      writerEpoch: null,
    }
    const channel = new MessageChannel()
    port = channel.port1
    port.onmessage = (event) => {
      if (events.length < 2048) events.push(event.data)
      else {
        port.close()
        frame.remove()
      }
    }
    port.start()
    const host = await preparePythonBootResourceHost({
      frameURL: new URL(config.providerFrameURL),
      runtimeManifestSha256: identity.runtimeManifestSha256,
      signal: owner.signal,
    })
    const resources = new MessageChannel()
    createPythonBootResourceBroker({
      port: resources.port1,
      manifest: host.manifest,
      store: host.store,
      signal: owner.signal,
      onError: (error) => {
        owner.abort(error)
        reportError(error)
      },
    })
    frame.contentWindow!.postMessage(
      { type: 'python-frame-init', protocol: 1, challenge, identity, snapshot, bootResources: 1 },
      '*',
      [channel.port2, resources.port2],
    )
  },
  send(command, identityPatch) {
    port.postMessage({
      ...command,
      commandId: ++commandId,
      protocol: 1,
      challenge,
      identity: { ...identity, ...identityPatch },
    })
    return commandId
  },
  destroy() {
    owner.abort()
    port?.close()
    frame.remove()
  },
}
