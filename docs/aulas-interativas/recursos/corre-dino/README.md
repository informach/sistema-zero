# Caderno do Aluno · Corre, Dino!

Os textos vêm da mesma fonte dos roteiros: `../../qa/corre-dino.conteudo.json`, com as instruções de verificação e envio de `../../qa/gerar-corre-dino.ts`. Para revisar conteúdo, alterar a fonte e regenerar os trios e o PDF.

O caderno usa o CSS e as fontes Baloo 2/Nunito de Cadê Todo Mundo?, com passos numerados e esquemas de encaixe. Rótulos, opções e cores dos blocos vêm das definições reais do Estúdio; valores e estruturas vêm dos 13 programas originais. Os trechos anteriores omitidos nos esquemas ficam indicados. As instruções escritas conservam os caminhos, valores e testes completos. A capa é uma captura local do jogo original em execução.

```powershell
python -X utf8 docs/aulas-interativas/recursos/corre-dino/gerar-materiais.py
```

Requer Bun, Python com Playwright e Chrome ou Edge instalado. HTML, captura, PDF temporário e relatório de limites ficam em `tmp/pdfs/corre-dino/`. Saída: [corre-dino-caderno.pdf](../../../../output/pdf/corre-dino-caderno.pdf).

O gerador espera as fontes, mantém a abertura junto da primeira ação e o encerramento junto do último teste, e confere imagens, cores e limites antes de substituir o PDF. A revisão de 05/10/2026 produziu 52 páginas e 145 representações de blocos. A inspeção visual do PDF continua necessária depois de alterações no conteúdo ou nos esquemas.

Anexar somente esse PDF à seção 2 da primeira aula. Consulta, download e impressão são opcionais. As perguntas dos quizzes ficam na plataforma; o caderno orienta a revisão sem adiantar o gabarito.
