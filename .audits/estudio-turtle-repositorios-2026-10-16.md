# Jogos Turtle enviados pelo usuário: aproveitamento e compatibilidade

16/10/2026 · Leitura estática dos repositórios. Nenhum jogo foi executado, convertido ou incorporado ao produto. Complementa a [proposta revisada](../docs/plans/2026-10-16-estudio-javascript-python-turtle-proposta.md) e seu [contrato Turtle](../docs/plans/2026-10-16-turtle-api-portabilidade.md).

## 1. Conclusão

**Atualização durante implementação:** o usuário tornou obrigatórias todas as funcionalidades do Pac-Man, incluindo o episódio final. O [contrato adicional](../docs/plans/2026-10-16-pacman-aceite.md) supera as recomendações abaixo de limitar o aceite ao episódio 8 ou adiar a variante de áudio. O original continua congelado; uma variante explícita da fronteira de áudio deve preservar todos os recursos. Os demais repositórios continuam como referência, sem promessa de suporte a toda API externa.

Os exemplos reforçam a escolha de Turtle para oficinas de criação e jogos 2D. Também mostram que compatibilidade precisa abranger classes Python, entrada/saída, recursos e processamento de eventos durante o programa. Apenas implementar `forward` e `left` seria insuficiente.

Recomendo aproveitar os padrões como corpus de testes e produzir exemplos pedagógicos graduais, com materiais próprios do Pinta. Não tornar a execução integral de qualquer jogo desses repositórios um requisito implícito: alguns usam áudio do sistema, bibliotecas externas ou APIs fora do catálogo inicial.

## 2. Fontes fixadas

