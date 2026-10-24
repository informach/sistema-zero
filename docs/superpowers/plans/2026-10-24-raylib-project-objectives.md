# Objetivos de projeto para Raylib 2D e 3D

Solicitado em 24/10 durante a conclusão da execução autoritativa Python. A base Raylib está sendo implementada por outra sessão na pasta principal; o usuário confirmou que essa frente ainda levará algum tempo. Não publicar nem qualificar o renderer 3D incompleto como uma implementação pronta.

## Preparação já implementada nesta frente

- Critérios reconhecem `python-raylib-2d` e `python-raylib-3d` como ambientes com teclado, cliques, variáveis/vetores, console e funções.
- O Admin permite comparar valores reais, incluindo `posicao.x`, `posicao.y` e `posicao.z`, com os mesmos operadores canônicos. Retornos de função usam argumentos JSON e arquivos Python do projeto.
- O editor não oferece um `Actor`/personagem fictício do Raylib: o seletor de posição gráfica de Turtle/Pygame Zero fica indisponível. O Raylib desenha por chamadas de API; variáveis/vetores têm um contrato distinto de identidades de atores retidos.
- Testes Core e do formulário real cobrem os dois ambientes. Ainda não são homologação de execução Raylib.
- O executor é genérico, protegido e não recebe respostas esperadas. A integração do motor deve entregar checkpoints cooperativos a esse executor.

## Integração a fazer quando a outra frente entregar um commit

1. Conciliar os commits concluídos, preservando as alterações em edição da outra sessão. Não copiar um renderer incompleto para uma release ativa.
2. Em `interpreter.py`, combinar `install_raylib()` com a instância `_mission` desta frente. Passar o callback interno `_checkpoint` para `_szraylib.configure()` somente na geração de missão.
3. Acrescentar `checkpoint=None` como argumento interno nomeado de `_szraylib._rt.configure()`. Guardar somente o callback confiável; não executar fonte enviada como sonda.
4. Chamar o checkpoint depois de `end_drawing()` concluir a troca gráfica, aplicar entradas/relógio e esvaziar a lista de operações. Na implementação inspecionada, o ponto seguro é após `del _ops[:]` em `_draw2d.py`; chamar antes pode descartar desenhos feitos por uma função testada durante o checkpoint.
5. O observador já impede reentrada durante uma função testada. Não iniciar outra avaliação CPython enquanto `callPromising` estiver suspenso. Solicitações chegam como sondas pendentes consumidas pelo checkpoint.
6. Em `frame.ts`, tratar observação de atores como capacidade opcional do renderer (`'missionPose' in renderer`). Um renderer sem essa capacidade não pode inventar posições gráficas. Variáveis e propriedades de vetores continuam sendo lidas no namespace real do programa.
7. Conciliar `canvasExtension.ts`, módulos, empacotamento, assets, tipos e os dois modos com a base já qualificada de Turtle/Pygame Zero. Gerar uma distribuição nova e manifestos imutáveis pelo pipeline canônico.
8. Provar WebGL2/software rendering no ambiente protegido, sem depender de GPU física do aluno/servidor. Não afrouxar isolamento, rede ou critérios para obter um resultado verde.

## Provas obrigatórias

- Programa Raylib 2D com laço oficial, desenho real, tecla correta, tecla sem efeito, direção oposta, clique/pontuação e encerramento.
- Programa Raylib 3D com câmera e objeto desenhados, leitura de propriedades x/y/z reais, movimento correto e incorreto e encerramento.
- Função em outro arquivo, `input()` quando aplicável, erro Python, loop sem checkpoint e tentativa de rede/arquivo fora do projeto.
- Troca de geração, Stop, revisão diferente, cancelamento e limpeza real do sandbox. Transporte bem-sucedido não prova objetivo cumprido.
- Acrescentar os casos Raylib ao gate real do CI após a integração do motor, sem omissão silenciosa quando a biblioteca estiver ausente.
- Conferir Admin, ensaio, aula e progressão pelo mesmo serviço de verificação. Não aceitar feedback do navegador como autoridade.

Uma exigência adicional de movimento com controle sem tecla para variáveis/vetores deve usar amostras próprias de estado numérico e julgamento explícito. Não converter essas variáveis em posições gráficas fictícias para reutilizar o tipo de ator 2D.

## Situação

Preparação de critérios e UI: implementada e testada. Laço/runtime Raylib e qualificação real 2D/3D: dependem da entrega da outra sessão e continuam pendentes. A publicação da base já qualificada não declara o Raylib homologado.
