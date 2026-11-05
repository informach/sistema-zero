# Campanhas com calendário e cupom opcional

**Goal:** permitir campanhas reutilizáveis para Kids/Adultos com calendário relativo, presente,
cupom e embaixador opcionais entre si, mantendo cupons avulsos no Catálogo.

**Architecture:** Referrals mantém o calendário da campanha. Catalog autoriza desconto e escopo;
cupons gerenciados consultam a política atual da campanha antes de cotar. Admin orquestra o cadastro
sem transação distribuída e sem liberar cupom incompleto. O painel do parceiro continua só leitura.

**Tech Stack:** TypeScript, Bun, Elysia, Drizzle/PostgreSQL, Next/React, Astro.

## Invariantes

- Laopa: Kids, evento 06/11/2026; presente resgatável por três dias; cupom 50% por sete dias
  inclusivos até 12/11 23h59 Brasília, oferta `desafio-primeiro-jogo-30-dias`.
- Curso comprado: 30 dias do pagamento. Comissão: 45 dias do resgate, bônus único R$30 mensal
  ou R$80 anual. Mudar a data do evento nunca reescreve direitos individuais existentes.
- Embaixador só consulta campanhas próprias publicadas; só admin cadastra/edita.
- Cupons avulsos funcionam sem Referrals. Indisponibilidade da política recusa apenas vinculados.
- Preservar edição não commitada do roteiro da aula 3 no worktree do Palco.

## Tarefas

- [ ] Core: contrato `CampaignSchedule`, cálculo puro em Brasília com validação de data real,
  início inclusivo/fim exclusivo e dias configuráveis. Testar viradas de mês/ano e limites.
- [ ] Referrals: persistir calendário aditivo via `bun run db:generate`; derivar janelas no serviço,
  preservar PATCH legado, auditar alterações, testar conflito e PostgreSQL real.
- [ ] Catalog/Referrals: contrato de cupom vinculado e política autenticada; validar público,
  desconto, oferta e estado independentemente do presente. Falhar fechado e testar fronteiras.
- [ ] Admin: calendário com prévia das datas; cadastro opcional do cupom na campanha com
  criação idempotente e recuperação após falhas; preservar editor de cupons avulsos.
- [ ] Divulgação: link autoritativo da oferta com cupom e atribuição, cartão PNG/QR separado
  do presente, no Admin e no painel de campanhas do embaixador, Kids/Adultos.
- [ ] Testes: checkout autoritativo, isolamento de público/embaixador, mudança de data,
  resgates existentes, prazos diferentes, pausar/encerrar, falha parcial e retry.
- [ ] QA visual nos dois públicos, desktop/mobile; QR decodificado e PNG baixado.
- [ ] Full review, corrigir achados, CI no mesmo HEAD e deploy staging/produção alinhados.
- [ ] Cadastrar Vivianne com envio autorizado; campanha/cupom Laopa; verificar vínculos,
  datas, preço R$33,50, acesso 30 dias e recibo do envio. Não reenviar em caso ambíguo.

## Comandos de validação

`bun test packages/core/tests/campaign-schedule.test.ts`

`bun run --cwd packages/referrals typecheck` e testes com `TEST_DATABASE_URL` descartável.

`bun run --cwd packages/catalog typecheck` e testes de cotação/cupom.

`bun run --cwd packages/admin typecheck`, testes de componentes e browser real.

`bun run --cwd packages/funnel typecheck`, build e provas do painel/checkout.

Operação e evidências privadas: `.cache/commissions-970/`; PR244.
