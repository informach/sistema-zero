# Studio Pro — adendo 6A.2: kit próprio de jogo Canvas 2D

Data: 15/10/2026. Revisão: **2, após revisão técnica cruzada com o workspace**. Status: especificação proposta para integrar à execução atual; não implementada. Preferência confirmada: kit próprio do Studio com mecânicas inspiradas no P27 e estrutura modernizada. Este documento não marca como concluído nenhum lote da proposta principal.

Referências: [proposta Pro v2](studio-pro-proposta-v2-2026-10-15.md), [matriz GameDev](studio-gamedev-aproveitamento-v2-2026-10-15.md), [execução atual](../docs/superpowers/plans/2026-10-15-studio-pro-implementacao.md), [auditoria P27](architectural-analysis-studio-pro-canvas-p27-2026-10-15.md) e [evidências](studio-pro-canvas-p27-evidencias-2026-10-15/evidence.json).

A [revisão da proposta](studio-pro-canvas-p27-review-2026-10-15.md) registra os achados e sua resolução neste texto. Os verbos normativos descrevem trabalho a executar, não capacidades já demonstradas. A revisão fecha especialmente propriedade por perfil, contratos de simulação/input, atualização pelo Pinta, estados da UI, exportação e portões de entrega. Os valores novos de configuração e orçamento são decisões propostas, ainda sujeitos a playtest e medição.

## 1. Decisão recomendada e alternativas

Acrescentar um kit Pro `canvas-survival`, engine `canvas`, `kitVersion: 1`, com nome de produto provisório **Arena dos Guardiões · 2D**. A criança cria um jogo completo, altera arquivos legíveis, troca personagens pelo Pinta e evolui regras com o Zappy. Canvas aparece nos detalhes técnicos; o card prioriza gênero, imagem, objetivo e controles.

O Studio já usa ideias das versões P9/P24 no modo clássico e possui sobrevivência com câmera e projéteis. O valor novo é sua disponibilidade como projeto Pro modular e integrado, com arte própria, animações por estado e verificação reproduzível.

| Alternativa | Vantagem | Custo/limitação | Decisão |
|---|---|---|---|
| Kit próprio sobre os contratos Pro existentes | Reaproveita infraestrutura e permite código didático completo | Exige adaptar regras, animação e materiais | Recomendada; corresponde à preferência do usuário |
| Importar P27 quase literalmente | Preserva a organização original para estudo | Carrega falhas de lifecycle/input/estado e procedência não esclarecida | Não usar como produto padrão; referência local continua disponível |
| Transformar tudo em novo SDK/motor universal | API potencialmente reutilizável em muitos gêneros | Reabre arquitetura, duplica Phaser/SZGameKit e aumenta manutenção | Adiar; extrair somente helpers com dois consumidores reais |

## 2. Problema que o adendo resolve

Os cinco kits Pro atuais cobrem puzzle Canvas, arcade/plataforma Phaser e exploração/ação Three. Falta uma entrada Canvas para movimento livre, agentes, animações, contato e sobrevivência. O P27 demonstra essa combinação, mas depende de uma página global e não atende sozinho aos contratos do Studio.

Criar uma segunda infraestrutura de jogo repetiria menus, controles, áudio, armazenamento, carregamento e coordenação. A mudança deve acrescentar um modelo de arena e suas regras sobre as capacidades já construídas.

Fronteiras de responsabilidade:

| Responsabilidade | Dono |
|---|---|
| Autenticação, família/perfil, cobrança e publicação | Host/BFF/serviços existentes |
| Projeto, revisão, arquivos e persistência | Documento Pro e coordenador de operações existente |
| Binários, procedência e metadados | `Project.assets` e manifesto Pro existente |
| Editor/terminal/diagnósticos | Monaco, serviço TS e filesystem existentes |
| Menus, ações, som básico, progresso e descarte | Helpers compartilhados dos kits |
| Movimento, inimigos, contato, objetivo e dificuldade | Código editável de `canvas-survival` |
| Planejamento pedagógico | Pensa + Zappy com contexto Pro |

## 3. Experiência e escopo de lançamento

Fluxo: **Novo projeto → Arena dos Guardiões → começar → personalizar → testar → salvar → exportar/publicar quando a capacidade estiver disponível**. Criar e editar manualmente não exige inferência de IA.

O lançamento entrega um jogo com:

- Arena finita e movimento em oito direções, mantendo a mesma velocidade na diagonal.
- Dois arquétipos configuráveis: perseguidor e errante, com sinais visuais distintos além da cor.
- Vida, dano, invulnerabilidade breve, empurrão e reaparecimento controlado de inimigos.
- Um pulso de energia acionado por espaço/botão de toque/gamepad, com cooldown visível. É uma adaptação de design proposta: o P27 original causa dano por contato. O pulso torna a ação defensiva explícita sem exigir mira ou segundo joystick.
- Objetivo inicial sugerido: sobreviver 60 segundos **ou** superar dez adversários; valores ajustáveis em `config.ts`. “Superar” conta a desativação final ao chegar a zero de vida, uma vez por entidade. Empurrar, acertar repetidamente ou remover por distância não conta. Regras e instruções devem descrever o mesmo objetivo.
- Estados de início, partida, pausa, vitória e derrota; reinício completo e retorno ao início.
- Animações de repouso, movimento, dano e fim, pack gráfico original pequeno, efeitos limitados e som inicialmente desligado.
- Teclado, controles de toque com multitoque e gamepad quando o navegador permitir. A direção digital já existente basta para a primeira versão; diagonal com pulso exige três contatos nos botões direcionais.
- Recorde de adversários superados e vitórias confirmados no aparelho, por projeto/perfil no Studio; export standalone usa o armazenamento da URL. A métrica e suas limitações estão em §5.7.
- README de personalização, créditos, configurações comentadas, debug opcional de hitbox e uma missão de aprendizagem pronta para Pensa.

Três primeiras tarefas pedagógicas: alterar a duração da missão; modificar o perseguidor sem mudar o errante; trocar a arte preservando a área de colisão. O jogo continua utilizável durante a evolução do construtor do lote 7.

Mira por mouse/segundo stick, armas/projéteis, mundo com câmera, coleta, níveis e ondas complexas entram na evolução do lote 8. Não são funcionalidades demonstradas pelo P27 nem requisitos para lançar a arena completa. O tratamento de input deve permitir extensão futura sem exigir esses controles agora.

## 4. Arquitetura proposta

```text
Catálogo Pro leve (core)
          |
          v
Factory assíncrona por ID ---- fontes + pack original + versão
          |
          v
Projeto Pro = árvore textual + Project.assets
          |
          v
Coordenador existente (editor / terminal / revisão do construtor)
          |
          +--> persistência local / nuvem do projeto
          +--> linguagem TS por projeto
          +--> projeção de assets + build local ou remoto
                              |
                              v
                     Preview isolado existente
                      |                  |
                      v                  v
                 Jogo Canvas       storage bridge existente
                  |       |
                  v       v
              simulação  renderer + sprites + HUD
                              |
                              v
                mesmo artefato / exportação / player Pro
```

As caixas são responsabilidades, não novos serviços ou pacotes. O jogo exportado usa módulos ESM, APIs web e ferramentas já aceitas pelo Pro. Não precisa importar React, Blockly, o host do Studio ou `window.SZGameKit`.

O runtime clássico é formado por strings JS que compartilham estado de um IIFE. Seus algoritmos e testes orientam a adaptação; importá-lo inteiro traria módulos desnecessários e acoplamento a blocos. Extrair funções puras pequenas só onde houver reuso comprovado. A extração geral de um SDK fica fora do caminho crítico.

