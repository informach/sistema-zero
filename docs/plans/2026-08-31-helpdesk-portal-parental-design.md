# Portal de atendimento e acesso parental

## Objetivo

Disponibilizar o Helpdesk para clientes na Community e para responsáveis na
Community Kids, sem permitir que uma sessão de perfil infantil visualize,
crie ou responda chamados.

## Decisão

- A Community adulta ganha a rota autenticada `/ajuda` e o item **Ajuda** na
  navegação principal.
- A Community Kids ganha um card **Atendimento** somente no painel da Área dos
  Pais. O card abre `/responsavel/ajuda`, uma área fora do layout infantil.
- A área infantil exige sessão de conta e o parent gate já existente, incluindo
  a confirmação de senha com validade de 15 minutos. Uma sessão de perfil é
  recusada tanto na página quanto nas rotas BFF.

## Arquitetura

```text
Community / Community Kids (browser)
  -> /api/helpdesk/portal/* (BFF same-origin, cookies HttpOnly)
  -> API Gateway (JWT + principal + limites)
  -> Helpdesk /helpdesk/portal/*
  -> banco de tickets e mensagens
```

Cada aplicativo mantém handlers BFF próprios. Eles utilizam o gateway do
`member-shell`; o browser nunca recebe o token de acesso. Na Community Kids,
os handlers chamam `requireParentGateAccountOnly` antes de encaminhar qualquer
requisição. Não haverá link para atendimento na navegação de perfis infantis e
nenhuma integração por redirecionamento para a Community adulta.

## Experiência do cliente

As duas áreas terão a mesma capacidade, adaptada ao contexto visual do app:

1. Listar chamados do titular da conta, com status, assunto, última atualização
   e número de mensagens.
2. Abrir um chamado com assunto, categoria e primeira mensagem.
3. Consultar detalhes e responder em uma conversa existente.
4. Exibir somente mensagens visíveis ao cliente; notas internas continuam
   restritas ao time de suporte.
5. Uma nova mensagem do cliente reabre automaticamente um chamado que aguarda
   retorno dele. A primeira resposta da equipe enviada por e-mail vincula o
   thread do Gmail ao chamado originado no portal.

## Segurança e limites

- Posse é sempre conferida pelo Helpdesk por `requesterAccountId` e, somente
  para tickets legados, pelo e-mail normalizado do titular.
- O gateway limita leitura e escrita por principal; os BFFs preservam a origem,
  a sessão HttpOnly e as proteções anti-CSRF existentes.
- A rota infantil não deve ser incluída nos matchers, layouts ou componentes da
  navegação de crianças. Seu guard é feito no servidor, não apenas na UI.

## Alternativas avaliadas

- Modal dentro da Área dos Pais: mais curto, mas ruim para histórico, links e
  continuidade de conversas.
- Redirecionar para a Community adulta: cria acoplamento de cookies/sessão e
  confunde o fluxo do responsável.

Ambas foram descartadas em favor de uma página parental dedicada.
