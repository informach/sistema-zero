# Pensa v2 — revisão dos ajustes de funcionalidades e interface

Revisão de 14/10/2026, após alterações feitas em outra sessão. Base inspecionada: `9b8e019b6`, incluindo os lotes `99d45e7f1`, `2506c7e58` e `7f371febd`, mais os arquivos locais da equipe. Complementa as [duas](architectural-analysis-2026-10-14-pensa-v2.md) [revisões anteriores](architectural-analysis-2026-10-14-pensa-v2-round2.md); seus resultados não foram usados como evidência de aprovação atual.

**Resultado: quatro problemas reproduzidos e corrigidos.** Os dois mais graves interrompiam o planejamento entre participantes e permitiam substituir uma arte pessoal ao importar uma arte da equipe. A ajuda do Zappy e a atribuição das mensagens também não acompanhavam completamente a colaboração.

## Achados corrigidos

### R3-01 — Alta: colega não conseguia continuar uma operação de IA iniciada por outra criança

**Reprodução:** A inicia o pedido; B, de outra conta e integrante do mesmo plano, retoma o processamento ou responde à pergunta do Zappy. O repositório reutiliza o identificador da operação, mas tenta renovar sua reserva com a identidade de B. `reservePensaUsage` recusa com `PENSA_TASK_PROGRESS_CONFLICT`. O mesmo erro alcançava o aceite da proposta. O polling de um colega podia encontrar esse conflito mesmo sem uma ação explícita dele.

**Causa:** autorização para trabalhar no plano passou a ser coletiva; reserva, limite de chamadas externas e débito continuaram usando o ator de cada requisição como se ele fosse sempre quem iniciou a operação.

**Correção:** a operação conserva a conta, o perfil e o privilégio da reserva original. Aceite, respostas intermediárias, retomada, teto de chamadas e publicação usam essa mesma identidade financeira. A pessoa que executa a requisição continua passando pela autorização de acesso ao projeto. Contas são travadas antes do projeto e em ordem estável; se uma operação de outra conta surgir durante a espera, a transação pede atualização em vez de conferir cota sem a trava ou adquirir travas fora de ordem.

**Evidência:** dois testes falharam antes da correção no Postgres real. Cinco cenários novos agora cobrem ajuda retomada e debitada uma vez na conta original, resposta/aceite após expiração, teto externo da conta original, impossibilidade de aproveitar o privilégio do colega para aumentar a cota e duas contas retomando simultaneamente os pedidos uma da outra. O fluxo de proposta → aceite → guias → publicação também termina em construção.

Arquivo principal: `packages/members/src/infrastructure/persistence/drizzle/pensa-journey.repository.ts` (travas e pagador a partir das linhas 135 e 178).

### R3-02 — Alta: importação da equipe podia sobrescrever arte pessoal com o mesmo ID

**Reprodução:** dois perfis têm arquivos com o mesmo ID — por exemplo, depois de importar o mesmo desenho. “Trazer da equipe” gravava o ID bruto da criação da colega na biblioteca pessoal, cuja operação é um upsert por ID. Isso substituía o conteúdo anterior e podia propagar a troca aos jogos que usam aquele vínculo. A colisão também era possível entre duas artes de colegas.

**Correção:** cada cópia compartilhada recebe `equipe-<id da missão>`. Lista, gravação no armazenamento e resultado entregue ao Estúdio usam a mesma identidade. Reimportar a mesma missão atualiza sua cópia; outra missão e o desenho pessoal ficam separados. A regra vale para Pinta e Molda.

**Evidência:** o teste de colisão falhou antes da mudança. Depois verifica separação do ID pessoal, separação entre missões, estabilidade ao reimportar e correspondência entre a lista e os itens gravados. A suíte de importação aprova conversão real do Pinta, gzip, origem do Molda, revisão de perdas, erros e versão incompatível. Os testes do diálogo do Estúdio confirmam atualização no lugar e descarte de importação que termina após trocar de jogo.

