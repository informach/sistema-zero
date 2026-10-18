# Estúdio JS/Python: contrato de desempenho

16/10/2026 · Revisão 3 · Anexo normativo da [proposta](2026-10-16-estudio-javascript-python-turtle-proposta.md). O usuário definiu desempenho como requisito prioritário. Os valores abaixo são metas propostas de aceite, não medições já obtidas.

## 1. Princípios obrigatórios

1. Projeto JS não baixa, compila nem inicializa Pyodide, Turtle web, Ruff Python ou sessão Pyright.
2. Python não executa código do aluno nem análise pesada na thread da interface do editor.
3. Execução e análise têm filas canceláveis independentes. Digitação não espera o programa terminar.
4. Não reinstalar dependências nem reconstruir a distribuição a cada Executar. Cache usa versão/hash, nunca apenas nome do pacote.
5. Painel recolhido não perde sessão, mas reduz trabalho derivado sem consumidor. Fechar projeto descarta seus recursos.
6. Cartões, listas de projetos e miniaturas de alunos não inicializam interpretadores. O professor abre execução sob demanda.
7. Otimização preserva geometria, ordem de efeitos, diagnósticos e fonte. Reduzir precisão ou descartar comandos para melhorar FPS é falha funcional.
8. Python sem a extensão Turtle não baixa/inicializa seu adapter gráfico, paleta ou renderer. Manifestos leves podem ser compartilhados. Adicionar a extensão não cria tela antes de o programa pedir recursos gráficos; o caminho de console funciona independentemente.

## 2. Ambiente de referência e cenários

Referência de entrada proposta: computador físico com 8 GB de RAM, CPU de quatro núcleos, GPU integrada e navegador desktop homologado. Registrar modelo, sistema, versão, alimentação/energia e resolução. Máquina de desenvolvimento mais potente serve para diagnóstico, não substitui essa prova.

Atualização de execução autorizada pelo usuário em 16/10/2026: há outro computador Windows com Chrome ou Edge, mas o teste nele será feito **somente depois de toda a implementação e validação neste computador de desenvolvimento**. Preparar o roteiro/pacote agora, executar ao final. A ausência dessa medição externa não bloqueia L0 nem os lotes de implementação/review locais. As metas da máquina de referência continuam pendentes até a coleta real; não extrapolar medições de 16 GB para 8 GB.

Rede controlada inicial: 20 Mbps de download, 5 Mbps de upload e RTT de 80 ms. Além do cenário controlado, observar rede real representativa. Fixar perfil de vídeo para comparar antes/depois: chamada com câmera e áudio; no professor, medir demonstração/compartilhamento com gravação quando oferecida e, separadamente, assistência após confirmação da pausa de gravação. Medir a transição entre esses estados; não executar assistência com gravação ativa para satisfazer o benchmark. Não atribuir à nova execução variação não controlada do provedor de vídeo.

Revisão 4, decisão do usuário em 16/10/2026: programação será recomendada no computador; celular serve à consulta responsiva. O player público será qualificado inicialmente em desktop. Ensaios físicos Android/iOS ficam para uma etapa posterior e não bloqueiam esta entrega. Emulação desktop não homologa memória, GPU ou engine móvel; nenhuma promessa de execução/jogabilidade Python móvel será feita sem essa evidência. A navegação responsiva e o suporte JS atual continuam obrigatórios.

Fixtures obrigatórias:

| ID | Carga |
|---|---|
| F0 | Abrir/criar JS clássico e JS Pro; jogar fixture JS interativa atual com editor/vídeo; confirmar ausência total de runtime Python |
| F1 | Turtle pequeno: duas tartarugas, 200 operações, nenhum asset externo |
| F2 | Arte: 10.000 segmentos, várias cores e animação controlada |
| F3 | Jogo: 20 tartarugas, teclado/mouse, timers e imagens; 10 minutos |
| F4 | Python Pro: 50 arquivos, 20.000 linhas e recursos dentro dos limites publicados |
| F5 | Loop infinito; flood de stdout; desenho cumulativo; fila gráfica saturada; FFI fora do protocolo, tentativa de subworkers e pressão de memória |
| F6 | 30 ciclos Executar→Parar; trocar projeto JS/Python e fechar/reabrir painéis |
| F7 | Professor em chamada, demonstração e auxílio; 30 alunos simulados editando para carga de serviços |
| F8 | Mural/página pública: F1/F3 em desktop, cache frio/quente, controles, retorno de aba e 30 reinícios; 20 cards sem runtimes. Consulta móvel responsiva; homologação física móvel de execução posterior |
| F9 | Importar imagem/vetor/frame/mapa Pinta; atualizar origem, cancelar conversão e reabrir projeto; confirmar que Turtle não carrega Molda |
| F10 | Python sem extensões: quiz com print/input, sorteio e operações em listas/dicionários; Clássico, Pro, aula com vídeo e player público; adicionar/remover Turtle e repetir |

