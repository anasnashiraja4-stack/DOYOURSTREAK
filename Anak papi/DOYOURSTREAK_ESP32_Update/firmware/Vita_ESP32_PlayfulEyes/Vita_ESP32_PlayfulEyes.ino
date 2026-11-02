#include <Wire.h>
#include <math.h>
#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEUtils.h>
#include <BLE2902.h>
#include "Face.h"

#define SDA_PIN 21
#define SCL_PIN 22
#define MPU_ADDR 0x68

// Button aliases are board-specific. Prefer D8/D9 when available; GPIO18 is
// reserved for the requested D18 menu button on generic ESP32 boards.
#if defined(D8)
  #define XP_BUTTON_PIN D8
#else
  #define XP_BUTTON_PIN 25
#endif
#if defined(D9)
  #define LEVEL_BUTTON_PIN D9
#else
  #define LEVEL_BUTTON_PIN 26
#endif
#if defined(D18)
  #define MENU_BUTTON_PIN D18
#else
  #define MENU_BUTTON_PIN 18
#endif
#if defined(D19)
  #define FEED_BUTTON_PIN D19
#else
  #define FEED_BUTTON_PIN 19
#endif

#define SERVICE_UUID "12345678-1234-1234-1234-123456789001"
#define CHARACTERISTIC_UUID "12345678-1234-1234-1234-123456789002"

const int targetReps = 10;
const int targetSets = 3;

enum PendingMood { MOOD_NONE, MOOD_NORMAL, MOOD_FOCUSED, MOOD_GLEE, MOOD_HAPPY, MOOD_ANGRY, MOOD_WORRIED };
volatile PendingMood pendingMood = MOOD_NONE;
PendingMood companionMood = MOOD_NONE;

BLECharacteristic *characteristic = nullptr;
Face *face = nullptr;
// DOYOURSTREAK authoritative stats, rendered by Face.cpp on the OLED.
int doYourXP = 0;
int doYourLevel = 1;
int doYourProgress = 0;
int dailyPercent = 0;
int dailyCompleted = 0;
int dailyTotal = 0;
bool deviceConnected = false;
bool companionMoodActive = false;
unsigned long companionMoodUntil = 0;
// Begin dozing after 12 seconds idle, then enter sleep after the 3-second drowsy cue.
const unsigned long sleepAfterMs = 12000;
const unsigned long drowsyBeforeSleepMs = 3000;
unsigned long lastActivityAt = 0;
bool sleepMode = false;
bool dozingOff = false;
unsigned long dozingStartedAt = 0;
unsigned long wakeReactionUntil = 0;
// MPU6050 motion interaction (independent of workout tracking).
// Gentle tilt controls eye direction; a sharp acceleration triggers surprise.
const unsigned long motionSampleIntervalMs = 70;
const unsigned long lookReturnDelayMs = 1100;
const unsigned long sharpMotionCooldownMs = 1800;
unsigned long lastMotionSampleAt = 0;
unsigned long lastTiltActivityAt = 0;
unsigned long lastSharpReactionAt = 0;
unsigned long lastNonNeutralTiltAt = 0;
int currentTiltDirection = 0; // -1 = left, +1 = right, 0 = neutral
int appliedLookDirection = 0;
bool motionSensorAvailable = false;
// XP details are shown briefly after a physical button press.
enum StatsOverlay { STATS_NONE, STATS_XP, STATS_LEVEL };
StatsOverlay statsOverlay = STATS_NONE;
unsigned long statsOverlayUntil = 0;
bool menuOpen = false;
uint8_t menuSelection = 0;
uint8_t menuPage = 0; // 0 = right/status page, 1 = left/mini-game page
const uint8_t menuItemCount = 10;
const unsigned long hungerIntervalMs =  5UL * 60UL * 1000UL;
const unsigned long greetingIntervalMs = 5UL * 60UL * 1000UL;
const unsigned long greetingDurationMs = 3000UL;
unsigned long lastGreetingAt = 0;
unsigned long greetingAnimationUntil = 0;
const unsigned long doublePressWindowMs = 650;
unsigned long lastFedAt = 0;
unsigned long lastFeedPressAt = 0;
unsigned long feedReactionUntil = 0;
unsigned int fishMeals = 0;
bool hungry = false;
bool eyesSpinActive = false;
bool dinoGameActive = false;
bool dinoGameOver = false;
int dinoScore = 0, dinoY = 0, dinoVelocity = 0, obstacleX = 128;
unsigned long eyesSpinUntil = 0, lastGameFrameAt = 0;
bool roofCatGameActive = false, roofCatGameOver = false, roofCatGrounded = true;
int roofCatScore = 0, roofCatSurfaceY = 47, roofCatNextY = 42, roofCatNextX = 150, roofCatGap = 22, roofCatSpeed = 2;
float roofCatY = 31.0f, roofCatVelocity = 0.0f;
unsigned long lastRoofFrameAt = 0;
bool flappyGameActive = false, flappyGameOver = false, flappyPipeScored = false;
int flappyScore = 0, flappyPipeX = 128, flappyGapY = 33;
float flappyBirdY = 32.0f, flappyBirdVelocity = 0.0f;
unsigned long lastFlappyFrameAt = 0;
const unsigned long focusDurationMs = 25UL * 60UL * 1000UL;
bool focusTimerScreenActive = false, focusTimerRunning = false, focusTimerDone = false;
unsigned long focusTimerEndAt = 0, focusRemainingMs = focusDurationMs;
bool diceScreenActive = false, diceRolling = false;
uint8_t diceValue = 1;
unsigned long diceStartedAt = 0, diceScreenUntil = 0, lastDiceShuffleAt = 0;
PendingMood progressMood = MOOD_NORMAL;
bool exerciseSelected = false;
bool armUp = false;
bool workoutFinished = false;
String selectedExercise = "";
int reps = 0;
int currentSet = 1;


// Mood is derived from DOYOURSTREAK's daily habit completion percentage.
// Habit completion reactions temporarily override this baseline mood.

void showOLED(const String &status) {
  // The esp32-eyes library draws the face dynamically, so status strings
  // are mapped to expressions rather than printed over the eyes.
  if (status == "CHECK MPU6050") pendingMood = MOOD_WORRIED;
  else if (status == "WORKOUT FAILED" || status == "FORM ERROR") pendingMood = MOOD_ANGRY;
  else if (status == "MOVING UP") pendingMood = MOOD_FOCUSED;
  else if (status == "REP COMPLETED") pendingMood = MOOD_GLEE;
  else if (status == "NEXT SET") pendingMood = MOOD_HAPPY;
  else if (status == "WORKOUT DONE!") pendingMood = MOOD_HAPPY;
  else if (status.startsWith("READY")) pendingMood = MOOD_NORMAL;
}

void applyMood(PendingMood mood) {
  if (face == nullptr) return;
  switch (mood) {
    case MOOD_NORMAL: face->Expression.GoTo_Normal(); break;
    case MOOD_FOCUSED: face->Expression.GoTo_Focused(); break;
    case MOOD_GLEE: face->Expression.GoTo_Glee(); break;
    case MOOD_HAPPY: face->Expression.GoTo_Happy(); break;
    case MOOD_ANGRY: face->Expression.GoTo_Angry(); break;
    case MOOD_WORRIED: face->Expression.GoTo_Worried(); break;
    default: break;
  }
}

void drawWaveLine(float angle, int x1, int y1, int x2, int y2) {
  const float c = cosf(angle), s = sinf(angle);
  const int pivotX = 110, pivotY = 42;
  const int screenX1 = pivotX + (int)(x1 * c - y1 * s);
  const int screenY1 = pivotY + (int)(x1 * s + y1 * c);
  const int screenX2 = pivotX + (int)(x2 * c - y2 * s);
  const int screenY2 = pivotY + (int)(x2 * s + y2 * c);
  u8g2.drawLine(screenX1, screenY1, screenX2, screenY2);
}

void drawWaveDot(float angle, int x, int y) {
  const float c = cosf(angle), s = sinf(angle);
  u8g2.drawPixel(110 + (int)(x * c - y * s), 42 + (int)(x * s + y * c));
}