**Compatibilidade:** cópias feitas pelo comportamento anterior não são apagadas nem reescritas automaticamente. Uma primeira reimportação dessas artes poderá acrescentar a nova cópia independente; a revisão não faz migração destrutiva de vínculos antigos.

Arquivo: `packages/community-kids/src/lib/pensa-team-library.ts`, identidade na linha 41 e aplicação na listagem e nas duas importações.

### R3-03 — Média: Zappy ajudava na missão de outra pessoa e desconhecia a ponte de artes da equipe

**Reprodução:** programação em andamento e desenho elegível em paralelo; a artista pede ajuda. O worker usava a próxima tarefa geral, escolhendo programação. Além disso, a orientação dos guias mandava trazer desenhos pelo Pinta pessoal de quem programa, mesmo quando a arte estava na conta de uma colega. O prompt não descrevia essa distinção.

**Correção:** o servidor registra quem enviou a mensagem atual, separado de quem paga e de quem retoma o processamento. A seleção da ajuda usa `nextPensaMissionFor`, a mesma regra de funções e ocupação usada na interface. O modelo recebe apenas indicadores de funções e colaboração, sem os IDs dos participantes. O guia e o mapa da interface explicam “Trazer da equipe”, a entrega da missão e a diferença para a biblioteca pessoal. Quando não há missão própria disponível, a ajuda não recebe a missão de outra pessoa como se fosse sua.

**Evidência:** dois testes do worker falharam antes da correção. Agora o pedido da artista continua apontando para o desenho mesmo processado por quem programa; o guia recebe o contexto compartilhado e a orientação da ponte. Testes de orçamento continuam aprovados: sistema e usuário somados cabem no teto de 48 KB. A identidade de quem fez a pergunta também é verificada nos testes reais do repositório.

**Limite:** os testes provam seleção de contexto e montagem do pedido. Não provam que toda resposta futura de um modelo seguirá perfeitamente as instruções. Nenhuma chamada paga foi feita nesta revisão.

Arquivos: `member-shell/src/server/pensa-journey/missions.ts`, `planner.ts`, `interface-map.ts` e o input persistido pelo repositório do Members.

### R3-04 — Média: mensagens de colegas apareciam como “Você”

**Reprodução:** com duas pessoas no plano, o polling recebe uma nova ideia da colega e a interface a atribui à criança que está lendo.

**Correção:** em modo de equipe, o histórico passa a ser “Conversa da equipe com o Zappy” e as mensagens humanas usam “Equipe”. A conversa solo mantém “Você”. O histórico existente não tem autoria individual suficiente para inventar nomes retroativamente.

**Evidência:** a asserção da mensagem recebida por polling falhou com “Você” e passou com “Equipe”. O teste também confirma que a atualização não apaga o rascunho da criança. A suíte completa do Pensa continua passando.

Arquivo: `packages/pensa/src/components/JourneyApp.tsx`, linhas 1224 e 1235.

## Coerência do produto e facilidade para a criança

O fluxo principal permanece coerente com a proposta aprovada: narrativa livre, escolha de um primeiro resultado pequeno, construção pela criança e observação do que aconteceu. O mapa ZERO acompanha as ações, sem transformar o primeiro contato numa entrevista. A arquitetura usa OpenRouter para planejamento e transcrição; a escuta opcional usa a integração existente com ElevenLabs.

Na interface, o próximo passo tem uma ação concreta e uma ferramenta de destino. Caminho completo, ideias futuras, referências e cuidados do projeto ficam em áreas expansíveis. “Travei nesta parte” oferece exemplos que preenchem a mensagem sem enviá-la. No trabalho em equipe, a criança vê sua missão ou quem precisa terminar antes; operações de testar, guardar e restaurar ficam com quem programa. Essas escolhas reduzem decisões simultâneas e evitam apresentar botões que o servidor recusaria por função.

