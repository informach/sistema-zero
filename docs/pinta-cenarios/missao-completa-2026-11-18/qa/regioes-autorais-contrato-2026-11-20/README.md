# Contrato de regiões autorais: primeiro lote

DTO em memória e codec de transporte little endian/base64 canônico, com
chunks 32 × 32 e orçamento global de 2.048 chunks/4 MiB de índices. Validação
de cabeçalhos e orçamento precede qualquer leitura de payload. Rejeita
campos/versões desconhecidos, duplicatas, chunks vazios, células inválidas,
dados fora da extensão e grafos malformados, sem cortar conteúdo. A ordem
de saída é determinística sem mudar a ordem autoral.

14 testes focados, 65 verificações; Core completo: 3.170 testes, sem falhas
ou omissões. Typecheck e Biome: saída 0. O primeiro typecheck identificou
anotação ausente no getter de um teste; corrigido, sem casts ou supressões.
O teste vermelho inicial comprova que o módulo não existia.

A conservação abrange todos os 32.769 valores históricos de células,
coordenadas negativas, limites parciais e o teto real de 4 MiB. O teto é
verificado antes de acessar os dados, inclusive no gravador.

Este lote não ativa schema 8, não muda documentos antigos e não expõe
regiões na interface. Operações, persistência, render, Estúdio e motores
externos ainda dependem das tarefas seguintes. Não representa homologação
de desempenho, navegador ou dispositivos adicionais, nem conclusão de 8a.
