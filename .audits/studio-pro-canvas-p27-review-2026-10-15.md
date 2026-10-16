# Review da proposta de kit Canvas 2D para o Studio Pro

Data: 15/10/2026. Objeto: [adendo 6A.2, agora em revisão 2](studio-pro-canvas-p27-proposta-2026-10-15.md). Escopo: revisão da especificação contra o código disponível, a proposta Pro v2 e a execução em andamento. Esta rodada altera documentação; não implementa o kit nem corrige o produto da outra sessão.

## Parecer

A direção arquitetural é adequada: kit próprio, código TS editável, infraestrutura Pro existente e pack de origem conhecida. A primeira versão ainda não era suficientemente fechada para execução: algumas capacidades eram tratadas como herdadas quando os helpers não as oferecem, e os testes existentes não comprovam todos os caminhos prometidos.

A revisão 2 mantém o gênero e a arquitetura, fecha os contratos abaixo e separa criação manual, construtor e publicação permanente. As lacunas foram **corrigidas na proposta**. Sua resolução no produto continua condicionada à implementação e às evidências de C01–C23; esta review não certifica desempenho, ausência de bugs ou aprovação desses critérios.

## Achados e melhorias incorporadas

### RV01 — Alta: criação assíncrona sem propriedade definida por perfil

