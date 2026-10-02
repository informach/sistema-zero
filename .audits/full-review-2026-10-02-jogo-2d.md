# Full review — cenários, perspectiva e Descida da Neve

## Correção dos achados — 02/10/2026

Os sete achados e os ajustes pedagógicos complementares foram corrigidos e verificados localmente. Os resultados da revisão original estão preservados abaixo como histórico.

| Achado | Correção | Evidência específica |
| --- | --- | --- |
| R1 | Contratos públicos distintos: básico com comportamentos prontos; Avançado com câmera, velocidade, entrada, limites e chegada separados. Vida, dano, HUD e telas usam blocos nativos. Movimento sem jogador. | Ausência dos atalhos do básico no Avançado; schema recusa comandos de outra extensão; execução sem jogador; exemplo avançado só com blocos intermediários. |
| R2 | Posicionar e repetir aceitam eventos durante a partida. O Avançado permite acessar a instância encontrada e percorrer cópias com um nome local. | Receita de ondas passa pelo schema e pelo ciclo código/blocos/código; três ondas e nove sprites executados no motor real. |
| R3 | Identidade da família permanece após recolher o original. Cópias integram grupos do básico e moldes do Avançado. O motor evita reutilizar o original enquanto ele nomeia cópias vivas. | Animação, velocidade, vida, recolhimento e nova onda testados após a coleta do original; reposicionar preserva família, velocidade e câmera. |
| R4 | Limpar a tela redesenha os fundos automáticos. | Teste da ordem de desenho no motor real com o bloco comum de limpeza; composição com mapas no Avançado. |
| R5 | Regras de quadro e encontros comuns respeitam início e telas finais do básico. | Contadores não avançam antes de começar nem após vitória/derrota; pausa e reinício exercitados pelos três exemplos. |
| R6 | Cada evento é isolado; o erro é avisado e o evento com falha é desativado. Outros eventos continuam. Reinício interrompe a execução da geração anterior. | Eventos de encontro e chegada com falha nos dois motores; reinício dentro do encontro e da visita às cópias. |
| R7 | Escalas automáticas finitas não usam o antigo teto manual. Avisos citam os controles atuais. | Imagem de 4 × 4 cobre 640 × 720 com escala 180 e retângulo de desenho verificado, sem aviso. |

Ajustes pedagógicos: no básico, movimento e espaço lateral têm escolhas prontas; há posição por esquerda/centro/direita e ajustes exatos em Mais controles. A animação por nome fica em Animação nas duas extensões. O guia apresenta a neve por etapas e uma atividade curta de 18 comandos/eventos. O Avançado foi refeito para combinar as operações, personalizar as telas e montar o HUD com contador/barra. A composição com ondas demonstra uso fora da descida. O Canvas mantém funções, dados e projeção manual.

Os 19 blocos/APIs manuais antigos continuam removidos. O Avançado também não publica os atalhos acoplados exclusivos do básico. Não há aliases ou categoria legada. Fontes, IRs e índice dos exemplos foram regenerados; as 108 colocações e a arte do percurso foram preservadas.

Contagem atual de comandos/eventos: básico 40, Avançado 64, Canvas 152. Contagem de blocos serializados sem sombras: 42, 92 e 1.137. A versão intermediária tem mais blocos porque controles, movimento, saúde, placar e telas são personalizáveis separadamente. Nenhum dos dois exemplos com extensão exige funções próprias, objetos de dados ou desenho manual de Canvas.

**Verificação final das correções:**

| Verificação | Resultado |
| --- | --- |
| `bun test src` | 8.692 aprovados, zero falhas, 550 arquivos; 209,62 s |
| `bunx tsc --noEmit` | Sem diagnósticos |
| Biome nos TypeScript alterados/adicionados do Studio | 90 arquivos, sem alterações necessárias nem avisos |
| `bun run check:snow-descent` | As três IRs sincronizadas com suas fontes |
| Chromium: galeria, seletores, animação, toque, pausa e reinício | 8 aprovados; desktop 960 px e celular 390 px; 41,7 s |
| `git diff --check -- .` no Studio | Sem erros de whitespace |

