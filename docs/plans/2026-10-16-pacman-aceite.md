# Pac-Man: funcionalidades obrigatórias de compatibilidade

Em 16/10/2026 o usuário tornou todas as funcionalidades deste jogo um requisito explícito. Este documento substitui a classificação anterior do episódio 9 como mera referência negativa. Preservar JavaScript e não executar comandos do sistema dentro do navegador continuam obrigatórios.

Referência: [episódio 9](https://github.com/TheWannabeCoder92/pacman-turtle-python/tree/2a4eb7f5963f905b1b80ebf4f3c8eaa50da50103/episodes/episode09), commit `2a4eb7f5963f905b1b80ebf4f3c8eaa50da50103`, licença MIT. [Manifesto de bytes/hashes](../../experiments/studio-python-l0/corpus/pacman.json). Preservar licença e autoria quando reutilizar código. Arquivos de terceiros usados em teste permanecem no cache, fora do produto e dos templates distribuídos.

## Portabilidade

Turtle não fornece áudio. O original chama quatro vezes `os.system` com `aplay`: início, coleta comum, coleta especial e morte. Depende de Linux e de um executável instalado; não executa inalterado no navegador nem no Windows. Preservar o original e registrar a incompatibilidade. Não substituir `os.system`, interpretar strings de shell nem silenciar som para declarar aprovação.

A variante muda explicitamente o import e essas quatro chamadas para um módulo de áudio portátil. Esse módulo precisa tocar WAV reais no navegador e acompanhar o projeto exportado, com backend desktop e dependências declaradas. Gesto inicial de Jogar ativa áudio; Parar/reiniciar cancela sons anteriores. É capacidade de mídia separada da API oficial Turtle, sem inventar `turtle.play_sound`. Nenhum som ou lógica do jogo é removido. Diff, versão e hashes da variante acompanham a evidência.

## Matriz obrigatória

| Caso | Resultado a comprovar |
|---|---|
| P01 | Cinco módulos Python, herança Turtle, `super()`, atributos autorais, coleções e imports do projeto |
| P02 | Tela lógica 1010×860, fundo preto, título e painel; escala responsiva sem alterar coordenadas e colisões |
| P03 | Nove GIFs registrados; paredes por carimbo; bolinhas/especiais com cores, tamanho e contorno; sprites e direção |
| P04 | Teclas após atraso inicial de 2,5 s; quatro direções alteram rumo/estado/imagem; foco e repetição corretos |
| P05 | Movimento, parada nas quatro faces das paredes, correções de alinhamento e passagem pelas bordas |
| P06 | Bolinha inicial removida sem pontos; demais removidas pelo ID correto, som e +2 pontos |
| P07 | Especial removida, som, +50 pontos, velocidade +3 e retorno ao valor inicial após 3 s |
| P08 | Sete inimigos, posição inicial afastada, movimento/direção aleatórios válidos, paredes, radar/perseguição e bordas |
| P09 | Colisão toca morte, reposiciona em ponto seguro e reduz vidas conforme referência |
| P10 | Placar/vidas com alinhamento/fonte; `clear`/`reset` afetam somente os objetos corretos |
| P11 | Sem bolinhas: vitória, mensagem, inimigos escondidos/parados e fechamento após 3 s |
| P12 | Zero vidas: derrota, mensagem/pontuação final, jogador escondido, inimigos parados e fechamento após 3 s |
| P13 | Sons reais de início/coleta/morte, carregamento por hash, mixagem/encerramento definidos e sem subprocesso web |
| P14 | Timers de 16 ms, input durante atualização, cancelamento no jogo/espera e reinício sem atividade anterior |
| P15 | Abrir/salvar/reabrir Pro, assets íntegros, mural/player sem editor e exportação desktop com todos os recursos |
| P16 | Startup, latência, frames, memória, 30 reinícios e partida de 10 minutos, sem ocultar falhas de carga/áudio |

Combinar execução real e cenários determinísticos do mesmo código. Sementes e posições de teste são instrumentação registrada; não reescrever algoritmos para passar. Bugs presentes no original devem ser reproduzidos na referência e separados de defeitos do adapter. Aprovar métodos isolados não aprova o jogo. Não prometer conversão visual integral de herança/construções avançadas; fonte Pro permanece preservada.

## Estado

Inventário estático e manifesto preparados. Execução integral browser/desktop, variante de áudio e P01–P16 pendentes. Integração em L3 (runtime/mídia), L5 (Pro), L7 (player/exportação) e L8 (qualificação final). Requisito adicional R21 na matriz geral.
