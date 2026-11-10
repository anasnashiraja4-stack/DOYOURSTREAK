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
normalizeStats(stats);
let achievements = JSON.parse(localStorage.getItem("doyourstreak-achievements") || "{}") || {};
let questProgress = JSON.parse(localStorage.getItem("doyourstreak-quests") || "{}") || {};
let localProfiles = JSON.parse(localStorage.getItem("doyourstreak-profiles") || "[]");
let activeProfileId = user?.profileId || null;

const appTranslations = {
    en: {
        "PENCAPAIAN & QUEST": "ACHIEVEMENTS & QUESTS",
        "Pantau progres, raih hadiah, dan bangun rutinitas.": "Track your progress, earn rewards, and build a routine.",
        "PENCAPAIAN": "ACHIEVEMENTS",
        "QUEST HARIAN": "DAILY QUESTS",
        "QUEST MINGGUAN": "WEEKLY QUESTS",
        "QUEST BULANAN": "MONTHLY QUESTS",
        "QUEST TAHUNAN": "ANNUAL QUESTS",
        "PERJALANANMU": "YOUR JOURNEY",
        "Pencapaian": "Achievements",
        "Buka badge dari pencapaian jangka panjang.": "Unlock badges for long-term achievements.",
        "DIULANG HARIAN": "RESETS DAILY",
        "Quest Harian": "Daily Quests",
        "Selesaikan target habit harian.": "Complete your daily habit goal.",
        "DIULANG MINGGUAN": "RESETS WEEKLY",
        "Quest Mingguan": "Weekly Quests",
        "Jaga konsistensi setiap minggu.": "Stay consistent every week.",
        "DIULANG BULANAN": "RESETS MONTHLY",
        "Quest Bulanan": "Monthly Quests",
        "Bangun progres habit jangka panjang.": "Build long-term habit progress.",
        "QUEST LAMA": "ANNUAL QUEST",
        "Quest Tahunan": "Annual Quests",
        "Lanjutkan tantangan tahunan yang tersedia.": "Keep going with the available annual challenges.",
        "PROFIL DI PERANGKAT INI": "PROFILES ON THIS DEVICE",
        "Tantangan Teman": "Friend Challenge",
        "Ajak profil lain berlomba menjaga rutinitas. Hari dihitung jika minimal satu habit selesai.": "Challenge another profile to keep up a routine. A day counts when at least one habit is completed.",
        "Teman adalah profil lokal di browser ini. Progres tidak tersinkron ke perangkat lain.": "Friends are local profiles in this browser. Progress is not synced to other devices.",
        "Profil teman": "Friend profile",
        "Tambah teman": "Add friend",
        "Pilih tantangan": "Choose a challenge",
        "Streak 3 hari · berturut-turut": "3-day streak · consecutive",
        "Mingguan · target 5 dari 7 hari": "Weekly · target 5 of 7 days",
        "Buat tantangan": "Create challenge",
        "Belum ada profil lain": "No other profiles yet",
        "Belum ada teman. Tambahkan profil lain dari perangkat ini.": "No friends yet. Add another profile from this device.",
        "Teman lokal": "Local friends",
        "Pemain": "Player",
        "Profil lokal": "Local profile",
        "{name} · {streak} hari streak · {xp} XP": "{name} · {streak}-day streak · {xp} XP",
        "Belum ada tantangan aktif.": "No active challenges.",
        "Tantangan streak 3 hari": "3-day streak challenge",
        "Konsistensi mingguan": "Weekly consistency",
        "Sedang berjalan": "In progress",
        "Seri": "Tie",
        "{name} menang": "{name} wins",
        "{first} {firstProgress}/{target} hari · {second} {secondProgress}/{target} hari": "{first} {firstProgress}/{target} days · {second} {secondProgress}/{target} days",
        "Tambahkan profil sebagai teman sebelum membuat tantangan.": "Add the profile as a friend before creating a challenge.",
        "Tantangan gagal disimpan. Periksa ruang penyimpanan browser.": "Could not save the challenge. Check your browser storage.",
        "Selesaikan habit pertamamu.": "Complete your first habit.",
        "Bangun streak selama 7 hari.": "Build a 7-day streak.",
        "Selesaikan 50 habit.": "Complete 50 habits.",
        "Kumpulkan 1.000 XP.": "Earn 1,000 XP.",
        "Dua Langkah Hari Ini": "Two Steps Today",
        "Selesaikan 2 habit hari ini.": "Complete 2 habits today.",
        "Konsisten Mingguan": "Weekly Consistency",
        "Selesaikan 5 habit minggu ini.": "Complete 5 habits this week.",
        "Habit Bertumbuh": "Growing Habits",
        "Selesaikan 30 habit bulan ini.": "Complete 30 habits this month.",
        "TERBUKA": "UNLOCKED",
        "DALAM PROGRES": "IN PROGRESS",
        "Hadiah:": "Reward:",
        "koin": "coins",
        "{progress} / {target} · {xp} XP + {coins} koin": "{progress} / {target} · {xp} XP + {coins} coins",
        "{progress} / {target} · Hadiah: {xp} XP, {coins} koin{freeze}": "{progress} / {target} · Reward: {xp} XP, {coins} coins{freeze}",
        "Sudah diambil ✓": "Claimed ✓",
        "Ambil hadiah": "Claim reward",
        "Dalam progres": "In progress"
    },
    id: {
        "Settings": "Pengaturan",
        "More options": "Opsi lainnya",
        "Language": "Bahasa",
        "Choose the language used throughout the app.": "Pilih bahasa yang digunakan di seluruh aplikasi.",
        "Choose language": "Pilih bahasa",
        "Profile": "Profil",
        "Your current player details.": "Detail pemain saat ini.",
        "Profile photo": "Foto profil",
        "Choose a profile photo": "Pilih foto profil",
        "Attach photo": "Tambahkan foto",
        "Remove": "Hapus",
        "Name": "Nama",
        "Player": "Pemain",
        "Streak": "Streak",
        "days": "hari",
        "Password": "Kata sandi",
        "Not saved — secure sign-in is not connected yet.": "Tidak disimpan — login aman belum tersedia.",
        "Close more options": "Tutup opsi lainnya",
        "How to play": "Cara bermain",
        "Log out": "Keluar",
        "PENCAPAIAN": "PENCAPAIAN",
        "QUEST HARIAN": "QUEST HARIAN",
        "QUEST MINGGUAN": "QUEST MINGGUAN",
        "QUEST BULANAN": "QUEST BULANAN",
        "QUEST TAHUNAN": "QUEST TAHUNAN",
        "UNLOCKED": "TERBUKA",
        "IN PROGRESS": "DALAM PROGRES",
        "CLAIMED ✓": "SUDAH DIKLAIM ✓",
        "CLAIM REWARD": "KLAIM HADIAH",
        "WEEKLY QUESTS": "QUEST MINGGUAN",
        "MONTHLY QUESTS": "QUEST BULANAN",
        "ANNUAL QUESTS": "QUEST TAHUNAN",
        "MEDIUM": "SEDANG",
        "HARD": "SULIT",
        "NEARLY IMPOSSIBLE": "HAMPIR MUSTAHIL",
        "Habit Centurion": "Penakluk 100 Kebiasaan",
        "Complete 100 habits.": "Selesaikan 100 kebiasaan.",
        "Fresh Look": "Tampilan Baru",
        "Purchase 3 character skins.": "Beli 3 skin karakter.",
        "Game Regular": "Pemain Rutin",
        "Play 10 games.": "Mainkan 10 game.",
        "Month of Momentum": "Bulan Penuh Momentum",
        "Keep a habit streak for 30 days.": "Jaga streak kebiasaan selama 30 hari.",
        "Routine Finisher": "Penyelesai Rutinitas",
        "Complete every habit on 7 different days.": "Selesaikan semua kebiasaan pada 7 hari yang berbeda.",
        "Thoughtful Tracker": "Pelacak Penuh Perhatian",
        "Write 25 habit notes.": "Tulis 25 catatan kebiasaan.",
        "Arcade Devotee": "Penggemar Arcade",
        "Play 100 games.": "Mainkan 100 game.",
        "Style Collector": "Kolektor Gaya",
        "Purchase 15 character skins.": "Beli 15 skin karakter.",
        "Level 25": "Level 25",
        "Reach level 25.": "Capai level 25.",
        "Long Road Back": "Perjalanan Kembali",
        "Return to your habits after 30 days away.": "Kembali melakukan kebiasaan setelah absen 30 hari.",
        "Daily Task Champion": "Juara Tugas Harian",
        "Claim 100 daily task rewards.": "Klaim 100 hadiah tugas harian.",
        "Habit Momentum": "Momentum Kebiasaan",
        "Complete 15 habits this week.": "Selesaikan 15 kebiasaan minggu ini.",
        "Play Break": "Jeda Bermain",
        "Open and play 5 games this week.": "Buka dan mainkan 5 game minggu ini.",
        "Weekly Reflection": "Refleksi Mingguan",
        "Write 3 habit notes this week.": "Tulis 3 catatan kebiasaan minggu ini.",
        "Habit Machine": "Mesin Kebiasaan",
        "Complete 120 habits this month.": "Selesaikan 120 kebiasaan bulan ini.",
        "Arcade Regular": "Pemain Arcade Rutin",
        "Play 30 games this month.": "Mainkan 30 game bulan ini.",
        "Task Tactician": "Ahli Taktik Tugas",
        "Claim 20 daily task rewards this month.": "Klaim 20 hadiah tugas harian bulan ini.",
        "Legendary Habit Master": "Master Kebiasaan Legendaris",
        "Complete 2,500 habits this year.": "Selesaikan 2.500 kebiasaan tahun ini.",
        "Arcade Legend": "Legenda Arcade",
        "Play 500 games this year.": "Mainkan 500 game tahun ini.",
        "Year of Perfect Focus": "Tahun Fokus Sempurna",
        "Claim 300 daily task rewards this year.": "Klaim 300 hadiah tugas harian tahun ini.",
        "{progress} / {target} · {coins} coins + {xp} XP": "{progress} / {target} · {coins} koin + {xp} XP",
        "First Step": "Langkah Pertama",
        "7 Day Streak": "Streak 7 Hari",
        "Habit Master": "Master Kebiasaan",
        "XP Collector": "Pengumpul XP",
        ", 1 Freeze": ", 1 Freeze",
        "Selesaikan habit pertamamu.": "Selesaikan kebiasaan pertamamu.",
        "Bangun streak selama 7 hari.": "Bangun streak selama 7 hari.",
        "Selesaikan 50 habit.": "Selesaikan 50 kebiasaan.",
        "Kumpulkan 1.000 XP.": "Kumpulkan 1.000 XP.",
        "Dua Langkah Hari Ini": "Dua Langkah Hari Ini",
        "Selesaikan 2 habit hari ini.": "Selesaikan 2 kebiasaan hari ini.",
        "Konsisten Mingguan": "Konsisten Mingguan",
        "Selesaikan 5 habit minggu ini.": "Selesaikan 5 kebiasaan minggu ini.",
        "Habit Bertumbuh": "Kebiasaan Bertumbuh",
        "Selesaikan 30 habit bulan ini.": "Selesaikan 30 kebiasaan bulan ini.",
        "TERBUKA": "TERBUKA",
        "DALAM PROGRES": "DALAM PROGRES",
        "Hadiah:": "Hadiah:",
        "koin": "koin",
        "{progress} / {target} · {xp} XP + {coins} koin": "{progress} / {target} · {xp} XP + {coins} koin",
        "{progress} / {target} · Hadiah: {xp} XP, {coins} koin{freeze}": "{progress} / {target} · Hadiah: {xp} XP, {coins} koin{freeze}",
        "Sudah diambil ✓": "Sudah diambil ✓",
        "Ambil hadiah": "Ambil hadiah",
        "Dalam progres": "Dalam progres",
        "Welcome!": "Selamat datang!",
        "Create your account and start your journey.": "Buat akun dan mulai perjalananmu.",
        "YOUR EMAIL": "EMAIL KAMU",
        "PASSWORD": "KATA SANDI",
        "CONFIRM PASSWORD": "KONFIRMASI KATA SANDI",
        "CONTINUE": "LANJUTKAN",
        "OR CONTINUE WITH": "ATAU LANJUTKAN DENGAN",
        "Enter your email...": "Masukkan email...",
        "At least 8 characters": "Minimal 8 karakter",
        "Enter your password again": "Masukkan ulang kata sandi",
        "Show": "Tampilkan",
        "Hide": "Sembunyikan",
        "CHARACTER NAME": "NAMA KARAKTER",
        "Enter character name...": "Masukkan nama karakter...",
        "START JOURNEY 🚀": "MULAI PERJALANAN 🚀",
        "HOW TO PLAY": "CARA BERMAIN",
        "Log in, add a habit, then mark it done to earn XP and build your streak. Connect ESP in the app.": "Masuk, tambahkan kebiasaan, lalu tandai selesai untuk mendapat XP dan membangun streak. Hubungkan ESP di aplikasi.",
        "PLAYER": "PEMAIN",
        "LOG OUT": "KELUAR",
        "STREAK": "STREAK",
        "TOTAL XP": "TOTAL XP",
        "TODAY": "HARI INI",
        "Tap character": "Ketuk karakter",
        "Press to feed": "Tekan untuk memberi makan",
        "CHARACTER STORE": "TOKO KARAKTER",
        "CHARACTER SHOP": "TOKO KARAKTER",
        "CHARACTER": "KARAKTER",
        "BACKGROUND": "LATAR",
        "BUY": "BELI",
        "HOME": "BERANDA",
        "CATALOG": "KATALOG",
        "HABIT": "KEBIASAAN",
        "EVENTS": "ACARA",
        "GAMES": "PERMAINAN",
        "AWARDS": "PENGHARGAAN",
        "ACHIEVEMENT UNLOCKED": "PENCAPAIAN TERBUKA",
        "SKIP": "LEWATI",
        "NEXT →": "LANJUT →",
        "Anda ingin log out?": "Anda ingin keluar?",
        "Progress Anda akan disimpan sebelum keluar.": "Progres Anda akan disimpan sebelum keluar.",
        "Cancel": "Batal",
        "Save and logout": "Simpan dan keluar",
        "Please enter a valid email.": "Masukkan alamat email yang valid.",
        "Use at least 8 characters for your password.": "Gunakan kata sandi minimal 8 karakter.",
        "Your passwords do not match.": "Kata sandi tidak cocok.",
        "Please give your character a name.": "Beri nama untuk karaktermu.",
        "Name must be at least 2 characters.": "Nama harus minimal 2 karakter.",
        "Add a habit, then mark it done to earn XP and build your streak. Your progress is saved in this browser.": "Tambahkan kebiasaan, lalu tandai selesai untuk mendapat XP dan membangun streak. Progres tersimpan di browser ini.",
        "Secure sign-in is not connected yet. Passwords are checked here but never saved.": "Login aman belum terhubung. Kata sandi hanya diperiksa dan tidak pernah disimpan.",
        "No profiles yet": "Belum ada profil",
        "New player name": "Nama pemain baru",
        "Switch local profile": "Ganti profil lokal",
        "Example: Read a book": "Contoh: Membaca buku",
        "Mark done": "Tandai selesai",
        "Add habit": "Tambah kebiasaan",
        "No habits yet": "Belum ada kebiasaan",
        "All": "Semua",
        "Health": "Kesehatan",
        "Happy": "Bahagia",
        "Finance": "Keuangan",
        "Normal": "Normal",
        "High": "Tinggi",
        "Low": "Rendah",
        "Daily": "Harian",
        "Weekly": "Mingguan",
        "Monthly": "Bulanan",
        "Close": "Tutup",
        "Save": "Simpan",
        "Delete": "Hapus",
        "Edit": "Ubah",
        "Back": "Kembali",
        "Search": "Cari",
        "Loading...": "Memuat...",
        "No events yet.": "Belum ada acara.",
        "Send": "Kirim",
        "Message": "Pesan",
        "Achievements": "Pencapaian",
        "Quests": "Misi",
        "Daily tasks": "Tugas harian",
        "Your habits": "Kebiasaanmu",
        "Add your first habit": "Tambahkan kebiasaan pertamamu",
        "LOGIN": "MASUK",
        "BUILD YOUR STREAK": "BANGUN STREAK-MU",
        "MAKE YOUR": "JADIKAN",
        "HABITS A": "KEBIASAANMU",
        "GAME.": "SEBUAH PERMAINAN.",
        "Build better habits, keep your streak, earn XP and become the best version of yourself.": "Bangun kebiasaan baik, jaga streak, dapatkan XP, dan jadi versi terbaik dirimu.",
        "DOWNLOAD FOR": "UNDUH UNTUK",
        "WINDOWS": "WINDOWS",
        "ANDROID": "ANDROID",
        "Choose Your": "Pilih",
        "Character": "Karakter",
        "This character will accompany you on your streak journey.": "Karakter ini akan menemanimu membangun streak.",
        "SELECTED": "DIPILIH",
        "Name Your": "Beri Nama",
        "Give your character a name before starting your journey.": "Beri nama karaktermu sebelum memulai perjalanan.",
        "MOBILE": "SELULER",
        "DESKTOP": "KOMPUTER",
        "MINIGAME": "MINIGAME",
        "PLAY & EARN": "MAIN & DAPATKAN HADIAH",
        "BATTLE": "BERTARUNG",
        "FIGHTING": "PERTARUNGAN",
        "RUN": "LARI",
        "DINO RUN": "LARI DINO",
        "ARCADE": "ARCADE",
        "FLAPPY BIRD": "FLAPPY BIRD",
        "PRIZE CRANE": "MESIN CAPIT HADIAH",
        "CLAW MACHINE": "MESIN CAPIT",
        "ENDLESS RIDE": "BALAP TANPA AKHIR",
        "CAT BIKE": "SEPEDA KUCING",
        "Ride the sunny farm road and dodge cars and trucks!": "Susuri jalan pertanian dan hindari mobil serta truk!",
        "MONSTER": "MONSTER",
        "Ready to fight!": "Siap bertarung!",
        "ATTACK": "SERANG",
        "SPECIAL": "SPESIAL",
        "HEAVY": "BERAT",
        "DEFEND": "BERTAHAN",
        "RECOVER": "PULIHKAN",
        "PLAY AGAIN": "MAIN LAGI",
        "SCORE:": "SKOR:",
        "BEST:": "TERBAIK:",
        "Press SPACE or click to jump!": "Tekan SPASI atau klik untuk melompat!",
        "START RUN": "MULAI LARI",
        "JUMP": "LOMPAT",
        "MENU GAME": "MENU PERMAINAN",
        "DISTANCE": "JARAK",
        "POINTS EARNED": "POIN DIDAPAT",
        "Four lanes! Swipe or use ← → / A / D. Traffic can come from either end.": "Empat jalur! Geser atau gunakan ← → / A / D. Kendaraan bisa datang dari kedua arah.",
        "LEFT": "KIRI",
        "START RIDE": "MULAI BERKENDARA",
        "RIGHT": "KANAN",
        "DAILY TASK": "TUGAS HARIAN",
        "Loading daily task...": "Memuat tugas harian...",
        "CLAIM": "KLAIM",
        "YOUR ROUTINE": "RUTINITASMU",
        "Today's Habits": "Kebiasaan Hari Ini",
        "+ ADD HABIT": "+ TAMBAH KEBIASAAN",
        "ALL": "SEMUA",
        "HEALTH": "KESEHATAN",
        "HAPPY": "BAHAGIA",
        "FINANCE": "KEUANGAN",
        "HIDE REMINDERS": "SEMBUNYIKAN PENGINGAT",
        "KEEP YOUR ROUTINE": "JAGA RUTINITASMU",
        "Reminders & Streak Freeze": "Pengingat & Pelindung Streak",
        "Freeze:": "Pelindung:",
        "VIEW SETTINGS": "LIHAT PENGATURAN",
        "1 Freeze protects 1 missed calendar day. Missed days are checked when the app opens; if you run out, your streak resets. The first Freeze is earned at a 7-day streak.": "1 pelindung menjaga 1 hari kalender yang terlewat. Hari yang terlewat diperiksa saat aplikasi dibuka; jika habis, streak direset. Pelindung pertama didapat setelah streak 7 hari.",
        "Reminders only run while the app is open.": "Pengingat hanya berjalan saat aplikasi terbuka.",
        "Add your first habit and start your streak.": "Tambahkan kebiasaan pertamamu dan mulai streak.",
        "CREATE HABIT": "BUAT KEBIASAAN",
        "ADD NEW HABIT": "TAMBAH KEBIASAAN BARU",
        "Set up a habit, one step at a time.": "Atur kebiasaanmu, satu langkah demi satu langkah.",
        "What is your habit?": "Apa kebiasaanmu?",
        "Give your habit a name.": "Beri nama untuk kebiasaanmu.",
        "HABIT NAME": "NAMA KEBIASAAN",
        "When will you do it?": "Kapan kamu akan melakukannya?",
        "Choose your habit time.": "Pilih waktu kebiasaanmu.",
        "TIME": "WAKTU",
        "How important is it?": "Seberapa penting?",
        "Choose your priority.": "Pilih tingkat prioritas.",
        "Choose your type": "Pilih jenis kebiasaan",
        "Choose a category, then pick an icon for your habit.": "Pilih kategori, lalu pilih ikon untuk kebiasaanmu.",
        "Set your savings goal and usual daily deposit. Checking this habit adds the deposit automatically.": "Atur target tabungan dan setoran harian. Menyelesaikan kebiasaan ini akan menambahkan setoran secara otomatis.",
        "SAVINGS GOAL (IDR)": "TARGET TABUNGAN (IDR)",
        "ALREADY SAVED (IDR)": "SUDAH DITABUNG (IDR)",
        "DAILY DEPOSIT (IDR)": "SETORAN HARIAN (IDR)",
        "When should it reset?": "Kapan kebiasaan diulang?",
        "Choose how long until this habit can be completed again.": "Pilih jeda sebelum kebiasaan ini bisa diselesaikan lagi.",
        "RESET EVERY": "ULANGI SETIAP",
        "Half day (12 hours)": "Setengah hari (12 jam)",
        "Day(s)": "Hari",
        "Week(s)": "Minggu",
        "Habit setup minimized": "Pengaturan kebiasaan diminimalkan",
        "Click to continue": "Klik untuk melanjutkan",
        "CALENDAR & EVENTS": "KALENDER & ACARA",
        "Plan your next challenge and meet the DOYOURSTREAK community.": "Rencanakan tantangan berikutnya dan temui komunitas DOYOURSTREAK.",
        "THIS DEVICE": "PERANGKAT INI",
        "LOCAL PLAYER RANKING": "PERINGKAT PEMAIN LOKAL",
        "Compare XP and streaks between profiles saved on this device.": "Bandingkan XP dan streak antarprofil di perangkat ini.",
        "ACTIVE PROFILE": "PROFIL AKTIF",
        "ADD A PROFILE": "TAMBAH PROFIL",
        "ADD": "TAMBAH",
        "October 2026": "Oktober 2026",
        "MON": "SEN",
        "TUE": "SEL",
        "WED": "RAB",
        "THU": "KAM",
        "FRI": "JUM",
        "SAT": "SAB",
        "SUN": "MIN",
        "UPCOMING EVENTS": "ACARA MENDATANG",
        "7 DAYS · +50 XP": "7 HARI · +50 XP",
        "STREAK SPRINT": "SPRINT STREAK",
        "Complete one habit each day for seven days and keep your streak alive.": "Selesaikan satu kebiasaan setiap hari selama tujuh hari dan jaga streak-mu.",
        "COMMUNITY · SHOWCASE": "KOMUNITAS · PAMERAN",
        "CHARACTER PARADE": "PARADE KARAKTER",
        "Show off your character in chat and cheer on other streak builders.": "Pamerkan karaktermu di chat dan dukung pemain lain.",
        "WEEKEND · +30 XP": "AKHIR PEKAN · +30 XP",
        "WEEKEND QUEST": "MISI AKHIR PEKAN",
        "Finish three habits this weekend to earn a bonus for your progress.": "Selesaikan tiga kebiasaan akhir pekan ini untuk mendapat bonus.",
        "STREAK CHAT": "CHAT STREAK",
        "Join the community conversation": "Gabung dalam percakapan komunitas",
        "← BACK TO EVENTS": "← KEMBALI KE ACARA",
        "PENCAPAIAN & QUEST": "PENCAPAIAN & MISI",
        "Pantau progres, raih hadiah, dan bangun rutinitas.": "Pantau progres, raih hadiah, dan bangun rutinitas.",
        "PERJALANANMU": "PERJALANANMU",
        "Pencapaian": "Pencapaian",
        "Buka badge dari pencapaian jangka panjang.": "Buka lencana dari pencapaian jangka panjang.",
        "DIULANG HARIAN": "DIULANG HARIAN",
        "Quest Harian": "Misi Harian",
        "Selesaikan target habit harian.": "Selesaikan target kebiasaan harian.",
        "DIULANG MINGGUAN": "DIULANG MINGGUAN",
        "Quest Mingguan": "Misi Mingguan",
        "Jaga konsistensi setiap minggu.": "Jaga konsistensi setiap minggu.",
        "DIULANG BULANAN": "DIULANG BULANAN",
        "Quest Bulanan": "Misi Bulanan",
        "Bangun progres habit jangka panjang.": "Bangun progres kebiasaan jangka panjang.",
        "QUEST LAMA": "MISI TAHUNAN",
        "Quest Tahunan": "Misi Tahunan",
        "Lanjutkan tantangan tahunan yang tersedia.": "Lanjutkan tantangan tahunan yang tersedia.",
        "← BACK TO AWARDS": "← KEMBALI KE PENGHARGAAN",
        "FITUR EKSTRA": "FITUR EKSTRA",
        "Main game menggunakan character kamu sendiri.": "Mainkan game dengan karaktermu sendiri.",
        "Gunakan strategi untuk mengalahkan monster.": "Gunakan strategi untuk mengalahkan monster.",
        "Lompat dan hindari obstacle.": "Melompat dan hindari rintangan.",
        "Terbang melewati pipa dan pecahkan skor terbaik.": "Terbang melewati pipa dan pecahkan rekor.",
        "Tekan MULAI, lalu klik atau tekan spasi untuk terbang.": "Tekan MULAI, lalu klik atau tekan spasi untuk terbang.",
        "Gerakkan capit, lalu tekan CAPIT. Karakter memberi hadiah; anomaly bikin zonk.": "Gerakkan capit, lalu tekan CAPIT. Karakter memberi hadiah; hindari anomali!",
        "Bisa pakai tombol panah kiri/kanan, lalu Spasi untuk capit.": "Gunakan tombol panah kiri/kanan, lalu Spasi untuk mencapit.",
        "Ajak profil lain berlomba menjaga rutinitas. Hari dihitung jika minimal satu habit selesai.": "Ajak profil lain menjaga rutinitas bersama. Hari dihitung jika minimal satu kebiasaan selesai.",
        "Teman adalah profil lokal di browser ini. Progres tidak tersinkron ke perangkat lain.": "Teman adalah profil lokal di browser ini. Progres tidak disinkronkan ke perangkat lain.",
        "Ngobrol sebagai karaktermu dan beri semangat ke pemain lain.": "Ngobrol sebagai karaktermu dan semangati pemain lain.",
        "ESP32 OFFLINE": "ESP32 OFFLINE",
        "LVL": "LEVEL",
        "LVL 1": "LEVEL 1",
        "Capit karakter untuk dapat koin dan EXP. Hindari anomaly!": "Capit karakter untuk mendapat koin dan EXP. Hindari anomali!",
        "ESP32: Disconnected": "ESP32: Terputus",
        "DITANGKAP": "DITANGKAP",
        "KOIN": "KOIN",
        "EXP": "EXP",
        "CAPIT": "CAPIT",
        "SCORE": "SKOR",
        "BEST": "TERBAIK",
        "NEXT": "LANJUT",
        "BACK": "KEMBALI",
        "ADD HABIT": "TAMBAH KEBIASAAN",
        "NOVEMBER LINEUP": "ACARA BULAN NOVEMBER",
        "NOV": "NOV",
        "CHAT AKTIF": "CHAT AKTIF",
        "Karakter": "Karakter",
        "Statistik": "Statistik",
        "Koleksi karakter": "Koleksi karakter",
        "Pilih karakter spesial untuk menemani streak-mu.": "Pilih karakter spesial untuk menemani streak-mu.",
        "Statistik kebiasaan": "Statistik kebiasaan",
        "Lihat jumlah kebiasaan dan progres penyelesaiannya.": "Lihat jumlah kebiasaan dan progres penyelesaiannya.",
        "Demo Premium belum aktif.": "Demo Premium belum aktif.",
        "Aktifkan demo gratis": "Aktifkan demo gratis",
        "Switch app": "Ganti aplikasi"
    },
    zh: {
        "Settings": "设置",
        "More options": "更多选项",
        "Language": "语言",
        "Choose the language used throughout the app.": "选择整个应用使用的语言。",
        "Choose language": "选择语言",
        "Profile": "个人资料",
        "Your current player details.": "当前玩家资料。",
        "Profile photo": "个人资料照片",
        "Choose a profile photo": "选择个人资料照片",
        "Attach photo": "添加照片",
        "Remove": "移除",
        "Name": "姓名",
        "Player": "玩家",
        "Streak": "连续打卡",
        "days": "天",
        "Password": "密码",
        "Not saved — secure sign-in is not connected yet.": "尚未保存——安全登录功能尚未接入。",
        "Close more options": "关闭更多选项",
        "How to play": "玩法说明",
        "Log out": "退出登录",
        "PENCAPAIAN": "成就",
        "QUEST HARIAN": "每日任务",
        "QUEST MINGGUAN": "每周任务",
        "QUEST BULANAN": "每月任务",
        "QUEST TAHUNAN": "年度任务",
        "UNLOCKED": "已解锁",
        "IN PROGRESS": "进行中",
        "CLAIMED ✓": "已领取 ✓",
        "CLAIM REWARD": "领取奖励",
        "WEEKLY QUESTS": "每周任务",
        "MONTHLY QUESTS": "每月任务",
        "ANNUAL QUESTS": "年度任务",
        "MEDIUM": "中等",
        "HARD": "困难",
        "NEARLY IMPOSSIBLE": "几乎不可能",
        "Habit Centurion": "百习惯达人",
        "Complete 100 habits.": "完成 100 个习惯。",
        "Fresh Look": "焕然一新",
        "Purchase 3 character skins.": "购买 3 个角色皮肤。",
        "Game Regular": "游戏常客",
        "Play 10 games.": "玩 10 次游戏。",
        "Month of Momentum": "持续进步月",
        "Keep a habit streak for 30 days.": "连续坚持习惯 30 天。",
        "Routine Finisher": "习惯完成者",
        "Complete every habit on 7 different days.": "在 7 个不同的日期完成所有习惯。",
        "Thoughtful Tracker": "细心记录者",
        "Write 25 habit notes.": "写下 25 条习惯笔记。",
        "Arcade Devotee": "街机爱好者",
        "Play 100 games.": "玩 100 次游戏。",
        "Style Collector": "风格收藏家",
        "Purchase 15 character skins.": "购买 15 个角色皮肤。",
        "Level 25": "25 级",
        "Reach level 25.": "达到 25 级。",
        "Long Road Back": "漫长归途",
        "Return to your habits after 30 days away.": "离开 30 天后重新培养习惯。",
        "Daily Task Champion": "每日任务冠军",
        "Claim 100 daily task rewards.": "领取 100 份每日任务奖励。",
        "Habit Momentum": "习惯动力",
        "Complete 15 habits this week.": "本周完成 15 个习惯。",
        "Play Break": "游戏休息",
        "Open and play 5 games this week.": "本周打开并玩 5 次游戏。",
        "Weekly Reflection": "每周回顾",
        "Write 3 habit notes this week.": "本周写下 3 条习惯笔记。",
        "Habit Machine": "习惯达人",
        "Complete 120 habits this month.": "本月完成 120 个习惯。",
        "Arcade Regular": "街机常客",
        "Play 30 games this month.": "本月玩 30 次游戏。",
        "Task Tactician": "任务谋略家",
        "Claim 20 daily task rewards this month.": "本月领取 20 份每日任务奖励。",
        "Legendary Habit Master": "传奇习惯大师",
        "Complete 2,500 habits this year.": "今年完成 2,500 个习惯。",
        "Arcade Legend": "街机传奇",
        "Play 500 games this year.": "今年玩 500 次游戏。",
        "Year of Perfect Focus": "专注之年",
        "Claim 300 daily task rewards this year.": "今年领取 300 份每日任务奖励。",
        "{progress} / {target} · {coins} coins + {xp} XP": "{progress} / {target} · {coins} 金币 + {xp} XP",
        "First Step": "第一步",
        "7 Day Streak": "连续打卡 7 天",
        "Habit Master": "习惯大师",
        "XP Collector": "XP 收藏家",
        ", 1 Freeze": "，1 次保护",
        "Belum ada profil lain": "暂无其他个人资料",
        "Belum ada teman. Tambahkan profil lain dari perangkat ini.": "暂无好友。请添加此设备上的其他个人资料。",
        "Teman lokal": "本地好友",
        "Pemain": "玩家",
        "Profil lokal": "本地个人资料",
        "{name} · {streak} hari streak · {xp} XP": "{name} · 连续打卡 {streak} 天 · {xp} XP",
        "Belum ada tantangan aktif.": "暂无进行中的挑战。",
        "Tantangan streak 3 hari": "连续打卡 3 天挑战",
        "Konsistensi mingguan": "每周坚持挑战",
        "Sedang berjalan": "进行中",
        "Seri": "平局",
        "{name} menang": "{name} 获胜",
        "{first} {firstProgress}/{target} hari · {second} {secondProgress}/{target} hari": "{first} {firstProgress}/{target} 天 · {second} {secondProgress}/{target} 天",
        "Tambahkan profil sebagai teman sebelum membuat tantangan.": "创建挑战前，请先添加该个人资料为好友。",
        "Tantangan gagal disimpan. Periksa ruang penyimpanan browser.": "无法保存挑战。请检查浏览器存储空间。",
        "Selesaikan habit pertamamu.": "完成你的第一个习惯。",
        "Bangun streak selama 7 hari.": "连续打卡 7 天。",
        "Selesaikan 50 habit.": "完成 50 个习惯。",
        "Kumpulkan 1.000 XP.": "获得 1,000 XP。",
        "Dua Langkah Hari Ini": "今日两步",
        "Selesaikan 2 habit hari ini.": "今天完成 2 个习惯。",
        "Konsisten Mingguan": "每周坚持",
        "Selesaikan 5 habit minggu ini.": "本周完成 5 个习惯。",
        "Habit Bertumbuh": "习惯成长",
        "Selesaikan 30 habit bulan ini.": "本月完成 30 个习惯。",
        "TERBUKA": "已解锁",
        "DALAM PROGRES": "进行中",
        "Hadiah:": "奖励：",
        "koin": "金币",
        "{progress} / {target} · {xp} XP + {coins} koin": "{progress} / {target} · {xp} XP + {coins} 金币",
        "{progress} / {target} · Hadiah: {xp} XP, {coins} koin{freeze}": "{progress} / {target} · 奖励：{xp} XP、{coins} 金币{freeze}",
        "Sudah diambil ✓": "已领取 ✓",
        "Ambil hadiah": "领取奖励",
        "Dalam progres": "进行中",
        "Welcome!": "欢迎！",
        "Create your account and start your journey.": "创建账户，开启你的旅程。",
        "YOUR EMAIL": "你的邮箱",
        "PASSWORD": "密码",
        "CONFIRM PASSWORD": "确认密码",
        "CONTINUE": "继续",
        "OR CONTINUE WITH": "或使用以下方式继续",
        "Enter your email...": "输入邮箱...",
        "At least 8 characters": "至少 8 个字符",
        "Enter your password again": "再次输入密码",
        "Show": "显示",
        "Hide": "隐藏",
        "CHARACTER NAME": "角色名称",
        "Enter character name...": "输入角色名称...",
        "START JOURNEY 🚀": "开始旅程 🚀",
        "HOW TO PLAY": "玩法说明",
        "Log in, add a habit, then mark it done to earn XP and build your streak. Connect ESP in the app.": "登录后添加习惯并标记完成，即可获得 XP 并累积连续记录。在应用中连接 ESP。",
        "PLAYER": "玩家",
        "LOG OUT": "退出",
        "STREAK": "连续记录",
        "TOTAL XP": "总 XP",
        "TODAY": "今天",
        "Tap character": "点击角色",
        "Press to feed": "按键喂食",
        "CHARACTER STORE": "角色商店",
        "CHARACTER SHOP": "角色商店",
        "CHARACTER": "角色",
        "BACKGROUND": "背景",
        "BUY": "购买",
        "HOME": "主页",
        "CATALOG": "目录",
        "HABIT": "习惯",
        "EVENTS": "活动",
        "GAMES": "游戏",
        "AWARDS": "奖励",
        "ACHIEVEMENT UNLOCKED": "成就已解锁",
        "SKIP": "跳过",
        "NEXT →": "下一步 →",
        "Anda ingin log out?": "确定要退出吗？",
        "Progress Anda akan disimpan sebelum keluar.": "退出前将保存你的进度。",
        "Cancel": "取消",
        "Save and logout": "保存并退出",
        "Please enter a valid email.": "请输入有效的邮箱地址。",
        "Use at least 8 characters for your password.": "密码至少需要 8 个字符。",
        "Your passwords do not match.": "两次输入的密码不一致。",
        "Please give your character a name.": "请为角色取个名字。",
        "Name must be at least 2 characters.": "名称至少需要 2 个字符。",
        "Add a habit, then mark it done to earn XP and build your streak. Your progress is saved in this browser.": "添加习惯并标记完成，即可获得 XP 并累积连续记录。进度保存在此浏览器中。",
        "Secure sign-in is not connected yet. Passwords are checked here but never saved.": "安全登录尚未连接。密码只会进行检查，不会被保存。",
        "No profiles yet": "暂无个人资料",
        "New player name": "新玩家名称",
        "Switch local profile": "切换本地个人资料",
        "Example: Read a book": "例如：阅读一本书",
        "Mark done": "标记完成",
        "Add habit": "添加习惯",
        "No habits yet": "暂无习惯",
        "All": "全部",
        "Health": "健康",
        "Happy": "快乐",
        "Finance": "财务",
        "Normal": "普通",
        "High": "高",
        "Low": "低",
        "Daily": "每天",
        "Weekly": "每周",
        "Monthly": "每月",
        "Close": "关闭",
        "Save": "保存",
        "Delete": "删除",
        "Edit": "编辑",
        "Back": "返回",
        "Search": "搜索",
        "Loading...": "加载中...",
        "No events yet.": "暂无活动。",
        "Send": "发送",
        "Message": "消息",
        "Achievements": "成就",
        "Quests": "任务",
        "Daily tasks": "每日任务",
        "Your habits": "你的习惯",
        "Add your first habit": "添加你的第一个习惯",
        "LOGIN": "登录",
        "BUILD YOUR STREAK": "坚持打卡",
        "MAKE YOUR": "让你的",
        "HABITS A": "习惯成为",
        "GAME.": "游戏。",
        "Build better habits, keep your streak, earn XP and become the best version of yourself.": "培养好习惯，坚持打卡，赚取 XP，成为更好的自己。",
        "DOWNLOAD FOR": "下载",
        "WINDOWS": "Windows",
        "ANDROID": "Android",
        "Choose Your": "选择你的",
        "Character": "角色",
        "This character will accompany you on your streak journey.": "这个角色将陪伴你坚持打卡。",
        "SELECTED": "已选择",
        "Name Your": "为你的角色",
        "Give your character a name before starting your journey.": "开始旅程前，为角色取个名字。",
        "MOBILE": "手机",
        "DESKTOP": "电脑",
        "MINIGAME": "迷你游戏",
        "PLAY & EARN": "游玩并赢取奖励",
        "BATTLE": "战斗",
        "FIGHTING": "格斗",
        "RUN": "跑酷",
        "DINO RUN": "恐龙跑酷",
        "ARCADE": "街机",
        "FLAPPY BIRD": "飞翔小鸟",
        "PRIZE CRANE": "幸运抓娃娃",
        "CLAW MACHINE": "抓娃娃机",
        "ENDLESS RIDE": "无尽骑行",
        "CAT BIKE": "猫咪骑行",
        "Ride the sunny farm road and dodge cars and trucks!": "骑行穿越阳光农场，躲避汽车和卡车！",
        "MONSTER": "怪物",
        "Ready to fight!": "准备战斗！",
        "ATTACK": "攻击",
        "SPECIAL": "特殊技能",
        "HEAVY": "重击",
        "DEFEND": "防御",
        "RECOVER": "恢复",
        "PLAY AGAIN": "再玩一次",
        "SCORE:": "分数：",
        "BEST:": "最高分：",
        "Press SPACE or click to jump!": "按空格键或点击跳跃！",
        "START RUN": "开始奔跑",
        "JUMP": "跳跃",
        "MENU GAME": "游戏菜单",
        "DISTANCE": "距离",
        "POINTS EARNED": "获得积分",
        "Four lanes! Swipe or use ← → / A / D. Traffic can come from either end.": "四条车道！滑动或使用 ← → / A / D。车辆会从两端驶来。",
        "LEFT": "左",
        "START RIDE": "开始骑行",
        "RIGHT": "右",
        "DAILY TASK": "每日任务",
        "Loading daily task...": "正在加载每日任务...",
        "CLAIM": "领取",
        "YOUR ROUTINE": "你的日常",
        "Today's Habits": "今日习惯",
        "+ ADD HABIT": "+ 添加习惯",
        "ALL": "全部",
        "HEALTH": "健康",
        "HAPPY": "快乐",
        "FINANCE": "财务",
        "HIDE REMINDERS": "隐藏提醒",
        "KEEP YOUR ROUTINE": "保持你的习惯",
        "Reminders & Streak Freeze": "提醒与连续记录保护",
        "Freeze:": "保护次数：",
        "VIEW SETTINGS": "查看设置",
        "1 Freeze protects 1 missed calendar day. Missed days are checked when the app opens; if you run out, your streak resets. The first Freeze is earned at a 7-day streak.": "1 次保护可弥补 1 天未打卡。应用打开时会检查漏掉的日期；保护次数用完后，连续记录将重置。连续打卡 7 天可获得首次保护。",
        "Reminders only run while the app is open.": "应用打开时才会发送提醒。",
        "Add your first habit and start your streak.": "添加第一个习惯，开始连续打卡。",
        "CREATE HABIT": "创建习惯",
        "ADD NEW HABIT": "添加新习惯",
        "Set up a habit, one step at a time.": "一步一步设置习惯。",
        "What is your habit?": "你要培养什么习惯？",
        "Give your habit a name.": "为习惯命名。",
        "HABIT NAME": "习惯名称",
        "When will you do it?": "你打算什么时候做？",
        "Choose your habit time.": "选择习惯时间。",
        "TIME": "时间",
        "How important is it?": "重要程度如何？",
        "Choose your priority.": "选择优先级。",
        "Choose your type": "选择习惯类型",
        "Choose a category, then pick an icon for your habit.": "选择类别，再为习惯挑选图标。",
        "Set your savings goal and usual daily deposit. Checking this habit adds the deposit automatically.": "设置储蓄目标和每日存款。完成此习惯后将自动添加存款。",
        "SAVINGS GOAL (IDR)": "储蓄目标（印尼盾）",
        "ALREADY SAVED (IDR)": "已存金额（印尼盾）",
        "DAILY DEPOSIT (IDR)": "每日存款（印尼盾）",
        "When should it reset?": "何时重置？",
        "Choose how long until this habit can be completed again.": "选择再次完成此习惯前的间隔时间。",
        "RESET EVERY": "重置周期",
        "Half day (12 hours)": "半天（12 小时）",
        "Day(s)": "天",
        "Week(s)": "周",
        "Habit setup minimized": "习惯设置已最小化",
        "Click to continue": "点击继续",
        "CALENDAR & EVENTS": "日历与活动",
        "Plan your next challenge and meet the DOYOURSTREAK community.": "规划下一个挑战，认识 DOYOURSTREAK 社区。",
        "THIS DEVICE": "此设备",
        "LOCAL PLAYER RANKING": "本地玩家排行",
        "Compare XP and streaks between profiles saved on this device.": "比较此设备上不同个人资料的 XP 和连续记录。",
        "ACTIVE PROFILE": "当前个人资料",
        "ADD A PROFILE": "添加个人资料",
        "ADD": "添加",
        "October 2026": "2026年10月",
        "MON": "周一",
        "TUE": "周二",
        "WED": "周三",
        "THU": "周四",
        "FRI": "周五",
        "SAT": "周六",
        "SUN": "周日",
        "UPCOMING EVENTS": "近期活动",
        "7 DAYS · +50 XP": "7 天 · +50 XP",
        "STREAK SPRINT": "连续打卡冲刺",
        "Complete one habit each day for seven days and keep your streak alive.": "连续七天每天完成一个习惯，保持你的连续记录。",
        "COMMUNITY · SHOWCASE": "社区 · 展示",
        "CHARACTER PARADE": "角色巡游",
        "Show off your character in chat and cheer on other streak builders.": "在聊天中展示你的角色，为其他打卡玩家加油。",
        "WEEKEND · +30 XP": "周末 · +30 XP",
        "WEEKEND QUEST": "周末任务",
        "Finish three habits this weekend to earn a bonus for your progress.": "本周末完成三个习惯，即可获得进度奖励。",
        "STREAK CHAT": "打卡聊天",
        "Join the community conversation": "加入社区讨论",
        "← BACK TO EVENTS": "← 返回活动",
        "PROFIL DI PERANGKAT INI": "此设备上的个人资料",
        "Tantangan Teman": "好友挑战",
        "Ajak profil lain berlomba menjaga rutinitas. Hari dihitung jika minimal satu habit selesai.": "邀请其他个人资料一起坚持习惯。每天至少完成一个习惯才计入进度。",
        "Teman adalah profil lokal di browser ini. Progres tidak tersinkron ke perangkat lain.": "好友是此浏览器中的本地个人资料。进度不会同步到其他设备。",
        "Profil teman": "好友资料",
        "Tambah teman": "添加好友",
        "Pilih tantangan": "选择挑战",
        "Streak 3 hari · berturut-turut": "连续打卡 3 天",
        "Mingguan · target 5 dari 7 hari": "每周 · 目标 7 天中的 5 天",
        "Buat tantangan": "创建挑战",
        "NOVEMBER LINEUP": "十一月活动",
        "NOV": "十一月",
        "PENCAPAIAN & QUEST": "成就与任务",
        "Pantau progres, raih hadiah, dan bangun rutinitas.": "追踪进度、赢取奖励并养成习惯。",
        "PERJALANANMU": "你的旅程",
        "Pencapaian": "成就",
        "Buka badge dari pencapaian jangka panjang.": "解锁长期成就徽章。",
        "DIULANG HARIAN": "每日重置",
        "Quest Harian": "每日任务",
        "Selesaikan target habit harian.": "完成每日习惯目标。",
        "DIULANG MINGGUAN": "每周重置",
        "Quest Mingguan": "每周任务",
        "Jaga konsistensi setiap minggu.": "每周保持坚持。",
        "DIULANG BULANAN": "每月重置",
        "Quest Bulanan": "每月任务",
        "Bangun progres habit jangka panjang.": "逐步养成长期习惯。",
        "QUEST LAMA": "年度任务",
        "Quest Tahunan": "年度任务",
        "Lanjutkan tantangan tahunan yang tersedia.": "继续完成年度挑战。",
        "← BACK TO AWARDS": "← 返回奖励",
        "FITUR EKSTRA": "额外功能",
        "Connect your ESP32 in the app.": "在应用中连接 ESP32。",
        "Google/Gmail sign-in is not enabled yet. Use email to continue.": "Google/Gmail 登录尚未启用。请使用邮箱继续。",
        "Chat aktif": "聊天已开启",
        "Tulis pesan chat": "输入聊天内容",
        "KIRIM": "发送",
        "Pesan tersimpan di perangkat ini.": "消息已保存在此设备上。",
        "Main game menggunakan character kamu sendiri.": "使用你自己的角色进行游戏。",
        "Gunakan strategi untuk mengalahkan monster.": "运用策略击败怪物。",
        "Lompat dan hindari obstacle.": "跳跃并躲避障碍。",
        "Terbang melewati pipa dan pecahkan skor terbaik.": "穿越管道飞行，刷新最高分。",
        "Tekan MULAI, lalu klik atau tekan spasi untuk terbang.": "按下开始，然后点击或按空格键飞行。",
        "Gerakkan capit, lalu tekan CAPIT. Karakter memberi hadiah; anomaly bikin zonk.": "移动抓钩并按下抓取。角色会送出奖励；注意避开异常物！",
        "Bisa pakai tombol panah kiri/kanan, lalu Spasi untuk capit.": "使用左右方向键移动，然后按空格键抓取。",
        "NEXT": "下一步",
        "BACK": "返回",
        "ADD HABIT": "添加习惯",
        "LVL": "等级",
        "LVL 1": "等级 1",
        "ESP32 OFFLINE": "ESP32 离线",
        "Capit karakter untuk dapat koin dan EXP. Hindari anomaly!": "抓取角色可获得金币和经验值。小心异常物！",
        "ESP32: Disconnected": "ESP32：未连接",
        "SKOR": "分数",
        "TERBAIK": "最高分",
        "MULAI": "开始",
        "DITANGKAP": "已抓取",
        "KOIN": "金币",
        "EXP": "经验值",
        "CAPIT": "抓取",
        "MAIN LAGI": "再玩一次",
        "SCORE": "分数",
        "BEST": "最高分",
        "SEMBUNYIKAN PENGINGAT": "隐藏提醒",
        "JAGA RUTINITAS": "保持习惯",
        "Pengingat & Streak Freeze": "提醒与连续记录保护",
        "LIHAT PENGATURAN": "查看设置",
        "1 Freeze melindungi 1 hari kalender yang terlewat. Hari yang terlewat diperiksa saat aplikasi dibuka; jika stok habis, streak direset. Freeze pertama didapat dari pencapaian 7 hari.": "1 次保护可弥补 1 天未打卡。应用打开时会检查漏掉的日期；保护用完后连续记录将重置。连续打卡 7 天可获得首次保护。",
        "Pengingat hanya berjalan saat aplikasi terbuka.": "应用打开时才会发送提醒。",
        "Buka karakter spesial dan lihat progres kebiasaanmu.": "解锁特别角色并查看习惯进度。",
        "Karakter": "角色",
        "Statistik": "统计",
        "Koleksi karakter": "角色收藏",
        "Pilih karakter spesial untuk menemani streak-mu.": "选择特别角色陪伴你连续打卡。",
        "Statistik kebiasaan": "习惯统计",
        "Lihat jumlah kebiasaan dan progres penyelesaiannya.": "查看习惯数量与完成进度。",
        "Demo Premium belum aktif.": "高级版演示尚未启用。",
        "Aktifkan demo gratis": "启用免费演示",
        "Switch app": "切换应用"
    }
};
const supportedLanguages = ["en", "id", "zh"];
function getAppLocale() {
    return { en: "en-US", id: "id-ID", zh: "zh-CN" }[appLanguage];
}
let appLanguage = localStorage.getItem("doyourstreak-language") || "en";
if (!supportedLanguages.includes(appLanguage)) appLanguage = "en";
const originalTextNodes = new WeakMap();
const originalAttributes = new WeakMap();

