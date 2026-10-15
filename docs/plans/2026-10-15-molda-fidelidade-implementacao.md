**Molda — acompanhamento da implementação autorizada**

Fonte vigente: [proposta revisada](2026-10-15-molda-fidelidade-tres-niveis-proposta.md) e seus três documentos de referência. Autorização do usuário: implementar integralmente, com soluções na origem e preservando a identidade visual. Não considerar entregue um fluxo apenas porque sua aparência foi aproximada.

**Estado atual: oito lotes implementados, com ressalva no encerramento automatizado do WebKit.** Os fluxos e os 50 critérios estão conferidos na [matriz de aceitação](2026-10-15-molda-fidelidade-aceitacao.md). As cinco composições usam dados reais e têm 15 referências visuais automatizadas nos temas padrão, Pink e escuro. Domínio, componentes, hosts e cenários habilitados dos três navegadores passaram. O encerramento do processo WebKit foi intermitente: houve execução integral isolada normal e execuções com erro fora dos testes. O resultado detalhado está abaixo. As seções identificadas como histórico registram estados anteriores e não substituem este estado atual.

| Entrega | Estado | Trabalho e evidência necessários |
|---|---|---|
| 1. Contrato visual e acesso | Implementado | Regiões 104/1016/320; identidade do host; tokens semânticos; catálogo básico e inventário de controles verificados |
| 2. Domínio | Implementado | Pivô independente, chegada de poses, compensação contínua/exportação; sólidos fechados com UV; pintura transacional entre peças |
| 3. Oficina/Modelar | Implementado | Câmera ortográfica, alças Mover/Girar/Tamanho em pixels, campos reais, chão com fade/sombra, alinhamento com hierarquias e skin |
| 4. Pivô/Cortar | Implementado | Presets imediatos, fantasma, vértices deformados; corte exato de caixa e geral em worker; linhas seguem a superfície e são recortadas pela oclusão, mantendo a largura visual |
| 5. Pintar | Implementado | HSV/hex reversível, paletas por perfil, escopo, Shift/Alt, espelho local com hierarquia afim, grade UV, mapas e desfazer entre imagens; indicadores grandes em worker |
| 6. Animar | Implementado | Movimentos, chegada, poses e timeline redimensionável; tempos importados exatos, arrasto transacional e prévias isoladas; regressão do arrasto por seleção corrigida |
| 7. Níveis seguintes | Implementado | Áreas nomeadas de malha, UV, ossos/pesos, materiais, folha e curvas; referencial local/mundo; pivô Y/cantos/vértices e corte numérico; acesso revogável sem perda de dados |
| 8. Integração | Implementado e verificado, com ressalva do runner | 50 critérios; 15 comparações visuais; 3.193 testes do pacote; hosts Kids 75/75 e Estúdio 30/30; 50 cenários habilitados distintos de navegador; typecheck, lint e build aprovados. Erro intermitente de encerramento do WebKit registrado abaixo |

**Resultado final da verificação — 15/10/2026.**

