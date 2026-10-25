# Execução autoritativa dos objetivos Python — verificação em andamento

## Comportamento implementado

O Members captura a revisão imutável do projeto e os critérios publicados. Objetivos de comportamento e retorno de funções usam o executor protegido; conceitos estruturais continuam disponíveis como critérios explícitos complementares. O navegador do aluno e o Admin não fornecem resultados aprovados. O Admin usa o mesmo verificador do servidor em uma rota própria de ensaio, sem conceder progresso ou XP.

O processo confiável envia somente ações, seletores e argumentos ao interpretador. As comparações e os resultados esperados permanecem no julgador canônico do servidor. Cada objetivo inicia um contexto e um worker novos; os casos de uma mesma função compartilham aquele cenário, com argumentos copiados a cada chamada. Arquivos de funções precisam pertencer ao projeto materializado.

Turtle e Pygame Zero fornecem identidades de objetos oficiais, e o frame confiável lê a posição apresentada pelo renderer. O teste direcional compara um intervalo sem tecla com keydown/keyup reais; velocidades diferentes podem passar, movimento na direção errada ou espontâneo não deve passar. Grupos/DOM/scripts JavaScript não são oferecidos como objetivos Python.

As entradas `input()` são linhas limitadas e autoradas, consumidas durante o programa, a função ou o evento testado. As quatro linhas podem incluir uma linha vazia. Entrada adicional ou não consumida impede aprovação. A matriz real comprovou entrada no programa e em função, quatro linhas com linha vazia, entrada extra e entrada não utilizada.

## Limites e autoridade

- Até oito objetivos executáveis e 40 s somados de ações/casos/entradas por verificação.
- Runner: 125 s; job: 140 s; cliente protegido: 150 s; progressão: 155 s; gateway/Admin: margens externas de 160/165/170 s.
- Uma materialização verificada por job; uma geração de execução por objetivo; encerramento do sandbox pelo proprietário existente.
- O recurso `project-missions-v1` pertence ao catálogo verificado da release. Um projeto não pode declarar por conta própria que um runtime antigo oferece a função.
- Projeto, revisão, runtime, geração, critérios, ordem/casos completos e encerramento são conferidos antes de aceitar evidência. Acesso, política, publicação e lease são revalidados antes de persistir progresso.
- A rota de ensaio compartilha o limite de 4.500.000 bytes no Admin, gateway e parser/socket do Members. As rotas comuns preservam seus limites menores.
- Erro de programa retorna objetivo não cumprido. Falha de transporte/evidência incompleta retorna indisponibilidade; não há aprovação alternativa por AST ou feedback do cliente.
- O caminho antigo de conversão dos objetivos em uma atividade estrutural com `clientResults` foi removido. Atividades formativas independentes não são prova de conclusão.

## Evidência consolidada local

Os logs ficam em `.cache/python-missions-20261024/`. Seleções diferentes não devem ser somadas como casos únicos.

| Prova | Resultado e limite |
|---|---|
| Objetivos em navegador isolado | 25 cenários reais, sem falhas (`mission-matrix-r5.log`), incluindo resposta errada, ramo morto, funções, entradas, limites, controles Turtle/Pygame Zero e direção/ausência de movimento |
| Conceitos também exigem execução | Quatro cenários reais (`playtest-health-r1.log`): programa correto aprovado; importação inválida, CPU sem checkpoint e entrada sem dados recusadas; encerramento dos quatro contêineres confirmado |
| SDK real dos objetivos | Workerd/R2/RPC/SDK 0.10.3: saída e função em outro módulo, 14.111 ms na chamada, limpeza confirmada (`06785b2a-f07c-40a8-9035-234067728425`) |
| SDK real dos conceitos | Compilação estrutural e execução com checkpoint, 11.486 ms na chamada, execução encerrada e nenhum contêiner residual (`a1bf69bb-0b99-45f6-9b64-2aae792e223d`) |
| Serviço/progressão/autoria | 36 testes / 186 asserções, sem falhas (`health-members-r2.log`), incluindo correspondência estrutural com programa falhando |
| Galeria e concorrência | 14 testes / 71 asserções (`gallery-health-r1.log`) |
| Core completo | 1.561 testes / 81.743 asserções (`core-full-r5.log`), anterior ao helper de receita estrutural |
| Members completo atual | 1.909 testes / 14.280 asserções, sem falha; 495 testes explicitamente ignorados por pré-requisitos/seleção (`members-full-health-r1.log`). Não equivale a prova de todos os bancos externos |
| Studio Python | 240 testes / 2.621 asserções (`studio-python-suite-r6.log`) |
| Admin atual | Dez testes externos / 82 asserções (`admin-final-gates-r1.log`), incluindo formulário Core/DOM Raylib; não é prova hospedada |
| DO/SQLite/RPC reais | Três testes externos sem falha (`real-do-r6.log`) |
| Runtime completo atual | 323 testes / 3.674 asserções, sem falha; um skip nativo declarado (`runtime-full-health-r1.log`) |
| JavaScript na imagem atual | Image smoke UID 1000 e os seis kits reais aprovados (`image-js-final-r1.log`, `validation-js-final-r1.log`): boot, pausa, entrada, objetivo, reinício e captura; não é QA completo da plataforma JS |
| Tipagem Admin atual | Exit 0 (`admin-types-final-r1.log`), incluindo o formulário Python/Raylib e o ensaio S2S |
| Tipagem Members atual | Exit 0 (`members-types-health-r2.log`), sem cast/supressão no ajuste do teste |
| Tipagem runtime atual | Produção e testes incluídos, exit 0 (`runtime-types-health-r2.log`) |
| Contratos CI | 300 testes / 1.067 asserções (`ci-contracts-health-r1.log`) |
| Biome repositório | Exit 0; 37 avisos e 169 informações preexistentes, sem erros (`repo-biome-health-r1.log`) |