O store aguarda o factory e só depois persiste; a persistência captura o perfil quando chamada, e a tela abre o resultado sem verificar se o contexto ainda é o mesmo. Carregar o pack aumenta essa janela. Evidências: [projectStore.ts](../packages/studio/src/state/projectStore.ts#L512), [persistence.ts](../packages/studio/src/state/persistence.ts#L240) e [ProjectList.tsx](../packages/studio/src/projects/ProjectList.tsx#L324).

**Incorporado:** captura de escopo/identidade/token/ID antes do primeiro await; factory sem efeitos de persistência/navegação; commit exclusivamente no escopo original; resposta obsoleta sem navegação; cancelamento definido antes e depois do início da transação; retry sem duplicar o projeto. Cobertura: §5.1, C02.

### RV02 — Alta: input por frame poderia perder ou repetir o pulso

`take()` remove imediatamente a borda. O helper também produz bordas por fonte física, permitindo outro pulso ao adicionar toque a uma tecla mantida. Limpar o estado e receber key repeat pode reativar uma ação. Evidência: [shared.ts](../packages/studio/src/components/code/pro-templates/games/shared.ts#L139). A revisão incluiu microverificações isoladas dessas três situações; elas demonstram o comportamento do helper, não um defeito já observado na arena, que ainda não existe.

**Incorporado:** consumo apenas no tick executado, borda agregada por ação, política explícita de cooldown/rearme e três contatos para diagonal + pulso. Repetibilidade é definida por ticks/configuração/seed, sem prometer igualdade de tempo de parede após descarte. Cobertura: §5.4, C05/C08/C09.

### RV03 — Alta: combate, morte e pool ainda permitiam decisões incidentais

A primeira proposta não fechava contato versus pulso, múltiplos contatos, disponibilidade do slot durante animação de morte e significado de “adiar spawn”. A [auditoria P27](architectural-analysis-studio-pro-canvas-p27-2026-10-15.md) mostra por que ordem e tempo precisam ser explícitos.

**Incorporado:** pulso instantâneo antes de contato dos sobreviventes; um dano por janela; derrota prevalece em empate; slot lógico liberado na morte; efeitos separados; uma intenção pendente e tentativas limitadas; IDs estáveis por spawn; swept AABB para contato rápido. Sem motor físico, ECS ou estrutura espacial nova. Cobertura: §5.4, C06/C07.

### RV04 — Alta: loading, retry e menu eram promessas sem API correspondente

A UI compartilhada oferece começar/pausar/reiniciar, mas `onReset` habilita Começar imediatamente. Não há contrato completo de disponibilidade/retry/retorno ao menu. Áudio ativo também não é interrompido por mute/pausa, e qualidade econômica não implementa preferência de movimento reduzido. Evidência: [shared.ts](../packages/studio/src/components/code/pro-templates/games/shared.ts#L62).

**Incorporado:** extensões pequenas e compatíveis da UI, disponibilidade separada da fase, propriedade do loader, geração de tentativa, cleanup idempotente e áudio interrompível. A arena não ganha máquina de fase paralela nem acesso ad hoc a IDs do DOM. Cobertura: §5.3/§5.6, C04/C11/C13/C17/C22.

### RV05 — Alta: o caminho manual do Pinta estava incompleto

O binding pede `ProjectAsset.id`, enquanto o painel mostra nome/URL. ID da criação na biblioteca e ID do asset do projeto são diferentes. Evidências: [ProAssetPaths.tsx](../packages/studio/src/components/assets/ProAssetPaths.tsx#L35) e [projectStore.ts](../packages/studio/src/state/projectStore.ts).

**Incorporado:** copiar ID/trecho válido no painel existente; distinguir atualização da mesma criação de substituição por outra; aceitar PNG estático; mapear animações explicitamente. Corpo fixo é o padrão para preservar colisão ao trocar arte; usar hitbox do sprite é opção explícita. Ausência de hitbox segue o retângulo inteiro do [contrato canônico](../packages/studio/src/core/project.ts#L343). FPS fracionário do P27 deixou de ser descrito como conversão exata para FPS inteiro. Cobertura: §5.6, C10/C11.

### RV06 — Alta: ID estável não garante conteúdo atualizado

O caminho do asset deriva do hash do ID, enquanto o conteúdo possui outro hash. Atualizar a imagem pode manter ID e URL; cache por ID/URL não distingue essas versões. Evidência: [proAssets.ts](../packages/studio/src/core/proAssets.ts#L91).

**Incorporado:** snapshot coerente de revisão, hash de conteúdo e assinatura de metadados; invalidação inclusive para alteração só de animações; respostas antigas ignoradas; reinício da instância via preview existente, sem troca parcial no meio da partida. Publicação conserva bytes da revisão. Cobertura: §5.6, C10/C11/C15/C23.

### RV07 — Alta: exportação reproduzível não estava demonstrada

O teste remoto usa dependências por symlink e substitui configurações por versões confiáveis. O Dockerfile exportado instala antes de copiar o lock; o LEIA-ME de fontes ainda orienta fluxo clássico e pode sobrescrever arquivo do usuário. Evidências: [game-kits.test.ts](../packages/studio-runtime/tests/game-kits.test.ts#L16), [deployTemplates.ts](../packages/studio/src/export/deployTemplates.ts#L26) e [sourceExport.ts](../packages/studio/src/export/sourceExport.ts#L89).

**Incorporado:** lock coerente também aceito pelo parser remoto real; prova do runtime distinta da prova do ZIP em diretório limpo; Dockerfile respeita lock; README Pro e política de colisões; projetos sem lock recebem instruções honestas. Snapshot JSON reimportável e ZIP externo são entregas distintas. Cobertura: §5.8, C15/C16.

### RV08 — Alta: testes genéricos poderiam aprovar um produto diferente

As suítes de objetivo/desempenho montam só a árvore e instrumentam `main.ts` por substituição textual. A estratégia genérica de outro gênero mantém Space pressionado, inadequado para pulso na borda. Evidências: [objetivos](../packages/studio/e2e/pro-kit-objectives.spec.ts#L21) e [desempenho](../packages/studio/e2e/pro-kit-performance.spec.ts#L47).

**Incorporado:** fixture do factory público com pack e `buildProAssetBundle`; dispatch de cenário explícito por ID; bootstrap de teste tipado, sem substituição textual; E2E adicional com entry de produção intacto; vitória por tempo, eliminações e derrota separadas. Medição usa estado real e orçamento que pode reprovar. Cobertura: §8/§9, C03/C04/C15/C17/C22.

### RV09 — Média: geração e tipos portáteis precisavam de verificação obrigatória

Fontes fora do include do host podem divergir da string distribuída sem falhar no typecheck atual. O jogo exportado também não pode importar os tipos internos do Studio. Evidências: [tsconfig.json](../packages/studio/tsconfig.json), [games.ts](../packages/studio/src/components/code/pro-templates/games.ts) e [manifesto](../packages/studio/src/core/proAssets.ts#L14).

**Incorporado:** gerador determinístico, check sem escrita no CI, rejeição de colisões, typecheck próprio do gerador/árvore materializada e tipos/validador portáteis do mesmo contrato serializado. Cobertura: §5.2, C03/C20.

### RV10 — Média: limites agregados não fechavam rede e decode

Assets locais podem caber na persistência e exceder o envelope remoto. A estimativa atual de fontes não inclui todos os binários/campos. Conferir pixels só depois do decode também não limita a primeira alocação. Evidências: [pro-build.ts](../packages/core/src/studio/pro-build.ts#L35), [proAssets.ts](../packages/studio/src/core/proAssets.ts) e [project.ts](../packages/studio/src/core/project.ts).

**Incorporado:** envelopes finais em bytes UTF-8, limites preservados no servidor, fronteiras de tamanho testadas, validação PNG antes/depois de decode e distinção entre orçamento do pack e teto de imagens importadas. Excesso não apaga arte nem impede guardar um documento válido; preview anterior aparece desatualizado. Cobertura: §5.6/§8, C11/C21.

### RV11 — Média: pontuação e metas de desempenho tinham significados abertos

Dois objetivos de vitória não definem sozinhos o escalar salvo como recorde. O helper grava pontuação/vitórias, mas não resolve comparação entre dificuldades ou concorrência entre abas. “30 FPS” também podia ser interpretado como limitação de render, inexistente no helper. Evidência: [shared.ts](../packages/studio/src/components/code/pro-templates/games/shared.ts#L31).

**Incorporado:** score = adversários derrotados; progresso confirmado por ACK; limites honestos para fechamento/abas/configuração; 30 FPS como piso no perfil reduzido, passo lógico sempre 60 Hz; métricas de CPU separadas de cadência visual e descarte. Cobertura: §5.7/§8, C14/C17.

### RV12 — Média: rollout e marcos tinham dependências implícitas

O catálogo local é listado sem ativação por template; o adaptador atual não fornece essa capacidade. `kitVersion` é procedência, enquanto runtime valida requisição/arquivos/dependências. O preview escolhe remoto quando o host fornece adaptador; não implementa failover automático do WebContainer. Evidências: [ProjectList.tsx](../packages/studio/src/projects/ProjectList.tsx#L322), [adaptador](../packages/studio/src/studio/pro-runtime.tsx), [ProPreview.tsx](../packages/studio/src/modes/pro/ProPreview.tsx#L44) e [contratos remotos](../packages/studio-runtime/src/contracts.ts#L84).

**Incorporado:** allowlist de criação separada de compatibilidade; capacidades por protocolo/artefato/dependências/IDs de requisição, sem confiar em manifesto editável; defaults e rollback definidos. M1 cobre kit manual, M2 construtor, M3 publicação permanente. C15/C16 não encerram C23. Cobertura: §10/§11, C18/C19/C23.

## Limites e prevenção de remendos

A revisão não acrescenta engine universal, chat, banco, cobrança, importador ZIP, pipeline de mídia ou hospedagem concorrentes. Mudanças compartilhadas têm dono e regressão explícitos. Não são soluções aceitáveis: corrigir só a saída gerada; esconder erro de tipo; aumentar limites globais para acomodar pack mal dimensionado; substituir assets essenciais inválidos silenciosamente; duplicar UI/fases; ou aprovar exportação usando uma árvore diferente da entregue.

O pack próprio, a configuração jogável e os dispositivos de referência ainda precisam ser produzidos/medidos. Essa pendência é trabalho de implementação, não falha documental a esconder. A ausência de licença local no P27 permanece motivo para esclarecer procedência antes de incorporar fontes ou arte externas.

## Verificação desta revisão

Releitura cruzada com a proposta Pro v2, execução em andamento, contratos/factories/helpers, persistência, assets, export e suítes existentes; revisão independente das fronteiras de jogo, integração e coesão. Documentação oficial de RAF, Pointer Events, ImageBitmap, autoplay e npm foi conferida e citada junto às decisões na proposta.

Verificação documental automatizada concluída sem erros: 34 referências locais existentes, linhas referenciadas válidas, 12 seções principais, oito subseções de contratos, C01–C23 sem duplicações/lacunas e correspondência dos portões M1/M2/M3. Blocos de código, codificação e ausência de marcadores de conflito também conferidos. Esses checks verificam integridade dos documentos, não comportamento do produto.

As evidências de execução do P27 permanecem as da [auditoria anterior](studio-pro-canvas-p27-evidencias-2026-10-15/evidence.json). O ensaio completo do P27 não foi repetido nesta rodada. Não houve execução dos testes de uma implementação da arena; ela ainda não existe. Os critérios C01–C23 são requisitos futuros, não resultados de testes aprovados.