| Verificação | Resultado | Evidência local |
|---|---|---|
| Importação, workers e exportação (`test:1`) | 1.091 aprovados, 0 falhas, 129 arquivos | `.molda-final-tests-verified.log` |
| Domínio e componentes (`test:2`, repetido após teclado/foco) | 1.015 aprovados, 0 falhas, 183 arquivos | `.molda-release-test2-final.log` |
| Estado, viewport e demais contratos (`test:3`, após otimização da sombra) | 1.087 aprovados, 0 falhas, 130 arquivos | `.molda-ground-test3.log` |
| Host Kids | 75 aprovados, 0 falhas | `packages/community-kids/.molda-host-final.log` |
| Integração de arquivos/runtime do Estúdio | 30 aprovados, 0 falhas | `packages/studio/.molda-host-final.log` |
| Chromium + Firefox + WebKit, build de produção | 49 cenários aprovados, 4 exclusões existentes; **2 erros fora dos testes ao encerrar WebKit** | `.molda-production-browser.log` |
| WebKit, projeto completo repetido em produção | 9 aprovados, 2 exclusões existentes, saída normal; cenários já contados acima | `.molda-webkit-production-final.log` |
| Timeline, cenário adicional em produção | 1 aprovado; arrasto, Escape, duplo clique, Enter, persistência, resize e histórico intacto | `.molda-timeline-production.log` |
| Chromium, suíte completa após cache da sombra | 32 aprovados, saída normal; inclui a timeline adicional e as referências visuais | `.molda-shadow-chromium.log` |
| Firefox/WebKit após cache da sombra | 17 aprovados, 1 falha na espera da miniatura, 4 exclusões; erro de encerramento WebKit. Espera corrigida e o cenário revalidado | `.molda-shadow-other-browsers.log`, `.molda-shadow-thumbnail-final.log` |
| Referências visuais após limitar a superfície da sombra | 15 comparações aprovadas em 3 cenários; referências não foram substituídas | `.molda-ground-fidelity.log`, `e2e/fidelity.spec.ts` e PNGs na matriz |
| TypeScript, build e whitespace finais | Aprovados | `.molda-ground-types.log`, `.molda-perf-ground-server.log`; `git diff --check` |
| Biome | 199 arquivos alterados/novos do pacote e teste do host, sem erros nem correções | `.audits/molda-final-biome.log` |

Logs sem prefixo de pacote ficam em `packages/molda/`. O total de 3.193 é a soma das três suítes completas, repetindo a suíte afetada após os ajustes de foco e sombra. A execução conjunta de navegadores **não foi uma execução integral verde**: o driver esperou pelo processo WebKit já encerrado e precisou interromper seu worker. O problema também ocorreu com servidor de produção, descartando a hipótese de depender apenas do HMR. Três reproduções menores (uma, duas e três jornadas) e uma repetição integral isolada do WebKit encerraram normalmente. A última reprodução da miniatura aprovou o cenário em 6,5s, mas também teve erro ao encerrar, portanto a ressalva não está limitada à execução conjunta. A causa dessa intermitência continua indeterminada; requer acompanhamento no runner. As quatro exclusões já existiam: arrasto sintético de pintura 3D e contagem de memória/contextos via protocolo Chromium em Firefox/WebKit.

**Correções finais verificadas.** A seleção de uma chave agora preserva a identidade das linhas da timeline, evitando cancelar o próprio arrasto. Espaço/Enter respeitam o controle com foco antes do atalho global de reprodução; um interruptor pode ser acionado pelo teclado. O separador da timeline recebe foco ao começar o gesto, permitindo que Escape restaure sua altura. O corte percorre a seção da superfície e recorta oclusão parcial, em vez de desenhar linhas pelo interior do sólido. Cores de texto do pivô/corte, ícones de canais, ghost anterior e pegador da timeline foram conferidos nos três temas.

A medição final encontrou trabalho redundante na sombra. O mapa agora é invalidado por conteúdo, pose, visibilidade, quadros de imagem e restauração do contexto; mover apenas a câmera reutiliza o mapa. A superfície receptora acompanha a projeção dos limites das peças, com margem para o filtro e o bias, evitando executar o shader em áreas vazias do palco. Os testes cobrem o reaproveitamento/invalidação e projeções no chão, suspensas e abaixo da origem. A miniatura progressiva da galeria mantém um espaço reservado com o mesmo nome acessível da imagem; o teste passou a esperar o `src` e a decodificação real, em vez de ler o atributo imediatamente após encontrar o espaço reservado.

**Desempenho final.** A [comparação reproduzível com a versão anterior](references/2026-10-15-molda-fidelidade/performance.md) registra hardware, renderer, cenas, hashes, código e resultados. Na cena de 128 peças, a implementação passou de 50,0/66,7ms para 16,8/33,4ms por quadro (p50/p95) após eliminar os dois custos de sombra, mantendo as 15 referências visuais. A versão anterior sem essas sombras mediu 16,7/16,8ms na rodada final. O renderer era SwiftShader, por software; permanece esse custo no p95, e não há alegação de desempenho universal ou de latência total baseada apenas nas medições de CPU. A confirmação de um gesto de 128 peças teve p95 de CPU de 0,533ms; o cancelamento, 0,006ms.

