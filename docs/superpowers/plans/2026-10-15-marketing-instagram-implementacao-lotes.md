# Conversas comerciais no Instagram — implementação em lotes

> Execução nesta sessão com `executing-plans`, revisão após cada lote e revisão completa antes do commit/merge local solicitados pelo usuário.

**Objetivo:** incorporar ficha editorial, operação determinística, atendimento e medição ao marketing existente, preservando a reforma integrada à staging.

**Base:** staging local `1e5b0debc`, que já contém `ea3b926fd` (marketing colaborativo). Worktree isolado `sistema-zero-instagram-engagement`, branch `feat/marketing-instagram-engagement`. Alterações locais do worktree de staging permanecem de seus autores; conferir novamente antes do merge.

**Spec:** [proposta revisada](../../plans/2026-10-15-insta-p8-aproveitamento-marketing.md).

**Arquitetura:** domínio/worker no serviço marketing, PostgreSQL/Drizzle, contratos Zod compartilhados e UI no workbench consumida por web e Electron. Revisões continuam em `editorial_revisions`; a ficha é uma propriedade opcional da peça. Aprovação da conversa referencia revisão imutável e publicação da mesma peça, sem criar mecanismo paralelo de edição. Nenhuma mensagem privada entra no cache editorial.

**Limite da entrega local:** implementar e verificar o software com banco de teste e servidor Meta controlado. A comprovação externa C0, ativação pública C3 e observação comercial C4 não serão inventadas: envio nasce desligado, exige capacidade registrada, conta autorizada e ação explícita. Não publicar campanhas nem enviar mensagens a terceiros nesta implementação.

## Lote 1 — Contratos e comportamento editorial

- [x] Criar `marketing-contracts/src/engagement.ts` com plano, capacidade, comandos, views e validação de textos/destino.
- [x] Incorporar `conversation` opcional ao documento `piece`, mantendo revisões e sincronização existentes.
- [x] Criar `marketing/src/domain/engagement/policy.ts` com normalização Unicode, precedência, janela e decisões de percurso.
- [x] Ampliar a proposta de copy para ajuste explícito das duas mensagens, preservando destino/palavra e Desfazer existentes.
- [x] Testar palavra inteira/direct explícito, acentos, supressão, silêncio, triagem e imutabilidade do plano.
- [x] Review: conferir que salvar/duplicar/editar não ativa, que o tipo da peça não mudou e que o fluxo continua com duas mensagens comerciais.

## Lote 2 — Persistência, autorização e operação

- [x] Criar schema aditivo de engajamento, migração gerada e repositórios: configuração/equipe de conta, aprovação por revisão, ativações, conversas, jornadas, entradas, intenções e recibos.
- [x] Implementar serviço e rotas sob `/marketing/workspace/engagement`, usando autenticação existente e autorização de conta separada do projeto.
- [x] Implementar configuração inativa, prova de capacidade com evidência, aprovação, solicitação de vínculo, pausa, supressão, tomada humana, resposta, resolução de incerteza e exclusão.
- [x] Transações serializam por conta/conversa; toda mutação possui `operationId`, hash e versão esperada. Nenhum envio acontece dentro de transação SQL.
- [x] Testes reais de PostgreSQL em banco exclusivo: permissões, concorrência, replay, conflito, aprovações e supressão.
- [x] Review: auditar vínculo entre peça/revisão/publicação/conta e isolamento de mensagens entre contas.

## Lote 3 — Meta, webhook e worker

- [x] Criar adaptador Facebook Login usando conta explícita e tokens selados existentes; timeout externo não resulta em reenvio automático.
- [x] Rota pública específica no gateway; handler verifica assinatura do corpo original antes do parsing, persiste todos os eventos antes do ACK.
- [x] Normalizar comentários, mensagens, postbacks, ecos e anexos sem duplo gatilho.
- [x] Worker processa entradas duráveis, reconcilia publicações pendentes e despacha intenções com posse, revalidação e estados incertos.
- [x] Configuração separa habilitação de recebimento, capacidade e habilitação global de envio; iniciar desligado.
- [x] Testes de integração: HMAC/bytes, envelopes múltiplos, replay concorrente, pausa durante envio, janela, crash/timeout, conta revogada e falta de campanha.
- [x] Review: conferir rota pública isolada, ausência de segredos no cliente/log e ausência de confirmação falsa de entrega.

## Lote 4 — Bancada, atendimento e medição

- [x] Ficha e prévia na peça, revisão/ativação distintas, lista de publicações e indicação de capacidade/pendências.
- [x] Fila humana compartilhada web/desktop: leitura restrita, histórico, assumir, responder, saídas aprovadas, pausar e reconciliar sem persistir DMs no cache.
- [x] Estender analytics no funil por contrato autenticado para campanha/conteúdo, preservando atribuição inicial e deduplicando compra confirmada.
- [x] Exibir agregados operacionais e comerciais com cobertura, período e unidade; falha/ausência não vira zero.
- [x] Expurgo/observabilidade/rollback documentados e implementados no ciclo de manutenção; envios desligados na recuperação de backup.
- [x] Review: conferir acessibilidade, paridade de transporte, atualização da fila, comandos online e fontes editoriais vigentes.

## Lote 5 — Full review e integração local

- [x] Executar testes dos pacotes afetados, typecheck e Biome; corrigir problemas da alteração e identificar falhas preexistentes com evidência.
- [x] Revisar matriz da proposta contra implementação, migrações, segredos, concorrência, autorização, recuperação e UX.
- [x] Registrar evidências e pendências externas em `.audits/insta-p8-marketing-2026-10-15/implementation-review.md`.
- [x] Conferir avanço de staging, integrar seus commits na branch e repetir testes afetados por conflitos/alterações.

Integração final: commit somente dos arquivos desta entrega e merge local em staging, preservando alterações de trabalho alheias e sem push. Os hashes e a relação entre `feat/marketing-instagram-engagement` e `staging` ficam registrados no histórico Git, evitando referência circular dentro do próprio commit.

Validação final em 16/10/2026 sobre staging `fbf830506`: 1.208 testes aprovados, typechecks e três builds aprovados, prova de UI em Edge e PostgreSQL real. Detalhes, correções do review e limites de C0/C3/C4 constam na auditoria de implementação.

## Invariantes de aceite

`entrada duplicada → uma intenção`; `silêncio → nenhum envio`; `parar/atendimento → nenhum novo comercial`; `envio iniciado sem resultado → incerto, sem retry cego`; `conta/revisão não comprovada → bloqueio`; `importar/aprovar/publicar → não ativa isoladamente`; `sem telemetria → indisponível`; `compra ligada a duas sessões → uma compra`.
