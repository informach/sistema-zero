# Farol: critérios executáveis do cenário aberto

Na conferência canônica de importação em staging, o critério independente `joga` do Pro adulto
foi recusado como `INICIAL_JA_CUMPRE_OBJETIVO`. A janela e as entradas já vinham prontas.
Nenhum desafio desta revisão defeituosa foi importado.

A correção junta o exercício de setas, espaço e clique ao objetivo de reiniciar com R.
A execução continua recusando erros; a observação final precisa comprovar o reinício criado
pela pessoa. Não se introduz um erro artificial no projeto inicial. O cenário, o gabarito,
a ficha, as recompensas e a revisão humana permanecem os mesmos.

## Prova local

- Regressão unitária: primeiro falhou porque `joga` ainda era uma conquista independente.
- Todos os autores de desafios: 224 testes, 15.101 asserções, nenhuma falha.
- Executor Pro real: 7 execuções, 16 objetivos, nenhuma divergência.
- Executor Python real: 7 execuções, 16 objetivos, nenhuma divergência.
- Ambos rodam na imagem de produção `sha256:d3ff86034ed6b5212d4bcbdc5ab2decfe527444e6459e468acc4fe40b48227b7`,
  sem rede; Python usa a distribuição publicada conferida pelo manifesto.
- Kids e adultos: gabarito aprovado, inicial saudável mas incompleto. Negativos Kids:
  ficha vazia, erro ao apertar espaço e tecla que não reinicia, todos recusados.
- Os quatro manifestos Python/Pro foram regenerados pela fábrica canônica.

Comandos: `bun test docs/desafios-do-jogo`,
`bun packages/studio-runtime/tests/desafios-pro-smoke.ts --ilha=farol` e
`bun packages/studio-runtime/tests/desafios-python-smoke.ts --ilha=farol`.
Recibos brutos locais em `.cache/edisvg-catalogue-fix/`; não contêm provas de publicação
ou de conclusão de curso. A importação remota repete a análise pelo serviço canônico.
