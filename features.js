/* =====================================================
   DOYOURSTREAK LOCAL FEATURES
   Reminders, streak freeze, quests, achievements, challenges
===================================================== */

(() => {
    "use strict";

    const STATE_PREFIX = "doyourstreak:features:v1:";
    const CHALLENGE_KEY = "doyourstreak:friend-challenges:v1";
    const SNOOZE_OPTIONS = [15, 30, 60];
    let activeProfileId = null;
    let profileSnapshots = [];
    let state = createState();
    let reminderTimer = null;
    let reminderControlsHidden = false;
    let currentQuestPeriod = null;

    function localizedText(source, replacements = {}) {
        const translated = window.translateAppText?.(source) || source;
        return translated.replace(/\{(\w+)\}/g, (match, key) =>
            Object.prototype.hasOwnProperty.call(replacements, key) ? replacements[key] : match
        );
    }

    function createState() {
        return {
            version: 1,
            remindersByHabit: {},
            streakFreeze: { count: 0, lastAccountedDate: null, protectedDates: [] },
            activityByDate: {},
            questClaims: {},
            achievements: { unlocked: {} },
            friends: []
        };
    }

    function localDate(date = new Date()) {
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    }

    function dateFromKey(key) {
        const [year, month, day] = String(key).split("-").map(Number);
        return new Date(year, month - 1, day);
    }

    function isDateKey(value) {
        return typeof value === "string" &&
            /^\d{4}-\d{2}-\d{2}$/.test(value) &&
            localDate(dateFromKey(value)) === value;
    }

    function shiftDate(key, amount) {
        const date = dateFromKey(key);
        date.setDate(date.getDate() + amount);
        return localDate(date);
    }

    function periodFor(period, dateKey = localDate()) {
        if (period === "daily") return dateKey;
        if (period === "monthly") return dateKey.slice(0, 7);
        if (period === "annual") return dateKey.slice(0, 4);
        const monday = dateFromKey(dateKey);
        monday.setDate(monday.getDate() - (monday.getDay() + 6) % 7);
        return localDate(monday);
    }

    function storageKey(profileId = activeProfileId) {
        return `${STATE_PREFIX}${encodeURIComponent(profileId || "guest")}`;
    }

    function setStatus(message) {
        const status = document.getElementById("reminderStatus");
        if (status) status.textContent = message;
    }

    function loadState(profileId) {
        const raw = localStorage.getItem(storageKey(profileId));
        if (!raw) return createState();
        try {
            const saved = JSON.parse(raw);
            const defaults = createState();
            return {
                ...defaults,
                ...saved,
                remindersByHabit: saved.remindersByHabit && typeof saved.remindersByHabit === "object" ? saved.remindersByHabit : {},
                streakFreeze: { ...defaults.streakFreeze, ...(saved.streakFreeze || {}) },
                activityByDate: saved.activityByDate && typeof saved.activityByDate === "object" ? saved.activityByDate : {},
                questClaims: saved.questClaims && typeof saved.questClaims === "object" ? saved.questClaims : {},
                achievements: {
                    unlocked: saved.achievements?.unlocked && typeof saved.achievements.unlocked === "object"
                        ? saved.achievements.unlocked
                        : {}
                },
                friends: Array.isArray(saved.friends) ? saved.friends : []
            };
        } catch (error) {
            console.error("Data fitur lokal rusak; state baru akan digunakan.", error);
            setStatus("Data fitur tidak dapat dibaca. Data baru digunakan; data habit lama tetap aman.");
            return createState();
        }
    }

    function saveState() {
        try {
            localStorage.setItem(storageKey(), JSON.stringify(state));
            return true;
        } catch (error) {
            console.error("Data fitur gagal disimpan.", error);
            setStatus("Data fitur gagal disimpan. Periksa ruang penyimpanan browser.");
            return false;
        }
    }

    function activeDayCount(dateKey) {
        const ids = state.activityByDate[dateKey]?.habitIds;
        return Array.isArray(ids) ? ids.length : 0;
    }

    function countCompletions(period, key) {
        return Object.entries(state.activityByDate).reduce((total, [dateKey, entry]) => {
            return periodFor(period, dateKey) === key && Array.isArray(entry?.habitIds)
                ? total + entry.habitIds.length
                : total;
        }, 0);
    }

    function readChallenges() {
        try {
            const value = JSON.parse(localStorage.getItem(CHALLENGE_KEY) || "[]");
            return Array.isArray(value) ? value : [];
        } catch (error) {
            console.error("Data tantangan teman tidak dapat dibaca.", error);
            return [];
        }
    }

    function writeChallenges(challenges) {
        try {
            localStorage.setItem(CHALLENGE_KEY, JSON.stringify(challenges));
            return true;
        } catch (error) {
            console.error("Tantangan teman gagal disimpan.", error);
            const list = document.getElementById("friendChallengeList");
            if (list) {
                const message = document.createElement("p");
                message.textContent = localizedText("Tantangan gagal disimpan. Periksa ruang penyimpanan browser.");
                list.replaceChildren(message);
            }
            return false;
        }
    }

    function reconcileStreak(stats, today = localDate()) {
        if (!stats || !state.streakFreeze) return;
        const freeze = state.streakFreeze;
        const yesterday = shiftDate(today, -1);
        if (!isDateKey(stats.lastCompletedDate)) stats.lastCompletedDate = null;
        freeze.count = Math.max(0, Math.floor(Number(freeze.count) || 0));
        if (!Array.isArray(freeze.protectedDates)) freeze.protectedDates = [];
        freeze.protectedDates = freeze.protectedDates.filter(isDateKey);
        if (!stats.lastCompletedDate) stats.streak = 0;
        if (!isDateKey(freeze.lastAccountedDate)) {
            freeze.lastAccountedDate = stats.lastCompletedDate || yesterday;
        }

        let cursor = freeze.lastAccountedDate;
        while (cursor < yesterday) {
            cursor = shiftDate(cursor, 1);
            if (cursor <= (stats.lastCompletedDate || "")) {
                freeze.lastAccountedDate = cursor;
                continue;
            }

            if (activeDayCount(cursor) > 0) {
                freeze.lastAccountedDate = cursor;
                continue;
            }

            if (Number(freeze.count) > 0) {
                freeze.count--;
                if (!freeze.protectedDates.includes(cursor)) freeze.protectedDates.push(cursor);
            } else {
                stats.streak = 0;
                freeze.protectedDates = [];
            }
            freeze.lastAccountedDate = cursor;
        }

        if (freeze.lastAccountedDate < yesterday) freeze.lastAccountedDate = yesterday;
        freeze.protectedDates = freeze.protectedDates.slice(-60);
        saveState();
        renderFreezeCount();
    }

    function recordStreakCompletion(stats, today = localDate()) {
        reconcileStreak(stats, today);
        if (stats.lastCompletedDate === today) return;
        stats.streak = Math.max(0, Number(stats.streak) || 0) + 1;
        stats.lastCompletedDate = today;
        state.streakFreeze.lastAccountedDate = today;
        saveState();
        renderFreezeCount();
    }

    function renderFreezeCount() {
        const count = document.getElementById("freezeCount");
        if (count) count.textContent = String(Math.max(0, Number(state.streakFreeze.count) || 0));
    }

    function createReminderControl(habit, card) {
        if (card.querySelector(".habit-reminder-controls")) return;
        const reminder = state.remindersByHabit[String(habit.id)] || {};
        const wrapper = document.createElement("section");
        wrapper.className = "habit-reminder-controls";
        wrapper.setAttribute("aria-label", `Pengingat untuk ${habit.name}`);
        wrapper.hidden = reminderControlsHidden;

        const toggleLabel = document.createElement("label");
        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.className = "habit-reminder-toggle";
        checkbox.checked = Boolean(reminder.enabled);
        checkbox.dataset.habitId = String(habit.id);
        toggleLabel.append(checkbox, document.createTextNode(" Ingatkan saya"));

        const timeLabel = document.createElement("label");
        timeLabel.append(document.createTextNode("Waktu "));
        const time = document.createElement("input");
        time.type = "time";
        time.className = "habit-reminder-time";
        time.value = reminder.time || habit.time || "20:00";
        time.dataset.habitId = String(habit.id);
        time.disabled = !reminder.enabled;
        timeLabel.append(time);

        const snooze = document.createElement("div");
        snooze.className = "habit-snooze-actions";
        for (const minutes of SNOOZE_OPTIONS) {
            const button = document.createElement("button");
            button.type = "button";
            button.dataset.snoozeMinutes = String(minutes);
            button.dataset.habitId = String(habit.id);
            button.disabled = !reminder.enabled;
            button.textContent = minutes === 60 ? "Tunda 1 jam" : `Tunda ${minutes} menit`;
            snooze.append(button);
        }

        wrapper.append(toggleLabel, timeLabel, snooze);
        card.append(wrapper);
    }

    function renderReminders(habits = []) {
        const list = document.getElementById("reminderList");
        if (!list) return;
        list.replaceChildren();
        const cards = new Map([...document.querySelectorAll(".habit-card[data-feature-habit-id]")]
            .map(card => [card.dataset.featureHabitId, card]));
        for (const habit of habits) {
            const card = cards.get(String(habit.id));
            if (card) createReminderControl(habit, card);
        }
        const controls = document.querySelectorAll(".habit-reminder-controls");
        const controlsToggle = document.getElementById("reminderControlsToggle");
        if (controlsToggle) controlsToggle.hidden = controls.length === 0;
        setReminderControlsHidden(reminderControlsHidden);
        const enabledCount = Object.values(state.remindersByHabit).filter(reminder => reminder?.enabled).length;
        list.textContent = enabledCount
            ? `${enabledCount} pengingat aktif. Pengingat hanya berjalan saat aplikasi terbuka.`
            : "Belum ada pengingat aktif.";
        renderFreezeCount();
    }

    function notifyHabit(habit, reminder) {
        const name = String(habit.name || "Habit");
        setStatus(`Pengingat: waktunya ${name}. Pengingat browser hanya tampil selama aplikasi terbuka.`);
        if ("Notification" in window && Notification.permission === "granted") {
            try {
                new Notification("Waktunya habit!", { body: name });
            } catch (error) {
                console.warn("Notifikasi browser tidak dapat ditampilkan.", error);
            }
        }
        reminder.lastFiredAt = Date.now();
        reminder.lastFiredDate = localDate();
        reminder.snoozeUntil = null;
        saveState();
    }

    function checkReminders() {
        const habits = Array.isArray(window.__dysCurrentHabits) ? window.__dysCurrentHabits : [];
        const now = new Date();
        const today = localDate(now);
        for (const habit of habits) {
            const reminder = state.remindersByHabit[String(habit.id)];
            if (!reminder?.enabled || habit.completed) continue;

            const time = reminder.time || habit.time;
            if (!/^\d{2}:\d{2}$/.test(String(time || ""))) continue;
            const [hour, minute] = time.split(":").map(Number);
            const due = new Date(now);
            due.setHours(hour, minute, 0, 0);
            const readyAt = reminder.snoozeUntil
                ? Math.max(due.getTime(), Number(reminder.snoozeUntil))
                : due.getTime();
            if (now.getTime() < readyAt) continue;
            if (reminder.lastFiredDate === today && !reminder.snoozeUntil) continue;
            notifyHabit(habit, reminder);
        }
    }

    async function setReminderEnabled(habitId, enabled, timeInput) {
        const id = String(habitId);
        const reminder = state.remindersByHabit[id] || {};
        if (enabled && "Notification" in window && Notification.permission === "default") {
            try {
                await Notification.requestPermission();
            } catch (error) {
                console.warn("Izin notifikasi browser tidak berhasil diminta.", error);
            }
        }
        state.remindersByHabit[id] = {
            ...reminder,
            enabled,
            time: timeInput?.value || reminder.time || "20:00",
            snoozeUntil: null
        };
        saveState();
        if (timeInput) timeInput.disabled = !enabled;
        const card = timeInput?.closest(".habit-reminder-controls");
        card?.querySelectorAll("[data-snooze-minutes]").forEach(button => { button.disabled = !enabled; });
        setStatus(enabled
            ? "Pengingat aktif. Pengingat hanya dijalankan saat aplikasi terbuka."
            : "Pengingat dinonaktifkan.");
    }

    function handleReminderChange(event) {
        const target = event.target;
        if (target.matches(".habit-reminder-toggle")) {
            setReminderEnabled(target.dataset.habitId, target.checked, target.closest(".habit-reminder-controls")?.querySelector(".habit-reminder-time"));
        } else if (target.matches(".habit-reminder-time")) {
            const reminder = state.remindersByHabit[String(target.dataset.habitId)];
            if (!reminder) return;
            reminder.time = target.value;
            reminder.snoozeUntil = null;
            saveState();
        }
    }

    function handleReminderClick(event) {
        const button = event.target.closest("[data-snooze-minutes]");
        if (!button) return;
        const minutes = Number(button.dataset.snoozeMinutes);
        if (!SNOOZE_OPTIONS.includes(minutes)) return;
        const reminder = state.remindersByHabit[String(button.dataset.habitId)];
        if (!reminder?.enabled) return;
        reminder.snoozeUntil = Date.now() + minutes * 60_000;
        saveState();
        setStatus(`Pengingat ditunda ${minutes === 60 ? "1 jam" : `${minutes} menit`}.`);
    }

    const questDefinitions = [
        { id: "daily-two", period: "daily", title: "Dua Langkah Hari Ini", description: "Selesaikan 2 habit hari ini.", target: 2, xp: 10, coins: 5 },
        { id: "weekly-five", period: "weekly", title: "Konsisten Mingguan", description: "Selesaikan 5 habit minggu ini.", target: 5, xp: 25, coins: 15 },
        { id: "monthly-thirty", period: "monthly", title: "Habit Bertumbuh", description: "Selesaikan 30 habit bulan ini.", target: 30, xp: 80, coins: 50 }
    ];

    const achievementDefinitions = [
        { id: "first-step", title: "First Step", description: "Selesaikan habit pertamamu.", target: 1, progress: stats => Number(stats.habitsCompletedTotal) || 0, xp: 10, coins: 5, freezes: 0 },
        { id: "seven-day-streak", title: "7 Day Streak", description: "Bangun streak selama 7 hari.", target: 7, progress: stats => Number(stats.streak) || 0, xp: 25, coins: 15, freezes: 1 },
        { id: "habit-master", title: "Habit Master", description: "Selesaikan 50 habit.", target: 50, progress: stats => Number(stats.habitsCompletedTotal) || 0, xp: 100, coins: 50, freezes: 0 },
        { id: "xp-collector", title: "XP Collector", description: "Kumpulkan 1.000 XP.", target: 1000, progress: stats => Number(stats.xp) || 0, xp: 50, coins: 50, freezes: 0 }
    ];

    function dispatchReward(reward, source) {
        window.dispatchEvent(new CustomEvent("dys-feature-reward", {
            detail: {
                xp: Math.max(0, Number(reward.xp) || 0),
                coins: Math.max(0, Number(reward.coins) || 0),
                freezes: Math.max(0, Number(reward.freezes) || 0),
                source
            }
        }));
    }

    function unlockAchievements(stats = {}) {
        for (const definition of achievementDefinitions) {
            if (state.achievements.unlocked[definition.id]) continue;
            if (definition.progress(stats) < definition.target) continue;
            state.achievements.unlocked[definition.id] = { unlockedAt: Date.now() };
            dispatchReward(definition, `achievement:${definition.id}`);
            showToast(definition.title);
        }
        saveState();
        renderFreezeCount();
        renderAchievementCards();
    }

    function showToast(title) {
        const toast = document.getElementById("achievementToast");
        const toastTitle = document.getElementById("achievementToastTitle");
        if (!toast || !toastTitle) return;
        toastTitle.textContent = title;
        toast.classList.add("visible");
        window.clearTimeout(showToast.timer);
        showToast.timer = window.setTimeout(() => toast.classList.remove("visible"), 5000);
    }

    function recordHabitCompletion(habitId, stats = {}) {
        const today = localDate();
        const entry = state.activityByDate[today] || { habitIds: [] };
        if (!Array.isArray(entry.habitIds)) entry.habitIds = [];
        const id = String(habitId);
        if (!entry.habitIds.includes(id)) {
            entry.habitIds.push(id);
            state.activityByDate[today] = entry;
        }
        saveState();
        if (currentQuestPeriod) renderQuestList(document.getElementById("questList"), currentQuestPeriod);
        renderChallengeBoard();
        unlockAchievements(stats);
    }

    function renderQuestList(list, period) {
        if (!list || !["daily", "weekly", "monthly"].includes(period)) return;
        currentQuestPeriod = period;
        const definitions = questDefinitions.filter(quest => quest.period === period);
        list.innerHTML = definitions.map(quest => {
            const key = periodFor(period);
            const claimKey = `${period}:${key}:${quest.id}`;
            const progress = Math.min(countCompletions(period, key), quest.target);
            const claimed = Boolean(state.questClaims[claimKey]);
            const ready = progress >= quest.target && !claimed;
            const card = document.createElement("article");
            card.className = "quest-card";

            const copy = document.createElement("div");
            const title = document.createElement("h4");
            title.textContent = localizedText(quest.title);
            const description = document.createElement("p");
            description.textContent = localizedText(quest.description);
            copy.append(title, description);

            const bar = document.createElement("div");
            bar.className = "quest-progress";
            bar.setAttribute("role", "progressbar");
            bar.setAttribute("aria-label", quest.title);
            bar.setAttribute("aria-valuemin", "0");
            bar.setAttribute("aria-valuemax", String(quest.target));
            bar.setAttribute("aria-valuenow", String(progress));
            const fill = document.createElement("span");
            fill.style.width = `${progress / quest.target * 100}%`;
            bar.append(fill);

            const footer = document.createElement("div");
            footer.className = "quest-card-footer";
            const reward = document.createElement("span");
            reward.className = "quest-reward";
            reward.textContent = localizedText(
                "{progress} / {target} · {xp} XP + {coins} koin",
                { progress, target: quest.target, xp: quest.xp, coins: quest.coins }
            );
            const claim = document.createElement("button");
            claim.type = "button";
            claim.className = "quest-claim";
            claim.dataset.featureClaim = claimKey;
            claim.disabled = !ready;
            claim.textContent = localizedText(claimed ? "Sudah diambil ✓" : ready ? "Ambil hadiah" : "Dalam progres");
            footer.append(reward, claim);
            card.append(copy, bar, footer);
            return card.outerHTML;
        }).join("");
    }

    function handleQuestClaim(event) {
        const button = event.target.closest("[data-feature-claim]");
        if (!button) return;
        const claimKey = button.dataset.featureClaim;
        const quest = questDefinitions.find(item => claimKey.endsWith(`:${item.id}`));
        if (!quest || state.questClaims[claimKey]) return;
        const key = periodFor(quest.period);
        if (countCompletions(quest.period, key) < quest.target) return;
        state.questClaims[claimKey] = Date.now();
        saveState();
        dispatchReward(quest, `quest:${quest.id}`);
        renderQuestList(document.getElementById("questList"), quest.period);
    }

    function renderAchievementCards() {
        const list = document.getElementById("achievementList");
        if (!list) return;
        list.querySelectorAll("[data-feature-achievement]").forEach(card => card.remove());
        const stats = window.__dysCurrentStats || {};
        for (const definition of achievementDefinitions) {
            const unlocked = Boolean(state.achievements.unlocked[definition.id]);
            const progress = Math.min(Number(definition.progress(stats)) || 0, definition.target);
            const card = document.createElement("article");
            card.className = `achievement-card${unlocked ? " unlocked" : ""}`;
            card.dataset.featureAchievement = definition.id;
            const copy = document.createElement("div");
            copy.className = "achievement-copy";
            const status = document.createElement("small");
            status.textContent = localizedText(unlocked ? "TERBUKA" : "DALAM PROGRES");
            const title = document.createElement("h2");
            title.textContent = localizedText(definition.title);
            const description = document.createElement("p");
            description.textContent = localizedText(definition.description);
            const bar = document.createElement("div");
            bar.className = "achievement-progress";
            bar.setAttribute("role", "progressbar");
            bar.setAttribute("aria-valuemin", "0");
            bar.setAttribute("aria-valuemax", String(definition.target));
            bar.setAttribute("aria-valuenow", String(progress));
            const fill = document.createElement("span");
            fill.style.width = `${progress / definition.target * 100}%`;
            bar.append(fill);
            const count = document.createElement("small");
            count.className = "achievement-count";
            count.textContent = localizedText(
                "{progress} / {target} · Hadiah: {xp} XP, {coins} koin{freeze}",
                {
                    progress,
                    target: definition.target,
                    xp: definition.xp,
                    coins: definition.coins,
                    freeze: definition.freezes ? localizedText(", 1 Freeze") : ""
                }
            );
            copy.append(status, title, description, bar, count);
            card.append(copy);
            list.append(card);
        }
    }

    function setProfiles(profiles, profileId) {
        profileSnapshots = Array.isArray(profiles) ? profiles : [];
        activeProfileId = profileId || null;
        renderFriendControls();
        renderFriendList();
        renderChallengeBoard();
    }

    function renderFriendControls() {
        const select = document.getElementById("friendProfileSelect");
        if (!select) return;
        const selectedProfile = select.value;
        const options = profileSnapshots.filter(profile => profile.id !== activeProfileId);
        select.replaceChildren();
        if (!options.length) {
            const option = document.createElement("option");
            option.value = "";
            option.textContent = localizedText("Belum ada profil lain");
            select.append(option);
            return;
        }
        for (const profile of options) {
            const option = document.createElement("option");
            option.value = encodeURIComponent(profile.id);
            option.textContent = profile.name || localizedText("Pemain");
            select.append(option);
        }
        if (options.some(profile => encodeURIComponent(profile.id) === selectedProfile)) {
            select.value = selectedProfile;
        }
    }

    function renderFriendList() {
        const list = document.getElementById("friendList");
        if (!list) return;
        list.replaceChildren();
        const friends = state.friends.map(id => profileSnapshots.find(profile => profile.id === id)).filter(Boolean);
        if (!friends.length) {
            const emptyState = document.createElement("p");
            emptyState.textContent = localizedText("Belum ada teman. Tambahkan profil lain dari perangkat ini.");
            list.append(emptyState);
            return;
        }
        const heading = document.createElement("h3");
        heading.textContent = localizedText("Teman lokal");
        list.append(heading);
        for (const friend of friends) {
            const row = document.createElement("p");
            row.textContent = localizedText(
                "{name} · {streak} hari streak · {xp} XP",
                {
                    name: friend.name || localizedText("Pemain"),
                    streak: friend.stats?.streak || 0,
                    xp: friend.stats?.xp || 0
                }
            );
            list.append(row);
        }
    }

    function addFriend() {
        const select = document.getElementById("friendProfileSelect");
        const id = select?.value ? decodeURIComponent(select.value) : "";
        if (!id || id === activeProfileId || state.friends.includes(id)) return;
        state.friends.push(id);
        saveState();
        renderFriendControls();
        renderFriendList();
    }

    function getChallengeProgress(challenge, profileId, through = localDate()) {
        const featureState = loadState(profileId);
        const from = challenge.startsAt;
        const end = challenge.endsAt < through ? challenge.endsAt : through;
        if (end < from) return 0;
        let days = 0;
        for (let day = from; day <= end; day = shiftDate(day, 1)) {
            if (featureState.activityByDate[day]?.habitIds?.length) days++;
        }
        return days;
    }

    function renderChallengeBoard() {
        const list = document.getElementById("friendChallengeList");
        if (!list) return;
        list.replaceChildren();
        const challenges = readChallenges().filter(challenge => challenge.participantIds?.includes(activeProfileId));
        if (!challenges.length) {
            const emptyState = document.createElement("p");
            emptyState.textContent = localizedText("Belum ada tantangan aktif.");
            list.append(emptyState);
            return;
        }
        for (const challenge of challenges) {
            const names = challenge.participantIds.map(id =>
                profileSnapshots.find(profile => profile.id === id)?.name || localizedText("Profil lokal")
            );
            const target = challenge.type === "streak" ? 3 : 5;
            const progress = challenge.participantIds.map(id => getChallengeProgress(challenge, id));
            const finished = localDate() > challenge.endsAt;
            let result = localizedText("Sedang berjalan");
            if (finished) {
                if (progress[0] === progress[1]) result = localizedText("Seri");
                else result = localizedText("{name} menang", { name: names[progress[0] > progress[1] ? 0 : 1] });
            }
            const article = document.createElement("article");
            article.className = "friend-challenge-card";
            const title = document.createElement("h3");
            title.textContent = localizedText(
                challenge.type === "streak" ? "Tantangan streak 3 hari" : "Konsistensi mingguan"
            );
            const summary = document.createElement("p");
            summary.textContent = localizedText(
                "{first} {firstProgress}/{target} hari · {second} {secondProgress}/{target} hari",
                { first: names[0], firstProgress: progress[0], target, second: names[1], secondProgress: progress[1] }
            );
            const status = document.createElement("strong");
            status.textContent = result;
            article.append(title, summary, status);
            list.append(article);
        }
    }

    function createChallenge() {
        const select = document.getElementById("friendProfileSelect");
        const friendId = select?.value ? decodeURIComponent(select.value) : "";
        const type = document.getElementById("challengeTypeSelect")?.value;
        if (!activeProfileId || !friendId || !state.friends.includes(friendId)) {
            const list = document.getElementById("friendChallengeList");
            if (list) {
                const message = document.createElement("p");
                message.textContent = localizedText("Tambahkan profil sebagai teman sebelum membuat tantangan.");
                list.replaceChildren(message);
            }
            return;
        }
        const start = localDate();
        const days = type === "streak" ? 3 : 7;
        const challenge = {
            id: `challenge:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`,
            type: type === "streak" ? "streak" : "weekly",
            participantIds: [activeProfileId, friendId],
            startsAt: start,
            endsAt: shiftDate(start, days - 1),
            createdAt: Date.now()
        };
        const challenges = readChallenges();
        challenges.push(challenge);
        if (writeChallenges(challenges)) renderChallengeBoard();
    }

    function setProfile(profileId, stats = {}) {
        activeProfileId = profileId || null;
        state = loadState(activeProfileId);
        window.__dysCurrentHabits = [];
        reconcileStreak(stats);
        window.__dysCurrentStats = stats;
        setProfiles(profileSnapshots, activeProfileId);
        renderFreezeCount();
        renderAchievementCards();
        scheduleReminderCheck();
        unlockAchievements(stats);
    }

    function refreshTranslations() {
        renderFriendControls();
        renderFriendList();
        renderChallengeBoard();
        if (currentQuestPeriod) renderQuestList(document.getElementById("questList"), currentQuestPeriod);
        renderAchievementCards();
    }

    function addStreakFreezes(amount) {
        const count = Math.floor(Number(amount) || 0);
        if (count <= 0) return;
        state.streakFreeze.count = Math.max(0, Number(state.streakFreeze.count) || 0) + count;
        saveState();
        renderFreezeCount();
    }

    function removeHabitReminder(habitId) {
        delete state.remindersByHabit[String(habitId)];
        saveState();
    }

    function updateCurrentHabits(habits) {
        window.__dysCurrentHabits = Array.isArray(habits) ? habits : [];
        renderReminders(window.__dysCurrentHabits);
    }

    function syncProgress(stats) {
        if (!stats || !activeProfileId) return;
        window.__dysCurrentStats = stats;
        unlockAchievements(stats);
    }

    function scheduleReminderCheck() {
        window.clearInterval(reminderTimer);
        checkReminders();
        reminderTimer = window.setInterval(checkReminders, 30_000);
    }

    function setReminderControlsHidden(hidden) {
        reminderControlsHidden = hidden;
        document.querySelectorAll(".habit-reminder-controls").forEach(control => {
            control.hidden = hidden;
        });
        const toggle = document.getElementById("reminderControlsToggle");
        if (toggle) {
            toggle.setAttribute("aria-pressed", String(hidden));
            toggle.textContent = hidden ? "TAMPILKAN PENGINGAT" : "SEMBUNYIKAN PENGINGAT";
        }
    }

    document.addEventListener("change", handleReminderChange);
    document.addEventListener("click", event => {
        handleReminderClick(event);
        const reminderPanelToggle = event.target.closest("#reminderPanelToggle");
        if (reminderPanelToggle) {
            const content = document.getElementById("reminderPanelContent");
            if (content) {
                const expanded = reminderPanelToggle.getAttribute("aria-expanded") !== "true";
                reminderPanelToggle.setAttribute("aria-expanded", String(expanded));
                reminderPanelToggle.textContent = expanded ? "SEMBUNYIKAN" : "LIHAT PENGATURAN";
                content.hidden = !expanded;
            }
        }
        const reminderControlsToggle = event.target.closest("#reminderControlsToggle");
        if (reminderControlsToggle) setReminderControlsHidden(!reminderControlsHidden);
        if (event.target.closest("#addFriendButton")) addFriend();
        if (event.target.closest("#createFriendChallenge")) createChallenge();
        if (event.target.closest("[data-feature-claim]")) handleQuestClaim(event);
    });
    document.addEventListener("keydown", event => {
        if (event.key.toLowerCase() !== "v" || event.altKey || event.ctrlKey || event.metaKey) return;
        const target = event.target;
        if (target instanceof HTMLElement &&
            (target.isContentEditable || target.matches("input, textarea, select, [role='textbox']"))) return;
        const toggle = document.getElementById("reminderControlsToggle");
        if (!toggle || toggle.hidden) return;
        event.preventDefault();
        setReminderControlsHidden(!reminderControlsHidden);
    });
    document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible") checkReminders();
    });

    window.DYSFeatures = {
        setProfile,
        setProfiles,
        updateCurrentHabits,
        recordHabitCompletion,
        reconcileStreak,
        recordStreakCompletion,
        addStreakFreezes,
        removeHabitReminder,
        syncProgress,
        renderQuestList,
        renderAchievementCards,
        renderChallengeBoard,
        refreshTranslations
    };
})();
