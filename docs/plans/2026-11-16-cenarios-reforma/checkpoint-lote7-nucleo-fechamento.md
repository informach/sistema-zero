# Lote 7.1 — Revisão e fechamento do núcleo

18/11/2026 · continuidade de `a604ba002`. **7.1 implementado, testado e revisado no núcleo/persistência. Lote 7 aberto. Próxima parte exclusiva: 7.2, helpers e câmeras no palco.** Não há entrega visual nova concluída por este recorte.

Os [contratos, consultas e fragmentos](checkpoint-lote7-contratos-consultas.md) foram revistos com o plano normativo. Posição/giro/chão, formas de zona, controles locais de rota, alvo de câmera/foco, propriedades, início principal, referências de panorama e orçamentos usam o documento e os comandos existentes. Foram conferidos replay, inversão, ausência de mutação, associação externa na cópia e referências internas na colagem.

## Vínculos concluídos na revisão

A associação de um marcador é metadado, não posse. O helper `comandosParaSoltarAssociacoesDeMarcadores` prepara a liberação dos marcadores que permanecem quando seu objeto é removido. Posição, configuração e propriedades são conservadas. A liberação usa uma intenção `marcadores.desassociar` no mesmo lote de comandos, com validação de cadeados no servidor. Seiscentas associações usam um comando, sem exceder o teto de comandos nem gravar revisões intermediárias. Uma trava no último marcador recusa o lote inteiro, preservando o documento original. A interface fará essa chamada no fluxo de remoção da parte 7.4.

Marcadores podem associar objetos ou raízes de conjuntos. A expansão física de um conjunto não apaga sua identidade autoral: a validação interna da expansão mantém o conjunto de identidades já conferido na raiz. Esse contexto não é opção pública nem pode ser fornecido por pedidos HTTP. Não foi omitida a validação dos marcadores, das definições ou dos recursos. A colagem remapeia a associação para a nova raiz.

O teste do PostgreSQL passou também pela remoção do objeto associado, conservação das propriedades e desfazer após reabrir o serviço. O marcador e o objeto voltaram com a associação original. Não houve nova migração SQL ou armazenamento paralelo.

## Verificações locais

| Verificação | Resultado |
|---|---|
| Núcleo completo | 294 testes, 10.294 asserções, sem falhas |
| Motor completo | 126 testes, 3.784 asserções, sem falhas |
| Oficina e hosts | 101 testes, 652 asserções, sem falhas |
| Members serviço, HTTP e histórico | 51 testes, 244 asserções |
| PostgreSQL real | 41 testes, 369 asserções |
| Tipagem | núcleo, motor, oficina e Members aprovados |
| Build da oficina | aprovado; permanece o aviso de chunk acima de 500 kB |
| Regressão dos workers compilados | terreno, PNG 16, água e caminhos sem erros |
| Biome/diff | arquivos alterados conferidos |

As provas são de núcleo, serviço e regressão técnica local. Os testes matemáticos não substituem a instalação de geometria, picking, câmeras e controles visuais. Não há nova captura de ferramenta Jogo/Luz pronta, aceite artístico, homologação de dispositivos físicos ou implantação remota neste recorte.

## Continuação

Somente 7.2 a seguir: instalar o desenho/seleção de marcadores, zonas e rotas, câmeras, réguas/referência de escala e visualização das fontes reais de colisão. Reutilizar os gestos de pontos e a seleção/organização existentes. Depois, 7.3 aplica luz/céu/névoa e 7.4 fornece os controles. O lote 7 só fecha com sua revisão 7.5.

Lotes 0–6 permanecem fechados localmente. Lotes 8–10, composição final da Faísca pela ferramenta, full review, CI, implantação e validação em staging continuam pendentes.
