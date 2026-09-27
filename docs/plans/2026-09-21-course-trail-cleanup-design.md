# Course Trail Cleanup Design

## Goal

Keep lesson titles unobstructed by removing every decorative connector dot from the serpentine course trail, including the dots between the final lesson and the chest. Give the ready chest the same three-dimensional button treatment used by available lesson nodes.

## Design

`CourseTrail` will render only the lesson nodes, their labels, and the unit chest. The connector-dot component, its positioning constants, and the corresponding stylesheet rules will be removed.

The ready chest button will use the same `kids-node-link` interaction class as lesson buttons. The shared CSS selector will provide the resting shadow, hover lift, and pressed state for both anchors and buttons. Locked lesson nodes, decorative chests, and the opened chest remain visually flat and unchanged.

## Accessibility and behavior

The change does not alter labels, keyboard behavior, chest state transitions, course data, or server behavior. The ready chest remains a native button and lesson destinations remain links.

## Verification

- Assert that the course trail renders no connector-dot elements.
- Assert that the ready chest uses the shared interactive-node class.
- Run the focused course-trail and chest tests.
- Run the Community Kids static checks and the broader relevant test suite.
