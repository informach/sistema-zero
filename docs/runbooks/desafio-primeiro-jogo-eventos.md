# Desafio do Primeiro Jogo — operação de eventos

Este é o procedimento operacional para palestras em escolas, clínicas e eventos. A campanha usa
uma única oferta pública de **R$ 67 com 30 dias de acesso** e um **cupom de R$ 30** para os presentes,
levando o total a **R$ 37**. A oferta vitalícia histórica permanece cadastrada e não é alterada.

Antes da primeira campanha em um ambiente, execute o runbook de
[homologação, virada e rollback](desafio-primeiro-jogo-virada.md).

## Contratos que não podem ser quebrados

| Item | Contrato |
|---|---|
| Produto | `desafio-primeiro-jogo` |
| Oferta pública | `desafio-primeiro-jogo-30-dias` |
| Preço público | R$ 67 |
| Acesso | Compra única, prazo fixo de 30 dias desde a aprovação |
| Oferta histórica | `desafio-primeiro-jogo`, vitalícia, preservada fora do funil público |
| Comunidade | Assinatura mensal/anual; acesso válido prevalece sobre o fim do Desafio |

Editar preço ou prazo afeta novas compras. O pagamento guarda um snapshot da promessa aceita e as
matrículas já concedidas não são encurtadas. O prazo começa na aprovação, não no primeiro login.

## 1. Criar o cupom do evento

No painel, acesse **Catálogo → Cupons → Novo cupom** e preencha:

- código curto e exclusivo, por exemplo `ESCOLAALFA37`;
- tipo **Valor fixo** e desconto de **R$ 30,00**;
- desmarque **Todas as ofertas** e selecione somente
  `desafio-primeiro-jogo-30-dias`;
- defina início e fim coerentes com a promessa feita no palco;
- se necessário, informe o máximo de usos;
- mantenha o cupom ativo apenas durante a campanha.

Não cadastre R$ 37 como preço do cupom: o campo é o **desconto**, portanto deve receber R$ 30.
Não aplique o cupom a todas as ofertas, para não descontar a Comunidade por engano.

## 2. Montar o link e o QR Code

Use um `event_code` único por evento. Ele deve identificar o local e a data, nunca uma pessoa. Evite
acentos, espaços, e-mail, telefone, CPF ou nome de aluno. Exemplo:

```text
https://SEU-DOMINIO/kids/desafio-primeiro-jogo/oferta?coupon=ESCOLAALFA37&utm_source=escola&utm_medium=qr&utm_campaign=desafio_2026&event_code=ESCOLA_ALFA_2026_09
```

O funil preserva cupom, UTMs e código do evento ao avançar para o checkout. A atribuição é
first-touch: depois que a jornada começou, uma nova URL não sobrescreve sua origem.

Antes de imprimir ou projetar o QR Code, abra-o em janela anônima e confirme:

1. a página é a do Desafio;
2. o preço original é R$ 67;
3. o cupom é reconhecido;
4. o total fica em R$ 37;
5. a promessa diz 30 dias a partir da aprovação;
6. o código e a validade do cupom estão corretos.

## 3. Jornada do responsável e da criança

```text
QR do evento
  → página/quiz do Desafio
  → resultado e oferta com cupom preservado
  → identificação do responsável
  → checkout e pagamento
  → aprovação inicia os 30 dias
  → boas-vindas e ativação da conta
  → criação/seleção do perfil infantil
  → curso Desafio do Primeiro Jogo
  → criação e publicação do primeiro jogo
  → convite para continuar na Comunidade dos Criadores
```

O acompanhamento automático cobre os principais abandonos: 24 horas sem ativar a conta, 48 horas
com conta ativa sem começar, conclusão do Dia 1, conclusão do curso, 7 dias restantes, 3 dias
restantes e expiração. Cada mensagem é idempotente. Se o aluno já tiver outro acesso válido que
cubra o curso — em especial a Comunidade — os avisos de fim de prazo são suprimidos.

## 4. Acompanhar o evento

No painel do funil, abra **Respostas**, selecione o funil do Desafio e informe o `event_code` usado
no QR. O relatório mostra leads únicos por etapa e o número de pagamentos por preço efetivamente
cobrado, permitindo separar R$ 67 de R$ 37 sem exportar CPF.

Compare, no mínimo:

- entrada na página;
- início e conclusão do quiz;
- visualização da oferta;
- início do checkout;
- escolha do pagamento;
- pagamento aprovado;
- conta ativada, início do curso, Dia 1 e curso concluído.

## 5. Suporte e exceções

- **Estender o prazo:** no painel, abra o aluno em Membros e estenda a matrícula. A nova data gera
  uma nova régua de lembretes; uma matrícula vitalícia ou mais longa nunca é encurtada.
- **Revogar acesso:** revogue a matrícula específica. Uma assinatura válida da Comunidade pode
  continuar garantindo acesso ao mesmo curso.
- **Estornar:** primeiro estorne em Pagamentos e depois revogue em Membros. Hoje essas ações ainda
  são separadas.
- **Cupom digitado errado:** corrija o link/QR; não altere uma cobrança já criada. Se ainda não
  houve pagamento, o responsável pode iniciar um novo checkout com o link correto.
- **Encerrar o evento:** desative o cupom ou aguarde `validUntil`. Não pause a oferta pública só
  para encerrar o desconto.
- **Prorrogar o evento:** estenda a validade do cupom existente apenas se a mesma campanha continuar;
  para outro local/data, crie outro código e outro `event_code`.

## Checklist de abertura

- [ ] Oferta pública ativa, por R$ 67, com acesso fixo de 30 dias.
- [ ] Oferta vitalícia histórica preservada e fora da env do funil.
- [ ] Cupom fixo de R$ 30, ativo e restrito à oferta de 30 dias.
- [ ] Data final e limite de usos conferidos.
- [ ] QR Code contém cupom, UTMs e `event_code` sem dados pessoais.
- [ ] Jornada anônima mostra R$ 67 → R$ 37 e 30 dias.
- [ ] Pix, cartão e boleto exibem a mesma promessa comercial.
- [ ] Página de obrigado e e-mail de boas-vindas levam à plataforma Kids.
- [ ] Relatório de Respostas encontra o `event_code`.
- [ ] Responsável pelo suporte sabe estender, estornar e revogar.
