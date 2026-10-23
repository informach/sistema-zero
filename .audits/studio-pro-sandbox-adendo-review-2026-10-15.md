# Review 3 — integração do adendo ao Studio Pro

Data: 15/10/2026. Escopo: revisão e correção da proposta; sem alteração do produto, migração, commit ou deploy nesta frente.

**Parecer:** a direção Zappy Pro é compatível com a proposta principal. A revisão anterior ainda tinha lacunas de persistência, versões, retenção e divisão de responsabilidades. A [revisão 3 do adendo](studio-pro-sandbox-adendo-2026-10-15.md) as corrige e vincula cada extensão aos lotes existentes. O parecer é sobre a arquitetura proposta; não certifica funcionalidades ainda não implementadas.

## 1. Base efetivamente conferida

- [Proposta principal v2](studio-pro-proposta-v2-2026-10-15.md): fronteiras da biblioteca/host/BFF/Members/runtime, R01–R14, lotes 0–9, custos, segurança e critérios de aceite.
- [Plano em execução](../docs/superpowers/plans/2026-10-15-studio-pro-implementacao.md): encerramento funcional do lote 7; atualização posterior registra a revisão local do lote 8 e continuação no lote 9.
- [Plano do lote 8](../docs/superpowers/plans/2026-10-15-studio-pro-lote8.md) e [relatório de entrega](studio-pro-lote8-review-2026-10-15.md): três novos kits, curadoria por tarefa, materiais e provas locais. Não repliquei essas provas nem as somei às desta revisão.
- [Coordenação Canvas](../docs/superpowers/plans/2026-10-15-studio-canvas-coordenacao.md) e [entrega Canvas](studio-pro-canvas-implementacao-2026-10-15.md): fontes estabilizadas/liberadas, limites preservados e responsabilidades da sessão principal.
- Código de tutor, painel IA, builder, revisão/aplicação, persistência, Pensa, adapters/rotas, domínio Members, capacidades e artefatos do runtime.

Worktree: C:/Users/tocha/projects/sistema-zero. Branch observada: feat/studio-pro-completo. O HEAD não identifica sozinho esta base: há alterações locais em andamento. [Snapshot de arquivos, comandos e resultados](studio-adendo-review3-evidence-2026-10-15.json).

**Mudança durante o review:** a sessão principal encerrou sua revisão local do lote 8 e introduziu, no lote 9, disponibilidade, liberação por template e preflight compartilhado do construtor. Reli os novos arquivos e repeti os testes afetados. O adendo agora consome essa frente; não classifica preflight como implementação ausente a ser criada em paralelo. O snapshot delimita a base examinada; alterações posteriores da sessão principal exigem conferência na incorporação do delta, sem pressupor que este review as homologou.

## 2. Achados e correções

P1 significa condição que precisa estar resolvida antes de ativar a capacidade correspondente. P2 significa ajuste necessário de experiência/integração. “Corrigido na proposta” não significa implementado no produto.

