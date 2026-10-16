# Echo e evolução do Helpdesk do Sistema Zero

Data: 15/10/2026. Status: análise e proposta, sem implementação no produto.

Referência: `C:/Users/tocha/Downloads/next15-echo-main/next15-echo-main`.
Produto comparado: `packages/helpdesk`, `packages/helpdesk-app`, `packages/helpdesk-contracts`, portal compartilhado e componentes de conhecimento do Zappy.
Prioridade indicada pelo usuário: **automatizar o atendimento com IA e base de conhecimento**.

**Atualização após review:** a [proposta revisada](../docs/plans/2026-10-15-helpdesk-ia-kb-proposta-revisada.md) é o desenho vigente; este relatório preserva a análise e as evidências do repositório.

## 1. Recomendação

Evoluir o Helpdesk existente com uma base de conhecimento rastreável e atendimento automático gradual no portal. Aproveitar do Echo os conceitos de busca em documentos, conversa contínua, sugestões iniciais e transferência para a equipe. Preservar a arquitetura, identidade, integração Gmail, fila, SLA e garantias de entrega já construídas no Sistema Zero.

O maior investimento deve estar na qualidade do conhecimento, na recuperação do trecho correto e na avaliação das respostas. Uma interface de chat melhora a experiência, mas não corrige uma IA que recebe contexto incompleto ou não consegue justificar a resposta.

Há dois resultados concretos desta investigação que devem orientar a primeira entrega:

1. **A montagem do contexto da IA exclui mensagens do portal.** A reprodução local confirmou que o mesmo conteúdo entra como e-mail e desaparece como mensagem do portal.
2. **A seleção da KB pode escolher o artigo certo e excluir a resposta.** O código pontua o artigo inteiro, mas envia apenas seu início quando atinge o orçamento de caracteres. Isso também foi reproduzido.

O Echo tem uma falha relevante de autorização em mensagens públicas, confirmada no fluxo dos handlers com dependências simuladas. Não é uma base pronta para substituir o produto atual.

## 2. Método, cobertura e limites

Inventário estático de **197 arquivos de código/configuração do Echo**, **122 do backend Helpdesk**, **60 do console** e **3 do contrato compartilhado**. O inventário contém caminho, hash, imports e exports de cada arquivo: [source-inventory.json](./echo-helpdesk-2026-10-15/source-inventory.json). Arquivos gerados de Convex, declarações `.d.ts`, dependências e assets não entram nessa contagem. A varredura sintática não apresentou erros.

A leitura aprofundada concentrou-se nos fluxos de atendimento, autenticação, persistência, IA, busca, ingestão de documentos, interface e integração. O inventário de todos os arquivos não significa revisão manual de cada linha dos componentes genéricos de UI. Foram consultados também os guias locais, o desenho de remediação de setembro e fontes técnicas oficiais.

Verificações executadas:

- 24 testes existentes de prompts, seleção de KB, serviço de IA e worker: **24 passaram, 0 falharam**, 58 asserções.
- Reprodução isolada da omissão do portal, usando a função real do produto.
- Reprodução isolada do corte do trecho relevante da KB, usando a função real do produto.
- Execução dos handlers reais do Echo em sandbox local, com sessões/conversas sintéticas e serviços simulados, para verificar ausência de vínculo sessão–thread.
- Análise de grafo via Octocode: nenhum ciclo encontrado no backend Helpdesk, com 122 arquivos e imports internos resolvidos. No Echo o resultado é parcial por resolução incompleta de aliases/exports; não foi usado como prova de ausência de ciclos.

Não foram acessados tickets reais, dados de produção ou credenciais. Não foram executadas chamadas reais de LLM, Gmail, Clerk, Vapi ou Convex. O Echo está sem dependências instaladas nesta cópia; seu build e sua interface em execução não foram validados. A análise de UX é derivada do código. Não foram medidos volume, custos, qualidade real das respostas ou latência de produção.

Os scripts iniciais de reprodução retornaram código 1 para demonstrar a violação do comportamento esperado. O [script de evidências](./echo-helpdesk-2026-10-15/reproduce.ts) reúne os cenários e retorna sucesso quando os três achados continuam reproduzíveis. Nenhuma correção foi aplicada.

## 3. O que o Echo realmente implementa

