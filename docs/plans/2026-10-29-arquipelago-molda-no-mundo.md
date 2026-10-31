# Aparências do Pinta e do Molda no mundo

Data: 29/10/2026. Escopo autorizado: jogo, contrato e porta da plataforma.

## Levantamento antes das mudanças

- `molda/src/export/modelGlb.ts` exporta o modelo do molde como GLB 2, com malha fundida, atlas PNG embutido de até 512 pontos e frente +z. O exportador existente limita a data URL a 7.000.000 caracteres. O molde nasce como modelo clássico (`InitialModelOpener`), não como cena. `exportLoadedAssetForStudio` permite exportar a criação lida sem abrir a oficina.
- `member-shell/src/lib/molda-cloud-persistence.ts` guarda o JSON nativo com id e peles; o Pinta guarda um envelope `pinta-gallery` com o desenho e suas camadas, não apenas uma miniatura. `exportLoadedAssetForStudio` do Pinta produz o PNG composto, com a planificação inteira.
- A conta guarda os documentos comprimidos no R2 privado. `createCreationsCloud.download` obtém `/api/creations/:tool/:id/download`, com `x-sz-viewer` e a sessão do documento. O BFF verifica a sessão, e o Members procura por pessoa, público, ferramenta e id antes de assinar a leitura. Não usar a biblioteca local como autorização nem gravar durante a leitura.
- `objetos-da-casa.tsx` escolhe holograma ou modelo do catálogo, clona materiais quando necessário, mantém o colisor simples e anima os peixes do aquário. Nenhuma criação é lida hoje.
- `AparenciaDoObjeto` distingue `galeria`, `pinta`, `molda` e `criacao`. A galeria comprada continua usando o catálogo. As três origens autorais resolvem o id pela conta, sem inferir posse pelo salvamento. O aconchego consulta também o histórico de aparências e não será alterado.
- `caixaDoMolda` usa 16 unidades por célula, limitada a 30 no maior lado. A frente +z já corresponde ao giro do objeto. As faces da geladeira (`pintaFrente`, `pintaLadoEsq`, `pintaLadoDir`, `pintaTopo`) e a `tela` do fliperama têm UV de 0 a 1, v para cima. Os outros moldes já declaram faces vazias.
- A visita transmite somente quais objetos estão completos. Não transmite id nem autorização para criações do irmão. Continuará com o modelo do catálogo.

## Decisões

1. Método opcional `lerAparencia(criacaoId, sinal?)`, sem subir o contrato 1 nem mudar o salvamento. Retorna bytes próprios de GLB ou PNG, ou null. O formato retornado identifica a ferramenta. A página confirma o acesso da pessoa antes de baixar e usa os exportadores existentes por importação dinâmica.
2. Tetos propostos: GLB 2 MiB, 5.000 triângulos, PNG 256 KiB e lado 192. O atlas do GLB permanece até 512. São limites técnicos desta implementação: o GLB comporta o atlas do Molda e a malha de 5.000 triângulos; o PNG comporta a planificação já usada. Validar o conteúdo, sem confiar em metadados declarados, e recusar recursos externos antes do parser 3D.
3. Encaixe com escala uniforme inversa à caixa do Molda, reduzida adicionalmente se a criação passar dos limites. Centralizar x/z e apoiar no piso, sem inverter +z. Não esticar modelos pequenos para preencher a caixa. Compartilhar a regra da escala no contrato.
4. A pintura usa recortes da planificação nas faces já preparadas. Recursos são privados de cada montagem, inclusive cópias de materiais e texturas. Trocar, desmontar e chegar depois do aborto libera tudo. O modelo de reserva permanece até o substituto estar pronto.
5. Retorno de ferramenta invalida a leitura mesmo quando o id é o mesmo. A capa de minijogo continua prevalecendo na tela do fliperama quando houver capa. Colisores, função, aquário e aconchego permanecem independentes da aparência.

## Etapas

- [x] Contrato e testes: validar bytes, PNG, GLB, triângulos, recursos externos e escala compartilhada.
- [x] Porta e testes: acesso disponível com viewer correto, download privado, id correspondente, exportação, aborto e recusas. Sem leitura de galeria de terceiros nem gravações.
- [x] Jogo e testes: carregador privado, encaixe, orientação, pintura, reserva, descarte, retorno da oficina e visitas.
- [x] Plataforma falsa e navegador: exemplos reaproveitados, falha e ausência; computador e celular, troca e retorno, prints.
- [x] Documentação, revisão completa, testes dos pacotes, typechecks e Biome. Commits e envio pelo staging com rebase.

## Pedidos de arte

