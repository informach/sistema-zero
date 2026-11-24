import { type DocumentoDeCenario, validarDocumento } from '@sistemazero/molda-cenarios-core/v2'

/**
 * O documento do cenário como arquivo JSON: baixar para guardar ou passar adiante, e abrir de
 * volta para continuar editando. O arquivo leva só referências (biblioteca, modelo, hash) e as
 * transformações: nenhum GLB vai junto.
 */
export const LIMITE_DO_ARQUIVO = 16 * 1024 * 1024

export function nomeDoArquivoDoDocumento(nome: string, revisao: number): string {
  const base =
    nome
      .normalize('NFD')
      .replace(/\p{M}/gu, '')
      .replace(/[^\w\- ]+/g, '')
      .trim()
      .replace(/\s+/g, '-')
      .toLowerCase()
      .slice(0, 60) || 'cenario'
  return `${base}-versao-${revisao}.json`
}

export function textoDoDocumento(documento: DocumentoDeCenario): string {
  return `${JSON.stringify(documento, null, 2)}\n`
}

export type DocumentoAberto =
  | { ok: true; documento: DocumentoDeCenario; objetos: number; nome: string }
  | { ok: false; motivo: string }

/**
 * Lê um arquivo escolhido pela pessoa. O documento passa a ser deste cenário (o mesmo id), para
 * entrar como uma restauração comum: um passo que se desfaz. O servidor ainda confere que cada
 * modelo e cada peça do relevo existem no espaço antes de guardar.
 */
export function lerDocumentoParaAbrir(texto: string, idDoCenario: string): DocumentoAberto {
  if (texto.length > LIMITE_DO_ARQUIVO) return { ok: false, motivo: 'O arquivo é grande demais.' }
  let valor: unknown
  try {
    valor = JSON.parse(texto)
  } catch {
    return { ok: false, motivo: 'Este arquivo não é um JSON.' }
  }
  const bruto = valor as { formato?: unknown; versao?: unknown } | null
  if (!bruto || typeof bruto !== 'object' || bruto.formato !== 'molda-cenario')
    return { ok: false, motivo: 'Este arquivo não é um documento de cenário.' }
  if (bruto.versao !== 2)
    return { ok: false, motivo: 'Este documento é de uma versão antiga da oficina.' }
  try {
    const documento = validarDocumento({ ...(valor as object), id: idDoCenario })
    return {
      ok: true,
      documento,
      objetos: documento.instancias.length,
      nome: documento.nome,
    }
  } catch (erro) {
    const problemas = (erro as { problemas?: readonly string[] }).problemas
    return {
      ok: false,
      motivo: problemas?.length
        ? `O documento tem um problema: ${problemas[0]}`
        : 'O documento não passou na conferência.',
    }
  }
}
