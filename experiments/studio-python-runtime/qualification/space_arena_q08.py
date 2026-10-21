"""Q08 real pause/event-pump and separate authored 120-second music replay.

Only QA bindings and extra observation timers are invoked. No author timer,
simulation method, audio, renderer or pool is replaced. Native input remains
explicitly QA callback invocation; these are not browser/endurance proofs.
"""
import time
from space_arena_observer import FunctionalComplete, Observer as ShortObserver, state


def simulation_snapshot(namespace):
    # The author's FPS timer may reset game.frame while paused. It is not a
    # simulation witness. Capture actual sprites and camera instead.
    return dict(sprites=[state(sprite) for sprite in namespace['sprites']],
                background=[state(sprite) for sprite in namespace['background_sprites']],
                camera=state(namespace['camera']),
                explosion=[state(p) for p in namespace['explosion'].particles],
                exhaust=[state(p) for p in namespace['exhaust'].particles])


class Observer(ShortObserver):
    def __init__(self, scenario, report, callbacks):
        super().__init__(scenario, report, callbacks)
        self.phase = 'starting'
        self.original_calls = dict(sprite=0, enemy=0, missile=0, camera=0, render=0)
        self.paused_pumps = 0

    def count_call(self, key):
        self.original_calls[key] += 1

    def install(self, namespace):
        super().install(namespace)
        for name, method, key in (('Sprite', 'update', 'sprite'), ('Enemy', 'update', 'enemy'),
                                  ('Missile', 'update', 'missile'), ('Camera', 'update', 'camera'),
                                  ('Game', 'render_info', 'render')):
            self.wrap(namespace[name], method,
                      before=lambda *args, _key=key, **kwargs: self.count_call(_key))

    def begin_pause(self, phase):
        n = self.namespace
        assert n['game'].state == 'playing'
        self.key('p')
        assert n['game'].state == 'paused'
        self.phase = phase
        self.frozen_calls = dict(self.original_calls)
        self.frozen_simulation = simulation_snapshot(n)
        self.pause_started = time.monotonic()
        self.event('pause-began', phase=phase, originalCalls=self.frozen_calls,
                   simulation=self.frozen_simulation, gameFrame=n['game'].frame)

    def assert_frozen(self):
        assert self.namespace['game'].state == 'paused'
        assert self.original_calls == self.frozen_calls
        assert simulation_snapshot(self.namespace) == self.frozen_simulation

    def pause_probe(self):
        self.assert_frozen()
        elapsed = time.monotonic() - self.pause_started
        assert elapsed >= 1.2
        assert self.namespace['game'].frame == 0  # Real authored 1000ms FPS timer serviced.
        assert self.namespace['camera'].visible is True
        self.key('C')
        assert self.namespace['camera'].visible is False
        self.event('pause-proof', elapsedSeconds=elapsed, originalCalls=dict(self.original_calls),
                   pausedEventPumps=self.paused_pumps, fpsFrame=self.namespace['game'].frame,
                   simulation=self.frozen_simulation)
        self.key('P')
        assert self.namespace['game'].state == 'playing'
        self.phase = 'await-resumed-frame'

    def update(self, namespace):
        if self.namespace is None:
            self.install(namespace)
            assert namespace['game'].state == 'splash'
            self.key('s')
            self.phase = 'await-first-frame'
            return
        if self.phase == 'await-first-frame':
            assert self.original_calls['sprite'] > 0 and self.original_calls['enemy'] == 25
            self.check_pools()
            self.begin_pause('await-pause-probe')
            assert namespace['camera'].visible is False
            self.key('c')
            assert namespace['camera'].visible is True
            # Visibility is an allowed input state change, not movement/rendering.
            self.frozen_simulation = simulation_snapshot(namespace)
            namespace['wn'].ontimer(self.pause_probe, 1200)
            return
        if self.phase == 'await-pause-probe':
            self.paused_pumps += 1
            return
        if self.phase == 'await-resumed-frame':
            if self.original_calls == self.frozen_calls:
                return  # The paused update that serviced P has not simulated yet.
            assert namespace['game'].state == 'playing'
            assert self.original_calls['sprite'] > self.frozen_calls['sprite']
            assert self.original_calls['enemy'] > self.frozen_calls['enemy']
            assert self.original_calls['render'] > self.frozen_calls['render']
            self.check_pools()
            self.event('resume-proof', originalCalls=dict(self.original_calls),
                       previousCalls=self.frozen_calls, simulation=simulation_snapshot(namespace))
            if self.scenario == 'Q08-pause':
                self.finish()
            else:
                self.begin_pause('await-real-music-replay')
            return
        if self.phase == 'await-real-music-replay':
            self.paused_pumps += 1
            bgm = [play for play in self.report['audioPlays'] if play['path'] == 'bgm.wav']
            if len(bgm) < 2:
                return
            assert len(bgm) == 2
            self.assert_frozen()
            assert bgm[0]['sha256'] == bgm[1]['sha256'] == 'fdccf404c0bed8bb43efaeee2cc5b6d74cd02ae9d10b5041ca3d135c530f62b2'
            interval = bgm[1]['clock'] - bgm[0]['clock']
            assert interval >= 120, 'Do not accelerate the author music timer'
            assert bgm[0]['handle'] != bgm[1]['handle']
            assert 2 <= bgm[1]['activeVoices'] <= 16  # Original WAV lasts >120s, so overlap is real.
            self.event('music-replay-proof', intervalSeconds=interval, plays=bgm,
                       originalCalls=dict(self.original_calls), pausedEventPumps=self.paused_pumps)
            self.key('p')
            self.phase = 'await-final-playing-frame'
            return
        if self.phase == 'await-final-playing-frame':
            if self.original_calls == self.frozen_calls:
                return
            assert self.original_calls['render'] > self.frozen_calls['render']
            self.check_pools()
            self.finish()  # End only after the actual final playing frame's pen.clear.
