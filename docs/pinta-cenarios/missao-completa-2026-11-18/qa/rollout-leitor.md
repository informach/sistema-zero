# Publicação gradual do leitor

Lote A integrado à staging local por fast-forward e enviado para `origin/staging`:
`0218a11a330e8da93e70786afb3b0fe48370a562`. O worktree de publicação foi criado do lote
verificado `dba51b6e7` e integrou a staging remota `14d783d1b`, sem incluir a implementação
em andamento dos mapas ligados. Os 19 arquivos de Molda preexistentes foram conferidos
por SHA-256 antes/depois da integração e permaneceram iguais.

Verificação fresca nesse worktree, com instalação própria pelo lockfile:

- Pinta: 2.074 testes aprovados, três ensaios opcionais Pygame omitidos, nenhuma falha;
  18.976 asserções, 174 arquivos, 169,22 s. Esse comando foi `bun test src`.
- Tipos completos do Pinta e do Estúdio: código de saída zero.
- Biome: 107 arquivos do lote, nenhuma correção necessária.
- Navegador: 14 ensaios aprovados em 46 s, desktop e toque emulado; Vila, autoria de
  32 camadas, catálogo privado, animação, copiar/colar e execução Phaser.
- Perfil de validação do runtime: geração e conferência aprovadas, sem alteração do perfil.

## Estado remoto observado

O [CI do commit](https://github.com/informach/sistema-zero/actions/runs/44428296249)
recusou o lint global: 146 erros distribuídos pelo repositório. A suíte Arquipélago também
recusou a importação de `@sistemazero/core/creations` por
`molda-cenarios-core/src/compilar/fonte.ts` no teste de fronteira que admite apenas zod e
módulos internos. Esses gates impedem o job de publicação. Os apontamentos do Pinta foram
corrigidos no lote seguinte; não foram modificados os arquivos da implementação 3D.

A consulta somente de leitura ao Railway confirmou que o deployment ativo de
`community-kids`, no ambiente staging, ainda era `39870303-5da4-49e8-bea8-4d8776ea433c`,
do commit `f44648d9b2c63509f882ef8cb1ce8c66ee554c7d`, publicado em 16/11/2026.
Portanto **push não está sendo tratado como publicação bem-sucedida**.

A escrita de nuvem continua em 4 e o leitor suporta 5. A ativação da escrita 5 continua
condicionada à prova de publicação do leitor, seguida dos ensaios autenticados de clientes
antigos/novos, recusa `CREATION_CLIENT_OUTDATED` e recuperação offline. Não houve bypass
do CI, mudança de produção ou afirmação de homologação autenticada do código novo.
