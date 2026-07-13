// --- FIREBASE INITIALIZATION ---
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const provider = new firebase.auth.GoogleAuthProvider();

// --- PENGATURAN GOOGLE DRIVE ---
function loadDriveSettings() {
    document.getElementById('driveIdFoto').value = getLocal('drive_folder_foto') || '';
    document.getElementById('driveIdVideo').value = getLocal('drive_folder_video') || '';
    document.getElementById('driveIdJson').value = getLocal('drive_folder_json') || '';
}

function saveDriveSettings() {
    setLocal('drive_folder_foto', document.getElementById('driveIdFoto').value.trim());
    setLocal('drive_folder_video', document.getElementById('driveIdVideo').value.trim());
    setLocal('drive_folder_json', document.getElementById('driveIdJson').value.trim());
    alert("Pengaturan ID Folder Drive berhasil disimpan!");
    toggleModal('modalDriveSettings', false);
}

// --- LOGIKA AUTENTIKASI ---
function initAuth(){
    const a = localStorage.getItem('feathera_session');
    a ? (currentUser = a, tampilkanApp()) : (document.getElementById('authPage').classList.remove('hidden'), document.body.classList.remove('app-ready'));
}

function prosesLoginBerhasil(result) {
    const user = result.user || result; 
    currentUser = user.email;
    googleUserName = user.displayName;
    
    localStorage.setItem('feathera_session', currentUser);
    localStorage.setItem('feathera_google_name', googleUserName);
    
    if (user.photoURL) {
        localStorage.setItem('feathera_google_photo', user.photoURL);
    }
    
    tampilkanApp();
}

async function loginDenganGoogle() {
    const loadingEl = document.getElementById('loginLoading');
    loadingEl.classList.remove('hidden');
    const isNative = window.Capacitor && window.Capacitor.isNative;
    const driveScope = "https://www.googleapis.com/auth/drive";

    try {
        let userCredential;
        if (isNative) {
            await window.Capacitor.Plugins.GoogleAuth.initialize({
                clientId: "324693466741-e69a1abhatnn8mtolggrltn4ttu1ls56.apps.googleusercontent.com",
                scopes: ["profile", "email", driveScope]
            });
            
            const googleUser = await window.Capacitor.Plugins.GoogleAuth.signIn();
            localStorage.setItem('feathera_gdrive_token', googleUser.authentication.accessToken);

            const credential = firebase.auth.GoogleAuthProvider.credential(googleUser.authentication.idToken);
            userCredential = await auth.signInWithCredential(credential);
        } else {
            provider.addScope(driveScope);
            const result = await auth.signInWithPopup(provider);
            localStorage.setItem('feathera_gdrive_token', result.credential.accessToken);
            userCredential = result;
        }
        prosesLoginBerhasil(userCredential);
    } catch (error) {
        loadingEl.classList.add('hidden');
        alert(`INFO DEBUGGING:\n\nPesan: ${error.message}\nKode: ${error.code || "Unknown"}`);
    }
}

async function dapatkanTokenDriveAktif() {
    let tokenActive = localStorage.getItem('feathera_gdrive_token');
    const isNative = window.Capacitor && window.Capacitor.isNative;

    if (isNative) {
        try {
            const refreshData = await window.Capacitor.Plugins.GoogleAuth.refresh();
            tokenActive = refreshData.authentication.accessToken;
            localStorage.setItem('feathera_gdrive_token', tokenActive);
        } catch (err) {
            console.warn("Gagal refresh token:", err);
        }
    } 
    return tokenActive;
}

function prosesAuth(){
    document.getElementById('loginLoading').classList.remove('hidden');
    localStorage.setItem('feathera_session', 'Guest');
    currentUser = 'Guest';

    setTimeout(() => {
        tampilkanApp();
    }, 800);
}

