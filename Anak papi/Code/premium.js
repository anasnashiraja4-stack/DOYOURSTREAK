/* =========================================
   DOYOURSTREAK PREMIUM DEMO
========================================= */

const premiumModal = document.getElementById("premiumModal");
const premiumOpenButton = document.getElementById("premiumOpenButton");
const premiumCloseButton = document.getElementById("premiumCloseButton");
const premiumDemoButton = document.getElementById("premiumDemoButton");
const premiumStatusText = document.getElementById("premiumStatusText");

const premiumCharactersPanel = document.getElementById(
    "premiumCharactersPanel"
);

const premiumStatisticsPanel = document.getElementById(
    "premiumStatisticsPanel"
);

const premiumCharacterGrid = document.getElementById(
    "premiumCharacterGrid"
);

const premiumStatisticsContent = document.getElementById(
    "premiumStatisticsContent"
);

const PREMIUM_DEMO_KEY = "doyourstreak-premium-demo";

const priorityChartColors = {
    High: "#222222",
    Normal: "#777777",
    Low: "#d4d4d4"
};

function hasPremiumDemo() {
    return localStorage.getItem(PREMIUM_DEMO_KEY) === "true";
}


/* =========================================
   OPEN / CLOSE MODAL
========================================= */

premiumOpenButton?.addEventListener("click", () => {
    premiumModal.classList.remove("hidden");
    renderPremiumCharacterGrid();
    renderPriorityStatistics();
    updatePremiumStatus();
});

premiumCloseButton?.addEventListener("click", () => {
    premiumModal.classList.add("hidden");
});

premiumModal?.addEventListener("click", event => {
    if (event.target === premiumModal) {
        premiumModal.classList.add("hidden");
    }
});

document.addEventListener("keydown", event => {
    if (event.key === "Escape" && premiumModal) {
        premiumModal.classList.add("hidden");
    }
});


/* =========================================
   PREMIUM TABS
========================================= */

document.querySelectorAll("[data-premium-tab]").forEach(button => {
    button.addEventListener("click", () => {
        const tab = button.dataset.premiumTab;

        document.querySelectorAll("[data-premium-tab]").forEach(tabButton => {
            tabButton.classList.toggle(
                "active",
                tabButton === button
            );
        });

        premiumCharactersPanel.classList.toggle(
            "hidden",
            tab !== "characters"
        );

        premiumStatisticsPanel.classList.toggle(
            "hidden",
            tab !== "statistics"
        );

        if (tab === "statistics") {
            renderPriorityStatistics();
        }
    });
});


/* =========================================
   ACTIVATE DEMO
========================================= */

premiumDemoButton?.addEventListener("click", () => {
    localStorage.setItem(PREMIUM_DEMO_KEY, "true");

    updatePremiumStatus();
    renderPremiumCharacterGrid();
    renderPriorityStatistics();

    if (typeof renderCharacterShop === "function") {
        renderCharacterShop();
    }

    premiumDemoButton.textContent = "PREMIUM DEMO ACTIVE ✓";
});


function updatePremiumStatus() {
    const active = hasPremiumDemo();

    if (premiumStatusText) {
        premiumStatusText.textContent = active
            ? "Premium Demo is active. All demo features are unlocked!"
            : "Premium Demo is currently locked.";
    }

    if (premiumDemoButton) {
        premiumDemoButton.textContent = active
            ? "PREMIUM DEMO ACTIVE ✓"
            : "ACTIVATE PREMIUM DEMO";
    }
}


/* =========================================
   PREMIUM CHARACTER GALLERY
========================================= */

function renderPremiumCharacterGrid() {
    if (!premiumCharacterGrid) return;

    premiumCharacterGrid.innerHTML = "";

    const premiumCharacters = characters.filter(
        character => character.premium
    );

    premiumCharacters.forEach(character => {
        const unlocked = hasPremiumDemo();

        const card = document.createElement("article");
        card.className = "premium-character-item";

        const image = document.createElement("img");
        image.src = character.image;
        image.alt = character.name;
        image.loading = "lazy";

        image.addEventListener("error", () => {
            image.style.display = "none";
        });

        const name = document.createElement("h4");
        name.textContent = character.name;

        const selectButton = document.createElement("button");
        selectButton.type = "button";

        selectButton.textContent = unlocked
            ? "SELECT"
            : "LOCKED 🔒";

        selectButton.disabled = !unlocked;

        selectButton.addEventListener("click", () => {
            if (!hasPremiumDemo()) return;

            const characterIndex = characters.findIndex(
                item => item.id === character.id
            );

            if (characterIndex < 0) return;

            currentCharacter = characterIndex;

            if (typeof updateCharacter === "function") {
                updateCharacter();
            }

            premiumModal.classList.add("hidden");
        });

        card.append(image, name, selectButton);
        premiumCharacterGrid.appendChild(card);
    });
}


