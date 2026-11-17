import type { ComandoDeCenario } from './comandos'
import type { DocumentoDeCenario } from './documento'

export interface ArquivoReferenciado {
  digest: string
  tipo: 'modelo' | 'textura' | 'terreno'
}

export function arquivosDoDocumento(doc: DocumentoDeCenario): ArquivoReferenciado[] {
  return [
    ...doc.modelos.map((m): ArquivoReferenciado => ({ digest: m.digest, tipo: 'modelo' })),
    ...(doc.texturas?.map((t): ArquivoReferenciado => ({ digest: t.digest, tipo: 'textura' })) ??
      []),
    ...(doc.base.tipo === 'terreno'
      ? doc.base.pecas.map((p): ArquivoReferenciado => ({ digest: p.digest, tipo: 'terreno' }))
      : []),
  ]
}

/** Cabeça, lotes e inversos usam as mesmas referências, inclusive restaurações inteiras. */
export function arquivosDosComandos(comandos: readonly ComandoDeCenario[]): ArquivoReferenciado[] {
  return comandos.flatMap((c): ArquivoReferenciado[] => {
    switch (c.tipo) {
      case 'fragmento.colar':
        return [
          ...c.fragmento.modelos.map(
            (m): ArquivoReferenciado => ({ digest: m.digest, tipo: 'modelo' }),
          ),
          ...c.fragmento.texturas.map(
            (t): ArquivoReferenciado => ({ digest: t.digest, tipo: 'textura' }),
          ),
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
