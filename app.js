/* =====================================================
   DOYOURSTREAK
   Habit Tracker JavaScript
===================================================== */


/* =====================================================
   DATA
===================================================== */

document.addEventListener("click", (event) => {
    const deleteButton = event.target.closest(".delete-habit");

    if (!deleteButton) return;

    const id = Number(deleteButton.dataset.id);

    deleteHabit(id);
});

let user = JSON.parse(
    localStorage.getItem("doyourstreak-user")
) || null;

let habits = JSON.parse(
    localStorage.getItem("doyourstreak-habits")
) || [];

let stats = JSON.parse(
    localStorage.getItem("doyourstreak-stats")
) || {
    xp: 0,
    streak: 0,
    lastCompletedDate: null
};

let selectedEmoji = "belajaricon.png";
let selectedPriority = "Normal";


/* =====================================================
   ELEMENTS
===================================================== */

const loginScreen = document.getElementById("loginScreen");
const appScreen = document.getElementById("appScreen");

const emailInput = document.getElementById("emailInput");
const emailNext = document.getElementById("emailNext");

const characterPlayer =
    document.getElementById("characterPlayer");

const characterNext =
    document.getElementById("characterNext");

const characterNameInput =
    document.getElementById("characterNameInput");

const startJourneyButton =
    document.getElementById("startJourneyButton");

const emailError =
    document.getElementById("emailError");

const nameError =
    document.getElementById("nameError");

const playerName = document.getElementById("playerName");
const headerName = document.getElementById("headerName");

const habitList = document.getElementById("habitList");
const emptyState = document.getElementById("emptyState");

const addHabitButton = document.getElementById("addHabitButton");
const emptyAddButton = document.getElementById("emptyAddButton");

const habitModal = document.getElementById("habitModal");
const closeModal = document.getElementById("closeModal");

const habitName = document.getElementById("habitName");
const saveHabitButton = document.getElementById("saveHabitButton");
const habitTime = document.getElementById("habitTime");

const levelElement = document.getElementById("level");
const xpText = document.getElementById("xpText");
const xpBar = document.getElementById("xpBar");

const streakElement = document.getElementById("streak");
const totalXP = document.getElementById("totalXP");
const completedToday = document.getElementById("completedToday");


/* =====================================================
   ESP32 COMPANION (Web Bluetooth)
===================================================== */
const ESP32_SERVICE_UUID = "12345678-1234-1234-1234-123456789001";
const ESP32_CHARACTERISTIC_UUID = "12345678-1234-1234-1234-123456789002";
let espDevice = null;
let espCharacteristic = null;
let espWriteQueue = Promise.resolve();

const espConnectButton = document.getElementById("espConnectButton");
const espConnectionStatus = document.getElementById("espConnectionStatus");
const espTopStatus = document.getElementById("espTopStatus");

function setESPStatus(message, connected = false) {
    if (!espConnectionStatus) return;
    espConnectionStatus.textContent = message;
    espConnectionStatus.classList.toggle("connected", connected);
    if (espTopStatus) {
        const connecting = !connected && /search|connect|sync/i.test(message);
        espTopStatus.textContent = connected ? "● ESP32 ONLINE" : connecting ? "● ESP32 CONNECTING" : "● ESP32 OFFLINE";
        espTopStatus.classList.toggle("connected", connected);
        espTopStatus.classList.toggle("connecting", connecting);
    }
}

async function connectESP32() {
    if (!navigator.bluetooth) {
        setESPStatus("BLE needs Chrome/Edge on HTTPS or localhost");
        alert("Web Bluetooth belum tersedia. Buka DOYOURSTREAK di Chrome/Edge melalui localhost atau HTTPS, lalu coba lagi.");
        return;
    }
    try {
        espConnectButton.disabled = true;
        setESPStatus("Searching for Vita ESP32…");
        espDevice = await navigator.bluetooth.requestDevice({
            filters: [{ services: [ESP32_SERVICE_UUID] }],
            optionalServices: [ESP32_SERVICE_UUID]
        });
        espDevice.addEventListener("gattserverdisconnected", () => {
            espCharacteristic = null;
            setESPStatus("ESP32: Disconnected");
            if (espConnectButton) {
                espConnectButton.disabled = false;
                espConnectButton.textContent = "🔌 CONNECT ESP32";
            }
        });
        const server = await espDevice.gatt.connect();
        const service = await server.getPrimaryService(ESP32_SERVICE_UUID);
        espCharacteristic = await service.getCharacteristic(ESP32_CHARACTERISTIC_UUID);
        setESPStatus("ESP32: Connected ✓", true);
        espConnectButton.textContent = "✓ ESP32 CONNECTED";
        await syncESPStats();
    } catch (error) {
        console.error("ESP32 BLE connection failed:", error);
        setESPStatus(error.name === "NotFoundError" ? "Device not selected" : "Connection failed");
    } finally {
        if (espConnectButton) espConnectButton.disabled = false;
    }
}

function sendESPCommand(command) {
    if (!espCharacteristic) return Promise.resolve(false);
    // Serialise writes so a habit event and its XP sync cannot overtake each other.
    espWriteQueue = espWriteQueue.then(async () => {
        if (!espCharacteristic) return false;
        const data = new TextEncoder().encode(command);
        if (espCharacteristic.properties.writeWithoutResponse && !espCharacteristic.properties.write) {
            await espCharacteristic.writeValueWithoutResponse(data);
        } else {
            await espCharacteristic.writeValue(data);
        }
        return true;
    }).catch(error => {
        console.error("ESP32 BLE write failed:", error);
        setESPStatus("ESP32 write failed — reconnect", false);
        return false;
    });
    return espWriteQueue;
}

function getESPDailyProgress() {
    const total = Array.isArray(habits) ? habits.length : 0;
    const completed = total
        ? habits.filter(habit => habit && habit.completed).length
        : 0;
    const percent = total ? Math.round((completed / total) * 100) : 0;
    return { completed, total, percent };
}

async function syncESPStats() {
    const xp = Math.max(0, Number(stats.xp) || 0);
    const level = Math.floor(xp / 100) + 1;
    const xpProgress = xp % 100;
    const daily = getESPDailyProgress();

    // Protocol: SYNC:xp:level:xpProgress:dailyPercent:completedHabits:totalHabits
    // Older firmware safely ignores the additional fields; updated firmware uses
    // dailyPercent to select the companion's underlying mood.
    return sendESPCommand(
        `SYNC:${xp}:${level}:${xpProgress}:${daily.percent}:${daily.completed}:${daily.total}`
    );
}

function notifyESP32HabitCompleted(levelUp = false) {
    // These are non-blocking: local habit tracking still works when BLE is disconnected.
    sendESPCommand("HABIT_DONE");
    syncESPStats();
    if (levelUp) sendESPCommand("LEVEL_UP");
}

if (espConnectButton) espConnectButton.addEventListener("click", connectESP32);

/* =====================================================
   INITIALIZATION
===================================================== */

document.addEventListener("DOMContentLoaded", () => {

    renderDailyTask();
    setupCharacterFallback();
    setupPriorityButtons();
    setupEmojiButtons();

    if (user) {
        showApp();
    } else {
        showLogin();
    }

});





/* =====================================================
   SCREEN
===================================================== */

function showLogin() {

    loginScreen.classList.remove("hidden");

    appScreen.classList.add("hidden");

}


function showApp() {

    loginScreen.classList.add("hidden");

    appScreen.classList.remove("hidden");

    const displayName =
        user.characterName || user.name || "Player";

    if (playerName) {
        if (playerName) playerName.textContent = displayName;
        if (headerName) headerName.textContent = displayName;
    }

    if (headerName) {
        headerName.textContent = displayName;
    }

    renderHabits();

    updateStats();

}


/* =====================================================
   MODAL
===================================================== */

addHabitButton?.addEventListener(
    "click",
    openHabitModal
);

emptyAddButton?.addEventListener(
    "click",
    openHabitModal
);

closeModal?.addEventListener(
    "click",
    closeHabitModal
);

habitModal?.addEventListener("click", (event) => {

    if (event.target === habitModal) {
        closeHabitModal();
    }

});



function openHabitModal() {

    habitModal?.classList.remove("hidden");

    if (habitName) {
        habitName.value = "";
    }

    if (habitTime) {
        habitTime.value = "";
    }

    selectedPriority = "Normal";
    selectedEmoji = "belajaricon.png";

    /* RESET PRIORITY */

    document
        .querySelectorAll(".priority-option")
        .forEach(button => {

            button.classList.remove("selected");

            if (
                button.dataset.priority === "Normal"
            ) {
                button.classList.add("selected");
            }

        });


    /* RESET EMOJI */

    document
        .querySelectorAll(".emoji-option")
        .forEach(button => {

            button.classList.remove("selected");

            if (button.dataset.icon === "belajaricon.png") {
                button.classList.add("selected");
            }

        });


    habitName?.focus();
    showHabitStep(1);

}


function closeHabitModal() {

    habitModal.classList.add("hidden");

}

/* =====================================================
   ADD HABIT STEPS
===================================================== */


const habitSteps = [
    document.getElementById("habitStep1"),
    document.getElementById("habitStep2"),
    document.getElementById("habitStep3"),
    document.getElementById("habitStep4")
];

function showHabitStep(step) {

    habitSteps.forEach((element, index) => {

        if (!element) return;

        element.classList.toggle(
            "active",
            index === step - 1
        );

    });

}


/* STEP 1 → STEP 2 */

document.getElementById("habitNext1")?.addEventListener(
    "click",
    () => {

        if (!habitName.value.trim()) {

            habitName.focus();

            return;
        }

        showHabitStep(2);

    }
);


