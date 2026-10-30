# DOYOURSTREAK ESP32 Companion Update

## What changed
- OLED reacts to `HABIT_DONE` (happy for ~4 seconds) and `LEVEL_UP` (glee for ~5 seconds).
- Companion baseline mood follows daily habit completion from DOYOURSTREAK:
  - 0%: normal
  - 1–49%: focused
  - 50–99%: happy
  - 100%: glee
- OLED enters the `Sleepy` face after 12 seconds without a BLE command or detected workout movement, with animated floating `Zzz` marks.
- Waking from sleep triggers a brief surprised expression before returning to the current progress mood.
- MPU6050 motion interaction runs even when no workout is selected: gentle tilt left/right makes the eyes glance in that direction; a sharp movement triggers a surprised face; returning the board to level brings the eyes forward again. Tilt thresholds use hysteresis and sharp-motion reactions have a cooldown to reduce jitter/repeated triggers.
- Menu rendering pauses the animated face renderer while the menu is open, preventing OLED frame flicker.
- If `player.png` (or another character image) is missing, the web app shows a dog companion instead of a blank character area. Reactions also display a speech bubble. Keep your original image assets next to `index.html` when installing the update.
- The web character has three reactions: a happy bounce for completed habits, a level-up celebration, and a streak shake every 7 days. ESP32 connection state stays visible in the app header.
- D18 opens a pixel RPG OLED menu with total XP, XP progress, level, and daily quest progress. D8/D9 move the highlighted menu item; shake the device to return to the animated eyes. Outside the menu, D8 still shows total XP and D9 shows level/current XP progress for 3 seconds.
- A BLE command, physical button press, or detected workout movement wakes the face. Sleep timing runs on the ESP32, so it works even if the browser stops sending commands.
- Existing service/characteristic UUIDs are preserved.

## Install the web update
1. Back up your current project.
2. Replace your website's `app.js` with `website/app.js` from this package.
3. The HTML and CSS are included as reference copies; they are not required to change for these features.
4. Keep `premium.js` and your existing image assets in the project.

## Flash the ESP32
1. Open `firmware/Vita_ESP32_PlayfulEyes/Vita_ESP32_PlayfulEyes.ino` in Arduino IDE.
2. Keep all the `.h` and `.cpp` files in the same `Vita_ESP32_PlayfulEyes` sketch folder.
3. Install the dependencies already used by this sketch/project (ESP32 Arduino core, ESP32 BLE library, and the bundled `esp32-eyes` face sources).
4. Select your ESP32 board/port and upload.
5. Wire each physical button between its GPIO pin and GND; the firmware uses `INPUT_PULLUP`, so a pressed button reads LOW.
   - D18: open/close the pixel RPG menu; D8/D9 browse its stats; shake to return to the eyes.
   - Outside the menu, D8 shows total XP and D9 shows level/XP progress.
   - Pin labels differ by ESP32 board. The sketch uses board aliases `D8`/`D9`/`D18` if available; otherwise D8/D9/D18 fall back to GPIO25/GPIO19/GPIO18 respectively. **Check your exact board pinout before wiring** and change `XP_BUTTON_PIN`, `LEVEL_BUTTON_PIN`, or `MENU_BUTTON_PIN` near the top of the `.ino` if needed. Do not assume the silkscreen label maps the same way on every board.
6. In Chrome or Edge, open DOYOURSTREAK through `localhost` or HTTPS and click the ESP32 connect button.

## BLE protocol
- `HABIT_DONE`
- `LEVEL_UP`
- `SYNC:xp:level:xpProgress:dailyPercent:completedHabits:totalHabits`

The firmware also accepts the old four-field `SYNC:xp:level:xpProgress` command. The daily mood needs the updated web app's extended `SYNC` command.

## Motion interaction notes
- Keep the MPU6050 wired to the same I2C pins configured in the sketch (`SDA=21`, `SCL=22`, address `0x68`) unless your board uses a different mapping.
- Tilt direction depends on how the MPU6050 module is mounted. If the eyes look in the opposite direction from the physical tilt, swap the `LookLeft()` / `LookRight()` calls in `updateMotionInteraction()`.
- The sharp-motion threshold is set to a deviation of about 0.38 g from the expected 1 g acceleration magnitude; if it reacts too easily or not enough, adjust `dynamicAcceleration > 6200.0f`.

## Validation notes
- The web JavaScript passes `node --check`.
- Firmware source was reviewed for protocol and state consistency. A hardware upload/compile test was not run in this environment; verify with your exact Arduino IDE/library versions and ESP32 board. The physical D8/D9 mapping must be checked against your specific board.

---
Kembali ke Index: [[Welcome]] | Dok Utama: [[README]]
---

# ESP32 Update Log

Detail firmware dan antarmuka web untuk ESP32:
- Folder Firmware: Sub-folder `firmware`
- Website Interface: Sub-folder `website`
