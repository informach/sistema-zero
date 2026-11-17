# Lote 1 — revisão dos dois apps e armazenamento

Continuidade exclusiva do lote 1, após a orientação de fechar os lotes na ordem. O recorte anterior do lote 3 foi preservado em `17db70fd7`, sem declará-lo concluído ou continuar sua expansão.

## Conferência real na plataforma

O ensaio autenticou a própria conta da equipe nos endereços conferidos de staging. No Kids, utilizou o fluxo oficial de responsável, um perfil temporário privado, acesso de estudo no navegador de ensaio e entrada como aluno. O emissor existente conserva o papel da equipe nesse contexto, sem alterar papéis ou perfis reais. O teste arquivou o perfil e revogou a permissão temporária ao terminar.

Nos dois apps, o ensaio criou biblioteca e mundo temporários, importou um GLB sintético livre pelo worker e pelo envio assinado real, colocou o modelo, alterou X para 2,5 m, giro para 45° e escala para 1,3. Alternou a grade. Após recarregar, conferiu os três valores, uma instância e o mesmo hash do modelo pela API. Cada cenário chegou à revisão 4. Não houve erro de página.

As entidades temporárias foram removidas. Na primeira passagem completa no Kids, a limpeza não enviava a prova de sessão exigida pelo proxy. O script foi corrigido; os dois identificadores exatos daquele ensaio foram removidos pela conta da equipe, depois de conferir nome, propriedade e ausência na lista. As execuções seguintes passaram incluindo a limpeza. Nenhum acervo foi removido.

Evidências: [adulto](evidencias/lote1-staging-adulto/resultado.json), [captura após recarga](evidencias/lote1-staging-adulto/cenario-reaberto.png), [Kids](evidencias/lote1-staging-kids/resultado.json), [captura Kids](evidencias/lote1-staging-kids/cenario-reaberto.png). O script reproduzível é `packages/molda-cenarios/playground/oficina/verificar-staging.mjs`; recebe a origem, um arquivo externo de credenciais e a pasta de saída. Não guarda cookies, senhas ou URLs assinadas nas evidências versionadas.

## Criação única e conteúdo recebido

O bucket `testes-ugc` foi conferido pelo SDK com a configuração autenticada de staging. A regra já existente aceitava apenas `content-type`; recebeu também `if-none-match`, preservando as origens, métodos e demais opções. Não foi tornado público. A segunda execução foi idempotente. Os preflights dos dois apps retornaram 204 com o cabeçalho permitido. O [R2 documenta](https://developers.cloudflare.com/r2/buckets/cors/) que a propagação pode levar até 30 segundos; a primeira leitura imediatamente após a alteração ainda retornou 403 e a conferência seguinte refletiu a regra nova.

Além do preflight, houve envio real pelo Chrome em cada origem usando **as funções de produção** `r2PresignPutUgc`, `r2GetObjectUgc` e `conferirUploadDeCenario`, compiladas para o ensaio. Primeiro PUT: 200. Tentativa de sobrescrever com outros bytes: 412. Leitura no servidor: SHA-256, tamanho e GLB conferidos, preservando o primeiro conteúdo. Os arquivos temporários ficaram num prefixo próprio de QA e foram removidos, com ausência conferida. Nenhum dado de conta ou progresso foi criado por esse teste de armazenamento. [Resultado](evidencias/lote1-upload-condicional/resultado.json).

Reprodução:

```powershell
bun build packages/member-shell/qa/cenarios-upload-entry.ts --target=node --conditions=react-server --outfile output/cenarios-reforma/cenarios-upload-entry.mjs
node packages/member-shell/qa/cenarios-upload-staging.mjs
```

O script usa a CLI autenticada para ler os valores apenas em memória. Não imprime credenciais, corpo do modelo ou endereços assinados. Recusa qualquer bucket diferente de `testes-ugc`.

## Inicialização local

Foi corrigida uma colisão na demonstração local: duas variantes do acervo perdiam o sufixo de conteúdo e viravam o mesmo caminho, como `barril_01.glb`. O nome curto da gaveta permanece, enquanto a entrada preserva a origem única do arquivo. O importador continua recusando caminhos duplicados. A demonstração voltou a abrir nas telas inicial e oficina, com capturas e sem erros no console.

O ensaio adicional no Chrome com toque emulado, em **390 e 1024 px**, colocou um modelo pelo cartão da gaveta com `tap`, alternou a grade e orbitou a câmera com eventos de toque. A imagem mudou e o documento autoral permaneceu igual durante o movimento da câmera. Não houve rolagem horizontal da página nem erros no console. [Resultado](evidencias/lote1-toque/toque.json), [celular](evidencias/lote1-toque/toque-390.png), [tablet](evidencias/lote1-toque/toque-1024.png). Isso não é um teste em aparelhos físicos. Reprodução: `node packages/molda-cenarios/playground/oficina/fotografar.mjs <saída> toque`.

## Pendência para fechar o lote

As provas de interface/persistência acima usaram a versão então implantada. O ensaio direto de armazenamento comprova as funções novas contra R2, mas **não substitui** a prova do novo contrato completo BFF → HMAC → Members após a implantação de `cc227425c`. O CI `43980464489` ainda estava em andamento na tipagem geral quando este registro foi preparado. A validação dessa implantação e a revisão final do lote 1 continuam obrigatórias. O lote permanece aberto; não iniciar o lote 2 antes desse fechamento.

O ensaio de staging oferece `CENARIOS_QA_EXIGIR_INTEGRIDADE=1`: nesse modo exige que a reserva declare criação única e que os PUTs efetivamente enviem a condição assinada. O GLB sintético contém um identificador único do ensaio, evitando reaproveitar um upload anterior. Essa guarda foi exercitada contra a versão antiga e recusou-a pelo motivo esperado, com limpeza concluída. A passagem positiva será feita com a nova versão implantada; uma execução básica verde na versão antiga não basta para essa aprovação.
