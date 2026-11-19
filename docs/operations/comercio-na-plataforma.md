# Presentes e compras dentro da plataforma

Implementação local de 19/11/2026. Os blocos e cards compartilham o mesmo fluxo autenticado nos apps Kids e adulto e utilizam os componentes, cores, tipografia e modais da plataforma.

## Blocos de aula

No editor da aula, adicione **Presente** (`gift`) ou **Compra** (`purchase`).

- **Presente:** escolha a oferta e uma campanha que conceda essa oferta. O editor também permite criar e ativar uma campanha, com nome, código e data final, vinculada à origem do curso. O bloco guarda o código; a campanha continua sendo a fonte da oferta e da disponibilidade. Assinaturas não são ofertas de bolsa.
- **Compra:** escolha a oferta. Preço, prazo, benefícios e condições são consultados no servidor. Para ofertas sem condições comerciais já registradas no funil, configure URL e versão dos termos em **Catálogo → Ofertas**.
- Título, descrição e texto do botão são opcionais. A prévia não permite ativação nem cobrança. Publique a aula pelo fluxo normal de autoria.

Esses blocos não são requisitos de avanço, entrega ou certificado. O curso que contém o bloco identifica a origem; a oferta selecionada define o acesso entregue.

O manifesto local da Aula 7 de *Transformando o vilão em aliado* foi convertido para `gift`, usando `vilao-em-aliado-cade`. Ele ainda precisa de importação/publicação após o rollout. A narração antiga que orienta abrir outro link precisa de revisão antes de gerar o áudio.

## Cards e outras páginas

Em **Catálogo → Ofertas → Card na plataforma**, habilite a apresentação, escolha compra/presente e configure título, descrição, botão e imagem. Em presentes, a campanha precisa conceder a mesma oferta.

- **Início da Área dos pais:** a apresentação é consultada automaticamente. Ofertas indisponíveis e de outro público não aparecem.
- **Somente onde eu inserir o componente:** permite colocar o card em páginas escolhidas sem aparecer automaticamente no Início.
- Sem card de compra configurado no Início, a Área dos pais usa a oferta principal de comunidade já configurada para aquele ambiente. Uma configuração explicitamente desabilitada ou manual nessa oferta é respeitada.
- Quem já tem acesso pago/manual ao produto ou assinatura correspondente é encaminhado ao gerenciamento. Presentes não impedem contratar o acesso pago nem têm seu prazo reduzido. Falhas na consulta não são interpretadas como ausência de assinatura.

Para uma página React autenticada, utilize o componente compartilhado:

```tsx
import { CommerceCard } from '@sistemazero/member-shell/components/commerce/commerce-card'

<CommerceCard
  origin={{ kind: 'promotion', offerRef: 'slug-da-oferta' }}
  mode="purchase"
  title="Continue criando"
  buttonLabel="Conhecer a oferta"
/>
```

A oferta precisa ter uma apresentação habilitada no Catálogo. A referência recebida do navegador é conferida novamente pelo BFF. Isso também permite montar novos locais de divulgação sem duplicar pagamento ou concessão.

## Conta, presentes e pagamento

A identidade vem da sessão revalidada em `/auth/me`; perfis infantis e sessões de suporte/impersonação não podem operar. O e-mail destinatário não pode ser alterado por dados de cobrança. O formulário reaproveita nome/telefone da conta e o cadastro de cobrança salvo pelo checkout autenticado, pedindo os dados necessários que faltam. É possível conferir/corrigir os dados de cobrança.

O presente usa o claim, lease e histórico existentes de Referrals. O resgate autenticado não chama `ensureBuyer`. O Cadê preserva a vaga histórica `main`; cursos para pais, outros cursos e ofertas sem curso têm escopos próprios. Outra campanha do mesmo curso não renova a bolsa. O histórico também é consultado pelo ID da conta, preservando a deduplicação quando o e-mail muda. A inspeção autenticada usa a mesma política de vagas da execução e retorna o recibo próprio sem claim, grant ou email. Um resgate pendente pode ser retomado após encerrar a campanha, conservando a data original de fim; o encerramento continua bloqueando novos resgates. Um prazo já terminado não oferece retomada.

O checkout reaproveita Pix, cartão, assinatura, webhooks e concessão do funil. Pix anual é à vista e sem renovação automática; assinatura mensal usa cartão. Parcelas são cotadas pelo SDK existente, respeitando o limite da oferta. A conta fica vinculada antes de iniciar o pagamento; a concessão só ocorre após confirmação de pagamento.

