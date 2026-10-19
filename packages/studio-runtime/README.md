# Studio Runtime

Compilador isolado dos projetos Pro do Sistema Zero. Um BFF autorizado envia a árvore do projeto, o Worker aplica um catálogo fechado de dependências e o Cloudflare Sandbox executa o build sem acesso à internet. Somente o BFF chama o build; o navegador lê os arquivos compilados por um endereço temporário imprevisível, sem credenciais.

## Ambientes e capacidade

O runtime Python usa `STUDIO_PYTHON_DISTRIBUTIONS_SHA256`, um SHA256 hexadecimal de 64 caracteres que fixa o objeto privado `runtime-configs/<SHA>.json` no binding R2 `PRO_ARTIFACTS`. O JSON segue `StudioPythonRuntimeConfigurationSchema` do Core:

```json
{
  "version": 1,
  "parentOrigins": ["https://kids.sistemazero.com.br"],
  "deployments": [
    { "status": "active", "deployment": { "release": "<objeto de release verificada>", "distribution": "<manifesto da distribuição>" } }
  ]
}
```

Os textos entre `<...>` são marcadores explicativos; a configuração real contém os objetos completos gerados pelo empacotador. Informe todas as origens qualificadas do editor, autoria, aulas/salas e página pública. Mantenha a mesma seleção e os mesmos estados de release na política de autoria do Members. `active` permite a distribuição aprovada; `retired` conserva projetos existentes; `revoked` recusa arquivos e metadata. A política de autoria decide separadamente quais releases permitem criar novos projetos.

Envie os bytes pelo procedimento confiável `storePythonRuntimeDistribution`, que verifica hashes e grava `complete.json` depois dos arquivos. Em seguida, grave o catálogo com `storePythonRuntimeConfiguration`, usando checksum SHA256 nativo e criação condicional; o comando de promoção coordena essa ordem. Nem o marcador nem o catálogo no bucket aprovam uma distribuição: a aprovação exige o SHA implantado no Worker. Ausência ou erro nessa referência mantém as rotas Python indisponíveis e preserva o fluxo JavaScript. A factory padrão lê a configuração; não é necessário um handler alternativo. Staging recebe o funcionamento normal para validação, sem flag temporária adicional; a distribuição e seus serviços precisam estar configurados e íntegros. Em produção, promova a release somente depois da qualificação completa. Essa variável não concede instalação PyPI, acesso ao Estúdio Pro nem autorização contextual de execução.

