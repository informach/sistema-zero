# Helpdesk IA e KB: implementação por lotes

> Execução inline com as skills writing-plans e executing-plans. Review técnico e validação ao concluir cada lote; depois full review, commit e merge em staging local, conforme autorização do usuário.

**Objetivo:** implementar a proposta integrada de conhecimento e atendimento automático no Helpdesk existente.
**Arquitetura:** domínio/portas/casos de uso no Helpdesk; PostgreSQL para revisões, jobs e transações; contratos compartilhados e acesso por BFF/gateway. Gmail continua humano.
**Stack:** Bun, Elysia, Drizzle, PostgreSQL, Zod, OpenRouter, Next.js/React.
**Spec:** `docs/plans/2026-10-15-helpdesk-ia-kb-proposta-revisada.md`.
**Base:** staging local `1e5b0debc`, checkout `feat/helpdesk-ia-kb`.

## Ajustes autorizados e invariantes

- Helpdesk ainda sem usuários: sem camadas de compatibilidade, writers legados, capabilities de UI ou implantação mista. Atualizar contratos e consumidores juntos.
- Autonomia desligada por padrão; ativação real depende de conteúdo e avaliação editorial, não é parte de um merge local.
- Não tocar no trabalho de outras branches. Reavaliar staging antes do merge e resolver conflitos preservando as evoluções.
- Sem troca de identidade/stack, sem autoenvio Gmail, sem ferramentas que alterem contas, sem extração de aulas privadas.
- Revisões publicadas e fontes autorizadas são autoridade. `triage=human` continua significando atendimento, não autoria.
- Migrações geradas pelo Drizzle; PostgreSQL descartável dedicado para provas de concorrência.
- Não usar sleeps para provar corridas. Não confundir teste sintético com avaliação de qualidade de um modelo real.

## L0: contexto e concorrência do copiloto

Arquivos: `application/ai/prompts.ts`, `application/tickets/ticket.service.ts`, porta/repositório de ticket, fake e testes correspondentes.
Interface: `patch(id, expectedVersion, changes, at)` altera só campos do comando e retorna o ticket persistido; operações de IA preservam seu guard próprio.

- [x] Adicionar regressão de contexto portal, visibilidade e autoria.
- [x] Adicionar regressão PostgreSQL de rascunho entre leitura e patch humano.
- [x] Corrigir montagem de contexto e patch por intenção.
- [x] Executar `bun test`, `bun run typecheck` e `bun run check` no backend, com banco dedicado.
- [x] Review do diff: triagem/manual priority/CAS preservados; registrar resultado.

## L1: conhecimento com revisões, acesso e busca

Arquivos: contratos KB, domínio/portas/serviço KB, schema/migrations, repositório/worker KB, rotas/DTOs e testes unitários/PostgreSQL.
Interfaces: revisão imutável; publicar revisão indexada com CAS; retirar/arquivar; busca por trechos com filtro de público/produto e revisão atual.

- [x] Testar chunking determinístico e recuperação do final de documento sem seleção por recência.
- [x] Implementar revisão, índice durável, publicação atômica e busca textual portuguesa.
- [x] Expor edição, revisões, publicação, retirada e busca com RBAC staff/admin.
- [x] Gerar migrations e aplicar no banco descartável; validar leases/retirada/concorrência.
- [x] Review do lote e verificação backend/contratos.

## L2: execução rastreável e copiloto no console

Arquivos: porta/cliente LLM, serviço de respostas, repositório de execuções/feedback, contratos/views, console KB e detalhe/editor.
Interfaces: resposta estruturada com IDs de trechos; execução com uso por tentativa; feedback ligado ao draft; teste de resposta sem envio.

- [x] Implementar inferência com fontes autorizadas e rejeição de referências inventadas.
- [x] Persistir execução, evidências, cobertura, custo conhecido/desconhecido e feedback.
- [x] Entregar Artigos/Fontes/Lacunas/Testar e editor com fontes, preservando texto humano.
- [x] Validar serviço/rotas e testes/build do console.
- [x] Review: separação de contextos internos/externos e nenhuma geração dispara envio.

## L3: atendimento automático durável

Arquivos: domínio de automação, política, jobs, worker, repositórios de ticket/mensagens, schema/migrations e rotas.
Interfaces: geração + epoch + lease; publicação única por geração; takeover por intervenção; idempotência por comando.

- [x] Implementar política off/shadow/pilot, orçamento e limites de tempo/turnos.
- [x] Agendar inbound e job na mesma transação; distinguir job automático de `ai_status`.
- [x] Publicar resposta do portal com guards/locks de política, ticket, job e fontes.
- [x] Transferir atomicamente em pedido humano, intervenção, falha, prazo ou limite.
- [x] Testar corridas e crash/retry em PostgreSQL; review do protocolo de locks e efeitos.

