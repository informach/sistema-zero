# Medição isolada de recursos do executor Python

Fonte de produto congelada: `a65e1f22c`. Esta branch acrescenta somente um wrapper de QA, agregação e workflow dedicado; não altera o verificador da imagem ou os critérios dos cenários. Não é uma implantação.

O workflow roda os cenários canônicos completos de `python-mission-smoke.ts`. Cada cenário continua em contêiner sem rede, raiz somente leitura, usuário da imagem, sem capabilities, um núcleo, 1 GiB e até 256 processos. O wrapper mede o cgroup do contêiner e chama o runner protegido existente, sem entregar respostas esperadas ao programa. O julgador e a confirmação de remoção continuam no processo externo original.

São coletados por cenário: duração, CPU consumida, pico de memória do cgroup, limites efetivos, eventos de OOM, resultado e limpeza. O custo do pequeno wrapper entra no pico; não é uma leitura isolada do heap do Pyodide. O agregado recusa evidência ausente, limites diferentes, OOM ou limpeza não confirmada.

O teste usa processo/interpreter novos por cenário. Não mede uma sessão quente reutilizada, RAM do computador do aluno, aula ao vivo ou aceitação de desempenho universal. A imagem é reconstruída pela receita canônica e o próprio smoke confere o perfil de validação; identidade de perfil não equivale a digest bit a bit da imagem já enviada ao registry.

Resultado: pendente da execução do workflow. O CI principal e os deploys permanecem na branch staging, sem receber essa instrumentação.