/* STEP 2 → STEP 3 */

document.getElementById("habitNext2")?.addEventListener(
    "click",
    () => {

        if (!habitTime.value) {

            habitTime.focus();

            return;
        }

        showHabitStep(3);

    }
);


/* STEP 3 → STEP 4 */

document.getElementById("habitNext3")?.addEventListener(
    "click",
    () => {

        showHabitStep(4);

    }
);


/* BACK BUTTONS */

document.getElementById("habitBack2")?.addEventListener(
    "click",
    () => showHabitStep(1)
);

document.getElementById("habitBack3")?.addEventListener(
    "click",
    () => showHabitStep(2)
);

document.getElementById("habitBack4")?.addEventListener(
    "click",
    () => showHabitStep(3)
);



/* =====================================================
   PRIORITY SELECTOR
===================================================== */

function setupPriorityButtons() {
    const buttons = document.querySelectorAll(".priority-option");

    buttons.forEach(button => {
        button.addEventListener("click", () => {

            buttons.forEach(btn => {
                btn.classList.remove("selected");
            });

            button.classList.add("selected");

            selectedPriority = button.dataset.priority;
        });
    });
}

/* =====================================================
   EMOJI SELECTOR
===================================================== */

function setupEmojiButtons() {
    const buttons = document.querySelectorAll(".emoji-option");

    buttons.forEach(button => {
        button.addEventListener("click", () => {

            buttons.forEach(btn => {
                btn.classList.remove("selected");
            });

            button.classList.add("selected");

            selectedEmoji = button.dataset.icon;
        });
    });
}

/* =====================================================
   CREATE HABIT
===================================================== */

saveHabitButton?.addEventListener(
    "click",
    createHabit
);

habitName?.addEventListener("keydown", (event) => {

    if (event.key === "Enter") {
        createHabit();
    }

});


function createHabit() {

    const name =
        habitName.value.trim();

    const time =
        habitTime.value;


    /* CHECK NAME */

    if (!name) {

        habitName.focus();

        return;
    }


    /* CHECK TIME */

    if (!time) {

        habitTime.focus();

        return;
    }


    const newHabit = {

        id: Date.now(),

        name: name,

        time: time,

        priority: selectedPriority,

        emoji: selectedEmoji,

        completed: false,

        streak: 0

    };


    habits.push(newHabit);

    saveHabits();
    saveStats();

    renderHabits();
    updateStats();
    renderDailyTask();

}


/* =====================================================
   RENDER HABITS
===================================================== */

function renderHabits() {

    habitList.innerHTML = "";


    if (habits.length === 0) {

        emptyState.classList.remove("hidden");

        return;

    }


    emptyState.classList.add("hidden");


    habits.forEach(habit => {

        const card =
            document.createElement("div");


        card.className =
            "habit-card";


        if (habit.completed) {
            card.classList.add("completed");
        }


        card.innerHTML = `

            <div class="habit-left">

             <div class="habit-icon">
                <img src="${habit.emoji}" alt="${habit.name}">
                </div>

                <button class="delete-habit" data-id="${habit.id}" title="Delete habit">
                     🗑️
                </button>

                <div>

                    <div class="habit-name">
                        ${escapeHTML(habit.name)}
                    </div>

                  <div class="habit-details">

    <span class="habit-time">
        ⏰ ${habit.time || "--:--"}
    </span>

    <span class="habit-priority ${(
                habit.priority || "Normal"
            ).toLowerCase()}">
        ${habit.priority || "Normal"}
    </span>

               </div>

              <div class="habit-streak">
    🔥 ${habit.streak} day streak
              </div>

                </div>

            </div>


            <button
                class="complete-button"
                data-id="${habit.id}"
            >
                ✓
            </button>

        `;


        const button =
            card.querySelector(".complete-button");


        button.addEventListener(
            "click",
            () => toggleHabit(habit.id)
        );


        habitList.appendChild(card);

    });

}

function deleteHabit(id) {
    const habit = habits.find(h => h.id === id);

    if (!habit) return;

    const confirmDelete = confirm(
        `Delete "${habit.name}"?`
    );

    if (!confirmDelete) return;

    habits = habits.filter(h => h.id !== id);

    saveHabits();
    saveStats();

    renderHabits();
    updateStats();
    renderDailyTask();
}

/* =====================================================
   COMPLETE HABIT
===================================================== */


function setupCharacterFallback() {
    const image = document.getElementById("playerImage");
    const fallback = document.getElementById("characterFallback");
    if (!image || !fallback) return;
    image.addEventListener("error", () => {
        image.classList.add("hidden");
        fallback.classList.remove("hidden");
    });
    image.addEventListener("load", () => {
        image.classList.remove("hidden");
        fallback.classList.add("hidden");
    });
    if (image.complete && image.naturalWidth === 0) {
        image.classList.add("hidden");
        fallback.classList.remove("hidden");
    }
}

function triggerCharacterReaction(reaction) {
    const image = document.getElementById("playerImage");
    const fallback = document.getElementById("characterFallback");
    const target = image && !image.classList.contains("hidden") ? image : fallback;
    const bubble = document.getElementById("characterReactionBubble");
    if (!target) return;

    const messages = {
        "happy": "Mantap! +10 XP",
        "level-up": "LEVEL UP! 🎉",
        "streak": "STREAK 7 HARI! 🔥"
    };
    if (bubble) {
        bubble.textContent = messages[reaction] || messages.happy;
        bubble.classList.remove("hidden");
        window.clearTimeout(bubble.hideTimer);
        bubble.hideTimer = window.setTimeout(() => bubble.classList.add("hidden"), 2200);
    }

    const classes = ["react-happy", "react-level-up", "react-streak"];
    target.classList.remove(...classes);
    void target.offsetWidth;
    const className = reaction === "level-up" ? "react-level-up" : reaction === "streak" ? "react-streak" : "react-happy";
    target.classList.add(className);
    window.setTimeout(() => target.classList.remove(className), 1400);
}


function toggleHabit(id) {

    const habit =
        habits.find(item => item.id === id);


    if (!habit) return;


    /* ==============================================
       UNCHECK HABIT
    ============================================== */

    if (habit.completed) {

        habit.completed = false;

        stats.xp = Math.max(
            0,
            stats.xp - 10
        );


        saveHabits();

        saveStats();

        renderHabits();

        updateStats();

        renderDailyTask();

        return;
    }


    /* ==============================================
       COMPLETE HABIT
    ============================================== */

    const oldLevel =
        Math.floor(stats.xp / 100) + 1;


    habit.completed = true;

    habit.streak++;

    stats.xp += 10;

    updateDailyStreak();
    careForCharacterToday();

    const newLevel =
        Math.floor(stats.xp / 100) + 1;


    saveHabits();

    saveStats();

    renderHabits();

    updateStats();

    notifyESP32HabitCompleted(newLevel > oldLevel);

    /* ==============================================
       ANIMATIONS
    ============================================== */

    triggerCharacterReaction(
        newLevel > oldLevel ? "level-up" : (habit.streak > 0 && habit.streak % 7 === 0 ? "streak" : "happy")
    );

    if (typeof celebratePlayer === "function") {
        celebratePlayer();
    }

    if (typeof showXPPopup === "function") {
        showXPPopup(10);
    }

    if (typeof animateXPBar === "function") {
        animateXPBar();
    }


    /* LEVEL UP */
    if (newLevel > oldLevel) {

        if (typeof animateLevelUp === "function") {
            animateLevelUp();
        }

        if (typeof showLevelUpMessage === "function") {
            showLevelUpMessage();
        }

    }

}



/* =====================================================
   DAILY STREAK
===================================================== */

function updateDailyStreak() {

    const today =
        new Date().toISOString().split("T")[0];


    if (stats.lastCompletedDate === today) {
        return;
    }


    const yesterdayDate = new Date();

    yesterdayDate.setDate(
        yesterdayDate.getDate() - 1
    );


    const yesterday =
        yesterdayDate.toISOString().split("T")[0];


    if (
        stats.lastCompletedDate === yesterday
    ) {

        stats.streak++;

    } else {

        stats.streak = 1;

    }


    stats.lastCompletedDate = today;

}


/* =====================================================
   STATS
===================================================== */

function updateStats() {

    const completed =
        habits.filter(
            habit => habit.completed
        ).length;


    completedToday.textContent =
        `${completed} / ${habits.length}`;


    streakElement.textContent =
        stats.streak;


    totalXP.textContent =
        stats.xp;


    const level =
        Math.floor(stats.xp / 100) + 1;


    const currentXP =
        stats.xp % 100;


    levelElement.textContent =
        level;


    xpText.textContent =
        currentXP;


    xpBar.style.width =
        `${currentXP}%`;

    // Keep the ESP32 companion display synced to the app's authoritative XP/level.
    if (espCharacteristic) syncESPStats();

}


/* =====================================================
   LOCAL STORAGE
===================================================== */

function saveHabits() {

    localStorage.setItem(
        "doyourstreak-habits",
        JSON.stringify(habits)
    );

}


function saveStats() {

    localStorage.setItem(
        "doyourstreak-stats",
        JSON.stringify(stats)
    );

}


/* =====================================================
   SECURITY
===================================================== */

function escapeHTML(text) {

    const div =
        document.createElement("div");

    div.textContent = text;

    return div.innerHTML;

}


/* =====================================================
   PLAYER IMAGE FALLBACK
===================================================== */

function showPlaceholder() {

    const image =
        document.getElementById("playerImage");

    const placeholder =
        document.getElementById("playerPlaceholder");


    image.style.display = "none";

    placeholder.style.display = "block";

}


/* =====================================================
   LANDING PAGE LOGIN
===================================================== */