void drawGreetingWave(unsigned long now) {
  if (greetingAnimationUntil == 0 || (long)(now - greetingAnimationUntil) >= 0) return;
  const unsigned long elapsed = now - (greetingAnimationUntil - greetingDurationMs);
  const float wave = sinf((float)elapsed / 145.0f);
  const float angle = 0.12f + wave * 0.52f;
  // Forearm and striped cuff stay anchored while the whole glove swings from
  // the wrist, giving the wave a clear, fluid pivot instead of a stiff slide.
  u8g2.drawLine(113, 55, 111, 43); u8g2.drawLine(115, 55, 113, 43);
  u8g2.drawRFrame(106, 40, 9, 6, 2);
  u8g2.drawLine(108, 41, 108, 44); u8g2.drawLine(111, 41, 111, 44);
  // Rounded mitten outline with four soft fingers and a thumb.
  drawWaveLine(angle, 0, 0, -4, -2); drawWaveLine(angle, -4, -2, -10, -6);
  drawWaveLine(angle, -10, -6, -14, -9); drawWaveLine(angle, -14, -9, -13, -12);
  drawWaveLine(angle, -13, -12, -11, -12); drawWaveLine(angle, -11, -12, -7, -9);
  drawWaveLine(angle, -7, -9, -8, -21); drawWaveLine(angle, -8, -21, -6, -23);
  drawWaveLine(angle, -6, -23, -4, -21); drawWaveLine(angle, -4, -21, -4, -10);
  drawWaveLine(angle, -4, -10, -4, -25); drawWaveLine(angle, -4, -25, -1, -27);
  drawWaveLine(angle, -1, -27, 1, -25); drawWaveLine(angle, 1, -25, 1, -10);
  drawWaveLine(angle, 1, -10, 3, -22); drawWaveLine(angle, 3, -22, 6, -23);
  drawWaveLine(angle, 6, -23, 7, -20); drawWaveLine(angle, 7, -20, 5, -8);
  drawWaveLine(angle, 5, -8, 9, -17); drawWaveLine(angle, 9, -17, 12, -17);
  drawWaveLine(angle, 12, -17, 13, -14); drawWaveLine(angle, 13, -14, 9, -5);
  drawWaveLine(angle, 9, -5, 5, -2); drawWaveLine(angle, 5, -2, 0, 0);
  // Sweet face and little palm creases follow the glove's rotation too.
  if ((elapsed / 500) % 3 == 2) {
    drawWaveLine(angle, -6, -8, -4, -8); drawWaveLine(angle, 3, -8, 5, -8);
  } else { drawWaveDot(angle, -5, -8); drawWaveDot(angle, 4, -8); }
  drawWaveLine(angle, -1, -5, 1, -4); drawWaveLine(angle, 1, -4, 3, -5);
  drawWaveLine(angle, -3, -11, 5, -11);
  // Twinkles brighten on alternating beats while the wrist keeps swaying.
  u8g2.drawPixel(91, 20); u8g2.drawPixel(91, 24); u8g2.drawPixel(89, 22); u8g2.drawPixel(93, 22);
  const int sparkleX = 119 + (int)(wave * 2.0f);
  if ((elapsed / 180) % 2 == 0) { u8g2.drawPixel(sparkleX, 30); u8g2.drawPixel(sparkleX - 2, 32); u8g2.drawPixel(sparkleX + 2, 32); u8g2.drawPixel(sparkleX, 34); }
  u8g2.setFont(u8g2_font_5x8_tf);
  u8g2.drawRFrame(107, 4, 17, 11, 3);
  u8g2.drawStr(111, 12, "HI!");
}

void registerActivity() {
  lastActivityAt = millis();
  if (dozingOff) {
    dozingOff = false;
    if (face != nullptr) {
      face->RandomLook = true;
      if (!companionMoodActive) {
        if (hungry) face->Expression.GoTo_Sad();
        else applyMood(progressMood);
      }
    }
  }
  if (sleepMode) {
    sleepMode = false;
    if (face != nullptr) {
      face->RandomBlink = true;
      face->RandomLook = true;
      // A quick surprised face makes waking feel like a real reaction.
      face->Expression.GoTo_Surprised();
      wakeReactionUntil = millis() + 1200;
    }
    Serial.println("ESP32 woke up! SURPRISED reaction");
  }
}

void setSpinningGaze(float x, float y) {
  // Match LookAssistant's natural eye movement, but set a continuously moving
  // target directly so its 200 ms easing never restarts on every display frame.
  const float verticalScale = 1.0f - fabsf(y) * 0.4f;
  Transformation right;
  right.MoveX = -25.0f * x; right.MoveY = 20.0f * y;
  right.ScaleX = 1.0f; right.ScaleY = (1.0f - x * 0.2f) * verticalScale;
  Transformation left = right;
  left.ScaleY = (1.0f + x * 0.2f) * verticalScale;
  EyeTransformation *transforms[2] = {&face->RightEye.Transformation, &face->LeftEye.Transformation};
  Transformation poses[2] = {right, left};
  for (uint8_t i = 0; i < 2; ++i) {
    transforms[i]->Origin = poses[i];
    transforms[i]->Current = poses[i];
    transforms[i]->Destin = poses[i];
  }
}

void resetFlappyGame(unsigned long now) {
  flappyGameActive = true; flappyGameOver = false; flappyPipeScored = false;
  flappyScore = 0; flappyBirdY = 36.0f; flappyBirdVelocity = 0.0f;
  flappyPipeX = 128; flappyGapY = random(25, 46); lastFlappyFrameAt = now;
  dinoGameActive = false; roofCatGameActive = false;
}

void startDiceRoll(unsigned long now) {
  diceScreenActive = true; diceRolling = true;
  diceValue = random(1, 7); diceStartedAt = now; lastDiceShuffleAt = 0; diceScreenUntil = now + 1700;
  dinoGameActive = false; roofCatGameActive = false; flappyGameActive = false; focusTimerScreenActive = false; eyesSpinActive = false;
  face->RandomLook = false; face->RandomBlink = false;
}

void drawDiceFace3D(int x, int y, uint8_t value) {
  // Isometric cube: outlined front, bright top, and shaded right face.
  const int ax = x + 2, ay = y + 7;
  const int bx = x + 20, by = y + 7;
  const int cx = x + 20, cy = y + 25;
  const int dx = x + 2, dy = y + 25;
  const int ex = x + 8, ey = y + 1;
  const int fx = x + 26, fy = y + 1;
  const int gx = x + 26, gy = y + 19;
  u8g2.drawLine(ax, ay, bx, by); u8g2.drawLine(bx, by, cx, cy);
  u8g2.drawLine(cx, cy, dx, dy); u8g2.drawLine(dx, dy, ax, ay);
  u8g2.drawLine(ax, ay, ex, ey); u8g2.drawLine(ex, ey, fx, fy);
  u8g2.drawLine(fx, fy, bx, by); u8g2.drawLine(fx, fy, gx, gy);
  u8g2.drawLine(gx, gy, cx, cy);
  // Top bevels and right-face hatching give the tiny OLED die some depth.
  u8g2.drawLine(ex + 2, ey + 2, fx - 2, fy + 2);
  u8g2.drawLine(bx + 3, by + 4, gx - 3, gy - 4);
  u8g2.drawLine(bx + 6, by + 4, gx - 1, gy - 4);
  u8g2.drawLine(x + 11, y + 4, x + 13, y + 4);
  u8g2.drawLine(x + 15, y + 4, x + 17, y + 4);
  // Pips on the front face use the familiar 1–6 layouts.
  if (value == 1 || value == 3 || value == 5) u8g2.drawDisc(x + 11, y + 16, 1);
  if (value >= 2) { u8g2.drawDisc(x + 6, y + 11, 1); u8g2.drawDisc(x + 16, y + 21, 1); }
  if (value >= 4) { u8g2.drawDisc(x + 16, y + 11, 1); u8g2.drawDisc(x + 6, y + 21, 1); }
  if (value == 6) { u8g2.drawDisc(x + 6, y + 16, 1); u8g2.drawDisc(x + 16, y + 16, 1); }
}

