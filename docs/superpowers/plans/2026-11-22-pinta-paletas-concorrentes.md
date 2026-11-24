# Paletas da conta em duas abas

A revisão 2 devolvida depois de outra aba gravar a revisão 52 restaurava uma paleta cuja lápide já tinha sido compactada. A marca de cada aba ficava em memória e a biblioteca em IndexedDB. O caso negativo está congelado no recibo de QA.

A biblioteca mantém seu registro histórico por compatibilidade. Um registro privado no mesmo IndexedDB do perfil guarda a identidade da encarnação, a revisão e o conteúdo confirmado, além da cópia local editável. As duas chaves participam da mesma transação. A sincronização captura a encarnação antes do GET e valida revisão, piso observado e identidade dentro da transação que aplica a resposta. Uma confirmação de upload carrega o candidato que realmente produziu os bytes.

Um GET novo reaplica somente a diferença autoral entre a última biblioteca confirmada e a edição local. Assim a remoção que já saiu da janela de lápides continua valendo. Um 404 estável encerra a encarnação observada. Na primeira conta, paletas criadas offline continuam disponíveis para envio.

Quando um executável antigo altera somente a chave histórica, a divergência preserva a versão confirmada e recupera paletas divergentes sob identidades locais separadas. Respostas futuras desconhecidas devem preservar o armazenamento existente. Os testes cobrem duas abas, reinício, confirmação atrasada, primeira adoção e escrita pela API anterior. O contrato remoto do item reservado requer qualificação separada para uma eventual reversão de versão.

## Cliente da escrita negociada

A opção privada `pintaPaletteWriteEnabled` habilita o canal do item reservado em um cliente Pinta com perfil. Os hosts publicados continuam com a configuração anterior. A leitura certificada associa a URL dos bytes ao cabeçote da mesma resposta e exige cabeçote inclusive no 404. A primeira leitura migra o registro local 1 para 2 mediante CAS do token observado. Uma versão anterior que só entende o registro 1 falha fechada ao encontrar o 2.

O IndexedDB guarda um envio em trânsito com a biblioteca exata, revisão, nonce, encarnação base e validade. O produtor grava essa preparação antes do PUT condicional. O repositório mantém a edição corrente independente da preparação. O ACK confere nonce, item, revisão e encarnação e avança a base junto à remoção da preparação. Os campos do protocolo de escrita não alteram o JSON autoral.

Ao reabrir a galeria, o primeiro passo reapresenta o commit do nonce guardado. O servidor pode confirmar o recibo já publicado mesmo após expirar o PUT. Se o staging está ausente, o cliente pode reservar novamente os mesmos bytes e substituir o ticket local por CAS antes de enviá-los. Uma resposta transitória mantém o preparo. Se outra sessão já tomou a encarnação, o cliente preserva como cópias locais os gestos que divergiram e lê a nova biblioteca certificada. A igualdade de um JSON recebido não concede a autoria do upload. Um documento recusado definitivamente fica recuperável, e uma edição posterior pode prosseguir.

O nonce e a revisão identificam o recibo. O navegador não grava uma URL assinada nem mantém uma fila paralela. As operações novas continuam desabilitadas nos hosts públicos até as qualificações de BFF, Members e armazenamento.
