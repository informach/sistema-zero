# Molda Cenários — persistência em staging e leitura de modelos

16/11/2026. Continuação dos lotes 1 e 2, após `8d4e9c7eb`.

A conta de teste da equipe abriu a ferramenta no app adulto de staging. O ensaio criou uma biblioteca e um mundo temporários no espaço da equipe, importou um GLB com miniatura pelo envio direto assinado, colocou o modelo num cenário e aguardou a confirmação do lote. Após recarregar, a API devolveu a instância e o mesmo hash do modelo; o palco exibiu a geometria correta. Não houve erro de página. Mundo e biblioteca de teste foram removidos ao terminar. Credenciais ficaram somente no arquivo externo indicado pela usuária, sem registro de sessão no repositório.

[Cenário reaberto](evidencias/staging/cenario-reaberto.png), [modelo na biblioteca](evidencias/staging/modelo-guardado.png), [registro sanitizado de requisições](evidencias/staging/resultado.json). O teste é reproduzível pelo script `playground/oficina/verificar-staging.mjs`, com endereço de staging conferido, caminho externo de credenciais e pasta de saída. Não aceita endereço de produção nem encaminha credenciais ao armazenamento.

O ensaio remoto comprova o fluxo básico que já estava publicado, sem afirmar que o commit local inteiro esteja implantado. O acesso de equipe permaneceu habilitado; não foi liberado acesso geral nem modificado o perfil infantil existente. As verificações de autorização comuns continuam cobertas pelos testes de serviço e gateway; o perfil infantil consultado anteriormente recebeu `aberto: false`.

Foi reproduzida e corrigida localmente a leitura de GLB com buffer interno em URI de dados sob a CSP dos apps. O carregador e o medidor agora usam o adaptador de recursos locais também para buffers, além das imagens. A política de segurança não foi ampliada. O palco confere o GLB e o SHA-256 antes de decodificar, recusando conteúdo diferente da versão fixada no documento.

Verificação desta passada: dez testes do motor e sua tipagem aprovados; Chrome importando cinco modelos sintéticos (OBJ/MTL/PNG em ZIP, glTF com buffer externo, FBX, FBX em centímetros e GLB com buffer em URI de dados). O worker foi servido com `connect-src 'self' https:`. Arquivo auxiliar ausente e recurso remoto foram recusados; cancelamento foi exercitado. [Resultado do ensaio local](evidencias/importacao-csp/resultado.json).

Isso não fecha os lotes 1–10 nem aprova desempenho em aparelho físico. Seguem pendentes acervo por coleção, arquivos reais complexos, chãos e conjuntos, ferramentas completas, terreno, água, exportadores e demais itens do plano integral.
