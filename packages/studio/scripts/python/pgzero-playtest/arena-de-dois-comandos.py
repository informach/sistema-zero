"""Arena de Dois Comandos: the arrows move the tank inside the arena; W, A, S and D aim the turret
and shoot at a fixed rate while held; a bullet destroys a robot; robots walk to the tank and a
touch costs a life; touching a person rescues them; a cleared wave brings a bigger one; a
player that keeps shooting the nearest robot clears waves."""

import math
import random

TECLAS = ('a', 'd', 'w', 's', 'LEFT', 'RIGHT', 'UP', 'DOWN')


def soltar_tudo(t):
    for tecla in TECLAS:
        t.up(tecla)


def play(t):
    random.seed(3)
    tanque = t.get('tanque')
    torre = t.get('torre')
    arena = t.get('ARENA')
    Actor = t.get('Actor')
    t.check('a primeira onda tem 6 robôs e 3 pessoas', len(t.get('robos')) == 6 and len(t.get('pessoas')) == 3)
    t.check('nenhum robô nasce perto do tanque', all(r.distance_to(tanque) > 199 for r in t.get('robos')))
    t.shot('inicio')

    # Andar não passa da parede da arena.
    t.get('robos').clear()
    t.get('robos').append(Actor('robo', (700, 520)))
    t.hold('LEFT', 200)
    t.check('o tanque para na parede da esquerda', tanque.left >= arena.left - 1, f'x={tanque.x}')

    # Segurando D, a torre aponta para a direita e atira num ritmo.
    t.get('balas').clear()
    t.set('espera_do_tiro', 0)
    t.down('d')
    t.step(30)
    t.up('d')
    t.check('com D, a torre aponta para a direita', torre.angle == 0)
    tiros = len(t.get('balas'))
    t.check('segurando meio segundo, saem uns 4 tiros (um a cada 0,15 s)', 3 <= tiros <= 5, f'{tiros} tiros')
    t.get('balas').clear()
    t.set('espera_do_tiro', 0)
    t.down('w')
    t.step(1)
    t.up('w')
    t.check('com W, a torre aponta para cima', torre.angle == 90)
    bala = t.get('balas')[-1]
    t.check('e a bala sobe', bala.vy < 0 and bala.vx == 0)

    # Uma bala destrói o robô.
    robo = t.get('robos')[0]
    robo.pos = (tanque.x, tanque.y - 120)
    pontos = t.get('pontos')
    t.down('w')
    t.step(15)
    t.up('w')
    t.check('a bala destrói o robô', robo not in t.get('robos') and t.get('pontos') == pontos + 50)
    t.check('sem robôs, vem a onda 2 com mais robôs', t.get('onda') == 2 and len(t.get('robos')) == 8)

    # Encostar num robô custa uma vida; encostar numa pessoa resgata.
    robo = t.get('robos')[0]
    robo.pos = tanque.pos
    t.step(1)
    t.check('encostar num robô custa uma vida e afasta os robôs', t.get('vidas') == 2 and robo.distance_to(tanque) > 199)
    pessoa = t.get('pessoas')[0]
    pessoa.pos = tanque.pos
    pontos = t.get('pontos')
    t.step(1)
    t.check('encostar numa pessoa resgata e dá 100', pessoa not in t.get('pessoas') and t.get('pontos') == pontos + 100)

    # Atirando sempre no robô mais perto (e recuando dele), passa de onda.
    t.get('novo_jogo')()
    for _ in range(60 * 150):
        if t.get('estado') != 'jogando' or t.get('onda') >= 4:
            break
        soltar_tudo(t)
        robos = t.get('robos')
        if robos:
            alvo = min(robos, key=lambda r: r.distance_to(tanque))
            dx, dy = alvo.x - tanque.x, alvo.y - tanque.y
            angulo = math.atan2(dy, dx)
            mx, my = round(math.cos(angulo)), round(math.sin(angulo))
            if mx:
                t.down('d' if mx > 0 else 'a')
            if my:
                t.down('s' if my > 0 else 'w')
            if alvo.distance_to(tanque) < 140:
                if abs(dx) > abs(dy):
                    t.down('LEFT' if dx > 0 else 'RIGHT')
                else:
                    t.down('UP' if dy > 0 else 'DOWN')
        t.step(1)
    soltar_tudo(t)
    t.check('atirando no robô mais perto, chega à onda 4', t.get('onda') >= 4,
            f"onda={t.get('onda')}, vidas={t.get('vidas')}, pontos={t.get('pontos')}")
    t.shot('ondas')

    # Perdendo a última vida, acabou.
    t.set('vidas', 1)
    t.get('robos').append(Actor('robo', tanque.pos))
    t.step(2)
    t.check('perdendo a última vida, fim de jogo', t.get('estado') == 'fim')
    t.tap('SPACE')
    t.check('espaço começa de novo', t.get('estado') == 'jogando' and t.get('onda') == 1 and t.get('vidas') == 3)
