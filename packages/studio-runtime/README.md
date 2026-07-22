# Studio Runtime

Compilador isolado das atividades Pro do Sistema Zero. O Worker recebe arquivos já autorizados pelo BFF, valida tamanho e caminhos, escolhe dependências por uma lista fechada de templates e executa o Vite em um Cloudflare Sandbox sem acesso à internet.

## Desenvolvimento

1. Rode `bun install` na raiz do monorepo.
2. Crie o segredo com `bunx wrangler secret put INTERNAL_TOKEN`.
3. Rode `bun run dev` neste pacote. O Docker precisa estar aberto.

O endpoint usado pelo BFF é `POST /v1/build`. Nunca exponha o `INTERNAL_TOKEN` no navegador. Em produção, configure o mesmo valor em `STUDIO_PRO_RUNTIME_TOKEN` no community-kids e a URL do Worker em `STUDIO_PRO_RUNTIME_URL`.

## Segurança

O runtime não aceita comandos, dependências nem scripts npm enviados pelo aluno. `package.json` e `vite.config` são recriados no servidor. Cada execução tem limites de arquivos e tamanho, rate limit por atividade e uma pasta temporária própria. O HTML final recebe uma CSP sem rede e volta ao Estúdio para rodar em um iframe sem `allow-same-origin`.
