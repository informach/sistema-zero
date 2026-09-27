# Revisão pedagógica · A Chave do Farol · 24/09/2026

Escopo: introdução, Dias 1 a 3 e certificado do novo **Desafio do Primeiro Jogo**. Os roteiros foram comparados com os manifestos, a paleta atual e o jogo preparado. Esta é uma revisão editorial e de testes locais; não substitui o ensaio da aula importada com vídeos gravados.

## Régua usada

- Começar cada seção situando a criança no jogo e no que ela vai conseguir fazer.
- Definir a palavra nova antes de usá-la; uma analogia próxima deve ajudar a voltar ao jogo, não desviar dele.
- No vídeo conceitual, explicar a ideia sem contar o resultado da experiência. No vídeo prático, mostrar cada caminho da paleta, encaixe, nome, valor e teste real.
- Mostrar o problema antes da solução. Atribuir à criança só o que ela programou; cenário, desenhos e movimento preparado do barco são identificados como prontos.
- Manter um vídeo por seção de trabalho, Zappy apenas como ponte e vídeo mais atividade exigidos juntos. Cortar seção que só repete um teste ou o envio.
- Usar os rótulos atuais da interface e da paleta; não inventar Play genérico nem mandar recarregar a página para reiniciar um teste.

## Resultado por roteiro

| Roteiro | Progressão verificada | Ajustes feitos na revisão |
|---|---|---|
| Introdução | Conflito do farol e jogo pronto → como usar seções, vídeo e ferramentas → caderno opcional → como voltar e pedir ajuda. | O botão **Anterior** é mostrado numa seção em que pode ser usado; a fala não afirma que a seção do certificado também tem vídeo. Título da seção final alinhado ao manifesto. |
| Dia 1 | Jogo preparado sem movimento → quatro direções → testar saída pela borda → acrescentar a regra de limite. | A velocidade só é explicada ao preencher seu bloco. A variável preparada `ganhou` não é apresentada antes de ser necessária. A fala dá o caminho completo, o sprite e o valor, e usa **Atualizar** quando a prévia não refletir a mudança. |
| Dia 2 | Encostar na chave não basta → acontecimento e memória → evento, variável e coleta testada uma só vez. | Corrigidos os caminhos reais de **Verdadeiro ou falso** e **texto**. O teste, **Salvo** e **Enviar** foram incorporados à construção; saiu a seção-vídeo que só repetia o fechamento. |
| Dia 3 | Farol não responde → condição com analogia de porta → teste sem e com chave na experiência → programação do Se no jogo → conquista. | O vídeo de conceito não narra o resultado da experiência. Corrigidos os caminhos de **valor da variável**, **texto** e **Verdadeiro ou falso**; ramo **senão** é testado antes do **então**. A porta da arte acesa agora aparece aberta, em vez de depender só da legenda. |
| Certificado | Conquista da criança → vídeo para o responsável → oferta externa opcional. | A criança é convidada a chamar quem cuida dela; a compra não é requisito e o vídeo não fixa preço, prazo ou bônus. A seção de emissão conserva o fluxo do certificado sem criar vídeo artificial. |

## Paridade e pendências de produção

O teste `qa/desafio-farol-manifestos.test.ts` compara títulos de seção e chaves de gravação dos cinco roteiros com os manifestos, na mesma ordem. Também verifica vídeo e atividade na conclusão e que os critérios de Estúdio reprovam a retomada antes da programação da criança. O jogo concluído foi executado quadro a quadro em teste: movimento, tentativa sem chave, coleta e chegada do barco após a condição.

Antes de publicar, ainda é preciso gravar e vincular os vídeos planejados, anexar os dois PDFs no bloco `materiais-farol`, conferir as telas e rótulos em staging e ensaiar o jogo por toque e teclado em tela estreita e ampliada. Não houve importação, publicação ou deploy nesta revisão.
