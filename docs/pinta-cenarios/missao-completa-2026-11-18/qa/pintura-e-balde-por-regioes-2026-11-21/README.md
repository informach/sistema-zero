# Pintura e balde por regiões

O lápis, a borracha e a pintura em lote existentes aceitam o modelo por regiões,
com coordenadas negativas, giros preservados, bloqueios herdados e um único
valor de histórico. A edição reutiliza a admissão atômica e o orçamento global
dos chunks; repetir a mesma operação não cria alteração. O lote mantém o
recorte fora do mapa e recusa trabalho acima do orçamento.

O preenchimento usa um algoritmo comum às grades densas e esparsas. Ele coleta
as mudanças antes de aplicá-las e visita no máximo 65.536 células por gesto.
Um mundo vazio de 10.000 × 10.000 é recusado sem materializar seu retângulo.
Áreas pequenas usam no máximo 64 KiB de marcação; áreas grandes mantêm apenas
as posições visitadas. Esse valor não representa o consumo total do processo.

O ensaio encontrou também um defeito anterior: coordenadas fracionárias podiam
endereçar outra célula e fazer o balde denso entrar em laço infinito. O caminho
de `59c562ac8` foi executado diretamente num processo isolado e não terminou
no prazo externo de dois segundos; a versão corrigida recusou o mesmo ponto,
preservando o mapa e o histórico. Isso não afirma que a interface atual emita
esse ponto. `pinta-bucket-boundary-proof.json` conserva os dois resultados.

Passaram **2.305 testes completos do Pinta**, com três controles Pygame ignorados
nessa execução e aprovados separadamente com Python real. Passaram os **56 casos
focados**, os tipos completos de Pinta/Estúdio e **12 fluxos locais de navegador**,
sem falha, skip ou flaky. A primeira checagem de tipos encontrou uma anotação
ausente no teste de bloqueio; a correção emite JavaScript idêntico. Os recibos
preservam essa tentativa e as execuções seguintes. Depois da otimização, a suíte
completa, tipos e navegador foram executados novamente.

Medição isolada em Bun 1.3.11, nesta máquina Windows: cinco aquecimentos e 30
execuções intercaladas por versão, com resultado idêntico e mapa inicial intacto.
No caso denso 256 × 256, o runner reproduzível registrou medianas de **2,96 ms
antes e 2,15 ms depois**; p95 de 3,61 ms e 3,31 ms. A primeira implementação com
Set em todos os casos era mais lenta; seus resultados também foram mantidos.
Não são medições de FPS, navegador, GPU, memória de pico ou outros dispositivos.
Reproduzir, com o histórico Git disponível e sem outras cargas de QA:

```powershell
bun --no-env-file packages/pinta/scripts/qa/bucket-regions.ts minha-medicao
```

Escolha um rótulo novo em cada execução; o runner preserva os arquivos anteriores.
O modelo por regiões continua fora da UI e dos escritores: formato nativo 8,
persistência 3 e consumidores restantes ainda precisam de integração. Nenhum
componente visual foi alterado e esta prova não representa deploy ou login em staging.
