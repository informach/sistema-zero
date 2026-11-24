# Lote 7 — Iluminação, céu e prévias

18/11/2026. **Recorte 7.3 implementado, testado e revisado; lote 7 permanece aberto.** Interface 7.4 e revisão integral 7.5 são as próximas entregas. Complementa o [palco 7.2](checkpoint-lote7-palco.md).

## Implementação

- `AmbienteDoPalco` reúne o ambiente anteriormente mantido dentro de `Palco.ts`, conservando a iluminação e o gradiente padrão por horário. Sol aceita direção, cor, força e sombra; a sombra acompanha a vista sem alterar o descritor autoral. Alcance explícito é aplicado inclusive em ajustes pequenos.
- Luz ambiente aceita cores do céu/chão e intensidade. Névoa aceita limites e cor próprios ou desligamento; o recorte automático da câmera não substitui os limites autorais.
- Marcadores de luz renderizam PointLight ou SpotLight, com posição/giro/relevo, alvo local, cor, força, alcance, decaimento, cone e penumbra. Ocultar/remover libera luz, target e mapas de sombra. Máximo de 32 luzes locais e quatro sombras locais, conforme o núcleo.
- Sol usa a resolução configurada, limitada pelo renderer. Sombras locais têm teto de 512 pixels por face, reduzido quando necessário para caber no atlas do dispositivo. Esse limite é explícito no estado disponibilizado à interface; evita multiplicar a resolução solar por seis faces de cada luz pontual.
- Céu aceita cor ou panorama equiretangular 2:1 da tabela de texturas. Three.js renderiza o panorama, sua rotação e intensidade. Um clone de textura isola o mapping sem alterar a textura utilizada em superfícies; a imagem permanece compartilhada. O descarte libera também os recursos gerados pelo renderer.
- Carregamento continua por hash, biblioteca/espaço e pipeline de imagens existente. Sem URLs livres ou carregador paralelo. Panorama inadequado informa erro; `aguardarRecursos` recusa ambiente com falha, em vez de aprovar um fallback como resultado final.
- A projeção existente de autoria recebeu prévias de comandos de iluminação, marcador e referência de textura. Confere a cabeça, usa o executor/validação/travas do núcleo, protege contra ferramentas concorrentes e não grava revisões intermediárias. Cancelar restaura a cabeça; confirmar mantém os recursos enquanto o controlador publica o mesmo lote.
- O controle de horário já existente preserva os demais ajustes de iluminação ao trocar a hora. Os novos painéis continuam em 7.4.

## Verificação

| Verificação | Resultado |
| --- | --- |
| Motor | 148 testes; 3.956 asserções; zero falhas |
| Oficina | 102 testes; 661 asserções; zero falhas |
| Tipagem | Motor e oficina aprovados |
| Build | Aprovado; aviso de chunks acima de 500 kB permanece |
| Workers de produção | Quatro, incluindo terreno, PNG16, água e caminhos; sem erro |
| Regressão das guias | Clique, retângulo/laço, retrato, Testar e retorno; sem erro |
| Regressão dos gestos | Gizmos, tamanho/undo, cancelamento, pontos elevados, câmera e início; sem erro |
| Ambiente no Chrome | Dia/noite, sol, luz pontual/foco, sombras, névoa e panorama renderizados |
| Autoria | Doze ajustes de prévia sem alterar a autoria; confirmação em uma revisão; reabertura e undo/redo pelo host em memória |
| Resposta antiga | Uma leitura deliberadamente atrasada foi liberada após trocar o céu; capturas antes/depois idênticas |
| Rotação | Giro de 90° produziu uma imagem diferente, mantendo a mesma textura e autoria |
| Panorama inadequado | Imagem quadrada recusada com mensagem 2:1; cancelamento restaurou o céu anterior |
| Testar | Ambiente conservado; prévia recusada durante o teste; câmera/autoria restauradas |

O ensaio de panorama importou PNGs de teste pela biblioteca do host em memória, com licença própria e bytes verificados, sem simular uma referência inexistente. Isso comprova o contrato local, não armazenamento remoto ou implantação.

Três ciclos de undo/redo mantiveram seis geometrias e seis texturas sem panorama, oito com panorama. Ocultar as duas luzes reduziu a contagem a cinco texturas; reexibi-las retornou a oito em todos os ciclos. São contagens observadas neste laboratório, não estimativa de VRAM ou aprovação de desempenho em aparelhos físicos.

## Evidências e continuidade

[Resultados](evidencias/lote7-iluminacao/resultado.json), [dia](evidencias/lote7-iluminacao/dia.png), [noite](evidencias/lote7-iluminacao/noite-previa.png), [panorama](evidencias/lote7-iluminacao/panorama.png), [giro](evidencias/lote7-iluminacao/panorama-girado.png) e [vídeo](evidencias/lote7-iluminacao/ambiente.mp4). Reprodução: `playground/oficina/verificar-ambiente-palco.mjs`.

As imagens são de um laboratório com formas e panoramas de cores para aferir o motor; não representam a arte da Faísca nem uma nova direção visual. Não foram versionados modelos privados da biblioteca. A interface Jogo/Luz, seleção de panorama pela biblioteca/Molda, controles de prévia/confirmar/cancelar e revisão global do lote continuam pendentes em 7.4/7.5. Implantação e validação em staging seguem no encerramento global.
