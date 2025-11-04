// ====================
// VARIABEL UTAMA
// ====================
let votes = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0, 10: 0 };  // Bisa diperluas jika kandidat >3
let currentUser = null;
let hasVoted = false;
let kandidatData = [];  // Tambahkan variabel untuk menyimpan data kandidat dinamis

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
async function sendVoteToSupabase(nama, nim, password, calon, calon_id, Angkatan, Prodi) {
  const waktu = new Date().toISOString();

  try {
    const { data, error } = await supabaseClient
      .from('voters')
      .insert([
        { nama, nim, password, calon, calon_id, waktu, Angkatan, Prodi }
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

  currentUser = { nama, nim, password, Angkatan:mahasiswa.Angkatan , Prodi: mahasiswa.Prodi };
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
  // Cari nama kandidat dari kandidatData berdasarkan ID
  const candidate = kandidatData.find(k => k.No == candidateId);
  const candidateName = candidate ? candidate.nama : "Kandidat Tidak Ditemukan";
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
    candidateId,
    voter.Angkatan,
    voter.Prodi,
  );

  hasVoted = true;
  setLoadingState('confirmVoteBtn', false);
}

// ====================
// UPDATE HASIL VOTING
// ====================
// Di script.js, update updateResults
async function updateResults() {
    setLoadingState('refreshBtn', true);
    try {
        // Pastikan kandidatData tersedia
        if (kandidatData.length === 0) await loadKandidat();

        const { data, error } = await supabaseClient.from("voters").select("*");
        if (error) throw error;

        const counts = {};
        kandidatData.forEach(k => counts[k.No] = 0);
        data.forEach(row => {
            if (counts[row.calon_id] !== undefined) counts[row.calon_id]++;
        });

        const total = Object.values(counts).reduce((a, b) => a + b, 0);
        document.getElementById("totalVotes").textContent = total;

        // Update results dinamis
        const resultsContainer = document.getElementById("resultsContainer");
        resultsContainer.innerHTML = kandidatData.map(k => {
            const voteCount = counts[k.No] || 0;
            const percentage = total > 0 ? Math.round((voteCount / total) * 100) : 0;
            return `
                <div class="border border-gray-200 rounded-lg p-6">
                    <div class="flex items-center justify-between mb-4">
                        <div class="flex items-center">
                            <div class="w-12 h-12 mx-auto mb-4 rounded-full overflow-hidden">
                                <img src="/versi5/assets/default.jpg" class="w-full h-full object-cover">
                            </div>
                            <div>
                                <h3 class="font-bold text-gray-800">  ???</h3>
                                <p class="text-sm text-gray-600">Calon No.  ???</p>
                            </div>
                        </div>
                        <div class="text-right">
                            <div class="text-2xl font-bold text-black" id="votes${k.No}">${voteCount}</div>
                            <div class="text-sm text-gray-600" id="percentage${k.No}">${percentage}%</div>
                        </div>
                    </div>
                    <div class="w-full bg-gray-200 rounded-full h-3">
                        <div class="bg-black h-3 rounded-full progress-bar" id="progress${k.No}" style="width: ${percentage}%"></div>
                    </div>
                </div>
            `;
        }).join("");
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
  loadKandidat();

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
// TAMPILKAN KANDIDAT DARI SUPABASE
// ====================
async function loadKandidat() {
  const container = document.getElementById("kandidatList");
  const { data, error } = await supabaseClient.from("kandidat").select("*");
  if (error) {
    console.error(error);
    container.innerHTML = `<p class='text-red-500'>Gagal memuat data kandidat.</p>`;
    return;
  }
  kandidatData = data|| [];  // Simpan data kandidat ke variabel global
  container.innerHTML = data.map(k => `
    <div class="edit-bg rounded-2xl card-shadow p-6 vote-card animate-fade-in">
      <div class="text-center mb-6">
        <div class="borrder w-32 h-32 mx-auto mb-4 rounded-full overflow-hidden">
          <img src="${k.foto_url || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTUwIiBoZWlnaHQ9IjE1MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZGRkIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtc2l6ZT0iMTgiIGZpbGw9IiM5OTkiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5ObyBJbWFnZTwvdGV4dD48L3N2Zz4='}" alt="${k.nama}" class="w-full h-full object-cover" onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTUwIiBoZWlnaHQ9IjE1MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZGRkIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtc2l6ZT0iMTgiIGZpbGw9IiM5OTkiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5ObyBJbWFnZTwvdGV4dD48L3N2Zz4='">
        </div>
        <h3 class="text-xl font-bold text-white">${k.nama}</h3>
        <p class="text-white font-semibold">Calon No. ${k.No}</p>  <!-- Tambahkan nomor kandidat -->
        <p class="text-white text-sm mt-2">Visi: ${k.visi}</p>
        <p class="text-white text-sm mt-2">Misi: ${k.misi}</p>
      </div>
      <button onclick="vote(${k.No})"
        class="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg">
        Pilih Calon Ini
      </button>
    </div>
  `).join("");
}
// ====================
// TAMPILKAN KANDIDAT DARI SUPABASE
// ====================
document.addEventListener("DOMContentLoaded", loadKandidat);


// panggil fungsi ini setelah login berhasil


// ====================
// INISIALISASI
// ====================
updateResults();
showPage("loginForm");