O catálogo completo excede o [limite de 5KB por variável Cloudflare](https://developers.cloudflare.com/workers/platform/limits/#environment-variables), por isso não há variável JSON inline nem fragmentação em múltiplas variáveis. A leitura R2 ocorre somente em caminhos Python, limita o objeto a 2MB/10 segundos e verifica tamanho, checksum nativo, SHA dos bytes, schema e manifestos. O cache guarda até oito catálogos por identidade de bucket e compartilha leituras do mesmo SHA; falhas são removidas para permitir recuperação. Cancelar um solicitante não encerra os demais; o último cancelamento retira a leitura e descarta corpos tardios. Ingress e coordenador conferem novamente SHA e bindings após operações assíncronas. Mudar status/origens produz outro catálogo e outro SHA; mantenha objetos antigos para projetos existentes e rollback, sem reativar releases revogadas por acidente.

Staging usa `bun run deploy:staging`, Worker `sistemazero-studio-runtime-staging` e bucket privado `sistemazero-studio-artifacts-staging`. O token `INTERNAL_TOKEN` é exclusivo desse ambiente e deve corresponder a `STUDIO_PRO_RUNTIME_TOKEN` em Kids, Admin, Auth e Members no Railway. As URLs de autorização e limpeza apontam para o Kids de staging.

A configuração principal é a de produção, com Worker `sistemazero-studio-runtime` e bucket `sistemazero-studio-artifacts`. Promova o runtime junto da aplicação que entende artefatos; a aplicação anterior espera HTML inline. Preparar o bucket e as variáveis não exige substituir o runtime ativo antes dessa promoção.

A imagem com Chromium exige `standard-1` (4 GiB de memória e 8 GB de disco). Na validação remota de 15/10/2026, `lite` falhou ao descompactar a imagem no disco de 2 GB. O limite de 50 instâncias permanece. A regra existente expira `previews/` após dois dias. Antes de ativar os inputs Python, configure também as duas regras de um dia descritas abaixo. `published/`, `publications/`, `runtimes/` e `runtime-configs/` não têm expiração por idade.

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
do pedido. A página recebe só os ARGUMENTOS das funções (a resposta esperada fica no script).
⚠️ Nenhuma leitura usa `page.evaluate` (review da etapa 4: ele roda pelo `eval` da página e espera
pelo `then` dela, que o jogo pode trocar): tudo vai pelo protocolo do navegador (`Runtime.evaluate`
numa sessão CDP, `openProbe`). O texto da página e a regra em JavaScript (`script`, etapa 4) rodam
num MUNDO ISOLADO (o mesmo documento, sem os globais nem os protótipos do jogo); a regra recebe uma
FOTO em JSON do jogo depois dos passos (`jogo`: as variáveis no clássico, pelo `names()` do leitor,
ou o estado do kit no Pro), `texto` (`null` acima de 50 mil letras) e `console` (a lista das linhas),
com 3 s de prazo. Falha do próprio protocolo é falha do executor, nunca "não passou".
⚠️ A rota exige a imagem nova (o script entra no `Dockerfile`): reconstrua e implante o Worker
antes de ligar os objetivos de execução no Members.
## Inspeção Python interna

As rotas abaixo exigem `Authorization: Bearer <INTERNAL_TOKEN>` antes da leitura do corpo ou do catálogo. Não são chamadas diretamente pelo navegador. Precisam de `STUDIO_PYTHON_DISTRIBUTIONS_SHA256`, catálogo íntegro em `PRO_ARTIFACTS`, `PYTHON_INPUTS` privado, `PythonInspectionJobs` e `PYTHON_UPLOAD_RATE_LIMITER`. Wrangler liga inputs e previews ao bucket privado de artefatos com prefixos separados. Isso não aprova releases nem configura a origem pública do serviço. Os consumidores completos do estúdio ainda estão em integração.

As rotas de retirada de inputs/previews conservam autenticação e coordenação próprias e continuam disponíveis quando o catálogo é retirado ou fica inválido, permitindo encerrar trabalho e limpar recursos.

- `POST /v1/python/inputs`: recebe `StudioPythonInputOpenSchema` (metadata, owner opaco derivado pelo BFF, executionId e requestId UUID). Retorna `{ok:true,input:<StudioPythonInputReference>}`. Até 2 MB de metadata; os arquivos mantêm o limite agregado de 32 MiB do contrato Python. Não há bytes/base64, URLs ou chaves de bucket no JSON.
- `POST /v1/python/files/<sha256>`: recebe bytes binários originais no corpo, com a referência JSON em `X-Studio-Python-Input` (até 2048 bytes UTF-8). Só aceita hashes e tamanhos registrados; verifica o stream e o checksum R2. Não executa código.
- `POST /v1/python/inspect`: recebe a referência como JSON. Resolve a distribuição exata aprovada e o upload completo; fornece os streams verificados ao SDK em `transport:'rpc'`, em contêiner exclusivo sem internet. O compilador usa `compile(bytes, path, 'exec')` para produzir o relatório vinculado à revisão e à versão efetiva do CPython; não executa imports ou código do aluno. Erros de sintaxe aparecem no relatório com `status:'failed'`. Esse relatório não é autorização nem prova de playtest.
- `POST /v1/python/validate`: recebe `{version:1,input,structure,recipe,preview?}`. Compila e depois executa no player CPython protegido, em duas fases no mesmo sandbox. Receita e opção de preview são imutáveis para o input. Compilação recusada não inicia execução. O relatório limita-se a 3 MiB; a resposta admite mais 8192 bytes para o envelope e a referência de preview. A evidência não substitui a autorização contextual do BFF.
- `POST /v1/python/previews/remove`: recebe a referência de input e persiste a retirada do preview no coordenador, mesmo quando a configuração de runtime foi retirada. Não exige que o cliente tenha recebido a URL. O BFF chama esta operação quando recusa uma resposta, inclusive na autorização final após a limpeza. Repetições não reabrem o job.
- `POST /v1/python/inputs/remove`: recebe a referência e encerra sua geração. Retries são idempotentes enquanto o admission permanece válido; remove os bytes daquela geração e preserva admission/closure até o lifecycle. Reabrir uma solicitação encerrada exige um requestId novo.

Inputs expiram em 15 minutos, independentemente de limpeza física. Cada geração tem UUID emitido exclusivamente pelo serviço; bytes e fechamento usam `python-inputs/<inputId>/<generation>/...`. Admission imutável fica em `python-input-states/<inputId>.json`. Se o lifecycle já retirou um admission e o mesmo nonce for reutilizado, a geração nova terá outro namespace: GC ou remoção atrasados nunca apagam arquivos/registro novos. A revisão, projeto, owner, execução, geração e validade da referência são conferidos; retries de open preservam a geração vencedora de `onlyIf`.

O rate limiter de jobs existente aplica até dez admissões/inspeções por minuto por owner estável; o binding separado de transferências permite 120 uploads/remoções por minuto. Nonces e executionIds aleatórios não mudam a chave do limite. A autorização e o controle de concorrência do job no BFF continuam obrigatórios; o token S2S não substitui permissão de aluno, curadoria ou vínculo de aula/sala. O BFF deve conferir projectId contra o job autorizado e revalidar contexto antes do envio e antes de aceitar/aplicar o resultado. O Worker recusa alterações de configuração, token ou bindings observadas nas suas fronteiras assíncronas e revalida runtime/input antes de devolver um relatório.

Configure lifecycle de **um dia somente para `python-inputs/` e `python-input-states/`**, nos buckets de cada ambiente. Essas regras removem órfãos de upload/cancelamento, closures e admissions; não devem abranger arquivos permanentes nem `maintenance/`. A configuração de lifecycle pertence ao bucket e não é aplicada automaticamente por editar Wrangler. O cron percorre até cem admissions por chamada, com prazo de 25 segundos e cursor persistido em `maintenance/python-input-cursor.json`; só avança depois de exclusões confirmadas. Erro transitório de leitura/exclusão repete a página; metadata comprovadamente inválida é contabilizada sem dirigir exclusões. Acompanhe falhas do cron e `failed` maior que zero; logs não contêm código, tokens ou referências individuais.

Estas rotas estão preparadas no código, mas ainda exigem provas reais de R2/Cloudflare SDK e integração dos consumidores antes de ativação. Os testes de transporte em memória não substituem essa qualificação.

## Preview Python protegido

### Configuração do Construir Python no BFF

Nos aplicativos Community e Community Kids, o shell compartilhado seleciona o executor pela linguagem persistida do projeto. `STUDIO_PRO_RUNTIME_URL` e `STUDIO_PRO_RUNTIME_TOKEN` continuam configurando JavaScript. Python usa os quatro valores opcionais `STUDIO_PYTHON_RUNTIME_URL`, `STUDIO_PYTHON_RUNTIME_TOKEN`, `STUDIO_PYTHON_LANGUAGE_URL` e `STUDIO_PYTHON_LANGUAGE_TOKEN`; todos precisam estar presentes para disponibilizar Construir Python. Cada token tem pelo menos 32 caracteres e corresponde ao `INTERNAL_TOKEN` do respectivo serviço no mesmo ambiente. São segredos de servidor, sem prefixo `NEXT_PUBLIC_`. Use HTTPS em produção; HTTP só é admitido explicitamente em loopback no desenvolvimento.

Members também precisa do par `STUDIO_PYTHON_RUNTIME_URL`/`STUDIO_PYTHON_RUNTIME_TOKEN` para sua política e validação. Mantenha a mesma origem do compilador nos consumidores e na política de hosts. O serviço de linguagem é separado do compilador; sua ausência não autoriza ignorar Pyright. A configuração não concede acesso ao produto, ao nível Pro, a uma release nem às extensões: a política atual é reavaliada ao criar, validar, renovar, abrir a prévia e aplicar a proposta. A indisponibilidade de um serviço Python não desativa o provedor JavaScript configurado. A habilitação remota permanece sujeita à qualificação e à implantação próprias do ambiente.

Exige `PYTHON_PREVIEWS`, uma release aprovada que inclua `standalone.mjs`, o coordenador e `STUDIO_PYTHON_PREVIEW_ORIGIN` com a origem HTTPS real do serviço (HTTP apenas em loopback). A origem deve ser distinta dos aplicativos e estar acessível pelo navegador. Configure-a explicitamente por ambiente; o código não adivinha domínios. Os aplicativos autorizados continuam definidos em `parentOrigins` do catálogo fixado por `STUDIO_PYTHON_DISTRIBUTIONS_SHA256`.

O produtor usa os mesmos arquivos verificados e a mesma revisão da validação. Aguarda a destruição confirmada do sandbox antes de armazenar o preview. Grava `python-preview-records/<id>.json` primeiro para permitir a coleta de uploads incompletos; arquivos ficam em `python-previews/<id>/files/` e o marcador completo é o último write. O runtime/WASM compartilhado não é copiado. Projeto, payload, relatório, captura e launcher têm cotas independentes das cotas JavaScript; nenhuma cota JavaScript aumenta.

`GET/HEAD /v1/python-previews/<id>/<arquivo>` só entrega bytes íntegros, dentro de 24 horas e com decisão persistida `succeeded`, sandbox limpo e preview não retirado. Consulta a decisão novamente depois das leituras de armazenamento. Um marcador R2 sozinho não concede acesso. Jobs com preview preservam a decisão até seu deadline mais 24 horas; isso não prolonga os 15 minutos dos inputs. A remoção normal de inputs depois de um resultado aceito preserva o preview; o descarte explícito o retira. Falha de verificação final também provoca rollback físico, conservando o registro de GC para writes incertos.

Somente o launcher estático gerado pelo serviço recebe permissão de script. O iframe externo confiável usa `allow-scripts allow-same-origin allow-downloads allow-forms`, conforme a constante compartilhada `STUDIO_PYTHON_PREVIEW_SANDBOX`, em origem distinta do aplicativo; `form-action 'none'` impede envio de formulários à rede. O frame interno Python permanece opaco, sem `allow-same-origin` ou `allow-forms`. Fontes HTML/JS/SVG do aluno são entregues como `application/octet-stream`, attachment e CSP restritiva. A política de ancestrais do runtime contempla o serviço e os aplicativos aprovados. Não aplique essas permissões ao iframe JavaScript legado.

O cron usa `maintenance/python-preview-cursor.json` separado, até cem registros e 25 segundos por execução. Registro inválido é contado e não dirige exclusões; falhas operacionais repetem a página. Se usar lifecycle como proteção adicional, aplique pelo menos dois dias apenas a `python-previews/` e `python-preview-records/`. Nunca inclua runtimes compartilhados, publicações do Mural ou `maintenance/` nessa regra. A implantação remota e a ativação do catálogo continuam separadas das provas locais.

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

### CSP dos aplicativos que incorporam Python

Admin, comunidade adulta e Kids precisam configurar, antes do build Next, `STUDIO_PYTHON_FRAME_ORIGINS` como uma lista JSON das origens públicas exatas dos runtimes aprovados em `STUDIO_RUNTIME_HOSTS_JSON` do Members. Exemplo: `["https://python-runtime.exemplo.com"]`. A allowlist acrescenta somente `frame-src` e `connect-src`, para o iframe isolado e o carregamento autenticado por hash dos recursos imutáveis; não concede autorização de execução nem libera scripts arbitrários. Não use tokens, credenciais, curingas ou caminhos. HTTPS é obrigatório em produção; localhost HTTP só em desenvolvimento. Alterações exigem novo build para atualizar os headers. A URL privada do executor e o serviço de análise continuam configurações independentes.

### Preparação e upload imutável Python para staging

O comando `scripts/promote-python-runtime.ts` consome uma distribuição **já construída e qualificada**. `prepare` é inteiramente offline: não importa Wrangler, não resolve credenciais, não reconstrói e não baixa artefatos. `upload` usa o binding R2 nativo remoto, com a configuração isolada do bucket `sistemazero-studio-artifacts-staging`; nunca instala um endpoint de upload. Nenhuma fase altera variáveis remotas, ativa catálogo ou implanta aplicações.

O input público tem este formato (substitua conta, diretório e origens pelos valores reais de staging; o SHA identifica a distribuição J-CI qualificada):

```json
{
  "version": 1,
  "environment": "staging",
  "target": {
    "accountId": "00000000000000000000000000000000",
    "bucketName": "sistemazero-studio-artifacts-staging",
    "runtimeOrigin": "https://python-runtime.staging.example",
    "parentOrigins": [
      "https://admin-staging-f8fe.up.railway.app",
      "https://community-staging-66f2.up.railway.app",
      "https://community-kids-staging.up.railway.app"
    ]
  },
  "distribution": {
    "directory": "./distributions/996e6097c599d21c5d92fc7e9f03145f155d080a2d83f6d4aaa6a25785c0afd7",
    "sha256": "996e6097c599d21c5d92fc7e9f03145f155d080a2d83f6d4aaa6a25785c0afd7"
  },
  "release": {
    "profileId": "python-browser",
    "releaseId": "2026-10-19-1",
    "capabilities": ["edit", "execute", "publish", "export-source", "python-repl", "assist"]
  },
  "baseline": {
    "worker": null,
    "members": null,
    "hosts": [],
    "previewOrigin": null,
    "frameOrigins": { "admin": [], "community": [], "community-kids": [] }
  }
}
```

`distribution.directory` é absoluto ou relativo ao **arquivo de input**. A lista de capacidades deve corresponder à qualificação e aos serviços a implantar; não concede permissões de usuário. A identidade permanente não deve conter identificadores de QA/probe e não muda entre ambientes ao promover os mesmos bytes. O SHA da distribuição é o SHA do JSON canônico de `distribution.json`, não o SHA do arquivo formatado. O manifesto da release contém também identidade e capacidades e recebe **outro SHA**.

`baseline` precisa conter os snapshots públicos anteriores: `worker` é o JSON completo do objeto R2 identificado pelo SHA atualmente implantado em `STUDIO_PYTHON_DISTRIBUTIONS_SHA256`; `members`, o de `STUDIO_AUTHORING_POLICY_JSON`; `hosts`, o de `STUDIO_RUNTIME_HOSTS_JSON`; `previewOrigin`, o valor de `STUDIO_PYTHON_PREVIEW_ORIGIN`; cada lista em `frameOrigins` vem de `STUDIO_PYTHON_FRAME_ORIGINS` do aplicativo correspondente. Verifique o SHA dos bytes do snapshot Worker antes de usá-lo. `null` e listas vazias só representam ausência previamente conferida. Não substituir configurações existentes pelo exemplo vazio e não incluir `.env`, tokens ou outras variáveis no input.

Da raiz do repositório:

```text
bun packages/studio-runtime/scripts/promote-python-runtime.ts prepare --input staging-promotion-input.json --out staging-promotion-plan.json
bun packages/studio-runtime/scripts/promote-python-runtime.ts upload --plan staging-promotion-plan.json --expect-plan-sha256 SHA_EXATO_DO_RECIBO_PREPARE
```

`prepare` recusa symlinks/junctions, escape de diretório, hashes/tamanhos diferentes, gzip incompatível, identidade já vinculada a outros bytes e configurações inconsistentes. A saída é criada exclusivamente: repetir aceita somente o mesmo plano. O plano inclui `baselineSha256`, `configurationSha256`, `authoringCatalogSha256`, `planSha256`, os dois manifestos e o prefixo `runtimes/<SHA-da-release>/`. `workerCatalog` fixa SHA, chave R2 e tamanho do JSON canônico de `configuration.worker`; `workerBindings` contém somente SHA e origem de preview, com limite de 5KB por valor. Blocos, dependências e categorias vêm dos codecs Programação/Turtle do código atual. Alterar o catálogo ou qualquer campo derivado exige preparar outro plano; os planos antigos que usavam JSON inline são históricos e não passam na revalidação atual.

`upload` revalida todo o plano e os arquivos **antes de conectar**, depois revalida os bytes durante a gravação. A autenticação Cloudflare é fornecida ao processo pelo ambiente operacional normal do Wrangler, sem passar tokens nos argumentos ou no plano. O proxy tem somente um binding R2 `remote: true`, sem persistência local nem arquivos de variáveis; é encerrado também em caso de erro. O armazenamento aplica SHA256 nativo e `onlyIf.etagDoesNotMatch: '*'`: arquivos da distribuição → `complete.json` → catálogo imutável. Conflitos exigem tamanho/checksum idênticos; para o catálogo, também leitura e SHA dos bytes. Falhas preservam os objetos já existentes; repetir completa um upload parcial. Se só o catálogo falhar, a distribuição completa permanece e a nova tentativa acrescenta apenas esse objeto. O recibo inclui o descriptor `workerCatalog`, hashes, prefixo e contagem/bytes dos arquivos, sem credenciais. Não usar `r2PutObject`, metadata autoral ou ETag como substituto do checksum nativo.

Após revisar o plano, a aplicação operacional altera **somente** as variáveis abaixo, preservando todas as demais:

| Campo do plano | Destino |
| --- | --- |
| `workerBindings.STUDIO_PYTHON_DISTRIBUTIONS_SHA256` | Worker: `STUDIO_PYTHON_DISTRIBUTIONS_SHA256` |
| `workerBindings.STUDIO_PYTHON_PREVIEW_ORIGIN` | Worker: `STUDIO_PYTHON_PREVIEW_ORIGIN` |
| JSON de `configuration.members` | Members: `STUDIO_AUTHORING_POLICY_JSON` |
| JSON de `configuration.hosts` | Members: `STUDIO_RUNTIME_HOSTS_JSON` |
| JSON de cada `configuration.frameOrigins[aplicativo]` | Admin, Community e Kids: `STUDIO_PYTHON_FRAME_ORIGINS` antes do build |

Conferir novamente o baseline remoto antes dessa aplicação; se mudou, regenerar o plano. Esse hash documenta uma precondição, **não oferece CAS ou transação entre Railway e Cloudflare**. O comando existente `scripts/ci/railway-config.mjs` gerencia build/deploy/source e não aplica essas variáveis. A sequência é: upload e prova de integridade no R2 real → Worker/configuração e serviços Python → builds dos aplicativos com CSP → Members com catálogo/hosts por último. As URLs e segredos dos serviços de execução/análise continuam pré-requisitos separados; não aparecem no pacote público.

JavaScript continua padrão, sem flag temporária. Python torna-se opção pelo catálogo ativo; projetos Python vazios continuam sem extensões instaladas. Turtle aprovado não significa Turtle obrigatório. O comando preserva releases, origens e estados anteriores (`active`, `retired`, `revoked`) e não reativa uma release. Rollback não remove objetos/referências de projetos existentes. O código pode ser integrado antes desse lote de infraestrutura, mantendo Python indisponível por ausência de configuração.

Os testes locais `bun test ./packages/studio-runtime/tests/python-promotion.test.ts` validam plano, CLI e armazenamento com transporte em memória, sem conectar R2. O typecheck canônico da raiz é `bun run --filter @sistemazero/studio-runtime typecheck`: cobre os projetos de tipos de produção e testes, incluindo fixtures SDK e scripts importados pelos testes. Verificações limitadas a arquivos não substituem esse comando.

Em 19/10/2026, `.cache/studio-python-l0/staging-python-distribution-upload-r2-receipt.json` registrou upload real **sem ativação** do plano `9dba63e7123b8592466689f7ed7051c9e69faf036516e0280d29828caf43e62f`: distribuição J-CI `996e6097…`, release permanente `562047803…` e catálogo `40ce822a…` de 12.857 bytes. Os hashes completos estão no [plano de promoção](../../docs/superpowers/plans/2026-10-19-studio-python-runtime-promotion.md). O recibo confirma a gravação; leitura independente/replay e entrega pelo Worker implantado continuam gates próprios.

A prova local SDK `inspection-sdk/3e962322-4064-4935-8d36-c589bf8f5c23` passou com R2, ingress e InspectionJob reais, Turtle, preview e retirada persistente após reset. Usou release/catálogo de QA e fingerprint anterior `85b1ed90…`, por isso permanece preliminar para a imagem atual: repetir nominal/cancelamento após regenerar o perfil e reconstruir a imagem. O upload e a prova local não ativam Python nem substituem implantação Worker/serviços, CSP dos aplicativos e catálogo Members por último.