function translateAppContent(root = document.body) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const textNodes = [];
    if (root.nodeType === Node.TEXT_NODE) textNodes.push(root);
    while (walker.nextNode()) textNodes.push(walker.currentNode);

    textNodes.forEach(node => {
        if (node.parentElement?.closest("#habitList, #playerName, #headerName, #localLeaderboard, #eventChatMessages")) return;
        if (!originalTextNodes.has(node)) originalTextNodes.set(node, node.textContent);
        const source = originalTextNodes.get(node);
        const trimmedSource = source.trim();
        const stepMatch = trimmedSource.match(/^STEP (\d+) OF (\d+)$/i);
        let translated = appTranslations[appLanguage]?.[trimmedSource];
        if (stepMatch && appLanguage !== "en") {
            translated = appLanguage === "id"
                ? `LANGKAH ${stepMatch[1]} DARI ${stepMatch[2]}`
                : `第 ${stepMatch[1]} 步，共 ${stepMatch[2]} 步`;
        }
        if (translated) {
            const leading = source.match(/^\s*/)?.[0] || "";
            const trailing = source.match(/\s*$/)?.[0] || "";
            node.textContent = `${leading}${translated}${trailing}`;
        } else if (node.textContent !== source) {
            node.textContent = source;
        }
    });

    const elements = root.querySelectorAll ? [root, ...root.querySelectorAll("*")] : [];
    elements.forEach(element => {
        ["placeholder", "aria-label", "title"].forEach(attribute => {
            if (!element.hasAttribute?.(attribute)) return;
            let originals = originalAttributes.get(element);
            if (!originals) {
                originals = {};
                originalAttributes.set(element, originals);
            }
            if (!(attribute in originals)) originals[attribute] = element.getAttribute(attribute);
            const source = originals[attribute];
            const translated = appTranslations[appLanguage]?.[source];
            if (translated) element.setAttribute(attribute, translated);
            else if (element.getAttribute(attribute) !== source) element.setAttribute(attribute, source);
        });
    });
}

