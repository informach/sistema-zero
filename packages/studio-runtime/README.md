# Studio Runtime

Compilador isolado das atividades Pro do Sistema Zero. Um BFF autorizado envia a árvore do projeto, o Worker aplica um catálogo fechado de dependências e o Cloudflare Sandbox executa o build sem acesso à internet. Somente o BFF chama o build; o navegador lê os arquivos compilados por um endereço temporário imprevisível, sem credenciais.

## Ambientes e capacidade

Staging usa `bun run deploy:staging`, Worker `sistemazero-studio-runtime-staging` e bucket privado `sistemazero-studio-artifacts-staging`. O token `INTERNAL_TOKEN` é exclusivo desse ambiente e deve corresponder a `STUDIO_PRO_RUNTIME_TOKEN` em Kids, Admin, Auth e Members no Railway. As URLs de autorização e limpeza apontam para o Kids de staging.

A configuração principal é a de produção, com Worker `sistemazero-studio-runtime` e bucket `sistemazero-studio-artifacts`. Promova o runtime junto da aplicação que entende artefatos; a aplicação anterior espera HTML inline. Preparar o bucket e as variáveis não exige substituir o runtime ativo antes dessa promoção.

A imagem com Chromium exige `standard-1` (4 GiB de memória e 8 GB de disco). Na validação remota de 15/10/2026, `lite` falhou ao descompactar a imagem no disco de 2 GB. O limite de 50 instâncias permanece. Ambos os buckets expiram apenas `previews/` após dois dias; `published/` e `publications/` não têm expiração por idade.

Depois do deploy, aguarde o provisionamento dos contêineres e valide uma compilação com `validate: true`; `/healthz` sozinho não comprova que a imagem está pronta.

## Fluxo

1. Community Kids ou Admin valida sessão e autorização.
2. O BFF limita o corpo pelos bytes recebidos e valida o projeto Pro.
3. O BFF identifica a origem do projeto, valida as dependências declaradas e chama `POST /v1/build` com Bearer token.
4. O Worker valida caminhos, quantidades, tamanhos e compatibilidade das dependências/lock com a imagem.
5. Um sandbox temporário recebe apenas os arquivos permitidos.
6. `package.json` e `vite.config` são recriados no servidor, preservando as dependências aprovadas do projeto. Scripts arbitrários do manifesto não são executados.
7. Vite gera arquivos estáticos. O empacotador confiável verifica limites e hashes; o Worker grava os arquivos no R2 e publica o manifesto por último.
8. O Estúdio abre o endereço do artefato em iframe sem `allow-same-origin`; CSP, CORS e COEP são impostos por cabeçalhos na origem.
9. A pasta temporária é removida ao fim da execução.

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
  "parentOrigin": "https://kids.sistemazero.com.br",
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
  "artifact": {
    "id": "<64 caracteres hexadecimais aleatórios>",
    "url": "https://runtime.example/v1/artifacts/<id>/index.html",
    "sha256": "<hash do manifesto compilado>",
    "expiresAt": 1792108800000
  },
  "output": "build ok",
  "durationMs": 1234
}
```

Falhas usam os códigos `INVALID_REQUEST`, `BUILD_FAILED`, `OUTPUT_TOO_LARGE` e `RATE_LIMITED`. Os status esperados são 400 para contrato inválido, 401 para token inválido, 413 para saída grande, 422 para erro no código, 429 para limite de frequência e 500 para falha inesperada.

### Teste dos objetivos

`POST /v1/check` (Bearer igual ao build) roda o projeto num Chromium sem internet e confere os
objetivos que RODAM o jogo (etapa 3 dos objetivos do Estúdio, 18/10/2026). Quem chama é o Members.

```json
{ "mode": "classic", "executionId": "check-…", "scope": "__sz<24 hex>",
  "document": "<!doctype html>…", "objectives": [{ "id": "anda", "rule": { "type": "behavior", … } }] }
{ "mode": "pro", "executionId": "check-…", "scope": "__sz<24 hex>", "templateId": "canvas-puzzle",
  "files": { … }, "binaries": { … }, "objectives": [ … ] }
