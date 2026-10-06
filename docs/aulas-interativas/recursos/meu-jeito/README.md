# Caderno do Aluno (Mapa da Aventura) · O Jogo do Meu Jeito

Texto derivado de `../../qa/meu-jeito.conteudo.json`, com os encaminhamentos de `../../qa/gerar-meu-jeito.ts`. Revise essa fonte e regenere os trios e o PDF juntos.

O caderno acompanha as oito aulas com passos completos, autoconferências, referências das duas artes e diagramas de integração. As perguntas dos quizzes ficam na plataforma; o PDF orienta a revisão sem antecipar o gabarito. Leitura, download e impressão são opcionais.

Para a criança, o caderno se chama **Mapa da Aventura** (vocabulário da aventura, 06/10/2026): capa, índice, rodapé e passos dizem Mapa da Aventura, Fase N e parte, e citam os botões novos (Próxima parte, Enviar (1), Recebido!, Concluir fase). A página de abertura oferece ler aqui na fase ou baixar para guardar como convite, sem dizer o que ela não precisa fazer. O nome do arquivo continua `meu-jeito-caderno.pdf`.

Usa o CSS e as fontes Baloo 2/Nunito do Cadê Todo Mundo?. Os diagramas recebem valores do programa original, rótulos e cores exatas das definições dos blocos. Trechos anteriores omitidos estão indicados. As ilustrações técnicas de `artes-referencia.ts` mostram dois quadros de 32 × 32 para nave/voando e de 64 × 64 para asteroide/girando, ambos a 8 fps. São exemplos; formas e cores continuam escolhas do aluno. A capa é uma captura local desse mesmo jogo em execução.

```powershell
python -X utf8 docs/aulas-interativas/recursos/meu-jeito/gerar-materiais.py
```

Requer Bun, Python com Playwright e Chrome ou Edge instalado. HTML, captura, PDF temporário e relatório de limites ficam em `tmp/pdfs/meu-jeito/`. Saída: [meu-jeito-caderno.pdf](../../../../output/pdf/meu-jeito-caderno.pdf).

Desde a revisão de falas de 06/10/2026 (três vozes, conversa contínua e chamados de atenção), o Mapa usa a fala das aplicações no modo `mapa` de `falasSecao`: o fecho não manda pausar um vídeo nem voltar a "esta aba", e sim fazer a parte, esperar o salvamento e voltar à aba da fase para clicar em Próxima parte. No jogo pronto saem os dois parágrafos da demonstração do narrador ("Olha aqui:" e "Olha só:"). O índice diz por que nomes, tamanhos e animações precisam combinar com os blocos e como enviar pela galeria, com "clique em".

A geração aguarda as fontes e confere imagens, cores, limites e erros de execução do jogo antes de substituir a saída. A revisão de 05/10/2026 produziu 28 páginas e 15 representações de blocos; a de vocabulário de 06/10/2026 manteve os mesmos números, e a de falas do mesmo dia passou a 32 páginas, com os mesmos 15 blocos. A revisão visual de todas as páginas continua necessária após mudanças. Anexar apenas esse PDF a `materiais-caderno`, seção 2 da aula 1; o gerador não hospeda nem publica o arquivo.
