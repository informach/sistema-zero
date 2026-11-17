# Lote 3.3 — Referências e preservação de texturas

17/11/2026 · staging · recorte interno do lote 3, ainda aberto.

O documento agora pode fixar texturas de biblioteca por digest e associá-las à aparência dos objetos, com repetição em metros e tonalidade independente. Comandos, validação e inversão contemplam referências ausentes, duplicadas e bloqueadas. Não há URL temporária no arquivo autoral.

O serviço e a transação exigem arquivo confirmado no espaço do cenário com o papel `textura`. Um arquivo de modelo, miniatura ou outro espaço é recusado. A conferência transacional cobre o desaparecimento do arquivo após a validação inicial. Head, revisões, lotes, inversos e restaurações conservam o binário mesmo depois de apagar a biblioteca; apagar o último cenário libera o recurso sem referências. A memória de ensaio segue o mesmo contrato de histórico.

O host oferece leitura binária cancelável, limitada a 4 MiB, pelo endereço autorizado existente. O download não encaminha credenciais da sessão ao armazenamento. Referências históricas continuam legíveis depois da exclusão da biblioteca. Não houve mudança de schema SQL nem nova política de acesso.

## Verificação e revisão

- Núcleo: 108 testes, 3.181 asserções, nenhum erro.
- Oficina: 43 testes, 288 asserções, nenhum erro.
- Postgres 17 descartável, porta 55439: 20 testes, 149 asserções, nenhum erro. Inclui histórico, undo, duplicação, isolamento de espaço, papel do arquivo e exclusão concorrente antes da transação.
- Tipagem do núcleo, oficina e Members: aprovada.
- Revisão conferiu os dois caminhos de GC: extração dos candidatos e proteção de referências ainda vivas. Ambos incluem as novas texturas e as restaurações de documento.

Ainda falta ligar essas referências ao loader, aos materiais 3D e ao painel Aparência. Este registro não comprova aplicação visual de texturas, não fecha a parte 3.3 nem o lote 3. Os ensaios visuais ocorrerão após essa integração. Implantação e validação de staging permanecem no encerramento global.