/* =========================================
   PRIORITY STATISTICS
   Based on the current saved habit list
========================================= */

function renderPriorityStatistics() {
    if (!premiumStatisticsContent) return;

    if (!hasPremiumDemo()) {
        premiumStatisticsContent.innerHTML = `
            <div class="premium-empty-stats">
                <h3>🔒 Premium Statistics</h3>
                <p>
                    Activate Premium Demo to view your habit
                    completion and priority charts.
                </p>
            </div>
        `;
        return;
    }

    const priorities = ["High", "Normal", "Low"];

    const priorityData = priorities.map(priority => {
        const group = habits.filter(
            habit => habit.priority === priority
        );

        const completed = group.filter(
            habit => habit.completed
        ).length;

        return {
            name: priority,
            total: group.length,
            completed,
            pending: group.length - completed,
            percentage: group.length
                ? Math.round(completed / group.length * 100)
                : 0,
            color: priorityChartColors[priority]
        };
    });

    const totalHabits = habits.length;

    const completedHabits = habits.filter(
        habit => habit.completed
    ).length;

    const pendingHabits = totalHabits - completedHabits;

    if (totalHabits === 0) {
        premiumStatisticsContent.innerHTML = `
            <div class="premium-empty-stats">
                <h3>No habits yet!</h3>
                <p>
                    Add some habits first. Your priority charts
                    will appear here automatically.
                </p>
            </div>
        `;
        return;
    }

    /* BAR CHART */

    const bars = priorityData.map(item => `
        <div class="priority-bar-row">
            <div class="priority-bar-label">
                <span>${item.name}</span>
                <span>${item.completed}/${item.total} completed</span>
            </div>

            <div class="priority-bar-track">
                <div
                    class="priority-bar-fill"
                    style="
                        width: ${item.percentage}%;
                        background: ${item.color};
                    "
                ></div>
            </div>

            <small>${item.percentage}% completion</small>
        </div>
    `).join("");

    /* DONUT CHART */

    const circumference = 2 * Math.PI * 42;
    let offset = 0;

    const donutSegments = priorityData.map(item => {
        const portion = item.total / totalHabits;
        const segmentLength = portion * circumference;
        const segmentOffset = offset;

        offset += segmentLength;

        return `
            <circle
                cx="60"
                cy="60"
                r="42"
                fill="none"
                stroke="${item.color}"
                stroke-width="18"
                stroke-dasharray="${segmentLength} ${circumference}"
                stroke-dashoffset="${-segmentOffset}"
                transform="rotate(-90 60 60)"
            ></circle>
        `;
    }).join("");

    const legend = priorityData.map(item => `
        <div class="priority-legend-item">
            <span
                class="priority-legend-dot"
                style="background:${item.color}"
            ></span>

            <span>
                ${item.name}: ${item.total}
                (${Math.round(item.total / totalHabits * 100)}%)
            </span>
        </div>
    `).join("");

    premiumStatisticsContent.innerHTML = `
        <div class="premium-stat-grid">
            <div class="premium-stat-card">
                <small>TOTAL HABITS</small>
                <strong>${totalHabits}</strong>
            </div>

            <div class="premium-stat-card">
                <small>COMPLETED</small>
                <strong>${completedHabits}</strong>
            </div>

            <div class="premium-stat-card">
                <small>PENDING</small>
                <strong>${pendingHabits}</strong>
            </div>
        </div>

        <div class="premium-chart-card">
            <h4>Completion by Priority</h4>
            ${bars}
        </div>

        <div class="premium-chart-card">
            <h4>Habit Distribution</h4>

            <div class="priority-donut-layout">
                <svg
                    class="priority-donut"
                    viewBox="0 0 120 120"
                    role="img"
                    aria-label="Habit distribution by priority"
                >
                    <circle
                        cx="60"
                        cy="60"
                        r="42"
                        fill="none"
                        stroke="#eeeeee"
                        stroke-width="18"
                    ></circle>

                    ${donutSegments}

                    <text
                        x="60"
                        y="57"
                        text-anchor="middle"
                        font-size="11"
                        fill="#111"
                    >TOTAL</text>

                    <text
                        x="60"
                        y="72"
                        text-anchor="middle"
                        font-size="17"
                        font-weight="900"
                        fill="#111"
                    >${totalHabits}</text>
                </svg>

                <div class="priority-legend">
                    ${legend}
                </div>
            </div>
        </div>

        <p style="font-size:12px;color:#666;margin-top:14px">
            Charts reflect your current habit list.
            They do not represent historical weekly or monthly trends.
        </p>
    `;
}


/* =========================================
   INITIAL STATE
========================================= */

updatePremiumStatus();