void drawStatsOverlayAndSleepZzz() {
  if (face == nullptr) return;
  const unsigned long now = millis();

  if (menuOpen) {
    u8g2.clearBuffer();
    u8g2.setDrawColor(1);
    u8g2.drawFrame(1, 1, 126, 62);
    u8g2.drawBox(3, 3, 122, 11);
    u8g2.setDrawColor(0);
    u8g2.setFont(u8g2_font_5x8_tf);
    u8g2.drawStr(7, 12, menuPage == 0 ? "VITA // RIGHT PAGE" : (menuPage == 1 ? "VITA // GAME ARCADE" : "VITA // FOCUS TIMER"));
    u8g2.setDrawColor(1);
    const char *labels[menuItemCount] = {"TOTAL XP", "XP PROGRESS", "LEVEL", "DAILY QUESTS", "EYE SPIN", "DICE ROLL", "DINO HOP", "ROOF CAT", "FLAPPY", "FOCUS TIMER"};
    char values[menuItemCount][24];
    snprintf(values[0], sizeof(values[0]), "%d XP", doYourXP);
    snprintf(values[1], sizeof(values[1]), "%d / 100", doYourProgress);
    snprintf(values[2], sizeof(values[2]), "LV %d", doYourLevel);
    snprintf(values[3], sizeof(values[3]), "%d / %d  %d%%", dailyCompleted, dailyTotal, dailyPercent);
    snprintf(values[4], sizeof(values[4]), "PLAY");
    snprintf(values[5], sizeof(values[5]), "PLAY");
    snprintf(values[6], sizeof(values[6]), "PLAY");
    snprintf(values[7], sizeof(values[7]), "PLAY");
    snprintf(values[8], sizeof(values[8]), "OPEN");
    snprintf(values[9], sizeof(values[9]), "OPEN");
    for (uint8_t i = 0; i < menuItemCount; ++i) {
      if ((menuPage == 0 && i >= 6) || (menuPage == 1 && (i < 6 || i >= 9)) || (menuPage == 2 && i != 9)) continue;
      const int y = menuPage == 0 ? 19 + i * 6 : (menuPage == 1 ? 26 + (i - 6) * 12 : 37);
      if (i == menuSelection) { u8g2.drawBox(5, y - 5, 118, 7); u8g2.setDrawColor(0); }
      u8g2.drawStr(9, y, labels[i]);
      if (menuPage == 0 && i < 4) u8g2.drawStr(77, y, values[i]);
      else u8g2.drawStr(menuPage == 0 ? 103 : 103, y, values[i]);
      u8g2.setDrawColor(1);
    }
    if (menuPage == 2) { u8g2.setFont(u8g2_font_5x8_tf); u8g2.drawStr(15, 51, "25 MIN // DEEP FOCUS"); }
    else if (menuPage == 0) u8g2.drawBox(6, 13 + menuSelection * 6, 2, 2);
    u8g2.setFont(u8g2_font_4x6_tf);
    u8g2.drawStr(8, 60, "D18 x3 NEXT  D19 PLAY");
    u8g2.sendBuffer();
    return;
  }

  if (diceScreenActive) {
    if (diceRolling) {
      const float shakePhase = (float)(now - diceStartedAt);
      face->RandomLook = false;
      setSpinningGaze(0.85f * sinf(shakePhase / 38.0f), 0.72f * cosf(shakePhase / 31.0f));
    }
    face->Update();
    const int dieX = diceRolling ? 50 + (int)(sinf((float)now / 34.0f) * 22.0f) : 50;
    const int dieY = diceRolling ? 26 + (int)(fabsf(sinf((float)now / 47.0f)) * 4.0f) : 26;
    u8g2.drawHLine(dieX + 5, 57, 17);
    drawDiceFace3D(dieX, dieY, diceValue);
    u8g2.setFont(u8g2_font_5x8_tf);
    u8g2.drawStr(10, 10, diceRolling ? "LUCKY ROLL // SHAKING" : "YOUR LUCKY NUMBER");
    u8g2.setFont(u8g2_font_4x6_tf);
    u8g2.drawStr(18, 62, diceRolling ? "EYES SHAKE // DICE ROLL" : "D19 REROLL // D18 MENU");
    u8g2.sendBuffer(); return;
  }

  if (focusTimerScreenActive) {
    u8g2.clearBuffer();
    u8g2.drawFrame(1, 1, 126, 62); u8g2.drawFrame(4, 4, 120, 56);
    u8g2.setFont(u8g2_font_5x8_tf);
    u8g2.drawStr(8, 12, "VITA FOCUS DECK // 01");
    u8g2.drawHLine(10, 16, 108);
    // Retro pixel ticks around the timer face.
    for (int i = 0; i < 12; ++i) {
      const int x = 13 + i * 9;
      u8g2.drawVLine(x, 20, (i % 3 == 0) ? 4 : 2);
    }
    const unsigned long remaining = focusTimerRunning && (long)(focusTimerEndAt - now) > 0
      ? focusTimerEndAt - now : focusRemainingMs;
    const unsigned int minutes = remaining / 60000UL;
    const unsigned int seconds = (remaining / 1000UL) % 60UL;
    char clockText[8]; snprintf(clockText, sizeof(clockText), "%02u:%02u", minutes, seconds);
    u8g2.setFont(u8g2_font_logisoso24_tf);
    u8g2.drawStr(23, 44, clockText);
    u8g2.setFont(u8g2_font_5x8_tf);
    const char *timerStatus = focusTimerDone ? "SESSION COMPLETE" : (focusTimerRunning ? "FOCUS MODE // LOCK IN" : (focusRemainingMs == focusDurationMs ? "READY WHEN YOU ARE" : "PAUSED // READY SOON"));
    u8g2.drawStr(13, 51, timerStatus);
    u8g2.drawFrame(10, 54, 108, 4);
    const unsigned long elapsed = focusDurationMs - remaining;
    int fill = (int)(104UL * elapsed / focusDurationMs);
    if (focusTimerDone) fill = 104;
    if (fill > 0) u8g2.drawBox(12, 55, fill, 2);
    u8g2.setFont(u8g2_font_4x6_tf);
    u8g2.drawStr(16, 64, focusTimerDone ? "D19 RESTART  //  D18 MENU" : (focusTimerRunning ? "D19 PAUSE  //  D18 MENU" : "D19 START  //  D18 MENU"));
    u8g2.sendBuffer(); return;
  }

  if (flappyGameActive) {
    u8g2.clearBuffer();
    u8g2.drawBox(0, 0, 128, 13); u8g2.setDrawColor(0); u8g2.setFont(u8g2_font_5x8_tf);
    u8g2.drawStr(4, 9, flappyGameOver ? "FLAPPY // CRASH!" : "FLAPPY // SKY DASH");
    char scoreLine[16]; snprintf(scoreLine, sizeof(scoreLine), "SCORE %03d", flappyScore);
    u8g2.drawStr(83, 9, scoreLine); u8g2.setDrawColor(1);
    // Night-sky scene: moon, stars, distant city and layered cloud streaks.
    u8g2.drawDisc(110, 23, 6); u8g2.setDrawColor(0); u8g2.drawDisc(113, 21, 6); u8g2.setDrawColor(1);
    u8g2.drawPixel(12, 20); u8g2.drawPixel(60, 17); u8g2.drawPixel(76, 29); u8g2.drawPixel(121, 27);
    u8g2.drawHLine(3, 32, 9); u8g2.drawHLine(7, 30, 5); u8g2.drawHLine(66, 24, 11); u8g2.drawHLine(70, 22, 5);
    for (int bx = 0; bx < 128; bx += 19) { const int bh = 7 + (bx % 4) * 2; u8g2.drawFrame(bx, 55 - bh, 13, bh); }
    // Tall art-deco pipes frame a narrow flight gate. Caps make the gap clear.
    const int pipeWidth = 13, gapTop = flappyGapY - 12, gapBottom = flappyGapY + 12;
    if (flappyPipeX < 128 && flappyPipeX + pipeWidth > 0) {
      const int pipeX = flappyPipeX;
      if (gapTop > 13) { u8g2.drawBox(pipeX, 13, min(pipeWidth, 128 - pipeX), gapTop - 13); u8g2.drawFrame(pipeX, 13, min(pipeWidth, 128 - pipeX), gapTop - 13); }
      u8g2.drawBox(pipeX - 2, gapTop - 3, pipeWidth + 4, 4); u8g2.drawFrame(pipeX - 2, gapTop - 3, pipeWidth + 4, 4);
      if (gapBottom < 61) { u8g2.drawBox(pipeX, gapBottom, min(pipeWidth, 128 - pipeX), 61 - gapBottom); u8g2.drawFrame(pipeX, gapBottom, min(pipeWidth, 128 - pipeX), 61 - gapBottom); }
      u8g2.drawBox(pipeX - 2, gapBottom - 1, pipeWidth + 4, 4); u8g2.drawFrame(pipeX - 2, gapBottom - 1, pipeWidth + 4, 4);
      if (pipeX + 4 < 128) { u8g2.drawVLine(pipeX + 4, 16, max(0, gapTop - 21)); u8g2.drawVLine(pipeX + 4, gapBottom + 5, max(0, 56 - gapBottom)); }
    }
    // Puffy little bird with a flapping wing, eye, and beak.
    const int birdX = 30, birdY = (int)flappyBirdY;
    u8g2.drawDisc(birdX, birdY, 4);
    if ((now / 90) % 2) { u8g2.drawTriangle(birdX - 2, birdY, birdX + 1, birdY - 4, birdX + 2, birdY + 1); }
    else { u8g2.drawTriangle(birdX - 2, birdY, birdX + 1, birdY + 4, birdX + 2, birdY); }
    u8g2.drawDisc(birdX + 2, birdY - 1, 1); u8g2.setDrawColor(0); u8g2.drawPixel(birdX + 2, birdY - 1); u8g2.setDrawColor(1);
    u8g2.drawTriangle(birdX + 4, birdY, birdX + 8, birdY + 1, birdX + 4, birdY + 2);
    u8g2.drawHLine(0, 61, 128);
    if (flappyGameOver) { u8g2.drawBox(22, 20, 84, 28); u8g2.setDrawColor(0); u8g2.setFont(u8g2_font_6x10_tf); u8g2.drawStr(37, 32, "SKY CRASH!"); u8g2.setFont(u8g2_font_5x8_tf); u8g2.drawStr(31, 42, "D19: FLY AGAIN"); u8g2.setDrawColor(1); }
    else { u8g2.setFont(u8g2_font_4x6_tf); u8g2.drawStr(5, 62, "D19 FLAP  -  THREAD THE PIPES"); }
    u8g2.sendBuffer(); return;
  }

  if (roofCatGameActive) {
    u8g2.clearBuffer();
    u8g2.drawBox(0, 0, 128, 13); u8g2.setDrawColor(0); u8g2.setFont(u8g2_font_5x8_tf);
    u8g2.drawStr(4, 9, roofCatGameOver ? "ROOF CAT // OOPS!" : "ROOF CAT // RUN");
    char scoreLine[18]; snprintf(scoreLine, sizeof(scoreLine), "%03d ROOFS", roofCatScore);
    u8g2.drawStr(86, 9, scoreLine); u8g2.setDrawColor(1);
    // Moonlit skyline with tiny stars and windows.
    u8g2.drawDisc(110, 23, 6); u8g2.setDrawColor(0); u8g2.drawDisc(113, 21, 6); u8g2.setDrawColor(1);
    u8g2.drawPixel(11, 20); u8g2.drawPixel(54, 18); u8g2.drawPixel(76, 27); u8g2.drawPixel(121, 31);
    u8g2.drawFrame(4, 30, 13, 25); u8g2.drawFrame(18, 25, 12, 30); u8g2.drawFrame(31, 34, 13, 21);
    u8g2.drawFrame(44, 28, 12, 27); u8g2.drawFrame(57, 32, 14, 23); u8g2.drawFrame(72, 23, 12, 32);
    u8g2.drawFrame(85, 31, 14, 24); u8g2.drawFrame(100, 27, 11, 28); u8g2.drawFrame(112, 34, 13, 21);
    for (int wx = 7; wx < 124; wx += 13) { u8g2.drawPixel(wx, 39); u8g2.drawPixel(wx + 5, 47); }

    // Rooftops are ledges: the gap and height change after each successful landing.
    int roofEdge = roofCatNextX - roofCatGap;
    if (roofEdge < 0) roofEdge = 0;
    if (roofEdge > 128) roofEdge = 128;
    if (roofCatSurfaceY < 55) { u8g2.drawBox(0, roofCatSurfaceY, roofEdge, 64 - roofCatSurfaceY); u8g2.drawHLine(0, roofCatSurfaceY, roofEdge); }
    if (roofCatNextX < 128) {
      const int startX = max(0, roofCatNextX);
      if (roofCatNextY < 55) { u8g2.drawBox(startX, roofCatNextY, 128 - startX, 64 - roofCatNextY); u8g2.drawHLine(startX, roofCatNextY, 128 - startX); }
    }
    for (int wx = 5; wx < 125; wx += 17) {
      if (wx < roofEdge && roofCatSurfaceY < 55) u8g2.drawFrame(wx, roofCatSurfaceY + 5, 4, 5);
      if (wx >= roofCatNextX && roofCatNextY < 55) u8g2.drawFrame(wx, roofCatNextY + 5, 4, 5);
    }
    // Animated kitten with pointy ears, bright eyes, a curled tail and tiny paws.
    const int catX = 29, catTop = (int)roofCatY;
    u8g2.drawTriangle(catX + 4, catTop + 7, catX + 5, catTop, catX + 10, catTop + 5);
    u8g2.drawTriangle(catX + 11, catTop + 5, catX + 17, catTop, catX + 18, catTop + 8);
    u8g2.drawRFrame(catX + 3, catTop + 4, 16, 12, 5);
    u8g2.drawPixel(catX + 8, catTop + 9); u8g2.drawPixel(catX + 14, catTop + 9);
    u8g2.drawPixel(catX + 11, catTop + 11); u8g2.drawLine(catX + 11, catTop + 12, catX + 9, catTop + 13); u8g2.drawLine(catX + 11, catTop + 12, catX + 13, catTop + 13);
    u8g2.drawRFrame(catX + 5, catTop + 12, 12, 7, 3);
    u8g2.drawLine(catX + 5, catTop + 14, catX + 1, catTop + 11); u8g2.drawLine(catX + 1, catTop + 11, catX + 2, catTop + 8);
    if ((now / 130) % 2) { u8g2.drawLine(catX + 7, catTop + 18, catX + 5, catTop + 20); u8g2.drawLine(catX + 14, catTop + 18, catX + 16, catTop + 20); }
    else { u8g2.drawLine(catX + 7, catTop + 18, catX + 8, catTop + 20); u8g2.drawLine(catX + 14, catTop + 18, catX + 13, catTop + 20); }
    if (roofCatGameOver) {
      u8g2.drawBox(20, 17, 90, 31); u8g2.setDrawColor(0); u8g2.drawFrame(20, 17, 90, 31);
      u8g2.setFont(u8g2_font_6x10_tf); u8g2.drawStr(36, 30, "CAT DOWN!");
      u8g2.setFont(u8g2_font_5x8_tf); u8g2.drawStr(29, 41, "D19: TRY AGAIN"); u8g2.setDrawColor(1);
    } else { u8g2.setFont(u8g2_font_4x6_tf); u8g2.drawStr(4, 62, "D19 JUMP // LAND ON THE NEXT ROOF"); }
    u8g2.sendBuffer(); return;
  }

  if (dinoGameActive) {
    u8g2.clearBuffer();
    u8g2.drawBox(0, 0, 128, 13); u8g2.setDrawColor(0); u8g2.setFont(u8g2_font_5x8_tf);
    u8g2.drawStr(4, 9, dinoGameOver ? "RUN OVER" : "VITA RUNNER");
    char scoreLine[20]; snprintf(scoreLine, sizeof(scoreLine), "SCORE %04d", dinoScore);
    u8g2.drawStr(77, 9, scoreLine); u8g2.setDrawColor(1);
    // Tiny stars and drifting clouds give the monochrome scene some depth.
    u8g2.drawPixel(15, 21); u8g2.drawPixel(59, 18); u8g2.drawPixel(105, 25);
    int cloudX = 96 - (int)((now / 90) % 150);
    if (cloudX < -18) cloudX += 150;
    u8g2.drawHLine(cloudX, 25, 13); u8g2.drawHLine(cloudX + 3, 23, 7);
    u8g2.drawHLine(0, 55, 128); u8g2.drawHLine(0, 57, 128);
    const int y = 55 - dinoY;
    // Chunky pixel runner with a tail, body, head, eye, and animated feet.
    u8g2.drawBox(13, y - 10, 4, 4); u8g2.drawBox(17, y - 14, 8, 10);
    u8g2.drawBox(20, y - 20, 9, 8); u8g2.drawBox(27, y - 18, 4, 5);
    u8g2.drawPixel(26, y - 17); u8g2.drawBox(18, y - 5, 3, 5);
    if ((now / 120) % 2) { u8g2.drawBox(22, y - 5, 3, 5); u8g2.drawHLine(14, y - 1, 11); }
    else { u8g2.drawBox(24, y - 5, 3, 5); u8g2.drawHLine(17, y - 1, 10); }
    // Double cactus obstacle and speed streaks.
    u8g2.drawBox(obstacleX, 43, 5, 12); u8g2.drawBox(obstacleX - 3, 47, 3, 3); u8g2.drawBox(obstacleX + 5, 45, 3, 3);
    u8g2.drawHLine((obstacleX + 31) % 120, 39, 8); u8g2.drawHLine((obstacleX + 57) % 120, 33, 5);
    if (dinoGameOver) { u8g2.drawFrame(26, 17, 76, 31); u8g2.setFont(u8g2_font_6x10_tf); u8g2.drawStr(37, 30, "GAME OVER"); u8g2.setFont(u8g2_font_5x8_tf); u8g2.drawStr(34, 41, "D19 TO RUN AGAIN"); }
    u8g2.sendBuffer(); return;
  }
  if (eyesSpinActive) {
    const float phase = ((now % 2000UL) / 2000.0f) * 2.0f * PI;
    // Drive Vita's real eye geometry in a shared smooth orbit, once per 2 s.
    face->RandomLook = false;
    setSpinningGaze(0.72f * sinf(phase), 0.68f * cosf(phase));
    face->Update();
    if ((long)(now - eyesSpinUntil) >= 0) { eyesSpinActive = false; face->LookFront(); face->RandomLook = true; }
    return;
  }

  if (feedReactionUntil != 0 && (long)(now - feedReactionUntil) < 0) {
    u8g2.setDrawColor(0);
    u8g2.drawBox(0, 53, 128, 11);
    u8g2.setDrawColor(1);
    u8g2.setFont(u8g2_font_5x8_tf);
    char fedLine[28];
    snprintf(fedLine, sizeof(fedLine), "YUM! FISH x%u", fishMeals);
    u8g2.drawStr(3, 62, fedLine);
  } else if (hungry) {
    u8g2.setFont(u8g2_font_6x10_tf);
    const int fishX = 8 + ((now / 100) % 88);
    u8g2.drawStr(fishX, 42 + ((now / 220) % 2) * 3, "><>");
    u8g2.setDrawColor(0);
    u8g2.drawBox(0, 53, 128, 11);
    u8g2.setDrawColor(1);
    u8g2.setFont(u8g2_font_5x8_tf);
    u8g2.drawStr(3, 62, ((now / 300) % 2) ? "HUNGRY! D19 x2 TO FEED" : "HUNGRY... D19 x2 TO FEED");
  }

  if (sleepMode) {
    // Floating, pulsing Zzz animation. Eyes are still drawn by Face::Update().
    const int phase = (now / 350) % 3;
    const int x = 91 + phase * 3;
    const int y = 15 - phase * 4;
    u8g2.setFont(u8g2_font_6x10_tf);
    u8g2.drawStr(x, y, "Z");
    u8g2.setFont(u8g2_font_5x8_tf);
    u8g2.drawStr(x + 7, y - 5, "z");
    if (phase == 2) u8g2.drawStr(x + 13, y - 9, "z");
  }

  if (statsOverlay != STATS_NONE && (long)(now - statsOverlayUntil) < 0) {
    // Reserve a small readable strip at the bottom of the 128x64 OLED.
    u8g2.setDrawColor(0);
    u8g2.drawBox(0, 53, 128, 11);
    u8g2.setDrawColor(1);
    u8g2.setFont(u8g2_font_5x8_tf);
    if (statsOverlay == STATS_XP) {
      char line[32];
      snprintf(line, sizeof(line), "TOTAL XP: %d", doYourXP);
      u8g2.drawStr(2, 62, line);
    } else {
      char line[32];
      snprintf(line, sizeof(line), "LV %d  XP %d/100", doYourLevel, doYourProgress);
      u8g2.drawStr(2, 62, line);
    }
  } else if (statsOverlay != STATS_NONE) {
    statsOverlay = STATS_NONE;
  }
  drawGreetingWave(now);
  u8g2.sendBuffer();
}