```

Um contêiner próprio por teste (`check-<id>`, destruído no fim). Clássico: o documento de prévia
que o Members montou vira `game.html`. Pro: compila com o Vite de sempre; se algum objetivo chama
uma função exportada, o Worker acrescenta `__sz-check-entry.js` (importa os módulos e os guarda no
escopo sorteado) ao `index.html`. `runtime/check-objectives.mjs` abre UMA página por objetivo
(três em paralelo), aperta "Começar" nos kits, faz os passos e relata o que viu; quem julga é o
Worker, com a régua do core (`judgeExecutionObservation`). Resposta: `{ ok: true, results: [{ id,
passed, detail? }], screenshots?: { id: base64 JPEG } }` (captura só com `"screenshots": true`, que
o "Testar agora" da equipe manda). Projeto Pro que não compila responde 200 com todos os objetivos
sem passar; falha do executor (página que não abre, Vite sem erro e sem fim, prazo do pedido curto)
é 500 `CHECK_FAILED`; frequência 429. O prazo do navegador sai do que sobrou de 140 s desde o começo
do pedido. A página recebe só os ARGUMENTOS das funções (a resposta esperada fica no script), e a
regra em JavaScript (`script`, etapa 4) roda como expressão do protocolo do navegador (a CSP do Pro
não barra), com `jogo`, `texto` e `console` montados dentro da própria expressão e 3 s de prazo.
⚠️ A rota exige a imagem nova (o script entra no `Dockerfile`): reconstrua e implante o Worker
antes de ligar os objetivos de execução no Members.

## Templates confiáveis

* `vanilla-js`
* `vanilla-vite`
* `react-ts`
* `three-js`
* `three-ts`
* `canvas-puzzle`
* `canvas-survival`
* `phaser-arcade`
* `phaser-platformer`
* `three-exploration`
* `three-action`
* `canvas-grid-arena`
* `phaser-tactics`
* `three-tactics`

A lista canônica vive em `@sistemazero/core/studio`. O runtime valida as dependências do `package.json` e o grafo completo do lock npm contra a imagem. Recria apenas os scripts/configuração Vite confiáveis e não executa scripts ou plugins do projeto. As versões instaladas na imagem estão fixadas em `runtime/package-lock.json`, e o Docker usa `npm ci`.

## Limites

* envelope HTTP completo de até 2.000.000 bytes UTF-8 (fontes, binários base64, manifesto e metadados);
* até 80 arquivos-fonte;
* até 256.000 caracteres por arquivo;
* até 1.500.000 caracteres no total;
* até 2.500.000 bytes no conjunto compilado, incluindo materiais e captura de validação;
* até 338 arquivos compilados; previews expiram após 24 horas;
* até 20.000 caracteres de saída de build devolvida;
* build com timeout de 45 segundos; checagem de tipos de 30 segundos; validação completa limitada a 140 segundos;
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

Rode `bun run gen:validation-profile`, `bun run check:validation-profile` e `bun run build:image`. O fingerprint vincula toolchain, lock e código do verificador. O Worker recusa um relatório de imagem antiga. Deploy e CI recusam fingerprint desatualizado.

Depois confira se as versões do catálogo em `src/contracts.ts`, dos templates do Studio e da imagem continuam iguais.

## Deploy

1. Aplique primeiro em staging. Crie o bucket privado `sistemazero-studio-artifacts`, ligado como `PRO_ARTIFACTS`; configure lifecycle para excluir o prefixo `previews/` após dois dias (inclui uploads interrompidos). O Worker recusa leitura após 24 horas independentemente do lifecycle. Não habilite acesso público direto ao bucket.
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
* projeto válido retorna um artefato; módulos e materiais carregam apenas do próprio caminho; acessos externos são bloqueados;
* erro de sintaxe/compilação retorna 422 com saída limitada; com `validate:true`, TypeScript semântico é executado antes de Vite e Chromium, sem plugins de tsconfig;
* duas execuções acima do limite retornam 429 conforme a janela configurada.

## Rollback

Se a nova imagem falhar, volte o deploy do Worker para a versão anterior e preserve o mesmo token. Os BFFs podem ficar configurados durante o rollback. Preserve URL/token e callbacks enquanto houver links publicados ou limpeza pendente. Remover o runtime impede também o acesso aos jogos publicados; isso exige uma decisão operacional explícita.

## Arquivos compilados e materiais

`binaries` aceita caminhos sob `public/`, conteúdo base64 e SHA-256. O BFF deriva esses arquivos de `Project.assets`; o Worker verifica a integridade antes de materializar. A saída usa arquivos normais, sem substituir APIs do navegador. Use caminhos relativos à página (`./studio-assets/...`) ou `import.meta.env.BASE_URL`; caminhos absolutos escritos manualmente em código apontam para a raiz do host, não para o artefato. Vite resolve URLs de imports e CSS no build.

`GET` e `HEAD /v1/artifacts/<id>/<path>` só servem entradas do manifesto já concluído. O ID aleatório funciona como segredo de acesso temporário; não coloque URLs de preview em logs públicos. A CSP mantém a origem opaca mesmo se o HTML for aberto diretamente e permite conexões apenas aos arquivos daquele build. Não há cookies, listagem ou redirecionamento. Previews temporários não equivalem a publicação permanente.

Validação local adicional: `bun tests/image-smoke.ts` executa a imagem com rede desabilitada, verifica usuário sem privilégios e dependências protegidas, compila CSS/TS e empacota bytes reais. O teste de navegador fica em `packages/studio/e2e/runtime-artifact.spec.ts`.

## Compatibilidade de dependências

O catálogo público está em `core/src/studio/pro-dependencies.ts`; um teste compara cada versão com o lock da imagem. O template é apenas a origem do projeto: bibliotecas adicionadas depois são lidas do seu `package.json`. Pacote ou versão fora do catálogo produz erro acionável antes do build. O terminal local continua permitindo outros pacotes.

Versões exatas podem ser compiladas antes da primeira instalação. Faixas `^`/`~` da versão aprovada exigem um lock npm v2/v3 completo, com a especificação da raiz correspondente. O Worker confere versões e integridades das entradas transitivas contra seu lock. Não aceita trocar código instalado silenciosamente, workspaces, overrides ou URLs de pacotes. A imagem usa seu próprio lock imutável e `npm ci --ignore-scripts`; não executa `npm install` do projeto.

`bun run typecheck` verifica o Worker sem DOM e, separadamente, os testes que carregam fontes de jogos do navegador. As fontes dos 14 templates (cinco starters e nove kits) são compiladas pelo teste de kits; os modelos TypeScript passam por `tsc` real. Construção por IA e publicação exigem `validate:true`: checagem semântica dos arquivos fechados, build, playtest e captura. A política de checkJs é explicitada no relatório. Templates genéricos validam carregamento/erros; cenários dos kits exercitam os objetivos conhecidos por entradas reais.


## Criação, assistência e publicação

Os 14 modelos estão disponíveis para criação, assistência e publicação sem flags ou listas de liberação. O host mantém as permissões da jornada e do produto; o servidor valida essas permissões antes de operações custosas. Atividades de aula e projetos ao vivo mantêm sua autorização específica. O Zappy acompanha o nível da jornada, sem interruptor de liberação.

`POST /v1/preflight` privado usa o mesmo parser, lock e SHA-256 dos binários do build, sem container/inferência. É obrigatório antes de iniciar uma construção por IA. O terminal local pode instalar bibliotecas fora do catálogo remoto: o projeto continua editável, mas o preflight explica a incompatibilidade. Capacidades/protocolo não são inferidos pelo cliente a partir de um nome de kit.

## Publicação permanente

`POST /v1/publications` é privado e recebe somente chamadas do BFF. O servidor deriva ownership da conta/perfil autenticados, valida acesso ao Studio Pro, compila/verifica a revisão exata e promove os bytes já verificados. O aluno não escolhe owner, artefato nem modelo remoto.

- `previews/<id>/`: expira em 24 h; lifecycle de dois dias limpa restos.
- `published/<playId>/<revision>/`: arquivos, captura, manifesto e fonte exata permanentes. **Não aplicar lifecycle por idade a este prefixo.**
- `publications/<playId>/state.json`: ponteiro ativo, histórico limitado a 20 revisões, versão CAS e owner opaco. Trocas usam `onlyIf`/ETag; conflito não substitui o estado atual. Cada operação tem UUID e retry idempotente. Edição do post/capa original é independente da versão do jogo.
- `GET /v1/published/<playId>/<revision>/<path>`: serve somente a revisão ativa, se o link não estiver desativado e o Mural confirmar visibilidade. A consulta vale também para ETag/304. Falha de autorização fecha o acesso. Não há compilação no dispositivo de quem joga.

Configure no Worker `PUBLICATION_AUTHORIZATION_URL=https://<kids>/api/internal/studio-play` e `PUBLICATION_CLEANUP_URL=https://<kids>/api/internal/studio-publication-cleanup`. Ambos usam `INTERNAL_TOKEN`, equivalente a `STUDIO_PRO_RUNTIME_TOKEN` no BFF; são URLs fixas de operação, não fornecidas pelo projeto. Não seguem redirecionamentos. R2 permanece privado. Consultas simultâneas de visibilidade compartilham apenas a chamada em voo; não existe TTL de autorização que mantenha acesso depois de uma revogação confirmada.

