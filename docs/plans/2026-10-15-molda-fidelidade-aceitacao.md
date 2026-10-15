**Molda — matriz de aceitação da implementação**

15/10/2026. Os 50 critérios têm implementação e evidência; as cinco composições foram conferidas nos três temas. Resultados e ressalvas da validação ficam no [acompanhamento](2026-10-15-molda-fidelidade-implementacao.md). As diferenças deliberadas de identidade, geometria e acessibilidade estão discriminadas abaixo.

Referências: [Pivô](references/2026-10-15-molda-fidelidade/molda-ferramenta-pivo-spec.md), [Cortar](references/2026-10-15-molda-fidelidade/molda-ferramenta-cortar-spec.md), [Animar](references/2026-10-15-molda-fidelidade/molda-animar-spec.md). Caminhos de testes são relativos a `packages/molda/`. Nas tabelas, `C/` significa `src/components/editor/scene/`, `S/` significa `src/scene/`, `V/` significa `src/viewport/` e `E/` significa `src/state/`.

**Capturas duráveis em 1440 × 900.** Criadas pelo fluxo público de importação, seleção e autoria, usando `e2e/fidelity-fixture.ts`. Os campos e a geometria são reais. As 15 imagens foram inspecionadas e são referências de regressão: `e2e/fidelity.spec.ts` compara as novas capturas com esses PNGs, com tolerância de 100 pixels, além de verificar dados, ações, salvamento, teclado e ausência de erros. A rodada em produção passou nos três temas. Ambiente das referências: Windows, Chromium do Playwright, escala 1. A comparação com os JPEGs conceituais é visual e leva em conta as diferenças deliberadas abaixo; os JPEGs não são os arquivos de referência do comparador automático.

| Composição | Padrão | Pink | Escuro |
|---|---|---|---|
| Mover | [Captura](references/2026-10-15-molda-fidelidade/implemented/default/01-modelar-mover.png) | [Captura](references/2026-10-15-molda-fidelidade/implemented/pink/01-modelar-mover.png) | [Captura](references/2026-10-15-molda-fidelidade/implemented/dark/01-modelar-mover.png) |
| Pivô | [Captura](references/2026-10-15-molda-fidelidade/implemented/default/02-modelar-pivo.png) | [Captura](references/2026-10-15-molda-fidelidade/implemented/pink/02-modelar-pivo.png) | [Captura](references/2026-10-15-molda-fidelidade/implemented/dark/02-modelar-pivo.png) |
| Cortar | [Captura](references/2026-10-15-molda-fidelidade/implemented/default/03-modelar-cortar.png) | [Captura](references/2026-10-15-molda-fidelidade/implemented/pink/03-modelar-cortar.png) | [Captura](references/2026-10-15-molda-fidelidade/implemented/dark/03-modelar-cortar.png) |
| Pintar | [Captura](references/2026-10-15-molda-fidelidade/implemented/default/04-pintar.png) | [Captura](references/2026-10-15-molda-fidelidade/implemented/pink/04-pintar.png) | [Captura](references/2026-10-15-molda-fidelidade/implemented/dark/04-pintar.png) |
| Animar | [Captura](references/2026-10-15-molda-fidelidade/implemented/default/05-animar.png) | [Captura](references/2026-10-15-molda-fidelidade/implemented/pink/05-animar.png) | [Captura](references/2026-10-15-molda-fidelidade/implemented/dark/05-animar.png) |

**Os 50 critérios dos documentos.** A prova visual é a captura correspondente acima; a prova de interação é `e2e/scene-authoring.spec.ts`, complementada por `e2e/workshop-journeys.spec.ts`, `e2e/scene-timeline-resize.spec.ts` e pelos testes citados. “Atendido” significa implementação e prova do comportamento especificado, com as adaptações declaradas; não significa identidade pixel a pixel com os JPEGs nem teste manual em dispositivos físicos.