void handleStatsButtons() {
  static int lastD8Reading = HIGH;
  static int stableD8State = HIGH;
  static unsigned long d8ChangedAt = 0;
  static int lastD9Reading = HIGH;
  static int stableD9State = HIGH;
  static unsigned long d9ChangedAt = 0;
  static int lastMenuReading = HIGH;
  static int stableMenuState = HIGH;
  static unsigned long menuChangedAt = 0;
  static uint8_t menuTapCount = 0;
  static unsigned long lastMenuTapAt = 0;
  static int lastFeedReading = HIGH;
  static int stableFeedState = HIGH;
  static unsigned long feedChangedAt = 0;
  const unsigned long now = millis();
  int menuReading = digitalRead(MENU_BUTTON_PIN);
  if (menuReading != lastMenuReading) { menuChangedAt = now; lastMenuReading = menuReading; }
  if (now - menuChangedAt > 35 && menuReading != stableMenuState) {
    stableMenuState = menuReading;
    if (stableMenuState == LOW) {
      registerActivity();
      if (menuTapCount == 0 || now - lastMenuTapAt <= 550) ++menuTapCount;
      else menuTapCount = 1;
      lastMenuTapAt = now;
    }
  }
  if (menuTapCount != 0 && now - lastMenuTapAt > 550) {
    if (menuTapCount >= 3) {
      if (!menuOpen) { menuOpen = true; menuPage = 0; menuSelection = 0; }
      else if (menuPage == 0 && menuSelection < 5) ++menuSelection;
      else if (menuPage == 0) { menuPage = 1; menuSelection = 6; }
      else if (menuSelection == 6) menuSelection = 7;
      else if (menuSelection == 7) menuSelection = 8;
      else if (menuPage == 1) { menuPage = 2; menuSelection = 9; }
      else { menuPage = 0; menuSelection = 0; }
    } else menuOpen = !menuOpen;
    statsOverlay = STATS_NONE;
    menuTapCount = 0;
  }

  int feedReading = digitalRead(FEED_BUTTON_PIN);
  if (feedReading != lastFeedReading) { feedChangedAt = now; lastFeedReading = feedReading; }
  if (now - feedChangedAt > 35 && feedReading != stableFeedState) {
    stableFeedState = feedReading;
    if (stableFeedState == LOW) {
      registerActivity();
      if (menuOpen) {
        if (menuPage == 0 && menuSelection == 4) { menuOpen = false; focusTimerScreenActive = false; diceScreenActive = false; eyesSpinActive = true; eyesSpinUntil = now + 2000; }
        else if (menuPage == 0 && menuSelection == 5) { menuOpen = false; startDiceRoll(now); }
        else if (menuPage == 1 && menuSelection == 6) { menuOpen = false; focusTimerScreenActive = false; diceScreenActive = false; dinoGameActive = true; roofCatGameActive = false; flappyGameActive = false; dinoGameOver = false; dinoScore = 0; dinoY = 0; dinoVelocity = 0; obstacleX = 128; }
        else if (menuPage == 1 && menuSelection == 7) {
          menuOpen = false; focusTimerScreenActive = false; roofCatGameActive = true; dinoGameActive = false; flappyGameActive = false; roofCatGameOver = false;
          roofCatScore = 0; roofCatSurfaceY = 47; roofCatGap = 22; roofCatNextX = 128 + roofCatGap;
          roofCatNextY = random(36, 47); roofCatY = roofCatSurfaceY - 20; roofCatVelocity = 0;
          roofCatGrounded = true; roofCatSpeed = 2; lastRoofFrameAt = now;
        }
        else if (menuPage == 1 && menuSelection == 8) { menuOpen = false; focusTimerScreenActive = false; diceScreenActive = false; resetFlappyGame(now); }
        else if (menuPage == 2 && menuSelection == 9) { menuOpen = false; diceScreenActive = false; focusTimerScreenActive = true; dinoGameActive = false; roofCatGameActive = false; flappyGameActive = false; }
        lastFeedPressAt = 0;
        return;
      }
      if (dinoGameActive) {
        if (dinoGameOver) { dinoGameOver = false; dinoScore = 0; dinoY = 0; dinoVelocity = 0; obstacleX = 128; }
        else if (dinoY == 0) dinoVelocity = 8;
        lastFeedPressAt = 0;
        return;
      }
      if (roofCatGameActive) {
        if (roofCatGameOver) {
          roofCatGameOver = false; roofCatScore = 0; roofCatSurfaceY = 47; roofCatGap = 22;
          roofCatNextX = 128 + roofCatGap; roofCatNextY = random(36, 47); roofCatY = roofCatSurfaceY - 20;
          roofCatVelocity = 0; roofCatGrounded = true; roofCatSpeed = 2;
        } else if (roofCatGrounded) { roofCatVelocity = -7.5f; roofCatGrounded = false; }
        lastFeedPressAt = 0;
        return;
      }
      if (flappyGameActive) {
        if (flappyGameOver) resetFlappyGame(now);
        else flappyBirdVelocity = -4.0f;
        lastFeedPressAt = 0;
        return;
      }
      if (diceScreenActive) {
        if (!diceRolling) startDiceRoll(now);
        lastFeedPressAt = 0;
        return;
      }
      if (focusTimerScreenActive) {
        if (focusTimerDone) { focusTimerDone = false; focusRemainingMs = focusDurationMs; }
        if (focusTimerRunning) {
          focusRemainingMs = (long)(focusTimerEndAt - now) > 0 ? focusTimerEndAt - now : 0;
          focusTimerRunning = false;
        } else if (focusRemainingMs > 0) {
          focusTimerRunning = true;
          focusTimerEndAt = now + focusRemainingMs;
        }
        lastFeedPressAt = 0;
        return;
      }
      if (lastFeedPressAt != 0 && now - lastFeedPressAt <= doublePressWindowMs) {
        lastFeedPressAt = 0;
        hungry = false;
        lastFedAt = now;
        ++fishMeals;
        feedReactionUntil = now + 2400;
        companionMoodActive = true;
        companionMood = MOOD_HAPPY;
        companionMoodUntil = feedReactionUntil;
        statsOverlay = STATS_NONE;
        if (face != nullptr) face->Expression.GoTo_Happy();
        Serial.printf("D19 double press: fish fed (#%u)\n", fishMeals);
      } else {
        lastFeedPressAt = now;
      }
    }
  }
  if (lastFeedPressAt != 0 && now - lastFeedPressAt > doublePressWindowMs) lastFeedPressAt = 0;

  int d8Reading = digitalRead(XP_BUTTON_PIN);
  if (d8Reading != lastD8Reading) { d8ChangedAt = now; lastD8Reading = d8Reading; }
  if (now - d8ChangedAt > 35 && d8Reading != stableD8State) {
    stableD8State = d8Reading;
    if (stableD8State == LOW) {
      registerActivity();
      if (menuOpen && menuPage == 0) menuSelection = (menuSelection + 5) % 6;
      else { statsOverlay = STATS_XP; statsOverlayUntil = now + 3000; }
      Serial.printf("Button D8: total XP = %d\n", doYourXP);
    }
  }

  int d9Reading = digitalRead(LEVEL_BUTTON_PIN);
  if (d9Reading != lastD9Reading) { d9ChangedAt = now; lastD9Reading = d9Reading; }
  if (now - d9ChangedAt > 35 && d9Reading != stableD9State) {
    stableD9State = d9Reading;
    if (stableD9State == LOW) {
      registerActivity();
      if (menuOpen && menuPage == 0) menuSelection = (menuSelection + 1) % 6;
      else { statsOverlay = STATS_LEVEL; statsOverlayUntil = now + 3000; }
      Serial.printf("Button D9: level = %d, XP progress = %d/100\n", doYourLevel, doYourProgress);
    }
  }
}