| ID | Prioridade | Achado sustentado pelo código/contrato | Correção na revisão 3 |
|---|---|---|---|
| I01 | P1 | Uma “tarefa” nova poderia duplicar a missão, seu progresso e sua conclusão no Pensa | Pedido de assistência distinto; missão continua em StudioTaskSession e no host. Aplicar não conclui missão; conclusão mantém save confirmado |
| I02 | P1 | ProMeta novo só no TypeScript não sobrevive ao parser; a guarda de preservação recusa o documento | Schema/migração/leitores antes dos escritores, roundtrip e recusa segura por cliente antigo. Não remover a guarda para aceitar metadados |
| I03 | P1 | Inversa vive em useState; reabrir painel a perde. Histórico grande em proMeta aumentaria cada autosave/nuvem | Partição auxiliar local, limitada, com operação/revisão e mesma transação de gravação. Distinguir memória, disco e nuvem; undo entre aparelhos fora do primeiro corte |
| I04 | P1 | Filas JavaScript e CAS do store não provam exclusão entre abas ou proteção contra autosave atrasado | Conferir versão durável na transação comum; editor/terminal/IA usam a mesma coordenação. Prova com duas instâncias e falha de quota obrigatória |
| I05 | P1 | Retenção do job é de até sete dias, mas teto familiar pode remover propostas prontas antes; artifact expira em 24 h | Estados de indisponibilidade e retenções explícitas. Consulta não regenera nem consome modelo. Reconstrução só com fontes/material retidos e nova prova |
| I06 | P1 | Builder conserva evidência, mas não o descritor completo do artefato. ID aleatório e digest do compilado não são hash das fontes | Reusar StudioProArtifact, associando revisão/runtime/perfil. Persistir e validar o vínculo em cada fronteira, sem inferir URL pela captura |
| I07 | P1 | Prévia remota atual lê store vivo e armazenamento do jogo; candidata poderia contaminar recordes ou disputar input/áudio | Renderer com artefato explícito, progresso efêmero e uma instância ativa. Suspender/desmontar jogo atual preservando editor/terminal |
| I08 | P1 | “Aplicar uma parte apesar de falhas” criaria uma segunda política de validação ainda não demonstrada | Manter os gates do builder. Mudança pequena pode ser validada sem concluir o jogo; base inválida leva a diagnóstico, sem reparo fora de escopo nem bypass |
| I09 | P1 | UI impede novo envio no painel, mas create do domínio ainda permite jobs distintos ativos para o mesmo projeto | Exclusão por conta/perfil/projeto no lock/transação existentes; retry mantém ID e conteúdo, mudança real cria novo pedido |
| I10 | P1 | Vários jobs automáticos poderiam reiniciar limites de três chamadas/três validações/cinco minutos | Continuações explícitas inicialmente. Autonomia entre jobs depende de orçamento agregado e checkpoints no domínio/ledger existentes |
| I11 | P2 | Catálogo por tarefa e novos kits já existem no lote 8; criar outro sistema duplicaria conteúdo e seleção | Estender studioProGameGuide/studioProTaskGuides com referências verificadas e apresentação didática; não importar engine nem corpus do Sandbox |
| I12 | P2 | Retirar AIPanel sem inventariar hosts quebraria playground/consumidores ou mostraria um Zappy sem autorização | Uma entrada no produto; compatibilidade de biblioteca separada; host sem tutor não recebe mock, chave local ou assistente falso |
| I13 | P1 | BFF não pode buscar do disco o código ainda não salvo; sanitização pode alterar linhas | Contexto limitado enviado pelo cliente com revisão/intervalos; hash original distinto do digest sanitizado e referências validadas |
| I14 | P1 | Projeto pode caber no editor/builder e não no envelope remoto; mesmo protocolo não implica build garantido | Reusar preflight que o lote 9 está implementando, antes de inferência; validar entrada e depois saída; preservar edição/orientação para incompatíveis |
| I15 | P2 | “Excluir projeto cancela o job” é falso quando o aparelho está offline | Cancelamento pendente até ACK; não recriar/aplicar resultado tardio. Limites do servidor continuam valendo |

Os achados têm encaminhamento concreto no adendo: seções 4–10 definem os contratos; seção 11 mapeia A01–A07 para lotes/R01–R14, responsáveis, dependências e migração; seção 12 define o aceite observável. Não foram transformados em um segundo backlog de reconstrução dos lotes já entregues.

### Pontos de código que sustentam os achados

| Fronteira | Fonte e observação |
|---|---|
| Missão | packages/studio/src/studio/types.ts: StudioTaskSession; taskSessionSave.ts: withSaveBeforeTaskActions; salvar precede ações de conclusão/continuação |
| Metadados | packages/studio/src/state/proTree.ts: sanitizeProMeta; core/projectDocument.ts: assertProjectContentPreserved; projectValidation.ts: chama ambos |
| Revisão e undo | packages/studio/src/components/tutor/ProBuilderPanel.tsx: inverse/setInverse; state/proRevision.ts: captura/flush/CAS/aplicação |
| Persistência | packages/studio/src/state/persistence.ts: meta/files/state a cada save, assets por referência; projectStorageRuntime.ts: fila em memória; projectStorageRecords.ts: partições |
| Jobs | packages/core/src/studio/pro-builder.ts: limites, fases, result/adapter; Members studio-builder.repository.ts: lock da conta, idempotência por ID e remoção do job finalizado mais antigo |
| Prova | packages/member-shell/src/server/studio-builder.ts: checkpoint conserva built.evidence; studio-pro-runtime.ts: valida descritor/origem/captura; runtime artifacts.ts: UUID, digest de manifesto e TTL |
| Capacidade | core/studio/pro-runtime-capabilities.ts: envelope completo compartilhado; member-shell routes/studio-builder.ts: preflight antes do create; runtime tests/capabilities.test.ts: materiais/caminhos |
| Curadoria | core/studio/pro-game-knowledge.ts; chamada com pergunta em zappy-ai.ts e com objetivo em studio-builder-tools.ts |
| Hosts | Kids studio-pro-client.tsx injeta tutor; Studio playground/App.tsx habilita ai:true; inventário precede remoção de APIs públicas |

Os caminhos completos e hashes estão no snapshot. Números de linha mudam com a sessão ativa; os nomes de função são os pontos estáveis de consulta.

## 3. Decisões que preservam a proposta principal

