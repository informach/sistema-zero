# Arquipélago: publicação separada do jogo (operação)

Lacunas, 01/11/2026 (L9, desfaz a A11). O jogo compilado sai do serviço do jogo e vai para o CDN,
no padrão do runtime Python: cada versão fica imutável em `arquipelago/versoes/<versao>/` e os
canais `arquipelago/canais/estavel.json` e `teste.json` apontam para uma delas. Voltar uma versão é
promover a anterior.

O código está pronto e ensaiado localmente (build real de 298 arquivos, 46,6 MB, enviado a uma pasta
com as mesmas chaves, reenviado sem regravar nada e promovido). Falta a parte do ambiente, abaixo.

## Uma vez

1. **Balde R2 público.** Pode ser o mesmo dos arquivos públicos, com o prefixo `arquipelago/`, ou
   um balde só para o jogo. Precisa de um domínio público (ex.: `https://jogo.sistemazero.com.br`).
2. **CORS no balde.** A página do jogo importa os módulos de outra origem (e usa COEP
   `credentialless`), então o CDN precisa responder com CORS:
   - origens: as das duas comunidades, em staging e produção;
   - métodos: `GET` e `HEAD`;
   - cabeçalhos expostos: nenhum além dos padrão.
3. **Variáveis nas duas comunidades** (`community` e `community-kids`, em cada ambiente):
   - `NEXT_PUBLIC_ARQUIPELAGO_CDN` = a origem pública do balde (só `https://domínio`, sem caminho);
   - `NEXT_PUBLIC_ARQUIPELAGO_CANAL` = `teste` em staging e `estavel` em produção.
   
   Sem a variável do CDN, a página segue lendo o manifesto do serviço do jogo (como hoje). A CSP da
   página do jogo já aceita `https:` em `script-src` e `connect-src`.
4. **Quem publica:** `ARQUIPELAGO_R2_ACCOUNT_ID` e `ARQUIPELAGO_R2_BUCKET` no ambiente de quem roda
   o script (o acesso é o do `wrangler login`, nenhuma chave vai para o código).

## A cada versão

```powershell
cd packages/arquipelago
$env:ARQUIPELAGO_VERSAO = '2026110101'   # nome único; repetir com outro build é recusado
bun run build
bun scripts/publicar.ts preparar --dist dist/cliente --plano plano.json
bun scripts/publicar.ts enviar --dist dist/cliente --plano plano.json --destino r2
bun scripts/publicar.ts promover --canal teste --versao 2026110101 --destino r2
# conferido em staging:
bun scripts/publicar.ts promover --canal estavel --versao 2026110101 --destino r2
```

- `enviar` pode ser repetido depois de uma queda: o que já está lá (com o mesmo hash) não é
  regravado, e o marcador `completa.json` vai por último.
- `promover` só aceita versão completa e confere o hash de cada arquivo.
- **Voltar:** `promover --canal estavel --versao <a anterior>`. A página relê o canal em até um
  minuto (`max-age=60`); as versões são imutáveis (`max-age` de um ano).
- **Ensaio sem nuvem:** `--destino pasta:<caminho>` grava as mesmas chaves numa pasta.

## Depois que o CDN estiver estável

- Tirar `RUN bun run --filter @sistemazero/arquipelago build` do `packages/arquipelago-api/Dockerfile`
  e a rota `/arquipelago/cliente/*` (`rotas-do-cliente.ts`). Até lá, as duas ficam como
  alternativa: sem a variável do CDN, a página usa o serviço.
