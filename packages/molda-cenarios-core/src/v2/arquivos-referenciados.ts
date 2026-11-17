import type { ComandoDeCenario } from './comandos'
import type { DocumentoDeCenario } from './documento'

export interface ArquivoReferenciado {
  digest: string
  tipo: 'modelo' | 'textura' | 'terreno'
}

/** Procedência autoral também acompanha snapshots; não se limita ao clipboard exterior. */
export const espacosDoDocumento = (doc: DocumentoDeCenario): string[] => [
  ...new Set(doc.definicoesConjuntos?.map((d) => d.conteudo.origem.espaco) ?? []),
]

export function espacosDosComandos(comandos: readonly ComandoDeCenario[]): string[] {
  return [
    ...new Set(
      comandos.flatMap((c) => {
        if (c.tipo === 'fragmento.colar')
          return [
            c.fragmento.origem.espaco,
            ...(c.fragmento.definicoesConjuntos?.map((d) => d.conteudo.origem.espaco) ?? []),
          ]
        if (c.tipo === 'conjunto.definir' || c.tipo === 'conjunto.atualizar')
          return [c.definicao.conteudo.origem.espaco]
        return c.tipo === 'cenario.restaurar' ? espacosDoDocumento(c.documento) : []
      }),
    ),
  ]
}

export function arquivosDoDocumento(doc: DocumentoDeCenario): ArquivoReferenciado[] {
  return [
    ...doc.modelos.map((m): ArquivoReferenciado => ({ digest: m.digest, tipo: 'modelo' })),
    ...(doc.texturas?.map((t): ArquivoReferenciado => ({ digest: t.digest, tipo: 'textura' })) ??
      []),
    ...(doc.base.tipo === 'terreno'
      ? doc.base.pecas.map((p): ArquivoReferenciado => ({ digest: p.digest, tipo: 'terreno' }))
      : []),
    ...(doc.definicoesConjuntos?.flatMap((d) => [
      ...d.conteudo.modelos.map((m): ArquivoReferenciado => ({ digest: m.digest, tipo: 'modelo' })),
      ...d.conteudo.texturas.map(
        (t): ArquivoReferenciado => ({ digest: t.digest, tipo: 'textura' }),
      ),
    ]) ?? []),
  ]
}

/** Cabeça, lotes e inversos usam as mesmas referências, inclusive restaurações inteiras. */
export function arquivosDosComandos(comandos: readonly ComandoDeCenario[]): ArquivoReferenciado[] {
  return comandos.flatMap((c): ArquivoReferenciado[] => {
    switch (c.tipo) {
      case 'conjunto.definir':
      case 'conjunto.atualizar':
        return [
          ...c.definicao.conteudo.modelos.map(
            (m): ArquivoReferenciado => ({ digest: m.digest, tipo: 'modelo' }),
          ),
          ...c.definicao.conteudo.texturas.map(
            (t): ArquivoReferenciado => ({ digest: t.digest, tipo: 'textura' }),
          ),
        ]
      case 'fragmento.colar':
        return [
          ...c.fragmento.modelos.map(
            (m): ArquivoReferenciado => ({ digest: m.digest, tipo: 'modelo' }),
          ),
          ...c.fragmento.texturas.map(
            (t): ArquivoReferenciado => ({ digest: t.digest, tipo: 'textura' }),
          ),
          ...(c.fragmento.definicoesConjuntos?.flatMap((d) => [
            ...d.conteudo.modelos.map(
              (m): ArquivoReferenciado => ({ digest: m.digest, tipo: 'modelo' }),
            ),
            ...d.conteudo.texturas.map(
              (t): ArquivoReferenciado => ({ digest: t.digest, tipo: 'textura' }),
            ),
          ]) ?? []),
        ]
      case 'modelo.definir':
        return [{ digest: c.modelo.digest, tipo: 'modelo' }]
      case 'textura.definir':
        return [{ digest: c.textura.digest, tipo: 'textura' }]
      case 'base.definir':
        return c.base.tipo === 'terreno'
          ? c.base.pecas.map((p) => ({ digest: p.digest, tipo: 'terreno' }))
          : []
      case 'cenario.restaurar':
        return arquivosDoDocumento(c.documento)
      default:
        return []
    }
  })
}
