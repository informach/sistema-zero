import 'server-only'
import type { Env } from '../lib/env'
import type { StudioPythonBuilderRuntime } from './studio-python-builder'

export interface StudioBuilderRuntimeOptions {
  runtimeUrl?: string
  runtimeToken?: string
  pythonRuntime?: StudioPythonBuilderRuntime
}

function trustedPythonService(value: string, allowLocalHttp: boolean) {
  try {
    const url = new URL(value)
    return (
      !url.username &&
      !url.password &&
      !url.search &&
      !url.hash &&
      (url.protocol === 'https:' ||
        (allowLocalHttp &&
          url.protocol === 'http:' &&
          ['localhost', '127.0.0.1'].includes(url.hostname)))
    )
  } catch {
    return false
  }
}

/** Optional providers are independent; a missing Python service cannot disable JavaScript. */
export function studioBuilderRuntimeOptions(env: Env): StudioBuilderRuntimeOptions {
  const options: StudioBuilderRuntimeOptions = {}
  if (env.STUDIO_PRO_RUNTIME_URL && env.STUDIO_PRO_RUNTIME_TOKEN) {
    options.runtimeUrl = env.STUDIO_PRO_RUNTIME_URL
    options.runtimeToken = env.STUDIO_PRO_RUNTIME_TOKEN
  }
  const allowLocalHttp = env.NODE_ENV !== 'production'
  if (
    env.STUDIO_PYTHON_RUNTIME_URL &&
    env.STUDIO_PYTHON_RUNTIME_TOKEN &&
    env.STUDIO_PYTHON_LANGUAGE_URL &&
    env.STUDIO_PYTHON_LANGUAGE_TOKEN &&
    trustedPythonService(env.STUDIO_PYTHON_RUNTIME_URL, allowLocalHttp) &&
    trustedPythonService(env.STUDIO_PYTHON_LANGUAGE_URL, allowLocalHttp)
  ) {
    options.pythonRuntime = {
      runtimeUrl: env.STUDIO_PYTHON_RUNTIME_URL,
      runtimeToken: env.STUDIO_PYTHON_RUNTIME_TOKEN,
      languageUrl: env.STUDIO_PYTHON_LANGUAGE_URL,
      languageToken: env.STUDIO_PYTHON_LANGUAGE_TOKEN,
      allowLocalHttp,
    }
  }
  return options
}

export function studioBuilderRuntimeAvailable(
  options: StudioBuilderRuntimeOptions,
  language: 'javascript' | 'python',
) {
  return language === 'python'
    ? Boolean(options.pythonRuntime)
    : Boolean(options.runtimeUrl && options.runtimeToken)
}