O plano financeiro persiste e comita antes da chamada externa, com corpo JSON exato, snapshot comercial, token do provedor e chave estável. Preparação e despacho são compartilhados com o checkout público; uma retomada não recota a oferta. Recarregar, fechar o modal ou retomar após resposta perdida utiliza a mesma tentativa. PAN/CVV não são enviados ao servidor. O token é removido da tentativa ao registrar o pagamento/assinatura. Uma reivindicação única de conta/produto e um lock transacional do PostgreSQL coordenam ofertas distintas, incluindo mensal/anual e origens diferentes. A criação financeira acontece depois do commit, fora do lock; funciona com pool de uma conexão. Uma segunda confirmação acompanha a operação existente, cuja origem/checkout são adotados pelo painel. Erros HTTP genéricos, timeout e erro de provedor conservam o plano. Payments informa `paymentCreation: not_started` somente quando sua borda/caso de uso comprova ausência de criação financeira; apenas essa prova, com os códigos permitidos, libera correção de dados e novo nonce. Validação de resposta não fornece a prova. Novas tentativas depois de uma cobrança registrada exigem encerramento confirmado do pagamento/assinatura anterior; leads e pagamentos anteriores permanecem no histórico.

A inspeção procura uma operação própria antes de validar disponibilidade para novas vendas. A recarga recupera status/Pix mesmo com Catálogo indisponível ou apresentação removida. Em **Área dos pais → Conta → Minhas compras** e **Adulto → Compras e assinatura**, **Compras em andamento → Acompanhar compra** é a entrada durável por ID, independente de aula/card. Ela não cria lead, cobra ou amplia acesso. Iniciar/reiniciar continua exigindo oferta e origem válidas.

## Rollout

Nenhum deploy, migration remota, importação de aula ou cobrança real foi executado nesta implementação.

1. Aplicar as migrations com o procedimento normal de cada serviço, no ambiente correto:
   - Members: `0163_commerce_blocks.sql`, acrescentando os tipos ao enum.
   - Referrals: `0012_member_gift_slots.sql`, ampliando os escopos permitidos e indexando a consulta por conta. A migration e seu snapshot foram regenerados juntos com Drizzle a partir de `0011`, antes de qualquer publicação; não reescreve resgates. Uma nova geração sem mudança de schema não produz SQL.
   - Funnel: `0021_member_commerce.sql`, `0022_member_checkout_recovery.sql` e `0023_member_checkout_plans.sql`, juntas e antes de habilitar o novo código. A segunda acrescenta a apresentação obrigatória à tabela criada pela primeira; a terceira registra o plano canônico, as origens e a reivindicação por produto. Não liberar tráfego entre elas.
2. Atualizar Catálogo, Members, Referrals e Payments antes de Funnel (a prova `not_started` é aditiva; Funil novo falha fechado quando ela falta); depois Gateway, Member-shell/comunidades e Admin.
3. Conferir oferta principal, termos e campanha em cada ambiente. Referências de campanha/oferta devem existir em staging e produção; não copiar IDs entre bancos.
4. Validar os fluxos no ambiente de homologação, inclusive webhooks e concorrência em PostgreSQL, antes de publicar blocos/cards.
5. Importar/publicar o conteúdo preparado quando a configuração estiver conferida.

São reutilizados os tokens internos, assinaturas HMAC, configuração Efí e mapeamentos de oferta do ambiente existentes. Não há nova credencial obrigatória. Os checkouts públicos continuam disponíveis para visitantes.

## Evidências locais

As suítes completas de Funnel, Referrals, Catalog e Payments passaram. Testes adicionais cobrem autoria/importação, autenticação/origem, elegibilidade, concessão após pagamento, preço/termos alterados, resposta perdida, retomada e repetição de presentes. Os números e limitações da rodada final estão no plano de implementação.

O fixture `packages/member-shell/qa/commerce-serve.ts` compila os componentes reais com o CSS dos dois apps e um backend simulado. `node packages/member-shell/qa/commerce-browser.mjs` verifica os fluxos no Chromium e salva capturas em `.cache/commerce-browser/`. Não substitui a validação dos provedores e banco em homologação.

Na rodada de correções, um PostgreSQL 17 isolado e temporário foi criado em `127.0.0.1:55439`. As cadeias completas de migrations de Funnel e Referrals foram aplicadas. O teste opt-in `member-commerce-postgres.test.ts`, com `MEMBER_COMMERCE_TEST_DATABASE_URL`, usa dois pools independentes (uma conexão por pool) para representar réplicas: confirma commit antes do envio, exclusão mensal/anual, replay JSONB byte a byte, recuperação e remoção do token após recibo. O banco temporário é descartável e não usa o `DATABASE_URL` remoto. As demais integrações que exigem serviços específicos continuam puladas quando suas próprias variáveis não estão configuradas.

Não limpe manualmente `dispatch_plan`/`pending_request` nem a reivindicação de produto para destravar um erro desconhecido. A retomada usa a chave original; sem plano canônico de uma versão antiga, a operação falha fechada e precisa de conciliação antes de outra cobrança. Esta funcionalidade ainda não foi publicada nesta rodada. Nenhuma garantia aqui substitui a validação de Efí/webhooks em homologação.
