import type { Companhia, Salvamento } from '@sistemazero/arquipelago-contracts'
import { nasceu } from './filhote-do-vale'

/**
 * Quem acompanha a criança pela ilha (S01, levantamento de 30/10). A proposta põe a casa e "os
 * bichinhos reais da plataforma" no jogo; o bichinho do quarto (`quarto.pet`) sai do quarto e anda
 * junto. Com um bicho adotado no Bosque, a criança escolhe quem acompanha; o outro espera em casa.
 * Adotar um bicho faz dele a companhia (como sempre foi: ele vai junto para casa). Desde a V21
 * (§6.28, A7), o filhote do Vale que já nasceu e ganhou nome também pode ir junto: o dino de
 * estimação deixa o Vale e passa a acompanhar.
 */
export type QuemAcompanha = Companhia | null

/** Quem pode acompanhar agora, na ordem dos botões. */
export function opcoesDeCompanhia(s: Salvamento, petDoQuarto: string | null): Companhia[] {
  const opcoes: Companhia[] = []
  if (s.bichos.adotado !== null) opcoes.push('adotado')
  if (petDoQuarto) opcoes.push('quarto')
  const filhote = s.vale.filhote
  if (nasceu(filhote) && filhote?.nome) opcoes.push('filhote')
  return opcoes
}

/** Quem acompanha agora: a escolha, se ela existe; senão o adotado ou o do quarto; senão ninguém. */
export function quemAcompanha(s: Salvamento, petDoQuarto: string | null): QuemAcompanha {
  const opcoes = opcoesDeCompanhia(s, petDoQuarto)
  if (opcoes.includes(s.companhia)) return s.companhia
  if (opcoes.includes('adotado')) return 'adotado'
  return opcoes.includes('quarto') ? 'quarto' : null
}

/** Dá para escolher com pelo menos dois. */
export function podeEscolherCompanhia(s: Salvamento, petDoQuarto: string | null): boolean {
  return opcoesDeCompanhia(s, petDoQuarto).length >= 2
}

export function escolherCompanhia(s: Salvamento, c: Companhia): Salvamento {
  return s.companhia === c ? s : { ...s, companhia: c }
}

/** Deixar o filhote no Vale: volta a companhia de antes (o adotado, se houver; senão o do quarto). */
export function deixarOFilhoteNoVale(s: Salvamento): Salvamento {
  if (s.companhia !== 'filhote') return s
  return { ...s, companhia: s.bichos.adotado ? 'adotado' : 'quarto' }
}

/** O nome do bichinho do quarto (o catálogo do quarto chama de gato, cachorro e passarinho). */
export function nomeDoPet(petDoQuarto: string): string {
  if (petDoQuarto === 'pet-gato') return 'o gato do quarto'
  if (petDoQuarto === 'pet-cachorro') return 'o cachorro do quarto'
  if (petDoQuarto === 'pet-passaro') return 'o passarinho do quarto'
  return 'o bichinho do quarto'
}

/** O nome do bichinho do quarto num botão: "Gato do quarto". */
export function rotuloDoPet(petDoQuarto: string): string {
  return maiuscula(nomeDoPet(petDoQuarto).replace(/^o /, ''))
}

/** Os nomes de quem pode acompanhar, para os botões e as falas. */
export interface NomesDaCompanhia {
  adotado: string | null
  pet: string | null
  filhote: string | null
}

export function rotuloDaCompanhia(c: Companhia, nomes: NomesDaCompanhia): string {
  if (c === 'adotado') return nomes.adotado ?? 'Bicho adotado'
  if (c === 'filhote') return nomes.filhote ?? 'Filhote do Vale'
  return nomes.pet ? rotuloDoPet(nomes.pet) : 'Bichinho do quarto'
}

/** "Rex vai com você. O gato do quarto espera no quarto." (quem fica, cada um no seu lugar). */
export function falaDaCompanhia(c: Companhia, nomes: NomesDaCompanhia): string {
  const vai =
    c === 'quarto' && nomes.pet
      ? maiuscula(nomeDoPet(nomes.pet))
      : c === 'filhote'
        ? (nomes.filhote ?? 'O filhote')
        : (nomes.adotado ?? 'O bicho')
  const ficam: string[] = []
  if (c !== 'adotado' && nomes.adotado) ficam.push(`${nomes.adotado} espera em casa.`)
  if (c !== 'quarto' && nomes.pet)
    ficam.push(`${maiuscula(nomeDoPet(nomes.pet))} espera no quarto.`)
  if (c !== 'filhote' && nomes.filhote) ficam.push(`${nomes.filhote} brinca no Vale.`)
  return [`${vai} vai com você.`, ...ficam].join(' ')
}

function maiuscula(t: string): string {
  return t.charAt(0).toLocaleUpperCase('pt-BR') + t.slice(1)
}

/** O passarinho voa um pouco acima do chão; o gato e o cachorro andam nele. */
export const ALTURA_DO_VOO = 0.9
/** O balanço do voo do passarinho, em metros para cima e para baixo. */
export const BALANCO_DO_VOO = 0.12

/**
 * Quanto o bichinho que acompanha fica acima do pé (S01). O balanço do passarinho é enfeite:
 * com menos movimento (no aparelho ou no menu do jogo) ele voa reto, na mesma altura, e continua
 * seguindo a criança. O relógio do balanço para na pausa porque quem chama não o avança.
 */
export function alturaDoPet(petDoQuarto: string, tempo: number, menosMovimento: boolean): number {
  if (petDoQuarto !== 'pet-passaro') return 0
  return menosMovimento ? ALTURA_DO_VOO : ALTURA_DO_VOO + Math.sin(tempo * 3) * BALANCO_DO_VOO
}