1. **Um Zappy por ambiente.** Reunir a experiência sobre tutor e builder existentes; ferramentas de leitura e preparação de candidata conservam permissões distintas. Não renomear AIPanel e manter dois históricos.
2. **Cinco cenários no mesmo documento.** Edição manual não depende de chat/créditos; perguntas não mutam; construção por partes e integral usam o mesmo mecanismo de revisão. Não há um modo permanente “projeto da IA”.
3. **Autoria e integridade primeiro.** Documento, coordenador, persistência, assets, ledger, runtime e Pensa mantêm seus donos. Não há store paralelo, segunda carteira, restauração forçada de snapshot ou mutação temporária do projeto para exibir a candidata.
4. **Aproveitamento próprio dos kits.** O pacote Canvas e a expansão do lote 8 são a base. Sandbox inspira composição/fluxos; sua infraestrutura e seu código não viram dependência automática do produto.
5. **Primeira integração delimitada.** Etapas 0–3 do adendo: contratos, experiência única, revisão confiável, decisões e recursos. Execução fora da aba, merge em três versões e encadeamento automático de jobs têm aceites próprios posteriores.

## 4. Verificação executada nesta rodada

| Pacote | Comando, a partir do pacote | Último resultado |
|---|---|---|
| Studio | bun test src/state/proTree.test.ts src/state/projectOperations.test.ts src/state/persistence.test.ts src/studio/TaskGuidePanel.test.tsx | 118 passaram, 394 asserções |
| member-shell | bun test tests/studio-builder-route.test.ts tests/studio-pro-runtime.test.ts tests/studio-game-knowledge.test.ts | 14 passaram, 108 asserções; repetido depois das mudanças do lote 9 |
| core | bun test src/studio/pro-build.test.ts | 3 passaram, 5 asserções |
| studio-runtime | bun test tests/capabilities.test.ts | 2 passaram, 8 asserções |

**137 testes nas últimas execuções das quatro seleções, zero falhas.** Os resultados anteriores do member-shell tinham 10 e 13 testes e foram substituídos pela última repetição; não contam novamente. São testes da base existente/em implementação, não cobertura dos recursos futuros descritos no adendo. Não houve typecheck global, build do produto ou nova homologação de browser nesta revisão documental.

[Sondagens reproduzíveis](review-studio-adendo-integracao-2026-10-15.mjs), comando na raiz: bun .audits/review-studio-adendo-integracao-2026-10-15.mjs. [Resultado](studio-adendo-review3-probes-2026-10-15.json):

- Metadado proposto removido pelo sanitizador provoca a recusa real da guarda de preservação. Exercício da fronteira, não roundtrip completo de IndexedDB/nuvem.
- Envelope sintético com binário de 1.500.000 bytes excede o limite remoto após base64/envelope, embora fique abaixo do teto de payload do builder. O helper compartilhado recém-introduzido o recusa. Nenhum pedido foi enviado ao serviço.
- Curadoria real retorna no máximo três guias; catálogo contém 14 IDs e os três do lote 8. Não certifica jogabilidade ou qualidade pedagógica.
- Writer real de artefato com bucket em memória produz IDs diferentes para mesmo manifesto, mesmo digest e prazo de 24 h. Não é teste de R2 nem de autenticação remota.

Não houve inferência paga, acesso a dados reais de famílias, execução do app Sandbox, instalação de dependências, migração ou deploy. A análise externa anterior e suas reproduções permanecem em seus artefatos próprios; a pasta reference do repositório externo não fez parte desta rodada.

## 5. O que ainda precisa ser demonstrado pela implementação

- Jornada autenticada nos cinco cenários, inclusive contexto de seleção fora do prefixo, erro lógico sem exceção e orientação sem solução pronta; avaliar respostas reais além de testes de prompt/schema.
- Aplicação/undo duráveis, quota cheia, reabertura, duas instâncias, autosave antigo, perfil A→B→A, nuvem/importação e cliente de versão anterior.
- Candidata jogável sem gravar recordes reais, sem input/áudio duplicados e com evidências da revisão exibida; artefato expirado e runtime atualizado tratados sem prova reaproveitada indevidamente.
- Idempotência e exclusão no domínio, limites/ledger, cancelamento tardio e indisponibilidade. Consulta/reabertura não pode disparar inferência.
- Regressão dos hosts, acessibilidade e responsividade; publicação, dispositivos físicos, operação e demais critérios transversais continuam no lote 9 da proposta principal.

Esses itens são gates de ativação das respectivas capacidades, não dúvidas conceituais transferidas ao usuário. A ausência das provas impede declarar o adendo implementado/homologado; não impede integrar a especificação ao trabalho atual.

## 6. Handoff para a sessão principal

Usar a revisão 3 de .audits/studio-pro-sandbox-adendo-2026-10-15.md como delta da proposta v2. Manter a propriedade já combinada de runtime/BFF/builder/persistência/publicação. Consumir preflight do lote 9 e curadoria do lote 8. A01–A07 explicitam o que acrescentar e o que fica posterior. Antes de implementar, conferir o diff corrente e atribuir um responsável por contrato/arquivo compartilhado.

Esta frente não alterou arquivos de produto nem checkboxes do plano principal. Os documentos e evidências ficam no mesmo worktree/branch. Este registro de handoff não equivale a afirmar que a outra sessão recebeu uma mensagem direta ou aceitou novas reservas de arquivos.
