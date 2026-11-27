# Ofertas avulsas: leitura de produção em 27/11/2026

Decisão da dona: uma oferta por curso ou ferramenta avulsa, com seis meses de acesso, preservando
os slugs. O presente usa a mesma oferta sem cobrança. Exceção: os presentes do Cadê mantêm as ofertas
atuais, com quinze dias reais e sete anunciados. Assinaturas e direitos já adquiridos permanecem
com sua política. Aplicação depende de SHAs validados em staging e ok explícito da dona.

Leitura capturada em 27/11/2026, 13:54, horário de São Paulo. As consultas usaram transações PostgreSQL
protegidas como somente leitura. Foram conferidos 24 produtos, 19 ofertas, duas campanhas, onze
entradas nas listas dos embaixadores e o benefício permanente do guia. Nenhum cadastro de produção
foi alterado.

| Oferta, mantendo o slug | Preço | Produção agora | Após aprovação |
| --- | --- | --- | --- |
| `transformando-o-vilao-em-aliado-1-ano` | R$ 27,00 | 12 meses | 6 meses |
| `cade-todo-mundo-1-ano` | R$ 37,00 | 12 meses | 6 meses |
| `cade-todo-mundo-adulto-1-ano` | R$ 37,00 | 12 meses | 6 meses |
| `desafio-primeiro-jogo-30-dias` | R$ 67,00 | 30 dias | 6 meses |
| `desafio-primeiro-jogo-adulto-30-dias` | R$ 67,00 | 30 dias | 6 meses |
| `pinta` | R$ 97,00 | vitalícia | 6 meses |
| `pensa` | R$ 97,00 | vitalícia | 6 meses |
| `molda` | R$ 97,00 | vitalícia | 6 meses |
| `estudio-completo` | R$ 97,00 | vitalícia | 6 meses |

As nove ofertas acima estão ativas. A oferta da Vivianne já tem seis meses, por R$ 67. Os dois
presentes do Cadê já têm quinze dias reais e `advertisedAccessDays: 7`. As ofertas de venda e de
presente do Cadê incluem o Mural do mesmo público. Essas configurações foram conferidas no catálogo.

Pontos de atenção encontrados:

- O guia de presente usa `transformando-o-vilao-em-aliado-presente`, que **já está pausada**, custa
  R$ 0,01 no catálogo e tem quinze dias reais, sete anunciados. Pausar a oferta não a tira do fluxo
  de resgate. Ela ainda está ligada à campanha e à lista Kids de presentes dos embaixadores.
- A campanha do guia está ativa, com código `vilao-em-aliado`, **17 resgates concluídos e 17
  aquisições**. A troca para `transformando-o-vilao-em-aliado-1-ano` depende da solução do bloqueio
  com histórico que a frente de staging vai informar. Preservar os links e os registros anteriores.
- A oferta vitalícia `desafio-primeiro-jogo`, de R$ 37, está ativa. Não foi encontrada como
  principal, oferta de campanha, escopo de cupom, benefício, oferta de venda de curso ou entrada
  habilitada de embaixador. Há seis pagamentos pagos históricos e 42 registros de acesso ligados
  a ela, além de um PIX de julho ainda marcado PENDING no banco, com vencimento em 15/07/2026.
  Esse registro vencido não foi alterado. Não migrar direitos históricos ao pausar a oferta.
- Pinta, Pensa, Molda e Estúdio Completo têm suas ofertas padrão ativas, mas os produtos ainda
  estão **sem oferta principal**. Registrar esse estado para conferir o contrato das páginas dos
  SHAs recebidos; a decisão atual autoriza mudar nome e prazo, não cadastrar outra oferta.

As principais dos seis produtos de cursos já apontam para as ofertas esperadas: guia e Cadê
nos slugs de um ano, Desafio nos slugs de trinta dias, Vivianne no slug atual. As duas assinaturas
da Comunidade continuam com a mensal como principal. As quatro ofertas de assinatura ficam fora
da alteração. A oferta arquivada de No Comando da IA também foi identificada, sem uso neste corte.

A lista Kids de presentes deverá manter o Cadê de sete dias e substituir somente a entrada do
guia pela oferta principal de R$ 27. A lista adulta de presentes usa apenas o Cadê adulto de sete
dias. As listas de indicação já usam as ofertas de venda esperadas. O benefício permanente dentro
do guia aponta para `cade-todo-mundo-7-dias` e continua independente da campanha. O cupom da Laopa
aponta para `desafio-primeiro-jogo-30-dias`, não para a oferta vitalícia antiga.

Os cursos dos pais já têm a oferta de venda preenchida: guia em
`transformando-o-vilao-em-aliado-1-ano` e Vivianne em
`como-ajudar-seu-filho-autista-nas-frustracoes-1-ano`.

Foi guardada uma referência privada de 84 registros de acesso existentes, com vencimentos e hash
do snapshot, para a conferência após o corte. O checkout grava a política comprada no snapshot e
o Members persiste o vencimento da concessão. A aplicação do catálogo não deve recalcular esses
registros nem atualizar compras e resgates anteriores.

Execução preparada, ainda não autorizada:

1. Receber os SHAs e a validação de staging, incluindo a estratégia da campanha do guia.
2. Obter o ok da dona. Criar release a partir de `origin/main`, com cherry-pick apenas desta frente.
3. Publicar referrals, depois funnel e depois os apps alterados. O pacote member-shell entra nos
   builds dos apps que o incorporam, não como serviço separado.
4. Logo após o funnel, aplicar os nove ajustes pelo Admin. O Desafio tem a janela de
   indisponibilidade informada pela frente até o catálogo ficar alinhado.
5. Trocar a oferta da campanha e a entrada da lista Kids de presentes; retirar o uso da
   `-presente`. Pausar o Desafio vitalício após reler as referências. Preservar slugs, preços,
   inclusões, garantias, assinaturas e acessos existentes.
6. Conferir páginas, checkout, termos, presente do guia com seis meses, presentes do Cadê com sete
   dias divulgados e links antigos. Na revisão do código, conferir também cálculo e exibição do
   presente em meses, além da liberação da validação.

[Inventário sanitizado](producao-inventario.json) e [plano de aplicação](producao-plano.json).
Os snapshots privados e os scripts de leitura estão em `.cache/producao-ofertas-seis-meses-20261127`.
Não houve deploy, alteração de catálogo, campanha, lista ou configuração de produção nesta leitura.