Fonte pública/remix omite notas da assistência e vínculos com projeto/biblioteca pessoal. Preserva código, materiais e licenças. A capa padrão do Pro vem do PNG da validação e passa pelo otimizador de imagem do host. O player aguarda um handshake do documento real; 404 ou ausência do bridge não viram falso estado pronto.

## Retenção e limpeza

A moderação primeiro revoga a visibilidade no Hub. O webhook assinado grava uma tarefa no R2 privado do BFF (`studio/publication-cleanup/<playId>.json`) antes de tentar a limpeza; falha de gravação retorna 503 para o retry do Hub. Falha posterior mantém a tarefa. O cron de 15 minutos do Worker chama o dreno autenticado, que percorre a fila com cursor persistido e processa quatro tarefas independentes por chamada (falhas não bloqueiam as páginas seguintes): tombstone permanente, snapshot e capa, então ack da tarefa. A identificação de uma publicação Pro permanece na tarefa mesmo se a configuração do runtime estiver ausente. Exclusões parciais de objetos não confirmam a conclusão da tarefa. Não remover as configurações de runtime enquanto a fila não estiver vazia. Falha anterior à entrega aceita continua registrada no gateway do Hub e exige replay operacional do webhook; a revogação de leitura independe da limpeza física.

A remoção grava tombstone mínimo no mesmo objeto CAS, impedindo promoção concorrente ou retry antigo de ressuscitar o link. Apaga até mil arquivos imediatamente. O cron também percorre mil objetos por invocação com cursor persistido. Remove cópias órfãs/arquivos de tombstones somente depois de 48 h e nunca remove revisões referenciadas no histórico. Falha de CAS com resposta ambígua não apaga arquivos que podem ter sido confirmados. Alertar falhas do cron, fila pendente persistente e registros inválidos; não registrar fontes ou credenciais.

