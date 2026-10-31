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
// Sleep after 12 seconds without a BLE event or detected workout movement.
const unsigned long sleepAfterMs = 12000;
unsigned long lastActivityAt = 0;
bool sleepMode = false;
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
const uint8_t menuItemCount = 6;
const unsigned long hungerIntervalMs =  5UL * 60UL * 1000UL;
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

void registerActivity() {
  lastActivityAt = millis();
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
    u8g2.drawStr(7, 12, menuPage == 0 ? "VITA // RIGHT PAGE" : "VITA // LEFT PAGE");
    u8g2.setDrawColor(1);
    const char *labels[menuItemCount] = {"TOTAL XP", "XP PROGRESS", "LEVEL", "DAILY QUESTS", "EYE SPIN", "DINO HOP"};
    char values[menuItemCount][24];
    snprintf(values[0], sizeof(values[0]), "%d XP", doYourXP);
    snprintf(values[1], sizeof(values[1]), "%d / 100", doYourProgress);
    snprintf(values[2], sizeof(values[2]), "LV %d", doYourLevel);
    snprintf(values[3], sizeof(values[3]), "%d / %d  %d%%", dailyCompleted, dailyTotal, dailyPercent);
    snprintf(values[4], sizeof(values[4]), "PLAY");
    snprintf(values[5], sizeof(values[5]), "PLAY");
    for (uint8_t i = 0; i < menuItemCount; ++i) {
      if ((menuPage == 0 && i == 5) || (menuPage == 1 && i != 5)) continue;
      const int y = 21 + i * 7;
      if (i == menuSelection) { u8g2.drawBox(5, y - 6, 118, 8); u8g2.setDrawColor(0); }
      u8g2.drawStr(9, y, labels[i]);
      if (menuPage == 0 && i < 4) u8g2.drawStr(77, y, values[i]);
      else u8g2.drawStr(103, y, values[i]);
      u8g2.setDrawColor(1);
    }
    if (menuPage == 1) u8g2.drawBox(6, 50, 2, 2);
    else u8g2.drawBox(6, 15 + menuSelection * 7, 2, 2);
    u8g2.setFont(u8g2_font_4x6_tf);
    u8g2.drawStr(8, 60, "D18 x3 PAGE  D19 PLAY");
    u8g2.sendBuffer();
    return;
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
      else if (menuPage == 0 && menuSelection < 4) ++menuSelection;
      else if (menuPage == 0) { menuPage = 1; menuSelection = 5; }
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
        if (menuPage == 0 && menuSelection == 4) { menuOpen = false; eyesSpinActive = true; eyesSpinUntil = now + 2000; }
        else if (menuPage == 1) { menuOpen = false; dinoGameActive = true; dinoGameOver = false; dinoScore = 0; dinoY = 0; dinoVelocity = 0; obstacleX = 128; }
        lastFeedPressAt = 0;
        return;
      }
      if (dinoGameActive) {
        if (dinoGameOver) { dinoGameOver = false; dinoScore = 0; dinoY = 0; dinoVelocity = 0; obstacleX = 128; }
        else if (dinoY == 0) dinoVelocity = 8;
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
      if (menuOpen && menuPage == 0) menuSelection = (menuSelection + 4) % 5;
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
      if (menuOpen && menuPage == 0) menuSelection = (menuSelection + 1) % 5;
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

  // Start awake in the neutral mood. The OLED sleeps after 12 seconds of
  // inactivity and wakes as soon as a BLE event or workout movement occurs.
  lastActivityAt = millis();
  lastFedAt = millis();
  sleepMode = false;
  face->Expression.GoTo_Normal();
  Serial.println("Progress mood enabled; sleep animation starts after 12s idle.");

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

  if (!hungry && !sleepMode && !companionMoodActive && now - lastActivityAt >= sleepAfterMs) {
    sleepMode = true;
    if (face != nullptr) {
      face->RandomBlink = false;
      face->RandomLook = false;
      face->Expression.GoTo_Sleepy();
    }
    Serial.println("ESP32 idle 12s -> SLEEP");
  }

  handleStatsButtons();

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

  if (wakeReactionUntil != 0 && (long)(now - wakeReactionUntil) >= 0) {
    wakeReactionUntil = 0;
    if (!sleepMode && !companionMoodActive) {
      if (hungry) face->Expression.GoTo_Sad();
      else applyMood(progressMood);
      appliedLookDirection = 99; // let motion interaction restore the gaze next loop
    }
  }

  if (!hungry && !companionMoodActive && !sleepMode && wakeReactionUntil == 0) applyPendingMood();
  if (face != nullptr && !menuOpen && !eyesSpinActive && !dinoGameActive) face->Update();
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