const loginButton =
    document.getElementById("loginButton");

const loginModal =
    document.getElementById("loginModal");

const closeLogin =
    document.getElementById("closeLogin");


/* OPEN LOGIN */

loginButton?.addEventListener("click", () => {

    loginModal.classList.remove("hidden");

    showLoginStep(1);

    setTimeout(() => {

        emailInput?.focus();

    }, 100);

});

/* CLOSE LOGIN */

closeLogin?.addEventListener("click", () => {

    loginModal.classList.add("hidden");

});


/* CLICK OUTSIDE */

loginModal?.addEventListener("click", (event) => {

    if (event.target === loginModal) {

        loginModal.classList.add("hidden");

    }

});


/* ESCAPE */

document.addEventListener("keydown", (event) => {

    if (
        event.key === "Escape" &&
        !loginModal.classList.contains("hidden")
    ) {

        loginModal.classList.add("hidden");

    }

});

/* =====================================================
   MULTI STEP LOGIN
===================================================== */

let selectedCharacter = "player.png";


/* =====================================================
   LOGIN STEP
===================================================== */

function showLoginStep(step) {

    const steps = [
        document.getElementById("loginStep1"),
        document.getElementById("loginStep2"),
        document.getElementById("loginStep3")
    ];

    steps.forEach(stepElement => {

        if (stepElement) {
            stepElement.classList.remove("active");
        }

    });


    if (steps[step - 1]) {
        steps[step - 1].classList.add("active");
    }

}


/* =====================================================
   STEP 1 : EMAIL
===================================================== */

emailNext?.addEventListener("click", () => {

    const email =
        emailInput.value.trim();


    if (!email) {

        emailError.textContent =
            "Please enter your email.";

        emailInput.focus();

        return;
    }


    if (
        !email.includes("@") ||
        !email.includes(".")
    ) {

        emailError.textContent =
            "Please enter a valid email.";

        emailInput.focus();

        return;
    }


    emailError.textContent = "";

    showLoginStep(2);

});


/* ENTER ON EMAIL */

emailInput?.addEventListener(
    "keydown",
    (event) => {

        if (event.key === "Enter") {
            emailNext.click();
        }

    }
);


/* =====================================================
   STEP 2 : CHARACTER
===================================================== */

characterPlayer?.addEventListener(
    "click",
    () => {

        selectedCharacter = "player.png";

        characterPlayer.classList.add(
            "selected"
        );

    }
);


/* STEP 2 → STEP 3 */

characterNext?.addEventListener(
    "click",
    () => {

        showLoginStep(3);

        setTimeout(() => {

            characterNameInput?.focus();

        }, 200);

    }
);


/* =====================================================
   STEP 3 : CHARACTER NAME
===================================================== */

startJourneyButton?.addEventListener(
    "click",
    startJourney
);


characterNameInput?.addEventListener(
    "keydown",
    (event) => {

        if (event.key === "Enter") {
            startJourney();
        }

    }
);


/* =====================================================
   START JOURNEY
===================================================== */

function startJourney() {

    const email =
        emailInput.value.trim();

    const characterName =
        characterNameInput.value.trim();


    /* NAME VALIDATION */

    if (!characterName) {

        nameError.textContent =
            "Please give your character a name.";

        characterNameInput.focus();

        return;
    }


    if (characterName.length < 2) {

        nameError.textContent =
            "Name must be at least 2 characters.";

        characterNameInput.focus();

        return;
    }


    nameError.textContent = "";


    /* SAVE USER */

    user = {

        email: email,

        character: selectedCharacter,

        characterName: characterName

    };


    localStorage.setItem(
        "doyourstreak-user",
        JSON.stringify(user)
    );


    /* CLOSE LOGIN MODAL */

    loginModal.classList.add("hidden");


    /* SHOW APP */

    showApp();

}

// ================================
// PAGE NAVIGATION
// ================================

const characterNav = document.getElementById("characterNav");
const shopNav = document.getElementById("shopNav");
const gameNav = document.getElementById("gameNav");
const exerciseNav = document.getElementById("exerciseNav");
const infoNav = document.getElementById("infoNav");

const characterPage = document.getElementById("characterPage");
const shopPage = document.getElementById("shopPage");
const gamePage = document.getElementById("gamePage");
const exercisePage = document.getElementById("exercisePage");
const infoPage = document.getElementById("infoPage");


function setActiveNav(activeButton) {

    characterNav?.classList.remove("active");
    shopNav?.classList.remove("active");
    gameNav?.classList.remove("active");
    exerciseNav?.classList.remove("active");
    infoNav?.classList.remove("active");

    activeButton?.classList.add("active");
}

function showGamePage() {

    characterPage?.classList.remove("active");
    shopPage?.classList.remove("active");
    gamePage?.classList.add("active");
    exercisePage?.classList.remove("active");
    infoPage?.classList.remove("active");

    setActiveNav(gameNav);

    window.scrollTo(0, 0);

}

function showCharacterPage() {

    characterPage?.classList.add("active");
    shopPage?.classList.remove("active");
    exercisePage?.classList.remove("active");
    infoPage?.classList.remove("active");
    gamePage?.classList.remove("active");

    setActiveNav(characterNav);

    window.scrollTo(0, 0);
}


function showShopPage() {

    characterPage?.classList.remove("active");
    shopPage?.classList.add("active");
    exercisePage?.classList.remove("active");
    infoPage?.classList.remove("active");

    setActiveNav(shopNav);

    updateCoins();

    window.scrollTo(0, 0);
}


function showExercisePage() {

    characterPage?.classList.remove("active");
    shopPage?.classList.remove("active");
    exercisePage?.classList.add("active");
    infoPage?.classList.remove("active");
    gamePage?.classList.remove("active");

    setActiveNav(exerciseNav);

    window.scrollTo(0, 0);
}


function showInfoPage() {

    characterPage?.classList.remove("active");
    shopPage?.classList.remove("active");
    exercisePage?.classList.remove("active");
    infoPage?.classList.add("active");
    gamePage?.classList.remove("active");

    setActiveNav(infoNav);

    renderCalendar();

    window.scrollTo(0, 0);
}


characterNav?.addEventListener("click", showCharacterPage);
shopNav?.addEventListener("click", showShopPage);
gameNav?.addEventListener("click", showGamePage);
exerciseNav?.addEventListener("click", showExercisePage);
infoNav?.addEventListener("click", showInfoPage);

/* =====================================================
   CALENDAR
===================================================== */

let calendarDate = new Date();


const calendarEvents = {
    "2026-10-10": "STREAK WEEK",
    "2026-10-15": "NEW CHARACTER UPDATE",
    "2026-10-25": "COMMUNITY EVENT"
};


function getDateKey(year, month, day) {

    return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

}


function renderCalendar() {

    const calendarDays = document.getElementById("calendarDays");
    const calendarMonth = document.getElementById("calendarMonth");

    if (!calendarDays || !calendarMonth) return;


    const year = calendarDate.getFullYear();
    const month = calendarDate.getMonth();


    const monthName = calendarDate.toLocaleDateString("en-US", {
        month: "long",
        year: "numeric"
    });


    calendarMonth.textContent = monthName;


    calendarDays.innerHTML = "";


    const firstDay = new Date(year, month, 1).getDay();

    const daysInMonth = new Date(
        year,
        month + 1,
        0
    ).getDate();


    // Convert Sunday-first to Monday-first
    const startingDay = firstDay === 0 ? 6 : firstDay - 1;


    // Empty spaces before first day
    for (let i = 0; i < startingDay; i++) {

        const emptyDay = document.createElement("div");

        emptyDay.className = "calendar-day empty";

        calendarDays.appendChild(emptyDay);

    }


    const today = new Date();


    for (let day = 1; day <= daysInMonth; day++) {

        const dayElement = document.createElement("div");

        dayElement.className = "calendar-day";

        dayElement.textContent = day;


        const dateKey = getDateKey(year, month, day);


        // Today's date
        if (
            day === today.getDate() &&
            month === today.getMonth() &&
            year === today.getFullYear()
        ) {

            dayElement.classList.add("today");

        }


        // Has event
        if (calendarEvents[dateKey]) {

            dayElement.classList.add("has-event");

            dayElement.title = calendarEvents[dateKey];

        }


        calendarDays.appendChild(dayElement);

    }

}


document.getElementById("prevMonth")?.addEventListener("click", () => {

    calendarDate.setMonth(calendarDate.getMonth() - 1);

    renderCalendar();

});


document.getElementById("nextMonth")?.addEventListener("click", () => {

    calendarDate.setMonth(calendarDate.getMonth() + 1);

    renderCalendar();

});


renderCalendar();

showCharacterPage();





/* =====================================================
   CHARACTER SYSTEM
===================================================== */

const prevCharacter =
    document.getElementById("prevCharacter");

const nextCharacter =
    document.getElementById("nextCharacter");


/* =========================================
   CHARACTER DATABASE
========================================= */

