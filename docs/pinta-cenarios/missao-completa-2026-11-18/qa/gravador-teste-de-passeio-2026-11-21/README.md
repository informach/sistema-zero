# Destino determinístico do passeio — 21/11/2026

A CI 44864926351 de 691fb falhou num teste 3D: depois de 300 quadros a distância
era 0,2589, abaixo da expectativa de 0,5. O runtime permite sortear um destino
já dentro da distância de chegada; isso é uma escolha válida, não prova de ausência
da configuração herdada por um amigo criado durante a partida.

Um destino próximo controlado reproduziu a falha (distância zero). A correção de QA
seleciona random=0,5 somente durante os mesmos 300 quadros, depois de construir
o personagem, e restaura Math.random em finally. Preserva a expectativa >0,5.
O runtime real continua calculando destino e movimento; só o renderer da bancada
canônica é fake. O controle negativo, com passear configurado em zero, falhou como
esperado, mesmo com o destino fixo. Depois de restaurar o raio 10 passaram os
386 testes da pasta (incluindo os 17 deste arquivo), sem alterar código funcional 3D.

A correção usa a exceção de QA/CI autorizada. Não modifica física, visual, runtime,
SDKs gerados, gravador ou capacidades. A nova CI e o rollout continuam separados.