| Parte | Responsabilidade observada | Valor para o Sistema Zero |
|---|---|---|
| `apps/web` | Console Next.js 15/React 19, organizações Clerk, conversas, arquivos, customização, cobrança e Vapi | Referência de navegação e operação de conversas |
| `apps/widget` | Aplicação Next.js separada, sessão de contato, histórico, chat, sugestões e voz | Referência para autoatendimento dentro do produto |
| `apps/embed` | Script Vite que monta botão flutuante e iframe | Útil se houver necessidade futura de suporte em sites externos |
| `packages/backend/convex` | Banco, subscriptions de dados, funções públicas/privadas/internas, Agent e RAG | Referência de integração entre busca e conversa |
| `packages/ui` | 65 arquivos de componentes/hooks/utilitários e configuração | Reaproveitar conceitos; nossos primitivos continuam em `@sistemazero/ui` |
| Clerk Billing + AWS Secrets Manager + Vapi | Cobrança do SaaS e credenciais/integração de voz | Não são pré-requisitos da melhoria do nosso atendimento |

Os manifests/lock registram Next 15.2.3, Convex 1.25.4, Agent 0.1.16, RAG 0.3.3 e AI SDK 4.3.19. São versões da cópia analisada, não uma recomendação de versões para uma implementação nova.

### Fluxo de texto

O visitante informa nome e e-mail, recebe um `contactSessionId` persistido no navegador e cria uma conversa. A aplicação usa hooks reativos do Convex para listar conversas e mensagens. Uma nova mensagem dispara o agente quando o status é `unresolved` e a organização tem assinatura ativa. Em conversa `escalated`, a mensagem é armazenada para atendimento humano.

O agente tem três ferramentas: pesquisar, escalar e resolver. O prompt pede pesquisa antes de responder dúvidas sobre o produto. A ferramenta de busca consulta até cinco resultados no namespace da organização e chama um segundo LLM para interpretar o resultado. As ferramentas de escala/resolução alteram o status e gravam uma mensagem na conversa.

Referências: `packages/backend/convex/public/messages.ts:11`, `system/ai/agents/supportAgent.ts:6`, `system/ai/tools/search.ts:10`, `system/conversations.ts:4`.

### Conhecimento

O console aceita PDF, CSV e TXT. O backend também contém rotinas de extração para imagens e textos de outros MIME types. Guarda o arquivo no storage, extrai texto e envia ao componente RAG com namespace, título, categoria e hash do conteúdo. O RAG usa `text-embedding-3-small`, dimensão 1536.

É uma referência útil de ingestão e busca semântica. Não encontrei no fluxo uma etapa editorial anterior à disponibilização, histórico de revisões aprovado, validade por produto ou avaliação de cobertura. A listagem mostra estados de processamento, mas isso não equivale a aprovação da qualidade do conteúdo.

Referências: `packages/backend/convex/private/files.ts:87`, `lib/extractTextContent.ts:33`, `system/ai/rag.ts:5`, `apps/web/modules/files/ui/components/upload-dialog.tsx`.

### Experiência da equipe e do cliente

A lista de conversas, a thread e os dados do contato ficam em painéis redimensionáveis. O operador pode melhorar o texto com IA antes de enviar. O widget mantém o histórico e oferece sugestões no início. Esses são os melhores padrões de interação a adaptar.

Há atualização reativa das mensagens; isso não prova transmissão de tokens do LLM. O caminho analisado chama `generateText`, não `streamText`. A transcrição Vapi está em estado React no hook; não foi encontrado ali um fluxo de persistência da ligação na mesma thread do atendimento.

Referências: `apps/web/modules/dashboard/ui/layouts/conversations-layout.tsx`, `conversation-id-layout.tsx`, `ui/views/conversation-id-view.tsx:87`, `apps/widget/modules/widget/hooks/use-vapi.ts`.

## 4. O que não transportar do Echo

