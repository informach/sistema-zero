# Fechamento das fixtures nativas do runtime

O ensaio completo com `SZ_CHECK_CHROMIUM` apontando para o Chrome desta máquina
executou 450 testes: **447 aprovados, três falhas e zero omissões**, em
2.163,87 segundos. A execução anterior, sem essa variável, tinha omitido 53
casos de navegador e encontrado uma dependência local desatualizada. O install
congelado de `runtime/package-lock.json` corrigiu a instalação local, mantendo
os arquivos de dependências e os motores intactos.

As três falhas nativas estavam nas próprias fixtures:

- O observador copiava uma lista incompleta dos módulos que importa. Foram
  acrescentados `check-approach-3d.mjs` e `check-models-ready.mjs` à cópia
  temporária; o conteúdo desses módulos não foi alterado.
- O jardim das Nuvens e a mira do Recife agora são `desafio-do-dia`. As
  mutações negativas ainda escolhiam o cenário básico pelo tipo antigo
  `quadro-das-cores` e acabavam aplicando uma mutação de outro desafio.
  A seleção passa a usar o slug estável de cada cenário básico.

Nenhuma regra de aceitação, caso negativo, comparação, espera ou limite foi
removido. A repetição dos três arquivos terminou com **três aprovados, zero
falhas e zero omissões**, 283 asserções, em 384 segundos. O typecheck do runtime,
incluindo seu projeto de testes, passou. O Biome dos três arquivos passou.

Os resumos são extraídos dos logs; a primeira execução com três falhas não é
apresentada como verde. Os 447 casos anteriores e os três repetidos cobrem os
450 casos, com código de execução idêntico. As únicas mudanças de runtime
estão nesses três arquivos de teste. Não houve mudança em `runtime/`, `src/`,
Studio ou core entre a base `87261f880` e esta correção.

Essa é uma prova de Node/Chrome no Windows. A imagem Linux qualificada em
`44618103153`, o Worker de staging e os ensaios de publicação são evidências
separadas; o teste local não qualifica o SDK da Cloudflare nem encerra o
rollout autenticado do Pinta.
