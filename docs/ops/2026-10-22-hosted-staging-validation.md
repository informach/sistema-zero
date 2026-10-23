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

## Nova imagem `1f71cd1f4`

O CI de push e o de PR passaram nos nove checks. O deploy de staging concluiu
Admin, comunidade adulta e Kids; a leitura posterior confirmou SHA correto,
ativo único, nenhum deployment pendente e predecessores retirados nos três.
Após recarregar o documento inteiro, os três cabeçalhos públicos permitiram o
frame Python configurado.

| Fluxo na nova imagem | Resultado e limite | Recibo |
| --- | --- | --- |
| Pac-Man Python clássico | Blocos reconstruídos, código correspondente na Ponte e execução pelos dois modos. Labirinto, personagens, avanço do placar e pausa vistos. Stop encerrou a prévia. Isso não qualifica todas as regras nem áudio ouvido. | `hosted-staging-python-js-smoke-r1.json.snapshot` |
| Pac-Man publicado | Publicação e capa pela interface, cartão no Mural e jogador público sem login. Placar avançou, pausa apareceu e reinício voltou a zero pontos/três vidas; nenhum erro de console. | `hosted-staging-python-public-r1.json.snapshot` |
| Space Arena publicado | Exemplo em blocos aberto e publicado pela interface. Jogador público mostrou abertura, nave, arena, drones, radar, início com S, pausa com P e troca de câmera com C. Propulsão, tiro, áudio ouvido e todos os cenários continuam sem qualificação hospedada. | `hosted-staging-space-arena-public-r1.json.snapshot` |
| Remix Python | O Mural criou uma cópia, que reabriu com blocos Python, Ponte e `main.py`. O recibo não qualifica uma partida completa do remix. | `hosted-staging-python-mural-remix-r1.json.snapshot` |
| Pinta no Python Pro | Desenho próprio de 16 × 16 importado pela biblioteca e renderizado pelo Turtle. ZIP baixado pela interface contém fonte, PNG e instruções Python 3.14.2; o adaptador gráfico do navegador não acompanha o ZIP. Execução nativa desse ZIP ainda não observada. | `hosted-staging-python-pro-pinta-export-r1.json.snapshot` |
| JavaScript com aluno real | Jogo existente abriu na imagem nova; Enter iniciou a partida e a nave, asteroides e placar foram vistos. Stop funcionou, sem edição intencional da fonte nem erros de console. | `hosted-staging-python-js-smoke-r1.json.snapshot` |

As imagens de tela foram inspecionadas na ferramenta, sem arquivo raster
versionado. O primeiro smoke do Space Arena conserva a captura incompleta no
editor; a prova posterior do jogador público é separada. O suporte oficial a
PNG em `register_shape` existe no [Python 3.14](https://docs.python.org/3.14/library/turtle.html#turtle.register_shape),
versão exigida pelo pacote exportado. Python 3.12 local não qualifica esse alvo.

A análise remota do Pro retornou `409 SESSION_CHANGED`: os hosts Kids não
estavam fornecendo `sessionFetch` à porta de análise. O reparo e sua validação
estão descritos em [sessão da análise Python](2026-10-23-python-analysis-session.md).
O recebimento desse erro não foi contado como análise funcional.

A rota direta de reconciliação passou em staging, mas a primeira observação
agendada foi negativa. A nova observação diagnóstica também não qualificou o
agendamento; os resultados e a limpeza são preservados separadamente. Não há
qualificação global de ledger ou de reconciliação agendada.

Continuam abertos a análise hospedada após o reparo, a integração positiva de
oficina/conquistas e os gates de produção. O resultado negativo anterior de
desempenho F1 também permanece aberto.

## Continuação de 23/10

O commit `bf33cbef621865f264561f689111e01bbcdc8fe0` passou nos nove checks
do CI de push 39894706573 e no CI de PR 39894722743. O deploy automático
começou; isso ainda não prova imagem ativa nem a análise hospedada reparada.

Um curso próprio de QA foi criado pela interface em staging, como curso extra
em rascunho, sem posição na jornada, matrícula ou ferramentas concedidas.
A aula permitiu escolher Python e Código Pro, instalar Turtle e editar a
fonte pelo editor. A execução criou o frame/canvas com título próprio.
Depois de voltar ao percurso e recarregar a página, ambiente, modo Pro e
fonte foram preservados. Stop e retorno ao percurso deixaram zero iframes.
A captura raster dessa aula ficou incompleta e não qualifica seu desenho
visualmente. Os cursos existentes não foram editados.

O ZIP de Pinta/Pro baixado na rodada anterior foi executado com o CPython
3.14.2 e o módulo oficial `Lib/turtle.py`, usando Tk 8.6.15. A fonte e o PNG
permaneceram byte a byte iguais. O observador delegou a criação da tela,
ocultou a janela e agendou inspeção/encerramento: `register_shape` carregou
16×16 pixels, o primeiro RGB coincidiu com o PNG exportado e a tartaruga usou
essa imagem; `mainloop` retornou depois de `bye`. Isso prova execução nativa
desse exemplo, sem adaptação gráfica do navegador. Não qualifica interação
visual manual no desktop nem todos os jogos exportados. O primeiro oráculo
supunha outro tom de vermelho e foi corrigido para derivar a cor do PNG;
o negativo original continua preservado.

A causa da falha agendada e a correção do transporte estão em
[runtime do cron](2026-10-23-cron-native-runtime.md). A repetição hospedada
após implantação continua necessária.

### Nova leitura e repetição no Kids

Às 04:34 UTC, o Kids já tinha ativo único `bf33cbef6`, digest
`sha256:99d51efd88ac3e8b954918e481d17f11d681ad970b38a7a0703ededea221afe5`,
sem pendências e com o predecessor retirado. Admin e comunidade adulta ainda
estavam em build; essa leitura não conclui o rollout completo.

Após recarregar o documento e reabrir o projeto próprio Python Pro/Pinta,
criação, início e chamadas de análise responderam 200 com `x-sz-session`
presente, sem `SESSION_CHANGED`. `projectDiagnostics` respondeu 200 antes
e depois da ação Formatar documento. A execução apresentou o canvas Turtle
com título próprio; Stop retirou o iframe. Fonte formatada e estado salvo
foram vistos. Nenhum cookie, valor do cabeçalho ou handshake foi versionado.

A observação agendada posterior do Worker também passou, com contagens
canônicas zero e limpeza local/remota confirmada, conforme o documento do
cron. Esses positivos posteriores não alteram os recibos negativos anteriores.
Oficina/conquistas e promoção em produção continuam sem qualificação final.

### Conclusão posterior da rodada

Às 04:41:27 UTC, Admin, comunidade adulta e Kids tinham imagem ativa única
`bf33cbef6`, sem deployments pendentes e com os predecessores retirados.
A análise da aula gravada própria no Admin respondeu 200 em criação, início
e `projectDiagnostics`; essa fronteira usa a sessão administrativa e não exige
o cabeçalho Kids. Formatar, executar Turtle e Stop funcionaram; retorno ao
percurso deixou zero iframes. O desenho da aula não recebeu qualificação raster.

A prova de [conclusão de oficina e conquistas Python](2026-10-23-workshop-python-earned-blocks.md)
passou posteriormente com aluno real. Ela substitui a pendência de concessão
real acima, sem transformar a rodada em qualificação de transmissão ao vivo.
Os gates de promoção em produção permanecem separados.