void setProgressMood(int percent) {
  percent = constrain(percent, 0, 100);
  if (percent >= 100) progressMood = MOOD_GLEE;
  else if (percent >= 50) progressMood = MOOD_HAPPY;
  else if (percent > 0) progressMood = MOOD_FOCUSED;
  else progressMood = MOOD_NORMAL;

  if (!sleepMode && !companionMoodActive && !hungry) applyMood(progressMood);
}

void applyPendingMood() {
  PendingMood mood = pendingMood;
  if (mood == MOOD_NONE || face == nullptr) return;
  pendingMood = MOOD_NONE;
  applyMood(mood);
}

class MyServerCallbacks : public BLEServerCallbacks {
  void onConnect(BLEServer *server) override {
    deviceConnected = true;
    Serial.println("VITA TERHUBUNG!");
  }
  void onDisconnect(BLEServer *server) override {
    deviceConnected = false;
    Serial.println("VITA TERPUTUS!");
    server->getAdvertising()->start();
  }
};

void sendBLE(const String &message) {
  Serial.print("BLE SEND: ");
  Serial.println(message);
  if (deviceConnected && characteristic != nullptr) {
    characteristic->setValue(message.c_str());
    characteristic->notify();
  }
}

bool readMPU(int16_t &AcX, int16_t &AcY, int16_t &AcZ) {
  Wire.beginTransmission(MPU_ADDR);
  Wire.write(0x3B);
  if (Wire.endTransmission(false) != 0) return false;
  byte count = Wire.requestFrom(MPU_ADDR, 6, true);
  if (count != 6) return false;
  AcX = (Wire.read() << 8) | Wire.read();
  AcY = (Wire.read() << 8) | Wire.read();
  AcZ = (Wire.read() << 8) | Wire.read();
  return true;
}

