"""Causal native QA of the pinned exported Space Arena, never a product module.

Every hook delegates the original exactly once. Fixtures are explicit and keep
all original objects. Native keys invoke registered author callbacks; they do
not prove OS keyboard delivery. The runner owns the bounded Tk/audio lifetime.
"""
import math
import sys


class FunctionalComplete(BaseException):
    """QA boundary of the author's otherwise infinite loop, not natural exit."""


def close(actual, expected):
    assert math.isfinite(actual) and math.isfinite(expected)
    assert math.isclose(actual, expected, rel_tol=0, abs_tol=1e-9), (actual, expected)


def state(sprite):
    return {key: getattr(sprite, key) for key in (
        'x', 'y', 'dx', 'dy', 'heading', 'da', 'thrust', 'state',
        'health', 'lives', 'score', 'fuel', 'max_fuel', 'damage', 'type', 'frame',
    ) if hasattr(sprite, key)}


class Observer:
    def __init__(self, scenario, report, callbacks):
        assert scenario in ('Q02', 'Q03', 'Q04', 'Q05', 'Q06', 'Q07')
        self.scenario, self.report, self.callbacks = scenario, report, callbacks
        self.namespace = None
        self.step = 0
        self.initial_ids = None
        self.restores = []
        self.audio = []
        self.witnesses = []
        self.clears = []
        self.particle_steps = 0
        self.complete_requested = False
        self.radar_witnesses = []

    def event(self, kind, **value):
        self.report['observations'].append(dict(kind=kind, step=self.step, **value))

    def wrap(self, obj, name, before=None, after=None):
        original = getattr(obj, name)

        def delegated(*args, **kwargs):
            witness = before(*args, **kwargs) if before else None
            result = original(*args, **kwargs)
            if after:
                after(witness, *args, **kwargs)
            return result

        setattr(obj, name, delegated)
        self.restores.append((obj, name, original))

    def restore(self):
        for obj, name, original in reversed(self.restores):
            setattr(obj, name, original)

    def key(self, key, release=False):
        callback = self.callbacks[('release' if release else 'press', key)]
        assert callback is not None
        callback()
        self.event('authored-binding-invocation', key=key, release=release,
                   player=state(self.namespace['player']))

    def fixture(self, name, **values):
        self.event('declared-state-injection', operation=name, values=values)

    def isolate(self):
        """Keep all pools active; move unrelated collision targets far away."""
        n = self.namespace
        self.fixture('isolate existing targets', enemies='x=-700+35*i,y=500',
                     powerups='x=-650+40*i,y=-500', missiles='ready',
                     velocities=0, player='origin,heading90,zero momentum/thrust')
        for index, enemy in enumerate(n['enemies']):
            enemy.x, enemy.y = -700 + 35 * index, 500
            enemy.dx = enemy.dy = enemy.thrust = enemy.da = 0
        for index, powerup in enumerate(n['powerups']):
            powerup.x, powerup.y = -650 + 40 * index, -500
            powerup.dx = powerup.dy = powerup.thrust = powerup.da = 0
        for missile in n['missiles']:
            missile.reset()
        player = n['player']
        player.x = player.y = player.dx = player.dy = player.da = player.thrust = 0
        player.heading = 90

    def target(self, obj, **values):
        self.fixture('existing object attributes', object=type(obj).__name__, **values)
        for key, value in values.items():
            setattr(obj, key, value)

    def install(self, n):
        self.namespace = n
        self.initial_ids = {key: tuple(map(id, n[key])) for key in (
            'enemies', 'missiles', 'stars', 'powerups')}
        assert {key: len(ids) for key, ids in self.initial_ids.items()} == dict(
            enemies=25, missiles=30, stars=20, powerups=5)
        assert n['SCREEN_WIDTH'] == 800 and n['SCREEN_HEIGHT'] == 600

        original_sound = n['play_sound']

        def sound(path, *args, **kwargs):
            result = original_sound(path, *args, **kwargs)
            self.audio.append(path)
            return result

        n['play_sound'] = sound
        self.original_sound = original_sound
        pen = n['pen']
        self.wrap(pen, 'clear', before=lambda: len(pen.stampItems),
                  after=lambda count: self.cleared(count, len(pen.stampItems)))

        def stamp_before():
            caller = sys._getframe(2)  # before -> delegating wrapper -> original render
            if caller.f_locals.get('self') is not n['radar']:
                return None
            sprite = caller.f_locals['sprite']
            radar, player = n['radar'], n['player']
            x, y = pen.position()
            close(x, radar.x + (sprite.x - player.x) * radar.width / n['game'].width)
            close(y, radar.y + (sprite.y - player.y) * radar.height / n['game'].height)
            assert pen.shape() == sprite.shape and pen.pencolor() == sprite.color
            return dict(sprite=type(sprite).__name__, x=x, y=y, shape=pen.shape(), color=pen.pencolor())

        self.wrap(pen, 'stamp', before=stamp_before,
                  after=lambda witness: self.radar_witnesses.append(witness) if witness else None)

        def bounce_before(player, enemy):
            return [player.dx, player.dy, enemy.dx, enemy.dy]

        def bounce_after(before, player, enemy):
            actual = [player.dx, player.dy, enemy.dx, enemy.dy]
            assert actual == before[2:] + before[:2]
            self.witnesses.append(dict(method='bounce', before=before, after=actual))

        self.wrap(n['Sprite'], 'bounce', before=bounce_before, after=bounce_after)
        self.event('installed', sourceDeclaredSetup=[1020, 620], pools={
            key: len(n[key]) for key in self.initial_ids},
            particles=[len(n['explosion'].particles), len(n['exhaust'].particles)])

    def check_pools(self):
        n = self.namespace
        for key, ids in self.initial_ids.items():
            actual = tuple(map(id, n[key]))
            if key == 'missiles' and self.scenario == 'Q05':
                assert actual[:30] == ids and len(actual) in (30, 31)
            else:
                assert actual == ids
        assert len(n['explosion'].particles) == 30 and len(n['exhaust'].particles) == 20

    def update(self, n):
        if self.namespace is None:
            self.install(n)
            assert n['game'].state == 'splash'
            assert self.callbacks['press', 's'] == n['game'].start_game
            self.key('s')
            getattr(self, self.scenario)(initial=True)
            return
        self.check_pools()
        assert n['game'].state == 'playing'
        self.event('rendered-frame', player=state(n['player']),
                   stampCount=len(n['pen'].stampItems), canvasItems=len(n['wn'].getcanvas().find_all()))
        getattr(self, self.scenario)(initial=False)
        self.step += 1

    def finish(self):
        self.complete_requested = True

    def cleared(self, before, after):
        canvas_items = len(self.namespace['wn'].getcanvas().find_all())
        self.clears.append(dict(before=before, after=after, canvasItemsAfter=canvas_items))
        if not self.complete_requested:
            return
        assert self.clears and all(item['before'] > 0 and item['after'] == 0 for item in self.clears)
        assert all(item['canvasItemsAfter'] == self.clears[0]['canvasItemsAfter'] for item in self.clears)
        self.event('complete', sounds=self.audio, clearWitnesses=self.clears,
                   methodWitnesses=self.witnesses, radarWitnesses=self.radar_witnesses)
        raise FunctionalComplete()

    def Q02(self, initial):
        n, p = self.namespace, self.namespace['player']
        if initial:
            self.key('Left')
            assert p.da == 10
            self.previous = state(p)
            return
        previous = self.previous
        close(p.heading, (previous['heading'] + previous['da']) % 360)
        close(p.dx, previous['dx'] + math.cos(math.radians(p.heading)) * previous['thrust'])
        close(p.dy, previous['dy'] + math.sin(math.radians(p.heading)) * previous['thrust'])
        if self.step == 0:
            self.key('Left', release=True)
            assert p.da == 0
        elif self.step == 1:
            self.key('Right')
            assert p.da == -10
        elif self.step == 2:
            self.key('Right', release=True)
            assert p.da == 0
            self.key('Up')
            close(p.thrust, 0.2)
            assert all(item.state == 'active' for item in n['exhaust'].particles)
        elif self.step == 3:
            self.key('Up')  # An explicitly delivered second press, not OS repeat evidence.
            close(p.thrust, 0.4)
        elif self.step == 4:
            self.key('Up', release=True)
            assert p.thrust == 0 and (p.dx != 0 or p.dy != 0)
        elif self.step == 5:
            before = state(p)
            assert all(m.state == 'ready' for m in n['missiles'])
            self.key('space')
            active = [m for m in n['missiles'] if m.state == 'active']
            assert len(active) == 3
            # Each shot uses the player's already-recoiled velocity from the previous shot.
            dx, dy = before['dx'], before['dy']
            for m, offset in zip(active, (0, 5, -5)):
                close(m.heading, before['heading'] + offset)
                close(m.dx, math.cos(math.radians(m.heading)) * m.thrust + dx)
                close(m.dy, math.sin(math.radians(m.heading)) * m.thrust + dy)
                dx -= m.dx * 0.01
                dy -= m.dy * 0.01
            close(p.dx, dx)
            close(p.dy, dy)
            self.event('fire-witness', missiles=[state(m) for m in active], player=state(p))
        elif self.step == 6:
            assert self.audio.count('thruster.wav') == 2 and self.audio.count('missile_fire.wav') == 1
            self.finish()
        self.previous = state(p)

    def Q03(self, initial):
        n, p = self.namespace, self.namespace['player']
        e = n['enemies'][0]
        walls = [dict(x=789, dx=2), dict(x=-789, dx=-2),
                 dict(y=589, dy=2), dict(y=-589, dy=-2)]
        if not initial:
            if self.step < 4:
                field = 'x' if self.step < 2 else 'y'
                limit = (790 if field == 'x' else 590) * (1 if self.step % 2 == 0 else -1)
                close(getattr(p, field), limit)
                close(getattr(p, 'd' + field), -walls[self.step]['d' + field])
                self.event('wall-clamp', axis=field, position=limit, player=state(p))
            elif self.step == 4:
                assert p.health == 40 and not self.witnesses  # strict distance 18 counterexample
            elif self.step == 5:
                assert 20 <= p.health <= 30 and p.lives == 3 and self.witnesses
                self.event('damage', player=state(p), enemy=state(e))
            elif self.step == 6:
                assert p.health <= 0 and p.lives == 3  # damage and death are separate branches
                self.event('nonpositive-health-before-reset', player=state(p))
            elif self.step == 7:
                assert p.lives == 0 and p.health == p.max_health and p.heading == 90
                assert (p.x, p.y, p.dx, p.dy, p.da) == (0, 0, 0, 0, 0)
                self.event('declared-near-defeat', player=state(p), authorLoopStillPlaying=n['game'].state)
                return
            elif self.step == 8:
                assert p.lives == 0  # one additional authored frame after GAME OVER
                self.finish()
                return
        next_step = 0 if initial else self.step + 1
        self.isolate()
        if next_step < 4:
            self.target(p, **walls[next_step])
        elif next_step in (4, 5, 6, 7):
            self.target(e, x=18 if next_step == 4 else 17.5, y=0,
                        dx=0, dy=0, type='mine', health=20, state='active')
            if next_step in (4, 5):
                self.target(p, health=40)
            elif next_step == 6:
                self.target(p, health=1)
            else:
                self.target(p, lives=1)  # retain real nonpositive health from previous hit

    def Q04(self, initial):
        n = self.namespace
        e, m, p = n['enemies'][0], n['missiles'][0], n['player']
        if not initial:
            if self.step == 0:
                assert e.health == 5 and e.state == 'active' and m.state == 'active' and p.score == 0
            else:
                assert e.health == 0 and e.state == 'inactive' and p.score == 10
                assert m.state == 'ready' and m.fuel == m.max_fuel
                close(e.dx, 1)
                close(e.dy, -1)
                assert self.audio.count('explosion.wav') == 1
                self.event('missile-kill', enemy=state(e), missile=state(m), score=p.score)
                self.finish()
                return
        self.isolate()
        self.target(e, x=100, y=100, type='mine', health=5)
        self.target(m, x=110 if initial else 109.5, y=103,
                    dx=3, dy=-3, thrust=5, state='active')

    def Q05(self, initial):
        n = self.namespace
        p, powerup, m = n['player'], n['powerups'][0], n['missiles'][0]
        if initial:
            self.isolate()
            self.previous = [state(item) for item in n['missiles']]
            self.target(powerup, x=0, y=0)
            return
        if self.step == 0:
            assert powerup.state == 'inactive' and len(n['missiles']) == 31 and p.score == 0
            for item, before in zip(n['missiles'], self.previous + [self.previous[0]]):
                close(item.max_fuel, before['max_fuel'] * 1.1)
                close(item.thrust, before['thrust'] * 1.05)
                close(item.damage, before['damage'] * 1.1)
            assert self.audio == ['powerup.wav']
            self.event('pickup-upgrade', missiles=len(n['missiles']), first=state(m))
            self.isolate()
            self.target(n['powerups'][1], x=100, y=100)
            self.target(m, x=100, y=100, dx=0, dy=0, state='active')
        else:
            assert n['powerups'][1].state == 'inactive' and p.score == -50
            assert m.state == 'ready' and m.fuel == m.max_fuel
            assert self.audio == ['powerup.wav', 'explosion.wav', 'explosion.wav']
            self.event('missile-powerup-penalty', score=p.score, sounds=self.audio)
            self.finish()

    def Q06(self, initial):
        n = self.namespace
        enemies, camera, p = n['enemies'], n['camera'], n['player']
        if not initial:
            for enemy, before in zip(enemies[:6], self.previous):
                if before['type'] == 'hunter':
                    expected = 0.05 if before['x'] < 100 else 0
                    close(enemy.dx, -expected)
                    close(enemy.dy, -expected)
                elif before['type'] == 'mine':
                    assert enemy.dx == enemy.dy == 0
                    assert enemy.type == ('hunter' if before['x'] < 100 else 'mine')
                else:
                    expected = 0.03 if before['x'] < 100 else 0
                    close(enemy.dx, expected)
                    close(enemy.dy, -expected)
                assert abs(enemy.dx) <= 3 and abs(enemy.dy) <= 3
            close(camera.x, self.camera_before[0] + (p.x - self.camera_before[0]) / 8)
            close(camera.y, self.camera_before[1] + (p.y - self.camera_before[1]) / 8)
            assert camera.visible is True
            assert any(item['sprite'] == 'Player' and item['color'] == 'white'
                       for item in self.radar_witnesses)
            assert any(item['sprite'] == 'Enemy' for item in self.radar_witnesses)
            self.key('C')
            assert camera.visible is False
            self.event('ai-camera', enemies=[state(e) for e in enemies[:6]],
                       camera=dict(x=camera.x, y=camera.y, visible=camera.visible))
            self.finish()
            return
        self.isolate()
        # Paired inside/exact-boundary fixtures for every original enemy algorithm.
        for index, kind in enumerate(('hunter', 'hunter', 'mine', 'mine', 'surveillance', 'surveillance')):
            self.target(enemies[index], x=60 if index % 2 == 0 else 100,
                        y=0, type=kind, sensor_range=100, dx=0, dy=0)
        self.target(camera, x=-80, y=-40)
        self.camera_before = (camera.x, camera.y)
        self.previous = [state(e) for e in enemies[:6]]
        self.key('c')
        assert camera.visible is True

    def Q07(self, initial):
        n = self.namespace
        particles = n['explosion'].particles + n['exhaust'].particles
        if initial:
            self.isolate()
            self.fixture('original particle emitters', explosion=[0, 0, 1, -1], exhaust=[0, 0, -1, 1])
            n['explosion'].explode(0, 0, 1, -1)
            n['exhaust'].explode(0, 0, -1, 1)
            assert all(item.state == 'active' and 10 <= item.frame <= 20 for item in particles)
            for item in n['explosion'].particles:
                assert -10 <= item.dx <= 14 and -14 <= item.dy <= 10
                assert item.color in ('red', 'orange', 'yellow')
            for item in n['exhaust'].particles:
                assert -3 <= item.dx <= -1 and 1 <= item.dy <= 3
                assert item.color in ('red', 'yellow')
            self.previous = [state(item) for item in particles]
            return
        for item, before in zip(particles, self.previous):
            if before['state'] == 'active':
                close(item.x, before['x'] + before['dx'])
                close(item.y, before['y'] + before['dy'])
                close(item.dx, before['dx'] * 0.85)
                close(item.dy, before['dy'] * 0.85)
                if before['frame'] > 1:
                    assert item.frame == before['frame'] - 1 and item.state == 'active'
                else:
                    assert item.state == 'inactive' and 10 <= item.frame <= 20
            else:
                assert state(item) == before
        self.particle_steps += 1
        assert self.particle_steps <= 21
        self.event('particle-lifetime', active=sum(p.state == 'active' for p in particles))
        if all(item.state == 'inactive' for item in particles):
            assert self.audio == ['explosion.wav']
            self.finish()
        self.previous = [state(item) for item in particles]