A nova direção visual usa as faixas, fontes, tokens e componentes de chrome da Comunidade Kids. Há regras por largura do container, alvos de toque e gestão de foco nos diálogos. Testes de componentes cobrem entrar por código, confirmação de saída, erro de funções sem fechar a janela, Escape, retorno do foco, estado de espera, preservação de rascunho e navegação tardia. Isso sustenta a revisão de implementação; não equivale a uma inspeção visual renderizada ou a uma avaliação de compreensão por crianças.

Pontos de produto que continuam exigindo observação real:

- A colaboração acrescenta funções e estados de espera. Avaliar se crianças de 8–10 anos compreendem a relação entre terminar uma arte e ela aparecer para quem programa.
- A aplicação não transfere o jogo entre perfis quando quem programa sai. A interface avisa que ele permanece no Estúdio daquela pessoa. Esse é um limite explícito do desenho atual, não uma transferência automática comprovada.
- A execução técnica de combinações de mecânicas ainda depende de construir e experimentar os jogos. Catálogo autorizado, esquema válido e revisão pelo modelo não são prova de jogabilidade.
- O histórico compartilhado distingue a equipe do Zappy, mas ainda não identifica individualmente cada mensagem antiga.

## Integrações e arquitetura conferidas

| Área | Verificação desta rodada |
| --- | --- |
| Permissões | Perfil e conta no acesso ao projeto; proprietário para administração; programador para teste/proteção; função e ocupação para missão; evidência da criação na conta de quem conclui. |
| Recursos liberados | Estúdio e blocos de quem programa; ferramentas de arte de quem desenha; falha fechada quando não se consegue conferir recursos; nova conferência antes de publicar proposta e guias. |
| Conhecimento | Contexto oficial, manuais e aulas com limites de tamanho; fontes encontradas não equivalem a aula feita nem a acesso garantido. |
| Trabalho durável | Reserva, lease, retomada, tentativa limitada, cancelamento, publicação atômica e efeitos de respostas tardias. |
| Voz | Ditado revisável, limites, consentimento dos responsáveis, fonte privada para narração e descarte ao cancelar; provedores simulados. |
| Estúdio/Pinta/Molda | Encaminhamento, evidência de salvamento, próxima missão, importação da equipe, identidade da cópia e tratamento de falhas. |
| Proteção de versões | Teste da revisão atual, cópia e restauração, corrida com autosave, preservação local em conflitos e marca de restauração pendente. |
| Migração | SQL real da `0115_pensa_v2_team.sql` aplicado duas vezes em schema isolado; colunas, papel válido, único programador e exclusão em cascata. |
| Compatibilidade | Jornada atual e rotas do legado; a substituição integral sem flag foi registrada pela outra sessão como decisão da dona e foi preservada. |

Há concentração de responsabilidades: `JourneyApp.tsx` tem 2.055 linhas, o repositório da jornada 1.684, o planner 752 e o diálogo de equipe 671. É um risco de manutenção, especialmente nas combinações de navegação, equipe e processamento. Uma extração futura de controladores e transações por responsabilidade deve preservar os testes comportamentais. Esta rodada não executou uma reorganização ampla nem tratou exports públicos ou código legado como descartáveis apenas por terem poucos consumidores internos.

## Evidência de validação

Testes distintos executados nesta revisão, sem contar repetições:

| Grupo | Aprovados |
| --- | ---: |
| Core: Pensa | 11 |
| Pensa completo | 133 |
| Member-shell: planejamento, equipe, contratos, orçamento, proteção e voz | 208 |
| Kids: guias, importação, voz, sincronização, fila e restauração | 194 |
| Members: domínio, aplicação, HTTP, Postgres e migrations | 71 |
| Estúdio: importação da equipe, guia, persistência e catálogo de exemplos | 106 |
| Pinta: interface, guia e persistência | 27 |
| Gateway: configuração, registro e política Kids | 64 |
| **Total** | **814** |