// Read the MPU6050 continuously, not only during workouts. Tilt is filtered
// with separate enter/exit thresholds to avoid jitter around the neutral angle.
void updateMotionInteraction() {
  const unsigned long now = millis();
  if (now - lastMotionSampleAt < motionSampleIntervalMs) return;
  lastMotionSampleAt = now;

  int16_t ax, ay, az;
  if (!readMPU(ax, ay, az)) {
    motionSensorAvailable = false;
    return;
  }
  motionSensorAvailable = true;

  const float magnitude = sqrt((float)ax * ax + (float)ay * ay + (float)az * az);
  const float dynamicAcceleration = fabs(magnitude - 16384.0f);

  // A quick movement/shake causes one surprised reaction; cooldown prevents
  // sensor noise or repeated samples from retriggering it continuously.
  if (dynamicAcceleration > 6200.0f &&
      (lastSharpReactionAt == 0 || now - lastSharpReactionAt >= sharpMotionCooldownMs)) {
    lastSharpReactionAt = now;
    registerActivity();
    if (menuOpen) { menuOpen = false; statsOverlay = STATS_NONE; return; }
    if (!sleepMode && face != nullptr) {
      face->Expression.GoTo_Surprised();
      wakeReactionUntil = now + 1200;
      appliedLookDirection = 99; // force eye direction to be reapplied after surprise
    }
    Serial.println("MPU6050: sharp motion -> SURPRISED");
  }

  // This is the same tilt axis used by the existing workout rep detector.
  const float tiltAngle = atan2((float)ay,
      sqrt((float)ax * ax + (float)az * az)) * 180.0f / PI;
  int nextDirection = currentTiltDirection;
  if (tiltAngle > 22.0f) nextDirection = 1;
  else if (tiltAngle < -22.0f) nextDirection = -1;
  else if (fabs(tiltAngle) < 13.0f) nextDirection = 0;

  if (nextDirection != currentTiltDirection) {
    const int previousDirection = currentTiltDirection;
    currentTiltDirection = nextDirection;
    if (nextDirection != 0) {
      lastNonNeutralTiltAt = now;
      if (face != nullptr) face->RandomLook = false;
      // Register only on entering/changing a meaningful tilt, not every sample.
      if (lastTiltActivityAt == 0 || now - lastTiltActivityAt > 650) {
        lastTiltActivityAt = now;
        const bool wasSleeping = sleepMode;
        registerActivity();
        if (wasSleeping) {
          // Keep the surprised wake face visible; eye look applies after it ends.
          appliedLookDirection = 99;
        }
      }
      Serial.printf("MPU6050: tilt %s (%.1f deg)\n", nextDirection < 0 ? "LEFT" : "RIGHT", tiltAngle);
    } else if (previousDirection != 0) {
      lastNonNeutralTiltAt = now;
    }
  }

  // Let the eyes follow the device while tilted. Do not overwrite the wake
  // surprise animation; the look direction is applied when that reaction ends.
  if (!sleepMode && !companionMoodActive && wakeReactionUntil == 0 && face != nullptr) {
    if (currentTiltDirection != 0) face->RandomLook = false;
    if (currentTiltDirection < 0 && appliedLookDirection != -1) {
      face->RandomLook = false;
      face->LookLeft();
      appliedLookDirection = -1;
    } else if (currentTiltDirection > 0 && appliedLookDirection != 1) {
      face->RandomLook = false;
      face->LookRight();
      appliedLookDirection = 1;
    }
  }

  // Once the device is level again, hold the glance briefly, then face forward
  // and restore the library's gentle random idle looks.
  if (currentTiltDirection == 0 && appliedLookDirection != 0 &&
      !sleepMode && !companionMoodActive && wakeReactionUntil == 0 && face != nullptr) {
    if (now - lastNonNeutralTiltAt >= lookReturnDelayMs) {
      face->LookFront();
      appliedLookDirection = 0;
      face->RandomLook = true;
    }
  }
}

