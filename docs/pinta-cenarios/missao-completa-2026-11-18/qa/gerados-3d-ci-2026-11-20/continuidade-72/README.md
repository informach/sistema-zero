# Continuidade após integrar o remoto

As fontes publicadas até 72e091418 alteraram novamente os três gerados já
autorizados. Regeneração pelos dois comandos oficiais, sem editar fontes
funcionais 3D. Ambos os verificadores `--check` passaram.

Core: 373 testes; motor: 262; oficina: 129; agente: 8. Estúdio: 238 testes
focados; orçamento: quatro testes. Todos sem falhas ou omissões. Chromium:
dois ensaios de prévia/exportação, três ciclos cada, aprovados em 4,5 s.
A primeira invocação do ensaio foi feita incorretamente da raiz e falhou
por caminho relativo; a repetição oficial no diretório do Estúdio passou.
Typecheck integral do Estúdio: saída 0. Biome: saída 0, 16.514 arquivos.

O CI 44724463608 do commit 3f51ba38d passou nos demais jobs, mas o job raiz
falhou em dois orçamentos do runtime 3D (65/83 caracteres acima). A correção
publicada em 72e091418 já passa nos quatro orçamentos localmente; não houve
aumento dos limites nesta correção. Isso não equivale a um CI completo verde
nem à conclusão da missão ou à homologação autenticada de staging.