| ID | Estado | Critério | Implementação e prova |
|---|---|---|---|
| P1 | Atendido | P ou botão ativa Pivô | `C/sceneCommandRegistry.test.tsx`; fluxo público no navegador |
| P2 | Atendido | Marcador roxo de 40px sobre o pivô | `V/SceneAxisHandles.ts`; captura Pivô |
| P3 | Atendido | X/Z com contorno branco e pontas circulares | SVG com tamanho de tela; Y opcional nos níveis seguintes; captura Pivô |
| P4 | Atendido | Arrasto por eixo sem mover a peça | `E/scenePivotGesture.test.ts`; arrasto, Escape e desfazer no navegador |
| P5 | Atendido | Fantasma roxo 55%, giro de 30° em Y | `S/pivot.test.ts`, `V/ScenePreviewGuide.ts`; captura Pivô |
| P6 | Atendido | Etiquetas Pivô / Assim ela vai girar | `V/SceneGuideAnnotation.ts`; captura Pivô |
| P7 | Atendido | Dica com três presets e ativo roxo | Canto/Centro/Embaixo, estado pressionado; captura Pivô |
| P8 | Atendido | Preset sincroniza pivô, campos e prévia | `C/ScenePrecisionTools.test.tsx`; navegador verifica valores imediatamente |
| P9 | Atendido | Campos de pivô destacados e sincronizados | `C/ScenePieceCoordinates.tsx`; captura Pivô; texto adaptado para contraste no escuro |
| P10 | Atendido | Peça já girada não pula | `S/pivot.test.ts`, `S/animationPivot.test.ts` |
| P11 | Atendido | Girar usa o pivô escolhido | `V/SceneTransformGizmo.test.ts`, `S/animationPivot.test.ts`; compensação também na exportação |
| C1 | Atendido | K ou botão ativa Cortar | `C/sceneCommandRegistry.test.tsx`; navegador |
| C2 | Atendido | Pontos médios visíveis de 8px | `V/ScenePreviewGuide.test.ts`, `V/sceneCutPicking.test.ts`; oclusão inclui outras peças |
| C3 | Atendido | Hover de 22px e faca de 34px | `V/ScenePreviewGuide.test.ts`; captura Cortar |
| C4 | Atendido | Clique marca 16px e encaixa no meio | `V/ScenePreviewGuide.test.ts`; navegador clica nas arestas reais |
| C5 | Atendido | Linha rosa 4px com borda branca | `S/meshSectionPath.test.ts`, `V/sceneOcclusionQuery.test.ts`; segue a superfície, com oclusão parcial e órbita |
| C6 | Atendido | Linha provisória branca 3px/90% | `V/ScenePreviewGuide.ts`; captura Cortar; não cria corda pelo interior do sólido |
| C7 | Atendido | Contador rosa acima/esquerda do primeiro ponto | `V/SceneGuideAnnotation.ts`; captura Cortar; variante de texto com contraste |
| C8 | Atendido | Barra escura, encaixe, cancelar e Cortar rosa | `C/SceneSolidCutBar.tsx`; captura Cortar; corrigir último ponto permanece acessível |
| C9 | Atendido | Confirmação só com 2+ pontos válidos | `S/solidCutPoints.test.ts`, `C/ScenePrecisionTools.test.tsx` |
| C10 | Atendido | Caixa 6×2×8 vira duas 6×2×4 fechadas no lugar | `S/boxSolidCut.test.ts`, `S/solidCut.test.ts`; navegador confirma e desfaz |
| C11 | Atendido | Duas peças substituem original, com material | `S/boxSolidCut.test.ts`; navegador e persistência canônica |
| C12 | Atendido | Um desfazer restaura o corte inteiro | Cenário de corte confirmado/desfazer em `e2e/scene-authoring.spec.ts` |
| C13 | Atendido | Escape/Cancelar limpa sem alterar a peça | `C/ScenePrecisionTools.test.tsx`; navegador |
| C14 | Atendido | Overlays em pixels acima da superfície visível | `V/ScenePreviewGuide.test.ts`; centro da linha recortado por oclusão, largura inteira desenhada acima |
| A1 | Atendido | Animar ativo e cinco ferramentas | `C/sceneCommandRegistry.test.tsx`; captura Animar |
| A2 | Atendido | Pose interpolada e sombra no chão | `S/sampleAnimation.test.ts`, `V/SceneGround.ts`; captura Animar |
| A3 | Atendido | Pose anterior cinza/60% atrás da peça | `C/SceneWorkshop.tsx`, guia separado da cena exportada; captura Animar |
| A4 | Atendido | X/Y/Z com pontas 24px no topo | `V/SceneAxisHandles.ts`, `V/SceneViewport.test.ts`; captura Animar |
| A5 | Atendido | Controles 60/régua 30/linhas 36/nomes 180 | Navegador mede geometria; 44px nos alvos de toque |
| A6 | Atendido | Losangos 10/14/18px | `C/SceneAnimationKeyStrip.test.tsx`; captura Animar |
| A7 | Atendido | Conectores 2px/33% | Canvas com resolução por DPR; captura Animar |
| A8 | Atendido | Agulha 2px, cabeça 14×18, até o fim | `C/SceneAnimationRuler.tsx`; navegador mede altura e exercita arrasto/Escape |
| A9 | Atendido | Marcação manual e automática ao soltar | `E/SceneAnimationPoseGesture.test.ts`, `C/SceneAnimationAuthoring.test.tsx` |
| A10 | Atendido | Chegada suave, linear e degrau reais | `S/animationArrival.test.ts`, `S/sampleAnimation.test.ts`; arquivos antigos mantêm sua interpretação |
| A11 | Atendido | Transporte e repetição funcionais | `E/SceneAnimationPlayer.test.ts`, `C/SceneWorkshop.test.tsx`; navegador |
| A12 | Atendido | Contagem de poses na árvore | `C/SceneAnimationAuthoring.test.tsx`; captura Animar mostra 8 no corpo e 3 na roda |
| A13 | Atendido | Altura ajustável | T1–T12 abaixo |
| T1 | Atendido | Inicial 306, pegador escondido | `C/timelineLayout.test.ts`; captura Animar e navegador |
| T2 | Atendido | Hover mostra pegador 36×4 e cursor | CSS da timeline; separador também acessível pelo teclado |
| T3 | Atendido | Arrasto redistribui a altura | `e2e/scene-timeline-resize.spec.ts`: 306→386; canvas perde exatamente 80px |
| T4 | Atendido | 3D mínimo 240, timeline 162 ou recolhida 60 | `C/timelineLayout.test.ts`; inclui descontar cabeçalho e controles do host |
| T5 | Atendido | Soltar abaixo de 120 recolhe; arrastar reabre | `C/timelineLayout.test.ts`; `e2e/scene-timeline-resize.spec.ts`: 60→260→60 |
| T6 | Atendido | Duplo clique alterna 306/recolhida | `e2e/scene-timeline-resize.spec.ts`; também Enter no separador |
| T7 | Atendido | Cabeçalhos fixos; faixas/nomes alinhados | Uma estrutura por linha; captura Animar |
| T8 | Atendido | Agulha ocupa a altura visível | Navegador mede 245px numa timeline de 306px |
| T9 | Atendido | Resize não distorce a peça | `V/viewportCamera.test.ts`; renderer e aspecto atualizam pelo tamanho real |
| T10 | Atendido | Legenda/dica/zoom a 16px da base | Captura Animar; em palco estreito, dica ocupa uma linha própria; abaixo de 300px, dica não essencial some |
| T11 | Atendido | Resize não gira câmera nem move agulha | Captura de ponteiro isolada; `e2e/scene-timeline-resize.spec.ts` verifica Escape, tempo e histórico intactos |
| T12 | Atendido | Reabertura preserva altura | Preferência por perfil/namespace; `e2e/scene-timeline-resize.spec.ts` recarrega a página, reabre em 386px e testa janela menor |

