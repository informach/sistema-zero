# Inspeção e baseline local — 17/11/2026

Estado: auditoria em andamento. Este relatório não homologa a missão completa.
Referência e máquina: `ambiente-windows.json`. Windows x64, Ryzen 5 5600G,
12 processadores lógicos, cerca de 32 GiB. Navegadores automatizados, sem ensaio
em dispositivo físico de entrada. A estação é compartilhada: não há exclusividade
de CPU/memória. Os resultados não são metas de hardware nem comparáveis ao Linux
histórico sem reproduzir as condições.

## Proteção pedagógica

A matriz versionada cobre 35 tipos ensinados, sete projetos e cinco aulas. A
inspeção confirma textos, campos, opções, cores e caminhos vigentes, inclusive
Rodar/Rodar de novo. Nesta máquina passaram os 43 testes da matriz e os 15 de
round-trip dos projetos. Não houve regravação das referências.

Na primeira rodada Chromium passaram os cinco casos das aulas, junto de cinco
casos de execução/segurança da prévia (10/10), ainda sem os objetivos dinâmicos.
Na rodada final, com o executor real configurado, as cinco aulas passaram:
399 gestos, 13 partes, **49 objetivos de estrutura e 17 de execução**, todos aprovados.
O teste compara as 13 fontes de referência e os projetos finais dos dois cursos.
As capturas e os resultados estão versionados em `evidencias/a3-depois-windows/`,
com hashes no manifesto. Não substituem a conferência dos vídeos. Os dois PDFs
versionados foram inspecionados separadamente: índice de texto das 48 páginas,
leitura dirigida e cinco páginas visuais completas, incluindo caminhos, campos e
Rodar de novo. A palavra
"atualizar" na página 32 do Farol descreve a atualização do jogo, não um botão
Atualizar. Inventário e hashes: `evidencias/pdf-inventario.json`.
Verificar/Enviar pela página do app continua pendente.

## Capacidades já presentes que devem ser reutilizadas

| Área | Implementação inspecionada | Limitação / próxima prova |
|---|---|---|
| Clássico JS | Blockly, IR, parsers, geradores, mapas de fonte, Ponte e histórico | Montagem visual em escala e diagnóstico incremental ainda precisam de trabalho |
| Prévia JS | Documento com CSP/sandbox, guarda de laços, batimentos, filtros de mensagens, armazenamento do jogo e origem por adapter | Thread/processo depende do navegador; watchdog não interrompe trabalho nativo |
| Clássico Python | Modelo Python separado, navegação/montagem de blocos e fontes explícitas | Reproduzir baseline de renderização e não transplantar sem prova a montagem para JS |
| Pro JS/TS | Monaco, worker TS 5.9.3 por instância, patches do FS, linguagem e bibliotecas reais | Medir p95 com fixture modular e dependências; não desativar análise |
| WebContainer | `useWebContainerSync`, `proFsSync`, reconciliação base/editor/disco e terminal | Pico histórico de 2,4–2,7 GiB não é medição desta sessão |
| Pro remoto | Artefatos imutáveis em R2 privado, token temporário, hash/tamanho, manifesto no último write | Editor e compilador têm capacidades distintas; limite remoto é 80 arquivos, 1,5 M caracteres |
| Materiais Pro | `core/proAssets`, `proAssetSync`, mesma fila de FS, binários em `public/` | Arquivos binários arbitrários fora de `public/` não devem ser descartados ao salvar |
| Persistência | Serviço por instância, buffers, journal/outbox, CAS local, partições, cercas de exclusão e escopos por perfil | Testar queda, conflito e reentrada em todas as bordas; não criar outro armazenamento |
| Exportação | `prepareSourceDownload`, captura estável, fila de escritores e ZIP em worker | Homologar projeto modular exportado em ambiente externo |
| Zappy | Contexto limitado, revisão, política por modo, aplicação de alterações pelo usuário | Depuração/profiling exigem dados reais ainda não integrados |

## Runtimes — inventário inicial, não qualificação de desempenho

