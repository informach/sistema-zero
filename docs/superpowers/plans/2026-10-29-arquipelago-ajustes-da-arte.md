# Ligar ajustes da arte ao jogo

**Objetivo:** executar aj-ligar-02 a 09 sem mudar Blender, GLB, salvamento ou plataforma.

**Arquitetura:** regras puras em `sistemas/ajustes-da-arte.ts`; operações Three sem React em
`mundo/arte-animada.ts`; integração no carregador animado e componentes reutilizáveis.
Identidade estável decide fases. Materiais noturnos pertencem à cópia e são liberados ao sair.
O mixer só governa filhos, nunca o grupo com a posição marcada no mundo.

**Especificação:** pedido aj-ligar-02 a 09 e contratos de arte nos README e relatorio.json
de personagens, bichos, Lumis, festas e ilhas.

## Inventário conferido antes das alterações

- Capi, quatro bichos do Bosque, adotado, Nico, Estrelinha e Búzio já estão no mundo.
- Somente Bosque consta em `ILHAS_COMPLETAS`. Recife, Pico e Nuvens ainda não montam.
- Não há seleção de patins, montagem da Íris, pinguins, pássaros, festas ou baú animado.
  O barco estático do píer não é o `ilhas/barco.glb` nem o veículo de `movimento/barco.glb`.
- A Íris tem três submalhas `iris-cabeca_*` com B/C/D/smile. Todas precisam receber a boca.
- GLBs conferidos por GLTFLoader, inclusive clipes e caixas do pinguim em pé e deslizando.

## Execução

- [x] Regras e testes: fase por id, voo acima do chão e dos obstáculos, cápsula do pinguim,
  altura dos patins e sequência de boca por texto. Casos de pausa, fim e repetição.
- [x] Adaptador e testes com GLBs: cópia isolada, emissão dia/noite, LoopOnce no fim real,
  barco em pai separado, todos os morfos da Íris sem alterar smile.
- [x] Ligar fase nos personagens existentes e emissão dos Lumis ao mesmo ambiente da casa.
- [x] Componentes compartilhados para peças futuras e elevação visual opcional do avatar.
- [x] Sala de conferência com os mesmos componentes. Navegador desktop e móvel, GLBs reais,
  prints em docs/qa; caminhada no jogo e brilho dos Lumis da praia também conferidos.
- [x] Testes completos, tipagem, lint, revisão integral e documentação.

Envio: commit apenas dos arquivos deste lote e push em staging após essas verificações.

## Limites

Nenhum equipamento ou ilha será liberado antes da mecânica correspondente. Voo recebe o topo
dos obstáculos do lugar, não presume que uma altura fixa atravessa qualquer copa. A futura
rota de voo deverá fornecer esse teto por ponto. O colisor do pinguim pertence ao corpo dele,
nunca à cápsula da criança. Sem áudio sintetizado para o movimento da boca.
