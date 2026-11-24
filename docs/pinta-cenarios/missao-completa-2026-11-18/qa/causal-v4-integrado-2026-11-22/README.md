# Revisão integrada da fila causal V4 — 22/11

O [índice](index.json) identifica a revisão de cada ensaio e os hashes dos recibos
comprimidos e originais. As fontes Git são o corte integrado `3ecd92a04`, que
incorpora a staging `c4c7d15e9`. Os testes completos do Pinta pertencem ao corte
anterior `e1deb37ad`; não qualificam as alterações posteriores de paletas,
biblioteca do Estúdio ou do módulo Python fornecido.

| Recorte executado | Resultado |
| --- | --- |
| Pinta completo em `e1deb37ad`, com os três destinos Python nativos instalados | 2.874 testes, 38.383 asserções, zero falhas |
| IndexedDB real em Chrome, mesmo candidato | Sete ensaios: abort atômico, unidade selada, três edições pendentes, recuperação terminal, outra aba, download original offline e documento regional nativo 8/físico 3 |
| Sincronização de paletas, correção de respostas tardias na mesma sessão | 80 testes, 455 asserções; limite entre abas descrito abaixo |
| Admissão PNG 5 e biblioteca pessoal protegida | 26 testes, 153 asserções |
| Admissão: campos enumeráveis da referência | Dez testes, 46 asserções |
| Core completo depois da integração de staging | 3.260 testes, 211.177 asserções |
| Jogadores JavaScript, cache e controles legados após integração | 26 testes, 188 asserções |
| Geradores Core/regional e tipos completos Studio/Pinta | Saída zero nas revisões indicadas |

A V4 conserva os recursos observados por cada edição, incluindo destinos
transitivos de portas, na mesma autoridade transacional e no orçamento existente.
As provas independentes de perda reproduzida e recuperação estão no
[relatório do cliente causal](../../../revisao-2026-11-18/qa/nuvem-causal-cliente/README.md).
O download original de filas anteriores continua disponível offline; não é
apresentado como backup completo quando faltam recursos históricos.

A revisão seguinte encontrou uma corrida **ainda aberta neste corte** na
biblioteca de paletas: duas abas do mesmo perfil podem aplicar respostas de
revisões diferentes usando marcas em memória independentes. Os testes de uma
sessão aprovados não demonstram proteção entre abas. O conserto exige autoridade
durável para conteúdo, revisão e encarnação no mesmo commit, com novo negativo
reproduzível. Não promover o candidato enquanto esse critério estiver aberto.

PNG 5, documento nativo 8, físico 3 e cena 4 continuam privados. O prefixo
protegido da biblioteca preserva o PNG original diante do escritor antigo; isso
não habilita sincronização, publicação ou os carregadores públicos do Estúdio.
O ciclo autenticado causal em staging, a distribuição do novo módulo Python,
os catálogos, os exportadores regionais e o percurso completo da Vila e Floresta
permanecem fora desta prova. Nenhuma flag foi ativada por estes testes.

Tudo foi executado nesta máquina. IndexedDB real em navegador está separado dos
testes com armazenamento controlado. Não houve ensaio com crianças, aparelho
físico adicional, queda de energia ou esgotamento físico do disco.

Para conferir os recibos e as fontes Git sem executar novamente as suítes:

```powershell
python docs/pinta-cenarios/missao-completa-2026-11-18/qa/causal-v4-integrado-2026-11-22/verificar.py
```