Os recibos SDK ficam em `.cache/studio-python-l0/inspection-sdk/<identificador>/`. As durações medidas qualificam esta máquina e estas revisões, não uma meta de latência em produção. Cada prova Docker usa rede desativada, 1 GiB, um núcleo, imagem somente leitura e capacidades removidas. Cada objetivo tem contexto/worker próprio.

## Achados corrigidos e negativos preservados

1. Leitura de Turtle antes da primeira apresentação: a coleta inicia o baseline após uma posição apresentada, dentro de prazo limitado. A velocidade 9 passou após o ajuste; o negativo original permanece em `mission-smoke-matrix-r1.log`.
2. Registro gráfico antigo após limpar a tela e reutilizar um ID: RED em `turtle-clear-red.log`, GREEN em `turtle-clear-green.log`. Limpar/fechar a tela remove os vínculos antigos.
3. Erro indisponível renomeado sem o mapeamento HTTP: a integração expôs 400 em vez de 503; o mapeamento novo foi corrigido e a integração passou.
4. Corpo grande de autoria caía no limite comum de 64 KB: limite centralizado e teste HTTP com projeto maior que 64 KB e recusa por tamanho.
5. Entrada dentro de uma função era recusada antes da função ser chamada: RED real na imagem anterior em `function-input-red-old-image.log`; nova coleta acompanha a entrada durante todo o cenário. GREEN real na matriz final e no supervisor, com regressões preservadas.
6. Dois erros no próprio harness foram preservados: configuração de metadados privados da distribuição e variável `state` ausente na primeira prova SDK. A segunda prova SDK confirmou execução e limpeza.
7. TSC exploratório com heaps insuficientes gerou OOM (não falha do produto). A tipagem Admin/Members com 3.072 MiB passou; as provas negativas continuam nos logs.
8. A tipagem dos probes QA de estado recursivo exigiu codificação JSON explícita no RPC. A resposta HTTP observada permanece a mesma; SQL/RPC reais passaram após a correção. A tipagem completa do runtime passou novamente em `runtime-types-health-r2.log`.

## Ajuste final: conceitos não dispensam execução

O serviço não usa mais `inspect` como caminho de aprovação de objetivos estruturais. Ele usa a validação completa da revisão, com receita protegida e um checkpoint real. Só combina os fatos estruturais com o resultado depois que o programa executa sem erros e responde. Laço CPU sem checkpoint não recebe aprovação por conter a estrutura esperada. Programas com `input()` precisam de um objetivo executável com as entradas autoradas; conceitos sozinhos não inventam entradas.

O teste de tipagem encontrou um acesso não validado a `options.recipe` no próprio teste; a fixture passou a analisar o contrato canônico, sem cast/supressão. A nova tipagem Members passou após esse ajuste; o negativo anterior foi preservado. As tentativas inválidas de build por contexto/caminho local ficaram registradas; não são falhas do executor.

## Trabalho ainda obrigatório antes da entrega

- Integrar os commits concluídos de exemplos com staging, sem capturar arquivos em edição de outras sessões; concluir commit, CI remoto e deploy.
- Promover imagem, distribuição e catálogo imutáveis nas duas configurações, na ordem compatível com os contratos das aplicações.
- Validar autoria e aluno hospedados. DOM controlado e Docker direto não substituem essa prova.
- Medir o caminho hospedado e condições cold/warm; as medições locais não fecham a meta de desempenho.
- Concluir integração e provas Raylib 2D/3D conforme o [contrato](../superpowers/plans/2026-10-24-raylib-project-objectives.md). O commit externo atual contém a base 2D, mas `renderer3d.ts` ainda recusa operações: não é entrega 3D pronta.
- Manter falas, exemplos, valores e sequência dos roteiros JavaScript.

O CI executa a matriz real e os quatro cenários estruturais, preservando recibos JSON. Imagem fixada por SHA, bytes de runtime imutáveis e proprietários de execução separados. O gate não pula Raylib silenciosamente: essa qualificação será acrescentada quando o motor correspondente estiver completo.

Integração Git, CI remoto, publicação e validação hospedada ainda estão pendentes. Este documento não afirma implantação nem aceite final.

## Primeira integração remota

O commit `0571aade4` foi conciliado com os quatro commits concluídos dos lotes de jogos no merge `698c38d9c`, enviado a staging. O gerador conferiu os 49 exemplos Pygame Zero e os testes de catálogo passaram (25 testes/921 asserções). Nenhum input de runtime/Core/Members/Admin foi alterado por esse merge.

O primeiro CI Linux revelou `EACCES` ao gravar `python-mission-result.json`: o diretório montado pertencia ao UID do runner, enquanto a imagem mantém UID 1000. A preparação das tentativas agora permite escrita somente no diretório de saída recém-criado. A imagem continua não privilegiada, sem rede, com rootfs somente leitura e os mesmos limites. Prova Linux em volume isolado: escrita negada antes, permitida depois pelo UID 1000, volume removido; recibo `linux-output-permissions-r1.json`. O CI original negativo foi preservado e a matriz Linux corrigida precisa passar.

Foi solicitado adicionalmente verificar Jogo 3D clássico e three.js. O executor já executa kits Three, mas observação direcional e leitura de estado de objetos Pro exigem revisão específica; a qualificação dos kits não substitui essa frente.