O corpus adicional de jogos reais está na [análise dos repositórios](../../.audits/estudio-turtle-repositorios-2026-10-16.md): corrida de até 10 tartarugas, padrão Snake e labirinto com muitos carimbos/consultas. Fixar commit e separar original de adaptação. Eles complementam as fixtures controladas; jogos com recurso fora do catálogo são casos de diagnóstico, não benchmarks aprovados por hipótese.

Os números de carga são alvos de ensaio, não autorização para exceder cotas existentes. Se uma fixture ultrapassar o limite do perfil, ajustar a fixture ao limite e registrar a diferença; testar rejeição separadamente.

## 3. Metas iniciais de aceite

Medir no ambiente de referência. Para ações curtas, ao menos 30 amostras após preparação controlada; reportar mediana, p95, máximo e falhas. Cold cache é limpo de verdade e medido separadamente. Nunca excluir falhas silenciosamente da distribuição.

| Métrica | Meta proposta | Como observar |
|---|---|---|
| Regressão JS em ações discretas | p95 não piora além do maior entre 10% da referência e 20 ms | Abrir, salvar e exportar; não aplicar margem absoluta a frames |
| Fluidez/entrada JS | p95 de intervalo entre frames e entrada não pioram > 10%; preservar metas existentes mais estritas | F0 interativo nas mesmas condições, sem tolerância extra de 20 ms por frame |
| CPU/memória JS estáveis | não crescer > 10% sobre baseline aquecida, sem vazamento; investigar diferença acima do ruído medido | Mesma carga, duração e ferramentas |
| Payload Python numa sessão somente JS | 0 bytes de executores/analisadores Python; no máximo 5 KiB gzip de descritores novos compartilhados | Grafo de bundle + tráfego real |
| Editor usável | Seletor/loading não bloqueiam digitação; p95 tecla→pintura ≤ 100 ms | F1/F4, com runtime e vídeo ativos |
| Primeira execução Turtle sem cache | p95 ≤ 12 s até primeiro desenho útil de F1 | Inclui rede, download, compile e boot; vídeo ativo |
| Reabrir com recursos em cache | p95 ≤ 3 s até primeiro desenho útil | Novo projeto/sessão, cache de recursos válido |
| Executar após pequena edição | p95 ≤ 1,5 s até primeiro desenho de F1 | Sem contar duração proposital da animação |
| Parar — efeitos e interação | p95 ≤ 250 ms para confirmar; invalidar geração, renderer, entrada e áudio antes do ACK, sem efeitos posteriores da geração | F5, incluindo saídas tardias e promises |
| Parar — liberação nativa | workers do perfil protegido destruídos em até 3 s na carga de qualificação; medir separadamente da resposta da interface | Target específico e CPU do processo; caso com SIGINT ignorado; bloqueio de criação de workers filhos obrigatório |
| Resposta a teclado/mouse no jogo | p95 ≤ 100 ms | Entrada confiável até apresentação em F3 |
| Renderização durante animação F3 | p95 de intervalo entre frames ≤ 33 ms | Sem exigir 60 FPS em desenho sem movimento |
| Trabalho gráfico na thread principal | fatias de no máximo 8 ms; nenhuma tarefa do renderer > 50 ms na carga contratada | Trace do browser, não apenas FPS |
| Diagnóstico Python após pausa na digitação | p95 ≤ 1 s em F4 | Hash/revisão correspondentes, fila cancelada |
| Completion quente | p95 ≤ 300 ms com RTT de referência | Separar catálogo local e análise semântica |
| Mudança para próximo aluno | p95 ≤ 1 s para editor disponível; execução inicia sob demanda | Sem iniciar todos os runtimes da turma |
| Handoff com rede de referência | p95 ≤ 2 s após pré-condição de gravação segura, até snapshot confirmado e nova autoria | Medir pausa da gravação e tempo total percebido separadamente; buffers/grants/revisão reais |
| Player público | F1: p95 ≤ 12 s frio e ≤ 3 s cache; F3: entrada ≤ 100 ms e intervalo entre frames ≤ 33 ms | F8 em cada dispositivo homologado; não agregar celular lento ao desktop para esconder falha |
| Payload do player Python | nenhum editor/analisador Python nem editor/renderer Pinta/Molda | Tráfego e grafo do subpath de player; carregar só runtime, extensão e materiais publicados |
| Programação Python sem Turtle | p95 ≤ 12 s frio e ≤ 3 s cache até primeira saída/pergunta; ≤ 1,5 s ao executar após pequena edição; 0 bytes de adapter gráfico/paleta/renderer Turtle | F10 com fontes sem espera proposital; distinguir descritor leve de implementação gráfica; medir entrada/Parar pelas metas comuns |