window.translateAppText = (source, replacements = {}) => {
    const translated = appTranslations[appLanguage]?.[source] || source;
    return translated.replace(/\{(\w+)\}/g, (match, key) =>
        Object.prototype.hasOwnProperty.call(replacements, key) ? replacements[key] : match
    );
};

function setAppLanguage(language) {
    if (!supportedLanguages.includes(language)) return;
    appLanguage = language;
    localStorage.setItem("doyourstreak-language", language);
    document.documentElement.lang = language;
    document.querySelectorAll("[data-language]").forEach(button => {
        button.setAttribute("aria-pressed", String(button.dataset.language === language));
    });
    translateAppContent();
    window.DYSFeatures?.refreshTranslations();
}

document.querySelectorAll("[data-language]").forEach(button => {
    button.addEventListener("click", () => {
        setAppLanguage(button.dataset.language);
        updateHeaderClock();
        renderCalendar();
        renderQuestBoard();
    });
});
setAppLanguage(appLanguage);
new MutationObserver(records => {
    records.forEach(record => record.addedNodes.forEach(node => {
        if (node.nodeType === Node.ELEMENT_NODE || node.nodeType === Node.TEXT_NODE) {
            translateAppContent(node);
        }
    }));
}).observe(document.body, { childList: true, subtree: true });

function normalizeStats(value) {
    value.habitsCompletedTotal = Math.max(0, Number(value.habitsCompletedTotal) || 0);
    return value;
}

let selectedEmoji = "belajaricon.png";
let selectedPriority = "Normal";
let selectedHabitCategory = "health";
let activeHabitCategory = "all";

const habitCategories = {
    health: { label: "Health", icon: "iconhealt.png" },
    happy: { label: "Happy", icon: "iconhappy.png" },
    finance: { label: "Finance", icon: "iconfinance.png" }
};


/* =====================================================
   ELEMENTS
===================================================== */

const loginScreen = document.getElementById("loginScreen");
const appScreen = document.getElementById("appScreen");

const emailInput = document.getElementById("emailInput");
const emailNext = document.getElementById("emailNext");
const loginProviderMessage = document.getElementById("loginProviderMessage");
const passwordInput = document.getElementById("passwordInput");
const passwordConfirmInput = document.getElementById("passwordConfirmInput");
const passwordError = document.getElementById("passwordError");

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
const settingsProfileName = document.getElementById("settingsProfileName");
const settingsProfileStreak = document.getElementById("settingsProfileStreak");
const settingsProfileAvatar = document.getElementById("settingsProfileAvatar");
const settingsProfileInitials = document.getElementById("settingsProfileInitials");
const settingsAvatarInput = document.getElementById("settingsAvatarInput");
const settingsAvatarFeedback = document.getElementById("settingsAvatarFeedback");
const headerClockTime = document.getElementById("headerClockTime");
const headerClockDate = document.getElementById("headerClockDate");

function updateHeaderClock() {
    const now = new Date();
    if (headerClockTime) {
        headerClockTime.textContent = new Intl.DateTimeFormat(getAppLocale(), {
            hour: "2-digit", minute: "2-digit"
        }).format(now);
        headerClockTime.dateTime = now.toISOString();
    }
    if (headerClockDate) {
        headerClockDate.textContent = new Intl.DateTimeFormat(getAppLocale(), {
            weekday: "short", month: "short", day: "numeric", year: "numeric"
        }).format(now);
    }
}

updateHeaderClock();
window.setInterval(updateHeaderClock, 1000);

const habitList = document.getElementById("habitList");
const emptyState = document.getElementById("emptyState");
const habitFilters = document.getElementById("habitFilters");

const addHabitButton = document.getElementById("addHabitButton");
const emptyAddButton = document.getElementById("emptyAddButton");

const habitModal = document.getElementById("habitModal");
const closeModal = document.getElementById("closeModal");
const minimizeModal = document.getElementById("minimizeModal");
const restoreHabitModal = document.getElementById("restoreHabitModal");
const habitProgressFill = document.getElementById("habitProgressFill");

const habitName = document.getElementById("habitName");
const saveHabitButton = document.getElementById("saveHabitButton");
const habitTime = document.getElementById("habitTime");
const habitResetValue = document.getElementById("habitResetValue");
const habitResetUnit = document.getElementById("habitResetUnit");
const financeFields = document.getElementById("financeFields");
const financeTarget = document.getElementById("financeTarget");
const financeInitialSaved = document.getElementById("financeInitialSaved");
const financeDailyDeposit = document.getElementById("financeDailyDeposit");
const habitResetHelp = document.getElementById("habitResetHelp");
const habitResetSettings = document.getElementById("habitResetSettings");

const levelElement = document.getElementById("level");
const xpText = document.getElementById("xpText");
const xpBar = document.getElementById("xpBar");

const streakElement = document.getElementById("streak");
const totalXP = document.getElementById("totalXP");
const completedToday = document.getElementById("completedToday");
const localLeaderboard = document.getElementById("localLeaderboard");
const localProfileSelect = document.getElementById("localProfileSelect");
const localProfileName = document.getElementById("localProfileName");
const createLocalProfileButton = document.getElementById("createLocalProfile");
const eventChatLaunchButton = document.getElementById("eventChatLaunch");
const eventChatBackButton = document.getElementById("eventChatBackButton");
const eventChatMessagesElement = document.getElementById("eventChatMessages");
const eventChatForm = document.getElementById("eventChatForm");
const eventChatInput = document.getElementById("eventChatInput");
const eventChatAvatar = document.getElementById("eventChatAvatar");
const eventChatProfileName = document.getElementById("eventChatProfileName");
const eventChatPremiumBadge = document.getElementById("eventChatPremiumBadge");
const eventChatFeedback = document.getElementById("eventChatFeedback");
let eventChatHistory = JSON.parse(localStorage.getItem("doyourstreak-event-chat") || "[]");
if (!Array.isArray(eventChatHistory)) eventChatHistory = [];


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
        espTopStatus.textContent = connected ? "ESP32 ONLINE" : connecting ? "ESP32 CONNECTING" : "ESP32 OFFLINE";
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

    initializeLocalProfiles();
    window.DYSFeatures?.setProfile(activeProfileId, stats);
    window.DYSFeatures?.setProfiles(localProfiles, activeProfileId);
    window.DYSFeatures?.updateCurrentHabits(habits);
    saveStats();
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

    if (settingsProfileName) settingsProfileName.textContent = displayName;
    if (settingsProfileStreak) settingsProfileStreak.textContent = String(stats.streak || 0);
    updateSettingsProfileAvatar();

    renderHabits();

    updateStats();
    window.DYSFeatures?.updateCurrentHabits(habits);
    window.DYSFeatures?.syncProgress(stats);
    syncWindowsDesktopWidget();

    if (!localStorage.getItem("doyourstreak-tutorial-seen")) {
        window.setTimeout(startWebsiteTutorial, 350);
    }

}

/* =====================================================
   FIRST VISIT TUTORIAL
===================================================== */
const tutorialOverlay = document.getElementById("tutorialOverlay");
const tutorialTitle = document.getElementById("tutorialTitle");
const tutorialDescription = document.getElementById("tutorialDescription");
const tutorialStepCount = document.getElementById("tutorialStepCount");
const tutorialNextButton = document.getElementById("nextTutorialButton");
const tutorialCard = tutorialOverlay?.querySelector(".tutorial-card");
let activeTutorialStep = 0;
let tutorialFocus = null;

