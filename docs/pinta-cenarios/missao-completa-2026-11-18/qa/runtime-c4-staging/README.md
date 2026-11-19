# Runtime C4: upload real, sem ativação

A distribuição local qualificada foi enviada ao bucket privado de **staging**.
O recibo do Worker real confirma 126 arquivos e 128 objetos verificados com
tamanho e SHA-256 nativo, incluindo o marcador de conclusão e o catálogo.
Todos os corpos foram encerrados antes da resposta. A requisição sem assinatura
foi recusada com 401. [Recibo](recibo-r2-nativo.json).

- Distribuição: `c4e6107747ac998e0030dad09578ab5ec12dc81941e8675970894ca8a6f8600f`.
- Manifesto da release: `d9ac5ea3503278be9fae8338ae03365f828120f6398eb01cb34938b53deca68f`.
- Catálogo armazenado: `a01b9ebed3fbad55378758175dcb1a1b8f7580ef72efde4bb817afc7c8b07566`.

Uma leitura posterior pela CLI encontrou o marcador e o catálogo com os hashes
esperados. [Leitura independente](leitura-independente.json).
Isso não altera o seletor do Worker de execução, os catálogos Members ou o
gravador do Pinta. O plano preserva as quatro releases anteriores.

## Transporte e segurança

O proxy remoto do SDK falhou nas tentativas em Windows e Linux. Os registros
negativos foram conservados; não se declara sua causa interna resolvida.
O plano preparado em Node Linux conservou todos os dados, mudando somente o
caminho local de distribuição e o hash que o inclui. [Paridade](paridade-linux.json).

O envio usou o promotor operacional **já existente** em
`packages/studio-runtime/promotion-worker/`. Ele usa as mesmas funções de
armazenamento, o binding R2 nativo, SHA-256 e criação condicional. O plano fixa
todos os arquivos e as únicas chaves permitidas. A autorização tem HMAC, versão
implantada, prazo e hash do corpo; não é um endpoint de upload arbitrário.
Os 59 testes do promotor passaram antes da operação.

O Worker temporário foi removido depois do recibo, conferindo a versão para não
apagar alterações alheias. A chave local temporária também foi removida. Os
objetos imutáveis do R2 foram preservados. [Limpeza](limpeza-operador.json).

O [artefato canônico](artefato-canonico.txt) conserva os bytes originais ligados
ao SHA do recibo. Os demais JSONs são apresentados no formato do repositório;
hashes de plano/aprovação usam JSON canônico, conforme o protocolo.
Nenhuma credencial ou assinatura de requisição foi incluída nestas evidências.

## Limites da prova

O resultado comprova upload e leitura nativa reais, não ativação ou jogo
publicado. A qualificação ampliada das capacidades, o Worker de execução, os
aplicativos, o catálogo Members e o ciclo autenticado continuam gates próprios.
Não houve medição de heap: executar o lote no Worker real não substitui um perfil
de memória. [Inventário](verificacao.json).