Logs em `packages/studio/.cache`: `fixes-full-final.log`, `fixes-typecheck-final.log`, `fixes-biome-final.log` e `fixes-browser-final.log`. As reproduções relevantes fazem parte da suíte permanente, incluindo isolamento de eventos, família após coleta, ondas, grupos/moldes, câmera sem jogador, telas finais, limpeza e imagem pequena. Também foram inspecionadas as capturas dos jogos em celular. O build do navegador apenas emitiu os avisos existentes de tamanho de chunks e configuração de cores do terminal; os casos terminaram sem erros/avisos no console dos jogos.

Guia atualizado: [jogo-2d-cenarios-e-neve.md](../packages/studio/docs/jogo-2d-cenarios-e-neve.md). Plano executado: [2026-10-02-jogo-2d-review-fixes.md](../docs/superpowers/plans/2026-10-02-jogo-2d-review-fixes.md). Mudanças locais, sem commit ou deploy. Arquivos de marketing, funil e comunidade ficaram fora do trabalho. Não houve atividade observada com crianças.

## Registro da revisão anterior às correções

Revisão de 02/10/2026 da implementação local. **Resultado: precisa de ajustes antes de ser considerada concluída.** A simplificação do exemplo funcionou, mas a API nova ainda não respeita suficientemente a diferença entre as duas extensões. Também foram reproduzidas falhas de composição e execução que a suíte anterior não cobria.

Critério confirmado pelo usuário nesta revisão: Jogo 2D deve embutir bastante comportamento para o iniciante. Jogo 2D Avançado também deve esconder a implementação, mas oferecer operações menores, personalizáveis e combináveis para diferentes jogos. Nenhuma das duas deve exigir funções próprias, objetos de dados ou contas de perspectiva para esse uso. Os blocos antigos de cenários/pista devem continuar removidos.

A rodada de revisão abaixo produziu análise, testes exploratórios em `.cache` e este relatório. As correções posteriores estão registradas na seção inicial.

**Comparação com os blocos existentes**

| Responsabilidade | Referência no Jogo 2D | Referência no Jogo 2D Avançado | Implicação para os novos blocos |
| --- | --- | --- | --- |
| Movimento | Mover em quatro direções; mover como plataforma; controles clássicos | Definir velocidade; mover; gravidade; pular; manter na tela | Básico pode oferecer comportamento pronto. Avançado precisa permitir combinar movimento, controle e limites. |
| Vida e dano | Dar vida; machucar e dar intervalo de invencibilidade | Machucar; consultar vida/invencibilidade; empurrar; desenhar barra | Entrar na perspectiva não deveria criar regras paralelas de vida ou encerrar obrigatoriamente a partida. |
| Telas | Cena, pausa, continuar, reiniciar | Personalizar tela; adicionar botão; mostrar tela; mudar estado; evento de entrada | O recurso de perspectiva deve aproveitar essas operações, principalmente no Avançado. |
| Muitos personagens | Grupos e eventos sobre sprites | Moldes; nascer um; fábrica por intervalo; para cada personagem vivo; recolher | As cópias em perspectiva precisam continuar manipuláveis e poder surgir durante a partida. |
| Cenário e câmera | Fundo, câmera, aparência do sprite | Cenário, mapa, câmera, profundidade, caminhos | Cenários em camadas precisam funcionar em jogos existentes, além da descida. |

Referências: `game-2d/blockCatalogFundamentals.ts`, `blockCatalogInteraction.ts`, `blockCatalogClassic.ts` e `palette.ts`; `game-2d-advanced/blocks.ts` e `blocks/definitions01.ts`, `definitions02.ts`, `definitions03.ts`.

Há detalhes técnicos demais também em alguns blocos anteriores do Avançado, como parâmetros de tempo. Eles não devem servir de modelo para reintroduzir complexidade: a referência útil é a separação de responsabilidades e a possibilidade de combinar comportamentos.

**R1 — P1: as duas extensões receberam a mesma abstração de partida**