| Runtime | Arquitetura e reaproveitamento | Custo / lacuna a medir |
|---|---|---|
| Jogo 2D | Canvas/DOM no frame, domínios separados de ciclo, sprites, entrada, física, áudio e observação opt-in | Não é Worker/OffscreenCanvas; DOM, texto, entrada e áudio exigem contrato de compatibilidade |
| Jogo 2D Avançado | Runtime por domínios e pools de entidades com reset explícito | Colisão, atualização de entidades e cenas extensas; streaming genérico não está homologado |
| Jogo 3D | Three.js, recursos de modelos e orçamento gráfico compartilhado | Render/GPU, física, draw calls e descarte em hardware real |
| Mundo 3D | Three.js e orçamento de resolução/sombras/efeitos | Regiões, instancing e estado de mundo devem preservar contratos existentes |
| Jogo 3D Avançado | Three.js, modelos/pools/sistemas existentes | Não substituir por ECS sem perfil; testar recursos ativos e recolhidos |
| Python comum | Worker protegido, supervisor externo ao código do aluno, protocolos limitados | CPU/heap do interpretador, consultas, término e descarte |
| Turtle | Módulo Python e protocolo gráfico com renderer no frame | Transporte, quantidade de traços, scheduling e limpeza |
| Pygame Zero | Protocolo de gráficos/pixels, pacing e filas de entrada/áudio | Copiar pixels e pintar são custos separados do Python |
| Pygame-ce | pygame-ce 2.5.7 real no worker protegido, SDL por `sdlScreen`, RGBA para o frame | Não oferece joystick/OpenGL; números históricos de 60 FPS não são desta sessão |
| Raylib 2D/3D | Módulo compartilhado `pyray`/`raylib`, extensões independentes e renderers por modo | Não assumir equivalência integral com Raylib nativa; medir transporte, render e GPU |

O orçamento Three existente adapta resolução real, DPR, sombras e efeitos; preserva
as coordenadas lógicas. A sonda inicial passa uma vez para qualidade leve se mede
menos de 45 FPS entre 1,5 e 4 s. Isso não é um profiler completo. Observação opt-in
de sprites também não equivale a breakpoints e pilha de chamadas.

## Isolamento: condições do laboratório são parte do resultado

`isolamento-windows.json` foi obtido no headless shell padrão do Playwright para
Chromium, no Firefox e no WebKit de laboratório. Os arranjos bloquearam o relógio
do editor por cerca de 5 s, inclusive o teste com outra origem.

No **Chromium completo 148.0.7778.96**, o controle da mesma origem bloqueou cerca de
5 s, enquanto `srcdoc` com sandbox e a casca de outro site mantiveram intervalos
máximos de aproximadamente 60 ms e cliques em aproximadamente 20–30 ms. O artefato
`isolamento-windows-chromium-completo.json` contém os valores de cada rodada.
O script agora escolhe o Chromium completo por padrão e identifica a variante.

Reproduzir:

```powershell
cd packages/studio
bunx playwright install chromium firefox webkit
$env:SZ_MEASURE_BROWSERS='chromium,firefox,webkit'
node scripts/measure-preview-isolation.mjs --json
# Comparação explícita com o shell:
$env:SZ_MEASURE_HEADLESS_SHELL='1'
node scripts/measure-preview-isolation.mjs --json
```

