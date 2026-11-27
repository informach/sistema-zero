# Revisão das ofertas avulsas de seis meses

Escopo recebido: `4b19c1e9620ac12814968a183cbb2f8a36d6b184` e
`64b11d42ce0c8f58f849df229a08a7220e67d0a8`. Release criada de `origin/main`
`0a8d77918c3aec8c1409afad81334a3629602e8f`, com cherry-picks `3802810b4` e `b5717b462`.
Nenhum código da oficina do Pinta que estava apenas em staging entrou nesta seleção.

## Achados corrigidos

1. **Alta, checkout abrindo presente:** quando uma oferta aparece nas listas de presente e
   indicação, o link por slug com `/pagamento` escolhia presente antes da venda. A escolha do
   checkout agora usa exclusivamente a lista de indicação. A precedência histórica do presente
   continua nos links sem tipo e sem checkout. Regressão reproduzida antes da correção.
2. **Média, unidade inferida alterava a comunicação histórica:** um presente de trinta dias era
   rotulado como um mês pela tolerância entre dias e calendário. A unidade agora vem da política
   gravada no claim. Históricos não recebem backfill nem inferência de meses.
3. **Alta, retomada usava o catálogo atual:** um resgate aceito com seis meses podia receber o
   prazo alterado no catálogo antes de o grant concluir. A política é congelada no resgate e
   enviada ao Members, que calcula o vencimento pelo `anchorAt` original. Meses são convertidos
   no repositório usando exatamente o instante de aceitação, evitando a diferença na virada do
   mês. Regressão cobre falha, mudança do catálogo e retomada; a integração do Members cobre
   agosto de 2026 até fevereiro de 2027, inclusive Mural e visita permanente.
4. **Média, lembrete prometia o prazo novo a compras antigas:** os dois templates de Desafio não
   ativado diziam seis meses para todos. Agora falam do prazo que começou na aprovação, sem
   reescrever a condição antiga. A data efetiva continua na matrícula.
5. **Baixa, nomes do seed das ferramentas:** políticas mudavam, mas os nomes continuavam
   "Oferta padrão". Os quatro nomes agora terminam em `· 6 meses`, conforme o plano do catálogo.

## Compatibilidade e ordem

A migration gerada `0016_redemption_gift_policy` acrescenta apenas uma coluna JSONB nullable,
sem default, reescrita de histórico ou backfill. O índice e os registros existentes permanecem.
Um rollback de código preserva a coluna. A aplicação antiga ignora o campo adicional.

O Members aceita `accessPolicy` opcional no grant S2S. Sem o campo, mantém o contrato anterior.
Por isso, a preparação de Members compatível vem antes do referrals novo. O controlador canônico
exige Members e Auth juntos e verifica a jornada antes dos demais serviços. Depois dessa
preparação, manter a ordem solicitada: referrals, funnel e admin. Não publicar o referrals novo
antes de o Members entender o campo. O catálogo é aplicado logo após o funnel para reduzir a
janela de indisponibilidade dos contratos do Desafio e do guia.

O seed de catálogo não atualiza ofertas já existentes. Os nove ajustes continuam sendo uma
operação explícita no Admin. Não executar seed irrestrito de mensagens para substituir apenas
dois templates: preservar as demais edições existentes e o estado ativo/inativo.

## Verificação realizada

- Antes da correção: três regressões falharam, demonstrando os achados de checkout, unidade e retomada.
- Referrals: 338 testes passaram, incluindo os 59 testes de banco, sem falhas nem skips.
- Referrals em Postgres descartável: migration aplicada, política persistida e prova da troca de
  oferta na campanha ativa com aquisição, preservando o resgate anterior.
- Members: 2448 testes passaram, 779 opcionais não executados na suíte geral. Os 46 testes
  direcionados incluem o grant por política congelada.
- Members em Postgres descartável: dez testes passaram; cadência do Desafio cobre dias e meses.
- Funnel: 767 testes passaram, seis testes de banco opcionais não executados; build passou;
  typecheck sem erros (nove sugestões do Astro).
- Navegador local com gateway falso: venda do guia em quatro larguras, presente em duas,
  cadastro e estados passaram. O mesmo slug `-1-ano` mostra seis meses na venda e no presente,
  sem exibir os dias de calendário. Nenhum cadastro de teste foi criado em produção.
- Catálogo: 171 testes passaram, catorze opcionais de banco não executados; typecheck passou.
- Admin: 1040 testes passaram; typecheck passou com heap de 8 GB.
- Mensageria: 183 testes passaram, onze opcionais de banco não executados; typecheck passou.
- Core: 3357 testes passaram.
- Biome nos arquivos TypeScript/JSON alterados: sem erros, com avisos existentes.

Os typechecks de todos os pacotes alterados passaram. Members e Admin excederam o heap padrão
de 4 GB do Node no Windows e passaram com 8 GB. O CI do PR e o deploy confirmado de staging
continuam obrigatórios antes da promoção.

## Produção

Autorização da dona recebida nesta conversa para corrigir e aplicar esta frente após revisão.
Aguarda publicação final de staging e checks da release. Não houve mutação de produção durante
esta revisão. O inventário inicial e os patches previstos estão no commit `36a119ef7`; o baseline
privado dos acessos permanece fora do Git.
