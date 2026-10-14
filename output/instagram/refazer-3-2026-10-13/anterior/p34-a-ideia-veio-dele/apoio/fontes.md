# Fontes e produção do P34

Produção em 13/10/2026. Segundo carrossel na ordem editorial; P33 e P16, publicados em outros formatos no planejamento, ficam antes dele na fila geral. Nenhum conteúdo foi publicado.

## Depoimento e retratos

- Fala: “Eu quero mudar isso aqui no jogo.” Daniel conta uma fala de Rafael. Não apresentar o trecho como gravação direta da criança.
- Recorte: 28,58–30,22 s de `C:/Users/tocha/Downloads/Isso trouxe para o meu filho organização, lógica e criatividade _ Daniel, PCD.mp4`.
- A ideia do slide 2 está no mesmo contexto do relato, entre 25,26 e 37,08 s: criatividade, vontade de mudar e conversa sobre como o jogo poderia ser. Não foram acrescentados resultados escolares, clínicos ou uma criação específica ao relato.
- [Registro dos relatos](../../../destaques/avaliacoes/fontes-dos-relatos.txt), AV11/I03. Conferência de transcrição em `output/instagram/avaliacoes/2026-10-09/fontes/daniel-beneficios-conferidos.json`.
- [Daniel, quadro aos 12 s](daniel-12s.png) e [quadro aos 45 s](daniel-45s.png), extraídos anteriormente do vídeo fornecido pelo usuário. Fotografias originais, apenas enquadradas pela montagem.
- [Rafael](rafael.webp): retrato da oferta em `packages/funnel/public/img/desafio-primeiro-jogo/depo-rafael.webp`. Uso pequeno, respeitando a resolução disponível de 160 × 160. Não foi gerada outra identidade nem uma cena de atividade atribuída a ele.

## Jogo

- Base oficial: `packages/studio/src/official-extensions/game-2d-advanced/examples/quebraBlocosExample.ts`.
- Runtime oficial: `gameKitRuntime`, da extensão Jogo 2D Avançado.
- [Projeto original](quebra-blocos-original.json) e [variante mais devagar](quebra-blocos-mais-devagar.json): a única alteração nas regras é reduzir a velocidade inicial da bola à metade. Blocos, raquete, ponto inicial e demais regras são iguais.
- [Registro da execução](captura-real.json): dois intervalos de 500 ms, 31 quadros observados em cada execução, sem erros. A pequena diferença de fase entre quadros é registrada nas posições, sem alterar a conclusão da comparação.
- Os rastros sobrepostos usam a posição inicial e a posição registrada da bola. A ampliação gráfica abaixo compara os comprimentos de forma aproximada, arredondados à relação de duas vezes. Não é um controle da plataforma. As capturas do jogo permanecem originais em `jogo-original.png` e `jogo-mais-devagar.png`.
- A legenda pública informa que esta é uma demonstração preparada pela equipe e não um projeto atribuído a Rafael.

## Ilustração e arquivos

- Uma ilustração editorial gerada pelo image_gen incorporado, usada no slide 3 e no convite do slide 6. [Prompt](prompts.md). Não representa uma criação atribuída a um aluno.
- Tipografia Nunito, licença OFL em [LICENSE-Nunito](LICENSE-Nunito).
- Artes: seis PNGs 1080 × 1350. Montagem editável em `../montagem.html`; legenda e texto alternativo na pasta principal.
- Scripts reproduzíveis: `output/instagram/p34-2026-10-13/preparar-captura.ts`, `capturar-jogo.mjs` e `montar-carrossel.mjs`.