async function logoutApp() {
    if (await customConfirm('Keluar dari aplikasi?')) {
        const isGoogleUser = localStorage.getItem('feathera_google_name');
        const isNative = window.Capacitor && window.Capacitor.isNative;

        try {
            if (isGoogleUser) {
                if (isNative) await window.Capacitor.Plugins.GoogleAuth.signOut();
                await auth.signOut();
            } else {
                ['files_db', 'config_v1', 'playlists', 'activity_log', 'pin_master', 'pin_user', 'recycle_bin'].forEach(key => {
                    delLocal(key);
                });

                if (dbInstance) {
                    dbInstance.close();
                }
                const dbName = currentUser ? 'FeatheraDB_' + currentUser : 'FeatheraDB_Guest';
                indexedDB.deleteDatabase(dbName);
            }
        } catch (error) {
            console.warn("Sesi auth eksternal mungkin sudah kedaluwarsa:", error);
        } finally {
            localStorage.removeItem('feathera_session');
            localStorage.removeItem('feathera_google_name');
            localStorage.removeItem('feathera_google_photo');
            window.location.reload();
        }
    }
}

async function hapusAkun(){
    if('master'!==currentRole) return alert("Akses ditolak. Hanya Master.");
    
    if(await customConfirm("Hapus data akun ini secara permanen? Semua file, folder, playlist, dan log aktifitas akan musnah!")) {
        requestPin(async (role) => {
            if (role !== 'master') {
                return alert("Penghapusan dibatalkan. Verifikasi PIN Master diperlukan untuk menghapus akun.");
            }

            const isGoogleUser = localStorage.getItem('feathera_google_name');
            
            if(!isGoogleUser) {
                let users = JSON.parse(localStorage.getItem('feathera_users') || '{}');
                if(users[currentUser]) {
                    delete users[currentUser];
                    localStorage.setItem('feathera_users', JSON.stringify(users));
                }
            }

            ['files_db', 'config_v1', 'playlists', 'activity_log', 'pin_master', 'pin_user', 'recycle_bin'].forEach(key => {
                delLocal(key);
            });

            localStorage.removeItem('feathera_session');
            localStorage.removeItem('feathera_google_name');
            localStorage.removeItem('feathera_google_photo');
            
            if (dbInstance) {
                dbInstance.close();
            }

            const dbName = currentUser ? 'FeatheraDB_' + currentUser : 'FeatheraDB_Guest';
            const req = indexedDB.deleteDatabase(dbName);
            
            const tuntaskanPenghapusan = (pesan) => {
                alert(pesan);
                setTimeout(() => window.location.reload(), 1500); 
            };

            req.onsuccess = async () => {
                if (isGoogleUser && typeof auth !== 'undefined') {
                    try {
                        const isNative = window.Capacitor && window.Capacitor.isNative;
                        if (isNative) await window.Capacitor.Plugins.GoogleAuth.signOut();
                        await auth.signOut();
                    } catch (e) {
                        console.warn("Gagal memutus sesi cloud secara sempurna:", e);
                    }
                    tuntaskanPenghapusan("Data lokal Akun Google berhasil dihapus dan sesi diputus.");
                } else {
                    tuntaskanPenghapusan("Akun Guest beserta seluruh datanya berhasil dimusnahkan.");
                }
            };

            req.onerror = () => tuntaskanPenghapusan("Akun dihapus, namun ada file media lokal yang gagal dibersihkan.");
            req.onblocked = () => tuntaskanPenghapusan("Database terkunci oleh sistem. Memuat ulang untuk mereset sesi...");
        }, "Verifikasi PIN Master");
    }
}

// --- LOGIKA SISTEM PIN ---
function requestPin(a,b="Masukkan PIN"){
    pinActionCallback=a;
    document.getElementById('pinTitle').innerText=b;
    document.getElementById('inputPin').value='';
    toggleModal('modalPin', true);
    document.getElementById('pinTypeSelect').style.display='none';
    document.getElementById('forgotPin').style.display='block';
    document.getElementById('inputPin').focus();
    isChangingPin=false;
}

