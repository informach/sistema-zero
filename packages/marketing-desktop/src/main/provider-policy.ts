import { realpath, stat } from 'node:fs/promises'
import { homedir } from 'node:os'
import path from 'node:path'
import { z } from 'zod'
import { collectProcess, launchNative } from './native-client'

const disabledFeatures = [
  'apps',
  'browser_use',
  'browser_use_external',
  'computer_use',
  'hooks',
  'in_app_browser',
  'multi_agent',
  'plugins',
  'remote_plugin',
  'shell_tool',
  'shell_snapshot',
  'unified_exec',
  'view_image',
  'skill_search',
  'skill_mcp_dependency_install',
]
const mcpListSchema = z
  .array(z.object({ name: z.string().regex(/^[A-Za-z0-9_-]{1,200}$/) }))
  .max(200)

/** Empty mcp_servers={} merges with user config; every existing server must be disabled. */
export async function codexArguments(cwd: string, signal?: AbortSignal): Promise<string[]> {
  const output = await collectProcess(
    launchNative('codex', ['mcp', 'list', '--json'], cwd),
    20000,
    signal,
  )
  const names = mcpListSchema.parse(JSON.parse(output)).map(({ name }) => name)
  return [
    // In Codex 0.162 the native image tool is exposed through the isolated Code Mode host.
    // Keep its tool dispatcher; disable command execution and external MCP separately below.
    '--enable',
    'code_mode_host',
    ...disabledFeatures.flatMap((feature) => ['--disable', feature]),
    // The override is a complete server table; even a disabled entry needs a transport.
    // An inert transport avoids retaining command arguments, URLs or credentials from user config.
    ...names.flatMap((name) => ['-c', `mcp_servers.${name}={enabled=false,command="disabled"}`]),
    '-c',
    'agents.enabled=false',
    'app-server',
    '--stdio',
  ]
}

export class NativeResultError extends Error {
  constructor(
    readonly code:
      | 'IMAGE_GENERATION_FAILED'
      | 'IMAGE_MISSING'
      | 'IMAGE_TOO_LARGE'
      | 'IMAGE_PATH_REJECTED',
    message: string,
  ) {
    super(message)
  }
}

export function decodeNativeImage(encoded: string): Buffer {
  if (encoded.length > 32_000_000)
    throw new NativeResultError('IMAGE_TOO_LARGE', 'Imagem acima do limite de 24 MB.')
  if (!/^[A-Za-z0-9+/=\r\n]+$/.test(encoded))
    throw new NativeResultError('IMAGE_MISSING', 'Resultado nativo de imagem inválido.')
  return Buffer.from(encoded, 'base64')
}

export async function validateNativeImagePath(
  file: string,
  root = path.join(homedir(), '.codex', 'generated_images'),
) {
  const [resolved, allowedRoot] = await Promise.all([realpath(file), realpath(root)])
  const relative = path.relative(allowedRoot, resolved)
  if (
    !relative ||
    relative.startsWith(`..${path.sep}`) ||
    relative === '..' ||
    path.isAbsolute(relative)
  )
    throw new NativeResultError(
      'IMAGE_PATH_REJECTED',
      'Arquivo fora da pasta de resultados nativos.',
    )
  const info = await stat(resolved)
  if (!info.isFile() || info.size > 24_000_000)
    throw new NativeResultError('IMAGE_TOO_LARGE', 'Imagem acima do limite de 24 MB.')
  return resolved
}

export function requireNativeImage(failed: boolean, count: number) {
  if (failed)
    throw new NativeResultError(
      'IMAGE_GENERATION_FAILED',
      'O provedor não concluiu a imagem. O original foi preservado.',
    )
  if (!count)
    throw new NativeResultError(
      'IMAGE_MISSING',
      'O provedor não entregou uma imagem. Nenhuma alteração foi aplicada.',
    )
}
