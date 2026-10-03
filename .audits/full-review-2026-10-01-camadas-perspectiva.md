# Revisão de camadas, perspectiva 2D e Descida da Neve

Data: 01/10/2026. Escopo: implementação das camadas e da pista compartilhadas por
Jogo 2D/Jogo 2D Avançado, integração com blocos/IR/Ponte, três exemplos equivalentes,
papel transparente no Pinta e regressões nos dois pacotes afetados.

**Resultado:** problemas encontrados na implementação foram corrigidos. A revisão
não pode ser encerrada como “todos os testes passando”: a instalação local de
`parse5@8.0.0` está sem acesso de leitura, impedindo parte dos testes do Estúdio,
seu typecheck e a inicialização do servidor Playwright. O Pinta passou integralmente.

## Achados corrigidos

### P1 — Camadas apagavam sprites sem invalidar seus alvos de clique

O adaptador básico usava `clearRect` diretamente. Isso apagava os pixels, mas
preservava a época de desenho usada pelo motor para aceitar cliques. Um sprite
desenhado no quadro anterior continuava recebendo eventos depois de desaparecer.

`scene-2d/runtime.ts` agora delega a limpeza ao `clear` oficial do Jogo 2D. Isso
também preserva a manutenção do HUD acessível e da transformação base do palco.

Regressão em `examples/snowDescentRuntime.test.ts`: desenhar e clicar no sprite,
limpar pelas camadas, clicar novamente na mesma posição. Antes: dois eventos;
depois: apenas o clique anterior à limpeza. O teste usa o motor real.

### P1 — O manual completo do Jogo 2D não abria

O manual com os novos blocos passou a ter 66.482 caracteres, acima do limite de
60.000 do schema. O carregamento sob demanda era rejeitado antes de exibir
“Saiba mais”. Ajustado o teto de sanidade para 70.000 e preservados os testes de
fronteira: aceita exatamente o limite, rejeita limite + 1.

Arquivos: `extensions/manifest.ts`, testes de manifest/documentação e referência
do teto em `docs/game-2d-audit-2026-07-20.md`. O teste real de `ExtensionsPanel`
passou após a correção. O limite do resumo permanente de IA não foi aumentado.

### P2 — O resumo permanente da IA ultrapassava seu orçamento

A inclusão das instruções de cena elevava o resumo do Jogo 2D para 6.611
caracteres, excedendo o contrato de 6.000. O trecho compartilhado foi condensado
sem truncamento automático. O resumo agora mede 5.957 caracteres; o contexto
formatado desse resumo mede 5.978. Assinaturas, restrições e instruções completas
continuam no manual carregado sob demanda.

Arquivo: `official-extensions/scene-2d/docs.ts`. Testes de contexto da IA aprovados.

### P2 — Paralaxe aceitava valores finitos cujo produto era infinito

Mesmo com entradas individualmente finitas, multiplicar o fator de paralaxe
pela posição da câmera podia gerar `Infinity`. O resultado chegava ao Canvas.
O desenho agora valida também as coordenadas calculadas, ignora a camada nesse
quadro e emite aviso limitado.

Regressão em `scene-2d/runtime.test.ts` com `Number.MAX_VALUE`: antes enviava
`-Infinity` para `drawImage`; depois não envia uma operação inválida ao Canvas.

### P2 — Inventários e hashes de referência estavam desatualizados

Corrigidos os contratos de descoberta do Jogo 2D (36 exemplos), inventário
Canvas (56 blocos) e catálogos lazy das duas extensões (36/38 exemplos).
Os hashes foram recalculados a partir dos loaders reais. Retirando somente o
novo exemplo de cada catálogo, os hashes anteriores permanecem exatamente
iguais; os exemplos antigos não foram alterados para acomodar a atualização.

## Cobertura da revisão

- Runtime compartilhado: projeção X/Z, horizonte, recorte perto/longe, ordem
  distante → próximo, estabilidade na mesma profundidade, remoção e reset.
- Camadas: nomes independentes para a mesma imagem, posição/escala/opacidade,
  visibilidade, ordem, fundo/frente, câmera, paralaxe, repetição limitada,
  limpeza da última camada e restauração do contexto.
- Encontros: intervalo percorrido, largura lateral, avanço grande, marcha a ré,
  remoção e teleporte sem colisão artificial.
- Os 19 métodos em cada extensão: código → IR → blocos salvos → código,
  argumentos aninhados, aridade e opções inválidas, API e arquitetura dos motores.
- Os três jogos: IR estruturada, salvar/reabrir em blocos, mesma arte/percurso,
  início, teclado/toque, pausa, coleta, vitória, derrota e reinício. Os testes
  executam o JavaScript gerado com os motores reais; DOM e Canvas são simulados.
- Pinta: troca de papel somente visual, persistência sem alterações e exportação
  rasterizada com vazio RGBA `0/0/0/0` e branco pintado `255/255/255/255`.
- Galerias, catálogo do servidor, contratos pedagógicos, documentação e IA.