## 5. Contratos centrais

### 5.1 Catálogo, factory e versão

O catálogo canônico continua em `packages/core/src/studio/pro-templates.ts`. Acrescentar o ID de forma tipada; o factory deve selecionar por ID explicitamente. Uma combinação desconhecida não pode cair no puzzle ou em Three por default.

Manter `loadProTemplate` assíncrono. Estender o resultado tipado com `assets?: ProjectAsset[]`; `createProProject` materializa árvore, assets e metadados de origem como um único documento validado. Consumidores atuais sem assets preservam o comportamento. Cada criação recebe objetos independentes, inclusive metadados aninhados; blobs imutáveis podem compartilhar representação. O factory não persiste nem navega. Falha de chunk, pack ou validação não entrega projeto parcial.

O chamador captura **escopo de armazenamento, identidade/época do perfil, ID do projeto e token da operação antes do primeiro `await`**, inclusive antes do import dinâmico. Reusar `ProjectStorageScope` e o argumento de escopo já aceito por `persistProject`. Não deixar a persistência descobrir o perfil ativo depois do download. A tela só abre o resultado se ainda possuir o token e a identidade originais.

Cancelamento/troca de perfil/navegação antes do commit impede persistir e abrir. Se a transação de persistência já começou, ela pode concluir exclusivamente no escopo capturado; a conclusão obsoleta não navega nem atualiza a nova tela. Não apagar um projeto já confirmado para simular cancelamento. Um retry da mesma operação reutiliza o ID e verifica o resultado da persistência antes de criar outra cópia. Falha ao salvar é mostrada como falha, sem anunciar criação concluída. O store coordena essa propriedade; o factory só recebe cancelamento para carregamentos que o aceitam. Um import de módulo não cancelável pode terminar, mas seu resultado obsoleto é ignorado.

`studio-kit.json` continua sendo o manifesto do kit. Preservar os campos `id`, `version`, `engine`, `entry`, `config`, `controls`, `performance`, `assets`, além de `controller` e `qualityProfiles`, acrescentados pela sessão ativa durante esta análise. Hoje `version` acompanha `kitVersion`; não reaproveitar esse número silenciosamente como versão de schema. Se a forma do manifesto precisar evoluir, acrescentar `schemaVersion` com compatibilidade explícita para documentos antigos.

Acrescentar de maneira compatível as capacidades relevantes: ações realmente disponíveis, objetivo, limite de entidades/efeitos, passo de simulação e política de progresso. O manifesto descreve a origem e o contrato; não concede permissões e não prova que fontes editadas ainda implementam essas capacidades.

Projetos existentes não são atualizados automaticamente quando o template mudar. Uma atualização futura é proposta como diff sobre a revisão correta, com backup/desfazer. `canvas-puzzle` conserva seu ID e suas fontes.

### 5.2 Fontes legíveis e empacotamento

Manter os arquivos autorais em uma pasta de templates fora de `src`, por exemplo:

```text
packages/studio/pro-kits/canvas-survival/
  src/
    main.ts
    config.ts
    game.ts
    model.ts
    rules/movement.ts
    rules/spawning.ts
    rules/collisions.ts
    rules/combat.ts
    rules/objectives.ts
    render/canvas.ts
    render/animation.ts
    render/particles.ts
    assets.ts
    characters.ts
  assets/                         pack original e documentação de origem
  README.md

packages/studio/scripts/gen-pro-kit-sources.ts
packages/studio/src/components/code/pro-templates/games/canvas-survival.ts
packages/studio/src/components/code/pro-templates/games/canvas-survival.sources.generated.ts
```

O gerador transforma fontes revisáveis em `Record<string,string>` para o loader atual; a saída gerada não é editada manualmente. O projeto materializado recebe também `contracts.ts`, `ui.ts`, `input.ts`, `lifecycle.ts` e `progress.ts` dos helpers existentes, além de package/config/lock/manifesto. Testar **esse projeto final, com assets**, o mesmo entregue ao aluno.

Adicionar `gen:pro-kits` e `check:pro-kits`, com modo check sem escrita obrigatório no CI. Ordenar caminhos, normalizar separadores e quebras de linha, manter codificação UTF-8 e não incluir timestamps variáveis na saída. Rejeitar colisões de nomes, inclusive sem distinção de caixa, entre fontes, helpers, configurações e assets; não aceitar a sobrescrita silenciosa por espalhamento de objetos. A verificação cobre fontes autorais, helpers, pack, contratos portáteis e arquivos de configuração. A árvore gerada deve ser reproduzível a partir desses insumos.

O typecheck do host não deve tentar compilar fontes de template antes da montagem dos helpers. Como `pro-kits/` e o novo gerador ficam fora do include atual, criar verificações explícitas: typecheck do gerador e typecheck/build do projeto materializado. Excluir a pasta do host sem essas verificações não fecha a entrega.

É uma melhoria localizada para o novo kit. Migrar os cinco kits existentes para esse formato pode ser trabalho posterior; não é necessário para disponibilizar a arena.

API pública local do projeto, sem novo pacote npm:

| Módulo | Exportações propostas | Contrato |
|---|---|---|
| `config.ts` | `config`, `validateConfig` | Parâmetros didáticos e erros de faixa explícitos |
| `model.ts` | `createArenaState`, tipos de estado/input/evento | Estado independente de DOM e Canvas |
| `rules/*.ts` | Funções de atualização e resolução | Passo fixo, RNG recebido e resultados testáveis |
| `game.ts` | `createGame` | Conecta modelo, UI, input e renderer; retorna o `GameController` compartilhado |
| `assets.ts` | `loadArenaAssets` | Lê o manifesto existente, valida e devolve recursos com dispose |
| `render/canvas.ts` | `createCanvasRenderer` | Desenha estado e gerencia viewport; não decide vitória/dano |
| `render/animation.ts` | `advanceAnimation`, `frameRect` | Projeção de estado em frames válidos |

As assinaturas finais devem usar os tipos reais dos helpers atuais. Não introduzir Effect-TS, ECS ou framework de eventos: o projeto usa TS/ESM e esses contratos não exigem outra stack. `ProjectAsset`, `ProjectSpriteMeta` e o manifesto continuam canônicos no Studio. O projeto standalone recebe tipos e validação do **subconjunto serializado que consome**, gerados ou verificados contra esse contrato. Isso não cria outro formato de assets. Testes de conformidade usam manifestos emitidos por `buildProAssetBundle`; imports de `#core`, aliases internos ou pacotes do host são proibidos nas fontes exportadas.

`shared.ts` já gera `src/contracts.ts`, com `GameController { inspect(): GameSnapshot; dispose(): void }`. Preservar a chamada síncrona `createGame(ui, input)`: o controller existe durante o carregamento. `inspect` fornece cópias limitadas sob demanda, sem referências mutáveis ao modelo. Acrescentar ao contrato compartilhado campos opcionais tipados para disponibilidade, tick, seed, vida, eliminações, tempo e motivo do resultado. O campo `goal` da arena representa a meta de eliminações; a meta de tempo é separada. Não criar método que force vitória ou substitua inputs reais.

### 5.3 Disponibilidade, fases e descarte

Há dois estados distintos: disponibilidade de recursos (`loading`, `ready`, `error`) e a fase de partida já compartilhada (`menu`, `playing`, `paused`, `won`, `lost`). A UI continua dona da fase; o controller informa disponibilidade e eventos de resultado. `disposed` é uma condição terminal do controller, não uma tela de jogo. Não manter duas cópias concorrentes da fase nem manipular IDs internos do DOM da UI.

