# Vita ESP32 — PlayfulTechnology Animated Eyes

This project combines the dynamic animated eyes from `playfultechnology/esp32-eyes`
with Vita's existing BLE + MPU6050 workout counter.

## Hardware / pins
- ESP32
- SSD1306 OLED 128x64, I2C address `0x3C`
- MPU6050, I2C address `0x68`
- Shared I2C: SDA GPIO 21, SCL GPIO 22

Both the OLED and MPU6050 share the same I2C bus. `Face.cpp` was adjusted to use
the default ESP32 `Wire` pins instead of the original repo's GPIO 4/5.

## Arduino IDE libraries
Install **U8g2** by olikraus from Library Manager.
The ESP32 BLE library is normally included with the ESP32 board package.

## Upload
1. Extract this ZIP.
2. Open `Vita_ESP32_PlayfulEyes.ino` from the extracted `Vita_ESP32_PlayfulEyes` folder.
3. Select your ESP32 board and COM port.
4. Compile and upload.
5. Open Serial Monitor at 115200 baud.

Keep the `.ino`, all `.h` files, and all `.cpp` files in the same sketch folder.
Do not copy only the `.ino`; the animation library source files are required.

## Behaviour
- The eyes move to random gaze directions automatically (`RandomLook = true`).
- Automatic blinking is enabled.
- Expression changes are triggered by workout events (moving up, rep completed,
  next set, workout done, and sensor error).
- BLE UUIDs and messages are retained from Vita.
- The face keeps updating when no workout is selected and after a workout finishes;
  the old blocking `while(true)` after the final set has been removed.

## Notes
This package has been adapted from the upstream `playfultechnology/esp32-eyes`
source. That project is licensed under GNU AGPL v3; see `LICENSE`.
Check the upstream repository for its full license terms and attribution.


## Angry and anxious/worried expressions
- `FaceExpression::GoTo_Angry()` and `GoTo_Worried()` use the library's existing smooth eye transitions.
- If the MPU6050 cannot be read, Vita now shows the worried expression.
- To preview expressions over BLE, write `MOOD:ANGRY` or `MOOD:WORRIED` (also accepts `MOOD:ANXIOUS`) to the existing characteristic. These commands do not change the workout counter.
- `WORKOUT FAILED` and `FORM ERROR` status triggers map to the angry expression if called by future code.


Timed emotion behavior: while idle, the face cycles Angry (2.2 s), Worried (2.2 s), Normal (5 s), then waits 9 s before repeating. During an active workout, workout moods take priority.

## OLED mini games and animation
- Press D18 once to open or close the player menu. Triple-press D18 to move through the right page's entries, then the three arcade games, then the focus timer page. Press D19 to activate the selected item.
- `DICE ROLL` shakes the eyes and a bouncing die, then displays a random result. Press D19 after the result to roll again.
- On the right page, `EYE SPIN` animates Vita's real eyes in a smooth shared orbit for 2 seconds, with a 2-second cycle.
- The left page contains `DINO HOP`, a pixel-art endless runner with score, clouds, terrain, and a jumping character. Press D19 to jump; after a collision press D19 to retry. D18 opens the menu to leave the game.
- The left page also contains `ROOF CAT`, a moonlit rooftop runner, and `FLAPPY`, a night-sky pipe-dodging game. Press D19 to jump across roofs or flap through the pipe gaps; D19 restarts either game after a crash.
- The next menu page contains `FOCUS TIMER`, a retro 25-minute focus session. D19 starts, pauses, resumes, or restarts a completed session; the countdown continues while the menu is open.
- Outside the menu and game, D19 retains the existing double-press fish feeding action.
- On startup and every five minutes while the main face is visible, Vita shows happy eyes and a small waving-hand animation for 3 seconds. A menu/game in progress postpones the greeting until the face returns.
- After 12 seconds without activity, Vita squints sleepily for 3 seconds before the sleepy face and floating `Zzz` animation begin. Any button press or BLE activity cancels the drowsy transition.