| ID | Achado e evidência | Consequência | Confiança |
|---|---|---|---|
| E01 · alta | `public/messages.ts:90` valida uma sessão existente, mas lista mensagens do `threadId` recebido sem verificar o dono. `create`, linha 11, também não compara a sessão com a conversa | Uma sessão válida pode operar outra thread se seu identificador for conhecido. Reprodução dos handlers confirmou leitura e acionamento de IA com sessão A/thread B | Alta no fluxo local; exploração em deployment não testada |
| E02 · alta | `public/conversations.ts:101` recebe organização e sessão, mas não exige `session.organizationId === organizationId`; `contactSessions.create` aceita organização informada pelo cliente | A fronteira entre organização, sessão e conversa não é garantida em todas as entradas | Alta por leitura do código |
| E03 · alta para autonomia | `public/messages.ts:65` decide responder antes de aguardar o agente. Ferramentas em `system/conversations.ts` atualizam status sem geração esperada ou vínculo a um turno | Não há proteção explícita equivalente ao nosso CAS para impedir uma execução antiga de atuar depois de intervenção humana | Alta quanto à ausência do controle; corrida não reproduzida em Convex real |
| E04 · média | `private/files.ts:132` grava o blob antes de extração/indexação; não há compensação de erro no caminho. Quando `created=false`, apaga o novo blob e depois consulta URL desse mesmo id, linha 163 | Possibilidade de arquivos órfãos após falha e URL sem utilidade no caminho de deduplicação | Alta por fluxo estático |
| E05 · média | `search.ts:33` busca top 5 e `:44` gera texto livre; `:58` persiste a resposta dentro da própria ferramenta | Falta contrato de evidências para validar citações e abstenção. A escrita dentro da busca aumenta acoplamento; possíveis respostas redundantes dependem da execução do agente e não foram confirmadas | Alta quanto ao fluxo; duplicação é hipótese |
| E06 · média | `widget-chat-screen.tsx:110` limpa o formulário antes da action, sem recuperação no handler; o submit usa `status="ready"` | Falhas de rede podem apagar o texto digitado. Falta estado de envio coerente e confirmação visível | Alta por leitura; não ensaiado no navegador |
| E07 · estrutural | Schema com apenas três estados de conversa; sem responsável, prioridade, SLA ou nota interna como recursos de domínio | Uma substituição perderia capacidades importantes já existentes no Helpdesk | Alta no escopo analisado |
| E08 · manutenção | README ainda é o template shadcn; não foram encontrados arquivos de teste ou configuração de CI na cópia; `users.add` lança `Tracking test` antes do insert | O repositório exige trabalho de maturação antes de servir como produto operacional | Alta quanto à cópia local |

