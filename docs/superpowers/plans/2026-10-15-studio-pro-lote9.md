# Studio Pro — lote 9 e revisão final

**Consolidação:** implementação e revisão local encerradas. Resultados e limites em [review do lote](../../../.audits/studio-pro-lote9-review-2026-10-15.md) e [full review](../../../.audits/studio-pro-full-review-2026-10-15.md). Abaixo está o plano e o registro cronológico; pendências de implementação descritas como “em andamento” foram substituídas pela consolidação. Homologação externa e gates de rollout continuam explícitos.

Execução autorizada pela proposta original. Lote 8 concluído na implementação/revisão local; evidências e limitações em `.audits/studio-pro-lote8-review-2026-10-15.md`.

## Contratos e limites antes do custo

1. Centralizar limites/caminhos do compilador no core, sem importar o grafo inteiro de dependências no editor. Revisões locais podem conter capacidades maiores; o construtor deve informar incompatibilidade antes de reservar/despachar IA.
2. Preflight privado no runtime reutiliza exatamente o parser/lock/binaries do build, sem criar container nem chamar modelo. O BFF valida o projeto completo antes de criar/iniciar construção. Endpoint de capacidades informa disponibilidade e versão; o cliente não recebe credenciais nem seleciona modelo.
3. Harmonizar envelopes reais com fontes, manifesto, binários, ids e overhead. M1 (criação manual), M2 (construtor) e M3 (publicação) são portões de liberação distintos. Projetos que excedem o compilador não podem parecer compiláveis/publicáveis remotamente; continuar disponíveis localmente quando suportadas.
4. Recusar lock com grafo/resolução diferentes da imagem e testar restrições antes de quota. Preservar instalação npm livre no terminal local; não apagar fontes/arquivos por incompatibilidade remota.

## Publicação e recuperação

1. Revisar os caminhos atuais de compartilhar/Mural, player e export. Pro não pode cair no render clássico nem publicar URL de preview de 24 h como link permanente.
2. Adicionar artefato permanente por revisão, com vínculo/ownership no fluxo de publicação existente, promoção verificada e possibilidade de restaurar revisão publicada. A troca precisa ser atômica; falha mantém a anterior. Despublicação/revogação precisa alcançar o player.
3. Player Pro usa arquivo compilado de origem isolada; nunca instala npm ou compila no dispositivo de quem joga. Manter CSP/origin/storage e caminhos relativos, incluindo assets e captura. Validar modelo de retenção/rollback com os contratos existentes antes de alterar schema.

## Operação e revisão

- Testes de erro/retry/cancelamento/offline, perf com editor/preview quando disponível, sessão longa e recursos após ciclos. Separar laboratório, host autenticado, dispositivos físicos e infraestrutura externa.
- Revalidar os fluxos normal/Pro, tutor, terminal/Monaco, Pinta/Molda/Pensa, uso/limites/OpenRouter, revisão/diff/CAS, export e publicação. Só repetir baterias amplas após mudanças que justifiquem.
- Atualizar documentação de configuração, migrações, limites, custo, retenção, limpeza e rollout/rollback. Não aplicar migrações de produção, deploy ou chamadas pagas para provar o código local.
- Revisão geral do diff e evidências. Stage apenas escopo Studio/Canvas e integrações próprias; preservar Molda/marketing/TUI concorrentes. Commit e merge em `staging` local em worktree isolada, sem checkout abrangente da pasta compartilhada, sem push/deploy.


## Implementação e coordenação em andamento

- Preflight privado real com parser/lock/hash, envelope completo e flag M2: 12 testes BFF aprovados. Disponibilidade por template e recusa de create/advance preservam get/cancel/proposta. Criação M1 usa allowlist independente, padrão só starters; playground explicita todos os IDs. Revogação em voo cancela antes de persistir: 26 testes UI/escopo aprovados.
- Canvas com arte substituída + texto UTF-8: envelope exato 1.999.999 / 2.000.000 / 2.000.001 bytes, parser e verificação real dos binários; três casos aprovados com recusa somente acima do limite. Sem ampliar tetos.
- Publicação: R2 privado permanente por revisão aleatória; cópia dos arquivos verificados e fonte exata, manifesto antes do ponteiro. Ponteiro/histórico por playId com ownership derivado no BFF, versões e escrita condicional R2. Histórico limitado a 20 versões; publicação nova continua possível. Falha de compilação não altera ponteiro. Retry com mesma chave/fonte não duplica; conflito de CAS pede atualização. Post original mantém texto/capa; ações explícitas de versão do jogo serão oferecidas separadamente.
- Player lê artefato pronto, sem compiler/npm. Publicação não herda expiração de preview. Origem isolada/CSP/CORS compartilhadas com preview. Cada leitura (incluindo 304) verifica revisão ativa/desativação e visibilidade do Mural por callback privado configurado; requisições simultâneas compartilham somente a consulta em voo, sem cache de autorização após a resposta. Indisponibilidade fecha acesso. A URL pública definitiva continua /jogar/playId.
- Decisão CAS baseada na API primária: https://developers.cloudflare.com/r2/api/workers/workers-api-reference/ (put onlyIf retorna null se a condição falhar). Provas locais usam adapter de armazenamento com CAS; infraestrutura R2 real ainda não homologada.
- Primeira bateria de permanência/ownership/CAS/rollback/desativação/moderação junto de regressões de artefatos/runtime: 19 testes, 120 asserções aprovadas. Integração BFF/player/UX e limpeza ainda em andamento.

### Frente paralela Zappy Pro rev3

Sessão 01a14083-f2f8-7db3-a8f8-a2aa45abe625 implementa A01–A06/etapas 0–3 do adendo autorizado. Ela assume ZappyPanel/ProBuilderPanel, contexto, core/pro-builder, studio-zappy-adapter, routes/studio-builder, server/studio-builder*, state/proRevision, Members builder/metadata/recibos (migração seguinte livre 0123). ProProject/proTree/projectValidation/persistência: campos assistance e funções próprias reservados a ela; publication reservada à principal. index.ts/package.json append-only coordenado. Principal mantém publicação/player/runtime, server/studio-pro-runtime, criação/capabilities/env. Não fazer commit/merge abrangente até entrega coordenada. A07 continua posterior, fora desta integração.

Contrato solicitado pelo adendo: identidade de validação em core/pro-artifact, profileVersion e fingerprint gerado da toolchain/harness/lock; runtime/BFF retornam e candidata persiste no resultado. Implementação na frente principal.


## Liberação para integração local

A frente paralela concluiu A01–A06 e entregou os arquivos sem processos/mutações pendentes. Ownership devolvido à principal. Preflight, publicação/player, limpeza, descrição com ledger, bundle e persistência foram revistos em conjunto. A integração Git será restrita ao Studio e seus contratos, sem incluir mudanças concorrentes Molda/marketing/TUI. O aceite de produção não é inferido do merge local.
