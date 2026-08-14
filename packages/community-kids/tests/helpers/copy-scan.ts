import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

/**
 * Máquina compartilhada dos guardas de COPY (`copy-sem-travessao`, `copy-vocabulario`).
 *
 * Os dois precisam da mesma coisa: ler o `src/` e olhar só o que o USUÁRIO lê, descartando
 * comentários (esses são nossos e podem falar o vocabulário que quisermos). Duplicar a máquina
 * de estados em cada guarda daria dois detectores que envelhecem separados.
 */

export const SRC = join(import.meta.dir, '..', '..', 'src')

/**
 * Arquivos que NÃO falam com o usuário. `instrumentation.ts` só monta mensagem de erro de
 * BOOT, lida por quem opera o deploy no log do Railway.
 */
const FORA = new Set(['instrumentation.ts'])

export function listarFontes(dir: string = SRC, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) {
      listarFontes(full, out)
      continue
    }
    if (!/\.tsx?$/.test(entry) || FORA.has(entry)) continue
    out.push(full)
  }
  return out
}

export interface LinhaVisivel {
  linha: number
  texto: string
}

/**
 * Tira comentários linha a linha, guardando o estado de bloco aberto (os comentários JSX
 * `{/* … *\/}` deste código são multi-linha). ⚠️ `//` só conta como comentário quando NÃO
 * vem logo depois de `:` — senão `https://…` cortaria o resto da linha e esconderia texto
 * de verdade depois dele.
 */
export function linhasVisiveis(fonte: string): LinhaVisivel[] {
  const saida: LinhaVisivel[] = []
  let emBloco = false
  fonte.split('\n').forEach((original, i) => {
    let linha = original
    let limpa = ''
    while (linha.length > 0) {
      if (emBloco) {
        const fim = linha.indexOf('*/')
        if (fim === -1) return
        linha = linha.slice(fim + 2)
        emBloco = false
        continue
      }
      const abre = linha.indexOf('/*')
      const inline = linha.search(/(?<!:)\/\//)
      if (abre !== -1 && (inline === -1 || abre < inline)) {
        limpa += linha.slice(0, abre)
        linha = linha.slice(abre + 2)
        emBloco = true
        continue
      }
      if (inline !== -1) {
        limpa += linha.slice(0, inline)
        break
      }
      limpa += linha
      break
    }
    if (limpa.trim().length > 0) saida.push({ linha: i + 1, texto: limpa.trim() })
  })
  return saida
}

/** Varre o `src/` inteiro e devolve `caminho:linha → trecho` de cada linha que casa. */
export function varrerCopy(casa: (texto: string) => boolean): string[] {
  const achados: string[] = []
  for (const arquivo of listarFontes()) {
    for (const { linha, texto } of linhasVisiveis(readFileSync(arquivo, 'utf8'))) {
      if (!casa(texto)) continue
      achados.push(`${arquivo.slice(arquivo.indexOf('src'))}:${linha} → ${texto.slice(0, 90)}`)
    }
  }
  return achados
}
