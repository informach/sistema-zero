# Continuidade da conversa nos roteiros · 07/10/2026

A pedido do responsável, revisão dos outros cursos e aulas depois da aprovação da Aula 1 de Cadê Todo Mundo?. A referência foi a ligação entre a fala e o momento da criança: o que acabou de fazer, o que está na tela e o que vem a seguir.

Foram percorridos os outros 36 roteiros, incluindo certificados, com atenção às aberturas, retomadas, chamados de atenção, passagens entre ferramentas, envios e encerramentos. Houve ajustes em 15 roteiros, envolvendo 22 clipes. A proposta, o roteiro e o manifesto da Aula 1 aprovada permaneceram idênticos ao início desta rodada.

| Curso | Roteiros revistos nesta rodada | Roteiros alterados |
| --- | ---: | --- |
| Cadê Todo Mundo? | 2 | Nenhum; Aula 2 e certificado já ligam os chamados ao resultado mostrado |
| A Chave do Farol | 4 | Dias 1 e 2 |
| Nave Contra Asteroides | 9 | `dia-2`, `comecar-partida` e `dia-5` |
| Corre, Dino! | 13 | Aulas 01, 02, 04, 07, 08, 09, 10 e 13 |
| O Jogo do Meu Jeito | 8 | Aulas 06 e 07 |

## Correções

- **Farol:** a abertura anuncia a surpresa sem pedir segredo. Depois do envio, o Dia 2 reconhece a coleta e o aviso programados pela criança e retoma a promessa: “E lembra da surpresa que eu te contei quando a aventura começou?”.
- **Nave:** a fala orienta clicar no jogo e testar antes de comentar o disparo. O desaparecimento dos tiros da tela deixa de ser apresentado como prova do que acontece dentro do grupo. Os trechos sobre som chamam a escuta. O fim da partida começa com um teste, e a comemoração da publicação vem depois de esperar a confirmação.
- **Dino:** nove chamados duplos, como “Olhe a área do jogo. Olha só”, viraram uma orientação. O leitor de tela começa com “Escute”, e a retomada do pulo usa “Percebeu?”. As notas de gravação deixam espaço para ouvir. A batida retoma o que a criança programou antes de propor os efeitos; a publicação espera a confirmação.
- **Meu Jeito:** preparar a folha da nave termina explicando o passo seguinte, sem apontar para uma animação ainda ausente. Antes de comentar as pedras, a fala manda voltar à prévia e começar a partida com Enter.

Os chamados ligados a demonstrações reais foram mantidos, inclusive nos certificados. As regras correspondentes entraram na seção 6 das [Diretrizes Pedagógicas](../DIRETRIZES-PEDAGOGICAS.md). Os testes editoriais do Dino foram ajustados somente nos dois casos auditivos, preservando as exigências de demonstração, passos, explicação e saída.

## Trechos para gravação

| Roteiro | Clipes com alteração |
| --- | --- |
| `desafio-dia-1` | `video-intro-farol` |
| `desafio-dia-2` | `video-d2-programar` |
| `nave-contra-asteroides-dia-2` | `video-tiros-voam`, `video-faxina` |
| `nave-contra-asteroides-comecar-partida` | `video-relogio-e-tiro` |
| `nave-contra-asteroides-dia-5` | `video-finais`, `video-ciclo-completo` |
| `corre-dino-aula-01` | `video-area-e-tela`, `video-borda` |
| `corre-dino-aula-02` | `video-motor-e-dino`, `video-limpeza`, `video-ordem-certa`, `video-retirar-borda`, `video-descricao` |
| `corre-dino-aula-04` | `video-som-no-pulo` |
| `corre-dino-aula-07` | `video-embrulhar` |
| `corre-dino-aula-08` | `video-menu` |
| `corre-dino-aula-09` | `video-batida-sentida` |
| `corre-dino-aula-10` | `video-ajustar-area` |
| `corre-dino-aula-13` | `video-entrega` |
| `meu-jeito-aula-06` | `video-folha-nave` |
| `meu-jeito-aula-07` | `video-folha-pedra` |

## Conferência local

Os quatro geradores foram executados. Nas propostas geradas que apenas resumem o objetivo da seção, o conteúdo continuou igual; as duas propostas manuais do Farol foram sincronizadas com as falas. Comparados aos arquivos preservados no começo desta rodada, os 37 manifestos mudaram somente em sete campos `plannedVideo`. Seções, identificadores, projetos, critérios, mídia anexada e regras de conclusão permaneceram iguais.

- `bun test docs/aulas-interativas/qa`: 196 testes passaram, em 11 arquivos.
- `bun docs/aulas-interativas/qa/validar-manifestos.ts`: 37 válidos, sem reprovações.
- `python -X utf8 docs/aulas-interativas/validar-roteiros.py`: 37 roteiros e 203 clipes válidos.
- `bun docs/como-fazer/validar.ts`: 42 tutoriais válidos; permanece a sugestão de imagem ou vídeo no tutorial de envio pela galeria, fora desta revisão.
- `git diff --check`: sem erros.

Os três Mapas da Aventura derivados das falas foram gerados novamente: [Nave, 39 páginas](../../../output/pdf/nave-contra-asteroides-caderno.pdf), [Dino, 56 páginas](../../../output/pdf/corre-dino-caderno.pdf) e [Meu Jeito, 33 páginas](../../../output/pdf/meu-jeito-caderno.pdf). Os geradores conferiram fontes, imagens, cores e limites; os PDFs foram renderizados para revisão visual de todas as páginas em miniaturas e de páginas alteradas em tamanho legível. Não houve cortes ou sobreposição nos trechos conferidos. O Mapa do Farol não reproduz as falas alteradas e não precisou ser regenerado.

Esta revisão atualiza os materiais locais. Os 22 clipes precisam usar as novas falas na gravação ou regravação; os PDFs revisados precisam ser anexados na publicação do conteúdo. Não houve importação no Admin nem ensaio com crianças. Os testes automatizados verificam os arquivos e a estrutura, não a compreensão infantil.
