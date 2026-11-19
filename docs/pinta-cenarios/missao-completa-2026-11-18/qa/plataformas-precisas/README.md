# Plataformas precisas — verificação local

Este lote continua a etapa 2b. [Contrato e uso](../../plataformas-precisas.md).
Não conclui a missão integral nem ativa a escrita de nuvem ou o runtime remoto.

## Resultados

| Superfície | Prova |
| --- | --- |
| Pinta completo | 2.108 testes, 23.528 asserções, 178 arquivos; sem falhas ou omissões |
| Core | 55 testes, 1.142 asserções, cinco arquivos |
| Estúdio, incluindo orçamento da galeria | 94 testes, 6.694 asserções, 12 arquivos |
| Publicação Python | 85 testes, 566 asserções; revisão anterior conservada nas recusas |
| Pinta e Phaser no navegador | Dez casos, desktop e toque emulado |
| Pinta–Estúdio, interface real com perfil local | 12 casos; inclui criar, executar, editar o cenário, atualizar e reabrir sem mudar programa/blocos |
| Pygame nativo 2.5.7 e 2.5.8 | 60 verificações em cada PNG 1×/2×, movimento portátil e 16 casos geométricos |
| Godot 4.7.2, headless | 58 verificações de apoio e 16 casos geométricos |
| Python/Wasm | 17 casos completos, incluindo PyDew Valley; duas reexecuções de plataforma acrescentaram a recusa de NaN |

Os casos internos dos wrappers do Estúdio não são somados novamente ao total.
A matriz de 16 variações é uma fixture técnica de consultas, distinta da autoria
pela interface. Cobre piso reduzido/fracionário, corpo largo, gravidade invertida,
salto por baixo, giro, espelhos, grupos, visibilidade, opacidade zero, peças fora
do retângulo nominal do conjunto, prioridade de sólidos e rampa sob teto baixo.
O editor e o jogo criado pelo botão foram exercitados pela interface com o piso
pequeno salvo no documento nativo, fechado e reaberto.

Os registros de [Pinta](pinta-completo.log), [Core](core.log), [Estúdio](estudio.log),
[publicação](publicacao.log), [navegador](navegador.log) e
[integração](integracao.log) acompanham os [hashes das evidências](verificacao.json).
Os comandos e tempos das checagens de tipos constam em [tipos.json](tipos.json).

## Falhas reproduzidas e correções

O [editor anterior](reproducao-editor.log) deixava o personagem atravessar o piso
em `y=40,25`, parando só no fundo do mapa em `y≈192`.
Os [dois motores](reproducao-motores.log) também perdiam esse piso ao arredondar
a instância para a grade mundial. O percurso comum agora consulta a peça real.

O [teste de criação do jogo](reproducao-jogo.log) demonstrou que a escolha do modo
ignorava plataformas de conjuntos. Na execução pela interface, o personagem
continuava parado: o programa gerado não aplicava gravidade. Os projetos novos
agora usam a sequência oficial `applyGravity` → `platformerWithTerrain` → colisão.
Nenhum projeto já salvo tem seu código reconstruído por essa correção.

Na prova completa, o personagem pousou inicialmente na altura capturada de 39
pixels, no desenho do corpo. Editar o deslocamento da camada de `0,25` para `8,25`
no Pinta atualizou o pouso para 47 pixels. A leitura conta linhas com a largura
do personagem, para a imagem pequena da plataforma não mascarar a posição dele.
IR, arquivos e blocos permaneceram iguais, inclusive ao reabrir o projeto salvo.

Uma primeira seleção de botão do teste esperava apenas “Rodar”; o Estúdio já
executava automaticamente e apresentava “Rodar de novo”. O teste passou a usar
os dois estados públicos do mesmo controle. Isso não exigiu alterar o produto.

A última checagem de estilo detectou que o gerador escrevia uma forma de literal
incompatível com o formatter. O gerador agora emite o formato canônico diretamente.
Paridade portátil, testes do Core/Estúdio, geradores e tipos foram repetidos;
reconstruir o Python conservou o mesmo hash, sem mudança do interpretador testado.

## Execução e orçamento

O Phaser real pousou em `y=28,25`, com corpo de 12 pixels e piso em `y=40,25`;
com gravidade invertida, apoiou em `y=42,25`. Com gravidade zero atravessou o piso.
Os [dados completos](medidas.json) também incluem os 16 resultados numéricos.

Com CPU 4× mais lenta simulada, 100 lotes de 16 consultas tiveram p95 de 1,6 ms no
desktop e 2,6 ms no perfil com toque. São medidas desta fixture pequena; não
comprovam o pior caso de mapas grandes ou conjuntos sobrepostos.

O [peso dos motores](peso-runtime.json) é 446.844 caracteres/129.255 bytes gzip no
Jogo 2D e 435.139/131.153 no Avançado. O acréscimo sobre o lote de sólidos é
2.865/2.812 caracteres, restrito ao leitor lazy. Os motores sem cenário e os
tetos iniciais da galeria não foram ampliados. O formato de autoria continua 7,
a cena 3, o PNG de dados 4 e o gravador de nuvem ainda declara 4.

A distribuição Python local
`c4e6107747ac998e0030dad09578ab5ec12dc81941e8675970894ca8a6f8600f`
tem 126 arquivos. As provas [1×](python-1x.json) e [2×](python-2x.json) identificam
o artefato executado: a API pública realizou as consultas e uma simulação de 120
quadros, com o personagem desenhado pelo Pygame real. A suíte completa mediu 47,6
fps no benchmark. As [falhas e oscilações anteriores](../colisoes-autorais/README.md)
continuam registradas; esta aprovação não comprova estabilidade em hardware de entrada.

## Limites e continuidade

Autenticação, implantação gradual/rollback e ativação do runtime ainda precisam
da homologação de staging. Os servidores de QA usam perfil e catálogo locais,
sem substituir esses ensaios. Godot foi validado em headless para geometria,
sem comprovação visual de sua renderização. Só esta máquina foi disponibilizada;
toque e CPU reduzida são simulações, sem teste com crianças ou outro aparelho físico.

Os demais itens da missão permanecem no plano: terrenos completos na interface,
espalhamento/conjuntos, ferramentas profissionais, acessibilidade, contratos externos,
chunks/projeções e o ciclo integral da Vila. O checklist não foi encerrado por este lote.