**Identidade e diferenças deliberadas.**

- As medidas estruturais seguem os documentos: trilho 104px, centro 1016px, painel 320px e timeline inicial 306px. O cabeçalho ocupa 60px mais a borda de 1px. Nunito/Baloo, receitas de botões, ícones e superfícies vêm do Sistema Zero. Controles e alvos de toque seguem as dimensões acessíveis da plataforma.
- O sólido tem dimensões reais 6×2×8. O desenho conceitual parece um cubo apesar dos campos 6×2×8; a implementação preserva a matemática descrita na proposta revisada. Origem local na base, posição −5/0/−5 e pivô Canto 3/0/4 são consistentes. A câmera é ortográfica; o chão e a sombra são calculados, sem esticar a peça para imitar o JPEG.
- A árvore contém um grupo e quatro peças: o contador “Peças e grupos” mostra 5. A janela está oculta e as duas rodas ficam dentro do corpo no fixture, conservando os quatro itens de referência. Grupos sem canais e sem seleção não ocupam linhas vazias na timeline.
- O tempo numérico da pose continua acessível para precisão e tempos importados. “Corrigir ponto” complementa Cancelar/Cortar. “Olhar”, ajustes e imagem de apoio conservam navegação acessível. Controles de precisão ficam em áreas e revelações, sem substituir os gestos básicos.
- Pink e escuro alteram ação e superfícies gerais; pivô, corte, eixos e canais conservam papéis semânticos. Variantes de texto garantem contraste sem mudar a cor dos marcadores. A barra de corte usa a superfície escura também no tema escuro.
- Entre pontos marcados, a linha do corte percorre o menor arco conectado da seção na superfície. Componentes desconectados não são ligados por uma linha fictícia através do volume. O plano numérico mostra a seção completa. O recorte de oclusão considera outras peças e preserva as larguras visuais da especificação.

