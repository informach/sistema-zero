# Implementação de convites e campanhas

Data: 02/10/2026. Proposta aprovada na conversa. **Código e páginas implementados e revisados localmente. Migração gerada e validada com PostgreSQL local; ensaio visual e cadastro integrado em staging ainda pendentes.** Ver [revisão da implementação](revisao-implementacao.md).

**Objetivo:** cadastrar campanhas institucionais e embaixadores separadamente, entregar o mesmo presente com regras consistentes e apresentar páginas completas na identidade das ofertas.

**Especificação:** [proposta aprovada](proposta-embaixadores-e-campanhas.md), [copy e provas](direcao-copy-e-provas.md).

**Arquitetura:** evolução do serviço referrals e de seus contratos no gateway. Campanhas têm código próprio e janela de resgate; cada resgate preserva sete dias de acesso. Admin administra as campanhas; funil apresenta e resgata; Área dos pais inscreve embaixadores. Dados privados não entram no link público.

**Execução:** skills writing-plans e executing-plans, com revisão e verificação por etapa. Autorização já concedida para implementar; não exige nova aprovação entre etapas locais.

## Restrições confirmadas

- Faixa etária comunicada: **9 a 14 anos**, igual às ofertas, por decisão de 03/10/2026. Vale para hero, perguntas e convites de WhatsApp/e-mail; substitui a faixa usada na análise inicial.
- Sete dias de curso a partir do cadastro; encerramento da campanha afeta somente novos resgates.
- **Atualização de 03/10:** o presente também libera publicar o jogo do curso, comentar e reagir no Mural durante esses sete dias. Depois permanece a visita; o link do jogo não vence com a matrícula. Implementação, testes e atualização dos convites antigos em [Mural durante os sete dias](mural-sete-dias.md).
- Links de evento podem ser encaminhados, sem validação de presença.
- Usar os prints atuais nesta versão, com legendas que explicam os direitos do presente; registrar substituições futuras.
- Campanha institucional não gera bônus Pix.
- Preservar alterações existentes e direitos históricos. Não publicar, disparar convites ou executar migrações remotas como consequência desta implementação local.
- Limites de quantidade são opcionais na proposta e ficam fora desta primeira versão, sem escassez artificial.

## Etapas e contratos

- [x] **1. Campanhas e resgate no referrals.** Domínio/porta/serviço/repositório/rotas de campanhas; tabela `campaigns`, associação em `codes` e snapshot de origem no resgate. Migração `0004_material_hellion` gerada pelo Drizzle e aplicada no banco local de testes. Estados públicos derivados de status e datas, revalidados na aceitação transacional. Testes incluem concorrência, retomada, origem preservada e campanha sem bônus.
- [x] **2. Gestão no admin e gateway.** Código de listar/criar/editar/duplicar/consultar campanha, histórico e resultados. Datas de Brasília, link, prévia e QR Code. Mantidos os guards do gateway e serviço. A operação com banco depende da etapa 1.
- [x] **3. Páginas do funil.** `/bolsa/[codigo]`, `/embaixador/[token]` e `/kids/embaixadores` compartilham experiência, prints ampliáveis e estilo das ofertas. Inscrição permanece na Área dos pais. Prévia sem cadastro em `/bolsa/previa`.
- [x] **4. Confirmação e mensagens.** Resgate retorna vencimento e aceitação do e-mail, sem credenciais. Há links de entrada/recuperação e templates próprios para campanhas. A adesão do embaixador também informa falha de envio sem perder o painel.
- [x] **5. Relatório inicial e atribuição.** UTM sanitizada, origem e política preservadas; resgates e conversões institucionais separados dos bônus. Ficha da conta permite consultar o progresso dos perfis. Indicadores ainda não consolidados estão nomeados no admin, conforme limites abaixo.
- [ ] **6. Verificação e documentação.** Testes comportamentais, typechecks, lint e build do funil executados; resultados na revisão. Pendente: inspeção visual desktop/mobile e cadastro integrado de staging. A conexão com o navegador expirou nas tentativas locais.

## Casos de aceitação