## Evidências desta revisão

| Verificação | Resultado |
|---|---|
| Pinta completo: `bun test src` | **1.549 aprovados, 0 falhas**, 128 arquivos, 14.386 asserções |
| Pinta: `tsc --noEmit` | Aprovado, saída 0 |
| Studio completo após as correções: `bun test src` | **8.488 aprovados, 35 falhas**, 547 arquivos; Bun registra também 8 erros de carregamento |
| Correções direcionadas: runtime, manual, IA, galeria, inventário e UI de extensões | **58 aprovados, 0 falhas**, 9 arquivos |
| Ambas as extensões completas, cena, exemplos, codecs e integrações de documentação | **3.541 aprovados, 2 falhas de carregamento** por `parse5`, 122 arquivos |
| Studio: `tsc --noEmit` | 7 diagnósticos em `project-migrations/html.ts` e `lifecycleAudit.ts`: importação de `parse5` e tipos derivados indisponíveis |
| `bun scripts/gen-snow-descent.ts --check` | Três IRs verificadas; nenhuma divergência |
| Biome dos arquivos TS/TSX/JSON alterados do Studio e componentes/teste de papel do Pinta | **83 arquivos aprovados**, sem alterações automáticas |
| `git diff --check` | Aprovado; apenas aviso de normalização CRLF/LF em documentação |
| Playwright Chromium, galeria filtrada por “Descida da Neve” | Não executou cenários: build do servidor falhou ao resolver `parse5` |

Os dois novos testes de regressão foram executados antes das correções e falharam
pelos comportamentos descritos acima. Depois das correções passaram. Nenhum teste
foi ignorado ou teve a falha de dependência mascarada.

## Impedimento externo ao código revisado

`packages/studio/node_modules/parse5` aponta para
`node_modules/.bun/parse5@8.0.0/node_modules/parse5`. O diretório existe, mas ler
seu `package.json` resulta em acesso negado. A versão 8.0.0 já está declarada no
manifest e no lockfile; não se trata de uma dependência omitida pela implementação.

Isso provoca erros de importação nas migrações de projeto, com efeitos nos testes
de importação, persistência, compatibilidade legada, mensagens de UI e build.
Na execução das extensões, `enemyMolds.test.ts` e `moldCompatibility.test.ts`
também não carregam por essa dependência transitiva.

Foi tentado `bun install --frozen-lockfile --ignore-scripts` na raiz. O instalador
parou com `unable to write files to tempdir: AccessDenied`. Não foram alteradas
permissões, versões, aliases ou validações para contornar o bloqueio.

Para concluir a aprovação integral, é necessário restaurar a leitura da
instalação de `parse5@8.0.0` e permitir a operação normal do instalador. Depois,
reexecutar no pacote Studio:

```powershell
bun test src
$env:NODE_OPTIONS = '--max-old-space-size=8192'
bunx tsc --noEmit
bunx playwright test e2e/examples-gallery.spec.ts --project=chromium --grep 'Descida da Neve'
```

Não há evidência de aprovação no navegador nesta revisão. A rasterização nativa
registrada na implementação anterior não substitui essa verificação.

Logs locais, ignorados pelo Git: `.tmp/snow-review-pinta-all.log`,
`.tmp/snow-review-pinta-types.log`, `.tmp/snow-review-studio-final.log`,
`.tmp/snow-review-studio-types.log`, `.tmp/snow-review-fixes.log`,
`.tmp/snow-review-regressions-red.log`, `.tmp/snow-review-targeted-final.log`,
`.tmp/snow-review-biome-final.log`, `.tmp/snow-review-e2e.log` e
`.tmp/snow-review-install.log`.

## Segunda revisão, na mesma noite (outra sessão, ambiente com `parse5` legível)

