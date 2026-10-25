# Conciliação da promoção Python e correções do CI

Base integrada: `f69d1fd2380d0e8bbeaab465ea8113e20a7021d9`.

O rollout de staging havia atualizado o Worker, mas o Members permaneceu no catálogo
anterior porque o JSON excedeu o limite de variável do Railway. O promotor agora admite
essa diferença de estado apenas na entrada, para retirar a mesma release imutável nas duas
autoridades ao promover outra do mesmo perfil. A saída continua estritamente coerente.
Revogação, outro perfil, repetição da identidade divergente e conteúdo diferente não recebem
essa permissão. Os testes também recusam uma saída ainda divergente quando o destino já
está retirado.

O catálogo empacotado `2747a0372378b1bf6768796e11b9b261625aa6a5cebac0bfff6c18778fffff5f`
é igual à política dos dois planos Pygame R1 e contém a release nova
`2026-10-25-pygame-1`. Preparação não é ativação.

## Geradores e análise estática

O CI da base falhou em formatação dos geradores/arquivos gerados e em callbacks dos geradores
de arte. A função que desenha uma ação com ferramenta foi renomeada para não se apresentar
como hook React. Os callbacks de `forEach` passaram a ter retorno vazio.

Comparação da saída completa dos geradores antes/depois: 143 desenhos idênticos, nos conjuntos
Pirate Maker (17), Platformer (10), Pydew Valley (13), Python Monsters (66) e Super Pirate
World (37). Os geradores TypeScript agora formatam sua saída com o Biome fixado no projeto,
inclusive nos comandos `--check`, sem editar os valores exportados. Arquivos grandes recebem
um limite explícito compatível com os bytes de entrada, e saída vazia é recusada.

Os documentos `pygame/*/desenhos.pinta.json` conservam a serialização própria do exportador
Pinta: o gerador e o CI verificam seus bytes. Só a formatação desses documentos está fora do
Biome; o parser e as demais verificações continuam ativos. Não se altera o exportador usado
pelo produto para atender a uma preferência de formatação do repositório.

## Evidências e limites

- Promoção e carregador: 54 testes, 308 asserções, nenhuma falha antes da formatação final
  do catálogo; o carregador foi conferido novamente sobre o catálogo empacotado final.
- Análise estática completa local: 11.779 arquivos, zero erros.
- `generate-pygame-games.ts --check`: nove jogos conferidos.
- `pinta/scripts/pygame-gallery/generate.ts --check`: todos os conjuntos conferidos, sem
  imagens ou documentos desatualizados.
- A prova complementar `pygame-block-coverage.ts --check` não foi concluída nesta máquina:
  o Python 3.14 não está instalado; a tentativa explícita com 3.12 também não produziu a
  árvore exigida pelo analisador. Isso não é uma prova positiva de blocos ou de execução.

Os testes do CI, o rollout do Worker/Members, as provas hospedadas e a validação pelas contas
reais permanecem gates separados. Estes resultados não representam aceite integral nem
qualificação de desempenho.