Handoff sem confirmação de persistência em 10 s entra em estado pendente recuperável: não concede o novo escritor e mantém o rascunho. Esse prazo não substitui expiração/renovação do lease. Ao reconectar, consultar o recibo/revisão antes de repetir. Parar continua disponível imediatamente, mesmo durante persistência pendente.

Revisão técnica de16/10: a meta original de liberação física em1s foi reprovada por medição nativa. Chromium mantém um loop ocupado por cerca de2s após terminate. O contrato acima separa interrupção de efeitos e liberação do recurso; não acrescenta uma espera à interface. A topologia que permitia workers filhos foi rejeitada (um filho ocupado ampliou o prazo para4s). Razões, alternativas descartadas e provas estão no [ADR001](../../.compozy/tasks/estudio-python-l0/adrs/001-worker-stop.md). A aceleração oficial por SAB é opcional e não modifica headers das aulas.

No player, registrar separadamente chegada do documento, pronto do interpretador e primeira apresentação/interação. O timeout de falha de carregamento será configurado por perfil e validado com rede lenta; não reutilizar o handshake Pro JS de 10 s como prazo fatal Python. A meta de 12 s continua sendo o aceite de desempenho, mesmo quando a UX permite retry mais tarde. Download mostra progresso real quando mensurável e estado de preparação quando não houver total conhecido.

Não prometer todas essas metas sem prova. Se o lote técnico não atingi-las, a entrega dependente não é declarada pronta. Corrigir o desenho, reduzir escopo de carga de forma explícita ou revisar uma meta com evidência; nunca esconder inicialização atrás de uma tela que chama o programa de pronto.

Metas de entrada/frame usam F3 cooperativa. Esperas deliberadas do programa, como `time.sleep(5)`, não podem ser removidas nem ganhar bombeamento Turtle extra só para atingir 100 ms. Medir separadamente atraso autoral e custo acrescentado pela infraestrutura; durante espera o host e Parar continuam responsivos. Um loop sem limite de frequência não recebe aceleração artificial para parecer ter o mesmo ritmo em máquinas diferentes.

## 4. Memória, CPU e limites de trabalho

Meta inicial de incremento de memória atribuível a um projeto Python F1/F3: até 256 MiB sobre o shell/editor já aberto; F4 até 384 MiB. Medir também memória do processo/worker com ferramentas adequadas, pois JS heap sozinho não inclui toda memória WASM/GPU. Registrar o que cada navegador permite observar, sem comparar métricas diferentes como se fossem iguais.

Esses orçamentos são critérios para cargas homologadas, não cotas rígidas de processo impostas por Web Workers. Limites de comandos/objetos protegem o adapter; código que use FFI ou aloque memória diretamente exige as provas de isolamento de L0. Testar encerramento e recuperação da fonte sem prometer que todo OOM hostil é evitável. Para o player móvel, contabilizar runtime+renderer+assets e registrar também pressão de memória/retorno após suspensão pelo sistema.

No máximo um interpretador **de execução** ativo por projeto/instância. O parser AST Python pode exigir um segundo interpretador de análise, independente para não bloquear a Ponte; seus bytes, memória e CPU entram no mesmo orçamento agregado, não ficam fora da medição. Inicializar esse parser somente quando houver análise Python a fazer, serializar/cancelar tarefas e evitar um parser por arquivo. A visão normal do professor mantém no máximo duas execuções explicitamente abertas: demonstração e aluno assistido. Outros cards usam imagem/snapshot. Pausar/recolher não inicia novos workers. Preaquecer worker adicional só pode entrar depois de provar ganho e respeitar o orçamento agregado; não é premissa para esconder boot lento.

Depois de 30 ciclos F6 e coleta permitida pelo harness, não deve haver workers, proxies, listeners ou timers órfãos. Memória retida estabiliza; crescimento acumulado superior a 10% do estado aquecido exige investigação, mesmo se ainda abaixo do teto. Fechar um projeto remove suas sessões e canais.