**Histórico da execução.** As próximas seções preservam os resultados intermediários, inclusive falhas corrigidas e pendências que foram encerradas. Para o estado vigente, consultar a tabela e a matriz acima.

**Condições da execução.** O workspace já contém mudanças de outros trabalhos em Estúdio, membros, Kids e `bun.lock`; elas não pertencem a esta implementação. O pacote Molda iniciou sem alterações locais. A experiência nova é a oficina padrão, conforme as regras do pacote; não criar editor paralelo nem flag de ativação.

**Decisões implementadas.** O pivô de autoria não rebaseia canais antigos; rotações novas carregam o pivô da chegada e a amostragem/exportação compensa o ponto de giro também entre chaves. Corte de superfícies continua distinto de cortar um sólido. Prévias de transformação, pivô e pintura usam `stage`/`saveSnapshot`: autosave/exportação recebem o conteúdo confirmado. UV, materiais, imagens e pixels preparados por um traço pertencem à mesma transação.

**Evidência intermediária (parcial, 15/10/2026).** Os 62 testes da proposta caracterizavam a base anterior. Naquele ponto da implementação:

- `bun test --timeout 20000 src/viewport/SceneViewport.test.ts`: 40 passaram (523 expectativas), incluindo alças reais, animação, cancelamento e contorno deformado.
- Pintura (`scenePaintContact`, `scenePaintGesture`, `ScenePaintInput`, `useScenePaint.colors`, `sceneImageTask`): 22 passaram; primeiro traço entre duas peças compartilhadas, preparação atômica, cancelamento integral, espelho local, UV e um desfazer.
- Chromium `e2e/scene-authoring.spec.ts`: 3 passaram; geometria da timeline/tempo importado exato, mover/pivô com cancelamento em Modelar e Animar, pintura real/grade UV/Alt/paleta/desfazer, sem erros de JavaScript ou shader.
- `test:1`: 1.084 passaram, zero falhas (importação/workers/exportação).
- Primeira execução ampla de `test:2`: 964 passaram, 23 falharam. Inclui expectativas antigas de pivô proibido, P para pincel, importação/apoio bloqueados, seletor nativo, contagem de controles e simulação incompleta do canvas. Em correção; não declarar suíte aprovada.
- Primeira execução de `test:3`: 1.067 passaram, 2 falharam (contrato estático contando canvas de 36px como controle, e novos campos sem `name`). Correções aplicadas, aguardando repetição.
- Typecheck passou antes dos últimos ajustes de indicadores/contratos; repetir ao finalizar o conjunto. Biome detectou e formatou alterações; correções finais de lint ainda em curso.

**Rodada posterior nesta execução.** As falhas antigas foram investigadas, não apenas ocultadas: corrigida a família do comando de importação, tamanho de toque da timeline (36px com mouse conforme referência; 44px com ponteiro de toque), entradas do inventário real e seleção da peça no driver dos testes. Importação simples e campos básicos alteram deliberadamente os tetos do inventário. A seleção de camada/mapa explícita continua dona do alvo, sem ser substituída pela pintura automática da superfície.

- `test:2` passou com 989 testes, zero falhas, em 176 arquivos (140,27s), antes das últimas alterações de animação.
- `test:3` passou com 1.072 testes, zero falhas, em 125 arquivos (17,60s), antes das últimas alterações de animação.
- Pintura ampliada: 30 testes em sete arquivos passaram (Shift sem leque de pixels, Alt/blur, namespace da paleta, contratos da oficina). Guias/mapas e lote de imagens: 16 passaram, incluindo liberação dos recursos visuais; indicadores: um teste passou com composição/camada oculta.
- Chromium: três cenários passaram novamente (17,8s). Pintar inclui cancelamento do HSV por Escape, paleta sem sobreposição, controles inteiros no palco em 1024/768/390px, persistência após reabrir e captura escura.
- Perfil exploratório de indicadores: uma imagem indexada 1024² levou 57,2ms na primeira leitura; cem leituras com cache levaram 9,4ms. O cálculo recebe apenas o snapshot confirmado. Isso não comprova o pior caso de 32MiB com muitas camadas.
- Animação: 110 testes passaram após corrigir valores numéricos com pivô. Rodada seguinte de 35 testes passou após seleção ao marcar manual/automático e arrasto contínuo com encaixe no tempo importado exato e Escape.
- Atualizados os comandos de lote de poses para indexar canais/tempos e percorrer vizinhos em ordem, removendo buscas quadráticas por pose. Ainda falta a prova no orçamento máximo.