| Extensão mínima do helper compartilhado | Regra |
|---|---|
| Disponibilidade explícita e ação de retry | Começar/reiniciar só funcionam em `ready`; registrar `onReset` deixa de ser prova implícita de carregamento concluído para o consumidor assíncrono |
| Motivo do reset | Informar começo de nova partida versus reinício na callback, de forma compatível com consumidores atuais; isso decide nova seed versus reutilização (§5.4) |
| Retorno ao menu | Interrompe a partida, limpa ações/acumulador e mostra o menu pela mesma API de fase; a próxima partida cria modelo novo |
| Transições e foco | Menu → partida; partida → pausa/fim/menu; pausa → continuar/reiniciar/menu; fim → reiniciar/menu. Retry só trata recursos; não retoma partida perdida |
| Áudio e preferências | Parar vozes em pausa/mute/descarte; preferência de movimento distinta de qualidade (§5.6) |
| Diagnóstico temporal opcional | O próprio `frameLoop` informa delta descartado; a arena não cria um segundo relógio/RAF para medi-lo |

Os cinco kits existentes conservam seu fluxo síncrono; a nova disponibilidade deve ser opt-in ou ter default compatível. A lista acima é trabalho explícito do adendo: a API atual ainda não oferece tudo isso.

Registrar o descarte antes de iniciar cargas. Cada tentativa tem `AbortController` e número de geração. Retry cancela a tentativa anterior; apenas a geração vigente pode instalar recursos, alterar disponibilidade ou habilitar ações. Falha essencial aborta os carregamentos irmãos. Falha ao criar contexto Canvas gera diagnóstico e cleanup, inclusive se input/UI já existirem. O prazo de carga cobre fetch e decode; o decode não cancelável é ignorado e liberado quando terminar.

`dispose()` é idempotente: cancela RAF e tentativas, remove subscriptions/listeners/observers, para áudio, solta recursos gráficos e impede callbacks tardios. HMR, troca de projeto e fechamento usam o lifetime existente. Retorno via BFCache continua pausado, sem recriar listeners; exige verificação do comportamento vigente do helper. Pausa e menu não mantêm RAF contínuo. Resize ou mudança visual solicita um desenho; animação final tem duração limitada e depois para.

### 5.4 Simulação, input e combate

Reusar `frameLoop` como **único proprietário de RAF**. Seu delta, limitado atualmente a 50 ms, alimenta acumulador com passo de 1/60 s e no máximo **três ticks por callback visual**. O resto inferior a um tick permanece; atraso além do teto é descartado. Pausa/blur/aba oculta zeram acumulador e ações pendentes; continuar exige gesto e não recupera tempo de background. A cadência de RAF varia com a tela, portanto não define o relógio das regras. [MDN: requestAnimationFrame](https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame).

Tick inteiro é o relógio autoritativo. Durações positivas viram `ceil(segundos × 60)` uma vez na validação; zero só é aceito em campos que o declarem. Timers usam ticks de vencimento. A garantia de repetibilidade vale para mesma versão, configuração validada, seed, sequência de ações **indexada por tick** e número de ticks. Não promete identidade binária entre navegadores nem igualdade por tempo de parede quando houver descarte de atraso.

Usar PRNG semeável explícito para regras e RNG separado para apresentação. Em uma nova partida, gerar seed; em Reiniciar, reutilizar a seed da partida para facilitar aprendizagem, zerando modelo e PRNG. A seed aparece no diagnóstico. IDs lógicos crescem por spawn dentro da partida e não são o índice do pool. Iteração e desempates usam ordem estável por esses IDs.

**Ponte de input:** `poll()` uma vez por callback visual; `down()` e `take('action')` apenas quando há tick a executar. Um frame sem tick preserva a borda; vários ticks não a repetem. Vários presses entre ticks podem ser coalescidos em uma borda pendente na V1. Borda durante cooldown é consumida e descartada, sem disparo automático posterior.

O helper precisa tratar borda como transição **agregada** de solto para pressionado da ação: Espaço mantido + toque adicional não produz segundo pulso; soltar uma fonte não solta as outras. Ignorar key repeat para novas bordas. Depois de pausa/blur, exigir liberar e pressionar novamente `action`, inclusive no gamepad. Direções também são limpas; teclado/toque exigem novo gesto e o gamepad deve voltar à zona neutra. Manter apenas estado físico mínimo para rearmar controles, sem reaproveitar comandos pendentes. Essa correção deve preservar consumidores que usam ações contínuas.

Ordem normativa de cada tick, com posições anteriores preservadas para colisão:

1. Consumir ações, normalizar direção e verificar vencimento de cooldown/invulnerabilidade.
2. Criar no máximo um inimigo devido, atualizar comportamento e integrar movimento/empurrão; limitar corpos à arena. Spawn usa posições de borda válidas fora da distância segura do jogador, com tentativas limitadas.
3. Resolver pulso instantâneo sobre posições pós-movimento, por círculo–AABB. Cada alvo vivo recebe um dano/empurrão; a expansão desenhada é cosmética. O jogador causa dano somente pelo pulso.
4. Marcar derrotados uma vez, incrementar eliminações, retirar das colisões e liberar capacidade lógica imediatamente. O efeito de morte usa orçamento visual próprio; nunca segura slot lógico.
5. Resolver contato apenas com sobreviventes. Inimigos causam dano ao jogador; no máximo um contato aplica dano por janela de invulnerabilidade, escolhido em ordem estável. Tratar cruzamento no tick com swept AABB relativo jogador–inimigo, além de sobreposição inicial. Não resolver colisões entre inimigos na V1.
6. Concluir o tick, apurar resultado e emitir eventos de apresentação. Se HP chegou a zero, derrota prevalece sobre a meta de tempo/eliminações naquele tick. Vitória por eliminações tem precedência de rótulo sobre vitória por tempo quando ambas forem atingidas. Resultado final é imutável e emitido uma vez.

Hitstun, cooldown, invulnerabilidade e empurrão são lógicos; animações não os prolongam. Direções coincidentes usam desempate documentado, sem divisão por zero. Swept AABB detecta contato rápido, não introduz um resolvedor físico completo: o jogo mantém movimento/empurrão limitados e contato com dano.

Saturação mantém no máximo uma intenção de spawn pendente. Sem capacidade ou posição segura, ela espera; não acumula ondas. Uma tentativa com capacidade pode consumir PRNG para até quatro candidatos; só atribui ID ao spawn efetivo. Uma tentativa sem posição segura ou capacidade só volta a ocorrer no próximo intervalo, sem consumir RNG a cada tick. Após sucesso, reagendar a partir do tick atual. O pool é limitado, e cada reutilização reinicia vida, timers, velocidade, direção, comportamento e estado visual. Alterar qualidade/atlas/partículas não muda essa política.

`validateConfig` rejeita não finitos, faixas inválidas e combinações inviáveis com mensagens por campo. Duração, vida, dano, velocidades, alcance, intervalo de spawn, limite de entidades e tamanhos têm limites documentados. Validar o corpo dentro da arena e a existência de posições elegíveis; não tentar infinitamente até encontrar spawn. Manter varredura linear limitada a 64 inimigos; ECS/quadtree não são necessários.

### 5.5 Controles, viewport e acessibilidade

Reutilizar `left/right/up/down/action` e a UI atual. Normalizar o vetor de movimento no modelo. A ação `action` corresponde ao pulso, disparado na borda e sujeito a cooldown. Escape não alterna repetidamente por key repeat.

