import {
  type ImportInventory,
  type InventoryEntry,
  importProductSchema,
} from '@sistemazero/marketing-contracts'

type Classification = Pick<
  InventoryEntry,
  'product' | 'category' | 'disposition' | 'validity' | 'reason'
>
const secretName =
  /^(\.env(?:\..*)?|credentials?(?:\..*)?|secrets?(?:\..*)?|auth\.json|id_rsa(?:\..*)?|id_ed25519(?:\..*)?|.*\.(pem|p12|pfx|key|sqlite|sqlite3|db))$/i
const omittedDirectories = new Set([
  'vite-cache',
  '.vite',
  '.git',
  '.cache',
  '.next',
  '.turbo',
  '.venv',
  'venv',
  '__pycache__',
  'node_modules',
  '.codex',
  '.claude',
  '.ssh',
  'coverage',
  'test-results',
  'playwright-report',
])
const media = /\.(png|jpe?g|webp|mp4|mov|webm|wav|mp3|m4a|pdf|woff2)$/i
const text = /\.(md|txt|srt|csv)$/i
const source = /\.(html?|svg|[cm]?js|[cm]?ts|tsx|jsx|py|ps1|css|json)$/i

export function sourceRoots(origin: ImportInventory['origin']): string[] {
  return origin === 'sistema-zero' ? ['docs/marketing', 'output'] : ['meus-produtos']
}
export function classifySource(
  origin: ImportInventory['origin'],
  relativePath: string,
  directory: boolean,
): Classification {
  const lower = relativePath.toLowerCase(),
    parts = lower.split('/'),
    name = parts.at(-1) ?? ''
  const productDirectory =
    origin === 'fluxo-criativo' && parts[0] === 'meus-produtos' && (parts.length > 2 || directory)
      ? parts[1]
      : origin === 'sistema-zero' && parts.slice(0, 3).join('/') === 'docs/marketing/kids'
        ? parts[3]
        : undefined
  const parsedProduct = importProductSchema.safeParse(productDirectory)
  const product = parsedProduct.success
    ? parsedProduct.data
    : origin === 'sistema-zero' && /^output\/instagram(?:[-/]|$)/.test(lower)
      ? 'comunidade-dos-criadores'
      : 'shared'
  const base: Classification = {
    product,
    category: 'unclassified',
    disposition: 'review',
    validity: 'unverified',
    reason: 'Origem preservada; requer classificação editorial',
  }
  const excluded = (reason: string): Classification => ({
    ...base,
    category: 'technical',
    disposition: 'excluded',
    reason,
  })
  if (secretName.test(name))
    return excluded('Arquivo de credencial ou armazenamento privado; conteúdo não lido')
  if (directory && omittedDirectories.has(name))
    return excluded('Dependência, cache ou configuração privada; subárvore não percorrida')
  if (origin === 'sistema-zero' && lower.startsWith('docs/marketing/propostas'))
    return excluded('Proposta de engenharia fora da base editorial')
  if (/\.(log|pyc|map|lock)$/.test(name) || /^(bun|package|yarn|pnpm)-?lock\./.test(name))
    return excluded('Log, cache ou arquivo de dependência fora do acervo')
  if (directory) return base
  if (parts.some((p) => /^(historico|hist[oó]rico|entregas-anteriores|arquivo)$/.test(p)))
    return {
      ...base,
      category: 'history',
      disposition: 'eligible',
      validity: 'historical',
      reason: 'Versão anterior explicitamente arquivada na origem',
    }
  if (/^(preco|preço|pesquisa-preco|oferta)(\.|-)/.test(name))
    return {
      ...base,
      category: 'direction',
      validity: 'historical',
      reason: 'Preço ou oferta da origem; conferir vigência antes de usar',
    }
  if (origin === 'fluxo-criativo' && parts.includes('projeto'))
    return {
      ...base,
      category: 'pedagogy',
      disposition: 'eligible',
      validity: 'reference',
      reason: 'Material pedagógico do produto; referência, não direção de marketing vigente',
    }
  if (
    origin === 'sistema-zero' &&
    /\/instagram\/producao\/(postagens|fixados|destaques)\/[^/]+\/\d{2}-[^/]+\.(png|jpe?g|mp4)$/.test(
      lower,
    )
  )
    return {
      ...base,
      category: 'final-media',
      disposition: 'eligible',
      reason: 'Pasta de entregas; conferir vínculo, ordem e versão antes de aprovar',
    }
  if (media.test(name))
    return {
      ...base,
      category: 'support-media',
      disposition: 'eligible',
      validity: 'reference',
      reason: 'Mídia original ou de apoio; preservada sem inferir publicação',
    }
  if (source.test(name))
    return {
      ...base,
      category: 'production-source',
      disposition: 'eligible',
      validity: 'reference',
      reason: 'Fonte de produção; guardar sem executar ou tratar como montagem validada',
    }
  if (text.test(name)) {
    const category: InventoryEntry['category'] = /calendario|calendário|03-postagens/.test(name)
      ? 'calendar'
      : /pesquisa|mercado|avatar|analise|análise|fontes|auditoria/.test(lower)
        ? 'research'
        : /perfil|posicionamento|direcionamento|direcao|direção|idconsumidor|voz|tipo\.md/.test(
              name,
            )
          ? 'direction'
          : /postagens|copies|copy|manychat|fixados|destaques/.test(lower)
            ? 'copy'
            : 'unclassified'
    return {
      ...base,
      category,
      disposition: 'eligible',
      validity: origin === 'fluxo-criativo' ? 'reference' : 'unverified',
      reason: 'Texto de origem preservado; classificação não ativa direção nem produto',
    }
  }
  return base
}

/** Detection is conservative and never returns the matching secret. Files still require review. */
export function containsCredential(text: string): boolean {
  return /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|\b(?:sk-(?:proj-|ant-)?[A-Za-z0-9_-]{24,}|gh[pousr]_[A-Za-z0-9]{30,}|xox[baprs]-[A-Za-z0-9-]{24,})|["']?(?:access_token|refresh_token|api_key|client_secret)["']?\s*[:=]\s*["'][A-Za-z0-9._~-]{20,}["']/i.test(
    text,
  )
}
