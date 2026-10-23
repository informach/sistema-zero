# Sessão do documento na análise Python

Na imagem de staging `1f71cd1f4`, um projeto Python Pro criado pela conta de
teste abriu o editor e executou Turtle, mas a análise respondeu
`409 SESSION_CHANGED`. A rota exige `x-sz-session` para uma sessão Kids;
o transporte padrão da análise usava `globalThis.fetch` sem esse vínculo.
O botão de reconexão repetia a mesma recusa.

## Correção

O host do Estúdio Completo fornece `sessionFetch` à porta `language.request`
existente. A aula gravada fornece o mesmo transporte ao wrapper de ambiente,
que passa a exigir `languageRequest` e deriva o contexto da sua própria
baseline. Nas oficinas, o contexto de análise também fornece `sessionFetch`,
preservando sua fila de confirmação e a distinção entre autor e observador.

O transporte atende abertura, inicialização, comandos e DELETE de fechamento.
Não altera cookies, o guard do servidor ou as regras de acesso. O Admin usa
sua fronteira própria de sessão administrativa e não apresentou essa omissão.

## Evidência local

Os testes montam os hooks e o provider reais. A fronteira HTTP simulada recusa
o header ausente, reproduzindo a falha hospedada; nenhum interpretador ou
provedor externo é iniciado.

| Verificação | Resultado |
| --- | --- |
| Estúdio Completo | RED: 3 passam/1 falha; GREEN: 4 testes/37 asserções |
| Aula gravada | RED causal do header ausente; GREEN: 5 testes/46 asserções |
| Oficina, autor e observador | RED causal nos dois papéis; GREEN: 13 testes/74 asserções |
| Wrapper de ambiente da aula | 8 testes/59 asserções |
| Execução isolada dos três conjuntos de hooks pelo Root | 3 wrappers passaram, exit 0; não somar wrappers novamente aos casos internos |
| Biome e diffcheck dos oito arquivos | Passaram |

Os controles cobrem identidade original do documento após mudança do marcador,
encerramento por invalidação, baseline/revisão e cancelamento fora da fila live.
A tipagem completa, o CI, a implantação e a repetição da análise no navegador
continuam pendentes nesta revisão. Nenhuma homologação hospedada é herdada dos
testes inertes.
