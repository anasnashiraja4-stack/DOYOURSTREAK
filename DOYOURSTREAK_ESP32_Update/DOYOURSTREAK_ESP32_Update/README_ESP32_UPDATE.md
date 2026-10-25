# DOYOURSTREAK ESP32 Companion Update

## What changed
- OLED reacts to `HABIT_DONE` (happy for ~4 seconds) and `LEVEL_UP` (glee for ~5 seconds).
- Companion baseline mood follows daily habit completion from DOYOURSTREAK:
  - 0%: normal
  - 1–49%: focused
  - 50–99%: happy
  - 100%: glee
- OLED enters the `Sleepy` face after 12 seconds without a BLE command or detected workout movement.
- A new BLE command or workout movement wakes the face. Sleep timing runs on the ESP32, so it works even if the browser stops sending commands.
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
5. In Chrome or Edge, open DOYOURSTREAK through `localhost` or HTTPS and click the ESP32 connect button.

## BLE protocol
- `HABIT_DONE`
- `LEVEL_UP`
- `SYNC:xp:level:xpProgress:dailyPercent:completedHabits:totalHabits`

The firmware also accepts the old four-field `SYNC:xp:level:xpProgress` command. The daily mood needs the updated web app's extended `SYNC` command.

## Validation notes
- The web JavaScript passes `node --check`.
- Firmware source was reviewed for protocol and state consistency. A hardware upload/compile test was not run in this environment; verify with your exact Arduino IDE/library versions and ESP32 board.
