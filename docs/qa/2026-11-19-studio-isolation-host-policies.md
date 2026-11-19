# Isolamento: separar a política do host da política da casca

A preparação da ativação encontrou um conflito concreto: Community e
Community Kids enviam COOP `same-origin` globalmente, mas deixam COEP
desligado nas páginas de aula para preservar vídeos incorporados. Apenas
o Pro tem a rota com COEP `credentialless`. Os consumidores do Clássico
em `member-shell` ainda não passam `previewShellUrl` ao editor. Portanto,
não falta somente configurar um domínio: há integração de host e fluxo
de navegação a implementar e homologar.

O ensaio anterior ligava COOP e COEP juntos. Foi acrescentado um modo
opcional ao mesmo script de medição para separar essas variáveis,
mantendo na casca os cabeçalhos que a implementação real sempre envia.
O documento do programa e o trabalho nativo síncrono de cinco segundos
são os mesmos em todos os quatro perfis.

## Observações novas, sem profiler

Windows, Firefox **157.0**, uma observação por perfil; páginas mínimas
locais `127.0.0.1`/`localhost`, não o aplicativo publicado nem vídeos reais.

| Host | Maior atraso do relógio | Clique atendido em | Isolou nesta observação |
| --- | --- | --- | --- |
| Sem COOP/COEP | 5.001 ms | 4.530 ms | não |
| Somente COOP | 5.004 ms | 4.536 ms | não |
| Somente COEP | 5.000 ms | 4.535 ms | não |
| COOP + COEP | 51 ms | 57 ms | sim |

A casca teve COOP `same-origin`, COEP `credentialless` e CORP `cross-origin`
nos quatro casos. O JSON registra os cabeçalhos de cada lado, evitando
interpretar um booleano genérico como prova de uma política específica.

O modo padrão foi executado novamente e preserva os dois perfis
históricos e o formato de saída: sem cabeçalhos, 5.002/4.559 ms; com os
dois, 72/52 ms. Nenhum limiar ou programa de medição foi modificado.
São observações diagnósticas, não p95 ou comparação entre máquinas.

## Consequência para a implementação

COOP sozinho, já presente no host, não resolveu o caso Firefox medido.
Não foi ativado COEP globalmente nem modificados os vídeos dos cursos.
O isolamento precisa ser integrado primeiro em um documento apropriado,
com navegação e recursos qualificados; aulas e seus vídeos exigem prova
adicional. Não há alegação de que isso concluiu a etapa de isolamento.

O atributo `iframe credentialless` tem disponibilidade limitada e usa
contextos efêmeros. Não pode ser presumido como solução portátil para
os vídeos e todos os navegadores suportados. A documentação explica
que COEP se aplica recursivamente a documentos incorporados.
[MDN: iframe credentialless](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/IFrame_credentialless).

```powershell
cd packages/studio
$env:SZ_MEASURE_HOST_POLICY_SPLIT='1'
$env:SZ_MEASURE_ARRANGEMENTS='outro-site'
$env:SZ_MEASURE_BROWSERS='firefox'
node scripts/measure-preview-isolation.mjs --json
```

Dados em [`studio-isolation-host-policies.json`](2026-11-19-studio-isolation-host-policies.json).
O script opcional e seu modo padrão foram exercitados; Biome passou.
Nenhuma configuração de produção ou staging hospedado foi alterada.
