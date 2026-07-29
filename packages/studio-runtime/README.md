# Studio Runtime

Compilador isolado das atividades Pro do Sistema Zero. Um BFF autorizado envia a árvore do projeto, o Worker aplica um catálogo fechado de dependências e o Cloudflare Sandbox executa o build sem acesso à internet. O navegador nunca chama este serviço diretamente.

## Fluxo

1. Community Kids ou Admin valida sessão e autorização.
2. O BFF limita o corpo pelos bytes recebidos e valida o projeto Pro.
3. O BFF escolhe um template confiável e chama `POST /v1/build` com Bearer token.
4. O Worker valida caminhos, quantidades e tamanhos.
5. Um sandbox temporário recebe apenas os arquivos permitidos.
6. `package.json` e `vite.config` são recriados no servidor.
7. Vite gera um HTML autocontido, que volta ao Estúdio para um iframe sem `allow-same-origin`.
8. A pasta temporária é removida ao fim da execução.

## Contrato HTTP

### Saúde

`GET /healthz` responde `200 { "ok": true }` e não exige autenticação.

### Build

`POST /v1/build` exige:

```http
Authorization: Bearer <INTERNAL_TOKEN>
Content-Type: application/json
```

Corpo:

```json
{
  "executionId": "lesson-1234567890abcdef",
  "templateId": "react-ts",
  "files": {
    "index.html": "<div id=\"root\"></div>",
    "src/main.tsx": "console.log('oi')"
  }
}
```

Sucesso:

```json
{
  "ok": true,
  "html": "<!doctype html>...",
  "output": "build ok",
  "durationMs": 1234
}
```

Falhas usam os códigos `INVALID_REQUEST`, `BUILD_FAILED`, `OUTPUT_TOO_LARGE` e `RATE_LIMITED`. Os status esperados são 400 para contrato inválido, 401 para token inválido, 413 para saída grande, 422 para erro no código, 429 para limite de frequência e 500 para falha inesperada.

## Templates confiáveis

* `vanilla-js`
* `vanilla-vite`
* `react-ts`
* `three-js`
* `three-ts`

A lista canônica vive em `@sistemazero/core/studio`. O runtime ignora `package.json`, lockfiles e configurações Vite enviados pelo projeto. As versões instaladas na imagem estão fixadas em `runtime/package-lock.json`, e o Docker usa `npm ci`.

## Limites

* até 80 arquivos;
* até 256.000 caracteres por arquivo;
* até 1.500.000 caracteres no total;
* até 2.500.000 caracteres no HTML final;
* até 20.000 caracteres de saída de build devolvida;
* build com timeout de 45 segundos;
* 10 builds por `executionId` a cada 60 segundos, conforme `wrangler.jsonc`.

Os caminhos aceitam arquivos web e rejeitam travessia, `node_modules`, arquivos `.env`, configurações de build e profundidade excessiva.

## Variáveis e segredos

No Worker:

```powershell
bunx wrangler secret put INTERNAL_TOKEN
```

Use um segredo aleatório com pelo menos 24 caracteres. Nos BFFs Admin e Community Kids, configure o mesmo valor em `STUDIO_PRO_RUNTIME_TOKEN` e a URL pública do Worker em `STUDIO_PRO_RUNTIME_URL`. Nunca use prefixo `NEXT_PUBLIC_`.

## Desenvolvimento

1. Rode `bun install` na raiz do monorepo.
2. Mantenha o Docker aberto.
3. Configure `INTERNAL_TOKEN` no ambiente local do Wrangler.
4. Rode `bun run dev` neste pacote.
5. Execute `bun run test`, `bun run typecheck` e `bun run check`.

Quando as dependências confiáveis mudarem, atualize `runtime/package.json` e gere o lockfile dentro da pasta `runtime`:

```powershell
npm install --package-lock-only --ignore-scripts --no-audit --no-fund
```

Depois confira se as versões do catálogo em `src/contracts.ts`, dos templates do Studio e da imagem continuam iguais.

## Deploy

1. Aplique primeiro em staging.
2. Confirme o secret `INTERNAL_TOKEN`.
3. Rode `bun run deploy`.
4. Configure URL e token nos dois BFFs.
5. Valide `/healthz`.
6. Crie no Admin uma aula Pro de cada família: JavaScript, React e Three.js.
7. Abra as aulas no Community Kids e confirme preview, erro de compilação e rate limit.

## Observabilidade

O Worker registra falhas inesperadas com `studio-runtime build failed`. O BFF registra timeout ou indisponibilidade sem incluir token nem código completo do aluno. A resposta inclui `durationMs`, que deve ser acompanhada junto com taxas de 422, 429, 500, 502 e 504.

Smoke mínimo após deploy:

* `GET /healthz` retorna 200;
* token ausente retorna 401;
* template inválido retorna 400;
* projeto válido retorna HTML sem acesso de rede;
* erro TypeScript retorna 422 com saída limitada;
* duas execuções acima do limite retornam 429 conforme a janela configurada.

## Rollback

Se a nova imagem falhar, volte o deploy do Worker para a versão anterior e preserve o mesmo token. Os BFFs podem ficar configurados durante o rollback. Se o runtime precisar ser desligado, remova as duas variáveis dos BFFs juntas; a interface responderá com indisponibilidade amigável sem expor compilação local nas aulas.