Local: [catalog.ts](../packages/studio/src/official-extensions/scene-2d/catalog.ts:36), [blocks.ts](../packages/studio/src/official-extensions/scene-2d/blocks.ts:48), [spriteCatalog.ts](../packages/studio/src/official-extensions/scene-2d/spriteCatalog.ts:72).

`SCENE_METHODS` é o mesmo catálogo de 21 operações para ambos os motores. A geração troca prefixo, cor e seletor de personagem, mantendo as responsabilidades dos blocos. Separar a paleta em “Começar” e “Mais controles” não cria uma versão mais combinável para o Avançado.

Exemplos: escolher o jogador também redefine sua vida; percorrer a pista também define sua chegada; causar dano também decide a derrota; o placar também desenha progresso, pausa e instruções; telas prontas instalam várias transições e controles. O painel tem cores e frases fixas. No Avançado, essa nova interface não usa a personalização das telas existentes e ainda esconde a tela nativa de pausa quando está habilitada (`runtime/shell.ts:238`).

O acoplamento aparece no motor: `stepTrack` retorna sem movimentar nenhum elemento quando não existe um jogador. No teste exploratório, um sprite colocado a 400 com velocidade -100 permaneceu em 400 depois de um segundo. Isso limita, por exemplo, uma cena de aproximação ou alvos em movimento sem personagem controlável.

Correção recomendada: compartilhar projeção, desenho e integração de sprites internamente; separar os contratos pedagógicos. Manter atalhos de comportamento no básico. No Avançado, expor operações por intenção para posicionar em profundidade, mover, controlar, configurar câmera e reagir a encontros; combinar essas operações com vida, telas, estados e aparência já existentes. Uma operação pequena pode esconder toda a matemática sem decidir as regras da partida.

O exemplo avançado também precisa mudar: hoje reutiliza praticamente toda a fonte do básico e acrescenta uma vista e a condição de seis estrelas na chegada ([snowDescentSource.ts](../packages/studio/src/examples/snowDescentSource.ts:62)). Não demonstra essa composição intermediária.

**R2 — P1: a pista não permite montar o jogo durante a partida pelos blocos**

Local: [spriteCatalog.ts](../packages/studio/src/official-extensions/scene-2d/spriteCatalog.ts:101), [lifecycle.ts](../packages/studio/src/ir/lifecycle.ts:412).

`putTrackSprite` e `repeatTrackSprite` são `start-only-command` nas duas extensões. A restrição é aplicada pelo editor/validador, não apenas sugerida na documentação. Por isso, um evento de tempo, encontro ou fase não pode colocar um personagem recém-nascido na pista nem distribuir uma nova onda. Isso impede compor a perspectiva com os blocos de moldes e geração que o Avançado já oferece.

Correção recomendada: separar a criação da pista das ações sobre seus personagens. Posicionar, criar/reutilizar cópias e alterar sua distribuição precisam funcionar em eventos adequados, com referências acessíveis pelos seletores normais. Preparação repetida acidentalmente deve ser tratada pelo contrato da operação, sem proibir as ações necessárias durante o jogo.

**R3 — P1: recolher o original corta o controle das cópias restantes**

Local: [spriteRuntime.ts](../packages/studio/src/official-extensions/scene-2d/spriteRuntime.ts:179) e `sceneAnimation`, linha 212.

Reprodução: colocar uma estrela, repetir três vezes, recolher a primeira e depois mandar mudar a animação ou a velocidade dessa família pelo nome da estrela. As duas cópias restantes continuam vivas, mas nenhum dos comandos as alcança.

`collectTrackItem` remove o vínculo do original e o destrói. `trackSpriteVelocity` depende desse vínculo e `sceneAnimation` exige que o original ainda esteja vivo. Os dois testes exploratórios falham: nenhuma cópia recebe a animação; a posição lateral permanece -11 quando deveria chegar a -10.

Correção recomendada: dar identidade estável à família de cópias, independente da instância original, e integrá-la aos mecanismos de personagens/grupos de cada motor. O evento também precisa permitir aplicar os comportamentos apropriados à instância encontrada, além de recolhê-la.

**R4 — P2: “Limpar a tela” apaga os cenários automáticos no Jogo 2D**

