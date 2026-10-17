# Pensa v2 Implementation Plan

> Histórico: substituído pela [especificação funcional de 16/10/2026](../../plans/2026-10-16-pensa-reestruturacao-spec.md). Este documento registra decisões anteriores e não define o contrato vigente.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Implementar o ciclo ideia livre → proposta viável → construção acompanhada → teste → incremento protegido da proposta aprovada.

**Architecture:** Evolução aditiva sobre projetos, ciclos e tarefas existentes. Contratos puros compartilhados em core; estado e operações persistidos no members; orquestração OpenRouter e mídia privada no member-shell; interface Kids e guias nos editores. O legado permanece legível e utilizável, sem conversão destrutiva.

**Tech Stack:** TypeScript, React 19, Next 16, Bun, Elysia, Drizzle/PostgreSQL, R2, OpenRouter e ElevenLabs já utilizados no repositório.

**Spec:** [proposta aprovada](../../plans/2026-10-14-pensa-proposta.md), [revisão](../../plans/2026-10-14-pensa-revisao.md).

## Global Constraints

- A criança constrói; Zappy planeja, orienta e ajuda quando ela trava.
- OpenRouter obrigatório para planejamento, revisão, ajuda e transcrição; ElevenLabs para a voz própria do Zappy.
- Método ZERO explícito; linguagem e visual da Comunidade Kids.
- Posto, blocos conquistados, ferramentas e ajuda efetivamente disponíveis limitam a proposta executável.
- Piloto individual Kids; legado/equipes permanecem compatíveis.
- Sem publicação automática, exclusão de dados preexistentes ou geração autônoma do jogo.
- Operações pagas exigem reserva autoritativa; retomada e repetição lógica não duplicam débito.
- Migração gerada pelo script Drizzle; não aplicar migração a serviços remotos nem liberar o piloto em produção nesta implementação.
- Preservar alterações concorrentes do workspace. Executar nesta sessão com a skill disponível `executing-plans`; autorização de implementação já concedida, sem novas aprovações entre lotes.

## Ordem e contratos de entrega

### 1. Contrato e estado da jornada

Files: criar `packages/core/src/pensa/index.ts`, `packages/core/tests/pensa.test.ts`; exportar em `packages/core/package.json`.

Interfaces: `PensaJourney`, `PensaProposal`, `PensaCapabilitySnapshot`, `PensaOperation`, `PensaCheckpoint`, `PensaJourneyCommand`; funções puras `pensaZeroStage`, `applyPensaCommand`, `nextPensaMission`.

- [x] Definir estados separados de proposta, escolha, preparação, construção, teste, encerramento e operações; referências narráveis por origem/revisão.
- [x] Testar escolha de revisão obsoleta, pausa/retomada sem incremento, reparo preservando histórico e teste negativo sem sucesso fictício.
- [x] Verificar com `bun test tests/pensa.test.ts` em core e `bun run typecheck`.

### 2. Persistência, operações e reserva de consumo

Files: schema e migração gerada em `packages/members/src/infrastructure/persistence/drizzle`; novos `pensa-journey-repository.port.ts`, `pensa-journey.repository.ts`, serviço de jornada e rotas v2; composição e clientes.

Interfaces: leitura por perfil/projeto; comando com revisão esperada; operação com ID idempotente, lease e passos persistidos; publicação atômica da proposta/plano/tarefas. Reserva por conta compartilha o lock da quota atual.

- [x] Acrescentar tabelas sem alterar significado dos estágios legados.
- [x] Implementar comparação de revisão, cancelamento, arquivamento e descarte de saídas obsoletas.
- [x] Integrar reserva/expiração/finalização com quota existente; não debitar explicação como novo plano.
- [x] Testar concorrência, repetição, isolamento e rollback de publicação parcial; gerar e revisar migração.

### 3. Planejamento OpenRouter e conhecimento

Files: `packages/member-shell/src/server/pensa-journey/`, `routes/pensa-journey.ts`, clients e rotas Next Kids.

Interfaces: `prepareProposal(context, idea)`, `reviewProposal(context, proposal)`, `prepareGuides(context, proposal)`; contexto combina capacidades, catálogo, fontes recuperadas e intenção canônica.

- [x] Extrair narrativa livre sem cinco perguntas obrigatórias e sem exigir vitória/derrota.
- [x] Validar mecânicas/recursos/dependências antes do cartão; mudança material exige nova escolha.
- [x] Consultar conhecimento oficial, validar referências e separar conteúdo, acesso e progresso.
- [x] Persistir saídas por passo e retomar operação interrompida; não publicar tarefas parciais.
- [x] Testar falha do gateway, catálogo vazio, recurso bloqueado e saída inválida com transportes simulados.

### 4. Interface Kids e retomada

Files: componentes e estilos em `packages/pensa/src`, adapter em `packages/community-kids/src/components/kids/pensa-client.tsx`.

Interfaces: modo v2 explícito no adapter; transporte de jornada e ações com revisão/idempotência; referência de voz delegada ao host.

- [x] Implementar entrada livre, cartão curto, mapa ZERO, uma missão, caminho recolhível e ideias futuras.
- [x] Distinguir primeira visita/retomada, arquivados, preparação em curso e falha recuperável.
- [x] Permitir corrigir, pedir ajuda, testar, pausar e encerrar; preservar texto não enviado e conflito de duas abas.
- [x] Testar fluxos do usuário e regressões do legado com componentes renderizados.
- [ ] Conferir visual no navegador Kids: navegador integrado indisponível nesta sessão.

### 5. Guias e continuidade entre editores

