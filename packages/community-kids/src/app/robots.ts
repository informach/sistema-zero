import type { MetadataRoute } from 'next'

/**
 * Plataforma infantil: NADA aqui é conteúdo de marketing/indexável. A área do aluno
 * exige login (um bot só recebe o redirect p/ /login); as rotas anônimas são
 * `/jogar/<id>` (link de jogo compartilhado) e `/validar/<id>` (QR de
 * certificado), que NÃO devem ser indexadas.
 *
 * ⚠️ Por que `Allow` nessas rotas e não `Disallow: /` puro? O que de fato MANTÉM uma URL
 * linkada de fora (ex.: colada numa rede social) FORA do índice é o `robots:{index:false}`
 * per-page do `/jogar`/`/validar` — mas o Google só LÊ esse `noindex` se PUDER
 * buscar a página. Um `Disallow` nessas rotas impediria o fetch, escondendo o
 * `noindex`, e a URL ainda poderia ser indexada "às cegas" (só a URL). Então
 * liberamos essas rotas p/ o bot buscar e honrar o `noindex`, e barramos todo o
 * resto (que é login-gated mesmo).
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: '*', allow: ['/jogar/', '/validar/'], disallow: '/' },
  }
}