class MyCharacteristicCallbacks : public BLECharacteristicCallbacks {
  void onWrite(BLECharacteristic *characteristic) override {
    String command = characteristic->getValue().c_str();
    Serial.print("COMMAND DARI VITA: ");
    Serial.println(command);
    registerActivity();

    // Optional BLE test commands for expression transitions.
    // Send MOOD:ANGRY or MOOD:WORRIED from a BLE terminal/app to preview them.
    if (command == "MOOD:ANGRY") {
      pendingMood = MOOD_ANGRY;
      return;
    }
    if (command == "MOOD:WORRIED" || command == "MOOD:ANXIOUS") {
      pendingMood = MOOD_WORRIED;
      return;
    }

    // DOYOURSTREAK companion commands. XP/level always come from the web app.
    if (command == "HABIT_DONE") {
      companionMood = MOOD_HAPPY;
      companionMoodUntil = millis() + 4000;
      companionMoodActive = true;
      face->Expression.GoTo_Happy();
      Serial.println("DOYOURSTREAK: habit completed -> HAPPY (4s)");
      return;
    }
    if (command == "LEVEL_UP") {
      companionMood = MOOD_GLEE;
      companionMoodUntil = millis() + 5000;
      companionMoodActive = true;
      face->Expression.GoTo_Glee();
      Serial.println("DOYOURSTREAK: LEVEL UP -> GLEE");
      return;
    }
    if (command.startsWith("SYNC:")) {
      // SYNC:xp:level:xpProgress:dailyPercent:completedHabits:totalHabits
      int fields[6];
      int fieldStart = 5; // first character after "SYNC:"
      int fieldCount = 0;
      while (fieldCount < 6) {
        int separator = command.indexOf(':', fieldStart);
        if (separator < 0) {
          fields[fieldCount++] = command.substring(fieldStart).toInt();
          break;
        }
        fields[fieldCount++] = command.substring(fieldStart, separator).toInt();
        fieldStart = separator + 1;
      }
      if (fieldCount >= 3) {
        doYourXP = max(0, fields[0]);
        doYourLevel = max(1, fields[1]);
        doYourProgress = constrain(fields[2], 0, 99);
        if (fieldCount >= 6) { dailyPercent = constrain(fields[3], 0, 100); dailyCompleted = max(0, fields[4]); dailyTotal = max(0, fields[5]); }
        // The legacy 4-field protocol has no daily percentage. Preserve a
        // neutral mood until the updated web app sends the extended protocol.
        if (fieldCount >= 4) setProgressMood(fields[3]);
        Serial.printf("DOYOURSTREAK SYNC XP=%d LEVEL=%d XP_PROGRESS=%d%% DAILY=%d%%\n",
                      doYourXP, doYourLevel, doYourProgress,
                      fieldCount >= 4 ? constrain(fields[3], 0, 100) : -1);
      }
      return;
    }
    if (command == "MOOD:HAPPY") {
      companionMood = MOOD_HAPPY; companionMoodUntil = millis() + 4000; companionMoodActive = true;
      face->Expression.GoTo_Happy(); return;
    }
    if (command.startsWith("EXERCISE:")) {
      selectedExercise = command.substring(9);
      exerciseSelected = true;
      workoutFinished = false;
      reps = 0;
      currentSet = 1;
      armUp = false;

      Serial.println("==============================");
      Serial.print("GERAKAN DIPILIH: ");
      Serial.println(selectedExercise);
      Serial.println("SENSOR SIAP!");
      Serial.println("==============================");

      sendBLE("READY:" + selectedExercise);
      showOLED("READY: " + selectedExercise);
    }
  }
};

void setup() {
  Serial.begin(115200);
  delay(200);

  // Shared I2C bus for SSD1306 OLED and MPU6050.
  Wire.begin(SDA_PIN, SCL_PIN);
  Wire.setClock(100000);

  // Face constructor initializes the U8g2 SSD1306 driver at address 0x3C.
  face = new Face(128, 64, 40);
  face->Expression.GoTo_Normal();

  // Random glances are enabled while idle; MPU6050 tilts temporarily disable
  // them so the eyes can follow the physical movement. Blink stays automatic.
  face->RandomBehavior = false;
  face->RandomLook = true;
  face->RandomBlink = true;
  face->Look.Timer.SetIntervalMillis(2200);
  face->Blink.Timer.SetIntervalMillis(3800);

  // Buttons use internal pull-ups: wire each button between its pin and GND.
  pinMode(XP_BUTTON_PIN, INPUT_PULLUP);
  pinMode(LEVEL_BUTTON_PIN, INPUT_PULLUP);
  pinMode(MENU_BUTTON_PIN, INPUT_PULLUP);
  pinMode(FEED_BUTTON_PIN, INPUT_PULLUP);
  Serial.printf("XP pin=%d, level pin=%d, menu pin=%d, D19 feed pin=%d (active LOW)\n", XP_BUTTON_PIN, LEVEL_BUTTON_PIN, MENU_BUTTON_PIN, FEED_BUTTON_PIN);

  // Wake MPU6050.
  Wire.beginTransmission(MPU_ADDR);
  Wire.write(0x6B);
  Wire.write(0x00);
  Wire.endTransmission();

  BLEDevice::init("Vita ESP32");
  BLEServer *server = BLEDevice::createServer();
  server->setCallbacks(new MyServerCallbacks());

  BLEService *service = server->createService(SERVICE_UUID);
  characteristic = service->createCharacteristic(
    CHARACTERISTIC_UUID,
    BLECharacteristic::PROPERTY_READ |
    BLECharacteristic::PROPERTY_WRITE |
    BLECharacteristic::PROPERTY_NOTIFY
  );
  characteristic->addDescriptor(new BLE2902());
  characteristic->setCallbacks(new MyCharacteristicCallbacks());
  service->start();

  BLEAdvertising *advertising = BLEDevice::getAdvertising();
  advertising->addServiceUUID(SERVICE_UUID);
  advertising->setScanResponse(true);
  advertising->start();

  // Start awake in the neutral mood. After 12 seconds idle, the face gets
  // drowsy for 3 seconds before the Sleepy face and Zzz animation begin.
  lastActivityAt = millis();
  lastFedAt = millis();
  sleepMode = false;
  face->Expression.GoTo_Normal();
  Serial.println("Progress mood enabled; drowsy cue starts after 12s, sleep follows 3s later.");

  Serial.println("==============================");
  Serial.println(" VITA ESP32 - PLAYFUL EYES");
  Serial.println("==============================");
  Serial.println("BLE: AKTIF | OLED: 128x64 0x3C");
  Serial.println("Mata otomatis berkedip; MPU6050: tilt=look, sharp motion=surprise.");
  Serial.print("Target: ");
  Serial.print(targetSets);
  Serial.print(" set x ");
  Serial.print(targetReps);
  Serial.println(" rep");
}