async function handleForgotPin() {
    const isGoogleUser = localStorage.getItem('feathera_google_name');
    if (!isGoogleUser) {
        return alert("Fitur lupa PIN hanya tersedia untuk pengguna yang login menggunakan Google. Akun Guest tidak didukung.");
    }

    if (await customConfirm("Untuk memulihkan PIN, Anda harus memverifikasi identitas dengan login ulang menggunakan akun Google Anda. Lanjutkan?")) {
        const isNative = window.Capacitor && window.Capacitor.isNative;
        
        try {
            let verifiedEmail = null;

            if (isNative) {
                const googleUser = await window.Capacitor.Plugins.GoogleAuth.signIn();
                verifiedEmail = googleUser.email;
            } else {
                const result = await auth.signInWithPopup(provider);
                verifiedEmail = result.user.email;
            }

            if (verifiedEmail === currentUser) {
                alert("Verifikasi Google berhasil! Silakan buat PIN baru Anda.");
                isChangingPin = true;
                pinChangeTarget = 'user';
                isForgotPinReset = true;
                document.getElementById('inputPin').value = '';
                document.getElementById('pinTitle').innerText = "Buat PIN Baru";
                document.getElementById('forgotPin').style.display = 'none';
                document.getElementById('pinTypeSelect').style.display = 'none';
            } else {
                if (isNative) await window.Capacitor.Plugins.GoogleAuth.signOut();
                alert("Gagal. Email Google yang Anda gunakan untuk verifikasi tidak sama dengan akun yang sedang aktif.");
            }
        } catch (error) {
            alert("Verifikasi dibatalkan atau gagal: " + error.message);
        }
    }
}

function submitPin(){
    const a = document.getElementById('inputPin').value.trim(),
          b = getLocal('pin_master') || '876543',
          c = getLocal('pin_user') || '111111';

    if(a.length < 6) return alert("PIN minimal 6 angka!");

    if(isChangingPin){
        if(isForgotPinReset){
            setLocal('pin_user', a);
            setLocal('pin_master', '876543');
            alert("PIN Baru Berhasil Dibuat!");
            logActivity('Reset PIN', 'PIN diubah via Lupa PIN');
            return cancelPin();
        }

        if(isVerifyingOldPin){
            if(a === c){ 
                isVerifyingOldPin = false;
                document.getElementById('inputPin').value = '';
                document.getElementById('pinTitle').innerText = "Masukkan PIN Baru";
                return; 
            } else {
                alert("PIN Lama Salah!");
                document.getElementById('inputPin').value = '';
                return;
            }
        }

        'master' === pinChangeTarget ? (setLocal('pin_master', a), alert("PIN Master Berhasil Diganti!"), logActivity('Ganti PIN', 'Master PIN diubah')) : (setLocal('pin_user', a), alert("PIN Admin Berhasil Diganti!"), logActivity('Ganti PIN', 'Admin PIN diubah'));
        return cancelPin();
    }

    if(a === b){
        toggleModal('modalPin', false);
        pinActionCallback ? (pinActionCallback('master'), pinActionCallback = null) : setAppRole('master');
    } else if(a === c){
        toggleModal('modalPin', false);
        pinActionCallback ? (pinActionCallback('user'), pinActionCallback = null) : setAppRole('user');
    } else {
        alert("PIN Salah!");
        document.getElementById('inputPin').value='';
    }
}

function cancelPin(){
    toggleModal('modalPin', false);
    pinActionCallback = null;
    isChangingPin = false;
    isForgotPinReset = false;
    isVerifyingOldPin = false;
}

function menuGantiPin(){
    if('none' === currentRole) return alert("Silakan buka kunci terlebih dahulu.");
    isChangingPin = true;
    document.getElementById('inputPin').value = '';
    toggleModal('modalPin', true);
    document.getElementById('forgotPin').style.display = 'none';
    const a = document.getElementById('pinTypeSelect');
    if('master' === currentRole){
        document.getElementById('pinTitle').innerText = "Ganti PIN";
        a.style.display = 'block';
        a.value = 'master';
        pinChangeTarget = 'master';
        a.onchange = () => { pinChangeTarget = a.value };
        isVerifyingOldPin = false;
    } else {
        document.getElementById('pinTitle').innerText = "Verifikasi PIN Lama";
        a.style.display = 'none';
        pinChangeTarget = 'user';
        isVerifyingOldPin = true;
    }
}

