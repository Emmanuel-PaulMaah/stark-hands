# stark hands

a hand gesture brightness controller that uses your hand to adjust lamp brightness & rotation through a webcam.

## features

- **hand detection**: uses mediapipe to detect & track hand landmarks in real-time
- **brightness control**: pinch your thumb & index finger & rotate your hand to adjust brightness from 0-100%
- **visual feedback**: real-time canvas visualization with hand skeleton, landmarks, & a knob hud display
- **dom bulb animation**: an interactive light bulb that responds to brightness changes with dynamic glow & color shifts
- **responsive design**: works on different screen sizes with adaptive layouts

## how it works

1. **hand detection**: the app streams your webcam & detects hand landmarks using mediapipe
2. **pinch gesture**: pinching your thumb & index finger activates control mode
3. **rotation tracking**: while pinching, rotating your hand controls the brightness value
4. **visual feedback**: see the control knob on the right side of the canvas & watch the dom bulb react in real-time

## technologies

- html5 canvas for hand skeleton & knob visualization
- mediapipe for hand detection & tracking
- vanilla javascript for gesture recognition & brightness mapping
- css with custom properties for dynamic styling & animations

## getting started

open `stark_hand_control.html` in a modern web browser. the app will request camera permissions & begin hand detection automatically.