void loop() {
  const unsigned long now = millis();

  // Always monitor MPU6050 for companion reactions, even outside workout mode.
  updateMotionInteraction();

  // A short reaction (habit complete / level-up) takes priority over the
  // progress mood. When it expires, return to the current progress mood.
  if (companionMoodActive && (long)(now - companionMoodUntil) >= 0) {
    companionMoodActive = false;
    companionMood = MOOD_NONE;
    if (!sleepMode) {
      if (hungry) face->Expression.GoTo_Sad();
      else applyMood(progressMood);
    }
  }

  // Sleep animation is local to the ESP32, so it works even if the browser
  // stops sending data. New BLE commands and workout movement wake it.
  if (!hungry && now - lastFedAt >= hungerIntervalMs) {
    hungry = true;
    pendingMood = MOOD_NONE;
    companionMoodActive = false;
    dozingOff = false;
    wakeReactionUntil = 0;
    if (sleepMode) {
      sleepMode = false;
      if (face != nullptr) {
        face->RandomBlink = true;
        face->RandomLook = true;
      }
    }
    if (face != nullptr) face->Expression.GoTo_Sad();
    Serial.println("ESP32: hungry -> waiting for D19 double press");
  }

  // Greet once at startup, then every five minutes. If a menu/game is in use,
  // wait until the main face is visible so the wave and happy eyes can be seen.
  if ((lastGreetingAt == 0 || now - lastGreetingAt >= greetingIntervalMs) &&
      !menuOpen && !dinoGameActive && !roofCatGameActive && !flappyGameActive && !focusTimerScreenActive && !diceScreenActive && !eyesSpinActive) {
    lastGreetingAt = now;
    greetingAnimationUntil = now + greetingDurationMs;
    companionMood = MOOD_HAPPY;
    companionMoodActive = true;
    companionMoodUntil = greetingAnimationUntil;
    pendingMood = MOOD_NONE;
    wakeReactionUntil = 0;
    if (sleepMode) {
      sleepMode = false;
      face->RandomBlink = true;
      face->RandomLook = true;
    }
    dozingOff = false;
    face->Expression.GoTo_Happy();
    Serial.println("ESP32 greeting: happy eyes + waving hand");
  }

  if (!hungry && !sleepMode && !companionMoodActive && now - lastActivityAt >= sleepAfterMs) {
    if (!dozingOff) {
      dozingOff = true;
      dozingStartedAt = now;
      if (face != nullptr) {
        face->RandomBlink = true;
        face->RandomLook = false;
        face->Expression.GoTo_Squint();
      }
      Serial.println("ESP32 idle -> DROWSY (3s before sleep)");
    } else if (now - dozingStartedAt >= drowsyBeforeSleepMs) {
      dozingOff = false;
      sleepMode = true;
      if (face != nullptr) {
        face->RandomBlink = false;
        face->RandomLook = false;
        face->Expression.GoTo_Sleepy();
      }
      Serial.println("ESP32 drowsy 3s -> SLEEP");
    }
  }

  handleStatsButtons();

  if (diceScreenActive) {
    if (diceRolling && now - lastDiceShuffleAt >= 85) {
      lastDiceShuffleAt = now;
      diceValue = random(1, 7);
    }
    if (diceRolling && now - diceStartedAt >= 1700) {
      diceRolling = false;
      diceValue = random(1, 7);
      diceScreenUntil = now + 3000;
      face->RandomBlink = true; face->RandomLook = true;
      face->LookFront(); face->Expression.GoTo_Glee();
    } else if (!diceRolling && (long)(now - diceScreenUntil) >= 0) {
      diceScreenActive = false;
      if (hungry) face->Expression.GoTo_Sad(); else applyMood(progressMood);
    }
  }

  if (focusTimerRunning) {
    if ((long)(now - focusTimerEndAt) >= 0) {
      focusTimerRunning = false; focusRemainingMs = 0; focusTimerDone = true;
    } else focusRemainingMs = focusTimerEndAt - now;
  }

  if (dinoGameActive && !dinoGameOver && now - lastGameFrameAt >= 35) {
    lastGameFrameAt = now;
    if (dinoY > 0 || dinoVelocity > 0) {
      dinoY += dinoVelocity;
      dinoVelocity -= 1;
      if (dinoY <= 0) { dinoY = 0; dinoVelocity = 0; }
    }
    obstacleX -= 3;
    if (obstacleX < 0) { obstacleX = 128 + random(20, 65); ++dinoScore; }
    if (obstacleX < 28 && obstacleX > 12 && dinoY < 12) dinoGameOver = true;
  }

  if (roofCatGameActive && !roofCatGameOver && now - lastRoofFrameAt >= 35) {
    lastRoofFrameAt = now;
    roofCatNextX -= roofCatSpeed;
    if (!roofCatGrounded) {
      const float previousFoot = roofCatY + 20.0f;
      roofCatVelocity += 0.55f;
      roofCatY += roofCatVelocity;
      const float currentFoot = roofCatY + 20.0f;
      const bool crossedNextRoof = previousFoot <= roofCatNextY && currentFoot >= roofCatNextY;
      const bool overlapsNextRoof = roofCatNextX <= 48 && roofCatNextX + 68 >= 29;
      if (crossedNextRoof && overlapsNextRoof && roofCatVelocity > 0) {
        roofCatY = roofCatNextY - 20.0f;
        roofCatVelocity = 0.0f;
        roofCatGrounded = true;
        roofCatSurfaceY = roofCatNextY;
        ++roofCatScore;
        roofCatSpeed = min(4, 2 + roofCatScore / 5);
        roofCatGap = random(18, 31);
        roofCatNextX = 128 + roofCatGap;
        roofCatNextY = constrain(roofCatSurfaceY + random(-7, 8), 34, 48);
      } else if (roofCatY > 64 || roofCatNextX + 68 < 29) {
        roofCatGameOver = true;
      }
    } else {
      const int roofEdge = roofCatNextX - roofCatGap;
      if (roofEdge <= 47) roofCatGameOver = true;
    }
  }

  if (flappyGameActive && !flappyGameOver && now - lastFlappyFrameAt >= 35) {
    lastFlappyFrameAt = now;
    flappyBirdVelocity += 0.32f;
    flappyBirdY += flappyBirdVelocity;
    flappyPipeX -= 2;
    const int gapTop = flappyGapY - 12, gapBottom = flappyGapY + 12;
    if (flappyBirdY < 18 || flappyBirdY > 59) flappyGameOver = true;
    if (flappyPipeX < 35 && flappyPipeX + 13 > 25 &&
        (flappyBirdY - 3 < gapTop || flappyBirdY + 3 > gapBottom)) flappyGameOver = true;
    if (!flappyPipeScored && flappyPipeX + 13 < 25) { ++flappyScore; flappyPipeScored = true; }
    if (flappyPipeX < -17) {
      flappyPipeX = 128 + random(18, 48);
      flappyGapY = random(25, 46);
      flappyPipeScored = false;
    }
  }

  if (wakeReactionUntil != 0 && (long)(now - wakeReactionUntil) >= 0) {
    wakeReactionUntil = 0;
    if (!sleepMode && !companionMoodActive) {
      if (hungry) face->Expression.GoTo_Sad();
      else applyMood(progressMood);
      appliedLookDirection = 99; // let motion interaction restore the gaze next loop
    }
  }

  if (!hungry && !companionMoodActive && !sleepMode && !dozingOff && wakeReactionUntil == 0) applyPendingMood();
  if (face != nullptr && !menuOpen && !eyesSpinActive && !dinoGameActive && !roofCatGameActive && !flappyGameActive && !focusTimerScreenActive && !diceScreenActive) face->Update();
  drawStatsOverlayAndSleepZzz();

  if (!exerciseSelected || workoutFinished) {
    delay(10);
    return;
  }

  static unsigned long lastSensorRead = 0;
  if (millis() - lastSensorRead < 35) return;
  lastSensorRead = millis();

  int16_t AcX, AcY, AcZ;
  if (!readMPU(AcX, AcY, AcZ)) {
    Serial.println("Sensor tidak terbaca!");
    showOLED("CHECK MPU6050");
    return;
  }

  float angleX = atan2(
    (float)AcY,
    sqrt((float)AcX * AcX + (float)AcZ * AcZ)
  ) * 180.0 / PI;

  if (angleX > 30 && !armUp) {
    registerActivity();
    armUp = true;
    Serial.println("NAIK");
    showOLED("MOVING UP");
  }

  if (angleX < 10 && armUp) {
    registerActivity();
    armUp = false;
    reps++;

    Serial.print("REP ");
    Serial.print(reps);
    Serial.print("/");
    Serial.println(targetReps);
    sendBLE("REP:" + String(reps));
    showOLED("REP COMPLETED");

    if (reps >= targetReps) {
      Serial.println("SET SELESAI!");
      sendBLE("SET:" + String(currentSet));

      if (currentSet < targetSets) {
        currentSet++;
        reps = 0;
        Serial.print("MASUK SET ");
        Serial.println(currentSet);
        sendBLE("SET:" + String(currentSet));
        showOLED("NEXT SET");
      } else {
        Serial.println("==============================");
        Serial.println("SEMUA SET SELESAI!");
        Serial.println("==============================");
        sendBLE("DONE:" + selectedExercise);
        showOLED("WORKOUT DONE!");
        workoutFinished = true;
        exerciseSelected = false;
      }
    }
  }
}