Distinguir vazamento do runtime de objetos mantidos pelo próprio programa. Ocultar uma tartaruga ou movê-la para fora da tela não a destrói no Turtle oficial; jogos que acumulam segmentos continuam sujeitos à cota de objetos. Medir reinício completo da sessão e reinício interno do jogo separadamente, sem apagar objetos autorais para melhorar o gráfico de memória.

Perfil inicial de proteção a qualificar: Canvas lógico até 1920×1080; backing store até 8 megapixels; 128 tartarugas; 100.000 primitivas retidas; fila pendente até 4.096 comandos ou 1 MiB, o que ocorrer primeiro. São limites do runtime Python, sem reduzir os limites JS. Valores compõem o manifesto versionado, aparecem nos testes de fronteira e podem mudar antes da homologação, com evidência.

Quando a fila chega ao limite, aplicar contrapressão para o produtor suspender; não descartar desenhos. Mensagens usam lotes limitados e buffers transferíveis quando adequados. Cada consumidor valida bytes **e custo**, incluindo dimensões de imagens, pontos e frequência. Desenho acumulado que ultrapassa o perfil gera erro claro; não mantém crescimento ilimitado.

O renderer só pede frames com trabalho visual. Uma tartaruga parada em `mainloop` aguarda eventos/timers; não usa loop de polling a 60 Hz. Console tem buffer circular limitado, contagem de linhas omitidas e entrega em lotes; não cria um nó DOM para cada `print` de um flood. Parar tem prioridade sobre processamento de render/log.

## 5. Análise e serviços durante a oficina

Parser, Ruff e Pyright só trabalham em snapshots novos, cancelam versões obsoletas e consolidam edições. Não analisar todos os arquivos a cada tecla nem buscar símbolos de painéis fechados. Inicializar stubs/índices por hash do ambiente e reutilizá-los quando permitido pelo isolamento.

LSP: orçamento proposto de 256 MiB por workspace ativo e fila máxima de uma análise relevante por documento; requests interativos têm prioridade sobre tarefas de fundo. Qualificar esse orçamento já em L0 com processo/stubs reais e F4, incluindo bootstrap/pico e completion fria; não esperar L5 para descobrir que a arquitetura não cabe. Estouro causa cancelamento/recuperação controlada, sem derrubar o editor. Inatividade por cinco minutos encerra o processo; fonte autoral permanece no coordenador existente, sem depender do processo LSP para ser salva. Reconexão envia snapshot atual. Esse estado temporário não é outro banco de projetos.

Ensaio de carga inicial: 30 alunos + professor, com edição concorrente, reconexão e mudança de aluno. Confirmar que a concorrência de builds/análise tem cotas e capacidade suficiente; não compartilhar processos com arquivos de alunos diferentes sem isolamento comprovado. Medir espera em fila separadamente do tempo de análise. Definir capacidade operacional com o resultado, sem inventar custo por aluno antes da medição. Pacotes externos Python não são instalados nesta etapa.

### 5.1 Materialização Pinta

Carregar rasterizador somente quando a ação de importação exigir conversão. Um projeto Turtle não baixa Three/Molda para importar do Pinta, executar, publicar ou exportar fonte. Cache de derivados usa hash de origem + versão/receita + resolução; atualizar origem invalida somente derivados afetados. Cópia de PNG existente não deve passar por rasterização desnecessária.

No máximo uma conversão gráfica por instância; fila cancelável e confirmação de revisão antes de inserir resultado. Fechar modal/trocar projeto cancela a aplicação, libera buffers/contextos de exportação e mantém a fonte anterior. F9 exige a mesma responsividade do editor e ausência de recursos órfãos após 30 ciclos. Medir tempo total, pico RAM, bytes e latência de cancelamento em imagens/mapas de tamanho conhecido; L0 registra uma amostra real do caminho mais pesado para fixar orçamento antes de L5A. Nunca diminuir resolução silenciosamente para passar no teste; a escolha pertence à receita apresentada à criança.

## 6. Observabilidade e release gate

Instrumentar marcos de download/compilação/boot/ready/run/primeiro desenho/stop, bytes e acertos de cache, fila gráfica, memória observável, quantidade de workers e latência do serviço de linguagem. Identidade inclui perfil/release/fixture/revisão; telemetria de produção não precisa coletar fontes ou prompts.

Guardar traces, logs agregados, versões, condições de rede e resultados junto da matriz funcional. Uma execução rápida com saída incorreta não passa. Falhas, retries, cache inválido e indisponibilidade de serviço são cenários próprios.

A entrega exige desempenho **e** preservação funcional. Não há atalho de liberar Python retirando recursos JS, truncando fonte, deixando callbacks antigos ativos ou chamando runtime experimental de universalmente suportado.