As provas acima continuam parciais. Typecheck/lint, exportação com os novos campos numéricos, teste de corte real, os hosts e a aceitação final ainda devem ser executados após as próximas alterações.

Logs detalhados ficam em `packages/molda/.molda-*.log`, `.audits/molda-implementation-biome.log` e capturas em `packages/molda/.cache/playwright-results/`. Não são evidência de aprovação visual de todas as cinco referências nem de conclusão dos oito lotes.

**Fechamento funcional do lote 6 e início do 7.** O editor de lotes mantém o documento confirmado intacto durante a prévia, cancela em Escape/blur e invalida resultados quando outra edição muda a revisão. Copiar, mover, apagar e ajustar ritmo confirmam uma ação. Testado no orçamento de 65.536 poses, com colisão/trava invalidando o lote inteiro. Alinhamento e distribuição preservam transformações locais e aplicam uma única vez aos ancestrais escolhidos.

- Integração de animação: 112 testes passaram; numeric/pivô/exportação: 27 passaram; alinhamento/timeline/contrato: 14 passaram. Logs `.molda-animation-batch.log`, `.molda-animation-verified.log`, `.molda-arrange-contract.log`.
- Chromium, rodada completa e sem alterações concorrentes no servidor: quatro cenários passaram em 47,6s (`.molda-authoring-current.log`), incluindo prévia de lote, Escape, aplicar, desfazer e troca de atividade.
- Typecheck passou (`.molda-current-types.log`); Biome verificou os 142 arquivos alterados do pacote sem correções restantes.
- Pendências continuam explícitas: áreas UV/materiais/ossos/malha/curvas; acabamento de alças Girar/Tamanho, grade/sombra, corte completo no navegador/etiquetas; pior caso de pintura e hierarquia espelhada; acesso às opções avançadas de arquivos; build, hosts, temas e matriz integral de aceitação.

**Evolução do lote 7 — áreas e precisão.** A lista de pendências acima registra o começo do lote; os seguintes itens foram implementados desde então:

- Áreas nomeadas preservam o mesmo viewport, seleção e histórico. UV e folha ficam ao lado do 3D; ossos/pesos usam o painel central e a sobreposição existente. Entradas antigas duplicadas foram removidas. Foco retorna à entrada ao fechar a área; revogação de acesso encerra a autoria sem remover dados.
- Curvas desenham a transformação efetiva (incluindo compensação do pivô), preservam tempos importados e quaternions, oferecem eixo/canal/zoom do intervalo, campos exatos e gesto reversível. O gráfico tem amostragem limitada mesmo com 65.536 chaves; a faixa de chaves mantém todos os tempos exatos.
- Alinhamento mede vértices deformados por ossos; requer o conjunto completo para mover uma peça vinculada e seus ossos juntos. Mantém hierarquias afins e reflexões, sem mover pai/filho duas vezes.
- Mover/Girar/Tamanho compartilham um dono de gesto e alças em SVG com dimensões CSS. Mover usa 175px em X/Z e 129px em Y. Girar usa anéis de 118px, Tamanho mantém fatores positivos ao atravessar a origem e preserva o pivô. Transformações são conjugadas na referência exata, sem decompor nem regravar matrizes importadas. Escolha local/mundo está nos ajustes do palco a partir do intermediário.
- Pivô ganhou Y opcional, oito cantos e encaixe por picking de vértices visíveis. O fluxo antigo de pivô com Aplicar foi retirado de `useSceneModelGuides`, que permanece responsável somente por divisão de superfícies. Os controles extras ficam no painel de propriedades; os três presets básicos continuam na dica.
- Corte numérico e pontos compartilham validação de plano finito e que atravessa o volume. A prévia não modifica o snapshot salvo. Posição percentual nas arestas e plano local ficam na entrada Precisão do corte. Contador de pontos acompanha o primeiro ponto; espessuras e contornos seguem a especificação.
- Ajustar duração com redistribuição e inverter o movimento inteiro usam prévia separada, confirmação explícita e um desfazer. Essa autoria especializada foi retirada do básico. Opções de conversão avançada GLTF foram condicionadas a `files.interop`; o caminho simples conserva importação, prévia e relatório.
- Corrigida a entrada de escopo de pintura quando `SceneCanvas` é usado sem slots externos.

