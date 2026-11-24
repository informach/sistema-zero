# Colisões autorais depois da integração com staging

Fonte integrada: `04acef30b`, incluindo staging `77c47b619`. O merge conservou
as capacidades independentes do Pinta e do Molda nos dois conflitos compartilhados.
Os arquivos do projeto 3D foram recebidos dos commits de seu responsável.

| Verificação repetida | Resultado |
| --- | --- |
| Core, incluindo convivência com as capacidades remotas | 43 testes; 1.028 asserções |
| Estúdio, materialização e motores reais dos blocos | 90 testes; 6.644 asserções |
| Publicação Python no BFF | 85 testes; 566 asserções |
| Python/Pygame no navegador | 15 testes, nenhuma falha ou omissão |
| Tipos completos do Estúdio integrado | `tsc --noEmit --pretty false`, código de saída 0 |

A distribuição reconstruída é
`b2dd1ee1694178173526dff73172ed77a8d7a71f79701695d2a4430c428eb7c5`,
com 126 arquivos e cinco capacidades declaradas. O catálogo deste ensaio é local
e sintético; este registro não aprova sua publicação ou ativação em staging.

O [ensaio Python](python.log) repetiu mapas 1×/2×, a passagem da raiz antiga ao
destino físico e volta, a Vila, PyDew Valley e os demais jogos da galeria Pygame.
As provas [1×](mundo-1x.json) e [2×](mundo-2x.json) identificam os bytes executados.
O benchmark mediu 57,5 fps nesta rodada. As falhas anteriores abaixo de 45 fps
continuam [registradas no lote anterior](../colisoes-autorais/README.md);
não se deduz estabilidade de uma repetição aprovada.

As evidências tratam do fluxo Pinta/Pygame; a presença de uma capacidade do Molda
no descritor não constitui homologação funcional do editor 3D nesta sessão.
Não houve teste com crianças ou outro aparelho físico. Plataformas transformadas,
Godot visual, rollout/rollback e o ciclo autenticado continuam pendentes.

Os [hashes e comandos concluídos](verificacao.json) acompanham os registros de
[Core](core.log), [Estúdio](estudio.log), [publicação](publicacao.log) e [tipos](tipos.log).