Não impedem o Molda nem a pintura dos dois modelos já preparados. Para liberar também o Pinta nos demais objetos, faltam faces planas com UV de 0 a 1 nos modelos forno, aquário, lareira, banda, museu, casinha e planta-interior. Definir no Blender quais superfícies fazem sentido em cada objeto e informar suas medidas para o catálogo; nomes previstos: `pintaFrente`, `pintaLadoEsq`, `pintaLadoDir`, `pintaTopo`, somente onde houver superfície adequada. Não colocar um plano sobre folhas, vidros ou instrumentos apenas para completar a lista. Nenhum GLB ou gerador será alterado nesta tarefa.

Pedido reunido para a sessão do Blender, sem modelo novo:

| Modelo | Superfícies a preparar, se forem adequadas no modelo atual | Motivo |
| --- | --- | --- |
| Forno | Frente exterior da porta, laterais e topo da caixa | Personalizar a carcaça sem cobrir o interior |
| Aquário | Base e moldura exterior | Preservar o vidro e a visão dos peixes |
| Lareira | Moldura exterior, laterais e topo | Preservar a abertura e o fogo |
| Banda | Superfícies planas dos corpos ou da base já existente | Evitar projetar a mesma imagem sobre instrumentos de formas distintas |
| Museu | Frente e laterais da base de exposição | Preservar os fósseis e as peças expostas |
| Casinha | Paredes exteriores, com a frente em +z | Preservar a abertura por onde o bicho entra |
| Planta de interior | Somente o vaso | Preservar as folhas e o volume da planta |

Para cada superfície aprovada, informar largura e altura reais no referencial do objeto e usar
material ou nó `pintaFrente`, `pintaLadoEsq`, `pintaLadoDir` ou `pintaTopo`, conforme o lado.
UV com u para a direita e v para cima, vista de fora. Sem superfície adequada, manter o molde
sem essa face. O catálogo só deve declarar as faces efetivamente entregues e medidas.

**Entregue em 29/10/2026 (sessão do Blender, na conferência da fase3-11).** Forno: a frente da
porta, em volta do vidro (0,66 × 0,43), e os lados (0,53 × 0,72). Aquário: as duas portinhas do
móvel, uma imagem só (1,41 × 0,34), e os lados do móvel (0,55 × 0,42). Museu: a frente (0,82 ×
0,12) e os lados (0,44 × 0,12) da base de madeira. Casinha: a parede da frente com a porta (0,98 ×
0,58) e as dos lados (1,08 × 0,58). Planta: o rótulo que dá a volta no vaso, com a emenda atrás
(1,13 × 0,37; a faixa terracota passa por cima). O topo do forno ficou de fora (é a mesa das
bocas). A lareira (tijolinhos em relevo) e a banda (formas diferentes demais) ficam sem
faces, de propósito. `tests/faces-dos-objetos.test.ts` confere cada face do catálogo no GLB: o
retângulo prometido e a imagem inteira (UV de 0 a 1).

## Revisão e evidências

- A leitura dos GLBs reais mostrou que `pintaFrente` e as outras faces estão nos materiais das
  primitivas, não em nós separados. A aplicação reconhece ambos os formatos. Um teste usa a
  geladeira real para impedir regressão; a mesma regra atende à `tela` do fliperama.
- A troca tira a criação anterior do render antes de liberar seus recursos. A pintura compartilha
  somente geometria e materiais intactos do catálogo, nunca os descarta. Imagens decodificadas
  também são fechadas em resultados atrasados. A visita não aplica nem a criação nem a capa
  de minijogo da pessoa que visita na casa alheia.
- Testes dos três pacotes, typechecks e Biome dos arquivos alterados conferidos. O Biome completo
  aponta formatação preexistente em `packages/arquipelago/arte/ilhas-b/relatorio.json`; não foi
  corrigida porque esta tarefa não altera arte. O teste opcional de Postgres do jogo permanece
  ignorado, sem conexão a banco remoto.
- Verificador em computador 1280 × 720 e celular emulado 390 × 844, com movimento reduzido e
  SwiftShader: colocar, Molda, Pinta, trocar, reeditar o mesmo id, galeria, falha e método ausente.
  Nos dois casos: a diferença entre leituras publicadas e recursos liberados corresponde à única aparência em uso,
  nenhum erro de página. Evidências em `docs/qa/2026-10-29-molda-no-mundo/`.
- Nenhum GLB, gerador, banco, `.env`, workflow ou formato de salvamento alterado. A prova de
  navegador usa plataforma falsa; a exportação nativa real do Molda e as recusas da ponte são
  cobertas nos testes da plataforma. Aparelho físico e leitura autenticada em ambiente publicado
  não foram usados nesta verificação local.