O impedimento acima era do ambiente daquela sessão, não do código: aqui a suíte do
Estúdio rodou inteira. Esta rodada revisou o lote de novo, de forma independente, e
mudou o seguinte (detalhes e motivos em `packages/studio/CLAUDE.md`, seção "Camadas e
pista em perspectiva"):

| Prioridade | Achado | Conserto |
|---|---|---|
| P1 | O typecheck do pacote `members` quebrava: `scene-2d/contract.ts` usava tipos do navegador e é alcançado pelo catálogo de blocos do servidor. CI vermelho, sem deploy. | O anfitrião foi para `scene-2d/host.ts`; teste impede tipo de navegador nos módulos alcançados pelo servidor. |
| P1 | O e2e da galeria reprovava "Descida da Neve (Jogo 2D Avançado)": o motor avisava "não consegui capturar o ponteiro" quando o arrasto vinha de um evento montado por código, e a galeria não aceita aviso. | Só evento de verdade tenta capturar o ponteiro; regressão com o motor real. |
| P2 | "Repetir" cobria a tela nos dois eixos: uma faixa de montanhas se empilhava. | Modo de repetição (não, lados, cima e baixo, todos os lados); a cópia já alinhada não ganha irmã fora da tela. |
| P2 | "Criar pista" ou "Criar camada" dentro do laço recomeçava tudo a cada quadro, em silêncio. | Aviso único no Console, citando o bloco e o lugar certo. |
| P2 | Camadas no topo da paleta, dos manuais e dos contextos de IA; exemplo novo na frente de "Meu primeiro jogo"; resumo da IA citava exemplos. | Tudo para junto dos cenários; a menção a exemplos ficou só no manual do aluno. |
| P3 | Nome numérico de objeto recusado; avisos sem conserto; "no frente" e "do frente" na face dos blocos; cada letra perguntada duas vezes nos exemplos; faixa vermelha presa na tela de fim; 19 blocos sem subir a versão. | Corrigidos; versões 1.3.0 (Jogo 2D) e 0.62.0 (Avançado). |
| P3 | Ordenação de todos os objetos da pista e duas listas novas por quadro. | Corte por distância antes de ordenar; listas de camadas em cache. |

**Navegador:** as três versões de "Descida da Neve" foram abertas em Chromium (iframe
com a sandbox do preview): abertura, descida, pausa, teclado, arrasto e tela de fim,
sem mensagem no console.

| Verificação desta rodada | Resultado |
|---|---|
| Studio: `bun test src` | 8.631 aprovados, 0 falhas |
| `bun run --filter '*' typecheck` (27 pacotes) | Todos com saída 0 |
| `bun run ci` (Biome da raiz) | Saída 0 |
| `check:snow-descent` e `check:game-3d-examples` | Sem divergência |
| Playwright Chromium: galeria inteira (158 cartões), smoke e blocos de Canvas | 200 aprovados, 0 falhas |

## Terceira revisão, antes do commit (01/10/2026, noite)

Pedido da dona: revisar o que as duas rodadas acima escreveram e commitar. Dois revisores
independentes, só leitura (um no motor e nos exemplos, outro na lista de nomes e na cadeia
bloco ⇄ código). Detalhes e motivos em `packages/studio/CLAUDE.md`, "Terceira revisão, antes do
commit".

| Prioridade | Achado | Conserto |
|---|---|---|
| P1 | O serviço Members não era reconstruído em staging quando só o Estúdio mudava, e é ele que confere as atividades das aulas no servidor: bloco novo aceito na autoria e recusado na correção. Anterior a este lote. | `packages/studio/*` também dispara o Members em `.github/workflows/ci.yml`; teste de conformidade no Estúdio. |
| P2 | Número e texto voltavam da Ponte (e nasciam nos três exemplos) como bloco real, não como sombra: arrastado para fora, sobrava soquete vazio. | O literal do tipo do soquete volta como sombra; valor calculado leva a sombra da paleta por baixo. |
| P2 | Soquete de nome vazio criava "montanhas" (o nome da paleta) em silêncio. | Nome vazio é nome vazio, e o motor avisa. |
| P2 | "Câmera da pista" depois de "Avançar" apagava os encontros do passo. | Mesma distância preserva o passo; distância diferente continua teleporte. |
| P2 | No Avançado, "Desenhar camadas do fundo" apagava o mapa RPG e a fase de campanha, que o motor pinta antes. | Com mapa ou campanha, o passe do fundo não limpa e avisa uma vez. |
| P2 | No Jogo 2D, cena desenhada uma vez (sem laço) ficava em branco: a imagem ainda estava carregando. | A cena é repetida, em ordem, quando a imagem chega e não há laço. |
| P2 | Camadas e objetos ignoravam a regra de nitidez de cada motor (pixel art borrada no Jogo 2D, imagem grande serrilhada no Avançado). | Gancho de nitidez por imagem, dentro do save/restore da cena. |
| P3 | Nome com espaço em volta não casava com o da lista; opacidade 1,0000001 recusava a chamada inteira; cinco métodos calavam com número inválido; 64 nomes errados escondiam o aviso de criador no laço; aviso de criador disparava com a tecla de recomeço segurada meio segundo. | Corrigidos, cada um com teste. |
| P3 | A lista de nomes juntava as cenas dos dois motores; a contagem "N blocos em uso" contava as listas de dentro dos soquetes; valor de cena do Avançado era lido sem o contexto do parser. | Corrigidos, cada um com teste. |
| P3 | Nas três versões do exemplo, a borda da camada das montanhas aparecia com o jogador num extremo. | Camada com folga (escala 1,04); exemplos regerados. |

Ficou de fora, registrado: objeto que se move sozinho na direção do jogador pode cruzar sem
encontro (dito no manual e na dica do bloco); o teto de 4096 cópias não acompanha a resolução;
o tremor da câmera do Avançado não chega às camadas.

**Navegador (Chromium, iframe com a sandbox do preview):** cena sem laço aparece inteira;
pixel art 8×8 ampliada 40 vezes sai nítida; as montanhas cobrem a tela com o jogador nos dois
extremos, nas três versões; nenhuma mensagem no console.