**Provas recentes, ainda parciais:**

- Áreas/curvas/oficina/acesso: 116 testes, 2.837 expectativas, zero falhas (`.molda-lot7-regression.log`). Chromium anterior às alças novas: cinco cenários passaram (`.molda-lot7-browser.log`).
- Alinhamento, inventário e áreas: 14 passaram; o domínio de alinhamento tem cinco testes, incluindo deformação por ossos. Gráfico denso limitado e zoom exato também cobertos.
- Alças reais, viewport, plano e corte: 48 testes, 1.476 expectativas, zero falhas (`.molda-precision-domain.log`).
- Integração de precisão, inventário, acesso, canvas e alças: 64 testes, 731 expectativas, zero falhas (`.molda-precision-final.log`). Inventário irrestrito montado passou a 63 na abertura: uma escolha local/mundo, recolhida nos ajustes. O básico não recebeu esse controle.
- Biome verificou 159 arquivos, sem erros. Typecheck revelou uma anotação de tupla no teste novo; corrigida, aguardando repetição.
- Primeira rodada Chromium de precisão: quatro passaram, três falharam. Duas falhas investigadas: painel extra de pivô ultrapassava a faixa de dica (movido para propriedades); o teste de corte calculava projeção antes da alteração de altura do viewport (corrigido). Uma rodada não chegou à galeria; precisa repetição e investigação se voltar. A rodada específica está em execução; não considerar o lote aprovado ainda.

**Pendências de integração que continuam obrigatórias:** grade com fade e sombra, acabamento/temas e alvos de toque das alças, corte completo no navegador, pior caso de indicadores de pintura e espelho em hierarquia transformada, regressão global após as novas áreas/entradas, build/hosts e matriz de comparação das cinco referências. Não anunciar fidelidade visual integral com base apenas nas suítes funcionais.

**Fechamento funcional do lote 7.** O caso básico de girar, dimensionar, cancelar e cortar com pontos nas arestas passou no Chromium (9,3s, `.molda-precision-browser2.log`). O caso intermediário de alinhar, escolher referencial, mostrar Y e executar corte geral em worker passou (8,4s, `.molda-precision-browser3.log`). Corrigida também a atualização das opções de guia quando o viewport está ocioso; a opção Y redesenha sem depender de um movimento posterior de câmera. A rodada final de 61 testes passou, com 706 expectativas (`.molda-precision-verified.log`), e typecheck passou (`.molda-precision-types.log`). A regressão Chromium global, incluindo a entrada na galeria que falhou uma vez, ainda deve ser repetida no lote 8.

**Lote 8 — integração em execução.** Grade com fade radial e sombra de chão agora pertencem a um recurso descartável do viewport, com cores por tema; não entram em fotografias nem exportações. As ferramentas do topo e a dica passaram a sobrepor o palco, mantendo a área de desenho ao trocar de ferramenta. A dica de Animar acompanha a base a 16px e some abaixo de 300px. As alças têm área de toque ampliada; pivô usa 106px em X/Z, etiqueta lateral e indicação do fantasma; corte ganhou cursor próprio de 34px no deslocamento (14, 8) e contador com cores semânticas.

