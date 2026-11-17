# Correção do CI necessária para fechar o lote 1

O CI de `cc227425c` (`43980464489`) terminou com código 134 na checagem de tipos do Admin. Os jobs especializados e as checagens de Members, member-shell, comunidades e Molda Cenários passaram, mas o deploy de staging foi corretamente bloqueado. A leitura completa dos logs também encontrou a mesma falta de memória no CI anterior de `413359d31`, além do erro de tipagem do teste do avatar já corrigido.

## Causa reproduzida

O comando global iniciava vários compiladores. O Admin isolado, com cache incremental, passou com limite de 4 GB, mas esse resultado não representava um checkout novo. Repetindo **sem cache**, o mesmo programa abortou ao atingir o limite de 4 GB. Sem cache, passou com 5 e 6 GB, analisando os mesmos 8.655 arquivos e 3.695.554 instanciações de tipos.

| Ensaio do Admin | Limite do Node | Resultado | Memória informada pelo TypeScript | Tempo |
|---|---:|---|---:|---:|
| Incremental | 4.096 MiB | Passou | 3.792.443 KiB | 34,94 s |
| Sem cache | 4.096 MiB | Abortou, código 134 | Limite esgotado | Cerca de 151 s |
| Sem cache | 5.120 MiB | Passou | 5.183.811 KiB | 164,78 s |
| Sem cache | 6.144 MiB | Passou | 5.546.169 KiB | 160,33 s |

[Medições](evidencias/ci/memoria-tipos.json). Os ensaios positivos sem cache usaram `bun run typecheck --incremental false --extendedDiagnostics`, com o limite indicado em `NODE_OPTIONS`. O modo incremental não foi usado para declarar corrigida a falha de checkout novo.

## Mudança

A etapa continua conferindo **todos** os pacotes, agora com `--sequential --no-exit-on-error --filter '*'` e heap de 6.144 MiB. Há um compilador por vez; uma falha continua produzindo saída diferente de zero, enquanto os demais pacotes também são conferidos. Nenhuma fonte, teste, regra de tipos ou pacote foi excluído. Não houve alteração de timeout nem liberação do deploy sem CI verde.

O orçamento dá margem ao programa medido e evita multiplicar esse consumo por processos simultâneos. O repositório é público; o [runner Linux padrão desse perfil tem 16 GB](https://docs.github.com/en/actions/reference/runners/github-hosted-runners). A [documentação do Bun](https://bun.sh/docs/pm/filter) descreve execução sequencial e continuidade após erros; a [documentação do Node](https://nodejs.org/api/cli.html#--max-old-space-sizesize-in-mib) descreve o limite do heap e a necessidade de reservar memória para o sistema.

## Verificação

O teste novo executa o **comando real do YAML** em dois workspaces temporários independentes, usando processos e um arquivo exclusivo para detectar sobreposição. Com o comando antigo, reproduziu a concorrência e falhou. Com o novo, verificou ambos sem sobreposição. Outro caso faz os dois scripts falharem: ambos são executados e o resultado continua sendo falha. Não foram usados mocks do Bun ou do compilador para afirmar que a checagem real do Admin passou; essa prova é a compilação sem cache registrada acima.

As 364 verificações de CI/release passaram (1.334 asserções), incluindo as barreiras de publicação e os dois casos novos. A correção ainda precisa passar pelo novo CI remoto e liberar a implantação antes da validação final do contrato de uploads. O lote 1 continua aberto até essa prova. Os outros lotes permanecem sem expansão.
