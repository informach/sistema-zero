# Execução do adendo Zappy Pro — 15/10/2026

> Atualização posterior: as flags mencionadas na coordenação histórica abaixo foram removidas a pedido do usuário. Ver [revisão integrada sem flags](../../../.audits/studio-pro-revisao-sem-flags-2026-10-15.md). Preflight, permissões e preservação das propostas continuam obrigatórios.

Autorização explícita do usuário: implementar a revisão 3 no mesmo diretório, branch e worktree da sessão principal, com aviso e coordenação entre sessões.

Base: [.audits/studio-pro-sandbox-adendo-2026-10-15.md](../../../.audits/studio-pro-sandbox-adendo-2026-10-15.md), [review](../../../.audits/studio-pro-sandbox-adendo-review-2026-10-15.md) e [plano principal](2026-10-15-studio-pro-implementacao.md). Implementação autorizada A01–A06 / etapas 0–3; A07 permanece posterior conforme a proposta. Este documento não encerra aceites transversais do lote 9.

## Coordenação confirmada

- Worktree C:/Users/tocha/projects/sistema-zero, branch feat/studio-pro-completo. Sem checkout, stash, reset, stage abrangente, commit ou deploy nesta frente.
- Sessão principal 01a13f08-9d2b-7ab0-b8ad-b9dc600f145f avisada diretamente; confirmou a divisão e adiou commit/merge enquanto esta frente estiver ativa.
- Esta frente assume tutor/ZappyPanel/ProBuilderPanel, contexto, core/pro-builder, studio-zappy-adapter, routes/studio-builder, server/studio-builder*, state/proRevision, Members builder e recibos. Preservar availability(templateId,signal), M2 STUDIO_PRO_KITS_BUILDER no create/advance, preflight antes do create e UI indisponível que conserva propostas.
- A sessão principal mantém core/pro-runtime-capabilities/pro-publication/pro-templates, runtime inteiro, server/studio-pro-runtime, publicação/share/player, ProjectList/criação, env e campos/ações proMeta.publication.
- Persistência/proProject/proTree/projectValidation: extensões do adendo devem preservar publication; coordenação por função/campo. index.ts e package.json: apenas inclusões necessárias e coordenadas. Migrações Members: reservar numeração antes de gerar.
- Não duplicar typechecks globais simultâneos. Testes focados por responsável; typecheck integrado depois de estabilizar.

## Frentes e contratos

1. **Contexto e experiência (A01/A02):** seleção/diagnóstico com revisão, hash original e mapa de linhas; intenção por pedido; Zappy Pro no Pro; uma entrada, sem aba IA concorrente. Transferir objetivo/contexto para construção, com perguntas e edição manual independentes. Preservar contratos clássicos e autenticação/limites existentes.
2. **Domínio da assistência (A02/A06):** pedido estruturado limitado e idempotente; referência autorizada ao Pensa; apenas um job ativo por conta/perfil/projeto; listar/consultar/descartar sem inferência; eventos limitados e consulta distinta de continuar; resultados antigos continuam legíveis.
3. **Persistência e decisões (A03/A04):** metadados opcionais versionados, briefing editável e perguntas recuperáveis; inversa/registro local por projeto/perfil; confirmação de disco distinta de aplicação em memória. Coordenar gravações entre instâncias e manter recuperação de pagehide, autosave/restore e nuvem.
4. **Experimentação (A03):** resultado referencia artefato explícito/revisão/verificador; renderer isolado, armazenamento efêmero e só um jogo ativo; captura não vira URL de jogo. Recuperação de artefato expirado depende de fonte/material retidos, nova prova e quota, sem inferência.
5. **Continuidade e recursos (A04/A05):** briefing opcional, critérios por pedido, guia/receitas existentes para aprender/manualmente/construir; baseline/diagnóstico não autoriza reparos fora do escopo nem bypass dos gates.
6. **Integração e verificação:** contratos reais cliente/BFF/Members/runtime, migração, browser dos cinco cenários e concorrência; regressão clássico/hosts; homologação externa não será inferida de mocks.

## Checklist de execução

- [x] Conferir worktree/branch, ler plano atual e avisar sessão principal.
- [x] Obter divisão de arquivos e preservar mudanças em andamento do lote 9.
- [x] Definir contratos compatíveis e completar leitores antes de escritores.
- [x] Implementar contexto/intenções/experiência única e transferência ao construtor.
- [x] Implementar ciclo persistido de pedido/proposta, exclusão/idempotência e consulta/histórico.
- [x] Implementar aplicação/undo local recuperável, precondições e concorrência sem perder pagehide.
- [x] Implementar prévia candidata e associação de provas, retomada/expiração.
- [x] Implementar decisões opcionais, perguntas/receitas e continuidade por etapas.
- [x] Verificar matriz do adendo no escopo local, revisar diff próprio e integrar revisão com sessão principal; limites externos registrados no relatório.
- [x] Registrar evidências e liberar arquivos compartilhados.

## Registro

Início: leitura dos contratos e divisão confirmada. Três análises paralelas delimitam contexto, persistência e preview antes de editar seus arquivos. O problema identificado na persistência precisa ser resolvido na coordenação comum: CAS durável não pode substituir a gravação síncrona de saída por uma sequência que perca trabalho em pagehide.

Implementação e evidências: [.audits/studio-zappy-pro-adendo-implementacao-2026-10-15.md](../../../.audits/studio-zappy-pro-adendo-implementacao-2026-10-15.md). Os testes de UI usam serviços remotos controlados e não certificam inferência paga. A baseline contém observações TypeScript por revisão; não há comparação automática completa antes/depois por execução da base. A07, homologação externa e aceite transversal do lote 9 continuam separados. Migrações 0123/0124 geradas e testadas somente no Postgres local dedicado.

Encerramento local: typechecks Studio/member-shell/Members passaram; UI final 49 testes/185 assertions; persistência final 175 testes/643 assertions e browser isolado com 24 reloads Chromium/WebKit e concorrência entre writers. Revisão independente liberou sem novos impedimentos. Os cinco cenários no Monaco e três cenários de prévia passaram com serviços remotos controlados. Nenhum commit ou deploy nesta frente; ownership devolvido à sessão principal.
