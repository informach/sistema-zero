import random


def play(t):
    random.seed(3)
    n = t.get('nave')
    aliens = t.get('aliens')
    estados = t.get('estados')
    tiro = t.get('tiro')
    t.set('quadros', 0)
    # Mira no alien 3 da fileira de baixo (índice 11) e atira.
    alvo = 11
    t.until(lambda: abs(n.x - aliens[alvo].x) < 4, 300, key='RIGHT' if aliens[alvo].x > n.x else 'LEFT')
    for _ in range(4):
        if estados[alvo] != 'fila':
            break
        t.until(lambda: abs(n.x - aliens[alvo].x) < 4, 60, key='RIGHT' if aliens[alvo].x > n.x else 'LEFT')
        t.tap('SPACE')
        t.until(lambda: tiro.y <= -20, 120)
    t.check('o tiro acerta o alien da fila e ele explode', estados[alvo] in ('explodindo', 'fora'), f'estado={estados[alvo]} pontos={t.get("pontos")}')
    t.step(20)
    t.check('depois da explosão ele sai do jogo', estados[alvo] == 'fora' and aliens[alvo].x < 0)
    t.shot('1-explodiu')
    # Um mergulho: sobe virando, desce, e se ninguém acerta, volta para a casa na formação.
    mergulhador = 3
    n.x = 50
    estados[mergulhador] = 'mergulho'
    viu_angulo = 0
    for _ in range(400):
        t.step(1)
        viu_angulo = max(viu_angulo, abs(aliens[mergulhador].angle))
        if estados[mergulhador] != 'mergulho':
            break
    t.check('o mergulho faz a curva (o alien vira até 180°)', viu_angulo >= 180, f'ângulo máximo={viu_angulo}')
    t.check('sai por baixo e volta para a formação', estados[mergulhador] == 'fila' and aliens[mergulhador].angle == 0)
    # Um alien que mergulha em cima da nave tira uma vida.
    vidas = t.get('vidas')
    aliens[mergulhador].pos = n.pos
    estados[mergulhador] = 'mergulho'
    t.step(2)
    t.check('o alien que encosta na nave tira uma vida', t.get('vidas') == vidas - 1, f"vidas={t.get('vidas')}")
    # Acabando todos, vence; espaço recomeça.
    for i in range(len(estados)):
        estados[i] = 'fora'
    t.step(2)
    t.shot('2-venceu')
    t.tap('SPACE')
    t.step(2)
    t.check('espaço recomeça com 16 aliens na fila', estados.count('fila') == 16 and t.get('vidas') == 3)