```text
campanha.start <= instante do novo cadastro < campanha.end -> pode aceitar
campanha.end <= instante do novo cadastro -> encerrada
resgate aceito antes do fim + retry depois do fim -> retoma a política aceita
mesmo e-mail + outro código -> conserva origem e vencimento anteriores
campanha + assinatura elegível -> conversão registrada, bônus = 0
e-mail falha depois de grant -> acesso disponível, mensagem sem afirmar envio
```

Estados públicos previstos: `active`, `scheduled`, `paused`, `ended`, além de indisponibilidade do curso. `draft` é acessível apenas na prévia administrativa. A navegação pública não concede acesso enquanto a política não permitir.

## Comandos de verificação

Dentro de `packages/referrals`: `bun run db:generate`, `bun run typecheck`, `bun test`, `bun run check`. Testes com banco seguem configuração local do pacote, sem apontar para banco remoto.

Dentro de `packages/funnel`: `bun run typecheck`, `bun test`, `bun run check`, `bun run build`.

Dentro de admin, community-kids, messaging e api-gateway: executar os scripts correspondentes e os testes dos contratos alterados. Reportar falhas preexistentes separadamente, sem marcar teste não executado como aprovado.

## Capturas a substituir posteriormente

- Mural durante o presente, publicação ensinada na aula 2 e modo visitante após o prazo.
- Projeto inicial do Cadê Todo Mundo, quando diferir do enquadramento disponível.
- Novo painel do embaixador, confirmação de cadastro e acesso do convidado.

As imagens atuais permanecem visíveis conforme autorização do usuário. Legendas e texto explicam o escopo gratuito; não afirmar que os controles de assinatura vistos nos prints fazem parte do presente.

## O que foi entregue em código

| Superfície | Caminho | Comportamento |
| --- | --- | --- |
| Gestão | `/admin/embaixadores` | Campanhas como aba inicial; pessoas e bônus em outra aba. Nome interno, título público, apresentação, tipo, código, canal, início/fim e estado. |
| Prévia | `/bolsa/previa` | Exibe a apresentação sem formulário e sem criar acesso. O admin passa somente texto e datas públicos. |
| Convidado | `/bolsa/[codigo]` | Contexto pessoal ou institucional, experiência concreta, prints, condições e perguntas práticas. Estados agendado, pausado, encerrado e curso em preparação. |
| Programa | `/kids/embaixadores` | Apresentação completa para responsáveis; inscrição pelo app Kids. |
| Painel privado | `/embaixador/[token]` | Link público, mensagem editável, WhatsApp manual, convite por e-mail, acompanhamento e chave Pix no topo; argumentos e perguntas abaixo. |
| Área dos pais | `/perfis?manage=1#embaixador` | Adesão existente preservada, com link para conhecer o programa. |

O contrato de campanhas vive em `@sistemazero/core/referrals`. O referrals mantém o banco e a política; o admin e o funil usam o gateway. O QR é gerado localmente pelo helper compartilhado do member-shell, a partir do link público confirmado pelo serviço; nenhum gerador externo recebe o endereço.

`startsAt <= aceitação < endsAt` é revalidado no repositório, sob lock da campanha. O mesmo lock protege a edição administrativa. Conta, grants e mensagens ficam fora da transação. O cadastro preserva título/contexto público, curso, origem de mídia, prazo e política de Mural. Retomar o cadastro conserva esses valores, mesmo após alteração da campanha.

Campanhas usam conversão `unrewarded`, com bônus zero. Um estorno cancela essa conversão. Cobranças anteriores ao cadastro e renovações de assinaturas iniciadas antes dele são ignoradas; renovação não cria uma segunda conversão vigente. A data original da assinatura vem de uma leitura interna autenticada no Payments; falha nessa confirmação pede reentrega do webhook. A conferência de estorno após o INSERT também é retomável. O relatório inicial contabiliza compras elegíveis atribuídas, não prova causalidade de anúncio nem calcula retorno sobre investimento.

O código `previa` é reservado. Duplicar exige novo código e cria histórico separado; o código existente não é editável. A edição envia `expectedUpdatedAt`, conferido sob lock; uma aba antiga recebe 409 e não sobrescreve a versão atual. O encerramento não revoga acessos aceitos. Não existe validação de participantes da palestra, conforme decisão do produto.

## Escopo de medição desta versão

O admin mede resgates concluídos, em andamento, com falha e contas com conversão vigente. Mostra os últimos 200 cadastros, sua UTM quando informada, vencimento e diagnóstico operacional. A ficha da conta é o caminho para examinar progresso dos perfis.

