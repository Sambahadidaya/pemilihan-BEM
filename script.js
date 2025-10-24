// ====================
// VARIABEL UTAMA
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
// KIRIM VOTE KE SUPABASE
// ====================
async function sendVoteToSupabase(nama, nim, password, calon, calon_id) {
  const waktu = new Date().toISOString();

  try {
    const { data, error } = await supabaseClient
      .from('voters')
      .insert([
        { nama, nim, password, calon, calon_id, waktu }
      ]);

    if (error) {
      console.error('Gagal kirim ke Supabase:', error);
      alert("Maaf Anda sudah melakukan Voting!");
    } else {
      console.log('Data berhasil dikirim:', data);
      alert("Vote berhasil disimpan!");
    }
  } catch (err) {
    console.error('Kesalahan jaringan:', err);
  }
}

// ====================
// TAMPILKAN HALAMAN
// ====================
function showPage(pageId) {
  const pages = [
    "loginForm",
    "adminLogin",
    "votingPage",
    "voteConfirmation",
    "resultsPage",
    "adminDashboard"
  ];
  pages.forEach(id => document.getElementById(id)?.classList.add("hidden"));
  document.getElementById(pageId)?.classList.remove("hidden");
}

// ====================
// LOGIN PEMILIH
// ====================
document.getElementById("voterForm").addEventListener("submit", async function (e) {
  e.preventDefault();

  const nama = document.getElementById("nama").value.trim();
  const nim = document.getElementById("nim").value.trim();
  const password = document.getElementById("password").value;

  if (!nama || !nim || !password) {
    showMessage("Mohon lengkapi semua data!", "error");
    return;
  }

 // ====================
  // CEK NIM & PASSWORD DI DATABASE SUPABASE
  // ====================
  const { data: mahasiswa, error } = await supabaseClient
    .from("cek") // tabel tempat menyimpan data mahasiswa
    .select("*")
    .eq("NIM", nim)
    .eq("password", password)
    .single(); // hanya satu baris yang cocok

  if (error || !mahasiswa) {
    alert("NIM atau password salah!");
    return;
  }

  // ====================
  // CEK APAKAH SUDAH PERNAH VOTING
  // ====================
  const { data: existingVoter, cekerror } = await supabaseClient
    .from("voters")
    .select("nim")
    .eq("nim", nim);

  if (error) {
    console.error("Error cek voter:", error);
    showMessage("Terjadi kesalahan saat memeriksa data.", "error");
    return;
  }

  if (existingVoter.length > 0) {
    showMessage("NIM ini sudah pernah melakukan voting!", "error");
    return;
  }

  currentUser = { nama, nim, password };
  document.getElementById("voterName").textContent = nama;
  showPage("votingPage");
});

// ====================
// LOGIN ADMIN
// ====================
document.getElementById("adminForm").addEventListener("submit", function (e) {
  e.preventDefault();

  const password = document.getElementById("adminPassword").value;
  if (password === "panitia25") {
    updateAdminDashboard();
    showPage("adminDashboard");
  } else {
    showMessage("Password admin salah!", "error");
  }
});

// ====================
// VOTE DAN KONFIRMASI
// ====================
function vote(candidateId) {
  if (hasVoted) {
    showMessage("Anda sudah melakukan voting!", "error");
    return;
  }
  const candidateName = candidates[candidateId];
  showVoteConfirmation(candidateId, candidateName);
}

function showVoteConfirmation(candidateId, candidateName) {
  const modal = document.createElement("div");
  modal.className = "fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50";
  modal.innerHTML = `
    <div class="bg-white rounded-2xl p-8 max-w-md mx-4 animate-fade-in">
      <h3 class="text-xl font-bold text-gray-800 mb-4">Konfirmasi Pilihan</h3>
      <p class="text-gray-600 mb-6">Apakah Anda yakin memilih <strong>${candidateName}</strong>?</p>
      <div class="flex gap-4">
        <button onclick="confirmVote(${candidateId}, '${candidateName}')" class="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors">Ya, Pilih</button>
        <button onclick="closeModal()" class="flex-1 bg-gray-500 hover:bg-gray-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors">Batal</button>
      </div>
    </div>`;
  document.body.appendChild(modal);
  window.currentModal = modal;
}

async function confirmVote(candidateId, candidateName) {
  closeModal();
  document.getElementById("selectedCandidate").textContent = candidateName;
  showPage("voteConfirmation");

  const voter = { ...currentUser };
  // ubah di sini ↓↓↓
  await sendVoteToSupabase(
    voter.nama,
    voter.nim,
    voter.password,
    candidateName,
    candidateId
  );

  hasVoted = true;
}


// ====================
// UPDATE HASIL VOTING
// ====================
async function updateResults() {
  try {
    const { data, error } = await supabaseClient.from("voters").select("*");
    if (error) throw error;

    const counts = { 1: 0, 2: 0, 3: 0 };
    if (data && data.length > 0) {
      data.forEach(row => {
        if (counts[row.calon_id] !== undefined) counts[row.calon_id]++;
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
// RESET DATA (ADMIN)
// ====================
function showResetConfirmation() {
  const modal = document.createElement("div");
  modal.className = "fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50";
  modal.innerHTML = `
    <div class="bg-white rounded-2xl p-8 max-w-md mx-4 animate-fade-in">
      <div class="text-center mb-6">
        <h3 class="text-xl font-bold text-gray-800 mb-2">Hapus Semua Data</h3>
        <p class="text-gray-600">Apakah Anda yakin ingin menghapus semua data voting?</p>
      </div>
      <div class="flex gap-4">
        <button onclick="confirmReset()" class="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold py-3 px-6 rounded-lg">Ya, Hapus</button>
        <button onclick="closeModal()" class="flex-1 bg-gray-500 hover:bg-gray-600 text-white font-semibold py-3 px-6 rounded-lg">Batal</button>
      </div>
    </div>`;
  document.body.appendChild(modal);
  window.currentModal = modal;
}

async function confirmReset() {
  try {
    const { error } = await supabaseClient.from("voters").delete();
    if (error) throw error;
    showMessage("Semua data voting berhasil dihapus!", "success");
    updateAdminDashboard();
    closeModal();
  } catch (error) {
    console.error("Gagal hapus data:", error);
    showMessage("Gagal menghapus data!", "error");
  }
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
// UTILITAS TAMBAHAN
// ====================
function closeModal() {
  if (window.currentModal) {
    window.currentModal.remove();
    window.currentModal = null;
  }
}

function logout() {
  currentUser = null;
  hasVoted = false;
  document.getElementById("voterForm").reset();
  document.getElementById("adminForm").reset();
  showPage("loginForm");
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
document.getElementById("backToVoter").addEventListener("click", () => showPage("loginForm"));
document.getElementById("logoutBtn").addEventListener("click", logout);

// ====================
// INISIALISASI
// ====================
updateResults();