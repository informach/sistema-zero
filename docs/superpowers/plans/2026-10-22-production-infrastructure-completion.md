# Complementos de infraestrutura para a primeira promoção

O inventário real de produção mostrou contratos ainda não provisionados. Este
lote completa esses contratos antes da promoção; não muda cursos, permissões ou
limites de desempenho do produto.

## Recortes e ordem

1. Preservar no IaC os nomes do cofre de IA e da reconciliação já definidos pelo
   Members/BFF. Provisionar somente ausentes, por ambiente; valores existentes
   inesperados exigem diagnóstico, sem rotação ou substituição silenciosa.
2. Preparar um Worker separado para chamar a reconciliação de IA do host Kids
   a cada minuto. Sem superfície HTTP administrativa, sem inferência, com origem
   exata por ambiente, bearer secreto, redirect recusado, prazo limitado e logs
   apenas de estado/contagens validadas. A limpeza de criações existente mantém
   seu cron de cinco minutos e sua finalidade. Ativar o agendamento apenas após
   a rota nova e seu segredo estarem carregados no ambiente correspondente.
3. Completar executor adulto, HMAC do BFF adulto e endereço de limpeza no Hub
   usando identidades/segredos canônicos do mesmo ambiente. A chave OpenRouter
   existente em Kids pode atender o executor adulto; não prometer validade ou
   orçamento sem a verificação do provedor. OAuth externo permanece somente no
   fluxo Kids implementado; não criar um fluxo adulto por configuração.
4. Permitir no controlador uma primeira implantação explicitamente solicitada
   do gravador existente. O inventário atual tem três falhas históricas e zero
   deployments ativos. A exceção é fechada para `live-recorder`, exige serviço
   existente e ausência de pending/active, não aceita Members/Auth nem outros
   apps e conserva a barreira canônica antes do POST. Se aparecer um deployment
   concorrente antes do POST, recusar; não inferir adoção ou iniciar duplicado.
5. Os qualificadores Python passam a aceitar o destino explícito de produção,
   com origens e pins próprios. Recibos de staging continuam sendo de staging.

## Provas e implantação

Os testes cobrem limites entre ambientes, erros de transporte e resposta,
recusa de redirects, segredo ausente e ausência de inferência no scheduler;
primeiro deploy cobre opt-in, alvo fechado, concorrência e ordem após V1.
Executar testes focados e revisão independente antes de commit. O CI completo
do novo head continua obrigatório antes da onda de staging/produção.

Configuração Railway usa `skip-deploys` e leitura de volta, para não publicar
réplicas intermediárias. A onda nova carrega as configurações em conjunto.
O scheduler é implantado por ambiente após o BFF correspondente; mídia continua
desabilitada até sua própria prova. Seeds criam somente definições aprovadas
ausentes e preservam drift do admin. Um snapshot de volume não equivale a ensaio
de restauração nem autoriza ignorar as barreiras das migrations destrutivas.

## Andamento local

O controlador ganhou opt-in `initialize_recorder`, padrão falso, fechado pelo
UUID real do gravador. O recibo registra a intenção antes da onda. Sem opt-in,
o inventário vazio continua recusado; com opt-in, pending/active ou mudança de
ID recusam o POST. O mesmo verificador exige SHA/contexto e deployment único
saudável depois da implantação, mesmo sem predecessor. Os testes focados do
controlador, portas e workflows passaram em 142 casos/572 asserções; isso ainda
não é uma implantação do gravador ou prova de mídia.