Local: [lifecycle.ts](../packages/studio/src/official-extensions/game-2d/runtime/lifecycle.ts:117).

O motor desenha o fundo automático antes de executar os blocos de quadro da criança. Se ela combina o recurso com o padrão já ensinado — “A cada quadro → Limpar a tela → desenhar sprites” — a segunda limpeza apaga os cenários. O exemplo novo não contém esse bloco, então não revela a incompatibilidade.

Reprodução no motor real: acrescentar somente `gameLoop(() => clear())` à Descida da Neve. A última limpeza ocorre depois das imagens de fundo. O teste da ordem de desenho falha.

Correção recomendada: garantir uma composição consistente de limpeza, fundos e personagens quando o programa usa os blocos comuns. A criança não deveria precisar entender a ordem interna do motor para adicionar uma camada a um jogo que já funciona.

**R5 — P2: as telas prontas não suspendem as regras comuns no básico**

Local: [lifecycle.ts](../packages/studio/src/official-extensions/game-2d/runtime/lifecycle.ts:112) e [spriteRuntime.ts](../packages/studio/src/official-extensions/scene-2d/spriteRuntime.ts:231).

O estado inicial/vitória/derrota bloqueia apenas o avanço da pista. Os eventos de quadro e os encontros comuns continuam sendo processados. Um contador ou movimento adicionado pela criança roda atrás da tela inicial; portanto, os recursos normais não têm o mesmo ciclo da pista.

Reprodução nos motores reais: registrar um contador em um evento de quadro e executar três quadros antes de iniciar a partida. Básico: contador 3. Avançado: contador 0.

Correção recomendada: integrar as telas ao ciclo de simulação do jogo, preservando a renderização necessária para mostrar a própria tela. Cobrir também derrota, vitória, pausa e reinício com regras adicionais ao exemplo pronto.

**R6 — P2: um erro em um evento de encontro impede os outros eventos**

Local: [spriteRuntime.ts](../packages/studio/src/official-extensions/scene-2d/spriteRuntime.ts:94).

Os callbacks novos são executados sem isolamento individual. Se o primeiro falhar, os demais eventos daquele encontro não são executados. Como a passagem já foi consumida, não são retomados no próximo quadro.

Reprodução nos dois motores reais: registrar dois eventos para o mesmo item, sendo que o primeiro lança um erro e o segundo marca uma variável. A variável continua falsa. No básico, o erro ainda escapa do callback de animação. No Avançado, a proteção externa do laço captura o erro, mas também não recupera os eventos perdidos. O laço continua; não foi observado travamento permanente do motor.

Correção recomendada: usar o tratamento de erros dos eventos nativos, mantendo a proteção de reinício/geração e o contexto da instância encontrada. Testar também eventos de chegada.

**R7 — P2: o encaixe automático falha para imagens pequenas**

Local: [spriteRuntime.ts](../packages/studio/src/official-extensions/scene-2d/spriteRuntime.ts:244), [runtime.ts](../packages/studio/src/official-extensions/scene-2d/runtime.ts:107).

O ajuste para cobrir a tela calcula uma escala sem limite artificial, mas a camada privada rejeita valores acima de 100. Uma imagem de 4 × 4 numa tela de 640 × 720 precisa de escala 180. O ajuste é recusado, mantendo a transformação anterior, e o aviso ainda orienta a criança a procurar um bloco antigo (“Camada … em x”) que foi removido.

Correção recomendada: validar os limites da transformação efetiva e do desenho automático, sem reaproveitar o antigo limite de um parâmetro manual. Atualizar os avisos remanescentes para os comandos que realmente existem.

**Ajustes pedagógicos complementares**

- No básico, oferecer valores iniciais e escolhas visuais para posição e velocidade. A primeira atividade ainda pede vários números de calibração que podem ficar em ajustes opcionais.
- Levar a animação por nome para o grupo de animação, em ambas as extensões. Atualmente ela está entre cenários/pista, embora funcione fora da pista; o caminho antigo com folha e quadros permanece no grupo mais óbvio.
- Refazer a versão básica da neve como introdução por etapas. A versão completa pode continuar como demonstração, preservando a arte e os sprites animados.
- Refazer a versão avançada mostrando montagem de controles, movimento, encontros, placar e telas com operações reutilizáveis. Acrescentar uma variação de outro gênero como prova de composição, por exemplo nave com alvos surgindo ao longo da partida.
- Manter a versão Canvas como estudo de funções, objetos, relógio e projeção manual. Não usar sua arquitetura como pré-requisito das extensões.