Referência do fornecedor para a distinção entre variantes:
[Playwright 1.60 — browsers](https://github.com/microsoft/playwright/blob/v1.60.0/docs/src/browsers.md#chromium-new-headless-mode).
Outra origem não garante outro processo em todos os navegadores. Não há evidência
de Android/iPad físicos. A homologação de programas hostis no editor real é
separada da página mínima e deve permanecer um portão independente.

No editor real, a rodada de cinco programas hostis e três casos de gravação teve
7 aprovações e uma falha: o código corrigido após 30 s de trabalho síncrono nativo
não começou em até 15 s. O editor respondeu ao Parar. A mesma falha foi reproduzida
substituindo temporariamente a prévia e o hook pelos arquivos **originais** de
`origin/estudio-evolucao`, numa construção separada (porta 5196). Os arquivos de
trabalho foram restaurados. O isolamento permanece parcial; não foi aumentado o
prazo nem removida a asserção.

Firefox: cinco casos de execução e segurança aprovados. WebKit: três casos de
preservação dos arquivos ao recarregar/esconder aprovados. Isso não homologa FPS,
processos do Safari em iPad ou os programas hostis nesses engines.

## Clássico sem tela

`classico-baseline-windows.json` registra 31 rodadas, distribuições por etapa e
tempos completos por edição. O script foi corrigido para calcular o p50/p95 a
partir das somas **de cada rodada**, em vez de somar medianas independentes.
Também separa o tempo de construir a fixture sintética do tempo de carregar o
modelo Blockly; antes o campo de abertura somava as duas coisas.

```powershell
cd packages/studio
$env:SZ_PROFILE_SAMPLES='31'
bun scripts/profile-js-classic.ts --json
```

Não mede SVG, arrasto, IndexedDB, abertura visual, digitação ou FPS. O número
`carregarMs` é uma abertura do modelo sem tela, não um p95 de abertura. A amostra
fria está incluída. Faltam repetição sem concorrência, baseline Pro e medições
de memória/GPU/uso prolongado antes de fixar as metas definitivas.

## Primeira correção funcional desta continuação

Rodar/Rodar de novo agora materializam os buffers e aguardam `PersistenceService.save`.
Parar cancela a intenção de executar, mantendo a gravação. Mudança de projeto,
autoridade, revisão, erro de armazenamento ou desmontagem impedem execução tardia.
O snapshot executado é atualizado imediatamente, sem reutilizar os 800 ms de
fonte anterior. Atualizações normais continuam usando o debounce existente.

Uma troca de projeto invalida também a fonte em debounce, para não executar o
código anterior no novo contexto. A revisão ampla identificou um cache local de
persistência que sobrevivia à troca de perfil; ele agora acompanha o ciclo do
escopo, inclusive na volta ao mesmo namespace. O teste comprova bancos separados
para dois perfis com o mesmo identificador de projeto.

A confirmação é a do adapter/callback de salvamento existente. Em um playground
com `persistence="none"` sem callback assíncrono, isso não confirma disco ou nuvem.
A execução automática após editar não passou a aguardar cada gravação; esta entrega
protege os comandos explícitos. Não alterou o documento do runtime nem seu tamanho,
os estilos, a paleta ou a aparência dos blocos.

## Imagens do Blockly preservadas, servidas localmente

A conferência visual encontrou os controles de zoom/lixeira corrompidos no
laboratório. Os elementos apontavam para o `sprites.png` do servidor de demo do
Blockly, cuja resposta nesta sessão foi HTTP 404. A mídia exata do pacote instalado
12.5.1 agora é servida pelos quatro hosts em `/studio-blockly/`, pela opção pública
`media` nas três injeções do Studio (JavaScript, Python e captura). Nenhum ícone foi
redesenhado. Sons opcionais continuam com o serviço anterior.

`scripts/sync-blockly-media.ts --check` compara 18 arquivos por host com o SDK e a
licença. O novo teste de navegador reprovou antes por usar a origem externa e
aprovou depois com resposta local e hash correto. Zoom e lixeira foram conferidos
visualmente no Chrome 157 e nas capturas finais dos cursos. Os arquivos são ativos
públicos do SDK; não são materiais de alunos nem assets privados do Arquipélago.

Resultados e comandos finais: [`verificacao-windows.md`](verificacao-windows.md).
Uso e contrato do incremento: [`salvar-e-executar.md`](salvar-e-executar.md).

## Próxima sequência obrigatória

Fechar testes hostis e objetivos dinâmicos no navegador, completar A4 no app de
homologação e o estudo Worker/isolamento multiplataforma. Depois seguir montagem
sob demanda do Clássico, escala Pro, motores/streaming, depuração, profiling,
testes do aluno, consumo versionado de cenas, persistência e homologação final,
na ordem detalhada em `plano-execucao.md`. Nenhum desses pacotes está implicitamente
concluído por existir esta auditoria.