const characters = [

    {
        id: "player",
        name: "PLAYER",
        image: "player.png",
        price: 0
    },
    {
        id: "catty",
        name: "CATTY",
        image: "catty.png",
        price: 0
    },

    {
        id: "oyenomali",
        name: "OYENOMALI",
        image: "oyenomali.png",
        price: 100
    },

    {
        id: "playerskin",
        name: "PLAYERSKIN",
        image: "playerskin.png",
        price: 150
    },

    {
        id: "copet",
        name: "COPET",
        image: "copet.png",
        price: 200
    },

    {
        id: "copetcandy",
        name: "COPETCANDY",
        image: "copetcandy.png",
        price: 300
    },

    {
        id: "iwaktempe",
        name: "IWAKTEMPE",
        image: "iwaktempe.png",
        price: 250
    },

    {
        id: "catfish",
        name: "CATFISH",
        image: "catfish.png",
        price: 230
    },
    {
        id: "greendog",
        name: "GREENDOG",
        image: "greendog.png",
        price: 400
    },
    {
        id: "imup",
        name: "IMUP",
        image: "imup.png",
        price: 500
    },
    {
        id: "imupcola",
        name: "IMUPCOLA",
        image: "imupcola.png",
        price: 500
    },
    {
        id: "whtdogdoing",
        name: "WHTDOGDOING",
        image: "whtdogdoing.png",
        price: 200
    },
    {
        id: "apien",
        name: "APIEN",
        image: "apien.png",
        price: 300
    },
    {
        id: "caret",
        name: "CARET",
        image: "caret.png",
        price: 400
    },

    // PREMIUM CHARACTERS
    {
        id: "chinescat",
        name: "CHINESCAT",
        image: "chinescat.png",
        price: 0,
        premium: true
    },
    {
        id: "eggcat",
        name: "EGGCAT",
        image: "eggcat.png",
        price: 0,
        premium: true
    },
    {
        id: "fighterpilot",
        name: "FIGHTERPILOT",
        image: "fighterpilot.png",
        price: 0,
        premium: true
    },
    {
        id: "greycat",
        name: "GREYCAT",
        image: "greycat.png",
        price: 0,
        premium: true
    },
    {
        id: "hamster",
        name: "HAMSTER",
        image: "hamster.png",
        price: 0,
        premium: true
    },
    {
        id: "hamsterskin",
        name: "HAMSTER SKIN",
        image: "hamsterskin.png",
        price: 0,
        premium: true
    },
    {
        id: "catowl",
        name: "CATOWL",
        image: "catowl.png",
        price: 0,
        premium: true
    },
    {
        id: "catmine",
        name: "CATMINE",
        image: "catmine.png",
        price: 0,
        premium: true
    },
    {
        id: "wdonal",
        name: "WDONAL",
        image: "Wdonal.png",
        price: 0,
        premium: true
    }
    // NANTI TAMBAH CHARACTER DI SINI

];


let currentCharacter = 0;


/* =========================================
   CHARACTER CARE / NEGLECT SYSTEM
========================================= */

const LAST_CHARACTER_CARE_KEY =
    "doyourstreak-last-care-date";

const DIRTY_CHARACTER_IMAGES = {
    "player.png": "playerJorok.png",
    "catty.png": "cattyJorok.png",
    "copet.png": "copetJorok.png"
};

function getDaysSinceCharacterCare() {
    let lastCareDate = localStorage.getItem(
        LAST_CHARACTER_CARE_KEY
    );

    const today = getTodayDate();

    // Pemakaian pertama: mulai menghitung dari hari ini
    if (!lastCareDate) {
        localStorage.setItem(
            LAST_CHARACTER_CARE_KEY,
            today
        );

        return 0;
    }

    const [lastYear, lastMonth, lastDay] =
        lastCareDate.split("-").map(Number);

    const [todayYear, todayMonth, todayDay] =
        today.split("-").map(Number);

    const lastDate = new Date(
        lastYear,
        lastMonth - 1,
        lastDay
    );

    const todayDate = new Date(
        todayYear,
        todayMonth - 1,
        todayDay
    );

    const difference =
        todayDate.getTime() - lastDate.getTime();

    // Tanggal masa depan tidak boleh membuat hitungan negatif
    if (difference < 0) return 0;

    return Math.floor(
        difference / (1000 * 60 * 60 * 24)
    );
}

function getCharacterDisplayImage(character) {
    if (!character) return "player.png";

    const daysWithoutCare =
        getDaysSinceCharacterCare();

    if (daysWithoutCare >= 3) {
        return (
            DIRTY_CHARACTER_IMAGES[character.image] ||
            character.image
        );
    }

    return character.image;
}

function careForCharacterToday() {
    localStorage.setItem(
        LAST_CHARACTER_CARE_KEY,
        getTodayDate()
    );

    updateCharacter();
}


/* =========================================
   CHECK OWNERSHIP
========================================= */

function isCharacterOwned(character) {
    // Premium characters need Premium access.
    if (character.premium) {
        return localStorage.getItem(
            "doyourstreak-premium-demo"
        ) === "true";
    }

    // Existing free characters remain unlocked.
    if (character.price === 0) {
        return true;
    }

    return localStorage.getItem(
        `doyourstreak-owned-${character.image}`
    ) === "true";
}


/* =========================================
   FIND NEXT OWNED CHARACTER
========================================= */

function findNextOwnedCharacter(direction) {

    let index = currentCharacter;

    for (let i = 0; i < characters.length; i++) {

        index += direction;

        if (index >= characters.length) {
            index = 0;
        }

        if (index < 0) {
            index = characters.length - 1;
        }

        if (isCharacterOwned(characters[index])) {

            return index;

        }

    }

    return currentCharacter;
}


/* =========================================
   UPDATE CHARACTER
========================================= */

function updateCharacter() {

    const playerImage =
        document.getElementById("playerImage");

    const playerName =
        document.getElementById("playerName");

    const character =
        characters[currentCharacter];


    if (!character) return;



    if (playerImage) {
        playerImage.src = getCharacterDisplayImage(character);
        playerImage.alt = character.name;
        playerImage.classList.remove("hidden");
    }



    if (playerName) {

        playerName.textContent =
            character.name;

    }

}


/* =========================================
   PREVIOUS CHARACTER
========================================= */

prevCharacter?.addEventListener(
    "click",
    () => {

        currentCharacter =
            findNextOwnedCharacter(-1);

        updateCharacter();

    }
);


/* =========================================
   NEXT CHARACTER
========================================= */

nextCharacter?.addEventListener(
    "click",
    () => {

        currentCharacter =
            findNextOwnedCharacter(1);

        updateCharacter();

    }
);


/* INITIAL CHARACTER */

updateCharacter();

/* =====================================================
   CHARACTER SHOP
===================================================== */
let coins = Number(localStorage.getItem("doyourstreak-coins")) || 0;


/* =====================================================
   COIN ELEMENTS
===================================================== */

const coinAmount =
    document.getElementById("coinAmount");

const shopCoinAmount =
    document.getElementById("shopCoinAmount");


/* =====================================================
   UPDATE COINS
===================================================== */

function updateCoins() {

    if (coinAmount) {
        coinAmount.textContent = coins;
    }

    if (shopCoinAmount) {
        shopCoinAmount.textContent = coins;
    }

    localStorage.setItem(
        "doyourstreak-coins",
        coins
    );
}


/* =====================================================
   DYNAMIC CHARACTER SHOP
===================================================== */

function renderCharacterShop() {

    const shopItems =
        document.querySelector(".shop-items");

    if (!shopItems) return;

    shopItems.innerHTML = "";

    characters.forEach(character => {

        // PLAYER tidak perlu dibeli
        if (character.price === 0) return;

        const owned =
            isCharacterOwned(character);

        const item =
            document.createElement("div");

        item.className = "shop-item";

        item.innerHTML = `

            <img
                src="${character.image}"
                alt="${character.name}"
                class="shop-character-image"
            >

            <h3>
                ${character.name}
            </h3>

                 <p class="character-price">
            <img
                     src="koinngawi.png"
                     alt="Coin"
                     class="coin-icon"
                >
                  ${character.price}
                   </p>

            <button
                class="buy-character"
                data-id="${character.id}"
                ${owned ? "disabled" : ""}
            >
                ${owned ? "OWNED ✓" : "BUY"}
            </button>

        `;

        const button =
            item.querySelector(".buy-character");

        if (!owned) {

            button.addEventListener(
                "click",
                () => buyCharacter(character)
            );

        }

        shopItems.appendChild(item);

    });

}


/* =====================================================
   BUY CHARACTER
===================================================== */

function buyCharacter(character) {

    if (isCharacterOwned(character)) {

        alert("Character ini sudah kamu punya!");

        return;
    }


    if (coins < character.price) {

        alert("Coins kamu belum cukup!");

        return;
    }


    coins -= character.price;


    localStorage.setItem(
        `doyourstreak-owned-${character.image}`,
        "true"
    );


    updateCoins();

    renderCharacterShop();


    alert(
        `${character.name} berhasil dibeli!`
    );

}

// ================================
// DAILY TASK SYSTEM
// ================================

const dailyTasks = [
    {
        id: "complete1",
        title: "Complete 1 Habit",
        description: "Complete at least 1 habit today.",
        target: 1,
        reward: 20,
        check: () => {
            return habits.filter(habit => habit.completed).length;
        }
    },

    {
        id: "complete2",
        title: "Complete 2 Habits",
        description: "Complete at least 2 habits today.",
        target: 2,
        reward: 30,
        check: () => {
            return habits.filter(habit => habit.completed).length;
        }
    },

    {
        id: "highpriority",
        title: "Complete a High Priority Habit",
        description: "Complete 1 High priority habit.",
        target: 1,
        reward: 40,
        check: () => {
            return habits.filter(
                habit =>
                    habit.completed &&
                    habit.priority === "High"
            ).length;
        }
    },

    {
        id: "complete3",
        title: "Complete 3 Habits",
        description: "Complete at least 3 habits today.",
        target: 3,
        reward: 50,
        check: () => {
            return habits.filter(habit => habit.completed).length;
        }
    }
];

function getTodayDate() {
    const date = new Date();

    return `${date.getFullYear()}-${String(
        date.getMonth() + 1
    ).padStart(2, "0")}-${String(
        date.getDate()
    ).padStart(2, "0")}`;
}

