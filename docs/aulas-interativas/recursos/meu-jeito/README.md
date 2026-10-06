# Caderno do Aluno · O Jogo do Meu Jeito

Texto derivado de `../../qa/meu-jeito.conteudo.json`, com os encaminhamentos de `../../qa/gerar-meu-jeito.ts`. Revise essa fonte e regenere os trios e o PDF juntos.

O caderno acompanha as oito aulas com passos completos, autoconferências, referências das duas artes e diagramas de integração. As perguntas dos quizzes ficam na plataforma; o PDF orienta a revisão sem antecipar o gabarito. Leitura, download e impressão são opcionais.

Usa o CSS e as fontes Baloo 2/Nunito do Cadê Todo Mundo?. Os diagramas recebem valores do programa original, rótulos e cores exatas das definições dos blocos. Trechos anteriores omitidos estão indicados. As ilustrações técnicas de `artes-referencia.ts` mostram dois quadros de 32 × 32 para nave/voando e de 64 × 64 para asteroide/girando, ambos a 8 fps. São exemplos; formas e cores continuam escolhas do aluno. A capa é uma captura local desse mesmo jogo em execução.

```powershell
python -X utf8 docs/aulas-interativas/recursos/meu-jeito/gerar-materiais.py
```

Requer Bun, Python com Playwright e Chrome ou Edge instalado. HTML, captura, PDF temporário e relatório de limites ficam em `tmp/pdfs/meu-jeito/`. Saída: [meu-jeito-caderno.pdf](../../../../output/pdf/meu-jeito-caderno.pdf).

A geração aguarda as fontes e confere imagens, cores, limites e erros de execução do jogo antes de substituir a saída. A revisão de 05/10/2026 produziu 28 páginas e 15 representações de blocos. A revisão visual de todas as páginas continua necessária após mudanças. Anexar apenas esse PDF a `materiais-caderno`, seção 2 da aula 1; o gerador não hospeda nem publica o arquivo.
