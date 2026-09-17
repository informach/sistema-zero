import { describe, expect, test } from 'bun:test'
import { readdirSync, readFileSync } from 'node:fs'
// O admin NÃO é dependência do kids no package.json; o import é por caminho
// relativo de módulo puro, mesmo precedente do conformance de tipos de bloco.
import { DIALOGUE_POSES } from '../../admin/src/lib/types'
import {
  ZAPPY_POSE_DA_FALA,
  ZAPPY_RIVE_ARTBOARD,
  ZAPPY_RIVE_SRC,
  ZAPPY_RIVE_TIMELINE,
  ZAPPY_SRC,
} from '../src/components/kids/mascot'

/**
 * Toda pose declarada precisa existir como arquivo NOS DOIS apps: no kids, que é
 * quem mostra o mascote para a criança, e no admin, cujo seletor de pose é uma
 * fileira de imagens (a autora escolhe pela cara, não pelo nome). Cada app serve
 * o próprio `public/`, então "copiei no kids e esqueci no admin" não dá erro
 * nenhum: dá quatro imagens quebradas no editor de aula.
 */
// ⚠️ DERIVADO das fontes de verdade, nunca copiado: uma lista literal aqui
// passaria verde justamente no caso que o teste existe para pegar (pose nova
// declarada, arquivo esquecido).
const POSES_DO_MASCOTE = Object.keys(ZAPPY_SRC)
/** Subconjunto que o bloco de diálogo oferece (dormindo num balão seria absurdo). */
const POSES_DO_DIALOGO = [...DIALOGUE_POSES]

const arquivos = (dir: string, ext: '.webp' | '.riv' = '.webp') =>
  new Set(
    readdirSync(dir)
      .filter((f) => f.endsWith(ext))
      .map((f) => f.replace(ext === '.webp' ? /\.webp$/ : /\.riv$/, '')),
  )

describe('sprites do Zappy', () => {
  test('o kids tem o arquivo de toda pose declarada', () => {
    const noDisco = arquivos(`${import.meta.dir}/../public/zappy`)
    for (const pose of POSES_DO_MASCOTE) expect(noDisco.has(pose)).toBe(true)
  })

  test('o admin tem as poses que o seletor de diálogo mostra', () => {
    const noDisco = arquivos(`${import.meta.dir}/../../admin/public/zappy`)
    for (const pose of POSES_DO_DIALOGO) expect(noDisco.has(pose)).toBe(true)
  })
})

/**
 * O Zappy ANIMADO (Rive) é enfeite por cima do WebP, nunca substituto: toda pose
 * que anima precisa do `.riv` no disco E do `.webp` de queda. Só o kids — o admin
 * mostra uma fileira de imagens para a autora escolher a pose pela cara, e ali
 * canvas com WASM seria peso sem retorno.
 */
describe('poses animadas do Zappy (Rive)', () => {
  const PASTA = `${import.meta.dir}/../public/zappy`

  // ⚠️ O nome do ARQUIVO sai da URL, nunca da chave: desde 17/09/2026 a pose `speaking`
  // aponta para `fala.riv` (nome novo para escapar do cache de um dia de `/zappy/*`), e um
  // teste que montasse `<pose>.riv` na mão reprovaria o arquivo certo.
  const nomeDoArquivo = (src: string) => src.split('/').pop() ?? ''

  test('toda pose animada tem o .riv no disco', () => {
    const noDisco = arquivos(PASTA, '.riv')
    for (const [pose, src] of Object.entries(ZAPPY_RIVE_SRC)) {
      expect(`${pose}: ${noDisco.has(nomeDoArquivo(src).replace(/\.riv$/, ''))}`).toBe(
        `${pose}: true`,
      )
    }
  })

  test('toda pose animada mantém o .webp de queda', () => {
    const estaticos = arquivos(PASTA)
    for (const pose of Object.keys(ZAPPY_RIVE_SRC)) {
      const estatico = ZAPPY_SRC[pose as keyof typeof ZAPPY_SRC]
      expect(`${pose}: ${estaticos.has(nomeDoArquivo(estatico).replace(/\.webp$/, ''))}`).toBe(
        `${pose}: true`,
      )
    }
  })

  /**
   * ⚠️ O runtime casa artboard e animação por STRING, e os arquivos saíram do editor
   * com os nomes genéricos de fábrica. Um reexport que os renomeie não quebra build
   * nem typecheck: derruba o mascote no fallback WebP em silêncio, e ninguém descobre
   * até alguém reparar que o Zappy parou de se mexer. Ler os bytes é a única rede
   * possível daqui — o que ele NÃO alcança (se a timeline tem keyframes) mora no
   * navegador, e foi assim que a troca de state machine para timeline apareceu.
   */
  test('os nomes que o runtime procura estão DENTRO de cada .riv', () => {
    for (const [pose, src] of Object.entries(ZAPPY_RIVE_SRC)) {
      const bytes = readFileSync(`${PASTA}/${nomeDoArquivo(src)}`).toString('latin1')
      expect(`${pose}: ${bytes.includes(ZAPPY_RIVE_ARTBOARD)}`).toBe(`${pose}: true`)
      expect(`${pose}: ${bytes.includes(ZAPPY_RIVE_TIMELINE)}`).toBe(`${pose}: true`)
    }
  })

  /**
   * ⭐ A pose da FALA é a única regida pelo botão "Ouvir", e o arquivo dela é o padronizado de
   * 17/09/2026: veio com a boca (`SMLipSync`/`Viseme`) e SEM o MP3 inerte que os outros carregam.
   * Um reexport que devolva o arquivo antigo no lugar não quebra build nem typecheck — daria uma
   * saudação acenando em laço enquanto o áudio toca, que é quase certo, e por isso passa batido.
   */
  test('o .riv da fala tem a boca e não voltou a ter áudio embutido', () => {
    const src = ZAPPY_RIVE_SRC[ZAPPY_POSE_DA_FALA]
    const bytes = readFileSync(`${PASTA}/${nomeDoArquivo(src)}`).toString('latin1')
    for (const marca of ['SMLipSync', 'Viseme', '0-Neutral']) {
      expect(`${marca}: ${bytes.includes(marca)}`).toBe(`${marca}: true`)
    }
    expect(`MP3 embutido: ${bytes.includes('LAME3')}`).toBe('MP3 embutido: false')
  })
})
