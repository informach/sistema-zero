"""Real browser key/release observation and Stop/restart fixture, no injected keys.

All simulation methods, pools, media and author timers remain original. The
browser test sends trusted input and owns Stop; this module never ends the game.
"""
import json
import random
import sys
import time
import turtle
from _qa_space_observer import state

CONFIG = {"scenario": "input-lifecycle", "seed": 2026}
namespace = None
presentation = None
simulation_calls = 0
first_playing = False
pause_started = None
pause_frozen = None
pause_calls = None
pause_proved = False


def emit(kind, **value):
    print('__SZ_SPACE_INPUT__' + json.dumps(dict(kind=kind, clock=time.monotonic(),
          simulationCalls=simulation_calls, **value), separators=(',', ':')))


def snapshot():
    n = namespace
    return dict(player=state(n['player']), camera=state(n['camera']),
                enemies=[state(item) for item in n['enemies']],
                missiles=[state(item) for item in n['missiles']],
                stars=[state(item) for item in n['stars']],
                powerups=[state(item) for item in n['powerups']],
                particles=[state(item) for item in n['explosion'].particles + n['exhaust'].particles])


def pools():
    n = namespace
    sizes = dict(enemies=len(n['enemies']), missiles=len(n['missiles']),
                 stars=len(n['stars']), powerups=len(n['powerups']),
                 explosion=len(n['explosion'].particles), exhaust=len(n['exhaust'].particles))
    assert sizes == dict(enemies=25, missiles=30, stars=20, powerups=5, explosion=30, exhaust=20)
    return sizes


def binding(callback, key, release):
    if callback is None:
        return None

    def delivered(*args):
        global pause_started, pause_frozen, pause_calls, pause_proved
        before = state(namespace['player']) if namespace is not None else None
        callback(*args)
        if namespace is None:
            return
        if presentation is not None and not release and key in ('Left', 'Right', 'Up'):
            player = namespace['player']
            enabled = (player.da > 0 if key == 'Left' else
                       player.da < 0 if key == 'Right' else player.thrust > before['thrust'])
            presentation.begin(key, before, enabled)
        if key in ('p', 'P') and not release:
            if namespace['game'].state == 'paused':
                pause_started = time.monotonic()
                pause_frozen = snapshot()
                pause_calls = simulation_calls
                pause_proved = False
            else:
                pause_started = None
        emit('input-delivered', key=key, release=release,
             player=state(namespace['player']), gameState=namespace['game'].state,
             cameraVisible=namespace['camera'].visible, pools=pools(),
             activeMissiles=sum(item.state == 'active' for item in namespace['missiles']))

    return delivered


real_update = turtle.TurtleScreen.update
real_press = turtle.TurtleScreen.onkeypress
real_release = turtle.TurtleScreen.onkeyrelease


def press(self, callback, key=None):
    return real_press(self, binding(callback, key, False), key)


def release(self, callback, key=None):
    return real_release(self, binding(callback, key, True), key)


def update(self):
    global namespace, presentation, simulation_calls, first_playing, pause_proved
    n = sys._getframe(1).f_globals
    result = real_update(self)
    if 'game' not in n or 'exhaust' not in n:
        return result
    if namespace is None:
        namespace = n
        original = n['Sprite'].update

        def counted(*args, **kwargs):
            global simulation_calls
            simulation_calls += 1
            return original(*args, **kwargs)

        n['Sprite'].update = counted
        if CONFIG.get('causalPresentation'):
            from _qa_input_presentation import InputPresentation
            presentation = InputPresentation(self)
            player = n['player']
            original_render = player.render

            def rendered(pen, x_offset=0, y_offset=0):
                before = len(pen.stampItems)
                result = original_render(pen, x_offset, y_offset)
                # Pinned Player.render stamps the ship; an early return, inactive
                # player or camera-culled actor is not a presented gameplay effect.
                visible = (len(pen.stampItems) > before and
                           n['Sprite'].is_on_screen(player, n['SCREEN_WIDTH'],
                                                   n['SCREEN_HEIGHT'], x_offset, y_offset))
                presentation.rendered(state(player), visible=visible,
                                      active=player.state == 'active',
                                      playing=n['game'].state == 'playing')
                return result

            player.render = rendered
        emit('input-ready', gameState=n['game'].state, player=state(n['player']), pools=pools(), injectedState=False)
    if not first_playing and n['game'].state == 'playing' and simulation_calls > 0:
        first_playing = True
        emit('playing-frame', player=state(n['player']), pools=pools(), stampCount=len(n['pen'].stampItems))
    if pause_started is not None and not pause_proved and time.monotonic() - pause_started >= 1.2:
        assert n['game'].state == 'paused'
        assert snapshot() == pause_frozen and simulation_calls == pause_calls
        assert n['game'].frame == 0  # Original 1000ms FPS callback was serviced while paused.
        pause_proved = True
        emit('pause-proof', elapsedSeconds=time.monotonic() - pause_started,
             simulation=snapshot(), fpsFrame=n['game'].frame, pools=pools())
    return result


turtle.TurtleScreen.update = update
turtle.TurtleScreen.onkeypress = press
turtle.TurtleScreen.onkeyrelease = release
random.seed(CONFIG['seed'])
__import__('space_arena')  # Infinite original game; external real Stop owns termination.
