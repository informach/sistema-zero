import { expect, test } from 'bun:test'
import { randomBytes } from 'node:crypto'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { createServer } from 'node:net'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { protectWindows } from '../src/process/security'

const windows = test.skipIf(process.platform !== 'win32')

windows(
  'private directory and live pipe ACLs do not need a runtime compiler',
  async () => {
    const directory = await mkdtemp(join(tmpdir(), 'zero-acl-'))
    const target = join(directory, 'profile')
    const pipe = `\\\\.\\pipe\\sistemazero-${randomBytes(12).toString('hex')}`
    const server = createServer((socket) => socket.destroy())
    await new Promise<void>((resolve, reject) => {
      server.once('error', reject)
      server.listen(pipe, resolve)
    })
    const probe = join(directory, 'probe.ps1')
    await writeFile(
      probe,
      `
param([string]$Helper,[string]$Directory,[string]$Pipe)
$ErrorActionPreference='Stop'
# Compiling C# must not be part of the live IPC authorization deadline.
function Add-Type { throw 'A runtime compiler was requested' }
[System.IO.Directory]::CreateDirectory($Directory) | Out-Null
& $Helper -Mode directory -Target $Directory
& $Helper -Mode pipe -Target $Pipe
[System.IO.File]::WriteAllText([System.IO.Path]::Combine($Directory,'inherited.txt'),'test')
$access=[System.Security.AccessControl.AccessControlSections]::Access
$sid=[System.Security.Principal.WindowsIdentity]::GetCurrent().User.Value
foreach ($path in @($Directory,$Pipe,[System.IO.Path]::Combine($Directory,'inherited.txt'))) {
  if ($path -eq $Directory) { $acl=[System.IO.Directory]::GetAccessControl($path,$access) }
  else { $acl=[System.IO.File]::GetAccessControl($path,$access) }
  $d=New-Object System.Security.AccessControl.RawSecurityDescriptor($acl.GetSecurityDescriptorSddlForm($access))
  if ($d.DiscretionaryAcl.Count -ne 1) { throw 'Unexpected ACL principal count' }
  $ace=$d.DiscretionaryAcl[0]
  if ($ace.SecurityIdentifier.Value -ne $sid -or $ace.AceQualifier -ne 'AccessAllowed') { throw 'Unexpected ACL principal' }
  if (($ace.AccessMask -band 0x1f01ff) -ne 0x1f01ff) { throw 'Missing full control' }
  if ($path -eq $Directory -and ([int]$ace.AceFlags -band 3) -ne 3) { throw 'Missing child inheritance' }
  if ($path -ne [System.IO.Path]::Combine($Directory,'inherited.txt') -and -not $acl.AreAccessRulesProtected) { throw 'Unprotected ACL' }
}
'VERIFIED'
`,
    )
    try {
      const child = Bun.spawn(
        [
          'powershell.exe',
          '-NoProfile',
          '-NonInteractive',
          '-ExecutionPolicy',
          'Bypass',
          '-File',
          probe,
          '-Helper',
          fileURLToPath(new URL('../src/process/windows-security.ps1', import.meta.url)),
          '-Directory',
          target,
          '-Pipe',
          pipe,
        ],
        { stdout: 'pipe', stderr: 'pipe', windowsHide: true },
      )
      const timer = setTimeout(() => child.kill(), 10_000)
      try {
        const [output, errors, code] = await Promise.all([
          new Response(child.stdout).text(),
          new Response(child.stderr).text(),
          child.exited,
        ])
        expect({ code, errors: code === 0 ? '' : errors }).toEqual({ code: 0, errors: '' })
        expect(output).toContain('VERIFIED')
      } finally {
        clearTimeout(timer)
      }
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()))
      await rm(directory, { recursive: true })
    }
  },
  15_000,
)

windows(
  'private ACL rejects missing pipes and foreign endpoints',
  async () => {
    await expect(protectWindows('pipe', '\\\\.\\pipe\\foreign')).rejects.toThrow(
      'Invalid owned IPC endpoint',
    )
    await expect(
      protectWindows('pipe', `\\\\.\\pipe\\sistemazero-${randomBytes(12).toString('hex')}`),
    ).rejects.toThrow('Cannot establish private pipe ACL')
  },
  15_000,
)