const websiteTutorialSteps = [
    {
        page: showCharacterPage,
        target: "#characterPage .character-stats",
        title: "Your streak starts here",
        description: "Your character page shows your current streak, total XP, and how many habits you have completed today."
    },
    {
        page: showExercisePage,
        target: "#addHabitButton",
        title: "Build your daily routine",
        description: "Open Habit and choose + ADD HABIT. Give your habit a name and set it up for your routine."
    },
    {
        page: showExercisePage,
        target: "#habitList",
        title: "Check off what you finish",
        description: "When you complete a habit, mark it done here. Completed habits add XP and help grow your streak."
    },
    {
        page: showInfoPage,
        target: "#infoPage .info-header",
        title: "Look back and keep going",
        description: "Visit Events to review your calendar and updates. Come back each day to keep your routine moving."
    },
    {
        page: showShopPage,
        target: "#shopPage .shop-page-header",
        title: "Spend coins on characters",
        description: "Earn coins as you play, then visit Catalog to explore characters. You can replay this guide anytime with HOW TO PLAY."
    },
    {
        page: showAchievementsPage,
        target: "#achievementsPage .achievements-header",
        title: "Explore your Awards",
        description: "Choose Achievement, Weekly Quests, Monthly Quests, or Annual Quests. Open a section, then use BACK TO AWARDS to return. Quests refresh automatically, and completed quests can be claimed for coins and XP."
    }
];

function renderWebsiteTutorialStep() {
    const step = websiteTutorialSteps[activeTutorialStep];
    if (!step || !tutorialOverlay) return;
    if (tutorialFocus) tutorialFocus.classList.remove("tutorial-focus");
    step.page();
    tutorialFocus = document.querySelector(step.target);
    tutorialFocus?.classList.add("tutorial-focus");
    tutorialStepCount.textContent = `STEP ${activeTutorialStep + 1} OF ${websiteTutorialSteps.length}`;
    tutorialTitle.textContent = step.title;
    tutorialDescription.textContent = step.description;
    tutorialNextButton.textContent = activeTutorialStep === websiteTutorialSteps.length - 1 ? "FINISH ✓" : "NEXT →";
    requestAnimationFrame(positionTutorialCard);
}

function positionTutorialCard() {
    if (!tutorialOverlay) return;
    tutorialOverlay.classList.remove("tutorial-card-top", "tutorial-card-bottom");
    if (
        tutorialOverlay.classList.contains("hidden") ||
        !tutorialCard ||
        !tutorialFocus ||
        !window.matchMedia("(max-width: 600px)").matches
    ) return;

    const targetRect = tutorialFocus.getBoundingClientRect();
    const cardRect = tutorialCard.getBoundingClientRect();
    const overlapsCard =
        targetRect.left < cardRect.right &&
        targetRect.right > cardRect.left &&
        targetRect.top < cardRect.bottom &&
        targetRect.bottom > cardRect.top;
    if (!overlapsCard) return;

    const overlayPadding = 22;
    const spaceAbove = targetRect.top - overlayPadding;
    const spaceBelow = window.innerHeight - targetRect.bottom - overlayPadding;
    const placement = spaceAbove >= cardRect.height || spaceAbove >= spaceBelow
        ? "tutorial-card-top"
        : "tutorial-card-bottom";
    tutorialOverlay.classList.add(placement);
}

function startWebsiteTutorial() {
    if (!tutorialOverlay || appScreen.classList.contains("hidden")) return;
    activeTutorialStep = 0;
    tutorialOverlay.classList.remove("hidden");
    renderWebsiteTutorialStep();
}

function closeWebsiteTutorial() {
    tutorialOverlay?.classList.add("hidden");
    tutorialOverlay?.classList.remove("tutorial-card-top", "tutorial-card-bottom");
    tutorialFocus?.classList.remove("tutorial-focus");
    tutorialFocus = null;
    localStorage.setItem("doyourstreak-tutorial-seen", "true");
}

document.getElementById("openTutorialButton")?.addEventListener("click", startWebsiteTutorial);
document.getElementById("closeTutorialButton")?.addEventListener("click", closeWebsiteTutorial);
document.getElementById("skipTutorialButton")?.addEventListener("click", closeWebsiteTutorial);
window.addEventListener("resize", positionTutorialCard);
tutorialNextButton?.addEventListener("click", () => {
    if (activeTutorialStep >= websiteTutorialSteps.length - 1) {
        closeWebsiteTutorial();
        return;
    }
    activeTutorialStep += 1;
    renderWebsiteTutorialStep();
});
tutorialOverlay?.addEventListener("click", event => {
    if (event.target === tutorialOverlay) closeWebsiteTutorial();
});
document.addEventListener("keydown", event => {
    if (event.key === "Escape" && tutorialOverlay && !tutorialOverlay.classList.contains("hidden")) {
        closeWebsiteTutorial();
    }
});


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

minimizeModal?.addEventListener("click", () => {
    habitModal?.classList.add("minimized");
});

restoreHabitModal?.addEventListener("click", () => {
    habitModal?.classList.remove("minimized");
});

habitModal?.addEventListener("click", (event) => {

    if (event.target === habitModal) {
        closeHabitModal();
    }

});



function openHabitModal() {

    habitModal?.classList.remove("hidden");
    habitModal?.classList.remove("minimized");

    if (habitName) {
        habitName.value = "";
    }

    if (habitTime) {
        habitTime.value = "";
    }
    if (habitResetValue) habitResetValue.value = "1";
    if (habitResetUnit) habitResetUnit.value = "day";
    if (financeTarget) financeTarget.value = "";
    if (financeInitialSaved) financeInitialSaved.value = "0";
    if (financeDailyDeposit) financeDailyDeposit.value = "";

    selectedPriority = "Normal";
    selectedEmoji = "belajaricon.png";
    selectedHabitCategory = "health";
    updateHabitCategorySelection();

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


    showHabitStep(1);
    habitName?.focus();

}

function updateHabitCategorySelection() {
    document.querySelectorAll(".category-option").forEach(button => {
        const selected = button.dataset.category === selectedHabitCategory;
        button.classList.toggle("selected", selected);
        button.setAttribute("aria-pressed", String(selected));
    });

    const isFinance = selectedHabitCategory === "finance";
    financeFields?.classList.toggle("hidden", !isFinance);
    if (habitResetSettings) habitResetSettings.hidden = isFinance;
    if (habitResetHelp) {
        habitResetHelp.textContent = isFinance
            ? "Finance habits reset every day so you can log one deposit daily."
            : "Choose how long until this habit can be completed again.";
    }

    if (isFinance) {
        if (habitResetUnit) habitResetUnit.value = "day";
        if (habitResetValue) habitResetValue.value = "1";
    }
}

document.querySelectorAll(".category-option").forEach(button => {
    button.addEventListener("click", () => {
        selectedHabitCategory = button.dataset.category;
        updateHabitCategorySelection();
    });
});

function getFinanceAmount(input, allowZero = false) {
    const amount = Number(input.value);
    const minimum = allowZero ? 0 : 1;
    if (!Number.isSafeInteger(amount) || amount < minimum) {
        input.setCustomValidity(`Enter a whole amount of at least ${minimum.toLocaleString("id-ID")} IDR.`);
        input.reportValidity();
        input.focus();
        return null;
    }
    input.setCustomValidity("");
    return amount;
}

[financeTarget, financeInitialSaved, financeDailyDeposit].forEach(input => {
    input?.addEventListener("input", () => input.setCustomValidity(""));
});

function setActiveHabitCategory(category) {
    activeHabitCategory = category;
    document.querySelectorAll(".habit-filter").forEach(filter => {
        const selected = filter.dataset.category === activeHabitCategory;
        filter.classList.toggle("active", selected);
        filter.setAttribute("aria-pressed", String(selected));
    });
}

habitFilters?.addEventListener("click", event => {
    const button = event.target.closest(".habit-filter");
    if (!button) return;
    setActiveHabitCategory(button.dataset.category || "all");
    renderHabits();
});

function closeHabitModal() {

    habitModal.classList.add("hidden");
    habitModal.classList.remove("minimized");

}

function getHabitResetDuration(habit) {
    const unit = habit.resetUnit || "day";
    const value = Math.max(1, Number(habit.resetValue) || 1);
    if (unit === "halfday") return 12 * 60 * 60 * 1000;
    if (unit === "week") return value * 7 * 24 * 60 * 60 * 1000;
    return value * 24 * 60 * 60 * 1000;
}

function resetExpiredHabits() {
    const now = Date.now();
    const todayKey = getTodayDate();
    let changed = false;
    habits.forEach(habit => {
        if (!habit?.completed) return;
        // Preserve the prior calendar-day reset behavior for existing habits.
        if (!habit.completedAt) {
            const today = new Date();
            habit.completedAt = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
            changed = true;
        }
        const isDailyReset = (habit.resetUnit || "day") === "day" && Math.max(1, Number(habit.resetValue) || 1) === 1;
        const completedDate = new Date(habit.completedAt);
        const completedDay = `${completedDate.getFullYear()}-${String(completedDate.getMonth() + 1).padStart(2, "0")}-${String(completedDate.getDate()).padStart(2, "0")}`;
        if ((isDailyReset && completedDay !== todayKey) || (!isDailyReset && now - habit.completedAt >= getHabitResetDuration(habit))) {
            habit.completed = false;
            habit.completedAt = null;
            changed = true;
        }
    });
    if (changed) saveHabits();
    return changed;
}

function refreshHabitsForNewDay() {
    if (!resetExpiredHabits()) return;
    renderHabits();
    updateStats();
    renderDailyTask();
}

// Check periodically so an already-open tab also refreshes after local midnight.
window.setInterval(refreshHabitsForNewDay, 30_000);
document.addEventListener("visibilitychange", () => {
    if (!document.hidden) refreshHabitsForNewDay();
});

/* =====================================================
   ADD HABIT STEPS
===================================================== */


const habitSteps = [
    document.getElementById("habitStep1"),
    document.getElementById("habitStep2"),
    document.getElementById("habitStep3"),
    document.getElementById("habitStep4"),
    document.getElementById("habitStep5")
];

function showHabitStep(step) {

    if (habitProgressFill) {
        habitProgressFill.style.width = `${Math.max(1, Math.min(5, step)) * 20}%`;
    }

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

document.getElementById("habitNext4")?.addEventListener("click", () => showHabitStep(5));
document.getElementById("habitBack5")?.addEventListener("click", () => showHabitStep(4));



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

    const resetUnit = habitResetUnit?.value || "day";
    const finalResetUnit = selectedHabitCategory === "finance" ? "day" : resetUnit;
    const resetValue = finalResetUnit === "halfday" ? 1 : selectedHabitCategory === "finance" ? 1 : Math.max(1, Math.min(365, Number(habitResetValue?.value) || 1));


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

    let financeGoal = 0;
    let financeSaved = 0;
    let financeDeposit = 0;
    if (selectedHabitCategory === "finance") {
        financeGoal = getFinanceAmount(financeTarget);
        if (financeGoal === null) return;
        financeSaved = getFinanceAmount(financeInitialSaved, true);
        if (financeSaved === null) return;
        financeDeposit = getFinanceAmount(financeDailyDeposit);
        if (financeDeposit === null) return;
    }

    const newHabit = {

        id: Date.now(),

        name: name,

        time: time,

        priority: selectedPriority,

        emoji: selectedEmoji,
        category: selectedHabitCategory,

        completed: false,

        resetUnit: finalResetUnit,
        resetValue,
        completedAt: null,

        streak: 0,
        ...(selectedHabitCategory === "finance" ? {
            financeGoal,
            financeSaved,
            financeDailyDeposit: financeDeposit,
            financeContributionDate: null
        } : {})

    };


    habits.push(newHabit);
    setActiveHabitCategory("all");

    saveHabits();
    saveStats();

    renderHabits();
    updateStats();
    renderDailyTask();
    closeHabitModal();

}


/* =====================================================
   RENDER HABITS
===================================================== */

function renderHabits() {

    resetExpiredHabits();
    habitList.innerHTML = "";

    // The companion wakes as soon as the user completes one of today's habits.
    const characterMain = document.querySelector("#characterPage .character-main");
    characterMain?.classList.toggle(
        "character-sleeping",
        !habits.some(habit => habit && habit.completed)
    );

    syncWindowsDesktopWidget();


    if (habits.length === 0) {

        habitFilters.hidden = true;
        emptyState.classList.remove("hidden");
        window.DYSFeatures?.updateCurrentHabits(habits);

        return;

    }


    emptyState.classList.add("hidden");
    habitFilters.hidden = false;

    const visibleHabits = activeHabitCategory === "all"
        ? habits
        : habits.filter(habit => getHabitCategory(habit) === activeHabitCategory);

    if (visibleHabits.length === 0) {
        habitList.innerHTML = `<div class="habit-filter-empty">No ${escapeHTML(habitCategories[activeHabitCategory]?.label || "matching")} habits yet.</div>`;
        window.DYSFeatures?.updateCurrentHabits(habits);
        return;
    }

    visibleHabits.forEach(habit => {

        const card =
            document.createElement("div");


        card.className =
            "habit-card";
        card.dataset.featureHabitId = String(habit.id);


        if (habit.completed) {
            card.classList.add("completed");
        }

        const notes = Array.isArray(habit.notes) ? habit.notes : [];
        const category = getHabitCategory(habit);
        const categoryInfo = habitCategories[category];
        if (category === "finance") card.classList.add("finance-habit");
        const recentNotes = notes.slice(-3).reverse();
        const resetLabel = habit.resetUnit === "halfday"
            ? "12 hours"
            : `${Math.max(1, Number(habit.resetValue) || 1)} ${habit.resetUnit === "week" ? "week(s)" : "day(s)"}`;
        const noteHistory = recentNotes.length
            ? recentNotes.map(note => `<div class="habit-note-entry"><strong>${escapeHTML(note.date || "Recent")}${note.mood ? ` · ${escapeHTML(note.mood)}` : ""}${note.duration ? ` · ${Number(note.duration)} min` : ""}</strong>${note.text ? `<p>${escapeHTML(note.text)}</p>` : ""}</div>`).join("")
            : '<p class="habit-note-empty">No notes yet. Add duration, mood, or a quick thought.</p>';
        const financeGoal = Math.max(0, Number(habit.financeGoal) || 0);
        const financeSaved = Math.max(0, Number(habit.financeSaved) || 0);
        const financeDailyDeposit = Math.max(0, Number(habit.financeDailyDeposit) || 0);
        const financeProgress = financeGoal ? Math.min(100, Math.round(financeSaved / financeGoal * 100)) : 0;


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

    <span class="habit-category-label"><img src="${categoryInfo.icon}" alt=""> ${categoryInfo.label}</span>
    <span class="habit-time">
        ⏰ ${habit.time || "--:--"}
    </span>

    <span class="habit-priority ${(
                habit.priority || "Normal"
            ).toLowerCase()}">
        ${habit.priority || "Normal"}
    </span>
    <span class="habit-reset-label">Reset: every ${resetLabel}</span>

               </div>

              ${category === "finance" ? `
              <div class="finance-progress">
                <div><strong>${formatRupiah(financeSaved)}</strong><span> / ${formatRupiah(financeGoal)} saved</span></div>
                <progress value="${financeProgress}" max="100" aria-label="Savings goal progress"></progress>
                <small>Daily deposit: ${formatRupiah(financeDailyDeposit)} · added when checked</small>
              </div>` : ""}

              <div class="habit-streak">
    🔥 ${habit.streak} day streak
              </div>

              <details class="habit-note-details">
                <summary>📝 NOTES (${notes.length})</summary>
                <div class="habit-note-editor">
                  <label>Duration <span>(minutes)</span><input class="habit-note-duration" type="number" min="1" max="600" inputmode="numeric" placeholder="e.g. 20"></label>
                  <label>How did it feel?<select class="habit-note-mood"><option value="">Choose a mood</option><option>Great</option><option>Good</option><option>Okay</option><option>Tough</option></select></label>
                  <label>Quick note<textarea class="habit-note-text" maxlength="240" rows="2" placeholder="What went well? Anything to remember?"></textarea></label>
                  <button class="save-habit-note" data-id="${habit.id}" type="button">SAVE NOTE</button>
                  <div class="habit-note-history">${noteHistory}</div>
                </div>
              </details>

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

        card.querySelector(".save-habit-note")?.addEventListener("click", () => saveHabitNote(habit.id, card));


        habitList.appendChild(card);

    });

    window.DYSFeatures?.updateCurrentHabits(habits);
}

function getHabitCategory(habit) {
    return Object.hasOwn(habitCategories, habit?.category) ? habit.category : "health";
}

function formatRupiah(amount) {
    return new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        maximumFractionDigits: 0
    }).format(amount);
}

function saveHabitNote(id, card) {
    const habit = habits.find(item => item.id === id);
    if (!habit) return;
    const durationValue = card.querySelector(".habit-note-duration")?.value || "";
    const duration = durationValue ? Math.max(1, Math.min(600, Number(durationValue))) : null;
    const mood = card.querySelector(".habit-note-mood")?.value || "";
    const text = card.querySelector(".habit-note-text")?.value.trim() || "";
    if (!duration && !mood && !text) {
        card.querySelector(".habit-note-text")?.focus();
        return;
    }
    const today = new Date();
    const date = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    if (!Array.isArray(habit.notes)) habit.notes = [];
    habit.notes.push({ date, duration, mood, text, createdAt: Date.now() });
    saveHabits();
    achievements.notesWritten = (Number(achievements.notesWritten) || 0) + 1;
    checkAchievements();
    recordQuestProgress("notesAdded");
    renderHabits();
    renderDailyTask();
}

function deleteHabit(id) {
    const habit = habits.find(h => h.id === id);

    if (!habit) return;

    const confirmDelete = confirm(
        `Delete "${habit.name}"?`
    );

    if (!confirmDelete) return;

    window.DYSFeatures?.removeHabitReminder(id);
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

function setupCharacterFeeding() {
    const characterPage = document.getElementById("characterPage");
    const characterMain = characterPage?.querySelector(".character-main");
    const playerImage = document.getElementById("playerImage");
    const fallback = document.getElementById("characterFallback");
    const foodImage = document.getElementById("characterFood");
    const bubble = document.getElementById("characterReactionBubble");
    if (!characterPage || !characterMain || !playerImage || !fallback || !foodImage) return;

    const foods = ["makanan1.png", "makanan2.png", "makanan3.png"];
    const feedingReactions = ["Yay! So tasty!", "Mmm, so delicious!", "That was yummy!"];
    let tapCount = 0;
    let tapResetTimer;
    let feeding = false;
    let bubbleTimer;

    const showBubble = message => {
        if (!bubble) return;
        bubble.textContent = message;
        bubble.classList.remove("hidden");
        window.clearTimeout(bubbleTimer);
        bubbleTimer = window.setTimeout(() => bubble.classList.add("hidden"), 2200);
    };

    const feedCharacter = () => {
        if (!characterPage.classList.contains("active") || feeding) return;
        feeding = true;
        foodImage.src = foods[Math.floor(Math.random() * foods.length)];
        foodImage.classList.remove("hidden");
        characterMain.classList.remove("character-feeding", "character-celebrating");
        playerImage.classList.remove("character-feed-chewing", "character-feed-happy");
        fallback.classList.remove("character-feed-chewing", "character-feed-happy");
        void foodImage.offsetWidth;
        characterMain.classList.add("character-feeding");
        playerImage.classList.add("character-feed-chewing");
        fallback.classList.add("character-feed-chewing");
        window.setTimeout(() => {
            foodImage.classList.add("hidden");
            characterMain.classList.remove("character-feeding");
            playerImage.classList.remove("character-feed-chewing");
            fallback.classList.remove("character-feed-chewing");
            characterMain.classList.add("character-celebrating");
            playerImage.classList.add("character-feed-happy");
            fallback.classList.add("character-feed-happy");
            showBubble(feedingReactions[Math.floor(Math.random() * feedingReactions.length)]);

            window.setTimeout(() => {
                characterMain.classList.remove("character-celebrating");
                playerImage.classList.remove("character-feed-happy");
                fallback.classList.remove("character-feed-happy");
                feeding = false;
            }, 1500);
        }, 700);
    };

    characterMain.addEventListener("pointerup", event => {
        if (event.pointerType !== "touch" || !(playerImage.contains(event.target) || fallback.contains(event.target))) return;
        tapCount += 1;
        window.clearTimeout(tapResetTimer);
        if (tapCount >= 3) {
            tapCount = 0;
            feedCharacter();
            return;
        }
        tapResetTimer = window.setTimeout(() => {
            tapCount = 0;
        }, 700);
    });

    document.addEventListener("keydown", event => {
        const target = event.target;
        const isTyping = target instanceof HTMLElement
            && (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName));
        if (event.code !== "KeyE" || event.repeat || event.ctrlKey || event.metaKey || event.altKey || isTyping) return;
        feedCharacter();
    });
}

setupCharacterFeeding();


