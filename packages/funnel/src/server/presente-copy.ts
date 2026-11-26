// A copy de VENDA no modo presente (26/11/2026), para as páginas que não têm uma copy própria de
// presente (as do Desafio): o que só vale para quem paga não pode contradizer um presente gratuito.
// A linha de condições da venda ("{{preco}} · pagamento único · 30 dias · garantia") vira a frase do
// presente; "contados da aprovação do pagamento" vira "contados do cadastro"; e as dúvidas sobre
// pagamento, garantia, assinatura ou compra saem. O resto da página continua igual.
import { giftDurationLabel } from '@sistemazero/core/referrals'
import type { CartaoDoPresente } from './presente-cartao'

const CONDICOES_DA_VENDA = /pagamento único[\s\S]*garantia/i
// Só a PERGUNTA decide se a dúvida é de venda (revisão de 26/11/2026): uma resposta que só cita a
// compra de passagem (equipamento, frustração, duração) fica, com o texto trocado.
const DUVIDA_DE_VENDA =
  /garantia|reembolso|assinatura|pagamento|pagar|compra|cobran|custa|preço|\{\{preco/i
const TROCAS: readonly [RegExp, string][] = [
  [/a partir da aprovação do pagamento/g, 'a partir do cadastro'],
  [/contados da aprovação do pagamento/g, 'contados do cadastro'],
  [/O prazo começa (com a|na) aprovação do pagamento/g, 'O prazo começa no cadastro'],
  [/, que é uma compra única com/g, ', com'],
  [/A compra e o cadastro podem/g, 'O cadastro pode'],
  [/\s*A compra tem \d+ dias de garantia[^.]*\./g, ''],
]

function trocar(texto: string, cartao: CartaoDoPresente): string {
  if (CONDICOES_DA_VENDA.test(texto)) return cartao.frase
  const trocado = TROCAS.reduce((atual, [de, para]) => atual.replace(de, para), texto)
  // O prazo da venda (30 dias) vira o do presente: o cartão e a página dizem o mesmo prazo.
  return cartao.dias === null
    ? trocado
    : trocado.replace(/\b30 dias\b/g, giftDurationLabel(cartao.dias))
}

function ehDuvida(valor: unknown): boolean {
  return typeof valor === 'object' && valor !== null && 'pergunta' in valor
}

function converter(valor: unknown, cartao: CartaoDoPresente): unknown {
  if (typeof valor === 'string') return trocar(valor, cartao)
  if (Array.isArray(valor))
    return valor
      .filter(
        (item) =>
          !(
            ehDuvida(item) && DUVIDA_DE_VENDA.test(String((item as { pergunta: unknown }).pergunta))
          ),
      )
      .map((item) => converter(item, cartao))
  if (typeof valor === 'object' && valor !== null)
    return Object.fromEntries(
      Object.entries(valor).map(([chave, item]) => [chave, converter(item, cartao)]),
    )
  return valor
}

/** A copy da página com o que só vale para a venda trocado pelo presente (cópia; o original fica). */
export type CopyDoPresente<T> = T extends string
  ? string
  : T extends object
    ? { [K in keyof T]: CopyDoPresente<T[K]> }
    : T

export function copyDoPresente<T>(copy: T, cartao: CartaoDoPresente): CopyDoPresente<T> {
  return converter(copy, cartao) as CopyDoPresente<T>
}