function getDailyTask() {

    const today = getTodayDate();

    let savedTask = JSON.parse(
        localStorage.getItem("doyourstreak-daily-task")
    );

    // Kalau belum ada task atau sudah ganti hari
    if (!savedTask || savedTask.date !== today) {

        const randomIndex = Math.floor(
            Math.random() * dailyTasks.length
        );

        const randomTask = dailyTasks[randomIndex];

        savedTask = {
            date: today,
            taskId: randomTask.id,
            claimed: false
        };

        localStorage.setItem(
            "doyourstreak-daily-task",
            JSON.stringify(savedTask)
        );
    }

    return savedTask;
}

function renderDailyTask() {

    const savedTask = getDailyTask();

    const task = dailyTasks.find(
        task => task.id === savedTask.taskId
    );

    if (!task) return;

    const currentProgress = Math.min(
        task.check(),
        task.target
    );

    const title = document.getElementById("dailyTaskTitle");
    const description = document.getElementById("dailyTaskDescription");
    const reward = document.getElementById("dailyTaskReward");
    const progressText = document.getElementById("dailyTaskProgressText");
    const progressBar = document.getElementById("dailyTaskProgressBar");
    const claimButton = document.getElementById("claimDailyTask");

    if (title) {
        title.textContent = task.title;
    }

    if (description) {
        description.textContent = task.description;
    }

    if (reward) {
        reward.innerHTML = `
            <img src="koinngawi.png"
                 alt="Coin"
                 class="coin-icon">
            +${task.reward}
        `;
    }

    if (progressText) {
        progressText.textContent =
            `${currentProgress} / ${task.target}`;
    }

    if (progressBar) {
        const percentage =
            (currentProgress / task.target) * 100;

        progressBar.style.width =
            `${percentage}%`;
    }

    if (claimButton) {

        if (savedTask.claimed) {

            claimButton.textContent = "CLAIMED ✓";
            claimButton.disabled = true;

        } else if (currentProgress >= task.target) {

            claimButton.textContent =
                `CLAIM +${task.reward}`;

            claimButton.disabled = false;

        } else {

            claimButton.textContent = "LOCKED";
            claimButton.disabled = true;
        }
    }
}

document
    .getElementById("claimDailyTask")
    ?.addEventListener("click", claimDailyTask);

function claimDailyTask() {

    const savedTask = getDailyTask();

    if (savedTask.claimed) return;

    const task = dailyTasks.find(
        task => task.id === savedTask.taskId
    );

    if (!task) return;

    const currentProgress = Math.min(
        task.check(),
        task.target
    );

    // Belum selesai
    if (currentProgress < task.target) {
        return;
    }

    // Tambahkan coin
    coins += task.reward;

    // Tandai sudah claim
    savedTask.claimed = true;

    localStorage.setItem(
        "doyourstreak-daily-task",
        JSON.stringify(savedTask)
    );

    // Simpan coin
    localStorage.setItem(
        "doyourstreak-coins",
        coins
    );

    // Update coin di Character + Shop
    updateCoins();

    // Update Daily Task
    renderDailyTask();

    alert(
        `🎉 Daily Task completed!\n\n+${task.reward} coins!`
    );
}

/* =====================================================
   NAVGAME
   FIGHTING + DINO RUN
===================================================== */


/* =====================================================
   CURRENT PLAYER
===================================================== */

function getGameCharacter() {

    if (
        typeof characters !== "undefined" &&
        characters[currentCharacter]
    ) {
        return characters[currentCharacter];
    }

    return {
        name: "PLAYER",
        image: "player.png"
    };
}


/* =====================================================
   GAME ELEMENTS
===================================================== */

const openFightingGame =
    document.getElementById("openFightingGame");

const openDinoGame =
    document.getElementById("openDinoGame");

const gameMenu =
    document.getElementById("gameMenu");

const fightingGame =
    document.getElementById("fightingGame");

const dinoGame =
    document.getElementById("dinoGame");

const backFromFight =
    document.getElementById("backFromFight");

const backFromDino =
    document.getElementById("backFromDino");


function showGameMenu() {

    gameMenu?.classList.remove("hidden");

    fightingGame?.classList.add("hidden");

    dinoGame?.classList.add("hidden");

    stopDinoGame();

}


/* =====================================================
   OPEN FIGHTING
===================================================== */

openFightingGame?.addEventListener(
    "click",
    () => {

        gameMenu?.classList.add("hidden");

        fightingGame?.classList.remove("hidden");

        dinoGame?.classList.add("hidden");

        stopDinoGame();

        startFight();

    }
);


/* =====================================================
   OPEN DINO
===================================================== */

openDinoGame?.addEventListener(
    "click",
    () => {

        gameMenu?.classList.add("hidden");

        fightingGame?.classList.add("hidden");

        dinoGame?.classList.remove("hidden");

        startDinoScreen();

    }
);


/* =====================================================
   BACK
===================================================== */

backFromFight?.addEventListener(
    "click",
    showGameMenu
);

backFromDino?.addEventListener(
    "click",
    showGameMenu
);


/* =====================================================
   FIGHTING GAME
===================================================== */

/* =====================================================
   FIGHTING GAME V2
===================================================== */

let fightPlayerHP = 100;
let fightEnemyHP = 100;

let fightPlayerStamina = 100;
let fightEnemyNumber = 1;

let fightPlayerTurn = true;
let fightFinished = false;

let fightPlayerDefending = false;
let fightEnemyDefending = false;

let fightSpecialCooldown = 0;

let fightLastAction = "";
let fightAttackStreak = 0;


/* =====================================================
   FIGHTING ELEMENTS
===================================================== */

const fightPlayerImage =
    document.getElementById("fightPlayerImage");

const fightPlayerName =
    document.getElementById("fightPlayerName");

const fightPlayerHPBar =
    document.getElementById("fightPlayerHP");

const fightEnemyHPBar =
    document.getElementById("fightEnemyHP");

const fightPlayerHPText =
    document.getElementById("fightPlayerHPText");

const fightEnemyHPText =
    document.getElementById("fightEnemyHPText");

const fightEnemyImage =
    document.getElementById("fightEnemyImage");

const fightStatus =
    document.getElementById("fightStatus");

const fightAttack =
    document.getElementById("fightAttack");

const fightSpecial =
    document.getElementById("fightSpecial");

const fightHeavy =
    document.getElementById("fightHeavy");

const fightDefend =
    document.getElementById("fightDefend");

const fightRecover =
    document.getElementById("fightRecover");

const fightRestart =
    document.getElementById("fightRestart");


/* =====================================================
   BUTTON LIST
===================================================== */

function getFightButtons() {

    return [
        fightAttack,
        fightSpecial,
        fightHeavy,
        fightDefend,
        fightRecover
    ].filter(Boolean);

}


/* =====================================================
   ENABLE / DISABLE BUTTONS
===================================================== */

function setFightButtons(enabled) {

    getFightButtons().forEach(button => {

        button.disabled = !enabled;

    });

}


/* =====================================================
   RANDOM NUMBER
===================================================== */

function randomDamage(min, max) {

    return Math.floor(
        Math.random() * (max - min + 1)
    ) + min;

}


/* =====================================================
   UPDATE FIGHT UI
===================================================== */

function updateFightUI() {

    const character =
        getGameCharacter();


    /* PLAYER IMAGE */

    if (fightPlayerImage) {

        fightPlayerImage.src =
            character.image;

        fightPlayerImage.alt =
            character.name;

    }


    /* PLAYER NAME */

    if (fightPlayerName) {

        fightPlayerName.textContent =
            character.name;

    }


    /* ENEMY IMAGE */

    if (fightEnemyImage) {

        fightEnemyImage.src = fightEnemyNumber === 1
            ? "Monster1.png"
            : "Monster2.png";

    }


    /* PLAYER HP */

    if (fightPlayerHPBar) {

        fightPlayerHPBar.style.width =
            `${Math.max(0, fightPlayerHP)}%`;

    }


    /* ENEMY HP */

    if (fightEnemyHPBar) {

        fightEnemyHPBar.style.width =
            `${Math.max(0, fightEnemyHP)}%`;

    }


    /* PLAYER HP TEXT */

    if (fightPlayerHPText) {

        fightPlayerHPText.textContent =
            `${Math.max(0, fightPlayerHP)} HP`;

    }


    /* ENEMY HP TEXT */

    if (fightEnemyHPText) {

        fightEnemyHPText.textContent =
            `${Math.max(0, fightEnemyHP)} HP`;

    }


    /* SPECIAL BUTTON */

    if (fightSpecial) {

        if (fightSpecialCooldown > 0) {

            fightSpecial.disabled = true;

            fightSpecial.textContent =
                `⚡ SPECIAL (${fightSpecialCooldown})`;

        } else {

            fightSpecial.textContent =
                "⚡ SPECIAL";

        }

    }

}


/* =====================================================
   FIGHT STATUS
===================================================== */

function setFightStatus(message) {

    if (!fightStatus) return;

    fightStatus.textContent =
        message;

}


/* =====================================================
   STAMINA TEXT
===================================================== */

function getStaminaText() {

    return `⚡ Stamina: ${fightPlayerStamina}/100`;

}


/* =====================================================
   START FIGHT
===================================================== */

function startFight() {

    fightPlayerHP = 100;
    fightEnemyHP = 100;

    fightPlayerStamina = 100;

    fightEnemyNumber =
        Math.random() < 0.5
            ? 1
            : 2;

    fightPlayerTurn = true;
    fightFinished = false;

    fightPlayerDefending = false;
    fightEnemyDefending = false;

    fightSpecialCooldown = 0;

    fightLastAction = "";
    fightAttackStreak = 0;


    if (fightRestart) {

        fightRestart.classList.add("hidden");

    }


    setFightButtons(true);


    updateFightUI();


    if (fightEnemyNumber === 1) {

        setFightStatus(
            "👹 AGGRESSIVE MONSTER\n" +
            "Your turn! " +
            getStaminaText()
        );

    } else {

        setFightStatus(
            "🛡️ DEFENSIVE MONSTER\n" +
            "Your turn! " +
            getStaminaText()
        );

    }

}


