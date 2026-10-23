import assert from 'node:assert/strict'
import { copyFile, mkdir, open, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { verifyWindowsSignature } from '../src/main/clients/windows-signature'

const source = process.argv[2]
if (!source || !path.isAbsolute(source))
  throw new Error('Informe o binário oficial Claude Code com caminho absoluto.')
const publisher =
  'CN="Anthropic, PBC", O="Anthropic, PBC", L=San Francisco, S=California, C=US, SERIALNUMBER=4860621, OID.2.5.4.15=Private Organization, OID.1.3.6.1.4.1.311.60.2.1.2=Delaware, OID.1.3.6.1.4.1.311.60.2.1.3=US'
const root = path.resolve('.cache/update-signature-proof')
await mkdir(root, { recursive: true })
assert.equal(await verifyWindowsSignature([publisher], source), null)
assert.notEqual(await verifyWindowsSignature(['CN=Unrelated Publisher'], source), null)
const unsigned = path.join(root, 'unsigned.exe')
await writeFile(unsigned, 'Not an executable')
assert.notEqual(await verifyWindowsSignature([publisher], unsigned), null)
const modified = path.join(root, "tampered ' installer.exe")
await copyFile(source, modified)
const file = await open(modified, 'r+')
try {
  await file.write(Buffer.from('tampered'), 0, 8, 1024)
} finally {
  await file.close()
}
assert.notEqual(await verifyWindowsSignature([publisher], modified), null)
const systemRoot = process.env.SystemRoot
try {
  process.env.SystemRoot = path.join(root, 'missing-windows')
  await assert.rejects(verifyWindowsSignature([publisher], source))
} finally {
  process.env.SystemRoot = systemRoot
}
const evidence = {
  validOfficialSignatureAccepted: true,
  unrelatedPublisherRejected: true,
  unsignedRejected: true,
  changedBinaryRejected: true,
  missingVerifierRejected: true,
  quotedPathHandled: true,
  systemZeroInstallerSignatureTested: false,
}
await writeFile(path.join(root, 'evidence.json'), JSON.stringify(evidence, null, 2))
console.log(JSON.stringify(evidence))
