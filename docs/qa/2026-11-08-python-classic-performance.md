# Python clássico: desempenho e organização dos blocos

Revisão posterior: [revisão completa de Programa e desempenho](2026-11-08-python-program-areas-review.md). Os dois problemas encontrados em rascunhos foram corrigidos: as peças externas sobrevivem às edições de código, e suas funções/classes podem ser abertas pelo índice. A revisão também atualizou a persistência inicial de Programa na galeria e qualificou seus 104 exemplos clássicos, com 164 arquivos Python. As medições abaixo descrevem a rodada de desempenho anterior.

## Escopo e ambiente

Solicitação inicial: propor áreas de projeto para Python e investigar a lentidão dos blocos e do Pac-Man no Chrome, em `https://community-kids-staging.up.railway.app/estudio`. Em seguida, o usuário autorizou implementar tanto a organização quanto o desempenho.

Trabalho isolado em `fix/python-classic-performance-20261108`, criado de `staging` em `8ee4b3fc9`. A árvore original tinha trabalho concorrente e foi preservada. Nenhum push, merge ou deploy faz parte desta rodada.

A sessão disponível no staging era de aluno, sem acesso à galeria e à extensão Turtle. O projeto temporário criado para conferir essa restrição foi excluído; a lista voltou aos seis projetos anteriores. Não houve alteração de permissões. Por isso, as medidas abaixo são **locais**, com o editor clássico, os serviços de autorização de qualificação e o interpretador reais. Elas não homologam o relato no ambiente publicado.

- Chrome instalado, viewport 1600 × 1000, automação headless.
- Pac-Man da galeria, modo Blocos, 2.021 blocos de código, sem blocos opacos; fonte e materiais originais. A área Programa acrescenta um bloco de apresentação.
- Editor compilado com Vite, servido na porta 5298; servidor Python de qualificação na 5297.
- Distribuição construída do código local: `a198badbd5724dfb14925dcfc4ee6fa13a99a1ef335c2b28f92e4a2a5f4e5b1e`.
- Bun 1.4.3 isolado para servir o runtime no Windows; instalação global preservada.

## Achados e mudanças

1. **Cada efeito sonoro construía um novo `Audio`, aguardava seu início e desmontava o reprodutor ao terminar.** O Pac-Man faz isso repetidamente ao coletar pontos. O serviço agora reaproveita elementos cujo som terminou naturalmente, por URL verificada, com limite global de 16 elementos ociosos. Reconfigura volume, loop e mute; preserva vozes simultâneas, erros e notificações de término. Cancelamento, parada e falha continuam liberando a voz. Dispose também libera os elementos ociosos e revoga as URLs.
2. **Mover uma pilha inteira disparava análise e projeção do arquivo completo.** O editor compara a parte executável do workspace sem coordenadas, recolhimento e comentários visuais. Rascunhos externos também ficam fora dessa comparação. Campos, conexões, origem e demais propriedades do programa precisam continuar idênticos. Edições semânticas pendentes ou em andamento seguem o caminho anterior. A comparação e a publicação preservam a proteção contra projeto/fonte substituídos.
3. **A validação final da cópia de exemplos recusava variantes ocultas explicitamente aprovadas pelo catálogo.** A descoberta já reconhecia essas variantes. A validação final passou a seguir a mesma regra, com teste de revogação. Esse defeito impedia abrir o Pac-Man local pela galeria.
4. **O custo de milhares de SVGs dominava a interação.** O perfil mostrou foco, reparentamento de DOM (`appendChild`), posicionamento de campos e coleta de memória. A implementação recolhe definições inicialmente e retira os SVGs dos corpos fechados do DOM. O modelo Blockly completo permanece disponível para histórico e serialização. A visão inicial do Pac-Man monta 147 de 2.022 blocos, redução de aproximadamente 93%.
5. **Faltava contexto para o programa Python.** Cada arquivo ganha uma área indeletável “Programa”, com o nome e a ordem de execução. A migração conecta as raízes antigas na ordem registrada, sem usar sua posição na tela. Caches antigos sem a área também recebem a visão compacta, ainda que tivessem salvo todas as funções expandidas. Um índice pesquisável revela funções/classes e seus ancestrais; a Ponte e o tutor usam a mesma navegação. A montagem verifica a identidade do SVG ao desfazer uma exclusão, porque um mesmo ID pode ter sido recriado com outro elemento.
6. **Peças soltas agora têm semântica explícita.** Fora do Programa, ficam salvas como rascunhos e não participam da geração de Python, mesmo incompletas. O cabeçalho mostra a quantidade e permite focalizá-las. O menu permite retirar um bloco do Programa ou inserir uma pilha de rascunho no fim, com desfazer/refazer. O código autoritativo e a recuperação de uma edição incompleta dentro do Programa continuam protegidos pelo fluxo existente.

