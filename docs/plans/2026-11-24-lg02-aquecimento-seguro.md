# LG02 — plano de implementação

> Execução nesta sessão com `executing-plans`, seguindo o escopo já aprovado pelo usuário.

**Objetivo:** aquecer e reutilizar com posse exclusiva o executor JavaScript/Pro, corrigindo R12 e qualificando a entrega no executor real.

**Arquitetura:** cache limitado por classe física (10 máquinas gerais e 2 3D), com posse por perfil em SQLite e nomes/tokens por geração. Sobreposição usa contêiner exclusivo separado; só uma máquina comprovadamente limpa volta à vaga. A substituição de uma vaga expirada exige descarte confirmado.

**Tecnologias:** TypeScript, Cloudflare Durable Objects com SQLite, Sandbox SDK 0.12.12, Bun, Chrome real e Railway.

**Desenho:** [aquecimento seguro](2026-11-24-lg02-aquecimento-seguro-design.md).

## Restrições globais

- Base main/staging `538ae843b`; preservar o checkout local concorrente.
- Python fora do aquecimento. Preservar catálogos `2c53c74…` de produção e `05294b0…` de staging.
- Preservar correções LG01 e controles de Cenários/Regiões/prévia isolada/exemplos.
- Uma operação nunca destrói uma máquina que outra pode estar usando.
- Falhas no instrumento QA não criam métodos de teste nem rotas de falha no produto.

## 1. Reprodução e reserva persistente

Arquivos: `packages/studio-runtime/src/check-container.ts`, novos `check-sandbox-pool.ts` e `check-sandbox-pool-store.ts`; testes em `tests/check.test.ts` e novo `tests/check-sandbox-pool.test.ts`.

- [x] Restaurar somente as integrações de aquecimento da branch preservada `work/lg02-aquecimento-20261123`, conservando a fixture R11 e as correções posteriores da LG01.
- [x] Escrever uma regressão mínima do handler com duas verificações da mesma identidade: a falha destrói a máquina compartilhada e a outra resposta deixa de passar. Rodar e guardar o resultado vermelho.
- [x] Implementar a vaga SQLite com `acquire('check'|'warm')` e `release(lease, reusable)`, usando `{sandboxId, token, pooled}` e expiração que troca o nome do recurso.
- [x] Testar com SQLite real: duas aquisições, perfis/classes diferentes, reinício, expiração, liberação velha e reconhecimento perdido. Não basta verificar contagem de chamadas de mock.
- [x] Integrar o handler; provar resposta válida para a outra aba após execução/limpeza falha. A limpeza termina antes de devolver a reserva e não há destruição depois da tentativa de liberação reutilizável.

## 2. Integração do produto e imagem

Arquivos: `studio-runtime/src/index.ts`, `src/worker.ts`, `wrangler.jsonc`, `Dockerfile`, `runtime/check-warm.mjs`; caminhos já existentes de core, Members, Gateway, member-shell, Kids/Community e palco.

- [x] Declarar/exportar o novo coordenador e sua migração SQLite nos dois ambientes.
- [ ] Conferir autorização, revisão, identidade, intervalo e seleção 2D/3D de ponta a ponta. Conservar o caminho exclusivo da LG01 quando a coordenação não estiver disponível, registrando o motivo.
- [x] Regenerar o perfil da imagem pelos scripts do pacote; executar testes de contrato/capacidade, UI do cartão, serviços, BFF e tipos dos pacotes afetados.
- [x] Construir e conferir a imagem Linux com o script de aquecimento, usuário sem privilégios e rede de execução desabilitada.

## 3. Qualificação real e entrega

Instrumentos/recibos próprios de LG02, sem credenciais nos arquivos. Execução sobre projetos sintéticos e o perfil de homologação já indicado, sem enviar recados nem posts.

- [x] Publicar o runtime/imagem em homologação e repetir a prova R12 com duas abas reais, além de aquecimento sobreposto, limpeza falha e perfis diferentes.
- [x] Exercitar suspensão e capacidade; medir primeira verificação e repetições com amostra registrada e comparar com o caminho exclusivo.
- [ ] Passar CI completo e plano no head final; implantar a onda canônica de staging e percorrer a aula autenticada, incluindo recusas de sessão/acesso/revisão.
- [ ] Revisar entradas concorrentes e promover pelos PRs/fluxos canônicos somente com os critérios atendidos. Conferir sincronização de main/staging.
- [ ] Conferir runtime, catálogos, serviços, curso preservado e controles após a implantação. Atualizar o plano gradual com resultado e limitações efetivamente observados.

