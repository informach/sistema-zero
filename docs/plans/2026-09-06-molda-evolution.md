# Evolução do Molda: oficina 3D para crianças de 9+

Plano aprovado em 06/09/2026. Implementação nativa em TypeScript/React/Three.js;
Blockbench é referência de capacidades, não uma fonte de código a incorporar.
Referência estudada: `JannisX11/blockbench`, commit
`47e633e4a1338f957ee7baa0acbcf54da11e77df` (5.1.6, GPL-3.0-or-later).

## Acompanhamento — atualizado em 10/09/2026

**Último lote implementado e verificado: 228, a oficina seguinte dentro do app, fase 3.**
Próximo lote: miniatura da geração seguinte e ramo v2 da nuvem, fases 3/1, lote 229.
Lotes são incrementos de trabalho, não fases nem percentuais. Nenhuma das nove fases
cumpriu todos os critérios de aceite; as fases 1–3 ainda têm pendências.

| Fase | Situação | Principais pendências |
| --- | --- | --- |
| 1 — Segurança e medição | Proteções e migração interna implementadas | Homologação com abas reais, medições em hardware e rollout |
| 2 — Arquitetura e desempenho | Base parcial; persistência interna por hash e CSS medidos | Reduzir latência/memória dos blobs, ampliar tarefas canceláveis e medir caches/GPU em hardware |
| 3 — Oficina e navegação | Oficina, começo rápido e retomada; integração no app atrás de capacidade desligada, com galeria de duas gerações e promoção ao abrir, verificadas em navegador real | Miniatura da geração nova, nuvem v2, ponte Estúdio e revisão de toque/temas |
| 4 — Organização e modelagem | Ferramentas internas implementadas | Homologação; chanfro restrito a uma quina e caminhos abertos |
| 5 — Pintura, UV e materiais | UV com abertura/cortes escolhidos, pintura/camadas, PNG/JPEG, mapas detalhados, recorte de transparência, atlas e flipbook 2D/3D internos; pintura animada produzida no Molda, escolhida na oficina e tocando no runtime do Estúdio | Integração pública e homologação |
| 6 — Animação e Estúdio | Reprodução, timeline, poses/presets, gestos/autokey e exportação GLB cancelável com transporte compacto medido; pintura animada tocando no runtime do Estúdio | Conexão da oficina, integração pública e homologação |
| 7 — Esqueleto e skinning | Vínculos/pesos, forma-base, pintura/mapa de forças, GLB com skins, IK de dois segmentos com destino arrastável/faixa de flexão e conjuntos de poses locais; bake integrado verificado | Desempenho extremo, acabamento do pincel, integração pública Studio e homologação |
| 8 — Intercâmbio e reutilização | GLB/glTF, OBJ/MTL e bbmodel free com clipes locais e camadas inteiras adaptadas, workers, revisão, prévia e adoção interna | Ampliar clipes/camadas/PBR do bbmodel, compatibilidade glTF e ponte Studio |
| 9 — Aprendizado e homologação | Galeria otimizada e dicas opcionais de montagem/pintura/animação | Percursos progressivos, testes em dispositivos e usabilidade com crianças |

Molda: **2.822 testes, zero falhas, 380 arquivos**, tipos, Biome e Vite (1,19 s)
no lote 228; workers glTF, OBJ e bbmodel alcançáveis pela oficina interna. Studio no lote 118:
**7.956 testes, zero falhas, 506 arquivos** no lote 226, tipos e Biome passaram.
Build Kids do lote 228: 3,9 s de compilação, 59 páginas, 616 testes. Os cinco testes
de integração Molda/Studio foram reexecutados com sucesso no lote 187.
Em 10/09 os 224 lotes anteriores, que existiam apenas no disco, foram commitados na
`staging` em cinco commits escopados, com todos os gates reexecutados antes.
Testes automatizados não homologam GPU, toque
real ou usabilidade infantil; o chunk Three ainda gera aviso de tamanho (>500 kB).
A falha intermitente de foco registrada no lote 148 reapareceu no lote 149 e foi
reproduzida: o DOM atualizava antes da restauração em efeito passivo. Correção no
ciclo de vida, regressão determinística, 75 execuções focais e integral passaram;
testes originais preservados. Detalhes no review do lote 149.
No lote 203 houve avisos de updates fora de act nos testes de TextureEditor;
o focal passou sem repeti-los. A causa da interação da suíte permanece pendente,
sem supressões nem alegação de correção; detalhes no review do lote 203.
No lote 214, ModelEditor.test emitiu avisos act na integral; o focal de 39 testes
passou sem repeti-los. A origem dessa interação também segue aberta, sem atribuir
causa ou alegar correção a partir do focal; detalhes no review do lote 214.
No lote 216, os avisos act apareceram em ModelEditor.paint.test durante a integral;
mesma pendência de diagnóstico de interação, sem atribuir causa nem suprimir logs.
No lote 219, dez avisos act em ModelEditor.paint/TextureEditor; mesma pendência.
No lote 221, cinco avisos act em TextureEditor; não houve supressão nem correção alegada.
No lote 225 reapareceram cinco avisos act, nos mesmos componentes do lote 219 (LoadedEditor,
EditorTopBar duas vezes, FacePaintDialog e ModelEditor); mesma pendência, agora com
reprodução fresca para o lote de diagnóstico, sem supressão nem correção alegada.
A integral do lote 155 encontrou outra janela: prévia de superfície concluída não
fechava após revisão externa. Assinatura de revisão e ownership reentrante corrigidos;
regressão local/worker, 40 repetições focais e integral passaram. Review do lote 155.

Para acompanhar, mantenha este arquivo aberto na prévia Markdown do editor. Esta
seção resume o estado; o **Registro de execução** abaixo detalha entregas, revisão,
evidências e limitações de cada lote. Atualizar ambos ao encerrar um lote, mantendo
os critérios de aceite das fases separados das tarefas já implementadas.

Para experimentar a oficina interna, execute `bun run dev` em `packages/molda`
e abra `http://127.0.0.1:5198/?oficina=nova`. Para ver a INTEGRAÇÃO no app, com a galeria
enxergando as duas gerações, use `?oficina=app`. Nenhum dos dois é a ativação pública do
editor nem do formato novo na nuvem: a capacidade `sceneWorkshop` do host nasce desligada.
Próxima frente de implementação: a miniatura da geração seguinte e o ramo v2 da nuvem,
que são os dois pré-requisitos de ligar a capacidade sem a criança perder nada; depois a
ponte do Estúdio, os leitores compatíveis e só então o escritor novo.

## Decisões aprovadas

- Criação 3D completa voltada ao Estúdio: modelagem, pintura/UV, animação e intercâmbio.
- Assistência local determinística, com explicação, prévia e desfazer; sem IA generativa.
- Editor completo em computadores, Chromebooks e tablets. Celular: galeria, visualização e edições simples.
- Uma oficina contextual, sem produtos separados para iniciantes e avançados.
- Animação em duas etapas: partes articuladas; depois esqueleto, pesos e poses assistidas.
- Formatos específicos de Minecraft, plugins e colaboração multiplayer ficam fora desta evolução.

## Contratos de arquitetura

Documento versionado com nós identificados, hierarquia, transformações locais,
geometria, materiais, texturas e animações. Seleção, câmera, ferramenta e reprodução
são estado de sessão. Snap e grade não arredondam destrutivamente dados importados.

Comandos têm disponibilidade, prévia, commit e cancelamento comuns a teclado,
mouse e toque. Um gesto produz uma entrada de histórico; multisseleção é atômica.
Geometria, topologia, UV e animação permanecem independentes de React/DOM/Three.
Viewport separa cena, câmera, seleção, manipulação, pintura e recursos GPU.

Operações pesadas usam tarefas canceláveis e tokens de documento/revisão; resultados
atrasados são descartados e buffers pertencentes ao documento nunca são transferidos.
Persistência lista resumos e carrega documentos individualmente. Conteúdo grande é
endereçado por hash, reutilizando o protocolo de partes da nuvem.

Leitores distinguem válido, inválido e versão não suportada. Codecs reportam perdas.
Entrypoints públicos não-UI continuam puros. A ponte do Estúdio informa clipes e custos.
Nuvem impede regressão de formato em reservas e commits concorrentes. Rollback de UI
não remove essa proteção; formatos desconhecidos permanecem recuperáveis.

## Fases sequenciais e critérios de aceite

- [ ] **1 — Segurança e medição.** Registrar WIP e capacidades; proteção de versões no
  backend/adaptadores/local; migrar ao abrir, preservando original até escrita bem-sucedida;
  benchmarks válidos com p50/p95. Leitores antigos não apagam formatos novos; aparência,
  identidade e vínculos legados são preservados.
- [ ] **2 — Arquitetura e desempenho.** Extrair comandos/gestos, índices de adjacência/espaciais,
  atualizações locais de geometria/UV/textura, histórico por deltas com orçamento conjunto
  undo/redo, render sob demanda e suspensão invisível, ferramentas pesadas lazy.
- [ ] **3 — Oficina e navegação.** Modelo em destaque, ferramentas/propriedades contextuais,
  timeline só em Animar, gavetas tablet, tokens da plataforma, alvos de toque de 44px,
  mouse/trackpad, vistas ortográficas reais, enquadrar seleção, isolamento e referências.
  Começo rápido com vazio/template; nome e ajuda no contexto.
- [ ] **4 — Organização e modelagem.** Grupos aninhados, pivôs/locators, reparent preservando
  mundo, transformações/duplicação/espelho atômicos; seleção caixa/laço/conectada/loops/
  através; faca/cortes/merge/split/dissolve/espessura/bevel/proporcional; prévias de
  extrusão/inset, primitivas paramétricas/caminhos e reparos locais explicáveis.
- [ ] **5 — Pintura, UV e materiais.** Edição 2D/3D sincronizada, projeções/costuras/ilhas/pack;
  conversão atômica da pintura por face para texturas compartilhadas, fonte canônica única;
  camadas/opacidade/seleção/formas/linhas/gradientes/carimbos/importação; cores preservadas;
  materiais amigáveis e mapas detalhados; manter seamless/céus; flipbook + metadados Studio.
- [ ] **6 — Animação articulada e Estúdio.** Clipes/poses/timeline/loop/chaves TRS,
  gravação explícita/autokey opcional, copiar/espelhar/inverter/retime, curvas step/linear/
  smooth, presets editáveis; GLB hierárquico eficiente e runtime com instâncias independentes.
- [ ] **7 — Esqueleto e skinning.** Ossos/bind/rest pose, vínculo automático/pintura de pesos/
  normalização, IK e limites de juntas, poses espelhadas; reaproveitar timeline/histórico;
  bake portátil; clonagem, descarte e ressincronização corretos.
- [ ] **8 — Intercâmbio e reutilização.** GLB/glTF, OBJ+materiais e bbmodel 4.9/4.10/5.0 com
  fixtures; prévia/relatório de conversões e incompatibilidades; nunca executar scripts/Molang;
  projeto nativo/GLB/glTF/OBJ/PNG/HDR/apresentação; escolha explícita para perdas; escolher
  destino de “Usar no Estúdio”, preservando vínculos de ressincronização.
- [ ] **9 — Aprendizado e homologação.** Templates progressivos, demonstrações curtas e
  dispensáveis, galeria por resumos/miniaturas progressivas; erros de loading/WebGL/storage/
  offline/conflitos/exportação; plataformas/perfis/temas/Estúdio e usabilidade 9–11 anos.

## Orçamentos e verificação

- Hardware real de referência documentado: frame p95 ≤16,7ms representativo e ≤33,3ms stress;
  prévia de entrada p95 ≤50ms. Microbenchmark CPU não é evidência de GPU/browser.
- Zero frames contínuos ociosos, suspensão invisível, progresso/cancelamento em tarefas longas.
- Caches limitados por bytes e sem crescimento monotônico após 20 ciclos abrir/fechar.
- Galeria não carrega todos os documentos. Ponto inicial: 128 partes, 20k triângulos,
  texturas até 1024²; trocar teto isolado de 1024 vértices por orçamento agregado.
- Testar migrações, versões desconhecidas, abas antigas, reservas concorrentes, invariantes
  matemáticas/topológicas/UV/skin/animação, undo/cancel; GLTFLoader independente e Khronos
  validator; mouse/trackpad/toque/WebGL perdido/reduced-motion; dois perfis/dispositivos,
  CRUD/conflitos na nuvem e roundtrip com múltiplas animações no Estúdio.
- Rollout: guards backend → leitores compatíveis → migração local → novos escritores.
  Cada fase exige código, evidência e documentação; checklist não é prova de conclusão.

## Registro de execução

### Modo de execução atualizado

O usuário autorizou em 06/09 executar todos os lotes em sequência, com revisão
técnica a cada lote e validação humana ao final. Checkpoints não exigem nova
aprovação. Nenhum deploy, migração de produção ou commit está implícito nisso.

### Estado inicial

Existem alterações prévias extensas no Molda (modelagem/seleção/viewport/testes) e em
gamificação/members, inclusive migration 0074. Preservá-las, sem reset ou commit automático.
Baseline observado no planejamento: 516 testes Molda passaram, typecheck e Biome passaram.
É evidência histórica, não substitui verificação fresca das alterações desta execução.

O benchmark antigo usa 1089 vértices contra teto 1024, mede melhor de cinco e chama
extrusão com IDs de vértice em vez de face. Deve ser corrigido antes de comparar performance.
Microbenchmark válido de grade 900 quads/961 vértices: geometria p50/p95 1,81/3,74ms,
diagnóstico 18,04/24,98ms, sanitize 5,05/9,01ms, extrusão 4,57/8,64ms, corte 13,49/20,61ms.
Sem conclusão de GPU, navegador ou tablet a partir desses números.

### Lote 1 implementado: guardas, leitores e medições

- [x] Contrato monotônico de versão de formato na nuvem, separado da revisão de upload.
- [x] Leitura nativa discriminada e preservação de dados de formatos desconhecidos.
- [x] Benchmark válido e reproduzível com verificação das operações.

O backend recebe `formatVersion` opcional (legado = 1), recusa regressão contra o
formato confirmado **e** o reservado, sob o lock transacional existente. O commit
promove apenas a versão reservada e confere reservas legadas de deploy misto.
`CREATION_CLIENT_OUTDATED` é HTTP 409, com `details.requiredVersion`; o cliente
não entra em retry nem avança a marca de sincronização. O BFF mantém validação estrita.

`readMoldaDocument` distingue `valid`/`invalid`/`unsupported`. Sanitizadores e
escritores não convertem formatos futuros silenciosamente. A persistência local
confere quota e versão na mesma transação IndexedDB, inclusive sem Web Locks.
Na primeira edição de um registro legado, a transação preserva o original em
`molda:recovery:<id>` e promove o registro com `formatVersion: 1`; falhas abortam
todo o lote, inclusive a cópia. A cópia ocupa quota e só é removida junto com a
exclusão explícita da criação. `loadRecovery` permite recuperá-la sem sanitização.

A galeria mostra registros ilegíveis/futuros em uma seção de recuperação com
botões acessíveis. A cópia JSON mantém campos desconhecidos e converte as peles
Uint8Array para o base64 nativo. Valores fora desse contrato são recusados, não
omitidos. Formatos futuros da nuvem ficam fora da reconciliação de **ambos** os
lados, inclusive quando timestamps coincidem; podem ser baixados sem editar.
Entrypoints `assets` e `studio-library` continuam sem UI/Three.

### Migração e rollout

Migration gerada pelo Drizzle: `0075_creation-format-version.sql`, após a 0074
preexistente. Contém somente duas colunas em `members.creations`: `format_version`
inteiro obrigatório com default 1 e `pending_format_version` opcional. Nenhum
documento/R2 é reescrito e nenhum backfill de conteúdo é necessário. O ALTER adquire
lock de tabela: validar duração e janela em staging antes de produção.

Não foi executado `db:migrate`, deploy ou commit Git. Testes SQL executaram em
banco de teste, com DDL atualizado. Aplicar a migration antes de implantar o
backend/BFF. Terminar o rollout de **todos** os servidores com o guard antes de
habilitar escritores de formato novo; manter as colunas/guards em rollback de UI.

Este lote **não ativa o formato 2** e não conclui todas as nove fases. Código antigo
já aberto, anterior aos guards, não passa a respeitar locks/versões retroativamente.
Antes de habilitar o novo documento, sua escrita local deve usar armazenamento
isolado do legado e migração com promoção transacional. O lote 2 implementou esse
isolamento. Homologação em abas reais e rollout de todos os guards continuam gates.

### Evidências do lote

- Backend: `bun test` — 950 testes, zero falhas (inclui PostgreSQL local).
- Transações IDB: testes independentes com `fake-indexeddb`, sem mock de idb-keyval
  nem Web Locks; quota concorrente, formato concorrente, falha no último put e
  preservação/promoção do original. Dependência somente de desenvolvimento.
- Molda: `bun test src --reporter=dots` — 530 testes, zero falhas (60 arquivos).
- Kids: contratos de fila/nuvem/adaptador — 62 testes, zero falhas.
- Member-shell: validação e fluxo BFF — 26 testes, zero falhas.
- Typecheck nos quatro pacotes afetados; Biome nos arquivos alterados.
- Build Vite do playground passou; chunk principal 1.162,50kB (326,70kB gzip),
  com aviso de chunk >500kB e import dinâmico ineficaz de fflate porque PNG o importa
  estaticamente. Registrar como alvos da fase 2, não ocultar o aviso aumentando o teto.
- Não houve homologação visual em navegador real nem medição de GPU/tablet:
  o Browser integrado não disponibilizou uma sessão. Testes DOM usam happy-dom,
  testes IDB usam implementação independente, e não substituem esses gates.

### Baseline CPU reproduzível

`bun scripts/bench-mesh.ts`, Bun 1.3.11, Windows 10.0.26200, Ryzen 5 5600G.
8 aquecimentos, 40 amostras, percentil nearest-rank. Fixture 900 quads/961 vértices,
roundtrip sem perda, extrusão resulta em 904 faces e corte em 930. Não é medição de FPS.

| Operação | p50 (ms) | p95 (ms) |
| --- | ---: | ---: |
| Geometria de 900 quads | 1,30 | 4,43 |
| Diagnóstico da malha | 15,61 | 16,61 |
| Adjacências/arestas | 0,60 | 1,06 |
| Sanitize + clone | 5,21 | 8,89 |
| Overlay + descarte | 1,65 | 3,33 |
| Extrusão | 3,50 | 6,66 |
| Corte de 30 quads | 10,92 | 13,21 |
| Geometria de 128 peças | 1,11 | 2,57 |

O script também informa p99 e variação de heap; esta depende de GC e **não** é pico
de memória nem prova de ausência de vazamento. Ainda faltam perfil de CPU detalhado,
hardware de referência browser, duração de frames/input e 20 ciclos de abrir/fechar.

### Lote 2: isolamento local e revisão

- [x] Escritas atuais em `molda:document:<id>`, fora do prefixo que abas legadas
  procuram. Leitura aceita os dois prefixos, mas o documento canônico sempre vence.
- [x] Primeira escrita promove o legado, preserva o original exato e retira a chave
  antiga na mesma transação. Inclui legados já marcados com `formatVersion: 1`.
- [x] Exclusão retira documento, legado e recuperação atomicamente; tombstone
  `molda:deleted:<id>` impede a ressurreição por escrita tardia de uma aba antiga.
- [x] Leitura dos três registros relacionados ocorre na mesma transação; um documento
  canônico inválido nunca causa fallback para uma versão antiga.

Revisão completa do escopo (storageKeys, guardedWrite, persistence e testes, mais
busca de consumidores): o ID interno divergente da chave podia abrir uma criação
sob a identidade errada. Leitura agora reporta inválido; a correção na escrita
preserva o original. Regressão reproduzida vermelha antes da correção e verde depois.
Não há API nova sem consumidor nem dependência runtime nova; núcleo público puro
permanece puro. Backups contam na quota; tombstones são metadados de exclusão.

Evidência: 535 testes Molda e 62 testes kids/nuvem passaram. Typecheck Molda passou.
Isolamento foi testado com IndexedDB independente, sem Web Locks: um escritor antigo
altera a chave legada após migração e não altera o documento futuro canônico nem a
cópia original. A migração de armazenamento continua lazy na primeira escrita;
abrir/listar não regrava projetos. O formato nativo continua 1. Homologação de abas
reais e o rollout backend continuam gates externos; não afirmar fase 1 homologada.

### Lote 3: diagnóstico espacial medido

- [x] Perfil de CPU antes/depois em `.audits/molda-evolution/mesh-*.md`.
- [x] Comparação quadrática de vértices substituída por varredura ordenada no eixo
  mais extenso; distância exata só entre candidatos próximos.
- [x] Oráculo quadrático independente em 60 malhas determinísticas, limites de
  epsilon, pares repetidos, coordenadas extremas, estabilidade e ausência de mutação.

Oportunidade: impacto 4 × confiança 5 / esforço 2 = 10. `meshIssues` tinha 25,8%
do tempo total no perfil inicial. A tentativa de hash espacial ainda gastava 17,8%
em strings/busca; novo perfil motivou a varredura mais simples. Benchmark CPU local,
900 quads/961 vértices: p50/p95 **15,32/16,81ms → 3,09/4,93ms**. Não equivale a FPS.
181 testes do núcleo de modelagem passaram. Revisão: ordem dos pares restaurada
por índices originais; geometria e diagnóstico de faces não mudaram; cálculo de
distância mantém `Math.hypot`/epsilon; sem RNG novo, cache persistente ou quantização.
Não remover o WIP anterior de `mesh.ts` ao reverter esta alteração isolada.

### Lote 4: histórico por deltas e orçamento conjunto

- [x] `history` contabiliza undo e redo no mesmo orçamento, inclusive nas trocas.
- [x] `snapshotDelta` retém apenas ramos alterados e faixas de pixels; alterações
  densas usam substituição limitada, sem primeiro alocar todas as faixas pequenas.
- [x] Editor usa base confirmada separada da prévia; Ajustar recalcula o delta
  original, inclusive quando reexecutar uma ferramenta muda os IDs gerados.

Revisão encontrou duas regressões reproduzidas por testes vermelhos: redo fora do
orçamento e miniatura derivada vazando por múltiplos undos. Ambas corrigidas.
Miniaturas ficam fora do histórico de conteúdo e são regeneradas. Testes cobrem
mutação, todos os tipos, inclusão/remoção de campos/listas, pintura densa/esparsa,
50 ciclos undo/redo, prévia interrompida e ajuste de topologia. Um pixel alterado
num bitmap sintético 1024² retém menos de 256B de payload do delta; isso não é
medição de heap, nem habilita texturas 1024² na interface. Mantém-se a exceção
deliberada de um único passo maior que o orçamento para não perder todo o desfazer.
Coordenador de gestos, carregamento lazy e suspensão invisível foram entregues nos
lotes 5/6; os demais itens da fase 2 seguem abertos. Testes antes do ajuste de miniaturas: 543/543;
após esse ajuste, 19 testes focados passaram. Revalidar o conjunto no fim do lote seguinte.

### Lote 5: carregamento por editor e suspensão invisível

- [x] Galeria não importa os três editores estaticamente; cada editor é carregado
  ao abrir, com estado acessível de preparação, erro, nova tentativa e volta segura.
- [x] Prévia fora da tela, documento oculto ou contexto WebGL perdido não mantém rAF.
  Pedidos ficam coalescidos e retomam na visibilidade/restauração. Todos os observers
  e listeners são removidos no dispose; resize idêntico não redimensiona a GPU.
- [x] Instrumentação QA do playground não força as três fábricas no bundle inicial
  de produção. Em desenvolvimento, instala antes de montar, inclusive em deep links.

Revisão: tentativas assíncronas antigas não remontam editor nem vencem retry recente;
nenhum save/asset é modificado por falha de download. Testes de visibilidade, perda de
contexto, recuperação, unmount tardio e retry passaram. Conjunto: 549 testes Molda.
Build inicial da galeria: entrada 285,94kB + dependência pré-carregada 64,58kB =
350,52kB (118,32kB gzip); baseline 1.162,50kB (326,70kB gzip). Three fica no chunk
adiado 558,42kB. São bytes do build playground, não métricas de rede/LCP do kids.
Avisos de Three >500kB e fflate compartilhado permanecem explícitos.

### Lote 6: protocolo transacional de gestos

- [x] Coordenador puro com token de propriedade/revisão: begin, preview, commit,
  cancel. Commit encerra propriedade antes de notificar; resultado tardio não pode
  alterar uma revisão criada por outro comando ou undo/redo.
- [x] Viewport (peça, grupo, malha e pintura), sliders de céu, pintura 2D/de face,
  seletor de cor e setas seguradas usam o mesmo protocolo.
- [x] Escape cancela arrasto, pintura ou seta em andamento; pointercancel/perda de
  captura cancela pintura. Escape no editor de face cancela o traço antes de fechar
  o diálogo. Um único ponteiro controla cada folha; outros dedos não encerram o traço.
- [x] Perda WebGL abandona buffers e alças, restaura documento atual e mantém o
  loop suspenso. Liberação normal da captura pelo TransformControls não é cancelamento.

Revisão encontrou uma base incorreta de delta ao executar comando durante replace:
o histórico deve sempre partir da última revisão confirmada, nunca da prévia viva.
Teste vermelho reproduziu; corrigido. Cancelar de volta ao objeto já salvo também
restaura o indicador Salvo. O store não persiste tokens/câmera/seleção. Nenhum código
do Blockbench incorporado. Verificação intermediária: 565 testes, zero falhas, 64
arquivos; typecheck passou. Testes finais novos e build serão reexecutados no lote
seguinte. Não substitui homologação real de pointer capture/WebGL/tablet.

### Lote 7: projeções reais e navegação

- [x] Câmera extraída em `viewportCamera`; Frente/Trás/Esquerda/Direita/Cima usam
  projeção ortográfica e vetores exatos. Livre retorna à perspectiva. A órbita
  livre permite ver também a parte de baixo do modelo.
- [x] Enquadrar seleção inclui gêmeos visíveis e ignora peças escondidas; caso vazio
  tem fallback seguro. Resize mantém o zoom ortográfico; enquadrar recalcula o fit.
- [x] `viewportNavigation` separa controles/listeners da câmera e da cena. Trocar
  vista descarta amortecimento anterior e recalcula o eixo vertical do OrbitControls.
  Pan com mouse/um dedo nas vistas planas; dois dedos aproximam/movem.
- [x] Barra de vistas rotulada, vista ativa com texto/sublinhado, seleção desabilitada
  sem alvo e alvos de 44px. Picking de malha usa tolerância em pixels também no zoom
  ortográfico. Atalho F existente de Pintar de perto foi preservado.

Revisão: alterar apenas camera.up manteria o quaternion antigo do OrbitControls;
recriar e descartar o controle corrige isso na origem. Testes usam câmeras,
Raycaster e OrbitControls reais, sem renderer: 11 testes de câmera/navegação/picking,
incluindo 20 atualizações sem deriva em cada vista. Conjunto posterior: 574 testes
Molda, zero falhas, 66 arquivos. Typecheck e Biome passaram. Build passou: entrada
286,03kB + preload 64,81kB; ModelEditor adiado 171,93kB. Um teste de cancelamento
capturava a prévia antes de pronta; agora espera o contrato real de prontidão, sem
sleep arbitrário. Resultado tardio de alça/malha também restaura a cena atual.

Nova tentativa de navegador integrado não encontrou sessão (`getForUrl` indisponível;
discovery vazio após troubleshooting). Portanto não houve inspeção visual nem
homologação de WebGL, pointer capture, trackpad ou tablet real. Não tratar os testes
matemáticos/happy-dom como esse aceite.

### Lote 8: painel responsivo e isolamento

- [x] Inspetor recolhível no desktop e gaveta não modal abaixo de 1024px. A gaveta
  libera espaço vertical para o palco, preserva controles montados, restaura foco,
  respeita campos/dialogs e permite continuar interagindo com a cena.
- [x] Isolar seleção é estado transitório e segue a seleção/multisseleção/gêmeos;
  sem seleção não liga e ao perdê-la sai. Aviso explícito com Mostrar tudo evita
  confundir isolamento com exclusão. Não cria histórico nem muda flags hidden.
- [x] A mesma visibilidade filtra malhas, picking, alvos de Grudar e enquadramento;
  a miniatura restaura temporariamente a criação inteira e devolve a sessão no finally.
  Exportadores continuam recebendo o documento completo, não a filtragem da vista.

Direção de interface: uma bancada de peças, encaixes, régua, lápis e paletas, com a
criação no centro. Azul-céu, papel claro, grafite, azul de ação e cores das próprias
peças vêm dos tokens kids; tipografia display Baloo herdada, base espacial de 4px,
bordas leves e estados nomeados. Skills de interface orientaram manter essa
linguagem e substituir painel sempre aberto por gaveta/dock, sem outro tema ou fonte.
Revisão DOM inclui foco, Escape, resize sem remount e cancelamento antes de fechar.
Teste E2E de layout foi atualizado para abrir/recolher a gaveta; execução visual
permanece pendente por ausência de sessão no Browser integrado.

Revisão final de persistência reproduziu um registro canônico `undefined` que era
confundido com ausência por `getMany`, permitindo fallback para um legado antigo.
A leitura pontual agora usa cursores na mesma transação: ausência, valor inválido e
tombstone continuam distintos, sem buscar os backups. Regressão e aborto testados
com IndexedDB independente. Evidência fresca: 582 testes Molda, zero falhas (68
arquivos); 62 testes de integração Kids/nuvem, zero falhas. Typecheck e Biome
(235 arquivos) passaram. Build passou: entrada 286,22kB + preload 65,01kB,
351,23kB no total (118,56kB gzip); Three continua adiado, com aviso de tamanho.

### Lote 9: exportação de céu fora da thread da interface

- [x] Worker próprio por tarefa, lazy, sem transferir buffers do documento. Cancelar,
  falhar ou concluir termina o worker e remove os listeners. Respostas têm identidade
  do documento/revisão e validação de formato; mensagens tardias não resolvem a tarefa.
- [x] Download HDR informa etapas reais (renderizar/codificar), pode ser cancelado,
  restaura foco e é invalidado por edição/undo/saída. Falha de worker fica visível;
  não há fallback silencioso que volte a bloquear a interface.
- [x] Render/encoder canônicos continuam compartilhados com a API síncrona, sem
  modificar ordem, sementes, cores, ponto flutuante ou formato. Cinco presets foram
  comparados byte a byte em worker Bun real, além de testes de transporte/DOM.

Perfil CPU `sky-before.md`: renderSky/fbm/floatToRgbe/RLE dominam o trabalho. Matriz:
export HDR, impacto 4 × confiança 5 / esforço 3 = 6,7. A prévia pequena ficou em
3,38/3,76ms p50/p95; foi mantida. Export HDR síncrono: 105,57/119,63ms. Em comparação
posterior na mesma máquina, chamada síncrona p95 106,67ms → despacho worker 0,40ms;
tarefa concorrente do event loop p95 122,08 → 15,82ms. O tempo **total** aumentou
para 189,72ms p95 devido ao startup: o ganho é liberar a thread, não exportar mais
rápido. Scripts `bench-sky.ts` e `bench-sky-worker.ts`, 3 aquecimentos/20 amostras,
Ryzen 5 5600G/Bun 1.3.11. SHA256 HDR em todos os caminhos:
`c00c9074625b9f34ba521beb29c15de7e2f1bfd730d8271dfe769d8440c72941`.
Não representa INP, FPS, WebGL ou o desempenho de Chromebook/tablet.

Revisão: tokens protegem contra cancelamento/edição tardia e uma assinatura de
revisão antiga não pode cancelar tarefa nova. Verificação: 599 testes, zero falhas
(70 arquivos), typecheck, Biome (244 arquivos), build Vite e build completo do Kids
Next/Turbopack passaram. Vite emite worker separado de 5,58kB. No Kids a inspeção
seguiu factory → bootstrap → chunk compilado; o `.ts` emitido também como recurso
auxiliar não é o executável usado pelo runtime. CSP existente permite worker self;
nenhuma política foi relaxada. Navegador real continua pendente. Exportações de
células do ZIP e reenvio ao Studio ainda usam a API síncrona: próximo lote.

### Lote 10: integração assíncrona e cache com orçamento

- [x] ZIP prepara cada HDR no mesmo worker, em sequência; abortos propagam como
  `GalleryZipError('aborted')` e não devolvem pacote parcial. Backup nativo e bytes
  do HDR permanecem iguais; roundtrip do arquivo comprimido verificado.
- [x] `exportLoadedAssetForStudio` agora é assíncrono. A fila de ressincronização
  inclui codificação e entrega, não apenas a rede; `flush` espera o último envio.
  Namespace/persistência são capturados antes de entrar na fila. Entrada pública
  continua sem React, zustand ou Three; falhas reais chegam ao aviso do editor.
- [x] Cache LRU limita conteúdo a 16MiB (strings contadas conservadoramente em
  UTF-16 + overhead) e 16 entradas. Resultado acima do orçamento não fica retido.
  Substituição/remoção/limpeza contam corretamente; 20 ciclos testam a estrutura,
  mas não constituem medição de heap ou leak check de navegador.

Revisão reproduziu uma corrida de saída: editar durante entrega ao Studio permitia
fechar mesmo se a última edição falhasse ao salvar. Teste vermelho confirmou a
perda da tela de recuperação. `EditorScreen` agora drena revisões e revalida após
cada await, permanece aberto se salvar falhar e ignora conclusão após unmount.
Teste verde inclui falha, permanência no editor, recuperação do armazenamento e
saída com a última revisão entregue. Não bloquear a interface enquanto espera I/O.

Verificação final: 607 testes Molda (71 arquivos), zero falhas; 62 testes Kids/nuvem,
zero falhas; typecheck, Biome (246 arquivos), build Vite e build Next/Turbopack
completo passaram. Entrada Vite 288,46kB + preload 65,23kB (353,69kB; 119,33kB gzip);
worker HDR separado 5,61kB. Avisos de Three adiado >500kB e fflate permanecem visíveis.
Sem deploy/commit/migration de produção. Browser integrado continua sem sessão;
nenhuma homologação visual, com dois perfis reais ou com crianças foi executada.

### Lote 11: índice transacional e biblioteca por resumos

- [x] `listSummaries` separa metadados de geometria/pixels; biblioteca do Studio
  usa o índice. Persistências customizadas sem a capacidade conservam compatibilidade.
- [x] Geração de armazenamento `molda:record:` com resumo atômico em `molda:summary:`;
  recuperação e tombstones também isolados de abas anteriores. Formato nativo segue 1.
  Promoção retém o original mais antigo já existente e aposenta chaves anteriores na
  mesma transação. Listar legados lê um documento por vez, sem promoção nem escrita.
- [x] Metadados/miniatura duplicada contam no orçamento. Índice ausente/inválido/futuro
  passa pela leitura guardada pontual; versões futuras continuam recuperáveis.

Revisão incluiu os consumidores da biblioteca e os dois protocolos anteriores:
uma aba sem índice não pode mudar registro, resumo, original ou tombstone promovidos.
Corrigida também a escrita que confundia valor `undefined` armazenado com ausência.
Quota concorrente, aborto, rollback, namespaces e promoção testados; 612 testes Molda
passaram, zero falhas, 71 arquivos; typecheck, Biome do escopo e build Vite passaram.
`bench-gallery.ts`: 120 modelos × 128 peças, 3 aquecimentos/20 amostras, Bun 1.3.11,
Ryzen 5 5600G, fake-indexeddb. `loadAll + resumo`: p50/p95 57,13/72,02ms; índice:
1,58/2,43ms, 120 leituras de resumo e **zero** leituras de documento por listagem.
Igualdade de resumos conferida antes da medição. Não mede browser/GPU/heap. O store
da galeria visual ainda usa documentos completos; será migrado no lote seguinte.
Escritas ainda varrem conteúdo para quota; ledger/blobs permanecem pendentes.

### Lote 12: galeria leve e miniaturas progressivas

- [x] Store/UI da galeria e reconciliação Kids retêm resumos; editor, duplicação,
  renomeação e aplicar textura leem somente o documento escolhido. Backup completo
  continua explícito. A fila cloud captura ids, não modelos inteiros.
- [x] Miniaturas sem foto são derivadas sob demanda, uma leitura por vez, quando
  próximas da área visível. Cache por instância/perfil: 8MiB/60 entradas, somente
  projeção/PNG pequeno/parâmetros, sem reter documentos. Sair da tela cancela a tarefa
  e libera a prévia renderizada; fechar limpa fila/cache. Nenhum URL externo é buscado.
- [x] Carregamento pontual tem erro/retry e descarta conclusões após troca/saída.
  Aplicar textura carrega os pixels completos somente no clique, nunca passa resumo
  ao pintor e ignora resultados se o diálogo fechou. Imagem inválida tem fallback.

Revisão removeu os renderizadores antigos de miniatura sem consumidores, conferiu
fronteiras públicas puras, descarte, cancelamento, isolamento de instâncias, revisões
de cache e telas de falha. Encontrou a janela de concorrência tratada no lote 13.
Antes dessa correção: 627 testes Molda e 71 Kids passaram, typechecks e builds Vite/
Next passaram. DOM usa happy-dom, não prova comportamento visual/scroll do browser.

### Lote 13: comparação transacional nas substituições da nuvem

- [x] `saveIfUnchanged`/`removeIfUnchanged` comparam revisão e alteram registros na
  mesma transação IDB, sem depender de Web Locks; `null` significa ausência, nunca
  corrupção. Divergência não escreve resumo, backup ou tombstone nem emite mudança.
- [x] Download remoto, exclusão e restauro após 409 usam essa condição. Renomear
  também compara a revisão, mantém timestamp crescente e pede nova tentativa se
  outra janela editou. Persistências customizadas devem implementar a operação
  atômica; não há fallback inseguro de ler e depois gravar.
- [x] Rollback de cópia de conflito remove somente a revisão que criou. Cópia já
  editada/aberta é preservada e sua versão atual segue para a fila de upload.

Revisão reproduziu em vermelho a sobrescrita de uma edição durante o await de
salvar a cópia de conflito. Testes verdes cobrem também exclusão concorrente, cópia
adotada, renomeação concorrente, ausência/tombstones/corrupção/formatos futuros e
dois escritores consumindo a mesma revisão em IDB independente. Marcas da nuvem
não avançam quando a comparação recusa a mudança. A proteção compara `updatedAt`,
portanto escritores devem continuar gerando revisão temporal crescente.

Verificação conjunta final dos lotes 12/13: **634 testes Molda, 75 Kids**, zero
falhas; typecheck, Biome e builds Vite/Next passaram. Build playground: entrada
278,69kB + preloads 33,76/31,60/14,49kB = 358,54kB (120,81kB gzip). Three adiado
558,42kB continua com aviso de tamanho. Browser integrado retornou lista vazia de
sessões: sem QA visual, hardware real, dois perfis reais ou crianças. Nenhum deploy,
commit ou migration de produção. Escritas de quota ainda varrem documentos.

### Lote 14: seleção topológica contextual

- [x] Escolher tudo/limpar/conectados/expandir/reduzir/inverter no tipo atual de
  elemento. Ctrl+A não muda mais faces/arestas silenciosamente para pontos.
- [x] Anéis seguem lados opostos de quads; caminhos seguem continuação inequívoca
  em vértices regulares. Bordas, triângulos, polos e arestas não-manifold limitam o
  percurso. Conectados inclui arestas soltas; faces só se conectam por arestas.
- [x] Comandos/atalhos/ajuda usam o mesmo registro. Disclosure “Escolher mais”
  mantém a bancada compacta, com alvos de toque de 44px. Só altera seleção de sessão;
  não modifica documento, não retargeta arrasto em andamento e não cria undo.

Revisão: índice de incidência linear em vez de matriz de pares em vértices de alta
valência; percurso iterativo com visitados termina também em ciclos. Testes de
topologia, malhas desconectadas, arestas soltas, polos, não-manifold, inversão exata,
oráculo Manhattan independente, equivalência teclado/botão, diálogo/campo de texto,
arrasto ativo e histórico. **645 testes Molda**, zero falhas; typecheck, Biome e
build Vite passaram. Sem homologação visual nova.

Benchmark CPU local (mesmo hardware/fixture de 900 quads, 8 warmups/40 amostras):
conectados p50/p95 2,43/7,14ms, expandir 2,02/5,08ms, reduzir 2,12/4,92ms, anel
3,35/5,92ms e caminho 3,32/7,06ms. Cardinalidades verificadas antes de medir: 1860
arestas conectadas, anel 31, caminho 30. Não equivale a latência de entrada/FPS.

### Lote 15: imagem de apoio na oficina

- [x] Guia de tela por vista com posição, tamanho, transparência, espelho e mostrar/
  esconder. PNG/JPEG local, temporário, sem upload; não entra no modelo, undo,
  miniatura nem exportação. Formato nativo continua 1.
- [x] Preflight puro de assinatura/dimensões antes de chamar o decoder: até 4MiB,
  4Mi pixels e 4096px por lado. Recusa SVG, animação PNG, chunks truncados e dimensões
  inválidas. Decoder nativo ainda valida o conteúdo real; MIME/extensão não são prova.
- [x] Loader lazy com propriedade explícita de blob URL. Troca falha preserva a
  referência anterior; cancelar/sair remove o src e revoga URLs; resultados atrasados
  são descartados. Alvos 44px, rótulos/names, foco e diálogo da plataforma.

Revisão corrigiu nomes de campos exigidos pelo contrato de acessibilidade e tipos
de buffers dos fixtures. Testes cobrem todos os prefixos truncados das amostras,
dimensões/bytes, imagens animadas, MIME incorreto, falha do decoder, cancelamento,
troca concorrente, remoção, outra instância, vista/foco e preservação do canvas.
**656 testes Molda**, zero falhas, 80 arquivos; typecheck e build Next passaram.
Biome e Vite passaram antes dos ajustes de nomes/tipos, sem mudança funcional no
bundle; a próxima verificação conjunta cobre a versão final. Loader de referência
é chunk separado (2,26kB). Sem prova de decoder real/GPU: testes simulam somente a
fronteira do navegador, que segue sem sessão disponível.

Referências de formato: [PNG W3C](https://www.w3.org/TR/png-3/) e
[ITU-T T.81, anexo B](https://www.w3.org/Graphics/JPEG/itu-t81.pdf). APIs de decode/
blob URL verificadas no MDN via Context7. Implementação própria, sem copiar decoder.

### Lote 16: formas de pintura e coordenadas da folha

- [x] Linha, retângulo e elipse, com contorno/preenchimento. Prévia recalculada
  sobre a base do gesto; confirmar gera um undo, cancelar restaura os pixels.
  Ferramenta/cor/pincel/offset pertencem ao gesto, não mudam durante o arrasto.
- [x] Formas respeitam o caminho curto seamless; elipse discreta simétrica em
  dimensões pares/ímpares. Pincel de contorno não aumenta a área de preenchimento.
- [x] Conversão de coordenadas ocorre depois de interpolar/recortar na folha
  visível. Corrige linha/pincel/balde/conta-gotas quando “Deslocar meio” está ativo.
  Mudar a vista cancela uma prévia ainda não confirmada, sem modificar o bitmap.

Revisão reproduziu duas falhas antes da correção: elipse 4×2 assimétrica e um
traço visível de dois pixels pintando uma linha de 16 com seamless desligado na
vista deslocada. Testes cobrem raster independente, simetria de 0–8px, bordas,
preenchimento, offsets, prévia substitutiva, cancelamento, troca de ferramenta e
undo/redo. **666 testes Molda**, zero falhas, 81 arquivos. Um primeiro full run
concorrente com o build Next excedeu o prazo de carregamento lazy em um teste;
o full run isolado passou sem modificar teste/timeout. Typecheck, Biome (256
arquivos), Vite e build Next passaram. Testes Kids de nuvem/ponte: 75 passaram.
Essas verificações também cobrem os ajustes finais de formatação do lote 15.
Não há homologação de pointer capture, GPU ou decoder em navegador real.

### Lote 17: geometria independente da pintura/UV

- [x] `PartGeometryResource` separa posições/normais do remapeamento UV. Paleta
  não recria geometrias; uma face acrescentada mantém buffers/UV das outras peças.
  Mesh/contornos/alças sobrevivem a mudanças não espaciais; picking usa as mesmas faces.
- [x] Faixas UV pendentes são limitadas e preservam alterações anteriores sem frame.
  Descarte idempotente e atualização de recurso fechado é ignorada.
- [x] Corrigido no núcleo o contrato de `faceRanges`: uma face pode ocupar vários
  spans, como nas tampas intercaladas do cilindro. Sem reordenar triângulos ou bytes.

Perfil anterior: reconstrução espacial = 62,7% da CPU no cenário. Benchmark válido
com 128 esferas/15360 triângulos, 8 warmups/40 amostras: sincronização de geometria
após troca de paleta p50/p95 **8,840/10,692ms → 0,046/0,071ms**. Golden SHA256
fixo conferido antes/depois. Auditoria e perfis em `.audits/molda-evolution/viewport-*`.
O número não inclui raster/shader/GPU, não é FPS nem latência de entrada.
**677 testes Molda**, zero falhas, 82 arquivos. Typecheck, Biome e Vite passaram.
Sem nova homologação visual/WebGL; aviso de chunk Three >500kB permanece explícito.

### Lote 18: gerenciamento e reutilização do atlas

- [x] `ModelAtlasResource` separa layout, fallback, raster e vida útil do mapa da
  cena/interação. Paleta/layout do mesmo tamanho reutilizam pixels e DataTexture;
  tamanho novo troca e descarta o recurso anterior.
- [x] Upload completo continua pendente até confirmação de Three. Traços parciais
  não reduzem esse pedido; filas sem render são limitadas a uma faixa por linha.
  Confirmação/descarte limpam propriedade, sem mudanças tardias em recurso fechado.
- [x] Raster com destino exclusivo limpa regiões desocupadas e recusa tamanho
  incorreto. Bytes exatos contra raster novo, inclusive fallback e recuperação.

Revisão, perfis, fixture inválida descartada e golden documentados em
`.audits/molda-evolution/atlas-resource-review.md`. Cenário válido atlas512/128 peles:
p50/p95 2,950/5,838ms → 2,213/2,789ms (CPU local, 8 warmups/40 amostras).
**684 testes Molda**, zero falhas, 83 arquivos; typecheck, Biome e Vite passaram.
GPU real, tablet e avaliação com crianças continuam sem homologação.

### Lote 19: exclusão guardada e fallback em memória

- [x] Exclusão simples/em lote confere todas as gerações e recuperações na mesma
  transação IDB, inclusive dados futuros escondidos por um documento atual.
  Nenhuma exclusão/tombstone acontece quando um item é incompatível. Migração
  também não pode retirar uma geração anterior que contenha dados futuros.
- [x] Memória protege entrada/overwrite/delete/CAS, prepara todos os clones antes
  de escrever e preserva o original legado/ilegível. Leituras incompatíveis ficam
  recuperáveis; galeria recebe avisos, não considera esses documentos ausentes.
- [x] Identidade de leitura e projeção de avisos são compartilhadas pelo núcleo;
  transações continuam específicas de cada armazenamento. Listagem da memória
  processa um documento por vez e não mantém outra cópia da galeria completa.

Revisão reproduziu 12 falhas de proteção/atomicidade e outra de migração antes das
correções. Um auxiliar de teste IDB resolvia no sucesso da request antes do término
da transação, bloqueando a sequência de leituras/write no ambiente de teste; agora
aguarda `transaction.oncomplete`, como o leitor real, sem aumentar timeout. Não
altera o scheduler/dependência nem enfraquece asserções. **699 testes Molda**, zero
falhas, 84 arquivos; typecheck, Biome e Vite passaram. Plano técnico de compatibilidade
detalhado em `2026-09-07-molda-document-compatibility.md`. Não habilita formato 2.

### Lote 20: confirmação de formato na reserva da nuvem

- [x] Members confirma `formatVersion` validada na reserva. BFF confere igualdade
  antes de assinar qualquer PUT; cliente confere antes de enviar partes/manifesto.
  Ausência significa somente versão 1. Valor nulo, texto ou divergência é recusado.
- [x] Deploy misto retorna 503 (`UPSTREAM_INCOMPATIBLE` no BFF,
  `CLOUD_FORMAT_UNSUPPORTED` no cliente), com tentativas limitadas e sem confirmação
  de salvamento. O próximo envio pode recuperar quando o serviço ficar compatível.

Testes reproduziram 18 falhas antes da implementação. Verificação: 828 testes
unitários/integração Members; 457 member-shell; 146 Kids (nuvem dos três editores,
Molda/ponte); 5 community. Zero falhas. Tipos Members/member-shell, Biome dos arquivos
alterados e build Next Kids passaram. Esse build inclui lotes 17–20. Sem novo DDL
neste lote, sem PUT real/deploy/homologação em staging. A confirmação do ticket não
substitui o rollout completo dos guards, especialmente exclusão remota.

### Lote 21: exclusão remota com capacidade e restauro pendente

- [x] DELETE recebe `maxFormatVersion` opcional (legado 1). Repositório compara
  formato confirmado e pendente sob o mesmo lock da revisão. Incompatibilidade
  retorna 409 sem excluir bytes, alterar o registro ou avançar marcas no cliente.
- [x] Repetir uma exclusão cancela um restauro pendente quando o cliente é
  compatível; preserva a data original da lápide. Commit tardio não ressuscita o item.
- [x] Validação de versão no HTTP exige número inteiro real, sem coerção de texto.
  A revisão do DTO identificou que `t.Integer` instalado converte strings;
  `t.Number` com `multipleOf: 1` mantém o contrato estrito do corpo JSON.

Verificação: **846 testes Members** (unitários, integração e 10 testes reais do
repositório creations no banco isolado `localhost:5433/sistemazero_test`), 464
member-shell e 147 Kids, zero falhas. Typechecks Members/member-shell, Biome dos
14 arquivos alterados e build Next Kids passaram. Sem DDL novo, deploy ou escrita
no banco de desenvolvimento/produção. Revisão reproduziu o restauro tardio em HTTP
e SQL antes da correção. O build community anterior cobre até o lote 20; a nova
verificação conjunta precisa incluir esta mudança compartilhada no BFF.

### Lote 22: política de versões e serialização tipada

- [x] Capacidade de leitura e escritor liberado têm constantes distintas. Ambas
  seguem em 1. Guard de escrita exige a versão do escritor, mesmo quando o leitor
  vier a ser ampliado. Alias público antigo preservado por compatibilidade.
- [x] JSON nativo é união discriminada por tipo com versão literal e peles base64
  tipadas, sem `Record<string, unknown>` ou dupla coerção nos consumidores.
- [x] Reserva recebe versão do mesmo payload serializado. Exclusão e filtro da
  nuvem usam capacidade de leitura, não a versão global de escrita.

Revisão corrigiu uma referência antiga no filtro de reconciliação, detectada pelos
testes do adaptador; nenhuma mudança de timeout ou asserção para acomodá-la.
**701 testes Molda**, zero falhas, 84 arquivos; typecheck e Vite passaram. 141 testes
Kids de fila/reconciliação/adaptadores passaram na seleção inicial; seleção final
incluindo `studio-cloud.test.ts`: 169 testes, zero falhas, 6 arquivos. Build community
passou com o BFF do lote 21. Build Kids passou após corrigir acesso opcional no teste
de metadata. Biome de todo `src` Molda (260 arquivos) e arquivos Kids passou.
Este lote não implementa nem libera documento v2.

### Lote 23: transformações afins e índice de hierarquia

- [x] Núcleo puro para TRS/quaternions, composição/inversão afim e normais por
  inversa transposta. Arrays numéricos canônicos; buffers GPU continuam derivados.
  Math de pontos/direções é compartilhada pelo export/viewport legado, sem cópia extra.
- [x] Índice por revisão com pai único, filhos derivados, ordem pai-primeiro e
  matrizes de mundo. Detecta identidade duplicada, órfãos e ciclos desconectados.
- [x] Reparent atômico preserva mundo e shear; pais selecionados carregam seus
  descendentes uma única vez. Pai singular ou ciclo recusa a operação inteira.

Revisão: oracle independente Three para 100 conjuntos de ângulos fracionários,
escalas negativas/não uniformes, inversas e normais; hierarquia de 12 mil nós sem
recursão; seleção composta, dados particulares e referências não alteradas; matriz
esparsa recusada. **710 testes Molda**, zero falhas, 86 arquivos; tipos, Biome (264
arquivos) e Vite passaram. Não adiciona UI de grupos nem libera formato novo.
O índice será consumidor do documento seguinte; não exportado pelo entrypoint público.
Chunk Three >500kB e homologação visual/GPU continuam pendentes.

### Lote 24: domínio seguinte, leitor estrito e migração em memória

- [x] Modelo interno v2 com nós locais, grupos/locators, primitivas paramétricas,
  malhas com UV por canto, referências de material, imagens/camadas e espelhos
  procedurais. Atlas e instâncias espelhadas não são uma segunda fonte autoral.
- [x] Leitor/codec próprios, sem sanitizer legado. Rejeitam campos desconhecidos,
  referências ausentes, ciclos, pixels inválidos e estouro dos orçamentos agregados.
  Coordenadas/UV fracionários não são encaixados na grade. Zero com sinal tem uma
  única representação canônica (+0), pois JSON.stringify não preserva -0; nenhum
  valor não zero é quantizado. Original permanece disponível em toda recusa.
- [x] Migração determinística preserva IDs, datas, pivôs, formas editáveis, topologia,
  cores vinculadas à paleta e pixels. Faces degeneradas geram aviso explícito de UV.
  Espelhos conservam identidade/vínculo sem duplicar geometria ou pintura.
- [x] Avaliação deriva mundo, espelhos, orientação e flags herdadas dos grupos.
  Limites espaciais detectam overflow depois da composição, inclusive planos de espelho.
  Registro público de leitores exige despacho exaustivo; ampliar capacidade não
  encaminha documentos novos ao reparador v1 por acidente.

Revisão: roundtrip JSON/memória, shear, pixels/UV, recuperação sem mutação, matriz
incompleta, vértice ausente herdado de prototype, orçamentos de instâncias/camadas,
malha de 2048 vértices válida no orçamento agregado, quatro primitivas e espelhos
contra coordenadas legadas. **729 testes Molda**, zero falhas, 89 arquivos; tipos,
Biome (276 arquivos) e Vite passaram. Entradas internas também verificadas como
puras, sem UI/Three/estado de browser. Não há persistência, UI de hierarquia, clipes,
skinning ou rollout v2 habilitado neste lote; a capacidade pública continua 1.

### Lote 25: promoção local transacional e isolamento do documento seguinte

- [x] Primitiva interna `promoteLegacyScene` compara revisão, converte, preserva
  registros/originais anteriores e grava documento/resumo em uma só transação IDB.
  Falha, quota excedida, fonte inválida/futura ou estado parcial não alteram o banco.
- [x] Novas chaves `molda:scene:`, `scene-summary:`, `scene-originals:` e
  `scene-deleted:` ficam fora do layout conhecido por abas v1 antigas. Cópias exatas
  de todas as gerações retiradas ficam no recibo; tombstones impedem fallback tardio.
- [x] Leitor público v1 reconhece a nova geração como incompatível/recuperável,
  inclusive quando uma aba antiga recria documento e resumo v1. Não confunde um
  resumo antigo com o documento atual. Escritas/exclusões v1 recusam dados v2.

Revisão: IndexedDB independente, concorrência/idempotência, edição anterior ao lock,
originais ocultos/futuros, órfãos, falha na última escrita e exclusão em layout antigo.
**748 testes Molda**, zero falhas, 90 arquivos; typecheck, Biome (280 arquivos) e Vite
passaram. O full run emitiu avisos React `act` no teste de pintura, sem falhas;
verificação isolada registrada no próximo lote. Build Next Kids passou com o lote 24.
Não migrou dados reais e não é chamado pela aplicação pública. Esta primeira promoção
faz uma varredura transacional para contabilizar dados v1 mistos: não implementa o
ledger/blobs nem é evidência de performance desse fluxo. Rollout e QA de abas reais
seguem pendentes; clientes já abertos não recebem retroativamente as novas guardas.

### Lote 26: motor de edição compartilhado entre documentos

- [x] Histórico, gestos, debounce e drenagem de gravações usam um motor genérico,
  conservando a API v1. O tipo é inferido pelo documento de entrada; funções de
  contabilização e persistência não ampliam a inferência (`NoInfer`).
- [x] Documento v2 conserva sua versão e tipos ao cancelar, desfazer/refazer e
  editar enquanto uma gravação está em curso. Miniatura não entra no histórico.
- [x] Doze edições de um pixel numa imagem de 1MiB cabem em 8KiB de histórico e
  podem ser desfeitas: teste de deltas reais, não de um mock do histórico.

Revisão: 28 testes direcionados e **751 testes Molda**, zero falhas, 91 arquivos;
typecheck, Biome (281 arquivos) e Vite passaram. A pintura passou isoladamente
(8 testes) e a suíte completa deste lote não repetiu os avisos `act` do lote 25.
O motor não habilita persistência/editor público v2. Chunk Three >500kB e QA
visual/GPU continuam em aberto. A skill `typescript-advanced` orientou o contrato
de inferência sem casts nos consumidores.

### Lote 27: comandos de hierarquia, pivô e recursos compartilhados

- [x] Agrupar/desagrupar/reparent e transformações de mundo são atômicos. Seleções
  de pai e filho não aplicam a operação duas vezes. Grupos começam no centro da
  geometria selecionada; shear é preservado e pais singulares são recusados quando
  a operação exige inversão. Desagrupar não exige inversão e conserva ocultação.
- [x] Pivô muda sem deslocar geometria ou filhos; geometria compartilhada usa cópia
  na escrita. UV e pixels permanecem iguais. Duplicação remapeia nós, pais, geometria,
  materiais por face, imagens e espelhos, copiando recursos alcançáveis uma vez.
- [x] Renomear, ocultar/travar, excluir subárvores e criar/remover espelhos têm
  contratos explícitos. Travas herdadas e descendentes travados impedem mudanças
  geométricas. Exclusão não descarta imagens/materiais autorais não utilizados.

Revisão: 35 testes de cena e **761 testes Molda**, zero falhas, 92 arquivos;
typecheck, Biome (283 arquivos) e Vite passaram. Testes incluem posições mundiais,
identidade de referências, posse de pixels, overflow/orçamento e uma entrada real
de undo/redo. Comandos são internos; ainda não há painel de hierarquia público.
O aviso do chunk Three e os gates de browser/GPU permanecem abertos.

### Lote 28: persistência v2 com revisão própria e índice de custos

- [x] API interna para ler/listar, criar/gravar por CAS, excluir e restaurar
  explicitamente. Revisão de armazenamento é separada de `updatedAt`; exclusão
  conserva revisão crescente e recibo original. Um save normal nunca ressuscita
  criação excluída. Nenhuma operação nova sobrescreve registros v1 por coincidência de ID.
- [x] Resumos isolados guardam revisão e custos do documento/recibo. Autosave lê o
  documento alvo, metadados e legados residuais, não os pixels de outras cenas válidas.
  Índice desconhecido/órfão é contabilizado pelo raw, não como custo zero. Transação
  mantém CAS/quota/escrita juntos; exclusão continua possível acima da quota.
- [x] IDs de criação seguem o contrato de 64 caracteres da plataforma. IDs internos
  podem ter namespace próprio. Leitor estrito e reparador legado usam o mesmo guard
  de identidade da criação. Recibo ausente/incoerência de índice é erro recuperável.

Revisão: **774 testes Molda**, zero falhas, 93 arquivos; depois, dois testes adicionais
de quota concorrente/recibo ausente passaram na seleção final de **41 testes**.
Typecheck, Biome (287 arquivos) e Vite passaram. Falha no último put reverte restauro
e edição; gravações concorrentes com timestamp igual não se sobrescrevem. Teste de
I/O confirma zero leituras dos outros documentos/recibos válidos e listagem só de
resumos. Isso não é benchmark de browser/GPU nem implementa blobs por hash.
Build Kids passou com o lote 27. Persistência nova ainda não está ligada à UI/nuvem;
escritor público e capacidade pública continuam 1, sem migrar dados reais.

### Lote 29: geometria de cena, UV por canto e composição de camadas

- [x] Triangulação própria de polígonos côncavos com orientação preservada; quads
  convexos mantêm a diagonal legada. Faces degeneradas/autointersectadas retornam
  problemas explícitos sem apagar os dados autorais. UV/material continuam por canto/face.
- [x] Primitivas reutilizam o gerador puro, sem converter pelo sanitizer nem encaixar
  coordenadas. Caminho relativo mantém formas nativas pequenas; caminho numérico
  v1 permanece intacto. Picking interpola as mesmas UVs dos buffers de desenho.
- [x] Compositor único indexed/RGBA, fundo sob a pintura, ordem de camadas,
  visibilidade/opacidade e quantização só na saída. Cores e índice zero migrados
  conferidos pixel a pixel. Composição usa o espaço sRGB autoral com alfa direto.

Revisão: 63 testes direcionados e **791 testes Molda**, zero falhas, 95 arquivos;
typecheck, Biome (292 arquivos) e Vite passaram. Geometria migrada das quatro
primitivas comparada em coordenadas de mundo, áreas/orientação côncavas, costuras UV,
mistura alfa e fontes sem mutação. O teste da primitiva 1e-9 falhou antes da correção
da precisão. Núcleo/comandos/compositor também passam na verificação de pureza.
Ainda não há viewport/editor público v2 nem animações/export hierárquico; não
interpretar buffers derivados como implementação das fases de UI/UV completas.

### Lote 30: recursos de desenho com posse e compartilhamento explícitos

- [x] `SceneRenderResource` deriva instâncias de desenho com mundo/flags do índice
  puro. Espelhos compartilham geometria e materiais. Transformação não recria
  atributos ou pintura; traço conserva textura do mesmo tamanho e não atualiza outras.
- [x] `SceneMaterialResource` compõe fundo sob pintura e configura sRGB corretamente.
  Texturas retangulares e atlas legado compartilham `RgbaTexture`, incluindo a
  espera de upload completo e união de faixas por linha; sem repetir ciclo de GPU.
- [x] Preparação geométrica e de pixels precede mudanças no frame visível. Troca,
  remoção e fechamento descartam recursos próprios uma vez. Raycasting associa
  instância, peça autoral, face e UV sem usar nomes de exibição como identidade.

Revisão: 15 testes direcionados e **797 testes Molda**, zero falhas, 96 arquivos;
tipos, Biome (296 arquivos) e Vite passaram. Raycasting usa Three real sem renderer;
contadores de eventos verificam descarte, não consumo de memória GPU. Código
instalado do Three confirma tratamento de winding negativo via determinante da
matriz; o viewport não deve inverter novamente os buffers. Não há medição de FPS
ou homologação browser neste lote. Recursos ainda internos; painel/viewport de cena
serão ligados em desenvolvimento no próximo lote, sem ativar escritor da nuvem.

### Lote 31: oficina de cenas utilizável no playground

- [x] Painel de peças/grupos com multisseleção por toque, agrupamento, renomeação,
  reparent, flags, duplicação, exclusão e ajustes de movimento/rotação/escala/pivô.
  Gaveta tablet reutiliza o componente acessível; profundidade visual é limitada.
  Uma seleção gira em seu pivô autoral; várias giram em torno do centro conjunto.
- [x] Viewport próprio com recursos compartilhados, picking real, vistas ortográficas,
  enquadramento, isolamento e marcador de pivô. Navegação/seleção suspensas durante
  perda de contexto; descarte idempotente impede reabrir controles por chamadas tardias.
- [x] Ponte do motor de editor para CAS v2. Conflito entre abas mantém snapshot local,
  histórico e token antigo; nova tentativa não sobrescreve a outra aba. Download
  nativo disponível mesmo em conflito. Abertura recusa fallback de arquivos futuros.

Ativação somente pelo playground local `?oficina=nova` (demo) ou
`?oficina=nova&criacao=<id>` (modelo no namespace playground). A promoção explícita
nesse host mantém o recibo original; não se conecta à nuvem ou ao Estúdio. Entrada
lazy, não exportada pelo pacote. Nenhum perfil real foi aberto/migrado nesta execução.

Revisão: **806 testes Molda**, zero falhas, 100 arquivos; typecheck, Biome (318 arquivos
incluindo playground) e Vite passaram. Regressões reproduzidas antes da correção:
rotação ignorando pivô, seleção durante perda de contexto e campos sem `name`.
Teste usa câmera/OrbitControls/raycast reais com renderer substituído na fronteira;
isso não é homologação visual/GPU. Chunk Three 559,61 kB continua acima de 500 kB.

### Lote 32: formas, pontos de apoio e revisão dos limites de desenho

- [x] Caixa/rampa/cilindro/esfera e locators disponíveis por controles nativos.
  Medidas locais preservam pivô, transformações e UV; geometria compartilhada usa
  copy-on-write. Ponto de apoio pode ser enquadrado sem virar geometria de exportação.
- [x] Espelho nos três eixos com posição numérica e remoção individual; histórico
  e travas são os mesmos dos outros comandos. Formulário de três eixos compartilhado.
- [x] Exclusão libera a geometria usada somente pelos nós apagados. Esta é uma
  revisão do contrato do lote 27: geometrias compartilhadas, órfãs preexistentes e
  bibliotecas de material/pintura continuam; desfazer restaura a geometria removida.
- [x] Triângulos que colapsam ao converter para Float32 geram problema `precision`,
  sem alterar coordenadas autorais. Nenhum consumidor deve tratar essas faces como
  exportação sem perdas. Arrays extras são alocados apenas no caminho com problema.

Revisão: **812 testes Molda**, zero falhas, 101 arquivos; typecheck, Biome (322 arquivos)
e Vite passaram. Teste vermelho reproduziu esgotamento ao criar/apagar 140 formas,
depois passou sem elevar o limite. Colapso Float32 também reproduzido antes do ajuste.
Teste UI percorre criar cilindro, ajustar medidas, criar/retirar espelho e criar apoio.
Build de produção Kids passou após o lote 31. Não houve deploy nem medição GPU.

### Lote 33: manipulação direta 3D e cancelamento persistido

- [x] Alças de mover/girar/escala, para uma peça ou seleção hierárquica, conectadas
  à oficina interna. Proxy descartável em espaço de mundo evita decompor matrizes
  autorais com shear. Cada prévia usa o snapshot inicial e delta absoluto.
- [x] Um arrasto produz um undo; cancelamento restaura o snapshot e eventos tardios
  não sobrescrevem revisões de comandos. Esc, troca de vista/ferramenta/seleção,
  pointercancel, multitoque, perda de contexto e fechamento invalidam o gesto.
- [x] Flags herdadas centralizadas em passagem parent-first. Perda de contexto
  descarta a navegação antiga, sem depender de um pointerup que talvez nunca venha.
- [x] Cancelamento tem uma porta própria no motor compartilhado: se uma prévia já
  foi salva por flush/autosave pendente, a restauração também é salva, sem novo undo.
  Controladores legados e novos reutilizam essa mesma correção.

Revisão: **817 testes Molda**, zero falhas, 102 arquivos; typecheck, Biome (325 arquivos)
e Vite passaram. Testes exercitam TransformControls, OrbitControls, câmera, eventos
de ponteiro e documentos reais, com renderer substituído na fronteira do browser.
Regressões vermelhas: ponteiro retido após perda de contexto e restauração só na tela
após salvar a prévia. Nenhuma medição de GPU ou usabilidade é inferida desses testes.

### Lote 34: seleção por caixa/laço e através de outras peças

- [x] Ferramentas de seleção por área na oficina interna, com contorno temporário,
  multisseleção aditiva e opção “Alcançar peças atrás”. A seleção é estado de sessão:
  não modifica o documento, o histórico nem a exportação.
- [x] Contrato explícito de seleção de objetos pelos pontos de giro projetados,
  não pela silhueta da geometria. Respeita perspectiva/ortografia, profundidade,
  isolamento, ocultação e travas herdadas. Espelhos selecionam a fonte sem duplicá-la;
  peças travadas continuam podendo encobrir as que estão atrás.
- [x] Caixa funciona nos dois sentidos; laço aceita concavidade e bordas inclusivas.
  Captura pertence a um ponteiro, com limite de 512 pontos e coordenadas recortadas
  à área visível. Esc, multitoque, troca de ferramenta e perda de contexto cancelam.
- [x] Perda de foco/visibilidade limpa gestos e ponteiros retidos, recriando a
  navegação quando necessário sem esperar um pointerup que pode nunca chegar.
  Hook do viewport recebe opções nomeadas e descarta callbacks após desmontagem.

Revisão: **826 testes Molda**, zero falhas, 105 arquivos; typecheck, Biome (331 arquivos)
e Vite passaram. Casos cobrem oclusão com raycast real, perspectiva/ortografia,
espelhos, multitoque, limite do laço, controles da oficina e ausência de histórico.
Ponteiro retido após blur foi reproduzido com teste falhando antes da correção.
Renderer continua substituído na fronteira; faltam inspeção visual/GPU e toque real.
Seleção por área ainda é de objetos; seleção/edição de componentes da malha v2 segue
pendente. Chunk Three de 559,61 kB continua acima do aviso de 500 kB.

### Lote 35: conversão nativa para malha conectada

- [x] Caixa/rampa/cilindro/esfera compartilham uma tesselação autoral entre desenho
  nativo e conversão. Coordenadas/UV permanecem Float64 até o desenho; nenhuma
  reconstrução a partir de buffers GPU ou passagem pelo arredondamento v1.
- [x] Costuras e polos compartilham vértices espaciais; UV continua por canto.
  Materiais e pixels não são reamostrados. Desenho antes/depois tem os mesmos bytes
  de posição, normal, UV e material; faces da primitiva mantêm identidade no picking.
- [x] Conversão disponível na oficina, atômica por seleção/subárvore, com um undo.
  Copy-on-write preserva usuários não escolhidos e mantém compartilhamento interno
  da seleção. Travas e orçamento são conferidos antes do commit.
- [x] Revisão corrigiu orçamento autoral que ignorava geometria sem instâncias,
  permitindo salvar uma conversão que o leitor recusaria. Também corrigiu o teste
  de interseção que tratava faces muito finas como arestas sobrepostas: projeção
  normaliza os dois eixos, sem alterar coordenadas ou winding autoral.

Evidência: **837 testes Molda**, zero falhas, 107 arquivos; typecheck, Biome (334 arquivos)
e build Vite passaram. Os dois defeitos foram reproduzidos antes das correções.
Testes verificam superfície fechada/conectada, orientação das arestas, costuras UV,
coordenadas menores que Float32, roundtrip estrito, copy-on-write e desfazer na UI.
Seleção/edição de faces no viewport é o lote seguinte. Sem homologação visual/GPU;
chunk Three permanece em 559,61 kB. O formato público/cloud continua em 1.

### Lote 36: seleção e edição nativa de faces

- [x] Modo contextual de faces, seleção simples/aditiva/todas/conectadas, com
  contorno topológico sem diagonais, destaque e indicação do lado interno.
  Espelhos mostram a mesma seleção; raycast real alcança o lado interno sem
  modificar materiais autorais e respeita oclusores, inclusive peças travadas.
- [x] Apagar, soltar região, dividir em triângulos e virar faces são operações
  puras, com locks/copy-on-write/orçamentos no comando comum `editSceneMesh`.
  Soltar conserva compartilhamento dentro da região; apagar mantém pontos e
  arestas independentes. Triangulação mantém UV/material por canto sem reamostrar.
- [x] Virar preserva a divisão interna dos triângulos. Quando um polígono exigiria
  outra diagonal e poderia alterar a pintura, a operação pede triangulação antes.
- [x] Delete afeta somente faces durante esse modo, Ctrl+A escolhe todas, Esc
  retorna às peças e devolve foco ao controle. Callback após saída não reabre modo;
  IDs removidos são filtrados depois de undo. Transformações de objetos ficam
  indisponíveis durante edição de faces para não mover a peça inteira por engano.
- [x] Overlays possuem buffers próprios compartilhados entre instâncias, cache
  por geometria/seleção e descarte idempotente. Coordenadas de contorno fora de
  Float32 são reportadas na UI sem enviar Infinity à GPU ou alterar o documento.

Evidência: **847 testes Molda**, zero falhas, 109 arquivos (64,57 s); typecheck,
Biome (340 arquivos) e Vite passaram. Testes incluem comandos reais, roundtrip,
integração UI/histórico/atalhos, raycast frente/verso/espelho/oclusor travado e posse
dos buffers. Seleção por área de componentes e edição de vértices/arestas ainda
faltam. Sem homologação visual/GPU/toque. Chunk Three: 559,61 kB; formato público 1.

### Lote 37: puxar faces e criar bordas com prévia

- [x] Extrusão nativa por região conectada/plana, com normal própria por região
  desconectada e sem paredes internas nas arestas compartilhadas. Caps conservam
  identidade/UV/material; só as laterais novas recebem UV quadrado. Não é operação
  booleana e não recorta superfícies atravessadas; a interface informa isso.
- [x] Inset proporcional por face convexa/plana, com continuidade de pintura
  afim verificada antes da edição. Pintura incompatível ou concavidade pede dividir
  em triângulos antes. A borda é proporcional ao centro, não offset de largura fixa.
- [x] Prévia por valor numérico, confirmar/cancelar, IDs estáveis entre amostras,
  snapshot inicial e um undo. Geometria compartilhada continua isolada por COW.
  Cancelamento compensa uma prévia já salva; revisões externas invalidam o token.
- [x] Esc, blur/aba oculta, interrupção do 3D, fechamento do painel e desmontagem
  cancelam a prévia. Foco retorna ao disparador; seleção e outras ferramentas de
  face ficam suspensas enquanto o ajuste está aberto. Comandos de objetos cancelam
  a prévia antes de operar; callbacks obsoletos não editam uma malha substituta.
- [x] Índice de incidência e alocação de IDs compartilhados entre operações, sem
  matriz quadrática de faces. Código de domínio continua independente de React/Three.

Evidência: **856 testes Molda**, zero falhas, 111 arquivos (49,25 s); typecheck,
Biome (350 arquivos incluindo benchmark) e Vite passaram. A suíte completa detectou
`name` ausente no novo input; corrigido e suíte reexecutada. Casos cobrem Euler/arestas
orientadas, regiões trianguladas sem parede interna, UV contínuo, COW, roundtrip,
prévia inválida/zero, restauração persistida, revisão concorrente e ciclo UI real.
Build de produção Kids passou após o lote 36. GPU/toque/usabilidade continuam pendentes.
Limitações explícitas: extrusão de região não plana, inset côncavo/não afim, seleções
de vértices/arestas e outros operadores avançados ainda não estão implementados na v2.

### Lote 38: perfil e cache limitado das prévias de extrusão

- [x] Benchmark nativo com fixtures de 900/9216 quads e roundtrip estrito de entrada
  e saída; goldens SHA256 fixos incluem ordem/IDs, coordenadas, UV, materiais e arestas.
- [x] Perfil antes/depois orientou uma mudança: memorizar frames puros no snapshot
  de extrusão. Cache de payload limitado a 8 MiB/20k entradas, sem vínculo global ou
  com histórico; liberar em confirmar/cancelar/falha/desmontar. Operação pontual
  mantém recálculo. Teste percorre 20 sessões e compara byte a byte com cálculo fresco.

Ryzen 5 5600G, Bun 1.3.11, 8 aquecimentos/40 amostras, nearest-rank. p95 de comando
CPU: **900 quads 23,462 → 11,862 ms; 9216 quads 227,081 → 126,074 ms**. O cenário
pesado ainda excede 50 ms; primeira preparação medida em 282,468 ms e cache de
6.023.424 B. Não inferir fluidez, pico de heap, GPU ou latência de entrada. Perfil
novo aponta incidência/regiões e validação do documento como alvos; tarefas pesadas
canceláveis/preparação fora da UI seguem pendentes. Evidências e prova em
`.audits/molda-evolution/scene-surface-l38.md` e perfis adjacentes.

Verificação: **857 testes Molda**, zero falhas, 111 arquivos (50,51 s); typecheck,
Biome (350 arquivos) e Vite passaram. Browser foi reconectado para tentar inspeção
visual, mas retornou nenhum navegador disponível. Não houve QA visual alternativo
nem ativação pública/cloud. Chunk Three permanece em 559,61 kB.

### Lote 39: alças de transformação para faces

- [x] Mover/girar/escala operam os pontos das faces escolhidas uma vez, incluindo
  ligações a faces vizinhas, sem mover o nó/grupo ou reprojetar UV. A alça usa o
  centro envolvente da seleção em mundo, não o pivô da peça inteira.
- [x] Delta de mundo é conjugado para o espaço local capturado no início, sem
  decomposição de shear. Identidade é no-op exato, evitando arredondamento da
  multiplicação inversa. Matrizes não afins/pais singulares são recusados.
- [x] Reutiliza gesto de malha/COW/um undo/cancelamento persistido. Ressincronizar
  a mesma seleção durante a prévia não cancela o arrasto. Callbacks são encaminhados
  pelo dono do gesto, não pelo modo que estiver aberto quando o evento tardio chegar.
- [x] Ferramentas de face ficam suspensas durante arrasto; começar extrusão/inset
  suspende alças. Comando de objeto cancela antes de executar. Esc cancela o arrasto
  sem sair automaticamente da edição de faces.

Verificação: **863 testes Molda**, zero falhas, 113 arquivos (51,76 s); typecheck,
Biome (355 arquivos) e Vite passaram. Testes cobrem movimento/rotação/escala em
hierarquia com shear, pontos compartilhados, precisão sem snap, usuários de geometria
não selecionados, undo/cancel, travas/pai singular e arrasto real de TransformControls
com ressincronização de seleção (renderer substituído). Seleção individual de
vértices/arestas e seleção de componentes por área ainda pendem; sem inspeção GPU/toque.

### Lote 40: prévias grandes canceláveis em Worker

- [x] Extrusão/inset acima de 1024 faces em Worker próprio, sem transportar imagens
  ou documento inteiro. Um pedido em execução e um último valor substituível;
  cabeçalhos verificados antes de analisar geometria, ignorando resultados obsoletos.
- [x] Leitor estrito compartilhado, IDs estáveis, COW/um undo, proteção de revisão,
  falhas de transporte tratadas e encerramento real em cancelar/falhar/desmontar.
  Confirmar espera o resultado atual; mudar valor e cancelar continuam disponíveis.
- [x] Testes de Worker real e UI com 1089 faces; confirmação, undo, cancelamento
  pendente e revisão externa preservada. Corrigido acumulador que ignorava movimento
  de ponto importado `__proto__`, com reprodução antes da correção e regressão verde.

Verificação: **874 testes**, zero falhas, 114 arquivos (56,87 s); typecheck, Biome
(362 arquivos), Vite e build de produção Kids passaram. Worker separado: 15,51 kB.
Revisão e medição em `.audits/molda-evolution/scene-surface-l40.md`.

Limitação medida: em 9216 quads, p95 do maior intervalo de timer caiu de 156,522 para
141,314 ms, mas tempo total subiu de 149,864 para 424,495 ms. Cancelabilidade foi
implementada; fluidez/limite de 50 ms não estão resolvidos. Transporte, validação e
comando no lado principal precisam de novo perfil. Sem QA visual/GPU/toque.

### Lote 41: transporte compacto com precisão autoral

- [x] Perfil identificou a leitura/reconstrução da resposta como custo relevante.
  Pacote privado separa IDs, Float64 XYZ/UV e índices/tamanhos tipados; transfere
  somente cinco buffers derivados. Não altera formato público ou snapshots.
- [x] Reconstrução única com validação completa de campos, tipos, dimensões, limites,
  IDs/referências, cantos repetidos, números e arestas. Testes de transferência,
  corrupção, extremos Double, IDs especiais e fronteiras do orçamento.

Verificação: **898 testes**, zero falhas, 115 arquivos (59,85 s); typecheck, Biome
(364 arquivos) e Vite passaram. Build Kids passou após o lote 40. Worker: 16,36 kB.
Em 9216 quads, maior intervalo de timer p95 medido em 62,182/65,686 ms, contra
141,314/141,177 ms antes. Controle síncrono/carga variaram; não inferir speedup fixo
de tempo total, nem fluidez de navegador. Ainda acima de 50 ms. Perfil, números e
prova em `.audits/molda-evolution/scene-surface-l41.md`; GPU/toque continuam pendentes.

### Lote 42: subdivisão conectada de faces com prévia

- [x] Níveis absolutos 0–3, sem suavizar nem alterar pontos originais. Cada face é
  dividida usando centro e midpoints; um ponto topológico por aresta compartilhada,
  preservando UV por canto/material e também as costuras de pintura.
- [x] Insere pontos nos lados ligados de faces vizinhas e divide arestas soltas
  correspondentes, evitando T-junctions. Verifica pintura afim/planaridade nos
  vizinhos antes de mudar triangulação; recusa concavidade e recomenda triangular.
- [x] Pré-validação de triângulos, vértices, arestas e limite de 64 cantos por face.
  Resultado inválido não modifica fonte. Cantos retos de uma ligação criada antes
  podem ser subdivididos depois; regressão reproduzida e corrigida na revisão.
- [x] Prévia sempre em Worker cancelável, com IDs estáveis e seleção dos filhos em
  passagem linear. Campo aceita só níveis inteiros, zero restaura documento/seleção;
  confirmar cria um undo. Mantém travas, COW e proteção de revisão do gesto comum.

Verificação: **905 testes**, zero falhas, 116 arquivos (52,77 s); typecheck, Biome
(366 arquivos), Vite e build de produção Kids passaram. Testes cobrem UV afim, limites/recusas, ligações de
faces e arestas soltas, subdivisões sequenciais, Worker real, UI/zero/undo e seleção
dos filhos. Worker: 19,16 kB. Limitações: sem subdivisão suavizante; pintura não afim,
faces não planas/côncavas exigem triangulação explícita. Não houve homologação GPU,
toque ou usabilidade; avisos de tamanho do Three permanecem.

### Lote 43: pontos e linhas na edição nativa

- [x] Seleção de pontos, linhas e faces compartilha estado de sessão, ferramentas,
  transformação local/mundo, copy-on-write e histórico. Um arrasto cria um undo;
  UV, pontos não escolhidos e transformações da peça permanecem intactos.
- [x] Clique por distância em pixels CSS, com tolerâncias de 8 para mouse e 14
  para toque, em perspectiva/ortografia. Inclui pontos isolados, arestas soltas,
  espelhos e oclusores travados; recorta linhas antes da projeção na câmera.
- [x] Índice de arestas sem diagonais de triangulação e conectividade iterativa.
  Overlays compartilham apenas buffers próprios entre espelhos; teste percorre
  vinte ciclos de abertura, troca de modo e descarte.
- [x] Controles “Pontos”, “Linhas” e “Faces” no mesmo painel. Operadores de face
  aparecem somente nesse tipo; troca de tipo limpa a seleção, sem editar o modelo.
  Revisão reproduziu e corrigiu limpeza ao clicar no tipo já ativo e oclusão por
  superfície recortada pelo plano próximo da câmera.

Verificação: **916 testes**, zero falhas, 118 arquivos (57,92 s); typecheck, Biome
(370 arquivos) e Vite passaram. Build Kids passou após o lote 42. Testes usam
geometria/raycast reais e renderer substituído: não comprovam GPU, toque real ou
usabilidade. Área de componentes, outros operadores e reparos continuam pendentes.
Formato público permanece 1; chunk Three de 559,62 kB ainda gera aviso de tamanho.

### Lote 44: seleção de componentes por caixa e laço

- [x] Mesma captura de ponteiro/contorno/cancelamento de objetos, agora aplicada
  também a pontos, linhas e faces. Multisseleção por área soma IDs sem alterná-los;
  uma área vazia limpa ou mantém a seleção conforme o modo aditivo.
- [x] Contrato de contenção por pontos explícito na UI. Linhas e faces exigem
  todos os seus pontos dentro da região, em uma mesma instância; não mistura
  cantos da fonte e do espelho. Respeita projeção, isolamento e travas.
- [x] “Alcançar partes atrás” compartilha teste de oclusão e controla destaque
  sem alterar materiais autorais. Pontos compartilhados são avaliados uma vez
  por instância durante a seleção por área, sem repetir por face.

Verificação: **921 testes**, zero falhas, 118 arquivos (66,05 s); typecheck, Biome
(370 arquivos) e Vite passaram. Testes de raycast, laço côncavo, espelhos, oclusão,
gestos de ponteiro, cancelamento e UI não substituem inspeção visual/GPU/toque.
O custo de áreas extensas ainda não foi medido; é a próxima revisão de desempenho.
Build Kids passou após o lote 42; formato público 1 e aviso de tamanho Three mantidos.

### Lote 45: índice espacial para oclusão de componentes

- [x] Perfil confirmou interseções de triângulos como gargalo da seleção por área.
  Índice espacial agora usa cópias próprias de posições e índice indireto, uma vez
  por geometria/consulta. Espelhos compartilham o índice temporário; descarte ao
  encerrar a consulta, sem cache global ou mudanças no documento/renderer.
- [x] Dependência direta MIT `three-mesh-bvh` 0.9.2, sem patch global do Three.
  A versão 0.8.3 carregava CommonJS junto de ESM no Bun; exports explícitos da
  0.9.2 resolveram o aviso. Testes com raycast nativo verificam equivalência.

Verificação: **923 testes**, zero falhas, 119 arquivos (52,58 s); typecheck, Biome
(373 arquivos) e Vite passaram. p95 CPU de 900 faces: 62,213 → 10,066 ms. Para
9216 faces, com perfil ligado: 7408,051 → 53,060 ms; sem perfil depois: 49,857 ms.
Primeira consulta grande: 71–81 ms. Goldens preservados; não é prova de fluidez
em dispositivos. Evidências/limitações em `.audits/molda-evolution/scene-selection-l45.md`.
SceneViewport cresceu para 77,33 kB e Three para 579,25 kB; entrada principal
permanece 281,70 kB. Ainda falta reduzir primeira consulta, revisar entrega de JS e
homologar GPU/toque. Build Kids passou após o lote 42; formato público permanece 1.

### Lote 46: dividir linhas preservando ligações e pintura

- [x] Um midpoint por aresta escolhida, compartilhado por todas as faces incidentes
  e arestas soltas correspondentes. UV calculado por canto, preservando costuras;
  pontos originais, faces não afetadas, materiais e imagens permanecem intactos.
- [x] Pré-validação de orçamento, limite de cantos, planaridade e pintura afim.
  Linha cujo midpoint colapsa por precisão Double é recusada. Mesma interpolação
  segura usada pela subdivisão de faces, sem arredondar para Float32.
- [x] Controle contextual para linhas, seleção dos dois filhos e um undo por
  operação. Operadores pontuais compartilham comando/COW/proteção de snapshot.
- [x] Revisão reproduziu uma corrida no teste legado: miniatura/data eram
  atualizadas após 700 ms enquanto a seleção mudava. O teste agora espera a
  miniatura, compara todos os campos autorais e verifica que só a conversão gera undo.

Verificação final: **928 testes**, zero falhas, 120 arquivos (54,24 s); typecheck,
Biome (376 arquivos) e Vite passaram. A primeira rodada completa teve a falha
de teste descrita acima; repetição após a correção passou. Build Kids passou após
o lote 45. Sem medições GPU/toque ou ativação pública; limites e avisos de bundle mantidos.

### Lote 47: remoção de componentes com impacto explícito

- [x] Pontos removem as faces e linhas soltas ligadas; linhas removem suas faces
  ligadas, sem apagar os pontos das extremidades. Nenhuma reconstrução ou
  preenchimento automático: faces, pintura e materiais não afetados permanecem.
- [x] Painel mostra a quantidade de faces e linhas soltas afetadas antes da ação.
  Botão e atalho usam o mesmo comando, com proteção de snapshot, copy-on-write e
  uma entrada de histórico. A seleção removida é limpa, sem editar outros nós.
- [x] Revisão cobriu pontos compartilhados, arestas incidentes, IDs especiais,
  leitura estrita, peças travadas, geometria compartilhada e desfazer pela UI.

Verificação: **932 testes**, zero falhas, 121 arquivos (52,53 s); typecheck, Biome
(378 arquivos) e Vite passaram. Build Kids passou após o lote 45. Testes não
homologam GPU, toque ou usabilidade; formato público 1 e avisos de bundle mantidos.

### Lote 48: juntar faces sem alterar pintura nem preencher buracos

- [x] Junção por regiões conectadas e coplanares, preservando o primeiro ID,
  cantos originais do contorno, materiais, pontos e linhas soltas. Aceita contornos
  côncavos simples; regiões desconectadas são tratadas separadamente.
- [x] Recusa buracos, contornos ramificados, ligações não-manifold, orientações
  incompatíveis, excesso de cantos, materiais diferentes e mudanças de pintura.
  A verificação afim usa todos os cantos de origem, inclusive os pontos interiores;
  nenhuma costura desaparece por estar fora do novo contorno.
- [x] Botão contextual usa o comando existente, seleção dos IDs sobreviventes e
  histórico. Revisão cobriu triangulação seguida de junção/desfazer, incidência
  externa, IDs especiais e superfícies pequenas, grandes, estreitas e transladadas.

Verificação: **939 testes**, zero falhas, 122 arquivos (53,40 s); typecheck, Biome
(380 arquivos) e Vite passaram. Build Kids passou após o lote 45. Sem homologação
GPU/toque; formato público permanece 1 e chunk Three mantém aviso de tamanho.

### Lote 49: tirar linhas internas sem abrir buracos

- [x] Dissolução usa as mesmas verificações de junção e segue somente as linhas
  escolhidas. Pares de faces vizinhos não viram uma única região por acidente;
  ciclos parcialmente escolhidos são recusados antes de retirar outras linhas.
- [x] Recusa bordas, linhas soltas, mudanças de pintura e ligações ambíguas.
  Uma linha solta sobre a aresta explicitamente dissolvida também é retirada;
  demais linhas e todos os pontos permanecem. Uma operação cria um undo.
- [x] Consultas de seleção não importam mais o módulo de edição de faces. A
  separação deixa o grafo de leitura independente dos operadores de modelagem.
  Revisão cobriu diferença exata entre arestas antes/depois e o comando pela UI.

Verificação: **942 testes**, zero falhas, 122 arquivos (54,85 s); typecheck, Biome
(380 arquivos) e Vite passaram. Build Kids passou após o lote 45. Nenhuma ativação
pública ou homologação de GPU/toque; aviso de tamanho do Three permanece.

### Lote 50: seleção por vizinhança, caminhos e anéis

- [x] Ampliar, reduzir e inverter pontos/linhas/faces; anéis atravessam lados
  opostos de quads e caminhos seguem continuação sem ambiguidade. Polos,
  triângulos, bordas e ligações não-manifold limitam o percurso.
- [x] Motor puro extraído do editor legado para `model/topologySelection.ts`.
  Os dois documentos usam adaptadores de IDs, sem conversão de geometria/UV e
  sem duplicação dos algoritmos. Caminhada iterativa e grafo de incidência.
- [x] Controles progressivos em “Mais jeitos de escolher”, com explicações e
  alvos de 44px. Não alteram documento, modo ou histórico. Revisão usou oráculo
  geométrico de vizinhança, inversão dupla, percurso fechado e teste pela UI.

Verificação: **945 testes**, zero falhas, 122 arquivos (53,77 s); typecheck, Biome
(381 arquivos) e Vite passaram, incluindo regressões do editor legado. Build Kids
passou após o lote 45. GPU/toque e usabilidade continuam sem homologação.

### Lote 51: cortes entre pontos e linhas de construção

- [x] Dois pontos não adjacentes dividem uma face em duas, sem arredondar pontos
  nem reprojetar UV. A identidade original acompanha o primeiro canto da origem;
  cantos, material, linhas soltas e incidência externa permanecem preservados.
- [x] Recusa cortes fora de faces côncavas, ambiguidades entre faces, linhas já
  existentes, pontos coincidentes, pintura não-afim e escolhas inválidas. Criar
  linha solta é uma ação separada, com orçamento e sem criação implícita de face.
- [x] Revisão cobriu corte seguido de dissolução, limite de 20 mil triângulos,
  IDs especiais, copy-on-write e erros/seleção/desfazer pela UI. O teste diferencia
  a linha de construção da subdivisão real da superfície.

Verificação: **951 testes**, zero falhas, 123 arquivos (55,93 s); typecheck, Biome
(383 arquivos) e Vite passaram. Build Kids passou após o lote 50: compilação
10,2 s, tipos 11,6 s e 57 páginas. Formato público 1; sem homologação GPU/toque.

### Lote 52: corte de uma faixa de faces

- [x] Uma linha inicia o percurso por lados opostos de quads. Cada linha cruzada
  ganha um midpoint compartilhado; faces vizinhas fora da faixa recebem o ponto
  de borda, sem corte implícito nem frestas. Costuras e materiais são independentes
  em cada face. Linhas de construção coincidentes acompanham a subdivisão.
- [x] Percursos fechados terminam; ligações ambíguas, pintura não-afim, faixa que
  cruza a si mesma e limites de geometria são recusados. Resultado seleciona as
  novas linhas e gera uma única entrada no histórico.
- [x] Revisão cobriu cubo fechado, novo corte após o primeiro, incidência manifold,
  encontro com triângulos, orçamento e comando pela UI. Corte pontual e corte de
  faixa compartilham a validação geométrica, sem duplicação desse algoritmo.

Verificação: **956 testes**, zero falhas, 124 arquivos (55,95 s); typecheck, Biome
(385 arquivos) e Vite passaram. Build Kids passou após o lote 50. Nova tentativa
de revisão visual pela skill Browser: seleção retornou `No browser is available`,
diagnóstico e listagem suportados retornaram `[]`. Sem inspeção visual/GPU/toque;
essa pendência não impede continuar os operadores puros e seus testes.

### Lote 53: juntar pontos sobrepostos com impacto explicado

- [x] União exata apenas dos pontos escolhidos no mesmo lugar, mantendo o primeiro
  ID escolhido. Pontos próximos ou não escolhidos não são aproximados; UV segue
  em cada canto, preservando costuras e materiais. Posição e superfície renderizada
  não mudam ao religar faces anteriormente soltas.
- [x] Plano informa pontos/grupos/faces e linhas soltas afetadas antes de aplicar.
  Somente linhas remapeadas podem colapsar ou se combinar; duplicatas não relacionadas
  permanecem. Recusa canto repetido, sobreposição de lados e novas ligações ambíguas,
  sem apagar faces como reparo implícito.
- [x] Revisão comparou buffers renderizados antes/depois, referências de pintura,
  seleção local, IDs especiais e pontos separados por precisão Double. UI verifica
  impacto e desfazer; tipagem/lint impedem retorno acidental em callback de teste.

Verificação: **962 testes**, zero falhas, 125 arquivos (54,28 s); typecheck, Biome
(387 arquivos) e Vite passaram. Build Kids passou após o lote 50. Navegador indisponível;
sem revisão visual/GPU/toque nem ativação pública do documento v2.

### Lote 54: espessura de superfícies planas com prévia

- [x] Fecha superfícies planas soltas com tampa, base invertida e paredes externas
  e internas. Buracos permanecem abertos; pintura afim e materiais dos dois lados
  são preservados. Recusa seleção parcial ligada a outras faces e calcula orçamento
  de pontos/triângulos antes de construir a geometria.
- [x] Reaproveita a extrusão preparada e seu cache limitado; prévia absoluta,
  retorno a zero, descarte idempotente e uma entrada no histórico. Distância não
  negativa; a medida é local à peça. Seleções grandes usam o worker existente com
  tokens, coalescência, descarte de resultados antigos e IDs estáveis.
- [x] Revisão cobriu volume/orientação, anel com buraco, pintura por canto,
  protocolo real de worker e UI com superfícies de 4 e 1089 faces. A medição de
  volume do teste foi corrigida para usar dados autorais Double, não buffers GPU Float32.

Verificação: **969 testes**, zero falhas, 126 arquivos (61,23 s); typecheck, Biome
(389 arquivos) e Vite passaram. Worker de superfícies: 20,83 kB; ScenePlayground:
90,01 kB. Build Kids passou após o lote 50. Sem navegador/GPU/toque disponíveis
para homologação; formato público continua 1 e aviso do chunk Three permanece.

### Lote 55: movimento suave por alcance na malha

- [x] Caminhos mínimos pelas arestas em unidades do mundo, com múltiplos pontos
  de origem e queda suave de influência. Considera escala/cisalhamento; partes
  desconectadas não se movem por estarem próximas. Grafo iterativo e fila de prioridade.
- [x] Pesos capturados uma vez por gesto; delta de translação convertido ao espaço
  local. Pontos não afetados, faces e pintura mantêm referências. Mesmo comando,
  COW, cancelamento e uma entrada no histórico. Essa opção é apenas para Mover;
  Girar/Tamanho ficam indisponíveis enquanto estiver ligada.
- [x] Alcance editável e validado, controles congelados durante o arrasto. Revisão
  comparou caminhos com oráculo independente, cadeias de 12 mil pontos, precisão,
  hierarquia e UI. A primeira suíte completa encontrou campos sem `name`; controles
  corrigidos e contrato de acessibilidade reexecutado antes da repetição completa.

Verificação final: **974 testes**, zero falhas, 127 arquivos (63,29 s); typecheck,
Biome (391 arquivos) e Vite passaram. Primeira rodada: 973/1, falha descrita acima.
ScenePlayground: 93,58 kB; build Kids passou após o lote 50. Não são medições de
fluidez/GPU nem homologação visual; navegador continua indisponível.

### Lote 56: detalhe paramétrico de cilindros e esferas

- [x] Campo autoral opcional de divisões, validado estritamente. Arquivos sem o campo
  conservam as divisões originais; sem arredondamento ou mudança de versão pública.
  Renderização, conversão para malha e orçamentos usam o mesmo detalhe.
- [x] Comando isolado por peça compartilhada, mantendo dimensões, materiais, pintura,
  identidades dos demais usuários e histórico. Custos incluem geometria órfã,
  instâncias e espelhos; excesso é recusado atomicamente.
- [x] Controles progressivos para lados/faixas, custo por peça e orientação de leveza.
  Rascunho não gera geometria nem histórico. Aplicação única; campos acompanham
  desfazer/refazer. Revisão cobriu limites, superfície fechada/orientada, codec,
  conversão sem alteração dos buffers, pintura, COW, bloqueios e acessibilidade.

Verificação: **980 testes**, zero falhas, 128 arquivos (56,16 s); typecheck, Biome
(394 arquivos), Vite e `git diff --check` passaram. Ajustados dois tipos em testes
antes da rodada final. ScenePlayground: 96,50 kB; worker: 21,68 kB. Build Kids após
o lote 55 passou: compilação 7,3 s, tipos 10,1 s, 57 páginas. Não substitui revisão
visual, GPU ou toque real; navegador permanece indisponível.

### Lote 57: cortes por plano com topologia compartilhada

- [x] Operação pura de corte, sem apagar lados ou preencher faces. Interseções são
  compartilhadas entre faces e linhas soltas; UVs são interpoladas por canto,
  preservando costuras e materiais. Cortes por eixos conservam a posição exata.
- [x] Validação de faces planas/convexas e UV afim antes de publicar identidades.
  Sem conserto implícito: reentrâncias pedem triangulação prévia; cortes fora da
  precisão ou orçamento são recusados. Tangências e repetição no mesmo eixo são no-op.
- [x] Controle progressivo por largura/altura/profundidade e posição local,
  explicando o alcance na peça inteira. Mesmo comando para todos os modos de
  seleção, isolamento de geometria compartilhada e uma entrada de histórico.
- [x] Revisão cobriu volume e orientação em escalas 1e-12 a 1e12, corte oblíquo,
  planos sobre pontos existentes, UVs, IDs especiais, orçamento e UI com COW/undo.

Verificação: **988 testes**, zero falhas, 129 arquivos (58,65 s); typecheck, Biome
(397 arquivos), Vite e `git diff --check` passaram. ScenePlayground: 101,46 kB;
worker: 21,68 kB. Build Kids verificado após o lote 55. Sem homologação visual,
GPU ou toque; aviso do chunk Three e pendências de rollout permanecem.

### Lote 58: chanfro plano e localizado de quinas

- [x] Uma quina externa de uma superfície fechada recebe um chanfro plano, com
  profundidade local. Recusa atingir outros cantos, apagar faces, malha aberta,
  quinas internas, UV não afim ou ligações incoerentes. Não é arredondamento de
  múltiplas quinas nem reparo automático.
- [x] Reutiliza o corte por plano, agora com proveniência e lado de cada face.
  Fecha a borda com orientação coerente; conserva identidades/UVs das faces
  originais. Só a nova face recebe projeção UV, com material de um dos lados.
  Outras superfícies, pontos órfãos preexistentes e linhas soltas permanecem.
- [x] Controle contextual com validação de seleção/profundidade e uma entrada
  no histórico. Revisão verificou as 12 quinas da caixa em três escalas, posição
  analítica do corte, costuras, sequência de operações e isolamento espacial.

Verificação: **992 testes**, zero falhas, 130 arquivos (56,85 s); typecheck, Biome
(400 arquivos), Vite e `git diff --check` passaram. ScenePlayground: 105,99 kB;
worker: 21,68 kB. Build Kids verificado após o lote 55. Homologação visual/GPU/toque,
ativação pública e demais critérios das fases continuam pendentes.

### Lote 59: tubos com caminhos paramétricos autorais

- [x] Geometria interna `path`: 2–128 pontos com IDs, raio, 3–64 lados e tampas
  opcionais. Leitor estrito, custos autorais/desenho e bounds com raio. Não persiste
  outra cópia da superfície; não habilita o formato público novo.
- [x] Gerador independente de GPU com frames transportados, UV por comprimento,
  costuras por canto e tampas orientadas. Conversão e desenho usam o mesmo gerador.
  Caminhos abertos; bifurcações, laços fechados e retorno sobre si são recusados.
  Autointerseção volumétrica de curvas apertadas é informada, não reparada implicitamente.
- [x] Cadeia selecionada vira uma nova peça com a hierarquia/transformação da fonte.
  Fonte intacta; editar raio/divisões/tampas e posições por ID conserva COW, pintura,
  desfazer e identidade dos demais pontos. Pivôs/duplicação/conversão aceitam caminhos.
- [x] `commandContext` centraliza a fronteira comum de seleção, travas, IDs e custos,
  reutilizada pelos comandos especializados. A extração perdeu inicialmente uma
  importação usada por espelhos; teste específico revelou e a importação foi reposta.
- [x] Revisão cobriu tesselação/extremos, orientação, UV, IDs especiais, parser/codec,
  bounds, pivô, cópia, bloqueios, espelhos/orçamento e criação/edição/undo na UI.

Verificação final: **999 testes**, zero falhas, 132 arquivos (58,89 s); typecheck,
Biome (409 arquivos), Vite e `git diff --check` passaram. ScenePlayground: 112,71 kB;
worker: 23,58 kB. Build Kids após o lote 59 passou: compilação 17,3 s, tipos 9,7 s,
57 páginas geradas.
GPU/toque/visual e ativação pública continuam pendentes; todas as fases mantêm os
critérios de aceite em aberto até sua verificação específica.

### Lote 60: diagnóstico e reparos locais com prévia cancelável

- [x] Conferência explícita em worker dedicado: dez categorias de observações,
  incluindo faces inválidas/repetidas, orientação, bordas abertas/ambíguas,
  pontos coincidentes/sem uso e linhas vazias/repetidas. Seleção da região sem
  alterar o documento. Aberturas e coincidências não são tratadas como erros de intenção.
- [x] Seis reparos locais, com explicação, prévia 3D, confirmar/cancelar e uma entrada
  de histórico. Triangular conserva os triângulos, cores e UVs já desenhados;
  remover duplicadas exige mesma orientação, material e UV por canto.
  Nada preenche buracos, solda pontos ou adivinha orientação automaticamente.
- [x] Protocolo estrito de documento/revisão, IDs vivos e contagens; transferência
  apenas de cinco buffers próprios. Cancelar termina o worker. Mudança de revisão,
  Escape, blur, ocultação e fechamento invalidam o trabalho sem sobrescrever edição alheia.
  A prévia reutiliza COW e o coordenador transacional; foco acompanha cancelar/confirmar.
- [x] Revisão cobriu geometria real, protocolo, cancelamento/resultado atrasado,
  isolamento de recurso compartilhado, documento/revisão externos, foco e undo na UI.

Verificação: **1.016 testes**, zero falhas, 134 arquivos (70,85 s); typecheck, Biome
(417 arquivos), Vite e `git diff --check` passaram. ScenePlayground: 119,63 kB;
worker de diagnóstico: 22,14 kB; worker de superfície: 23,58 kB. Kids verificado
após o lote 59. A implementação avança para a fase 5, mantendo a homologação e as
restrições das ferramentas da fase 4 explícitas; nenhuma fase é declarada encerrada.

### Lote 61: mapa UV nativo, ilhas e organização da pintura

- [x] Ilhas e costuras derivadas de UV exato por canto, orientação e vínculo de
  material. Não solda coordenadas próximas nem atravessa ligações ambíguas.
  Índice linear e seleção de ilhas inteira sincronizada com as faces em 3D.
- [x] Translação, escala, giro e espelhamento no centro comum; giros de 90° sem
  ruído trigonométrico. Projeções por eixos ou plano de cada face; organização
  determinística por faixas com escala uniforme, proporções e margem configurável.
  Recusa ilhas incompletas, margens impossíveis e valores não finitos.
- [x] Painel 2D lazy, um canvas sob demanda e descarte ao fechar. Mostra UV fora
  do quadrado, alterna faces sobrepostas por clique e oferece seleção por lista.
  Reage ao tema, sem frames contínuos. COW, identidades, pontos, materiais e pixels
  permanecem intactos; apenas UV escolhido entra num commit/desfazer.
- [x] Revisão incluiu 9.216 faces, coordenadas extremas, IDs especiais, proporções,
  margens, compartilhamento e erro recuperável na UI. Reorganizar avisa que muda
  a posição da pintura; não promete preservar sua aparência nem faz bake implícito.
- [x] A suíte encontrou uma mudança paralela no host: ferramentas agrupadas sob
  “Criar”. O teste de conformidade passou a verificar esse caminho e o destino
  Molda; nenhum código da navegação do host foi alterado neste lote.

Verificação final: **1.026 testes**, zero falhas, 135 arquivos (70,34 s); typecheck,
Biome (423 arquivos), Vite e `git diff --check` passaram. Painel UV lazy: 5,80 kB;
ScenePlayground: 123,95 kB. Kids após o lote 61 passou: compilação 58 s, tipos
3,4 min, 57 páginas. Costuras marcadas
para futura abertura, pintura sobre o mapa e conversão de imagens seguem nos próximos
lotes. Validação visual/GPU/toque e rollout continuam pendentes.

### Lote 62: materiais compartilhados, imagens e camadas autorais

- [x] Índice de uso de materiais/imagens por peça, incluindo faces, primitivas,
  caminhos e travas herdadas de grupos ocultos. Editar um recurso compartilhado
  exige que todos os usuários estejam destravados; a UI informa o alcance.
- [x] Cópia explícita de um material e sua imagem só para a peça atual. Clona pixels,
  remapeia vínculos e faz COW da geometria quando necessário, sem mudar outras peças.
  Acabamentos fosco/brilhante/metal, parâmetros exatos, cor base vinculada à paleta
  e escolha de imagem usam o mesmo leitor estrito de material do documento.
- [x] Imagens retangulares indexadas/RGBA, criação em branco e troca de vínculo
  preservando a fonte anterior na biblioteca. Camadas podem ser criadas, duplicadas,
  reordenadas, renomeadas, ocultadas e removidas com desfazer; a última permanece.
  Metadados não clonam pixels. Orçamento de bytes/camadas é verificado antes de alocar.
- [x] Conversão explícita indexada → RGBA conserva as cores e transparência de cada
  camada, liberando o vínculo com a paleta. Não há quantização de volta para índices.
  A prévia usa a mesma composição do 3D, com a cor base sob a tinta.
- [x] Painel lazy dividido em seleção, acabamento, criação de imagem e camadas.
  Ajustar nome/opacidade/visibilidade de uma camada gera um único undo. A revisão
  completa encontrou colisão entre chaves dos painéis de caminho/material; a nova
  chave foi qualificada, e o fluxo de caminhos foi revalidado antes da suíte final.

Verificação final: **1.036 testes**, zero falhas, 136 arquivos (73,46 s); typecheck,
Biome (434 arquivos), Vite e `git diff --check` passaram. Painel de materiais lazy:
16,28 kB; ScenePlayground: 115,64 kB; Three continua >500 kB. Kids verificado após
o lote 61. Traços de pintura, tarefas grandes de imagem em worker e mapas detalhados
ainda não estão entregues; não confundir prévia de camadas com edição 3D de pixels.

### Lote 63: lápis e borracha sobre a imagem canônica em 2D/3D

- [x] Um núcleo puro pinta pixels indexados/RGBA com três tamanhos de pincel,
  interpolação entre amostras e cópia apenas da camada alterada. Fonte, UV,
  geometria, materiais e demais camadas permanecem intactos; traço sem mudança
  não cria histórico. Travas de todos os usuários da imagem são respeitadas.
- [x] Gesto transacional compartilhado por painel e viewport, com um desfazer por
  traço, revisão própria e cancelamento sem sobrescrever edições externas.
  Lápis, borracha, paleta, cor livre e intensidade da cor ficam no painel lazy.
- [x] Captura 3D usa a primeira superfície visível, UV de seus cantos e vínculo
  de imagem: não atravessa peças encobrindo a escolhida. Trocar face/cópia de
  espelho interrompe a interpolação para não ligar costuras por uma linha espúria.
- [x] Canvas 2D retangular usa seus limites reais e orientação UV, posição final
  ao soltar, captura exclusiva e marcador visível para teclado. Setas movem o
  cursor; espaço/Enter pintam. Alternância explícita entre pintar e olhar o 3D.
- [x] Revisão corrigiu captura falha, amostra final perdida, modos de componente
  e pintura simultâneos e dicas conflitantes. Testes com raycasting/recursos reais
  cobrem contexto 3D, foco, segunda ponta, troca de vista, cancelamento e undo.
  Um teste de UV foi deslocado para o centro do pixel: não se introduziu epsilon
  no domínio para satisfazer uma expectativa numa fronteira exata.

Verificação final: **1.051 testes**, zero falhas, 140 arquivos (80,27 s); typecheck,
Biome (444 arquivos), Vite e `git diff --check` passaram. Pintura lazy: 6,07 kB;
ScenePlayground: 120,25 kB; SceneViewport: 79,10 kB; Three continua >500 kB.
Kids verificado após o lote 61. Composição/upload ainda atualizam a imagem inteira;
não há alegação de FPS ou homologação em tablet. Balde/formas e tarefas grandes
de imagem, UV autoral avançado e mapas detalhados seguem pendentes.

### Lote 64: balde e conversão de imagem em worker cancelável

- [x] Operações puras de conversão RGBA e balde conectado. Conversão mantém todas
  as camadas, cores e metadados; comando síncrono e worker usam o mesmo núcleo.
  Balde compara índices exatos ou quatro canais RGBA com tolerância explícita,
  sempre contra o pixel inicial; não expande a tolerância a cada vizinho.
- [x] Fila iterativa e visitação limitadas ao número de pixels, sem recursão nem
  atravessar bordas de linhas. No-op preserva a imagem original; somente a camada
  preenchida é copiada. Testes com conectividade independente e imagem 1024².
- [x] Uma tarefa por revisão, abortada ao cancelar, substituir a tarefa ou editar
  a criação. Pré-checagem de travas e orçamento agregado antes de abrir o worker.
  Protocolo estrito de criação/revisão/imagem, respostas apenas com camadas alteradas,
  buffers de origem nunca transferidos e commit único ao concluir.
- [x] Balde acessível por teclado/2D/3D e tolerância RGBA no painel. Explica que a
  área conectada da imagem pode pintar outras faces que a utilizam. Conversão no
  painel de camadas agora é assíncrona e cancelável, inclusive ao fechar o painel.
  Desfazer pode trocar o formato sem deixar a ferramenta com uma cor incompatível.
- [x] Revisão confirmou rejeição de respostas inválidas, conversões incompletas,
  camadas fora da operação, duplicatas, fontes antigas e conversão além de 32 MiB.
  Um timeout de UI vinha da formatação de um elemento DOM inteiro numa asserção
  de espera: a espera agora compara presença booleana, sem relaxar seu resultado.

Verificação final: **1.062 testes**, zero falhas, 143 arquivos (65,94 s); typecheck,
Biome (454 arquivos), Vite e `git diff --check` passaram. Worker de imagem: 6,61 kB;
ScenePlayground: 123,70 kB; Three continua >500 kB. Benchmark CPU/worker reproduzível
em `.audits/molda-evolution/scene-image-l64.md`: o worker adiciona custo total de
inicialização/transferência, mas isola o laço de cálculo e permite encerrá-lo.
Não é prova de responsividade/GPU em navegador. Composição/upload completos,
formas, seleção de pixels, gradientes, importação e mapas detalhados ainda pendem.

### Lote 65: composição e atualização local da pintura

- [x] Medição separou comando autoral, composição e preparo de recursos, localizando
  o custo no tratamento da imagem inteira após traços pequenos. Comparador puro
  identifica a região realmente alterada, inclusive em undo, clones e workers;
  ignora referências/bytes iguais e camadas invisíveis sem um registro global.
- [x] Compositor único produz imagem inteira ou patch compacto com a mesma conta
  de alpha, quantizada somente na saída. Paleta/base, tamanho/formato e mudanças
  estruturais de camadas invalidam a imagem completa; nomes não geram raster novo.
- [x] Material reutiliza textura, copia só o patch e acumula faixas por linha no
  mecanismo de upload existente. Contagem incremental mantém transparência,
  depthWrite e invalidação de shader corretas sem varrer RGBA inteiro a cada traço.
  Atualizações de acabamento não provocam upload da textura.
- [x] Canvas 2D usa o mesmo preparo parcial, invertendo linhas e posicionando o
  patch no lugar correto. Remove composição completa durante render React e não
  mantém outro bitmap autoral ou cache global. Cada consumidor retém só sua fonte.
- [x] Revisão/testes conferem patches e inversos contra composição completa,
  índices/RGBA, opacidade, transparência, faixas pendentes, metadados, StrictMode e
  posição no canvas. O teste de versão da textura distingue carga inicial pendente
  de upload parcial, sem fingir que um renderer GPU foi executado.

Verificação final: **1.070 testes**, zero falhas, 145 arquivos (65,71 s); typecheck,
Biome (458 arquivos), Vite e `git diff --check` passaram. Preparo de recursos no
ensaio CPU 1024²/8 camadas: p95 **144,656 → 1,522 ms**; patch 2D p95 0,925 ms.
O traço recompõe 60 bytes, mas ainda compara/copia a camada autoral inteira.
Metodologia, limites e variação de composição completa estão registrados em
`.audits/molda-evolution/scene-paint-l65.md`. Não é evidência de FPS/GPU/toque.
ScenePlayground: 123,73 kB; viewport: 79,77 kB; Three continua >500 kB.
Build Kids iniciado após este lote passou: compilação 62 s, tipos 2,6 min,
59 páginas. As mudanças paralelas do host foram preservadas.

### Lote 66: formas e seleção retangular da pintura

- [x] Raster incremental compartilhado entre texturas legadas e imagens nativas:
  linhas, retângulos e elipses com contorno/preenchimento. Conserva o comportamento
  seamless legado e não acumula milhões de pares de coordenadas para uma área grande.
  Fontes indexadas/RGBA usam o mesmo contrato de camada, brush e substituição de pixels.
- [x] Gesto de forma mantém só o contorno na sessão durante o arrasto. Soltar
  envia uma tarefa cancelável e produz um undo; sair da área/costura, revisão
  externa ou cancelar descarta o rascunho sem modificar pixels. Configuração
  fica congelada durante o gesto, sem criar workers a cada movimento.
- [x] Seleção retangular permanece estado de sessão, identificada por imagem e
  dimensões. Lápis/borracha, balde e formas respeitam a área, sem recortar o bitmap.
  Desfazer pixels conserva a seleção; “Pintar na imagem toda” a remove explicitamente.
- [x] Ferramentas progressivas no painel, contorno em SVG e captura 2D/3D. Teclado
  marca começo/fim com espaço/Enter e movimenta o segundo ponto por setas; Escape
  cancela. Cursor acompanha dimensões atuais, e o contorno visual do canvas não
  reduz sua área útil de pixels nem desloca o mapeamento de entrada.
- [x] Revisão/testes cobrem equivalência com desenho legado, seleção indexada/RGBA,
  bounds inválidos, fonte intacta, worker de 1024², camada não escolhida, dois
  pontos por teclado, cancelamento, um undo e seleção sem entrada no histórico.

Verificação final: **1.080 testes**, zero falhas, 147 arquivos (66,17 s); typecheck,
Biome (465 arquivos), Vite e `git diff --check` passaram. Worker de imagem: 9,23 kB;
ScenePlayground: 125,62 kB; pintura lazy: 9,35 kB; Three continua >500 kB.
Gradientes, carimbos, importação de imagens e mapas detalhados continuam abertos.
Nenhum rollout ou homologação visual/GPU/toque foi inferido desses testes.

### Lote 67: gradiente com transparência e conta-gotas

- [x] Gradiente linear em sRGB codificado, com interpolação de alpha premultiplicado,
  projeção limitada ao intervalo e bytes exatos nos extremos. Só a camada escolhida
  muda; respeita a seleção e preserva a imagem em no-op. Zero distância é recusada.
- [x] Mesmo gesto de dois pontos, contorno de sessão e worker cancelável das formas;
  sem alterações por amostra. Cores livres exigem conversão explícita e um undo
  separado. Controles reutilizáveis de cor/alpha para os dois extremos.
- [x] Conta-gotas 2D/3D lê bytes autorais da camada, sem compor outras camadas nem
  quantizar cores. Índice transparente escolhe a borracha; demais cores retornam
  ao lápis. Ferramenta ativa passou a ser um estado único, sem flags conflitantes.
- [x] Revisão/testes cobrem projeções horizontal/vertical/diagonal/reversa, alpha
  sem halo, bounds, fonte intacta, ownership das cores, protocolo do worker,
  conversão explícita, seleção por teclado e histórico independente das ferramentas.

Verificação final: **1.087 testes**, zero falhas, 148 arquivos (65,28 s); typecheck,
Biome (469 arquivos), Vite e `git diff --check` passaram. Worker de imagem: 10,52 kB;
ScenePlayground: 126,59 kB; pintura lazy: 10,41 kB; Three continua >500 kB.
Sem nova homologação visual/GPU/toque. Importação, carimbos, mapas detalhados e
demais critérios da fase 5 continuam pendentes.

### Lote 68: importação local de PNG/JPEG com prévia

- [x] Decodificador compartilhado com imagens de referência: cabeçalho real,
  orçamento de arquivo (4 MiB), dimensões e recusa de animação antes de decodificar.
  Imagens de pintura têm limite de 1024 por eixo, sem redimensionamento automático.
  URL/decodificador/canvas são liberados ao concluir, cancelar ou falhar.
- [x] Conversão da saída do canvas para RGBA canônico inverte linhas uma vez,
  conserva dimensões retangulares e bytes decodificados, sem quantizar à paleta.
  Decodificação é gerenciada pelo navegador: não promete preservar perfil de cor,
  metadados comprimidos ou RGB invisível que o próprio decoder/canvas descarte.
- [x] Prévia fica só na sessão e requer confirmação. Nova imagem/camada é vinculada
  ao material em um comando; conserva biblioteca anterior, geometria e UVs. Todas
  as peças que usam o material acompanham o vínculo, explicado antes de confirmar.
  Travas e orçamento agregado são conferidos antes de copiar pixels/alocar IDs.
- [x] Escopo de leitura invalida resultados/prévias após trocar a criação, revisão
  ou material; cancelar e fechar liberam o pedido. Loader é lazy. Testes exercitam
  núcleo real e editor/StrictMode, simulando apenas as fronteiras de decoder/canvas.

Verificação final: **1.094 testes**, zero falhas, 151 arquivos (66,62 s); typecheck,
Biome (477 arquivos), Vite e `git diff --check` passaram. ScenePlayground: 126,70 kB;
painel de aparência lazy: 15,92 kB; decoder compartilhado: 2,25 kB; Three >500 kB.
Sem prova de decodificação real/GPU/toque no navegador indisponível. Carimbos,
costuras autorais, mapas detalhados e conversão compartilhada ainda estão abertos.

### Lote 69: carimbos reutilizáveis e recorte consistente

- [x] Carimbo RGBA importado ou copiado da seleção da camada, conservando bytes
  autorais e independência da fonte. Escala inteira 1–4, giros de 90° e espelhamento
  nos eixos da prévia, sem suavização nem redução automática de cores.
- [x] Aplicação source-over única na camada escolhida, ignorando pixels vazios;
  recorte na imagem/seleção antes do laço. Não aloca imagem ampliada mesmo quando
  o carimbo resulta em 4096². Contorno usa a mesma interseção, sem invadir a interface.
- [x] Configurações e raster congelados no início; movimento só reposiciona a prévia.
  Soltar/confirmar executa um worker e um undo, sem acumular alpha por amostra.
  Cancelar/revisão externa/costura conserva o contrato comum de gestos. Carimbo é
  recurso de sessão e sobrevive a undo de pixels, mas é descartado ao fechar a pintura.
- [x] Prévia com giro/espelhamento via transformação visual, controles de 44px,
  leitor de arquivos compartilhado e progressivo; teclado posiciona e confirma.
  Cópia explica que usa apenas a camada e como liberar a área antes de reutilizá-la.
- [x] Revisão/testes cobrem todas as combinações de giro/espelho/escalas 1–2,
  escala 4 com recorte, mistura de alpha, no-op, raster não transferido, worker,
  seleção/captura por teclado, cancelamento, um undo e continuidade da ferramenta.

Verificação final: **1.100 testes**, zero falhas, 152 arquivos (68,03 s); typecheck,
Biome (481 arquivos), Vite e `git diff --check` passaram. Worker de imagem: 12,75 kB;
ScenePlayground: 127,71 kB; pintura lazy: 13,53 kB; Three continua >500 kB.
Sem homologação visual/GPU/toque; costuras autorais, mapas detalhados, flipbook e
conversão compartilhada continuam abertos na fase 5.

### Lote 70: cantos UV e alinhamento explícito de bordas

- Edição numérica e por alças dos cantos da face principal, sincronizada com a
  seleção 3D. Coordenadas Double e UVs fora do tile continuam válidos; nenhum snap
  implícito. Teclado usa passo explícito, espaço/Enter confirma e Escape cancela.
- Arrasto congela enquadramento e deslocamento inicial; processa a amostra final
  ao soltar. A prévia é apenas um contorno leve sobre o canvas, sem redesenhar
  toda a pintura por amostra nem alterar o documento antes da confirmação.
- Alinhar uma borda copia exatamente dois cantos da face de referência para a
  vizinha selecionada. Recusa borda aberta/não manifold, orientação incompatível
  e materiais diferentes; explica que pode esticar a pintura da face vizinha.
  Não equivale a marcação autoral de costuras ou unwrap completo.
- Revisão: captura exclusiva, perda/falha de captura, blur, ocultação, troca de
  malha e troca de revisão cancelam. A revisão também protege contra mudanças
  externas que mantenham a mesma malha. Comando mantém COW/travas e um undo.
- Verificação: **1.106 testes, zero falhas, 154 arquivos, 74,40 s**; suíte focada
  de interação: 45 testes em dois arquivos. Typecheck, Biome (486 arquivos), Vite
  (1,68 s) e diff-check passaram. UV lazy: 13,42 kB/4,65 gzip; playground:
  128,15/39,52; Three: 579,25/146,74 e aviso >500 kB permanece. Sem homologação
  visual/GPU ou teste com crianças. Build Kids após o lote 69 passou (59 páginas).

### Lote 71: conversão atômica de pinturas em imagem compartilhada

- “Juntar pinturas desta peça” prepara em worker uma imagem RGBA com as camadas
  visíveis e cores de base atuais. Prévia não altera o documento; confirmar muda
  UVs, vínculos e imagem juntos, com um undo. Originais permanecem na biblioteca;
  a nova pintura não acompanha futuras mudanças da paleta e isso é informado.
- Packing determinístico com margens de um pixel replicado, sem resize/rotação.
  Recusa UVs fora do tile e pinturas que não couberam em 1024 por eixo; não corta,
  quantiza UVs nem reduz resolução para fazer caber. Materiais sem imagem continuam
  intactos. Camadas originais não são editadas nem descartadas silenciosamente.
- Só a peça escolhida recebe novos vínculos; geometria compartilhada usa COW.
  Caixas, rampas, cilindros e caminhos mantêm parâmetros editáveis; malhas mantêm
  vértices/topologia. Esfera de uma superfície já usa uma imagem e não precisa
  desta conversão. Materiais mantêm acabamentos e grupos separados.
- Revisão: espaços livres opacos evitam alterar a classificação de transparência.
  Misturar imagens opacas e transparentes é recusado para conservar depth-write
  e aparência. Resultado carrega só raster, nunca geometria/IDs autorais do worker;
  limites/tokens/paleta/imagens são validados, sem transferir buffers vivos.
  Escape, blur, ocultação, fechar painel e outra revisão descartam a tarefa/prévia.
- Verificação: **1.118 testes, zero falhas, 156 arquivos, 67,27 s**; focados:
  55 testes/3 arquivos. Typecheck, Biome (497 arquivos), Vite (0,87 s) e diff-check
  passaram. Worker atlas: 7,47 kB; aparência lazy: 21,72/6,82 gzip; Three mantém
  aviso >500 kB. Testes comprovam composição/padding/UV/COW/undo, não GPU/FPS.
- Pendência encontrada na revisão e encaminhada ao lote 72: materiais que usam a
  mesma imagem/base ainda criam recursos de textura separados no renderizador.
  Não afirmar redução de memória ou draw calls por causa da conversão sozinha.

### Lote 72: um recurso de pintura por imagem/base, com medição

- Separados os proprietários: `ScenePaintResource` mantém a textura, uploads e
  transparência; materiais mantêm acabamentos independentes e tomam a textura
  emprestada. Cena prepara composição/patch uma vez por imagem/base Double exatas,
  sem cache global nem retenção de documentos anteriores.
- Trocas de imagem/base isolam recursos; fontes idênticas compartilham mesmo com
  roughness/metalness diferentes. Retirada de um usuário não descarta a pintura;
  retirada do último descarta uma vez. Alterações de alpha atualizam todos os
  materiais usuários. Upload parcial, undo, paleta, resize e falhas continuam cobertos.
- Benchmark antes/depois em `.audits/molda-evolution/scene-shared-paint-l72.md`:
  128 materiais passaram de 128 texturas/64 MiB de buffers para uma/512 KiB;
  atualização CPU p95 81,007 → 1,221 ms; primeira carga p95 613,218 → 10,991 ms.
  São medidas locais sem WebGL, não memória residente GPU/FPS/dispositivo. Grupos
  e draw calls não foram reduzidos. Composição inicial e comparação autoral continuam.
- Verificação: **1.121 testes, zero falhas, 157 arquivos, 65,67 s**; focados de
  recursos: 11 testes/2 arquivos. Typecheck, Biome (500 arquivos), Vite (0,63 s)
  e diff-check passaram. Viewport: 80,39/24,70 gzip; Three mantém aviso >500 kB.
  Suíte emitiu avisos de `act` em testes do editor legado, sem falhas; não há
  homologação visual/GPU. Resolvida a duplicação encaminhada pelo lote 71.

### Lote 73: contratos e renderização de mapas detalhados

- Materiais internos aceitam normal, roughness e metalness por imagem, força de
  normal Double e inversão Y explícita. Leitor estrito conserva os campos; mapas
  de dados exigem RGBA e referências válidas, sem converter índices silenciosamente.
  A ativação pública do formato continua fora deste lote.
- Vínculos centralizados em `materialImages`: travas de imagens abrangem todos os
  papéis, copiar material/duplicar subárvore remapeia todas as imagens alcançadas
  uma vez e conserva compartilhamento interno, sem emprestar pixels do original.
- Render separa sRGB da cor e `NoColorSpace` dos dados. Normal usa RGB tangente;
  roughness usa G, metalness usa B. Mapas escalares compartilham raster quando
  imagem/base/espaço coincidem. Camadas transparentes revelam fundo neutro; mapas
  de detalhes não alteram alpha/depth-write nem geometria. Paleta não recompõe dados.
  Contrato consultado na documentação oficial Three.js via Context7.
- Revisão: atlas de cor recusa materiais com mapas até existir remapeamento
  coordenado de todos os canais; não mudar UV e desalojar os detalhes. Descarte
  considera todos os papéis e invalidação de shader acompanha ligar/desligar mapas.
- Verificação: **1.126 testes, zero falhas, 159 arquivos, 67,56 s**; focados:
  16 testes/4 arquivos. Typecheck, Biome (503 arquivos), Vite (0,70 s) e diff-check
  passaram. Viewport 81,24/24,93 gzip; Three mantém aviso >500 kB. Interface e
  pintura de dados ficam no lote 74; nenhum teste visual/GPU foi realizado.

### Lote 74: interface e pintura dos mapas de materiais

- Escolha contextual “O que você quer pintar?” separa Cor, Relevo na luz, Partes
  foscas e Partes de metal. Criar/importar uma imagem altera só o vínculo escolhido;
  cores originais continuam guardadas. Mapas oferecem somente imagens RGBA, com
  explicação de fundo neutro, canais, força do acabamento e limites do decoder.
- `SceneImageCreateForm` substitui o formulário exclusivo de cor. Criação e
  importação reutilizam `bindNewMaterialImage`; APIs de cor continuam como entradas
  compatíveis e estritas. Prévia de importação muda de dono ao trocar material/papel.
- Pintura 2D/3D, camadas, formas, gradientes e carimbos usam o mesmo mecanismo,
  agora com papel explícito no alvo. Raycast verifica o papel no material atingido;
  o canvas usa o fundo do mapa, não a cor de base. Ferramenta inicia azul neutro
  para normal e branco para mapas escalares, sem alterar pixels ao abrir.
- Força e inversão vertical da normal são explícitas, com Double/undo. Trocar
  papel é sessão, não histórico. Criar mapa, ajustar efeito e pintar têm undos
  separados; remover a criação via undo fecha um alvo que deixou de existir.
- Verificação: **1.135 testes, zero falhas, 159 arquivos, 66,36 s**; focados:
  61 testes/3 arquivos. Typecheck, Biome (504 arquivos), Vite (0,61 s) e diff-check
  passaram. Aparência lazy: 24,25/7,32 gzip; pintura: 13,71/4,26; viewport:
  81,25/24,94. Three mantém aviso >500 kB. Sem teste visual/GPU/crianças.

### Lote 75: contratos de pintura animada por quadros

- `SceneImage.flipbook` guarda dimensões exatas dos quadros, sequência explícita
  (incluindo repetições), velocidade e repetição. Leitor estrito exige divisão sem
  sobras, até 256 células/passos e 0,1–60 quadros/s, antes de copiar bytes de camadas.
- Comando de configuração respeita todas as travas compartilhadas, conserva pixels,
  camadas e UV por referência e integra undo/redo. Remover animação remove só os
  metadados. Leitor JSON e worker de imagem preservam o contrato.
- Amostragem temporal distingue passo e célula, cobre fim sem loop e tempos grandes.
  Coordenadas convertem numeração visual superior-esquerda para pixels bottom-up;
  UV=1 e valores fora do tile ficam dentro do quadro, sem atingir a célula vizinha.
- Atlas recusa fontes animadas tanto no comando quanto no kernel/worker: nenhuma
  animação é achatada silenciosamente. Não há reprodução nem recorte visual neste
  lote; esses consumidores vêm a seguir. Formato público continua 1, interno 2.
- Verificação: **1.139 testes, zero falhas, 160 arquivos, 66,89 s**; typecheck,
  Biome (508 arquivos), Vite (0,85 s) e diff-check passaram. Three mantém aviso
  >500 kB. Sem homologação visual/GPU; build Kids registrado acima pertence ao 74.

### Lote 76: recorte de quadros compartilhado entre 2D e 3D

- `SceneRasterWindow` conserva a composição atual da folha e um único buffer
  reutilizável de quadro. Imagens estáticas usam o próprio buffer de composição,
  sem cópia adicional. Trocar quadros copia somente o recorte, sem recompor camadas.
- Patches fora do quadro atual atualizam a folha sem upload/redesenho visível;
  interseções são traduzidas para coordenadas locais. Contagem de transparência
  considera a folha inteira, evitando alternar depthWrite/shader a cada quadro.
- `SceneImagePreview` e `ScenePaintResource` compartilham esse kernel. Todos os
  mapas do mesmo ID acompanham o quadro ativo; texturas, materiais, grupos e UV
  permanecem estáveis. Desfazer metadados restaura a folha e descarta o recorte.
- Pintura 3D usa a célula exibida e inclui o quadro na identidade da região do
  gesto. Primeiro quadro da sequência aparece por padrão. Controles e relógio de
  reprodução ainda não estão disponíveis neste lote.
- Revisão cobre patches inválidos antes de mutação, todos os retângulos de uma
  folha pequena, buffers/descartes, mapas, undo, recorte 2D bottom-up e raycast real.
- Verificação: **1.146 testes, zero falhas, 162 arquivos, 67,15 s**; focados:
  18 testes/5 arquivos. Typecheck, Biome (511 arquivos), Vite (0,64 s) e diff-check
  passaram. Regressão CPU estática mantém uma textura por imagem/base; resultados
  completos na auditoria do lote 72, incluindo dispersão do p95. Sem medida GPU.

### Lote 77: controles e reprodução de pintura animada

- “Pintura que se mexe” configura dimensões, sequência em numeração visível a partir
  de 1, repetições, velocidade Double e loop. Campo vazio usa todas as células só
  após validar dimensões/orçamento. Aplicar/remover conserva a folha e tem undo.
- Prévia recortada com passo anterior/próximo, seleção e reproduzir/pausar; mudanças
  acompanham o 3D. Pintura oferece escolha manual de quadro, sem reprodução durante
  o gesto; o canvas 2D continua editando a folha inteira.
- `SceneFlipbookPlayer` possui relógio e assinatura locais, não retém pixels nem
  escreve no store. Só os consumidores de quadro recebem notificações; reprodução
  não reenviou documento ao viewport nos testes. Nenhum RAF antes de Play ou após
  pausa/fim; células repetidas não solicitam render 3D adicional.
- Pausa mantém a fração temporal; seek guarda o passo inteiro sem ida/volta por
  segundos, preservando a posição mesmo em velocidades Double. Tokens descartam
  callbacks cancelados. Blur, ocultação, nova revisão, perda de contexto, mudança
  para movimento reduzido e fechamento desmontam/pausam a reprodução, sem autoplay.
- Raycast informa limites da célula: pincel, balde, formas, gradiente e carimbo
  combinam esses limites com a seleção. Conta-gotas/reseleção não ficam presos à
  seleção anterior. Trocar quadro cancela pintura; sincronizar o mesmo quadro não.
- Verificação: **1.157 testes, zero falhas, 165 arquivos, 68,49 s**; typecheck,
  Biome (519 arquivos), Vite (0,68 s) e diff-check passaram. Fluxo completo testado
  com store real; relógio, canvas e renderer são fronteiras simuladas, não GPU.
  Aparência lazy: 28,24/8,24 gzip; pintura 13,87/4,31; viewport 81,95/25,15.
  Three mantém aviso >500 kB. Prévia reproduz uma imagem escolhida, não todos os
  clipes da cena. Exportação/runtime Studio, avaliação visual e crianças pendentes.

### Lote 78: organização automática de UV com densidade proporcional

- `autoMeshUv` projeta cada face plana e organiza ilhas separadas com uma escala
  comum. Faces grandes recebem proporcionalmente mais área de pintura; posição,
  ordem dos cantos, materiais, pixels e faces não selecionadas ficam intactos.
- `meshUvProjection` compartilha a projeção com a ferramenta anterior;
  `meshUvPacking` recebe grupos disjuntos explícitos e conserva a organização de
  ilhas existentes. Não derivar os novos grupos por coincidência acidental de UV.
- Cálculos temporários retiram a translação antes de normalizar e tratam spans
  extremos de Double; nenhuma posição normalizada volta ao documento. Recusar
  faces não planas e perda de área por precisão, sem arredondar/soldar/reparar.
- Abertura por faces, não um solucionador de superfícies curvas nem marcação
  persistente de costuras. Alterar UV desloca a pintura visível sem redesenhar seus
  pixels. Worker, prévia e confirmação da operação ficam para o próximo lote.
- Verificação: **1.162 testes, zero falhas, 166 arquivos, 69,09 s**; focados:
  16 testes/3 arquivos. Typecheck, Biome (523 arquivos), Vite (0,99 s) e diff-check
  passaram. Casos incluem densidade entre faces inclinadas, Double extremo e
  subnormal, translação distante, 1.024 ilhas sem interseção, travas/COW/undo.
  Sem medição/homologação GPU; build Kids anterior é do lote 77.

### Lote 79: prévia cancelável de organização automática de UV

- “Abrir faces para pintar” executa a organização em worker somente sob pedido.
  Prévia 2D somente leitura, margem explícita e confirmação separada; nenhum
  documento/histórico é alterado durante o cálculo. Explicar escala proporcional,
  ilhas por face e deslocamento da pintura sem modificar seus pixels.
- Protocolo estrito transporta malha e seleção, devolvendo somente UV Double dos
  cantos escolhidos. Validar token, identidade, tamanho, finitude e intervalo;
  buffers derivados são transferidos, nunca buffers do documento. Topologia,
  posições, materiais e faces não escolhidas permanecem sob controle da origem.
- Escape, blur, ocultação, contexto perdido, revisão/seleção/bloqueio e fechamento
  do painel cancelam e liberam a tarefa. Resultados/confirmadores capturados não
  atravessam nova revisão. Aplicar usa comando existente, travas, COW e um undo.
- Removida a entrada síncrona provisória de auto-UV: o consumidor real usa worker,
  sem duplicar o kernel no caminho dos comandos imediatos.
- Revisão inclui worker real, protocolo adversarial, StrictMode, fechamento em voo,
  prévia bloqueada, COW com outra peça travada e undo. **1.167 testes, zero falhas,
  168 arquivos, 69,25 s**; typecheck, Biome (530 arquivos), Vite (0,65 s) e
  diff-check passaram. Worker UV 15,44 kB; editor UV lazy 18,02/6,05 gzip.
  Sem homologação visual/GPU; build Kids anterior é do lote 77. Costuras autorais,
  abertura de superfícies curvas e ponte de animação Studio continuam pendentes.

### Lote 80: atualização parcial de UV no viewport

- Perfil CPU confirmou reconstrução de posições/normais como custo dominante
  das edições só de UV. `geometryUv` mantém recursos quando posições/arestas,
  ordem/IDs de faces, materiais e sequência de vértices são os mesmos.
- Mapeamento derivado de cantos conserva triangulação, diagonais e winding.
  Patches próprios mantêm Float32 idêntico ao builder integral sem escrever Double
  autoral. Outras mudanças e faces com diagnósticos usam reconstrução integral.
- Preparar todos os recursos antes de aplicar patches preserva atomicidade.
  Envelope de upload limitado acumula alterações até desenhar; não reter uma fila
  por gesto em aba oculta. Mesmos atributos/bounds/grupos/materiais, raycast atual,
  COW separado e descarte único ao desfazer/excluir.
- Benchmark 9.216 faces/um canto: mediana 102,302 → 5,387 ms; p95 119,384 →
  7,334 ms. Atributos recriados 1.769.472 → zero bytes, com mapeamento adicional
  de 221.184 bytes retidos. Seis hashes byte a byte preservados. Repetição também
  passou, com dispersão no caso de todos os UVs; detalhes na auditoria
  `.audits/molda-evolution/scene-uv-l80.md`. CPU local não homologa GPU/tablets.
- **1.176 testes, zero falhas, 170 arquivos, 69,50 s**; typecheck, Biome
  (534 arquivos), Vite (0,67 s) e diff-check passaram. Viewport lazy 83,56/25,66
  gzip; Three mantém aviso >500 kB. Build Kids após este lote passou: 6,8 s de
  compilação, 10,3 s de tipos, 59 páginas.

### Lote 81: abertura conectada de facetas e cortes explícitos

- `unfoldMeshUv` tenta desdobrar faces vizinhas por movimentos rígidos no plano,
  com escala métrica comum. Uma caixa pode virar uma única ilha de pintura;
  concavidades mantêm seus cantos. Posições, topologia, materiais, pixels e faces
  fora da escolha não mudam. `meshUvAutoProjection` compartilha a preparação
  métrica já verificada com o modo de faces independentes.
- Só atravessar bordas de duas faces orientadas e do mesmo material. Cortes
  explícitos impedem união também por caminhos alternativos. Sobreposição ou
  incerteza separa ilhas; no máximo 64 faces/128 triângulos por grupo de cálculo,
  sem comparação quadrática de toda a malha. Ordem de seleção não muda o resultado.
- Revalidar área, sobreposição e cortes após packing. Margem zero que fecha um
  corte é recusada. Revisão corrigiu falso positivo em bordas inclinadas: testes
  de lado preservam zero exato nos endpoints, sem normalizar eixos separadamente.
- Cortes de entrada são instruções da operação; somente UV por canto é resultado
  autoral. Não adicionar um mapa paralelo de costuras que fique incoerente após
  mudanças topológicas. Ainda não há editor de guias persistentes. Este kernel
  não relaxa ângulos nem busca o número mínimo de cortes; facetas precisam ser
  planas (faces não planas pedem triangulação explícita).
- **1.184 testes, zero falhas, 171 arquivos, 69,12 s**; typecheck, Biome
  (538 arquivos), Vite (0,88 s) e diff-check passaram. Oito testes adicionais
  incluem oráculo independente por recorte/área, superfícies de sela, ciclos,
  concavidade, Double extremo, COW/travas/undo e folha de 256 faces.
  Kernel interno ainda sem controle na UI; integração cancelável é o próximo lote.
  Não medido em GPU/tablets; build Kids anterior passou no lote 80.

### Lote 82: abertura conectada no worker e na oficina

- Escolha explícita entre faces separadas e “Desdobrar faces vizinhas”. Prévia
  continua somente leitura; método, margem e opção de cortes cancelam resultados
  anteriores. Texto distingue grupos conectados, preservação dos pixels e possível
  sobreposição com faces fora da escolha. Controles seguem tokens/alvos de 44 px.
- “Manter os cortes que já existem” deriva barreiras dos UV canônicos dentro do
  worker, somente nas faces escolhidas. A UI não calcula costuras ao alternar a
  opção. Protocolo aceita configuração/cortes próprios, recusa campos/tipos extras
  e duplicatas; resposta permanece exclusivamente UV Double com dono/revisão.
- Confirmação dos dois métodos foi exercitada na oficina com store real, revisão
  externa, fechamento, Escape, COW com outra peça travada e um único undo.
  Teste local também cobre troca de método em voo e cortes com seleção parcial.
- **1.187 testes, zero falhas, 172 arquivos, 69,12 s**; typecheck, Biome
  (540 arquivos), Vite (0,65 s) e diff-check passaram. Worker 20,82 kB; UV lazy
  18,99/6,26 gzip. Build Kids anterior é do lote 80, sem nova ativação pública.
- Medição de tarefa completa em 9.216 faces: p95 848,678 ms (885,672 ms mantendo
  cortes); maior intervalo de timer p95 60,325/53,691 ms. Há custos principais
  restantes; não prometer limite de 50 ms nem FPS/GPU. Seis casos com oráculo exato
  registrados em `.audits/molda-evolution/scene-uv-worker-l82.md`.
  Marcação individual de cortes na UI é a próxima frente.

### Lote 83: escolha visual de cortes individuais

- “Escolher onde separar” tem foco próprio: toque/clique alterna faces sobrepostas,
  campo numérico oferece alternativa de teclado e bordas são nomeadas pelos dois
  cantos. O bitmap destaca a borda e numera cantos, sem habilitar arrasto de UV.
  Seleção do 3D permanece intacta; não gerar um controle DOM por face/aresta.
- Marcar/desmarcar usa a identidade da aresta, inclusive ao escolher seu outro
  lado. Contador e limpeza distinguem marcadores da tarefa de costuras já presentes.
  Marcadores não alteram documento nem histórico; entram no worker ao preparar.
- Fonte/revisão/seleção invalidam marcadores e liberam a referência anterior.
  Painel fechado desmonta o seletor; foco é sessão. Alterar/limpar cortes cancela
  tarefa ou resultado anterior. Confirmar grava somente UV, com um undo e COW.
- **1.190 testes, zero falhas, 173 arquivos, 69,79 s**; typecheck, Biome
  (542 arquivos), Vite (0,80 s) e diff-check passaram. Três testes adicionais
  cobrem desenho real na fronteira canvas, duplicidade do mesmo corte, teclado,
  mudanças de dono, cancelamento e fluxo completo com peça compartilhada travada.
  UV lazy 21,71/6,92 gzip; worker 20,82 kB. Sem teste visual/GPU real.
- A base funcional interna de UV/pintura está implementada com os limites
  documentados. Metadados e reprodução no Estúdio dependem da base de clipes e da
  exportação hierárquica seguintes; isso não encerra a fase 5 nem suas homologações.
  Próximo lote inicia os contratos de animação da fase 6.

### Lote 84: contratos de animação e segurança das edições existentes

- Clipes opcionais no domínio interno v2, com identidade, nome, duração, fps de
  exibição, loop e trilhas TRS. Tempos/valores permanecem Double, sem snap por fps;
  quaternions autorais não são renormalizados. Interpolação de saída step/linear/
  smooth; smooth significa ease-in/out limitado, não spline. Escalas finitas
  negativas ou zero são preservadas, como nas transformações estáticas.
- `local-delta` conserva a matriz afim original e aplica TRS à direita; `local`
  admite TRS absoluto para futuros importadores, exigindo pose original TRS.
  Campo ausente permanece ausente em documentos existentes; formato público é 1.
  Reprodução/tempo ativo não são documento. Este lote ainda não desenha animação.
- Leitor estrito recusa campos desconhecidos, tempos fora de ordem/repetidos,
  rotações inválidas, trilhas duplicadas e alvos inexistentes/espelhos derivados.
  Orçamentos agregados: 64 clipes, 4.096 trilhas, 65.536 chaves, 600 s por clipe;
  limite é conferido antes de copiar as chaves excedentes. Falha retém o raw.
- Duplicar peças ou criar tubos a partir delas copia/remapeia trilhas com valores
  próprios; excluir poda apenas os alvos removidos. IDs de clipes são reservados.
  Grupos estáticos podem reorganizar animação delta; mudar ancestrais animados,
  remover grupo animado ou mover pivô animado exige conversão futura, sem perda
  silenciosa. Transformações incompatíveis com clipes absolutos falham atomicamente.
- Persistência real na fronteira IDB comprovou cópia antes do await, custo exato,
  CAS, reabertura e excluir/desfazer/refazer. Revisão incluiu comandos de caminhos,
  além de hierarquia. **1.200 testes, zero falhas, 175 arquivos, 69,38 s**;
  typecheck, Biome (549 arquivos), Vite (0,92 s) e diff-check passaram.
  Build Kids do lote 83 também passou (6,3/10,1 s, 59 páginas).
- Próximo lote: amostragem de poses independente de React/Three e sem reconstruir
  geometria/pintura por frame. Timeline, bake e exportação permanecem pendentes.

### Lote 85: amostragem de poses e desenho incremental

- Amostrador puro compila hierarquia/trilhas uma vez, faz busca binária nas chaves
  e recalcula apenas nós afetados/descendentes. Não lê geometria nem imagens;
  pose tem dono pela referência da revisão e não modifica documento/histórico.
- Vetores step/linear/smooth, rotações por SLERP no arco curto, normalização só
  na pose derivada. Interpolação evita subtração que estoure Double; componentes
  constantes preservam até MIN_VALUE. Loop não apaga tempos positivos minúsculos;
  seek sem loop pode mostrar o final exato. Canais ausentes mantêm identidade
  delta ou canal da pose original absoluta. Shear original é conservado.
- Recurso de desenho aplica apenas matrizes/instâncias, incluindo descendentes e
  espelhos. Mantém isolamento, geometria, atributos, materiais e pixels; raiz
  atualiza picking real. Todas as matrizes são conferidas antes da mudança visível.
  Pose obsoleta é ignorada e voltar à pose original não reconstrói recursos.
- **1.209 testes, zero falhas, 177 arquivos, 70,13 s**; typecheck, Biome
  (553 arquivos), Vite (0,67 s) e diff-check passaram. Viewport lazy 84,30/25,84
  gzip. Testes incluem oráculo Three, valores extremos, hierarquia com shear,
  reparent estático em vários tempos, 300 poses, picking, restauração e atomicidade.
- CPU local: amostrar+aplicar p95 0,059 ms para uma malha de 9.216 faces e
  3,547 ms para 512 nós/64.512 chaves; repetição com profiler 0,062/3,895 ms.
  Oráculo com erro máximo 1,11e-15, recursos reutilizados. Detalhes/limites em
  `.audits/molda-evolution/scene-animation-l85.md`. Não homologa GPU/tablet.
- Ainda sem controles de animação na oficina: próximos lotes acrescentam comandos,
  relógio e timeline, antes de exportação/integração com o Estúdio.

### Lote 86: comandos de clipes e chaves

- Criar/renomear/duplicar/excluir clipes; gravar chave exata, substituir no mesmo
  tempo e remover escolhas de várias trilhas atomicamente. Novos valores são
  próprios, demais chaves/trilhas ficam compartilhadas e pose original não muda.
  Duplicação confere orçamento antes da cópia; nomes e opções são estritos.
- FPS só altera a grade de exibição. Reduzir duração sem retime recusa chaves
  além do final. Retime explícito conserva curvas/valores e protege razões
  extremas e tempos subnormais. Colisões de tempos são recusadas, não fundidas.
- Inverter troca ordem das poses e curvas dos segmentos. Linear/smooth espelham
  a avaliação contínua; step continua segurando a pose à esquerda, portanto não
  equivale à reprodução temporal reversa de uma função com saltos. A futura UI
  deve explicar essa distinção, não prometer equivalência exata para step.
- Travas incluem ancestrais e descendentes afetados por trilhas de grupo.
  Exclusão em massa indexa tempos uma vez por trilha, sem busca quadrática.
  Testes cobrem limites agregados, precisão, referências, travas, atomicidade,
  roundtrip e gravação/desfazer/refazer em store real.
- **1.220 testes, zero falhas, 178 arquivos, 70,29 s**; typecheck, Biome
  (555 arquivos), Vite (0,70 s) e diff-check passaram. Os comandos ainda não
  estão expostos na oficina: seguem relógio, controles/timeline e integração.

### Lote 87: relógio de animação independente do documento

- `SceneAnimationPlayer` inicia apenas por ação explícita, tem um callback pendente
  e snapshots estáveis. Pausar captura o tempo fracionário; retomar exclui o tempo
  parado. Loop, final exato/manual, reinício e tempos Double não dependem do FPS.
- Preparação de novo clipe é atômica. Revisão pausa e conserva cursor dentro da
  nova duração; trocar criação/clipe começa em zero. Gerações invalidam callbacks
  antigos após seek, troca, interrupção de assinante e fechamento. Erros de cálculo
  ou da fronteira de desenho param a reprodução e ficam disponíveis aos controles.
- Hook de sessão pausa em blur, aba oculta e ativação de movimento reduzido;
  edição/undo refaz o dono, exclusão limpa o clipe, desmontagem libera fonte/pose.
  Falha de composição após revisão não mantém o dono anterior nem some sem erro.
  Relógio injetável é compartilhado com flipbook, sem alterar sua reprodução.
- **1.229 testes, zero falhas, 180 arquivos, 70,10 s**; typecheck, Biome
  (560 arquivos), Vite (0,70 s) e diff-check passaram. Nove testes novos cobrem
  relógio, precisão, erros, revisão, StrictMode, movimento reduzido e ausência de
  entradas de histórico durante reprodução. Próximo lote conecta a oficina;
  controles de animação ainda não estão visíveis ao usuário neste lote.

### Lote 88: reprodução ligada ao viewport e limites locais reutilizados

- Canvas assina poses diretamente, sem reenviar documento ou reconstruir recursos
  por frame. Contexto perdido e desmontagem pausam o relógio; revisões incompatíveis
  são ignoradas. Erro de desenho interrompe e aparece; seek válido recupera sem
  remontar o viewport. Oficina já possui o player, ainda sem controles visíveis.
- Viewport usa matrizes de pose para seleção, pivô, enquadramento e restauração;
  valida também transformações de helpers/locators. Durante prévia, gestos de
  modelagem/pintura ficam desabilitados, inclusive após blur/restauração de contexto.
  Poses com as mesmas matrizes não solicitam novo desenho.
- Limites locais têm cache por índice de geometria/revisão. Cálculo de bounds
  conserva o resultado anterior e dispensa leituras de vértices na reprodução;
  cache de outra revisão é recusado e descarte libera referências.
- **1.234 testes, zero falhas, 182 arquivos, 70,58 s**; typecheck, Biome
  (562 arquivos), Vite (0,67 s) e diff-check passaram. Viewport lazy 85,22/26,05
  gzip; playground 139,00/43,02 gzip. Cinco testes novos cobrem equivalência dos
  limites, helpers/câmera, navegação, guardas e fronteira React sem updates integrais.
- Bounds na malha de 9.216 faces: p95 1,640 → 0,024 ms. Peças pequenas não tiveram
  ganho consistente; p99 do cache chegou a 6,203 ms em uma execução. Evidências,
  repetição e limitações em `.audits/molda-evolution/scene-animation-l88.md`.
  Próximo lote expõe clipes e timeline; homologação visual/GPU continua aberta.

### Lote 89: modo Animar, clipes e gravação explícita na oficina

- Modelar/Animar separam ferramentas sem duplicar documento ou viewport. Animar
  carrega controles de clipes, timeline e inspetor sob demanda; mantém câmera,
  seleção e hierarquia, mas retira edição/destruição do modelo, inclusive Delete.
  Seleção, comandos, Escape e saída pausam. A reprodução não grava no histórico.
- Criar/copiar/renomear/excluir clipes; reproduzir/pausar e navegar início/fim/chaves
  escolhidas ou tempo exato. Inspetor grava/remove TRS por canal, explica curvas,
  tamanho relativo e voltas completas; respeita travas. Duração/retime/fps/loop e
  inversão confirmam em um undo. A ressalva de step fica visível na interface.
- Campos mantêm precisão Double. Ângulos de leitura são amigáveis, mas gravar sem
  editar conserva o quaternion original, inclusive componentes de precisão não
  exibida. Revisões invalidam rascunhos; o botão de gravação conserva foco após commit.
- Revisão corrigiu nomes de controles e retenção de rascunho ao trocar clipe/tempo.
  Testes de clique usam decimais comuns: o `badInput` do happy-dom 20.10.2 rejeita
  notação exponencial. Subnormais seguem cobertos diretamente no parser de formulário,
  comandos e codecs, sem alterar a validação do produto por causa do simulador.
- **1.240 testes, zero falhas, 183 arquivos, 70,82 s**; typecheck, Biome
  (567 arquivos), Vite (1,07 s) e diff-check passaram. Seis testes novos verificam
  fluxos reais com store/StrictMode, precisão, um undo, foco, travas e CRUD.
  Chunks lazy: clipes 2,87/1,09 kB gzip, timeline 2,82/1,18, inspetor 5,85/1,80.
  Kids também foi verificado no fechamento do lote 88: compilação 6,1 s,
  tipos 8,4 s, 59 páginas. Sem homologação visual/GPU/toque; timeline ainda não
  desenha faixas de chaves, e edição visual/autokey/poses/exportação seguem abertas.

### Lote 90: faixas visuais e edição de conjuntos de chaves

- Timeline mostra três faixas por tipo de movimento nas peças escolhidas. Clique
  vai à chave exata mais próxima; setas/Home/End navegam sem snap. Marcas próximas
  podem compartilhar pixels, mas tempos originais continuam acessíveis pelo teclado
  e campo numérico. Cursor é separado do bitmap, que não repinta a cada frame.
- Conjuntos por intervalo inclusivo/tipo/peças selecionadas podem ser movidos,
  copiados ou excluídos. Colisões, limites de duração, travas, referências antigas
  e deslocamentos perdidos na precisão Double recusam a operação inteira. Mover
  permite ocupar tempos desocupados pelo mesmo conjunto; copiar possui os valores.
- Campos avançados só montam ao abrir. Revisão/clipe/seleção invalidam e fecham o
  rascunho, evitando reaplicar referências antigas. Um comando produz um undo.
  Índice de seleção compartilhado com exclusão evita buscas repetidas por chave;
  orçamento de cópia é conferido antes de ler valores excedentes.
- **1.248 testes, zero falhas, 185 arquivos, 71,09 s**; typecheck, Biome
  (572 arquivos), Vite (0,67 s) e diff-check passaram. Oito testes novos cobrem
  domínio/histórico, conflitos, orçamento antes da cópia, navegação e oficina real.
  Com 65.536 chaves, a faixa mantém menos de dez nós DOM e no máximo 1.013 marcas;
  120 mudanças do cursor não repintam o bitmap. Isso não é medição de GPU/browser.
  Timeline lazy 9,42/3,10 kB gzip. Gestos/autokey/poses e exportação continuam abertos.

### Lote 91: poses locais reutilizáveis e gravação em lote

- Copiar uma pose conserva valores próprios sem reter criação/geometria/imagens.
  Colar grava TRS no tempo exato, nos nós-raiz da seleção, com um undo para todos
  os canais; curvas já existentes no destino permanecem. Espelhamento local X/Y/Z
  corresponde a reflexão conjugada da matriz, preserva escala e não altera a cópia.
  UI explica substituição, grupos e diferença entre eixo local e lado do personagem.
- Cópia de chave exata conserva quaternion original; amostra entre chaves é derivada.
  Poses absolutas usam canais de repouso ausentes e não se convertem silenciosamente
  em deltas. Travas herdadas e limites continuam atômicos. Clipboard é de sessão.
- Gravação de uma chave e de poses compartilham a mesma fronteira de lote. Contexto
  centraliza validação, travas e substituição de clipe; orçamentos são conferidos
  antes de ler/copiar os valores excedentes. Entradas repetidas são recusadas.
- Revisão cruzada encontrou callback `seek` sem vínculo ao player na faixa do
  lote 90. Método agora tem identidade vinculada; teste reproduziu a falha anterior
  e passou com a correção, além da navegação real na oficina com teclado.
- **1.258 testes, zero falhas, 186 arquivos, 72,17 s**; typecheck, Biome
  (578 arquivos), Vite (0,76 s) e diff-check passaram. Dez testes adicionais
  cobrem reflexão por oráculo Three, clipboard, precisão, orçamento e regressão.
- CPU: gravação de 384 chaves em 128 peças, p95 sequencial 344,041 ms versus
  lote 2,907 ms; malha de 9.216 faces/3 chaves, 24,367 versus 9,402 ms. JSON igual,
  recursos intactos; repetição com profiler confirma o sentido. Controle sequencial
  usa código atual, não uma medição histórica. Evidências/limites em
  `.audits/molda-evolution/scene-animation-pose-l91.md`. Não mede React/GPU/histórico.
  Presets com prévia, gestos/autokey e integração hierárquica seguem abertos.

### Lote 92: movimentos prontos com prévia somente de sessão

- Pular, balançar e girar geram clipes independentes, com chaves normais editáveis.
  Nome, eixo, duração e intensidade são explícitos. Giro usa voltas inteiras e
  chaves intermediárias, incluindo sentido negativo; balanço limita a inclinação
  a 90 graus por lado. Raízes escolhidas conduzem seus descendentes. Custos/travas
  são conferidos antes de gerar as chaves; tempos que colidam por precisão são recusados.
- Compilador aceita uma prévia explícita de clipe, com cópia/validação das chaves
  e referência exata ao documento dono da geometria. Player usa o viewport atual,
  sem substituir o asset, reenviar geometria, gravar autosave ou criar histórico.
  Preparar não inicia reprodução; cancelar restaura o clipe/cursor anterior pausado.
- Parâmetros, seleção, clipe, revisão, Escape, blur/ocultação, contexto perdido e
  desmontagem descartam a prévia. Confirmar exige dono ainda válido e cria um
  único undo. Fonte temporária não oferece edição de chaves antes de confirmação.
  Restauração não avança outro clipe escolhido por uma notificação reentrante.
- **1.270 testes, zero falhas, 187 arquivos, 72,95 s**; typecheck, Biome
  (582 arquivos), Vite (0,73 s) e diff-check passaram. Doze testes novos verificam
  matrizes de giros por oráculo Three, equivalência prévia/clipe salvo, orçamento,
  precisão, retorno de sessão, interrupções e confirmação real pela oficina.
  Build Kids passou: 7,3 s de compilação, 10,6 s de tipos, 59 páginas, geração
  estática em 1,095 s. Clipes/presets lazy 10,72/3,19 kB gzip; viewport 85,26/26,07.
  Não homologa GPU/navegador/crianças. Edição por gestos/autokey e exportação
  hierárquica permanecem como próximas frentes da fase 6.

### Lote 93: alças de poses, prévia independente e gravação opcional

- Mover, girar e mudar tamanho em Animar ajustam uma pose de sessão, sem tocar
  forma original, substituir documento, gravar autosave ou gerar histórico durante
  o arrasto. Gravar pose confirma os canais alterados em um undo. Gravação ao soltar
  é opt-in, desativada inicialmente; ativá-la não confirma uma prévia pendente.
- Preparação captura hierarquia, coordenadas, canais e curvas uma vez por ajuste.
  Atualizações seguintes não percorrem geometria/imagens/arrays de chaves. Raízes
  selecionadas movem seus descendentes uma única vez. Translação/escala uniforme
  conservam quaternion autoral exato; rotação/escala não uniforme validam TRS
  derivado, sinais e recomposição, recusando shear em vez de distorcer a forma.
- Seleção, tempo, clipe, fonte, blur/ocultação, Escape, contexto perdido e saída
  cancelam a prévia geral; cancelar somente o arrasto restaura a prévia anterior.
  Pintura/componentes continuam desabilitados na pose. Campos originais não fingem
  representar um ajuste ainda não gravado. Controles mantêm foco e alvos de 44px.
- Revisão corrigiu dois problemas com testes reproduzindo a falha antes da correção:
  evento de fim atrasado após desmontagem não pode confirmar ações de outra
  instância; atualização só de miniatura também exige renovar o objeto dono da
  pose/clipe. Cursor é preservado pausado, sem histórico; prévia temporária é descartada.
  Teste antigo que proibia Mover em Animar passou a verificar a nova disponibilidade.
- **1.296 testes, zero falhas, 190 arquivos, 74,28 s**; typecheck, Biome
  (591 arquivos), Vite (0,99 s) e diff-check passaram. Vinte e seis testes novos
  cobrem matemática/oráculo Three, curvas/quaternion exatos, limites, ausência
  de leituras por frame, controlador, alças reais com fronteira WebGL substituída,
  gravação/undo, StrictMode, interrupções e notificações reentrantes.
- CPU: prévia preparada + recurso p95 **0,159 / 0,906 / 6,014 ms** contra
  **12,170 / 5,677 / 21,387 ms** do controle comando/recompilação/recurso, para
  1 mesh com 9.216 faces, 128 nós e 512 nós/65.536 chaves. Matrizes idênticas e
  recursos reutilizados. Repetição com profiler e ressalvas em
  `.audits/molda-evolution/scene-animation-gesture-l93-results.md`.
  Não mede React, bounds/helpers, GPU, dispositivos reais ou usabilidade infantil.
  Viewport 85,47/26,11 kB gzip; chunk Three segue acima de 500 kB. Último build
  Kids continua sendo o do lote 92. Exportação hierárquica e integração seguem abertas.

### Lote 94: hierarquia portátil e matrizes afins na exportação

- A preparação de nós GLB separa base autoral e delta animado, mantendo alvos
  distintos para clipes locais absolutos e relativos. Filhos e vínculos de malha
  se ligam à folha certa. Grupos/locators permanecem na hierarquia; ocultos e seus
  espelhos são excluídos com lista explícita de nós, enquanto travas não excluem objetos.
- Pela [especificação glTF](https://registry.khronos.org/glTF/specs/2.0/glTF-2.0.html#transformations),
  um nó não pode carregar shear em sua matriz. A camada de exportação fatora a
  matriz afim em **dois TRS derivados**, sem reescrever o documento. Jacobi trabalha
  nas colunas, limitado a 32 varreduras; sinais/postos singulares são tratados e a
  recomposição é conferida por coluna (tolerância 1e-12, não igualdade bit a bit).
  Casos não representáveis com essa precisão falham explicitamente.
- Espelhos reutilizam vínculos de malha, clonando apenas caminhos necessários de
  ancestrais sob uma reflexão de mundo. Mesmo plano compartilha ancestrais; arrays
  de transformação são próprios por instância. Um ancestral que é malha não ganha
  cópia visual por engano. Expansão tem orçamento próprio de 16.384 nós, conferido
  antes de fatorar/compor imagens/criar buffers. Helper de quaternion foi extraído
  das alças existentes para evitar duplicar a matemática.
- **1.307 testes, zero falhas, 192 arquivos, 73,63 s**; typecheck, Biome
  (597 arquivos), Vite (0,74 s) e diff-check passaram. Onze testes novos incluem
  500 produtos afins determinísticos com oráculo Three e carregamento glTF real
  para hierarquia, espelhos, locators, alvos locais/delta e ancestrais animados.
  Fixtures foram corrigidas para declarar espelho e TRS absoluto explicitamente:
  agrupar preserva mundo como matriz afim, não transforma automaticamente em TRS.
- Baseline CPU de preparação: p95 **0,132 / 3,242 / 13,253 ms**, para uma peça,
  128 peças e 448 grupos + 64 peças + 64 espelhos no mesmo plano. O último gera
  2.049 nós, com JSON determinístico. Repetição/perfil e limites em
  `.audits/molda-evolution/scene-glb-hierarchy-l94-results.md`.
  Esta entrega **ainda não é o exportador GLB completo**: geometria, imagens,
  clipes binários, container, interface e ponte Studio são os próximos incrementos.
  Sem homologação GPU/navegador; último build Kids segue sendo o do lote 92.

### Lote 95: GLB binário, geometria compartilhada e materiais

- Escritor interno `encodeSceneGlb` conecta a hierarquia do lote 94 a geometria
  local, materiais por face e imagens embutidas. Espelhos e instâncias compartilham
  malhas; variantes de material compartilham acessores de atributos/índices.
  Grupos e locators não viram triângulos. Cenas vazias usam GLB somente JSON.
- Container comum ao escritor legado/nativo, sem buffer BIN intermediário.
  Comparação em execução com o escritor original do HEAD: **3.712 bytes idênticos**,
  SHA-256 `56eede6fef152719a8309f3ff9dca2bc46e929beb8f8cc81e03be0dc180c4cdf`.
  GLB nativo limitado a 32 MiB; pixels derivados têm orçamento separado de 32 MiB,
  conferido antes da composição de cada textura. Não é o teto de importação Studio.
- Conversão respeita cor-base sob pintura, sRGB/linear, alfa, acabamento, relevo
  com força/inversão Y e mapas G/B empacotados. Tamanhos distintos usam ampliação
  inteira para o mínimo múltiplo comum, conservando fronteiras NEAREST; acima
  de 1.024 por eixo a combinação é recusada. PNG mantém primeira linha em V=0,
  como o DataTexture nativo. Referência: [materiais e imagens glTF](https://github.com/KhronosGroup/glTF/blob/main/specification/2.0/Specification.adoc).
- Relatório tipado, sem referência ao documento: ocultos, faces não desenháveis,
  pontos/arestas soltos e primeiro quadro de flipbook. Por padrão qualquer perda
  recusa a saída; aceitar é explícito. Mapas de relevo também relatam dependência
  de tangentes calculadas pelo aplicativo: o renderizador nativo usa derivadas,
  e inventar tangentes exportadas mudaria esse contrato. O aviso correspondente
  do validador é conferido exatamente, não silenciado.
- Validador oficial Khronos `gltf-validator@2.0.0-dev.3.10` adicionado apenas como
  dependência de desenvolvimento; declaração mínima mantém relatório `unknown`
  até leitura validada. Sete testes novos verificam container, Three real sem GPU,
  PNG pelo sharp, compartilhamento, alfa/canais, relatório, imutabilidade e tetos.
  Fixtures sem relevo: zero erros/avisos. Fixture com relevo: zero erros e um aviso
  de tangent space, exposto no relatório. Não comprova aparência em GPU/browser.
- **1.314 testes, zero falhas, 193 arquivos, 75,30 s**; typecheck, Biome
  (606 arquivos), Vite (0,801 s), diff-check e build Kids passaram (11,4 s de
  compilação, 11,8 s de tipos, 59 páginas, geração estática 599 ms).
  Chunk Three mantém aviso >500 kB. Clipes ainda são recusados explicitamente,
  mesmo com aceite de perdas; próximo lote implementa sua serialização.
  Não há botão novo, worker de exportação ou ativação pública nesta entrega.

### Lote 96: clipes portáteis e reprodução independente do GLB

- `prepareSceneGlbAnimations` grava canais locais/delta nos alvos da hierarquia;
  espelhos compartilham samplers binários e replicam só referências de canais.
  Clipes mantêm nome, duração de reprodução e metadados Molda de fps/loop/espaço.
  Holds no início/final preservam duração mesmo quando a última chave vem antes.
  Clipes vazios ou sem alvos visíveis são relatados, não viram animações inválidas.
- STEP e LINEAR saem diretamente; vetores com smooth/linear usam CUBICSPLINE
  com derivadas por segmento. Quaternion smooth e STEP misturado a outras curvas
  exigem amostragem e aceite de perda. Limite analítico pré-Float32: 0,1 grau
  de rotação ou 1/1024 da excursão vetorial. Salto misto vira transição no último
  intervalo Float32 antes da chave, com teste que demonstra a diferença.
  Não afirmar equivalência exata nessas conversões. Referência: [animações glTF](https://github.com/KhronosGroup/glTF/blob/main/specification/2.0/Specification.adoc#animations).
- Tempos precisam continuar distintos e ordenados após Float32; colisões,
  amostras sem espaço, duração/valores/tangentes não representáveis são recusados.
  Fonte Double permanece intacta. Expansão tem tetos próprios: 262.144 chaves
  derivadas e 65.536 canais, além dos limites de nós/binário/pixels anteriores.
- **1.323 testes, zero falhas, 194 arquivos, 74,89 s**; typecheck, Biome
  (610 arquivos), Vite (0,969 s) e diff-check passaram. Nove testes novos cobrem
  validador Khronos, GLTFLoader/AnimationMixer reais, 801 amostras de rotação,
  espelhos/ancestrais, troca entre clipes locais/delta, holds, limites e duas
  cópias com cursores independentes. São testes CPU, não homologação do Studio.
- Baseline do encoder completo: p95 **0,362 / 140,028 / 81,484 ms** para peça
  simples, 9.216 faces e 128 peças/65.536 chaves/pintura 512² compartilhada.
  Bytes determinísticos, perfil e limites em
  `.audits/molda-evolution/scene-glb-l96-results.md`. As duas cenas maiores excedem
  50 ms: exportação precisa de worker cancelável antes de entrar na interface.
  Último build Kids continua o do lote 95; Three mantém aviso de chunk >500 kB.
  Formato público, nuvem e ponte Studio não foram ativados.

### Lote 97: exportação cancelável e revisão da cópia na oficina

- A oficina interna agora oferece **Exportar GLB → Preparar → Conferir → Baixar**.
  Abertura cancela gestos/prévias não gravadas e pausa os players. O modal mantém
  foco/teclado e devolve foco ao acionador; o projeto JSON continua separado.
  Cópia em português, alvos de 44 px, tokens/temas e componentes existentes.
- Encoder executa em worker sob demanda, com progresso de conferência/preparação,
  leitura estrita do documento e token de id/revisão. Somente o buffer binário
  derivado é transferido; resposta valida envelope, limites e container sem
  recopiá-lo. O envelope escolhe campos explicitamente para não anexar o documento.
  O leitor de transporte não substitui a validação Khronos dos testes.
- `useSceneGlbExport` mantém bytes/consentimento exclusivamente na sessão. Mudança
  de conteúdo, troca de editor, blur, ocultação, cancelamento e unmount invalidam
  resultado e callbacks capturados. Miniaturas/estado de salvamento não invalidam
  conteúdo GLB. Nenhum download automático, commit, undo ou escrita de persistência.
  Erro de download preserva o relatório para uma nova tentativa explícita.
- Avisos são agrupados por código em no máximo sete linhas, sem DOM por face/chave.
  Qualquer aviso exige confirmação desmarcada por padrão. Nova preparação e
  revogação do aceite tornam inválidas confirmações antigas. Teste com 400 faces
  degeneradas comprova uma linha de aviso e preservação da fonte.
- Revisão corrigiu o envelope de resposta e o `name` do checkbox apontado pelo
  contrato de acessibilidade. **1.339 testes, zero falhas, 197 arquivos, 77,05 s**;
  typecheck, Biome (618 arquivos), Vite (2,51 s), diff-check e Kids passaram
  (9,0 s compilação, 11,1 s tipos, 59 páginas, 634 ms geração estática).
  Vite emitiu `sceneGlb.worker` separado (62,15 kB); mensagens exclusivas do encoder
  aparecem só nesse artefato. Three mantém aviso de chunk >500 kB.
- Revisão visual não executada: a conexão do navegador retornou indisponível,
  descoberta retornou lista vazia, e a orientação de recuperação foi consultada.
  Sem substituição por outro backend. Medição de clone/retorno, GPU/toque e
  homologação infantil continuam pendentes; formato público e nuvem não ativados.

### Lote 98: baseline de transporte da exportação

- Fixture determinística compartilhada entre benchmarks CPU/worker; extração
  preserva os três hashes do lote 96. Acrescentado cenário no teto de 32 MiB
  autorais: oito camadas 1024², 128 partes e 65.536 chaves. Fonte original,
  bytes exportados, estatísticas e avisos idênticos após todas as execuções.
- `bench-scene-glb-worker` mede total, construção/envio síncronos, timer e leitura
  isolada do retorno, com três aquecimentos/vinte amostras. Envio p95:
  **0,103 / 43,994 / 55,805 / 75,075 ms** para simples, 9.216 faces, muitas chaves
  e teto de pixels. Os dois últimos superam 50 ms antes de o worker calcular.
  Perfil atribui maior self-time a `postMessage`; asserções do harness também
  entram no perfil e não são custo da UI. Evidências, hashes e oportunidade
  pontuada em `.audits/molda-evolution/scene-glb-worker-l98-results.md`.
- Revisão: fixture validada, relógio inclui retorno, oráculos fora do tempo,
  bytes autorais não transferidos e nenhuma mudança no encoder. Não tratar timer
  Windows/Bun como input delay, frame ou prova de hardware/browser infantil.
  Próxima alavanca: transporte privado Float64 das chaves, preservando o domínio.
- **1.339 testes, zero falhas, 197 arquivos, 76,12 s**; typecheck e Biome (620
  arquivos) passaram. Vite/Kids permanecem verificados no lote 97; este lote só
  altera fixtures/benchmarks. Navegador/Studio/rollout continuam pendentes.

### Lote 99: transporte compacto de chaves, sem alterar o documento

- Pedido privado de worker empacota apenas chaves em Float64 e códigos de curva;
  metadados/ordem e valores Double autorais permanecem exatos. Geometria e pixels
  mantêm structured clone, sem transferir buffers do documento. O worker reconstrói
  e executa o leitor nativo estrito antes de exportar. Persistência, curvas e
  encoder não mudaram; ausência de animações difere de uma lista explícita vazia.
- Limites agregados são conferidos antes de alocar os buffers/arrays derivados.
  Transporte recusa versões/campos extras, representações duplicadas, subviews,
  comprimentos/códigos inválidos e coerção de strings. Revisão encontrou campos
  reservados que poderiam encobrir campos extras na fonte; regressão reproduzida
  antes da correção e depois verde.
- Trabalho síncrono p95, **incluindo empacotamento**, caiu de 58,097 para
  **13,102 ms** no cenário de 65.536 chaves e de 73,063 para **37,343 ms** com
  32 MiB de pixels. Quatro GLBs permanecem byte-idênticos aos oráculos anteriores.
  Repetição com perfil confirma a redução; auditoria completa em
  `.audits/molda-evolution/scene-glb-worker-l99-results.md`.
- Não afirmar redução universal do tempo total: no cenário de 32 MiB seu p95
  oscilou de 498,292 para 511,780 ms. Geometria/pixels ainda custam clone;
  timer p95 da geometria chegou a 50,947 ms na repetição. Medição Windows/Bun
  não homologa input delay, GPU, tablets ou Chromebooks.
- **1.345 testes, zero falhas, 198 arquivos, 78,76 s**; typecheck, Biome (622
  arquivos), Vite (1,16 s) e diff-check passaram. Worker separado de 63,79 kB;
  aviso Three >500 kB permanece. Último Kids: lote 97. Browser indisponível,
  integração Studio e ativação pública continuam pendentes.

### Lote 100: conferir o destino antes de levar o GLB ao Estúdio

- A revisão da exportação ganhou uma seção expansível de compatibilidade com
  o Estúdio: limite de arquivo, malhas carregadas, triângulos, materiais e grupos
  de desenho. Cena sem peças visíveis recebe aviso próprio. Não bloqueia a cópia
  GLB portátil, concede consentimento de perdas nem simplifica o original.
- Custo deriva das estatísticas já preparadas: não parseia o GLB, aloca base64,
  percorre pixels ou retém outra cópia do documento na UI. O teto de arquivo
  inclui o prefixo MIME e o padding exato do base64. Os limites espelhados dos
  dois runtimes Studio são conferidos por teste que lê os arquivos do monorepo,
  sem import entre os pacotes.
- GLTFLoader real comprovou a diferença entre definição e custo: 24 peças com
  dois materiais são **48 malhas**, não uma; 25 peças viram **50** e excedem o
  teto atual. Testes cobrem os tetos exatos/estouros, arquivo, fonte preservada,
  apresentação do aviso e botão de download independente da compatibilidade.
- Texto explica que clipes exigem atualmente Jogo 3D Avançado; o básico mostra
  o modelo parado. O aviso vale para uma cópia, não promete desempenho do jogo
  inteiro. A oficina continua sem conexão pública com Trazer do Molda.
- **1.351 testes, zero falhas, 199 arquivos, 99,24 s**; typecheck, Biome (625
  arquivos), Vite (1,09 s), diff-check e Kids passaram (8,7 s compilação,
  12,6 s tipos, 59 páginas, 727 ms geração). Build Kids ocorreu em paralelo à
  suíte, portanto sua duração não é benchmark comparável aos lotes anteriores.
  Avisos de WebGL indisponível/act no harness e chunk Three >500 kB permanecem.
  Browser, reprodução dentro do Studio e homologação de dispositivos continuam
  pendentes; esta entrega não ativa o documento novo no host/nuvem.

### Lote 101: GLB do Molda dentro do runtime Studio

- Fixture portátil produzida pelo encoder nativo, com grupo afim/shear,
  articulação, espelho e clipes locais/delta. Studio consome só JSON/base64,
  sem importar Molda. Poses de referência vêm do domínio nativo, não de Three.
  Teste no produtor compara todo o artefato e valida o GLB com Khronos;
  o script imprime a fixture, sem sobrescrever arquivos automaticamente.
- Runtime Studio real, GLTFLoader, SkeletonUtils e AnimationMixer comprovam
  poses independentes em duas entidades, troca entre espaços dos clipes,
  parada/restauração, pausa por Escape e retomada. Matrizes lidas após o render,
  sem atualização forçada que pudesse ocultar transformação congelada.
- Reciclagem reaproveita recursos com handle novo; comandos do handle morto não
  animam a nova vida. Geometria/material compartilhados são liberados uma vez,
  inclusive com teardown repetido. Os testes novos não exigiram alteração de
  runtime. A primeira sonda usava o nome da tela `pausa` como estado: corrigida
  para a entrada real por Escape, que aciona `pausado`.
- **1.352 testes Molda/200 arquivos, zero falhas, 90,17 s** e **7.938 testes
  Studio/502 arquivos, zero falhas, 134,37 s**; typecheck dos dois pacotes,
  Biome e diff-check passaram. Formatter do JSON foi aplicado e a igualdade
  com o produtor/Khronos foi conferida de novo. Últimos Vite/Kids: lote 100.
  Warnings de cenários negativos/iframe bloqueado do harness não representam
  homologação de browser. Só a fronteira GPU é simulada nestes testes.
- Não comprova aparência, CSP, perfil de dispositivo ou ponte pública. No básico
  os clipes continuam sem reprodução. Próxima lacuna: clipes nativos podem ter
  nomes iguais, enquanto o bloco Studio escolhe por nome e alcança só o primeiro.

### Lote 102: nomes de movimentos utilizáveis no Estúdio

- Clipes realmente exportados recebem nomes únicos, estáveis e com até 128 unidades
  UTF-16, sem cortar um par substituto. Nomes originais já únicos permanecem iguais;
  sufixos não roubam um nome original posterior. Clipes omitidos não consomem nomes.
  A mudança existe só no GLB, inclui proveniência e exige consentimento explícito.
- Worker devolve manifesto pequeno com identidade, nome exportado, duração, fps e
  repetição autoral. Leitor recusa campos extras, limites inválidos, identidades/nomes
  repetidos e divergência da contagem. Não relê o JSON binário nem clona a fonte na UI.
  Painel expansível lista os movimentos presentes e explica que o bloco escolhe o loop.
- Revisão encontrou falha no trap de foco do Dialog: faltavam os títulos de details
  e controles de seções fechadas podiam entrar no ciclo. Dois testes reproduziram
  a falha antes da correção e passaram depois, incluindo details aninhado.
- Suíte inicial encontrou uma fixture de transformação com nomes duplicados; recebeu
  nomes distintos para manter esse teste sem perdas, enquanto testes próprios cobrem
  o novo aviso. Khronos, GLTFLoader real, 64 clipes, Unicode, fonte intacta, manifesto
  hostil e revogação do aceite passaram. Fixture real do Studio segue byte-idêntica.
- **1.359 testes, zero falhas, 202 arquivos, 100,02 s**; typecheck, Biome (618 arquivos),
  Vite (0,89 s), diff-check e Kids passaram (9,1 s compilação, 12,9 s tipos, 59 páginas,
  1.038 ms geração estática). Suíte e Kids executaram em paralelo: duração não é
  benchmark. Worker GLB de 64,32 kB; aviso Three >500 kB permanece.
- Browser indisponível; não equivale a homologação visual/teclado em navegador real.
  Formato público/nuvem não ativados. Runtime básico permanece estático; avançado
  foi exercitado no lote 101. Fase 6 mantém pendências de integração/homologação.

### Lote 103: núcleo de vínculos e pesos

- Contrato interno de vínculos: malha explícita, grupos/locators como juntas e pesos
  por id de vértice. Até quatro influências, 256 juntas por vínculo, 128 vínculos e
  131.072 pontos vinculados agregados, contando cada instância de geometria compartilhada.
  Leitor estrito possui seus dados e preserva a matriz/Double recebidos; recusa referências
  ausentes/duplicadas, malha vazia, campos extras, pesos não normalizados e matrizes
  de bind não invertíveis. Tolerância de soma 1e-8 não recalcula os pesos.
- Bind explícito captura inverse(junta mundo) × malha mundo sem decompor shear.
  Normalização separada escala antes de somar para suportar extremos Double; não
  inventa osso para pesos zerados, corta uma quinta influência nem apaga peso positivo
  por underflow. A fonte original permanece intacta.
- Preparação produz arrays próprios de posições/pesos Float64 e índices Uint16;
  amostras usam uma paleta por junta e não releem o documento/pixels. Deformador CPU
  é referência/bake, não proposta de reconstruir geometria no loop visual.
- Three SkinnedMesh/Skeleton reais, com hierarquia e inversas calculadas de forma
  independente, concordam em 121 poses com shear/reflexo e escala de junta passando
  por zero/negativa. Timeline local-delta existente também alimenta a deformação.
  Testes cobrem repouso, ownership, slots 255/zero, orçamento agregado e ids especiais.
- Primeira suíte teve um timeout no teste legado de ressincronização HDR (1.485 ms).
  Três repetições isoladas passaram em 532/421/406 ms, sem alterar código/timeout.
  Nova suíte completa, sem build concorrente: **1.371 testes, zero falhas, 205 arquivos,
  84,88 s**. Typecheck, Biome (626 arquivos) e diff-check passaram. Últimos Vite/Kids:
  lote 102. O timeout inicial permanece registrado, não foi classificado como bug corrigido.
- Núcleo ainda não é campo do documento nem recurso público. Persistência, comandos,
  viewport, exportação skin, IK e homologação continuam pendentes. Sem prova de GPU/browser.

### Lote 104: recursos de desenho deformável

- `skinDraw` expande pesos pelos cantos já emitidos pelo triangulador; faces omitidas
  e pontos soltos não entram no desenho. Recusa mapeamento de outra malha e influência
  positiva que desapareceria em Float32, sem alterar o valor Double autoral.
- Limites espaciais por agrupamento de pontos influenciados: custo por junta, não
  por vértice/quadro. Margem cobre erro de soma dos pesos e aritmética Float32, inclusive
  cancelamento de termos grandes; poses com risco de overflow são recusadas antes
  da atualização. Teste compara 151 poses com aritmética Float32 simulada em CPU.
- `SceneSkinResource` usa Skeleton/SkinnedMesh reais com bind destacado e paleta
  local calculada pelo domínio. Uma geometria própria por vínculo, compartilhável
  por seus espelhos; outra instância de recurso tem geometria/esqueleto independentes.
  Base não empresta atributos descartáveis. Materiais continuam sendo do chamador.
- Em 121 poses, atributos/arrays/versões, geometria e buffers de esqueleto mantêm
  identidade. Bounds cobrem os vértices deformados; raycast real encontra a malha
  e seus UVs. Pose inválida não muda ossos/bounds vivos. Liberação repetida descarta
  geometria e textura de ossos uma vez, sem descartar base/material; cópias têm teto.
- Revisão apertou o contrato da geometria-base (buffers/cantos exatos, não apenas
  quantidade), margem numérica e referências opcionais reportadas pelo TypeScript.
  **1.379 testes, zero falhas, 207 arquivos, 93,21 s**; typecheck, Biome (630 arquivos)
  e diff-check passaram. Últimos Vite/Kids: lote 102, pois o recurso ainda é interno
  e não está conectado ao editor. Testes CPU não comprovam GPU nem velocidade de frame.

### Lote 105: vínculos no documento e nos comandos

- Campo opcional `skins` no documento nativo interno, com leitura estrutural separada
  do índice de referências/custos. Ausência e lista vazia continuam distintas;
  leitura/JSON não recalculam bind nem normalizam pesos. Formato público permanece 1.
- Vincular, desvincular, renomear, editar pesos e recapturar a pose-base são comandos
  atômicos. Normalização é opt-in; no-op conserva a revisão, pesos intocados continuam
  compartilhados e travas herdadas da peça protegem seu vínculo sem editar ossos.
- Duplicação remapeia ossos copiados e conserva referências externas explícitas.
  Apagar a peça remove seu vínculo; apagar osso ainda usado, mudar pivô vinculado ou
  deixar pontos sem pesos recusa a operação. Malhas com geometria compartilhada
  mantêm pesos independentes por instância.
- Revisão/testes: dados próprios no codec e IndexedDB, custos incluindo skin, quota/CAS
  sem escrita parcial, cinco comandos com undo/redo exato, poses-base, cópia parcial
  e completa, referências/travas e pureza sem Three/React no domínio.
- Desenho e GLB recusam temporariamente skin com mensagem explícita, inclusive com
  aceite de perdas, para não exibir/exportar a malha sem seu vínculo. Integração
  visual e exportação deformável seguem nos próximos lotes; não há migração pública.
- Verificação: **1.389 testes, zero falhas, 208 arquivos, 91,55 s**; typecheck e
  Biome (635 arquivos) passaram. Últimos builds Vite/Kids: lote 102.

### Lote 106: deformação no palco

- `SceneRenderResource` desenha os vínculos nativos com SkinnedMesh, usando a timeline
  existente. Compilação recebe dados já indexados, sem reindexar todos os vínculos
  para cada peça. Pose prepara todas as paletas/bounds antes de alterar a cena;
  falha posterior conserva o quadro anterior e descarta recursos novos não adotados.
- Espelhos compartilham a deformação local; duas instâncias do editor e dois vínculos
  na mesma geometria mantêm esqueletos próprios. Edição de pesos troca só recursos
  afetados; desvincular volta à malha comum. Remoção/descarte não libera recursos alheios.
- UV incremental aplica o mesmo patch a atributos próprios de cada skin, conservando
  um envelope de upload. Renomear vínculo, mover juntas e pintar não refaz atributos.
  Testes incluem UV compartilhado e troca simultânea de UV/pesos, picking real,
  121 poses, independência, undo e invalidação de poses preparadas após outro instante.
- Guarda de desenho removida; GLB ainda recusa skins explicitamente. Na revisão,
  enquadramento usa limites da forma-base e consultas auxiliares ainda precisam
  acompanhar a deformação. Resolver antes de expor controles de vínculo na UI.
- Verificação: **1.396 testes, zero falhas, 209 arquivos, 98,34 s**; typecheck,
  Biome (637 arquivos), diff-check e Vite (1,41 s) passaram. Kids compilou em 6,0 s,
  tipos em 10,7 s, 59 páginas em 697 ms. Three: 579,26 kB, aviso de chunk mantido.
  GPU, iluminação, toque e aparência não foram homologados; navegador segue indisponível.

### Lote 107: limites e consultas da deformação

- Enquadramento e contorno recebem limites locais por instância vinculada, não pela
  geometria compartilhada. Mantêm filtros de seleção, isolamento, visibilidade e
  espelhos; pose de juntas não varre novamente vértices para atualizar esses limites.
  Snapshots de bounds são próprios e recusam outra revisão do desenho.
- Consulta de oclusão cria um snapshot Double da deformação atual, apenas durante
  a consulta, sem mexer nos atributos renderizados. Cache por objeto SkinnedMesh
  evita confundir esqueletos/binds diferentes que compartilhem uma geometria.
  Geometria comum continua compartilhada no índice temporário; descarte é próprio.
- Reproduzidas duas falhas antes da correção (contorno/enquadramento e oclusão na
  posição antiga), depois os mesmos testes passaram. Cobertura inclui troca de
  pose, isolamento, restauração, bounds nulos, espelhos, independência e ausência
  de leituras de vértices no enquadramento por frame. Oclusão faz bake por consulta,
  não por frame; seu desempenho em hardware ainda deve ser medido.
- Verificação: **1.399 testes, zero falhas, 209 arquivos, 92,65 s**; typecheck,
  Biome (637 arquivos), Vite (1,37 s) e diff-check passaram. Último Kids: lote 106.
  Permanecem pendentes homologação GPU/navegador e edição explícita de forma-base.

### Lote 108: forma-base e pose como estados de visualização

- Abrir pontos/linhas/faces de peça vinculada mostra sua geometria autoral sem
  deformação. A ação se chama **Editar forma-base** e o palco explica o estado.
  Encerrar a edição ou selecionar outra peça restaura a deformação atual.
- Troca somente as instâncias de desenho. Geometria-base, geometria deformável,
  atributos, esqueletos, materiais e texturas continuam próprios e reutilizados.
  Espelhos acompanham o modo da peça; outras skins mantêm suas deformações.
  Não é um comando autoral: não grava pesos, pose-base nem histórico.
- Animação sai da forma-base somente depois de validar todas as paletas. Poses
  inválidas/atrasadas preservam o quadro. Não entrar em componentes durante uma
  pose; troca de criação limpa o modo, revisões da mesma criação preservam edição.
  Contexto gráfico restaurado conserva o estado visual correto.
- Revisão/testes: 20 ciclos de modo sem descarte de buffers/esqueleto, visibilidade
  de espelho, duas skins independentes, UV durante edição, transições por seleção,
  animação/contexto/criação e aviso na oficina sem histórico. Travas e topologia
  continuam passando pelos comandos existentes, sem remover vínculos implicitamente.
- Verificação: **1.403 testes, zero falhas, 209 arquivos, 93,20 s**; typecheck,
  Biome (637 arquivos), Vite (888 ms) e diff-check passaram. Kids compilou em 7,5 s,
  tipos em 12,8 s, 59 páginas em 999 ms. Homologação visual/toque/GPU segue pendente.

### Lote 109: sugestão inicial de pesos

- Sugestão geométrica determinística: osso mais próximo (rígido) ou segmento entre
  juntas escolhidas, interpolando forças das extremidades. Usa posições mundiais
  Double, ancestral escolhido mais próximo e desempate ASCII estável. Não equivale
  a um algoritmo anatômico; não altera pesos existentes nem documentos durante leitura.
- Preparação valida vínculo/ossos/travas/orçamento e cria dados próprios sem imagens,
  faces ou clipes. Worker cancelável transporta índices Uint16 e pesos Double derivados;
  leitores verificam dono, estrutura, ciclos, índices, somas, custos e precisão. Não
  destacar buffers autorais; capturar o pedido antes de futuras mutações do chamador.
- Testes com projeção independente Three, afins/reflexos, pose-base, empates, dados
  próprios, erros numéricos, worker real, cancelamento e mensagens atrasadas.
  **1.414 testes, zero falhas, 211 arquivos, 95,24 s**; typecheck, Biome (644 arquivos,
  incluindo o novo benchmark), Vite (1,10 s) e diff-check passaram. Último Kids: lote 108.
- Baseline CPU/transporte com duas execuções de aquecimento e cinco amostras por caso:
  1.024 pontos/16 juntas: mediana total 42,48 ms; 8.192/64: 93,81 ms;
  131.072/256: 2.990,60 ms. No extremo, medianas de preparação/chamada síncrona foram
  83,48/84,03 ms. Perfilamento e redução do trabalho no caller vêm antes da UI.
  Evidência: `.audits/molda-evolution/skin-suggestion-l109-baseline.md` e script reproduzível.
- Ainda sem conexão à interface ou prévia de vínculo. Exportação, visualização de
  juntas, pintura de pesos e IK continuam abertos. Não há medição GPU/navegador.

### Lote 110: custo síncrono do vínculo assistido

- Perfil identificou releitura/cópia redundante das linhas já validadas no retorno.
  Removida essa duplicação, mantendo estrutura, índice, soma, precisão, erros e
  dados próprios. Nenhuma mudança no algoritmo geométrico ou desempate.
- Três aquecimentos/dez amostras: retorno de 131.072 pontos passou de mediana
  154,83 ms para 48,59 ms; total de 3.144,72 para 3.011,77 ms. Os três hashes
  de referência passaram e o reperfilamento confirmou remoção do gargalo.
  Preparação/envio ainda excedem 50 ms no extremo; memória/GPU/fluidez não comprovadas.
- Evidências e ressalvas em `.audits/molda-evolution/skin-suggestion-l110.md`.
  **1.415 testes, zero falhas, 211 arquivos, 91,00 s**; tipos, Biome (644 arquivos),
  Vite (996 ms) e diff-check passaram. Kids permanece no lote 108.

### Lote 111: vincular a peça aos apoios

- Controles contextuais lazy em diálogo, sem ativação pública. Escolher grupos/apoios
  como ossos; método rígido ou dobra por segmentos; cálculo cancelável; revisão dos
  dados sugeridos e confirmação explícita com um undo. Sem sugerir prévia 3D inexistente.
- Desvincular e recapturar a posição inicial exigem revisão com consequências legíveis.
  Preservar ossos, animações e geometria; comandos puros existentes continuam responsáveis
  por travas/precisão/orçamento. Nada persistido durante cálculo ou revisão.
- Identidade de sessão, documento/revisão/nó/parâmetros protege cálculo e confirmação.
  Mudanças, fechamento, blur e ocultação invalidam resultados e callbacks atrasados.
- Direção de interface: criança montando um boneco, reconhecendo peça, apoio, osso,
  dobra e posição inicial. Assinatura: a mesma peça vira corpo articulado por escolha
  explícita dos apoios da criação. Paleta já existente da oficina (papel, grafite,
  acento da plataforma, verde de confirmação e vermelho de remoção, via tokens mld),
  tipografia herdada/mld-display, escala de 4 px, alvos 44 px e diálogo existente.
  Fluxo escolher/revisar/confirmar em vez de grade de métricas; rótulos de ações em vez
  de ícones sem texto; explicações locais em vez de um painel técnico de matrizes.
  Não adicionar nova paleta/sombra/animação. Validação visual real segue indisponível.
- Revisão: worker real, ausência de gravação na revisão, confirmação única,
  undo/redo, cancelamento, nó/editor/criação/parâmetros/revisão, blur/ocultação,
  foco, atalhos modais, travas herdadas, apoios ausentes e rebind singular.
  Corrigida a tipagem do foco compartilhado entre parágrafos e título com callback
  ref tipado, sem casts; suíte global repetida após a correção.
- **1.425 testes, zero falhas, 212 arquivos, 92,76 s**; typecheck, Biome (648 arquivos),
  Vite (784 ms) e diff-check passaram. Painel lazy 15,54 KB, worker 6,30 KB; aviso do
  chunk Three permanece. Kids: 6,9 s compilação, 12,8 s tipos, 59 páginas/747 ms.
- Revisão é um resumo dos pesos, não prévia gráfica da dobra. Formato público e
  exportação GLB com skins permanecem protegidos; nenhuma gravação na nuvem ativada.

### Lote 112: enxergar e escolher apoios

- Alternância explícita de guias de grupos/apoios no palco, com pontos e conexões
  da hierarquia autoral. Não usar os bones planos da paleta de desenho como hierarquia.
- Seleção por região de 44 px em coordenadas de tela, com desempate estável e
  respeito a travas/ocultação. Isolamento de uma peça mantém seus ossos associados.
- Geometria auxiliar própria, atualizada por pose sem reconstruir atributos do modelo,
  desligada durante pintura/edição de componentes. Não persistir visibilidade dos guias.
- Conferir documentação oficial e runtime instalado do Three antes de implementar;
  testes reais de projeção, descarte, seleção e integração, sem alegar homologação GPU.
- `Ver apoios` desenha guias x-ray explícitos; hierarquia de grupos/locators, origens
  afins, seleção por distância em tela/profundidade/ID, sem selecionar ossos travados.
  Pontos, conexões e destaque possuem três geometrias/materiais próprios e buffers
  fixos para 512 apoios. Sem upload para coordenadas idênticas; descarte idempotente.
- Revisão encontrou a relação entre isolamento, helpers e alças: limites agora
  incluem origens de grupos somente quando guias são usados, e ossos associados
  permanecem enquadráveis/selecionáveis sem revelar outras malhas. Poses/documentos
  inválidos são pré-validados antes de substituir o quadro visível.
- Testes de 120 poses sem troca de atributos, projeções ortográfica/perspectiva,
  alvo 44×44 px, empate, descarte, dados próprios, isolamento, precisão, foco de
  seleção e modo de componentes. Corrigidas anotações de tuplas/atributos dos testes
  antes da suíte final. **1.432 testes, zero falhas, 213 arquivos, 92,64 s**.
  Typecheck, Biome (651 arquivos), Vite (1,62 s) e diff-check passaram. Kids:
  compilação 6,1 s, tipos 11,7 s, 59 páginas/600 ms. Viewport 98,99 KB; Three ainda
  avisa 579,28 KB. Guias não são exportados nem persistidos; GPU/toque real pendentes.

### Lote 113: pesos dos pontos escolhidos

- Controles contextuais lazy para pontos de peça vinculada, incluindo os pontos
  das linhas/faces selecionadas. Misturas diferentes exigem intenção explícita
  antes de aplicar uma mistura comum, sem escolher silenciosamente a primeira.
- Até quatro ossos já pertencentes ao vínculo; edição numérica, remoção explícita
  de influência e normalização escolhida. Preservar Double/ordem/zeros não editados;
  não fazer round-trip por porcentagem em um simples abrir/confirmar.
- Rascunho sem escrita, revisão e aplicação atômica com um undo usando comandos
  existentes. Seleção, revisão, fechamento e interrupções invalidam rascunhos antigos.
  Pintura de pesos, mapa de forças no palco e edição da lista de ossos ficam separados.
- Revisão encontrou callbacks válidos após desmontar/iniciar arrasto e identidade
  visual reaproveitada ao trocar de editor com a mesma criação/revisão. Corrigidos
  com dono de sessão e revogação; miniaturas continuam sem invalidar rascunhos.
- Texto decimal validado antes da conversão: forças positivas não podem desaparecer
  por underflow no parse ou na divisão por 100. Exibição abreviada preserva Double
  original; retirar osso da mistura não normaliza automaticamente os restantes.
- Foco permanece na confirmação de misturas diferentes; cancelar/Escape retorna
  ao botão de revisão. Controles têm nomes, rótulos e alvos mínimos de 44 px.
- Testes reais do comando/store e UI cobrem pontos/linhas/faces, mistura heterogênea,
  quatro ossos, ausência de escrita, exatidão/zeros, normalização, COW, um undo/redo,
  revisão/seleção/editor/fechamento, blur/ocultação/perda de contexto e callbacks antigos.
  Corrigidos também IDs/opções de consulta/expectativas de data dos testes novos.
- **1.444 testes, zero falhas, 215 arquivos, 95,17 s** após a última correção;
  typecheck, Biome (656 arquivos), Vite (1,18 s) e diff-check passaram. Kids:
  compilação 5,6 s, tipos 12,6 s, 59 páginas/546 ms. Editor de pesos lazy 5,90 KB.
  Sem homologação visual/GPU/toque; sem mudar formato público ou ativar nuvem.

### Lote 114: ossos de um vínculo existente

- Adicionar um apoio existente captura somente sua relação inicial com a peça.
  Preservar matrizes dos ossos antigos, pesos, ordem e posição atual; não rebindar
  silenciosamente nem inventar força para o novo osso. Máximo 256 ossos por vínculo.
- Retirar só ossos sem força positiva em nenhum ponto. Influências zero podem ser
  removidas por essa escolha explícita; conservar exatidão e referências dos pesos
  restantes. Ossos ainda usados exigem edição de pesos antes; não redistribuir forças.
- Comandos puros e confirmação no modal existente, com contagens de uso calculadas
  em uma passagem. Retirar do vínculo não apaga nós, filhos, clipes ou outros vínculos.
  Revisão readonly, um undo, cancelamento e proteção de sessão/revisão existentes.
- Conferir affine/shear, ossos antigos em escala zero, precisão, orçamento, COW,
  desenho sem alteração ao adicionar osso sem força, travas herdadas e integração.
- `skinJoints` centraliza captura afim de uma junta e contagens de uso; comandos
  adicionar/retirar compartilham contexto/travas/custos. Entradas são somente leitura,
  matrizes novas próprias, dados antigos COW. Escala zero de osso antigo não força
  rebind; candidato singular é recusado. Qualquer força positiva bloqueia retirada,
  inclusive forças pequenas demais para Float32, sem limiar de descarte.
- Modal existente mostra uso de cada osso, apoios disponíveis e consequências.
  Nenhum peso atribuído ao adicionar; retirar limpa apenas suas referências zero.
  Revisão não grava; confirmação, undo e redo passam pelo store real. Perda de
  contexto agora também revoga revisões de vínculo.
- Revisão com Three real verificou pose de cada canto, espelhos, materiais reutilizados,
  descarte da geometria de skin anterior e independência de outro editor. Ajustadas
  assinaturas readonly, chamada/importe do teste e comparação dos materiais internos
  (a lista de slots da nova instância pode ser nova, os materiais são reutilizados).
- **1.452 testes, zero falhas, 216 arquivos, 93,89 s**; typecheck, Biome (659 arquivos),
  Vite (1,31 s) e diff-check passaram após as correções. Kids: compilação 6,2 s,
  tipos 11,9 s, 59 páginas/534 ms. Painel lazy 17,25 KB; Three 579,28 KB ainda avisa.
  Testes CPU/DOM não homologam GPU/toque; formato público e proteção GLB mantidos.

### Lote 115: enxergar a força de cada osso

- Mapa opcional de cores nos pontos da forma-base da peça vinculada. Escolha de
  osso por nome, escala legível 0–100% e explicação: mostra os pesos guardados,
  não os números ainda em rascunho. Não confundir com pintura ou heatmap de superfície.
- Usar os pontos autorais, inclusive soltos, sem retriangular; cores são apresentação,
  não material/pixels/exportação. Instâncias/espelhos usam as matrizes já avaliadas.
  Respeitar ocultação/isolamento e suspender fora da edição de componentes.
- Recursos próprios, limitados pelo orçamento de pontos vinculados e liberados
  ao fechar. Reutilizar atributos quando apenas o osso/forças muda, sem reconstruir
  geometria do modelo ou enviar buffers inalterados. Sem trabalho por frame parado.
- Direção visual pela skill interface-design: legenda próxima ao seletor, escala
  sequencial com luminosidade distinta (não vermelho/verde), rótulos claros e 44 px;
  manter tokens/estrutura da oficina. Valores exatos continuam nos controles numéricos.
- Conferir shaders/documentação do Three e verificar dados, descarte, espelhos,
  revisão/seleção, guarda de modo e ausência de escrita. Homologação visual depende
  de navegador real, ainda indisponível nesta sessão.
- `SceneSkinWeightOverlay` prepara posições/cores próprias antes de aceitar nova
  revisão, usa Points com tamanho em tela e RGB linear, sem tone mapping. Azul escuro
  a amarelo aumenta luminosidade; legenda e controles numéricos complementam a cor.
  Shader instalado e documentação oficial conferidos; limites de tamanho de ponto
  dependem do hardware. Não há prova de aparência/fluidez por testes CPU.
- Original e espelhos compartilham os buffers auxiliares, nunca os do modelo;
  trocar de osso preserva atributos e só marca uploads de valores alterados.
  Ocultar/fechar libera geometria/material; poses fora da forma-base não exibem mapa.
  Culling de esfera desligado para não ocultar pontos por subestimativa sob shear;
  custos de muitas instâncias e hardware continuam pendentes de medição.
- Testes de RGB contra Three, 120 atualizações sem uploads extras, pontos soltos,
  matrizes de espelhos, precisão inválida sem substituir quadro, contexto/isolamento,
  revisão de pesos, remoção de osso, fim da sessão e ausência de histórico. Ajustada
  comparação de tupla readonly no teste; suíte global rodada depois dessa correção.
- **1.457 testes, zero falhas, 217 arquivos, 93,85 s**; typecheck, Biome (663 arquivos),
  Vite (1,09 s) e diff-check passaram. Kids: compilação 6,7 s, tipos 12,0 s,
  59 páginas/683 ms. Viewport 102,75 KB; Three 579,28 KB ainda gera aviso.
  Nenhuma mudança de formato público, nuvem ou restrição de GLB com pesos neste lote.

### Lote 116: levar o esqueleto no GLB

- Conferir especificação glTF e runtime GLTFLoader/SkeletonUtils antes de remover
  a proteção atual. Etapas internas sequenciais: atributos/IBMs, hierarquia de
  dependências/espelhos, integração do encoder/worker/relatório, consumidores reais.
- JOINTS_0/WEIGHTS_0 seguem o mapa de cantos já triangulado, sem associação por
  coordenadas nem mistura de vínculos de instâncias que compartilham geometria.
  Matrizes iniciais completas, sem rebind. Dados GLB derivados têm orçamento/precisão
  próprios e relatório explícito quando a representação portátil perde informação.
- Ossos e ancestrais necessários permanecem como transformações, mesmo ocultos,
  sem revelar malhas ocultas. Espelhos precisam de árvores de juntas refletidas
  coerentes com seus nós de malha, compartilhando caminhos quando o plano é igual.
- Preservar animações e identidades do manifesto, uso de materiais e contagem real
  do Estúdio. Validar com Khronos, GLTFLoader, clones animados independentes e testes
  de fontes imutáveis/limites/cancelamento. O formato público continua separado.
- Implementado: atributos por vínculo, IBMs MAT4 Float32 próprios, dependências
  ocultas sem geometria, esqueletos refletidos com caminhos compartilhados e relatórios
  estritos de precisão/referências zero/espaço de desenho. Sem rebind ou edição da fonte.
- Revisão reproduziu erro de culling ao achatar a peça vinculada na raiz: determinante
  passou de -1 para +1 no caso afim. Corrigido preservando o referencial da peça e suas
  juntas refletidas; teste compara orientação e normalMatrix/pesos do Three com o
  renderer nativo. Não foi usado doubleSided para mascarar a regressão.
- Decisão de interoperabilidade: Khronos aceita os arquivos sem erros, mas avisa
  NODE_SKINNED_MESH_NON_ROOT por instância vinculada. Esses avisos são conferidos
  explicitamente nos testes. O relatório exige aceite para skin-render-space: outros
  programas podem interpretar iluminação/lados de forma diferente. Posições/poses
  continuam calculadas pelas juntas, conforme o contrato glTF.
- Cobertura focal já executada: 61 instantes de animação com ossos ocultos, affine/shear,
  junta de escala zero e três espelhos em dois planos; clones SkeletonUtils/mixers
  independentes, materiais/attachments, pontos coincidentes com pesos distintos,
  256 juntas em raízes separadas, menor peso Float32 positivo e recusas de underflow/
  overflow/IBM singular, orçamento de 16.384 nós, worker real, consentimento da UI
  sem histórico e limites de 48/50 malhas carregadas.
- Referência normativa: [glTF 2.0, skins](https://registry.khronos.org/glTF/specs/2.0/glTF-2.0.html#skins).
  Consultados também GLTFLoader, SkinnedMesh, SkeletonUtils e WebGLRenderer instalados.
- Revisão do destino encontrou indicação indevida de compatibilidade com 258 ossos,
  acima dos 256 do motor avançado. Teste vermelho/verde: agora stats.bones conta nós
  distintos realmente usados, incluindo espelhos e sem duplicar por material/vínculo.
  Worker valida a estatística e UI orienta skins ao Avançado mesmo sem movimentos.
  Fixture portátil do lote 101 ganhou apenas a estatística bones: 0, sem trocar GLB.
- Verificação final após as duas correções da revisão: **1.469 testes, zero falhas,
  218 arquivos, 95,06 s**, typecheck e Biome (665 arquivos) passaram. Vite 3,83 s;
  Kids compilou em 6,2 s, tipos 12,2 s, 59 páginas/520 ms, exit 0; diff check passou.
  Worker GLB 73,15 KB; viewport 102,75 KB; Three 579,28 KB mantém aviso de chunk.
  Não é medição de GPU nem homologação em outros consumidores. Formato público 1
  e bridge público continuam sem ativação.

### Lote 117: peças com pesos dentro do jogo

- Criar contrato portátil reproduzível do encoder nativo com pesos, IBMs afins,
  juntas ocultas, espelhos e dois clipes. Oráculo de pontos vem do domínio Molda,
  sem usar o renderer para calcular a resposta. Studio recebe apenas JSON/GLB,
  sem imports cruzados; manter também o contrato articulado do lote 101.
- Verificar runtime avançado real com GLTFLoader/SkeletonUtils/mixers: duas entidades,
  reprodução independente, pausa, retomada, troca de clipe, parada e reutilização.
  No descarte/reinício, conferir texturas de ossos próprias, recursos compartilhados
  e referências de mixers; reprodução correta isolada não prova ciclo de vida correto.
- Corrigir causas reproduzidas, sem clone comum de uma skin caso a clonagem de ossos
  falhe e sem descartar recursos do cache que outras entidades ainda utilizam.
  Não ativar a ponte pública nem declarar suporte do motor básico por inferência.
- Implementado o contrato `sceneStudioSkinContract` → `molda-skinned.json`, com
  poses CPU próprias e igualdade integral do artefato. Runtime avançado reproduz
  duas entidades reais, juntas ocultas, referencial afim, espelhos, clipes local/delta,
  pausa, parada/restauração, reaproveitamento e isolamento de handles antigos.
- Testes vermelho/verde reproduziram zero liberações de seis boneTextures ao fechar
  e de três ao reiniciar. `disposeModelPools` agora encerra mixers e libera Skeletons
  tanto ativos como recolhidos fora da cena. Template/cache têm donos separados;
  o cache conserva geometria/material no reinício e libera uma vez no encerramento.
- Revisão reproduziu mixer indevido na reserva quando o addon falha e recusa até
  do cubo de reserva quando seu clonador lança. Clone comum agora é exclusivo de
  árvore sem skin; erro preserva reserva e avisa. `modelClips` deriva da instalação
  bem-sucedida no template, não apenas de um GLB presente no cache.
- Conclusão tardia não instala árvore órfã em template substituído. Teste observa
  recursos do cache aquecido, duas receitas, clones vivos/recolhidos e substituição:
  18 texturas independentes liberadas uma vez, geometria/material compartilhados
  uma vez. Fronteiras simuladas são GPU/resolução de addon, não a matemática/parser.
- Verificação final: **1.470 testes Molda/218 arquivos/97,36 s e 7.945 testes
  Studio/504 arquivos/170,67 s, zero falhas**. Tipos e Biome passaram nos dois pacotes
  (666 arquivos Molda, 1.194 Studio). Vite 1,20 s; Kids compilou em 6,7 s, tipos
  21,5 s, 59 páginas/570 ms, exit 0; diff check passou. Chunk Three mantém aviso.
  Contrato automatizado não homologa GPU/hardware, sandbox/CSP ou crianças.

### Lote 118: atualização de receitas e reaproveitamento

- Conferir se um recurso recolhido pertence à receita e à revisão efetivamente
  instaladas. Redefinir uma receita ou terminar seu carregamento não pode fazer
  o próximo nascimento recuperar geometria, ossos ou clipes de uma versão anterior.
- Personagens ainda vivos conservam seus recursos até serem recolhidos; não liberar
  materiais compartilhados prematuramente. Recursos obsoletos deixam de ser candidatos
  ao reaproveitamento e têm descarte explícito, inclusive em varreduras/reinícios.
- Reproduzir os casos com runtime/Three reais, incluindo reserva criada durante o
  carregamento e repetição de trocas. Preservar API/blocos, identidade das vidas,
  orçamento ativo e cache de GLB. Não ampliar para a ponte pública neste lote.
- Testes vermelho/verde reproduziram caixa antiga reaproveitada no lugar de esfera,
  descarte prematuro de material ainda vivo e manutenção indevida de skin obsoleta
  no pool. Recursos agora carregam dono/revisão; devolução e compactação têm uma
  única decisão entre reaproveitar e descartar. Clones vivos antigos não são trocados.
- Ownership de materiais é explícito na receita, incluindo a reserva removida do
  template durante o parse. Contagem de recursos adia o descarte até o último dono;
  o registro global redundante de materiais do cache foi removido. O cache continua
  responsável pelos materiais/geometrias GLB compartilhados.
- Cobertura adicional: reserva recolhida antes da conclusão do modelo não recebe
  clipes sem geometria; 20 trocas mantêm somente cache/template atual e liberam
  as 126 boneTextures observadas uma vez ao fechar. Revisão reproduziu geometria
  unitária descartada duas vezes; cena e UNIT_GEOS agora usam o mesmo conjunto.
- Verificação final: **7.951 testes Studio, zero falhas, 505 arquivos, 164,48 s**;
  tipos e Biome/1.195 arquivos passaram. Contrato portátil Molda: 2/2 testes, 482 ms.
  Kids compilou em 7,2 s, tipos 19,7 s, 59 páginas/582 ms, exit 0; diff check passou.
  Molda não teve mudanças de código neste lote, mantendo a suíte completa do 117.

### Lote 119: traços de força locais e reversíveis

- Preparar o núcleo de pintura de pesos, separado de React/Three. O alcance segue
  caminhos das arestas da superfície em unidades de mundo, sem alcançar uma região
  desconectada só porque está encostada visualmente. Reutilizar a matemática de
  distância já usada no movimento suave, preservando o comportamento existente.
- Dar/tirar força redistribui apenas a mistura dos pontos atingidos, com valores
  Float64 e limite de quatro ossos. Não inventar destinatários nem remover um quinto
  osso silenciosamente. Explicar pontos recusados e preservar suas linhas originais.
- Cada traço usa a maior cobertura por ponto, evitando acúmulo dependente da taxa de
  eventos. Prévia própria e uma confirmação/desfazer; cancelamento e revisão externa
  invalidam o traço sem sobrescrever o documento. Não recapturar IBMs ou mudar topologia.
- Este lote prepara domínio/transação; controles e entrada 3D vêm na integração
  seguinte. Não apresentar um núcleo testado como pintura já disponível na interface.
- Núcleo implementado com distância pelas arestas de faces, reutilizando o campo
  do movimento suave. Arestas de construção não unem regiões de pintura. As linhas
  redistribuídas, mapas de prévia e relatórios têm ownership separado da fonte;
  geometria compartilhada, outros vínculos e IBMs permanecem intactos.
- Revisão vermelho/verde corrigiu vazamento do controlador privado na prévia,
  reentrada durante limpeza/encerramento e arredondamento de uma força parcial
  para zero/100%. Descarte permanente e mudanças de revisão revogam o dono; uma
  prévia nova não pode ser encerrada por callbacks antigos. Miniatura/save não
  invalidam o traço e são preservados ao confirmar/cancelar.
- Cobertura inclui regiões coincidentes desconectadas, mistura de quatro ossos,
  precisão subnormal, restauração da cor ao recusar uma cobertura maior, força
  máxima explícita, autosave sem prévia e um único undo/redo. Alcance pelas arestas
  não é geodésica exata nem interpolação contínua entre amostras do ponteiro.
- Verificação final: **1.493 testes, zero falhas, 222 arquivos, 96,46 s**; tipos,
  Biome/674 arquivos e Vite/1,11 s passaram. Kids: compilação/5,6 s, tipos/10,3 s,
  59 páginas/771 ms, exit 0. Diff check passou. Aviso de chunk Three permanece;
  não houve mudança de código Studio nem homologação de navegador/GPU neste lote.

### Lote 120: pincel na superfície e cores de prévia

- Reutilizar captura exclusiva de ponteiro entre pintura de imagem e de pesos,
  com cancelamento seguro em reentrada, segundo toque, mudança de alvo e descarte.
  Picking real respeita a peça visível mais próxima, inclusive obstáculos trancados;
  espelho devolve a coordenada à peça autoral, mantendo a unidade de mundo do raio.
- Prévia altera só os atributos de cor próprios do mapa de forças. Deltas locais,
  upload pendente limitado, cancelamento/restauração sem reconstruir a geometria.
  Tokens encerrados e revisões obsoletas não podem reaparecer no desenho.
- Integrar ciclo de vida do viewport: suspensão, troca de seleção/contexto/câmera,
  forma-base, animação e descarte. Cobrir com Three real e fronteira GPU simulada;
  controles da oficina ficam no lote de integração seguinte.
- Implementados captura compartilhada com a pintura de imagens, picking real e
  prévia de cores própria por token. Envelope de upload compartilhado com UV mantém
  todas as mudanças pendentes e é limpo por `onUpload`; cancelar restaura só pontos
  tocados. Tokens encerrados são fracos, sem reter documentos históricos.
- Baseline CPU: `.audits/molda-evolution/skin-paint-l120.md`. Em 131.072 pontos
  (10.201 de superfície), p95 de preparar/primeiro contato/movimento/comando foi
  89,124/38,817/0,068/202,062 ms. Preparação e confirmação precisam de perfil e
  otimização antes de homologar desempenho; movimentos baratos não provam fluidez.
- Revisão vermelho/verde reproduziu terceiro toque retomando o traço após liberar
  captura do primeiro. Captura perdida e dedo levantado agora têm ciclos distintos;
  o documento observa também liberações fora do canvas. Testes de ponta a ponta
  cobrem confirmar/undo, cancelamento, blur/contexto, câmera/seleção/ferramentas,
  descarte, revisão externa e miniatura sem confundir prévia com documento salvo.
- Verificação final: **1.516 testes, zero falhas, 225 arquivos, 97,23 s**; tipos,
  Biome/683 arquivos e Vite/1,20 s passaram. Kids: compilação/22,5 s, tipos/9,2 s,
  59 páginas/651 ms, exit 0. Diff check passou. Chunk Three mantém o aviso de tamanho.
  Recursos e seleção 3D foram testados com Three real, sem homologação GPU/browser.

### Lote 121: perfil da preparação e confirmação de pesos

- O baseline do lote 120 antecipou uma pendência de desempenho. Antes dos controles
  da oficina, perfilar os caminhos de preparar/confirmar, escolher uma mudança por
  vez e preservar hashes, validação, ordem, precisão e ownership. Não trocar limite
  do produto por uma restrição arbitrária para esconder o caso lento.
- Guardar perfil, prova de comportamento e medição antes/depois. Não tratar um
  ganho CPU isolado como aprovação do orçamento completo da entrada ou da GPU.
- Perfil identificou indexação repetida dos pesos. Experimento com `Object.entries`
  foi descartado por alocação extra e p95 instável; a iteração original foi restaurada.
- Confirmar usa o contexto privado do traço somente com fonte COW preservada;
  comando geral continua integral. Leitura/cópia esparsa é compartilhada, sem
  mudar normalização, ordem ou IBMs. Orçamentos e limites espaciais permanecem.
- 64 variações diferenciais, fonte/saídas próprias, revisão/miniatura e erros
  de orçamento/overflow cobertos. No extremo, p95 de confirmar caiu de 179,723 ms
  para 50,099 e 47,412 ms; os três hashes fixos passaram. Preparar continua acima
  de 50 ms. Perfil, prova e limitações: `.audits/molda-evolution/skin-paint-l121.md`.
- Verificação final: **1.519 testes, zero falhas, 226 arquivos, 93,21 s**; tipos,
  Biome/685 arquivos e Vite/1,01 s passaram. Kids: compilação/6,1 s, tipos/9,6 s,
  59 páginas/736 ms, exit 0. Diff check passou. Aviso de chunk Three permanece.

### Lote 122: pintar forças na oficina

- Conectar o traço ao contexto da oficina e às interrupções centrais. Prévia
  comunica deltas diretamente ao viewport; documento e autosave não mudam por amostra.
- Controles contextuais para dar/tirar força, alcance e intensidade, com ações
  de 44 px e distinção entre prévia e pesos guardados. Preservar alternativa numérica.
- Capturar alvo/ajustes por conexão, revogar callbacks antigos em troca de contexto,
  editor ou viewport e verificar StrictMode, cancelar, revisão e um undo por traço.
- Oficina interna agora oferece Só observar, Dar força e Tirar força ao escolher
  um osso no mapa. Alcance em blocos e intensidade são sessão; alcance vazio/inválido
  desliga a pintura, sem arredondar pesos. Recusas têm explicação e remetem à mistura
  numérica. Cor de prévia é identificada e nunca altera os materiais da criação.
- Direção de interface mantém peça/apoio/osso/dobra/mistura/traço como vocabulário,
  azul/amarelo do mapa, acento da oficina e superfícies/textos da plataforma.
  Faixa contextual em vez de modal adicional; ações nomeadas em vez de ícones
  ambíguos; contagem/avisos em texto em vez de depender só de um mapa de calor.
  Tipografia herdada, bordas discretas, espaçamento de 4 px e alvos de 44 px.
- `sceneSkinPaintSession` possui uma conexão de viewport, configurações copiadas,
  estado leve sem documento e deltas imperativos. Apenas os controles assinam os
  contadores; 40 movimentos não atualizam o documento do viewport. Anúncios de
  leitura de tela ficam nas conclusões/cancelamentos, sem narrar cada movimento.
- Revisão vermelho/verde reproduziu um cancelamento dentro do consumidor de cores
  sendo sobrescrito por status antigo. Tickets de notificação preservam a conclusão
  mais recente. Rótulo de intensidade foi separado do valor mostrado. Testes também
  cobrem troca de editor com IDs iguais, recriação de viewport, página oculta, 14
  interrupções, cancelamento central mesmo com undo vazio, miniaturas e um undo.
- Verificação final: **1.543 testes, zero falhas, 228 arquivos, 95,11 s**; tipos,
  Biome/690 arquivos e Vite/1,10 s passaram. Kids: compilação/6,0 s, tipos/11,8 s,
  59 páginas/1.154 ms, exit 0. Diff check passou. Chunk Three mantém aviso de tamanho.
- Navegador disponível continua ausente: não houve revisão visual/toque/GPU.
  Ainda faltam indicação visual de alcance e interpolação contínua entre eventos,
  além do custo extremo de preparação. Não ativou editor/formato público ou cloud.

### Lote 123: preparação de vínculos grandes

- O perfil anterior ainda aponta consultas por chave das linhas de pesos como
  custo dominante. Medir uma enumeração de valores sem tuplas por entrada, mantendo
  chaves/ordem/validações e verificando alocação e p95. Descartar se não houver ganho.
- Perfil e baseline novos, prova e hashes fixos; não modificar comportamento do
  pincel nem começar um segundo experimento antes de concluir o primeiro.
- Enumeração de valores depois das guardas evita consultas repetidas ao record e
  tuplas por ponto. Ordem, validação, pesos, IBMs e propriedade da fonte preservados;
  casos novos cobrem IDs numéricos/protótipo e precedência de erros.
- Preparação extrema p95: 86,710 → 65,635/71,000 ms (-24,3%/-18,1%); p50:
  70,559 → 39,662/48,189 ms. Hashes fixos passaram. Ainda há excedentes de 50 ms
  e variação de GC; não houve medição GPU/React/histórico. Evidência/prova:
  `.audits/molda-evolution/skin-paint-l123.md`.
- Verificação final: **1.545 testes, zero falhas, 229 arquivos, 95,34 s**; tipos,
  Biome/691 arquivos e Vite/1,08 s passaram. Kids: compilação/5,5 s, tipos/9,7 s,
  59 páginas/701 ms, exit 0. Diff check passou. Aviso de chunk Three permanece.

### Lote 124: conferir a correspondência dos pontos

- Perfil posterior localizou a pertença dos vértices como hotspot restante.
  Comparar sequências de IDs já enumeradas: igualdade completa prova correspondência
  sem consultas por chave. Outras ordens mantêm a validação individual original.
- Não ordenar dados, remover verificações de influências, criar cache histórico
  ou alterar orçamentos. Medir e conferir as duas vias, incluindo fontes inválidas.
- Mantida a prova de sequências iguais com fallback individual. Preparação extrema
  p50 49,079 → 41,274/33,808 ms; p95 95,405 → 53,447/83,023 ms. Hashes fixos
  preservados; ganho variável, ainda acima de 50 ms. Caso pequeno teve p95 maior.
  Prova e medições completas: `.audits/molda-evolution/skin-paint-l124.md`.
- Revisão integral repetida isoladamente após sobreposição inicial com builds:
  **1.546 testes, zero falhas, 229 arquivos, 97,31 s**; tipos, Biome/691 arquivos
  e Vite/1,08 s passaram. Kids: compilação/6,1 s, tipos/8,6 s, 59 páginas/1.429 ms,
  exit 0. Diff check passou; aviso de chunk Three permanece. Sem mudança Studio.

### Lote 125: referência visual do alcance

- Criança escolhendo onde dar/tirar força: mostrar um círculo de referência em
  mundo sobre a face atingida, antes e durante o traço. Círculo não é a fronteira
  exata da propagação pelas faces; explicar isso no controle existente.
- Reusar o acerto de superfície da pintura, sem duplicar raycast por movimento
  capturado, mover documento ou criar estado React a cada evento. Recursos próprios,
  reutilizáveis, render sob demanda; limpar ao sair, navegar, interromper e descartar.
- Exploração de interface: oficina, peça, osso, mistura, alcance e traço; azul de
  seleção, amarelo de força, tinta escura, papel claro e grade neutra já pertencem
  à oficina. Assinatura: círculo de alcance em blocos junto ao mapa de forças.
  Substituir cursor de pixels fixos por medida em mundo, cor única por traço claro/
  escuro legível sobre modelos e novo modal por ajuda nos controles existentes.
  Tipografia/tokens da plataforma, bordas discretas e escala de 4 px preservados.
- Alternativas: círculo em tela é barato mas ignora inclinação/escala; prévia de
  pesos no hover exige preparar o campo sem intenção de pintar. Usar círculo no
  plano tangente, com normal transformada corretamente sob shear/espelho. Não
  alterar o algoritmo de forças ou prometer geodésica exata/interpolação neste lote.
- Implementado com buffers próprios lazy e normal afim; hover não escreve pesos,
  movimento capturado não duplica raycast. Alcance inválido para o desenho é oculto
  sem limitar o valor autoral. Limpeza/reuso/estado ocioso verificados.
- Revisão vermelho/verde corrigiu matriz da câmera desatualizada entre blur e render
  na consulta compartilhada de superfície. A mesma correção atende pintura de imagens.
- Integral: **1.549 testes, zero falhas, 230 arquivos, 98,05 s**; tipos, Biome/693
  arquivos e Vite/943 ms passaram. Kids: compilação/6,3 s, tipos/11,9 s,
  59 páginas/656 ms, exit 0. Diff check passou. Evidências/limitações:
  `.audits/molda-evolution/skin-paint-l125.md`. Sem revisão visual/GPU ou rollout.

### Lote 126: amostras agrupadas do traço

- Aproveitar posições reais agrupadas em um evento pelo navegador, mantendo sua
  ordem, a consulta de obstáculos e um único undo. Não usar posições previstas
  para escrever pesos. Browser sem a API conserva o evento comum.
- Encerrar processamento imediatamente se uma amostra cancelar, trocar ou descartar
  o dono; não deixar subamostras antigas atingir outro gesto. Revisar captura,
  finalização, eventos ausentes e equivalência com a sequência não agrupada.
- Isso recupera movimento já disponível no navegador; não é interpolação geométrica
  contínua nem promessa de cobertura entre posições que não foram registradas.
- Implementado na captura compartilhada, para forças e imagens. Revisão vermelho/
  verde comprovou perda de posições ao retirar a mudança; trajetórias agrupadas e
  separadas agora produzem pesos/UV iguais. Cancelamento reentrante revoga o grupo.
- Integral: **1.556 testes, zero falhas, 230 arquivos, 96,82 s**; tipos,
  Biome/693 arquivos e Vite/997 ms passaram. Kids: compilação/5,5 s, tipos/9,3 s,
  59 páginas/654 ms, exit 0. Diff check passou. Evidências/limitações:
  `.audits/molda-evolution/skin-paint-l126.md`. Sem homologação visual/GPU ou rollout.

### Lote 127: base do ajuste de dois ossos

- Ajuste assistido de braço/perna: raiz fixa, articulação intermediária, ponta,
  alvo e direção opcional de dobra. Solver puro de dois segmentos, sem escrever
  geometria, pesos, bind pose, chaves ou estado React. Comprimentos conservados.
- Alvos fora da faixa alcançável devolvem resultado explicitamente limitado, sem
  alongar os ossos. Direção de dobra usa indicação, pose atual ou eixo determinístico
  quando a configuração é ambígua; reportar qual foi usada.
- Alternativas: solver iterativo genérico cobre mais cadeias, mas exige critérios
  de convergência/limites; mover a ponta diretamente altera comprimento. Primeiro
  usar solução geométrica de dois segmentos, com prova e casos extremos. Depois
  adaptar à timeline/transformações locais e montar prévia revisável na oficina.
- A solução geométrica não autoriza decompor shear nem assumir que um comprimento
  em mundo equivale ao local sob escala não uniforme. Conversão de pose, limites
  persistidos, UI e bake continuam tarefas seguintes, com validação própria.
- Implementada solução em unidades do maior comprimento, com verificação de erro
  relativo de ambos os segmentos. 128 transformações/oráculo Three, 192 combinações
  de alcance, escalas 1e-150 a 1e150, ambiguidade de dobra e perda de precisão por
  grande translação testadas. Sem deriva quando o alvo já é a ponta original.
- Integral: **1.563 testes, zero falhas, 231 arquivos, 96,86 s**; tipos,
  Biome/695 arquivos e Vite/950 ms passaram. Kids: compilação/5,3 s, tipos/9,8 s,
  59 páginas/457 ms, exit 0. Diff check passou. Prova/limitações:
  `.audits/molda-evolution/two-bone-l127.md`. Ainda não é IK utilizável na oficina.

### Lote 128 concluído: prévia de rotações articuladas

- Preparar hierarquia, trilhas e tempo uma vez; permitir rotações provisórias apenas
  dos apoios capturados, inclusive raiz e descendente no mesmo ajuste. Reusar a
  matemática de reprodução, sem reconstruir clipes ou consultar geometria por amostra.
- Conservar canais locais não editados, propriedade das saídas e identidade da
  revisão. Comparar prévia com a reprodução das mesmas chaves confirmadas em local
  e local-delta; bases afins não podem ser substituídas por TRS aproximado.
- Essa fronteira prepara a integração do solver. Conversão geométrica para rotações,
  comando/revisão, controles, limites e bake serão conectados sobre ela em sequência.
- Seis testes novos: 160 combinações de tempo/rotações/modo, comparação exata com
  chaves confirmadas, oráculo Three para bases afins, propriedade das saídas,
  recusa atômica e guardas de leitura. Amostras fixas não releem chaves originais.
- Integral: **1.569 testes, zero falhas, 232 arquivos, 87,43 s**; tipos,
  Biome/696 arquivos e Vite/1,13 s passaram. Kids: compilação/5,7 s, tipos/16,2 s,
  59 páginas/626 ms, exit 0. Diff check passou. Revisão/limites:
  `.audits/molda-evolution/rotation-preview-l128.md`.

### Lote 129 concluído: dois ossos na timeline

- Capturar uma cadeia direta de três apoios em um tempo. Receber alvo/indicação em
  mundo, resolver no referencial euclidiano do pai da raiz e converter somente as
  rotações de raiz/articulação. Conservar exatamente posição/tamanho e bases afins.
- Alternativas: resolver em mundo ignora a métrica do pai afim; permitir novas
  chaves TRS pode deformar os comprimentos. Usar rotações apenas, reconstruir a
  prévia com o sampler nativo e provar a representação; recusar shear/precisão.
- Chaves privadas por prévia, comparação de revisão COW e comando geral atômico.
  Miniatura/save podem mudar sem revogar conteúdo. Testar curvas, undo, limites de
  orçamento, locks herdados, extremo/antiparalelo e nenhum acesso a geometria por
  amostra. Ainda sem controles visuais, limites persistidos ou bake.
- `twoBonePose` gera somente chaves de rotação; `rotationBetweenDirections` usa
  arco mínimo e eixo determinístico no antiparalelo exato. Prova de reconstrução
  dos eixos e três origens recusa transformações que exigiriam outros canais.
- 12 testes focais passaram: 108 combinações de direções/magnitude, 48 hierarquias
  afins, chaves TRS existentes, forma com skin, negativos, alcance, propriedade,
  cancelamento/undo, orçamento e recusas. Integral: **1.582 testes, zero falhas,
  234 arquivos, 87,99 s**; tipos, Biome/700 e Vite/1,03 s passaram. Kids:
  compilação/5,7 s, tipos/8,8 s, 59 páginas/626 ms, exit 0. Diff check passou.
  Revisão e limitações: `.audits/molda-evolution/two-bone-pose-l129.md`.

### Lote 130 concluído: uma sessão para as poses

- Integrar a articulação ao `SceneAnimationPoseGesture` existente, com dono
  discriminado e entrada revogável por captura. Reusar publicação para viewport,
  estado pendente, erro, cancelar e gravar; nenhuma segunda prévia concorrente.
- Alternativas: um store independente exige arbitragem e duplica interrupções;
  uma interface genérica de plugins excede as duas operações conhecidas. Usar
  união explícita entre transformação e dois ossos, com métodos próprios de entrada.
- Articulação exige gravação explícita, mesmo com autokey das alças ativado. Troca
  de seleção/tempo/clipe/revisão, blur, contexto e desmontagem reutilizam as guardas.
  O viewport/player ainda exige a identidade exata do documento; miniatura cancela
  a sessão, embora o comando preparado do lote 129 aceite conteúdo COW equivalente.
- Conferir reentrância ao remover uma prévia e iniciar outra na mesma revisão:
  callbacks do dono antigo não podem gravar nem limpar a sessão nova. UI vem em
  seguida sobre essa fronteira, sem ativar formato público.
- `beginTwoBone` devolve entrada capturada com sample/record/cancel; callbacks
  antigos não atingem outro dono. As alças não substituem uma articulação pendente.
- RED/GREEN comprovou duas falhas corrigidas: gravação antiga após início reentrante
  na mesma revisão e publicação do tempo antigo após seek durante troca de seleção.
  28 testes de sessão passaram; 120 amostras de articulação sem autosave/undo e nove
  interrupções testadas. Integral: **1.597 testes, zero falhas, 235 arquivos,
  90,05 s**. Tipos, Biome/702 e Vite/967 ms passaram. Kids: compilação/5,5 s,
  tipos/8,5 s, 59 páginas/817 ms, exit 0. Diff check passou. Revisão:
  `.audits/molda-evolution/two-bone-session-l130.md`.

### Lote 131 concluído: dobrar pela ponta na oficina

- Intenção: criança 9+ experimentando um braço/perna, vendo a forma antes de gravar.
  Vocabulário: começo, dobra, ponta, apoios, blocos, pose e linha do tempo. Mostrar
  os três apoios escolhidos antes de ajustar; não exigir conhecer IK ou quaternions.
- Mundo de cores: azul da oficina para ação/foco, branco/creme de bancada, tinta
  escura para nomes, âmbar para limite, vermelho para recusa; tokens mld existentes
  adaptados aos temas. Superfície do inspetor, borda discreta, sem modal/camada nova;
  fonte herdada da plataforma, números tabulares, espaçamento base 4 px, alvos 44 px.
- Assinatura: cadeia nomeada começo → dobra → ponta ligada ao ajuste por blocos,
  resultado no modelo e gravação na mesma timeline. Em vez de um painel técnico de
  constraints, usar ações curtas e campos exatos opcionais; em vez de gravar a cada
  edição, experimentar e reutilizar Gravar/Cancelar; em vez de modal sobre o modelo,
  usar seção contextual recolhível no inspetor.
- Selecionar uma ponta com dois ancestrais diretos. Oferecer pequenos passos por
  eixo em mundo, alvo numérico e indicação opcional da dobra. Alterar campos revoga
  a prévia anterior antes de nova confirmação. Fechar/trocar contexto cancela a
  entrada capturada; nunca guardar matrizes/raízes do documento em estado React.
- Reusar sessão do lote 130, mostrar limites e origem da dobra em texto. Testar
  oficina real com somente a porta GPU substituída, revisões, teclado, cancelamento,
  valores incompletos e um undo. Controle arrastável em 3D e homologação visual/GPU/
  toque continuam pendentes; backend autorizado de browser segue indisponível.
- Sete testes novos cobrem oficina, sessão e hook em StrictMode. Preparação
  reaproveitada em vinte invalidações com acesso a geometria proibido; um único
  undo/redo e reprodução idêntica à prévia. Integral: **1.604 testes, zero falhas,
  236 arquivos, 89,31 s**. Tipos, Biome/705 e Vite/1,23 s passaram. Kids:
  compilação/5,9 s, tipos/10,9 s, 59 páginas/9,9 s, exit 0. Diff check passou.
  Revisão: `.audits/molda-evolution/two-bone-ui-l131.md`.

### Lote 132 concluído: limites de dobra explícitos

- Acrescentar uma faixa opcional de flexão ao apoio da dobra: 0° significa
  esticado, 180° dobrado sobre si. É uma orientação da ferramenta assistida,
  não uma alteração automática de animações existentes nem uma simulação física.
- Persistir apenas mínimo/máximo no nó de apoio, sem IDs duplicados ou esqueleto
  paralelo. Leitor, codec, comandos, histórico e exportação devem reconhecer o
  contrato. GLB leva poses gravadas, não a regra editável; declarar essa perda.
- Aplicar a faixa no cálculo geométrico em unidades normalizadas do pai do começo,
  mantendo comprimentos e informando quando o limite escolhido impede o destino.
  Não recortar Euler/quaternion, não mudar escala/translação, não inventar eixo
  de dobradiça. Limites de torção/cone são capacidades distintas ainda pendentes.
- UI no mesmo contexto, campos exatos em graus e confirmação própria. Configurar
  a faixa não grava pose; trocar a configuração cancela a prévia. Testar extremos,
  faixas degeneradas, precisão, roundtrip, travas, desfazer e correspondência com
  playback. Sem ativação pública do formato nem alegação de homologação visual.
- Implementados regra opcional no apoio, leitor/índice/codec, comando imutável,
  solução limitada, aviso no GLB/worker e controles da oficina. Campos pendentes
  bloqueiam outra pose até guardar/descartar. Guardar faixa não grava animação.
- RED/GREEN corrigiu altura residual em extremos 0°/180°, escala 1e-150 e ossos
  desiguais, sem afrouxar tolerância. 105 combinações de escala/comprimento/ângulo,
  64 mudanças de referencial, persistência/duplicação/undo, travas, worker real e
  oficina cobertos. Integral: **1.613 testes, zero falhas, 237 arquivos, 91,00 s**.
  Tipos, Biome/709 e Vite/1,37 s passaram. Kids: compilação/9,3 s, tipos/11,4 s,
  59 páginas/564 ms, exit 0. Diff check passou. Revisão:
  `.audits/molda-evolution/bend-limits-l132.md`.

### Lote 133 concluído: ver a ponta e o destino

- Mostrar os três apoios ajustados e o destino pedido durante a prévia. Quando
  há limite, a ligação entre ponta e destino torna a diferença visível no modelo,
  acompanhada do texto existente. Reusar desenho de apoios, com capacidade mínima
  explícita em vez de alocar o orçamento de todos os nós para quatro pontos.
- Metadados visuais pertencem à pose efêmera, nunca a documento/chaves/clipboard.
  Cancelar, editar campos, gravar, mudar seleção/tempo/contexto ou desmontar retira
  a guia. Não modificar o gesto de câmera nem capturar ponteiro nesta entrega.
- Cor/tamanho dos marcadores seguem os guias existentes; alvos e links são
  explicados em texto. Não depender só da cor. Geometria e materiais próprios,
  buffers reutilizados, uploads apenas quando mudarem e descarte idempotente.
- Validar projeção/posições e ciclo de vida com Three real e porta de render
  substituída, sem alegar homologação visual/GPU. O alvo arrastável vem depois.
- Metadados efêmeros no mesmo canal de pose. Guia de quatro pontos usa 192 bytes
  de atributos de posição; 120 atualizações reutilizam buffers. Destino fora da
  precisão de desenho é omitido sem recortar o dado ou mudar a pose calculada.
- Destino mudou sem mover a malha: apenas a guia atualiza/redesenha. Prévia
  repetida não faz upload nem solicita RAF extra. Revisões antigas, blur, contexto,
  reset, modo/seleção e retirada nos campos cobertos. Integral: **1.616 testes,
  zero falhas, 238 arquivos, 90,76 s**. Tipos, Biome/711 e Vite/2,16 s passaram.
  Kids: compilação/14,9 s, tipos/26,1 s, 59 páginas/1.096 ms, exit 0. Diff check
  passou. Revisão: `.audits/molda-evolution/two-bone-guide-l133.md`.

### Lote 134 concluído: mover o destino no modelo

- Reusar as alças de translação e seu ciclo de captura/multitoque, sem outro
  controle de câmera. Durante uma prévia de articulação, Mover atua no destino
  pedido (não na ponta limitada). Girar/Escalar não são operações desse destino.
- Entrada capturada por arraste e dono exato; parâmetros iniciais privados por
  frame, inclusive indicação de dobra. Cada delta parte do início do arraste,
  não da amostra anterior. Preservar limite de dobra e preparação sem reindexar.
- Soltar deixa a pose para revisão, nunca autokey. Cancelar um arraste restaura a
  prévia anterior; cancelar a sessão retira tudo. Callbacks atrasados não atingem
  outro dono/arraste, mesmo na mesma revisão, seleção e tempo.
- Bloquear campos durante arraste e sincronizar coordenadas só ao terminar, sem
  reconstruir o formulário por movimento. Gravar/desfazer continuam os mesmos.
  Testar domínio, sessão, oficina, alças reais de Three e interrupções antes de
  declarar o lote concluído; GPU/toque/browser reais permanecem pendentes.
- Entrada de translação privada por frame, adaptador capturado nas alças normais
  e assistidas, restauração no cancelamento e campos sincronizados ao terminar.
  Segundo toque e callbacks antigos não reabrem o arraste nem gravam pose.
  RED/GREEN corrigiu a alça presa no destino ao retirar a guia sem mudar matrizes.
- Integral: **1.624 testes, zero falhas, 239 arquivos, 91,08 s**. Tipos, Biome/712,
  Vite/1,95 s e Kids/6,6 s de compilação, 21,8 s de tipos, 59 páginas/816 ms
  passaram. Diff check passou. Revisão: `.audits/molda-evolution/two-bone-drag-l134.md`.

### Lote 135 concluído: conjuntos de poses com pares explícitos

- Alternativas: adivinhar pares por nomes depende de idioma/convenção; refletir
  matrizes em mundo exige compatibilidade de bases e pode gerar shear. Neste lote,
  ampliar a cópia local já existente para vários alvos, com correspondência
  explícita e bijetiva. Não chamar isso de retargeting ou simetria global do rig.
- Capturar cada alvo escolhido, inclusive pai e filho, em um único índice de
  hierarquia/trilhas; não colapsar seleção em raízes. Clipboard possui apenas IDs,
  nomes e canais locais, nunca documentos, geometria, pixels ou guias efêmeras.
- Colar ou espelhar por eixo local conserva o contrato S * TRS * S existente.
  Espaços de clipe precisam coincidir. Cada origem e cada destino aparecem uma
  vez; mapa incompleto, duplicado ou desconhecido falha inteiro. Sem associação
  por ordem de lista ou coincidência de nomes.
- Produzir todas as chaves antes de uma única chamada ao comando de lote;
  preservar interpolação de cada destino, canais/recursos não envolvidos,
  bloqueios, limites e um undo. Sem documento intermediário por apoio.
- Testar hierarquia aninhada, trocas recíprocas, leitura independente da fonte,
  precisão, três eixos/dupla reflexão, mapas inválidos, orçamento e playback.
  UI contextual com prévia será o próximo lote, sem ativação pública do formato.
- Implementados captura compartilhada, snapshot próprio com leitor estrito,
  pares bijetivos e uma única colagem de chaves. Sete testes de domínio e um de
  pureza; captura de 512 nós sem reindexação por pose. Integral: **1.632 testes,
  zero falhas, 240 arquivos, 102,90 s**. Tipos, Biome/714, Vite/1,25 s e Kids:
  compilação/21,3 s, tipos/9,7 s, 59 páginas/876 ms passaram. Diff check passou.
  Revisão: `.audits/molda-evolution/pose-sets-l135.md`.

### Lote 136 concluído: revisar conjuntos no modelo

- Mesma sessão de pose com dono discriminado para colagem; snapshot de canais
  não cria segundo player, histórico ou documento visível ao editor. Preparar
  candidato uma vez por clique; confirmar só o candidato privado com revisão,
  tempo e fonte exatos. Autokey e alças não gravam nem substituem essa revisão.
- Na seção Animar, controles progressivos de conjunto sem retirar a colagem
  simples existente. Copiar alvos explicitamente selecionados, inclusive pai e
  filho, e exibir cada origem/destino. Iniciar no mesmo ID quando ainda existir,
  declarando isso; outro apoio é escolha explícita, nunca inferida pelo nome.
- Uma lista rolável de pares e um único seletor para editar o par ativo: custo
  de opções linear, não 512 seletores com 512 opções. IDs distinguem nomes iguais.
  Mesmos tokens/44 px; texto explica espelho local e prévia, sem depender de cor.
- Alterar mapa/eixo retira prévia anterior. Fechar/Escape e trocas de contexto
  revogam a entrada capturada sem cancelar outro dono. Clipboard guarda números
  mesmo após cancelar/gravar; troca de criação o elimina. Confirmar usa os
  controles globais existentes e um undo. Testar StrictMode, callbacks antigos,
  contextos, concorrência reentrante e oficina com modelo real/porta GPU fake.
- Dono de colagem, formulário revogável, pares com um seletor de destino, prévia
  e controles globais implementados. Nomes iguais são desambiguados por ID;
  par ativo tem destaque e aria-pressed. Dezessete testes novos de sessão, hooks
  e oficina. RED/GREEN corrigiu entrada ainda ativa quando painel estava fechado.
- Integral: **1.649 testes, zero falhas, 242 arquivos, 105,21 s**. Tipos,
  Biome/718, Vite/1,25 s e Kids: compilação/7,1 s, tipos/12,3 s, 59 páginas/659 ms
  passaram. Diff check passou. Revisão: `.audits/molda-evolution/pose-set-controls-l136.md`.

### Lote 137 concluído: poses assistidas portáteis

- Exercitar a integração completa: vínculo com pesos, cadeia de dois segmentos,
  flexão limitada, poses gravadas em vários tempos, conjunto espelhado em outro
  clipe e exportação pelo worker real. O arquivo portátil usa chaves comuns; não
  exige solver de IK no destino nem leva a regra editável sem avisar.
- Conferir GLB no leitor independente e validador, deformação de cada canto
  contra o domínio nativo em tempos intermediários, espelhos e pai afim. Duas
  instâncias têm esqueletos/cursores independentes, compartilhando só recursos
  imutáveis, com descarte correto. Corrigir causas de qualquer divergência.
- Separar bake das poses gravadas de manter um alvo de IK contínuo: o trecho
  entre chaves segue as curvas nativas, não uma restrição ativa no importador.
  Relatório deve manter explícita a perda da regra de flexão e conversões Float32.
  Não ativar o host público, prometer rigidez sob pais afins nem homologar GPU
  por testes de matrizes. Usar evidência para atualizar o aceite interno de bake.
- Prova completa com solver, flexão limitada, conjunto espelhado, worker, validador
  e duas instâncias Three: 121 tempos por clipe/espaço, todos os cantos, erro abaixo
  de 0,00002 unidade. Review corrigiu Exportar descartando pose sem confirmação;
  tentativa agora mantém prévia e pede Gravar/Cancelar. Contrato antigo atualizado
  mantendo fonte canônica, pausa de reprodução e worker real.
- Integral: **1.654 testes, zero falhas, 242 arquivos, 110,86 s**. Tipos,
  Biome/719, Vite/1,25 s e Kids: compilação/22,3 s, tipos/12,7 s, 59 páginas/675 ms
  passaram. Diff check passou. Revisão: `.audits/molda-evolution/assisted-bake-l137.md`.

### Lote 138 concluído: envelope GLB/glTF seguro

- Separar contêiner, recursos binários e conversão editável. Usar GLTFLoader na
  entrada executaria políticas de carregamento de recursos antes do relatório;
  promover o leitor de testes deixaria limites/JSON-only sem cobertura. Implementar
  um leitor puro e pequeno, sem rede, DOM, Three ou execução de extensões.
- Identificar pelos bytes; conferir cabeçalho, tamanho, alinhamento e ordem dos
  chunks antes de acessar seus dados. JSON primeiro/único, BIN opcional/segundo;
  chunks desconhecidos permanecem identificados para relatório, sem interpretação.
- Orçamento inicial: arquivo de 32 MiB, 1.024 chunks, profundidade JSON 128 e
  1.000.000 separadores/aberturas estruturais antes de JSON.parse. Esses são limites
  do produto, não alegações de que arquivos maiores são inválidos no formato.
- UTF-8 estrito, BOM tolerado, JSON.parse como gramática/última chave prevalece.
  Exigir asset.version e respeitar minVersion/compatibilidade de versões menores;
  não chamar envelope de modelo validado. Dados e BIN próprios, sem reter views
  mutáveis do arquivo. Recusar memória compartilhada, não fazer uma cópia concorrente.
- Testar arquivos independentes e exportações reais, truncamentos, offsets,
  chunks/versões desconhecidos, Unicode, budgets e propriedade dos buffers.
  Recursos/accessors e conversão com relatório serão os próximos incrementos.
  Base normativa: [glTF 2.0, §§2.5–2.8, 3.2 e 4.4](https://registry.khronos.org/glTF/specs/2.0/glTF-2.0.html).
- Leitor e oito testes novos (incluindo pureza) implementados. Integral: **1.662
  testes, zero falhas, 243 arquivos, 115,56 s**. Tipos, Biome/724, Vite/1,30 s e
  Kids: compilação/6,2 s, tipos/9,7 s, 59 páginas/5,8 s passaram. Diff check passou.
  Revisão: `.audits/molda-evolution/gltf-envelope-l138.md`.

### Lote 139 concluído: recursos locais e intervalos binários

- Resolver apenas BIN, data URIs base64 de buffers e arquivos entregues pelo
  usuário. Não oferecer callback de fetch nem procurar por basename aproximado.
  Caminhos são relativos à entrada dentro do conjunto escolhido; normalizar
  segmentos e percent-encoding uma vez, sem sair da raiz nem trocar maiúsculas.
- Nomes de arquivos são literais, não URIs: não decodificar percentuais do nome.
  Rejeitar nomes ambíguos/duplicados após normalização. Recurso ausente produz
  lista de caminhos faltantes, sem buffers parciais ou substitutos vazios.
- Conferir tamanhos declarados, BIN/padding, índices e intervalos de bufferViews,
  stride/target. Metadados são copiados; recursos iguais compartilham uma cópia
  própria. Teto agregado de 32 MiB de bytes resolvidos, 1.024 recursos/buffers,
  65.536 views e caminho de 4.096 caracteres, antes de decodificar/copiar.
- Data URI aceita application/octet-stream e application/gltf-buffer com base64;
  outros meios são incompatibilidade explícita. Bytes externos podem exceder a
  declaração, mas views só alcançam a parte declarada. Binário é little-endian;
  conversão tipada, sparse, matrizes e papéis dos accessors ficam no próximo lote.
- Testar fontes reais, recursos faltantes, Unicode/percentuais, colisões e
  travessias de diretório, budgets, aliasing e limites de cada intervalo. Não
  escrever documento, descartar extensão silenciosamente ou ativar importação na UI.
- Implementados recursos locais/embutidos e views, com nove testes novos. Review
  RED/GREEN corrigiu referências de diretório virando arquivo e target nulo aceito.
  Integral: **1.671 testes, zero falhas, 244 arquivos, 94,65 s**. Tipos,
  Biome/729, Vite/1,37 s e Kids: compilação/5,7 s, tipos/8,9 s, 59 páginas/698 ms
  passaram. Diff check passou. Revisão: `.audits/molda-evolution/gltf-buffers-l139.md`.

### Lote 140 concluído: valores tipados, intercalados e sparse

- Leitura pura dos seis tipos numéricos e sete formas de accessor. Float64 de
  saída conserva os valores Float32/inteiros de entrada; normalized segue a regra
  do formato, não quantização para a grade do Molda. NaN/Infinity são recusados.
- Conferir contagens, offsets, alinhamento, stride e intervalo completo antes de
  ler. Matrizes são column-major com padding por coluna; o último padding pode
  faltar. Sparse exige índices crescentes/únicos/no intervalo, views sem stride/
  target, e substituição sobre base ou zeros. Não confundir falta de base com erro.
- Preparar metadados de todos os accessors antes de alocar saídas; teto agregado
  de 4.194.304 componentes Float64 (32 MiB), no máximo 65.536 accessors. Checar
  min/max após sparse e antes de normalized, com precisão Float32 quando aplicável.
- A validação de uso em malha/índices/skin/animação ainda pertence à conversão:
  este leitor preserva o layout necessário para essa checagem e não executa
  extensões. Testar cada tipo, normalização, matrizes com padding, sparse,
  limites, dados corrompidos e exportações reais contra leitor independente.
- Leitor e 24 testes novos implementados. Review com validador corrigiu recusa
  indevida de matriz de bytes com bufferView em offset ímpar: quatro bytes são
  exigidos localmente; alinhamento absoluto segue largura do componente.
- Integral: **1.695 testes, zero falhas, 245 arquivos, 91,02 s**. Tipos,
  Biome/732, Vite/1,04 s e Kids: compilação/5,4 s, tipos/8,4 s, 59 páginas/11,6 s
  passaram. Diff check passou. Revisão: `.audits/molda-evolution/gltf-accessors-l140.md`.

### Lote 141 concluído: atributos e topologia de malhas

- Conferir papéis dos accessors em atributos/índices, tipos, counts, alinhamento,
  min/max de posição e índices dentro do intervalo, sem aceitar primitive restart.
  Preservar conjuntos UV/cores/juntas/pesos e atributos customizados como referências
  explícitas; extensões não são executadas nem dados são descartados neste leitor.
- Sete modos de desenho viram índices de pontos, linhas ou triângulos, mantendo
  ordem e orientação de strips/fans. Degenerados permitidos no glTF permanecem no
  resultado para o conversor decidir/reportar, sem soldar vértices iguais.
- Validar mapas de morph targets, quantidade comum por malha e pesos padrão.
  Não aplicar deltas, normalizar juntas ou converter materiais ainda. Metadados
  próprios sem cópia de atributos grandes por primitive; expansão de topologia
  tem orçamento agregado antes da alocação.
- Testar todos os modos, compartilhar accessors sem misturar usos de bufferViews,
  índices inválidos, normalização/tipos, morphs e exportações reais. A etapa
  seguinte converterá esses dados em geometria nativa com relatório de diferenças.
- Implementados leitor e 17 testes novos. Review corrigiu índice negativo, morph
  UV parcial, nomes malformados e orçamento antes de enumerar valores. Tangentes
  compartilhadas são conferidas uma vez por importação: 200.100 → 2.001 acessos
  no caso instrumentado, sem alegação de p95/GPU a partir dessa contagem.
- Integral: **1.712 testes, zero falhas, 246 arquivos, 91,95 s**. Tipos,
  Biome/736, Vite/1,20 s e Kids: compilação/7,1 s, tipos/9,1 s, 59 páginas/603 ms
  passaram. Diff check passou. Revisão: `.audits/molda-evolution/gltf-meshes-l141.md`.

### Lote 142 concluído: geometria editável com diferenças explícitas

- Converter apenas as malhas/variantes solicitadas, com IDs fornecidos pela
  orquestração. Preflight agregado dos tetos nativos antes de copiar vértices/
  faces. Não aplicar snap, soldar por posição ou inferir conexão entre primitives.
- Preservar posição, ordem/orientação de triângulos, UV por canto e material por
  face. Manter mapa de vértices por primitive para a futura conversão de skin.
  Pontos/linhas entram como geometria de construção com aviso de diferença visual;
  primitivas sem POSITION e índices degenerados recebem relatório agregado.
- Assar a forma dos morphs escolhidos (pesos padrão ou variante de nó) em posição/
  UV, declarando que os controles de morph não são preservados nessa geometria.
  Dados não representáveis falham sem arredondar/clamp para fazê-los caber.
- O domínio nativo ainda usa normais por face e um conjunto UV por face: declarar
  normais/tangentes/cores/UVs extras/customizados não representados, sem afirmar
  aparência idêntica. Relatório puro mantém códigos e localização, não buffers.
- Testar round-trip de posições/UV/material, strips/fans, degenerados, variantes
  de morph, fontes intactas, limites agregados e leitura/triangulação nativas.
  Este lote não grava documento nem implementa ainda hierarquia/materiais/skin/UI.
- Implementado conversor e 16 testes novos. Review RED/GREEN corrigiu buracos em
  pesos e trabalho de topologia multiplicado por variantes degeneradas. Integral:
  **1.728 testes, zero falhas, 247 arquivos, 100,08 s**. Tipos, Biome/740,
  Vite/1,32 s e Kids: compilação/20,1 s, tipos/9,3 s, 59 páginas/583 ms passaram.
  Diff check passou. Revisão: `.audits/molda-evolution/gltf-geometries-l142.md`.

### Lote 143 concluído: hierarquia, transformações e escolha de cena

- Ler nós e cenas com índices exatos, pais únicos e detecção iterativa de ciclos,
  inclusive desconectados. Conferir raízes de cenas; a mesma raiz pode participar
  de cenas diferentes, sem mesclar essas cenas automaticamente.
- TRS e matriz são mutuamente exclusivos; preservar doubles e quaternion, sem
  normalização ou Euler. Matriz local precisa ser afim/decomponível em TRS no glTF;
  testar reflexões e eixos nulos sem usar decomposição que perca singularidades.
- Manter referências de mesh/skin/câmera e pesos de nó próprios com cardinalidade
  correta. Não executar extensões nem resolver skin/animação nesta etapa.
- Escolha explícita da cena; biblioteca sem cenas é caminho separado. Percurso
  e orçamento nativo antes da materialização de nós/geometria; nenhum recurso de
  uma cena diferente pode entrar por conveniência do carregador.
- Testar cenas vazias/compartilhadas, nós em ordem arbitrária, hierarquias profundas,
  referências ruins, limites, matrizes/quaternions e GLB real com oracle independente.
- Implementados leitores e seleção, com 14 testes novos. Cadeia de 65.536 nós
  processada sem recursão; seleção respeita 512 nós. Integral: **1.742 testes,
  zero falhas, 248 arquivos, 95,33 s**. Tipos, Biome/745, Vite/1,28 s e Kids:
  compilação/6,5 s, tipos/9,1 s, 59 páginas/657 ms passaram. Diff check passou.
  Revisão: `.audits/molda-evolution/gltf-graph-l143.md`.

### Lote 144 concluído: materiais, texturas e referências de imagem

- Ler fatores PBR, emissividade/oclusão, escala de normal, alphaMode/cutoff e
  doubleSided com defaults do glTF, não defaults do Molda. Preservar doubles;
  recusar campos inválidos sem clamp, apagar canal ou trocar transparência.
- Validar referências de textura/sampler/imagem e UVs requeridos por material.
  Filtros e wrap permanecem explícitos; um sampler não declarado difere de um
  filtro arbitrário escolhido pelo importador. Imagem usa URI ou bufferView,
  com MIME quando exigido, sem download/decodificação nesta leitura.
- Conferir papéis exclusivos de views de imagem e ausência de stride/target,
  preparando integração com os recursos locais já delimitados. Não ler pixels
  nem compor texturas antes da seleção/orçamentos das etapas seguintes.
- Testar defaults, referências e números incorretos, todos os filtros/wraps,
  materiais em primitives sem o conjunto UV requerido, ownership e GLB real.
  Leitura não implica suporte nativo a emissividade/oclusão/alphaMode; a conversão
  e seu relatório precisam tratar essas diferenças explicitamente.
- Review corrigiu varredura desnecessária de roles numéricos em arquivos sem
  imagens em bufferView. Integral: **1.756 testes, zero falhas, 249 arquivos,
  132,13 s**. Tipos, Biome/750, Vite/1,34 s e Kids: compilação/22,8 s,
  tipos/13,8 s, 59 páginas/713 ms passaram. Diff check passou.
  Revisão: `.audits/molda-evolution/gltf-appearance-l144.md`.

### Lote 145 concluído: recursos locais e imagens embutidas

- Extrair o planejamento de recursos compartilhado pelos leitores de buffers
  e imagens. Uma cópia por recurso local/URI exata, orçamento conjunto antes de
  decodificar/copiar; imagens em views usam o intervalo do buffer já contado.
- Resolver todos os faltantes sem resultado parcial ou download. Manter nomes
  literais, caminhos relativos exatos, tetos e rejeição de memória compartilhada.
- Ler bytes PNG/JPEG de Data URI em base64 ou octetos percent-encoded; não passar
  binário arbitrário por decodificação UTF-8. Outros formatos/cabeçalhos podem
  permanecer explicitamente não suportados, sem executar conteúdo.
- Manter MIME declarado e MIME da URI para conferência com o conteúdo na etapa
  de pixels. Este lote não decodifica raster nem valida o documento inteiro:
  roles de accessors, aparência, extensões e montagem continuam etapas próprias.
- Testar compartilhamento buffer/imagem, intervalos e ownership, faltantes,
  limites conjuntos, bytes 0–255 e GLB texturado real. Sem nova dependência.
- Integral: **1.767 testes, zero falhas, 250 arquivos, 90,81 s**. Tipos,
  Biome/756, Vite/799 ms e Kids: compilação/3,7 s, tipos/7,6 s, 59 páginas/473 ms
  passaram. Diff check passou. Revisão: `.audits/molda-evolution/gltf-resources-l145.md`.

### Lote 146 concluído: pixels PNG para texturas glTF

- Leitor PNG próprio sobre Pako 3.0.1 (MIT/Zlib), separado do decoder
  limitado de testes e da importação de referências via canvas. Conferir layout,
  CRC, tipos/profundidades, paleta/transparência e limites antes de pixels.
- Suportar cinco filtros, grayscale/RGB/indexado/com alpha, 1/2/4/8/16 bits e
  Adam7. Preservar 16 bits na saída intermediária; redução para material nativo
  será conversão explícita posterior, não perda escondida no decoder.
- Descomprimir em pequenas entradas com teto exato da saída, sem inflar ICC/texto/
  quadros APNG. glTF usa imagem estática e ignora metadados de cor/dimensões físicas.
  Manter linha zero e RGB sob alpha zero; nenhum flip ou premultiplicação.
- Ajuste após inspeção: usar saída fixa por bloco do Pako e verificação Adler32,
  em vez do crescimento de saída do fflate; fflate permanece no export existente.
  Pako 3 termina o stream zlib sem reinterpretar bytes sobrando como outro stream.
- Testar fixtures estruturais próprias, libvips/Sharp independente, PNGs do GLB,
  chunks/IDAT fragmentados, filtros, interlace, limites e fontes intactas. JPEG,
  conversão de materiais e worker/interface de importação continuam posteriores.
- Integral: **1.778 testes, zero falhas, 251 arquivos, 90,24 s**. Tipos,
  Biome/764, Vite/820 ms e Kids: compilação/5,9 s, tipos/7,5 s, 59 páginas/631 ms
  passaram. Diff check passou. Revisão: `.audits/molda-evolution/gltf-png-l146.md`.

### Lote 147 concluído: JPEG e orçamento conjunto de pixels

- Adicionar jpeg-js 0.4.4 fixado, com preflight próprio de dimensões, precisão,
  componentes e scans antes do decoder. Saída RGBA8 sem ICC/EXIF, flip ou alpha
  premultiplicado; distinguir RGB de YCbCr. Inicialmente DCT de 8 bits, grayscale
  ou três componentes, baseline/extended/progressive; demais modos explicitamente
  não suportados. Não prometer validação completa do padrão JPEG.
- Decodificação estrita com tetos explícitos de resolução/memória do codec e de
  trabalho dos scans. O limite aproximado da biblioteca não é pico total de RAM.
  Esta função síncrona será executada pelo futuro worker, não montada na UI agora.
- Planejar somente imagens selecionadas, conferir MIME versus assinatura e somar
  bytes RGBA de todas as imagens únicas antes de decodificar a primeira. Reusar
  intervalos idênticos da mesma memória própria; não confundir isso com hash de
  conteúdo. Preservar PNG16 e manter mapeamento dos índices glTF para os rasters.
- Testar imagens reais geradas por libvips, corrupção, orientação, metadados
  inertes, variantes de cor/subsampling, ownership e limites individuais/conjuntos.
  Materiais nativos, montagem de cena, worker e interface seguem etapas posteriores.
- Integral: **1.796 testes, zero falhas, 253 arquivos, 93,69 s**. Tipos,
  Biome/773, Vite/962 ms e Kids: compilação/4,9 s, tipos/7,0 s, 59 páginas/597 ms
  passaram. Diff check passou. Revisão: `.audits/molda-evolution/gltf-rasters-l147.md`.

### Lote 148 concluído: vínculos de esqueleto glTF

- Ler juntas únicas/ordenadas, skeleton opcional e accessor de matrizes de vínculo
  sem inverter, normalizar ou descartar valores. Matriz ausente significa identidade;
  accessor MAT4/Float pode ter mais elementos que juntas e precisa de linha afim.
  Singularidade aceita pelo glTF não vira vínculo nativo silenciosamente.
- Conferir raiz comum e skeleton ancestral usando índice iterativo da floresta,
  sem caminhar a cadeia inteira por junta. Conferir que cada cena que contém uma
  malha com skin também contém sua árvore de juntas; não importar outra cena.
- Tetos de skins/juntas antes de cópias; accessors compartilhados conferidos uma
  vez por chamada. Papéis de views não podem misturar matrizes de vínculo e malhas.
  Preservar nós que são juntas e também possuem malhas/anexos para conversão futura.
- Testar dependências/cenas/limites/hierarquias profundas, matrizes sparse/default,
  ordem/ownership e GLBs reais contra validador/Three. Valores de pesos, conversão
  de vínculos, animações e montagem nativa continuam etapas posteriores.
- Integral final: **1.809 testes, zero falhas, 254 arquivos, 129,09 s**. Tipos,
  Biome/777, Vite/813 ms e Kids: compilação/5,9 s, tipos/11,1 s, 59 páginas/592 ms
  passaram. Diff check passou. Primeira integral teve uma falha intermitente em
  teste existente da oficina; não reproduzida em 60 repetições focais, sem mudança
  de UI/teste. Revisão: `.audits/molda-evolution/gltf-skins-l148.md`.

### Lote 149 concluído: valores de juntas e pesos glTF

- Conferir índices JOINTS em todas as instâncias de uma malha, inclusive slots de
  peso zero. Conferir pesos não negativos e proibição de repetir junta com peso
  positivo, através de todos os conjuntos JOINTS_n/WEIGHTS_n, não só o primeiro.
- Preservar valores; sem normalizar/prunar pesos ou limitar silenciosamente a
  quatro influências. Somatórios quantizados exigidos pelo formato são exatos;
  desvios de soma em Float32 e vértices sem força geram diagnóstico para a futura
  revisão/conversão, sem prometer vínculo nativo válido.
- Orçamento agregado de trabalho por combinação única de accessors antes dos
  valores; reutilizar conferência de dados compartilhados e o limite mais restrito
  das skins usadas por cada malha. Nenhum cache entre importações.
- Testar conjuntos extras, tipos quantizados/float, zero/duplicação/índices ruins,
  múltiplas instâncias, limites, dados intactos e GLB real com validador. Montagem
  de vínculos nativos, animações, materiais e interface continuam posteriores.
- Integral: **1.824 testes, zero falhas, 256 arquivos, 138,69 s**. Tipos,
  Biome/782, Vite/1,23 s e Kids: compilação/7,0 s, tipos/7,9 s, 59 páginas/554 ms
  passaram. Diff check passou. Inclui correção de foco antes do paint na revisão
  de malha, com reprodução mínima vermelha/verde e 75 execuções focais.
  Revisão: `.audits/molda-evolution/gltf-skin-weights-l149.md`.

### Lote 150 concluído: canais e valores de animação glTF

- Preservar canais, referências de samplers, STEP/LINEAR/CUBICSPLINE e tempos
  originais. Não criar clipes nativos, reamostrar, normalizar quaternions ou
  aplicar curvas automaticamente. Alvos ausentes/extensões ficam explícitos,
  nunca são interpretados como nó zero ou descartados silenciosamente.
- Conferir referências, tipos, contagens por alvo/morph, tempos crescentes e
  não negativos com min/max, duas chaves mínimas para cúbicas e quaternion das
  chaves (não tangentes). Usar tolerância documentada para quantização glTF,
  mantendo valores e exigindo conversão explícita ao contrato nativo.
- Preflight agregado de clipes/canais/samplers antes das cópias e valores;
  cache local por accessor e papel de leitura. Não misturar bufferViews de
  animação com vértices/índices/matrizes de vínculo, nem usar target/stride.
- Testar dados reais com validador/Three, compartilhamento, ownership, curvas
  cúbicas/quantizadas, casos inválidos e tetos. Sampling, conversão nativa,
  relatórios de perdas, worker e UI continuam etapas posteriores.
- Integral: **1.841 testes, zero falhas, 258 arquivos, 108,98 s**. Tipos,
  Biome/788, Vite/1,09 s e Kids: compilação/6,3 s, tipos/8,8 s, 59 páginas/412 ms
  passaram. Diff check passou. Revisão: `.audits/molda-evolution/gltf-animations-l150.md`.

### Lote 151 concluído: avaliação pura de curvas glTF

- Preparar um canal já validado e selecionado explicitamente, sem criar animação
  nativa ou reproduzir cena. Alvo não resolvido não pode ser avaliado implicitamente.
  Referências a valores imutáveis; cada resultado possui array próprio.
- Busca binária de tempos, clamp para primeira/última chave e valores exatos nas
  chaves, inclusive quaternions quantizados. STEP, linear vetorial, SLERP pelo
  caminho curto e Hermite com tangentes escaladas pela duração real do segmento.
- Normalizar apenas rotações interpoladas. Curva cúbica que produz quaternion
  nulo gera erro explícito, sem identidade substituta. Não alterar FPS/tempos,
  inverter tangentes ou limitar morphs/escala. Não usar o sampler nativo, cujo
  contrato normaliza até chaves exatas e não armazena tangentes; Three só como
  oráculo de teste, mantendo o domínio independente de runtime 3D/DOM.
- Testar extremos, tempos subnormais, escolhas aleatórias, compartilhamento e
  curvas reais contra Three e fórmulas independentes. Conversão, prévia 3D de
  importação, relatórios e UI permanecem posteriores.
- Integral: **1.851 testes, zero falhas, 259 arquivos, 111,08 s**. Tipos,
  Biome/790, Vite/1,10 s e Kids: compilação/5,9 s, tipos/22,1 s, 59 páginas/701 ms
  passaram. Diff check passou. Revisão: `.audits/molda-evolution/gltf-animation-sampling-l151.md`.

### Lote 152 concluído: composição da leitura GLB/glTF

- Criar entrada pura que compõe envelope, orçamento conjunto de recursos,
  accessors, aparência, malhas/UVs, câmeras, grafo, skins/pesos e animações.
  Retornar faltantes sem documento parcial ou fonte glTF própria pronta para
  seleção/revisão, sem confundi-la com documento nativo/importação concluída.
- Conferir declarações de extensões e relações required/used. Extensão obrigatória
  sem suporte impede a leitura antes dos recursos; opcionais ficam explícitas
  para revisão posterior. Não executar extensões, rede ou paths arbitrários.
- Ler projeções core de câmera sem mudar ângulos, proporções, eixos ou distância.
  Preservar escolhas válidas porém não recomendadas; não materializar câmeras
  nativas. Não aceitar referências só pela quantidade de objetos não conferidos.
- Manter JSON/extras inertes e ownership dos dados. Não reter a cópia extra do BIN
  do envelope após materialização. Pixels continuam em etapa selecionada, com
  seu orçamento separado. Testar GLBs reais e o encadeamento de todos os gates,
  recursos locais faltantes, preservação e rejeições sem mocks dos leitores.
- Integral: **1.867 testes, zero falhas, 262 arquivos, 107,36 s**. Tipos,
  Biome/796, Vite/1,21 s e Kids: compilação/5,4 s, tipos/9,4 s, 59 páginas/576 ms
  passaram. Diff check passou. Revisão: `.audits/molda-evolution/gltf-document-l152.md`.

### Lote 153 concluído: cena e dependências selecionadas

- Reusar a seleção explícita de cena, sem mesclar cenas ou escolher default por
  conta própria. Separar instâncias e variantes exatas de morphs para conversão,
  preservando compartilhamento e orçamento de nós/partes antes de valores/pixels.
- Inventariar somente malhas, materiais, cinco mapas core, texturas, samplers,
  imagens, skins, câmeras e accessors alcançados. Não escolher uma câmera ativa,
  decodificar pixels, copiar buffers ou criar documento nativo nesta etapa.
- Classificar canais selecionados, fora da cena e não resolvidos sem omissão
  silenciosa. Nenhum canal de outra cena pode acrescentar seus nós à seleção.
  Alvos sem nó e extensões opcionais continuam visíveis para revisão.
- Testar seleção vazia/múltipla, variantes, compartilhamento, skeletons e GLBs
  reais; seleção é uma etapa, não aceite de perdas nem orçamento final de conversão.
- Integral: **1.877 testes, zero falhas, 263 arquivos, 103,04 s**. Tipos,
  Biome/799, Vite/1,24 s e Kids: compilação/6,1 s, tipos/8,5 s, 59 páginas/398 ms
  passaram. Diff check passou. Revisão: `.audits/molda-evolution/gltf-selection-l153.md`.

### Lote 154 concluído: hierarquia nativa da cena selecionada

- Converter nós e transformações locais sem snap, decomposição ou renormalização;
  IDs determinísticos e mapas distintos para alvos TRS/juntas e malhas.
- Nó que é junta e malha vira grupo mais filho de forma com transformação identidade;
  pré-contar essa expansão no teto nativo. Preservar filhos autorados e mundo.
- Relatar câmeras sem representação nativa, separação estrutural e ajustes de
  nomes para o contrato de edição. Não ativar câmera, inventar osso ou apagar fonte.
- Conferir com GLBs reais e o domínio nativo; recursos e seleção são da mesma
  fonte imutável. Materiais, skins/pesos, animações, relatório agregado e gravação
  ainda pertencem às próximas etapas de montagem.
- Integral: **1.883 testes, zero falhas, 264 arquivos, 106,00 s**. Tipos,
  Biome/803, Vite/945 ms e Kids: compilação/5,4 s, tipos/23,0 s, 59 páginas/524 ms
  passaram. Diff check passou. Revisão: `.audits/molda-evolution/gltf-hierarchy-l154.md`.

### Lote 155 concluído: bindings nativos de skin e ownership de prévias

- Usar os mapas de origem da geometria e os alvos separados da hierarquia,
  conservando IBM e juntas autoradas. Pré-contar vínculos, juntas e vértices por
  instância; conferir invertibilidade exigida pelo domínio nativo antes de pesos.
- Ler layouts compartilhados uma vez por conversão. Remover slots de peso zero,
  mantendo ordem e todos os pesos positivos; não reduzir silenciosamente a quatro
  influências ou inventar junta para vértices sem força.
- Preservar pesos por padrão. Normalização exige opção explícita e relatório de
  vértices/erro de soma; nunca enfraquecer a tolerância do leitor nativo nem perder
  influência positiva em Float32. Casos sem representação segura são recusados,
  mantendo a fonte disponível para uma decisão posterior.
- Validar deformação real após leitura/conversão, incluindo juntas com forma,
  múltiplas instâncias/espelhos e poses. Conversão de materiais/clipes e aceite
  agregado de perdas ainda são necessários para a importação completa.
- A integral revelou prévia de superfície que não fechava se a revisão externa
  chegasse depois do worker. Regressão determinística antes da correção; hook
  observa revisão e callbacks têm dono revogável, inclusive em publicações
  aninhadas. Não ressuscitar nem cancelar a entrada sucessora. Teste original
  preservado; 40 repetições e 479 testes ampliados passaram.
- Integral final: **1.900 testes, zero falhas, 266 arquivos, 101,76 s**. Tipos,
  Biome/808, Vite/1,10 s e Kids: compilação/9,6 s, tipos/25,7 s, 59 páginas/849 ms
  passaram. Diff check passou. Revisão: `.audits/molda-evolution/gltf-skin-bindings-l155.md`.

### Lote 156 concluído: materiais e imagens nativos

- Converter apenas materiais da seleção, com mapa esparso de índices da fonte
  para IDs nativos também na geometria. Fonte com muitos materiais não usados
  não deve impor uma tabela nativa artificialmente grande.
- Cor base linear vira sRGB autoral sem quantização quando não há imagem. Com
  textura, assar multiplicação em espaço linear e relatar conversão para RGBA8;
  base transparente evita misturar a pintura com uma cor de fundo indevida.
- Normal e metal/rugosidade usam bytes lineares e ignoram alfa da imagem fonte;
  compartilhar imagem quando a interpretação dos pixels coincide. Pré-contar
  todas as variantes de imagens antes de alocar buffers e manter a fonte intacta.
- Declarar perdas de filtros/repetição, emissivo/oclusão e quantização. Recusar
  casos ainda sem representação segura, como MASK, UVs incompatíveis entre mapas
  e força normal fora do contrato, sem fingir equivalência visual. Relatório não
  é aceite de perdas nem gravação; montagem final e fluxo de revisão seguem depois.
- Conferir cores, canais, transparência, ownership e limites, inclusive roundtrip
  de GLB real pelo leitor nativo e pelos recursos de material existentes.
- Perfil orientou tabela exata de 256 valores por canal não unitário, temporária
  por imagem. Cenário 1024² × 8: p50 de 1.246,881 para 85,293 ms, 14,62×, mesmos
  hashes/bytes. Caso pequeno custa mais 0,062 ms; RSS não caiu. Não é prova de
  latência/GPU nem substitui worker. Detalhes e goldens no review.
- Integral: **1.913 testes, zero falhas, 267 arquivos, 102,70 s**. Tipos,
  Biome/813, Vite/1,06 s e Kids: compilação/5,6 s, tipos/7,7 s, 59 páginas/512 ms
  passaram. Diff check passou. Revisão: `.audits/molda-evolution/gltf-materials-l156.md`.

### Lote 157 concluído: clipes nativos de animação

- Mapear TRS para os alvos da hierarquia, inclusive junta com forma separada.
  Usar espaço local absoluto, tempos originais e STEP/LINEAR; FPS é apresentação,
  não snap destrutivo. Não inferir loop do glTF, que não o define.
- Planejar clipes/trilhas/chaves e duração antes de buffers de valores. Duração
  considera os canais autorados do clipe, preservando período quando a seleção
  remove canais de outra cena; pose apenas em zero precisa de duração nativa
  positiva, definida e relatada. Não ler imagens/geometria ao converter clipes.
- CUBICSPLINE não equivale ao smooth nativo. Recusar por padrão; bake explícito
  usa FPS escolhido, mantém todas as chaves originais e relata aproximação.
  Não prometer erro limitado entre amostras ou consertar quaternion nulo.
- Normalização de rotações que excedem a tolerância nativa exige opção explícita
  e relatório. Morphs/alvos de extensão sem representação não são redirecionados
  a TRS; omissão exige escolha e relatório. Canais fora da cena permanecem listados.
- Testar ownership, limites e poses com leitores nativos e GLBs reais, incluindo
  hierarquia/skins já convertidas. Montagem final, worker e UI de revisão seguem
  depois; esse estágio não grava nem aceita perdas pelo usuário.
- Review reproduziu bounds arbitrários de accessor sem buffer/sparse: o core é
  zero, não a faixa declarada para extensão. Duração usa a faixa core, mantendo
  os metadados intactos. Regressão vermelha/verde e oráculos Three/Khronos passaram.
- Integral: **1.925 testes, zero falhas, 268 arquivos, 103,27 s**. Tipos,
  Biome/817, Vite/1,73 s e Kids: compilação/9,7 s, tipos/32,8 s, 59 páginas/1.114 ms
  passaram. Diff check passou. Revisão: `.audits/molda-evolution/gltf-clips-l157.md`.

### Lote 158 concluído: documento nativo e relatório integrado

- Um ponto de conversão seleciona explicitamente a cena e compõe geometria,
  hierarquia, materiais/imagens, vínculos e clipes do mesmo documento fonte.
  Identidade vem do host; não gerar ID, relógio, IO, persistência ou aceite aqui.
- Validar identidade antes do trabalho pesado. Planejar geometria e custo de
  desenho por instância antes de pixels; compartilhar uma forma não torna grátis
  suas cópias visíveis. Reusar política de topologia e IDs, sem duplicá-la.
- Consolidar avisos tipados, escopo da seleção e extensões/chunks ignorados.
  Metadados arbitrários não viram código ou campos nativos; explicitar que a
  conversão não arquiva o arquivo de origem nem persiste seus metadados.
- Submeter o documento inteiro ao leitor nativo, incluindo referências, bounds
  e orçamento final. Preservar buffers fonte e não reter JSON/accessors no retorno.
  A cópia defensiva final custa memória adicional: limite de pixels não é pico RSS.
- Exercitar GLBs reais, seleção explícita, custo agregado, ownership, falhas
  antes de recursos caros e relatório. Worker e UI de revisão vêm na sequência.
- Review reproduziu overflow de composição fora do leitor final. Gate de mundo
  antes de pixels classifica limite nativo como unsupported, preservando erro
  interno não relacionado. Bounds de pontos continuam verificados no leitor final.
- Importação/pureza: **302 passes, zero falhas, 29 arquivos**. Integral:
  **1.935 testes, zero falhas, 269 arquivos, 102,36 s**. Tipos, Biome/821,
  Vite/1,15 s e Kids: compilação/5,2 s, tipos/8,1 s, 59 páginas/469 ms passaram.
  Diff check passou. Revisão: `.audits/molda-evolution/gltf-document-l158.md`.

### Lote 159 concluído: importação cancelável e fronteiras de transporte

- Worker próprio por pedido com cancelamento real de CPU; reusar o coordenador
  existente. Tokens de criação, revisão e pedido, capturados antes de callbacks,
  impedem que respostas de outro trabalho sejam aceitas. Nenhuma gravação aqui.
- Validar pacote e orçamento de todos os arquivos antes de copiar/postar bytes;
  não transportar backing maior escondido em views, memória compartilhada ou
  campos arbitrários. Nunca destacar os bytes originais escolhidos pelo usuário.
- Retornar faltantes sem documento parcial, inspeção com cenas para escolha
  explícita ou documento/relatório para revisão. Leitura e conversão permanecem
  fora da UI; falhas conservam reason/path e não viram sucesso vazio.
- Validar respostas, diagnósticos e custos, além do domínio nativo. Relatórios
  continuam sem aceite e limitados; custos anunciados devem coincidir com o
  documento recebido. Transferir apenas pixels próprios do resultado do worker.
- Testar worker real, cancelamento, respostas tardias/estrangeiras, falhas de
  transporte, ownership e limites. UI de revisão e adoção transacional seguem depois.
- Importação/workers/pureza: **406 passes, zero falhas, 41 arquivos**. Integral:
  **1.947 testes, zero falhas, 270 arquivos, 102,71 s**. Tipos, Biome/828,
  Vite/912 ms e Kids: compilação/5,6 s, tipos/8,5 s, 59 páginas/466 ms passaram.
  Diff check passou. Revisão: `.audits/molda-evolution/gltf-worker-l159.md`.
  Worker foi exercitado de verdade no Bun; bundle Vite desse novo worker depende
  da entrada de UI do próximo lote. Não confundir build do app atual com essa prova.

### Lote 160 concluído: trazer arquivos para a oficina com revisão

- Entrada lazy em diálogo da oficina interna: arquivos → cena → revisão →
  confirmação explícita. Preservar tokens mld, foco/teclado e alvos de 44 px;
  linguagem clara para 9+, com detalhes técnicos em disclosure. Não ativar cloud v2.
- Validar tamanhos/caminhos do conjunto antes de File.arrayBuffer, escolher o
  GLB/glTF principal quando houver vários, permitir acompanhantes locais e mostrar
  todos os faltantes. Nunca aproximar nomes, buscar URLs ou escolher cena escondida.
- Sessão possui dono por editor/revisão/pedido. Alterar arquivo/cena/opções retira
  aceite e resultado anteriores. Fechar, cancelar, trocar editor ou revisão externa
  revoga leitura/worker; resultados atrasados não reaparecem. Miniatura não é edição.
- Revisão agrupa diagnósticos por código com resumo de custos; informar arquivo
  original e atribuição/metadados não arquivados. Preservar acesso aos originais,
  oferecer relatório completo e uma prévia somente leitura com recursos descartáveis.
- Compatibilidade fica explícita: bake/FPS, normalização e omissão não são aceites
  automáticos. Confirmação substitui conteúdo da criação atual em um único commit;
  nome/identidade preservados. Histórico existente conserva ao menos um desfazer,
  inclusive quando o único passo excede o orçamento nominal. Não relaxar esse contrato.
- Abertura não descarta pose pendente; guardar/cancelar continua escolha explícita.
  Conferir revisão novamente no handler vivo antes do commit, com ownership
  reentrante. Sem alteração autoral ou persistência durante leitura/revisão.
- Testar fluxo com worker real, arquivos, cancelamento, desfazer/refazer, foco,
  callbacks velhos e prévia. Verificar bundle do worker via UI alcançável. Homologação
  visual/GPU/toque permanece separada enquanto o navegador estiver indisponível.
- Review corrigiu nomes dos campos exigidos pelo contrato de acessibilidade e
  separou a orientação de pose pendente da importação/exportação. Focal de fluxo,
  leitura, acessibilidade e pureza: **62 passes, zero falhas, 547 asserts/5,63 s**.
- Integral: **1.961 testes, zero falhas, 273 arquivos, 115,05 s**. Tipos,
  Biome/837, Vite/1,09 s e Kids: compilação/6,7 s, tipos/8,7 s, 59 páginas/701 ms
  passaram. Bundle produz worker glTF/180,05 kB e painel lazy/35,03 kB.
  Diff check passou. Revisão: `.audits/molda-evolution/gltf-review-l160.md`.

### Lote 161 concluído: fonte OBJ poligonal, sem adoção implícita

- Ler bytes/texto de forma pura, sem React/Three, IO, shell ou dependências novas.
  Conferir UTF-8, controles, bytes, linhas/tokens e agregados antes de alocações
  desproporcionais; percorrer linhas sem dividir todo o arquivo em uma lista.
- Implementar posições, coordenadas de textura, normais, pontos, linhas e faces,
  com índices separados e negativos relativos ao ponto de uso. Preservar ordem,
  winding, coordenadas e UV; não soldar, triangular, dividir por peso ou ajustar eixos.
- Guardar contexto de objeto/grupos/material/smoothing por referência compartilhada,
  sem duplicar grupos em cada canto. Preservar bibliotecas de material como dados,
  não carregar caminhos ou inferir hierarquia a partir de grupos sobrepostos.
- Recusar comandos, includes, formas livres e sintaxes não suportadas com linha
  e motivo; não retornar malha parcial silenciosa. Não usar fallback genérico
  para instruções desconhecidas ou tratar arquivo malformado como vazio válido.
- Testar sintaxe real, defaults, índices, transições, continuação/comentários,
  dados extremos e ownership. Conversão nativa, MTL/recursos, worker e UI vêm depois;
  leitor fonte não constitui importação OBJ completa nem aceite de perdas.
- Referência primária: [manual Wavefront, apêndice B1](https://www.martinreddy.net/gfx/3d/OBJ.spec),
  consultado em 08/09/2026. Implementação própria, sem copiar loaders de aplicativos.
- Review preservou declaração de objeto por linha, mesmo com nomes repetidos;
  a uniformidade de UV permanece exigida nas faces, não nas polilinhas. Walker
  de pureza passou a recusar imports relativos não resolvidos em vez de inferir
  resolução por tamanho mínimo do grafo. Regressões e oráculo Three passaram.
- Perfil orientou retirar formatação de erros por caractere válido. Na comparação
  final, comentários/1 MiB: p50 de 12,486 para 4,385 ms, mesmos hashes/dados. Ganho
  de malha inconclusivo e nenhum ganho de RSS/pico/GPU alegado. Perfis preservados.
- Integral: **1.974 testes, zero falhas, 274 arquivos, 118,97 s**. Tipos,
  Biome/842, Vite/1,09 s e Kids: compilação/5,6 s, tipos/9,0 s, 59 páginas/411 ms
  passaram. Diff check passou. Revisão: `.audits/molda-evolution/obj-source-l161.md`.

### Lote 162 concluído: geometria OBJ editável e limites nativos

- Planejar partes pela declaração de objeto, nunca pelo nome ou mudanças de
  material. Grupos sobrepostos continuam metadados fonte, sem duplicar superfícies
  ou inventar parentesco. Vértices globais referenciados em mais de um objeto
  exigem cópias nativas; contar o custo agregado antes de materializar coordenadas.
- Preservar polígonos de até 64 cantos, winding, pontos e arestas. Não aplicar
  triangulação fan ou solda. Aceitar fechamento redundante somente quando o
  último canto repete exatamente todas as referências do primeiro, com aviso;
  outras repetições e faces grandes precisam de suporte explícito, não omissão.
- Vértices não usados permanecem numa parte de construção identificada, sem
  atribuir propriedade de objeto que o formato não informou. Arestas de
  comprimento zero por referência repetida não têm representação nativa e são
  relatadas. Posição, peso, normal e UV fonte não são modificados.
- Adaptar o eixo vertical de UV para a convenção de pixels nativa; manter costuras
  por canto, sem arredondar ao pixel. Relatar peso racional/terceira coordenada UV,
  normais/suavização e atributos de linha que não ficam editáveis no formato nativo.
- Receber vínculos de materiais resolvidos por face, considerando seu estado e
  presença de UV; não carregar MTL nem escolher material por nome aproximado.
  Validar IDs/custos e passar a geometria
  pelo leitor/build reais, mantendo faces sem desenho com diagnóstico.
- Testar limites exatos/agregados, nomes repetidos, ownership, fechamento, faces
  côncavas/degeneradas, UV/orientação e vínculo por face. MTL, documento completo,
  worker, revisão e adoção OBJ seguem nos lotes seguintes.
- Implementado e revisado. Nove testes específicos, incluindo documento nativo
  da fixture exportado e validado como GLB, sem anunciar montagem OBJ completa.
  Focal final: 69 passes/4.560 asserts; integral: **1.984 passes, zero falhas,
  275 arquivos, 120,19 s**. Tipos, Biome/845, Vite/1,04 s, Kids: compilação/5,8 s,
  tipos/8,8 s, 59 páginas/572 ms e diff check passaram. Erro inicial de tipagem
  em fixture corrigido sem afrouxar produção/testes. Sem nova dependência ou
  ativação pública. Review: `.audits/molda-evolution/obj-geometry-l162.md`.

### Lote 163 concluído: fonte MTL limitada e explícita

- Reusar a leitura textual limitada de OBJ para MTL, sem duplicar o lexer nem
  alterar coordenadas/saída OBJ. Erros comuns identificam a família OBJ/MTL.
- Manter materiais e propriedades tipadas em ordem, inclusive nomes repetidos,
  redeclarações, valores ausentes e conflitos de opacidade. Nenhuma política
  silenciosa de último valor, cor padrão, clamp, conversão PBR ou resolução de
  nomes neste leitor. Nomes UTF-8 com espaços são uma escolha de compatibilidade.
- Ler cores RGB/XYZ/espectrais, escalares, iluminação, dissolução e mapas com
  opções próprias. Preservar altura bump separada de normal estendida e canais
  escalares; offsets/escalas não alteram UV ou pixels aqui. Compatibilidade PBR
  documentada separadamente do manual Wavefront original.
- Caminhos permanecem literais e inertes. Não executar arquivos procedurais,
  scripts, includes, shell, fazer fetch ou tentar interpretar aspas. Opções e
  instruções desconhecidas são incompatibilidades explícitas, sem fonte parcial.
- Limitar arquivo, linhas, tokens, nomes, materiais, propriedades e opções antes
  de retenção. Testar limites, aridade, números, continuação, opções negativas,
  nomes/caminhos ambíguos, duplicatas e ownership; conferir casos compatíveis
  contra leitor independente. Resolver conjunto local/MTL agregado vem depois.
- Implementado e revisado. Dez testes específicos; regressão vermelha/verde para
  colorspace sem valor consumindo a próxima opção, sem alterar asserções para
  contornar o parser. Focal: 71 passes/4.950 asserts; goldens OBJ preservados.
  Integral: **1.995 passes, zero falhas, 276 arquivos, 121,01 s**. Tipos,
  Biome/850, Vite/1,46 s, Kids: compilação/5,9 s, tipos/9,2 s, 59 páginas/514 ms
  e diff check passaram. Sem dependência/ativação pública. Review:
  `.audits/molda-evolution/mtl-source-l163.md`.

### Lote 164 concluído: recursos locais OBJ/MTL

- Compartilhar normalização segura de caminhos com glTF, preservando diferenças:
  glTF decodifica URI uma vez; OBJ/MTL usam referência literal. Separadores Windows
  relativos podem ser adaptados explicitamente na referência, nunca adivinhar
  basename, caixa, diretório externo, URL ou arquivo escolhido diferente.
- Conferir nomes, duplicatas e orçamento de todos os bytes escolhidos antes da
  leitura de texto. Resolver mtllib relativamente ao OBJ e mapas/curvas relativamente
  ao MTL, conservando ordem de bibliotecas e identidades de declarações.
- Limitar recursos/bytes e materiais/propriedades/opções entre todas as bibliotecas,
  não só por arquivo. Bibliotecas repetidas são lidas uma vez. Retornar faltantes
  descobríveis no conjunto sem fonte parcial ou cópias de recursos nesse resultado.
- No resultado completo, buffers de recursos são próprios por caminho e apenas
  do intervalo escolhido. Ler metadados/bytes não decodifica raster, interpreta
  procedimento, resolve conflito de material ou adota documento nativo.
- Testar caminhos literais/URI distintos, escapes, arquivos ausentes, alias,
  contexto de erros, ownership, tetos exatos/agregados e regressão completa glTF.
- Implementado e revisado. Oito testes de conjunto; regressão vermelha/verde
  para unidade Windows revelada após normalização. Focal de importação/pureza:
  351 passes/37.499 asserts. Integral: **2.004 passes, zero falhas, 277 arquivos,
  123,79 s**. Tipos, Biome/855, Vite/1,02 s, Kids: compilação/5,6 s, tipos/9,8 s,
  59 páginas/665 ms e diff check passaram. Custo da extração: +0,37 kB no worker
  glTF e +0,32 kB no painel lazy; não é otimização de bundle. Sem dependência ou
  ativação pública. Review: `.audits/molda-evolution/obj-bundle-l164.md`.

### Lote 165 concluído: seleção de materiais sem ambiguidades silenciosas

- Resolver nomes exatos em bibliotecas ordenadas; conservar identificação por
  arquivo/declaração. Uma lista mtllib busca arquivos na ordem informada. Para
  múltiplas declarações de listas, exigir política explícita de escopo em vez
  de afirmar uma precedência que a fonte não estabeleceu claramente.
- Materiais duplicados dentro da mesma biblioteca exigem escolha explícita de
  primeiro/último; nome ausente não vira branco silenciosamente. Permitir uma
  opção de fallback relatado, sem alterar os dados fonte ou esconder arquivos
  faltantes do conjunto local.
- Selecionar somente materiais utilizados por faces, distinguindo variantes com
  e sem coordenadas de textura quando houver mapas. Pontos/linhas continuam
  construção conforme lote 162. Planejar IDs/vínculos por face sob teto nativo,
  sem ler coordenadas, propriedades numéricas ou pixels.
- Testar precedência, escopo explícito, duplicatas, fallback, nomes especiais,
  variantes UV, índices fonte altos, ownership e limites. Interpretação de cor,
  opções de textura e conversão PBR/raster seguem em estágio separado.
- Implementado e revisado. Nove testes; reflexão de ambiente separada de mapas UV
  após regressão vermelha/verde. Cache de classificação compartilhado entre
  escopos só durante a chamada. Focal: 77 passes/547 asserts. Integral:
  **2.014 passes, zero falhas, 278 arquivos, 122,42 s**. Tipos, Biome/857,
  Vite/1,17 s, Kids: compilação/5,6 s, tipos/9,0 s, 59 páginas/701 ms e diff check
  passaram. Sem dependência/ativação pública. Review:
  `.audits/molda-evolution/obj-material-selection-l165.md`.

### Lote 166 concluído: interpretação de aparência MTL

- Interpretar apenas declarações selecionadas, mantendo fonte imutável e
  relatando redeclarações, defaults e precedências. Não confundir duplicata de
  nome de material (lote 165) com propriedades repetidas dentro da declaração.
- Tratar espaço de cor como uma interpretação explícita; MTL não fornece a
  garantia de cor do glTF. RGB/XYZ/espectral, dissolve/halo/Tr e modelos de
  iluminação não são sinônimos de cor/transparência PBR.
- Priorizar fatores PBR explícitos quando presentes e identificar qualquer
  aproximação de brilho Phong como aproximação, não conversão exata. Validar
  intervalos antes de operações numéricas; não corrigir fonte por clamp silencioso.
- Produzir a base escalar e os índices de propriedades/mapas efetivos sem
  decodificar pixels. Transformações/canais de textura ficam no lote seguinte,
  antes da materialização; bump/normal/reflexão devem continuar distintos.
- Verificar números, conflitos, seleção com/sem UV, defaults, preservação da
  fonte e consumo limitado antes dos próximos estágios de raster e materialização.
- Implementado e revisado. Dez testes novos; comparação com Three corrigida
  após identificar seus coeficientes/expoente arredondados, mantendo curvas
  exatas antigas e goldens de produção. Focal: 372 passes/38.783 asserts;
  integral: **2.025 passes, zero falhas, 280 arquivos, 123,65 s**. Tipos,
  Biome/862, Vite/1,10 s, Kids: compilação/19,3 s, tipos/12,9 s, 59 páginas/730 ms
  e diff check passaram. Três hashes do benchmark glTF preservados; sem alegação
  de ganho de desempenho. Review: `.audits/molda-evolution/mtl-base-l166.md`.

### Lote 167 concluído: mapas MTL e contratos de amostragem

- Planejar só mapas efetivos da variante com UV, antes de bytes/pixels; omissões
  de mapas sem representação e conflitos entre mapas do mesmo papel são explícitos.
  Reflexão não depende de UV e não pode desaparecer no filtro de superfície.
- Distinguir canais RGB/dados/alpha, opções repetidas, ganho/base, espaço de cor,
  offsets/escalas e recursos sem representação nativa. Bump RGB e map_Ns como
  roughness exigem interpretação escolhida, nunca detecção pelo nome do arquivo.
- Relatar adaptação para nearest/clamp nativo, sem confundir clamp MTL com borda
  estendida. Mapas conservados precisam compartilhar a transformação UV; não
  reamostrar ou alinhar silenciosamente mapas diferentes. Verificar orientação
  contra implementação independente e manter valores fonte sem arredondamento.
- Testar opções, precedência, variantes sem UV, valores extremos e ownership.
  Nenhum resultado deste planejamento é documento adotado ou raster aprovado.
- Aplicar a transformação compartilhada na geometria por material/face, após
  preflight próprio das tuplas/IDs e antes da inversão V. Conservar costuras e
  variantes sem UV; construção não ganha textura. Conferir integração real do
  conjunto local até geometria sem confundir esse fluxo com documento completo.
- Implementado e revisado. Quatorze testes novos, incluindo UV conferido contra
  Three sem carregamento e fluxo local real até geometria, costuras/variantes e
  texels nativos. Focal: 387 passes/39.055 asserts; integral: **2.040 passes,
  zero falhas, 282 arquivos, 125,08 s**. Tipos, Biome/869, Vite/1,30 s, Kids:
  compilação/5,6 s, tipos/9,7 s, 59 páginas/583 ms e diff check passaram. Dois
  erros de tipagem de fixtures corrigidos sem casts de dados. Sem dependência,
  ativação pública ou alegação de ganho de desempenho. Review:
  `.audits/molda-evolution/mtl-textures-l167.md`.

### Lote 168 concluído: núcleo raster e imagens OBJ

- Extrair o núcleo puro PNG/JPEG para uso compartilhado, conservando os contratos
  e testes glTF, limites, pixels 8/16 bits, causas de erros e intervalos próprios.
  Decodificação de amostras não escolhe curva ICC/gamma/EXIF nem interpretação MTL.
- Resolver somente recursos dos mapas escolhidos, por caminho relativo ao MTL;
  preservar identidade por caminho/intervalo e limitar todos os rasters antes
  de decodificar qualquer pixel. Não ler mapas omitidos nem usar IO/canvas.
- Verificar regressão dos decoders, orçamento agregado/exato, aliases, ownership,
  erro contextual e imagens reais. Materialização nativa, combinação de mapas,
  fatores e quantização seguem depois, sem confundir pixels com adoção OBJ.
- Implementado e revisado. Sete testes novos e gate de arquitetura do núcleo;
  decoders/oracles anteriores mantidos. Focal: 397 passes/39.181 asserts;
  integral: **2.050 passes, zero falhas, 283 arquivos, 124,85 s**. Tipos,
  Biome/879, Vite/1,25 s, Kids: compilação/6,3 s, tipos/9,1 s, 59 páginas/639 ms
  e diff check passaram. Três hashes glTF preservados. Extração acrescentou
  0,97 kB ao worker glTF e 0,14 kB ao painel, sem alegação de ganho de bundle,
  CPU ou RAM. Sem dependência/ativação pública. Review:
  `.audits/molda-evolution/obj-rasters-l168.md`.

### Lote 169 concluído: aparência OBJ e fatores efetivamente utilizados

- Compor seleção, propriedades efetivas, mapas, fatores e vínculos UV em um
  planejamento de aparência antes de pixels, preservando identidade de origem.
  Defaults de superfície sólida não são automaticamente fatores de uma textura:
  por exemplo, ausência de Pm não deve zerar um mapa de metal válido.
- Distinguir fator PBR autorado, brilho legado substituído por mapa PBR e base
  usada pela variante sem UV. Relatar o que realmente contribui à conversão;
  não validar como nativo um parâmetro explicitamente descartado nem esconder
  inconsistência de uma variante que ainda usa esse parâmetro.
- Preparar referências exatas para rasters e compartilhar trabalho por declaração
  apenas durante a chamada. Cor/alpha de imagem, orientação de normais e limites
  de materialização exigem contratos explícitos. Manter fonte intacta e erros
  contextualizados no arquivo; o plano ainda não é documento adotado.

- Implementado e revisado. Oito testes novos; focal 406 passes/39.276 asserts;
  integral: **2.059 passes, zero falhas, 284 arquivos, 127,27 s**. Tipos,
  Biome/881, Vite/1,75 s, Kids (6,8 s compilação, 8,9 s tipos, 59 páginas)
  e diff check passaram. Sem nova dependência, ativação pública ou aumento
  dos chunks medidos. Review: `.audits/molda-evolution/obj-appearance-l169.md`.

### Lote 170 concluído: imagens e materiais OBJ nativos

- Materializar os planos escolhidos com bake linear de cor/fatores, alpha
  explícito, canais escalares e orientação de normal verificada contra a base
  tangente. Transparência não deve revelar uma base sólida indevida sob a imagem.
- Planejar todas as imagens convertidas antes de alocar pixels, deduplicando
  apenas receitas equivalentes na chamada. Quantização, mistura de resoluções
  e interpretações exigem relatório; sem resampling silencioso ou perda de fonte.
- Validar materiais/imagens com o domínio nativo e seus limites, incluindo
  casos extremos, cópias e regressão glTF. Geometria/hierarquia/documento completo,
  worker e revisão/adoção OBJ seguem na sequência.

- Implementado e revisado. Doze testes novos, com leitores nativos, materiais
  Three, oito casos de base tangente e GLB validado/reaberto. Focal: 419 passes;
  integral: **2.072 passes, zero falhas, 285 arquivos, 128,23 s**. Tipos,
  Biome/887, Vite/1,30 s, Kids (6,3 s compilação, 8,8 s tipos, 59 páginas)
  e diff check passaram. Limites exatos de imagens/pixels e ownership testados;
  três hashes glTF preservados, sem alegação de ganho de desempenho neste lote.
  Review: `.audits/molda-evolution/obj-native-materials-l170.md`.

### Lote 171 concluído: objetos OBJ e organização nativa

- Compor nós pela identidade/ordem das declarações `o`, sem unir nomes repetidos
  ou inventar aninhamento a partir das associações `g`. Manter coordenadas e
  transformações identidade; pontos não referenciados continuam em peça própria.
- Preservar objetos explicitamente vazios como grupos nativos, com escolha
  explícita/relatada caso sejam omitidos. Conferir o teto total de nós antes de
  adaptar nomes ou materializar geometria/pixels, incluindo a peça de construção.
- Relatar grupos de associação não representados sem duplicar geometria; testar
  fontes intactas, limites, referências e integração nativa/GLB. Documento completo
  e relatório composto, worker e revisão/adoção OBJ continuam na sequência.

- Implementado e revisado. Sete testes novos, com leitor/grafo nativos e GLB
  validado/reaberto, sem erros/avisos. Focal: 427 passes; integral: **2.080 passes,
  zero falhas, 286 arquivos, 127,95 s**. Tipos, Biome/889, Vite/995 ms, Kids
  (4,2 s compilação, 8,0 s tipos, 59 páginas) e diff check passaram. Limites
  de 512 nós/128 partes, reserva de construção, fonte intacta e cópias testados.
  Review: `.audits/molda-evolution/obj-hierarchy-l171.md`.

### Lote 172 concluído: documento OBJ completo e relatório de conversão

- Integrar conjunto completo, seleção/aparência, geometria, organização, rasters
  e materiais sob identidade explícita da plataforma, sem relógio/IDs aleatórios,
  IO ou aprovação automática. Conferir limites e decisões antes do trabalho pesado.
- Validar o documento pelo leitor nativo completo, com referências, buffers
  próprios e custos reais. Compartilhar regras comuns de identidade/custos com
  glTF sem acoplar os formatos entre si nem alterar seus resultados existentes.
- Compor todas as adaptações/omissões por estágio, com orçamento próprio de
  relatório e fonte identificável. Retorno requer revisão e não é arquivo original
  preservado nem permissão para salvar. Worker, revisão/adoção e experiência OBJ
  da oficina serão os próximos passos.

- Implementado e revisado. Dez testes novos; focal ampliado com worker glTF:
  448 passes. Integral: **2.091 passes, zero falhas, 287 arquivos, 130,12 s**.
  Tipos, Biome/897, Vite/1,15 s, Kids (6,8 s compilação, 9,3 s tipos, 59 páginas)
  e diff check passaram. Três hashes de materiais glTF preservados. Helpers
  comuns acrescentaram 0,14 kB ao worker glTF e 0,11 kB ao painel, sem promessa
  de ganho de bundle/CPU/RAM. Review: `.audits/molda-evolution/obj-native-document-l172.md`.

### Lote 173 concluído: protocolo e worker OBJ

- Leitura/conversão completa em worker cancelável, sob tokens de criação,
  revisão e pedido. Preflight inteiro antes de copiar/enviar, sem transferir
  originais. Faltantes não publicam documento parcial; resultado exige revisão.
- Token/identidade/preflight comuns com glTF; paths por formato, sem acoplar
  parsers. Domínio valida documento; reader confere identidade, custos reais,
  seis estágios estritos, referências e coerência de escolhas/aparência.
- Teto de 65.536 decisões e 4 Mi unidades UTF-16 de textos/chaves de campo,
  cobrado incrementalmente em produtor e reader, sem truncar. Avisos/nomes de
  imagens antecipados ao plano antes do bake; pixels/receitas preservados.
- Worker real, cancelamento/reentrância, snapshots/bytes próprios, faltantes,
  payloads falsos, todos os códigos de aviso e tetos exatos testados. Focal
  ampliado: 463 passes/48 arquivos. Integral: **2.106 passes, zero falhas,
  290 arquivos, 133,41 s**. Tipos/Biome (914 arquivos), Vite (1,07 s), Kids
  (5,9 s + 10,2 s, 59 páginas) e diff check passaram. Três hashes glTF intactos.
- Sem ganho CPU/RAM alegado, dependência nova ou ativação pública. Worker OBJ
  ainda não está no bundle da UI; revisão/adoção visual segue no lote 174.
  Review completo: `.audits/molda-evolution/obj-worker-l173.md`.

### Lote 174 concluído: revisão e adoção OBJ na oficina

- Leitura local, ownership/revogação, confirmação e componentes de revisão comuns
  com glTF, mantendo a inspeção/escolha de cena desse formato. OBJ/MTL com políticas
  explícitas, compatibilidade progressiva, prévia isolada e relatório completo.
- Adoção exige consentimento atual e guarda viva de pose/revisão, em um commit
  com undo; cancelar/fechar/trocar formato revoga a tarefa e o consentimento.
- Review reproduziu pontos OBJ sem faces em ±1e308 corrompendo enquadramento.
  Gate de todos os pontos mantidos antes de rasters e câmeras candidatas validadas
  corrigiram a causa, sem estreitar domínio Float64 nem reescalar criações.
- Integral: **2.124 passes, zero falhas, 293 arquivos, 147,20 s**; tipos,
  Biome (933 arquivos), Vite (1,34 s), Kids (9,0 s + 13,7 s, 59 páginas) e
  diff check passaram. Worker OBJ incluído (157,01 kB); glTF 181,86 kB.
  Reorganização de chunks não prova ganho de payload/CPU/RAM. Three >500 kB.
- Sem dependências novas, ativação pública ou homologação GPU/toque/crianças.
  Review completo: `.audits/molda-evolution/obj-workshop-l174.md`.

### Lote 175 concluído: envelope seguro de bbmodel

- Referências primárias conferidas para 4.9, 4.10 e 5.0; cópias de consulta
  Firecrawl isoladas em diretório ignorado. Implementação própria, sem código GPL.
- Preflight JSON extraído de glTF preservando algoritmo/erros; bbmodel com UTF-8
  fatal, dados próprios inertes, 32 MiB/profundidade 128/um milhão de tokens.
  Versões explícitas; contêiner comprimido unsupported. Nenhum IO, execução de
  JavaScript/Molang ou inferência de suporte a plugins/Minecraft.
- Focal ampliado 476 passes/50 arquivos; integral **2.132 passes, zero falhas,
  294 arquivos, 145,07 s**. Tipos, Biome 937 arquivos, Vite 1,41 s, Kids
  6,6 s + 10,0 s/59 páginas e diff check passaram. Worker glTF 181,97 kB.
- Envelope não valida números/modelo nem converte geometria/UV/animação. Sem UI
  bbmodel, dependência nova, ganho de desempenho alegado ou ativação pública.
  Review completo: `.audits/molda-evolution/bbmodel-envelope-l175.md`.

### Lote 176 concluído: referências e hierarquia bbmodel

- Definições/UUIDs únicos, outliner ligado às definições de 5.0 ou aos grupos
  inline de 4.9/4.10. Ordem e dados originais preservados, referências existentes,
  pais únicos e ciclos conferidos. Unlisted separado, sem descarte/inserção.
- Travessia iterativa com 65.536 definições/ocorrências agregadas e profundidade
  128, antes de materialização numérica. Elementos contêineres não viram grupos.
- Focal 76 passes; integral final **2.140 passes, zero falhas, 295 arquivos,
  150,09 s**. Tipos, Biome 939 arquivos, Vite 1,55 s, Kids 7,7 s + 10,6 s/
  59 páginas e diff check passaram. Ajuste de tipagem de fixture revisado e
  verificado novamente; sem alteração de algoritmo ou relaxamento de matcher.
- Sem validação geométrica/UV/rig antecipada, UI bbmodel ou ativação pública.
  Review completo: `.audits/molda-evolution/bbmodel-graph-l176.md`.

### Lote 177 concluído: leitura tipada de cubos e malhas bbmodel

- Preflight agregado antes de XYZ/UV de todos os cubos/malhas. Valores próprios
  e finitos, sem snap/reescala/V-flip/triangulação ou conversão nativa antecipada.
  Preserva pontos, faces/arestas, UVs ausentes/excedentes e referências de textura
  discriminadas. Tipos desconhecidos explícitos, sem fallback para Cube.
- Raw de nós/faces disponível para revisar semânticas não consumidas; sem
  declaração de suporte nativo a todas elas ou a números fora de Float32.
- Focal 86 passes; integral **2.150 passes, zero falhas, 296 arquivos,
  137,62 s**. Tipos, Biome 944 arquivos, Vite 1,29 s, Kids 5,6 s + 9,2 s/
  59 páginas e diff check passaram. Chunks iguais; sem ganho de desempenho alegado.
- Sem UI bbmodel ou ativação pública. Review completo:
  `.audits/molda-evolution/bbmodel-geometry-l177.md`.

### Lote 178 concluído: metadados de texturas e referências bbmodel

- UV separado de cached pixels, metadados de camadas/frames/modos preservados
  sem interpretação. Orçamentos agregados antes de números; listas densas,
  UUIDs/índices/grupos conferidos, dados inertes e sem IO/decoders.
- Default free é none; outros formatos unresolved-default. Sem escolher primeira,
  selecionada/visível/use_as_default. sourcePath geométrico conserva proveniência
  original nos erros de associação, sem decodificar fonte externa/embutida.
- Focal 96 passes; integral **2.160 passes, zero falhas, 298 arquivos,
  136,08 s**. Tipos, Biome 948 arquivos, Vite 1,39 s, Kids 6,3 s + 14,0 s/
  59 páginas e diff check passaram. Chunks mantidos; sem ganho de desempenho alegado.
- Sem conversão PBR/UV/frames/camadas, UI bbmodel ou ativação pública.
  Review: `.audits/molda-evolution/bbmodel-appearance-l178.md`.

### Lote 179 concluído: recursos locais e embutidos bbmodel

- Núcleo Data URI compartilhado com glTF e path literal com OBJ, preservando
  contratos. Base 4.9 distinta de 4.10+. Política explícita de fonte, sem IO,
  acesso absoluto, lookup aproximado ou fallback após erro/faltante.
- Preflight de seleção/recursos antes de cópias/decodificação, dedup por caminho/
  URI em namespaces separados; faltantes sem parcial. Review corrigiu colisão
  de namespace e autorreferência, com regressões vermelhas antes da correção.
- Focal 110 passes; integral **2.183 passes, zero falhas, 301 arquivos,
  136,20 s**. Tipos, Biome 956 arquivos, Vite 1,20 s, Kids 6,0 s + 9,3 s/
  59 páginas e diff check passaram. Benchmark glTF manteve hashes/fonte intacta;
  sem ganho de desempenho alegado. Workers glTF 182,26 kB/OBJ 157,14 kB.
- Sem pixels/conversão nativa, UI bbmodel ou ativação pública.
  Review: `.audits/molda-evolution/bbmodel-resources-l179.md`.

### Lote 180 concluído: pixels e dimensões reais bbmodel

- Recursos escolhidos integrados ao núcleo PNG/JPEG puro. MIME/headers e teto
  agregado antes de descompressão; pixels 8/16 bits próprios, sem inferência
  por cached sizes/UV, flip, premultiplicação ou composição de camadas/frames.
- Índice original de textura liga ao raster compartilhado por recurso. Bindings
  repetidos não multiplicam pixels/cotas. Erros preservam proveniência e causa.
- Focal 93 passes; integral **2.190 passes, zero falhas, 302 arquivos,
  147,99 s**. Tipos, Biome 958 arquivos, Vite 1,49 s, Kids 6,3 s + 11,1 s/
  59 páginas e diff check passaram. Chunks mantidos; sem ganho CPU/RAM alegado.
- Sem UI bbmodel/ativação pública. Review:
  `.audits/molda-evolution/bbmodel-rasters-l180.md`.

### Lote 181 concluído: seleção estrutural bbmodel

- Seleção de grupos/cubos/malhas free, ordem/parentesco preservados. Unlisted
  e tipos sem suporte exigem política, nunca fallback. Omissão opcional de ramo
  inteiro com relatório, sem promover filhos ou reinterpretar contêineres.
- Preflight de 512 nós/128 partes antes de coordenadas/pixels, inclusive ocultos.
  Seleção não aprova geometria, aparência ou animações nem dispensa source readers.
- Focal 99 passes; integral final **2.200 passes, zero falhas, 303 arquivos,
  141,63 s**. Tipos, Biome 960 arquivos, Vite 1,15 s, Kids 5,7 s + 9,6 s/
  59 páginas e diff check passaram. Chunks mantidos; sem ganho CPU/RAM alegado.
- Sem UI bbmodel/ativação pública. Review:
  `.audits/molda-evolution/bbmodel-selection-l181.md`.

### Lote 182 concluído: pivôs e transformações bbmodel

- Pivôs free/local relativos ao Group, XYZ para Mesh, ZYX para Cube/Group e
  rescale de cubos em TRS. Originais mantidos, sem snap/reescala/achatamento.
  Ocorrências ambíguas são unsupported antes de números, nunca merge silencioso.
- Núcleo matemático compartilhado, golden XYZ pré/pós-refatoração idêntico.
  Teste vermelho de signed zero levou à fórmula ZYX direta; matcher preservado.
  Matrizes locais/world conferidas em Float32, sem aprovar geometria antecipadamente.
- Focal 97 passes; integral **2.210 passes, zero falhas, 304 arquivos,
  138,49 s**. Tipos, Biome 962 arquivos, Vite 1,19 s, Kids 5,8 s + 11,9 s/
  59 páginas e diff check passaram. Matrix chunk +0,09 kB; sem ganho CPU/RAM alegado.
- Sem UI bbmodel/ativação pública. Review:
  `.audits/molda-evolution/bbmodel-transforms-l182.md`.

### Lote 183 concluído: metadados comuns e validação de grupos bbmodel

- Metadados definidos de todos os grupos/cubos/malhas free, incluindo não
  selecionados; nomes/flags estritos e pivôs Float64 próprios. Não aplica
  visibilidade/locks, limites nativos ou schema a tipos desconhecidos.
- Primitivas de leitura compartilhadas com geometria/transforms, contratos
  preservados. Composição completa ainda deve chamar esse novo leitor de fonte.
- Focal 110 passes; integral final **2.220 passes, zero falhas, 305 arquivos,
  136,67 s**. Tipos, Biome 965 arquivos, Vite 1,14 s, Kids 5,3 s + 9,2 s/
  59 páginas e diff check passaram. Chunks mantidos; sem ganho CPU/RAM alegado.
- Sem UI bbmodel/ativação pública. Review:
  `.audits/molda-evolution/bbmodel-node-metadata-l183.md`.

### Lote 184 concluído: planejamento da geometria nativa bbmodel

- Plano topológico/custos sem ler XYZ/UV/pixels. Limites agregados incluem pontos
  sem superfície. Cubos reutilizam ciclos próprios e preservam gaiola não coberta.
- Quads mesh usam diagonal original 0–2 com relatório; manter quad editável é
  escolha explícita. Faces sem suporte exigem omissão escolhida, sem perder pontos.
  Arestas de construção independem de textura null; deduplicação por identidade.
- Focal 106 passes; integral **2.231 passes, zero falhas, 306 arquivos, 135,08 s**.
  Tipos, Biome 967, Vite 1,11 s, Kids e diff passaram. Sem UI bbmodel ou ativação
  pública; topologia não aprova parâmetros de cubo, UV, normal ou documento.
  Review: `.audits/molda-evolution/bbmodel-native-geometry-plan-l184.md`.

### Lote 185 concluído: coordenadas locais e limites numéricos bbmodel

- Cubos convertidos com inflate/stretch/pivô; rescale só no TRS. Malhas mantêm
  coordenadas locais e pontos sem superfície. Zero/inversão exigem consentimento
  e relatório, sem engrossar, ordenar ou encaixar automaticamente.
- Float64/signed zero preservados. Limites locais/world e cantos de bounds
  conferidos; underflow Float32 relatado sem modificar coordenadas.
- Focal 114 passes; integral **2.241 passes, zero falhas, 307 arquivos, 136,26 s**.
  Tipos, Biome 969, Vite 1,22 s, Kids e diff passaram. Sem promessa de camera-fit,
  GPU, sombreamento ou importação completa. Review:
  `.audits/molda-evolution/bbmodel-positions-l185.md`.

### Lote 186 concluído: UV autoral por canto bbmodel

- Box UV com orientação/mirror/offset e giros de quarto de volta por índice
  modular constante. Ligação por canto original preservada após triangulação.
- UV ausente exige escolha; valores não recebem margem/nudge da prévia. Review
  corrigiu gate de overflow para as faces retidas, com regressão RED→GREEN.
- Focal 113 passes; integral **2.251 passes, zero falhas, 308 arquivos, 140,15 s**.
  Tipos, Biome 971, Vite 1,45 s, Kids e diff passaram. Normalização, frames,
  materiais e imagens ainda separados; review:
  `.audits/molda-evolution/bbmodel-face-uvs-l186.md`.

### Lote 187 concluído: orientação de imagens e UV no intercâmbio

- Imagens glTF/OBJ usam a orientação nativa da oficina 2D. Exportação GLB converte
  linhas e UV em conjunto; normais compensam a mudança da base tangente.
- Regressões independentes 2D/3D/PNG/normais/roundtrip e worker OBJ nas duas
  convenções. Goldens Studio atualizados após prova de diferença exclusiva no UV;
  hashes históricos mantidos nos testes, sem alterar poses, clipes ou skin.
- Integral **2.264 passes, zero falhas, 310 arquivos, 138,24 s**. Tipos, Biome 975,
  Vite 1,39 s, Kids, cinco testes Studio e benchmarks passaram. Métricas de CPU
  registradas sem alegar ganho de velocidade; sem ativação pública/homologação GPU.
  Review: `.audits/molda-evolution/texture-orientation-l187.md`.

### Lote 188 concluído: UV normalizado e configuração de imagens bbmodel

- UV lógico por textura/projeto normalizado por canto original, preservando seams
  e triangulação. Overflow recusado; colapso numérico e UV externo relatados sem snap.
- Folhas de animação configuradas com pixels reais, sequência/FPS e limites nativos;
  aliases orçados antes de sequências/pixels. Sem corte, trim ambíguo ou redução de FPS.
- Focal 128 passes; integral **2.287 passes, zero falhas, 312 arquivos, 138,40 s**.
  Tipos, Biome 980, Vite 1,10 s, Kids e diff passaram. Review:
  `.audits/molda-evolution/bbmodel-native-uv-layout-l188.md`.

### Lote 189 concluído: materialização de geometria editável bbmodel

- Posições, topologia e UV normalizado reunidos em malhas próprias, preservando
  vértices de construção, faces, seams e materiais por face.
- Builder nativo relata superfícies que não desenham sem removê-las da edição;
  materiais por textura explícitos, faces sem textura herdam o material da peça.
- Focal 124 passes; integral **2.299 passes, zero falhas, 313 arquivos, 138,18 s**.
  Tipos, Biome 982, Vite 1,24 s, Kids e diff passaram. Não aprova shading, camadas,
  PBR, hierarquia ou documento completo. Review:
  `.audits/molda-evolution/bbmodel-geometries-l189.md`.

### Lote 190 concluído: imagens editáveis bbmodel e política de precisão

- Rasters/layouts correspondentes convertidos em imagens nativas próprias, com
  orientação bottom-up, alpha e quadros preservados; limites antes dos pixels.
- Redução de 16 para 8 bits explícita; sem confundir bitmap selecionado
  com composição de camadas nem antecipar aprovação de shader/PBR/sampler.
- Focal 123 passes; integral **2.311 passes, zero falhas, 314 arquivos, 138,19 s**.
  Tipos, Biome 984, Vite 1,15 s, Kids e diff passaram. Todos os 65.536 valores de
  canal de 16 bits conferidos; limite exato de 32 MiB e ownership de aliases.
  Review: `.audits/molda-evolution/bbmodel-images-l190.md`.

### Lote 191 concluído: materiais de textura bbmodel com adaptações explícitas

- Interpretação de iluminação, lados, repetição e grupos PBR planejada antes de
  recursos/pixels; nenhuma aproximação visual escolhida silenciosamente.
- Materiais nativos vinculados às imagens convertidas, mantendo relatórios
  e sem aprovar automaticamente geometria, grupos PBR completos ou documento final.
- Focal 124 passes; integral **2.322 passes, zero falhas, 315 arquivos, 137,66 s**.
  Tipos, Biome 986, Vite 1,71 s, Kids e diff passaram. Integração real de geometria,
  imagens e materiais com renderer nativo e GLB/PNG independente nas três revisões.
  Review: `.audits/molda-evolution/bbmodel-texture-materials-l191.md`.

### Lote 192 concluído: hierarquia e estados de peças bbmodel

- Nós/referências com nomes, ordem e TRS próprios; grupos/peças preservados e
  todos os vínculos conferidos antes das cópias.
- Herança de visibilidade/travas e descarte da marca de exportação exigem escolhas
  explícitas; fonte e flags locais conservados, sem omissão automática de peças.
- Focal 132 passes; integral **2.332 passes, zero falhas, 316 arquivos, 142,45 s**.
  Tipos, Biome 988, Vite 1,16 s, Kids e diff passaram. CSS passou de 53,69 para
  53,82 kB; a fonte Tailwind inclui testes e emitiu a utility transform. Não há
  ganho de performance alegado. Review: `.audits/molda-evolution/bbmodel-hierarchy-l192.md`.

### Lote 193 concluído: metadados de superfície e aparência sem textura bbmodel

- Conferir cor de identificação, shading, ordem de desenho e costuras de origem
  antes de escolher adaptações; não confundir marcador visual com cor de material.
- Montar materiais padrão das peças com política/relatório explícitos, mantendo
  separados os vínculos de textura e a validação de documento completo.
- Focal 139 passes; integral **2.353 passes, zero falhas, 318 arquivos, 139,99 s**.
  Tipos, Biome 992, Vite 1,14 s, Kids e diff passaram. Metadados de todos os nós,
  orçamento agregado de seams e ownership verificados. Review:
  `.audits/molda-evolution/bbmodel-surface-materials-l193.md`.

### Lote 194 concluído: compatibilidade de superfícies bbmodel

- Exigir escolhas explícitas para normais nativas, ordem de desenho e descarte
  de labels de seams; não aprovar labels desconhecidos por fallback.
- Conferir UV externo ao quadro e relatar o uso do sampler nativo sem alterar
  coordenadas. Manter separadas as políticas de materiais, pixels e fonte restante.
- Focal 133 passes; integral **2.365 passes, zero falhas, 319 arquivos, 137,78 s**.
  Tipos, Biome 994, Vite 1,28 s, Kids e diff passaram. Normais de face torcida
  conferidas por oracle analítico; sampler/quadros pelo recurso de render nativo.
  Review: `.audits/molda-evolution/bbmodel-surfaces-l194.md`.

### Lote 195 concluído: composição e relatório de importação bbmodel

- Reunir leitores, políticas, geometria, imagens, materiais e hierarquia em uma
  conversão nativa com orçamento conjunto e validação final.
- Cobrir campos ainda não mapeados sem descarte silencioso; clipes/controladores
  ainda não convertidos precisam de recusa ou omissão explicitamente relatada.
- Manter relatório completo, ausência de adoção automática e nenhuma ativação
  pública antes de worker, interface de revisão e guardas transacionais.
- Focal 160 passes; integral **2.387 passes, zero falhas, 320 arquivos, 138,24 s**.
  Tipos, Biome 1.001, Vite 1,33 s, Kids e diff passaram. Pipeline real nas três
  revisões até documento, GLB/Khronos e PNG/libvips; budgets, omissões, ownership
  e guards antes de materialização/decodificação. Review:
  `.audits/molda-evolution/bbmodel-native-l195.md`.

### Lote 196 concluído: transporte cancelável e relatórios bbmodel

- Integrar o núcleo ao padrão de worker próprio por tarefa, com snapshot orçado,
  cancelamento real e identidade/revisão/pedido conferidos antes da adoção.
- Ler estritamente documento, custos e diagnósticos recebidos, mantendo as
  escolhas explícitas, limites e ausência de resultados parciais.
- Focal 154 passes; integral **2.414 passes, zero falhas, 323 arquivos, 142,79 s**.
  Tipos, Biome 1.014, Vite 1,39 s, Kids e diff passaram. Worker real nas três
  revisões; catálogo exaustivo, limites exatos, ownership e cancelamento. Corrigida
  a contagem de texto para produtor/receptor usarem a mesma estrutura inteira.
  Review: `.audits/molda-evolution/bbmodel-worker-l196.md`.

### Lote 197 concluído: revisão e adoção bbmodel na oficina

- Conectar seleção local e runner lazy ao fluxo de prévia/relatório/consentimento,
  reutilizando as guardas de sessão e commit único desfazível.
- Expor escolhas de aparência e compatibilidade em linguagem de oficina; omissões
  continuam explícitas, sem fingir suporte a clipes, camadas ativas ou PBR completos.
- Manter originais para download durante a sessão, fechar tarefas ao mudar formato
  e verificar caminhos locais, estados, cancelamento, revisão viva e regressões.
- Focal 158 passes; integral **2.431 passes, zero falhas, 327 arquivos, 146,85 s**.
  Tipos, Biome 1.029, Vite 1,23 s, Kids e diff passaram. Painel lazy e worker
  bbmodel alcançáveis, fluxo compartilhado com OBJ, todas as opções representadas
  e regressões de consentimento/undo/cores/arquivos. Review:
  `.audits/molda-evolution/bbmodel-ui-l197.md`.

### Lote 198 concluído: estrutura de animações bbmodel

- Ler metadados e cardinalidades de clipes/animadores/chaves com limites antes
  de cópias e de interpretação de valores. Expressões permanecem dados inertes.
- Distinguir semântica de origem de duração/fps/interpolação nativos; não ativar
  importação de movimentos antes da conversão, relatório, worker e UI completos.
- Focal 161 passes; integral **2.442 passes, zero falhas, 328 arquivos, 145,82 s**.
  Tipos, Biome 1.033, Vite 1,57 s, Kids e diff passaram. Três versões, identidade
  literal, limites exatos/ordem de leitura e ownership. Review:
  `.audits/molda-evolution/bbmodel-animation-structure-l198.md`.

### Lote 199 concluído: valores e descritores de chaves bbmodel

- Ler canais de transformação conhecidos, valores brutos e handles de curvas
  com orçamentos; efeitos/tipos/canais desconhecidos continuam explícitos e inertes.
- Preservar precisão e distinguir expressões de constantes, sem avaliar Molang,
  resolver alvos, reordenar tempos ou aprovar equivalência com curvas nativas.
- Focal 174 passes; integral **2.455 passes, zero falhas, 329 arquivos, 169,25 s**.
  Tipos, Biome 1.037, Vite 1,38 s, Kids e diff passaram. Handles próprios, alias
  explícito, fonte não modificada e texto conjunto entre clipes. Review:
  `.audits/molda-evolution/bbmodel-animation-keys-l199.md`.

### Lote 200 concluído: constantes de animação bbmodel

- Reconhecer apenas literais numéricos com semântica confirmada na origem;
  expressões seguem não resolvidas, sem executar parser, scripts ou plugins.
- Preparar valores constantes e proveniência para conversão posterior, mantendo
  separados os gates de eixos/curvas, binding, seleção e adoção nativa.
- Focal 185 passes; integral **2.466 passes, zero falhas, 330 arquivos, 156,54 s**.
  Tipos, Biome 1.040, Vite 1,50 s, Kids e diff passaram. Oracle decimal independente,
  limites numéricos explícitos e ausência de XYZ parcial. Review:
  `.audits/molda-evolution/bbmodel-animation-constants-l200.md`.

### Lote 201 concluído: vínculos explícitos de animações bbmodel

- Resolver referências sem escolher silenciosamente nomes ambíguos ou destinos
  incompatíveis; detectar múltiplos animadores destinados ao mesmo grupo.
- Preservar índices de origem e distinguir alvo selecionado/omitido, referência
  ausente e tipo não suportado; não interpretar curvas nem adotar clipes nesta etapa.
- Review corrigiu canal ausente no leitor 199: carregador da origem não alcança
  o default do construtor. Prova red/green e novas verificações completas.
- Focal 197 passes; integral **2.478 passes, zero falhas, 331 arquivos, 164,54 s**.
  Tipos, Biome 1.043, Vite 1,31 s, Kids e diff passaram. CSS 53,86 kB pela
  varredura de token em comentário/teste; sem ganho de performance alegado.
  Review: `.audits/molda-evolution/bbmodel-animation-bindings-l201.md`.

### Lote 202 concluído: preparação de trilhas numéricas bbmodel

- Organizar chaves constantes de canais conhecidos preservando índices/precisão;
  tempos duplicados, expressões e curvas não resolvidas não viram trilhas parciais.
- Preparar convenção de eixos/handles por versão sem modificar a fonte, mantendo
  separados sampling, duração/loop, orçamento nativo conjunto e adoção dos clipes.
- Focal 219 passes; integral **2.500 passes, zero falhas, 332 arquivos, 163,63 s**.
  Tipos, Biome 1.046, Vite 1,13 s, Kids e diff passaram. Migração considera a
  ordem codec/construtor/alias; handles, precisão e fonte preservados. Review:
  `.audits/molda-evolution/bbmodel-animation-tracks-l202.md`.

### Lote 203 concluído: amostragem matemática de curvas bbmodel

- Avaliar trilhas numéricas com busca por intervalo, pre/post, step, linear,
  Catmull-Rom e Bezier; valores/tempos fora de faixa não viram fallback numérico.
- Modelar curvas matemáticas e tempos exatos, distinguindo-as das aproximações
  de reprodução do Blockbench. Conversão posterior deve exigir escolha/relatório
  dessas adaptações; não habilitar equivalência ou adoção silenciosa.
- Manter rotação quaternion/global, pose-base, duração/loop temporal, planejamento
  de FPS/orçamento nativo, relatório e UI separados deste avaliador puro.
- Focal 249 passes; integral **2.530 passes, zero falhas, 333 arquivos, 164,49 s**.
  Tipos, Biome 1.048, Vite 1,15 s, Kids e diff passaram. Oracle independente de
  curvas, faixa F64 e prova de busca em 8.192 keys, sem benchmark alegado. Avisos
  act da suíte não se repetiram no focal isolado; investigação permanece aberta.
  Review: `.audits/molda-evolution/bbmodel-animation-sampling-l203.md`.

### Lote 204 concluído: agendas de amostragem e orçamento nativo conjunto

- Unir grade de FPS e tempos autorais sem snap, duplicatas ou perda de limites
  por arredondamento. Compartilhar o mecanismo temporal aplicável com glTF.
- Conferir todos os clipes/trilhas/instantes antes de materializar agendas e
  valores nativos; não confundir orçamento fonte com orçamento final de amostras.
- Agenda não decide duração/modo de reprodução, não amostra valores e não aprova
  perdas. Pose-base, políticas de conversão, relatório e integração continuam depois.
- Review acrescentou modo authored/grid explícito por trilha para evitar grade
  desnecessária; budgets exatos e +1 antes de materialização, três versões e
  oracle temporal independente. Focal 311 passes; integral **2.548 passes, zero
  falhas, 335 arquivos, 164,57 s**. Tipos, Biome 1.052, Vite 1,09 s, Kids/diff
  passaram. Worker glTF +0,30 kB pelo compartilhamento. Review:
  `.audits/molda-evolution/bbmodel-animation-schedules-l204.md`.

### Lote 205 concluído: conversão de valores locais de poses bbmodel

- Converter deslocamentos/ângulos/escalas numéricos sobre a pose-base, mantendo
  soma Euler da origem separada de multiplicação quaternion e de local-delta.
- Tratar ponderação, escala zero e faixa numérica explicitamente, sem normalizar
  ângulos, mudar pivôs ou aprovar clipping/reprodução/binding por consequência.
- Manter conversão de clipes completos, rotação global/quaternion/IK, relatório,
  validação de poses mundiais e integração/consentimento separados deste módulo.
- Focal 336 passes; integral **2.560 passes, zero falhas, 336 arquivos, 161,28 s**.
  Tipos, Biome 1.054, Vite 1,15 s, Kids/diff passaram. Oracle independente de
  poses parentadas, peso antes de voltas Euler, opções de escala zero e faixa
  local explícitas. Review: `.audits/molda-evolution/bbmodel-animation-pose-l205.md`.

### Lote 206 concluído: montagem de clipes nativos bbmodel

- Compor agendas, avaliador e poses em clipes locais próprios, com orçamento
  conjunto antes dos valores e escolha explícita de adaptação matemática.
- Preservar step/linear onde representáveis; curvas e rotação Euler exigem grade
  e relatório de aproximação, sem alegar fidelidade entre as amostras.
- Manter duração, binding, flags, metadados, bounds mundiais e adoção como gates
  separados e explícitos; não habilitar o importador público por consequência.
- Focal 264 passes; integral **2.574 passes, zero falhas, 337 arquivos, 162,05 s**.
  Tipos, Biome 1.057, Vite 1,25 s, Kids/diff passaram. Clipes próprios, reprodução
  nativa e budgets exatos; contraprova de aliasing com FPS baixo. Review:
  `.audits/molda-evolution/bbmodel-native-clips-l206.md`.

### Lote 207 concluído: planejamento de compatibilidade dos clipes bbmodel

- Resolver duração/peso/repetição de clipes independentes com políticas explícitas,
  juntando descritores, bindings e trilhas numéricas sem interpretar Molang.
- Recusar movimentos incompatíveis por inteiro ou omiti-los com escolha e motivo;
  separar dados não mapeados e metadados de editor das transformações convertidas.
- Preservar proveniência e preparar relatório limitado; manter bounds mundiais,
  composição no documento e protocolo/revisão/adoção como integrações seguintes.
- Entrada única de conversão projeta opções por etapa, preservando leitores
  estritos. Focal 313 passes; integral **2.590 passes, zero falhas, 338 arquivos,
  164,44 s**. Tipos, Biome 1.063, Vite 1,20 s, Kids/diff passaram. Review:
  `.audits/molda-evolution/bbmodel-clip-planning-l207.md`.

### Lote 208 concluído: limites de poses animadas na hierarquia

- Conferir composição de posições/escalas e alcance da geometria, não apenas
  componentes locais ou instantes autorais isolados.
- Usar envelopes conservadores por clipe/hierarquia; não alterar dados, ignorar
  filhos não animados nem afirmar que rejeição conservadora prova overflow real.
- Manter análise de faixa distinta de fidelity de curvas, benchmark de desempenho,
  normais/câmera/GPU e homologação visual; integrar ao documento depois do review.
- Focal 316 passes; integral **2.605 passes, zero falhas, 340 arquivos, 162,89 s**.
  Tipos, Biome 1.066, Vite 1,34 s, Kids/diff passaram. Review e contraprovas de
  limites somente nas chaves e de rejeição conservadora documentados em
  `.audits/molda-evolution/bbmodel-animation-bounds-l208.md`.

### Lote 209 concluído: clipes no importador bbmodel completo e na oficina

- Conectar conversão e limites de poses ao candidato nativo antes de recursos de
  imagem e da prévia, mantendo escolhas explícitas e separadas para controladores.
- Integrar proveniência, adaptações e omissões ao relatório limitado e validar o
  novo contrato no worker; preservar o caminho estático e as guardas de adoção.
- A integral encontrou o contrato de cobertura de opções da UI ainda incompleto.
  Concluir os controles e o resumo de movimentos neste lote, preservando a exigência
  de cobertura total; não ativar formato público nem declarar homologação visual.
- Integração final inclui escolhas completas, controles de movimento/controladores
  separados, nomes e motivos de omissão, revisão paginada, player, relatório para
  baixar e invalidação de aceite ao mudar opções. GLB/undo/redo verificados.
- Focal 240 passes; integral final **2.623 passes, zero falhas, 343 arquivos,
  163,43 s**. Tipos, Biome 1.076, Vite 1,18 s, Kids/diff passaram. Browser continua
  indisponível; sem homologação visual/GPU. Review e crescimento dos chunks em
  `.audits/molda-evolution/bbmodel-animated-document-l209.md`.

### Lote 210 concluído: camadas de pintura bbmodel

- Conferir persistência/composição das camadas no código de referência e distinguir
  PNG composto de camadas editáveis, sem ler/executar dados de sessão como código.
- Definir representação nativa e limites conjuntos antes de abrir/alocar pixels;
  deslocamento/escala/blend não podem virar crop ou descarte silenciosos.
- Integrar relatório, worker e controles no mesmo incremento quando ampliar as
  opções, preservando o contrato de cobertura da UI. Pesquisa inicial em
  `.audits/molda-evolution/bbmodel-layer-research.md`.
- Camadas inteiras normais adaptadas, com ordem/nomes/visibilidade/opacidade e
  pixels próprios; camadas ocultas não descartadas. Root apenas fornece dimensões.
  Limites conjuntos antes de descompressão, relatório fechado, revisão paginada,
  escolha explícita e undo/redo completos. Sem promessa de composição Canvas idêntica.
- Focal 207 passes; integral **2.642 passes, zero falhas, 347 arquivos, 161,72 s**.
  Tipos, Biome 1.086, Vite 1,30 s, Kids/diff passaram. Corrida do teste de material
  da prévia reproduzida e espera corrigida; 30 repetições passaram. Review:
  `.audits/molda-evolution/bbmodel-paint-layers-l210.md`.

### Lote 211 concluído: escopo de geração de CSS

- Retomar pendência das fases 2/3: o scanner amplo inclui núcleo, testes e fixtures
  que não são fontes visuais. Levantar baseline e fontes reais antes de restringir.
- Preservar todas as utilitárias de produção, temas e consumidores Kids/playground;
  não renomear comentários/testes para esconder efeitos do scanner nem alterar UI
  para satisfazer redução de tamanho. Medir sem concorrência com validadores.
- Fontes da UI registradas no stylesheet da biblioteca; 1.078→165 arquivos,
  CSS de produção idêntico pelo hash e pipeline isolado mediano 128,76→49,17 ms.
  Ganho do build de CSS, não FPS. Regressão compila os dois consumidores reais.
- Focal 10 passes; integral **2.643 passes, zero falhas, 348 arquivos, 165,40 s**.
  Tipos, Biome 1.088, Vite 1,16 s, Kids/diff passaram. Teste antigo de fonte ampla
  atualizado sem retirar exigências. Review: `.audits/molda-evolution/css-sources-l211.md`.

### Lote 212 concluído: notificações de persistência v2 entre abas

- Emitir aviso pequeno somente após commit bem-sucedido de criação, gravação,
  remoção, restauração ou promoção local, isolado por banco e object store reais.
- Mensagem não carrega documento nem concede revisão de escrita; a transação
  CAS continua sendo autoridade. Falha/ausência do canal não desfaz um commit.
- Assinaturas com ownership/cancelamento explícitos e validação de protocolo;
  preservar segurança e originais. Conectar aviso à revisão da oficina sem
  substituição automática de trabalho aberto, com testes de concorrência.
- Canal/index reader/observer e aviso na oficina integrados. Escrita continua
  transacional; conteúdo, histórico e revisão de adoção não mudam com uma mensagem.
  ID original também fica vinculado ao token CAS após falha reproduzida no review.
- Integral **2.655 passes, zero falhas, 352 arquivos, 166,01 s**; tipos, Biome 1.096,
  Vite 1,04 s, Kids/diff passaram. Nova interação act do teste foi reproduzida e
  corrigida pela espera da assinatura real, sem supressão; 30 repetições passaram.
  Review: `.audits/molda-evolution/scene-storage-notifications-l212.md`.

### Lote 213 concluído: começo rápido e navegação

- Trocar entrada automática na demo fixa por escolha de criação vazia/modelo e nome,
  mantendo projetos existentes e retomada por índice; preview de peças sem GPU.
- Reutilizar catálogo e componentes da plataforma, IDs/pixels independentes e
  escrita CAS de criação, sem ativar formato novo no host público.
- Navegação preserva gestos/poses/mudanças e trata falha de salvamento sem descarte
  implícito. Desenho e critérios: `.audits/molda-evolution/quick-start-l213.md`.
- Host interno conectado, seis templates/vazio e retomada paginada sem ler pinturas;
  foco e ownership de namespace, confirmação de saída/backup e descarte sem retry
  implícito no cleanup. Sem demo automática nem escrita por link inválido/futuro.
- Integral **2.675 passes, zero falhas, 357 arquivos, 169,70 s**; tipos, Biome 1.108,
  Vite 1,32 s e Kids passaram. Integral inicial encontrou name ausente no campo;
  corrigido na produção e repetidos contrato/focal/integral. Sem homologação visual.

### Lote 214 concluído: restauração de cópia nativa

- Trazer arquivo .molda.json da oficina interna, validar/preparar antes de salvar,
  com limites e tarefa cancelável fora da UI; futuro/inválido não vira vazio/reparo.
- Mostrar revisão e criar sob ID novo com CAS nulo, nunca sobrescrever projeto por
  identidade do arquivo. Cancelamento/falha preserva original e trabalho existente.
- Conectar na tela inicial e testar backup→leitura→confirmação→nova criação→retomada,
  ownership por namespace e arquivo, quotas/erros e descarte de resultados tardios.
- Escopo/desenho: `.audits/molda-evolution/native-project-restore-l214.md`.
- Leitor limitado/worker, revisão com nome/prévia/player, confirmação de nova
  identidade e erro/retry integrados; versão pública permanece 1. Fonte preservada.
- Integral **2.685 passes, zero falhas, 360 arquivos, 162,70 s**, tipos/Biome 1.116,
  Vite 1,48 s e Kids passaram. Aviso act do novo teste reproduzido e corrigido pela
  espera do resultado visual; 30 repetições passaram. Avisos em ModelEditor.test
  na integral não se repetiram no focal e permanecem pendentes, sem supressão.

### Lote 215 concluído: persistência por blobs — contratos e baseline

- Retomar armazenamento de conteúdo grande por hash previsto na fase 2, estudando
  o ledger existente, CAS, versões, originais, tombstones e compatibilidade de abas.
- Medir custo/armazenamento e registrar outputs de referência antes de otimizar;
  separar mudança de layout persistido de mudança no documento editável público.
- Definir integridade, deduplicação, quota física, ownership de buffers e coleta
  segura. Não substituir guardas transacionais por confiança em metadados/avisos.
- Integração/migração somente após contratos e provas, sem rollout público/cloud.
- Spec `2026-09-09-molda-blob-persistence.md`, três explorações paralelas e leitura
  direta; não existe blob-store local reaproveitável no Studio/Pinta. Hash remoto
  é JSON, não pixels. Writer v1 ignora novos prefixos na quota: gate explícito.
- Benchmark com cinco cenários, três aquecimentos/dez amostras/processos separados,
  roundtrip e goldens fixos. Teto 32 MiB: save de metadata p50 47,776 ms no simulador;
  regrava 33.561.890 B de documento + 340 B de resumo. Não é medição de browser.
- Perfil dominado por cópias; tipos do script/pacote, Biome e **58 testes/0 falhas**
  passaram. Sem mudanças produtivas; não repetir números da integral/builds 214
  como verificação nova. Evidências em `blob-persistence-l215.md`.

### Lote 216 concluído: codec de manifesto e pixels por hash

- Implementar preparação/hidratação puras, com snapshot antes de await, SHA-256,
  orçamento agregado, ownership, falhas explícitas e cancelamento entre tarefas.
- Manter domínio nativo completo e reader canônico; manifesto não valida sozinho
  vínculos/geometry/skin nem concede token CAS. Sem IO, writer, GC ou migração ainda.
- Testar roundtrip/codec portátil, camadas ocultas, RGBA/indexed, flipbook/clipes/skin,
  bytes corrompidos/faltantes, versões, concorrência do chamador e limites.
- Leitores estruturais compartilham campos canônicos; hidratação ainda exige leitor
  nativo completo. Não alocar pixels fictícios para validar metadata nem confundir
  estrutura tipada com integridade/CAS. Formato futuro conferido antes do layout.
- Teto autoral 32 MiB testado, sem buffers editáveis compartilhados; todos os goldens
  215 preservados. Integral **2.696/0, 362 arquivos, 159,01 s**, tipos/Biome/Vite/Kids
  passaram. Avisos act da integral em ModelEditor.paint.test permanecem sem causa
  provada; review `blob-codec-l216.md`. Ainda sem writer/migração/GC por blobs.

### Lote 217 concluído: quota do writer anterior e registros futuros

- Corrigir contagem de payloads Molda desconhecidos no writer v1 sem interpretar,
  reparar ou apagar esses dados; transação/CAS existentes permanecem obrigatórios.
- Testar limite exato, rollback, concorrência e coexistência com manifestos/blobs.
  Correção vale para código atualizado, não retroativamente para abas já abertas.
- Não ativar novo prefixo em dados existentes, writer de blobs ou namespace público.
- Três falhas reproduzidas antes da correção: limite excedido, payload recém-cometido
  ignorado e dois writers gastando espaço já ocupado. Registros desconhecidos agora
  usam custo raw na transação; outros prefixos/ferramentas continuam fora da quota.
- Focal **56/0**; integral **2.699/0, 363 arquivos, 164,67 s**, tipos/Biome/Vite/Kids
  passaram. Nenhum aviso act nesta integral não encerra a pendência intermitente.
  Review `future-record-quota-l217.md`; teto e formato público permanecem iguais.

### Lote 218 concluído: leitura consistente do armazenamento por blobs

- Ler documento/manifesto, metadata e recursos referenciados em um único snapshot
  IDB; verificar integridade fora da transação sem misturar revisões concorrentes.
- Entender custos lógicos/físicos versionados; manter inline compatível e não
  conceder escrita a partir de metadata ou leitura estrutural. Writer de blobs
  e migração continuam condicionados ao próximo passo transacional verificado.
- Testar leitura/cancelamento/corrupção/ausência/namespace e conflitos em voo;
  preservar originais e dados futuros sem fallback destrutivo.
- Metadata 1/2, custos lógico/físico separados e leitura cancelável integrados.
  Quota corrigida também para recibo presente com custo zero: duas falhas reproduzidas,
  fallback raw preserva/cobra o registro em ambos os layouts. Sem GC nem writer novo.
- Primeiro integral revelou timeout no harness de troca de namespace, seguido de
  cascata. AbortError confirmado; término agora sinalizado também na rejeição,
  explicitamente exigida no teste. Sem mudar cancelamento produtivo ou elevar timeout.
- Integral final **2.727/0, 365 arquivos, 158,54 s**, tipos/Biome/Vite/Kids passaram;
  90 repetições storage e 30 da troca de namespace. Review `blob-reader-l218.md`.

### Lote 219: gravação atômica, referências e migração interna — verificado

- Preparar pixels fora da transação; conferir revisão e dependências reais no commit,
  sem confiar somente no número da revisão, índice ou hash declarado.
- Reutilizar blobs íntegros sem regravá-los; cobrar estado físico final e preservar
  originais/opacos. Coleta apenas quando a ausência de referências for comprovada.
- Converter inline no próximo save autorizado, com rollback integral em falhas;
  integrar save/delete/restore e promoção, sem ativar namespace/formato público.
- Testar concorrência/corrupção entre leitura e commit, migração, quota e notificações;
  medir a integração depois, com os goldens e cenários registrados no lote 215.
- Writer/CAS/GC conservador e migração interna integrados; integral **2.751/0**,
  tipos/Biome/Vite/Kids e cinco benchmarks/goldens passaram. Review `blob-writer-l219.md`.
- Perfil corrigiu comparação repetida: save de metadata 8 MiB iguais 136,6→16,4 ms.
  Teto distinto ainda 105,2 ms contra 47,8 ms inline, com RSS maior no simulador;
  desempenho geral não aceito. Nenhum rollout público ou homologação real.

### Lote 220: preflight equivalente para mudanças de metadata — verificado

- Usar a captura privada já validada/hashada pelo writer para provar igualdade do
  corpo e pixels correntes, sem hidratar novamente apenas ao mudar metadata.
- Compartilhar inspeção estrutural, sem promover manifesto/índice isolados a prova
  de integridade. Mudanças autorais mantêm hidratação completa; CAS/GC/quota intactos.
- Registrar prova e perfil antes de otimizar, testar adulterações/concorrência,
  repetir os cinco goldens e medir antes/depois. Não introduzir cache de confiança.
- Integral **2.765/0**, tipos/Biome/Vite/Kids, 100 repetições CAS e cinco goldens
  passaram. Metadata teto 105,2→72,6 ms; 8 MiB distintos 31,7→21,9 ms no simulador.
  Não generalizar para pintura/RAM de navegador. Review `blob-preflight-l220.md`.
- Browser oficial continua sem conexão; revisão visual/hardware não realizada.

### Lote 221: acabamento do traço de pesos — verificado

- Complementar amostras agrupadas já suportadas com percurso entre posições,
  respeitando a superfície visível, cancelamento/ownership e um único undo.
- Definir amostragem e orçamento sem atravessar oclusões nem tornar o custo do
  pincel dependente de saltos enormes do ponteiro. Testar com Three real sem GPU.
- Medir custo da nova capacidade; não anunciar continuidade/geodesia ou desempenho
  que as provas não sustentem. Integração pública/Studio permanece em outro gate.
- Percurso em tela integrado, até 256 posições sintéticas por segmento, preservando
  todas as posições reais; picking real/oclusão e um undo. Cancelamento durante
  picking inicial e zoom corrigidos após reprodução. Integral **2.783/0** e gates passaram.
- Goldens de pesos preservados; traço longo custa ~8 ms/79 ms nas duas malhas CPU,
  38/90 consultas. Perfil localizou interseções; próxima alavanca abaixo. Review `skin-path-l221.md`.

### Lote 222: candidatos espaciais para picking exato — verificado

- Perfil antes da mudança e hashes fixos do traço; usar índice derivado somente
  para reduzir triângulos candidatos. Resultado final deve continuar vindo do
  intersector nativo, preservando pontos, UVs, normais, material e desempates.
- Índice pertence ao recurso de desenho, sem monkey patch global ou mutação dos
  buffers de render/autoria; invalidar/descarregar junto da geometria dona.
- Malhas deformadas continuam no caminho nativo. Comparar queries e goldens,
  medir criação fria/reuso/long move e verificar todos os consumidores.
- Oracle exato passou em 648 combinações mais fronteiras near/far, UV/poses,
  substituição/undo, espelhos, instâncias, empates e descarte. Integral **2.790/0**,
  tipos, Biome, Vite e Kids passaram. Review `surface-picking-l222.md`.
- Move grande p50/p95 79,744/102,002→6,339/9,863 ms, com todos os goldens e
  amostras preservados. Construção fria/RSS aumentaram; não é homologação de GPU.

### Lote 223: recorte de transparência e glTF MASK — verificado

- Representação autoral explícita do limite e fator de opacidade; ausência mantém
  o comportamento atual. Não assar o teste em bytes nem converter MASK para BLEND.
- Leitura/edição/histórico/persistência, material Three e GLB concordantes; importador
  só remove a recusa depois da cobertura de roundtrip e protocolo worker.
- Controles contextuais na oficina interna; nenhuma ativação do formato público.
- AlphaMask editável sem alterar pixels; shader/export preservam fator separado.
  Review incluiu RGB invisível no cutoff zero, atlas, flipbooks e workers reais.
  UI mantém foco e um undo; persistência por blobs conserva parâmetros/camadas.
- 24 pares cutoff/fator × 256 alphas, validator/GLTFLoader, goldens anteriores,
  integral **2.800/0**, tipos/Biome/Vite/Kids. Review `alpha-mask-l223.md`.

### Lote 224: primeiros passos contextuais — verificado

- Ajuda curta e dispensável para montar, pintar e começar uma animação; usar os
  nomes/controles reais da oficina e manter autonomia da criança.
- Navegar nas dicas não altera documento, seleção, histórico ou poses pendentes;
  progresso de leitura pertence à sessão, não implica aprendizagem comprovada.
- Verificar foco, teclado, reabertura, contextos e isolamento por projeto; nenhum
  teste automatizado substitui validação com crianças e dispositivos reais.
- Painel opcional dentro do palco, sem redimensioná-lo; leitura em estado de sessão
  por assunto e por projeto. Dicas não recebem ações autorais. Focal 95/0 passou,
  incluindo seleção/documento/undo, sessão de pintura e pose pendente preservados.
- Review de semântica/foco/atalhos, integral **2.805/0**, tipos, Biome, Vite e Kids
  passaram. Review `first-steps-l224.md`. Aprendizagem e visual não homologados.

### Lote 225: contrato de pintura animada para o Estúdio — verificado

- Mapear exportação, consumo e posse antes de escolher transporte. Não inventar canal
  novo ao lado do GLB sem provar que ele carrega algo que o arquivo não carregue melhor.
- Contrato versionado com grade e sequência, nunca uma tabela de deslocamentos pronta:
  duas fontes da verdade para a mesma conta é como as duas pontas se afastam.
- O GLB que a criança baixa não pode mudar. Gravação para o Estúdio é escolha explícita,
  e a perda `flipbook-first-frame` continua existindo para quem não pediu a folha inteira.
- `animatedPaint` no `encodeSceneGlb` leva a folha inteira, `KHR_texture_transform`
  apontando para o primeiro quadro da SEQUÊNCIA e `materials[i].extras.molda.flipbook`
  com o contrato 1. Mapas de superfície com quadros seguem no primeiro quadro, avisando.
  Fixture compartilhada e `--flipbook` no script de impressão.
- Focal 15/0; integral **2.813/0**, tipos, Biome, Vite e Kids passaram; validador Khronos
  sem erros nem avisos e GLTFLoader real entregando o contrato em `userData`.
  Review `animated-paint-l225.md`.
- Sem browser, `map.offset` real da textura não foi observado; cinco avisos act
  reapareceram, sem correção alegada. Consumidor e oficina ficam nos lotes 226 e 227.

### Lote 226: consumidor da pintura animada no Estúdio — verificado

- Medir as duas reproduções antes de escolher. Relógio por entidade custa uma cópia da
  FOLHA na GPU por boneco (1024² = 4 MiB cada); relógio por material custa uma folha e um
  `offset` por quadro. Escolhido o segundo, com a sincronia declarada como contrato.
- Guardar o MATERIAL e ler o mapa a cada passo, para que uma textura que chegue depois não
  fique parada. Recusar em silêncio contrato desconhecido, grade vazia, fps não positivo
  e célula fora da folha: adivinhar seria pior do que não animar.
- Nenhum bloco novo e nenhum bloco alterado; a pausa do jogo tem que congelar a pintura.
- `collectModelFlipbooks` no parse, `stepModelFlipbooks` dentro de `stepSystems` (ao lado
  das faíscas, logo só em `jogando`), e `placeFlipbook` refazendo a conta do produtor.
  Nada entra na posse do lote 118: a textura é do cache do modelo e morre com ele.
- A prova achou um defeito antes da produção: marcar o passo antes de colocar a célula
  travava a pintura quando a textura ainda não existia no primeiro quadro. O passo agora
  só é registrado quando a colocação aconteceu. Review `animated-paint-runtime-l226.md`.
- Focal 10/0 nos três testes Molda/Estúdio; integral **7.956/0**, tipos e Biome passaram.
  Sem browser, aparência e `map.offset` desenhado seguem sem homologação.

### Lote 227: destino da cópia na oficina, com pintura animada — verificado

- A gravação existia desde o lote 225 e ninguém na oficina conseguia pedi-la. Dar a
  escolha sem mudar o padrão: quem só baixa o `.glb` continua vendo o que via.
- O destino faz parte da IDENTIDADE do pedido, não é parâmetro solto: entra no token, ao
  lado de documento e revisão, e uma resposta da outra gravação é recusada.
- Trocar o destino descarta a cópia preparada; consentimento não atravessa gravações.
- Rádios com alvo de 44 px em `fieldset`/`legend`, nomes do que fazem e uma linha de
  consequência real em cada um. Escolha atravessa o worker com validação estrita.
- A revisão achou `sceneGlbReply` montando a resposta campo a campo e entregando-a sem o
  destino: quatro casos do worker reprovaram antes da correção, que é o efeito esperado
  de uma identidade estrita. Review `animated-paint-destination-l227.md`.
- Focal 27/0; integral **2.814/0**, zero avisos act nesta execução; tipos, Biome, Vite e
  Kids passaram. A oficina ainda entrega a cópia como download: levar direto à biblioteca
  do Estúdio depende de rotear `studio-library` para o v2, na integração pública.

### Lote 228: a oficina seguinte dentro do app — verificado

- O discriminador passa a ser a GERAÇÃO de armazenamento, não o `kind`: o documento
  seguinte é sempre um modelo, então o tipo da criação não serve mais para escolher editor.
- Uma lista só para a criança, com o `galleryStore` continuando sem saber o que é um
  documento de cena: colaborador opcional, mutação para a persistência dona, nome único
  conferido nas duas gerações. Capacidade `sceneWorkshop` do host, DESLIGADA por padrão.
- Com ela ligada, a oficina É o editor de modelos: abrir um modelo antigo o promove.
- Três defeitos apareceram só no navegador, e nenhum deles em teste: a mesma criação
  aparecia como cartão E como aviso de "versão mais nova"; a inscrição de mudanças da cena
  derrubava uma rejeição não tratada a cada montagem do StrictMode; e o kids nem compilava,
  porque referenciar a oficina arrasta o índice espacial e o monorepo tem DUAS cópias de
  `three-mesh-bvh` (o drei do kids fixa a 0.8) aumentando `BufferGeometry` de formas
  diferentes. Review `public-workshop-l228.md`.
- Integral **2.822/0**, zero avisos act, tipos do Molda e do Kids, Biome, Vite e build do
  Kids passaram. No navegador: criar um modelo pelo fluxo antigo abre a oficina já
  promovida, voltar traz para a galeria do app, console sem um único erro, e as chaves do
  IndexedDB confirmam original preservado e as duas lápides.
- Miniatura, nuvem v2, "Baixar tudo" e ponte do Estúdio continuam abertos: são eles que
  decidem quando a capacidade pode ser ligada sem a criança perder nada.

### Próximo lote 229: miniatura da geração seguinte e ramo v2 da nuvem

- Criação da geração nova aparece com o cubo de reserva na galeria: perda visível.
- `assetToCloudJson` só serializa v1, então promover hoje tira a criação do espelho da
  nuvem. Ligar a capacidade antes disso seria perder o backup da criança.
- Só depois disso vale falar em leitores compatíveis e, por último, no escritor novo.

### Situação do plano após esses lotes

As nove fases não estão concluídas. Lotes são incrementos de implementação, não
sinônimos de fases. Formato público segue 1; domínio v2, leitor/codec e migração em
memória, promoção local transacional, comandos de hierarquia e persistência local
com revisão/índice de custos e oficina de hierarquia no playground estão implementados
internamente, incluindo UV, materiais, camadas e lápis 2D/3D. Ativação pública desse editor,
integração pública de imagem/animação, skin/IK, importadores e
integrações avançadas do Estúdio ainda estão abertos. Workers para outras operações, otimização dos blobs,
atualizações mais locais e homologação de hardware/usabilidade seguem em aberto.
Não habilitar novo formato antes de respeitar o rollout de guardas documentado.

### Matriz de capacidades que orienta os próximos lotes

| Área | Base encontrada no Molda | Evolução aprovada |
| --- | --- | --- |
| Modelagem | Primitivas, malha com tri/quads, extrusão, cortes, inset e reparos; WIP de arestas soltas | Grupos/pivôs/hierarquia e seleção/edição avançadas, fase 4 |
| Comandos | Registro visual e operações puras; gestos distribuídos no editor | Coordenador transacional e histórico limitado undo+redo, fase 2 |
| Pintura | Paletas e peles por face, editor de texturas, seamless | Fonte canônica, UV/ilhas/costuras/packing, camadas/materiais, fase 5 |
| Céus | Render determinístico e export HDR | Preservar; ampliar interoperabilidade sem regressão |
| Animação | Documento Molda sem clipes; runtime avançado do Studio já tem mixers/clipes | Partes articuladas fase 6; skin/IK fase 7 |
| Intercâmbio | JSON nativo, GLB achatado, PNG/HDR e biblioteca Studio | GLB/glTF hierárquico, OBJ e bbmodel com relatório, fase 8 |
| Interface | Galeria, modos e painéis atuais, alvos 44px, temas | Oficina contextual, tablet e vistas ortográficas reais, fase 3 |
| Persistência | Resumos e documentos pontuais; miniaturas progressivas, comparação transacional; guarda cloud com partes já existe | Blobs por hash, ledger de quota, migração isolada e workers |

Manter implementação própria. A inspiração em ações/transações/hierarquia/UV do
Blockbench não autoriza copiar sua implementação GPL para o produto. Não copiar
seu loop contínuo de render: o Molda já tem agendamento sob demanda.

## Fontes

- https://github.com/JannisX11/blockbench
- https://blockbench.net/wiki/guides/blockbench-overview-tips/
- https://blockbench.net/wiki/docs/bbmodel/
- https://github.com/KhronosGroup/glTF-Validator
