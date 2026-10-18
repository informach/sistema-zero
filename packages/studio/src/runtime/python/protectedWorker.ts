interface TrustedBootstrapPolicy {
  createScriptURL(value: string): string
}
interface TrustedBootstrapAPI {
  createPolicy(
    name: string,
    rules: { createScriptURL(value: string): string },
  ): TrustedBootstrapPolicy
}

/** The qualified topology is a classic Blob bootstrap, not a module/blob worker. */
export function createProtectedPythonWorker(
  purpose: 'execution' | 'analysis',
  resources: MessagePort,
  startupTurtle?: boolean,
) {
  if (
    !['execution', 'analysis'].includes(purpose) ||
    (startupTurtle !== undefined && typeof startupTurtle !== 'boolean') ||
    (purpose === 'analysis' && startupTurtle !== undefined)
  )
    throw new Error('Configuração inicial do worker Python inválida.')
  const api = (globalThis as unknown as { trustedTypes?: TrustedBootstrapAPI }).trustedTypes
  const wasm = WebAssembly as typeof WebAssembly & { Suspending?: unknown; promising?: unknown }
  if (!api || typeof wasm.Suspending !== 'function' || typeof wasm.promising !== 'function')
    throw new Error('Este navegador não oferece os recursos necessários para executar Python.')
  // Closed purpose enum, never a URL or path supplied by the learner.
  const workerURL = new URL(
    purpose === 'analysis' ? './analysis-worker.mjs' : './worker.mjs',
    import.meta.url,
  ).href
  const directory = new URL('./', import.meta.url).href
  const readerURL = new URL('./boot-reader.mjs', import.meta.url).href
  const source = `trustedTypes.createPolicy('sz-python-bootstrap', {});
addEventListener('message', async function initialize(event) {
  removeEventListener('message', initialize);
  try {
    const value = event.data;
    if (!value || typeof value !== 'object' || Reflect.ownKeys(value).length !== 3 ||
        Reflect.ownKeys(value).some(key => !['type', 'protocol', 'turtle'].includes(key)) ||
        value.type !== 'python-boot-resource-init' || value.protocol !== 1 ||
        (value.turtle !== undefined && typeof value.turtle !== 'boolean') ||
        (${JSON.stringify(purpose)} === 'analysis' && value.turtle !== undefined) || event.ports.length !== 1)
      throw new Error('Configuração privada de boot Python inválida.');
    ${
      purpose === 'execution'
        ? `const [reader, entry] = await Promise.all([
      import(${JSON.stringify(readerURL)}), import(${JSON.stringify(workerURL)})
    ]);
    reader.configurePythonBootReader(event.ports[0], ${JSON.stringify(directory)});
    await entry.startPythonWorker({ turtle: value.turtle });`
        : `const { configurePythonBootReader } = await import(${JSON.stringify(readerURL)});
    configurePythonBootReader(event.ports[0], ${JSON.stringify(directory)});
    await import(${JSON.stringify(workerURL)});`
    }
  } catch(error) {
    for (const port of event.ports) port.close();
    postMessage({type:'failed',message:String(error).slice(0,4000)});
  }
});`
  let url: string | undefined = URL.createObjectURL(new Blob([source], { type: 'text/javascript' }))
  const release = () => {
    if (url) URL.revokeObjectURL(url)
    url = undefined
  }
  try {
    // Policy stays private. The worker reserves its name without granting any
    // TrustedScriptURL capability, so learner FFI cannot create descendants.
    // The DOM type shim above passes the browser's object directly to Worker.
    const policy = api.createPolicy('sz-python-bootstrap', {
      createScriptURL(value) {
        if (!url || value !== url) throw new TypeError('Bootstrap Python não autorizado.')
        return value
      },
    })
    const worker = new Worker(policy.createScriptURL(url), {
      type: 'classic',
      name: purpose === 'analysis' ? 'studio-python-analysis' : 'studio-python',
    })
    try {
      worker.postMessage(
        { type: 'python-boot-resource-init', protocol: 1, turtle: startupTurtle },
        [resources],
      )
    } catch (error) {
      worker.terminate()
      throw error
    }
    return { worker, release }
  } catch (error) {
    release()
    throw error
  }
}
