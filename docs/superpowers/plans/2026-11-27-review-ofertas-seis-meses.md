# Revisão e promoção das ofertas de seis meses

> Execução nesta sessão, com `executing-plans`, conforme autorização da dona.

**Objetivo:** revisar `4b19c1e96` e `64b11d42c`, corrigir falhas e publicar somente esta frente.

**Arquitetura:** release a partir de `origin/main`, sem promover a staging inteira. A política
do presente deve ser congelada no resgate, como a política de uma compra. Links de pagamento
precisam continuar sendo de venda quando a mesma oferta também pode ser presente.

**Tecnologias:** Bun 1.3.11, TypeScript, Drizzle/Postgres, Elysia, Astro e Next.js.

**Especificação:** decisão da dona de 27/11/2026 e inventário no commit `36a119ef7`.

## Restrições

- Preservar slugs, IDs, preços, inclusões, assinaturas e vencimentos já concedidos.
- Cadê de presente mantém quinze dias reais e sete anunciados.
- Aguardar o SHA de staging publicado e conferido antes da aplicação em produção.
- Não criar contas, compras ou resgates de teste em produção.
- Campanha do guia muda diretamente, sem duplicação e sem apagar seus dezessete resgates.

## Correções e revisão

- [x] Criar release isolada e aplicar somente os dois commits indicados.
- [x] Reproduzir checkout que vira presente: em `origin.test.ts`, ligar a mesma oferta nas duas
  listas e exigir `links.resolve(codigo, slug, true)` com `mode: sale` e `target: checkout`.
- [x] Corrigir `referral-link.service.ts`: checkout escolhe a lista `referral`; links sem tipo e
  sem checkout mantêm a precedência histórica de presente.
- [x] Reproduzir resgate de trinta dias rotulado como um mês, e a retomada após mudança da oferta.
  Comando: `bun test tests/application/redeem.test.ts tests/application/origin.test.ts` no referrals.
- [x] Gravar `giftAccessPolicy` nullable em `scholarship_redemptions`, sem backfill inferido.
  Gerar a migration com `bun run db:generate --name redemption_gift_policy` no referrals.
  Calcular dias de calendário usando o mesmo `acceptedAt` da linha; exibir meses somente a partir
  da política gravada. Resgates anteriores continuam com os dias que receberam.
- [x] Passar a política gravada no grant manual e aceitar o campo opcional no Members. Sem campo,
  manter compatibilidade com a versão atual do Indicações. A política histórica nunca deve ser
  substituída pela duração atual do catálogo durante a retomada.
- [x] Conferir campanha de mesmo curso, links antigos, cópias, termos, prazos dos agradecimentos,
  inclusões do Mural, lembretes e seed. Corrigir cada achado com regressão observável.
- [x] Executar testes, typechecks e Biome dos pacotes alterados; validar migration em Postgres
  descartável. Fazer build do funnel. Registrar resultados e limitações.

## Entrega

- [ ] Acompanhar o CI e a publicação final de staging. Integrar as correções na staging local,
  sem interferir no trabalho ou no deploy de outra sessão.
- [ ] Abrir PR seletivo para main e aguardar checks. Confirmar dependências: se o grant ganhar
  campo novo, Members compatível precisa estar ativo antes de Indicações o enviar. Depois,
  seguir Indicações, Funil e Admin; atualizar os e-mails necessários sem disparar mensagens.
- [ ] Reler produção e aplicar pelo Admin as nove políticas e nomes; trocar campanha e lista Kids
  de presentes para a oferta principal do guia; pausar o Desafio vitalício após checar referências.
- [ ] Verificar páginas e links em navegador, catálogo e preservação da referência histórica.
  Guardar SHAs, deployments e resultado final no relatório desta entrega.