## Medição inicial: áudio e persistência

Duas execuções por versão. O baseline recompilou `PythonBlocklyEditor.tsx` e `audio/service.ts` de `HEAD` por um plugin de qualificação; a correção da galeria permaneceu em ambas as versões para permitir abrir o exemplo. O runtime, o jogo e os materiais foram os mesmos.

O gesto move a raiz inteira com mouse real e aguarda a persistência. Depois, o jogo recebe uma sequência de cinco direções, por 2,5 segundos cada. As medidas da prévia observam chamadas de pintura do canvas conectado, sem ler pixels a cada quadro. Os testes funcionais fazem a prova de pixels separadamente.

| Medida | Antes, execução 1 / 2 | Depois, execução 1 / 2 |
| --- | --- | --- |
| Espera mediana de `Audio.play()` | 7,6 / 7,9 ms | 0,2 / 0,1 ms |
| Intervalo de desenho p95 | 33,1 / 34,0 ms | 28,6 / 25,7 ms |
| Maior intervalo de desenho | 40,1 / 41,9 ms | 63,8 / 38,2 ms |
| Tarefas do editor acima de 50 ms | 8 / 9 | 5 / 5 |
| Soma da duração dessas tarefas | 1.393 / 1.399 ms | 1.256 / 955 ms |
| Maior tarefa do editor | 358 / 327 ms | 488 / 324 ms |

O ganho de áudio repetido foi consistente; a primeira reprodução ainda precisa carregar o som. Nesta etapa, a prévia melhorou no p95, mas o editor ainda ficava pesado. Esse resultado motivou a montagem dos corpos sob demanda.

As primeiras amostras de prévia tinham picos artificiais de 100–250 ms: iniciar o CPU profiler bloqueava a renderização dentro da janela medida. O trace identificou `CpuProfiler::StartProfiling`; essas amostras foram descartadas. As quatro linhas de resultados acima usam medição sem início de profiler durante a coleta.

Artefatos locais em `packages/studio/.cache`: `before-clean{1,2}-metrics.json`, `after-clean{1,2}-metrics.json`, respectivos perfis de CPU do editor e `runtime-trace-trace.json`. O harness versionado é `packages/studio/scripts/profile-python-classic.mjs`:

```powershell
# Com os servidores locais de qualificação preparados e ativos:
node scripts/profile-python-classic.mjs current
# Diagnóstico opcional, separado da medição sem tracing:
$env:PERF_TRACE = '1'
node scripts/profile-python-classic.mjs trace
```

Os artefatos novos ficam em `packages/studio/.cache/python-classic-performance/`. `PERF_EDITOR=0` deixa o editor parado; `PERF_COLLAPSE=1` exercita recolhimento de funções apenas na fixture de qualificação.

## Medição final: área Programa e montagem sob demanda

Duas execuções adicionais depois do build final, sem testes ou typecheck concorrendo com o Chrome. Mesmo harness, viewport, exemplo, distribuição e sequência de teclas. Perfis de CPU do editor foram capturados nas versões comparadas; a prévia foi medida sem profiler ativo. A comparação da fonte após o arraste passou nas duas execuções.

| Medida | Antes, execução 1 / 2 | Implementação completa, execução 1 / 2 |
| --- | --- | --- |
| SVGs do programa montados na visão inicial | 2.021 / 2.021 | 147 / 147, de 2.022 no modelo |
| Tarefas do editor acima de 50 ms | 8 / 9 | 1 / 1 |
| Soma da duração dessas tarefas | 1.393 / 1.399 ms | 106 / 105 ms |
| Maior tarefa do editor | 358 / 327 ms | 106 / 105 ms |
| Espera mediana de `Audio.play()` | 7,6 / 7,9 ms | 0,2 / 0,2 ms |
| Intervalo de desenho da prévia p95 | 33,1 / 34,0 ms | 26,0 / 26,1 ms |
| Maior intervalo de desenho da prévia | 40,1 / 41,9 ms | 40,2 / 40,7 ms |
| Intervalos da prévia acima de 50 ms | 0 / 0 | 0 / 0 |

