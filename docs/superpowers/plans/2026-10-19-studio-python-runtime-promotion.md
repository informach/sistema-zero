# Promoção do runtime Python por ambiente

**Objetivo:** preparar offline um pacote determinístico e subir a distribuição já qualificada por R2 nativo em staging ou produção, sem reconstrução, ativação automática ou upload HTTP público.

**Arquitetura:** `python-promotion-plan.ts` verifica artefatos e acrescenta a release às configurações anteriores. `python-promotion-r2.ts` usa `getPlatformProxy` com um único binding R2 remoto e o armazenamento imutável existente. `promote-python-runtime.ts` oferece `prepare` e `upload`; Wrangler só é importado no segundo caminho.

**Base:** proposta `docs/plans/2026-10-16-estudio-javascript-python-turtle-proposta.md`, contrato `packages/core/src/studio/python-runtime-distribution.ts` e `storePythonRuntimeDistribution`.

**Correção do limite operacional:** o catálogo real excede o [limite de 5KB por variável do Worker](https://developers.cloudflare.com/workers/platform/limits/#environment-variables). Guardar JSON canônico imutável em `runtime-configs/<SHA>.json` no `PRO_ARTIFACTS`; a única referência do Worker é `STUDIO_PYTHON_DISTRIBUTIONS_SHA256`. Não fragmentar variáveis nem manter fallback inline. A configuração completa permanece no plano offline.

- [x] Implementar leitura limitada a 2MB/10s, checksum nativo + SHA dos bytes + schema/deployments; compartilhamento/cache por bucket e digest, falhas removidas e cancelamento independente dos solicitantes.
- [x] Migrar ingress e InspectionJob, preservando fences de identidade/cancelamento. Atualizar fixtures com catálogo R2 e testes causais, sem reduzir verificações.
- [x] Acrescentar descriptor/bindings pequenos ao plano; subir distribuição e `complete.json` antes do catálogo imutável; revisar documentação e inventário de SHA. A implementação inicial foi local; o upload operacional posterior está registrado abaixo e não ativou o catálogo.

- [x] Implementar preparação e testes: SHA canônico da distribuição distinto do SHA da release; identidade permanente; arquivos sem symlinks/escape; gzip equivalente; configurações anteriores preservadas e conflitos recusados; blocos/categorias derivados do catálogo real.
- [x] Implementar upload e testes sem rede: plano pinado, bytes revalidados antes do proxy, bucket/conta/ambiente explícitos, binding `remote: true`, checksum/create-only/marcador final pelo armazenamento existente, encerramento em todos os caminhos.
- [x] Documentar formato público, comandos e sequência: upload → Worker/serviços → builds com CSP → Members por último. Conferir baseline antes de aplicar variáveis; o comando não aplica configurações remotas.
- [x] Executar testes direcionados e Biome. A primeira etapa também teve `git diff --check`; a correção do catálogo respeitou o índice separado, sem comandos Git. A revisão posterior executou o typecheck canônico do pacote; nenhum deploy é consequência automática desses gates.

JavaScript continua padrão. Python fica disponível pelo catálogo configurado, sem flag temporária. Turtle é uma extensão aprovada e opcional em projetos novos; o pacote não cria projetos ou conteúdo de aula. Releases e estados anteriores não são removidos ou reativados. O checkpoint de código pode ser integrado antes da configuração Python.

O adaptador nativo é suportado pela [API Wrangler](https://developers.cloudflare.com/workers/wrangler/api/#getplatformproxy), pelos [remote bindings](https://developers.cloudflare.com/changelog/post/2025-09-16-remote-bindings-ga/) e pelo [contrato R2](https://developers.cloudflare.com/r2/api/workers/workers-api-reference/). A matriz [S3](https://developers.cloudflare.com/r2/api/s3/api/) não comprova a equivalência do checksum nativo exigido; não substituir por PUT mutável ou metadata autoral.

**Estado operacional em 19/10/2026:** upload real concluído, sem ativação, conforme `.cache/studio-python-l0/staging-python-distribution-upload-r2-receipt.json` (`uploaded-not-activated`, `activationPerformed: false`). O plano novo é `.cache/studio-python-l0/staging-python-promotion-plan-r2-catalog-20261019.json`; o plano inline anterior continua histórico.

| Identidade enviada | SHA256 |
| --- | --- |
| Plano | `9dba63e7123b8592466689f7ed7051c9e69faf036516e0280d29828caf43e62f` |
| Distribuição J-CI | `996e6097c599d21c5d92fc7e9f03145f155d080a2d83f6d4aaa6a25785c0afd7` |
| Release permanente | `56204780388c78e8ecf978da984eca182ed4ac958e78c63a22ac286210ab7880` |
| Catálogo Worker | `40ce822aab07184da90bec7a0902296d4889c011740063be6c859bc5b60c57b2` |

O recibo registra 39 arquivos da distribuição, 22.327.910 bytes, mais `complete.json` e o catálogo de 12.857 bytes. O upload usa o inventário histórico `8f377332eb68ccfd3872fedc0a5058d91292fe7b37e92207ed0b80dce6d354f7`; revisões posteriores de documentação/testes não reescrevem esse recibo. Leitura independente dos objetos, replay do upload e entrega pela configuração implantada do Worker ainda são gates distintos; o recibo de gravação não comprova esses passos.

Os primeiros readbacks integrais foram negativos: `staging-python-r2-readback-20261019.json` verificou 11 objetos antes de falhar; `staging-python-r2-readback-full-r2-20261019.json`, um objeto antes de falhar em outra chave. Ambos registraram `get: Unspecified error (0)`. O readback isolado `staging-python-r2-readback-single-20261019.json` verificou os bytes e o checksum nativo do primeiro objeto que havia falhado. Esses recibos permanecem como evidência negativa; a sessão isolada não completa a qualificação dos 41 objetos nem demonstra a causa do erro de transporte.

**SDK preliminar:** `.cache/studio-python-l0/inspection-sdk/3e962322-4064-4935-8d36-c589bf8f5c23/result.json` registra exit 0, inspeção e execução Turtle aprovadas, duas execuções concluídas, sandbox destruído e cleanup confirmado. O preview resistiu ao reset do DO e à limpeza do input; o descarte permaneceu após novo reset. `cleanup.json` terminou com `after: []`. O snapshot contém ingress, loader, InspectionJob e fixtures com os mesmos SHAs da revisão, e lê o catálogo por R2 local real. Usou a distribuição J-CI, mas release QA `3dfa8881060bfb931202bc634f0e273f00b759692abac06d9e1cb5697bfa951d` e catálogo QA `3e540687179f87c10240543f7b39bcc7d0a0f1edb14d8ad1dab575f0d47e440e`; não é prova da release permanente no Worker remoto.

O manifesto desse preview registra fingerprint `85b1ed90d4727e67c791a6a7349a554715700201ffa645a56438ec374bd09b8c`, anterior ao perfil atual observado `b0f0247ce8b199f49a75fff4e35ea56b30121e4b781a44371ad915c9633d2d31`. Portanto, o resultado é preliminar: regenerar/conferir o perfil, reconstruir a imagem e repetir SDK nominal/cancelamento com os hashes finais. Essa execução não usou `--cancel-during-exec` nem `--restart-before-cancel`.

**Verificação local:** a rodada de storage/handler/promoção teve 38 testes, 241 asserções, zero falhas; controlador isolado, sete testes/60 asserções. Na revisão posterior, o typecheck completo revelou `NonSharedBuffer.equals` ausente no grafo WebWorker+Bun. A comparação gzip passou a usar comprimento e bytes de `Uint8Array`, sem casts ou mudança de dependências. A rodada de promoção após o ajuste passou com 12 testes/82 asserções, incluindo gzip válido com byte diferente, conteúdo mais curto e conteúdo maior. Biome dos dois arquivos alterados passou.

O comando canônico, executado com exit 0 após esse ajuste, é `bun run --filter @sistemazero/studio-runtime typecheck` na raiz: roda `tsc --noEmit` e depois `tsc --project tsconfig.test.json --noEmit`. O launcher foi Bun 1.3.11, sem `--bun`; o binário local resolve TypeScript 5.9.3 com shebang Node, e o Node disponível é 24.15.0. A segunda etapa inclui fixtures SDK e os scripts de promoção importados pelos testes; o typecheck anterior limitado a arquivos não substituía esse gate. O fingerprint/imagem, novos gates SDK e ativação coordenada permanecem separados. Members recebe catálogo/hosts por último.

**Extensão para produção em 19/10/2026:** a mesma ferramenta aceita apenas `staging` → `sistemazero-studio-artifacts-staging` e `production` → `sistemazero-studio-artifacts`. O refinement recusa pares cruzados antes de conectar; o nome do proxy deriva do ambiente e preserva o nome staging anterior. Conta, origens e baseline são explícitos por input. A identidade permanente, as capacidades e os artefatos qualificados são reutilizados; não há CLI paralela nem bypass das verificações de integridade, origem, colisão ou preservação dos estados anteriores.

- [x] Demonstrar RED com produção recusada pelo schema anterior; implementar enums e vínculo obrigatório ambiente/bucket; obter GREEN com 19 testes e 153 asserções.
- [x] Preparar e revalidar planos de fixtures isoladas nos dois ambientes; comprovar a mesma release/marker, catálogos próprios, preservação de metadados JavaScript e releases retiradas/revogadas, recusa de mudança de origem e colisão de identidade, escrita condicional e encerramento do adaptador.
- [x] Revalidar offline o plano staging real, mantendo o SHA exato `9dba63e7123b8592466689f7ed7051c9e69faf036516e0280d29828caf43e62f`; recibo em `.cache/studio-python-l0/python-promotion-production-offline-verification-20261019.json`. Nenhum acesso remoto nessa revisão.
- [ ] Executar o typecheck canônico após a extensão para produção, na janela coordenada com os outros pacotes.

Comandos, formato e pares permitidos estão no README do pacote. O plano operacional `2026-10-19-studio-python-infrastructure.md` coordena o inventário real e a aplicação por ambiente. Este lote não prepara um baseline de produção presumido, não faz upload/deploy e não altera o fingerprint do Runtime. A autorização para preparar infraestrutura em produção não antecipa a publicação do código da plataforma, que permanece condicionada à validação integrada de staging.