// --- LOGIKA AKTIVITAS (ACTIVITY LOG) ---
function logActivity(a, b){
    const c = JSON.parse(getLocal('activity_log') || '[]');
    c.unshift({ id: Date.now(), date: new Date().toLocaleString('id-ID'), action: a, desc: b });
    c.length > 50 && c.pop();
    setLocal('activity_log', JSON.stringify(c));
}

function bukaLogAktifitas(){
    if('none' === currentRole) return alert("Silakan buka kunci terlebih dahulu.");
    const a = JSON.parse(getLocal('activity_log') || '[]');
    const b = document.getElementById('logList');
    const c = a.filter(d => !('user' === currentRole && (d.action === 'Ganti PIN' && d.desc.includes('Master') || d.action === 'Visibility')));
    
    if(0 === c.length){
        b.innerHTML = '<div style="text-align:center; padding:20px; color:#999;">Tidak ada aktifitas.</div>';
    } else {
        let htmlStr = '';
        c.forEach(d => {
            htmlStr += `<div class="log-item"><div class="log-content-wrapper"><div class="log-meta"><span>${d.date}</span><span class="log-action">${d.action}</span></div><div class="log-desc">${d.desc}</div></div>${'master' === currentRole ? `<button class="log-del-btn" onclick="hapusLogItem(${d.id})">${SVG_TRASH}</button>` : ''}</div>`
        });
        b.innerHTML = htmlStr;
    }
    toggleModal('modalSettings', false);
    toggleModal('modalLog', true);
}

async function hapusLogItem(a){
    if(await customConfirm("Hapus log ini?")){
        let b = JSON.parse(getLocal('activity_log') || '[]');
        b = b.filter(c => c.id !== a);
        setLocal('activity_log', JSON.stringify(b));
        bukaLogAktifitas();
    }
}

async function hapusLogAktifitas(){
    'master' === currentRole ? (await customConfirm("Bersihkan semua riwayat log?")) && (delLocal('activity_log'), bukaLogAktifitas()) : alert("Akses Ditolak. Hanya Master.");
}

// --- LOGIKA KUNCI / ROLE UI ---
function initLockState(){
    currentRole = 'none';
    updateLockUI();
}

function toggleLockMode(){
    'none' !== currentRole ? setAppRole('none') : ((currentUser === 'Guest' || currentUser === 'RestoredUser') ? (setAppRole('user'), alert("Sesi Guest: Otomatis masuk sebagai Admin.")) : requestPin(null, "Unlock Akses"));
}

function setAppRole(a){
    currentRole = a;
    updateLockUI();
    filterFiles();
    updateStats(); 
    isSelectionMode ? toggleSelectionMode() : updateSelectCount();
}

function updateLockUI() {
    const btn = document.getElementById('btnLockToggle'), 
          icon = document.getElementById('lockIcon'), 
          text = document.getElementById('lockText'), 
          selMode = document.getElementById('btnSelectMode');
          
    btn.classList.remove('status-master', 'status-locked');
    document.body.classList.remove('locked-mode', 'role-user', 'role-master');
    
    const stateMap = {
        'none':   { cls: 'locked-mode', icon: '🔒', txt: 'Locked', btnCls: 'status-locked', selDisp: 'none' },
        'user':   { cls: 'role-user',   icon: '🔓', txt: 'Admin',  btnCls: 'status-master', selDisp: 'flex' },
        'master': { cls: 'role-master', icon: '👑', txt: 'Master', btnCls: 'status-master', selDisp: 'flex' }
    };
    
    const state = stateMap[currentRole] || stateMap['none'];
    
    document.body.classList.add(state.cls);
    icon.innerText = state.icon;
    text.innerText = state.txt;
    btn.classList.add(state.btnCls);
    selMode.style.display = state.selDisp;
}

function bukaMasterViaSettings(){
    'none' === currentRole ? requestPin(a => { setAppRole(a); toggleModal('modalSettings', false); bukaMaster(); }) : (toggleModal('modalSettings', false), bukaMaster());
}