/* =====================================================
   CHECK STAMINA
===================================================== */

function hasStamina(cost) {

    if (fightPlayerStamina < cost) {

        setFightStatus(
            `❌ Stamina tidak cukup! ` +
            getStaminaText()
        );

        return false;

    }

    return true;

}


/* =====================================================
   PLAYER ACTION
===================================================== */

function beginPlayerAction() {

    if (fightFinished) {

        return false;

    }


    if (!fightPlayerTurn) {

        return false;

    }


    return true;

}


/* =====================================================
   PLAYER DAMAGE TO ENEMY
===================================================== */

function damageEnemy(amount) {

    let finalDamage =
        amount;


    /* ENEMY DEFEND */

    if (fightEnemyDefending) {

        finalDamage =
            Math.floor(amount * 0.5);

        fightEnemyDefending = false;

    }


    fightEnemyHP =
        Math.max(
            0,
            fightEnemyHP - finalDamage
        );


    return finalDamage;

}


/* =====================================================
   PLAYER ATTACK
===================================================== */

fightAttack?.addEventListener(
    "click",
    () => {

        if (!beginPlayerAction()) return;


        const cost = 10;


        if (!hasStamina(cost)) return;


        fightPlayerStamina -= cost;


        const damage =
            damageEnemy(
                randomDamage(9, 14)
            );


        fightLastAction =
            "attack";

        fightAttackStreak++;


        updateFightUI();


        if (fightEnemyHP <= 0) {

            winFight();

            return;

        }


        setFightStatus(
            `👊 Attack! -${damage} HP\n` +
            getStaminaText()
        );


        endPlayerTurn();

    }
);


/* =====================================================
   HEAVY ATTACK
===================================================== */

fightHeavy?.addEventListener(
    "click",
    () => {

        if (!beginPlayerAction()) return;


        const cost = 25;


        if (!hasStamina(cost)) return;


        fightPlayerStamina -= cost;


        /* 30% MISS */

        const hit =
            Math.random() >= 0.30;


        fightLastAction =
            "heavy";

        fightAttackStreak = 0;


        if (!hit) {

            updateFightUI();


            setFightStatus(
                "💨 HEAVY ATTACK MISS!\n" +
                getStaminaText()
            );


            endPlayerTurn();

            return;

        }


        const damage =
            damageEnemy(
                randomDamage(20, 30)
            );


        updateFightUI();


        if (fightEnemyHP <= 0) {

            winFight();

            return;

        }


        setFightStatus(
            `💥 Heavy Attack! -${damage} HP\n` +
            getStaminaText()
        );


        endPlayerTurn();

    }
);


/* =====================================================
   DEFEND
===================================================== */

fightDefend?.addEventListener(
    "click",
    () => {

        if (!beginPlayerAction()) return;


        const cost = 5;


        if (!hasStamina(cost)) return;


        fightPlayerStamina -= cost;


        fightPlayerDefending =
            true;


        fightLastAction =
            "defend";

        fightAttackStreak = 0;


        setFightStatus(
            "🛡️ Kamu bersiap bertahan!\n" +
            getStaminaText()
        );


        updateFightUI();


        endPlayerTurn();

    }
);


/* =====================================================
   RECOVER
===================================================== */

fightRecover?.addEventListener(
    "click",
    () => {

        if (!beginPlayerAction()) return;


        const cost = 20;


        if (!hasStamina(cost)) return;


        fightPlayerStamina -= cost;


        const heal =
            randomDamage(12, 20);


        fightPlayerHP =
            Math.min(
                100,
                fightPlayerHP + heal
            );


        fightLastAction =
            "recover";

        fightAttackStreak = 0;


        updateFightUI();


        setFightStatus(
            `❤️ Recover +${heal} HP\n` +
            getStaminaText()
        );


        endPlayerTurn();

    }
);


/* =====================================================
   SPECIAL
===================================================== */

fightSpecial?.addEventListener(
    "click",
    () => {

        if (!beginPlayerAction()) return;


        const cost = 40;


        if (fightSpecialCooldown > 0) {

            setFightStatus(
                `⏳ Special masih cooldown ${fightSpecialCooldown} turn.`
            );

            return;

        }


        if (!hasStamina(cost)) return;


        fightPlayerStamina -= cost;


        const damage =
            damageEnemy(
                randomDamage(28, 38)
            );


        fightSpecialCooldown =
            3;


        fightLastAction =
            "special";

        fightAttackStreak = 0;


        updateFightUI();


        if (fightEnemyHP <= 0) {

            winFight();

            return;

        }


        setFightStatus(
            `⚡ SPECIAL! -${damage} HP\n` +
            getStaminaText()
        );


        endPlayerTurn();

    }
);


/* =====================================================
   END PLAYER TURN
===================================================== */

function endPlayerTurn() {

    if (fightFinished) return;


    fightPlayerTurn =
        false;


    /*
       STAMINA RECOVERY
    */

    fightPlayerStamina =
        Math.min(
            100,
            fightPlayerStamina + 8
        );


    updateFightUI();


    setFightButtons(false);


    setTimeout(
        enemyTurn,
        650
    );

}


/* =====================================================
   MONSTER AI
===================================================== */

function chooseEnemyAction() {

    /*
       MONSTER 1
       AGGRESSIVE
    */

    if (fightEnemyNumber === 1) {

        /* Player spam attack */

        if (
            fightAttackStreak >= 2 &&
            Math.random() < 0.55
        ) {

            return "heavy";

        }


        /* Player HP low */

        if (
            fightPlayerHP <= 35 &&
            Math.random() < 0.45
        ) {

            return "heavy";

        }


        if (Math.random() < 0.25) {

            return "heavy";

        }


        return "attack";

    }


    /*
       MONSTER 2
       DEFENSIVE
    */

    if (
        fightEnemyHP <= 45 &&
        Math.random() < 0.45
    ) {

        return "defend";

    }


    /*
       Player menggunakan Heavy / Special
       → monster kadang bertahan
    */

    if (
        (
            fightLastAction === "heavy" ||
            fightLastAction === "special"
        ) &&
        Math.random() < 0.45
    ) {

        return "defend";

    }


    /*
       Player HP rendah
       → monster menyerang
    */

    if (
        fightPlayerHP <= 35 &&
        Math.random() < 0.50
    ) {

        return "heavy";

    }


    /*
       Default
    */

    if (Math.random() < 0.30) {

        return "heavy";

    }


    return "attack";

}


/* =====================================================
   ENEMY TURN
===================================================== */

function enemyTurn() {

    if (fightFinished) return;


    const action =
        chooseEnemyAction();


    setFightStatus(
        "🤖 Monster sedang berpikir..."
    );


    setTimeout(
        () => {

            if (fightFinished) return;


            /*
               MONSTER DEFEND
            */

            if (action === "defend") {

                fightEnemyDefending =
                    true;


                fightPlayerTurn =
                    true;


                /*
                   Cooldown berkurang
                */

                if (
                    fightSpecialCooldown > 0
                ) {

                    fightSpecialCooldown--;

                }


                updateFightUI();


                setFightStatus(
                    "🛡️ Monster bertahan!\n" +
                    "Giliran kamu — " +
                    getStaminaText()
                );


                setFightButtons(true);


                return;

            }


            /*
               MONSTER ATTACK
            */

            let damage = 0;


            if (action === "heavy") {

                /*
                   Monster Heavy punya
                   25% kemungkinan miss
                */

                const hit =
                    Math.random() >= 0.25;


                if (hit) {

                    damage =
                        randomDamage(16, 25);

                } else {

                    damage = 0;

                }

            } else {

                damage =
                    randomDamage(8, 14);

            }


            /*
               PLAYER DEFEND
            */

            if (fightPlayerDefending) {

                damage =
                    Math.floor(
                        damage * 0.35
                    );

                fightPlayerDefending =
                    false;

            }


            fightPlayerHP =
                Math.max(
                    0,
                    fightPlayerHP - damage
                );


            /*
               COOLDOWN
            */

            if (
                fightSpecialCooldown > 0
            ) {

                fightSpecialCooldown--;

            }


            updateFightUI();


            /*
               PLAYER KALAH
            */

            if (fightPlayerHP <= 0) {

                loseFight();

                return;

            }


            fightPlayerTurn =
                true;


            setFightButtons(true);


            if (action === "heavy") {

                if (damage === 0) {

                    setFightStatus(
                        "💨 Monster Heavy Attack miss!\n" +
                        getStaminaText()
                    );

                } else {

                    setFightStatus(
                        `💥 Monster Heavy Attack -${damage} HP\n` +
                        "Giliran kamu!\n" +
                        getStaminaText()
                    );

                }

            } else {

                setFightStatus(
                    `👹 Monster menyerang -${damage} HP\n` +
                    "Giliran kamu!\n" +
                    getStaminaText()
                );

            }


        },
        700
    );

}


/* =====================================================
   WIN
===================================================== */

function winFight() {

    if (fightFinished) return;


    fightFinished =
        true;


    setFightButtons(false);


    /*
       RANDOM REWARD
       1 - 3 COINS
    */

    const reward =
        Math.floor(
            Math.random() * 3
        ) + 1;


    const xpReward = 20;


    coins += reward;


    stats.xp += xpReward;


    updateCoins();

    saveStats();

    updateStats();


    if (fightStatus) {

        fightStatus.textContent =
            `🏆 YOU WIN!\n` +
            `🪙 +${reward} Coins\n` +
            `⭐ +${xpReward} XP`;

    }


    if (fightRestart) {

        fightRestart.classList.remove(
            "hidden"
        );

    }

}


