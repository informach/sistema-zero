# Lote 228 — a oficina seguinte dentro do app, com a galeria enxergando as duas gerações

Estado: implementado, revisado e verificado em navegador real, 10/09/2026.
Fase 3 do plano aprovado. **Capacidade DESLIGADA por padrão**: nada muda para a criança
até o host ligá-la, e ligá-la depende do rollout de leitores e da nuvem entender v2.

## O problema

A oficina da geração seguinte, 159 componentes, só abria em `bun run dev` com
`?oficina=nova`, sobre um host próprio. O `MoldaApp` público não tinha uma única
referência a ela, e o `EditorScreen` despacha por `kind` — mas o documento seguinte é
SEMPRE `kind: 'model'`, então o tipo da criação não serve mais de discriminador.

Pior: uma criação da geração seguinte já aparecia no app, e aparecia como problema. O
leitor v1 varre todos os prefixos, encontra o registro de cena, não sabe lê-lo e o
reporta como "feita em uma versão mais nova do Molda".

## Decisões

- **O discriminador é a GERAÇÃO de armazenamento, não o `kind`.** Resumo com
  `formatVersion: 2` abre na oficina; textura e céu continuam nos editores deles.
- **Com a capacidade ligada, a oficina É o editor de modelos.** Abrir um modelo antigo
  por lá o promove, que é o que `openSceneWorkshop` sempre soube fazer. Sem isso, a
  oficina nova só serviria criações que ninguém tem ainda.
- **Uma lista só para a criança.** O `galleryStore` ganhou um colaborador opcional
  (`GallerySceneSource`) e continua sem saber o que é um documento de cena: ele lida com
  resumos e ids, e cada mutação vai para a persistência dona daquela criação. Nome único
  é conferido nas DUAS gerações.
- **O MESMO banco.** `storedDocumentKey` já resolve as duas gerações na mesma chave de
  criação; separá-las em bancos diferentes quebraria essa identidade.
- **Uma criação que a galeria lista e abre não é um arquivo ilegível**, mesmo que o leitor
  v1 não saiba lê-la: quem sabe é a geração dona.

## Três defeitos que só o navegador mostrou

1. **A mesma criação aparecia duas vezes**: um cartão normal e um aviso de recuperação
   dizendo "Atualize o Molda para tentar abrir". Os testes usavam persistência em memória,
   que não varre o banco, e por isso nunca viram. Corrigido com `unlistedReadIssues`.
2. **Rejeição não tratada no console a cada montagem**: a inscrição de mudanças da cena é
   assíncrona e o StrictMode desmonta antes de ela assentar, abortando a promessa.
   Cancelar não é erro; agora é tratado.
3. **O kids nem compilava com a oficina ligada.** Ao referenciar a oficina, o `MoldaApp`
   passou a arrastar o índice espacial, e o monorepo tem DUAS cópias de `three-mesh-bvh`:
   o `@react-three/drei` do kids fixa a 0.8 e o Molda usa a 0.9. Cada uma aumenta
   `BufferGeometry` com o seu próprio `boundsTree`, e a atribuição direta reprova quando a
   outra augmentação vence. Resolvido escrevendo por uma visão local, sem mexer em versão:
   o runtime continua idêntico, porque o `acceleratedRaycast` que lê o campo vem da MESMA
   cópia que o escreveu.

## Provas

- `gallerySceneSource.test.ts`, com IndexedDB real: lista as duas gerações ordenadas
  juntas e marcadas; renomear grava e avança a revisão no disco; nome único cruza as
  gerações; duplicar cria registro novo; apagar deixa lápide; a criação antiga continua
  respondendo pela persistência v1; a galeria relê quando a oficina grava.
- `MoldaApp.scene.test.tsx`, com banco injetado pelo mesmo molde de
  `setMoldaViewportFactory`: a galeria mostra as duas gerações, abrir um modelo antigo
  PROMOVE (o registro v1 sai, o de cena entra) e abre a oficina, textura continua no
  editor dela, e sem a capacidade o app nem pede o banco da geração seguinte.
- Navegador real (playground `?oficina=app`): criar um modelo pelo fluxo v1 do app abre a
  oficina já promovida; "Meus projetos" pergunta e volta para a galeria do app; as duas
  criações aparecem como cartões normais; console sem um único erro. As chaves no
  IndexedDB confirmam o desenho de segurança inteiro: `molda:scene:`, `molda:scene-summary:`,
  o original preservado em `molda:scene-originals:` e as duas lápides que impedem uma aba
  antiga de ressuscitar o registro v1.
- Integral **2.822/0**, 380 arquivos, 165,92 s, zero avisos act; tipos do Molda e do Kids,
  Biome, Vite (1,19 s) e build do Kids (3,9 s, 59 páginas) passaram.

## Limites e o que vem antes de ligar

- **Miniatura**: criação da geração seguinte aparece com o cubo de reserva. A oficina não
  grava `thumb`, e para a criança isso é uma perda visível na galeria. É o próximo lote.
- **Nuvem**: `assetToCloudJson` só serializa v1. Promover uma criação hoje a tira do
  espelho da nuvem: o trabalho continua no aparelho, mas para de subir. **Ligar a
  capacidade antes do ramo v2 da nuvem seria perder o backup da criança.**
- **"Baixar tudo"** não inclui a geração seguinte; ela tem o "Baixar projeto" próprio.
- **Ponte do Estúdio** ainda não roteia v2, e é por isso que o aviso
  "a sincronização com o Estúdio ainda não está ligada aqui" continua correto.
- Toque, tablet, leitor de tela e criança de verdade seguem sem homologação.
