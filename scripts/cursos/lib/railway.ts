/**
 * Railway para os scripts de curso: a CLI (no PATH ou na instalação npm global do Windows), as
 * variáveis de um serviço (lidas para a memória, nunca impressas) e um módulo JavaScript rodado
 * DENTRO de um serviço pelo `railway ssh`, como o operador `scripts/release/sync-course-audiences.ts`.
 *
 * Pré-requisitos em qualquer computador: Bun, `npm i -g @railway/cli`, `railway login` e a chave
 * SSH cadastrada na conta do Railway (`railway ssh` pede uma vez).
 */
import { spawn, spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { join } from 'node:path'

export const PROJETO = '415d5a1c-5f75-432c-8445-b395d0977ce3'
export const AMBIENTES = {
  staging: 'f634cff6-aafb-4804-8b69-172fad4e946e',
  production: '19c212a5-85c0-493c-9630-a7a0569e8412',
} as const
export type Ambiente = keyof typeof AMBIENTES

/** O comando da CLI: `railway` do PATH ou o `railway.js` da instalação npm global (Windows). */
function cli(): string[] {
  const noPath = Bun.which('railway')
  if (noPath) return [noPath]
  const npm = join(process.env.APPDATA ?? '', 'npm/node_modules/@railway/cli/bin/railway.js')
  if (existsSync(npm)) return [process.execPath, npm]
  throw new Error('Railway CLI não encontrada: npm i -g @railway/cli e depois railway login')
}

/** As variáveis de um serviço (`admin`, `members`...). Ficam só na memória deste processo. */
export function variaveis(ambiente: Ambiente, servico: string): Record<string, string> {
  const [cmd, ...pre] = cli()
  const r = spawnSync(
    cmd!,
    [
      ...pre,
      'variable',
      'list',
      '--project',
      PROJETO,
      '--environment',
      AMBIENTES[ambiente],
      '--service',
      servico,
      '--json',
    ],
    { encoding: 'utf8', timeout: 30_000, windowsHide: true, maxBuffer: 8 * 1024 * 1024 },
  )
  if (r.status !== 0)
    throw new Error(`railway variable list (${servico}) falhou: rode railway login`)
  const vars = JSON.parse(r.stdout) as Record<string, string>
  if (vars.RAILWAY_ENVIRONMENT_ID && vars.RAILWAY_ENVIRONMENT_ID !== AMBIENTES[ambiente])
    throw new Error('A CLI devolveu variáveis de outro ambiente')
  return vars
}

const aspas = (s: string) => `'${s.replaceAll("'", "'\\''")}'`

/**
 * Roda `codigo` (um módulo ESM que exporta `run(pedido)`) dentro do serviço, com o Bun do
 * contêiner, e devolve o que `run` devolveu. O código e o pedido vão pela entrada padrão.
 */
export async function noServico<T>(
  ambiente: Ambiente,
  servico: 'members' | 'admin',
  codigo: string,
  pedido: unknown,
): Promise<T> {
  const leitor =
    servico === 'members'
      ? 'Bun.stdin.text()'
      : "new Promise((ok,erro)=>{let s='';process.stdin.setEncoding('utf8');process.stdin.on('data',x=>s+=x);process.stdin.on('end',()=>ok(s));process.stdin.on('error',erro)})"
  const partida = `const e=JSON.parse(await ${leitor});const fs=await import('node:fs/promises');const os=await import('node:os');const path=await import('node:path');const url=await import('node:url');const d=await fs.mkdtemp(path.join(os.tmpdir(),'sz-curso-'));const f=path.join(d,'run.mjs');const t=setTimeout(()=>{console.error('Prazo de oito minutos excedido');process.exit(1)},480000);t.unref();try{await fs.writeFile(f,Buffer.from(e.codigo,'base64'),{flag:'wx',mode:0o600});const m=await import(url.pathToFileURL(f).href);const r=await m.run(e.pedido);console.log('SZ_CURSO_RESULTADO='+JSON.stringify(r))}catch(err){console.error(err.name+': '+err.message);process.exitCode=1}finally{clearTimeout(t);await fs.rm(d,{recursive:true,force:true})}`
  const [cmd, ...pre] = cli()
  const filho = spawn(
    cmd!,
    [
      ...pre,
      'ssh',
      '--project',
      PROJETO,
      '--environment',
      AMBIENTES[ambiente],
      '--service',
      servico,
      '--',
      [servico === 'members' ? 'bun' : 'node', '-e', partida].map(aspas).join(' '),
    ],
    { windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'] },
  )
  let saida = ''
  let erros = ''
  filho.stdout.setEncoding('utf8').on('data', (s) => {
    saida += s
  })
  filho.stderr.setEncoding('utf8').on('data', (s) => {
    erros += s
  })
  filho.stdin.on('error', () => {})
  filho.stdin.end(JSON.stringify({ codigo: Buffer.from(codigo).toString('base64'), pedido }))
  const prazo = setTimeout(() => filho.kill(), 10 * 60_000)
  const fim = await new Promise<number | null>((ok, erro) => {
    filho.once('error', erro)
    filho.once('exit', ok)
  })
  clearTimeout(prazo)
  const linha = saida.split(/\r?\n/).find((l) => l.startsWith('SZ_CURSO_RESULTADO='))
  if (fim !== 0 || !linha)
    throw new Error(`${servico} (${ambiente}): falhou (${fim}). ${erros.trim().slice(-800)}`)
  return JSON.parse(linha.slice('SZ_CURSO_RESULTADO='.length)) as T
}
