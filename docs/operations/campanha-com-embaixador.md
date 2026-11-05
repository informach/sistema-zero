# Campanha de palestra com embaixador

No Admin, selecione a comunidade (Kids ou adulto) e abra **Embaixadores**.

1. Na aba **Embaixadores**, cadastre ou localize a pessoa responsável pela parceria. O cadastro normal de embaixador envia o link pessoal por e-mail; faça isso quando os dados e a parceria estiverem definidos.
2. Na aba **Campanhas de presente**, crie uma campanha para cada palestra/data. Informe o título público, código exclusivo, canal e período em Brasília. Comece como rascunho.
3. Em **Embaixador e comissão**, busque a pessoa pelo nome ou e-mail e selecione-a. O vínculo passa a atribuir resultados mesmo com a comissão desligada.
4. Só marque **Habilitar comissão para novos cadastros** se houver acordo. Informe os valores em reais pela primeira assinatura mensal e anual e o prazo em dias desde o cadastro. Os padrões são **R$ 30 no mensal e R$ 80 no anual**, editáveis conforme a parceria. A cobrança precisa ser paga antes de completar esse prazo. O bônus é único; não há comissão nas renovações.
5. Confira a prévia. Quando estiver pronta, altere a situação para **Ativa**; o período determina quando o link aceita novos cadastros. O detalhe permite copiar o link e baixar o QR Code.

O período da campanha controla novos cadastros. Cada cadastro recebe sete dias de acesso, e a janela de comissão é independente. O link pode ser encaminhado; não comprova presença física. Quem já resgatou um presente no mesmo público mantém a atribuição original.

No detalhe da campanha, cada participante mostra assinatura e comissão. O painel de embaixadores também inclui esses cadastros. Bônus habilitados seguem a garantia existente (sete dias mais doze horas), com pagamento Pix manual e marcação no Admin. Comissão desligada ou pagamento fora do prazo continua contando como conversão, sem valor a pagar.

Editar vínculo, valor ou prazo só afeta novos cadastros. O histórico anterior é preservado. Duplicar pelo Admin mantém a pessoa vinculada, mas começa a nova edição com comissão desligada, para conferir o acordo antes de habilitá-la.

Desativar o embaixador mantém os presentes das campanhas disponíveis e a atribuição dos resultados, mas desliga a comissão nos novos cadastros. Acordos aceitos antes da desativação continuam válidos. Reativar a pessoa só permite comissão para cadastros futuros, conforme a configuração da campanha; não altera os aceites feitos enquanto estava desativada.

Se o aviso de uma compra fora do prazo chegar antes do aviso de uma compra anterior elegível, o sistema substitui a atribuição sem comissão pela compra elegível. A linha anterior permanece como `superseded` para auditoria e deduplicação, fora das métricas. Bônus pendentes, liberados ou pagos não são substituídos. Estornar uma autoindicação também retira a compra das conversões, sem gerar bônus.

## Publicação técnica

Aplicar a migração aditiva `0006_easy_longshot.sql` pelo migrador do Referrals e publicar o Referrals antes do Admin. Não editar o SQL gerado. A migração deixa campanhas existentes sem vínculo e sem comissão; não há backfill de atribuição. A tabela de códigos mantém um único proprietário por código.

O resgate captura beneficiário e acordo sob o mesmo bloqueio de linha da campanha usado na edição. O snapshot financeiro fica privado, separado da origem pública do presente. Retomadas mantêm o registro aceito. Clientes antigos que omitem os novos campos preservam a configuração existente ao editar.

Um rollback do aplicativo preserva os dados, mas a versão antiga não processa as comissões das campanhas. Não reverter o serviço durante campanha com comissão habilitada sem suspender novos cadastros e reconciliar pagamentos ocorridos no intervalo.

### Correções do review

A migração `0007_dapper_quentin_quire.sql` recria o índice único por resgate para excluir `canceled` e `superseded`. Não modifica linhas históricas nem o índice único de pagamento. É executada pelo migrador antes do novo Referrals, seguido do Admin. A reconstrução do índice pode bloquear escritas na tabela de conversões durante a migração; acompanhar duração e prontidão do serviço.

Não recriar o índice antigo nem voltar para um binário que desconheça `superseded` depois de haver substituições: o índice antigo pode conflitar com o histórico e os relatórios antigos podem contá-lo. Preferir correção em uma nova versão; uma reversão exige suspender processamento e reconciliar os registros antes. Os testes de upgrade preservam integralmente um Pix pago e verificam unicidade por resgate e pagamento.

## Laopa

Em 05/11/2026, o operador autorizou cadastrar Vivianne Lima e a campanha da palestra na
clínica Laopa em produção, com vínculo e comissões padrão: R$ 30 no mensal e R$ 80 no anual.
Público Kids, resgates de 06/11 a 08/11, horário de Brasília. O cadastro real deve ser feito
após a publicação da comissão por plano e registrado na evidência operacional privada;
não gravar e-mail ou links privados de acesso em documentação versionada.
