"""Declared geometry/AI fixtures in the real pinned Pac-Man main loop.

No shortened timer, fake Turtle/media or replacement collision/AI algorithm.
Method witnesses distinguish movement, wall correction and pursuit. These
instrumented cases do not prove a full played game or physical keyboard input.
"""
import json
import math
import random
import time
import main as game
from constants import ENEMY_MOVE_SPEED, ENEMY_RADAR, SCREEN_HEIGHT, SCREEN_WIDTH

CONFIG = {"scenario": "geometry", "seed": 2026}
assert CONFIG['scenario'] in ('geometry', 'ai')
random.seed(CONFIG['seed'])
_original_loop = game.game_loop
_tick = 0
_cases = None
_witnesses = []
_selected = None
_enemy_ids = None
_completed = False


def emit(event, value):
    print('__SZ_PACMAN_QA__' + json.dumps(dict(event=event, scenario=CONFIG['scenario'],
          tick=_tick, clock=time.monotonic(), value=value), separators=(',', ':')))


def state(actor):
    return dict(position=list(actor.position()), heading=actor.get_heading(), state=actor.state,
                shape=actor.shape())


def same_position(actual, expected):
    for left, right in zip(actual, expected):
        assert math.isfinite(left) and math.isclose(left, right, rel_tol=0, abs_tol=1e-9), (actual, expected)


def wrap(actor, method):
    original = getattr(actor, method)

    def observed(*args, **kwargs):
        before = state(actor)
        result = original(*args, **kwargs)
        after = state(actor)
        if actor is _selected:
            _witnesses.append(dict(method=method, before=before, after=after))
        return result

    setattr(actor, method, observed)


def geometry_cases(player, pellets):
    cases = []
    cell = game.CELL_SIZE
    walls, opens = set(player.walls), set(pellets.pellets) | set(pellets.power_pellets)
    vectors = [(0, 1, 0), (180, -1, 0), (90, 0, 1), (270, 0, -1)]

    def avoids_power(position):
        return all(math.dist(position, point) >= cell / 2 for point in pellets.power_pellets)

    for actor in ('player', 'enemy'):
        for heading, dx, dy in vectors:
            faces = [(x, y) for x, y in sorted(walls) if (x - dx * cell, y - dy * cell) in opens]
            assert faces
            safe_faces = [(x, y) for x, y in faces if avoids_power([x - dx * 25, y - dy * 25])]
            assert safe_faces
            x, y = safe_faces[0]
            cases.append(dict(name=f'{actor}-wall-{heading}', actor=actor, heading=heading,
                              position=[x - dx * 25, y - dy * 25],
                              expected=[x - dx * cell, y - dy * cell], method='check_wall_collision',
                              kind='wall'))
            for sign in (-1, 1):
                px, py = -dy * sign, dx * sign
                candidates = [(x, y) for x, y in faces
                              if (x + px * cell, y + py * cell) in opens
                              and (x - dx * cell + px * cell, y - dy * cell + py * cell) in opens
                              and avoids_power([x - dx * 25 + px * 20, y - dy * 25 + py * 20])]
                assert candidates, 'Pinned maze must supply the declared corner fixture'
                x, y = candidates[0]
                cases.append(dict(name=f'{actor}-align-{heading}-{sign}', actor=actor, heading=heading,
                                  position=[x - dx * 25 + px * 20, y - dy * 25 + py * 20],
                                  expected=[x - dx * 20 + px * cell, y - dy * 20 + py * cell],
                                  method='check_wall_collision', kind='alignment'))
        high_y = SCREEN_HEIGHT / 2 - 2 * cell
        for heading, position, expected in (
            (0, [SCREEN_WIDTH / 2, 0], [-SCREEN_WIDTH / 2, 0]),
            (180, [-SCREEN_WIDTH / 2, 0], [SCREEN_WIDTH / 2, 0]),
            (90, [0, high_y], [0, -SCREEN_HEIGHT / 2]),
            (270, [0, -SCREEN_HEIGHT / 2], [0, high_y]),
        ):
            cases.append(dict(name=f'{actor}-wrap-{heading}', actor=actor, heading=heading,
                              position=position, expected=expected, method='move', kind='wrap'))
    assert len(cases) == 32
    return cases


def ai_cases(player, pellets):
    cell = game.CELL_SIZE
    opens = set(pellets.pellets) | set(pellets.power_pellets)
    junctions = [(x, y) for x, y in sorted(opens) if all(
        (x + dx * cell, y + dy * cell) in opens for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)))]
    assert junctions
    x, y = junctions[0]
    cases = []
    for name, heading, dx, dy, expected in (
        ('turn-up', 0, 0, 90, 90), ('turn-down', 180, 0, -90, 270),
        ('turn-right', 90, 90, 0, 0), ('turn-left', 270, -90, 0, 180),
        ('radar-inside', 180, ENEMY_RADAR - 1, 0, 0),
        ('radar-exact', 180, ENEMY_RADAR, 0, 180),
        ('radar-outside', 180, ENEMY_RADAR + 1, 0, 180),
        ('alignment-inside', 0, cell / 2 - 1, 90, 90),
        ('alignment-exact', 0, cell / 2, 90, 0),
    ):
        # The actual Enemy.move ends at the authored junction before wall/AI checks.
        angle = math.radians(heading)
        cases.append(dict(name=name, actor='enemy', heading=heading,
                          position=[x - math.cos(angle) * ENEMY_MOVE_SPEED,
                                    y - math.sin(angle) * ENEMY_MOVE_SPEED],
                          player=[x + dx, y + dy], anchor=[x, y], expectedHeading=expected,
                          method='go_after_player', kind='pursuit'))
    cases.append(dict(name='random-valid-neighbour', actor='enemy', heading=0,
                      position=[x, y], player=[x + ENEMY_RADAR + cell, y],
                      method='start_move', kind='random'))
    return cases


