# Lote 6 — Contratos de dados: recorte parcial de 6.1

18/11/2026. Base anterior: `80f2bdefc`. **6.1 continua aberto.** Este recorte define dados e validação; não entrega geometria nova, apoio em estruturas, gesto ou interface de Caminhos.

`CaminhoSchema` agora distingue trilha, praça, estrada, cerca, muro e ponte. Trilhas/praças existentes conservam seus campos e valores; os dados convertidos da Faísca passaram novamente nos testes. Cada variante aceita somente seus parâmetros: molde da estrada; altura/comprimento dos módulos; duas cabeceiras, cotas, espessura, guardas e pilares da ponte. Medidas são finitas, limitadas e em metros.

Suavização, fechamento, aparência e colisão são explícitos. Caminho fechado precisa de três controles; praça exige contorno; ponte aceita duas cabeceiras e não recebe uma curva fechada/suave ignorada pelo compilador. Encaixe de catálogo contém eixo/base/piso locais, sem inferir orientação do nome de arquivo. Ponte GLB exige o piso local nas cabeceiras, evitando alinhamento silencioso pelo pivô ou pelo pé dos pilares. Encaixe sem modelo é recusado.

Material reutiliza o contrato de aparência dos objetos. Textura precisa existir na tabela; remoção de textura em uso é recusada e substituição respeita o cadeado do caminho, como já ocorre com objetos. Modelos e organização continuam passando pela validação existente.

Seis testes novos/27 asserções cobrem as variantes, dados legados, parâmetros, valores inválidos, referências e travas. Quatro testes iniciais falharam antes da união nova; testes adicionais reproduziram referência de textura ausente e substituição que precisava respeitar a trava. Após as correções: núcleo 212 testes/8.517 asserções; motor 98/2.800; oficina 93/599; conversão 2/3.130. Tipagem do núcleo, motor, oficina, Members e member-shell aprovada.

PostgreSQL real: 39 testes/349 asserções. O caso novo persiste as seis variantes com material/parâmetros, confere JSONB, repetição da operação, replay, reabertura e undo/redo. Nenhuma migração SQL foi necessária.

Próximo, ainda em **6.1**: operações preparadas e orçamento antes de alocar, geometria compartilhada com piso/recortes, módulos/perfil e apoio em superfícies de estruturas, referências e transferência dos caminhos. Só depois vêm o desenho no palco, a edição visual e a aba. Não há nova prova visual ou aceite artístico nesta alteração de contrato. Lotes 7–10 e validação remota continuam pendentes.