Se a primeira promoção terminar e a criação do post no Hub falhar ou tiver resposta ambígua, o estado promovido é preservado para o retry idempotente. Ele não fica publicamente acessível sem a autorização do Hub, mas revisões referenciadas não são removidas pelo coletor de órfãos. Não há reconciliação automática desse caso entre os dois serviços: a operação deve conferir o post autoritativo no Hub e o estado privado da publicação, repetir a operação original ou solicitar a limpeza privada quando confirmar abandono. Não apagar por timeout ou ausência de resposta, pois o post pode ter sido criado.

Desativar ou restaurar pelo histórico é reversível e preserva os arquivos. Excluir o projeto local não despublica o jogo automaticamente. A memória da partida é deste aparelho: o progresso publicado usa `published-<playId>`, separado do editor e estável entre revisões; não promete sincronização entre dispositivos.

## Controles do player Pro

O bridge aceita controles apenas da janela pai e da origem configurada. Eventos sintéticos usam key/code limitados e liberam teclas ao perder foco. Os kits compartilham o contrato `window.szStudioHost.muted` + evento `studio:host-audio`; sons começam por gesto/opt-in, respeitam mute e liberam recursos. Código personalizado com seu próprio áudio deve consumir esse contrato, sem substituição global de AudioContext/Audio. O Pro mantém o documento completo (menus, HUD e canvas) responsivo. A captura ao vivo do console clássico não é oferecida no Pro; a capa verificada continua disponível na publicação.

## Escopo das provas

Testes de contrato usam armazenamento/CAS em memória; provas de player usam React, Chromium e IndexedDB reais, com transporte controlado. Docker exercita uid 1000, rede desativada e limites de CPU/memória. Essas provas não substituem homologação em Cloudflare DO/R2/SDK, autenticação real de Pinta/Molda/Pensa, conta OpenRouter real nem aparelhos físicos. Não há flags de liberação: configuração dos serviços, permissões da jornada e compatibilidade técnica continuam sendo contratos do produto.
