# Caminhos: conformação de modelos e picking atualizado

18/11/2026. Primeiro recorte de **6.2**, após o fechamento de 6.1 em `b9486ebb9`. O lote 6 e a integração visual continuam abertos.

## Implementado e conferido neste recorte

O recorte de piso foi extraído para `recortarMalhaNoChao`, reutilizando o cálculo numérico já compartilhado com o Molda. Assim, pisos nativos e peças de catálogo passam pelas mesmas células, diagonais, máscaras, recortes, cobertura e limites. A operação conserva a altura local e os atributos do modelo; a conformação aplica o relevo depois. A validação de atributos/índices agora é compartilhada e recusa comprimentos não finitos antes de percorrer uma fonte.

As faces verticais precisam de cuidados que a faixa plana não exigia: a divisa de células não pode duplicar uma parede, e a diagonal interna da triangulação de um lago não pode conservar uma face dentro do recorte. Os testes reproduziram e conferiram esses casos, preservando a face que fecha uma margem real.

`conformarParteAoChao`, no motor, trabalha sobre uma cópia da geometria. Combina a transformação da peça e do caminho, respeita `drawRange` de cada material, mantém UV/cores e acrescenta a altura do campo sem achatar a espessura original. Normais e tangentes acompanham a deformação. Nenhum material, textura ou buffer do acervo é modificado ou descartado por esse adaptador.

Alterações de altura podem atualizar uma região sem refazer topologia, UV ou identidade da geometria. Os dados são conferidos antes de escrever, para uma altura inválida não deixar uma atualização parcial. Mudanças de máscara, cobertura ou recorte exigem novo preparo da topologia; não devem ser enviadas como simples atualização de altura.

O picking compartilhado recebeu invalidação explícita da geometria cujo dono revisou posições. Isso descarta somente seu snapshot espacial e atualiza os limites das instâncias afetadas. O teste confirma que desenho e seleção encontram a nova altura, sem uma árvore antiga de colisão/seleção e sem alterar buffers de desenho. O gerenciador de Caminhos deverá chamar essa invalidação após atualizações positivas do adaptador.

## Verificação local

- Núcleo: **261 testes / 10.145 asserções**, sem falhas.
- Motor: **104 / 3.456**, sem falhas. Inclui conformação, grupos de material, UV/cores/tangentes, atualização parcial, erro atômico, superfície vazia, picking e descarte.
- Oficina: **96 / 610**, sem falhas.
- Consulta de superfície do Molda: **4 / 7.916**, sem falhas, incluindo comparação com o Raycaster nativo e revisão explícita.
- Tipagem de núcleo, motor e oficina, Biome e diff conferidos.
- Build e regressão dos três workers compilados no Chrome local passaram, sem erros. O chunk do motor ficou em 857,55 kB, 230,59 kB gzip, mantendo o aviso de tamanho já registrado.

## Ainda pendente em 6.2

Os componentes acima **ainda não estão ligados a um gerenciador de Caminhos no Palco**. Não representam uma nova ferramenta visual ou um caminho acabado na Faísca. Seguem pendentes: montagem/encaixes de módulos reais ao longo das curvas, juntas, materiais/depth, desenho e seleção por caminho/parte, conformação das tampas dos pilares, fontes de colisão do Testar, carregamento/reentrada/descarte e ensaio com modelos reais. Antes de mudar topologia em gestos, preparar a nova geometria; antes de consultar geometria atualizada, invalidar seu índice.

Depois de 6.2 ainda faltam pontos/prévia/worker/autoria (6.3), interface (6.4) e fechamento técnico/jogável/visual do lote (6.5). Sem aceite artístico, sem homologação em aparelhos físicos e sem validação antecipada de implantação.
