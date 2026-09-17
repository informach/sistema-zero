/**
 * O emissor: registro → a folha de estilo.
 *
 * A saída é COMPROMETIDA no repositório e um teste a regenera em memória e compara byte a byte.
 * É isso que deixa `packages/ui` continuar sem build: o teste É a conferência de build, e uma
 * paleta editada à mão na folha (ou um `tokens:gen` esquecido) fica vermelha no CI.
 *
 * ⚠️ A saída precisa sair canônica para o Biome, senão `bun run ci` e o teste de deriva brigam
 * um com o outro para sempre.
 */
import { DEFAULT_PALETTE } from '@sistemazero/core/palette'
import { derivePaletteTokens } from './derive'
import { PALETTE_RECIPES } from './palettes'
import { FIXED_TOKENS, PALETTE_TOKENS } from './recipe'

const AVISO = `/*
 * PALETAS DA COMUNIDADE — ARQUIVO GERADO. NÃO EDITE À MÃO.
 *
 * Fonte: \`packages/ui/src/tokens/\` (registro em \`palettes.ts\`, receita em \`recipe.ts\`).
 * Para mudar uma cor, mexa no registro e rode \`bun run tokens:gen\` no \`packages/ui\`.
 *
 * Uma paleta = uma matiz. Os 19 tokens abaixo seguem a cor escolhida pela pessoa; os outros 18
 * (identidade das ferramentas, estado e constantes) vivem no \`:root\` e nunca mudam.
 */`

const bloco = (seletores: readonly string[], linhas: readonly string[]) =>
  `${seletores.join(',\n')} {\n${linhas.map((l) => `  ${l}`).join('\n')}\n}`

/** A folha do chassi `community`: kids, adultos e funil. Só claro — não há tema escuro aqui. */
export function toCss(): string {
  const partes: string[] = [AVISO]

  partes.push(
    bloco(
      [':root'],
      [
        '/* Não seguem a cor escolhida: constantes, identidade das ferramentas e estado. */',
        ...Object.entries(FIXED_TOKENS).map(([token, valor]) => `--sz-${token}: ${valor};`),
      ],
    ),
  )

  // A rede de segurança. ⚠️ Ela NÃO é o mecanismo: o servidor SEMPRE emite `data-sz-palette`
  // (ver `renderedPalette` no core), e um teste cobra isso de cada layout. Ela existe para que
  // uma falha nunca deixe a página crua — e, com uma cor da casa só para todo o ecossistema,
  // ela está certa em todo app, em vez de não poder estar certa em dois ao mesmo tempo.
  partes.push(
    [
      '/* Rede de segurança: sem o atributo, vale a cor da casa. O servidor SEMPRE o emite, então',
      ' * isto nunca deveria pintar nada. */',
      bloco([':root:not([data-sz-palette])'], linhasDaPaleta(DEFAULT_PALETTE)),
    ].join('\n'),
  )

  for (const recipe of PALETTE_RECIPES) {
    partes.push(bloco([`[data-sz-palette="${recipe.id}"]`], linhasDaPaleta(recipe.id)))
  }

  return `${partes.join('\n\n')}\n`
}

function linhasDaPaleta(id: Parameters<typeof derivePaletteTokens>[0]): string[] {
  const tokens = derivePaletteTokens(id)
  return PALETTE_TOKENS.map((token) => `--sz-${token}: ${tokens[token]};`)
}
