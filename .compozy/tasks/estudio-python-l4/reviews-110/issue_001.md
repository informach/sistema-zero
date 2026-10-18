---
status: resolved
file: packages/studio/e2e-python-editor/live-performance.spec.ts
line: 30
severity: medium
author: claude-code
provider_ref:
---

# Issue 001: Pixel esperado não admite antialias da linha editada de1px

## Review Comment

A fase edited substitui a fonte por turtle.forward(60) sem definir pensize. O padrão real é1px; renderer.paint usa fundo branco, translate(width/2,height/2) e stroke no y0. Com centro inteiro, essa linha cobre metade dos pixels das duas linhas rasterizadas: o pixel amostrado pode ser cinza RGB127 em vez de preto RGB<80. Assim, o diagnóstico espera30s e falha mesmo quando a nova geração apresentou o desenho correto. A fonte baseline turtleDrawing usa pensize6 e não tem essa borda.

Prova independente leve, sem browser: @napi-rs/canvas1.0.0 instalado (Skia), com exatamente as operações do paint para canvas400x300, fundo branco, translate200/150, lineCap/lineJoin round, path0,0→60,0. Para largura1/preto, pixel225/150=[127,127,127,255] e o predicado atual=false; controle largura6/vermelho produz[255,0,0,255]. O comando Bun puro terminou exit0. Isso prova o falso negativo da assertiva raster, não uma falha do programa/runtime nem desempenho em Chrome/Edge.

Tornar a fonte QA editada explícita quanto à espessura (pensize6, como a baseline), preservando o predicado estrito sobre pixels reais e a espera da retirada do iframe antigo. Não alterar o renderer/produto nem relaxar o tempo/assertiva para esconder esse falso negativo.

Esclarecimento de escopo acordado com o implementador: a duração inicia antes do click Executar/Reiniciar e termina no desenho útil; o contrato após pequena edição não inclui tempo de digitação/pensamento. Título/receipt devem chamar essa medição click→drawing após editar. Cada fase tem uma amostra; actores/storage controlados, sem rede/vídeo/30amostras/controle de cachesOS. A prova ainda não executada não deve ser chamada qualificação de desempenho.

## Triage

- Decision: `VALID`
- Notes: VALID/resolved para o falso negativo específico. Fonte editada agora explicita turtle.pensize(6), mantendo o predicado RGB<80/alpha255 e a espera de desconexão do iframe anterior. Título e scope dizem execute/restart click→first useful pixels, com edição já aceita antes do clique. Probe independente repetível .cache/review110-live-pixel.js passou exit0: before1px[127,127,127,255], fixed6px[0,0,0,255], baseline6pxred[255,0,0,255]; três assertivas nativas preservam a comparação estrita. Implementador repetiu a mesma prova e conferiu renderer. Ainda pendentes browser desse diagnóstico, TSC das últimas fontes QA e replayCI; não aprovar desempenho nem considerar a leitura equivalente a esses testes. Falha de p95 Edge3130,1>3000 na suite runtime em andamento é evidência separada real e deve permanecer falha, mesmo com CPU externo87–93%; nenhum threshold foi alterado pelo revisor. Nenhuma fonte de produção ou teste permanente alterada pelo revisor; nenhuma prova pesada executada.
