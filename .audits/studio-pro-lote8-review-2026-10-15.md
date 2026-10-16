# Studio Pro — revisão do lote 8

## Entrega

O catálogo passa a ter 14 modelos: cinco bases web e nove kits de jogos. Foram acrescentados `canvas-grid-arena`, `phaser-tactics` e `three-tactics`. Os fontes autorais ficam em `packages/studio/pro-kits/grid-games`; o gerador determinístico entrega apenas os módulos do kit escolhido, além dos helpers compartilhados. Os três novos kits têm lock próprio derivado do grafo revisado do runtime. Engines não são importados no catálogo do editor.

- Arena: simulação fixa, semente/reinício, obstáculos, pavio, pulsos em cruz, cadeia, saída segura e precedência de derrota. Configuração é validada e copiada por partida.
- Tática: modelo único para 2D/3D, BFS/ocupação, seleção, movimento/ação por turno, recrutamento com custo/capacidade, oponente determinístico, vitória/derrota/reinício. Cenários com unidades isoladas da base são recusados. Renderers independentes, desenho por revisão, picking/teclado e pools visuais limitados.
- Drivers genéricos reconhecem os IDs explicitamente. Inspeção entrega cópias; testes usam entradas e botões, não alteram placar/vida. Tático Three inclui derrota, diferente dos outros dois kits Three.
- Curadoria do Zappy acrescenta padrões dos três kits e até três guias pertinentes ao pedido, com procedência: sprite, modelo, áudio, HUD, acessibilidade, nível, balanceamento e narrativa. O modo normal continua sem essa orientação textual.
- Materiais Pro mostram dimensões, bytes, licença informada, quadros/animações/hitbox, tilemap e clips/modelo. `MATERIALS.md` acompanha os kits com o fluxo Pinta/Molda/Pensa, reuso, revisão, escala, HUD/nine-slice e export.
- Helper opcional de áudio local: canais música/efeitos, volumes separados, opt-in, uma música/quatro efeitos, streaming, pausa/mute/erro/descarte. Não inicia geração de mídia nem chamadas pagas.

## Achados corrigidos durante a revisão

1. Oponente guloso podia ficar preso diante de água: substituído por custo de caminho calculado por BFS reverso.
2. Recrutas poderiam repetir IDs e unidades mortas crescer indefinidamente: IDs sem colisão, remoção de mortos antes de recrutar, limites de equipes/pool.
3. Mapas maiores que os exemplos poderiam ficar cortados: tamanho lógico do desenho acompanha os limites da configuração, preservando o tamanho dos exemplos.
4. Mutação da configuração do chamador poderia alterar resets: modelos mantêm cópia própria; snapshots também são cópias.
5. Promessa antiga de `play()` rejeitada durante pausa podia encerrar uma música retomada: revisões por voz invalidam resultados antigos. Troca de faixa distingue ID desejado do ID em reprodução.
6. Teste de perda WebGL esperava a mensagem comum dos kits Three: mensagem padronizada; prova de recuperação real passou.
7. Typecheck global identificou `exact` inválido nas duas consultas `ByRole` do teste do lote 7: removido; typecheck completo voltou a passar.

## Evidência local

- Regras/modelos e catálogo: repetição final com 62 testes/558 asserções passou, incluindo isolamento da configuração.
- Regressão Canvas da sessão paralela: 53 testes, 607 asserções, incluindo oito cenários Chromium de controller e 20 ciclos completos de descarte; passou após alterações dos helpers.
- Curadoria e Zappy: 75 testes/369 asserções passaram, incluindo isolamento de modos, conteúdo limitado e procedência.
- Todos os 14 modelos: fontes originais passam TypeScript, Vite e empacotamento real; junto das regras do puzzle, 17 testes/179 asserções.
- Novos kits: seis provas Chromium de interface/objetivo passaram (o teste Three de interface passou na repetição após padronização). Menu, entrada, pausa, resultado, reinício, resize, recuperação WebGL e descarte. Capturas de Phaser/Three inspecionadas visualmente em viewport estreito.
- Áudio: três testes/23 asserções de fronteiras; Chromium real com WAV dentro do iframe opaco comprovou opt-in, reprodução, pausa/mute e encerramento.
- Typecheck completo Studio passou após a correção de `ByRole`; geração/pack/lock, Biome dos arquivos alterados e `git diff --check` passaram. Avisos de normalização CRLF do Git não são erros de conteúdo.

