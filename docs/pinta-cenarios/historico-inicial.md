# Registro inicial

Fotografia histórica anterior à continuação. O estado atual está no [plano](README.md).

## Estado

| # | Incremento | Estado |
|---|---|---|
| 1 | Trava de formato, só leitura | Implementado e testado localmente (17/11/2026). Sem prova em staging. |
| 2 | Declarar a versão por tipo | Implementado na branch da evolução (17/11/2026). ⚠️ Só pode ir a produção depois do incremento 1 (PR da trava). |
| 3 | Auxiliares de célula e histórico por buffer único | Implementado e testado localmente (17/11/2026). Sem mudança de comportamento. |
| 4a | Documento do formato 3: camadas | Implementado e testado localmente (17/11/2026). Sem interface ainda. |
| 4b | Documento do formato 3: objetos (formas, giro, papéis, propriedades tipadas) | Pendente. |
| 4c | Documento do formato 3: conjuntos de peças (animação, terrenos, propriedades por peça) | Pendente. |
| 4d | Documento do formato 3: conjuntos reutilizáveis | Pendente. |
| 5 a 14 | Ver a tabela do plano abaixo | Pendentes. |

### Incremento 1: o que foi provado e o que não foi

- **Provado por teste local** (`bun test`, happy-dom): um item da conta com versão acima do teto
  não desce na reconciliação, não vira cópia na base vencida, não é restaurado no DELETE recusado
  e não recebe a cópia local por cima; o aviso aparece e some; a galeria mostra o recado e o botão.
  Suítes inteiras do Pinta (1.677 testes) e do member-shell (2.463) passam; tipagem dos dois aprovada.
- **Não provado:** o comportamento contra o Members real (a recusa `CREATION_CLIENT_OUTDATED` na
  reserva e no DELETE), em navegador e em staging. O aviso da galeria não foi fotografado.
- **Risco residual conhecido:** o envio de desenho numa aula (`pinta-submission`) não tem trava de
  formato, e o Members saneia esses envios com a cópia do Pinta que ele embute. Mapas não são
  oferecidos nas aulas hoje.

### Incremento 3: o que entrou

- `packages/pinta/src/tiles/cell.ts`: a célula do mapa guarda a peça (bits 0 a 11) e como ela
  está virada (bits 12 a 14, os mesmos do Tiled), dentro do `Int16Array` que já existia. Mapa sem
  peça virada tem os mesmos números de antes. Quem lê o índice da peça (achatar, peça do topo,
  remapear ao inserir ou tirar peça, os dois exportadores de imagem) passou a ler por `cellTile`.
- `tiles/cellAccess.test.ts` lista os oito arquivos que indexam células e reprova um arquivo novo.
- Histórico do editor (`core/history.ts`, `sharedOf`): as células de cada camada contam uma vez
  enquanto algum passo as segura. Antes cada pincelada num mapa de 16 camadas custava as 16; agora
  custa a camada tocada. Medido no teste: 20 passos onde antes cabiam 2, no mesmo orçamento.
- **Limite conhecido:** o exportador de imagem para o Pygame (dados versão 1) ainda não leva o
  giro da peça: ela sai desvirada. Entra com a versão 2 dos dados, no incremento 9.
- Nenhuma ferramenta escreve os bits de giro ainda, então não há o que ver no navegador.

### Incremento 4a: o que entrou

- **Camadas** (`packages/pinta/src/core/project.ts`): grupo (`kind: 'group'`, lista plana com
  `parentId`), cadeado, opacidade, deslocamento, parallax, propriedades de camada e camada de
  colisão. Tudo opcional e omitido no valor padrão. `effectiveLayer` soma o que os grupos em volta
  impõem; achatar, a peça do topo e os exportadores já respeitam grupo escondido.
- **Tetos em dois níveis:** `PINTA_MAP_FORMAT_LIMITS` é o que o documento aceita LER (256 × 256,
  32 camadas, 256 peças, 2 milhões de células); `PINTA_LIMITS` continua sendo o que o editor deixa
  CRIAR (128 × 128, 8 camadas, 64 peças). O editor só sobe quando o desenho por área visível e a
  entrega ao Estúdio estiverem prontos.
- **Carimbo `schema: 3`** entra sozinho quando o mapa usa algo do formato e sai quando deixa de
  usar. Um código que não conhece o número não lê o mapa.
- **Envelope do `.pinta.json` na versão 3** só quando algum mapa precisa. Mapas acima de 128 × 128
  viajam com as células compactadas (`cellsPacked`, `tiles/cellCodec.ts`); os demais, com a lista
  de números de sempre, para o texto guardado não mudar.
- Um serializador só para a camada de peças (`tileLayerToWire`), usado pelo wire, pelo arquivo e
  pelos construtores de modelo.
- Testes: `core/mapFormat3.test.ts` (19 casos). Suíte do Pinta: 1.710 testes, sem falha.

**Ensaio de frota mista** (script descartável, 17/11/2026): o Pinta da `staging` em `237dc979`
lendo um mapa do formato 3 com 13 camadas.

| Caminho | Resultado no Pinta antigo |
|---|---|
| Registro direto (o IndexedDB do mesmo aparelho) | Lê e CORTA: sobram 5 das 13 camadas. |
| `.pinta.json` versão 3 (o que desce da nuvem, o backup) | Recusa o arquivo inteiro com recado. Nada é gravado. |

Ou seja: pela nuvem o mapa novo está protegido de um cliente antigo (ele não consegue ler para
cortar, e o servidor recusará a subida quando a versão declarada subir, no incremento 2). No
MESMO aparelho, um bundle antigo em cache ainda cortaria o registro local; não há como barrar
isso por dentro do código antigo. O que protege é a nuvem ter a versão inteira.

⚠️ **Por que o incremento 2 é obrigatório antes de qualquer ferramenta que grave o formato 3:**
no Pinta antigo, quando a subida cai em base vencida e a versão da conta não pode ser lida, o
código antigo avança a marca e sobe a cópia local por cima. Sem o servidor recusar (versão
declarada 2), um aparelho com o Pinta antigo e uma cópia velha do mapa regravaria o mapa novo. Com
a versão declarada, a reserva dele é recusada com `CREATION_CLIENT_OUTDATED`.

**Não provado:** nada disto tem interface, então não há ensaio no navegador. O Members embute o
sanitizador do Pinta para envios de aula; a suíte dele não foi rodada neste incremento.

---
