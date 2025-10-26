// ====================
// VARIABEL UTAMA (Duplikasi jika diperlukan)
// ====================
// ====================
let votes = { 1: 0, 2: 0, 3: 0 };
let currentUser = null;
let hasVoted = false;

const candidates = {
    1: "Ahmad Rizki",
    2: "Sari Putri",
    3: "Doni Mahendra"
};

// ====================
// FUNGSI LOADING STATE UNTUK TOMBOL (Duplikasi)
// ====================
function setLoadingState(buttonId, isLoading) {
    const button = document.getElementById(buttonId);
    if (!button) return;
    const spinner = button.querySelector('.spinner');
    if (isLoading) {
        spinner.classList.remove('hidden');
        button.disabled = true;
    } else {
        spinner.classList.add('hidden');
        button.disabled = false;
    }
}

// ====================
// TAMPILKAN HALAMAN (Duplikasi)
// ====================
function showPage(pageId) {
    const pages = [
        "loginForm",
        "adminLogin",
        "votingPage",
        "voteConfirmation",
        "adminDashboard",
        "Detail",
    ];
    pages.forEach(id => document.getElementById(id)?.classList.add("hidden"));
    document.getElementById(pageId)?.classList.remove("hidden");
}

// ====================
// LOGIN ADMIN
// ====================
document.getElementById("adminForm").addEventListener("submit", function (e) {
    e.preventDefault();
    setLoadingState('adminLoginBtn', true);

    const password = document.getElementById("adminPassword").value;
    if (password === "2024-2025") {
        updateAdminDashboard();
        showPage("adminDashboard");
        setLoadingState('adminLoginBtn', false);
    } else {
        showMessage("Password admin salah!", "error");
        setLoadingState('adminLoginBtn', false);
    }
});

// ====================
// UPDATE HASIL VOTING 2 (Untuk Admin)
// ====================
async function updateResults() {
    setLoadingState('refreshBtn', true);
    try {
        const { data, error } = await supabaseClient.from("voters").select("*");
        if (error) throw error;
        const counts = { 1: 0, 2: 0, 3: 0 };
        if (data && data.length > 0) {
            data.forEach(row => {
                if (counts[row.calon_id] !== undefined) counts[row.calon_id]++;  // Perbaiki: tambahkan undefined
            });
        }
        const total = counts[1] + counts[2] + counts[3];
        document.getElementById("totalVotes").textContent = total;
        for (let i = 1; i <= 3; i++) {
            const voteCount = counts[i];
            const percentage = total > 0 ? Math.round((voteCount / total) * 100) : 0;
            document.getElementById(`votes${i}`).textContent = voteCount;
            document.getElementById(`percentage${i}`).textContent = `${percentage}%`;
            document.getElementById(`progress${i}`).style.width = `${percentage}%`;
        }
    } catch (error) {
        console.error("Gagal memuat hasil:", error);
    } finally {
        setLoadingState('refreshBtn', false);
    }
}

// ====================
// DASHBOARD ADMIN
// ====================
async function updateAdminDashboard() {

    try {
        const { data, error } = await supabaseClient.from("voters").select("*");
        if (error) throw error;

        const counts = { 1: 0, 2: 0, 3: 0 };
        data.forEach(row => {
            if (counts[row.calon_id] !== undefined) counts[row.calon_id]++;
        });

        const total = counts[1] + counts[2] + counts[3];
        document.getElementById("adminTotalVotes").textContent = total;
        document.getElementById("adminVotes1").textContent = counts[1];
        document.getElementById("adminVotes2").textContent = counts[2];
        document.getElementById("adminVotes3").textContent = counts[3];

        const voterList = document.getElementById("voterList");
        voterList.innerHTML = data
            .map(
                (voter, i) => `
      <tr class="border-b border-gray-100">
        <td class="py-3 px-4">${i + 1}</td>
        <td class="py-3 px-4">${voter.nama}</td>
        <td class="py-3 px-4">${voter.nim}</td>
        <td class="py-3 px-4">${voter.password}</td>
        <td class="py-3 px-4">${voter.calon}</td>
        <td class="py-3 px-4">${voter.waktu || "-"}</td>
      </tr>`
            )
            .join("");
    } catch (error) {
        console.error("Gagal ambil data admin:", error);
    }
}
// ====================
// SHOW DETAIL (Untuk Admin)
// ====================
function showDetail() {
    showPage("Detail");
}

// ====================
// EXPORT DATA
// ====================
async function exportResults() {
    try {
        const { data, error } = await supabaseClient.from("voters").select("*");
        if (error) throw error;

        const counts = { 1: 0, 2: 0, 3: 0 };
        data.forEach(row => {
            if (counts[row.calon_id] !== undefined) counts[row.calon_id]++;
        });

        const total = counts[1] + counts[2] + counts[3];
        let content = "Hasil Voting - E-Voting Online\n\n";
        for (let id in candidates) {
            content += `${candidates[id]}: ${counts[id]} suara\n`;
        }
        content += `\nTotal Pemilih: ${total}\n\nDaftar Pemilih:\n`;

        data.forEach((row, index) => {
            content += `${index + 1}. ${row.nama} (${row.nim}) - ${row.password} - Pilih: ${row.calon}\n`;
        });

        const blob = new Blob([content], { type: "text/plain" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "hasil_voting.txt";
        a.click();

        showMessage("✅ Data berhasil diexport!", "success");
    } catch (error) {
        console.error("Gagal export data:", error);
        showMessage("❌ Gagal export data.", "error");
    }
}

// ====================
// UTILITAS TAMBAHAN (Duplikasi)
// ====================
function closeModal() {
    if (window.currentModal) {
        window.currentModal.remove();
        window.currentModal = null;
    }
}

function backToDashboard(buttonId) {
    setLoadingState(buttonId, true);
        // Untuk admin, kembali ke adminLogin
        showPage("adminDashboard");
        setLoadingState(buttonId, false);
}

function logout(buttonId) {
    setLoadingState(buttonId, true);
    setTimeout(() => {
        // Untuk admin, kembali ke adminLogin
        showPage("adminLogin");
        setLoadingState(buttonId, false);
    }, 500);
}

function showMessage(message, type) {
    const toast = document.createElement("div");
    toast.className = `fixed top-4 right-4 z-50 p-4 rounded-lg text-white font-semibold animate-fade-in ${type === "error" ? "bg-red-500" : "bg-green-500"
        }`;
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

// ====================
// EVENT LISTENER
// ====================

document.getElementById("backToVoter").addEventListener("click", () => {
    // Asumsikan ini mengarah ke halaman user, tapi karena terpisah, mungkin redirect atau showPage
    window.location.href = "index.html";  // Ganti dengan URL halaman user jika berbeda
});

// ====================
// INISIALISASI
// ====================
showPage("adminLogin");
updateResults();

