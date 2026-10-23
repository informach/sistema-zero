# F2 — Composição compartilhada

Review realizado antes da integração de pedidos do lote F3.

As três receitas usam um componente Remotion mantido. Detalhe/contexto aproxima a região e revela a imagem inteira; regra/resultado e comparação preservam ambos os estados e mudam o destaque temporal. A animação é uma função do frame local, sem relógio independente, estado acumulado ou interpolação fictícia do jogo.

Achados corrigidos no review:

- Foco normalizado aplicado a uma caixa com letterboxing ficaria desalinhado: o contrato inclui dimensões reais, validadas contra o manifesto, e o componente calcula o encaixe contain antes de posicionar o foco.
- Texto pode caber no vídeo e ainda invadir a imagem: áreas de headline/rótulo foram incorporadas à checagem de prontidão/preflight existente.
- Cena de um único frame não pode ficar presa no enquadramento inicial: esse caso apresenta o contexto completo.
- As fontes são carregadas por `Img`; mídia ausente tem erro explícito e fontes tipográficas continuam na coordenação existente. Nenhuma espera fixa foi adicionada.

Verificação: 16 testes / 70 asserções passaram (contratos, fontes, movimento, story e legendas). O teste de movimento falhou por módulo ausente antes da implementação. TypeScript de produção passou. A inspeção de frames reais/MP4 fica em F4, depois do transporte e do bundle completo; estes testes não certificam legibilidade por si sós.
