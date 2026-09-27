# Pintura de pesos: baseline CPU do lote 120

Comando: `bun scripts/bench-scene-skin-paint.ts` em `packages/molda`.
Execução em 08/09/2026, Bun 1.3.11, AMD Ryzen 5 5600G. Três aquecimentos,
dez traços medidos por caso, 32 movimentos por traço. Sem outro teste/build
concorrente iniciado por esta execução. Não é benchmark de GPU, navegador,
Chromebook ou latência completa da entrada. Processos externos não são controlados.

| Pontos / triângulos | Preparar p50/p95 ms | Primeiro contato p50/p95 ms | Movimento p50/p95 ms | Comando p50/p95 ms |
| --- | --- | --- | --- | --- |
| 1.024 / 1.922 | 0,506 / 3,913 | 2,082 / 2,419 | 0,030 / 0,071 | 1,654 / 2,235 |
| 8.281 / 16.200 | 3,509 / 6,745 | 18,456 / 25,067 | 0,027 / 0,043 | 9,984 / 14,183 |
| 131.072 / 20.000 | 79,570 / 89,124 | 34,222 / 38,817 | 0,040 / 0,068 | 178,004 / 202,062 |

O extremo respeita o orçamento de 20 mil triângulos: 10.201 pontos de superfície
e 120.871 pontos soltos, todos vinculados. O traço muda 141 pontos (128 no caso
menor); não se trata de uma superfície triangulada com 131 mil pontos. Cada linha
começa com dois ossos de força 0,5. Raio 2 em mundo, intensidade 0,25, matrizes afins.

Preparar inclui índices/referências do documento; primeiro contato inclui construção
preguiçosa do grafo; movimentos reaproveitam esse grafo; comando inclui produzir
o patch, ler/copiar linhas alteradas e validar a nova revisão. Não inclui histórico,
React, seleção por raio, desenho, transporte, autosave ou cópia da miniatura.
RSS máximo amostrado por caso: 236.929.024, 322.871.296, 583.077.888 bytes. O processo
é compartilhado entre casos e o GC não foi forçado; esses números não isolam memória
retida pelo pincel nem comprovam ausência de vazamento.

Saídas determinísticas e fonte intacta em todos os 13 traços de cada caso. SHA-256
do resultado do traço (patch + relatório), capturado antes de qualquer otimização:

- 1.024 pontos: `27fba6087dafc4695c6aadb7e4834d8d1c85c64b81635b571636fb4a3b7b5d64`
- 8.281 pontos: `a341e4ac86fa10de36e84037116f4c86c31eda70db00f7d644629324a280bfc5`
- 131.072 pontos: `a341e4ac86fa10de36e84037116f4c86c31eda70db00f7d644629324a280bfc5`

Preparação e confirmação extremas excedem 50 ms separadamente. Não somar percentis
como se fossem uma amostra conjunta. Próxima investigação: perfil CPU para localizar
o trabalho repetido de indexação/validação, com prova de comportamento e os hashes
acima preservados. Não declarar fluidez a partir do custo dos movimentos isolados.
