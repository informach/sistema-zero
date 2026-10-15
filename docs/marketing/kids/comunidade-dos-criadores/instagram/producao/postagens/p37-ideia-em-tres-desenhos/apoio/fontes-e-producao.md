# P37 · Uma ideia em três desenhos

Produzido em 14/10/2026. Sete slides, 1080 × 1350. Copy e legenda preservadas integralmente da [ficha vigente](../../../../postagens/09-p31-a-p40.md#p37). Paleta e tipografia seguem as peças aprovadas: azul, branco, amarelo e Nunito 600/800.

## Fotografias e progressão

Cinco fotografias novas, geradas com a ferramenta nativa `image_gen`. A menina é fictícia; mãos, roupa, mesa e folha mantêm continuidade. Não são fotos de uma aluna, depoimento ou prova de autoria do jogo. Os [prompts completos](prompts.json) e o [registro das imagens geradas](imagens-geradas.json) estão nesta pasta.

1. Capa: mão sobre o quadro central ainda vazio.
2. Primeiro quadro: personagem no início.
3. Segundo quadro: um obstáculo escolhido.
4. Terceiro quadro: chegada à bandeira.
5. Fechamento: três partes marcadas, com o teclado ao lado.

As cenas no papel dão continuidade à ideia visual. O exemplo da plataforma é da equipe e não é atribuído à menina.

## Jogo e blocos reais

Fonte: `packages/studio/src/official-extensions/game-2d-advanced/examples/mundoPirataProfissionalExample.ts`. Projeto exportado pelo gerador atual e executado com o runtime atual da plataforma. Capturas locais com Playwright, sem editar dados de usuários ou o código do aplicativo.

- Slide 5: duas capturas ampliadas. O inimigo dente se aproxima do herói; em outra parte, o canhão produz uma pérola. A primeira captura mostra a velocidade negativa correspondente à direção visível. As capturas dos blocos são recortes do programa, não o algoritmo completo. A condição completa de perseguição também foi preservada em `blocos-enemy.png` para consulta.
- Slide 6: bandeira e área de chegada; abaixo, a criação da região fim e a condição que toca o som e muda o estado para vitória. O rodapé de edição do bloco condicional fica fora do recorte; a condição e ambas as ações permanecem visíveis.
- A seta de direção, o círculo da pérola e o tracejado da chegada são sobreposições editoriais. A área tem x=1560, y=250, largura=90 e altura=100 no mundo do jogo.
- O casco não foi apresentado como inimigo em movimento. O exemplo mantém sua posição original nesta demonstração.

### Preparação das capturas

O herói foi colocado em pontos específicos da fase para enquadrar cada regra. Os inimigos, a pérola e a vitória foram atualizados pelo runtime; os desenhos do jogo não foram gerados por IA nem substituídos por imagens externas.

No exemplo exportado, `stateLook` registra a aparência `piratao`, mas ela não é aplicada automaticamente por `platformerAnim` nesse caminho. Na instância isolada da captura, `setEntityState` e `autoAnimate` ativaram a aparência já existente. As regras de movimento, colisão, disparo e vitória foram preservadas. Essa preparação visual não alterou o aplicativo ou o exemplo salvo no repositório. O roteiro de captura registra os comandos usados.

## Checagens

[Capturas verificadas](capturas-verificadas.json): o dente passou de x≈618 para x≈590, em direção ao herói em x=490; a pérola existe e tem velocidade -150; a entrada na região fim fez aparecer “Bandeira conquistada!”.

[Blocos capturados](blocos-capturados.json): tipos, texto e dimensões dos elementos reais. [Verificação de montagem](verificacao.json): copy comparada à ficha, fontes carregadas, imagens carregadas, limites dos sete slides e prévia móvel. [Conferência da entrega](entrega-verificada.json): dimensões, arquivos e links locais.

Reprodução da produção: scripts em `output/instagram/p37-2026-10-14/`. `montagem.html` é independente dos scripts e usa apenas os recursos locais desta pasta. Textos e tipografia são aplicados em HTML/CSS; os detalhes do jogo são recortados por viewports SVG, sem redesenhar o produto.

Nenhum material foi publicado, agendado ou enviado por mensagem. Sem ZIP.
