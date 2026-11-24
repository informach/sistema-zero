# Documento interno de regiões — 21/11/2026

O codec `core/regionDocument.ts` conserva camadas, grupos, propriedades,
referências e versões de arte no modelo existente. Posições globais podem ser
negativas e fracionárias; crescer o mundo não desloca seus elementos. Padrões
explícitos válidos, como opacidade 1, deslocamento 0 e primeiro plano `false`,
não desaparecem. Dados desconhecidos ou normalizações com perda recusam todo
o documento. A validação de células/orçamento continua compartilhada com Core.

O formato continua interno: `PINTA_MAX_SCHEMA` permanece 7, e `PintaAsset`,
galeria, backup público, protocolo físico e escritores não foram promovidos.
Isso não entrega a oficina expansível, persistência 3, cena 4, carregamento
sob demanda ou suporte externo ao nativo 8. Não há alteração visual neste lote.

## Verificações

O lote final `pinta-region-document-final-r2` passou nos sete controles:
14 casos focados (incluídos nos 2.319 da suíte completa), tipos Pinta/Estúdio,
lint e 12 fluxos locais de navegador. Os três casos Pygame ignorados na suíte
geral foram executados separadamente: três aprovados, sem skip. O navegador
exercita a integração ativa anterior; não demonstra uma UI para o formato 8.

O ensaio reproduzível executou 100 mapas sintéticos: dez com arte embutida,
34 com extensão lógica de 10.000 × 10.000. Todos atravessaram JSON comum e
reabriram com os mesmos dados. Os 200 snapshots de entrada permaneceram
intactos; o leitor histórico recusou os 100 documentos novos. Isso verifica
dados esparsos, sem comprovar renderização, fluidez ou uso em outros aparelhos.
O script recebeu também sua própria checagem de tipos, pois `scripts/` não
faz parte do tsconfig normal do Pinta.

Oito fixtures dos formatos 0–7 foram comparadas ao leitor qualificado
`85d16fcd9`: valores e bytes JSON idênticos. A comparação é dessas fixtures,
não uma afirmação sobre todos os projetos existentes. Um controle negativo
desativou temporariamente a barreira de metadados e fez o teste de campos
desconhecidos falhar; o arquivo foi restaurado pelo SHA antes dos controles.

## Falhas encontradas e corrigidas

O primeiro teste revelou diferenças entre o nome criado em memória e sua
normalização histórica. A política nova valida sem renomear o documento; a
fixture de regressão anterior conserva o nome canônico esperado pelo legado.
A revisão posterior encontrou normalização indevida de giros como 1,1 grau.
O leitor novo conserva o valor; a política histórica permanece igual.

Um teste inicial com replacer JSON escondia a conversão incorreta dos buffers
de arte. A reprodução sem replacer falhou, e o encoder passou a reutilizar
`pintaAssetToWire`. A asserção agora usa `JSON.stringify` comum. Os registros
anteriores são históricos; a qualificação final é o lote r2 após a correção.
No script de ensaio, uma união de camadas exigiu estreitamento explícito para
camada de peças; o ensaio e seus tipos passaram depois desse ajuste. A primeira
tentativa de tsc na raiz não encontrou o binário e não conta como validação.

## Reprodução e limites

Na raiz, com dependências instaladas:

```powershell
bun --no-env-file test packages/pinta/src/core/regionDocument.test.ts packages/pinta/src/core/mapDocumentBoundary.test.ts
bun --no-env-file packages/pinta/scripts/qa/region-document.ts meu-ensaio-unico
```

O segundo comando exige um identificador novo e não sobrescreve relatórios.
Os limites de metadados estão no design de regiões. O contêiner de backup,
consumidores restantes e rollout do formato novo continuam no plano. Estes
ensaios foram locais nesta máquina; não houve homologação com crianças ou
outros dispositivos físicos, nem ativação do nativo 8 em staging.
