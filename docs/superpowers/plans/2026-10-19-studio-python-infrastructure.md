# Infraestrutura Python em staging e produção

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Provisionar e configurar a infraestrutura Python dos dois ambientes por CLI, preservando JavaScript, credenciais existentes e a separação de dados.

**Architecture:** Railway hospeda os aplicativos e Members; execução e análise Python usam os Workers/Containers Cloudflare já definidos no repositório. R2 guarda distribuições imutáveis e dados temporários isolados por ambiente. Configuração pública e segredos têm canais separados; configuração do catálogo não substitui implantação e validação.

**Tech Stack:** Railway CLI5.62.1, Wrangler4.120.1, Sandbox0.10.3, Bun1.3.11, Node24, R2, Durable Objects.

**Spec:** `docs/plans/2026-10-16-estudio-javascript-python-turtle-proposta.md`; `docs/superpowers/plans/2026-10-19-studio-python-runtime-promotion.md`.

## Restrições globais

- Autorização de19/10: configurar infraestrutura em staging e produção; publicação do código da plataforma em produção continua após validação em staging, conforme orientação anterior.
- Projeto Railway415d5a1c-5f75-432c-8445-b395d0977ce3; stagingf634cff6-aafb-4804-8b69-172fad4e946e; produção19c212a5-85c0-493c-9630-a7a0569e8412.
- Conta Cloudflarebcc0f2d44140e05b69152cba326132f8; buckets `sistemazero-studio-artifacts-staging` e `sistemazero-studio-artifacts`.
- JavaScript é padrão; nenhuma flag temporária. Não remover configurações, objetos, releases ou credenciais existentes. Não copiar segredos entre ambientes.
- Não expor valores secretos em argumentos, logs ou planos. Usar stdin/ambiente de processo e registrar somente presença/identidade pública.
- Infraestrutura preparada e funcionalidades ativadas são estados distintos. Não declarar Python disponível sem serviços, CSP, catálogo e provas integradas.
- Não reimplantar automaticamente os aplicativos de produção nem promover staging para main como parte deste provisionamento.

## Lote1: inventário e reconciliação

Arquivos de referência: `.railway/variables.ts`, `packages/studio-runtime/wrangler.jsonc`, `packages/studio-language-service/wrangler.jsonc`; recibos operacionais em `.cache/studio-python-l0/`.

- [x] Capturar via CLI as versões/bindings/secrets presentes dos quatro Workers e variáveis públicas/presença de segredos nos aplicativos dos dois ambientes.
- [x] Conferir buckets, URLs e origens reais; comparar com configuração versionada sem presumir que ausência de implantação equivale a ausência de recurso.
- [ ] Revisar delta de recursos, custos/cotas existentes, rollback e sequência; documentar precondições dos componentes que exigem novo código.

## Lote2: distribuição e análise

Arquivos: scripts de promoção em `packages/studio-runtime/scripts/`, esquema de input e testes de promoção; build `packages/studio-language-service/runtime/server.ts` e Dockerfile.

- [ ] Concluir diagnóstico dos HTTP400 do proxy de leitura R2 e conferir bytes/checksums/marker/catálogo permanentes; preservar negativos, sem retry oculto.
- [x] Ampliar ferramenta de promoção para destino produção somente com vínculo explícito ambiente/bucket/origens; testar recusa de cruzamentos antes de upload.
- [ ] Reutilizar exatamente a distribuição qualificada nos dois ambientes, mantendo identidade da release e catálogos/origens específicos.
- [x] Compilar servidor de análise e validar imagem/health/autenticação; provisionar Workers separados e segredos próprios por ambiente, preservando os já existentes.

## Lote3: staging integrado

- [ ] Concluir CI/rollout acumulado3190→checkpoint, incluindo admissão e Jornada, antes de ativar catálogo Members.
- [ ] Implantar execução/análise, conferir bindings/limites, testar requisições autorizadas e recusas anônimas.
- [ ] Configurar URLs/tokens/CSP nos aplicativos, aplicar build correspondente e conferir headers reais.
- [ ] Aplicar catálogo/hosts Members por último; verificar novo projeto, Turtle, análise, publicar/jogar/remixar e regressão JS com autenticação real.

## Lote4: produção preparada

