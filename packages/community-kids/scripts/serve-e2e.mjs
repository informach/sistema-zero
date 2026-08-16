import { cpSync, existsSync, mkdirSync, rmSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const standalonePackage = resolve(packageRoot, '.next', 'standalone', 'packages', 'community-kids')

if (!existsSync(resolve(standalonePackage, 'server.js'))) {
  throw new Error('Build standalone do Community Kids não encontrado.')
}

// O build standalone pode copiar arquivos locais de ambiente. O smoke deve usar apenas
// o ambiente isolado definido pelo Playwright, sem alterar os arquivos-fonte do projeto.
for (const envFile of ['.env', '.env.local', '.env.production', '.env.production.local']) {
  rmSync(resolve(standalonePackage, envFile), { force: true })
}
delete process.env.JWT_HS256_SECRET

// O Next não copia estes diretórios para o standalone; o Dockerfile faz a mesma montagem.
mkdirSync(resolve(standalonePackage, '.next'), { recursive: true })
cpSync(resolve(packageRoot, '.next', 'static'), resolve(standalonePackage, '.next', 'static'), {
  recursive: true,
  force: true,
})
cpSync(resolve(packageRoot, 'public'), resolve(standalonePackage, 'public'), {
  recursive: true,
  force: true,
})

await import(pathToFileURL(resolve(standalonePackage, 'server.js')).href)
