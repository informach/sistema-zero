# Operações booleanas no Modelar

Selecionar duas peças sólidas e fechadas, na ordem base e operando. União combina seus volumes; interseção mantém a região comum; diferença subtrai o segundo volume do primeiro. A ferramenta calcula uma prévia no palco e só grava após confirmação. Cancelar não altera o documento; confirmar produz uma única entrada de histórico.

O comando converte formas paramétricas em triângulos apenas no resultado. Usa Manifold, carregado sob demanda, para calcular volumes fechados. As posições do segundo operando são transformadas para o espaço local da base. Materiais e UVs das faces de origem acompanham os triângulos gerados. O comando recusa malhas abertas, peças bloqueadas, vínculos de animação/pele/espelho e resultados vazios ou sem topologia sólida, com mensagem explicativa. Testes cobrem volume, transformação, materiais, erro e desfazer.
