# Capacidades dos runtimes: inventário de código

Inspeção de 19/11/2026, staging na retomada `72652bf49` e incrementos
seguintes. Este documento distingue implementação de homologação: uma API
existente não prova FPS, memória estável ou suporte a todos os dispositivos.
Não substitui a linha de base medida exigida pela etapa 0.

## Execução, desenho e descarte

Os cinco motores JavaScript abaixo são os runtimes atuais, compostos pelos
fragmentos das próprias extensões. Não são novos motores. Desde 21/11/2026 a
prévia do Clássico roda, no staging, na casca em outro site
(`STUDIO_CLASSIC_SHELL_ENABLED=1`, conferida logada em
`../qa/2026-11-21-studio-casca-staging.md`); em produção, e quando a casca não
responde em 4 s, roda no documento direto. Não há prova de isolamento de CPU
desse arranjo no WebKit (decisão B4 pendente).

| Runtime | Implementação inspecionada | Recursos e limites existentes | Próxima evidência necessária |
| --- | --- | --- | --- |
| Jogo 2D | `game-2d/runtime.ts` e `runtime/{stage,sprites,physics,lifecycle,inspection}.ts`; API `SZGame2D` no documento | Entrada, áudio, sprites, física e ciclo de execução; adaptadores de cenas e sprites 2D | Fixture extensa com CPU de atualização/desenho, entidades ativas/visíveis e descarte após dez reinícios |
| Jogo 2D Avançado | `game-2d-advanced/runtime.ts` e fragmentos; canvas e API própria | Pools de entidades, índice de sobreposição, animação, áudio e cenas; o pool limita 300 ativos por molde e avisa ao atingir o teto, sem ampliar a cota | Comparar colisões e quadros com mapas extensos e retorno a regiões; medir o custo de preservar famílias de instâncias |
| Jogo 3D | `game-3d/runtime.ts`, `runtimeScene.ts` e `runtimeModelAssets.ts`; Three via importmap | Orçamento gráfico compartilhado, modelos, limpeza de geometrias/materiais e encerramento do loop; descarte de grupos fora da cena não equivale a streaming persistente | Draw calls, texturas, geometrias, CPU/GPU e estado após substituições e reinícios de um mundo extenso |
| Mundo 3D | `world-3d/runtime.ts` e `runtimeScene.ts`; Three via importmap | Câmera, regras de jogo, modelos, efeitos e orçamento gráfico compartilhados | Distinguir objetos estáticos/dinâmicos e medir visibilidade, física e descarte no jogo extenso |
| Jogo 3D Avançado | `game-3d-advanced/runtime.ts` e fragmentos de cena, projeto, câmera, gameplay e física | Three, regras, modelos, pós-processamento e orçamento gráfico; física cinemática e estados de entidades no próprio runtime | Homologar streaming e persistência de estado sob orçamento; não presumir outro motor de física ou ECS |

Os caminhos da tabela são relativos a
[`packages/studio/src/official-extensions`](../../packages/studio/src/official-extensions).
As versões do Three são compartilhadas por Clássico, Pro e imagem hospedada
em [`three-version.ts`](../../packages/core/src/studio/three-version.ts).
Esta missão dispensou compatibilidade com jogos 3D de produção inexistentes;
os exemplos precisam continuar válidos nas APIs atuais.

## Python

O documento e a autorização de execução são comuns, com interpretador no
worker protegido. O supervisor revoga a autoridade antes de desconectar
listeners, limpar timers e terminar o worker. As bibliotecas mantêm seus
próprios transportes; não se deve convertê-las todas em quadros de pixels.

