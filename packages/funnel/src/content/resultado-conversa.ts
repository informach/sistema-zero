// Resultado em conversa (20/10/2026): o formato aprovado no Canvas para os quizzes da Comunidade
// dos Criadores (Kids 9 a 17, Kids menor de 9 e adulto). Uma carta assinada por Helena e Júlio, em
// cinco movimentos: o que a pessoa contou, por que acontece, o que muda, onde acontece (com uma tela
// real e um relato) e o que a pessoa disse que precisa, fechando com o botão para a oferta.
//
// Cada funil monta o seu `ResultadoConversa` (puro, sem IO) e o componente
// `components/funnel/resultado/ResultadoConversa.astro` o desenha. Trechos entre `[[` e `]]` são as
// respostas da pessoa devolvidas no texto: viram `<mark>` na página.

export type ResultadoTema = 'kids' | 'kids-m9' | 'adulto'

export type BlocoConversa =
  | { tipo: 'p'; texto: string }
  | { tipo: 'h'; texto: string }
  | { tipo: 'img'; src: string; legenda: string; largura: number; altura: number }
  | { tipo: 'relato'; texto: string; autor: string; foto?: string }
  | { tipo: 'cta'; texto: string; rotulo: string; href: string }

export interface ResultadoConversa {
  tema: ResultadoTema
  titulo: string
  /** Diagnóstico pouco nítido: uma frase antes do título. */
  aviso?: string
  blocos: BlocoConversa[]
  assinatura: string
  /** Slug do perfil (o mesmo de `computePerfil`). */
  perfil: string
  /** A página de oferta para onde o botão leva. */
  destino: string
  /** Metadados do evento `viu_resultado` (sem dado pessoal). */
  evento: Record<string, unknown>
}

export interface TrechoConversa {
  texto: string
  marcado: boolean
}

/** Divide um parágrafo nos trechos comuns e nos marcados (`[[...]]`). */
export function trechosConversa(texto: string): TrechoConversa[] {
  const trechos: TrechoConversa[] = []
  const partes = texto.split(/\[\[|\]\]/)
  partes.forEach((parte, i) => {
    if (parte) trechos.push({ texto: parte, marcado: i % 2 === 1 })
  })
  return trechos
}

/** O texto como a pessoa lê, sem as marcas (testes e espelhos de copy). */
export const semMarcas = (texto: string): string => texto.replaceAll('[[', '').replaceAll(']]', '')

/** Todo o texto visível de um resultado, em ordem (testes de copy). */
export function textoDoResultado(r: ResultadoConversa): string[] {
  return [
    ...(r.aviso ? [r.aviso] : []),
    r.titulo,
    ...r.blocos.flatMap((b) =>
      b.tipo === 'img'
        ? [b.legenda]
        : b.tipo === 'relato'
          ? [b.texto, b.autor]
          : b.tipo === 'cta'
            ? [b.texto, b.rotulo]
            : [b.texto],
    ),
    r.assinatura,
  ].map(semMarcas)
}
