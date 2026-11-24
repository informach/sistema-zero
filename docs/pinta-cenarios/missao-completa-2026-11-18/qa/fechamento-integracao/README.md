# Revisão ampliada da integração

Este lote fecha regressões encontradas depois de integrar o transporte do Estúdio
de `d8add3ca9`. Não conclui a missão nem libera o gravador de nuvem.

## Correções

O exemplo jogável da Vila, nos dois modos de Jogo 2D, agora ensina as quatro
consultas novas: seguir uma referência de objeto, encontrar uma arte e ler as
propriedades de uma camada e de uma peça. O programa gerado é executado nos dois
motores reais em teste; resolve a porta do morador e lê o atrito `0.8` existente.

A fixture conserva os dados anteriores e as imagens PNG exatas. A única adição
autoral é `ambiente: vila` no grupo Vila. A comparação canônica rejeitou uma
primeira alteração que substituía propriedades de peça; essa alteração foi
corrigida antes do commit. [Prova dos dados e PNGs](preservacao-vila.json).

Os inventários passam a 326 blocos no básico e 408 no avançado. A API do básico
continua com 316 métodos e valores. O manual foi encurtado conservando as citações
dos blocos, métodos e tooltips; o teto de 60 mil caracteres permanece.
[Tamanho e citações](manual.json).

O teste do documento ainda esperava o motor anterior de aproximadamente 11 mil
caracteres. A física de formas e plataformas precisas exige o trecho completo
qualificado no lote anterior. A diferença medida de 86.736 bytes, incluindo a
folha de 60 mil, fica abaixo de 87 mil. O caminho sem cenário continua sem esse
motor e sem os dados completos. O orçamento da galeria também passou.

## Verificação

| Checagem | Resultado |
| --- | --- |
| Runner oficial do Estúdio, `bun run test` | 11.543 aprovados, zero falhas; 866 arquivos e 162 processos isolados |
| Quatro casos condicionados ao Chromium | Reexecutados com Chrome instalado: quatro aprovados, sem omissão |
| Interface Pinta–Estúdio | 12 aprovados, incluindo criar, executar, atualizar e reabrir sem apagar o programa |
| Publicação Python | 85 aprovados; 566 asserções |
| Vila: exportação e round-trip | 26 aprovados; 5.297 asserções, no diretório do Pinta e sem omissões |
| TSC completo do Estúdio | Saída zero |
| CI global de estilo | Zero erros; 303 avisos e 245 informações preexistentes |

Os quatro casos do executor foram condicionados na suíte geral por falta do
caminho do navegador. A reexecução usa `SZ_CHECK_CHROMIUM` e prova o jogo real sob
a CSP da prévia, incluindo a tentativa de forjar resultados. São 11.547 casos
distintos do Estúdio entre as duas execuções. Casos internos dos wrappers não são
somados novamente.

O [diagnóstico inicial](diagnostico-inicial.log) é anterior às correções: sete
falhas de cobertura/inventário/manual/orçamento, dois timeouts e uma seleção de
Python indisponível. O runner canônico isolado e o Python 3.13 foram usados na
rodada final. Execuções intermediárias canceladas ou com diretório incorreto
não contam como gates.

[Resultados e hashes](verificacao.json), [fontes verificadas](fontes.json).
São provas locais nesta máquina. O ciclo autenticado, o rollout dos leitores e
do gravador e as etapas seguintes continuam no [plano](../../plano.md).
