import type { Companhia, Salvamento } from '@sistemazero/arquipelago-contracts'

/**
 * Quem acompanha a criança pela ilha (S01, levantamento de 30/10). A proposta põe a casa e "os
 * bichinhos reais da plataforma" no jogo; o bichinho do quarto (`quarto.pet`) sai do quarto e anda
 * junto. Com um bicho adotado no Bosque, a criança escolhe quem acompanha; o outro espera em casa.
 * Adotar um bicho faz dele a companhia (como sempre foi: ele vai junto para casa).
 */
export type QuemAcompanha = Companhia | null

/** Quem acompanha agora: a escolha, se ela existe; senão quem houver; senão ninguém. */
export function quemAcompanha(s: Salvamento, petDoQuarto: string | null): QuemAcompanha {
  const temAdotado = s.bichos.adotado !== null
  const temPet = !!petDoQuarto
  if (s.companhia === 'adotado' && temAdotado) return 'adotado'
  if (s.companhia === 'quarto' && temPet) return 'quarto'
  if (temAdotado) return 'adotado'
  return temPet ? 'quarto' : null
}

/** Dá para escolher só com os dois. */
export function podeEscolherCompanhia(s: Salvamento, petDoQuarto: string | null): boolean {
  return s.bichos.adotado !== null && !!petDoQuarto
}

export function escolherCompanhia(s: Salvamento, c: Companhia): Salvamento {
  return s.companhia === c ? s : { ...s, companhia: c }
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

export function falaDaCompanhia(c: Companhia, nomeDoAdotado: string, petDoQuarto: string): string {
  return c === 'adotado'
    ? `${nomeDoAdotado} vai com você. ${maiuscula(nomeDoPet(petDoQuarto))} espera no quarto.`
    : `${maiuscula(nomeDoPet(petDoQuarto))} vai com você. ${nomeDoAdotado} espera em casa.`
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