O tempo acumulado em tarefas longas do editor diminuiu aproximadamente 92%. O p95 dos intervalos de animação da página durante a janela de gesto/persistência foi 16,8 ms em ambas as execuções; essa medida inclui períodos sem movimento e não equivale à latência de cada evento de entrada. Ainda houve uma tarefa de aproximadamente 105 ms ao iniciar a interação, portanto não se afirma que todo gesto esteja abaixo de 100 ms.

A prévia teve 538/537 amostras válidas; o áudio, 52/47 chamadas. O áudio inicial e efeitos ainda não reutilizados continuam mais caros: p95 de 9,4/8,4 ms. A leitura adequada é menor custo de edição e de efeitos repetidos, com os piores intervalos da prévia aproximadamente estáveis nesta carga, não uma garantia universal de quadros.

Artefatos: `program-areas-final{1,2}-metrics.json`, `program-areas-final{1,2}-editor.cpuprofile` e capturas de tela no diretório de performance acima. Os testes produzem `program-and-scratch.png` e `nested-program-narrow.png` em `packages/studio/.cache/python-areas-e2e/`; cada execução substitui os artefatos da anterior.

## Preservação de comportamento

- Ordem de execução e desempates: a área conecta as raízes antigas em sua ordem registrada. Mover a área não ordena o Python; apenas um gesto explícito de encaixe muda a sequência.
- Aritmética, geometria, RNG e cronômetros do jogo: inalterados.
- Materiais e texto Python: não editados pela otimização. A prova de arraste, desfazer/refazer e reabertura compara a fonte byte a byte. Edição semântica segue o gerador existente, que pode adicionar parênteses ao trocar um literal. O teste de navegação/rascunhos confere o restante da fonte, o valor restaurado por undo e a preservação exata durante duplicação e reabertura. O teste de execução verifica hashes dos materiais e movimento causado por teclado em pixels apresentados.
- Áudio: mesmos bytes autorizados e mesmas regras de reprodução, volume, mute, sobreposição, término e cancelamento. O pool é restrito à sessão e tem limite.

## Validação

- 148 testes de blocos, áudio, estado e transações Python: aprovados.
- 18 testes de autorização/cópia Python: aprovados.
- Dez cenários E2E Chrome: âncoras Classic/Pro, sincronização e seleção na Ponte, layout estreito, navegação/edição do Pac-Man, persistência de rascunhos, retirar/reinserir instruções com undo/redo, definições aninhadas e exclusão/undo de classe, execução do Pac-Man por teclado/pixels e arraste/persistência com fonte intacta. O cenário do Pac-Man também grava um cache no formato antigo, reabre pela persistência real e exige os mesmos IDs, fonte intacta e apenas 147 SVGs conectados; assim, um fallback silencioso para uma projeção nova não passa. As sessões de análise de cada teste são verificadas após o fechamento. Dois seletores antigos da suíte foram atualizados para os nomes atuais da paleta com ícones e o texto padrão “Olá!”.
- Build da interface de qualificação aprovado; lint dos arquivos alterados sem avisos; `git diff --check` limpo.
- Typecheck completo do Studio aprovado, incluindo as importações do host compartilhado.

## Limites

A implementação está local. A reprodução na conta real do usuário e a homologação do ambiente publicado dependem de uma entrega posterior. As amostras usam o jogo real com inimigos aleatórios, sem um computador de referência controlado; não representam uma garantia de 60 FPS nem de ausência de todo atraso em projetos arbitrariamente grandes. Abrir uma definição ainda desenha seu corpo completo.

O recolhimento nativo isolado chegou a 296 ms no experimento anterior. A mudança entregue remove os corpos fechados do DOM, além de recolhê-los. Não substitui blocos editáveis por código opaco nem altera a lógica do jogo para produzir o ganho.
