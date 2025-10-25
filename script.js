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
// FUNGSI LOADING STATE UNTUK TOMBOL
// ====================
function setLoadingState(buttonId, isLoading) {
  const button = document.getElementById(buttonId);
  if (!button) return;  // Jika tombol tidak ada, skip
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
      const { error: updateError } = await supabaseClient
        .from('cek')
        .update({ StatusVote: 'sudah vote' })
        .eq('NIM', nim);
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
  setLoadingState('loginBtn', true);

  const nama = document.getElementById("nama").value.trim();
  const nim = document.getElementById("nim").value.trim();
  const password = document.getElementById("password").value;

  if (!nama || !nim || !password) {
    showMessage("Mohon lengkapi semua data!", "error");
    setLoadingState('loginBtn', false);
    return;
  }

  const { data: mahasiswa, error } = await supabaseClient
    .from("cek")
    .select("*")
    .eq("NIM", nim)
    .eq("password", password)
    .single();

  if (error || !mahasiswa) {
    alert("NIM atau password salah!");
    setLoadingState('loginBtn', false);
    return;
  }

  const { data: existingVoter, cekerror } = await supabaseClient
    .from("voters")
    .select("nim")
    .eq("nim", nim);

  if (cekerror) {
    console.error("Error Data Pemilihan voter:", cekerror);
    showMessage("Terjadi kesalahan saat memeriksa data.", "error");
    setLoadingState('loginBtn', false);
    return;
  }

  if (existingVoter.length > 0) {
    showMessage("NIM ini sudah pernah melakukan voting!", "error");
    setLoadingState('loginBtn', false);
    return;
  }

  currentUser = { nama, nim, password };
  document.getElementById("voterName").textContent = nama;
  setLoadingState('loginBtn', false);
  showPage("votingPage");
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
        <button id="confirmVoteBtn" onclick="confirmVote(${candidateId}, '${candidateName}')" class="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors">
          <span class="spinner hidden"></span>Ya, Pilih
        </button>
        <button onclick="closeModal()" class="flex-1 bg-gray-500 hover:bg-gray-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors">Batal</button>
      </div>
    </div>`;
  document.body.appendChild(modal);
  window.currentModal = modal;
}

async function confirmVote(candidateId, candidateName) {
  setLoadingState('confirmVoteBtn', true);
  closeModal();
  document.getElementById("selectedCandidate").textContent = candidateName;
  showPage("voteConfirmation");

  const voter = { ...currentUser };
  await sendVoteToSupabase(
    voter.nama,
    voter.nim,
    voter.password,
    candidateName,
    candidateId
  );

  hasVoted = true;
  setLoadingState('confirmVoteBtn', false);
}

// ====================
// UPDATE HASIL VOTING
// ====================
async function updateResults() {
  setLoadingState('refreshBtn', true);
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
  } finally {
    setLoadingState('refreshBtn', false);
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
function showVoting() {
  showPage("votingPage");
}
function showResults() {
  updateResults();
  showPage("resultsPage");
}

function logout(buttonId) {
  setLoadingState(buttonId, true);
  setTimeout(() => {
    currentUser = null;
    hasVoted = false;
    document.getElementById("voterForm").reset();
    document.getElementById("adminForm")?.reset();
    showPage("loginForm");
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
document.getElementById("logoutBtn").addEventListener("click", (e) => logout(e.target.id));
document.getElementById("logoutConfirmBtn").addEventListener("click", (e) => logout(e.target.id));
document.getElementById("logoutResultsBtn").addEventListener("click", (e) => logout(e.target.id));
document.getElementById("showResultsBtn").addEventListener("click", showResults);

// ====================
// INISIALISASI
// ====================
updateResults();
showPage("loginForm");