## L4: portal, SLA e contratos completos

Arquivos: member-shell handlers/componentes, wrappers Community/Kids, gateway, views/contratos e SLA/SQL/cursor/stats.
Interfaces: autoria pública, evidências por mensagem, leitura incremental, handoff e confirmação de resolução; input idempotente obrigatório.

- [x] Integrar conversa, fontes, handoff e confirmação nos dois portais existentes.
- [x] Integrar polling limitado/paginado e preservação de formulário/foco.
- [x] Atualizar SLA/fila/métricas e preservar notificação humana + ausência de aviso de bot.
- [x] Testar autorização, readonly, parental, ownership, retry e canais.
- [x] Review integrado; typecheck/testes/build dos consumidores afetados.

## L5: operação e full review

Arquivos: avaliação/fixtures/scripts, testes de integração/e2e, documentação operacional e configuração.

- [x] Entregar avaliação versionada, relatório mensurável e controle de sombra/piloto.
- [x] Exercitar desligamento, jobs vencidos, orçamento, falha de provedor e retenção.
- [x] Full review: requisitos da spec, segurança, SQL/transações, interface, erros, migrations e código morto.
- [x] Corrigir achados e repetir verificações afetadas; registrar limitações de avaliação real.
- [x] Commit apenas arquivos da implementação.
- [ ] Revalidar staging local atualizado, integrar e testar o resultado do merge.
- [ ] Merge local autorizado; sem push/deploy.

## Registro de execução

- Preparação: staging contém evolução de outros módulos; Helpdesk e proposta não diferem da cópia analisada nos caminhos principais. Checkout isolado criado. Documentação atual Drizzle/Elysia/Next e APIs Zod/Bun/OpenRouter consultada.
- L0 concluído: 235 testes passaram (746 asserções), incluindo PostgreSQL real; typecheck e Biome passaram. Regressões observadas antes da correção. Review: patch grava somente campos da intenção, devolve estado persistido; promoção/demissão da triagem ainda invalida geração e preserva CAS. Contexto aceita portal, exclui visibilidade interna e distingue autoria da IA. A escrita ampla continua restrita ao backfill explícito de triagem e fixtures; não é usada pelo comando humano HTTP.
- L1 concluído: backend 241 testes/771 asserções; contratos 5/14; gateway selecionado 64/304; typechecks passaram. Review corrigiu a retirada que podia desarquivar uma fonte e a inferência ampla de tipos no mapa de rotas do gateway. Publicação confere revisão do artigo, estado pronto, dono e validade sob transação; busca usa metadados da revisão publicada, nunca do rascunho. O job de índice reside na própria revisão (um trabalho por revisão), evitando tabela redundante. Migrations 0013/0014 geradas em duas etapas porque o gerador tenta perguntar sobre rename quando há criação e remoção de coluna simultâneas; nenhum SQL gerado foi editado. Não há campo `published` persistido no schema final.
- Observação de testes L1: o matcher assíncrono `.rejects` do Bun 1.3.11/Windows parou o postgres-js após BEGIN, sem lock bloqueante no PostgreSQL; materializar o resultado da promessa antes da asserção executou a mesma transação em 265 ms. O teste continua exigindo `KnowledgeNotReadyError`; nenhum timeout de produto foi aumentado.


- L2 concluído: backend 248 testes/797 asserções com PostgreSQL; console 26 testes/193 asserções, typecheck e build Next completos. Execuções persistem fontes, revisões e custo por tentativa (desconhecido permanece null); classificação também é contabilizada. Editor insere por decisão explícita, conserva texto na regeneração/conflito e envio grava run e edição na própria mensagem. Review removeu recuperação/prompt antigos sem consumidores, limitou indexações interrompidas a três claims e acrescentou retenção de execuções/rascunhos (30 dias, configurável até 90). Artigo derivado de lacuna exige redação editorial manual sem transcrição de dados pessoais. Falha transitória de arquivo mapeado no Biome/Windows desapareceu na repetição; lint final limpo. Avaliação de qualidade de modelo real continua pendente de conteúdo aprovado.