/* =====================================================
   LOSE
===================================================== */

function loseFight() {

    if (fightFinished) return;


    fightFinished =
        true;


    setFightButtons(false);


    if (fightStatus) {

        fightStatus.textContent =
            "💀 YOU LOSE!\n" +
            "🪙 +0 Coins\n" +
            "Coba strategi lain!";

    }


    if (fightRestart) {

        fightRestart.classList.remove(
            "hidden"
        );

    }

}


/* =====================================================
   RESTART
===================================================== */

fightRestart?.addEventListener(
    "click",
    startFight
);

/* =====================================================
   DINO RUN
===================================================== */

const dinoCanvas =
    document.getElementById("dinoCanvas");

const dinoCtx =
    dinoCanvas?.getContext("2d");

const dinoScoreElement =
    document.getElementById("dinoScore");

const dinoBestElement =
    document.getElementById("dinoBest");

const dinoStatus =
    document.getElementById("dinoStatus");

const startDinoButton =
    document.getElementById("startDino");

const jumpDinoButton =
    document.getElementById("jumpDino");


let dinoRunning = false;
let dinoAnimation = null;

let dinoScore = 0;

let dinoSpeed = 5;

let dinoLastTime = 0;

let dinoSpawnTimer = 0;

let dinoObstacles = [];

let dinoPlayer = {
    x: 90,
    y: 215,
    width: 60,
    height: 60,
    velocityY: 0,
    grounded: true
};


let dinoBest =
    Number(
        localStorage.getItem(
            "doyourstreak-dino-best"
        )
    ) || 0;


const dinoObstacleImages = [
    "obstacel1.png",
    "obstacel2.png"
];


const dinoPlayerImage =
    new Image();

const dinoObstacleImage1 =
    new Image();

const dinoObstacleImage2 =
    new Image();


function loadDinoImages() {

    const character =
        getGameCharacter();

    dinoPlayerImage.src =
        character.image;

    dinoObstacleImage1.src =
        "obstacel1.png";

    dinoObstacleImage2.src =
        "obstacel2.png";

}


function startDinoScreen() {

    loadDinoImages();

    if (dinoBestElement) {
        dinoBestElement.textContent =
            dinoBest;
    }

    resetDino();

}


function resetDino() {

    stopDinoGame();

    dinoScore = 0;

    dinoSpeed = 5;

    dinoSpawnTimer = 0;

    dinoObstacles = [];

    dinoPlayer = {
        x: 90,
        y: 215,
        width: 60,
        height: 60,
        velocityY: 0,
        grounded: true
    };

    drawDino();

    if (dinoScoreElement) {
        dinoScoreElement.textContent = "0";
    }

    if (dinoStatus) {
        dinoStatus.textContent =
            "Press SPACE or click to jump!";
    }

}


function startDinoGame() {

    if (dinoRunning) return;

    loadDinoImages();

    dinoRunning = true;

    dinoScore = 0;

    dinoSpeed = 5;

    dinoSpawnTimer = 0;

    dinoObstacles = [];

    dinoPlayer.y = 215;
    dinoPlayer.velocityY = 0;
    dinoPlayer.grounded = true;

    dinoLastTime = performance.now();

    if (dinoStatus) {
        dinoStatus.textContent =
            "RUN!";
    }

    dinoAnimation =
        requestAnimationFrame(
            dinoLoop
        );

}


function stopDinoGame() {

    dinoRunning = false;

    if (dinoAnimation) {

        cancelAnimationFrame(
            dinoAnimation
        );

        dinoAnimation = null;

    }

}


function jumpDino() {

    if (!dinoRunning) {

        startDinoGame();

        return;

    }

    if (!dinoPlayer.grounded) {
        return;
    }

    dinoPlayer.velocityY = -13;

    dinoPlayer.grounded = false;

}


function dinoLoop(time) {

    if (!dinoRunning) return;

    const delta =
        Math.min(
            (time - dinoLastTime) / 16.67,
            2
        );

    dinoLastTime = time;

    updateDino(delta);

    drawDino();

    dinoAnimation =
        requestAnimationFrame(
            dinoLoop
        );

}


function updateDino(delta) {

    /* GRAVITY */

    dinoPlayer.velocityY +=
        0.65 * delta;

    dinoPlayer.y +=
        dinoPlayer.velocityY * delta;


    if (dinoPlayer.y >= 215) {

        dinoPlayer.y = 215;

        dinoPlayer.velocityY = 0;

        dinoPlayer.grounded = true;

    }


    /* SCORE */

    dinoScore +=
        0.08 * delta;

    dinoSpeed +=
        0.001 * delta;


    if (dinoScoreElement) {

        dinoScoreElement.textContent =
            Math.floor(dinoScore);

    }


    /* SPAWN */

    dinoSpawnTimer += delta;

    if (dinoSpawnTimer > 85) {

        spawnDinoObstacle();

        dinoSpawnTimer = 0;

    }


    /* MOVE OBSTACLES */

    dinoObstacles.forEach(
        obstacle => {

            obstacle.x -=
                dinoSpeed * delta;

        }
    );


    dinoObstacles =
        dinoObstacles.filter(
            obstacle =>
                obstacle.x +
                obstacle.width > 0
        );


    /* COLLISION */

    for (const obstacle of dinoObstacles) {

        if (
            checkDinoCollision(
                dinoPlayer,
                obstacle
            )
        ) {

            endDinoGame();

            return;

        }

    }

}


function spawnDinoObstacle() {

    const imageIndex =
        Math.random() < 0.5 ? 0 : 1;

    dinoObstacles.push({

        x: dinoCanvas.width + 20,

        y: 235,

        width: 45,

        height: 45,

        imageIndex

    });

}


function checkDinoCollision(
    player,
    obstacle
) {

    const padding = 10;

    return (
        player.x + padding <
        obstacle.x + obstacle.width - padding &&

        player.x + player.width - padding >
        obstacle.x + padding &&

        player.y + padding <
        obstacle.y + obstacle.height &&

        player.y + player.height >
        obstacle.y + padding
    );

}


function drawDino() {

    if (!dinoCtx || !dinoCanvas) {
        return;
    }

    dinoCtx.clearRect(
        0,
        0,
        dinoCanvas.width,
        dinoCanvas.height
    );


    /* SKY */

    dinoCtx.fillStyle = "#ffffff";

    dinoCtx.fillRect(
        0,
        0,
        dinoCanvas.width,
        dinoCanvas.height
    );


    /* GROUND */

    dinoCtx.fillStyle = "#111111";

    dinoCtx.fillRect(
        0,
        275,
        dinoCanvas.width,
        5
    );


    /* PLAYER */

    if (dinoPlayerImage.complete) {

        dinoCtx.drawImage(
            dinoPlayerImage,
            dinoPlayer.x,
            dinoPlayer.y,
            dinoPlayer.width,
            dinoPlayer.height
        );

    } else {

        dinoCtx.fillStyle = "#111111";

        dinoCtx.fillRect(
            dinoPlayer.x,
            dinoPlayer.y,
            dinoPlayer.width,
            dinoPlayer.height
        );

    }


    /* OBSTACLES */

    dinoObstacles.forEach(
        obstacle => {

            const image =
                obstacle.imageIndex === 0
                    ? dinoObstacleImage1
                    : dinoObstacleImage2;

            if (image.complete) {

                dinoCtx.drawImage(
                    image,
                    obstacle.x,
                    obstacle.y,
                    obstacle.width,
                    obstacle.height
                );

            } else {

                dinoCtx.fillStyle =
                    "#111111";

                dinoCtx.fillRect(
                    obstacle.x,
                    obstacle.y,
                    obstacle.width,
                    obstacle.height
                );

            }

        }
    );

}


function endDinoGame() {

    stopDinoGame();

    const finalScore =
        Math.floor(dinoScore);

    if (finalScore > dinoBest) {

        dinoBest = finalScore;

        localStorage.setItem(
            "doyourstreak-dino-best",
            dinoBest
        );

    }

    if (dinoBestElement) {

        dinoBestElement.textContent =
            dinoBest;

    }


    /* REWARD */

    const reward =
        Math.floor(finalScore / 50);

    if (reward > 0) {

        coins += reward;

        updateCoins();

    }


    if (dinoStatus) {

        dinoStatus.textContent =
            `GAME OVER — Score ${finalScore}` +
            (reward > 0
                ? ` • +${reward} Coins`
                : "");

    }

}


startDinoButton?.addEventListener(
    "click",
    startDinoGame
);


jumpDinoButton?.addEventListener(
    "click",
    jumpDino
);


/* KEYBOARD */

document.addEventListener(
    "keydown",
    event => {

        if (
            event.code === "Space" ||
            event.code === "ArrowUp"
        ) {

            if (
                !dinoGame?.classList.contains(
                    "hidden"
                )
            ) {

                event.preventDefault();

                jumpDino();

            }

        }

    }
);


/* CLICK CANVAS */

dinoCanvas?.addEventListener(
    "click",
    jumpDino
);


/* INITIAL DRAW */

loadDinoImages();

drawDino();

/* =====================================================
   INITIAL SHOP
===================================================== */

updateCoins();

renderCharacterShop();


/* INITIAL COINS */

updateCoins();    showGameMenu();
    stopFlappyGame();
    stopFlappyGame();
    gamePage?.classList.remove("active");
    stopFlappyGame();
    stopFlappyGame();
