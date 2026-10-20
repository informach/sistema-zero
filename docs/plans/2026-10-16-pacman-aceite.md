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

O corpus e a variante de áudio portátil estão preparados e foram executados em cenários instrumentados reais. Em20/10, seis casos passaram no Turtle/Tk oficial com dispositivo WASAPI, a partir de ZIPs do exportador real, fora do checkout. No navegador passaram os mesmos seis casos em Chrome e Edge:12casos qualificados em13tentativas. A primeira abertura Chrome terminou antes da página, causa desconhecida; o negativo foi preservado, os controles de lançamento passaram e a repetição declarada passou sem mudar produto. Zero retries automáticos.

Os casos cobrem execução dos cinco módulos, sete inimigos presentes, coleta comum+2, especial+50/velocidade+3/reset real após3s, dano/respawn e estados próximos de vitória/derrota. O caso observe entrega as quatro setas reais no navegador após o atraso autoral; no desktop verifica os bindings registrados, sem input físico. As injeções estão declaradas no observer e não representam uma partida completa. O cenário especial observa o resultado do timer, não apenas seu agendamento.

Recibos: `.cache/studio-python-l0/pacman-native-r1/verification.json` SHA93694bc8 e `browser-verification.json` SHA04ac3dfa; reviews independentes nativo4ce8683d/browser12b6ecf5. Os ZIPs têm inventários e igualdade do módulo de áudio instalado; a instalação foi reutilizada e revalidada, não instalada novamente para este jogo. Native Map=0 foi observado com root oculto antes do setup oficial. Screenshots físicas1011×860 não comprovam as coordenadas lógicas nem o comportamento responsivo.

O encerramento autoral foi verificado separadamente: dois cenários nativos executaram o timer real e fecharam a janela sem intervenção da QA. O primeiro caso Chrome na distribuição19de completou o jogo, mas registrou uma violação CSP no probe de validação; esse negativo permanece preservado. Após corrigir o bootstrap dos schemas e gerar a distribuição imutável43fa, vitória e derrota passaram uma vez em Chrome e Edge, com retorno após3,0029–3,0196s, WAVs esperados, mídia liberada, frame removido e console sem erros. Recibo `pacman-lifecycle-r2/verification-r2.json`, SHA9da78b1e. São estados próximos do fim injetados pelo observer, não partidas completas.

P01–P16 ainda não têm aceite integral. Permanecem pendentes as quatro faces das paredes/bordas/alinhamento e perseguição, foco/repetição, renderização detalhada/clear/reset, cada efeito e seu ciclo de vida durante cancelamento/reinício, editor/salvar/reabrir, Mural/player, instalação desktop fresca e desempenho normativo/partida10min/30reinícios. Nenhuma dessas provas libera mídia do corpus para distribuição na galeria; o exemplo editorial tem recursos próprios e qualificação separada.