- L3 concluído: backend 266 testes/860 asserções, typecheck e Biome limpos; gateway selecionado 64/308. Quinze cenários de automação exercitam PostgreSQL real (duas conexões/claims, publicação única, inbound/idempotência, nota durante inferência com barreira, retirada, desligamento, lease, orçamento desconhecido, sombra, Gmail, pedido humano, três respostas, takeover idempotente, mudança de modelo e duas falhas). Review acrescentou revalidação da avaliação/modelo/prompt/índice no runtime, separou GET administrativo de rotas auditadas mutantes e corrigiu recuperação de perguntas naturais: lexemas normalizados em OR, ranqueados, sem exigir todas as palavras da pergunta. Nenhuma rede/provedor dentro de transações; timeout do provedor cobre também leitura do corpo.
- Infra de validação L3: Docker deixou CREATE TABLE em execução sem bloqueador e não respondeu a cancelamento/restart do contêiner dedicado. Nenhum serviço de Docker compartilhado foi reiniciado. Fallback de ambiente: PostgreSQL nativo 16.15 da EDB em `C:/Users/tocha/.cache/helpdesk-pg16`, porta 15462, banco descartável `helpdesk_test`, apenas 127.0.0.1. Todas as migrations 0000–0016 aplicaram em segundos, sem alteração de SQL. Fonte: https://www.enterprisedb.com/download-postgresql-binaries?lang=en; arquivo oficial https://get.enterprisedb.com/postgresql/postgresql-16.15-5-windows-x64-binaries.zip; SHA256 43BB45F173A6F08CF1D29A97A6D8DEB119E8E8093A24C00D2D1001A0CCAA8281. Encerrar esta instância após a verificação final. O contêiner anterior continua restrito a testes sintéticos.
- Itens de full review a fechar nos próximos lotes: vincular avaliação à configuração de elegibilidade; testar histórico grande/cursores e fonte pública retirada; conferir retenção de jobs/comandos; editor KB deve deixar explícita a validade obrigatória para publicar; replay de resposta humana e métricas devem ler o run gravado na mensagem; instrumentação não pode contar silêncio como resolução.

- L4 concluído: portais adulto/parental e console usam autoria explícita, fontes autorizadas, handoff, confirmação e paginação incremental. Review corrigiu uma lacuna da ordenação por data: `position` persistida sob lock do ticket evita perder mensagens importadas e confirmações tardias; estados de entrega avançam a sequência. SLA TypeScript/SQL mantém a origem da espera no handoff; cursor da fila v2 e filtro de modo não conflitam com triagem. Typechecks de Community/Kids e builds de console/Community/Kids/Admin passaram. Testes DOM exercitaram polling, dedupe, preservação de editor/foco, consulta da fonte, idempotência da confirmação e expiração parental (2/13). BFF/gateway preservam `Retry-After`, readonly e autenticação. A varredura ampla de vocabulário infantil encontrou duas falhas preexistentes de outros módulos; reavaliar após incorporar staging, que já alterou esse teste.
- L5 / review final em andamento: avaliação de 100 casos sintéticos, scorer com hashes e revisão integral; vínculo obrigatório entre relatório e modelo/prompt/índice/configuração; painel administrativo e métricas segmentadas; retenção de derivados, comandos e jobs terminais. A prova PostgreSQL da automação passou 26 cenários/100 asserções, incluindo resposta humana durante inferência, fonte retirada, público, vencimento, limite de esclarecimento e retenção. Review corrigiu o lock por ID na confirmação inicial de Gmail antes da associação da thread e a confirmação tardia que pausava uma solicitação mais recente. Confirmar novamente os testes afetados antes do commit.

- L5 concluído: backend 283 testes/926 asserções; console 26/193; contratos 5/14; gateway 70/324; BFF compartilhado 28/76; Kids/vocabulário/parental/DOM 31/163. Full review em [review-implementacao-2026-10-16.md](../../helpdesk/review-implementacao-2026-10-16.md). Corrigidas validade da avaliação reimportada e exigência de revisão integral, com regressão red/green; guard de versão na interface também provado por resposta de comando atrasada depois do polling. Migrations 0000–0019 aplicadas e nova geração não detectou drift. Nenhum LLM/Gmail real chamado; qualidade editorial, custos e capacidade são gates de ativação, mantida desligada.
- Integração: incorporadas staging `7c820700b` (marketing) e `2d59b19a8` (Studio Pro) na branch isolada. O conflito de inserção no teste de configuração do gateway foi resolvido conservando os dois testes; a incorporação posterior foi automática. Gateway e BFF revalidados, sem alteração de trabalho não commitado na staging.

- Fechamento estático: typechecks de backend, contratos, console, gateway, member-shell e Kids aprovados. O teste DOM importa os DTOs pela fachada pública já existente de member-shell, preservando as dependências declaradas do Kids. Build final do console aprovado após a correção da corrida de UI; lint dos 117 arquivos de código/dados alterados e verificação de whitespace limpos.