O nome da pasta `private` não torna uma função Convex interna: os arquivos dessa pasta exportam `query`, `mutation` e `action`, e fazem autenticação manual. A documentação oficial exige controle de acesso nas funções públicas, incluindo a posse dos recursos. Isso reforça o achado E01. [Convex: boas práticas de autorização](https://docs.convex.dev/understanding/best-practices#use-some-form-of-access-control-for-all-public-functions).

Outras observações de arquitetura:

- Há 17 blocos `getUserIdentity` na pasta `private`, com repetição da leitura/cast de `orgId`. Os dois métodos Vapi repetem quase toda a resolução de plugin e credenciais. É um ponto de centralização para evitar validações divergentes.
- `packages/math/src/add.ts` não tem consumidor de código encontrado; consta apenas como dependência dos apps. O trecho após o `throw` em `users.add` é inalcançável. São resíduos pequenos, não o principal custo de manutenção.
- Componentes como `ai/source.tsx` existem na biblioteca, mas não são usados pelos chats observados. A presença do componente não significa que o produto apresenta fontes das respostas.
- A detecção automática de código morto do Echo não resolveu entrypoints/aliases adequadamente. Seus números foram descartados; rotas Next, exports Convex e APIs de componentes não podem ser classificados como mortos por ausência de import direto.
- `users.add` e as rotas de demonstração Sentry não devem ser confundidos com código morto: podem continuar expostos mesmo que não sejam parte da jornada normal.
- Não encontrei arquivo de licença na cópia. A proposta é adaptar os padrões ao nosso código; qualquer transplante literal precisaria esclarecer a origem e as permissões de uso.

## 5. Comparação com o Helpdesk atual

| Capacidade | Echo | Sistema Zero | Direção |
|---|---|---|---|
| E-mail operacional | Chat; botão `mailto` no contato | Gmail OAuth, ingestão, threads, reconciliação | Preservar o atual |
| Portal autenticado | Sessão de visitante por id | Conta responsável, ownership e restrições kids | Preservar identidade atual |
| IA | Agente conversa e muda status | Classifica, resume e rascunha | Acrescentar autonomia controlada |
| Busca | RAG com embeddings | Pontuação lexical de artigos recentes | Busca por trechos em todo o conjunto elegível; avaliar híbrida |
| Conteúdo | Upload de documentos | Artigo Markdown + publicado | Fontes, versões, revisão, validade e ingestão |
| Evidência da resposta | Resultado interpretado em texto livre | Rascunho sem citações persistidas | Citações verificáveis por trecho/versão |
| Atendimento humano | Escala e operador responde | Fila, prioridade, atribuição, notas, SLA | Integrar handoff à fila existente |
| Concorrência | Mutations, sem proteção de geração observada no agente | `version` + `aiGeneration` + claims/leases | Estender as garantias atuais |
| Atualização da tela | Queries reativas | Fetch inicial e recarga por ação | Atualização automática preservando editor |
| Testabilidade | Sem suíte encontrada | Testes unitários e integração com fakes/banco | Acrescentar avaliações de resposta e regressões |
| Voz | Vapi | Fora do fluxo analisado | Adiar até existir demanda comprovada |
| Cobrança multiempresa | Clerk Billing | Helpdesk interno do negócio | Não incorporar |

O Helpdesk já possui boa separação entre domínio, aplicação e infraestrutura. Não há justificativa observada para migrar PostgreSQL/Elysia/BFF para Convex/Clerk. A recomendação é uma decisão de encaixe no repositório, não uma avaliação negativa dessas plataformas.

## 6. Lacunas do nosso app que limitam a automação

### H01. Mensagens do portal não entram no contexto — corrigir primeiro

`packages/helpdesk/src/application/ai/prompts.ts:50` contém `if (message.kind !== 'email') continue`. Porém `CustomerTicketService`, linha 183, cria mensagens com `kind: 'portal'` e agenda IA.

Resultado da reprodução com assunto “Ajuda”:

```text
portal: Assunto: Ajuda
email:  Assunto: Ajuda\n\nCliente: Nao consigo abrir a aula de programacao
```

O resumo, a classificação e o rascunho do portal podem ser construídos sem a descrição do problema. O teste existente diz explicitamente “inclui só e-mails” e não cobre essa jornada.

Correção proposta: incluir mensagens de cliente/equipe dos canais e-mail e portal, mantendo exclusão de notas internas e conteúdo de triagem automática; aplicar limpeza de citação de forma apropriada ao canal. Cobrir portal puro, conversa mista, outbound do portal, nota interna e autoresposta. Isso é uma correção do copiloto atual, independente de liberar autonomia.

### H02. Busca limitada por recência, palavras e início do artigo

`composition-root.ts:205` carrega `listPublished(AI_KB_MAX_CANDIDATES)`. O padrão é **100** candidatos (`env.ts:103`), ordenados por atualização (`kb.repository.ts:60`), antes de avaliar relevância. Um artigo antigo pode ficar de fora mesmo sendo a melhor resposta. Esse problema depende do tamanho real da KB, que não foi consultado.

`kb-context.ts:46` compara tokens exatos, com peso 5 no título e 1 no conteúdo. `:87` usa `article.content.slice(0, remaining)`. No ensaio com artigo longo, o artigo foi selecionado, mas a instrução “Recuperar senha” desapareceu do contexto final. O limite de teste foi 200 caracteres para reproduzir o mecanismo; o orçamento padrão do produto é 12.000.

Proposta: recuperar trechos relevantes no banco, com metadados de origem e orçamento de tokens; pesquisar toda a base elegível antes do top-k. Busca textual em português é o primeiro baseline. Combinar embeddings quando as avaliações mostrarem ganho em paráfrases e sinônimos.

### H03. Cobertura produzida pelo modelo não vira informação operacional

`DraftSchema` exige `kbCoverage`, mas `TicketAiService.draftAndPersist`, linha 177, passa apenas `result.reply` ao repositório. O worker ignora o objeto retornado por `runPipeline`. O contrato compartilhado tem um campo opcional de cobertura, mas esse caminho não o persiste.

Também não são preservados ids/versões/trechos dos artigos usados: o provider reduz os artigos a título e conteúdo. A equipe não consegue auditar a evidência do rascunho nem montar uma fila confiável de perguntas sem resposta.

Proposta: persistir execução, fontes utilizadas, cobertura, razão de encaminhamento e feedback. `classification.confidence` mede a autodeclaração do modelo sobre a categoria; não é probabilidade calibrada de a resposta estar correta e não deve liberar envio automático.

### H04. Falta um ciclo de aprendizado editorial mensurável

Há `aiDraftEdited`, mas não foi encontrado um caminho de envio que o torne verdadeiro ou vincule a resposta final a uma versão específica do rascunho. Não há nesse fluxo uma avaliação durável de “utilizado”, “corrigido” ou “rejeitado”.

Proposta: armazenar aprovação/edição/rejeição por execução e permitir “Transformar esta solução em artigo”. A IA prepara uma sugestão sem dados pessoais; uma pessoa revisa antes de publicar. Resposta enviada uma vez não se torna automaticamente política do negócio.

### H05. A experiência de conversa ainda depende de recarga

`ticket-detail-client.tsx:44` carrega no mount/mudança explícita. `softReload` é chamado após ações locais. Não há assinatura de eventos ou polling periódico nesse componente. Um resultado do worker ou uma nova mensagem pode não aparecer enquanto a tela estiver parada.

O editor usa `useState(initialDraft)`, preservando texto humano, mas não incorpora automaticamente um rascunho que apareça depois. Deve oferecer “Novo rascunho disponível” com ação explícita para usar a sugestão. O repositório de mensagens carrega a thread inteira; paginação do histórico é recomendável para conversas longas.

Primeira solução: polling com pausa fora de foco e invalidação após ações. Se a medição justificar SSE, criar transporte próprio pelo BFF/gateway: o catch-all atual converte resposta em JSON e não pode simplesmente repassar um stream.

### H06. Publicação ainda tem pouca governança

O artigo tem título, Markdown, `published`, timestamps e `version`. Essa versão é controle de concorrência, não histórico imutável do conteúdo. Faltam público, produto, origem, revisão aprovada e validade. “Publicado para o copiloto” também não deve significar automaticamente “permitido ao cliente”.

Proposta: separar estado editorial, visibilidade e prontidão do índice. Toda resposta automática usa uma revisão aprovada e atualmente autorizada para aquele público.

## 7. Aproveitamento do próprio Sistema Zero

O Zappy já implementa parte importante do trabalho que o Echo inspira:

- Divisão do conteúdo em trechos, normalização e hash: `packages/members/src/application/zappy/zappy-knowledge.service.ts:80`.
- Verificação de fonte/revisão autoritativa e status de processamento: mesmo arquivo, `:140`.
- Escrita transacional e substituição dos trechos de uma revisão: `zappy-knowledge.repository.ts:113`.
- Busca PostgreSQL em português com checagem de publicação, revisão e acesso: mesmo arquivo, `:340`.
- Relatório de fontes com falha/pendentes e sincronização retomável descritos em `docs/operacao-zappy.md`.

Essa implementação é textual; não a tratei como um mecanismo vetorial já disponível. Reaproveitar padrões, testes e utilitários puros quando fizer sentido. O Helpdesk mantém seu próprio repositório e fontes. Não importar o serviço de Members inteiro nem acessar tabelas de outro domínio diretamente.

A ajuda dos pais já contém procedimentos atuais e FAQs em `packages/community-kids/src/app/pais/ajuda/help-content.tsx`. É uma boa primeira fonte editorial, especialmente para autorização de aparelhos. Centralizar esse conteúdo aprovado evita respostas antigas sobre o acesso infantil.

Conteúdo didático do Zappy e conhecimento comercial/operacional do suporte têm regras de acesso diferentes. Uma futura consulta a conteúdo de aula precisa preservar a autorização de Members; o índice do helpdesk não deve virar um atalho para aulas privadas.

## 8. Alternativas

| Alternativa | Benefício | Custo/limitação | Recomendação |
|---|---|---|---|
| A. Evoluir o Helpdesk atual | Reutiliza identidade, fila, entrega, testes e PostgreSQL | Exige projetar conhecimento e política de autonomia | **Escolhida** |
| B. Incorporar Echo como segundo produto | Chat/RAG já conectados na referência | Duas identidades e bases, sincronização de tickets, correções de autorização e operação duplicada | Não compensa para este caso |
| C. Melhorar apenas o copiloto e a KB | Menor mudança de produto e risco de lançamento | Mantém todo atendimento dependente de envio humano | Boa primeira entrega e alternativa permanente se o piloto não atingir qualidade |

## 9. Proposta vigente após revisão

O review contra os contratos do produto identificou 14 lacunas de desenho, incluindo autoria pública, SLA, jobs de autoenvio, canal legado Gmail, takeover, publicação de fontes, idempotência, atualização concorrente e implantação entre consumidores.

A [proposta revisada e integrada](../docs/plans/2026-10-15-helpdesk-ia-kb-proposta-revisada.md) é a referência para implementação. Ela substitui integralmente as antigas seções de produto, arquitetura, roadmap, métricas e primeiro lote deste relatório; os achados de auditoria acima continuam válidos.

A sequência vigente é: corrigir contexto e escritas concorrentes; entregar KB com revisões e copiloto com fontes; comprovar jobs, transferência e publicação transacional; integrar o portal e os indicadores; executar sombra e piloto. Busca híbrida e importação de arquivos são opcionais, condicionadas à avaliação.

Estimativa revisada: **17–26 dias de engenharia para KB/copiloto; 35–53 dias no total até o piloto autônomo integrado**. Não inclui trabalho editorial nem tempo de observação. A faixa inicial de 25–38 dias foi substituída porque não explicitava todo o trabalho de contratos, SLA, migração e concorrência.

Verificação adicional desta revisão: 35 testes do backend e 6 do member-shell, **41 passaram, 0 falharam**, 100 asserções. Os três achados iniciais foram novamente reproduzidos; não foram corrigidos nesta entrega documental. [Evidências da revisão](./echo-helpdesk-2026-10-15/review-verification.json).

## 10. Referências locais essenciais

Prefixo Echo: `C:/Users/tocha/Downloads/next15-echo-main/next15-echo-main/`.
Prefixo Sistema Zero: `C:/Users/tocha/projects/sistema-zero/`.

| Tema | Arquivo/linha |
|---|---|
| Sessão sem vínculo com thread no Echo | Echo `packages/backend/convex/public/messages.ts:11` e `:90` |
| Controle correto em outro endpoint Echo | Echo `packages/backend/convex/public/conversations.ts:86` |
| Busca e resposta no Echo | Echo `packages/backend/convex/system/ai/tools/search.ts:33` |
| Ingestão de arquivos | Echo `packages/backend/convex/private/files.ts:87` |
| Identidade e permissões atuais | Sistema Zero `packages/helpdesk/src/interfaces/http/auth.ts:86` |
| Falha de contexto do portal | Sistema Zero `packages/helpdesk/src/application/ai/prompts.ts:50` |
| Criação de mensagem do portal | Sistema Zero `packages/helpdesk/src/application/tickets/customer-ticket.service.ts:183` |
| Limitação da KB | Sistema Zero `packages/helpdesk/src/application/ai/kb-context.ts:87` |
| Cobertura não persistida | Sistema Zero `packages/helpdesk/src/application/ai/ticket-ai.service.ts:177` |
| Contrato opcional de cobertura | Sistema Zero `packages/helpdesk-contracts/src/index.ts:137` |
| Atualização da conversa | Sistema Zero `packages/helpdesk-app/src/app/(app)/tickets/[id]/ticket-detail-client.tsx:44` |
| BFF JSON | Sistema Zero `packages/helpdesk-app/src/app/api/helpdesk/[...path]/route.ts:17` |
| Base interna reaproveitável | Sistema Zero `packages/members/src/application/zappy/zappy-knowledge.service.ts:80` |
| Busca PostgreSQL existente | Sistema Zero `packages/members/src/infrastructure/persistence/drizzle/zappy-knowledge.repository.ts:340` |
| Decisões anteriores preservadas | Sistema Zero `docs/plans/2026-09-05-helpdesk-remediation-design.md` |

Os hashes do inventário registram a cópia analisada. O workspace tinha alterações de outras tarefas; esta entrega acrescenta apenas documentação e evidências de auditoria.