Export independente, repetido após as correções finais: ZIP extraído fora do repositório, sem junction de dependências, `npm ci`, `npm ls --all`, `tsc`, Vite, pack e Chromium real com objetivo/derrota/reinício/captura. Locks permaneceram byte-idênticos.

| Kit | Envelope completo | ZIP | Artefato | Captura |
|---|---:|---:|---:|---:|
| Arena em grade | 90.760 B | 30.968 B | 20.020 B | 26.632 B |
| Tático Phaser | 101.572 B | 34.369 B | 1.224.069 B | 33.752 B |
| Tático Three | 107.386 B | 36.077 B | 512.329 B | 46.530 B |

Dados em `.cache/studio-grid-export-evidence.json`. Nenhum teto de assets/envelope/artefato foi aumentado.

Desempenho: 60 segundos por perfil e 20 reinícios, iframe compilado 1024×640, DPR 1, Windows/Chromium 148, 12 processadores lógicos. Three usa SwiftShader, não a GPU física. Medições são do loop com entrada sintética limitada; não provam performance do editor nem todas as combinações de unidades.

| Kit | p95 intervalo completo/econômico | p95 trabalho do callback completo/econômico |
|---|---:|---:|
| Arena em grade | 16,7 / 16,8 ms | 0,4 / 0,4 ms |
| Tático Phaser | 16,8 / 16,8 ms | 0,2 / 0,2 ms |
| Tático Three | 16,7 / 16,7 ms | 0,2 / 0,2 ms |

Three preservou cinco geometrias e zero texturas após os reinícios; draw calls variam com os overlays visíveis. Phaser registrou pico de intervalo de aproximadamente 66,7 ms; o p95 não elimina esse pico. Dados em `packages/studio/.cache/studio-kit-performance/`. As últimas correções de validação/clonagem não alteram os loops medidos; o teste de export valida sua execução atual.

## Destino da matriz GameDev

| Família da matriz aprovada | Destino comprovado ou referência identificada |
|---|---|
| Puzzle, arcade/ondas, plataforma, exploração e ação 3D | Kits dos lotes 6A/6B, regras e drivers existentes preservados |
| PocketBomber | Porta independente TS de grade/propagação; Canvas, config, modelo e testes |
| TinySwords/tilemap/turnos | Tático Phaser, camadas separadas da ocupação, seleção/turnos/recrutamento; arte procedural própria |
| Threejs Tactics | Tático Three próprio com regras compartilhadas; referências públicas de câmera/fases, sem alegar fontes comerciais ausentes |
| Spritesheets/isometria/raster/variante de arte | Pack original e loader/frames/colisão da arena Canvas, metadados Pinta, pipeline no guia e curadoria. Imagens dos repositórios e scripts de providers não redistribuídos |
| Modelos/clips/esqueletos/normalização | Loader e biblioteca Three do lote 6B, metadados GLB no Pro, orientação no guia e curadoria |
| Áudio/mixagem | Helper local executável, canais e ownership; guia de eventos e pista visual equivalente |
| HUD/nine-slice/animação de UI/acessibilidade | UI compartilhada responsiva, foco/controles/mute, receita de nine-slice e orientação por tarefa; sem afirmar certificação de acessibilidade |
| Input/FSM/física/pools/save | Helpers compartilhados, modelos puros, limites, recorde local com ACK; save não é checkpoint de partida nem sincronização Pensa |
| Níveis/progressão/balanceamento/narrativa/quests | Configuração de regras, validação de caminhos, limites de recrutamento, guias por tarefa e missão autorizada do Pensa |
| Shaders/pós-processamento | Referência opcional por orçamento/perfil; não há efeitos pesados obrigatórios nos kits |
| Godogen/orquestração/plano retomável | Construtor durável do lote 7, revisões, custo limitado, validação/captura/diff/aplicar/desfazer |
| Testes/perfil/soak/telemetria | Drivers e medições reais presentes; estabilidade prolongada e operação integrada seguem no lote 9 |
| Skills genéricas/descoberta/motores nativos/multiplayer/liveops | Referência interna identificada na matriz; não são funcionalidades do produto nem código automaticamente executado |

## Limites de homologação

Sem homologação de aparelhos físicos, Pinta/Molda/Pensa autenticados em outro perfil/dispositivo, OpenRouter pago, Cloudflare SDK/DO/R2 integrado ou soak de 30 minutos nesta entrega. Não há cópia permanente de publicação implementada por este lote. Essas verificações e as capacidades/envelopes integrados M1/M2/M3 continuam no lote 9. Nada foi commitado, enviado ou publicado.
