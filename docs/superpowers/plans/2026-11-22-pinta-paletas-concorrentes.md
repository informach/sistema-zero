# Paletas da conta em duas abas

A revisão 2 devolvida depois de outra aba gravar a revisão 52 restaurava uma paleta cuja lápide já tinha sido compactada. A marca de cada aba ficava em memória e a biblioteca em IndexedDB. O caso negativo está congelado no recibo de QA.

A biblioteca mantém seu registro histórico por compatibilidade. Um registro privado no mesmo IndexedDB do perfil guarda a identidade da encarnação, a revisão e o conteúdo confirmado, além da cópia local editável. As duas chaves participam da mesma transação. A sincronização captura a encarnação antes do GET e valida revisão, piso observado e identidade dentro da transação que aplica a resposta. Uma confirmação de upload carrega o candidato que realmente produziu os bytes.

Um GET novo reaplica somente a diferença autoral entre a última biblioteca confirmada e a edição local. Assim a remoção que já saiu da janela de lápides continua valendo. Um 404 estável encerra a encarnação observada. Na primeira conta, paletas criadas offline continuam disponíveis para envio.

Quando um executável antigo altera somente a chave histórica, a divergência preserva a versão confirmada e recupera paletas divergentes sob identidades locais separadas. Respostas futuras desconhecidas devem preservar o armazenamento existente. Os testes cobrem duas abas, reinício, confirmação atrasada, primeira adoção e escrita pela API anterior. O contrato remoto do item reservado requer qualificação separada para uma eventual reversão de versão.
