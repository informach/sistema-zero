# Lote 7.4 — Base dos formulários e posse da edição

18/11/2026. **7.4 permanece aberto; não há novos painéis concluídos neste checkpoint.** Recorte preparatório implementado, testado e revisado antes de ligar os formulários à interface.

- Adaptadores criam descritores reais para início, ponto, zonas em caixa/esfera/polígono, rota, câmera, régua, referência humana e luz pontual/foco. Respeitam posição fornecida e altura de referência; nomes não determinam função.
- Trocar o início principal gera um lote atômico e reversível, conservando travas. Guardar um marcador idêntico não gera comando/revisão desnecessária. Trocar apoio no chão conserva a posição mundial.
- Propriedades possuem conversão explícita entre linhas do formulário e os tipos já existentes: texto, número, booleano. Recusam chaves duplicadas, números vazios/não finitos e tipos inválidos. Usam os comandos normais de cada entidade, sem substituir sua pose.
- A captura de pontos compartilhada distingue Caminhos e Jogo. Uma limpeza do painel inativo não remove a captura do outro; callbacks informam o dono. O motor de gestos continua sendo o mesmo.
- A projeção de metadados distingue donos Jogo/Luz. Um painel não encerra ou substitui a prévia do outro. Enquanto a prévia está ativa, outras ferramentas de gesto são recusadas.

Verificação: motor **149 testes / 3.961 asserções**, oficina **107 / 725**, sem falhas; tipagem e build pertinentes aprovados, permanecendo o aviso de chunks acima de 500 kB. No Chrome, o teste de gestos manteve a captura de Jogo após um cancelamento de Caminhos; o ensaio de iluminação comprovou por capturas idênticas que um encerramento do dono errado preserva a prévia. Captação de água/pontos concorrente foi recusada. As regressões desses ensaios passaram sem erro.

Próximo recorte exclusivo: hooks de rascunho, preparação e guarda; em seguida componentes e integração dos painéis, seleção/clipboard e QA nos quatro layouts. Nenhum item do checklist integral 7.4 foi fechado por esta base isoladamente. Lote 7 e encerramento global continuam pendentes.