| Runtime | Caminho atual | Desenho/entrada e custo a medir | Limitação a declarar |
| --- | --- | --- | --- |
| Python Clássico, sem extensão gráfica | `runtime/python/interpreter.ts`, `protectedWorker.ts`, `workerSupervisor.ts` | Inicialização do interpretador, execução, entrada/saída e supervisão | Isolar CPU no worker não comprova quota rígida de memória do processo do navegador |
| Turtle | `runtime/python/turtle/` | Engine Python adaptada, cena retida, eventos e desenho do Estúdio; medir crescimento da cena e descarte | Não é uma janela Tk nativa dentro do navegador |
| Pygame Zero | `runtime/python/pgzero/` | API adaptada, atores, comandos de desenho, áudio e cache de imagens; medir geração/transporte/renderização separadamente | Compatibilidade do módulo adaptado deve ser conferida por recurso, não anunciada como toda a instalação desktop |
| Pygame-ce | `runtime/python/pygame/` | pygame-ce 2.5.7 real em WebAssembly e ponte de pixels, entrada, tempo e áudio; medir cópia/transporte do quadro separadamente do interpretador | A documentação registra envio da tela completa em atualizações parciais e limites da ponte de áudio |
| Raylib | `runtime/python/raylib/` | API Python adaptada e renderer WebGL2; extensões 2D e 3D compartilham o núcleo; medir protocolo, recursos gráficos e desenho | Não equivale a oferecer dispositivos/janelas e toda a biblioteca nativa no navegador |

Fontes dos contratos: [`python-extensions.md`](../../packages/studio/docs/python-extensions.md),
os `contract.ts` de cada biblioteca e
[`workerSupervisor.ts`](../../packages/studio/src/runtime/python/workerSupervisor.ts).
Os pins de exportação desktop são próprios de cada contrato: o Pygame Zero
declara pgzero 1.2.1/pygame-ce 2.5.8; Pygame-ce fixa 2.5.7; Raylib segue
raylib-python-cffi 6.0.1.0. Não uniformizar esses números por conveniência.

## Depuração, desempenho e testes do autor

Atualizado em 21/11/2026. Os painéis Investigar, Desempenho e Meus testes saíram pela proposta
aprovada ([`paineis-proposta.md`](paineis-proposta.md)), que tem a tabela do que cada tipo de
projeto mostra. No Python, conferidos no staging com a distribuição nova
(`../qa/2026-11-21-studio-casca-staging.md`).

| Capacidade | O que existe | O que ainda não existe |
| --- | --- | --- |
| Investigar | Pausar e Avançar 1 quadro na troca de quadro, Valores agora e o caminho até o erro com "Mostrar o bloco" ou "Ir para a linha", nos cinco motores JavaScript e no Python; no Pro, só o caminho até o erro | Breakpoints e passo a passo por linha (fora da proposta aprovada); Pausar e Valores no Pro |
| Desempenho | Quadros por segundo e tempo de cada quadro; sprites (2D) ou objetos e desenhos por quadro (3D); memória marcada "indisponível" onde o navegador não informa | O custo da medida (< 5% do quadro) medido no navegador |
| Meus testes | O aluno escreve e roda testes com passos e conferências num palco escondido, até 20 passos e 15 segundos por teste; no Python, testar o programa e testar uma função | Os casos de chave, porta, vida, placar, fim, compilação e tempo, todos provados |
| Cenas | Adaptadores 2D/3D, fixtures congeladas dos contratos e a prova da exportação 2D | Prova 3D com cenário real; streaming genérico, prefetch, falha segura, persistência e descarte sob limite de memória |

Não apresentar o caminho até o erro como depurador por linha, nem os verificadores dos cursos como
os testes do aluno.

## Linha de base ainda necessária

Para cada linha de runtime: primeira carga, carga com cache, início do jogo,
CPU de atualização, desenho, transporte quando houver, entidades, recursos
gráficos, memória após dez reinícios e sessão prolongada. Separar a IDE do
runtime, o coletor leve do trace pesado e as métricas disponíveis das
estimativas. Publicar p50, p95, máximo e condições do aparelho, sem extrapolar
os números desta máquina para um equipamento de 8 GB.

O material privado do Arquipélago não integra estas fixtures. Os testes
devem usar os exemplos permitidos ou recursos genéricos com licença conhecida.
