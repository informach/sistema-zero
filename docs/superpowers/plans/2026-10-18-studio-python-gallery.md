# Galeria: projetos Python completos e Pro

Escopo autorizado da proposta Python, após seções/reviews095–098. Preservar entrega JavaScript/Pinta e corpo do gateway. Nenhum push/deploy. Implementar e revisar em conjunto antes de qualificar.

## Contrato e transporte

- BFF continua obtendo plano do Members e lendo somente keys fornecidas pelo plano. Aceita `files` Clássico e `tree` Pro com identidade do item. JavaScript continua enviando programa inline sem assets, pois seus critérios existentes usam estrutura/IR. Python nunca perde assets.
- Após copiar projeto/partes para as keys da entrega, BFF envia no commit HMAC uma referência estrita e pequena: discriminante/version/itemId/revision e URLs GET temporárias para projeto e partes imutáveis. Não enviar base64 nem aumentar limite global do gateway. URLs ficam apenas no pedido interno; não persistir, registrar em logs ou devolver ao browser.
- Members configura explicitamente `STUDIO_GALLERY_STORAGE_BASE_URL` (HTTPS da conta/bucket R2; loopback só fora de produção). Leitor aceita somente URL cuja origem e pathname coincidam com essa base + a key EXATA calculada pelo plano fresco. Recusa credenciais, fragmento, redirects, keys/partes/identidade/revisão extras ou trocadas. HMAC sozinho não substitui essa barreira contra SSRF.
- Members primeiro reautoriza/prepara plano, materializa a cópia, reautoriza e só então chama Submit. O mesmo signal/orçamento50s cerca download, descompressão, parser, inspeção e persistência. Não criar novos sucessores após cancelamento; leituras já admitidas podem concluir fisicamente e são descartadas.

## Materialização

- Core portátil compartilha o restaurador de snapshots Studio: JSON UTF-8 estrito, manifesto `sz-studio-parts` v1, até128 partes; preservar ordem dos assets, conferir SHA dos bytes JSON de cada parte ANTES de parsear, rejeitar parte ausente/corrompida. Não usar JSON.stringify do objeto lido para fingir hash dos bytes originais.
- Limites explícitos por operação: até40MiB comprimidos e128MiB JSON descomprimido no agregado, com contador durante leitura/descompressão e abort. Perfil Python ainda impõe suas cotas de fontes/assets/snapshot32MiB na inspeção. Decompressão assíncrona, sem gunzipSync de arquivo grande no hot path Members.
- Validar documento Python completo e identidade após restauração; regras/compilador usam a revisão calculada de TODOS os arquivos e assets. Documento/partes vêm da cópia privada, nunca de payload do browser. Assets inválidos geram erro, não desaparecem silenciosamente.
- Reusar restaurador no leitor de entrega do professor para manter mesma ordem/verificação, sem transformar Pensa em consumidor Python.

## Provas e fechamento

## Isolamento e retenção das tentativas (review099)

Cada preparo público emite uma geração UUID do servidor, incluída no caminho e no commit HMAC; o browser não escolhe geração nem destino. O BFF copia primeiro e lê o destino efetivo para validar também JavaScript/Pinta. Uma cópia atrasada de outra tentativa não escreve na geração confirmada. Snapshots históricos sem geração continuam legíveis.

O Members registra duravelmente a geração e seu snapshot antes de devolver as keys. A autorização de commit expira em uma hora; preparo interno reconstrói e compara o snapshot registrado, sem renovar nem criar tentativas. Limitar tentativas pendentes por perfil. Depois de 24 horas, a fila existente de limpeza pode retirar tentativas não usadas, em um novo escopo `gallery` que nunca finaliza contas. A marca de retenção de uma entrega e a retirada para limpeza usam o mesmo lock de aluno e a mesma transação da gravação; uma tentativa retirada nunca pode ser persistida. Entregas confirmadas são retidas, inclusive evidências e a versão anterior. Falha de resposta não autoriza apagar uma geração possivelmente confirmada. A limpeza mantém lease, retry e ack duráveis; clientes antigos não recebem esse escopo. Os limites de tempo do cliente R2 são muito menores que a janela de limpeza.

A admissão conta no máximo128 gerações ainda não confirmadas nem limpas por perfil, incluindo expiradas até a limpeza. Assim, expirar o ticket não libera uma sequência ilimitada de novas cópias antes do GC. Aplicar a migração aditiva0133 antes de ativar o backend novo; rollback de aplicação preserva as linhas/tabela, sem apagar snapshots. Nenhuma migração foi aplicada fora do banco descartável local.

Provas adicionais: duas tentativas de mesmo requestId e revisão com CopyObject tardio; cópia alterada depois do preparo; commit expirado/geração de outro proprietário/snapshot diferente; disputa SQL entre confirmação e limpeza; worker de escopo novo sem finalização de conta; revisão e migração aditiva gerada por Drizzle, apenas no banco local de testes.

Core: inline, partes ordenadas, bytes/hash, Unicode/chaves JSON especiais, duplicidade de referências, ausência/corrupção, quotas e cancelamento não cooperativo. Members: HTTP download gzip local real + URL pinning/redirectnegatives, Classic/Pro com assetTurtle/Pinta, gradeinspector próprio e fonte/assets exatos, revogação/revisão/cancel durante materialização, falha de config sem quebrarJS/Pinta. BFF: plano/keyserver-owned, Protree, URLs somente cópias, corpo pequeno, copies-before-commit, retry idempotente e cancel; JS/Pinta legados. Typechecks afetados e revisão independente. Depois SDK/fourhosts/performance/fullreview originais continuam pendentes.