São suítes selecionadas pelo impacto da mudança, não a suíte inteira do monorepo. Postgres local real; OpenRouter, ElevenLabs e R2 simulados. Alguns testes de polling e painel emitem avisos React de atualização fora de `act`; não falharam, mas esses avisos não foram apresentados como evidência de uma suíte sem ruído.

Biome aprovou os onze arquivos de código/teste desta revisão. `git diff --check` aprovou os caminhos modificados conferidos. Typechecks de Pensa, Members e Member-shell passaram. O typecheck global de Core encontrou `tests/live-completion.test.ts:19`, chamada de `defaultLessonSection` com um argumento quando a assinatura exige três. Esse arquivo pertence ao trabalho concorrente de aulas ao vivo e não foi alterado nesta revisão.

O primeiro grupo de banco encontrou uma view antiga de aulas no banco local escolhido pelo teste legado. A repetição em banco de teste próprio aprovou todos os 71 cenários. O teste novo da migration precisou usar `try/await/catch` em vez de matcher de rejeição sobre a consulta lazy do Postgres; a versão final passou, e o schema temporário da execução interrompida foi removido.

O primeiro build do Kids compilou, mas a checagem de tipos encontrou uma comparação de `unknown[]` no novo teste de importação. Enquanto esta revisão rodava, o arquivo compartilhado recebeu o ajuste de tipagem; ele foi preservado e os 20 testes de importação passaram novamente. **O build final completo passou, saída 0:** compilação em 28,6 s, TypeScript em 14,7 s e geração de 73 páginas. O typecheck do Members foi repetido com o novo teste de migration e também passou. Após ajustar a consulta de trava para aproveitar o índice UUID, os 19 testes reais do repositório da jornada passaram novamente.

Comandos principais:

```text
core: bun test tests/pensa.test.ts
pensa: bun test src
member-shell: bun test [arquivos de pensa-*, private-narration*, private-voice, voice-transcribe, voice-spoken e studio-zappy-pensa]
community-kids: bun test [arquivos de pensa-*, use-pensa-*, private-zappy-voice, voice-input, studio-cloud, creations-cloud e guias]
members: bun test tests/db/pensa-journey.repository.test.ts tests/db/pensa-team-v2.test.ts tests/db/pensa-team-migration.test.ts tests/db/pensa-team-v2-migration.test.ts tests/integration/pensa-journey-routes.test.ts tests/integration/pensa-team-v2.test.ts tests/integration/pensa-team.test.ts tests/unit/pensa.test.ts tests/application/pensa.test.ts
studio: bun test src/components/assets/TeamImportDialog.test.tsx src/studio/TaskGuidePanel.test.tsx src/state/persistence.test.ts src/examples/serverExamples.test.ts
pinta: bun test src/components/PintaApp.test.tsx src/state/persistence.test.ts
api-gateway: bun test tests/unit/config.test.ts tests/unit/route-registry.test.ts tests/unit/kids-access-policy.test.ts
community-kids: bun run build
```

## Limites da conclusão

O navegador integrado retornou `No browser is available` e a listagem retornou `[]`. Não houve inspeção visual em navegador, teste real em celular, leitor de tela nem sessão com criança. O relatório não declara esses fluxos aprovados visualmente. A avaliação de interface combina leitura do código e testes de componentes.

Não houve chamada paga aos provedores, teste de R2 real, migração remota, deploy ou commit. A migration 0115 e seu snapshot já estavam como arquivos locais não rastreados quando a revisão começou; foram usados para validação, sem atribuir sua autoria a esta rodada. As alterações concorrentes de oficinas, aulas, Molda, admin e marketing foram preservadas. Em `pensa-team-library.test.ts`, foi mantido também o ajuste de Blob que já existia antes desta revisão.