Files: contratos e guias de Estúdio/Pinta/Molda; `use-pensa-task-handoff.ts`; domínio e serviço de progresso no members.

Interfaces: guia com versão de contrato, instrução separada de evidência; próxima missão elegível e arquivo/revisão preservados.

- [x] Não exigir marcação de passos no v2; registrar resultado manual/automático honestamente.
- [x] Separar produção de arte, integração e teste; reutilizar assets reais autorizados.
- [x] Trocar missão no mesmo arquivo sem navegação obrigatória ao Pensa; preservar retorno de aula.
- [x] Testar dependência, saída incorreta, revisão conflitante, tarefa de reparo e continuidade sem arquivo vazio.

### 6. Voz e ajuda contextual

Files: integração existente `lib/voice`, `components/voice-input`, tutor do Estúdio, novo serviço de voz dinâmica autorizado e cache privado.

Interfaces: ditado revisável sem corte silencioso; `NarratableRef` resolvido no servidor; foco de mídia e autorização por origem.

- [x] Reaproveitar transcrição OpenRouter e autorização de voz do perfil; preservar edição concorrente.
- [x] Oferecer ElevenLabs sob demanda em proposta, guia e respostas do tutor, sem autoplay.
- [x] Deduplicar síntese, invalidar áudio antigo/excluído e não usar bucket público editorial para conteúdo privado.
- [x] Testar limites, falhas, troca de perfil, texto editado, sessão de tutor indisponível e ausência de microfone.

### 7. Base protegida, teste e incremento

Files: integração de criações/checkpoints no host e members; jornada e UI de teste/versões.

Interfaces: checkpoint materializado com manifesto e vínculo plano/ciclo; restauração recuperável com proteção do estado atual.

- [x] Proteger a base no encerramento e antes de substituição; nenhum anúncio de backup antes da confirmação.
- [x] Incrementar preservando intenção, ideias e assets; testes se vinculam à revisão observada.
- [x] Restaurar criação, guia e evidência coerentes; pausar com proteção pendente continua possível.
- [x] Testar autosave/limpeza, falha parcial, saída tardia após exclusão e segundo ciclo.

### 8. Verificação final e operação

- [x] Concluir verificação final de testes afetados, typechecks, lint e build; evidências abaixo.
- [ ] Percorrer interface em navegador desktop e estreito, incluindo erros e teclado: pendente de navegador conectado.
- [x] Documentar configuração, rollout/rollback, migração e limites de validação; nenhuma alegação de teste infantil sem observação real.
- [x] Reconciliar requisitos R01–R32 e registrar evidências e limitações concretas da entrega.

## Registro de execução

- Início: autorização recebida em 14/10/2026. Nenhuma alteração do Pensa v2 existia no início. Workspace contém trabalho concorrente em outras áreas.
- Descoberta: a transcrição OpenRouter e a preferência parental de voz já existem desde a proposta; reutilizar em vez de criar outro caminho. O limite atual do gravador é 60 s; os 90 s da proposta eram hipótese, não requisito fixo.
- Entrega e rastreabilidade: [registro completo](../../plans/2026-10-14-pensa-v2-entrega.md), incluindo configurações, ativação, rollback, limites e R01–R32.
- Verificação: 337 testes aprovados nas suítes afetadas; lint em 78 arquivos; build completo `bun run build` da Comunidade Kids aprovado, incluindo TypeScript e geração das páginas. Compilação isolada do Pensa com `bunx vite build --config playground/vite.config.ts --outDir ../tmp/pensa-v2-build` aprovada.
- Banco: testes usaram Postgres local na porta 5433, com banco v2 separado e fixtures do legado. Migrações 0108–0111 geradas pelo Drizzle e revisadas como aditivas; nenhuma aplicada remotamente.
- Limite de verificação: a skill Browser foi carregada, mas nenhum navegador estava disponível. Desktop/celular, teclado real, serviços de voz/R2 reais e avaliação infantil permanecem no roteiro de liberação; não são declarados validados por testes de componentes.
- Operação: `Next.after` executa os passos; banco persiste a retomada. Um processo interrompido depende de nova visita/polling para retomar; não foi criado um scheduler autônomo de planejamento.
- Typechecks aprovados: core, Pensa, Pinta, Estúdio, members e member-shell; Comunidade Kids passou tanto no comando próprio quanto no TypeScript do build completo. `git diff --check` sem erros nos caminhos verificados.
- Os últimos ajustes receberam nova compilação Next em modo `compile` e finalização em modo `generate`, ambas aprovadas; 73 páginas geradas. O artefato local está finalizado.
- Full review posterior solicitado pelo usuário: [nove achados corrigidos](../../../.audits/architectural-analysis-2026-10-14-pensa-v2.md). Verificação ampliada: 532 testes distintos aprovados, typechecks de core/Pensa/members/member-shell, Biome em 24 arquivos e novo `bun run build` Kids completo após a última correção (compilação, TypeScript e 73 páginas). Navegador integrado consultado novamente: nenhum disponível. Sem migrações remotas, publicação ou chamadas pagas.
- Segundo full review: [quatro novos achados corrigidos](../../../.audits/architectural-analysis-2026-10-14-pensa-v2-round2.md). 594 testes distintos aprovados, typechecks de core/Pensa/members/member-shell, Biome em dez arquivos e build completo Kids aprovado (73 páginas). Conflitos de arquivos Pensa agora preservam a versão remota vinculada ao guia e guardam o rascunho local como cópia após fechar/reabrir. Navegador continua indisponível; nenhuma ativação ou alteração remota.