const openFlappyGame = document.getElementById("openFlappyGame");
const flappyGame = document.getElementById("flappyGame");
const backFromFlappy = document.getElementById("backFromFlappy");
    flappyGame?.classList.add("hidden");
    stopFlappyGame();
        flappyGame?.classList.add("hidden");
        stopFlappyGame();
        flappyGame?.classList.add("hidden");
        stopFlappyGame();
openFlappyGame?.addEventListener("click", () => {
    gameMenu?.classList.add("hidden");
    fightingGame?.classList.add("hidden");
    dinoGame?.classList.add("hidden");
    flappyGame?.classList.remove("hidden");
    stopDinoGame();
    startFlappyScreen();
});

backFromFlappy?.addEventListener("click", showGameMenu);


/* =====================================================
   FLAPPY BIRD MINI GAME
===================================================== */
const flappyCanvas = document.getElementById("flappyCanvas");
const flappyCtx = flappyCanvas?.getContext("2d");
const flappyScoreLabel = document.getElementById("flappyScore");
const flappyBestLabel = document.getElementById("flappyBest");
const flappyStatus = document.getElementById("flappyStatus");
const startFlappyButton = document.getElementById("startFlappy");
const flapFlappyButton = document.getElementById("flapFlappy");
let flappyRunning = false;
let flappyFrameId = null;
let flappyLastTime = 0;
let flappySpawnTimer = 0;
let flappyScore = 0;
let flappyBird = { y: 220, velocity: 0 };
let flappyPipes = [];
const flappyCharacterImage = new Image();
let flappyCharacterSource = "";
let flappyBest = Number(localStorage.getItem("doyourstreak-flappy-best")) || 0;
const FLAPPY_WIDTH = 360;
const FLAPPY_HEIGHT = 480;
const FLAPPY_GROUND = 438;

function startFlappyScreen() {
    if (flappyBestLabel) flappyBestLabel.textContent = flappyBest;
    loadFlappyCharacter();
    resetFlappyGame();
}

function loadFlappyCharacter() {
    const character = getGameCharacter();
    const source = character?.image || "player.png";
    if (source === flappyCharacterSource) return;
    flappyCharacterSource = source;
    flappyCharacterImage.onload = drawFlappyScene;
    flappyCharacterImage.src = source;
}

function resetFlappyGame() {
    stopFlappyGame();
    flappyBird = { y: 220, velocity: 0 };
    flappyPipes = [];
    flappyScore = 0;
    flappySpawnTimer = 0;
    if (flappyScoreLabel) flappyScoreLabel.textContent = "0";
    if (flappyStatus) flappyStatus.textContent = "Tekan MULAI, lalu klik atau tekan spasi untuk terbang.";
    if (startFlappyButton) startFlappyButton.textContent = "MULAI";
    drawFlappyScene();
}

function startFlappyGame() {
    if (!flappyCanvas || !flappyCtx || flappyRunning) return;
    flappyBird = { y: 220, velocity: -350 };
    flappyPipes = [];
    flappyScore = 0;
    flappySpawnTimer = 0;
    flappyLastTime = performance.now();
    flappyRunning = true;
    if (flappyScoreLabel) flappyScoreLabel.textContent = "0";
    if (flappyStatus) flappyStatus.textContent = "Terbang! Hindari pipa.";
    if (startFlappyButton) startFlappyButton.textContent = "ULANGI";
    flappyFrameId = requestAnimationFrame(flappyLoop);
}

function stopFlappyGame() {
    flappyRunning = false;
    if (flappyFrameId !== null) cancelAnimationFrame(flappyFrameId);
    flappyFrameId = null;
}

function flapBird() {
    if (!flappyRunning) {
        startFlappyGame();
        return;
    }
    flappyBird.velocity = -350;
}

function drawFlappyScene() {
    if (!flappyCtx) return;
    const ctx = flappyCtx;
    ctx.clearRect(0, 0, FLAPPY_WIDTH, FLAPPY_HEIGHT);
    ctx.fillStyle = "#9bdcff";
    ctx.fillRect(0, 0, FLAPPY_WIDTH, FLAPPY_HEIGHT);
    ctx.fillStyle = "rgba(255,255,255,.8)";
    [[55, 85], [245, 130], [155, 45]].forEach(([x, y]) => {
        ctx.fillRect(x, y, 46, 12);
        ctx.fillRect(x + 10, y - 8, 20, 10);
    });
    flappyPipes.forEach(pipe => {
        ctx.fillStyle = "#28a745";
        ctx.fillRect(pipe.x, 0, 54, pipe.top);
        ctx.fillRect(pipe.x - 5, pipe.top - 18, 64, 18);
        const bottomY = pipe.top + pipe.gap;
        ctx.fillRect(pipe.x, bottomY, 54, FLAPPY_GROUND - bottomY);
        ctx.fillRect(pipe.x - 5, bottomY, 64, 18);
        ctx.fillStyle = "#16752e";
        ctx.fillRect(pipe.x + 7, 0, 5, Math.max(0, pipe.top - 18));
        ctx.fillRect(pipe.x + 7, bottomY + 18, 5, Math.max(0, FLAPPY_GROUND - bottomY - 18));
    });
    ctx.fillStyle = "#78c850";
    ctx.fillRect(0, FLAPPY_GROUND, FLAPPY_WIDTH, 12);
    ctx.fillStyle = "#d7b56d";
    ctx.fillRect(0, FLAPPY_GROUND + 12, FLAPPY_WIDTH, FLAPPY_HEIGHT - FLAPPY_GROUND - 12);
    if (flappyCharacterImage.complete && flappyCharacterImage.naturalWidth > 0) {
        const maxSize = 38;
        const scale = Math.min(
            maxSize / flappyCharacterImage.naturalWidth,
            maxSize / flappyCharacterImage.naturalHeight
        );
        const width = flappyCharacterImage.naturalWidth * scale;
        const height = flappyCharacterImage.naturalHeight * scale;
        ctx.save();
        ctx.translate(85, flappyBird.y + 18);
        ctx.rotate(Math.max(-0.35, Math.min(0.65, flappyBird.velocity / 700)));
        ctx.drawImage(flappyCharacterImage, -width / 2, -height / 2, width, height);
        ctx.restore();
    } else {
        // Keep a visible fallback if the selected character image cannot load.
        ctx.fillStyle = "#ffd43b";
        ctx.fillRect(70, flappyBird.y + 6, 30, 24);
        ctx.fillStyle = "#f29d24";
        ctx.fillRect(95, flappyBird.y + 14, 12, 8);
        ctx.fillStyle = "#fff";
        ctx.fillRect(88, flappyBird.y + 10, 8, 8);
        ctx.fillStyle = "#111";
        ctx.fillRect(92, flappyBird.y + 12, 3, 3);
    }
    if (!flappyRunning) {
        ctx.fillStyle = "rgba(0,0,0,.45)";
        ctx.fillRect(28, 185, 304, 86);
        ctx.fillStyle = "#fff";
        ctx.textAlign = "center";
        ctx.font = "bold 22px sans-serif";
        ctx.fillText("FLAPPY STREAK", 180, 220);
        ctx.font = "14px sans-serif";
        ctx.fillText("Klik / spasi untuk terbang", 180, 246);
    }
}

function flappyLoop(timestamp) {
    if (!flappyRunning) return;
    const dt = Math.min((timestamp - flappyLastTime) / 1000, 0.035);
    flappyLastTime = timestamp;
    flappyBird.velocity += 1050 * dt;
    flappyBird.y += flappyBird.velocity * dt;
    flappySpawnTimer += dt;
    if (flappySpawnTimer >= 1.45) {
        flappySpawnTimer = 0;
        flappyPipes.push({ x: FLAPPY_WIDTH, top: 55 + Math.random() * 215, gap: 148, passed: false });
    }
    flappyPipes.forEach(pipe => { pipe.x -= 155 * dt; });
    flappyPipes = flappyPipes.filter(pipe => pipe.x > -65);
    const birdBox = { left: 66, right: 104, top: flappyBird.y, bottom: flappyBird.y + 36 };
    let collided = flappyBird.y < 0 || flappyBird.y + 36 >= FLAPPY_GROUND;
    flappyPipes.forEach(pipe => {
        const overlapsX = birdBox.right > pipe.x && birdBox.left < pipe.x + 54;
        if (overlapsX && (birdBox.top < pipe.top || birdBox.bottom > pipe.top + pipe.gap)) collided = true;
        if (!pipe.passed && pipe.x + 54 < birdBox.left) {
            pipe.passed = true;
            flappyScore += 1;
            if (flappyScoreLabel) flappyScoreLabel.textContent = flappyScore;
        }
    });
    drawFlappyScene();
    if (collided) {
        stopFlappyGame();
        if (flappyStatus) flappyStatus.textContent = `Game over! Skor kamu ${flappyScore}.`;
        if (flappyScore > flappyBest) {
            flappyBest = flappyScore;
            localStorage.setItem("doyourstreak-flappy-best", String(flappyBest));
            if (flappyBestLabel) flappyBestLabel.textContent = flappyBest;
        }
        if (startFlappyButton) startFlappyButton.textContent = "MAIN LAGI";
        return;
    }
    flappyFrameId = requestAnimationFrame(flappyLoop);
}

startFlappyButton?.addEventListener("click", startFlappyGame);
flapFlappyButton?.addEventListener("click", flapBird);
flappyCanvas?.addEventListener("pointerdown", event => { event.preventDefault(); flapBird(); });
document.addEventListener("keydown", event => {
    if (event.code !== "Space" || flappyGame?.classList.contains("hidden")) return;
    event.preventDefault();
    flapBird();
});