function toggleHabit(id) {

    resetExpiredHabits();
    const habit =
        habits.find(item => item.id === id);


    if (!habit) return;


    /* ==============================================
       UNCHECK HABIT
    ============================================== */

    if (habit.completed) {

        habit.completed = false;
        habit.completedAt = null;

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
    habit.completedAt = Date.now();
    if (getHabitCategory(habit) === "finance") {
        const today = getTodayDate();
        if (habit.financeContributionDate !== today) {
            habit.financeSaved = Math.max(0, Number(habit.financeSaved) || 0) + Math.max(0, Number(habit.financeDailyDeposit) || 0);
            habit.financeContributionDate = today;
        }
    }
    stats.habitsCompletedTotal++;
    recordRoutineFinisherDay();
    recordQuestProgress("habitsCompleted");

    habit.streak++;

    stats.xp += 10;

    updateDailyStreak();
    window.DYSFeatures?.recordHabitCompletion(habit.id, stats);
    careForCharacterToday();

    const newLevel =
        Math.floor(stats.xp / 100) + 1;


    saveHabits();

    saveStats();

    checkAchievements();

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
    const today = getTodayDate();
    if (stats.lastCompletedDate === today) return;
    if (stats.lastCompletedDate) {
        const previousDay = new Date(`${stats.lastCompletedDate}T12:00:00`);
        const currentDay = new Date(`${today}T12:00:00`);
        const daysSinceLastCompletion = Math.floor((currentDay - previousDay) / 86400000);
        if (daysSinceLastCompletion >= 30) {
            achievements.comebackDays = Math.max(Number(achievements.comebackDays) || 0, daysSinceLastCompletion);
        }
    }
    if (window.DYSFeatures) {
        window.DYSFeatures.recordStreakCompletion(stats, today);
        return;
    }
    stats.streak = stats.lastCompletedDate === getPreviousDate(today) ? stats.streak + 1 : 1;
    stats.lastCompletedDate = today;
}

function getPreviousDate(dateKey) {
    const date = new Date(`${dateKey}T12:00:00`);
    date.setDate(date.getDate() - 1);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
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

    if (settingsProfileStreak) settingsProfileStreak.textContent = String(stats.streak || 0);


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

    syncWindowsDesktopWidget();

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

    saveActiveProfileSnapshot();

}


function saveStats() {

    localStorage.setItem(
        "doyourstreak-stats",
        JSON.stringify(stats)
    );

    saveActiveProfileSnapshot();
    window.DYSFeatures?.syncProgress(stats);

}

function getProfileIdentity(profile) {
    if (profile?.profileId) return String(profile.profileId);
    const email = String(profile?.email || "").trim().toLowerCase();
    if (email) return `email:${email}`;
    const name = String(profile?.characterName || profile?.name || "player").trim().toLowerCase();
    return `name:${name}`;
}

function saveActiveProfileSnapshot() {
    if (!user) return;
    activeProfileId = activeProfileId || getProfileIdentity(user);
    const name = user.characterName || user.name || "Player";
    const snapshot = {
        id: activeProfileId,
        name,
        email: user.email || "",
        user: { ...user, profileId: activeProfileId },
        stats: { ...stats },
        habits: JSON.parse(JSON.stringify(habits)),
        updatedAt: Date.now()
    };
    const index = localProfiles.findIndex(profile => profile.id === activeProfileId);
    if (index >= 0) localProfiles[index] = snapshot;
    else localProfiles.push(snapshot);
    localStorage.setItem("doyourstreak-profiles", JSON.stringify(localProfiles));
    window.DYSFeatures?.setProfiles(localProfiles, activeProfileId);
    renderLocalLeaderboard();
}

function initializeLocalProfiles() {
    if (user) {
        activeProfileId = getProfileIdentity(user);
        user.profileId = activeProfileId;
        saveActiveProfileSnapshot();
    } else {
        renderLocalLeaderboard();
    }
}

function renderLocalLeaderboard() {
    if (!localProfileSelect || !localLeaderboard) return;
    const profiles = [...localProfiles].sort((a, b) => {
        const xpDifference = (Number(b.stats?.xp) || 0) - (Number(a.stats?.xp) || 0);
        return xpDifference || (Number(b.stats?.streak) || 0) - (Number(a.stats?.streak) || 0);
    });

    localProfileSelect.innerHTML = profiles.length
        ? profiles.map(profile => `<option value="${encodeURIComponent(profile.id)}">${escapeHTML(profile.name || "Player")}</option>`).join("")
        : '<option value="">No profiles yet</option>';
    if (activeProfileId) localProfileSelect.value = encodeURIComponent(activeProfileId);

    if (!profiles.length) {
        localLeaderboard.innerHTML = '<p class="leaderboard-empty">Create a local profile to start your device leaderboard.</p>';
        return;
    }

    localLeaderboard.innerHTML = profiles.map((profile, index) => {
        const xp = Math.max(0, Number(profile.stats?.xp) || 0);
        const level = Math.floor(xp / 100) + 1;
        const streak = Math.max(0, Number(profile.stats?.streak) || 0);
        const done = (profile.habits || []).filter(habit => habit.completed).length;
        const total = (profile.habits || []).length;
        const active = profile.id === activeProfileId ? " is-current-profile" : "";
        return `<article class="leaderboard-row${active}">
            <span class="leaderboard-rank">${index === 0 ? '<img class="leaderboard-lock" src="gembok.png" alt="Champion profile">' : `#${index + 1}`}</span>
            <div class="leaderboard-player"><strong>${escapeHTML(profile.name || "Player")}${profile.id === activeProfileId ? " (YOU)" : ""}</strong><small>LV ${level} · ${streak} day streak · ${done}/${total} today</small></div>
            <strong class="leaderboard-xp">${xp} XP</strong>
        </article>`;
    }).join("");
}

function getEventChatCharacterImage() {
    const playerImage = document.getElementById("playerImage");
    const imageSource = playerImage?.getAttribute("src") || user?.character || "player.png";
    const imageName = imageSource.split(/[\\/]/).pop();
    return imageName && /^[\w-]+\.png$/i.test(imageName) ? imageName : "player.png";
}

function renderEventChat() {
    if (!eventChatMessagesElement) return;

    const characterImage = getEventChatCharacterImage();
    const hasPremium = localStorage.getItem("doyourstreak-premium-demo") === "true";
    if (eventChatAvatar) eventChatAvatar.src = characterImage;
    if (eventChatProfileName) {
        eventChatProfileName.textContent = user?.characterName || user?.name || "PLAYER";
    }
    eventChatPremiumBadge?.classList.toggle("hidden", !hasPremium);

    if (!eventChatHistory.length) {
        eventChatMessagesElement.innerHTML = '<p class="event-chat-empty">Belum ada pesan. Mulai obrolan dan kenalan dengan pemain lain!</p>';
        return;
    }

    eventChatMessagesElement.innerHTML = eventChatHistory.slice(-100).map(message => {
        const name = escapeHTML(String(message?.name || "PLAYER"));
        const text = escapeHTML(String(message?.text || ""));
        const image = message?.characterImage && /^[\w-]+\.png$/i.test(message.characterImage)
            ? message.characterImage
            : "player.png";
        const date = new Date(Number(message?.createdAt));
        const time = Number.isFinite(date.getTime())
            ? date.toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })
            : "";
        const ownMessage = message?.profileId === activeProfileId ? " is-own-message" : "";
        const premiumBadge = message?.isPremium === true
            ? '<small class="event-chat-premium-badge">PRO</small>'
            : "";

        return `<article class="event-chat-message${ownMessage}">
            <img class="event-chat-message-avatar" src="${escapeHTML(image)}" alt="">
            <div class="event-chat-message-body">
                <div class="event-chat-message-meta"><div class="event-chat-author">${premiumBadge}<strong>${name}</strong></div><time>${escapeHTML(time)}</time></div>
                <p>${text}</p>
            </div>
        </article>`;
    }).join("");

    eventChatMessagesElement.scrollTop = eventChatMessagesElement.scrollHeight;
}

eventChatLaunchButton?.addEventListener("click", showEventChatPage);
eventChatBackButton?.addEventListener("click", showInfoPage);
document.addEventListener("keydown", event => {
    if (event.key === "Escape" && eventChatPage?.classList.contains("active")) {
        showInfoPage();
    }
});

eventChatForm?.addEventListener("submit", event => {
    event.preventDefault();
    const text = eventChatInput?.value.trim() || "";
    if (!text) return;

    if (!user) {
        if (eventChatFeedback) eventChatFeedback.textContent = "Buat atau pilih profil terlebih dahulu untuk mengirim pesan.";
        return;
    }

    const profileId = activeProfileId || getProfileIdentity(user);
    eventChatHistory = [...eventChatHistory, {
        profileId,
        name: user.characterName || user.name || "PLAYER",
        characterImage: getEventChatCharacterImage(),
        isPremium: localStorage.getItem("doyourstreak-premium-demo") === "true",
        text: text.slice(0, 280),
        createdAt: Date.now()
    }].slice(-100);
    localStorage.setItem("doyourstreak-event-chat", JSON.stringify(eventChatHistory));
    if (eventChatInput) eventChatInput.value = "";
    if (eventChatFeedback) eventChatFeedback.textContent = "Pesan terkirim dan tersimpan di perangkat ini.";
    renderEventChat();
    eventChatInput?.focus();
});

renderEventChat();

function activateLocalProfile(profileId) {
    if (!profileId || profileId === activeProfileId) return;
    saveActiveProfileSnapshot();
    const profile = localProfiles.find(item => item.id === profileId);
    if (!profile) return;

    activeProfileId = profile.id;
    user = { ...(profile.user || {}), profileId: profile.id, characterName: profile.name || "Player" };
    selectedCharacter = user.character || "player.png";
    const playerImageElement = document.getElementById("playerImage");
    if (playerImageElement) playerImageElement.src = selectedCharacter;
    habits = JSON.parse(JSON.stringify(profile.habits || []));
    stats = { xp: 0, streak: 0, lastCompletedDate: null, ...(profile.stats || {}) };
    normalizeStats(stats);
    window.DYSFeatures?.setProfile(activeProfileId, stats);
    localStorage.setItem("doyourstreak-user", JSON.stringify(user));
    localStorage.setItem("doyourstreak-habits", JSON.stringify(habits));
    localStorage.setItem("doyourstreak-stats", JSON.stringify(stats));
    showApp();
    saveStats();
    renderDailyTask();
    updateCoins();
    renderLocalLeaderboard();
    renderEventChat();
}

localProfileSelect?.addEventListener("change", () => activateLocalProfile(decodeURIComponent(localProfileSelect.value)));
createLocalProfileButton?.addEventListener("click", () => {
    const name = localProfileName?.value.trim() || "";
    if (name.length < 2) {
        localProfileName?.focus();
        return;
    }
    saveActiveProfileSnapshot();
    const id = `local:${Date.now()}:${Math.random().toString(36).slice(2, 7)}`;
    user = { email: "", profileId: id, character: "player.png", characterName: name };
    activeProfileId = id;
    habits = [];
    stats = { xp: 0, streak: 0, lastCompletedDate: null };
    normalizeStats(stats);
    window.DYSFeatures?.setProfile(activeProfileId, stats);
    localStorage.setItem("doyourstreak-user", JSON.stringify(user));
    localStorage.setItem("doyourstreak-habits", JSON.stringify(habits));
    localStorage.setItem("doyourstreak-stats", JSON.stringify(stats));
    localProfileName.value = "";
    saveActiveProfileSnapshot();
    const playerImageElement = document.getElementById("playerImage");
    if (playerImageElement) playerImageElement.src = user.character;
    showApp();
    saveStats();
    updateCoins();
    renderEventChat();
});


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

const logoutButton =
    document.getElementById("logoutButton");

const logoutConfirmOverlay =
    document.getElementById("logoutConfirmOverlay");
const cancelLogoutButton =
    document.getElementById("cancelLogoutButton");
const confirmLogoutButton =
    document.getElementById("confirmLogoutButton");

const loginModal =
    document.getElementById("loginModal");

const closeLogin =
    document.getElementById("closeLogin");

function clearLoginPasswords() {
    if (passwordInput) passwordInput.value = "";
    if (passwordConfirmInput) passwordConfirmInput.value = "";
    if (passwordError) passwordError.textContent = "";
    document.querySelectorAll("[data-password-toggle]").forEach((toggle) => {
        const input = document.getElementById(toggle.dataset.passwordToggle);
        if (input) input.type = "password";
        toggle.textContent = "Show";
        toggle.setAttribute("aria-pressed", "false");
        toggle.setAttribute(
            "aria-label",
            toggle.dataset.passwordToggle === "passwordInput"
                ? "Show password"
                : "Show password confirmation"
        );
    });
}

/* OPEN LOGIN */

loginButton?.addEventListener("click", () => {

    loginModal.classList.remove("hidden");

    showLoginStep(1);

    setTimeout(() => {

        emailInput?.focus();

    }, 100);

});

logoutButton?.addEventListener("click", () => {
    if (!user) return;

    logoutConfirmOverlay?.classList.remove("hidden");
    confirmLogoutButton?.focus();
});

function closeLogoutConfirmation() {
    logoutConfirmOverlay?.classList.add("hidden");
    logoutButton?.focus();
}

cancelLogoutButton?.addEventListener("click", closeLogoutConfirmation);

logoutConfirmOverlay?.addEventListener("click", (event) => {
    if (event.target === logoutConfirmOverlay) closeLogoutConfirmation();
});

document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !logoutConfirmOverlay?.classList.contains("hidden")) {
        closeLogoutConfirmation();
    }
});

confirmLogoutButton?.addEventListener("click", () => {
    if (!user) return;

    saveActiveProfileSnapshot();
    user = null;
    activeProfileId = null;
    habits = [];
    stats = { xp: 0, streak: 0, lastCompletedDate: null };
    normalizeStats(stats);
    window.DYSFeatures?.setProfile(null, stats);
    window.DYSFeatures?.updateCurrentHabits(habits);

    localStorage.removeItem("doyourstreak-user");
    localStorage.setItem("doyourstreak-habits", JSON.stringify(habits));
    localStorage.setItem("doyourstreak-stats", JSON.stringify(stats));
    logoutConfirmOverlay?.classList.add("hidden");
    loginModal?.classList.add("hidden");
    showLogin();
});

/* CLOSE LOGIN */

closeLogin?.addEventListener("click", () => {

    loginModal.classList.add("hidden");
    clearLoginPasswords();

});


/* CLICK OUTSIDE */

loginModal?.addEventListener("click", (event) => {

    if (event.target === loginModal) {

        loginModal.classList.add("hidden");
        clearLoginPasswords();

    }

});


/* ESCAPE */

document.addEventListener("keydown", (event) => {

    if (
        event.key === "Escape" &&
        !loginModal.classList.contains("hidden")
    ) {

        loginModal.classList.add("hidden");
        clearLoginPasswords();

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

    const password = passwordInput?.value || "";
    const passwordConfirmation = passwordConfirmInput?.value || "";

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

    if (password.length < 8) {
        passwordError.textContent = "Use at least 8 characters for your password.";
        passwordInput.focus();
        return;
    }

    if (password !== passwordConfirmation) {
        passwordError.textContent = "Your passwords do not match.";
        passwordConfirmInput.focus();
        return;
    }

    emailError.textContent = "";
    passwordError.textContent = "";
    clearLoginPasswords();

    showLoginStep(2);

});

document.querySelectorAll("[data-password-toggle]").forEach((toggle) => {
    toggle.addEventListener("click", () => {
        const input = document.getElementById(toggle.dataset.passwordToggle);
        if (!input) return;

        const isVisible = input.type === "text";
        input.type = isVisible ? "password" : "text";
        toggle.textContent = isVisible ? "Show" : "Hide";
        toggle.setAttribute("aria-pressed", String(!isVisible));
        toggle.setAttribute(
            "aria-label",
            `${isVisible ? "Show" : "Hide"} ${
                toggle.dataset.passwordToggle === "passwordInput"
                    ? "password"
                    : "password confirmation"
            }`
        );
    });
});

["googleLoginButton", "gmailLoginButton"].forEach((buttonId) => {
    document.getElementById(buttonId)?.addEventListener("click", () => {
        if (loginProviderMessage) {
            loginProviderMessage.textContent =
                "Google/Gmail sign-in is not configured yet. Use email to continue.";
        }
    });
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

passwordConfirmInput?.addEventListener("keydown", (event) => {
    if (event.key === "Enter") emailNext?.click();
});

passwordInput?.addEventListener("input", () => {
    if (passwordError) passwordError.textContent = "";
});

passwordConfirmInput?.addEventListener("input", () => {
    if (passwordError) passwordError.textContent = "";
});


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
        email,
        character: selectedCharacter,
        characterName,
        profileId: email ? `email:${email.toLowerCase()}` : `name:${characterName.toLowerCase()}`
    };

    activeProfileId = user.profileId;
    const savedProfile = localProfiles.find(profile => profile.id === activeProfileId);
    if (savedProfile) {
        user = { ...(savedProfile.user || user), profileId: activeProfileId, characterName: savedProfile.name || characterName };
        selectedCharacter = user.character || selectedCharacter;
        habits = JSON.parse(JSON.stringify(savedProfile.habits || []));
        stats = { xp: 0, streak: 0, lastCompletedDate: null, ...(savedProfile.stats || {}) };
        normalizeStats(stats);
        localStorage.setItem("doyourstreak-habits", JSON.stringify(habits));
        localStorage.setItem("doyourstreak-stats", JSON.stringify(stats));
    }

    window.DYSFeatures?.setProfile(activeProfileId, stats);


    localStorage.setItem(
        "doyourstreak-user",
        JSON.stringify(user)
    );

    saveActiveProfileSnapshot();


    /* CLOSE LOGIN MODAL */

    loginModal.classList.add("hidden");


    /* SHOW APP */

    showApp();

}

// ================================
// PAGE NAVIGATION
// ================================

const settingsNav = document.getElementById("settingsNav");
const characterNav = document.getElementById("characterNav");
const shopNav = document.getElementById("shopNav");
const gameNav = document.getElementById("gameNav");
const exerciseNav = document.getElementById("exerciseNav");
const infoNav = document.getElementById("infoNav");
const achievementsNav = document.getElementById("achievementsNav");

const characterPage = document.getElementById("characterPage");
const shopPage = document.getElementById("shopPage");
const gamePage = document.getElementById("gamePage");
const exercisePage = document.getElementById("exercisePage");
const infoPage = document.getElementById("infoPage");
const eventChatPage = document.getElementById("eventChatPage");
const achievementsPage = document.getElementById("achievementsPage");
const settingsPage = document.getElementById("settingsPage");
const awardsMenu = document.getElementById("awardsMenu");
const awardDetail = document.getElementById("awardDetail");
const achievementList = document.getElementById("achievementList");
const questList = document.getElementById("questList");
let currentAwardSection = null;

const achievementDefinitions = [
    { id: "ten-habits", title: "Habit Centurion", description: "Complete 100 habits.", progress: () => Math.min(Number(stats.habitsCompletedTotal) || 0, 100), target: 100 },
    { id: "first-skin", title: "Fresh Look", description: "Purchase 3 character skins.", progress: () => Math.min(getPurchasedSkinCount(), 3), target: 3 },
    { id: "first-game", title: "Game Regular", description: "Play 10 games.", progress: () => Math.min(Number(achievements.gameSessions) || 0, 10), target: 10 },
    { id: "seven-day-streak", title: "Month of Momentum", description: "Keep a habit streak for 30 days.", progress: () => Math.min(Number(stats.streak) || 0, 30), target: 30 },
    { id: "routine-finisher", title: "Routine Finisher", description: "Complete every habit on 7 different days.", progress: () => Math.min(Number(achievements.routineFinisherDays) || 0, 7), target: 7 },
    { id: "note-to-self", title: "Thoughtful Tracker", description: "Write 25 habit notes.", progress: () => Math.min(Number(achievements.notesWritten) || 0, 25), target: 25 },
    { id: "game-explorer", title: "Arcade Devotee", description: "Play 100 games.", progress: () => Math.min(Number(achievements.gameSessions) || 0, 100), target: 100 },
    { id: "style-collector", title: "Style Collector", description: "Purchase 15 character skins.", progress: () => Math.min(getPurchasedSkinCount(), 15), target: 15 },
    { id: "level-five", title: "Level 25", description: "Reach level 25.", progress: () => Math.min(Math.floor((Number(stats.xp) || 0) / 100) + 1, 25), target: 25 },
    { id: "comeback", title: "Long Road Back", description: "Return to your habits after 30 days away.", progress: () => Math.min(Number(achievements.comebackDays) || 0, 30), target: 30 },
    { id: "daily-task-champion", title: "Daily Task Champion", description: "Claim 100 daily task rewards.", progress: () => Math.min(Number(achievements.dailyTasksClaimed) || 0, 100), target: 100 }
];

const questPeriods = [
    { id: "weekly", title: "WEEKLY QUESTS", difficulty: "MEDIUM", quests: [
        { id: "habits", metric: "habitsCompleted", title: "Habit Momentum", description: "Complete 15 habits this week.", target: 15, coins: 120, xp: 30 },
        { id: "games", metric: "gamesPlayed", title: "Play Break", description: "Open and play 5 games this week.", target: 5, coins: 100, xp: 25 },
        { id: "notes", metric: "notesAdded", title: "Weekly Reflection", description: "Write 3 habit notes this week.", target: 3, coins: 90, xp: 25 }
    ] },
    { id: "monthly", title: "MONTHLY QUESTS", difficulty: "HARD", quests: [
        { id: "habits", metric: "habitsCompleted", title: "Habit Machine", description: "Complete 120 habits this month.", target: 120, coins: 1000, xp: 300 },
        { id: "games", metric: "gamesPlayed", title: "Arcade Regular", description: "Play 30 games this month.", target: 30, coins: 800, xp: 250 },
        { id: "tasks", metric: "dailyTasksClaimed", title: "Task Tactician", description: "Claim 20 daily task rewards this month.", target: 20, coins: 1000, xp: 350 }
    ] },
    { id: "annual", title: "ANNUAL QUESTS", difficulty: "NEARLY IMPOSSIBLE", quests: [
        { id: "habits", metric: "habitsCompleted", title: "Legendary Habit Master", description: "Complete 2,500 habits this year.", target: 2500, coins: 25000, xp: 5000 },
        { id: "games", metric: "gamesPlayed", title: "Arcade Legend", description: "Play 500 games this year.", target: 500, coins: 20000, xp: 5000 },
        { id: "tasks", metric: "dailyTasksClaimed", title: "Year of Perfect Focus", description: "Claim 300 daily task rewards this year.", target: 300, coins: 30000, xp: 7000 }
    ] }
];

function getQuestPeriodKey(periodId) {
    const today = getTodayDate();
    if (periodId === "monthly") return today.slice(0, 7);
    if (periodId === "annual") return today.slice(0, 4);
    const monday = new Date(`${today}T00:00:00`);
    monday.setDate(monday.getDate() - (monday.getDay() + 6) % 7);
    return monday.toISOString().slice(0, 10);
}

function getQuestPeriodState(periodId) {
    const key = getQuestPeriodKey(periodId);
    if (!questProgress[periodId] || questProgress[periodId].key !== key) {
        questProgress[periodId] = { key, counters: {}, claimed: [] };
    }
    const state = questProgress[periodId];
    if (!state.counters || typeof state.counters !== "object") state.counters = {};
    if (!Array.isArray(state.claimed)) state.claimed = [];
    return state;
}

function saveQuestProgress() {
    localStorage.setItem("doyourstreak-quests", JSON.stringify(questProgress));
}

function getQuestResetText(periodId) {
    const today = new Date(`${getTodayDate()}T00:00:00`);
    let resetDate;
    if (periodId === "weekly") {
        resetDate = new Date(today);
        const daysUntilMonday = (8 - today.getDay()) % 7 || 7;
        resetDate.setDate(today.getDate() + daysUntilMonday);
    } else if (periodId === "monthly") {
        resetDate = new Date(today.getFullYear(), today.getMonth() + 1, 1);
    } else {
        resetDate = new Date(today.getFullYear() + 1, 0, 1);
    }
    const resetLabel = { en: "REFRESHES", id: "DIATUR ULANG", zh: "重置时间" }[appLanguage];
    const resetDateText = resetDate.toLocaleDateString(getAppLocale(), { month: "short", day: "numeric", year: "numeric" });
    return appLanguage === "zh" ? `${resetLabel} ${resetDateText}` : `${resetLabel} ${resetDateText.toUpperCase()}`;
}

function renderQuestBoard() {
    const list = questList;
    if (!list) return;
    if (window.DYSFeatures && ["daily", "weekly", "monthly"].includes(currentAwardSection)) {
        window.DYSFeatures.renderQuestList(list, currentAwardSection);
        return;
    }
    const selectedPeriod = questPeriods.find(period => period.id === currentAwardSection);
    list.innerHTML = (selectedPeriod ? [selectedPeriod] : []).map(period => {
        const state = getQuestPeriodState(period.id);
        const periodTitle = window.translateAppText(period.title);
        const difficulty = window.translateAppText(period.difficulty);
        return `<section class="quest-period" aria-labelledby="quest-${period.id}-title">
            <div class="quest-period-header"><div><h3 id="quest-${period.id}-title">${periodTitle}</h3><small>${difficulty}</small></div><small>${getQuestResetText(period.id)}</small></div>
            <div class="quest-cards">${period.quests.map(quest => {
                const progress = Math.min(Number(state.counters[quest.metric]) || 0, quest.target);
                const isClaimed = state.claimed.includes(quest.id);
                const canClaim = progress >= quest.target && !isClaimed;
                const title = window.translateAppText(quest.title);
                const description = window.translateAppText(quest.description);
                const reward = window.translateAppText(
                    "{progress} / {target} · {coins} coins + {xp} XP",
                    { progress, target: quest.target, coins: quest.coins.toLocaleString(), xp: quest.xp.toLocaleString() }
                );
                const claimLabel = window.translateAppText(isClaimed ? "CLAIMED ✓" : canClaim ? "CLAIM REWARD" : "IN PROGRESS");
                return `<article class="quest-card"><div><h4>${title}</h4><p>${description}</p></div>
                    <div class="quest-progress" role="progressbar" aria-label="${title}" aria-valuemin="0" aria-valuemax="${quest.target}" aria-valuenow="${progress}"><span style="width:${progress / quest.target * 100}%"></span></div>
                    <div class="quest-card-footer"><span class="quest-reward">${reward}</span>
                    <button class="quest-claim" type="button" data-claim-quest="${period.id}:${quest.id}" ${canClaim ? "" : "disabled"}>${claimLabel}</button></div></article>`;
            }).join("")}</div>
        </section>`;
    }).join("");
    saveQuestProgress();
}

function recordQuestProgress(metric, amount = 1) {
    questPeriods.forEach(period => {
        const state = getQuestPeriodState(period.id);
        state.counters[metric] = (Number(state.counters[metric]) || 0) + amount;
    });
    saveQuestProgress();
    renderQuestBoard();
}

document.getElementById("questList")?.addEventListener("click", event => {
    const button = event.target.closest("[data-claim-quest]");
    if (!button) return;
    const [periodId, questId] = button.dataset.claimQuest.split(":");
    const period = questPeriods.find(item => item.id === periodId);
    const quest = period?.quests.find(item => item.id === questId);
    const state = getQuestPeriodState(periodId);
    if (!quest || state.claimed.includes(quest.id) || (Number(state.counters[quest.metric]) || 0) < quest.target) return;
    state.claimed.push(quest.id);
    coins += quest.coins;
    stats.xp += quest.xp;
    saveQuestProgress();
    saveStats();
    updateStats();
    updateCoins();
    renderQuestBoard();
});

renderQuestBoard();
window.setInterval(renderQuestBoard, 60000);

function saveAchievements() {
    localStorage.setItem("doyourstreak-achievements", JSON.stringify(achievements));
}

function getPurchasedSkinCount() {
    let count = 0;
    for (let index = 0; index < localStorage.length; index++) {
        if (localStorage.key(index)?.startsWith("doyourstreak-owned-")) count++;
    }
    return count;
}

function markGamePlayed(gameId) {
    if (!Array.isArray(achievements.playedGames)) achievements.playedGames = [];
    if (gameId && !achievements.playedGames.includes(gameId)) achievements.playedGames.push(gameId);
    achievements.gamePlayed = true;
    achievements.gameSessions = (Number(achievements.gameSessions) || 0) + 1;
    checkAchievements();
    recordQuestProgress("gamesPlayed");
}

function recordRoutineFinisherDay() {
    if (!habits.length || !habits.every(habit => habit.completed)) return;
    const today = getTodayDate();
    if (achievements.lastRoutineFinisherDate === today) return;
    achievements.lastRoutineFinisherDate = today;
    achievements.routineFinisherDays = (Number(achievements.routineFinisherDays) || 0) + 1;
}

if (getPurchasedSkinCount() > 0) achievements.skinPurchased = true;

function renderAchievements() {
    const list = achievementList;
    if (!list) return;
    list.innerHTML = achievementDefinitions.map(achievement => {
        const unlocked = Boolean(achievements[achievement.id]);
        const progress = unlocked ? achievement.target : Math.min(achievement.progress(), achievement.target);
        return `<article class="achievement-card${unlocked ? " unlocked" : ""}">
            <div class="achievement-copy"><small>${unlocked ? "UNLOCKED" : "IN PROGRESS"}</small><h2>${achievement.title}</h2><p>${achievement.description}</p>
                <div class="achievement-progress" role="progressbar" aria-label="${achievement.title}" aria-valuemin="0" aria-valuemax="${achievement.target}" aria-valuenow="${progress}"><span style="width:${progress / achievement.target * 100}%"></span></div>
                <small class="achievement-count">${progress} / ${achievement.target}</small>
            </div>
        </article>`;
    }).join("");
    window.DYSFeatures?.renderAchievementCards();
}

function showAwardsMenu() {
    currentAwardSection = null;
    if (awardsMenu) awardsMenu.hidden = false;
    if (awardDetail) awardDetail.hidden = true;
    window.scrollTo(0, 0);
}

function openAwardSection(section) {
    const titles = { achievement: "PENCAPAIAN", daily: "QUEST HARIAN", weekly: "QUEST MINGGUAN", monthly: "QUEST BULANAN", annual: "QUEST TAHUNAN" };
    if (!titles[section]) return;
    currentAwardSection = section;
    awardsMenu.hidden = true;
    awardDetail.hidden = false;
    document.getElementById("awardDetailTitle").textContent = titles[section];
    achievementList.hidden = section !== "achievement";
    questList.hidden = section === "achievement";
    if (section === "achievement") {
        renderAchievements();
        window.DYSFeatures?.renderAchievementCards();
    }
    else renderQuestBoard();
    window.scrollTo(0, 0);
}

awardsMenu?.addEventListener("click", event => {
    const option = event.target.closest("[data-award-section]");
    if (option) openAwardSection(option.dataset.awardSection);
});
document.getElementById("awardBackButton")?.addEventListener("click", showAwardsMenu);

let achievementToastTimer = null;
function showAchievementToast(achievement) {
    const toast = document.getElementById("achievementToast");
    const title = document.getElementById("achievementToastTitle");
    if (!toast || !title) return;
    title.textContent = achievement.title;
    toast.classList.add("visible");
    clearTimeout(achievementToastTimer);
    achievementToastTimer = setTimeout(() => toast.classList.remove("visible"), 5000);
}

function checkAchievements() {
    achievementDefinitions.forEach(achievement => {
        if (!achievements[achievement.id] && achievement.progress() >= achievement.target) {
            achievements[achievement.id] = true;
            showAchievementToast(achievement);
        }
    });
    saveAchievements();
    renderAchievements();
}

document.getElementById("closeAchievementToast")?.addEventListener("click", () => {
    document.getElementById("achievementToast")?.classList.remove("visible");
    clearTimeout(achievementToastTimer);
});
checkAchievements();


function setActiveNav(activeButton) {

    settingsNav?.classList.remove("active");
    characterNav?.classList.remove("active");
    shopNav?.classList.remove("active");
    gameNav?.classList.remove("active");
    exerciseNav?.classList.remove("active");
    infoNav?.classList.remove("active");
    achievementsNav?.classList.remove("active");

    activeButton?.classList.add("active");
}

function showGamePage() {

    showGameMenu();

    settingsPage?.classList.remove("active");
    characterPage?.classList.remove("active");
    shopPage?.classList.remove("active");
    gamePage?.classList.add("active");
    exercisePage?.classList.remove("active");
    infoPage?.classList.remove("active");
    achievementsPage?.classList.remove("active");
    eventChatPage?.classList.remove("active");

    setActiveNav(gameNav);

    window.scrollTo(0, 0);

}

function showCharacterPage() {

    settingsPage?.classList.remove("active");
    characterPage?.classList.add("active");
    shopPage?.classList.remove("active");
    exercisePage?.classList.remove("active");
    infoPage?.classList.remove("active");
    gamePage?.classList.remove("active");
    achievementsPage?.classList.remove("active");
    eventChatPage?.classList.remove("active");

    setActiveNav(characterNav);

    window.scrollTo(0, 0);
}


function showShopPage() {

    settingsPage?.classList.remove("active");
    characterPage?.classList.remove("active");
    shopPage?.classList.add("active");
    gamePage?.classList.remove("active");
    exercisePage?.classList.remove("active");
    infoPage?.classList.remove("active");
    achievementsPage?.classList.remove("active");
    eventChatPage?.classList.remove("active");

    setActiveNav(shopNav);

    updateCoins();

    window.scrollTo(0, 0);
}


function showExercisePage() {

    settingsPage?.classList.remove("active");
    characterPage?.classList.remove("active");
    shopPage?.classList.remove("active");
    exercisePage?.classList.add("active");
    infoPage?.classList.remove("active");
    gamePage?.classList.remove("active");
    achievementsPage?.classList.remove("active");
    eventChatPage?.classList.remove("active");

    setActiveNav(exerciseNav);

    window.scrollTo(0, 0);
}


function showInfoPage() {

    settingsPage?.classList.remove("active");
    characterPage?.classList.remove("active");
    shopPage?.classList.remove("active");
    exercisePage?.classList.remove("active");
    infoPage?.classList.add("active");
    gamePage?.classList.remove("active");
    achievementsPage?.classList.remove("active");
    eventChatPage?.classList.remove("active");

    setActiveNav(infoNav);

    renderCalendar();
    renderLocalLeaderboard();
    renderEventChat();
    window.DYSFeatures?.renderChallengeBoard();

    window.scrollTo(0, 0);
}

function showEventChatPage() {
    [characterPage, shopPage, gamePage, exercisePage, infoPage, achievementsPage, settingsPage].forEach(page => page?.classList.remove("active"));
    eventChatPage?.classList.add("active");
    setActiveNav(infoNav);
    renderEventChat();
    window.scrollTo(0, 0);
    eventChatInput?.focus();
}

function showAchievementsPage() {
    [characterPage, shopPage, gamePage, exercisePage, infoPage, eventChatPage, settingsPage].forEach(page => page?.classList.remove("active"));
    achievementsPage?.classList.add("active");
    setActiveNav(achievementsNav);
    showAwardsMenu();
    window.scrollTo(0, 0);
}

function showSettingsPage() {
    [characterPage, shopPage, gamePage, exercisePage, infoPage, eventChatPage, achievementsPage].forEach(page => page?.classList.remove("active"));
    settingsPage?.classList.add("active");
    setActiveNav(settingsNav);
    if (settingsProfileName) settingsProfileName.textContent = user?.characterName || user?.name || "Player";
    if (settingsProfileStreak) settingsProfileStreak.textContent = String(stats.streak || 0);
    updateSettingsProfileAvatar();
    window.scrollTo(0, 0);
}

function updateSettingsProfileAvatar() {
    const displayName = user?.characterName || user?.name || "Player";
    const initials = displayName.trim().split(/\s+/).slice(0, 2).map(part => part[0]).join("").toUpperCase() || "P";
    if (settingsProfileInitials) {
        settingsProfileInitials.textContent = initials;
        settingsProfileInitials.classList.toggle("hidden", Boolean(user?.profileImage));
    }
    if (settingsProfileAvatar) {
        settingsProfileAvatar.classList.toggle("hidden", !user?.profileImage);
        if (user?.profileImage) settingsProfileAvatar.src = user.profileImage;
        else settingsProfileAvatar.removeAttribute("src");
    }
    document.getElementById("settingsAvatarRemove")?.classList.toggle("hidden", !user?.profileImage);
}

function saveSettingsProfileUser(updatedUser) {
    localStorage.setItem("doyourstreak-user", JSON.stringify(updatedUser));
    user = updatedUser;
    saveActiveProfileSnapshot();
    updateSettingsProfileAvatar();
}

async function saveSettingsProfilePhoto(file) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
        if (settingsAvatarFeedback) settingsAvatarFeedback.textContent = "Choose an image file to use as your photo.";
        if (settingsAvatarInput) settingsAvatarInput.value = "";
        return;
    }
    if (file.size > 10 * 1024 * 1024) {
        if (settingsAvatarFeedback) settingsAvatarFeedback.textContent = "Choose an image smaller than 10 MB.";
        if (settingsAvatarInput) settingsAvatarInput.value = "";
        return;
    }

    let image;
    try {
        image = await createImageBitmap(file);
        const scale = Math.min(1, 512 / Math.max(image.width, image.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(image.width * scale));
        canvas.height = Math.max(1, Math.round(image.height * scale));
        const context = canvas.getContext("2d");
        if (!context) throw new Error("Could not prepare the selected image.");
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        const profileImage = canvas.toDataURL("image/jpeg", 0.84);
        saveSettingsProfileUser({ ...user, profileImage });
        if (settingsAvatarFeedback) settingsAvatarFeedback.textContent = "Profile photo saved on this device.";
    } catch (error) {
        console.error("Could not save the profile photo.", error);
        if (settingsAvatarFeedback) settingsAvatarFeedback.textContent = "Could not save this photo. Try another image or free up browser storage.";
    } finally {
        image?.close();
        if (settingsAvatarInput) settingsAvatarInput.value = "";
    }
}

settingsAvatarInput?.addEventListener("change", () => {
    void saveSettingsProfilePhoto(settingsAvatarInput.files?.[0]);
});
document.getElementById("settingsAvatarChoose")?.addEventListener("click", () => settingsAvatarInput?.click());
document.getElementById("settingsAvatarRemove")?.addEventListener("click", () => {
    try {
        const updatedUser = { ...user };
        delete updatedUser.profileImage;
        saveSettingsProfileUser(updatedUser);
        if (settingsAvatarFeedback) settingsAvatarFeedback.textContent = "Profile photo removed.";
    } catch (error) {
        console.error("Could not remove the profile photo.", error);
        if (settingsAvatarFeedback) settingsAvatarFeedback.textContent = "Could not update your profile. Please try again.";
    }
});

const settingsEtcButton = document.getElementById("settingsEtcButton");
const settingsEtcPopup = document.getElementById("settingsEtcPopup");
const settingsEtcClose = document.getElementById("settingsEtcClose");

function closeSettingsEtcPopup() {
    settingsEtcPopup?.classList.add("hidden");
    settingsEtcButton?.setAttribute("aria-expanded", "false");
    settingsEtcButton?.focus();
}

settingsEtcButton?.addEventListener("click", () => {
    settingsEtcPopup?.classList.remove("hidden");
    settingsEtcButton.setAttribute("aria-expanded", "true");
    settingsEtcClose?.focus();
});
settingsEtcClose?.addEventListener("click", closeSettingsEtcPopup);
settingsEtcPopup?.addEventListener("click", event => {
    if (event.target === settingsEtcPopup) closeSettingsEtcPopup();
});
document.addEventListener("keydown", event => {
    if (event.key === "Escape" && settingsEtcPopup && !settingsEtcPopup.classList.contains("hidden")) {
        closeSettingsEtcPopup();
    }
});

const menuButtons = [settingsNav, characterNav, shopNav, gameNav, exerciseNav, infoNav, achievementsNav].filter(Boolean);
let menuShuffleTimer = null;
let menuOriginalOrder = null;

function animateMenuOrder(order) {
    const menu = document.querySelector(".bottom-navbar");
    if (!menu) return;
    const before = new Map([...menu.querySelectorAll(".bottom-nav-image")].map(button => [button, button.getBoundingClientRect().left]));
    order.forEach(button => menu.appendChild(button));
    order.forEach(button => {
        const deltaX = before.get(button) - button.getBoundingClientRect().left;
        if (Math.abs(deltaX) < 1 || button.classList.contains("menu-jump")) return;
        button.animate(
            [{ translate: `${deltaX}px 0` }, { translate: "0px 0px" }],
            { duration: 360, easing: "cubic-bezier(.2, .75, .3, 1)" }
        );
    });
}

menuButtons.forEach(button => {
    button.addEventListener("click", () => {
        if (menuShuffleTimer) {
            clearTimeout(menuShuffleTimer);
            menuShuffleTimer = null;
        }
        if (menuOriginalOrder) {
            animateMenuOrder(menuOriginalOrder);
            menuOriginalOrder = null;
        }

        button.classList.remove("menu-jump");
        void button.offsetWidth;
        button.classList.add("menu-jump");

        if (button === settingsNav) return;

        const originalOrder = [...document.querySelectorAll(".bottom-navbar .bottom-nav-image")]
            .filter(menuButton => menuButton !== settingsNav);
        if (originalOrder.length > 2) {
            const clickedIndex = originalOrder.indexOf(button);
            let swapIndex = -1;
            let nearestPairDistance = Infinity;
            for (let index = 0; index < originalOrder.length - 1; index++) {
                if (index === clickedIndex || index + 1 === clickedIndex) continue;
                const distance = Math.abs(index + .5 - clickedIndex);
                if (distance < nearestPairDistance) {
                    nearestPairDistance = distance;
                    swapIndex = index;
                }
            }
            const swappedOrder = [...originalOrder];
            if (swapIndex >= 0) {
                [swappedOrder[swapIndex], swappedOrder[swapIndex + 1]] = [swappedOrder[swapIndex + 1], swappedOrder[swapIndex]];
            }
            menuOriginalOrder = originalOrder;
            animateMenuOrder(swappedOrder);
            menuShuffleTimer = setTimeout(() => {
                animateMenuOrder(originalOrder);
                menuOriginalOrder = null;
                menuShuffleTimer = null;
            }, 620);
        }
    });
    button.addEventListener("animationend", event => {
        if (event.animationName === "menuButtonOrbit") button.classList.remove("menu-jump");
    });
});

characterNav?.addEventListener("click", showCharacterPage);
settingsNav?.addEventListener("click", showSettingsPage);
shopNav?.addEventListener("click", showShopPage);
gameNav?.addEventListener("click", showGamePage);
exerciseNav?.addEventListener("click", showExercisePage);
infoNav?.addEventListener("click", showInfoPage);
achievementsNav?.addEventListener("click", showAchievementsPage);
document.getElementById("settingsLogoutButton")?.addEventListener("click", () => logoutButton?.click());

/* =====================================================
   CALENDAR
===================================================== */

let calendarDate = new Date();


const calendarEvents = {
    "2026-11-09": "STREAK SPRINT",
    "2026-11-15": "CHARACTER PARADE",
    "2026-11-22": "WEEKEND QUEST"
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


    const monthName = calendarDate.toLocaleDateString(getAppLocale(), {
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
    {
        id: "armycat",
        name: "ARMYCAT",
        image: "armycat.png",
        price: 230
    },
    {
        id: "burgirengcat",
        name: "BURGIRENGCAT",
        image: "burgirengcat.png",
        price: 250
    },
    {
        id: "duriancat",
        name: "DURIANCAT",
        image: "duriancat.png",
        price: 280
    },
    {
        id: "gofoodcat",
        name: "GOFOODCAT",
        image: "gofoodcat.png",
        price: 300
    },
    {
        id: "officecat",
        name: "OFFICECAT",
        image: "officecat.png",
        price: 330
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

function animateCharacterArrow(button, direction) {
    if (!button) return;
    button.classList.remove("orbit-next", "orbit-prev");
    void button.offsetWidth;
    button.classList.add(direction === "next" ? "orbit-next" : "orbit-prev");
}

function animateCharacterSlide(direction) {
    const character = document.querySelector("#characterPage .character-main");
    if (!character) return;
    character.classList.remove("character-slide-next", "character-slide-prev");
    void character.offsetWidth;
    character.classList.add(direction === "next" ? "character-slide-next" : "character-slide-prev");
}

prevCharacter?.addEventListener(
    "click",
    () => {

        animateCharacterArrow(prevCharacter, "prev");
        animateCharacterSlide("prev");

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

        animateCharacterArrow(nextCharacter, "next");
        animateCharacterSlide("next");

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

window.addEventListener("dys-feature-reward", event => {
    const reward = event.detail || {};
    stats.xp += Math.max(0, Number(reward.xp) || 0);
    coins += Math.max(0, Number(reward.coins) || 0);
    if (reward.freezes) {
        window.DYSFeatures?.addStreakFreezes?.(Number(reward.freezes));
    }
    saveStats();
    updateStats();
    updateCoins();
});


/* =====================================================
   DYNAMIC CHARACTER SHOP
===================================================== */

const shopBackgrounds = [
    { id: "room", name: "ROOM", image: "roombg.jpe", price: 1900 },
    { id: "sea", name: "SEA", image: "seabg.jpe", price: 2000 },
    { id: "trail", name: "TRAIL", image: "trailbg.jpe", price: 3400 },
    { id: "lawson", name: "LAWSON", image: "Lawsonbg.jpe", price: 2200 },
    { id: "park", name: "PARK", image: "parkbg.jpe", price: 2500 },
    { id: "station", name: "STATION", image: "stationbg.jpe", price: 2800 }
];

function isBackgroundOwned(background) {
    return localStorage.getItem(`doyourstreak-owned-background-${background.id}`) === "true";
}

function applySelectedShopBackground() {
    const selectedBackgroundId = localStorage.getItem("doyourstreak-selected-background");
    const selectedBackground = shopBackgrounds.find(background => background.id === selectedBackgroundId);
    const homePage = document.getElementById("characterPage");

    if (!homePage || !selectedBackground || !isBackgroundOwned(selectedBackground)) return;

    homePage.style.backgroundImage = `url("${selectedBackground.image}")`;
}

function equipShopBackground(background) {
    if (!isBackgroundOwned(background)) return;

    localStorage.setItem("doyourstreak-selected-background", background.id);
    applySelectedShopBackground();
    renderBackgroundShop();
}

function buyShopBackground(background) {
    if (isBackgroundOwned(background)) {
        equipShopBackground(background);
        return;
    }

    if (coins < background.price) {
        alert("Coins kamu belum cukup!");
        return;
    }

    coins -= background.price;
    localStorage.setItem(`doyourstreak-owned-background-${background.id}`, "true");
    updateCoins();
    renderBackgroundShop();
    alert(`${background.name} background berhasil dibeli!`);
}

function renderBackgroundShop() {
    const shopItems = document.querySelector(".shop-items");

    if (!shopItems) return;

    shopItems.innerHTML = "";
    const selectedBackgroundId = localStorage.getItem("doyourstreak-selected-background");

    shopBackgrounds.forEach(background => {
        const owned = isBackgroundOwned(background);
        const equipped = selectedBackgroundId === background.id && owned;
        const item = document.createElement("div");
        item.className = "shop-item shop-background-item";
        item.innerHTML = `
            <img src="${background.image}" alt="${background.name} background preview">
            <h3>${background.name}</h3>
            <p class="character-price">
                <img src="koinngawi.png" alt="Coin" class="coin-icon">
                ${background.price}
            </p>
            <button
                class="buy-character buy-background"
                type="button"
                ${equipped ? "disabled" : ""}
            >
                ${equipped ? "DIPAKAI" : owned ? "PASANG" : "BUY"}
            </button>
        `;

        item.querySelector(".buy-background").addEventListener("click", () => {
            if (owned) {
                equipShopBackground(background);
            } else {
                buyShopBackground(background);
            }
        });

        shopItems.appendChild(item);
    });
}

document.querySelectorAll(".shop-category").forEach(button => {
    button.addEventListener("click", () => {
        const category = button.dataset.shopCategory;

        document.querySelectorAll(".shop-category").forEach(categoryButton => {
            const isSelected = categoryButton === button;
            categoryButton.classList.toggle("active", isSelected);
            categoryButton.setAttribute("aria-selected", String(isSelected));
        });

        const shopItems = document.querySelector(".shop-items");
        if (shopItems) {
            shopItems.setAttribute(
                "aria-labelledby",
                button.id
            );
        }

        if (category === "background") {
            renderBackgroundShop();
        } else {
            renderCharacterShop();
        }
    });
});

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

    achievements.skinPurchased = true;
    checkAchievements();

    renderCharacterShop();


    alert(
        `${character.name} berhasil dibeli!`
    );

}

// ================================
// DAILY TASK SYSTEM
// ================================

const dailyTasks = [
    { id: "complete1", title: "One Small Win", description: "Selesaikan 1 habit hari ini.", target: 1, reward: 20,
        check: () => habits.filter(habit => habit.completed).length },
    { id: "complete2", title: "Double Progress", description: "Selesaikan 2 habit hari ini.", target: 2, reward: 30,
        available: () => habits.length >= 2, check: () => habits.filter(habit => habit.completed).length },
    { id: "complete3", title: "Three in a Row", description: "Selesaikan 3 habit hari ini.", target: 3, reward: 40,
        available: () => habits.length >= 3, check: () => habits.filter(habit => habit.completed).length },
    { id: "complete4", title: "Keep the Momentum", description: "Selesaikan 4 habit hari ini.", target: 4, reward: 50,
        available: () => habits.length >= 4, check: () => habits.filter(habit => habit.completed).length },
    { id: "complete5", title: "Full Power", description: "Selesaikan 5 habit hari ini.", target: 5, reward: 60,
        available: () => habits.length >= 5, check: () => habits.filter(habit => habit.completed).length },
    { id: "highpriority", title: "Prioritas Utama", description: "Selesaikan 1 habit prioritas tinggi.", target: 1, reward: 35,
        available: () => habits.some(habit => habit.priority === "High"), check: () => habits.filter(habit => habit.completed && habit.priority === "High").length },
    { id: "normalpriority", title: "Jaga Ritme", description: "Selesaikan 1 habit prioritas normal.", target: 1, reward: 25,
        available: () => habits.some(habit => habit.priority === "Normal"), check: () => habits.filter(habit => habit.completed && habit.priority === "Normal").length },
    { id: "lowpriority", title: "Langkah Santai", description: "Selesaikan 1 habit prioritas rendah.", target: 1, reward: 20,
        available: () => habits.some(habit => habit.priority === "Low"), check: () => habits.filter(habit => habit.completed && habit.priority === "Low").length },
    { id: "finishroutine", title: "Routine Complete", description: "Selesaikan semua habit yang kamu punya hari ini.", target: 1, reward: 55,
        available: () => habits.length >= 2, check: () => habits.length > 0 && habits.every(habit => habit.completed) ? 1 : 0 },
    { id: "halfroutine", title: "Halfway There", description: "Selesaikan setidaknya setengah dari habit kamu.", target: 1, reward: 35,
        available: () => habits.length >= 3, check: () => habits.length > 0 && habits.filter(habit => habit.completed).length >= Math.ceil(habits.length / 2) ? 1 : 0 },
    { id: "addnote", title: "Quick Reflection", description: "Tulis satu catatan singkat pada habit hari ini.", target: 1, reward: 25,
        available: () => habits.length > 0, check: () => habits.some(habit => (habit.notes || []).some(note => note.date === getTodayDate())) ? 1 : 0 }
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

        const availableTasks = dailyTasks.filter(task => !task.available || task.available());
        const randomIndex = Math.floor(Math.random() * availableTasks.length);
        const randomTask = availableTasks[randomIndex] || dailyTasks[0];

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
    achievements.dailyTasksClaimed = (Number(achievements.dailyTasksClaimed) || 0) + 1;
    checkAchievements();
    recordQuestProgress("dailyTasksClaimed");

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
const openFlappyGame = document.getElementById("openFlappyGame");
const flappyGame = document.getElementById("flappyGame");
const backFromFlappy = document.getElementById("backFromFlappy");
const openClawGame = document.getElementById("openClawGame");
const clawGame = document.getElementById("clawGame");
const backFromClaw = document.getElementById("backFromClaw");
const openCatBike = document.getElementById("openCatBike");
const catBikeGame = document.getElementById("catBikeGame");
const backFromCatBike = document.getElementById("backFromCatBike");


function showGameMenu() {

    gameMenu?.classList.remove("hidden");

    fightingGame?.classList.add("hidden");

    dinoGame?.classList.add("hidden");

    flappyGame?.classList.add("hidden");
    clawGame?.classList.add("hidden");
    catBikeGame?.classList.add("hidden");
    clawGame?.closest(".game-page")?.classList.remove("claw-active");
    gamePage?.classList.remove("claw-active");

    stopDinoGame();
    stopFlappyGame();
    stopClawGame();
    stopCatBikeGame();

}


/* =====================================================
   OPEN FIGHTING
===================================================== */

openFightingGame?.addEventListener(
    "click",
    () => {

        markGamePlayed("fighting");

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

        markGamePlayed("dino");

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


openFlappyGame?.addEventListener("click", () => {
    markGamePlayed("flappy");
    gameMenu?.classList.add("hidden");
    fightingGame?.classList.add("hidden");
    dinoGame?.classList.add("hidden");
    flappyGame?.classList.remove("hidden");
    stopDinoGame();
    startFlappyScreen();
});

backFromFlappy?.addEventListener("click", showGameMenu);

openClawGame?.addEventListener("click", () => {
    markGamePlayed("claw");
    gameMenu?.classList.add("hidden");
    fightingGame?.classList.add("hidden");
    dinoGame?.classList.add("hidden");
    flappyGame?.classList.add("hidden");
    clawGame?.classList.remove("hidden");
    clawGame?.closest(".game-page")?.classList.add("claw-active");
    gamePage?.classList.add("claw-active");
    stopDinoGame();
    stopFlappyGame();
    startClawGame();
});

backFromClaw?.addEventListener("click", showGameMenu);

openCatBike?.addEventListener("click", () => {
    markGamePlayed("cat-bike");
    gameMenu?.classList.add("hidden");
    [fightingGame, dinoGame, flappyGame, clawGame].forEach(screen => screen?.classList.add("hidden"));
    catBikeGame?.classList.remove("hidden");
    stopDinoGame(); stopFlappyGame(); stopClawGame();
    startCatBikeScreen();
});
backFromCatBike?.addEventListener("click", showGameMenu);
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
applySelectedShopBackground();


/* INITIAL COINS */

updateCoins();


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

/* =====================================================
   CAT BIKE — endless farm-road dodger
===================================================== */
const catBikeCanvas = document.getElementById("catBikeCanvas");
const catBikeCtx = catBikeCanvas?.getContext("2d");
const catBikeBackground = new Image();
catBikeBackground.src = "catbikebackground.png";
const catBikeStatus = document.getElementById("catBikeStatus");
const catBikeDistanceLabel = document.getElementById("catBikeDistance");
const catBikeScoreLabel = document.getElementById("catBikeScore");
const catBikeBestLabel = document.getElementById("catBikeBest");
const catBikePointsLabel = document.getElementById("catBikePoints");
const catBikeBestKey = "doyourstreak-cat-bike-best";
let catBikeBest = Number(localStorage.getItem(catBikeBestKey)) || 0;
let catBikeDistance = 0, catBikeScore = 0, catBikePointsEarned = 0, catBikeLane = 2, catBikeTraffic = [];
let catBikeFrame = 0, catBikeLast = 0, catBikeSpawn = 0, catBikeRunning = false;
const catBikeRider = new Image();
catBikeRider.src = "catbike.png";
const catBikeObstacleImages = {};
[["dogbike", "dogbike.png"], ["catr", "catr.png"], ["dababycar", "dababycar.png"]].forEach(([name, src]) => {
    const image = new Image();
    image.src = src;
    catBikeObstacleImages[name] = image;
});
let daBabyObstacleCutout = null;
if (catBikeBestLabel) catBikeBestLabel.textContent = catBikeBest;

function startCatBikeScreen() {
    stopCatBikeGame();
    catBikeDistance = 0; catBikeScore = 0; catBikePointsEarned = 0; catBikeLane = 2; catBikeTraffic = []; catBikeSpawn = 0;
    updateCatBikeScore();
    if (catBikeStatus) catBikeStatus.textContent = "Dodge the traffic! Use ← → or A / D.";
    drawCatBike();
}
function stopCatBikeGame() {
    catBikeRunning = false;
    if (catBikeFrame) cancelAnimationFrame(catBikeFrame);
    catBikeFrame = 0;
}
function updateCatBikeScore() {
    if (catBikeDistanceLabel) catBikeDistanceLabel.textContent = Math.floor(catBikeDistance);
    if (catBikeScoreLabel) catBikeScoreLabel.textContent = catBikeScore;
    if (catBikeBestLabel) catBikeBestLabel.textContent = catBikeBest;
    if (catBikePointsLabel) catBikePointsLabel.textContent = catBikePointsEarned.toFixed(1).replace(/\.0$/, "");
}
function catBikeSteer(delta) {
    if (!catBikeRunning) return;
    catBikeLane = Math.max(0, Math.min(3, catBikeLane + delta));
}
function drawCatBike() {
    if (!catBikeCtx || !catBikeCanvas) return;
    const c = catBikeCtx, w = catBikeCanvas.width, h = catBikeCanvas.height;
    c.clearRect(0, 0, w, h);
    if (catBikeBackground.complete && catBikeBackground.naturalWidth) c.drawImage(catBikeBackground, 0, 0, w, h);
    else { c.fillStyle="#8cc8f2";c.fillRect(0,0,w,h); }
    // A simple, straight four-lane track sits over the path in the supplied scene.
    c.fillStyle="rgba(35,48,46,.42)";c.fillRect(64,300,322,500);
    c.strokeStyle="rgba(255,255,255,.95)";c.lineWidth=4;
    c.beginPath();c.moveTo(64,300);c.lineTo(64,800);c.moveTo(386,300);c.lineTo(386,800);c.stroke();
    const laneWidth=322/4;
    const dashOffset=(catBikeDistance*5)%72;
    for(let divider=1;divider<4;divider++){
        const x=64+laneWidth*divider;
        c.setLineDash([32,40]);c.lineDashOffset=-dashOffset;c.lineWidth=3;c.beginPath();c.moveTo(x,300);c.lineTo(x,800);c.stroke();
    }
    c.setLineDash([]);
    const laneX=Array.from({length:5},(_,lane)=>64+laneWidth*(lane+.5));
    for(const car of catBikeTraffic){
        const y=car.y, scale=.7+(y/800)*.25, x=laneX[car.lane]; c.save();c.translate(x,y);c.scale(scale,scale);
        if (car.type === "dogbike" || car.type === "catr" || car.type === "dababycar") {
            const sprite = car.type === "dababycar" ? daBabyObstacleCutout : catBikeObstacleImages[car.type];
            if (sprite && (sprite.complete === undefined || sprite.complete) && (sprite.naturalWidth === undefined || sprite.naturalWidth)) {
                const sw = car.type === "dababycar" ? 70 : 82;
                const sh = car.type === "dababycar" ? 122 : 82;
                c.drawImage(sprite, -sw / 2, -sh / 2, sw, sh);
            } else {
                c.fillStyle = "#252a30"; c.fillRect(-24, -28, 48, 56);
            }
            c.restore();
            continue;
        }
        c.fillStyle="#171b21";
        if(car.type==="truck"){
            // Box truck with a distinct cab, cargo body and paired rear wheels.
            c.fillRect(-27,24,15,22);c.fillRect(14,24,15,22);
            c.fillStyle=car.color;c.fillRect(-34,-40,68,57);
            c.fillStyle="#f4ead0";c.fillRect(-27,-33,54,43);
            c.fillStyle=car.color;c.fillRect(-34,16,68,20);
            c.fillStyle="#bceaff";c.fillRect(-22,18,24,14);
            c.fillStyle="#ffed9c";c.fillRect(-29,34,10,5);c.fillRect(19,34,10,5);
        }else{
            // Rounded car body, cabin and headlights.
            c.fillRect(-25,13,13,20);c.fillRect(12,13,13,20);
            c.fillStyle=car.color;c.beginPath();c.moveTo(-32,12);c.lineTo(-29,-12);c.lineTo(-17,-30);c.quadraticCurveTo(0,-38,17,-30);c.lineTo(29,-12);c.lineTo(32,12);c.closePath();c.fill();
            c.fillStyle="#bceaff";c.beginPath();c.moveTo(-20,-12);c.lineTo(-12,-26);c.quadraticCurveTo(0,-31,12,-26);c.lineTo(20,-12);c.closePath();c.fill();
            c.fillStyle=car.color;c.fillRect(-29,-7,58,17);
            c.fillStyle="#fff0a0";c.fillRect(-28,5,8,5);c.fillRect(20,5,8,5);
        }
        c.restore();
    }
    // Use the supplied transparent PNG as the rider sprite.
    const bx=laneX[catBikeLane], by=690;
    if(catBikeRider.complete&&catBikeRider.naturalWidth){c.drawImage(catBikeRider,bx-60,by-88,120,120);}
    else {c.font="54px sans-serif";c.textAlign="center";c.fillText("🐱",bx,by);}
    c.save();
    c.textAlign="center";c.font="italic 900 44px 'Arial Black', Impact, sans-serif";
    c.lineJoin="round";c.lineWidth=9;c.strokeStyle="#173044";c.shadowColor="rgba(0,0,0,.55)";c.shadowBlur=8;c.shadowOffsetY=4;
    c.strokeText("CAT BIKE",225,270);
    const titleFill=c.createLinearGradient(0,225,0,270);titleFill.addColorStop(0,"#fff28a");titleFill.addColorStop(.48,"#ffb83f");titleFill.addColorStop(1,"#ff654d");
    c.fillStyle=titleFill;c.fillText("CAT BIKE",225,270);c.restore();
}
catBikeBackground.addEventListener("load", drawCatBike);
function prepareDaBabyObstacle() {
    const image = catBikeObstacleImages.dababycar;
    if (!image?.complete || !image.naturalWidth || daBabyObstacleCutout) return;
    const canvas = document.createElement("canvas");
    canvas.width = 144; canvas.height = 256;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height);
    for (let i = 0; i < pixels.data.length; i += 4) {
        const r = pixels.data[i], g = pixels.data[i + 1], b = pixels.data[i + 2];
        if (r >= 92 && r <= 160 && g >= 92 && g <= 160 && b >= 92 && b <= 160 && Math.max(r, g, b) - Math.min(r, g, b) <= 18) pixels.data[i + 3] = 0;
    }
    context.putImageData(pixels, 0, 0);
    daBabyObstacleCutout = canvas;
}
catBikeObstacleImages.dababycar.addEventListener("load", prepareDaBabyObstacle);
function startCatBikeGame() {
    startCatBikeScreen(); catBikeRunning=true; catBikeLast=performance.now();
    if(catBikeStatus)catBikeStatus.textContent="Ride on! Each 100 meters earns a point.";
    catBikeFrame=requestAnimationFrame(catBikeLoop);
}
function endCatBikeGame() {
    stopCatBikeGame(); catBikeBest=Math.max(catBikeBest,catBikeScore);localStorage.setItem(catBikeBestKey,String(catBikeBest));updateCatBikeScore();
    if(catBikeStatus)catBikeStatus.textContent=`Crash! You rode ${Math.floor(catBikeDistance)} m and scored ${catBikeScore}. Press RIDE AGAIN to try again.`;
    const button=document.getElementById("startCatBike");if(button)button.textContent="RIDE AGAIN";
    drawCatBike();
}
function catBikeLoop(now) {
    if(!catBikeRunning||catBikeGame?.classList.contains("hidden")||!gamePage?.classList.contains("active")){stopCatBikeGame();return;}
    const dt=Math.min((now-catBikeLast)/1000,.05);catBikeLast=now;
    catBikeDistance+=dt*34;const nextScore=Math.floor(catBikeDistance/100);if(nextScore>catBikeScore){const gained=nextScore-catBikeScore;catBikeScore=nextScore;catBikePointsEarned+=gained*.5;coins+=gained*.5;updateCoins();updateCatBikeScore();if(catBikeStatus)catBikeStatus.textContent=`+${(gained*.5).toFixed(1).replace(/\.0$/, "")} shop points! Keep riding and dodge traffic.`;}
    catBikeSpawn+=dt;
    if(catBikeSpawn>Math.max(.88,1.48-catBikeDistance/2600)){
        catBikeSpawn=0;
        const openLanes=[0,1,2].filter(lane=>!catBikeTraffic.some(car=>car.lane===lane&&car.y>-100&&car.y<880));
        if(openLanes.length){const lane=openLanes[Math.floor(Math.random()*openLanes.length)];const kinds=["car","truck","dogbike","catr","dababycar"];const direction=Math.random()<.5?-1:1;catBikeTraffic.push({lane,y:direction<0?850:260,direction,type:kinds[Math.floor(Math.random()*kinds.length)],color:["#e45b4f","#4386d6","#f0a33b","#754fc2"][Math.floor(Math.random()*4)]});}
    }
    catBikeTraffic.forEach(car=>car.y+=car.direction*dt*(190+Math.min(catBikeDistance*.12,90)));
    catBikeTraffic=catBikeTraffic.filter(car=>car.y>-140&&car.y<860);
    if(catBikeTraffic.some(car=>car.lane===catBikeLane&&car.y>630&&car.y<750)){endCatBikeGame();return;}
    drawCatBike();catBikeFrame=requestAnimationFrame(catBikeLoop);
}
document.getElementById("startCatBike")?.addEventListener("click",startCatBikeGame);
document.getElementById("catBikeLeft")?.addEventListener("click",()=>catBikeSteer(-1));
document.getElementById("catBikeRight")?.addEventListener("click",()=>catBikeSteer(1));
let catBikeTouchStartX = null;
catBikeCanvas?.addEventListener("pointerdown", event => { catBikeTouchStartX = event.clientX; });
catBikeCanvas?.addEventListener("pointerup", event => { if (catBikeTouchStartX === null) return; const delta = event.clientX - catBikeTouchStartX; if (Math.abs(delta) > 24) catBikeSteer(delta < 0 ? -1 : 1); catBikeTouchStartX = null; });
document.addEventListener("keydown",event=>{if(catBikeGame?.classList.contains("hidden"))return;if(["ArrowLeft","KeyA"].includes(event.code)){event.preventDefault();catBikeSteer(-1);}if(["ArrowRight","KeyD"].includes(event.code)){event.preventDefault();catBikeSteer(1);}});

/* =====================================================
   CLAW MACHINE
===================================================== */

const clawCanvas = document.getElementById("clawCanvas");
const clawCtx = clawCanvas?.getContext("2d");
const clawStatus = document.getElementById("clawStatus");
const clawScoreLabel = document.getElementById("clawScore");
const clawCoinsLabel = document.getElementById("clawCoins");
const clawXPLabel = document.getElementById("clawXP");
const clawLeftButton = document.getElementById("clawLeft");
const clawRightButton = document.getElementById("clawRight");
const clawDropButton = document.getElementById("clawDrop");
const clawRestartButton = document.getElementById("clawRestart");
const clawCharacterSprite = new Image();
clawCharacterSprite.src = getGameCharacter().image;
const clawAnomalySprite = new Image();
clawAnomalySprite.src = "anomalis.png";
const clawBackgroundSprite = new Image();
clawBackgroundSprite.src = "bgclaw.jpe";

const CLAW_HOME_Y = 56;
const CLAW_BOTTOM_Y = 355;
const CLAW_FLOOR_Y = 438;
const CLAW_PRIZE_SIZE = 42;
const CLAW_STACK_GAP = 38;
const CLAW_COLLISION_X = 32;
const CLAW_MAX_TRIES = 8;
let clawX = 400;
let clawY = CLAW_HOME_Y;
let clawState = "idle";
let clawHeldItem = null;
let clawObjects = [];
let clawFrameId = 0;
let clawLastFrame = 0;
let clawAttempts = 0;
let clawScore = 0;
let clawEarnedCoins = 0;
let clawEarnedXP = 0;

function createClawPrizeLayout() {
    clawObjects = [];
    const floorCenter = CLAW_FLOOR_Y - CLAW_PRIZE_SIZE / 2;
    const cells = [];
    for (let row = 0; row < 8; row += 1) {
        const offset = row % 2 ? 21 : 0;
        for (let column = 0; column < 17; column += 1) {
            const x = 50 + offset + column * 42;
            if (x <= 750) cells.push({ x, y: 76 + row * 42 });
        }
    }
    for (let i = cells.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1));
        [cells[i], cells[j]] = [cells[j], cells[i]];
    }

    // Randomly occupied staggered positions fill the playfield without forming straight columns.
    const characterCellIndices = new Set();
    while (characterCellIndices.size < 3) {
        characterCellIndices.add(Math.floor(Math.random() * 63));
    }
    for (let cellIndex = 0; cellIndex < 63; cellIndex += 1) {
        const cell = cells[cellIndex];
        clawObjects.push({
            x: cell.x + (Math.random() - .5) * 10,
            y: Math.min(cell.y + (Math.random() - .5) * 2, floorCenter - 3),
            type: characterCellIndices.has(cellIndex) ? "character" : "anomaly",
            removed: false,
            falling: true,
            held: false,
            vy: 0
        });
    }
}

function startClawGame() {
    if (!clawCanvas || !clawCtx) return;
    stopClawGame();
    clawCharacterSprite.src = getGameCharacter().image;
    clawX = clawCanvas.width / 2;
    clawY = CLAW_HOME_Y;
    clawState = "idle";
    clawHeldItem = null;
    clawAttempts = 0;
    clawScore = 0;
    clawEarnedCoins = 0;
    clawEarnedXP = 0;
    createClawPrizeLayout();
    updateClawScoreboard();
    clawDropButton.disabled = false;
    clawDropButton.textContent = "CAPIT";
    clawRestartButton?.classList.add("hidden");
    setClawStatus("Geser capit dan cari 3 karakter di antara 60 anomaly yang berjatuhan.");
    clawLastFrame = performance.now();
    clawFrameId = requestAnimationFrame(clawLoop);
}

function stopClawGame() {
    if (clawFrameId) cancelAnimationFrame(clawFrameId);
    clawFrameId = 0;
}

function setClawStatus(message) {
    if (clawStatus) clawStatus.textContent = message;
}

function updateClawScoreboard() {
    if (clawScoreLabel) clawScoreLabel.textContent = clawScore;
    if (clawCoinsLabel) clawCoinsLabel.textContent = `+${clawEarnedCoins}`;
    if (clawXPLabel) clawXPLabel.textContent = `+${clawEarnedXP}`;
}

function beginClawDrop() {
    if (clawState !== "idle" || clawAttempts >= CLAW_MAX_TRIES) return;
    clawAttempts += 1;
    clawHeldItem = null;
    clawState = "down";
    clawDropButton.disabled = true;
    clawDropButton.textContent = "LAGI...";
    setClawStatus(`Capit turun… percobaan ${clawAttempts}/${CLAW_MAX_TRIES}`);
}

function catchClawPrize() {
    const candidates = clawObjects
        .filter(item => {
            if (item.removed || item.falling || item.held) return false;
            if (item.type === "character") return true;
            const covered = clawObjects.some(other =>
                other !== item && other.type === "anomaly" && !other.removed && !other.held &&
                Math.abs(other.x - item.x) < CLAW_COLLISION_X && other.y < item.y && item.y - other.y < CLAW_STACK_GAP + 8
            );
            return !covered;
        })
        .sort((a, b) => Math.abs(a.x - clawX) - Math.abs(b.x - clawX) || b.y - a.y);
    const target = candidates[0];
    if (target && Math.abs(target.x - clawX) <= 37) {
        clawHeldItem = target;
        target.held = true;
        // Empty space under a pile makes the prizes above it fall under gravity.
        for (const item of clawObjects) {
            if (!item.removed && !item.held && item.y < target.y && Math.abs(item.x - target.x) < CLAW_COLLISION_X) {
                item.falling = true;
                item.vy = 0;
            }
        }
        if (target.type === "anomaly") {
            setClawStatus("ZONK! Anomaly ketangkap—tapi licin, bakal jatuh lagi!");
        } else {
            setClawStatus("Dapat karakter! Capit lagi naik…");
        }
    } else {
        setClawStatus("Belum kena. Coba geser capit ke atas karakter.");
    }
    clawState = "up";
}

function releaseClawAnomaly() {
    if (!clawHeldItem || clawHeldItem.type !== "anomaly") return;
    clawHeldItem.held = false;
    clawHeldItem.falling = true;
    clawHeldItem.vy = 0;
    clawHeldItem.y = clawY + 42;
    clawHeldItem = null;
}

function finishClawLift() {
    if (clawHeldItem?.type === "character") {
        clawHeldItem.removed = true;
        clawHeldItem.held = false;
        clawHeldItem = null;
        clawScore += 1;
        clawEarnedCoins += 5;
        clawEarnedXP += 10;
        coins += 5;
        stats.xp += 10;
        updateCoins();
        saveStats();
        updateStats();
        updateClawScoreboard();
        setClawStatus("Dapat karakter! +5 koin, +10 EXP.");
    }

    clawState = "idle";
    if (clawAttempts >= CLAW_MAX_TRIES) {
        clawDropButton.disabled = true;
        clawDropButton.textContent = "RONDE SELESAI";
        clawRestartButton?.classList.remove("hidden");
        setClawStatus(`Ronde selesai: ${clawScore} karakter, +${clawEarnedCoins} koin, +${clawEarnedXP} EXP.`);
    } else {
        clawDropButton.disabled = false;
        clawDropButton.textContent = "CAPIT";
    }
}

function drawClawSprite(sprite, centerX, centerY, maxWidth, maxHeight) {
    if (!sprite.complete || sprite.naturalWidth === 0) return false;
    const scale = Math.min(maxWidth / sprite.naturalWidth, maxHeight / sprite.naturalHeight);
    const width = sprite.naturalWidth * scale;
    const height = sprite.naturalHeight * scale;
    clawCtx.drawImage(sprite, centerX - width / 2, centerY - height / 2, width, height);
    return true;
}

function drawClawMachine() {
    if (!clawCtx || !clawCanvas) return;
    const ctx = clawCtx;
    ctx.clearRect(0, 0, clawCanvas.width, clawCanvas.height);
    ctx.fillStyle = "#eaf5ff";
    ctx.fillRect(0, 0, clawCanvas.width, clawCanvas.height);
    if (clawBackgroundSprite.complete && clawBackgroundSprite.naturalWidth > 0) {
        ctx.globalAlpha = .4;
        ctx.drawImage(clawBackgroundSprite, 0, 0, clawCanvas.width, clawCanvas.height);
        ctx.globalAlpha = 1;
    } else {
        ctx.fillStyle = "#40315d";
        ctx.fillRect(0, 0, clawCanvas.width, clawCanvas.height);
    }

    // Rail and cable
    ctx.fillStyle = "#3a3a47";
    ctx.fillRect(clawX - 18, 25, 36, 20);
    ctx.strokeStyle = "#f4f1dc";
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(clawX, 44);
    ctx.lineTo(clawX, clawY);
    ctx.stroke();

    // Prizes
    const visiblePrizes = [...clawObjects].sort((a, b) =>
        (a.type === "character" ? 1 : 0) - (b.type === "character" ? 1 : 0)
    );
    for (const item of visiblePrizes) {
        if (item.removed || item === clawHeldItem || item.held) continue;
        ctx.fillStyle = "rgba(15, 20, 28, .2)";
        ctx.beginPath();
        ctx.ellipse(item.x, item.y + 17, 18, 4, 0, 0, Math.PI * 2);
        ctx.fill();
        const sprite = item.type === "anomaly" ? clawAnomalySprite : clawCharacterSprite;
        if (!drawClawSprite(sprite, item.x, item.y, CLAW_PRIZE_SIZE, CLAW_PRIZE_SIZE)) {
            ctx.fillStyle = item.type === "anomaly" ? "#8a52a6" : "#ffb64d";
            ctx.beginPath();
            ctx.arc(item.x, item.y, CLAW_PRIZE_SIZE / 2, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    // Claw fingers
    if (clawHeldItem) {
        const sprite = clawHeldItem.type === "anomaly" ? clawAnomalySprite : clawCharacterSprite;
        drawClawSprite(sprite, clawX, clawY + 42, CLAW_PRIZE_SIZE, CLAW_PRIZE_SIZE);
    }
    const closed = Boolean(clawHeldItem) || clawState === "down";
    ctx.strokeStyle = "#171717";
    ctx.lineWidth = 8;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(clawX - 20, clawY + 2);
    ctx.lineTo(clawX - (closed ? 10 : 29), clawY + 36);
    ctx.lineTo(clawX - (closed ? 5 : 21), clawY + 46);
    ctx.moveTo(clawX + 20, clawY + 2);
    ctx.lineTo(clawX + (closed ? 10 : 29), clawY + 36);
    ctx.lineTo(clawX + (closed ? 5 : 21), clawY + 46);
    ctx.stroke();

    ctx.fillStyle = "#171717";
    ctx.font = "bold 16px 'Baloo 2', sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(`DROP ${clawAttempts}/${CLAW_MAX_TRIES}`, 18, 448);
}

function clawLoop(timestamp) {
    if (!clawGame || clawGame.classList.contains("hidden") || !gamePage?.classList.contains("active")) {
        clawFrameId = 0;
        return;
    }
    const dt = Math.min((timestamp - clawLastFrame) / 1000, .04);
    clawLastFrame = timestamp;

    const fallingItems = [...clawObjects].sort((a, b) => b.y - a.y);
    const floorCenter = CLAW_FLOOR_Y - CLAW_PRIZE_SIZE / 2;
    for (const item of fallingItems) {
        if (!item.falling) continue;
        const nextVelocity = item.vy + 1100 * dt;
        const nextY = item.y + nextVelocity * dt;
        let landingY = floorCenter;
        for (const support of clawObjects) {
            if (support === item || support.removed || support.held) continue;
            const centerGap = support.y - item.y;
            if (centerGap >= CLAW_STACK_GAP && Math.abs(support.x - item.x) < CLAW_COLLISION_X) {
                const supportTop = support.y - CLAW_STACK_GAP;
                if (supportTop >= item.y && supportTop < landingY) landingY = supportTop;
            }
        }
        if (nextY >= landingY) {
            item.y = landingY;
            item.vy = 0;
            item.falling = false;
        } else {
            item.y = nextY;
            item.vy = nextVelocity;
        }
    }

    if (clawState === "down") {
        clawY = Math.min(CLAW_BOTTOM_Y, clawY + 430 * dt);
        if (clawY >= CLAW_BOTTOM_Y) catchClawPrize();
    } else if (clawState === "up") {
        clawY = Math.max(CLAW_HOME_Y, clawY - 370 * dt);
        if (clawHeldItem?.type === "anomaly" && clawY < 205) releaseClawAnomaly();
        if (clawY <= CLAW_HOME_Y) finishClawLift();
    }

    drawClawMachine();
    clawFrameId = requestAnimationFrame(clawLoop);
}

function moveClaw(direction) {
    if (clawState !== "idle") return;
    clawX = Math.max(90, Math.min(710, clawX + direction * 42));
}

clawLeftButton?.addEventListener("click", () => moveClaw(-1));
clawRightButton?.addEventListener("click", () => moveClaw(1));
clawDropButton?.addEventListener("click", beginClawDrop);
clawRestartButton?.addEventListener("click", startClawGame);
clawCanvas?.addEventListener("pointerdown", event => {
    if (clawState !== "idle") return;
    const bounds = clawCanvas.getBoundingClientRect();
    clawX = Math.max(90, Math.min(710, (event.clientX - bounds.left) / bounds.width * clawCanvas.width));
});
document.addEventListener("keydown", event => {
    if (!clawGame || clawGame.classList.contains("hidden") || !gamePage?.classList.contains("active")) return;
    if (event.code === "Escape") {
        event.preventDefault();
        showGameMenu();
        return;
    }
    if (event.code === "ArrowLeft") { event.preventDefault(); moveClaw(-1); }
    if (event.code === "ArrowRight") { event.preventDefault(); moveClaw(1); }
    if (event.code === "Space" && event.target?.tagName !== "BUTTON") { event.preventDefault(); beginClawDrop(); }
});

/* Sync website data to the optional native Windows companion. */
const windowsWidgetBridge = "http://127.0.0.1:43127/state";
function syncWindowsDesktopWidget() {
    if (!user || appScreen?.classList.contains("hidden")) return;
    const image = document.getElementById("playerImage");
    const payload = {
        characterName: user.characterName || user.name || "Player",
        characterFile: user.character || "player.png",
        characterImageUrl: image?.getAttribute("src") ? new URL(image.getAttribute("src"), window.location.href).href : new URL(user.character || "player.png", window.location.href).href,
        xp: Number(stats?.xp) || 0,
        streak: Number(stats?.streak) || 0,
        habits: habits.map(habit => ({ name: habit.name || "Habit", completed: Boolean(habit.completed) }))
    };
    fetch(windowsWidgetBridge, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=UTF-8" },
        body: JSON.stringify(payload),
        cache: "no-store"
    }).catch(() => {});
}
window.setInterval(syncWindowsDesktopWidget, 2000);
