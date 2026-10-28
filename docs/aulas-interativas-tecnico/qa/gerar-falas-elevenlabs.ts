/** Gera somente derivados locais de voz/edição. Não chama APIs nem publica mídia. */
import { existsSync, readFileSync, unlinkSync } from 'node:fs'
import { basename } from 'node:path'
import { caminhoAula, listarArquivosAulas } from './caminhos'
import { formatarJson } from './formatar-json'
import { gravarArquivo } from './gravar-arquivo'
import {
  extrairPartesElevenLabs,
  montarTextoElevenLabs,
  type ParteFalado,
} from './roteiro-elevenlabs'

function clipesDoManifesto(valor: unknown): string[] {
  if (
    !valor ||
    typeof valor !== 'object' ||
    !('blocks' in valor) ||
    !('sections' in valor) ||
    !Array.isArray(valor.blocks) ||
    !Array.isArray(valor.sections)
  )
    throw new Error('Manifesto inválido')
  const videos = new Set<string>()
  for (const bloco of valor.blocks) {
    if (
      bloco &&
      typeof bloco === 'object' &&
      'plannedVideo' in bloco &&
      'key' in bloco &&
      typeof bloco.key === 'string'
    )
      videos.add(bloco.key)
  }
  return valor.sections.flatMap((s) => {
    if (!s || typeof s !== 'object' || !('blockKeys' in s) || !Array.isArray(s.blockKeys))
      throw new Error('Parte inválida')
    return s.blockKeys.filter(
      (key: unknown): key is string => typeof key === 'string' && videos.has(key),
    )
  })
}

export function derivadosDeVoz(partes: ParteFalado[]): Map<string, string> {
  const arquivos = new Map<string, string>([['.elevenlabs.txt', montarTextoElevenLabs(partes)]])
  const intervencoes = partes.flatMap((p) => p.intervencoes)
  const ids = new Set<string>()
  for (const i of intervencoes) {
    if (ids.has(i.id)) throw new Error(`ID repetido na aula: ${i.id}`)
    ids.add(i.id)
  }
  for (const [personagem, sufixo] of [
    ['Debinha', 'debinha'],
    ['Dedé', 'dede'],
  ] as const) {
    const falas = intervencoes.filter((i) => i.personagem === personagem)
    if (falas.length)
      arquivos.set(
        `.${sufixo}.elevenlabs.txt`,
        `${falas.map((i) => `${i.tags.join(' ')} ${i.falaPersonagem}`).join('\n\n[long pause]\n\n')}\n`,
      )
  }
  arquivos.set(
    '.edicao.json',
    formatarJson({
      version: 1,
      modeloDeProducao: 'ElevenLabs v4',
      master: 'A professora grava toda a fala; a versão adulta conserva o master integral.',
      pausaEntrePartes: {
        tag: '[long pause]',
        alvoDeEdicaoSegundos: 3,
        duracaoGarantidaPelaTag: false,
      },
      clipes: partes.map((p) => p.clipe),
      intervencoes,
    }),
  )
  return arquivos
}

export function gerarFalas(nome: string, check: boolean): number {
  const base = caminhoAula(nome)
  const partes = extrairPartesElevenLabs(readFileSync(`${base}.roteiro.md`, 'utf8'))
  const esperado = clipesDoManifesto(JSON.parse(readFileSync(`${base}.manifesto.json`, 'utf8')))
  if (JSON.stringify(partes.map((p) => p.clipe)) !== JSON.stringify(esperado))
    throw new Error(`${nome}: clipes fora da ordem do manifesto`)
  const arquivos = derivadosDeVoz(partes)
  for (const [sufixo, texto] of arquivos) {
    const destino = `${base}${sufixo}`
    if (check) {
      if (!existsSync(destino) || readFileSync(destino, 'utf8') !== texto)
        throw new Error(`${destino}: derivado ausente ou desatualizado`)
    } else gravarArquivo(destino, texto)
  }
  for (const sufixo of ['.debinha.elevenlabs.txt', '.dede.elevenlabs.txt']) {
    if (!arquivos.has(sufixo) && existsSync(`${base}${sufixo}`)) {
      if (check) throw new Error(`${nome}: arquivo de personagem sem intervenção: ${sufixo}`)
      // Derivado exato desta aula: uma intervenção retirada não pode deixar fala antiga para gravar.
      unlinkSync(`${base}${sufixo}`)
    }
  }
  return arquivos.size
}

if (import.meta.main) {
  const args = process.argv.slice(2)
  const check = args.includes('--check')
  const posAula = args.indexOf('--aula')
  const aula = posAula >= 0 ? args[posAula + 1] : undefined
  if (posAula >= 0 && (!aula || aula.startsWith('--'))) throw new Error('--aula exige nome-base')
  const curso = args.find((a, i) => !a.startsWith('--') && !(posAula >= 0 && i === posAula + 1))
  const selecionados = listarArquivosAulas()
    .filter((f) => f.endsWith('.roteiro.md'))
    .map((f) => basename(f, '.roteiro.md'))
    .filter(
      (f) =>
        (!curso || caminhoAula(f).replaceAll('\\', '/').includes(`/${curso}/`)) &&
        (!aula || f === aula),
    )
  if (!selecionados.length) throw new Error('Nenhuma aula corresponde ao filtro')
  for (const nome of selecionados)
    console.log(`${nome}: ${gerarFalas(nome, check)} arquivos ${check ? 'conferidos' : 'gerados'}`)
}
