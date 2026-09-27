# Review do jogo de abertura — Cadê Todo Mundo?

Escopo: bloco jogável introduzido em `b513ef74`, sua integração com aula/admin/API, o projeto pronto e os ajustes de roteiro e manifesto da Aula 1. Revisão de 26/09/2026. Não é uma auditoria completa da plataforma.

## Correções

- A busca agora acontece somente no cenário, igual ao jogo construído no curso. Removidos os três botões que revelavam esconderijos, a instrução sobre esses botões e o contador duplicado fora do jogo. Roteiro, gerador, manifesto e direcionamentos foram alinhados.
- A moldura oferece Ampliar/Voltar à aula e Jogar de novo. Reiniciar limpa a partida; uma conclusão já conquistada permanece salva. Partidas incompletas não acumulam achados entre reinícios. Ampliar não remonta o jogador.
- O DTO da API não reconhecia `project-play`, embora o domínio aceitasse o manifesto. Rascunho e publicação recusavam o bloco. O contrato agora preserva projeto, recursos embutidos, palco e alvos, inclusive numa rota tipada.
- O domínio aceitava pergunta anexa, mas a conclusão do jogo a ignorava. O jogo pronto não admite pergunta anexa nem palpite; o admin não oferece a opção incompatível.
- Os controles de ampliar/voltar ficavam dentro de um formulário desabilitado durante o salvamento. Agora continuam disponíveis enquanto a conclusão é registrada.
- O ampliado usa gestão de foco e scroll do modal compartilhado, torna o restante da aula inerte e recebe Escape do iframe autenticado pela janela de origem.

## Evidências

- Regressões reproduzidas antes dos ajustes: rejeição no rascunho/publicação; pergunta ignorada; renderização dos botões extras. Os testes correspondentes passaram depois.
- Core: 883 testes; member-shell: 956; contrato HTTP e materiais do curso: 53; jogador e ponte de entrada do Estúdio: 31; editor/importação: 16; prévia e integração com salvamento pendente: 3. Nenhuma falha nas execuções com a configuração de cada pacote.
- Os 34 manifestos passaram no validador, sem avisos. Biome e checagem de diferenças sem erros.
- Checagens de TypeScript passaram em core, members, member-shell, Estúdio, admin e community-kids.
- Navegador real com o componente, o projeto do manifesto e o CSS kids: clique diretamente no canvas, contagem real, reinício para zero sem perder a conclusão, retomada, ampliar sem recriar iframe, Escape dentro do jogo e ausência de foco nos controles encobertos. Conferidos celular vertical, horizontal e desktop, sem transbordamento horizontal.

Uma primeira execução das suítes a partir da raiz não carregou o `setup-env` do member-shell e teve falhas de configuração. A repetição no diretório correto passou integralmente; não foram feitas alterações para contornar esses testes.

Limites: o teste visual usou uma página local de diagnóstico com o componente real, não uma conta de aluno conectada ao banco. Rascunho/publicação foram exercitados pelos validadores reais e por uma rota tipada local. Não houve publicação de aula, push ou deploy.