## Evidência local inicial

Antes da correção, as duas regressões R12 falharam: execução e limpeza destruíam a máquina da outra aba. Depois passaram os testes com a reserva persistente habilitada, inclusive a confirmação de uma reserva reutilizável e outra exclusiva na sobreposição.

A suíte completa do runtime passou: **434 testes, 56 pulados, zero falhas**, 4.646 expectativas. Os pulados dependem de habilitações/dados das suas frentes e não representam prova do executor hospedado. Também passaram 34 testes Members, 16 core, 60 Gateway, 11 wrappers/BFF do member-shell e 48 do palco. Os tipos do runtime e Members passaram; Members usou os mesmos 6.144 MiB de heap do CI. As primeiras execuções da suíte ampla registraram falta das dependências próprias do runtime e, depois, quatro timeouts locais durante concorrência com a compilação. Após instalar pelo lockfile e executar a suíte sem essa concorrência, ela passou sem mudar testes ou aumentar seu timeout. A referência main também passou os 51 testes Python de artefatos/promoção.

O `workerd` real passou a prova de 12 pedidos RPC concorrentes e persistência após reinício do Durable Object. A imagem `sistemazero-studio-runtime:lg02-20261124` passou o smoke (UID 1000, dependências protegidas, rede desabilitada), o comando de aquecimento e os objetivos 3D reais, incluindo as recusas esperadas. As tipagens geradas pelo Wrangler conferem o novo binding e a opção de interrupção. Isso ainda não qualifica a promoção: faltam o executor hospedado, falhas/capacidade/suspensão, percurso autenticado, CI remoto e ondas canônicas.

O instrumento hospedado será um Worker temporário separado de staging, com aplicações de contêiner próprias e teto de duas instâncias por classe. Ele usa o mesmo código/imagem e acrescenta somente controle QA autenticado: uma barreira após as duas máquinas estarem prontas, falhas por comandos reais no contêiner e descarte dos recursos sintéticos. A capacidade reduzida permite exercitar a recusa sem ocupar o teto do serviço usado por outras frentes. Não é uma medição de carga de dez instâncias 3D. As rotas QA não fazem parte do entrypoint de produção.

## Achado adicional na capacidade hospedada

A versão inicial `62553c6d4` passou os casos básicos reais, mas falhou ao admitir outro perfil com as duas vagas QA ocupadas por máquinas ociosas: o aquecimento retornou 500 em 139.992 ms e a verificação nova retornou 500 em 139.640 ms. O instrumento tinha teto de duas instâncias gerais; os recursos sintéticos foram descartados após a prova. A regressão SQLite também reproduziu a ausência de limite compartilhado entre perfis.

A correção limita o cache por classe física, preserva capacidade para o caminho exclusivo e exige descarte confirmado antes de substituir uma vaga expirada. O estado de retirada invalida a posse anterior e permanece contado mesmo quando a destruição falha. O cache QA será reduzido a uma vaga dentro do teto de duas instâncias; os tetos normais 50/10 permanecem. A qualificação hospedada deve ser repetida sobre o novo head, incluindo o novo perfil sob ocupação ociosa, antes de promover.

Após essa correção, a suíte completa passou novamente: **438 testes, 56 pulados, zero falhas**, 4.676 expectativas. A prova nativa inclui o limite compartilhado entre perfis, além das 12 aquisições concorrentes e do reinício. Os tipos de fonte/testes passaram. A imagem `sistemazero-studio-runtime:lg02-bounded-20261124`, manifesto `sha256:e40f0f5252498bed390568b32ba0c8c688fc276bfbd06ffcafdd5d3a5dc31d83`, passou o smoke com UID 1000, dependências protegidas, rede desabilitada, o comando de aquecimento e os objetivos 3D reais. A promoção continua pendente das provas hospedadas finais.


As tentativas seguintes expuseram um erro no instrumento QA: o proxy tentava usar `.bind()` em métodos RPC nativos, quebrando a destruição e deixando contêineres ativos. A hipótese anterior de demora do agendador foi descartada para esses resultados. Uma reprodução mínima no workerd mostrou o erro “The RPC receiver does not implement the method bind”; o encaminhamento por `Reflect.apply` passou. A regressão foi incorporada à prova nativa do instrumento. As provas de falha e descarte anteriores à correção do proxy são diagnósticas e devem ser repetidas antes da qualificação. A política de dispensar novos aquecimentos quando o cache está cheio permanece como escolha de admissão para evitar criar gerações desnecessárias.

