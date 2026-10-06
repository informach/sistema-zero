# Caderno do Aluno · Corre, Dino!

Os textos vêm da mesma fonte dos roteiros: `../../qa/corre-dino.conteudo.json`, com as instruções de verificação e envio de `../../qa/gerar-corre-dino.ts`. Para revisar conteúdo, alterar a fonte e regenerar os trios e o PDF.

Para a criança, o caderno se chama **Mapa da Aventura** (Diretrizes, seção 6): capa, rodapé, índice e passos falam de fase e parte, com os botões novos (**Próxima parte**, **Verificar esta parte**, **Enviar meu projeto**, **Concluir fase**). A página de abertura oferece ler na fase ou baixar para guardar como convite.

O caderno usa o CSS e as fontes Baloo 2/Nunito de Cadê Todo Mundo?, com passos numerados e esquemas de encaixe. Rótulos, opções e cores dos blocos vêm das definições reais do Estúdio; valores e estruturas vêm dos 13 programas originais. Os trechos anteriores omitidos nos esquemas ficam indicados. As instruções escritas conservam os caminhos, valores e testes completos. A capa é uma captura local do jogo original em execução.

```powershell
python -X utf8 docs/aulas-interativas/recursos/corre-dino/gerar-materiais.py
```

Requer Bun, Python com Playwright e Chrome ou Edge instalado. HTML, captura, PDF temporário e relatório de limites ficam em `tmp/pdfs/corre-dino/`. Saída: [corre-dino-caderno.pdf](../../../../output/pdf/corre-dino-caderno.pdf).

O gerador espera as fontes, mantém a abertura junto da primeira ação e o encerramento junto do último teste, e confere imagens, cores e limites antes de substituir o PDF. A revisão de 05/10/2026 produziu 52 páginas e 145 representações de blocos; a do vocabulário da aventura, em 06/10/2026, manteve os mesmos números. Na revisão das falas, também em 06/10/2026, o mapa passou a falar com a criança ("Este é o seu Mapa da Aventura!", "o seu jogo", "clique em Baixar" como convite) e os passos das montagens ganharam a retomada no próprio jogo e o porquê de cada resultado: o PDF ficou com 59 páginas e os mesmos 145 blocos. Depois da revisão independente do mesmo dia (rótulos reais, gravidade, toque na parte de cima), ficou com 58 páginas e 145 blocos; com as retomadas curtas e a conferência depois do teste, à noite, 56 páginas e os mesmos 145 blocos. A inspeção visual do PDF continua necessária depois de alterações no conteúdo ou nos esquemas.

Anexar somente esse PDF à seção 2 da primeira aula. Consulta, download e impressão são opcionais. As perguntas dos quizzes ficam na plataforma; o caderno orienta a revisão sem adiantar o gabarito.