Toque: quatro direções e pulso com captura de ponteiro, suporte a três contatos para diagonal + ação e liberação em `pointercancel`/perda de captura. O helper atual já contém parte dessa lógica; ampliar as lacunas verificadas. Gamepad usa o suporte digital existente, sem prometer segundo stick; desconexão libera sua contribuição. Eventos em campos editáveis e atalhos do editor não são interceptados. [MDN: Pointer Events](https://developer.mozilla.org/en-US/docs/Web/API/Pointer_events).

Dimensionar pelo container de preview, com `ResizeObserver`, arena lógica inicial de 720 × 540, aspect ratio 4:3 e DPR limitado inicialmente a 1,5. Essas dimensões são uma escolha do novo kit, não do P27. Resize/orientação alteram projeção e layout, sem mudar mundo, velocidade, dificuldade ou reiniciar a partida. Aplicar `imageSmoothingEnabled = false` após mudar dimensões do canvas. Não esticar sprites; o pack inicial deve manter personagens reconhecíveis no menor preview suportado.

HUD e controles são DOM responsivo ao redor da arena; no modo estreito, o preview pode ocupar uma área maior da interface existente. Validar em 360 CSS px de largura e paisagem móvel, com editor aberto. Botões têm alvo mínimo de 44 CSS px; foco é visível e vai ao controle pertinente em pausa/fim/retry, retornando ao canvas em continuar. Vida/cooldown/objetivos têm texto; avisos acessíveis ocorrem nas transições, sem narrar ticks. Manter pistas além da cor. Isso não equivale a alegar que toda ação visual Canvas é plenamente utilizável por leitor de tela.

Se depois houver mira/câmera, adicionar transformação explícita coordenada CSS → canvas lógico → mundo, considerando letterbox. Isso pertence ao novo recurso de mira, não ao lançamento de movimento digital.

### 5.6 Materiais, spritesheets e áudio

Fonte persistida: `Project.assets`. Projeção canônica: `public/studio-assets/manifest.json`. URL servida: `studio-assets/manifest.json`, relativa à base do jogo; `public/` não faz parte da URL. Corrigir a divergência atual do README/`studio-kit.json` a partir da constante canônica. `entry.url` é relativo à raiz pública do jogo, não ao diretório do manifesto: resolver contra a base do artefato/documento e validar em URL aninhada, sem duplicar `studio-assets/`.

`ProjectSpriteMeta` já descreve `frameW`, `frameH`, animações row-major (`from/to/fps/loop`) e hitbox fracionária. Consumir esse contrato. `characters.ts` associa jogador/perseguidor/errante a **`ProjectAsset.id`**, tamanho de exibição, nomes dos estados e política de colisão. Nome é rótulo; `libId` identifica origem na biblioteca, não o vínculo dentro do projeto. Um desenho novo ganha outro ID; atualizar o desenho já importado preserva o ID.

**Fluxo manual obrigatório:** importar pelo painel Materiais → copiar ID ou trecho de binding oferecido pelo painel → editar `characters.ts` → executar o preview. Acrescentar essa ação em `ProAssetPaths.tsx`, exibindo tipo e animações disponíveis; não criar editor visual novo nem exigir Zappy. Importar um desenho não substitui automaticamente o jogador. Remapear o papel é uma edição explícita, reversível pela edição/histórico existente.

Imagem PNG sem `sprite` é aceita como frame estático para todos os estados. Spritesheets usam mapeamento explícito por papel; um estado opcional pode apontar para `idle`, se o binding declarar isso. Referência a animação inexistente, atlas inválido ou metadado exigido e ausente gera erro com asset/campo; não escolher a primeira animação por acaso. Não ampliar metadados do Pinta com regras de combate: prioridade e transição de estados pertencem ao personagem.

O mapeamento geométrico do P27 é `from = row × colunas + startFrame`, `to = from + frameCount − 1`. Seu timing **não é integralmente representável** no contrato atual de FPS inteiro: 0,15 s corresponde a 6,666… FPS, não a 6 FPS. O pack próprio usa FPS inteiros; aproximação/importação do P27 fica fora da V1. Avanço de animação usa tempo acumulado/módulo ou clamp, sem loop ilimitado; uma animação final emite conclusão visual uma vez, sem governar morte lógica.

**Colisão e troca de arte:** por padrão, cada papel usa corpo AABB fixo em unidades do mundo, definido em `config.ts`, independentemente dos pixels do desenho. Assim a tarefa “trocar a arte preservando a colisão” é verdadeira. O binding permite optar explicitamente pela hitbox do sprite; nesse modo, ausência significa o retângulo inteiro, como no contrato canônico, e campos presentes precisam ser válidos. O sanitizador já remove a caixa inteira explícita; o consumidor não pode tratá-la como erro nem reconstruir metadados descartados. Editar hitbox/tamanho nesse modo pode mudar a jogabilidade. O README explica a diferença. Não aplicar silenciosamente uma hitbox nova ao trocar bytes de uma imagem no modo de corpo fixo.

Para a opção de hitbox do sprite, com origem visual no centro e tamanho de exibição `W × H`, calcular `x = esquerda + meta.x × W`, `y = topo + meta.y × H`, `w = meta.w × W`, `h = meta.h × H`. Flip horizontal usa `meta.x' = 1 − meta.x − meta.w`. Respeitar AABB, sem convertê-la em círculo; o pulso continua círculo–AABB. Não criar novo schema de pivot sem necessidade. Testar também caixa estreita/cruzamento rápido (§5.4).

**Snapshot e invalidação:** uma execução consome manifesto, bytes, metadados e bindings da mesma revisão. O caminho atual do asset deriva do ID e pode permanecer igual quando a imagem muda. Cache de recurso decodificado deve incluir hash do conteúdo e assinatura dos metadados relevantes; identidade/URL sozinha não basta. Alteração apenas de animação também invalida a projeção. Fetch/versionamento deve impedir resposta antiga sob URL estável, inclusive na sincronização local.

Na V1, atualização validada reinicia a instância pelo fluxo de preview existente; não há hot swap de personagem no meio de um tick. Build remoto segue sua execução explícita e marca a revisão anterior como desatualizada. Resposta antiga não substitui o preview novo. Artefato publicado contém bytes imutáveis da revisão; editar a biblioteca depois não muda o jogo publicado.

**Loader limitado:** carregar somente assets referenciados pelos papéis, inicialmente PNG estático/spritesheet. Outros formatos podem continuar no projeto, mas seu uso como personagem exige formato suportado, com mensagem útil. Validar MIME/assinatura, caminho local permitido, hash esperado, cabeçalho, dimensões reais, frames e campos numéricos; não buscar URL externa arbitrária. Reusar o contrato de paths e a base do artefato.

Limites propostos para recursos usados pela arena: até 4.096 px por eixo, até 4.194.304 pixels por imagem e até 8.388.608 pixels distintos carregados (32 MiB RGBA estimados). O pack padrão tem meta menor de 8 MiB (§8). Verificar cabeçalho PNG antes de decode e dimensões reais depois; deduplicar por conteúdo sem contar aliases duas vezes. Esses limites são do consumidor Canvas, não uma redução global da biblioteca do Studio. Excesso aponta os materiais responsáveis, sem apagá-los.

Prazo inicial de 15 s por tentativa, cobrindo fetch/decode; sem retry automático infinito. Erro essencial impede começar e oferece retry manual; fallback procedural só existe para efeito **opcional declarado**. `ImageBitmap.close()`, revogação de object URLs e remoção de handlers têm dono no loader/renderer; a geração descartada libera resultados tardios. Não manter cache global entre projetos. [MDN: ImageBitmap.close](https://developer.mozilla.org/en-US/docs/Web/API/ImageBitmap/close).

Entregar pack próprio compacto com animação real, créditos, origem e condições documentadas de modificação, remix, exportação e publicação. Créditos sozinhos não definem essas permissões. Verificar também a procedência de eventual trecho extraído do clássico; genealogia P9/P24 não autoriza automaticamente todo código. Incluir o pack em `Project.assets`, sem duplicar base64 na árvore. Não copiar arte/código do curso sem esclarecer os direitos de uso correspondentes.

Som sintetizado reaproveita `ui.tone`, com conjunto limitado de vozes e parada em pausa, mute, menu e dispose. Desconectar nós concluídos; não basta impedir novos sons. O som começa desligado e habilitação/resume dependem do gesto do usuário; falha mantém o jogo utilizável e a UI fiel ao estado. Áudio importado fica para evolução, sem construir mixer universal agora. [MDN: autoplay e Web Audio](https://developer.mozilla.org/en-US/docs/Web/Media/Guides/Autoplay).

Reusar `ui.reducedQuality`/`onQuality` e os perfis `standard`/`reduced` para economia gráfica. Separadamente, acompanhar `prefers-reduced-motion`, inclusive mudanças, removendo o listener no dispose: reduzir partículas/flashes/deslocamentos decorativos. Nenhuma dessas preferências altera simulação, inimigos, seed, alcance ou timers.

### 5.7 Pontuação, progresso e isolamento

Pontuação V1 = quantidade de adversários derrotados, inteira; recorde = maior pontuação final confirmada; vitórias = número de resultados vencedores confirmados. HUD mostra separadamente vida, tempo/meta, eliminações/meta e cooldown. Uma vitória por tempo pode ter pontuação menor que uma derrota com mais eliminações: isso é intencional e deve ficar claro no texto. Limitar o valor persistido ao teto já suportado pelo helper (10.000.000). Alterar dificuldade não reinicia automaticamente o recorde nem estabelece comparação competitiva; o recorde é recreativo do projeto. Mudar a definição de pontuação no futuro exige nova versão da chave de progresso.

Usar `createProgress` e a ponte Pro existentes. Não criar `localStorage` do host nem novo canal. Resultado visual independe do save; a UI distingue pendente, confirmado e falha. Só anunciar gravação depois do ACK. Ler o save antes de processar resultados, serializar gravações da mesma instância e emitir um único resultado por partida. Quota/save inválido não impede jogar; dado inválido não aparece como recorde confiável.

Descarte remove listeners e impede conclusão tardia de tocar a UI. Resultado ainda sem ACK ao fechar não é prometido como salvo; no próximo boot, ler o estado efetivamente persistido. Não manter o iframe vivo artificialmente para tentar garantir flush. A ponte conserva a identidade capturada; nenhuma escrita tardia vai ao perfil seguinte. A V1 não promete soma de vitórias ou merge de recordes entre duas abas concorrentes: o transporte atual não oferece operação atômica de incremento. Não anunciar esse caso como sincronização resolvida.

Recordes locais não são checkpoint, retomada completa ou sincronização entre dispositivos. Esses recursos precisariam de schema de save e política própria, reaproveitando o transporte existente.

Preservar iframe isolado, CSP, ponte de storage, identidade de projeto/perfil/revisão, proteção de configurações e ausência de credenciais. Dados/mensagens do jogo não podem autorizar publicação, crédito pedagógico ou operações no host. Um status `won` emitido pelo código editável não é prova independente de conclusão para recompensas do produto.

### 5.8 Exportação e distribuição

Mesmo projeto, bindings e materiais devem funcionar no WebContainer, build remoto e exportação. O player permanente passa pelo portão próprio do lote 9. Canvas não exige engine npm nova. Reusar Vite 8.0.16/TypeScript 5.9.3 da implementação inspecionada, respeitando a matriz real de versões/dependências confiáveis; upgrades pertencem a uma mudança própria de compatibilidade.

| Saída | Contrato e prova |
|---|---|
| Snapshot JSON/`.szproject.json` | Backup reimportável no Studio; preserva árvore, assets, IDs, metadados/origem e edições |
| ZIP de fontes Pro | Projeto instalável fora do monorepo; inclui fontes, configurações, lock compatível, materiais projetados, README e permissões/créditos |
| Exportação de deploy | Build respeita o lock antes de instalar e serve a saída compilada; instruções correspondem aos arquivos exportados |
| Artefato/player | Materializa uma revisão validada e mantém paths relativos; publicação permanente só quando a capacidade estiver habilitada |

Não prometer importação de ZIP: o importador atual aceita snapshot JSON. Não sobrescrever arquivos autorais durante exportação para inserir `LEIA-ME.txt`, README ou Dockerfile; resolver colisões pela política explícita de caminhos do export, com diagnóstico ou destino reservado validado. Instruções Pro devem ensinar os comandos reais de Vite/TypeScript, não Live Server sobre `.ts`.

O novo kit deve materializar `package-lock.json` coerente com seu `package.json`, gerado/validado no pipeline de autoria a partir da política confiável. Não copiar cegamente o lock inteiro do runtime, cujo projeto raiz é diferente. O Dockerfile copia package e lock **antes** da instalação e usa `npm ci`; versões diretas fixadas sem transitivas travadas não bastam. `npm ci` exige consistência entre package e lock e falha se ela não existir. [Documentação npm](https://docs.npmjs.com/cli/v11/commands/npm-ci/).

O lock materializado também precisa passar pelo `parseBuildRequest` real do runtime: caminhos, versões e integridades transitivas devem satisfazer a comparação com o lock da imagem confiável. Um lock válido para npm, porém rejeitado por esse contrato, não fecha C15/C16. A evidência registra a revisão da imagem usada; alteração dessa política pertence ao runtime compartilhado, não a uma exceção do novo kit.

Para projetos antigos/editados sem lock, preservar a exportação de fontes com aviso e instruções honestas de resolução por `npm install`, ou orientar sua geração pelo fluxo existente. Não produzir um arquivo que ordena `npm ci` sem lock nem chamar essa saída de reproduzível. Não atualizar dependências silenciosamente ao exportar. A dependência de `serve`/imagem do deploy também deve seguir a política de versões fixas do export; distinguir reprodutibilidade da aplicação de identidade bit a bit da imagem Docker.

Duas provas distintas são obrigatórias: (1) build no runtime controlado, que pode impor configuração confiável; (2) extrair o ZIP real em diretório limpo, instalar com os arquivos exportados sem substituições/symlink, rodar typecheck/build e jogar a saída com o pack. Validar também o Dockerfile entregue. O teste do runtime atual não substitui a segunda prova.

Preview temporário não equivale a publicação permanente. O artefato atual tem expiração; o kit usa o pipeline de publicação/rollback do lote 9 quando estiver concluído, sem inventar hospedagem paralela.

## 6. O que muda em cada arquivo

| Arquivo/componente atual | Mudança proposta |
|---|---|
| `packages/core/src/studio/pro-templates.ts` | Registrar `canvas-survival`; manter catálogo leve e compatibilidade de IDs |
| `packages/studio/src/components/code/pro-templates/games.ts` | Dispatch explícito por ID; caminho canônico do manifesto; composição do novo kit |
| `.../pro-templates/index.ts` | Resultado tipado com assets e clonagem independente; atualizar todos os consumidores |
| `packages/studio/src/state/projectStore.ts`, `state/persistence.ts`, `projects/ProjectList.tsx` | Captura de escopo/token antes do await, commit no perfil original, retry sem duplicação e bloqueio de navegação obsoleta |
| `.../games/shared.ts` | Disponibilidade/retry/menu, snapshot compatível, input agregado por tick, áudio interrompível e progresso confirmado; regressão dos cinco kits |
| `packages/studio/pro-kits/canvas-survival/` | Fontes autorais e pack original novos |
| `packages/studio/scripts/gen-pro-kit-sources.ts`, `package.json`, configuração de typecheck/CI | Empacotamento determinístico, modo check obrigatório e validação da árvore final |
| `.../games/canvas-survival.ts` e saída gerada | Factory/ponte para a árvore atual, carregada sob demanda |
| `packages/studio/src/core/proAssets.ts`, `proAssetPaths.ts`, `project.ts` | Preservar contratos; ampliar apenas lacuna comprovada; nenhum manifesto concorrente |
| `packages/studio/src/components/assets/ProAssetPaths.tsx` | Referência copiável com ID real do projeto e animações; manter fluxo manual |
| `packages/studio/src/modes/pro/proAssetSync.ts`, `useWebContainerSync.ts`, `RemoteProPreview.tsx` | Verificar snapshot/revisão e invalidação por conteúdo/metadados; integrar sem novo mecanismo de sincronização |
| `packages/studio/src/export/sourceExport.ts`, `deployTemplates.ts` e testes | LEIA-ME Pro, colisões com arquivos autorais, instalação pelo lock e ZIP real validado |
| `packages/core/src/studio/pro-build.ts` e transporte BFF/runtime | Medição dos envelopes completos, com binários e metadados; limites continuam validados no servidor |
| `packages/studio/src/studio/pro-runtime.tsx`, integração do host e contratos BFF/runtime | Capacidades reais e allowlist de criação; compatibilidade de leitura separada da ativação do card |
| `packages/core/src/studio/pro-game-knowledge.ts` | Guia pequeno do novo kit, regras de aplicabilidade e checks |
| `packages/studio-runtime/tests/game-kits.test.ts` | Materializar projeto completo do factory, incluindo assets reais; manter prova do runtime confiável |
| `packages/studio/e2e/pro-game-kits.spec.ts`, `pro-kit-objectives.spec.ts`, `pro-kit-performance.spec.ts` | Fixtures completos, estratégia explícita por ID, objetivos separados e métricas verificadas no host |
| Novos testes de regras/atlas/integridade | Provar estado, tempo, colisões, descarte e importação Pinta |
| README/créditos/documentação de arquitetura | Mapa de personalização, procedência, limites e matriz de execução |

Não substituir `Project`, `ProProjectMeta`, storage bridge, reconciliação FS, runtime remoto, Zappy, Pensa ou bibliotecas do Pinta/Molda. O kit não precisa alterar banco de dados, política de cobrança ou autenticação para existir.

## 7. Zappy, Pensa e construção assistida

Adicionar orientação específica ao guia existente: `config.ts` concentra parâmetros; `rules` decide comportamento; `render` desenha; `characters.ts` associa arte; assets vêm do manifesto. O contexto prioriza arquivos e diagnósticos reais, sem enviar sprites em base64 ou toda a pasta P27 ao modelo.

Receitas iniciais e prova exigida:

| Pedido | Mudança esperada | Verificação |
|---|---|---|
| “Quero uma partida mais fácil” | Ajuste identificado de velocidade/spawn/vida | Config válida, objetivo alcançável, mesma estabilidade |
| “Meu perseguidor deve parar antes de avançar” | Um comportamento de inimigo | Fixture por seed, nenhuma alteração involuntária no errante |
| “Use meu personagem do Pinta” | ID real do projeto, estados e política de colisão | Imagem estática/spritesheet; corpo preservado por padrão e opt-in explícito para hitbox do desenho |

Quando o lote 7 estiver disponível, cada receita segue captura de revisão → plano → patch isolado → tipos → build → playtest → diff → aplicar/desfazer por CAS. Reutiliza ledger, cancelamento e orçamento existentes. Não cria outro chat, agente financeiro ou editor.

Uma referência ao ID do template indica origem. O tutor precisa conferir os arquivos atuais antes de afirmar funções, linhas, animações ou capacidades. Pensa descreve o objetivo e critérios verificáveis; metadados do jogo não substituem a evidência independente quando esta for exigida.

## 8. Orçamento e observabilidade

O P27 tem apenas 826.522 bytes de arquivos, mas suas seis sheets correspondem a aproximadamente 23,72 MiB RGBA. Otimizar o novo pack e a memória decodificada é mais útil que contar só PNGs.

Limites atuais, que o adendo preserva:

| Camada | Limite observado |
|---|---|
| Fontes no build remoto | 80 arquivos; 256.000 caracteres por arquivo; 1.500.000 no total |
| Requisição Worker / BFF | 2.000.000 / 2.032.768 bytes |
| Artefato compilado | 2.500.000 bytes; até 338 arquivos |
| Imagem em Project.assets | 800.000 caracteres de data URL por item |
| Assets agregados | 128 itens; 33.000.000 caracteres |

Capacidade do projeto local e capacidade remota são diferentes. Calcular os envelopes **realmente serializados** navegador → BFF e BFF → Worker, incluindo base64, JSON, IDs e demais campos, antes de enviar. O helper atual que mede apenas fontes não prova o limite com assets. Reusar o serializador do transporte; manter os limites do servidor como autoridade e testar fronteiras limite−1/limite/limite+1 em bytes UTF-8.

Se a arte importada couber no projeto, mas exceder o build remoto, salvar continua permitido. Informar o limite e os materiais responsáveis, preservar o último preview como desatualizado e oferecer as capacidades realmente disponíveis. Não remover arte, comprimir silenciosamente ou migrar para execução menos isolada. Os limites de decode de §5.6 são adicionais e valem para o jogo, mesmo quando o payload cabe na rede.

Metas iniciais específicas, propostas e ainda não medidas:

- Envelope remoto do kit padrão ≤1,5 MB e artefato ≤1,5 MB, deixando margem para pequenas alterações; validar números com o pack efetivo.
- Até 8 MiB de pixels RGBA no pack inicial; atlas apenas com os frames necessários. Esse orçamento não inclui o restante do editor ou áudio.
- Até 64 adversários ativos, 256 efeitos/partículas incluindo animações de morte e oito vozes sintetizadas simultâneas. Sem capacidade visual/sonora, descartar o efeito novo; inimigos seguem a intenção pendente limitada de §5.4. Qualidade gráfica pode reduzir efeitos, nunca alterar regras ou remover inimigos.
- 60 FPS alvo, p95 do intervalo entre frames ≤20 ms no dispositivo principal; perfil reduzido sustenta pelo menos 30 FPS, p95 ≤35 ms, conforme proposta principal. O valor de 30 é piso de desempenho, não promessa de limitar RAF a 30 Hz. O passo lógico permanece 60 Hz. Registrar hardware, navegador, viewport, duração, quantidade de entidades e editor aberto.
- Zero RAF contínuo em pausa estável; zero recursos do kit após dispose. Vinte ciclos de preview e sessão de 30 minutos sem crescimento sustentado após estabilização.

Instrumentar load, primeiro frame jogável, custo de update/render, intervalos de frame, ticks executados/descartados, saturação, falhas de assets e dispose. Separar tempo de CPU do callback de cadência visual; ambos são úteis e nenhum substitui o outro. Medir apenas o período de partida por estado real, não pelo texto de um botão. Registrar aquecimento, amostragem de pelo menos 60 s e cenário padrão/lotado em ensaios distintos. Comparar qualidade mantendo a mesma configuração lógica.

O teste de desempenho deve falhar se ultrapassar o orçamento acordado, não apenas verificar que coletou amostras. Repetições e tolerância do dispositivo devem ser definidas antes do ensaio; não afrouxar o limite depois de uma falha. Evidência de heap/recursos é comparativa após estabilização, não a promessa de que o navegador devolverá toda memória ao sistema imediatamente.

Não enviar código, imagens ou identificadores pessoais para telemetria padrão. Quadtree, OffscreenCanvas, Worker e WebGL só entram se profiling mostrar necessidade: a arena de lançamento não os exige.

## 9. Critérios de aceite e evidência

Os critérios são portões de implementação. Nenhum é marcado como aprovado por esta revisão documental.

| ID | Evidência exigida |
|---|---|
| C01 | Novo ID materializa a arena; puzzle permanece puzzle; dispatch e cenários de teste rejeitam ID/engine desconhecidos |
| C02 | Criações independentes com árvore/assets completos. Falha de chunk/pack/save não anuncia sucesso; perfil A → B durante import/carga/commit nunca grava em B ou navega tardiamente. Cancelamento, navegação, retry e conclusões fora de ordem respeitam token/escopo |
| C03 | Projeto público do factory passa typecheck, build e pack com PNGs/manifesto reais; sem aliases privados. Erros deliberados continuam visíveis no editor. Contrato portátil aceita os manifestos canônicos e rejeita formatos incompatíveis |
| C04 | Loading → erro → retry → pronto; começar, pausar, continuar, reiniciar e voltar ao menu por controles reais. Vitória por tempo, vitória por eliminações e derrota verificadas separadamente. Dispose durante carga/retry não habilita a tela antiga |
| C05 | Mesmo estado lógico após N ticks para mesma config/seed/input por tick sob render 30/60/120 Hz. Zero tick preserva borda; vários ticks não a repetem. Teste separado para clamp/hitch/background; diagonal normalizada e RNG visual independente |
| C06 | Pulso elimina antes do contato; sobreviventes causam no máximo um dano por janela. Empate com HP zero termina em derrota; score/resultado emitidos uma vez. Fim de animação não segura capacidade lógica nem muda resultado |
| C07 | Pool cheio tem no máximo uma intenção pendente; reciclagem limpa estado, sem rajada ou crescimento ilimitado. Testar cooldown, invulnerabilidade, centros coincidentes, sobreposição inicial, contato tangente, caixa pequena, flip e cruzamento rápido |
| C08 | Espaço + toque/gamepad mantidos geram uma borda agregada; soltar uma fonte não solta as demais. Escape/key repeat não retoma nem dispara; pausa elimina borda pendente, exige rearmar e não recupera tempo oculto |
| C09 | Diagonal + pulso com três contatos; pointercancel/perda de captura e desconexão de gamepad liberam ações. Menus têm teclado/foco; controle não rouba eventos do editor |
| C10 | Fluxo real Materiais → copiar referência → editar binding → executar, com PNG estático e sheet. Rename preserva vínculo; trocar criação exige novo ID; atualizar bytes no Pinta mantém ID e mostra arte nova. Alteração só de metadados, remoção/reimportação e respostas fora de ordem são cobertas. Corpo permanece fixo por padrão; hitbox do sprite só no modo explícito |
| C11 | PNG inválido, dimensão excessiva, hash/índices inválidos, ausência de animação exigida, timeout de fetch/decode e resposta tardia têm erro contextual e cleanup. Retry não revive tentativa velha. Falha de contexto Canvas é tratada |
| C12 | Resize/DPR/orientação/preview estreito preservam mundo e progresso; pixel art reaplica smoothing após resize. HUD/controles legíveis em 360 CSS px e paisagem; alvos de 44 CSS px e inspeção visual no host |
| C13 | Som começa desligado; falha não bloqueia; pausa/mute/menu/dispose interrompem vozes. Movimento reduzido acompanha preferência do sistema sem alterar regras; qualidade econômica é independente. Estado/foco acessível sem avisos a cada frame |
| C14 | Métrica de score/recorde documentada; um resultado por partida. Pendência, ACK e falha são distintos; quota/save inválido não derrubam o jogo. Reload preserva o confirmado; projeto/perfil isolados. Fechar antes do ACK não promete gravação |
| C15 | Mesmos hashes/bindings funcionam em local, remoto e export servido, inclusive subcaminho aninhado. Atualização sob a mesma URL não usa bytes antigos. Sem CDN/dependências externas de execução não autorizadas. Isso não declara publicação permanente concluída |
| C16 | JSON nativo faz roundtrip com edições/IDs/assets/origem. ZIP real instala por lock em diretório limpo e passa tipos/build/playtest sem dependências do monorepo; deploy respeita lock. README correto, ausência de sobrescrita autoral e permissões/créditos completos |
| C17 | Vinte reinícios e vinte ciclos de abrir/fechar/HMR/troca de projeto não acumulam RAF/listeners/áudio. BFCache retorna pausado. Soak de 30 min e desempenho no host medidos; pausa estável sem RAF contínuo e dispose sem recursos próprios vivos |
| C18 | **Construtor:** receita passa validação, mostra diff e aplica/desfaz por revisão sem apagar edição concorrente; falha/cancelamento não aplica nem cobra em duplicidade, conforme lote 7 |
| C19 | Allowlist de criação distinta de compatibilidade de leitura/execução; cliente/backend de versões diferentes falham de forma recuperável. Desativar card não impede abrir/exportar projeto existente; playground/embed têm defaults definidos. Editar/remover o manifesto de origem não bloqueia fontes executáveis; dependências/protocolo reais continuam validados |
| C20 | Gerador determinístico em modo check no CI; alterar fonte autoral/helper/pack sem atualizar saída falha. Colisão de arquivos falha explicitamente; gerador e árvore materializada recebem typecheck próprio |
| C21 | Envelopes completos de BFF/Worker em limite−1/limite/limite+1, inclusive UTF-8/base64 e arte substituída. Excesso não perde documento nem apresenta preview antigo como atual. Limites de pixels aplicados antes/depois de decode |
| C22 | Mudanças compartilhadas preservam criação/controle/objetivos/export dos cinco kits de jogo atuais e criação dos templates base. Nenhum consumidor continua descartando assets por assumir retorno somente textual |
| C23 | **Publicação permanente:** revisão aprovada é publicada com assets imutáveis; URL aninhada funciona; autorização e rollback seguem lote 9. Editar Pinta depois não muda revisão publicada; preview expirável nunca é anunciado como link definitivo |

**Estratégia de testes:** regras puras cobrem ticks/PRNG/combate; integração cobre factory, geração, manifesto, bridge, persistência e builds; E2E cobre interação real no host; inspeção visual cobre arte/layout; profiling e soak cobrem recursos. Não criar testes que apenas espelham a implementação; cada caso deve provar comportamento observável ou um limite relevante.

Usar um materializador de fixture baseado no factory público e em `buildProAssetBundle`, passando o projeto completo aos testes. As suítes atuais de objetivos/desempenho montam somente a árvore e não provam os assets do novo kit. Acrescentar estratégia explícita `canvas-survival`; o default de outro gênero, que mantém Space pressionado, não exercita o pulso.

Para inspeção automatizada, fixture pode importar `createGame`/tipos num bootstrap controlado e expor apenas o controller de leitura. Não fazer `replace` de uma substring de `main.ts` nem inserir uma API que force resultado. Além desse fixture, executar E2E com o **entry de produção intacto**. Guiar objetivos por input real, com press/release, seeds conhecidas e espera por estado; tempos fixos servem para amostragem/soak, não para presumir carregamento concluído.

Executar Chromium e pelo menos outro motor suportado pelo Studio; toque inclui dispositivo físico de referência. Nos hosts que fornecem adaptador remoto, validar esse caminho em dispositivos sem WebContainer. Nos demais, informar indisponibilidade de execução e preservar edição/exportação. O seletor atual usa o adaptador fornecido pelo host; este adendo não promete failover automático entre runtimes. Registrar matriz e limitações; emulação desktop não comprova suporte móvel. Build aprovado ou screenshot bonito não substitui partida jogável e resultados verificados.

## 10. Ordem de implementação e encaixe nos lotes

| Etapa | Entrega | Dependência | Paralelismo possível |
|---|---|---|---|
| A — Alinhamento | Releitura do workspace, responsável pelos contratos compartilhados, capacidades, configuração inicial, orçamento e procedência | Estado atual da sessão Pro | Arte e regras podem ser preparadas após contrato |
| B — Integração mínima | ID/factory, projeto com assets, captura de perfil/token, manifesto portátil, gerador/check e lock | A; contratos dos lotes 1, 2, 4 | Pack original em paralelo com modelo |
| C — Arena jogável | Modelo puro, tick/input/combate, UI com loading/menu, dois inimigos, resultados e progresso | B | Regras e renderer em fronteiras definidas |
| D — Pinta e robustez | Referências no painel, loader/snapshot/retry, colisão, resize, áudio/a11y e regressão dos helpers | C | Visual/QA com fixtures estáveis |
| E — Tutor e receitas | Conhecimento curado e missão Pensa; integração assistida condicionada ao lote 7 | C/D; C18 para construtor | Tutor explicativo não espera o construtor |
| F — Distribuição e lançamento | ZIP/deploy real, paridade local/remoto, envelopes, host/perfis, soak, capacidades e rollback | D; marco manual abaixo | Medição por dispositivo pode ser paralela |
| G — Publicação permanente | Revisão publicada imutável, player, autorização e rollback | F + lote 9; C23 | Não bloqueia criação/edição manual |

Nomear esse trabalho **6A.2**, adendo ao núcleo 2D. Evita renumerar 6B/7/8/9 e deixa claro que reutiliza entregas já existentes. Rastreabilidade:

| Requisitos da proposta principal | Aplicação neste adendo |
|---|---|
| R01, R11 | Guia Zappy por arquivos, contexto efetivo e receitas do kit |
| R02, R03 | Mesma árvore/fila/persistência; TypeScript e imports reais |
| R04, R14 | Mesmo runtime confiável, lock e limites local/remoto |
| R05 | Sem migração obrigatória de projetos antigos; importador P27 é trabalho separado |
| R06, R10 | Assets/Pinta/host, Pensa, storage e distribuição existentes |
| R07 | Ledger existente quando houver geração assistida; criação manual sem inferência |
| R08 | Tipos, build, boot, regras e playtest como provas distintas |
| R09, R12 | Carregamento por ID, retry, catálogo leve e fontes sob demanda |
| R13 | Pools, passo fixo, atlas, cleanup e orçamento medido |

Não estimar duração fechada antes da etapa A/B: os contratos compartilhados estão mudando em outra sessão. Estimar a partir da árvore final, pack e matriz de dispositivos definidos, sem presumir que a quantidade de arquivos do P27 representa o esforço de integração.

Marcos independentes, com evidências anexadas à execução:

| Marco | Portão | O que pode ser anunciado |
|---|---|---|
| M1 — kit para criação manual | C01–C17 e C19–C22 | Criar, jogar, editar, usar Pinta, guardar e exportar; não depende de C18/C23 |
| M2 — construtor habilitado | M1 + lote 7 + C18 | Edição assistida validada com diff/revisão e orçamento existente |
| M3 — publicação permanente | M1 + lote 9 + C23 | Publicar e voltar à revisão anterior pelo pipeline oficial |

Cada etapa termina com revisão de arquivos alterados, critérios correspondentes e regressões compartilhadas. Os três marcos não encerram automaticamente os demais requisitos da proposta Pro.

## 11. Migração, rollout e colaboração com a sessão ativa

1. Entregar este adendo à sessão que implementa o Pro. Um único responsável altera catálogo/factory/helpers/contratos compartilhados por vez; outras frentes trabalham em arquivos isolados de regra/arte/teste.
2. Antes de implementar, comparar os hashes/arquivos da auditoria com o workspace atualizado. Alguns gaps relatados podem já ter sido corrigidos. Incorporar a solução vigente e atualizar as referências.
3. Fazer backend/runtime reconhecer o novo ID e formatos antes de expor o card. Catálogo compartilhado em código não implica deploy simultâneo. O código inspecionado ainda não oferece ativação por template; acrescentar uma allowlist de criação no host e capacidade de execução no adaptador/runtime, conforme contrato abaixo.
4. Disponibilizar internamente e validar criação → edição → Pinta → save → reload → remoto → export. Liberar pelo portão M1; construtor e publicação seguem M2/M3. Arquivar evidências com revisão das fontes/pack, ambiente e limitações reais.
5. Para rollback, ocultar novas criações e reverter o template defeituoso. Preservar reconhecimento do ID e abertura/exportação dos projetos já gerados. Não remover artefatos/dados nem aplicar atualização automática à fonte do usuário.
6. Publicação permanente acompanha o lote 9. Ausência temporária desse recurso deve aparecer como capacidade indisponível, sem transformar URL de preview com expiração em link definitivo.

**Ativação concreta, sem serviço novo de flags:** o host informa IDs habilitados para novas criações; catálogo/parser continuam reconhecendo projetos antigos. O adaptador remoto informa IDs de template aceitos na requisição, versão do protocolo/artefato, dependências permitidas e limites por uma resposta de capacidades versionada do BFF/runtime existente. Não inferir compatibilidade apenas do catálogo do cliente. Registrar esses campos no contrato compartilhado e validar a resposta; não hardcodar uma exceção dispersa para o sexto card.

`kitVersion` descreve versão de autoria/procedência, não permissão de execução. O `studio-kit.json` é editável; removê-lo ou alterar sua versão não deve impedir o build de fontes válidas. O `templateId` do documento continua sujeito ao parser atual, enquanto arquivos, dependências e protocolos determinam a execução real. Não introduzir confiança em campos declarados pelo próprio jogo.

Antes de M1, o novo ID fica desabilitado por padrão em produção. Playground/embed só o habilitam por configuração explícita e ambiente de execução compatível. Ausência/erro de capacidade em backend antigo não habilita o novo kit remoto; preserva o comportamento dos IDs já suportados. Abertura/edição/exportação de projetos existentes continua disponível; execução usa apenas backends compatíveis. Se a capacidade mudar com a tela aberta, mostrar indisponibilidade recuperável e conservar os dados. Não fazer fallback silencioso para outro gênero.

Capability check não substitui validação no build. Um erro de versão/ID do servidor deve ser distinguido de erro no código da criança. O rollout deve cobrir backend antigo com cliente novo, cliente antigo, falha da consulta e card desativado com projeto já criado.

## 12. Limites de escopo e decisão final

Este adendo entrega um kit completo de arena e os componentes necessários para fazê-lo bem. Não cria motor universal, novo chat, marketplace, editor visual de cenas, backend multiplayer, nova cobrança ou pipeline de mídia concorrente. Não importa cegamente arquivos de curso nem presume que licenças do Studio autorizem os assets externos.

Evoluções do lote 8: câmera/mundo maior, mira/projéteis, coleta e progressão, novos comportamentos, mapas e variantes de gênero. Elas reutilizam os contratos aqui estabelecidos, com orçamento e critérios próprios; não são marcadas como entregues pelo lançamento inicial.

A execução recomendada é acrescentar `canvas-survival` como sexto kit de jogo Pro, com fonte TS legível, pack próprio e integração Pinta, aproveitando a infraestrutura que está sendo implementada. O resultado deve ser demonstrado por jogabilidade, arte coerente, persistência confirmada e exportação reproduzível, além de compilar.