- [ ] Provisionar objetos e serviço de análise isolado; preencher variáveis novas necessárias preservando valores existentes e sem disparar deploy de aplicativos.
- [ ] Preparar configuração do runtime compatível com a versão atual; qualquer mudança que publique código novo no Worker compartilhado requer primeiro a prova integrada staging e revisão de compatibilidade com hosts de produção atuais.
- [ ] Manter catálogo de produção coerente com o código efetivamente implantado; registrar configuração preparada que dependa da futura promoção do código, sem apresentar funcionalidade ainda indisponível como ativa.
- [ ] Review completo dos dois ambientes, recibos sem segredos e lista explícita de implantação versus provisionamento versus ativação.

## Estado operacional registrado

Atualização final de análise: fonte revisada passou34testes/208asserções, três tsconfigs, Biome26 e dez controles RPC no workerd real. Getter de diagnóstico que lança não impede cleanup, watchdog do teste mantém liveness sem alterar timeout produtivo e cleanup do harness preserva erro primário. Após essa fonte final, staging7d5d2de1-5f78-4896-9d16-02052ed119d5 e produção032069e6-2a7d-4914-b44f-915d34aa7678 passaram12/12 controles reais, com cleanup/410 e sem executar Python. Recibos finais `staging-python-language-qualified-20261019-r7.json` e `production-python-language-qualified-20261019-r2.json`. Catálogo e aplicativos continuam pendentes de rollout/validação; não confundir os serviços isolados com disponibilização completa.

Compatibilidade de produção: member-shell em origin/main6f93dcbf... ainda envia contrato antigo sem parentOrigin e lê html; runtime novo devolve artifact. O Worker compartilhado de produção permanece e9872269... até implantação coordenada posterior à prova staging, preservando JavaScript atual. Os probes mínimos R2 passaram em staging (quatro braços) e produção somente leitura (dois braços), sem reproduzir400; interleaving negativo do operador segue preservado e sem causa demonstrada. Upload produção permanece incompleto.

Em19/10, Railway recebeu17variáveis novas staging e19produção, por stdin e `--skip-deploys`, com leitura posterior e preservação de valores anteriores. Recibos `python-railway-{staging,production}-provisioned-20261019.json`. Catálogo/hosts Members ainda não foram ativados. Domínios produção foram confirmados ACTIVE via CLI, recibo `production-public-origins-20261019.json`.

Dois Workers novos de análise foram implantados e receberam credenciais próprias dos respectivos ambientes. Nos dois, anônimo recebeu401 e token correto em caminho desconhecido recebeu404; produção teve uma primeira conferência negativa preservada e uma segunda positiva sem rotação, sem causa demonstrada para o primeiro assert. A sessão remota inicialmente falhou porque AbortSignal não atravessa RPC na configuração suportada. A correção mantém cancelamento no DO executor por capacidade run/cancel, com dreno de corpo e retenção explícitos. Após review e provas locais, staging4e621c06... e produçãod5445e22... passaram os12controles reais open/start/sync/símbolos/Turtle/edição/stale/cleanup/410, sem executar fonte Python. Recibos `staging-python-language-qualified-20261019-r6.json` e `production-python-language-qualified-20261019-r1.json`. Isso não ativa o catálogo nem valida os aplicativos. Build da imagem e31testes/193asserções do serviço passaram.

O runtime staging foi implantado em82d58cc2-cfb0-4a71-b6aa-195fe589b863. Sua entrega real conferiu manifesto,27arquivos públicos por SHA/bytes/ETag e12representações internas recusadas, incluindo ancestrais do iframe: `python-staging-public-delivery-20261019.json`. Readback nativo R2 de41objetos também passou no observador transparente HTTP+WebSocket do SDK (`staging-python-r2-observed-20261019-r3.json`). Negativos do proxy direto, sem causa demonstrada, continuam preservados. Isso não qualifica editor, aula ao vivo nem desempenho.

O suporte produção no operador passou19testes/153asserções e typecheck canônico completo; o primeiro typecheck detectou somente fixture de bucket alargada para string, corrigida pela união literal real sem cast de resultado. O plano staging9dba63e7... permaneceu idêntico. Plano produção offline `production-python-promotion-plan-20261019.json`: SHA d4183cb682f187ce4c95bb01988f1a1614d7a97f826ab8cbeb692264376e1298, mesma distribuição996e6097.../release562047803..., catálogo6742f03c85bcde761b3df3bac4377e6bf2ffa359ac6572089f38532d1b8e601c de12.826bytes. Upload produção e revisão do Worker compartilhado ainda pendentes. A configuração versionada contém os dois descriptors; o Worker de produção permanece na versão anterior até a revisão/implantação coordenada.