**O que ficou correto e pode ser aproveitado**

- A matemática da perspectiva e a renderização foram internalizadas.
- A pista desenha sprites nativos, incluindo sua animação, sem exigir que a criança construa objetos de cenário.
- Os 19 blocos antigos de cenas/pista foram removidos do catálogo/registro e da API pública; os testes verificam sua ausência. As primitivas internas de projeção não são blocos legados escondidos.
- A conversão entre código, IR e blocos, a serialização dos seletores e a passagem de metadados de animação têm cobertura automatizada.
- As três fontes dos exemplos e suas IRs geradas estão sincronizadas; as 108 colocações do percurso foram preservadas.
- A redução de blocos é real. Ela é um indicador de simplificação técnica, não uma validação da filosofia do Avançado ou da compreensão por crianças.

**Verificação desta revisão**

| Verificação | Resultado |
| --- | --- |
| `bun test src` | 8.659 aprovados, zero falhas, 550 arquivos; 214,85 s |
| `bunx tsc --noEmit` | Código de saída 0, sem diagnósticos |
| Biome nos TypeScript alterados/adicionados do Studio | 82 arquivos verificados, sem alterações automáticas |
| `bun run check:snow-descent` | Canvas, básico e avançado sincronizados |
| Chromium: seletores + animação/toque/pausa das duas extensões em desktop e celular | 5 aprovados |
| Chromium: três exemplos pela galeria | 3 aprovados: Canvas, Jogo 2D e Jogo 2D Avançado |
| Testes exploratórios adicionais | 11 executados: 2 passam e 9 falham; as falhas reproduzem os achados acima, não nove defeitos independentes |

As reproduções originais ficaram em `packages/studio/.cache/review-scene.test.ts` e `review-native.test.ts`. São registros históricos, com o contrato anterior. As regressões vigentes foram incorporadas a `src/official-extensions/scene-2d` e `src/examples/snowDescentRuntime.test.ts`. A saída está em `review-probes.log`. Eles ficam fora de `src`, portanto não estão incluídos nos 8.659 testes aprovados. Um deles verifica uma capacidade de composição ausente (movimento sem jogador), registrada em R1; os demais exercitam falhas concretas dos contratos existentes.

Logs das demais verificações: `review-full-tests.log`, `review-typecheck.log`, `review-biome.log`, `review-browser.log` e `review-gallery.log`, na mesma pasta `.cache`.

Escopo conferido: catálogo/paleta e seletores; contratos e codecs; schema, geração, referências e ciclo da IR; metadados de assets e preview; projeção e composição de camadas; adaptadores e ciclo dos dois motores; sprites, animação e entrada; fontes/IRs dos três exemplos, índice e contratos da galeria; testes e documentação alterados. As mudanças de marketing, funil e comunidade presentes no diretório de trabalho ficaram fora desta revisão.

Os oito testes de navegador acima foram executados nesta rodada. O build emitiu avisos de tamanho de chunks e de configuração de cores do terminal; as execuções terminaram com código 0. Não houve avaliação pedagógica observada com crianças.

**Ordem de ajuste recomendada**

1. Definir contratos distintos para básico e avançado, conservando o motor de projeção compartilhado.
2. Resolver identidade das cópias e ações durante a partida; combinar com os blocos nativos de personagens.
3. Corrigir composição de desenho, ciclo de partida, isolamento de eventos e encaixe das imagens.
4. Refazer os dois exemplos com extensão segundo suas respectivas filosofias e ajustar a documentação.
5. Incorporar regressões duráveis e validar, além da neve, jogos com ondas, camadas em um jogo existente e sprites animados que mudam durante a partida.

Não há necessidade de restaurar os blocos antigos para executar esses ajustes.
