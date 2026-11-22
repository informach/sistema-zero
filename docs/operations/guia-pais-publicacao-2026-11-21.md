# Página do guia gratuito para pais — produção

Página publicada: <https://sistemazero.com.br/kids/vilao-em-aliado>.
A alteração já estava na staging (`7a780dbc0`). Sua cópia isolada para produção
(`1d2c3e529`) foi retomada no [PR 280](https://github.com/informach/sistema-zero/pull/280),
mesclado em `a16fcb91d597c38904894c0e6ee5fc1e9bdeef8d` após o
[CI completo aprovado](https://github.com/informach/sistema-zero/actions/runs/44954841479)
e o plano de configuração aprovado (`44954841396`).

O workflow de produção `44959130739` qualificou fonte, CI e plano, mas recusou o
deployment anterior do Funnel: ele era um upload manual sem `meta.commitHash`.
Esse run não deve ser registrado como implantação concluída ou verde.

Foi usado o procedimento operacional de recuperação de fonte versionada já aplicado
no projeto. Ele preservou a aprovação do PR/CI, conferiu a configuração real sem
alterações, os triggers nativos desativados, o inventário sem operações concorrentes
e o ID da versão anterior. Disparou uma única implantação do **Funnel**, vinculada
ao SHA exato da main. Não foi atribuído um SHA fictício ao upload antigo.

| Evidência | Resultado |
| --- | --- |
| Novo deployment | `90e22e7a-d330-48a7-afdc-c2f40e5f6a23`, `SUCCESS`, SHA `a16fcb91d597c38904894c0e6ee5fc1e9bdeef8d` |
| Deployment anterior | `27ff426b-6b93-4552-9771-7866428ae5b6`, `REMOVED` |
| Inventário ativo | Apenas o novo deployment, com o SHA aprovado |
| Página pública | HTTP 200, título com “guia gratuito para pais” |
| Cadastro | Botão “Liberar o meu guia” presente; sem “Em breve” ou “Inscrições fechadas” |

Os journals operacionais locais estão em `.cache/molda-review/guia-recovery-*` e
`.cache/molda-review/guia-production-http.json`; não contêm chaves ou dados de alunos.

## Fluxo padrão de produção

O Funnel agora tem origem Git verificável. O Members de produção também possui um
upload manual sem SHA (`822b89bd-1a5d-44b9-a06e-d0ab7492c045`), que continua incompatível
com o preflight canônico atual. A página foi entregue sem publicar backends de produção.
Foi solicitada definição de escopo para incluir a recuperação de Members/Auth enquanto
a implantação normal de staging é acompanhada. Isso não é um relaxamento dos gates
de produção nem uma alegação de que o workflow de produção já foi regularizado.
