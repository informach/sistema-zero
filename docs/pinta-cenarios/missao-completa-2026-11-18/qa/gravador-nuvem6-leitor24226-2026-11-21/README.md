# Gravador 6 integrado à fonte 24226bb3f

A preparação 2923ca0de foi integrada ao leitor 24226bb3f sem conflitos.
O delta autoral frente ao leitor continua restrito a quatro arquivos: a
declaração de escrita 6, seus testes e a fixture de transação local real.
Os codecs, o teto de leitura e a identidade visual são preservados.

Passaram os sete controles congelados: Core (3.191 testes), tipos do Core,
host (213 testes), formatos/persistência do backend (70 testes), tipos completos
do host, perfil e Biome. Os testes do backend usam handlers e armazenamento
em memória; não comprovam CAS no Postgres ou conflito autenticado em staging.
A fixture do host exercita o produtor sobre IndexedDB e o documento nativo 7.
A reprodução anterior de escrita 4/6 está no diretório irmão da preparação.

Dois dry-runs do Wrangler compararam leitor e gravador sob a mesma configuração:
o executável de 1.979.073 bytes é idêntico, SHA-256
670c8c32d33cf541dc16b6ff81e3c5acf0978626ef6844f7fefaf316f668cf6a.
O perfil continua da629a58…. A distribuição Windows foi reconstruída e seus
126 arquivos são byte a byte iguais ao leitor, hash 5667348a…. Essa comparação
não substitui a qualificação Linux do leitor nem seleciona uma imagem remota.

Nenhum gravador foi implantado. A política 12220f13… já está integrada a partir
do leitor de rollback 24226bb3f. A implantação continua aguardando a CI geral e
a confirmação do rollout desse leitor. Permanecem os ensaios autenticados: nuvem 6, cliente antigo, CAS,
edição offline e rollback A → B → A → B, com os recursos próprios da Vila.
Não há autorização ou execução de produção, teste físico adicional ou PR.

Os relatórios foram formatados sem alteração semântica. hashes.json identifica
as cópias arquivadas; as fontes foram conferidas entre todos os comandos.
