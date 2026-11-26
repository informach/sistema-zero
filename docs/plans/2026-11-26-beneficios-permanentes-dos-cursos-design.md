# Benefícios permanentes dos cursos e origem dos resgates

## Regras confirmadas pela responsável

O Cadê Todo Mundo entregue na última aula do guia Transformando o vilão em aliado é um benefício do curso. Quem tem acesso ativo ao guia, por compra ou presente, pode ativá-lo na conta autenticada. A disponibilidade não tem calendário próprio; o Cadê dura 15 dias desde o resgate, com 7 divulgados e aviso dos 8 extras. O benefício não depende do certificado e não gera uma nova ativação a cada visita.

Os resultados devem separar a origem imediata do resgate (campanha, embaixador ou dentro do curso) da origem do acesso ao guia. Esta última vem da matrícula que efetivamente abriu a aula, sem substituir a origem imediata. Origem histórica sem evidência continua não identificada. Os dois resgates existentes são preservados.

## Modelo e fluxo

`referrals.course_benefits` guarda nome, curso de origem, público, oferta e situação, sem início ou fim. Um código pode pertencer a esse benefício, em vez de a uma campanha. O bloco da aula admite `benefitCode`, mantendo a compatibilidade de `campaignCode` nos presentes de campanha.

O Members inclui no detalhe autenticado da aula a referência da matrícula usada na autorização. O BFF relê a aula e o bloco, confirma curso e benefício e encaminha essa referência ao resgate. A conta é a da sessão; código avulso público não concede benefício de curso. Equipe em prévia sem matrícula real não ativa o benefício.

O resgate captura seu contexto de curso e a referência exata do acesso de origem. A aquisição do Cadê tem origem `course`, sem campanha, embaixador ou comissão automáticos. A aquisição que originou o acesso ao guia é ligada por pagamento ou resgate conforme a referência capturada; dados posteriores e cookies não reescrevem essa cadeia.

## Consulta no Admin

Origem das vendas permite comparar o Cadê recebido por campanha, embaixador e benefício de curso. Cada registro mostra conta, data, origem imediata e, para o benefício, a origem do acesso ao guia. A seção Benefícios do cadastro do curso mostra os resgates e leva ao relatório. O período de consulta limita apenas as métricas.

Campanhas passa a ter somente as duas ações reais: Laopa de 13/11 e guia de presente. A conversão da antiga campanha do bônus é uma operação administrativa explícita e auditada: preserva código, resgates, termos e histórico arquivado no benefício e reclassifica as aquisições daquele código. Não executa no boot.

## Entrega e compatibilidade

Gerar a migration aditiva pelo script do projeto: tabela, coluna de benefício no código, contexto do resgate e ampliação dos checks. Conferir journal, SQL, snapshot e PostgreSQL real. Publicar primeiro os leitores e escritores compatíveis; depois executar a conversão administrativa e atualizar o manifesto/cadastro nos dois ambientes. Os links antigos do bônus levam ao curso autenticado; não permitem ativação pública sem acesso.

A promoção de construção/funil/bio do PR 293 segue separada e não deve sobrescrever esta frente. Validar idempotência, concorrência, curso vencido, público, certificado independente, pai de origem, migração com dois resgates e relatórios/CSV. Nenhum pagamento real nem e-mail de ensaio será enviado.
