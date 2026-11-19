# Runtime 132: upload qualificado em staging

A distribuição recompilada sobre `90d2ca825` passou pelos 16 ensaios de Pinta/Pygame,
83 ensaios do runtime compartilhado e pela execução real da API de cenas em Python/Wasm.
O benchmark mediu 52,46 FPS na janela estável, acima do critério de 45 FPS.
As duas execuções anteriores com falha e seus limites estão registrados na
[qualificação local](../runtime-132-local/README.md).

O [recibo remoto](recibo-r2-remoto.json) confirma HTTP 200, 126 arquivos e 128 objetos
verificados por tamanho e SHA-256 nativo. Todos os corpos foram encerrados antes da resposta.
Uma [leitura independente pela CLI](leitura-independente.json) confirmou o marcador e o catálogo.

- Distribuição: `132db1bdbf9c803d0e58bc76165ddfa8c298a25f816bf35d46366ce16604718e`.
- Release: `2026-11-19-pinta-cenarios-2`.
- Manifesto: `eec668d098be7605a1534983a588fb05e40da4ca218609c534911d1ad69b52ff`.
- Catálogo armazenado: `e67e817f6d24b074ad5cf2ddba0da99aef25da4574c1b54d6450f6ab3d57886b`.

## Operação e recursos

O promotor existente foi compilado sem alterar seu código. Antes do envio remoto,
o payload final de 26.007.007 bytes foi executado em workerd com R2 nativo local.
Nove amostras do inspector observaram até 53,96 MiB somando heap usado, heap do embedder
e backing storage. Isso é uma amostragem, sem garantia de capturar todo pico nem o RSS
do processo. Não se apresenta essa medida como prova universal do teto de 128 MiB.
[Ensaio local](r2-nativo-local.json).

O código lido da Cloudflare após implantação tinha o mesmo SHA-256 do bundle local.
Foram conferidos a versão ativa, o bucket de staging e os três bindings esperados.
Uma chamada sem assinatura retornou 401. A chave exclusiva foi fornecida por stdin,
com janela de autorização limitada, sem persistir credenciais nos relatórios.
[Verificação do operador](operador-verificado.json).

O Worker temporário foi removido após o recibo, conferindo a versão antes da exclusão
e o erro 10007 de ausência depois dela. As duas chaves locais, incluindo a janela
anterior não utilizada, foram removidas. Os objetos imutáveis foram preservados.
[Limpeza](limpeza-operador.json). Os 62 testes do promotor passaram com 465 asserções.

Uma primeira tentativa da leitura auxiliar consultou incorretamente o hash do plano
de configuração completo em vez do descritor `workerCatalog`. O comando falhou e
produziu um arquivo local vazio. A consulta foi corrigida para a chave canônica do
catálogo; nenhum objeto remoto foi alterado por essas leituras.

## Gates que continuam separados

O upload não ativa o runtime. O [seletor do Worker](seletor-inalterado.json) e a
[política Members](members-inalterado.json) permaneceram nos valores anteriores.
O rollout dos leitores, a ativação coordenada, o ciclo autenticado e a liberação do
novo gravador continuam pendentes. A distribuição C4 permanece arquivada como prova
histórica; ela não foi sobrescrita nem reapresentada como esta recompilação.

O [plano](plano.json) preserva as releases anteriores. O
[artefato canônico](artefato-canonico.txt) mantém seus bytes originais, com SHA-256
`08aa35c3d5931ce1ab674c60355d930ee42088564ecceebc8b406b3fc8c7486d`.
Não houve teste em outro aparelho físico nem participação de crianças nesta etapa.

## Integração posterior

Após integrar `7b65efe75` no commit `595b7b22a`, a recompilação gerou exatamente
o mesmo SHA-256 `132db1b…`. Os 16 testes selecionados de criação/importação de
mapas e orçamento passaram, com 67 asserções. O CI de estilo conferiu 16.140
arquivos sem erros. Isso conserva a qualificação dos bytes; não substitui o
rollout hospedado nem os gates de implantação.
