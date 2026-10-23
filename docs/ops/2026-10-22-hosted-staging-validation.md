# Validação hospedada parcial de staging

As observações abaixo foram feitas em 22 de outubro, com recibos concluídos
em 23 de outubro UTC. Elas não constituem homologação completa do Python nem
autorizam tratar produção como implantada. Os recibos sanitizados estão em
[evidências versionadas](../continuity/2026-10-22-python-reference-games-visual-evidence/).
Não contêm credenciais, cookies ou URLs assinadas.

| Fluxo observado | Resultado e limite | Recibo |
| --- | --- | --- |
| JavaScript publicado pela conta de teste de staff | Publicação pelo Estúdio, cartão no Mural, jogador anônimo renderizado, Enter iniciou o jogo e remix abriu a Ponte. Vitória e áudio não foram qualificados. | `hosted-staging-javascript-public-r2.json.snapshot` |
| JavaScript com aluno real | Acesso conquistado preservado; nenhum exemplo, opção Python ou Pro oferecido. Novo projeto, instalação de Jogo 2D, paleta conquistada, abertura de jogo existente e execução pelo teclado observados. Fonte do projeto existente não foi alterada intencionalmente. | `hosted-staging-student-javascript-r1.json.snapshot` |
| Aula gravada com aluno real | Navegação entre partes e Estúdio JavaScript com paleta e painel de objetivos. Nenhuma verificação, submissão ou conclusão solicitada. Download de rascunho retornou `CREATION_NOT_FOUND`/404, tratado pelo adapter como ausente; retenção de rascunho histórico continua sem qualificação. | `hosted-staging-student-lesson-readonly-r1.json.snapshot` |
| Cadastro de oficina no Admin | Seletor JavaScript/Python e ferramentas Python carregaram no formulário não salvo, com explicações de dependências, conquistas e acesso ao produto. Formulário cancelado; nenhum curso criado. Execução ao vivo e concessão real continuam pendentes. | `hosted-staging-workshop-admin-readonly-r1.json.snapshot` |
| Quiz e oferta adulta públicos | Dez perguntas e pergunta condicional, resultado, oferta e abertura/cancelamento do pré-checkout. O app criou lead anônimo e salvou respostas; nenhum nome, email, telefone, pagamento ou compra foi informado. Não qualifica fulfillment. | `hosted-staging-adult-quiz-offer-r1.json.snapshot` |
| Seed do Mural adulto | Uma aplicação criou somente o espaço e seu canal canônicos ausentes. Status posterior confirmou ambos; configurações dos dois espaços Kids permaneceram idênticas, preservando alterações administrativas existentes. Definição do Clube adulto e experiência autenticada continuam pendentes. | `staging-hub-mural-seed-r1.json.snapshot` |

Os recortes do Estúdio acima usaram as imagens de `bc2f154d4`; não são prova
das imagens com a [correção de CSP](2026-10-22-next-runtime-csp-build.md).
Após a nova implantação, recarregar o documento inteiro e conferir o cabeçalho
recebido, analisador e execução Python, Stop e regressão JavaScript. A navegação
do cliente não substitui esse recarregamento.

## Correções nas fixtures que bloqueavam o CI

O CI de `d291905af` detectou uma fixture Pensa que abria Python sem perfil e
sem ambiente de teste autorizado. `582fba116` passou a usar o ambiente inerte
canônico e a fronteira de aquisição de runtime simulada; a recusa do Pensa
e os controles JavaScript foram preservados.

Os dois CIs de `582fba116` passaram em oito checks, mas falharam na tipagem
por dois objetos `InstalledExtension` incompletos na fixture de abertura de
projetos. Faltava `installedAt`, obrigatório no tipo e no schema canônico.
O ajuste acrescenta `installedAt: 1` aos dois objetos, sem alterar o schema,
o código de produto ou as asserções. O deploy foi pulado nesses runs; nenhum
novo deployment dessas revisões foi considerado concluído.

Na revisão local do ajuste, a fixture real de abertura passou com 14 testes e
160 asserções. A tipagem completa de `packages/member-shell` passou com Node
24.22.0/TypeScript 5.9.3, `--noEmit --incremental false` e heap de 3072 MiB.
A nova revisão ainda precisa do CI e da implantação antes da prova hospedada.

Permanecem abertos os fluxos Python hospedados, a reconciliação agendada,
a integração positiva de oficina/conquistas e os gates de produção. O resultado
negativo anterior de desempenho F1 também permanece aberto.
