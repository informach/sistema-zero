# Caminhos: estruturas medidas e apoios

18/11/2026. Continuação exclusiva de 6.1 sobre staging `67fa30d1e`.

## Implementado, testado e revisado

- Plano numérico comum de peças para cerca, muro e ponte. As cercas/muros retos conservam as esquinas de controle; curvas suaves usam a distribuição do núcleo do Claude. Fechamento explícito evita postes duplicados na emenda.
- Tabuleiro nativo entre duas cabeceiras, guardas/postes e posições de pilares com orçamento antes de gerar as peças. Os pilares têm tipo próprio: o plano informa seu envelope, mas suas tampas ainda precisam ser conformadas às superfícies reais pelo adaptador do motor. Não tratá-los como caixas prontas sobre terreno inclinado.
- Encaixe de catálogo pelo eixo e volume medidos, piso/base locais, início/fim úteis e centro transversal. As sobras originais do GLB não são confundidas com cabeceiras. Originais não são modificados e nomes de arquivo não determinam o encaixe. Envelopes que ultrapassariam os limites do mundo são recusados antes de desenhar.
- Referencial ortonormal sem reflexão; verificação de cabeceiras também em ponte de 2 km quase alinhada a um eixo, sem aproximação angular que deslocaria o encaixe.
- Pilares adicionais em ponte GLB exigem a consulta da face inferior real já encaixada. Uma altura presumida não descreve um arco. Falta de chão/face inferior não inventa apoio e retorna aviso; o adaptador que fornecerá essa consulta física faz parte de 6.2.
- Apoios usam `apoio.tipo = objeto`, acrescentando apenas a parte estável da estrutura. O contato fica no espaço da peça; não usa índice interno de malha GLB. Gesto, largura, deslocamento de cabeceiras, cópia e histórico usam a resolução existente.
- `FonteDeAlturas.parteDoCaminho` permite consultar as mesmas peças do desenho/picking sem recalcular estruturas por objeto. Sem bytes do terreno ou a geometria necessária do pilar GLB, a projeção de dados conserva a pose gravada. A autoria por superfície exige a fonte real; não afirma que a projeção de dados tenha validado a física.
- A validação recusa parte inexistente/incompatível, parte aplicada em objeto comum, medidas ausentes e transformação resolvida fora dos limites. Remoção direta com dependente continua protegida pelo documento.
- O recorte pela oficina libera somente dependentes que continuarão na cena, usando a pose visível e respeitando bloqueios. Undo devolve caminho e vínculo. Pastas com 600 dependentes removidos não desperdiçam comandos para liberá-los primeiro. Colagem mantém o caminho selecionado pelo alvo da árvore.

## Evidência local

- Núcleo: **254 testes / 10.117 asserções**, sem falhas. Onze testes de estruturas e oito de apoios, além dos testes prévios de contratos, operações, piso e clipboard.
- Motor: **98 / 2.800**, sem falhas.
- Oficina: **96 / 610**, sem falhas; inclui recorte e reabertura do histórico, proteção de dependente bloqueado e pasta grande.
- Members, serviço/HTTP/histórico: **51 / 244**, sem falhas.
- Postgres real: **40 / 358**, sem falhas. A parte do apoio e o contato acompanham a ponte copiada em JSONB, replay, idempotência e undo/redo após reabrir.
- Tipagem de núcleo, motor, oficina, Members e member-shell passou. Biome e diff sem problemas. Build da oficina aprovado; permanece o aviso já conhecido do chunk do motor de 856,70 kB (230,42 kB gzip).
- Chrome sobre o build local confirmou os três workers compilados, criação de terreno/água e PNG 16 bits, sem erros. Trata-se de regressão local da infraestrutura existente; não é implantação ou ensaio visual de Caminhos.

## Revisão e fronteira da entrega

As correções foram conferidas antes de avançar: precisão angular do encaixe, medidas úteis em vez de somente bounding box, envelope limitado, leitura da base real de um arco, fechamento sem duplicação e consulta de uma parte sem varrer o perfil distante.

Este é o fechamento da **fundação 6.1**, não do lote 6. Os cálculos estão separados de Three e de IO. **Não há ferramenta visual de Caminhos nova entregue.** Em 6.2 faltam o adaptador GLB, conformação dos modelos/pilares, juntas, materiais/depth, desenho, picking e colisão compartilhados, descarte e ensaio visual/jogável. Depois seguem edição de pontos/worker, autoria, interface e regressão integral. A Faísca e a direção de arte não foram aprovadas por estes testes. Lotes 7–10 e implantação/validação final permanecem pendentes.
