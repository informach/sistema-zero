# Zap / Zappy — vagalume

Revisão visual de 12/09/2026, baseada na [referência enviada](referencia-zap-vagalume.jpeg).

Abra a [galeria](galeria.html) no navegador para conferir as imagens. O pacote para cadastro está em [para-upload-admin](para-upload-admin/README.md): três capas e a base vazia do certificado, com originais e PNGs mestres separados.

## Identidade

Zap é um vagalume curioso e acolhedor: cabeça arredondada grafite, olhos grandes claros, nariz pequeno dourado, duas antenas com pontas luminosas, asas translúcidas e barriga amarela que brilha. As expressões disponíveis são feliz, comemorando, pensando, dormindo e falando. A moeda também usa o novo personagem. Os identificadores `Zappy` e os caminhos das imagens foram mantidos para preservar os cadastros e componentes existentes.

## Onde foi substituído

São 19 artes aplicadas em 30 arquivos: sprites do Kids e do seletor de diálogos do admin; ilustrações do Kids; peças dos funis Desafio do Primeiro Jogo e Comunidade dos Criadores; e o mascote nas capturas de aula e do Clube. O Pensa usa os sprites do Kids. A descrição do personagem nos tutores e os textos alternativos também foram atualizados.

As capturas preservam os pixels da interface original fora das regiões do mascote. Elas continuam retratando a interface existente na captura; uma nova captura de staging deve ser feita quando o objetivo for divulgar os novos fluxos de aula.

As imagens em `mestres/` são PNGs das versões selecionadas, antes da redução para os arquivos públicos. Os sprites e as ilustrações recortadas têm transparência real. As peças com cenários e as capturas têm fundo próprio. A [galeria](galeria.html) permite alternar o fundo da prévia.

## Cadastro e promoção

As imagens públicas acompanham a publicação do código. As capas e a base do certificado dependem do upload pelo admin: siga o [guia do pacote](para-upload-admin/README.md). Nenhum cadastro remoto, upload, commit ou deploy foi executado nesta revisão.

Em staging, confira os diálogos, estados vazios, moeda, telas que usam as ilustrações e os dois funis em celular e desktop. Depois do upload, confira as três capas e emita um certificado de teste com nome longo, assinaturas e QR. Ao promover, utilize os mesmos arquivos da pasta `prontos/` nos respectivos cadastros de produção. Capas de vídeo enviadas ao Vimeo alteram o próprio vídeo; considere isso se staging e produção utilizarem o mesmo ID de vídeo.

## Arquivos de apoio

- [assets.json](assets.json): caminhos, dimensões, transparência, tamanhos e hashes das versões selecionadas; inclui o vínculo entre os quatro originais enviados e os arquivos para upload.
- [prompts.json](prompts.json): instruções de geração e ajustes. As artes foram geradas com a ferramenta imagegen integrada, sem CLI alternativa.
- [validar-assets.cjs](validar-assets.cjs): conferência local dos arquivos. Execute na raiz do repositório: `node docs/design/zappy-vagalume/validar-assets.cjs`.
- [verificacao.md](verificacao.md): verificações executadas e limites da validação local.

Para editar uma arte, comece pelo PNG mestre, mantenha a identidade da referência e exporte novamente para o caminho e dimensões indicados no inventário. Atualize os hashes do inventário após selecionar uma nova versão; o verificador acusa divergências para evitar misturar entregas.
