import { spawn } from 'node:child_process'
import { lstat } from 'node:fs/promises'
import path from 'node:path'
import { z } from 'zod'
import { collectProcess, nativeEnvironment } from '../native-client'

const signatureSchema = z
  .object({ status: z.number().int(), path: z.string(), subject: z.string().nullable() })
  .strict()

/** Fail closed on missing PowerShell, invalid/untrusted signatures and publisher mismatch.
 * Uses the updater's supported verification hook; never accepts its legacy fail-open path.
 */
export async function verifyWindowsSignature(
  publishers: string[],
  file: string,
): Promise<string | null> {
  if (
    process.platform !== 'win32' ||
    !path.isAbsolute(file) ||
    !file.endsWith('.exe') ||
    !(await lstat(file)).isFile()
  )
    return 'Arquivo de atualização inválido.'
  const systemRoot = process.env.SystemRoot
  if (!systemRoot || !path.isAbsolute(systemRoot))
    throw new Error('O verificador de assinatura do Windows está indisponível.')
  const literal = `'${file.replaceAll("'", "''")}'`
  const command = `$ErrorActionPreference='Stop'; $signature=Microsoft.PowerShell.Security\\Get-AuthenticodeSignature -LiteralPath ${literal}; [pscustomobject]@{status=[int]$signature.Status;path=$signature.Path;subject=$signature.SignerCertificate.Subject} | ConvertTo-Json -Compress`
  const output = await collectProcess(
    spawn(
      path.join(systemRoot, 'System32/WindowsPowerShell/v1.0/powershell.exe'),
      [
        '-NoProfile',
        '-NonInteractive',
        '-EncodedCommand',
        Buffer.from(command, 'utf16le').toString('base64'),
      ],
      { env: nativeEnvironment(), shell: false, windowsHide: true, stdio: 'pipe' },
    ),
    30000,
  )
  const signature = signatureSchema.parse(JSON.parse(output))
  return signature.status === 0 &&
    path.normalize(signature.path).toLowerCase() === path.normalize(file).toLowerCase() &&
    signature.subject !== null &&
    publishers.includes(signature.subject)
    ? null
    : 'A assinatura do instalador não corresponde ao publicador autorizado.'
}