def initialize(args):
    global _cases, _enemy_ids
    _, player, _, _, pellets, _, _, _, enemies = args
    assert len(enemies) == 7 and player.move_speed == 5 and ENEMY_MOVE_SPEED == 5
    _enemy_ids = tuple(map(id, enemies))
    for actor in (player, enemies[0]):
        for method in ('move', 'check_wall_collision'):
            wrap(actor, method)
    for method in ('go_after_player', 'start_move'):
        wrap(enemies[0], method)
    _cases = geometry_cases(player, pellets) if CONFIG['scenario'] == 'geometry' else ai_cases(player, pellets)
    emit('case-manifest', dict(cases=_cases, seed=CONFIG['seed'],
         scope='declared actor placement in real loop; not a full game or native input proof'))


def inject(args, case):
    global _selected, _witnesses
    _, player, _, _, pellets, _, _, _, enemies = args
    _witnesses = []
    _selected = player if case['actor'] == 'player' else enemies[0]
    # Keep seven real enemies. Isolate unrelated collision participants without hiding them.
    player_position = case['position'] if case['actor'] == 'player' else case.get('player', [0, 0])
    safe = sorted(p for p in pellets.pellets if math.dist(p, player_position) > game.CELL_SIZE * 5
                  and math.dist(p, case['position']) > game.CELL_SIZE * 5)
    assert len(safe) >= 7
    emit('injection', dict(case=case, otherEnemyPositions=safe[:7],
         playerHeadingBeforeSelection=90,
         operation='goto/state/heading; unrelated enemies stay stopped before author 2500ms start'))
    player.goto(player_position)
    player.setheading(90)
    player.state = 'stop'
    for enemy, position in zip(enemies, safe):
        enemy.goto(position)
        assert enemy.state == 'stop', 'Fixture must precede the authored 2500ms enemy start'
    _selected.goto(case['position'])
    _selected.setheading(case['heading'])
    _selected.state = 'move'
    if case['kind'] == 'random':
        _selected.start_move()


def verify(args, case):
    player, enemies = args[1], args[-1]
    assert tuple(map(id, enemies)) == _enemy_ids and player.lives == 3
    matches = [w for w in _witnesses if w['method'] == case['method']]
    assert len(matches) == 1, matches
    witness = matches[0]
    if case['kind'] in ('wall', 'alignment', 'wrap'):
        same_position(witness['after']['position'], case['expected'])
        if case['kind'] == 'wall':
            if case['actor'] == 'player':
                assert witness['after']['state'] == 'stop'
            else:
                turns = [w for w in _witnesses if w['method'] == 'start_move']
                assert len(turns) == 1
                assert witness['after']['heading'] in (0, 90, 180, 270)
                valid_neighbour(turns[0])
    elif case['kind'] == 'pursuit':
        same_position(witness['before']['position'], case['anchor'])
        assert witness['after']['heading'] == case['expectedHeading'], (case, witness)
    elif case['kind'] == 'random':
        valid_neighbour(witness)
    emit('case-passed', dict(name=case['name'], witnesses=_witnesses,
         fullLoopPlayer=state(player), fullLoopEnemy=state(enemies[0])))


def valid_neighbour(witness):
    heading = witness['after']['heading']
    assert heading in (0, 90, 180, 270) and witness['after']['state'] == 'move'
    dx, dy = {0: (1, 0), 90: (0, 1), 180: (-1, 0), 270: (0, -1)}[heading]
    x, y = witness['after']['position']
    assert (round(x) + dx * game.CELL_SIZE, round(y) + dy * game.CELL_SIZE) not in _selected.walls


def observed_loop(*args):
    global _tick, _completed
    if _cases is None:
        initialize(args)
    case_index = _tick - 1
    case = _cases[case_index] if 0 <= case_index < len(_cases) else None
    if case is not None:
        inject(args, case)
    _original_loop(*args)
    if case is not None:
        verify(args, case)
        # Only the selected actor was moving; restore the declared pre-start fixture state.
        _selected.state = 'stop'
    if case_index == len(_cases) - 1:
        _completed = True
        emit('functional-complete', dict(count=len(_cases), closedByQA=True,
             scope='short causal fixtures; no full-game, performance, focus or keyboard acceptance'))
        args[0].bye()
    _tick += 1


game.game_loop = observed_loop
emit('configuration', CONFIG)
game.main()
assert _completed, 'Game ended before all declared functional cases completed'