Os eventos sugeridos na pesquisa para visitas, cliques, começo de formulário, primeira atividade e conclusão **ainda não foram consolidados por campanha**. Tampouco há taxa de conversão por visitante, coorte madura de 30 dias ou custo por ativação. Eles permanecem uma etapa de instrumentação do piloto; nenhum contador fictício ou zero sem medição foi colocado na interface. O fechamento completo dessa parte da proposta exige integração dos eventos de uso com os estados persistidos do Members e dados de gasto reais.

## Verificação inicial e revisão

- Funil: 411 testes aprovados; typecheck e build aprovados; Biome aprovado. Prévia e apresentação do programa responderam HTTP 200 localmente. Nove arquivos de screenshot distintos referenciados na prévia existem. As respostas práticas também exibem prints.
- Referrals: 115 testes de domínio/aplicação/HTTP aprovados; typecheck e Biome aprovados. Incluem proteção staff/admin, datas inválidas, início/fim, pausa, retomada por outro código, mudança da configuração do curso, vencimento, origem preservada, falha de e-mail e campanha sem Pix.
- Admin: typecheck aprovado; testes de datas de Brasília e conformance de status aprovados. Biome passou com um aviso preexistente de imagem em `lesson-editor-client.tsx`.
- Community Kids: typecheck e Biome aprovados; seis testes de superfícies dos pais aprovados.
- Messaging: typecheck e Biome aprovados; seis testes de templates e renderização aprovados. Novos templates entram pelo seed de deploy existente.
- Gateway: 27 testes de registro de rotas aprovados, incluindo leitura/escrita de campanhas pelo wildcard já protegido.
- Core: typecheck aprovado.
- Member-shell: typecheck e Biome aprovados (três observações informativas preexistentes em testes de Markdown).

**Bloqueio inicial resolvido na revisão:** o acesso ao Drizzle voltou a funcionar. `bun run db:generate` gerou `0004_material_hellion.sql`, snapshot e journal. O SQL foi revisado e aplicado pelo migrator nos testes, usando somente `localhost:5433/sistemazero_test`. As duas suítes de PostgreSQL passaram; o referrals completo terminou com **138 testes aprovados**, sem falhas. Não houve backfill de direitos nem migração remota.

A migração foi produzida pelo script do projeto, conforme a [skill de migrações](../../../../.agents/skills/drizzle-safe-migrations/SKILL.md). A revisão acrescentou proteção de edição concorrente, atribuição temporal de assinaturas, retomada da conferência de estorno, confirmação fiel do e-mail, proteção contra respostas antigas no admin e melhorias no formulário. Evidências atuais, inclusive **329 testes do Payments** e **412 do funil**, estão no [relatório de revisão](revisao-implementacao.md).

O navegador não concluiu a conexão durante esta sessão; não houve inspeção visual de desktop/mobile nem teste interativo real do QR. A verificação HTTP usou configuração temporária estritamente local, sem credenciais reais. Prévia e página do programa não apresentaram IDs de HTML duplicados nem formulário de resgate onde ele não deveria existir. O servidor temporário de verificação foi encerrado depois dos checks. O cadastro integrado com banco e envio de e-mail real não foi executado.

## Para concluir a liberação

1. Conferir no navegador desktop e celular: campanha rascunho/ativa/pausada/encerrada, prévia sem resgate, QR público, criação e retomada com e-mail de teste, painel privado, formulário e ampliação dos prints.
2. Publicar Payments com a leitura interna de data da assinatura e os templates institucionais antes de aceitar cadastros de campanha. Aplicar a migração no ambiente de destino pelo processo de deploy; coordenar os contratos de referrals, admin e funil. Uma versão antiga do Payments faz a atribuição de assinatura pedir reentrega, sem atribuir por suposição.
3. Executar o piloto e a instrumentação de uso descritos na proposta. A geração do PNG de QR foi verificada localmente; leitura por câmera real ainda faz parte do ensaio visual.

Rollback deve preservar os dados de campanhas e os snapshots já criados. Reverter somente a aplicação exige avaliar como o código anterior lida com `owner_kind=campaign` e `unrewarded`; não apagar linhas ou retirar constraints para forçar essa compatibilidade.
