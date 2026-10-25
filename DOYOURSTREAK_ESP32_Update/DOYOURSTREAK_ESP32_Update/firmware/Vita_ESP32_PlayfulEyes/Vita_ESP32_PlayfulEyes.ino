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
bool deviceConnected = false;
bool companionMoodActive = false;
unsigned long companionMoodUntil = 0;
// Sleep after 12 seconds without a BLE event or detected workout movement.
const unsigned long sleepAfterMs = 12000;
unsigned long lastActivityAt = 0;
bool sleepMode = false;
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
    }
    // Wake into the latest progress mood; the event handler may immediately
    // replace it with a short-lived happy/level-up reaction.
    applyMood(progressMood);
  }
}

void setProgressMood(int percent) {
  percent = constrain(percent, 0, 100);
  if (percent >= 100) progressMood = MOOD_GLEE;
  else if (percent >= 50) progressMood = MOOD_HAPPY;
  else if (percent > 0) progressMood = MOOD_FOCUSED;
  else progressMood = MOOD_NORMAL;

  if (!sleepMode && !companionMoodActive) applyMood(progressMood);
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

  // Automatic random look gives the eyes the left/right/up/down glances
  // from playfultechnology/esp32-eyes. Blink stays automatic; moods are
  // controlled by Vita workout events to avoid random emotion changes.
  face->RandomBehavior = false;
  face->RandomLook = true;
  face->RandomBlink = true;
  face->Look.Timer.SetIntervalMillis(2200);
  face->Blink.Timer.SetIntervalMillis(3800);

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
  sleepMode = false;
  face->Expression.GoTo_Normal();
  Serial.println("Progress mood enabled; sleep animation starts after 12s idle.");

  Serial.println("==============================");
  Serial.println(" VITA ESP32 - PLAYFUL EYES");
  Serial.println("==============================");
  Serial.println("BLE: AKTIF | OLED: 128x64 0x3C");
  Serial.println("Mata otomatis melirik dan berkedip.");
  Serial.print("Target: ");
  Serial.print(targetSets);
  Serial.print(" set x ");
  Serial.print(targetReps);
  Serial.println(" rep");
}

void loop() {
  const unsigned long now = millis();

  // A short reaction (habit complete / level-up) takes priority over the
  // progress mood. When it expires, return to the current progress mood.
  if (companionMoodActive && (long)(now - companionMoodUntil) >= 0) {
    companionMoodActive = false;
    companionMood = MOOD_NONE;
    if (!sleepMode) applyMood(progressMood);
  }

  // Sleep animation is local to the ESP32, so it works even if the browser
  // stops sending data. New BLE commands and workout movement wake it.
  if (!sleepMode && !companionMoodActive && now - lastActivityAt >= sleepAfterMs) {
    sleepMode = true;
    if (face != nullptr) {
      face->RandomBlink = false;
      face->RandomLook = false;
      face->Expression.GoTo_Sleepy();
    }
    Serial.println("ESP32 idle 12s -> SLEEP");
  }

  if (!companionMoodActive && !sleepMode) applyPendingMood();
  if (face != nullptr) face->Update();

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