A regressão encontrou dois problemas reais, corrigidos: (1) redesenhar guias diretamente durante os efeitos React podia ler a pose anterior e cancelar o arrasto do pivô; agora opções invalidam o quadro compartilhado, que desenha após receber a revisão; (2) a dica a 68px cobria a alça do pivô em Animar, corrigida pela posição de 16px definida na especificação. O teste de escala passou a localizar a ponta visual explicitamente, distinguindo-a do retângulo transparente de toque.

**Pintura: medição e correção de responsividade.** O histograma síncrono tinha custo perceptível com 32MiB. Medição reproduzível: `bun scripts/profile-paint-indicators.ts` e a variante `--worker`, no mesmo ambiente Windows/Bun 1.3.11, três aquecimentos e dez amostras por formato. O ponto medido é o cálculo de indicadores, não o tempo total de pintar/renderizar.

| Imagem 1024² / 32MiB | Antes, cálculo bloqueante p50 / p95 | Depois, atraso do próximo callback p50 / p95 | Depois, conclusão total p50 / p95 |
|---|---|---|---|
| Indexada, 32 camadas | 210,91 / 220,47ms | 23,31 / 26,24ms | 658,54 / 668,01ms |
| RGBA, 8 camadas | 118,43 / 133,59ms | 26,27 / 40,12ms | 177,17 / 203,39ms |

O processamento pesado foi transferido a worker, com cópia estruturada sem destacar buffers do documento, protocolo estrito, cancelamento por revisão e apenas um trabalho simultâneo. A interface tem um orçamento total de 65.536 amostras de pixel/camada para imagens pequenas, cache por imagem/paleta/base limitado a 32 variantes e indicação explícita durante a leitura. Nenhum resultado atrasado modifica projeto/histórico. A conclusão total pode demorar mais por inicialização/validação; a interface deixa de executar a composição grande. A cópia de 32MiB ainda custa 23–40ms nesta medição, limite registrado sem alegar ausência de pausas.

Prova de equivalência: mesma função de composição/histograma, ordem de materiais e desempate preservados, aritmética idêntica, sem aleatoriedade. SHA-256 iguais antes/depois: indexado `702f9f32c1826f1f1e77f139811a9b39604a54824b0045626374bff5f3016353`; RGBA `637290f38a117dd4f1775b4f278b72ac39866178b9475b0719eefd7ae4d6fce8`. Prioridade da otimização: impacto 5 × confiança 5 / esforço 3 = 8,3. Logs `.molda-paint-baseline.log` e `.molda-paint-worker-profile.log`.

**Evidências desta etapa:** seis testes do histograma/worker passaram, incluindo cancelamento, protocolo, buffers intactos e 40 materiais compartilhando uma imagem. Cinquenta e três testes de viewport/alças/pintura passaram; espelho testado com pai afim refletido, escala não uniforme, inclinação e pivô deslocado. Os dois cenários Chromium de corte/alças/pivô passaram novamente (10,8s, `.molda-guide-browser2.log`); a rodada anterior tinha cinco aprovados e duas falhas, ambas investigadas acima. Typecheck passou após essas alterações visuais.

Primeiras provas amplas atuais: `test:1` passou com 1.091 testes/129 arquivos; `test:3` passou com 1.076/127; `test:2` continua em execução. Build Vite do playground passou em 3,23s, incluindo os novos workers. No host Kids, 25 de 26 testes passaram: a falha é a ordem do catálogo, pois `model.locator` mudou para básico mas ficou fisicamente entre as famílias intermediárias; corrigir na fonte. A regressão Chromium completa está em execução. Os testes antigos estão sendo migrados para as áreas nomeadas e para o pivô imediato, preservando as provas de cancelamento, arquivo e desfazer.

**Pendências para fechar, ainda não entregues:** conferência das cinco cenas de referência com capturas equivalentes e temas claro/escuro/Pink; conclusão e correção das regressões globais e dos hosts; inventário de comandos e matriz dos 50 critérios; revisar encaixe do pivô em vértices de malha deformada, descarte seguro do chão se a inicialização falhar, fechamento persistido de dicas e prova do caminho de criação por pontos sobre primitivas. Nenhuma dessas pendências deve ser escondida por um anúncio de conclusão do lote 8.
