import { readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { ALTURA_DAS_NUVENS, giroDaIlha, ilhasEmVolta, PIER } from '../src/mundo/medidas'
import { ancorasDoPorto } from '../src/mundo/portos'
import type { Porto, PortoId } from '../src/sistemas/barco'

const destino = resolve(import.meta.dir, '../src/mundo/portos-da-arte.json')

export async function fonteDosPortos(): Promise<string> {
  const ler = async (arquivo: string) => {
    const b = await readFile(resolve(import.meta.dir, '../src/assets', arquivo))
    return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength)
  }
  const dados: Partial<Record<PortoId, Porto>> = {
    'sua-ilha': ancorasDoPorto(await ler('mundo/pier.glb'), 'embarque', PIER, 0),
  }
  for (const { ilha, centro } of ilhasEmVolta()) {
    if (ilha.id === 'sua-ilha' || ilha.id === 'farol') throw new Error('Porto fora do anel')
    dados[ilha.id] = ancorasDoPorto(
      await ler(`ilhas/${ilha.id}.glb`),
      'cais',
      { ...centro, y: ilha.id === 'nuvens' ? ALTURA_DAS_NUVENS : 0 },
      giroDaIlha(ilha),
    )
  }
  return `${JSON.stringify(dados, null, 2)}\n`
}

export async function conferirPortosDaArte(): Promise<void> {
  if ((await readFile(destino, 'utf8')) !== (await fonteDosPortos()))
    throw new Error(
      'Âncoras desatualizadas. Execute bun scripts/gerar-portos.ts no pacote do jogo.',
    )
}

if (import.meta.main) {
  await writeFile(destino, await fonteDosPortos())
  console.log('Âncoras dos sete portos atualizadas a partir da arte.')
}