| Papel / token | Padrão | Pink | Escuro |
|---|---|---|---|
| Fundo `--color-mld-bg` | `#e9eef6` | `#f4ecf2` | `#121a30` |
| Painel `--color-mld-surface` | `#ffffff` | `#ffffff` | `#121a30` |
| Ação `--color-mld-accent` | `#1b5cf3` | `#c8246f` | `#6e9bff` |
| Pivô `--mld-pivot` | `#8b3fd9` | mesmo | mesmo |
| Fundo do pivô `--mld-pivot-bg` | `#f2eafc` | mesmo | `#2f2044` |
| Texto do pivô `--mld-pivot-text` | `#8b3fd9` | mesmo | `#c99af7` |
| Corte `--mld-cut-ink` | `#e8336f` | mesmo | mesmo |
| Fundo do corte `--mld-cut-bg` | `#fde6ee` | mesmo | `#3b1b2c` |
| Texto do corte `--mld-cut-text` | `#c31952` | mesmo | `#ff85ad` |
| Canais `--mld-channel-move/rotate/size` | `#1b5cf3` / `#d48116` / `#00895b` | mesmos | `#6e9bff` / `#f0a43c` / `#49d98f` |
| Eixos `--mld-axis-x/y/z` | `oklch(0.56 0.19 25)` / `oklch(0.54 0.14 152)` / `oklch(0.53 0.19 262)` | mesmos | mesmos |

Os arquivos `tokens.json` ao lado das capturas registram valores computados. Texto do pivô claro: contraste 4,71:1. Contador do corte: 4,95:1 claro e 6,68:1 escuro. Esses ajustes de texto são deliberados; os marcadores mantêm os valores dos documentos.

**Inventário por nível e preservação dos dados.** O catálogo único é `src/core/toolFamilies.ts`; o host traduz o nível em famílias. `C/sceneCommandRegistry.test.tsx`, `C/SceneWorkshop.contract.test.tsx` e `C/SceneWorkshop.toolAccess.test.tsx` cobrem disponibilidade, atalhos e inventário.

| Nível | Autoria acrescentada |
|---|---|
| Básico | Peças, coordenadas, pivô, faces/pontos, corte, acabamento, espelho central, imagem/ponto de apoio, pintura direta, movimentos, importação simples e exportação |
| Intermediário | Precisão, referencial local/mundo, alinhamento/distribuição, pivô Y/cantos/vértices, corte numérico, laço, malha, espelhos por eixo, camadas/formas/folha/flipbook e lotes de poses |
| Avançado | Malha avançada, ossos/pesos, UV, mapas/materiais, curvas/articulações e opções de interoperabilidade |

Na abertura básica do fixture de inventário, o teto é 59 controles montados/40 apresentados; com seleção, 103/78. Sem restrições, 64/42 e 117/81. Os números incluem cada cor, campo e ação por peça; não equivalem a uma pesquisa de compreensão com crianças. Retirar uma permissão encerra a autoria correspondente, mantendo leitura, reprodução, salvamento e exportação dos dados existentes.

**Limites das provas.** Os fluxos de corte, pintura, pivô, animação, precisão e áreas especializadas foram exercitados no Chromium. Firefox e WebKit cobrem o contrato comum de criação, responsividade, arquivos, persistência e vínculo de ossos; dois casos por navegador continuam excluídos pela configuração existente: arrasto sintético de pintura 3D e contagem de memória/contextos WebGL. Os testes dos hosts são locais; não representam publicação nem uma sessão real na nuvem de produção. O perfil de pintura de 32MiB e seus limites estão documentados no acompanhamento. A [comparação de quadro e gesto](references/2026-10-15-molda-fidelidade/performance.md) cobre cenas de quatro e 128 peças com renderer por software; não certifica todos os dispositivos nem o limite máximo de todas as cenas.

A execução conjunta dos três navegadores aprovou os 49 casos habilitados, mas terminou com dois erros de encerramento do processo WebKit. Uma repetição integral do projeto WebKit em produção aprovou seus nove casos, manteve as duas exclusões existentes e encerrou normalmente. O caso adicional de redimensionamento da timeline também passou em produção, totalizando 50 cenários habilitados distintos aprovados. Após a otimização de sombra, Chromium repetiu os 32 cenários com saída normal; Firefox/WebKit repetiram as jornadas, com uma corrida na espera da miniatura corrigida e revalidada. O encerramento do WebKit voltou a falhar, inclusive numa repetição de um só cenário, apesar de a interação ter aprovado. A causa dessa intermitência permanece indeterminada; os detalhes estão no acompanhamento. Corte de peças que sejam ossos, contenham filhos ou tenham vínculo de deformação mantém a recusa explícita e atômica prevista na proposta; não é anunciado como suporte automático.