| Repositório | Commit examinado | Licença encontrada | Uso recomendado |
|---|---|---|---|
| [TheWannabeCoder92/pacman-turtle-python](https://github.com/TheWannabeCoder92/pacman-turtle-python/tree/2a4eb7f5963f905b1b80ebf4f3c8eaa50da50103) | `2a4eb7f5963f905b1b80ebf4f3c8eaa50da50103` | [MIT](https://github.com/TheWannabeCoder92/pacman-turtle-python/blob/2a4eb7f5963f905b1b80ebf4f3c8eaa50da50103/LICENSE) | Episódios incrementais; ep08 como candidato de integração Pro |
| [smahesh29/Games-Python-Turtle](https://github.com/smahesh29/Games-Python-Turtle/tree/292c5b156b0145b9aac81394b8984568b35a96e0) | `292c5b156b0145b9aac81394b8984568b35a96e0` | [MIT](https://github.com/smahesh29/Games-Python-Turtle/blob/292c5b156b0145b9aac81394b8984568b35a96e0/LICENSE) | Diversidade de loops, objetos e recursos; casos negativos explícitos |
| [techwithtim/Turtle-Racing-V2](https://github.com/techwithtim/Turtle-Racing-V2/tree/e1b61f27772491670b9383013e452fc982b3751c) | `e1b61f27772491670b9383013e452fc982b3751c` | Não encontrada na árvore/README examinados | Referência técnica/pedagógica; criar corrida autoral antes de distribuir template |

Para código MIT reutilizado, preservar avisos exigidos pela licença. Procedência específica de todos os sons/imagens não foi verificada; exemplos distribuídos devem usar materiais autorizados e identidade própria. Ausência de licença no terceiro repositório não foi tratada como permissão de redistribuição. [Orientação do GitHub sobre licenças](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/licensing-a-repository).

## 3. O que aproveitar de cada projeto

### Pac-Man por episódios

O episódio 8 separa personagens, desenho, mapa, constantes e entrada principal. Usa Turtle/random, classes, carimbos, consultas de posição/distância, teclado e atualização por timer. É candidato adequado para qualificar **Python Pro multiarquivo**, sem prometer que todas as suas estruturas viram blocos. [Entrada principal](https://github.com/TheWannabeCoder92/pacman-turtle-python/blob/2a4eb7f5963f905b1b80ebf4f3c8eaa50da50103/episodes/episode08/main.py).

`Actor` e `Pen` herdam de Turtle e acrescentam campos próprios. Isso exige classe Python extensível e suporte a `super()`, métodos vinculados e sobrecarga real de consultas. O renderer usa a cor Tk `dodger blue`, incompatível com repasse literal como CSS; a biblioteca web precisa resolver cores corretamente. [Personagens](https://github.com/TheWannabeCoder92/pacman-turtle-python/blob/2a4eb7f5963f905b1b80ebf4f3c8eaa50da50103/episodes/episode08/actors.py), [renderer](https://github.com/TheWannabeCoder92/pacman-turtle-python/blob/2a4eb7f5963f905b1b80ebf4f3c8eaa50da50103/episodes/episode08/renderer.py).

O episódio 9 adiciona GIFs e áudio via `os.system`/`aplay`. Esse original não é portátil para o navegador proposto. Não implementar um detector de comandos que finja executar áudio Linux; manter o caso original como diagnóstico ou elaborar variante explicitamente adaptada em outra entrega. O episódio 8 evita essa dependência. [Código final](https://github.com/TheWannabeCoder92/pacman-turtle-python/blob/2a4eb7f5963f905b1b80ebf4f3c8eaa50da50103/episodes/episode09/main.py).

Seu uso intensivo de carimbos, limpeza de placar e consultas por inimigo também exercita desempenho: estado geométrico deve permanecer no Python, sem round-trip gráfico por consulta. Intervalo de timer de 16 ms não prova taxa de 60 FPS; tempo gasto em cada callback também conta.

### Coleção de cinco jogos

| Jogo | O que exercita | Limite importante |
|---|---|---|
| [Snake](https://github.com/smahesh29/Games-Python-Turtle/blob/292c5b156b0145b9aac81394b8984568b35a96e0/Snake%20Game/snake.py) | Laço com update, teclado, sleep, criação de segmentos | Segmentos antigos podem permanecer registrados na tela; distinguir retenção do próprio programa de vazamento do adapter |
| [Space Station](https://github.com/smahesh29/Games-Python-Turtle/blob/292c5b156b0145b9aac81394b8984568b35a96e0/Space%20Station%20Defense%20Game/space_station.py) | Subclasse Turtle, polígonos, GIF, teclado e laço explícito | Atributos autorais podem sombrear nomes de métodos; preservar semântica Python |
| [Falling Skies](https://github.com/smahesh29/Games-Python-Turtle/blob/292c5b156b0145b9aac81394b8984568b35a96e0/Falling%20Skies/falling_skies.py) | Dezenas de objetos, imagens, colisões e esperas | Referência de carga acima da fixture básica; movimento por iteração varia com throughput |
| [Space Invaders](https://github.com/smahesh29/Games-Python-Turtle/blob/292c5b156b0145b9aac81394b8984568b35a96e0/Space%20Invaders%20Game/space.py) | Atualizações implícitas durante movimento, sem update explícito no laço | Importa `winsound`; não é compatível integralmente com browser |
| [Pacman](https://github.com/smahesh29/Games-Python-Turtle/blob/292c5b156b0145b9aac81394b8984568b35a96e0/Pacman/pacman.py) | API procedural, timer e aliases | Depende de `freegames` e usa undo Turtle, ambos fora da entrega inicial |

A inspeção dos recursos também encontrou GIFs multiquadro e arquivos cujo transporte base64 acrescenta tamanho significativo. Para publicação, medir bytes reais e overhead de transporte; não presumir que cabem no envelope do compilador JS. GIF multiquadro deve seguir o quadro estático escolhido pela referência Tk, sem animação automática introduzida pelo browser. [PhotoImage](https://www.tcl-lang.org/man/tcl8.7/TkCmd/photo.html).

### Corrida de tartarugas

A [corrida](https://github.com/techwithtim/Turtle-Racing-V2/blob/e1b61f27772491670b9383013e452fc982b3751c/turtleRaceTutorial.py) pede de 2 a 10 participantes por `input` antes de criar a tela, anima num laço com aleatoriedade, imprime o vencedor e espera. As operações Turtle estão no catálogo proposto; o valor do exemplo é testar interação e ciclo de vida sem depender de `mainloop` no final.

O player público precisa oferecer entrada e saída textual mesmo antes de existir Canvas. O programa não pode travar em um prompt invisível só porque está fora do editor. Para oficina mista, recomendo uma corrida autoral simples com duas tartarugas para iniciantes, e quantidade configurável, validação e funções para alunos mais experientes.

## 4. Mudanças incorporadas ao contrato

1. Classe Turtle extensível, atributos Python comuns, overloads e nomes de cor Tk.
2. Eventos em três estilos: atualizações explícitas, atualizações implícitas de movimentos e timers/mainloop. Não esperar o script terminar para entregar eventos.
3. Qualificar `time.sleep` da própria distribuição, sem monkeypatch nosso. Pyodide 314.0.7 já possui caminho suspensível quando `run_sync` está disponível; o caminho efetivo ainda precisa ser testado no worker/sandbox escolhido. Não despachar callbacks Turtle durante uma espera em que a referência Tk não os despacharia. [Fonte upstream](https://github.com/pyodide/pyodide/blob/314.0.7/src/py/pyodide/webloop.py#L1137-L1156).
4. Entrada/saída no player público e distinção entre documento carregado, interpretador pronto, espera por input e término do programa.
5. Fonte Pro preservada mesmo quando não inteiramente representável em blocos; importação de jogo não implica round-trip visual integral.
6. Fixtures negativas para recursos não contratados: comandos do sistema, áudio Windows, pacote externo não homologado e undo Turtle.

## 5. Como usar na implementação

O corpus terá manifesto com URL, commit, licença, hashes, arquivos/entrypoint, materiais e indicação **original ou adaptado**. Separar resultado esperado de incompatibilidade, candidato a compatibilidade e cenário efetivamente executado.

Prioridade: corrida autoral para entrada/animação, padrão Snake para update/sleep e episódio 8 para integração Pro. Acrescentar carga com mais objetos e carimbos depois do smoke test. Usar os mesmos arquivos nos ensaios browser e desktop quando se afirma compatibilidade sem alteração. Não corrigir o original antes de medi-lo e depois apresentar o resultado como aprovação do original.

Esses projetos não tornam Turtle um substituto de pygame-ce ou Raylib para todo tipo de jogo. Eles sustentam uma primeira entrega 2D útil e fornecem casos concretos para testar sua robustez, preservando bibliotecas mais exigentes para os perfis futuros.