A política final de admissão passou a suíte completa: **439 testes, 56 pulados, zero falhas**, 4.680 expectativas. Tipos de fonte/testes aprovados. A imagem `sistemazero-studio-runtime:lg02-admission-20261124`, manifesto `sha256:3de10b8df72e5cb05b261f8a531a6ae8e4f0e7b811d1974aa2a8998ba175032d`, passou smoke e aquecimento sem rede. Fingerprint `fb288b9080415e788bf28949583aea4a8f66037692b4de26c357858b5675e13a`. As provas hospedadas finais usarão um perfil QA estável, preservarão a máquina reutilizável entre cenários e conferirão a capacidade observada no ambiente QA antes das provas que precisam de duas instâncias. As esperas serão registradas e não compõem as medidas de latência isolada; não qualificam throughput ou recuperação imediata sob saturação.

O instrumento corrigido passou 58 testes focados (296 expectativas), incluindo a regressão RPC executada no workerd: o encaminhamento antigo por bind falhou e o novo por Reflect.apply passou. Os tipos de fonte/testes passaram. A imagem de verificação correspondente é `sistemazero-studio-runtime:lg02-rpc-20261124`, manifesto `sha256:be05fafd0f58a8db11de56c9e6dad9e2db070e0f6c3eb0d891dcaaadc62cc039`, fingerprint `93b91fba78f84c82beca3bcf03efab1e998aa7f641f576c803eacbb6fc18aa27`; smoke e comando de aquecimento aprovados sem rede. O descarte direto no SDK deixou a aplicação QA sem instâncias ativas, confirmando a contenção da falha no proxy. As matrizes hospedadas serão repetidas com esse instrumento.

## R16 — RPC encerrado durante provisionamento

Depois da correção do proxy QA, a prova de capacidade registrou uma falha distinta: `RPCTransportError: RPC session was shut down by disposing the main stub`, após recusa de provisionamento. O SDK 0.10.3 instalado desconecta o cliente incondicionalmente em `onStop`. O mantenedor confirmou a correção desse ciclo em 0.12.12, no [issue 928](https://github.com/cloudflare/sandbox-sdk/issues/928) e [PR 1010](https://github.com/cloudflare/sandbox-sdk/pull/1010).

A candidata passa a fixar 0.12.12 no runtime, no binário copiado para a imagem e na prova Linux, com teste de coerência dessas versões. O lockfile conserva as demais versões; só entra o Hono exigido por esse SDK. O serviço de linguagem mantém sua dependência anterior e usa o transporte HTTP padrão, sem a configuração RPC envolvida nesse defeito. Não há mudança nos catálogos ou liberações Python nem nos tetos das instâncias.

A suíte completa passou com o SDK novo: 440 testes, 56 cenários condicionais pulados, zero falhas e 4.683 expectativas. Tipos de fonte/testes, Biome e coerência do perfil passaram. A imagem `sistemazero-studio-runtime:lg02-sdk01212-20261124`, manifesto `sha256:2bff6dacad67f4890c9b69242bc5d83d6f02473489b346d5de390b24a295488a`, passou smoke, aquecimento sem rede e inicialização do binário `/sandbox`, com UID 1000 e porta TCP 3000 pronta. Fingerprint `b0e3c675af3cad13d368c6a5dd39388b65f5fd63bacd2aa7ca2b406ab109a98c`. A prova hospedada ainda está pendente. As tentativas de capacidade do SDK anterior permanecem registradas como falhas; não contam como aceite da candidata corrigida.

## Qualificação hospedada da candidata a36520659

A matriz final passou na imagem nova: aquecimento/recuperação, duas abas válidas, falha de execução e de limpeza na posse reutilizável, aquecimento sobreposto, perfis novos sob cache cheio, compilação Pro e erro de sintaxe, navegação 3D dedicada, suspensão observada na API e confirmação de liberação perdida. As aplicações e o Worker QA foram removidos após o descarte dos recursos sintéticos. [Recibo e limitações](../qa/2026-11-24-lg02-aquecimento-seguro.md), com evidências estruturadas da fonte exata.

Dez amostras por caminho deram medianas de 7.682,5 ms no caminho exclusivo e 3.497 ms com reutilização, para HTML pequeno. As esperas de capacidade são separadas da latência. Não é prova de carga ou promessa para jogos grandes. No percurso infantil do Farol, o projeto inicial reprovou corretamente e a versão com o movimento passou os cinco objetivos em 30.843 ms; a primeira tentativa retornou indisponibilidade e permanece registrada. O runtime normal de staging passou compilação com validação e verificação reais. CI, atualização dos aplicativos, aceite autenticado da fonte final e produção ainda estão pendentes.
