# Campanhas vinculadas a embaixadores

Design aprovado: cada palestra tem sua campanha; Viviane mantém um cadastro de embaixadora reutilizável. A campanha oferece primeiro sete dias gratuitos. O vínculo atribui resultados, mas só gera comissão quando ela estiver explicitamente habilitada.

## Comportamento

- Campanhas podem escolher um embaixador ativo, habilitar comissão e informar valor fixo por primeira assinatura e prazo em dias após o resgate. Sem acordo, comissão desabilitada. Não há comissão recorrente ou percentual nesta entrega.
- Cada resgate guarda internamente beneficiário e condições aceitas, na mesma transação que confere a campanha. Alterações posteriores só afetam novos resgates. Dados financeiros e e-mail do beneficiário não entram no presente público.
- A janela de cadastro, o acesso de sete dias e a janela de comissão são independentes. Encerrar a campanha não apaga a atribuição nem impede a conversão posterior.
- Reutilizamos maturação após garantia, bloqueio de autoindicação, deduplicação de pagamentos e tratamento de estorno existentes.
- O primeiro resgate por e-mail e público continua prevalecendo. Um link compartilhável não comprova presença física.
- A administração mostra assinaturas e comissão por participante. Conversões vinculadas continuam associadas ao embaixador mesmo sem comissão.
- Campanhas existentes permanecem sem vínculo/comissão; nenhuma atribuição retroativa. Duplicatas começam com comissão desligada na interface.

## Preparação da palestra

Preparar La Opa vinculada a Viviane sem enviar convites. E-mail, datas, público, ambiente e eventual acordo dependem das respostas do operador. Não inventar identidade nem habilitar comissão sem acordo.

## Persistência e publicação

Migração aditiva gerada pelo Drizzle, sem alteração manual do SQL gerado. Aplicar antes da nova versão. Versões antigas ignoram os novos campos; clientes antigos preservam configuração ao editar. Reversão do aplicativo não remove os registros históricos, mas suspende a nova atribuição de comissão até restaurar a versão compatível; não reverter durante campanha com comissão ativa.
