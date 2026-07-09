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

    // OVERRIDE DEFAULT ALERT KE CUSTOM TOAST
window.alert = function(message) {
    const container = document.getElementById('toastContainer');
    if (!container) {
        console.log("Alert Fallback:", message);
        return;
    }

    const toast = document.createElement('div');
    toast.className = 'toast-msg';
    
    // Deteksi cerdas: Jika pesan mengandung kata negatif, jadikan warna merah
    const strMsg = String(message).toLowerCase();
    const isError = strMsg.includes('error') || strMsg.includes('gagal') || strMsg.includes('salah') || strMsg.includes('ditolak') || strMsg.includes('peringatan');
    
    if(isError) toast.classList.add('error');

    // Susun isi toast dengan ikon
    toast.innerHTML = `<span style="font-size: 18px;">${isError ? '⚠️' : 'ℹ️'}</span> <div>${message}</div>`;
    container.appendChild(toast);

    // Hilangkan toast otomatis setelah 3 detik
    setTimeout(() => {
        toast.classList.add('fadeOut');
        toast.addEventListener('animationend', () => toast.remove());
    }, 3000);
};

// FUNGSI CUSTOM CONFIRM (ASYNCHRONOUS)
function customConfirm(message) {
    return new Promise((resolve) => {
        const modal = document.getElementById('modalConfirm');
        document.getElementById('confirmMessage').innerText = message;
        
        modal.style.display = 'flex';
        document.body.classList.add('no-scroll');

        // [PEMBARUAN]: Pembersihan Event Listener tanpa merusak struktur DOM
        let btnOk = document.getElementById('btnConfirmOk');
        let btnCancel = document.getElementById('btnConfirmCancel');
        
        const bersihkanModal = () => {
            toggleModal('modalConfirm', false);
            btnOk.onclick = null;
            btnCancel.onclick = null;
        };

        btnOk.onclick = () => { bersihkanModal(); resolve(true); };
        btnCancel.onclick = () => { bersihkanModal(); resolve(false); };
    });
}

// FUNGSI CUSTOM PROMPT (ASYNCHRONOUS)
function customPrompt(message, defaultValue = "", inputType = "text") {
    return new Promise((resolve) => {
        const modal = document.getElementById('modalPrompt');
        const input = document.getElementById('promptInput');
        
        document.getElementById('promptMessage').innerText = message;
        input.type = inputType;
        input.value = defaultValue;
        
        modal.style.display = 'flex';
        document.body.classList.add('no-scroll');
        input.focus(); // Otomatis fokus ke kolom ketik

        const btnOk = document.getElementById('btnPromptOk');
        const btnCancel = document.getElementById('btnPromptCancel');

        const bersihkanModal = () => {
        toggleModal('modalPrompt', false);
        btnOk.onclick = null;
        btnCancel.onclick = null;
    };

        btnOk.onclick = () => { bersihkanModal(); resolve(input.value); };
        btnCancel.onclick = () => { bersihkanModal(); resolve(null); }; // null jika batal
    });
}

const firebaseConfig = {
  apiKey: "AIzaSyDO_AmQ3EHZX-1td2SBcXl9xZKXQ7WgwXM",
  authDomain: "feathera-pro.firebaseapp.com",
  projectId: "feathera-pro",
  storageBucket: "feathera-pro.firebasestorage.app",
  messagingSenderId: "324693466741",
  appId: "1:324693466741:web:b44d677c3af3967effe23c"
};

// Inisialisasi Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const provider = new firebase.auth.GoogleAuthProvider();

let googleUserName = null; // Menyimpan nama asli dari Google

 // FUNGSI HELPER: Menyatukan logika keberhasilan login tanpa redundansi
function prosesLoginBerhasil(result) {
    const user = result.user || result; 
    currentUser = user.email;
    googleUserName = user.displayName;
    
    localStorage.setItem('feathera_session', currentUser);
    localStorage.setItem('feathera_google_name', googleUserName);
    
    // Tangkap foto profil secara instan tanpa perlu observer background
    if (user.photoURL) {
        localStorage.setItem('feathera_google_photo', user.photoURL);
    }
    
    tampilkanApp();
}

async function loginDenganGoogle() {
    const loadingEl = document.getElementById('loginLoading');
    loadingEl.classList.remove('hidden');
    const isNative = window.Capacitor && window.Capacitor.isNative;
    const driveScope = "https://www.googleapis.com/auth/drive.file";

    try {
        let userCredential;
        if (isNative) {
            await window.Capacitor.Plugins.GoogleAuth.initialize({
                clientId: "324693466741-e69a1abhatnn8mtolggrltn4ttu1ls56.apps.googleusercontent.com",
                scopes: ["profile", "email", driveScope]
            });
            
            const googleUser = await window.Capacitor.Plugins.GoogleAuth.signIn();
            // Amankan Access Token Google murni untuk kueri upload Drive
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

function prosesAuth(){
    // TAMPILKAN LOADING
    document.getElementById('loginLoading').classList.remove('hidden');

    // Langsung tetapkan sesi sebagai Guest
    localStorage.setItem('feathera_session', 'Guest');
    currentUser = 'Guest';

    // Jeda buatan agar animasi terlihat profesional
    setTimeout(() => {
        tampilkanApp();
    }, 800);
}

// --- END KONFIGURASI FIREBASE ---

let isLongPressTriggered=false,currentUser=null,config=[],flatConfig={},curFilter={l0:'all',l1:'all',l2:'all',l3:'all'},currentFolderId=null,editingCard=null,nodeToEdit=null,uploadMode='file',isSelectionMode=false,isAddMediaMode=false,isDarkMode=false,currentRole='none',pinActionCallback=null,isChangingPin=false,pinChangeTarget='master',isForgotPinReset=false,isVerifyingOldPin=false,dbInstance=null,pressTimer,ytPlayer=null,ytInterval=null,currentTextContent="",currentSortOpt=localStorage.getItem('feathera_sort_opt')||'year_desc',currentViewMode=localStorage.getItem('feathera_view_mode')||'grid';

// FITUR BARU: Intersection Observer untuk Lazy Loading rendering gambar/blob
const lazyLoadObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            const card = entry.target;
            refreshCardIcon(card);
            observer.unobserve(card); // Hentikan pantauan setelah dimuat untuk menghemat CPU
        }
    });
}, { rootMargin: '300px 0px', threshold: 0.01 });

// --- HELPER LOCAL STORAGE ---
function getLocal(key) { return localStorage.getItem('feathera_' + key + '_' + currentUser); }
function setLocal(key, val) { localStorage.setItem('feathera_' + key + '_' + currentUser, val); }
function delLocal(key) { localStorage.removeItem('feathera_' + key + '_' + currentUser); }

let movePendingIds=[], isMovePending=false;

const DB_NAME='FeatheraDB',DB_VERSION=2,defaultConfig=[{id:'foto',name:'Foto',icon:'🖼️',children:[]},{id:'video',name:'Video',icon:'🎬',children:[]},{id:'audio',name:'Audio',icon:'🎧',children:[]},{id:'aplikasi',name:'Aplikasi',icon:'📦',children:[]},{id:'dokumen',name:'Dokumen',icon:'📄',children:[]},{id:'catatan',name:'Catatan',icon:'📝',children:[]}],
SVG_PLAY_CIRCLE=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>`,
SVG_PAUSE_CIRCLE=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>`,
SVG_TRASH=`<svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle;"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>`,
SVG_DOWNLOAD=`<svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle;"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>`, SVG_SHARE=`<svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle;"><circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line></svg>`,
SVG_EDIT=`<svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle;"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>`,
SVG_LYRICS=`<svg width="28px" height="28px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" d="M2.25 6C2.25 5.58579 2.58579 5.25 3 5.25H15C15.4142 5.25 15.75 5.58579 15.75 6C15.75 6.41421 15.4142 6.75 15 6.75H3C2.58579 6.75 2.25 6.41421 2.25 6ZM17 7.25C17.4142 7.25 17.75 7.58579 17.75 8C17.75 9.79493 19.2051 11.25 21 11.25C21.4142 11.25 21.75 11.5858 21.75 12C21.75 12.4142 21.4142 12.75 21 12.75C19.7428 12.75 18.5997 12.2616 17.75 11.4641V16.5C17.75 18.2949 16.2949 19.75 14.5 19.75C12.7051 19.75 11.25 18.2949 11.25 16.5C11.25 14.7051 12.7051 13.25 14.5 13.25C15.1443 13.25 15.7449 13.4375 16.25 13.7609V8C16.25 7.58579 16.5858 7.25 17 7.25ZM16.25 16.5C16.25 15.5335 15.4665 14.75 14.5 14.75C13.5335 14.75 12.75 15.5335 12.75 16.5C12.75 17.4665 13.5335 18.25 14.5 18.25C15.4665 18.25 16.25 17.4665 16.25 16.5ZM2.25 10C2.25 9.58579 2.58579 9.25 3 9.25H13C13.4142 9.25 13.75 9.58579 13.75 10C13.75 10.4142 13.4142 10.75 13 10.75H3C2.58579 10.75 2.25 10.4142 2.25 10ZM2.25 14C2.25 13.5858 2.58579 13.25 3 13.25H9C9.41421 13.25 9.75 13.5858 9.75 14C9.75 14.4142 9.41421 14.75 9 14.75H3C2.58579 14.75 2.25 14.4142 2.25 14ZM2.25 18C2.25 17.5858 2.58579 17.25 3 17.25H8C8.41421 17.25 8.75 17.5858 8.75 18C8.75 18.4142 8.41421 18.75 8 18.75H3C2.58579 18.75 2.25 18.4142 2.25 18Z" fill="#999"/></svg>`,
SVG_COVER=`<svg width="24px" height="24px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M2 6C2 3.79086 3.79086 2 6 2H18C20.2091 2 22 3.79086 22 6V18C22 20.2091 20.2091 22 18 22H6C3.79086 22 2 20.2091 2 18V6Z" stroke="#999" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><circle cx="8.5" cy="8.5" r="2.5" stroke="#999" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M14.5262 12.6211L6 22H18.1328C20.2686 22 22 20.2686 22 18.1328V18C22 17.5335 21.8251 17.3547 21.5099 17.0108L17.4804 12.615C16.6855 11.7479 15.3176 11.7507 14.5262 12.6211Z" stroke="#999" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
SVG_LOOP=`<svg viewBox="0 0 24 24"><path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z"/></svg>`,
SVG_SHUFFLE=`<svg viewBox="0 0 24 24"><path d="M10.59 9.17L5.41 4 4 5.41l5.17 5.17 1.42-1.41zM14.5 4l2.04 2.04L4 18.59 5.41 20 17.96 7.46 20 9.5V4h-5.5zm.33 9.41l-1.41 1.41 3.13 3.13L14.5 20H20v-5.5l-2.04 2.04-3.13-3.13z"/></svg>`,
SVG_ONE=`<svg viewBox="0 0 24 24"><path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4zm-4-2V9h-1l-2 1v1h1.5v4H13z"/></svg>`,
SVG_EYE_OPEN=`<svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle;"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>`,
SVG_EYE_CLOSED=`<svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle;"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>`,
SVG_WRENCH=`<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="pointer-events: none;"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path></svg>`,
SVG_SELECT_ACTIVE=`<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#4CAF50" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="pointer-events: none;"><circle cx="12" cy="12" r="10" fill="transparent"></circle><path d="M7 12.5l3.5 3.5 7-8"></path></svg>`,
SVG_SELECT_INACTIVE=`<svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="12" fill="#4CAF50"/><path d="M7 12.5L10.5 16L17 8" stroke="#ffffff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
SVG_CANCEL=`<svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle;"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`,
SVG_MORE_VERT=`<svg viewBox="0 0 24 24" style="width:18px;height:18px;fill:currentColor"><path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/></svg>`,
SVG_TAB_NOTE=`<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>`,
SVG_TAB_FILE=`<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>`,
SVG_TAB_MEMORI=`<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>`,
SVG_ICON_APK=`<svg class="feather-icon" viewBox="0 0 50 50"><use href="#icon-apk-def"></use></svg>`,
SVG_ICON_EXE=`<svg class="feather-icon" width="24" height="24" viewBox="0 0 24 24"><use href="#icon-exe-def"></use></svg>`,
SVG_ICON_PDF=`<svg style="margin-top:5px" width="44px" height="44px" viewBox="0 0 24 24"><use href="#icon-pdf-def"></use></svg>`,
SVG_ICON_DOC_MS=`<svg width="50" height="48" viewBox="-0.12979372698077785 0 32.12979372698078 32"><use href="#icon-doc-ms-def"></use></svg>`,
SVG_ICON_XLS=`<svg width="50" height="48" viewBox="-0.12979372698077785 0 32.12979372698078 32"><use href="#icon-xls-def"></use></svg>`,
SVG_ICON_PPT=`<svg width="50" height="48" viewBox="-0.12979372698077785 0 32.152389301176754 32"><use href="#icon-ppt-def"></use></svg>`,
SVG_ICON_DOC_FALLBACK=`<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" class="feather-icon"><path d="M14 2H6C4.9 2 4 2.9 4 4V20C4 21.1 4.9 22 6 22H18C19.1 22 20 21.1 20 20V8L14 2Z" fill="#757575"/><path d="M14 2V8H20" fill="#424242"/><path d="M8 13H16M8 17H16M8 9H11" stroke="white" stroke-width="2" stroke-linecap="round"/></svg>`,
SVG_ICON_TXT=`<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" class="feather-icon"><path d="M15 3H9C7.8954 3 7 3.8954 7 5V19C7 20.1046 7.8954 21 9 21H15C16.1046 21 17 20.1046 17 19V5C17 3.8954 16.1046 3 15 3Z" fill="#e0e0e0" stroke="#757575" stroke-width="1.5"/><line x1="9.5" y1="8.5" x2="14.5" y2="8.5" stroke="#9e9e9e" stroke-width="1.5" stroke-linecap="round"/><line x1="9.5" y1="12.5" x2="14.5" y2="12.5" stroke="#9e9e9e" stroke-width="1.5" stroke-linecap="round"/><line x1="9.5" y1="16.5" x2="12.5" y2="16.5" stroke="#9e9e9e" stroke-width="1.5" stroke-linecap="round"/><path d="M9 2V4M12 2V4M15 2V4" stroke="#616161" stroke-width="2" stroke-linecap="round"/></svg>`,
SVG_ICON_DEFAULT=`<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" class="feather-icon"><path d="M15 3H9C7.8954 3 7 3.8954 7 5V19C7 20.1046 7.8954 21 9 21H15C16.1046 21 17 20.1046 17 19V5C17 3.8954 16.1046 3 15 3Z" fill="#e0e0e0" stroke="#757575" stroke-width="1.5"/><line x1="9.5" y1="8.5" x2="14.5" y2="8.5" stroke="#9e9e9e" stroke-width="1.5" stroke-linecap="round"/><line x1="9.5" y1="12.5" x2="14.5" y2="12.5" stroke="#9e9e9e" stroke-width="1.5" stroke-linecap="round"/><line x1="9.5" y1="16.5" x2="12.5" y2="16.5" stroke="#9e9e9e" stroke-width="1.5" stroke-linecap="round"/><path d="M9 2V4M12 2V4M15 2V4" stroke="#616161" stroke-width="2" stroke-linecap="round"/></svg>`,
SVG_ICON_ZIP=`<svg class="feather-icon" viewBox="0 0 24 24" fill="none" stroke="#9E9E9E" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"></rect><path d="M12 4v7"></path><path d="M10 11h4v4h-4z"></path></svg>`,
SVG_ICON_VIDEO=`<svg version="1.1" id="Layer_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="44" height="44" x="20px" y="20px" viewBox="0 0 512 512" style="enable-background:new 0 0 512 512;" xml:space="preserve"><g><path d="M512,125.4h-52.2v52.2H512v52.2h-52.2v52.2H512v52.2h-52.2v52.2H512V418c0,5.6-2.1,10.4-6.3,14.6 c-4.2,4.2-9.1,6.3-14.6,6.3H20.9c-5.6,0-10.4-2.1-14.6-6.3C2.1,428.4,0,423.5,0,418v-31.3h52.2v-52.2H0v-52.2h52.2v-52.2H0v-52.2 h52.2v-52.2H0V94c0-6.3,2.1-11.3,6.3-15.2s9.1-5.7,14.6-5.7h470.2c5.6,0,10.4,1.9,14.6,5.7S512,87.8,512,94V125.4 M198.5,334.4 L329.1,256l-130.6-78.4V334.4" fill="rgba(180,180,180,0.3)"/></g></svg>`,
SVG_ICON_AUDIO=`<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" class="feather-icon" style="width: 50px; height: 50px;"><path d="M3 10V14" stroke="#29465B" stroke-width="1.2" stroke-linecap="round"/><path d="M6 7V17" stroke="#29465B" stroke-width="1.2" stroke-linecap="round"/><path d="M9 4V20" stroke="#29465B" stroke-width="1.2" stroke-linecap="round"/><path d="M12 9V15" stroke="#29465B" stroke-width="1.2" stroke-linecap="round"/><path d="M15 6V18" stroke="#29465B" stroke-width="1.2" stroke-linecap="round"/><path d="M18 10V14" stroke="#29465B" stroke-width="1.2" stroke-linecap="round"/><path d="M21 11V13" stroke="#29465B" stroke-width="1.2" stroke-linecap="round"/></svg>`,
SVG_CHEVRON_UP=`<svg viewBox="0 0 24 24" width="24" height="24" fill="rgba(180,180,180,1)"><path d="M7.41 15.41L12 10.83l4.59 4.58L18 14l-6-6-6 6z"/></svg>`, SVG_ICON_UNKNOWN=`<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather-icon" style="opacity:0.8;"><circle cx="12" cy="12" r="10"></circle><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>`;
SVG_ICON_YOUTUBE=`<svg width="55" height="55" viewBox="0 0 24 24" style="filter: drop-shadow(0 1px 2px rgba(0,0,0,0.3));"><path fill="#FF0000" d="M21.58 7.19c-.23-.86-.91-1.54-1.77-1.77C18.25 5 12 5 12 5s-6.25 0-7.81.42c-.86.23-1.54.91-1.77 1.77C2 8.75 2 12 2 12s0 3.25.42 4.81c.23.86.91 1.54 1.77 1.77C5.75 19 12 19 12 19s6.25 0 7.81-.42c.86-.23 1.54-.91 1.77-1.77C22 15.25 22 12 22 12s0-3.25-.42-4.81z"/><path fill="#FFFFFF" d="M10 15V9l5.2 3-5.2 3z"/></svg>`,
SVG_LINK=`<svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle;"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>`,
SVG_UNLINK=`<svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle;"><path d="M18.84 12.25l1.72-1.71h-.01a5 5 0 0 0-7.07-7.07l-1.72 1.71v.01"></path><path d="M5.17 11.75l-1.71 1.71a5 5 0 0 0 7.07 7.07l1.71-1.71"></path><line x1="8" y1="2" x2="8" y2="5"></line><line x1="2" y1="8" x2="5" y2="8"></line><line x1="16" y1="19" x2="16" y2="22"></line><line x1="19" y1="16" x2="22" y2="16"></line></svg>`,

window.targetPlaylistIndexForAdd=null;

function initDB(){return new Promise((a,b)=>{const dbName = currentUser ? 'FeatheraDB_' + currentUser : 'FeatheraDB_Guest'; const c=indexedDB.open(dbName,DB_VERSION);c.onupgradeneeded=d=>{const e=d.target.result;e.objectStoreNames.contains('files')||e.createObjectStore('files');e.objectStoreNames.contains('covers')||e.createObjectStore('covers')},c.onsuccess=d=>{dbInstance=d.target.result;a(dbInstance)},c.onerror=d=>b(d)})}
function dbOp(s, o, k, v) {     return new Promise((resolve, reject) => {         if (!dbInstance) return reject("DB not ready");         const mode = o === 'get' ? 'readonly' : 'readwrite';         const tx = dbInstance.transaction([s], mode);         const store = tx.objectStore(s);         let rq;                  if (o === 'put') {             rq = store.put(v, k);         } else if (o === 'get') {             rq = store.get(k);             rq.onsuccess = () => resolve(rq.result);         } else {             rq = store.delete(k);         }                  tx.oncomplete = () => {             if (o !== 'get') resolve();         };         tx.onerror = (e) => reject(e);     }); }
function dbSimpanFile(a,b){return dbOp('files','put',a,b)}
function dbAmbilFile(a){return dbOp('files','get',a)}
function dbHapusFile(a){ return dbOp('files','delete',a).catch((e)=>{ window.alert("Peringatan: Gagal menghapus file fisik lokal. Penyimpanan mungkin penuh/terkunci. Info: " + e); }) }
function dbSimpanCover(a,b){return dbOp('covers','put',a,b)}
function dbAmbilCover(a){return dbOp('covers','get',a)}
function dbHapusCover(a){ return dbOp('covers','delete',a).catch((e)=>{ window.alert("Peringatan: Gagal menghapus thumbnail lokal. Penyimpanan mungkin penuh/terkunci. Info: " + e); }) }

document.addEventListener("DOMContentLoaded",()=>{
    initAuth();

    // --- HANDLER TOMBOL KEMBALI (BACK BUTTON) HP ---
    window.history.pushState({ noBackExitsApp: true }, '');
    window.addEventListener('popstate', async function(event) {
        // Tahan state agar aplikasi tidak langsung tertutup
        window.history.pushState({ noBackExitsApp: true }, '');
        
        // Panggil modal konfirmasi kustom yang sudah seragam
        const isConfirmed = await customConfirm("Apakah Anda yakin ingin keluar dari Feathera Gallery?");
        if (isConfirmed) {
            // Eksekusi keluar aplikasi (kompatibel untuk Browser & PWA Android/iOS)
            window.history.go(-2);
            setTimeout(() => window.close(), 300);
        }
    });
    // -----------------------------------------------

    document.getElementById('btnScrollTop').innerHTML=SVG_CHEVRON_UP;
    document.getElementById('btnDownloadTxt').innerHTML = SVG_DOWNLOAD + ' Download';
    document.getElementById('btnShareTxt').innerHTML = SVG_SHARE + ' Bagikan';
    document.body.addEventListener('click', tutupSemuaMenu);
        document.getElementById('btnFsDownload').innerHTML = SVG_DOWNLOAD;
    document.getElementById('btnFsClose').innerHTML = SVG_CANCEL;

    // Fitur klik area kosong untuk menutup Menu Pindah tanpa membatalkan seleksi
    document.getElementById('pasteMenu').addEventListener('click', function(e) {
        if (e.target === this) {
            toggleModal('pasteMenu', false);
        }
    }); // PERBAIKAN: Penutup event listener pasteMenu ditambahkan di sini

    // Event Delegation untuk fileGrid
    const fileGrid = document.getElementById('fileGrid');
    
    fileGrid.addEventListener('click', (e) => {
        // Cegah klik palsu setelah long-press selesai
        if (isLongPressTriggered) {
            isLongPressTriggered = false;
            e.preventDefault();
            e.stopPropagation();
            return;
        }
        const card = e.target.closest('.card');
        if(card && !e.target.closest('.menu-dots')) cardClickHandler(card);
    });
    
    // Matikan pop-up sistem saat ditahan pada kartu DAN area visual media player
    window.addEventListener('contextmenu', (e) => {
        if(e.target.closest('.card') || e.target.closest('.mp-visual')) {
            e.preventDefault();
            e.stopPropagation();
        }
    });

    document.getElementById('fLocalFile').addEventListener('change',function(e){
        if(this.files&&this.files.length>0){
            let name=this.files[0].name;
            const fieldName=document.getElementById('fName');
            if(!fieldName.value)fieldName.value=name;
        }
    });
    
        // [PEMBARUAN]: Auto-deteksi Metadata dari Appwrite URL
    document.getElementById('fImgUrl').addEventListener('input', async function(e) {
        const url = this.value.trim();
        const nameInput = document.getElementById('fName');
        
        // Cek apakah URL valid dari struktur storage Appwrite
        if (url.includes('/v1/storage/buckets/') && url.includes('/files/')) {
            try {
                // Transformasi URL endpoint View/Download menjadi endpoint Metadata API
                const apiUrl = url.replace(/\/files\/([^\/]+)\/(view|download)/, '/files/$1');
                
                const response = await fetch(apiUrl);
                if (response.ok) {
                    const data = await response.json();
                    if (data.name) {
                        // Isi otomatis jika input nama masih kosong atau default
                        if (!nameInput.value || nameInput.value === 'Memori Baru') {
                            nameInput.value = data.name;
                        }
                    }
                }
            } catch (err) {
                console.warn("Gagal mengekstrak metadata Appwrite:", err);
            }
        }
    });

    // --- Logika Splash Screen ---
    setTimeout(() => {
        const splash = document.getElementById('splashScreen');
        if (splash) {
            splash.classList.add('fade-out');
            // Hapus elemen dari DOM secara permanen setelah transisi pudar selesai
            setTimeout(() => splash.remove(), 600);
        }
    }, 2200); // 2.2 Detik durasi tampil sebelum menghilang

    // FITUR DICE: Memilih dan membuka file acak secara global (termasuk dalam folder)
    const diceBtn = document.getElementById('diceBtn');
    if (diceBtn) {
        diceBtn.addEventListener('click', () => {
            const availableCards = document.querySelectorAll('.card[data-itemType="file"]:not(.is-hidden-file)');
            if (availableCards.length === 0) return;
            
            const randomIndex = Math.floor(Math.random() * availableCards.length);
            const selectedCard = availableCards[randomIndex];
            
            if (selectedCard.style.display !== 'none') {
                selectedCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
            setTimeout(() => selectedCard.click(), 300);
        });
    }

}); // PERBAIKAN: Penutup utama blok DOMContentLoaded yang benar

function initAuth(){const a=localStorage.getItem('feathera_session');a?(currentUser=a,tampilkanApp()):(document.getElementById('authPage').classList.remove('hidden'),document.body.classList.remove('app-ready'))}

function tampilkanApp() {     
    // 1. Sembunyikan overlay loading login jika ada
    const loginLoad = document.getElementById('loginLoading');
    if(loginLoad) loginLoad.classList.add('hidden');
    
    // 2. Sembunyikan Halaman Login
    document.getElementById('authPage').classList.add('hidden');   
    
    // 3. MUNCULKAN ELEMEN UTAMA APLIKASI (Ini bagian krusial yang sebelumnya terhapus)
    document.getElementById('mainHeader').classList.remove('hidden');
    document.getElementById('mainContent').classList.remove('hidden');
    document.getElementById('mainNav').classList.remove('hidden');
    document.getElementById('dynamicChipsArea').classList.remove('hidden');

    // 4. Atur Nama Tampilan User & UI Profil
    const savedGoogleName = localStorage.getItem('feathera_google_name');
    let displayName = savedGoogleName ? savedGoogleName.split(' ')[0] : (currentUser === 'RestoredUser' ? 'Guest' : currentUser);

    document.querySelector('.header-title h1').innerHTML = `<span style="text-transform: capitalize; max-width: 150px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; display: inline-block; vertical-align: bottom;">${displayName}</span> <span class="gallery-style">Gallery</span>`;     
    document.getElementById('sortOption').value = currentSortOpt; // Sinkronisasi UI sorting
    if(currentViewMode === 'list') document.getElementById('fileGrid').classList.add('list-view');
    
    // [AWAL] LOGIKA UPDATE UI PROFIL
    const profileNameEl = document.getElementById('userProfileName');
    const profileEmailEl = document.getElementById('userProfileEmail');
    const profilePicEl = document.getElementById('userProfilePic');
    const profileFallbackEl = document.getElementById('userProfileIconFallback');

    // MENGAMBIL ELEMEN TOMBOL PENGATURAN
    const btnPin = document.getElementById('btnGantiPinSettings');
    const btnLog = document.getElementById('btnLogAktifitasSettings');
    const btnDrive = document.getElementById('btnDriveSettings'); // <--- ELEMEN BARU

    if (savedGoogleName) {
        profileNameEl.innerText = savedGoogleName;

        profileEmailEl.innerText = currentUser;
        profileEmailEl.style.display = 'block';
        
        const savedPhoto = localStorage.getItem('feathera_google_photo');
        if (savedPhoto) {
            profilePicEl.src = savedPhoto;
            profilePicEl.style.display = 'block';
            profileFallbackEl.style.display = 'none';
        }
        
        // Pastikan fitur tampil jika login dengan Google
        if(btnPin) btnPin.style.display = 'flex';
        if(btnLog) btnLog.style.display = 'flex';
        if(btnDrive) btnDrive.style.display = 'flex'; // <--- TAMPILKAN
    } else {
        let guestName = currentUser === 'RestoredUser' ? 'Guest' : currentUser;
        profileNameEl.innerText = guestName;
        profileEmailEl.style.display = 'none';
        profilePicEl.style.display = 'none';
        profileFallbackEl.style.display = 'flex';
        
        // Sembunyikan fitur Ganti PIN, Log Aktifitas, dan Pengaturan Drive untuk Guest
        if(btnPin) btnPin.style.display = 'none';
        if(btnLog) btnLog.style.display = 'none';
        if(btnDrive) btnDrive.style.display = 'none'; // <--- SEMBUNYIKAN
    }
    // [AKHIR] LOGIKA UPDATE UI PROFIL

    setTimeout(() => document.body.classList.add('app-ready'), 100);     
    
    // 5. Eksekusi Database dan Pemuatan Data
    initDB().then(() => {
        initLockState();     
        initDarkMode();     
        loadConfig();     
        muatDariLokal();     
        MediaPlayer.init(); 
    }).catch(err => console.error("Gagal inisialisasi database:", err));
}

async function logoutApp() {
    if (await customConfirm('Keluar dari aplikasi?')) {
        const isGoogleUser = localStorage.getItem('feathera_google_name');
        const isNative = window.Capacitor && window.Capacitor.isNative;

        try {
            if (isGoogleUser) {
                // Putuskan sesi Google Native di APK secara tuntas
                if (isNative) await window.Capacitor.Plugins.GoogleAuth.signOut();
                // Putuskan sesi Firebase
                await auth.signOut();
            } else {
                // LOGIKA BARU: Hapus semua data lokal jika yang logout adalah Guest
                ['files_db', 'config_v1', 'playlists', 'activity_log', 'pin_master', 'pin_user', 'recycle_bin'].forEach(key => {
                    delLocal(key);
                });

                // Tutup dan hapus IndexedDB penyimpanan file Guest
                if (dbInstance) {
                    dbInstance.close();
                }
                const dbName = currentUser ? 'FeatheraDB_' + currentUser : 'FeatheraDB_Guest';
                indexedDB.deleteDatabase(dbName);
            }
        } catch (error) {
            console.warn("Sesi auth eksternal mungkin sudah kedaluwarsa:", error);
        } finally {
            // Eksekusi pembersihan lokal MUTLAK berjalan terlepas dari error jaringan/cloud
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
        
        // [PEMBARUAN]: Panggil modal requestPin dan pastikan yang dimasukkan adalah PIN Master
        requestPin(async (role) => {
            if (role !== 'master') {
                return alert("Penghapusan dibatalkan. Verifikasi PIN Master diperlukan untuk menghapus akun.");
            }

            const isGoogleUser = localStorage.getItem('feathera_google_name');
            
            // 1. Cabut kredensial dari daftar user (Hanya untuk Guest)
            if(!isGoogleUser) {
                let users = JSON.parse(localStorage.getItem('feathera_users') || '{}');
                if(users[currentUser]) {
                    delete users[currentUser];
                    localStorage.setItem('feathera_users', JSON.stringify(users));
                }
            }

            // 2. Hapus semua data lokal yang terikat dengan email/username ini
            ['files_db', 'config_v1', 'playlists', 'activity_log', 'pin_master', 'pin_user', 'recycle_bin'].forEach(key => {
                delLocal(key);
            });

            // 3. Hapus akses sesinya
            localStorage.removeItem('feathera_session');
            localStorage.removeItem('feathera_google_name');
            localStorage.removeItem('feathera_google_photo');
            
            // 4. Tutup koneksi database yang sedang aktif (SANGAT PENTING agar deleteDatabase tidak terblokir)
            if (dbInstance) {
                dbInstance.close();
            }

            // 5. Hapus IndexedDB lalu putuskan sesi Firebase (Jika Google)
            const dbName = currentUser ? 'FeatheraDB_' + currentUser : 'FeatheraDB_Guest';
            const req = indexedDB.deleteDatabase(dbName);
            
            const tuntaskanPenghapusan = (pesan) => {
                alert(pesan);
                // Beri jeda 1.5 detik agar Toast Custom terbaca sebelum halaman refresh
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

function requestPin(a,b="Masukkan PIN"){pinActionCallback=a,document.getElementById('pinTitle').innerText=b,document.getElementById('inputPin').value='',toggleModal('modalPin', true),document.getElementById('pinTypeSelect').style.display='none',document.getElementById('forgotPin').style.display='block',document.getElementById('inputPin').focus(),isChangingPin=false}
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
                // Jalur 1: APK / Native Capacitor
                const googleUser = await window.Capacitor.Plugins.GoogleAuth.signIn();
                verifiedEmail = googleUser.email;
            } else {
                // Jalur 2: Web Browser (Firebase Popup)
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
                // Failsafe: Jika user salah pilih email saat verifikasi, 
                // putuskan sesi tersebut agar tidak merusak sesi utama aplikasi.
                if (isNative) await window.Capacitor.Plugins.GoogleAuth.signOut();
                alert("Gagal. Email Google yang Anda gunakan untuk verifikasi tidak sama dengan akun yang sedang aktif.");
            }
        } catch (error) {
            alert("Verifikasi dibatalkan atau gagal: " + error.message);
        }
    }
}

function submitPin(){
    const a=document.getElementById('inputPin').value.trim(),
          b=getLocal('pin_master')||'876543',
          c=getLocal('pin_user')||'111111';

    if(a.length<6) return alert("PIN minimal 6 angka!");

    if(isChangingPin){
        if(isForgotPinReset){
            setLocal('pin_user',a);
            setLocal('pin_master','876543');
            alert("PIN Baru Berhasil Dibuat!");
            logActivity('Reset PIN','PIN diubah via Lupa PIN');
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

        'master'===pinChangeTarget?(setLocal('pin_master',a),alert("PIN Master Berhasil Diganti!"),logActivity('Ganti PIN','Master PIN diubah')):(setLocal('pin_user',a),alert("PIN Admin Berhasil Diganti!"),logActivity('Ganti PIN','Admin PIN diubah'));
        return cancelPin();
    }

    if(a===b){
        toggleModal('modalPin', false);
        pinActionCallback?(pinActionCallback('master'),pinActionCallback=null):setAppRole('master');
    } else if(a===c){
        toggleModal('modalPin', false);
        pinActionCallback?(pinActionCallback('user'),pinActionCallback=null):setAppRole('user');
    } else {
        alert("PIN Salah!");
        document.getElementById('inputPin').value='';
    }
}

function cancelPin(){toggleModal('modalPin', false),pinActionCallback=null,isChangingPin=false,isForgotPinReset=false,isVerifyingOldPin=false}

const toggleModal = (id, show) => { document.getElementById(id).style.display = show ? 'flex' : 'none'; cekScrollLayar(); };
let savedScrollY = 0; // Variabel penyimpan koordinat scroll
function cekScrollLayar() {
    const anyModalOpen = Array.from(document.querySelectorAll('.modal')).some(m => m.style.display === 'flex' || m.style.display === 'block');
    const isPlayerMaximized = MediaPlayer.ui && !MediaPlayer.ui.classList.contains('hidden') && !MediaPlayer.minimized;
    const shouldLock = anyModalOpen || isPlayerMaximized;
    
    if (shouldLock) {
        if (!document.body.classList.contains('no-scroll')) {
            // Saat modal terbuka: Bekukan layar di titik scroll saat ini
            savedScrollY = window.scrollY;
            document.body.style.position = 'fixed';
            document.body.style.top = `-${savedScrollY}px`;
            document.body.style.width = '100%';
            document.body.classList.add('no-scroll');
        }
    } else {
        if (document.body.classList.contains('no-scroll')) {
            // Saat modal ditutup: Cairkan layar dan kembalikan ke titik semula
            document.body.style.position = '';
            document.body.style.top = '';
            document.body.style.width = '';
            document.body.classList.remove('no-scroll');
            window.scrollTo(0, savedScrollY);
        }
    }
    document.body.classList.toggle('player-maximized', isPlayerMaximized);
}

function menuGantiPin(){
    if('none'===currentRole)return alert("Silakan buka kunci terlebih dahulu.");
    isChangingPin=true;
    document.getElementById('inputPin').value='';
    toggleModal('modalPin', true);
    document.getElementById('forgotPin').style.display='none';
    const a=document.getElementById('pinTypeSelect');
    if('master'===currentRole){
        document.getElementById('pinTitle').innerText="Ganti PIN";
        a.style.display='block';
        a.value='master';
        pinChangeTarget='master';
        a.onchange=()=>{pinChangeTarget=a.value};
        isVerifyingOldPin=false;
    } else {
        document.getElementById('pinTitle').innerText="Verifikasi PIN Lama";
        a.style.display='none';
        pinChangeTarget='user';
        isVerifyingOldPin=true;
    }
}

function logActivity(a,b){const c=JSON.parse(getLocal('activity_log')||'[]');c.unshift({id:Date.now(),date:new Date().toLocaleString('id-ID'),action:a,desc:b}),c.length>50&&c.pop(),setLocal('activity_log',JSON.stringify(c))}

function bukaLogAktifitas(){if('none'===currentRole)return alert("Silakan buka kunci terlebih dahulu.");const a=JSON.parse(getLocal('activity_log')||'[]'),b=document.getElementById('logList');const c=a.filter(d=>!('user'===currentRole&&(d.action==='Ganti PIN'&&d.desc.includes('Master')||d.action==='Visibility')));if(0===c.length){b.innerHTML='<div style="text-align:center; padding:20px; color:#999;">Tidak ada aktifitas.</div>';}else{let htmlStr='';c.forEach(d=>{htmlStr+=`<div class="log-item"><div class="log-content-wrapper"><div class="log-meta"><span>${d.date}</span><span class="log-action">${d.action}</span></div><div class="log-desc">${d.desc}</div></div>${'master'===currentRole?`<button class="log-del-btn" onclick="hapusLogItem(${d.id})">${SVG_TRASH}</button>`:''}</div>`});b.innerHTML=htmlStr;}toggleModal('modalSettings', false),toggleModal('modalLog', true)}

async function hapusLogItem(a){if(await customConfirm("Hapus log ini?")){let b=JSON.parse(getLocal('activity_log')||'[]');b=b.filter(c=>c.id!==a),setLocal('activity_log',JSON.stringify(b)),bukaLogAktifitas()}}

async function hapusLogAktifitas(){'master'===currentRole?(await customConfirm("Bersihkan semua riwayat log?"))&&(delLocal('activity_log'),bukaLogAktifitas()):alert("Akses Ditolak. Hanya Master.")}

function initDarkMode(){isDarkMode=('true'===localStorage.getItem('feathera_dark_mode')),applyDarkMode()}
function toggleDarkMode(){isDarkMode=!isDarkMode,localStorage.setItem('feathera_dark_mode',isDarkMode),applyDarkMode()}
function applyDarkMode(){const a=document.getElementById('darkModeIcon');isDarkMode?(document.body.classList.add('dark-mode'),a.innerText="☀️"):(document.body.classList.remove('dark-mode'),a.innerText="🌙")}
function initLockState(){currentRole='none',updateLockUI()}
function toggleLockMode(){'none'!==currentRole?setAppRole('none'):((currentUser==='Guest'||currentUser==='RestoredUser')?(setAppRole('user'),alert("Sesi Guest: Otomatis masuk sebagai Admin.")):requestPin(null,"Unlock Akses"))}
function setAppRole(a){currentRole=a,updateLockUI(),filterFiles(),updateStats(); isSelectionMode ? toggleSelectionMode() : updateSelectCount();}
function updateLockUI() {
    const btn = document.getElementById('btnLockToggle'), 
          icon = document.getElementById('lockIcon'), 
          text = document.getElementById('lockText'), 
          selMode = document.getElementById('btnSelectMode');
          
    btn.classList.remove('status-master', 'status-locked');
    document.body.classList.remove('locked-mode', 'role-user', 'role-master');
    
    // Objek Peta Status untuk menghindari redundansi logika
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

function bukaMasterViaSettings(){'none'===currentRole?requestPin(a=>{setAppRole(a),toggleModal('modalSettings', false),bukaMaster()}):(toggleModal('modalSettings', false),bukaMaster())}
function loadConfig(){config=JSON.parse(getLocal('config_v1')||JSON.stringify(defaultConfig)),flattenConfig(),renderNav(),renderChips(),initMasterTree()}
function flattenConfig(){flatConfig={};const a=(b,c=null)=>{b&&b.forEach(d=>{flatConfig[d.id]={...d,parentId:c},d.children&&a(d.children,d.id)})};a(config)}
let _childrenCache = null, _childrenCacheTimer = null;
function getChildrenMap() {
    if(_childrenCache) return _childrenCache;
    _childrenCache = {};
    document.querySelectorAll('.card').forEach(f => {
        const p = f.getAttribute('data-folderId');
        if(p && p !== 'none') {
            if(!_childrenCache[p]) _childrenCache[p] = [];
            _childrenCache[p].push({id: f.getAttribute('data-id'), type: f.getAttribute('data-itemType')});
        }
    });
    clearTimeout(_childrenCacheTimer);
    _childrenCacheTimer = setTimeout(() => _childrenCache = null, 50);
    return _childrenCache;
}
function getAllDescendantIds(a){let b=[];const map=getChildrenMap();const d=e=>{if(map[e]){map[e].forEach(child=>{b.push(child.id);if(child.type==='folder')d(child.id)})}};return d(a),b}

function linkify(a){return a?a.replace(/(https?:\/\/[^\s]+)/g,b=>{try{const c=new URL(b).hostname;return `<a href="${b}" target="_blank" style="display:inline-flex; align-items:center; gap:4px; text-decoration:none; vertical-align:middle;"><img src="https://www.google.com/s2/favicons?domain=${c}&sz=32" style="width:1em; height:1em; border-radius:2px;" onerror="this.style.display='none'"><span style="text-decoration:underline;">${b}</span></a>`}catch(d){return `<a href="${b}" target="_blank">${b}</a>`}}):""}
function getYoutubeId(a){if(!a||'LOCAL_FILE'===a)return null;const b=a.match(/^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/);return b&&11===b[2].length?b[2]:null}
function getDriveId(a){if(!a||'LOCAL_FILE'===a)return null;const b=a.match(/(?:file\/d\/|id=|open\?id=)([^/&?]+)/);return b?b[1]:null}
function getDirectUrl(a){
    if(!a||'LOCAL_FILE'===a)return a;
    let b=a.trim();
    
    // [MODIFIKASI] Sanitasi khusus untuk link Supabase
    if(b.includes('supabase.co')){
        // 1. Buang parameter download agar bisa di-streaming oleh HTML5 Player
        b = b.replace(/[?&]download(=[^&]*)?(?=&|$)/, '');
        // 2. Encode spasi mentah menjadi %20 agar tidak error di Webview Android/iOS
        b = b.replace(/ /g, '%20');
    }
    
    if(b.includes('dropbox.com'))return b.replace('www.dropbox.com','dl.dropboxusercontent.com').replace(/[?&]dl=[01]/,"");
    const c=getDriveId(b);
    if(c&&(b.includes('drive.google.com')||b.includes('googleusercontent.com'))){
        return `https://www.googleapis.com/drive/v3/files/${c}?alt=media&key=${firebaseConfig.apiKey}&acknowledgeAbuse=true`;
    }
    return b;
}

function getDownloadUrl(a){if(!a||'LOCAL_FILE'===a)return"#";const b=getDriveId(a);return b?`https://drive.google.com/uc?export=download&id=${b}`:a.includes('dropbox.com')?a.replace('www.dropbox.com','dl.dropboxusercontent.com').replace(/[?&]dl=[01]/,""):a.includes('appwrite.io')?a.replace('/view','/download'):(a.includes('supabase.co')&&!a.includes('download'))?(a.includes('?')?a+'&download=':a+'?download='):a}

function getThumbUrl(a){if('LOCAL_FILE'===a)return'LOCAL_FILE';const b=getDriveId(a);if(b&&a.includes('drive.google.com'))return `https://drive.google.com/thumbnail?id=${b}&sz=w400`;if(a.includes('dropbox.com'))return a.replace('www.dropbox.com','dl.dropboxusercontent.com').replace(/[?&]dl=[01]/,"");return a;}

function getPreviewUrl(a){const b=getDriveId(a);return b?`https://drive.google.com/file/d/${b}/preview`:a}
const MEDIA_EXTS = {
    video: ['mp4','mkv','mov','avi','webm','3gp','flv','m4v'],
    audio: ['mp3','wav','ogg','m4a','aac','flac','wma'],
    image: ['jpeg','jpg','gif','png','webp','bmp','svg','ico','tiff'],
    text: ['txt','json','md','js','css','html','xml','log','csv'],
    app: ['apk','exe','dmg','iso','bat','sh','bin','msi'],
    archive: ['zip','rar','7z','tar','gz','bz2'],
    doc: ['pdf','doc','docx','xls','xlsx','ppt','pptx']
};

// Pindahkan fungsi helper checkExt ke ruang lingkup global agar tidak dirender berulang
const checkExt = (arr, str) => arr.some(ext => str.endsWith('.'+ext));

function getMediaType(a,b=""){
    if(!a||'none'===a)return'none';
    const g=b.toLowerCase();
    
    if('LOCAL_FILE'===a){
        if(-1===g.indexOf('.'))return'unknown_local';
        if(checkExt(MEDIA_EXTS.video, g)) return 'video';
        if(checkExt(MEDIA_EXTS.audio, g)) return 'audio';
        if(checkExt(MEDIA_EXTS.image, g)) return 'image';
        return 'other';
    }
    
    if(getYoutubeId(a))return'video';
    
    const c=a.split('?')[0].toLowerCase();
    const isExtMatch = arr => checkExt(arr, c) || checkExt(arr, g);
    
    for(const type in MEDIA_EXTS){
    if(isExtMatch(MEDIA_EXTS[type])) return type;
}

    if(a.includes('drive.google.com')||a.includes('googleusercontent.com')){
        return'image';
    }
    
    if(a.includes('dropbox.com')){
        if(isExtMatch(MEDIA_EXTS.audio)) return 'audio';
        if(isExtMatch(MEDIA_EXTS.video)) return 'video';
    }
    return 'other';
}

function getStorageIcon(imgStr) {
    // [PEMBARUAN]: Proteksi Type Safety untuk mencegah Fatal Error String.prototype.startsWith
    if (!imgStr || typeof imgStr !== 'string' || imgStr === 'none') return '';
    
    const isLocal = imgStr === 'LOCAL_FILE' || imgStr.startsWith('NATIVE:');
    const isYoutube = !isLocal && !!getYoutubeId(imgStr);
    const isDrive = !isLocal && !isYoutube && !!getDriveId(imgStr);
    const isSupabase = !isLocal && !isYoutube && !isDrive && imgStr.includes('supabase.co');
    const isAppwrite = !isLocal && !isYoutube && !isDrive && !isSupabase && imgStr.includes('appwrite.io');
    const isDropbox = !isLocal && !isYoutube && !isDrive && !isSupabase && !isAppwrite && imgStr.includes('dropbox.com');

    const baseStyle = "width: 14px; height: 14px; object-fit: contain; vertical-align: text-bottom; margin-right: 4px; display: inline-block; opacity: 0.8;";
    
    if (isLocal) return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="${baseStyle}"><path d="M6 2h9l5 5v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z"></path><path d="M8 2v4"></path><path d="M12 2v4"></path><path d="M16 4v2"></path></svg>`;
    if (isYoutube) return `<svg viewBox="0 0 24 24" style="${baseStyle}"><path fill="#FF0000" d="M21.58 7.19c-.23-.86-.91-1.54-1.77-1.77C18.25 5 12 5 12 5s-6.25 0-7.81.42c-.86.23-1.54.91-1.77 1.77C2 8.75 2 12 2 12s0 3.25.42 4.81c.23.86.91 1.54 1.77 1.77C5.75 19 12 19 12 19s6.25 0 7.81-.42c.86-.23 1.54-.91 1.77-1.77C22 15.25 22 12 22 12s0-3.25-.42-4.81z"/><path fill="#FFFFFF" d="M10 15V9l5.2 3-5.2 3z"/></svg>`;
    if (isDrive) return `<img src="https://upload.wikimedia.org/wikipedia/commons/1/12/Google_Drive_icon_%282020%29.svg" style="${baseStyle}" alt="Drive">`;
    if (isSupabase) return `<svg viewBox="0 0 24 24" fill="#3ECF8E" style="${baseStyle}"><path d="M11.99 2.21L2.83 11.36h7.24v10.42l9.16-9.15h-7.24V2.21z"/></svg>`;
    if (isAppwrite) return `<img src="https://www.google.com/s2/favicons?domain=appwrite.io&sz=32" style="${baseStyle}" alt="Appwrite">`;
    if (isDropbox) return `<img src="https://upload.wikimedia.org/wikipedia/commons/7/78/Dropbox_Icon.svg" style="${baseStyle}" alt="Dropbox">`;
    return '';
}

function getExtIcon(a,b=""){
    const c=b.toLowerCase();
    if('unknown_local'===a || 'unknown'===a)return SVG_ICON_UNKNOWN;
  
    // --- APP / APK / EXE ---
    if('app'===a){
        if(c.endsWith('.apk')) return SVG_ICON_APK;
        if(c.endsWith('.exe')) return SVG_ICON_EXE;
        return '📦';
    }
    
    // --- DOC / MS OFFICE / PDF ---
    if('doc'===a){
        if(c.endsWith('.pdf')) return SVG_ICON_PDF;
        if(c.match(/\.(doc|docx)$/)) return SVG_ICON_DOC_MS;
        if(c.match(/\.(xls|xlsx)$/)) return SVG_ICON_XLS;
        if(c.match(/\.(ppt|pptx)$/)) return SVG_ICON_PPT;
        return SVG_ICON_DOC_FALLBACK;
    }

    return 'archive'===a ? SVG_ICON_ZIP : 'video'===a ? SVG_ICON_VIDEO : 'audio'===a ? SVG_ICON_AUDIO : 'text'===a ? SVG_ICON_TXT : SVG_ICON_DEFAULT;
}

function renderNav() {
    const a = document.getElementById('mainNav');
    let navHtml = '';
    
    if (!isAddMediaMode) {
        navHtml += `<button class="nav-btn ${'all'===curFilter.l0?'active':''}" onclick="setFilter(0, 'all')"><span>🏠</span>Semua</button>`;
    }
    
    navHtml += `<button class="nav-btn ${curFilter.l0==='audiovideo'?'active':''}" onclick="setFilter(0, 'audiovideo')"><span>♾️</span>All Media</button>`;
    if (!isAddMediaMode) {
    navHtml += `<button class="nav-btn ${curFilter.l0==='favorite'?'active':''}" onclick="setFilter(0, 'favorite')"><span>⭐</span>Favorite</button>`;
}
    
    const cats = isAddMediaMode ? ['video', 'audio'].map(id => config.find(x => x.id === id)).filter(Boolean) : config;
    cats.forEach(b => {
        navHtml += `<button class="nav-btn ${curFilter.l0===b.id?'active':''}" onclick="setFilter(0, '${b.id}')"><span>${b.icon||'📁'}</span>${b.name}</button>`;
    });
    
    a.innerHTML = navHtml;
    
    if (isAddMediaMode) {
        const actionDiv = document.createElement('div');
        actionDiv.className = 'nav-batch-actions';
        
        // Deteksi status Pilih Semua menggunakan Native CSS Engine
        const visibleCardsLength = document.querySelectorAll('.card:not([style*="display: none"])').length;
        const selectedCount = document.querySelectorAll('.card.selected:not([style*="display: none"])').length;
        const isAllSelected = visibleCardsLength > 0 && selectedCount === visibleCardsLength;
        const svgIcon = isAllSelected ? SVG_SELECT_ACTIVE : SVG_SELECT_INACTIVE;

        // Tombol Select All dipindah ke Floating Bar
        actionDiv.innerHTML = `
            <button class="btn-neu-round confirm" onclick="tambahKePlaylistBatch()" title="Add">➕</button>
            <button class="btn-neu-round cancel" onclick="keluarModeAddMedia()" title="Batal" style="font-size: 14px;">❌</button>
        `;

        a.appendChild(actionDiv);
    }

    setTimeout(() => { const b = a.querySelector('.nav-btn.active'); b && a.scrollTo({ left: b.offsetLeft - (a.clientWidth / 2) + (b.clientWidth / 2), behavior: 'smooth' }); }, 50);
}

    function renderChips(){
        const a=document.getElementById('dynamicChipsArea');
        
        // 1. Simpan posisi scroll setiap baris chip sebelum elemen dihancurkan
        const oldScrolls = Array.from(a.querySelectorAll('.chip-container')).map(el => el.scrollLeft);
        
        a.innerHTML='';
        
        if(curFilter.l0==='audiovideo'){
            document.body.style.paddingBottom = '150px'; // Kembalikan ke ruang default
            currentFolderId=null;
            filterFiles();
            return;
        }

    // Indeks untuk melacak baris chip yang mana
    let containerIndex = 0;

    const b=(c,d,e,f)=>{
        if(c&&c.length){
            const g=document.createElement('div');
            g.className='chip-container';
            let chipHtml=`<div class="chip ${'all'===e?'active':''}" onclick="setFilter(${d}, 'all')">✨ Semua ${f}</div>`;
            c.forEach(h=>chipHtml+=`<div class="chip ${e===h.id?'active':''}" onclick="setFilter(${d}, '${h.id}')">${h.icon?h.icon+' ':''}${h.name}</div>`);
            g.innerHTML=chipHtml;
            a.appendChild(g);
            
            // 2. Terapkan posisi scroll yang lama secara instan tanpa animasi
            if(oldScrolls[containerIndex] !== undefined) {
                g.scrollLeft = oldScrolls[containerIndex];
            }
            containerIndex++;

            // 3. Baru jalankan animasi mulus menuju tombol yang diklik
            const h=g.querySelector('.chip.active');
            h&&setTimeout(()=>g.scrollTo({left:h.offsetLeft-(g.clientWidth/2)+(h.clientWidth/2),behavior:'smooth'}),50)
        }
    };

    if('all'!==curFilter.l0){
        const c=config.find(d=>d.id===curFilter.l0);
        if(c){
            c.children&&b(c.children,1,curFilter.l1,c.name);
            if('all'!==curFilter.l1){
                const d=c.children.find(d=>d.id===curFilter.l1);
                if(d){
                    d.children&&b(d.children,2,curFilter.l2,d.name);
                        if('all'!==curFilter.l2){
                            const e=d.children.find(d=>d.id===curFilter.l2);
                            if(e){
                                e.children&&b(e.children,3,curFilter.l3,e.name)
                            }
                        }
                    }
                }
            }
        }
        
        // PERBAIKAN: Hitung tinggi dinamis chip area dan sesuaikan padding body
        setTimeout(() => {
            const chipsHeight = a.offsetHeight || 0;
            // 100px adalah jarak aman (70px untuk navbar bawah + 30px ruang lega ekstra)
            document.body.style.paddingBottom = chipsHeight > 0 ? (100 + chipsHeight) + 'px' : '150px';
            updateSelectCount(); // Sinkronisasi posisi Floating FAB & Info
        }, 50);

        currentFolderId=null; 
        filterFiles();
    }

function setFilter(a,b){
    0===a?curFilter={l0:b,l1:'all',l2:'all',l3:'all'}:1===a?(curFilter.l1=b,curFilter.l2='all',curFilter.l3='all'):2===a?(curFilter.l2=b,curFilter.l3='all'):3===a&&(curFilter.l3=b);
    if(1>a) renderNav(); // Re-render nav utama hanya jika level 0 berubah
    currentFolderId=null;
    renderChips();
    
    // Logic seleksi & tampilan (Cegah kalkulasi ganda)
    // [PERBAIKAN]: Hapus `toggleSelectionMode(false)` agar status mode pemilihan tidak reset saat pindah kategori
    updateSelectCount(); 
    
    // Scroll paling ringan tanpa membebani animasi CSS
    window.scrollTo(0, 0);
}

function toggleFavoriteForm() {
    const favInput = document.getElementById('fFavorite');
    const favBtn = document.getElementById('btnFavoriteToggle');
    if (favInput.value === 'false') {
        favInput.value = 'true';
        favBtn.innerHTML = '★';
        favBtn.style.color = '#FFD700';
        favBtn.style.textShadow = '0 1px 2px rgba(0,0,0,0.5)';
    } else {
        favInput.value = 'false';
        favBtn.innerHTML = '☆';
        favBtn.style.color = '#ccc';
        favBtn.style.textShadow = 'none';
    }
}

function toggleSourceType() {
    const isNative = window.Capacitor && window.Capacitor.isNative;
    const btnNative = document.getElementById('btnNativePicker');
    const btnCamGroup = document.getElementById('cameraButtonGroup');
    const btnFoto = document.getElementById('btnPhotoCaptureUI');
    const btnVideo = document.getElementById('btnVideoCaptureUI');
    const tipe = document.getElementById('fSourceType').value;

    const setTampil = (urlDisp, locWebDisp, locNatDisp, camDisp) => {
        document.getElementById('fImgUrl').style.display = urlDisp;
        document.getElementById('fLocalFile').style.display = locWebDisp;
        if (btnNative) btnNative.style.display = locNatDisp;
        if (btnCamGroup) btnCamGroup.style.display = camDisp;
    };

    if (tipe === 'url') {
        setTampil('block', 'none', 'none', 'none');
    } else if (tipe === 'camera') {
        setTampil('none', 'none', 'none', 'flex');
        
            // Logika Visibilitas Tombol Kamera berdasarkan Kategori
            if (btnFoto && btnVideo) {
                if (curFilter.l0 === 'foto') {
                    btnFoto.style.display = 'block';
                    btnVideo.style.display = 'none';
                } else if (curFilter.l0 === 'video') {
                    btnFoto.style.display = 'none';
                    btnVideo.style.display = 'block';
                } else {
                    btnFoto.style.display = 'block';
                    btnVideo.style.display = 'block';
                }
            }
    } else { 
        if (isNative) setTampil('none', 'none', 'block', 'none');
        else setTampil('none', 'block', 'none', 'none');
    }
}

// FUNGSI BARU: Memanggil Native File Picker Mandiri dan Mengunci Izin File
async function pilihFileNative() {
    try {
        // Minta izin penyimpanan agar akses Absolute Path permanen lintas instalasi
        if (window.Capacitor && window.Capacitor.isNative && window.Capacitor.Plugins.Filesystem) {
            await window.Capacitor.Plugins.Filesystem.requestPermissions().catch(()=>{});
        }

        // Panggil plugin Native dari objek window bawaan Capacitor
        const { PersistPermission } = window.Capacitor.Plugins;
        
        // Eksekusi pemilihan file
        const result = await PersistPermission.pickFile();
        
        // Simpan path native asli (Absolute Path) ke input tersembunyi
        document.getElementById('fNativePath').value = result.uri;
        document.getElementById('fName').value = result.name;
        
        document.getElementById('btnNativePicker').innerHTML = `✅ ${result.name}`;
        document.getElementById('btnNativePicker').style.background = '#e8f5e9';
    } catch (e) {
        console.log("Pilih file dibatalkan atau error:", e);
        alert("Batal / Error: " + (e.message || "Akses ditolak sistem."));
    }
}

function gantiTabUpload(a, isCatatan = false){
    uploadMode=a;
    const b=isCatatan||(curFilter&&'catatan'===curFilter.l0),c=document.getElementById('tabFile'),d=document.getElementById('fImgUrl'),e=document.getElementById('fNote'),f=document.getElementById('inputForFile'),g=document.getElementById('fFontStyle'),h=document.getElementById('fSourceType'),aura=document.getElementById('descAuraToggleArea');

    const tabText=document.getElementById('tabFileText'),tabIcon=document.getElementById('tabFileIcon');
    if(tabText&&tabIcon){
        if(b){
            tabText.innerText="Buat Memori";
            tabIcon.innerHTML=SVG_TAB_NOTE;
        }else{
            tabText.innerText="Memori";
            tabIcon.innerHTML=SVG_TAB_MEMORI;
        }
      }

    c.classList.toggle('active','file'===a);
    document.getElementById('tabFolder').classList.toggle('active','folder'===a);
    if('folder'===a){
        document.getElementById('fName').placeholder="Nama Folder Baru";
        f.classList.add('hidden');
        e.style.display='none';
        g.style.display='none';
        h.value='local';
        aura.style.display='none';
    }else{
        document.getElementById('fName').placeholder=b?"Judul Catatan":"Judul Memori";
        f.classList.remove('hidden');
        
        // Logika Visibilitas Opsi Kamera di Dropdown
        const optCam = document.getElementById('optCameraSource');
        if (optCam) {
            if (curFilter.l0 === 'foto') {
                optCam.style.display = 'block';
                optCam.innerText = '📸 Ambil Langsung dari Kamera';
            } else if (curFilter.l0 === 'video') {
                optCam.style.display = 'block';
                optCam.innerText = '🎥 Rekam Langsung dari Kamera';
            } else {
                optCam.style.display = 'none';
            }
        }
        
        h.value='url';
        toggleSourceType();
        if(b){
            g.style.display='block';
            h.style.display='none';
            d.style.display='none';
            document.getElementById('fLocalFile').style.display='none';
            e.style.display='block';
            aura.style.display='none';
        }else{
            g.style.display='none';
            h.style.display='block';
            e.style.display='block';
            aura.style.display='flex';
        }
    }
}

function hapusCoverLokal(){document.getElementById('fCustomCover').value='';document.getElementById('fHapusCoverFlag').value='true';document.getElementById('btnHapusCover').style.display='none'}

// FITUR BARU: Kompresi Cover Otomatis
function kompresiCoverToBlob(file, maxSize = 350) {
    return new Promise((resolve) => {
        const url = URL.createObjectURL(file);
        const img = new Image();
        img.src = url;
        img.onload = () => {
            URL.revokeObjectURL(url);
            const canvas = document.createElement('canvas');
            let w = img.width, h = img.height;
            if (w > h) { if (w > maxSize) { h *= maxSize / w; w = maxSize; } }
            else { if (h > maxSize) { w *= maxSize / h; h = maxSize; } }
            canvas.width = w; canvas.height = h;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, w, h);
            canvas.toBlob((blob) => resolve(blob), 'image/webp', 0.8);
        };
    });
}

async function prosesSimpan(){
    // --- AWAL KUNCI PERBAIKAN: Kunci Tombol Simpan ---
    const btnSimpan = document.getElementById('btnSimpan');
    if (btnSimpan.disabled) return; // Mencegah double-click brutal
    
    btnSimpan.disabled = true;
    btnSimpan.innerText = "⏳ Memproses...";
    btnSimpan.classList.remove('btn-blue');
    btnSimpan.classList.add('btn-gray');
    btnSimpan.style.cursor = 'not-allowed';
    
    // Helper untuk mereset tombol jika terjadi error / validasi gagal
    const gagalkanSimpan = (pesan) => {
        btnSimpan.disabled = false;
        btnSimpan.innerText = "Simpan";
        btnSimpan.classList.remove('btn-gray');
        btnSimpan.classList.add('btn-blue');
        btnSimpan.style.cursor = 'pointer';
        if (pesan) alert(pesan);
    };
    // --- AKHIR KUNCI PERBAIKAN ---

    const a=document.getElementById('fName').value||('folder'===uploadMode?"Folder Baru":"Memori Baru"),b=document.getElementById('fSourceType').value,c=document.getElementById('fYear').value,d=document.getElementById('fFontStyle').value,e=document.getElementById('fNote').value;
    
    let tCat=curFilter.l0, tSub=curFilter.l1, tTyp=curFilter.l2, tDet=curFilter.l3;
    if(currentFolderId && currentFolderId !== 'none'){
        const pFld=document.querySelector(`.card[data-id="${currentFolderId}"]`);
        if(pFld){
            tCat=pFld.getAttribute('data-cat') || curFilter.l0;
            tSub=pFld.getAttribute('data-sub') || curFilter.l1;
            tTyp=pFld.getAttribute('data-type') || curFilter.l2;
            tDet=pFld.getAttribute('data-detail') || curFilter.l3;
        }
    }
    
    const f={cat:tCat,sub:tSub,type:tTyp,detail:tDet,folderId:currentFolderId, descaura: document.getElementById('fDescAura').checked ? 'true' : 'false', favorite: document.getElementById('fFavorite').value};
    const coverInput=document.getElementById('fCustomCover');

    if(editingCard){
        const g='folder'===editingCard.getAttribute('data-itemType');
        editingCard.setAttribute('data-name',a.toLowerCase()),editingCard.setAttribute('data-year',c);
        editingCard.setAttribute('data-descaura', document.getElementById('fDescAura').checked ? 'true' : 'false');
        editingCard.setAttribute('data-favorite', document.getElementById('fFavorite').value);
        
        if(!g){
            editingCard.setAttribute('data-note',e),editingCard.setAttribute('data-font',d);
            if('url'===b){
                const h=document.getElementById('fImgUrl').value;
                h&&editingCard.setAttribute('data-img',h)
            }
        }
        if(document.getElementById('fHapusCoverFlag').value==='true'){
            dbHapusCover(editingCard.getAttribute('data-id'));
            editingCard.setAttribute('data-customCover','false')
        }
        if(coverInput.files&&coverInput.files.length>0){
            try{
                const compressedCover = await kompresiCoverToBlob(coverInput.files[0]);
                await dbSimpanCover(editingCard.getAttribute('data-id'), compressedCover);
                editingCard.setAttribute('data-customCover','true');
            }catch(err){console.error(err)}
        }

        editingCard.querySelector('.file-year').innerText=c,editingCard.querySelector('.file-info').innerText=a,refreshCardIcon(editingCard);
        logActivity('Edit',`Mengedit ${g?'Folder':'Item'}: ${a}`);
        tutupModal(); simpanKeLokal(); updateStats(); filterFiles();
        return;
    }

    let newItemId=('folder'===uploadMode?'fld_':'file_')+Date.now();
    let hasCustomCover=false;
    if(coverInput.files&&coverInput.files.length>0){
        try{
            const compressedCover = await kompresiCoverToBlob(coverInput.files[0]);
            await dbSimpanCover(newItemId, compressedCover);
            hasCustomCover=true;
        }catch(err){
            console.error("Gagal simpan cover: "+err);
        }
    }

    if('folder'===uploadMode){
        buatKartu({id:newItemId,itemType:'folder',name:a,img:'none',year:c,customCover:hasCustomCover?'true':'false',...f},!0);
        logActivity('Upload',`Membuat Folder: ${a}`);
        tutupModal(); simpanKeLokal(); updateStats(); filterFiles();
    } else {
        // JALUR KAMERA
        if ('camera' === b) {
            if (!fileKameraTertunda) return gagalkanSimpan("Silakan ambil foto/video terlebih dahulu menggunakan tombol kamera!");

            const isVideo = fileKameraTertunda.type.startsWith('video/');
            let finalNameCamera = a;

            // --- REVISI: MENGGUNAKAN HELPER UNTUK EKSTENSI OTOMATIS KAMERA ---
            const trueExt = getExtFromMime(fileKameraTertunda.type);

            // Sanitasi: Jika Anda tidak sengaja menghapus ekstensi, tambahkan kembali
            if (trueExt && !finalNameCamera.toLowerCase().endsWith(trueExt)) {
                finalNameCamera = finalNameCamera.replace(/\.[^/.]+$/, "") + trueExt;
            }
            // -------------------------------------------------------------------

            try {
                // [PEMBARUAN]: Penyelamatan MIME Type agar file dibaca utuh oleh browser
                let safeBlob = fileKameraTertunda;
                if (!safeBlob.type || safeBlob.type === 'application/octet-stream' || safeBlob.type === '') {
                    const correctMime = isVideo ? 'video/mp4' : 'image/jpeg';
                    safeBlob = new Blob([fileKameraTertunda], { type: correctMime });
                }
                
                await dbSimpanFile(newItemId, safeBlob);

                let linkAset = 'LOCAL_FILE';
                let driveErrorMsg = null;
                const gToken = localStorage.getItem('feathera_gdrive_token');

                if (gToken && currentUser !== 'Guest') {
                    try {
                        const bufferData = await fileKameraTertunda.arrayBuffer();
                        const resMedia = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=media', {
                            method: 'POST',
                            headers: {
                                'Authorization': 'Bearer ' + gToken,
                                'Content-Type': fileKameraTertunda.type || (isVideo ? 'video/mp4' : 'image/jpeg'),
                                'Content-Length': bufferData.byteLength
                            },
                            body: bufferData
                        });
                        
                const dataMedia = await resMedia.json();
                if (resMedia.ok && dataMedia.id) {
                    // 1. Update nama file sekaligus penempatan Folder Drive
                    let patchUrl = `https://www.googleapis.com/drive/v3/files/${dataMedia.id}`;
                    const inputFolder = isVideo ? (getLocal('drive_folder_video') || '') : (getLocal('drive_folder_foto') || '');
                    if (inputFolder) {
                        const folderId = inputFolder.includes('folders/') ? inputFolder.split('folders/')[1].split(/[?&/]/)[0] : inputFolder;
                        patchUrl += `?addParents=${folderId}&removeParents=root`;
                    }

                    await fetch(patchUrl, {
                        method: 'PATCH',
                        headers: { 'Authorization': 'Bearer ' + gToken, 'Content-Type': 'application/json' },
                        body: JSON.stringify({ name: finalNameCamera })
                    });

                            // 2. Set file menjadi Publik (Bisa dilihat siapa saja yang punya link) agar Thumbnail & Gambar bisa dirender di aplikasi
                            await fetch(`https://www.googleapis.com/drive/v3/files/${dataMedia.id}/permissions`, {
                                method: 'POST',
                                headers: { 'Authorization': 'Bearer ' + gToken, 'Content-Type': 'application/json' },
                                body: JSON.stringify({ role: 'reader', type: 'anyone' })
                            });
                            
                            linkAset = `https://drive.google.com/file/d/${dataMedia.id}/view`;
                        } else {
                            driveErrorMsg = dataMedia.error ? `${dataMedia.error.code}: ${dataMedia.error.message}` : `HTTP Status ${resMedia.status}`;
                        }
                    } catch (errDrive) {
                        driveErrorMsg = errDrive.message || "Koneksi terputus saat mengirim binary";
                    }
                }

                let tCatFinal = (curFilter.l0 === 'all' || curFilter.l0 === 'audiovideo') ? (isVideo ? 'video' : 'foto') : curFilter.l0;
                if (isVideo) tCatFinal = 'video';

                buatKartu({
                    id: newItemId, itemType: 'file', name: finalNameCamera, year: c, note: e, img: linkAset, font: d, customCover: hasCustomCover ? 'true' : 'false', ...f, cat: tCatFinal
                }, true);

                logActivity('Kamera', `Menambah ${isVideo ? 'video' : 'foto'}: ${finalNameCamera}`);
                fileKameraTertunda = null;
                tutupModal(); simpanKeLokal(); updateStats(); filterFiles();

                if (linkAset === 'LOCAL_FILE' && currentUser !== 'Guest') {
                    window.alert(`⚠️ Tersimpan di Aplikasi saja. Gagal ke Drive:\n"${driveErrorMsg || 'Akses ditolak Google'}"`);
                } 
            } catch (error) {
                return gagalkanSimpan(`❌ Gagal memproses: ${error.message}`);
            }
        } 
        // JALUR LOKAL / NATIVE
        else if ('catatan' !== curFilter.l0 && 'local' === b) {
            const isNative = window.Capacitor && window.Capacitor.isNative;
            
            if (isNative) {
                const nativePath = document.getElementById('fNativePath').value;
                if (!nativePath) return gagalkanSimpan("Pilih file dari HP Anda!");
                
                buatKartu({id: newItemId, itemType: 'file', name: a, year: c, note: e, img: 'NATIVE:' + nativePath, font: d, customCover: hasCustomCover ? 'true' : 'false', ...f}, true);
                
                document.getElementById('fNativePath').value = '';
                document.getElementById('btnNativePicker').innerHTML = '📁 Pilih File dari HP (Native)';
                document.getElementById('btnNativePicker').style.background = 'var(--btn-bg)';
                
                logActivity('Upload', `Menambah Item Native: ${a}`);
                tutupModal(); simpanKeLokal(); updateStats(); filterFiles();
            } else {
                const i = document.getElementById('fLocalFile');
                if (0 === i.files.length) return gagalkanSimpan("Pilih file lokal!");
                let successCount = 0;
                
                for (let idx = 0; idx < i.files.length; idx++) {
                    let currentFile = i.files[idx];
                    let loopItemId = 'file_' + Date.now() + '_' + idx;
                    let loopItemName = a ? (i.files.length > 1 ? a + " (" + (idx + 1) + ")" : a) : currentFile.name;
                    
                    try {
                        await dbSimpanFile(loopItemId, currentFile);
                        buatKartu({id: loopItemId, itemType: 'file', name: loopItemName, year: c, note: e, img: 'LOCAL_FILE', font: d, customCover: hasCustomCover ? 'true' : 'false', ...f}, true);
                        successCount++;
                    } catch (j) { console.error("Gagal menyimpan file lokal: " + j); }
                }
                if(successCount > 0) {
                    logActivity('Upload', `Menambah ${successCount} Item`);
                    tutupModal(); simpanKeLokal(); updateStats(); filterFiles();
                } else { 
                    return gagalkanSimpan("Gagal mengupload file lokal."); 
                }
            }
        } 
        // JALUR URL / LINK
        else {
            let g = 'none';
            let finalName = a; // Menggunakan nama yang diinput user (a)

            if ('catatan' !== curFilter.l0) {
                g = document.getElementById('fImgUrl').value;
                
                // --- LOGIKA PENAMBAHAN EKSTENSI OTOMATIS ---
                if (g.includes('drive.google.com')) {
                    // Mendukung deteksi Video dan Audio
                    const validExts = ['.mp4', '.mov', '.avi', '.mkv', '.webm', '.mp3', '.wav', '.ogg', '.m4a', '.aac'];
                    const hasExtension = validExts.some(ext => finalName.toLowerCase().endsWith(ext));
                    
                    if (!hasExtension) {
                        // Membaca target variabel kategori saat ini (tCat)
                        if (tCat === 'audio' || curFilter.l0 === 'audio') {
                            finalName += '.mp3';
                        } else if (tCat === 'video' || curFilter.l0 === 'video' || curFilter.l0 === 'audiovideo') {
                            finalName += '.mp4';
                        }
                    }
                }
                // -------------------------------------------
            }

            buatKartu({
                id: newItemId, 
                itemType: 'file', 
                name: finalName, // Menggunakan nama yang sudah terformat
                year: c, 
                note: e, 
                img: g, 
                font: d, 
                customCover: hasCustomCover ? 'true' : 'false', 
                ...f
            }, true);
            
            logActivity('Upload', `Menambah Item: ${finalName}`);
            tutupModal(); simpanKeLokal(); updateStats(); filterFiles();
        }
    }
}

function buatKartu(a, b = !1, wadahFragment = null) {
    const c = document.createElement('div');
    c.className = 'card';
    const cachedMediaType = getMediaType(a.img, a.name);
    ['cat', 'sub', 'type', 'detail', 'year', 'img', 'note', 'id', 'itemType', 'folderId', 'font', 'customCover', 'related', 'descaura', 'favorite'].forEach(d => c.setAttribute(`data-${d}`, a[d] || 'none'));
    c.setAttribute('data-mediatype', cachedMediaType);

    c.setAttribute('data-name', a.name.toLowerCase());
    'true' === a.hidden && (c.setAttribute('data-hidden', 'true'), c.classList.add('is-hidden-file'));

    // INJEKSI ICON STATUS (Lokal / Drive / Supabase / Appwrite): Deteksi sumber file
    const isLocal = a.img === 'LOCAL_FILE' || (typeof a.img === 'string' && a.img.startsWith('NATIVE:'));
    const isDrive = !isLocal && typeof a.img === 'string' && !!getDriveId(a.img);
    const isSupabase = !isLocal && !isDrive && typeof a.img === 'string' && a.img.includes('supabase.co');
    const isAppwrite = !isLocal && !isDrive && !isSupabase && typeof a.img === 'string' && a.img.includes('appwrite.io');
    const isDropbox = !isLocal && !isDrive && !isSupabase && !isAppwrite && typeof a.img === 'string' && a.img.includes('dropbox.com');
   
    let statusIconHtml = '';
    if (isLocal) {
        statusIconHtml = `<div class="local-storage-icon" title="Tersimpan di Memori Lokal"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2h9l5 5v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z"></path><path d="M8 2v4"></path><path d="M12 2v4"></path><path d="M16 4v2"></path></svg></div>`;
    } else if (isDrive) {
        statusIconHtml = `<div class="local-storage-icon" style="opacity: 0.85;" title="Tersimpan di Google Drive"><img src="https://upload.wikimedia.org/wikipedia/commons/1/12/Google_Drive_icon_%282020%29.svg" style="width: 11px; height: 11px; object-fit: contain; filter: drop-shadow(0 0px 0px rgba(0,0,0,0.2));" alt="Drive"></div>`;
    } else if (isSupabase) {
        statusIconHtml = `<div class="local-storage-icon" style="opacity: 0.85;" title="Tersimpan di Supabase"><svg width="12" height="12" viewBox="0 0 24 24" fill="#3ECF8E" style="filter: drop-shadow(0 0px 0px rgba(0,0,0,0.2));"><path d="M11.99 2.21L2.83 11.36h7.24v10.42l9.16-9.15h-7.24V2.21z"/></svg></div>`;
    } else if (isAppwrite) {
        statusIconHtml = `<div class="local-storage-icon" style="opacity: 0.85;" title="Tersimpan di Appwrite"><img src="https://www.google.com/s2/favicons?domain=appwrite.io&sz=32" style="width: 10px; height: 10px; object-fit: contain; filter: drop-shadow(0 0px 0px rgba(0,0,0,0.2));" alt="Appwrite"></div>`;
    } else if (isDropbox) {
        statusIconHtml = `<div class="local-storage-icon" style="opacity: 0.85;" title="Tersimpan di Dropbox"><img src="https://upload.wikimedia.org/wikipedia/commons/7/78/Dropbox_Icon.svg" style="width: 11px; height: 11px; object-fit: contain; filter: drop-shadow(0 0px 0px rgba(0,0,0,0.2));" alt="Dropbox"></div>`;
        }
        c.innerHTML = `${statusIconHtml}<button class="menu-dots" onclick="wrapBukaEdit(event, this)">${SVG_EDIT}</button><div class="thumb-container"></div><span class="file-info">${a.name}</span><span class="file-year">${a.year || ''}</span>`;

        const d = wadahFragment || document.getElementById('fileGrid');
        b ? d.prepend(c) : d.appendChild(c);
        
        // Memicu Lazy Load Native
        lazyLoadObserver.observe(c);
    }

async function refreshCardIcon(a){
    const b=a.getAttribute('data-img'),c=a.getAttribute('data-id'),d=a.getAttribute('data-name'),e='folder'===a.getAttribute('data-itemType'),f=a.querySelector('.thumb-container');
    const hasCover=a.getAttribute('data-customCover')==='true';
    const h=getMediaType(b,d);
    if(hasCover && !['app', 'archive', 'doc', 'other', 'unknown_local'].includes(h)){
        try{const blob=await dbAmbilCover(c);if(blob){const url=URL.createObjectURL(blob);f.innerHTML=`<img src="${url}" class="img-thumb" loading="lazy" decoding="async" onload="URL.revokeObjectURL(this.src)" style="object-fit:cover; width:100%; height:100%;"><span class="icon img-icon">${SVG_COVER}</span>`;return}}catch(err){}
    }

    if(e)return f.innerHTML=`<span class="icon"><svg class="feather-icon embossed-icon" viewBox="0 0 394 462"><use href="#feather-icon-def"></use></svg></span>`;

    const g=getYoutubeId(b);
    if(g)return f.innerHTML=`<span class="icon yt-icon">${SVG_ICON_YOUTUBE}</span>`;

    // --- TAMBAHAN PEMBACA NATIVE ---
    if(b && b.startsWith('NATIVE:')){
        const nativePath = b.replace('NATIVE:', '');
        const webSrc = window.Capacitor.convertFileSrc(nativePath); // Konversi jalur Android ke Web
        if('image'===h){
            f.innerHTML=`<img src="${webSrc}" class="img-thumb" loading="lazy" decoding="async"><span class="icon img-icon">${SVG_COVER}</span>`;
        }else {
            f.innerHTML=`<span class="icon">${getExtIcon(h,d)}</span>`;
        }
        return;
    }
    // -------------------------------
    if('LOCAL_FILE'===b){
        if('image'===h){
            f.innerHTML=`<span class="icon">${SVG_COVER}</span>`;
            try{const i=await dbAmbilFile(c);if(i){const j=URL.createObjectURL(i);f.innerHTML=`<img src="${j}" class="img-thumb" loading="lazy" decoding="async" onload="URL.revokeObjectURL(this.src)"><span class="icon img-icon">${SVG_COVER}</span>`}else f.innerHTML=`<span class="icon">${SVG_CANCEL}</span>`}catch(k){f.innerHTML=`<span class="icon">${SVG_ICON_UNKNOWN}</span>`}
        }else f.innerHTML=`<span class="icon">${getExtIcon(h,d)}</span>`;
        return
    }
    
    if('image'===h&&b&&'none'!==b){
        f.innerHTML=`<img src="${getThumbUrl(b)}" class="img-thumb" loading="lazy" decoding="async"><span class="icon img-icon">${SVG_COVER}</span>`;

        f.querySelector('img').onerror=function(){this.parentNode.innerHTML=`<span class="icon">${SVG_ICON_UNKNOWN}</span>`};
    }else{
        f.innerHTML=`<span class="icon">${getExtIcon(h,d)}</span>`;
    }
}

async function cardClickHandler(a){
    if (isAddMediaMode && a.getAttribute('data-itemType') === 'folder') {
        if (a.classList.contains('selected')) {
            a.classList.remove('selected');
            const folderId = a.getAttribute('data-id');
            getAllDescendantIds(folderId).forEach(id => {
                const child = document.querySelector(`.card[data-id="${id}"]`);
                if (child) child.classList.remove('selected');
            });
            
            updateSelectCount();
            return; 
        }
    }

    if(isAddMediaMode){
        if(a.getAttribute('data-itemType')==='folder') bukaFolder(a.getAttribute('data-id'));
        else toggleSelectCard(a);
        return;
    }

    // --- UPDATE: Logika saat Mode Pindah (Cut) aktif ---
    if (isMovePending) {
        if (a.classList.contains('move-pending')) {
            a.classList.remove('move-pending');
            const idToRemove = a.getAttribute('data-id');
            movePendingIds = movePendingIds.filter(id => id !== idToRemove);
            if (a.getAttribute('data-itemType') === 'folder') {
                const descendants = getAllDescendantIds(idToRemove);
                descendants.forEach(descId => {
                    const child = document.querySelector(`.card[data-id="${descId}"]`);
                    if (child) {
                        child.classList.remove('move-pending');
                        movePendingIds = movePendingIds.filter(id => id !== descId);
                    }
                });
            }
            
            updateSelectCount(); 
            if(movePendingIds.length === 0){
                batalBatchAksi();
            }
            return;
        } else {
            if (a.getAttribute('data-itemType') !== 'folder') {
                a.classList.add('move-pending');
                movePendingIds.push(a.getAttribute('data-id'));
                updateSelectCount();
                return;
            }
        }
    }
    // ========================================
    const isFolder = a.getAttribute('data-itemType') === 'folder';
    const isSelected = a.classList.contains('selected');
    const hasAnySelection = document.querySelectorAll('.card.selected').length > 0;

    if (isSelectionMode || hasAnySelection) {
        if (isFolder) {
            if (!isSelected && !isSelectionMode) return bukaFolder(a.getAttribute('data-id'));
            
            const willSelect = !isSelected;
            a.classList.toggle('selected', willSelect);
            getAllDescendantIds(a.getAttribute('data-id')).forEach(id => {
                const child = document.querySelector(`.card[data-id="${id}"]`);
                if (child) child.classList.toggle('selected', willSelect);
            });
            updateSelectCount();
            return;
        }
        return toggleSelectCard(a);
    }

    if(isFolder) return bukaFolder(a.getAttribute('data-id'));

    const b=a.getAttribute('data-img'),c=a.getAttribute('data-note'),d=a.querySelector('.file-info').innerText,e=a.getAttribute('data-font'),f=a.getAttribute('data-id'),g=getMediaType(b,d),h=getDriveId(b);
    
    let i=b;
    // KUNCI OPTIMASI: Cegah Memory Leak! Abaikan pembuatan Blob URL untuk Gambar, Audio, dan Video di sini.
    // Modul ImgViewer dan MediaPlayer sudah memiliki sistem konversi dan pembersihan (revoke) RAM mandiri.
    if('LOCAL_FILE'===b && !['image', 'audio', 'video'].includes(g)){
        try{const j=await dbAmbilFile(f);if(j)i=URL.createObjectURL(j);else return alert("File lokal tidak ditemukan.")}catch(k){return alert("Error: "+k)}
    } 
    // --- TAMBAHAN PEMBACA NATIVE ---
    else if(b && b.startsWith('NATIVE:')) {
        const nativePath = b.replace('NATIVE:', '');
        i = window.Capacitor.convertFileSrc(nativePath);
    } 
    // -------------------------------
    else {
        i=h?getPreviewUrl(b):getDirectUrl(b);
    }

        const isDescAura = a.getAttribute('data-descaura') === 'true';
    const displayNote = isDescAura ? "" : c;
    
    // PERBAIKAN: Melempar ID file dan status kustom cover
    if(['app','archive','doc','other','unknown_local'].includes(g))return showFileViewer(d,displayNote,i,g,b,f,a.getAttribute('data-customCover')==='true');
    
    const l={name:d,img:i,originalImg:b,year:a.getAttribute('data-year'),note:displayNote,id:f,customCover:a.getAttribute('data-customCover')==='true'};
    if('audio'===g||'video'===g)MediaPlayer.clearPlaylist(),MediaPlayer.addToPlaylist({...l,isDrive:!!h,isLocal:'LOCAL_FILE'===b},!0);
    else if('image'===g)ImgViewer.open(a);
    else if('text'===g||(!b||'none'===b)&&c&&'none'!==c){
        const m=document.getElementById('textContentDisplay');
        document.querySelectorAll('.overlay-btn').forEach(n=>n.style.display='none'),document.getElementById('imgViewCaption').style.display='none',toggleModal('modalImageViewer', true),document.getElementById('imgViewFull').style.display='none';
        const o=document.getElementById('textViewContainer');
        o.style.display='flex',o.style.flexDirection='column',document.getElementById('textTitleDisplay').innerText=l.name,m.style.fontFamily=(e&&'none'!==e)?e:'inherit';
        (!b||'none'===b)?(currentTextContent=displayNote,m.innerHTML=linkify(displayNote)):(m.innerText='Memuat...',fetch(i).then(n=>n.text()).then(n=>{currentTextContent=n,m.innerHTML=linkify(n)}).catch(n=>m.innerText="Gagal: "+n))
        document.body.classList.add('no-scroll');
    }else showFileViewer(d,displayNote,i,'unknown',b,f,a.getAttribute('data-customCover')==='true')
}

function cardHoldHandler(a){
    if(currentRole === 'none') return; 
    
    // Failsafe: WebView kadang menolak API vibrate jika izin hardware belum sempurna
    try { navigator.vibrate && navigator.vibrate(50); } catch(e){}
    
    // 1. Jika file/folder sudah diceklis, munculkan navigasi aksi (Action Nav)
    if (a.classList.contains('selected') && !isMovePending) {
        if (!isSelectionMode) {
            toggleSelectionMode(true); // Memanggil menu aksi ke atas
        }
        return; 
    }

    // 2. Logika Mode Pindah (Cut / Gunting)
    if (isMovePending) {
        if (!a.classList.contains('move-pending')) {
            a.classList.add('move-pending');
            const idToAdd = a.getAttribute('data-id');
            if (!movePendingIds.includes(idToAdd)) movePendingIds.push(idToAdd);
            
            if (a.getAttribute('data-itemType') === 'folder') {
                // TUNDA KOMPUTASI DOM: Lepaskan thread agar kartu tidak "tenggelam/stuck"
                setTimeout(() => {
                    const descendants = getAllDescendantIds(idToAdd);
                    descendants.forEach(descId => {
                        const child = document.querySelector(`.card[data-id="${descId}"]`);
                        if (child && !child.classList.contains('move-pending')) {
                            child.classList.add('move-pending');
                            if (!movePendingIds.includes(descId)) movePendingIds.push(descId);
                        }
                    });
                    updateSelectCount();
                }, 10);
                return;
            }
            updateSelectCount();
        } else {
            a.click(); 
        }
        return; 
    }

    // 3. Logika Seleksi Normal / Multi-select
    const isFolder = a.getAttribute('data-itemType') === 'folder';
    const hasExistingSelection = document.querySelectorAll('.card.selected').length > 0;

    if (isSelectionMode || isAddMediaMode || hasExistingSelection) {
        if (!isFolder) {
            document.querySelectorAll('.card.selected').forEach(c => c.classList.remove('selected'));
            a.classList.add('selected');
            updateSelectCount();
            return;
        }
    }

    toggleSelectCard(a);
    
    if(isFolder){
        const isSelected = a.classList.contains('selected');
        // TUNDA KOMPUTASI DOM: Lepaskan thread agar kartu tidak "tenggelam/stuck"
        setTimeout(() => {
            getAllDescendantIds(a.getAttribute('data-id')).forEach(id => {
                const child = document.querySelector(`.card[data-id="${id}"]`);
                if (child) child.classList.toggle('selected', isSelected);
            });
            updateSelectCount();
        }, 10);
    }
}

function toggleSelectionMode(force){
    isSelectionMode = typeof force === 'boolean' ? force : !isSelectionMode;
    
    // TAMBAHAN: Reset status pemilihan grup jika mode seleksi dimatikan
    if (!isSelectionMode) {
        isSelectingForGroup = false;
        targetGroupForSelection = null;
    }

    const a = document.getElementById('btnSelectMode');
    a.classList.toggle('active-mode', isSelectionMode);
    a.innerHTML = isSelectionMode ? SVG_WRENCH : SVG_SELECT_INACTIVE;
    document.body.classList.toggle('action-mode', isSelectionMode);
    updateSelectCount();
}

function updateSelectCount() {
    // [PERBAIKAN]: Hitung semua item terpilih secara GLOBAL, tidak peduli disembunyikan oleh filter kategori atau tidak
    const rawSelected = document.querySelectorAll('.card.selected, .card.move-pending');
    const globalSelectedCards = Array.from(rawSelected);
    
    const gridContainer = document.getElementById('fileGrid');
    const visibleCards = Array.from(gridContainer.children).filter(c => c.style.display !== 'none');

    const totalVisible = visibleCards.length;
    
    let foldersCount = 0;
    const totalSelected = globalSelectedCards.length; // Menggunakan hitungan global

    globalSelectedCards.forEach(card => {
        if (card.getAttribute('data-itemType') === 'folder') foldersCount++;
    });

    const filesCount = totalSelected - foldersCount;
    const selText = document.getElementById('selTextInfo');

    if (selText) {
        if (isMovePending) selText.innerText = `${foldersCount} folder ${filesCount} file akan dipindah`;
        else if (isAddMediaMode) selText.innerText = `${filesCount} file dipilih`;
        else selText.innerText = `${foldersCount} folder ${filesCount} file dipilih`;
    }

    const btnFloatingSelectAll = document.getElementById('btnFloatingSelectAll');
    if (btnFloatingSelectAll) {
        // [PERBAIKAN]: Untuk tombol 'Pilih Semua', hanya cek apakah file yang VISIBLE di layar saat ini semuanya sudah terpilih
        const visibleSelectedCount = visibleCards.filter(card => card.classList.contains('selected') || card.classList.contains('move-pending')).length;
        const isAllSelected = totalVisible > 0 && totalVisible === visibleSelectedCount;
        btnFloatingSelectAll.innerHTML = isAllSelected ? SVG_SELECT_ACTIVE : SVG_SELECT_INACTIVE;
    }

    const btnHide = document.getElementById('btnToggleHide');
    if (btnHide) btnHide.innerHTML = globalSelectedCards.some(b => 'true' === b.getAttribute('data-hidden')) ? `<span>${SVG_EYE_OPEN}</span> Tampilkan` : `<span>${SVG_EYE_CLOSED}</span> Sembunyi`;
    const floatingInfo = document.getElementById('floatingSelectionInfo');

    const chipsArea = document.getElementById('dynamicChipsArea');
    const baseBottom = (70 + (chipsArea ? chipsArea.offsetHeight : 0) + 10) + 'px';
    
    // LOGIKA TERPUSAT: Deteksi apakah panel info seleksi sedang tayang
    const isFloatingInfoVisible = totalSelected > 0 || isMovePending || isSelectionMode || isAddMediaMode;
    const floatingInfoBottom = (isSelectionMode && !isAddMediaMode) ? '75px' : baseBottom;

    if (floatingInfo) {
        if (isFloatingInfoVisible) {
            floatingInfo.classList.add('visible'); 
            floatingInfo.style.bottom = floatingInfoBottom;
        } else {
            floatingInfo.classList.remove('visible'); 
            floatingInfo.style.bottom = '-60px'; 
        }
    }

    const fab = document.getElementById('fabAddMemori');
    const fabBack = document.getElementById('fabBackFolder');
    const fabPaste = document.getElementById('fabPasteMemori'); // TAMBAHAN: Variabel tombol paste
    
    if (fab) {
        const isRestrictedPage = curFilter.l0 === 'all' || curFilter.l0 === 'audiovideo' || curFilter.l0 === 'favorite';
        // Tombol Add tetap disembunyikan jika panel info seleksi tampil
        const hideFabAdd = currentRole === 'none' || isRestrictedPage || isFloatingInfoVisible;
        
        // 1. Logika Tombol Add Memori
        if (hideFabAdd) {
            fab.classList.remove('visible');
            fab.style.bottom = '-60px';
        } else {
            fab.classList.add('visible');
            fab.style.bottom = baseBottom;
        }

        // --- AWAL LOGIKA PENUMPUKAN FAB OTOMATIS ---
        // Menentukan titik dasar untuk FAB berikutnya
        let titikTumpuk = parseInt(baseBottom, 10);
        
        if (isFloatingInfoVisible) {
            titikTumpuk = parseInt(floatingInfoBottom, 10) + 50; // Naik di atas panel info
        } else if (!hideFabAdd) {
            titikTumpuk += 60; // Naik di atas tombol Add jika tombol Add muncul
        }

        // 2. Logika Tombol Paste (Muncul hanya saat Mode Pindah)
        if (fabPaste) {
            if (isMovePending) {
                fabPaste.classList.add('visible');
                fabPaste.style.bottom = titikTumpuk + 'px';
                titikTumpuk += 60; // Naikkan titik tumpuk untuk tombol berikutnya jika ada
            } else {
                fabPaste.classList.remove('visible');
                fabPaste.style.bottom = '-60px';
            }
        }

        // 3. Logika Tombol Back Folder
        if (fabBack) {
            const inFolder = currentFolderId && currentFolderId !== 'none';
            if (inFolder) {
                fabBack.classList.add('visible');
                fabBack.style.bottom = titikTumpuk + 'px'; // Gunakan titik tumpuk terakhir
            } else {
                fabBack.classList.remove('visible');
                fabBack.style.bottom = '-60px';
            }
        }
    }
}

function toggleSelectCard(a){a.classList.toggle('selected'),updateSelectCount()}

// --- FITUR BARU: SELECT ALL / DESELECT ALL ---
function togglePilihSemua() {
    // Optimasi: Mendelegasikan filter ke Native CSS Engine untuk performa maksimal
    const gridContainer = document.getElementById('fileGrid');
    const visibleCards = Array.from(gridContainer.children).filter(c => c.style.display !== 'none' && c.classList.contains('card'));

    if (visibleCards.length === 0) return alert("Tidak ada item yang dapat dipilih di tampilan saat ini.");

    const isMoveMode = typeof isMovePending !== 'undefined' && isMovePending;
    const targetClass = isMoveMode ? 'move-pending' : 'selected';

    const selectedCount = visibleCards.filter(card => card.classList.contains(targetClass)).length;
    const isAllSelected = selectedCount === visibleCards.length;

    // Helper untuk memproses kartu (tambah/hapus kelas dan ID)
    const prosesKartu = (card, isRemove) => {
        if (isRemove) {
            card.classList.remove(targetClass);
            if (isMoveMode) {
                const idToRemove = card.getAttribute('data-id');
                movePendingIds = movePendingIds.filter(id => id !== idToRemove);
            }
        } else {
            card.classList.add(targetClass);
            if (isMoveMode) {
                const idToAdd = card.getAttribute('data-id');
                if (!movePendingIds.includes(idToAdd)) movePendingIds.push(idToAdd);
            }
        }
    };

    visibleCards.forEach(card => {
        // 1. Eksekusi kartu yang terlihat di layar
        prosesKartu(card, isAllSelected);
        
        // 2. [PERBAIKAN KUNCI]: Jika kartu ini adalah folder, eksekusi juga semua isi di dalamnya!
        if (card.getAttribute('data-itemType') === 'folder') {
            const folderId = card.getAttribute('data-id');
            const descendants = getAllDescendantIds(folderId);
            
            descendants.forEach(descId => {
                const childCard = document.querySelector(`.card[data-id="${descId}"]`);
                if (childCard) prosesKartu(childCard, isAllSelected);
            });
        }
    });

    if (isMoveMode && isAllSelected) {
        batalBatchAksi();
    } else {
        updateSelectCount();
    }
}

// ----------------------------------------------

function eksekusiBatchSembunyi(){
    if('master'!==currentRole)return alert("Hanya Master Admin.");
    const items=document.querySelectorAll('.card.selected');
    if(!items.length)return alert("Pilih item!");
    const names=Array.from(items).map(i=>i.querySelector('.file-info').innerText).join(', ');
    let a=0;
    items.forEach(b=>{
        const c='true'===b.getAttribute('data-hidden'),d=c?null:'true';
        applyHidden(b,d),a++,'folder'===b.getAttribute('data-itemType')&&getAllDescendantIds(b.getAttribute('data-id')).forEach(e=>{
            const f=document.querySelector(`.card[data-id="${e}"]`);
            f&&applyHidden(f,d)
        })
    });
    logActivity('Visibility',`Visibilitas diubah: ${names}`);
    simpanKeLokal();
    'none'===currentRole&&filterFiles();
    updateStats();
    batalBatchAksi(); // <--- Menghapus ceklis dan menutup mode

    function applyHidden(b,d){
        d?(b.setAttribute('data-hidden','true'),b.classList.add('is-hidden-file')):(b.removeAttribute('data-hidden'),b.classList.remove('is-hidden-file'))
    }
}

async function eksekusiBatchHapus(){
    const a=document.querySelectorAll('.card.selected');
    if(!a.length)return alert("Pilih item!");
    let b=false;
    const c=document.querySelectorAll('.card');
    const usedFolderIds = new Set(Array.from(c).map(e => e.getAttribute('data-folderId')));
    a.forEach(d => { if ('folder' === d.getAttribute('data-itemType') && usedFolderIds.has(d.getAttribute('data-id'))) b = true; });

    const namesArr = Array.from(a).map(i=>i.querySelector('.file-info').innerText);
    const displayNames = namesArr.length > 5 ? namesArr.slice(0, 5).join(', ') + ` ... (+${namesArr.length - 5} item)` : namesArr.join(', ');
    
    const isConfirmed = await customConfirm(b?`PERINGATAN: Folder berisi file akan terhapus!\n\nYakin menghapus:\n${displayNames}?`:`Yakin menghapus:\n${displayNames}?`);
    if(!isConfirmed)return;
    
    const names=namesArr.join(', ');

    const hapusElemen = (el) => {
        const itemId = el.getAttribute('data-id');
        
        // Membersihkan Cache RAM: Cabut Blob URL sementara pada thumbnail
        const imgTag = el.querySelector('.thumb-container img');
        if (imgTag && imgTag.src.startsWith('blob:')) {
            URL.revokeObjectURL(imgTag.src);
        }

        // Mencegah Memory Leak: Bersihkan RAM Media Player jika item yang dihapus sedang dimuat
        if (typeof MediaPlayer !== 'undefined' && MediaPlayer.queue.length > 0) {
            const currentMedia = MediaPlayer.queue[MediaPlayer.currentIndex];
            if (currentMedia && currentMedia.id === itemId) {
                MediaPlayer.clearPlaylist(); // Fungsi ini otomatis mencabut URL.revokeObjectURL bawaannya
            }
        }
        
        // --- MODIFIKASI: Ekstrak Metadata untuk dipindah ke Recycle Bin ---

        const fileData = {
            id: itemId,
            itemType: el.getAttribute('data-itemType'),
            folderId: el.getAttribute('data-folderId'),
            name: el.getAttribute('data-name'),
            year: el.getAttribute('data-year'),
            note: el.getAttribute('data-note'),
            img: el.getAttribute('data-img'),
            cat: el.getAttribute('data-cat'),
            sub: el.getAttribute('data-sub'),
            type: el.getAttribute('data-type'),
            detail: el.getAttribute('data-detail'),
            hidden: el.getAttribute('data-hidden'),
            font: el.getAttribute('data-font'),
            customCover: el.getAttribute('data-customCover'),
            related: el.getAttribute('data-related'),
            descaura: el.getAttribute('data-descaura'),
            favorite: el.getAttribute('data-favorite'),
            deletedAt: new Date().getTime()
        };
        
        if(!rbDataCache.find(x => x.id === itemId)) {
            rbDataCache.push(fileData);
        }
        // Catatan: dbHapusCover & dbHapusFile dilepas dari sini. Hanya dihancurkan dari DOM.
        // ------------------------------------------------------------------

        el.setAttribute('data-archived', 'true');
        el.remove();
    };

    const idsToRemove = new Set();
    a.forEach(f => {
        const id = f.getAttribute('data-id');
        idsToRemove.add(id);
        if ('folder' === f.getAttribute('data-itemType')) {
            getAllDescendantIds(id).forEach(descId => idsToRemove.add(descId));
        }
    });

    let rbDataCache = JSON.parse(getLocal('recycle_bin') || '[]');

    // Optimasi: Hanya proses DOM yang ID-nya sudah pasti masuk daftar hapus
    idsToRemove.forEach(id => {
        const el = document.querySelector(`.card[data-id="${id}"]`);
        if (el) hapusElemen(el);
    });

    if (rbDataCache.length > 0) {
        setLocal('recycle_bin', JSON.stringify(rbDataCache));
    }

    logActivity('Hapus',`Menghapus: ${names}`);
    simpanKeLokal();
    updateStats();
    filterFiles();
    batalBatchAksi();
}

function eksekusiBatchPindah(){
    const a = document.querySelectorAll('.card.selected');
    if(!a.length) return alert("Pilih item yang ingin dipindahkan!");

    movePendingIds = [];
    
    a.forEach(card => {
        movePendingIds.push(card.getAttribute('data-id'));
        card.classList.add('move-pending');
        card.classList.remove('selected');
    });

    isMovePending = true;
    
    if (isSelectionMode) toggleSelectionMode(false);
    
    updateSelectCount(); 
    
    alert("Item telah ditandai ✂️\n\nSilakan navigasi (buka) folder tujuan Anda, lalu tekan tombol 'Clipboard' (📋) di kanan bawah, atau tekan tahan pada area kosong untuk menempelkan.");
}

function eksekusiTempel(){
    if(!isMovePending || !movePendingIds.length) return batalBatchAksi();
   
    let targetCat = curFilter.l0 === 'audiovideo' ? 'all' : curFilter.l0;
    let targetSub = curFilter.l1;
    let targetType = curFilter.l2;
    let targetDetail = curFilter.l3;
    let targetFolderId = currentFolderId || 'none';
   
    if(targetFolderId !== 'none'){
        const pFld = document.querySelector(`.card[data-id="${targetFolderId}"]`);
        if(pFld){
            targetCat = pFld.getAttribute('data-cat') || targetCat;
            targetSub = pFld.getAttribute('data-sub') || targetSub;
            targetType = pFld.getAttribute('data-type') || targetType;
            targetDetail = pFld.getAttribute('data-detail') || targetDetail;
        }
    }

    for(let id of movePendingIds){
        if(id === targetFolderId || isDescendant(targetFolderId, id)){
            alert("❌ Peringatan: Tidak dapat memindahkan Folder ke dalam dirinya sendiri atau ke dalam sub-foldernya.");
            toggleModal('pasteMenu', false);
            return;
        }
    }
     
    const topLevelItems = movePendingIds.filter(id => {
        let pid = document.querySelector(`.card[data-id="${id}"]`)?.getAttribute('data-folderId');
        while(pid && pid !== 'none'){
            if(movePendingIds.includes(pid)) return false;
            const pEl = document.querySelector(`.card[data-id="${pid}"]`);
            pid = pEl ? pEl.getAttribute('data-folderId') : null;
        }
        return true;
    });

    let movedCount = 0;
    topLevelItems.forEach(id => {
        const card = document.querySelector(`.card[data-id="${id}"]`);
        if(card){
            card.classList.remove('move-pending', 'selected');
            
            if(card.getAttribute('data-itemType') === 'folder') {
                getAllDescendantIds(id).forEach(descId => {
                    const childCard = document.querySelector(`.card[data-id="${descId}"]`);
                    if(childCard) childCard.classList.remove('move-pending', 'selected');
                });
            }

            
            if(targetCat !== 'all' && targetCat !== 'audiovideo'){
                updateCategoryRecursive(card, targetCat, targetSub, targetType, targetDetail);
            }
            
            card.setAttribute('data-folderId', targetFolderId);
            refreshCardIcon(card);
            movedCount++;
        }
    });

    movePendingIds = [];

    logActivity('Pindah', `Memindahkan ${movedCount} item ke lokasi baru.`);
    simpanKeLokal();
    filterFiles();
    updateStats();
    batalBatchAksi();
}

function batalBatchAksi() {
    // Kembalikan status move-pending menjadi selected agar centang tidak hilang saat batal
    document.querySelectorAll('.card.move-pending').forEach(b => {
        b.classList.remove('move-pending');
        b.classList.add('selected'); 
    });
    
    isMovePending = false;
    movePendingIds = [];
    isSelectingForGroup = false; 
    targetGroupForSelection = null; 
    toggleModal('pasteMenu', false);
    
    // Pembaruan UI
    if (isSelectionMode) toggleSelectionMode(false);
    else updateSelectCount();
}

function keluarModeAddMedia() {
    isAddMediaMode = false;
    document.body.classList.remove('action-mode', 'add-media-mode');
    isSelectionMode = false; 
    
    document.querySelectorAll('.card.selected').forEach(c => c.classList.remove('selected'));
    updateSelectCount();

    const btnMode = document.getElementById('btnSelectMode');

    if (btnMode) {
        btnMode.classList.remove('active-mode');
        btnMode.innerHTML = SVG_SELECT_INACTIVE;
    }

    setFilter(0, 'all'); 
    
    if (!MediaPlayer.ui.classList.contains('hidden')) {
        MediaPlayer.maximize();
        const drawer = document.getElementById('mpPlaylistDrawer');
        if(!drawer.classList.contains('open')) drawer.classList.add('open');
    } else {
        document.body.classList.remove('no-scroll', 'has-mini-player');
    }
}

let _parentCache = null, _parentCacheTimer = null;
function getParentMap() {
    if(_parentCache) return _parentCache;
    _parentCache = {};
    document.querySelectorAll('.card').forEach(c => _parentCache[c.getAttribute('data-id')] = c.getAttribute('data-folderId'));
    clearTimeout(_parentCacheTimer);
    _parentCacheTimer = setTimeout(() => _parentCache = null, 50); // Cache kadaluarsa dalam 50ms
    return _parentCache;
}
function isDescendant(a,b){
    if(a===b) return true;
    const pMap = getParentMap(); // Ambil peta relasi dari memori RAM
    let currId=a;
    while(currId && currId !== 'none'){
        const parentId = pMap[currId];
        if(!parentId) break;
        if(parentId === b) return true;
        currId = parentId;
    }
    return false;
}

function bersihkanSeleksiAnak(folderId) {
    document.querySelectorAll('.card.selected').forEach(childCard => {
        if (isDescendant(childCard.getAttribute('data-id'), folderId)) {
            childCard.classList.remove('selected');
        }
    });
}

function updateCategoryRecursive(a,b,c,d,e,allCards){a.setAttribute('data-cat',b),a.setAttribute('data-sub',c),a.setAttribute('data-type',d),a.setAttribute('data-detail',e),refreshCardIcon(a);if('folder'===a.getAttribute('data-itemType')){if(!allCards)allCards=document.querySelectorAll('.card');const targetId=a.getAttribute('data-id');allCards.forEach(f=>{if(f.getAttribute('data-folderId')===targetId)updateCategoryRecursive(f,b,c,d,e,allCards)});}}

async function tambahKePlaylistBatch(){
    const a=document.querySelectorAll('.card.selected');
    if(a.length===0)return alert("Pilih item!");
    let b=0;
    const isTargetingSaved=(window.targetPlaylistIndexForAdd!==null&&window.targetPlaylistIndexForAdd!==undefined&&window.targetPlaylistIndexForAdd!=='queue');
    let targetPlaylist=null;
    let playlists=[];
    
    if(isTargetingSaved){
        playlists=JSON.parse(getLocal('playlists')||'[]');
        targetPlaylist=playlists[window.targetPlaylistIndexForAdd];
    }
    
    // Gunakan Map untuk mencegah file duplikat (jika folder induk & file anaknya sama-sama diceklis)
    let validItems = new Map();
    
    a.forEach(c => {
        if (c.getAttribute('data-itemType') === 'file') {
            const img = c.getAttribute('data-img');
            const name = c.querySelector('.file-info').textContent;
            const type = getMediaType(img, name);
            if (type === 'audio' || type === 'video') {
                validItems.set(c.getAttribute('data-id'), c);
            }
        }
    });

    // Cegah proses berlanjut jika tidak ada satupun media A/V yang didapat
    if(validItems.size === 0) return alert("Tidak ada file media (Audio/Video) di dalam seleksi!");

    // Looping hanya pada item yang tervalidasi sebagai Audio / Video
    for(const [id, c] of validItems){
        const d=c.getAttribute('data-img'),e=c.querySelector('.file-info').textContent,g=getDriveId(d);
        let h=d;
        if('LOCAL_FILE'===d){try{const i=await dbAmbilFile(id);if(i)h=URL.createObjectURL(i)}catch(j){}}
        
        const itemData={name:e,img:h,originalImg:d,year:c.getAttribute('data-year'),isDrive:!!g,isLocal:'LOCAL_FILE'===d,id:id,customCover:c.getAttribute('data-customCover')==='true'};
        
        if(isTargetingSaved&&targetPlaylist){
            targetPlaylist.items.push(itemData);b++;
        }else{
            MediaPlayer.addToPlaylist(itemData,false,true);b++;
        }
    }
    
    // Simpan ke localStorage ditarik ke atas agar dieksekusi 1 kali saja
    if(isTargetingSaved && targetPlaylist){
        playlists[window.targetPlaylistIndexForAdd] = targetPlaylist;
        setLocal('playlists', JSON.stringify(playlists));
    }

    if(isAddMediaMode){
        keluarModeAddMedia();
        
        if(isTargetingSaved && targetPlaylist){
            MediaPlayer.loadPlaylistMenu();
            MediaPlayer.openSavedPlaylist(window.targetPlaylistIndexForAdd);
            alert(`${b} item ditambahkan ke '${targetPlaylist.name}'.`);
            } else {
                MediaPlayer.openCurrentQueue();
                if (MediaPlayer.queue.length > 0) {
                    MediaPlayer.currentIndex = MediaPlayer.queue.length - b;
                    MediaPlayer.loadTrack(false);
                }
            }
        } else {

        if(isTargetingSaved && targetPlaylist) {
            alert(`${b} item ditambahkan ke playlist '${targetPlaylist.name}'.`);
        } else {
            if(MediaPlayer.activeViewIndex==='queue') MediaPlayer.renderViewingPlaylist(MediaPlayer.queue,'queue'); else MediaPlayer.loadPlaylistMenu();
            alert(`${b} item diproses ke Antrian Saat Ini.`);
        }
        batalBatchAksi(); 
    }

    // Pembersihan variabel disatukan di akhir
    window.targetPlaylistIndexForAdd = null;
}

function bukaFolder(a){currentFolderId=a,filterFiles(),updateSelectCount(),window.scrollTo(0, 0)}

function goUpFolder() {
    if(currentFolderId && currentFolderId !== 'none') {
        const fld = document.querySelector(`.card[data-id="${currentFolderId}"]`);
        const pId = fld ? fld.getAttribute('data-folderId') : null;
        bukaFolder(!pId || pId === 'none' ? null : pId);
    }
}

function setViewMode(mode) {
    currentViewMode = mode;
    localStorage.setItem('feathera_view_mode', mode);
    const gridEl = document.getElementById('fileGrid');
    if(mode === 'list') {
        gridEl.classList.add('list-view');
    } else {
        gridEl.classList.remove('list-view');
    }
    renderBreadcrumbs();
}

function renderBreadcrumbs(){
    const a=document.getElementById('folderBreadcrumbs'),b=document.getElementById('searchName').value||document.getElementById('searchYear').value;

    let crumbHtml = '';

    // Tampilkan hierarki jika tidak sedang mode pencarian (search)
    if(!b && currentFolderId && currentFolderId !== 'none') {
        crumbHtml += `<span class="crumb-item" onclick="bukaFolder(null)">Home</span>`;
        let c=currentFolderId,d=[];
        while(c&&'none'!==c){const f=document.querySelector(`.card[data-id="${c}"]`);if(f){d.unshift({id:c,name:f.querySelector('.file-info').innerText});c=f.getAttribute('data-folderId');}else break;}
        d.forEach((f,g)=>crumbHtml+=`<span class="crumb-sep">></span><span class="${g===d.length-1?'':'crumb-item'}" ${g!==d.length-1?`onclick="bukaFolder('${f.id}')"`:''}>${f.name}</span>`);
    } else {
        crumbHtml += `<span class="crumb-item" onclick="bukaFolder(null)">Home</span>`;
    }

    // Tombol toggle View (Grid/List)
    const svgGrid = `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M4 4h6v6H4zm10 0h6v6h-6zM4 14h6v6H4zm10 0h6v6h-6z"/></svg>`;
    const svgList = `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M4 6h2v2H4zm0 5h2v2H4zm0 5h2v2H4zm4-10h12v2H8zm0 5h12v2H8zm0 5h12v2H8z"/></svg>`;
    
    const toggleHtml = `
        <button class="view-toggle-btn ${currentViewMode==='grid'?'active':''}" onclick="setViewMode('grid')" title="Grid View">${svgGrid}</button>
        <button class="view-toggle-btn ${currentViewMode==='list'?'active':''}" onclick="setViewMode('list')" title="List View">${svgList}</button>
    `;

    a.innerHTML = `<div class="crumb-left">${crumbHtml}</div><div class="crumb-right">${toggleHtml}</div>`;
}

function wrapBukaEdit(a,b){a.stopPropagation(),'none'===currentRole?requestPin(c=>{setAppRole(c),bukaEdit(b.parentElement)}):bukaEdit(b.parentElement)}

let currentSourceFilter = 'all'; 

const SVG_FILTER_ALL = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon></svg>`;
const SVG_FILTER_LOCAL = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2h9l5 5v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z"></path><path d="M8 2v4"></path><path d="M12 2v4"></path><path d="M16 4v2"></path></svg>`;
const SVG_FILTER_ONLINE = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>`;

function toggleSourceFilter() {
    const btn = document.getElementById('btnSourceFilter');
    if (currentSourceFilter === 'all') {
        currentSourceFilter = 'local';
        btn.innerHTML = SVG_FILTER_LOCAL;
        // KUNCI PERBAIKAN: Kosongkan inline color agar mewarisi warna bawaan persis seperti tombol Media Player
        btn.style.color = ''; 
        window.alert("Filter Aktif: Hanya menampilkan file Internal HP");
    } else if (currentSourceFilter === 'local') {
        currentSourceFilter = 'online';
        btn.innerHTML = SVG_FILTER_ONLINE;
        btn.style.color = '#2196F3'; // Tetap biru mutlak untuk file online
        window.alert("Filter Aktif: Hanya menampilkan file Internet / URL");
    } else {
        currentSourceFilter = 'all';
        btn.innerHTML = SVG_FILTER_ALL;
        btn.style.color = '#4CAF50'; // Tetap hijau mutlak untuk semua file
        window.alert("Filter Nonaktif: Menampilkan semua file");
    }
    filterFiles(); // Refresh grid galeri secara instan
}

// INSTRUKSI 2: Filter file disesuaikan agar menyembunyikan non AV File jika Add Media aktif.
function filterFiles(){
    const a=document.getElementById('searchName').value.toLowerCase(),b=document.getElementById('searchYear').value,c=(a||b);
    renderBreadcrumbs();
    let e=[];
    // LOGIKA FILTER LOKASI STORAGE (Lokal / Online)
    const folderSourceMap = {};
    if (typeof currentSourceFilter !== 'undefined' && currentSourceFilter !== 'all') {
        const allCards = Array.from(document.querySelectorAll('.card'));
        const parentMap = {};
        allCards.forEach(c => parentMap[c.getAttribute('data-id')] = c.getAttribute('data-folderId'));

        allCards.forEach(c => {
            if (c.getAttribute('data-itemType') === 'file') {
                const img = c.getAttribute('data-img');
                const isLocal = img === 'LOCAL_FILE' || (img && img.startsWith('NATIVE:'));
                
                let pId = c.getAttribute('data-folderId');
                // Traversing ke atas untuk melabeli semua parent folder
                while (pId && pId !== 'none') {
                    if (!folderSourceMap[pId]) folderSourceMap[pId] = { local: false, online: false };
                    if (isLocal) folderSourceMap[pId].local = true;
                    else folderSourceMap[pId].online = true;
                    
                    pId = parentMap[pId];
                }
            }
        });
    }

    document.querySelectorAll('.card').forEach(f => {
        if ('true' === f.getAttribute('data-hidden') && 'master' !== currentRole) {
            f.style.display = 'none';
            return;
        }
        
        // CACHING VARIABEL DOM: Memangkas beban kueri berulang
        const itemType = f.getAttribute('data-itemType');
        const imgStr = f.getAttribute('data-img');
        const nameStr = f.getAttribute('data-name'); // Menggunakan data-name alih-alih querySelector
        const fileYear = f.getAttribute('data-year');
        
        // HIDE SEMUA FILE SELAIN AUDIO & VIDEO SAAT SEDANG DALAM MODE ADD MEDIA
        if (isAddMediaMode && itemType === 'file') {
            const typeStr = getMediaType(imgStr, nameStr);
            if (typeStr !== 'audio' && typeStr !== 'video') {
                f.style.display = 'none';
                return; // Langsung di-skip
            }
        }

                // Logika Filter
                let g;
                if (curFilter.l0 === 'audiovideo') {
                    const type = getMediaType(imgStr, nameStr);
                    g = (type === 'audio' || type === 'video');
                } else if (curFilter.l0 === 'favorite') {
                    g = (f.getAttribute('data-favorite') === 'true');
                } else {
                    g = ('all' === curFilter.l0 || f.getAttribute('data-cat') === curFilter.l0) &&
                        ('all' === curFilter.l1 || f.getAttribute('data-sub') === curFilter.l1) &&
                        ('all' === curFilter.l2 || f.getAttribute('data-type') === curFilter.l2) &&
                        ('all' === curFilter.l3 || f.getAttribute('data-detail') === curFilter.l3);
                }

                // Logika Folder Check
                const h = (curFilter.l0 === 'audiovideo' || curFilter.l0 === 'favorite') ? true : (c ? true : (currentFolderId ? f.getAttribute('data-folderId') === currentFolderId : (!f.getAttribute('data-folderId') || 'none' === f.getAttribute('data-folderId'))));
                
                const i = !a || nameStr.includes(a);

        const j = !b || fileYear.includes(b);
        
        // Tambahan: Logika Pengecekan Sumber File
        let matchesSource = true;
        if (typeof currentSourceFilter !== 'undefined' && currentSourceFilter !== 'all') {
            if (itemType === 'file') {
                const isLocal = imgStr === 'LOCAL_FILE' || (imgStr && imgStr.startsWith('NATIVE:'));
                if (currentSourceFilter === 'local' && !isLocal) matchesSource = false;
                if (currentSourceFilter === 'online' && isLocal) matchesSource = false;
            } else if (itemType === 'folder') {
                const fId = f.getAttribute('data-id');
                const stats = folderSourceMap[fId];
                if (!stats) {
                    matchesSource = false; // Sembunyikan folder jika isinya tidak sesuai filter
                } else {
                    if (currentSourceFilter === 'local' && !stats.local) matchesSource = false;
                    if (currentSourceFilter === 'online' && !stats.online) matchesSource = false;
                }
            }
        }
        
        // Hindari operator ternary berantai yang sulit dibaca
        if (g && h && i && j && matchesSource) {
            f.style.display = "block";
            f._sortType = itemType;
            f._sortYear = parseInt(fileYear) || 0;
            f._sortName = nameStr;
            e.push(f);
        } else {
            f.style.display = "none";
        }
    });

    e.sort((f,g)=>{
        const h='folder'===f._sortType, i='folder'===g._sortType;
        if(h&&!i)return-1;if(!h&&i)return 1;
        
        const j=f._sortYear, k=g._sortYear;
        const nameF=f._sortName, nameG=g._sortName;

        if(currentSortOpt === 'name_asc') return nameF.localeCompare(nameG);
        if(currentSortOpt === 'name_desc') return nameG.localeCompare(nameF);
        if(currentSortOpt === 'year_asc') return j!==k ? j-k : nameF.localeCompare(nameG);
        
        // Default: year_desc
        return j!==k ? k-j : nameF.localeCompare(nameG);
    });
   
    // Menggunakan CSS Order untuk meminimalisir DOM Reflow
    e.forEach((g, index) => {
        g.style.order = index;
    });
   
    // Ubah teks empty state secara dinamis
    const emptyStateText = document.querySelector('#emptyState p');
    if (curFilter.l0 === 'favorite') {
        emptyStateText.innerHTML = 'Belum ada memori tersimpan.<br>Silakan edit data spesifik, tandai (✩) lalu simpan.';
    } else if (curFilter.l0 === 'all' || curFilter.l0 === 'audiovideo') {
        // Diubah: Pengecekan halaman 'Semua' dipindah ke ATAS agar tidak tertimpa state terkunci
        emptyStateText.innerHTML = 'Belum ada memori tersimpan.<br>Buka kategori spesifik untuk menambah data.';
    } else if (currentRole === 'none') {
        emptyStateText.innerHTML = 'Belum ada memori disini.<br>Silakan pergi ke Pengaturan (⚙️) dan buka kunci terlebih dahulu untuk menambah data.';
    } else {
        emptyStateText.innerHTML = 'Belum ada memori disini.<br>Tekan tombol ➕ untuk upload.';
    }

    document.getElementById('emptyState').style.display = e.length === 0 ? "flex" : "none";
}

let searchTimeout;
function debounceSearch() {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
        filterFiles();
    }, 300);
}

function gantiUrutan(val){currentSortOpt=val;localStorage.setItem('feathera_sort_opt', val);filterFiles();}

function bukaMaster(){toggleModal('modalMaster', true),initMasterTree(),masterResetForm()}
function initMasterTree(){const a=document.getElementById('masterTreeList'),b=document.getElementById('mstParent');a.innerHTML='',b.innerHTML='<option value="ROOT">Sebagai Kategori Utama</option>';const c=(d,e)=>{d&&d.forEach(f=>{const g=document.createElement('option');g.value=f.id,g.innerHTML="  ".repeat(e)+(f.icon||'')+" "+f.name,b.appendChild(g);const h=document.createElement('div');h.className='tree-item',h.setAttribute('draggable','true'),h.setAttribute('data-id',f.id),h.setAttribute('ondragstart','masterDragStart(event)'),h.setAttribute('ondragover','masterDragOver(event)'),h.setAttribute('ondrop','masterDrop(event)'),h.setAttribute('ondragleave','masterDragLeave(event)'),h.innerHTML=`<div class="tree-label level-${e}" onclick="isiFormMaster('${f.id}')">${f.icon||'📄'} ${f.name}</div><div class="tree-actions"><button onclick="hapusNode('${f.id}')" style="color:red; display:inline-flex; align-items:center;">${SVG_TRASH}</button></div>`,a.appendChild(h),f.children&&c(f.children,e+1)})};c(config,0)}
let dragSrcId=null;
function masterDragStart(a){dragSrcId=a.currentTarget.getAttribute('data-id'),a.currentTarget.classList.add('dragging'),a.dataTransfer.effectAllowed='move'}
function masterDragOver(a){return a.preventDefault(),a.currentTarget.getAttribute('data-id')!==dragSrcId&&a.currentTarget.classList.add('drag-over'),a.dataTransfer.dropEffect='move',false}
function masterDragLeave(a){a.currentTarget.classList.remove('drag-over')}
function masterDrop(a){a.stopPropagation(),a.currentTarget.classList.remove('drag-over');const b=a.currentTarget.getAttribute('data-id');document.querySelectorAll('.tree-item').forEach(c=>c.classList.remove('dragging')),dragSrcId&&b&&dragSrcId!==b&&reorderNodes(dragSrcId,b);return false}
function reorderNodes(a,b){const c=findNodeAndParent(config,a,null),d=findNodeAndParent(config,b,null);if(c&&d){if(isDescendantConfig(c.node,b))return alert("Tidak bisa memindahkan folder induk ke dalam sub-folder sendiri!");c.array.splice(c.index,1);const e=findNodeAndParent(config,b,null);e.array.splice(e.index,0,c.node),saveConfig()}}
function findNodeAndParent(a,b,c){for(let d=0;d<a.length;d++){if(a[d].id===b)return{node:a[d],parent:c,index:d,array:a};if(a[d].children){const e=findNodeAndParent(a[d].children,b,a[d]);if(e)return e}}return null}
function isDescendantConfig(a,b){if(!a.children)return false;for(let c of a.children){if(c.id===b||isDescendantConfig(c,b))return true}return false}
function masterTambah(){const a=document.getElementById('mstId').value.trim().toLowerCase(),b=document.getElementById('mstName').value.trim(),c=document.getElementById('mstIcon').value.trim(),d=document.getElementById('mstParent').value;if(!a||!b||a.includes(" "))return alert("ID invalid!");if(flatConfig[a])return alert("ID terpakai!");const e={id:a,name:b,icon:c,children:[]},f='ROOT'===d?null:findNode(config,d);f?(f.children=f.children||[],f.children.push(e)):config.push(e),saveConfig(),masterResetForm()}
function masterUpdate(){nodeToEdit&&(nodeToEdit.node.name=document.getElementById('mstName').value.trim(),nodeToEdit.node.icon=document.getElementById('mstIcon').value.trim(),saveConfig(),masterResetForm())}
async function hapusNode(a){const catName=(flatConfig[a]||findNode(config,a))?.name||"ini";if(await customConfirm(`Yakin menghapus kategori: ${catName}?`)){const b=c=>{const d=c.findIndex(e=>e.id===a);if(d>-1)return c.splice(d,1),true;for(let e of c)if(e.children&&b(e.children))return true};b(config),saveConfig()}}

function findNode(a,b){for(let c of a){if(c.id===b)return c;if(c.children){const d=findNode(c.children,b);if(d)return d}}return null}
function isiFormMaster(a){const b=flatConfig[a];nodeToEdit={node:findNode(config,a)},document.getElementById('mstId').value=b.id,document.getElementById('mstId').disabled=true,document.getElementById('mstName').value=b.name,document.getElementById('mstIcon').value=b.icon||'',document.getElementById('btnAddNode').classList.add('hidden'),document.getElementById('btnUpdateNode').classList.remove('hidden'),document.getElementById('btnCancelNode').classList.remove('hidden')}
function masterResetForm(){nodeToEdit=null,document.getElementById('mstId').value='',document.getElementById('mstId').disabled=false,document.getElementById('mstName').value='',document.getElementById('mstIcon').value='',document.getElementById('btnAddNode').classList.remove('hidden'),document.getElementById('btnUpdateNode').classList.add('hidden'),document.getElementById('btnCancelNode').classList.add('hidden')}
function saveConfig(){setLocal('config_v1',JSON.stringify(config)),flattenConfig(),renderNav(),renderChips(),initMasterTree()}

async function showFileViewer(a,b,c,d,origImg,fileId,hasCover){
    document.getElementById('fileTitleDisplay').innerHTML=`<div style="display:flex; align-items:center;">${getStorageIcon(origImg)}<span style="white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${a}</span></div>`,document.getElementById('fileDesc').innerHTML=linkify(b)||"Tidak ada deskripsi.",document.getElementById('fileIconDisplay').innerHTML=getExtIcon(d,a);

    // Render cover kustom jika tersedia
    if(hasCover && fileId) {
        try {
            const blob = await dbAmbilCover(fileId);
            if (blob) {
                const url = URL.createObjectURL(blob);
                document.getElementById('fileIconDisplay').innerHTML = `<img src="${url}" style="width: 100px; height: 100px; object-fit: cover; border-radius: 8px; box-shadow: 0 4px 8px rgba(0,0,0,0.3);" onload="URL.revokeObjectURL(this.src)">`;
            }
        } catch(err){}
    }

    const e=document.getElementById('btnDownloadFile'),f=document.getElementById('iframeContainer'),g=document.getElementById('fileIframe'),h=getDownloadUrl(c);

    f.style.display='none',g.removeAttribute('src'),e.style.display='block';
    
    // Logika Pemisahan Aksi Preview vs Download
    if('doc'===d && c.includes('drive.google.com')){
        f.style.display='block';
        g.src=getPreviewUrl(c);
        e.innerHTML=SVG_SHARE + " Buka di Tab Baru";
        e.onclick=()=>window.open(c,'_blank');
    } else {
        e.innerHTML=SVG_DOWNLOAD + " Download / Buka File";
        e.onclick = () => {
            const link = document.createElement('a');
            link.download = a; // Menggunakan nama asli file (parameter 'a')
            
            // Logika untuk file Lokal (Blob) atau Native Capacitor
            if (origImg === 'LOCAL_FILE' || (origImg && origImg.startsWith('NATIVE:'))) {
                link.href = c; // 'c' adalah hasil konversi URL.createObjectURL / convertFileSrc
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            } else {
                // Logika untuk file Eksternal (URL luar)
                link.href = h;
                link.target = '_blank';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            }
        };
    }
    
    // Memicu animasi aura/floating card untuk file yang terhubung
    spawnRelatedAnimations(fileId);
    toggleModal('modalFileViewer', true);
}

function downloadText(){if(!currentTextContent)return alert("Kosong!");const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([currentTextContent],{type:'text/plain'})),a.download=(document.getElementById('textTitleDisplay').innerText||'Catatan')+'.txt',a.click()}
function shareText(){currentTextContent?navigator.share?navigator.share({title:document.getElementById('textTitleDisplay').innerText,text:currentTextContent}):alert("Browser tidak mendukung share."):alert("Kosong!")}
// Fungsi Global Menghentikan Animasi Aura
function stopRelatedAnimations() {
    const wrapper = document.getElementById('relatedAnimWrapper');
    if (wrapper) wrapper.remove();
}

const ImgViewer={
    list:[],index:0,timer:null,zoom:1,lastDist:0,
    open:async function(a){
        this.list=[];const b=document.querySelectorAll('.card[data-itemType="file"]');
        for (const c of b) {
            if ('none' !== c.style.display && 'image' === getMediaType(c.getAttribute('data-img'), c.querySelector('.file-info').innerText)) {
                let d = c.getAttribute('data-img');
                if ('LOCAL_FILE' === d) {
                  d = 'LOCAL_FILE'; // Biarkan ditangani secara malas (Lazy Load) oleh mesin render
                } else if (d && d.startsWith('NATIVE:')) {
                    const nativePath = d.replace('NATIVE:', '');
                    d = window.Capacitor.convertFileSrc(nativePath);
                } else {
                    d = (getDriveId(d) ? `https://drive.google.com/thumbnail?id=${getDriveId(d)}&sz=w4000` : getDirectUrl(d));
                }
                
                const isLocalMedia = ('LOCAL_FILE' === c.getAttribute('data-img') || (c.getAttribute('data-img') && c.getAttribute('data-img').startsWith('NATIVE:')));
                this.list.push({ id: c.getAttribute('data-id'), src: d, originalImg: c.getAttribute('data-img'), name: c.querySelector('.file-info').innerText, year: c.getAttribute('data-year'), note: c.getAttribute('data-descaura') === 'true' ? "" : c.getAttribute('data-note'), isLocal: isLocalMedia });
            }
        }
        const c = a.querySelector('.file-info').innerText;
        this.index = this.list.findIndex(d => d.name === c);
        if (-1 === this.index) this.index = 0;
document.getElementById('textViewContainer').style.display='none',document.getElementById('imgViewFull').style.display='block',document.getElementById('imgViewCaption').style.display='block',document.querySelectorAll('.overlay-btn').forEach(d=>d.style.display='flex'),this.render(),toggleModal('modalImageViewer', true),this.initZoom()
    },

    initZoom:function(){const a=document.getElementById('imgViewFull');this.zoom=1,a.style.transform=`scale(1)`;a.addEventListener('touchstart',b=>{document.fullscreenElement&&2===b.touches.length&&(this.lastDist=Math.hypot(b.touches[0].pageX-b.touches[1].pageX,b.touches[0].pageY-b.touches[1].pageY))}),a.addEventListener('touchmove',b=>{if(document.fullscreenElement&&2===b.touches.length){const c=Math.hypot(b.touches[0].pageX-b.touches[1].pageX,b.touches[0].pageY-b.touches[1].pageY);if(this.lastDist){const d=c/this.lastDist;this.zoom=Math.min(Math.max(1,this.zoom*d),5),a.style.transform=`scale(${this.zoom})`,this.lastDist=c}}}),a.addEventListener('touchend',()=>{this.lastDist=0})},
    render: async function(){
    const a=this.list[this.index],b=document.getElementById('imgViewFull');
    if(this._activeBlob){ URL.revokeObjectURL(this._activeBlob); this._activeBlob=null; }

    let viewSrc = a.src;
    if(a.isLocal && viewSrc === 'LOCAL_FILE'){
        try{
            const file = await dbAmbilFile(a.id);
            if(file){ viewSrc = URL.createObjectURL(file); this._activeBlob = viewSrc; }
        }catch(e){}
    }
    b.src=viewSrc; b.style.transform='scale(1)'; this.zoom=1; spawnRelatedAnimations(a.id);
    let cText=`${this.index+1}/${this.list.length} - ${a.name}`;
    a.year&&'none'!==a.year&&(cText+=` (${a.year})`);
    a.note&&'none'!==a.note&&(cText+=`\n${a.note}`);
    const storageIco=getStorageIcon(a.originalImg);
    document.getElementById('imgViewCaption').innerHTML=`<div style="display:flex; align-items:flex-start; width:100%;"><div style="flex-shrink:0; margin-top:-1px;">${storageIco}</div><div style="flex-grow:1; text-align:center; white-space:pre-wrap;">${cText}</div><div style="width:14px; flex-shrink:0;"></div></div>`
},

    next:function(){this.index=(this.index+1)%this.list.length,this.render()},
    prev:function(){this.index=(this.index-1+this.list.length)%this.list.length,this.render()},
    toggleSlide:function(){this.timer?(clearInterval(this.timer),this.timer=null,document.getElementById('btnSlideImg').innerText='▶ Slideshow'):(this.timer=setInterval(()=>this.next(),3000),document.getElementById('btnSlideImg').innerText='⏹ Slideshow')},
    viewFull:function(){const a=document.querySelector('.full-image-container');if(a.requestFullscreen)a.requestFullscreen();},
    exitFull:function(){if(document.fullscreenElement&&document.exitFullscreen)document.exitFullscreen();},
    downloadCurrent:function(){const a=this.list[this.index];if(!a)return;const b=document.createElement('a');b.download=a.name;a.isLocal&&a.src.startsWith('blob:')?b.href=a.src:(b.href=getDownloadUrl(a.src)||a.src,b.target='_blank');b.click();},
    close:function(){this.timer&&this.toggleSlide(),stopRelatedAnimations(),toggleModal('modalImageViewer', false),document.getElementById('textViewContainer').style.display='none',document.getElementById('imgViewFull').style.display='block'; document.getElementById('imgViewFull').removeAttribute('src'); 
    if(this._activeBlob){ URL.revokeObjectURL(this._activeBlob); this._activeBlob=null; }
    this.list = [];}
};

function formatTimeMedia(sec){if(isNaN(sec)||!isFinite(sec))return "0:00";const m=Math.floor(sec/60),s=Math.floor(sec%60);return `${m}:${s<10?'0':''}${s}`;}

const MediaPlayer={
    queue:[],currentIndex:0,isPlaying:false,mode:0,audioCtx:null,analyser:null,source:null,minimized:false,driveFrame:null,ui:null,aEl:null,vEl:null,progBar:null,currTimeEl:null,durTimeEl:null,lyricsData:[],currentLyricIndex:-1,isShowingLyrics:false,isLyricsSynced:false,sleepMode:false,wakeLockSentinel:null,activeViewIndex:null,currentLocalBlobUrl:null,currentSpeed:1.0,pressTimer:null,

   init:function(){

    this.ui=document.getElementById('mediaPlayerUI'),this.aEl=document.getElementById('html5Audio'),this.vEl=document.getElementById('html5Video'),this.driveFrame=document.getElementById('drivePlayerFrame'),this.miniVid=document.getElementById('miniVideoPreview'),this.btnPlay=document.getElementById('btnPlayPause'),this.btnMiniPlay=document.getElementById('btnMiniPlay'),this.progBar=document.getElementById('mpProgressBar'),this.currTimeEl=document.getElementById('mpCurrTime'),this.durTimeEl=document.getElementById('mpDurTime');this.handleEmptyState();
    [this.aEl, this.vEl].forEach(media => {         media.onended = () => this.onTrackEnd();         media.ontimeupdate = () => this.updateTime(media);         media.onplay = () => { this.syncPlayState(true); if(media === this.vEl) this.miniVid.play().catch(()=>{}); };         media.onpause = () => { this.syncPlayState(false); if(media === this.vEl) this.miniVid.pause(); };     });document.getElementById('btnToggleLyrics').onclick=()=>this.toggleLyricsView();    document.getElementById('chkKeepScreen').addEventListener('change',()=>{this.toggleWakeLock()});if(!this.audioCtx)try{const b=window.AudioContext||window.webkitAudioContext;this.audioCtx=new b,this.analyser=this.audioCtx.createAnalyser(),this.source=this.audioCtx.createMediaElementSource(this.aEl),this.source.connect(this.analyser),this.analyser.connect(this.audioCtx.destination),this.drawVisualizer()}catch(b){}if(!window.YT){var c=document.createElement('script');c.src="https://www.youtube.com/iframe_api",document.body.appendChild(c)}
    
    // Deteksi Long-Press untuk Menampilkan Popup Kecepatan
    const visualArea = document.querySelector('.mp-visual');
    const speedPopup = document.getElementById('speedPopup');
    
    visualArea.addEventListener('touchstart', (e) => {
        // Abaikan jika area sentuh adalah tombol atau dalam area popup
        if(e.target.closest('button') || e.target.closest('.switch') || e.target.closest('#speedPopup')) return;
        
        this.pressTimer = setTimeout(() => {
            speedPopup.style.display = 'flex'; // Munculkan modal popup
            try { navigator.vibrate && navigator.vibrate(50); } catch(err){}
        }, 600); // Popup muncul setelah ditahan 600ms
    }, {passive: true});

    const cancelPress = () => {
        clearTimeout(this.pressTimer);
    };

    visualArea.addEventListener('touchend', cancelPress, {passive: true});
    visualArea.addEventListener('touchcancel', cancelPress, {passive: true});
    visualArea.addEventListener('touchmove', cancelPress, {passive: true}); // Batal jika jari digeser
    },

    toggleFullScreen:function(){const elem=document.getElementById('mpVideoBox');if(!document.fullscreenElement){elem.requestFullscreen().catch(err=>{alert(`Error trying to enable full-screen mode: ${err.message} (${err.name})`)})}else{document.exitFullscreen()}},

    toggleWakeLock:async function(){const checkbox=document.getElementById('chkKeepScreen');try{if(checkbox.checked){if('wakeLock'in navigator){this.wakeLockSentinel=await navigator.wakeLock.request('screen');console.log('Screen Wake Lock active')}else{alert('Browser tidak mendukung Wake Lock');checkbox.checked=false}}else{if(this.wakeLockSentinel){await this.wakeLockSentinel.release();this.wakeLockSentinel=null;console.log('Screen Wake Lock released')}}}catch(err){console.error(`${err.name}, ${err.message}`);checkbox.checked=false}},
    syncPlayState:function(state){this.isPlaying=state;this.updatePlayBtn()},
    changeMode:function(){this.mode=(this.mode+1)%3;const a=document.getElementById('btnMode');0===this.mode?(a.innerHTML=SVG_LOOP,a.title="Loop All"):1===this.mode?(a.innerHTML=SVG_SHUFFLE,a.title="Shuffle"):(a.innerHTML=SVG_ONE,a.title="Repeat One")},
    
    setSpeed:function(speed){
        this.currentSpeed = parseFloat(speed);
        
        // Aplikasikan kecepatan ke API Player yang aktif
        if(this.aEl) this.aEl.playbackRate = this.currentSpeed;
        if(this.vEl) this.vEl.playbackRate = this.currentSpeed;
        if(typeof ytPlayer !== 'undefined' && ytPlayer && ytPlayer.setPlaybackRate) {
            try { ytPlayer.setPlaybackRate(this.currentSpeed); } catch(err){}
        }
        
        // Update visual tombol aktif di Popup agar seragam (Optimasi 1 Siklus)
        const popup = document.getElementById('speedPopup');
        if (popup) {
            popup.querySelectorAll('.speed-btn').forEach(btn => {
                btn.classList.toggle('active', parseFloat(btn.dataset.speed) === this.currentSpeed);
            });
            // Sembunyikan otomatis setelah memilih
            popup.style.display = 'none';
        }
    },

    addToPlaylist:function(a,b=false,c=false){this.queue.push(a),b?(this.currentIndex=this.queue.length-1,this.loadTrack(true),this.show()):(1===this.queue.length&&!this.isPlaying&&(this.currentIndex=0,this.loadTrack(false)));if(!c){if(this.activeViewIndex==='queue')this.renderViewingPlaylist(this.queue,'queue');else this.loadPlaylistMenu()}},
    removeFromQueue:function(a){this.queue.splice(a,1),a<this.currentIndex?this.currentIndex--:a===this.currentIndex&&this.queue.length>0?(this.currentIndex=a%this.queue.length,this.loadTrack(this.isPlaying)):0===this.queue.length&&this.handleEmptyState();
    if(this.activeViewIndex==='queue')this.renderViewingPlaylist(this.queue,'queue');else this.loadPlaylistMenu()},
    clearPlaylist:function(){this.queue=[],this.handleEmptyState(),this.close();document.getElementById('mpPlaylistList').innerHTML=''},

    handleEmptyState:function(){
        if(this.currentLocalBlobUrl){URL.revokeObjectURL(this.currentLocalBlobUrl);this.currentLocalBlobUrl=null;}
        const a=document.getElementById('mpArt'),b=document.getElementById('miniArtBg');

        a.style.backgroundImage='none',a.innerHTML='';
        b.style.backgroundImage='none',b.innerHTML='';
        document.getElementById('mpVideoBox').style.display='none';
        document.getElementById('visualizerCanvas').style.display='none';
        document.getElementById('miniVisualizer').style.display='none';
        this.miniVid.style.display='none';
        document.getElementById('miniDriveFrame').style.display='none';
        document.getElementById('btnToggleLyrics').style.display='none';
        this.parseLyrics("");
        
        // Hentikan dan bersihkan sisa pemutaran di latar belakang
        if(this.aEl) { this.aEl.pause(); this.aEl.src = ""; this.aEl.load(); }
        if(this.vEl) { this.vEl.pause(); this.vEl.src = ""; this.vEl.load(); }

        if(typeof ytPlayer !== 'undefined' && ytPlayer && ytPlayer.stopVideo) ytPlayer.stopVideo();
        if(this.driveFrame) this.driveFrame.removeAttribute('src');

        // Reset running text
document.querySelector('#mpHeaderTitle .marquee-text').innerHTML = `<svg width="14" height="14" viewBox="0 0 394 462" fill="currentColor" style="vertical-align: text-bottom; margin-right: 4px;"><use href="#feather-icon-def"></use></svg>Feathera Player`;

        document.querySelector('#miniTitle.marquee-text').innerText = "Tidak ada lagu";
        document.getElementById('miniSub').innerText="Antrian kosong";
        
        // Memaksa reset progress bar dan durasi menggunakan elemen cache
        if(this.progBar) this.progBar.style.width = '0%';
        if(this.currTimeEl) this.currTimeEl.innerText = '0:00';
        if(this.durTimeEl) this.durTimeEl.innerText = '0:00';},

    parseLyrics:function(lyricStr){this.lyricsData=[];this.currentLyricIndex=-1;if(!lyricStr){this.renderLyrics();return}const lines=lyricStr.split('\n');const timeRegex=/\[\d{2}:\d{2}(?:\.\d+)?\]/g;const extractTimeRegex=/\[(\d{2}):(\d{2}(?:\.\d+)?)\]/;const bracketRegex=/\[.*?\]/g;let hasSync=false;lines.forEach(line=>{const timeMatches=line.match(timeRegex);let cleanText=line.replace(bracketRegex,'').trim();if(timeMatches&&timeMatches.length>0){hasSync=true;timeMatches.forEach(tMatch=>{const ext=extractTimeRegex.exec(tMatch);if(ext){const m=parseInt(ext[1],10);const s=parseFloat(ext[2]);if(cleanText){this.lyricsData.push({time:m*60+s,text:cleanText||'...'})}}})}else if(!hasSync&&cleanText){this.lyricsData.push({time:0,text:cleanText})}});this.lyricsData.sort((a,b)=>a.time-b.time);this.isLyricsSynced=hasSync;this.renderLyrics()},
    renderLyrics:function(){const container=document.getElementById('lyricsContainer');container.innerHTML='';if(this.lyricsData.length===0){container.innerHTML='<div class="lyric-line" style="opacity:0.5; margin-top:50%;">Lirik tidak tersedia</div>';return}this.lyricsData.forEach((lineData,idx)=>{const p=document.createElement('div');p.className='lyric-line';p.id='lyric_'+idx;p.innerText=lineData.text;container.appendChild(p)})},
    updateLyricsSync:function(currentTime){if(!this.lyricsData||this.lyricsData.length===0||!this.isLyricsSynced)return;let activeIdx=-1;for(let i=0;i<this.lyricsData.length;i++){if(currentTime>=this.lyricsData[i].time){activeIdx=i}else{break}}if(activeIdx!==this.currentLyricIndex){if(this.currentLyricIndex>=0){const oldP=document.getElementById('lyric_'+this.currentLyricIndex);if(oldP)oldP.classList.remove('active')}this.currentLyricIndex=activeIdx;if(activeIdx>=0){const newP=document.getElementById('lyric_'+activeIdx);if(newP){newP.classList.add('active');const container=document.getElementById('lyricsContainer');container.scrollTop=newP.offsetTop-container.offsetHeight/2+newP.offsetHeight/2}}}},
    toggleLyricsView:function(){this.isShowingLyrics=!this.isShowingLyrics;const art=document.getElementById('mpArt');const lyrics=document.getElementById('lyricsContainer');const btn=document.getElementById('btnToggleLyrics');const sleepArea=document.getElementById('sleepToggleArea');if(this.isShowingLyrics){art.style.display='none';lyrics.style.display='flex';sleepArea.style.display='flex';btn.innerHTML=SVG_COVER;if(this.currentLyricIndex>=0){const p=document.getElementById('lyric_'+this.currentLyricIndex);if(p)lyrics.scrollTop=p.offsetTop-lyrics.offsetHeight/2+p.offsetHeight/2}}else{art.style.display='flex';lyrics.style.display='none';sleepArea.style.display='none';btn.innerHTML=SVG_LYRICS}},

    readID3:function(source,targetIndex){if(!window.jsmediatags){this.parseLyrics("");return}window.jsmediatags.read(source,{onSuccess:(tag)=>{if(targetIndex!==undefined&&targetIndex!==MediaPlayer.currentIndex)return;const picture=tag.tags.picture;const mpArt=document.getElementById('mpArt');const miniArtBg=document.getElementById('miniArtBg');if(picture){let base64String="";for(let i=0;i<picture.data.length;i++){base64String+=String.fromCharCode(picture.data[i])}const base64="data:"+picture.format+";base64,"+window.btoa(base64String);mpArt.style.backgroundImage=`url('${base64}')`;miniArtBg.style.backgroundImage=`url('${base64}')`;mpArt.innerHTML='';miniArtBg.innerHTML=''}else{mpArt.style.backgroundImage='none';mpArt.innerHTML='<span style="font-size:50px;">🎧</span>';miniArtBg.style.backgroundImage='none';miniArtBg.innerHTML='<span style="font-size:20px;">🎧</span>'}let lyricStr="";if(tag.tags.lyrics&&tag.tags.lyrics.lyrics){lyricStr=tag.tags.lyrics.lyrics}else if(tag.tags.USLT){lyricStr=tag.tags.USLT.lyrics||tag.tags.USLT.text}MediaPlayer.parseLyrics(lyricStr)},onError:(error)=>{if(targetIndex!==undefined&&targetIndex!==MediaPlayer.currentIndex)return;document.getElementById('mpArt').innerHTML='<span style="font-size:50px;">🎧</span>';MediaPlayer.parseLyrics("")}})},
    loadTrack:async function(a=true){
    !this.ui&&this.init();const b=this.queue[this.currentIndex];if(!b)return this.handleEmptyState();spawnRelatedAnimations(b.id);this.aEl.pause();this.vEl.pause();this.aEl.removeAttribute('src');this.vEl.removeAttribute('src');this.aEl.load();this.vEl.load();ytPlayer&&ytPlayer.stopVideo&&ytPlayer.stopVideo();ytInterval&&clearInterval(ytInterval);this.driveFrame.removeAttribute('src');const c=getMediaType(b.img,b.name),d=getYoutubeId(b.img),e=b.isDrive;this.progBar.parentElement.style.visibility='visible';this.btnPlay.style.visibility='visible';this.btnMiniPlay.style.visibility='visible';document.body.classList.toggle('is-audio-mode',c==='audio');document.getElementById('html5Video').style.display='none',document.getElementById('ytVideoPlayer').style.display='none',this.driveFrame.style.display='none';const btnLy=document.getElementById('btnToggleLyrics');const sleepArea=document.getElementById('sleepToggleArea');if(c==='audio'){btnLy.style.display='flex'}else{btnLy.style.display='none';sleepArea.style.display='none'}this.isShowingLyrics=false;document.getElementById('mpArt').style.display='flex';document.getElementById('lyricsContainer').style.display='none';btnLy.innerHTML=SVG_LYRICS;
sleepArea.style.display='none';const g=document.getElementById('mpArt'),h=document.getElementById('miniArtBg');const miniVis=document.getElementById('miniVisualizer');const miniVid=document.getElementById('miniVideoPreview');const miniIframe=document.getElementById('miniDriveFrame');miniVis.style.display='none';miniVid.style.display='none';miniIframe.style.display='none';miniVid.removeAttribute('src');miniIframe.removeAttribute('src');g.style.backgroundImage='none';g.innerHTML='';h.style.backgroundImage='none';h.innerHTML='';    
    let playSrc=getDirectUrl(b.img);
    if(this.currentLocalBlobUrl){URL.revokeObjectURL(this.currentLocalBlobUrl);this.currentLocalBlobUrl=null;}
    
    // --- PERBAIKAN VIDEO KAMERA: INTERSEPTOR BLOB LOKAL & MIME TYPE ---
    let hasLocalBlob = false;
    try {
        if (b.id) {
            const freshBlob = await dbAmbilFile(b.id);
            if (freshBlob) {
                // Paksa perbaikan MIME type jika kosong/generic dari mesin WebView
                let mimeType = freshBlob.type;
                if (!mimeType || mimeType === 'application/octet-stream' || mimeType === '') {
                    if (b.name.toLowerCase().endsWith('.mp4')) mimeType = 'video/mp4';
                    else if (b.name.toLowerCase().endsWith('.webm')) mimeType = 'video/webm';
                    else if (b.name.toLowerCase().endsWith('.mov')) mimeType = 'video/quicktime';
                }
                // Bungkus ulang Blob dengan MIME Type yang telah dibersihkan
                const typedBlob = (mimeType && mimeType !== freshBlob.type) ? new Blob([freshBlob], { type: mimeType }) : freshBlob;
                
                playSrc = URL.createObjectURL(typedBlob);
                b.img = playSrc;
                this.currentLocalBlobUrl = playSrc;
                b.isLocal = true; 
                hasLocalBlob = true;
            }
        }
    } catch(err) { console.error("Gagal intersep file lokal:", err) }

    // --- TAMBAHAN PEMBACA NATIVE ---
    if(!hasLocalBlob && b.img && typeof b.img === 'string' && b.img.startsWith('NATIVE:')) {
        const nativePath = b.img.replace('NATIVE:', '');
        playSrc = window.Capacitor.convertFileSrc(nativePath);
        b.isLocal = false; 
    }
    // -------------------------------
    
    document.querySelector('.vid-fs-btn').style.display='none';
if(d){document.getElementById('ytVideoPlayer').style.display='block';document.getElementById('mpVideoBox').style.display='flex';document.getElementById('visualizerCanvas').style.display='none';document.querySelector('.mp-time').innerHTML='<span id="mpCurrTime">0:00</span><span id="mpDurTime">0:00</span>'}else if('video'===c){document.querySelector('.vid-fs-btn').style.display='flex';document.getElementById('mpVideoBox').style.display='flex',this.vEl.style.display='block',this.vEl.src=playSrc,a&&this.vEl.play().then(()=>this.syncPlayState(true)).catch(()=>{this.syncPlayState(false)});this.isPlaying=a;document.getElementById('visualizerCanvas').style.display='none';document.querySelector('.mp-time').innerHTML='<span id="mpCurrTime">0:00</span><span id="mpDurTime">0:00</span>';miniVid.src=playSrc;miniVid.style.display='block';if(a)miniVid.play().catch(()=>{})}else{document.getElementById('mpVideoBox').style.display='none',this.aEl.src=playSrc,a&&this.audioCtx.resume().then(()=>this.aEl.play().then(()=>this.syncPlayState(true)).catch(()=>{this.syncPlayState(false)}));this.isPlaying=a;document.querySelector('.mp-time').innerHTML='<span id="mpCurrTime">0:00</span><span id="mpDurTime">0:00</span>';miniVis.style.display='block';if(!this.sleepMode)document.getElementById('visualizerCanvas').style.display='block'}this.currTimeEl=document.getElementById('mpCurrTime'); this.durTimeEl=document.getElementById('mpDurTime'); const setCoverAndLyrics=async()=>{let coverUrl=null;let isLocalBlob=false;this.parseLyrics("");if(b.customCover&&b.id){try{const blob=await dbAmbilCover(b.id);if(blob)coverUrl=URL.createObjectURL(blob)}catch(err){}}if('audio'===c){if(b.isLocal&&b.id){try{const audioBlob=await dbAmbilFile(b.id);if(audioBlob){MediaPlayer.readID3(audioBlob,this.currentIndex);isLocalBlob=true}}catch(err){}}else if(playSrc&&playSrc!=='LOCAL_FILE'){MediaPlayer.readID3(playSrc,this.currentIndex);isLocalBlob=true}}if(!coverUrl&&!isLocalBlob&&'video'===c&&b.img&&b.img!=='LOCAL_FILE')coverUrl=getThumbUrl(b.img);if(!coverUrl&&!isLocalBlob&&'audio'===c&&b.img&&b.img!=='LOCAL_FILE')coverUrl=getThumbUrl(b.img);if(coverUrl){g.style.backgroundImage=`url('${coverUrl}')`;g.innerHTML='';h.style.backgroundImage=`url('${coverUrl}')`;h.innerHTML=''}else if(!isLocalBlob){g.style.backgroundImage='none';h.style.backgroundImage='none';if('audio'===c||'video'===c){g.innerHTML='';h.innerHTML=''}}};await setCoverAndLyrics();
        // Update Running Text
        const headerTitleEl = document.querySelector('#mpHeaderTitle .marquee-text');
        if(headerTitleEl) headerTitleEl.innerText = b.name;
        
        const miniTitleEl = document.querySelector('#miniTitle.marquee-text');
        if(miniTitleEl) miniTitleEl.innerText = b.name;
        
        document.getElementById('miniSub').innerText=b.year||'Unknown';
        if(d){this.isPlaying=a,ytPlayer?(ytPlayer.loadVideoById(d),a?ytPlayer.playVideo():ytPlayer.pauseVideo()):ytPlayer=new YT.Player('ytVideoPlayer',{height:'100%',width:'100%',videoId:d,playerVars:{'autoplay':a?1:0,'controls':0,'rel':0},events:{'onStateChange':this.onPlayerStateChange,'onReady':k=>{a&&k.target.playVideo()}}});ytInterval=setInterval(()=>this.syncYoutubeTime(),500)}this.updatePlayBtn();if(this.activeViewIndex!==null){if(this.activeViewIndex==='queue')this.renderViewingPlaylist(this.queue,'queue');else{const bArray=JSON.parse(getLocal('playlists')||'[]');if(bArray[this.activeViewIndex])this.renderViewingPlaylist(bArray[this.activeViewIndex].items,this.activeViewIndex)}}this.setSpeed(this.currentSpeed);
    },onPlayerStateChange:function(a){MediaPlayer.isPlaying=a.data==YT.PlayerState.PLAYING,a.data==YT.PlayerState.ENDED&&MediaPlayer.onTrackEnd(),MediaPlayer.updatePlayBtn()},renderProgressUI: function(cur, dur) {         
          if(this.progBar) this.progBar.style.width = (cur / dur * 100) + '%';         
          if(this.currTimeEl) this.currTimeEl.innerText = formatTimeMedia(cur);         
          if(this.durTimeEl) this.durTimeEl.innerText = formatTimeMedia(dur);},
        syncYoutubeTime:function(){if(ytPlayer&&ytPlayer.getCurrentTime){const a=ytPlayer.getCurrentTime(),b=ytPlayer.getDuration();if(b){this.renderProgressUI(a, b);}}},    
        togglePlay:function(){const a=this.queue[this.currentIndex];if(!a)return;if(getYoutubeId(a.img)&&ytPlayer){ytPlayer.getPlayerState()===YT.PlayerState.PLAYING?ytPlayer.pauseVideo():ytPlayer.playVideo()}else if(this.aEl.src&&this.aEl.src!==window.location.href){this.aEl.paused?this.aEl.play().then(()=>this.syncPlayState(true)).catch(e=>{alert("Gagal memutar Audio. Kemungkinan besar API Key Google Cloud Anda dibatasi (Restricted) atau file tidak bersifat Publik. Detil: "+e.message);this.syncPlayState(false)}):this.aEl.pause()}else if(this.vEl.src&&this.vEl.src!==window.location.href){if(this.vEl.paused){this.vEl.play().then(()=>this.syncPlayState(true)).catch(e=>{alert("Gagal memutar Video. Kemungkinan besar API Key Google Cloud Anda dibatasi (Restricted) atau file tidak bersifat Publik. Detil: "+e.message);this.syncPlayState(false)});this.miniVid.play().catch(()=>{})}else{this.vEl.pause();this.miniVid.pause()}}this.updatePlayBtn()},next:function(){0!==this.queue.length&&(this.currentIndex=1===this.mode?Math.floor(Math.random()*this.queue.length):(this.currentIndex+1)%this.queue.length,this.loadTrack())},prev:function(){0!==this.queue.length&&(this.currentIndex=(this.currentIndex-1+this.queue.length)%this.queue.length,this.loadTrack())},onTrackEnd:function(){2===this.mode?this.loadTrack(true):(this.queue.length<=1?(this.isPlaying=false,this.updatePlayBtn()):this.next())},seek:function(a){if(0===this.queue.length||(this.queue[this.currentIndex].isDrive&&!getDirectUrl(this.queue[this.currentIndex].img).includes('export=download')))return;const b=a.offsetX/a.currentTarget.offsetWidth;if(getYoutubeId(this.queue[this.currentIndex].img)&&ytPlayer){ytPlayer.seekTo(ytPlayer.getDuration()*b,true)}else{if(this.aEl.duration)this.aEl.currentTime=this.aEl.duration*b;if(this.vEl.duration){this.vEl.currentTime=this.vEl.duration*b;document.getElementById('miniVideoPreview').currentTime=this.vEl.duration*b;}}},    updateTime:function(a){if(!a.duration)return;const b=a.currentTime,c=a.duration;this.renderProgressUI(b, c);if(a===this.vEl){if(Math.abs(this.miniVid.currentTime-b)>0.5)this.miniVid.currentTime=b;}if(a===this.aEl){this.updateLyricsSync(b);}},updatePlayBtn:function(){this.btnPlay.innerHTML=this.isPlaying?SVG_PAUSE_CIRCLE:SVG_PLAY_CIRCLE;this.btnMiniPlay.innerHTML=this.isPlaying?SVG_PAUSE_CIRCLE:SVG_PLAY_CIRCLE;this.btnMiniPlay.classList.toggle('is-playing-state',this.isPlaying)},

        show:function(){
        this.ui.classList.remove('hidden');
        if(this.minimized){
            document.body.classList.add('has-mini-player');
            this.ui.style.top = document.getElementById('mainHeader').offsetHeight + 'px';
        } else {
            cekScrollLayar();
        }
    },
    close:function(){
        this.aEl.pause();
        this.vEl.pause();
        if(typeof ytPlayer !== 'undefined' && ytPlayer && ytPlayer.pauseVideo) ytPlayer.pauseVideo();
        if(typeof ytInterval !== 'undefined' && ytInterval) clearInterval(ytInterval);
        this.driveFrame.removeAttribute('src');
        this.ui.classList.add('hidden');
        this.ui.classList.remove('minimized');
        this.minimized=false;
        this.ui.style.top='0';
        document.body.classList.remove('has-mini-player');
        cekScrollLayar();
        stopRelatedAnimations();
        this.isPlaying=false;
        this.updatePlayBtn();
        if(typeof isAddMediaMode !== 'undefined' && isAddMediaMode) {
            keluarModeAddMedia();
        }
    },

    minimize:function(){
        this.minimized=true,this.ui.classList.add('minimized'),cekScrollLayar();this.ui.style.top=document.getElementById('mainHeader').offsetHeight+'px';document.body.classList.add('has-mini-player');
        const a=this.queue[this.currentIndex];if(a){const b=getYoutubeId(a.img);b&&(document.getElementById('miniYtPlayer').style.display='block');}

    },

    maximize:function(){
        // Blokir aksi memperbesar player jika sedang mode seleksi / checklist ATAU ada item yang diceklis (kecuali mode Add Media)
        if(!isAddMediaMode && (isSelectionMode || document.querySelectorAll('.card.selected').length > 0)) {
            alert("Selesaikan atau batalkan seleksi terlebih dahulu!");
            return;
        }
        
        this.minimized = false;
        this.ui.classList.remove('minimized');
        this.ui.style.top = '0';
        document.body.classList.remove('has-mini-player');
        document.getElementById('miniDriveFrame').removeAttribute('src');
        document.getElementById('miniDriveFrame').style.display = 'none';
        cekScrollLayar();
    },

    togglePlaylist:function(){const a=document.getElementById('mpPlaylistDrawer');a.classList.toggle('open');if(a.classList.contains('open')){this.backToMyPlaylist()}},
    backToMyPlaylist:function(){this.activeViewIndex=null;document.getElementById('plViewDefault').style.display='flex';document.getElementById('plViewInside').style.display='none';document.getElementById('mpPlaylistList').style.display='none';document.getElementById('savedPlaylistArea').style.display='block';this.loadPlaylistMenu()},
    createNewEmptyPlaylist: async function(){
        const defaultName = "Daftar Putar " + new Date().toLocaleDateString();
        const a = await customPrompt("Nama Playlist Baru:", defaultName);
        if(a === null || a.trim() === "") return;
        
        let b = JSON.parse(getLocal('playlists') || '[]');
        b.push({name: a.trim(), items: []});
        setLocal('playlists', JSON.stringify(b));
        this.loadPlaylistMenu();
    },

    loadPlaylistMenu:function(){const a=document.getElementById('savedPlaylistArea');const b=JSON.parse(getLocal('playlists')||'[]');let html=`<div class="saved-pl-item" style="border: 1px solid var(--primary); background: var(--primary-light);"><span onclick="MediaPlayer.openCurrentQueue()">🎶 Antrian Saat Ini (${this.queue.length})</span></div>`;if(b.length===0){html+='<div style="padding:10px; color:#999; text-align:center;">Belum ada Playlist Tersimpan.</div>'}else{a.innerHTML=html;b.forEach((c,d)=>{const div=document.createElement('div');div.className='saved-pl-item';div.setAttribute('draggable','true');div.setAttribute('data-pl-index',d);div.innerHTML=`<span onclick="MediaPlayer.openSavedPlaylist(${d})">📂 ${c.name} (${c.items.length})</span><div style="display:flex; gap:5px; margin-left: 5px;"><button class="saved-pl-btn" onclick="MediaPlayer.editSavedPlaylist(${d})" title="Edit Playlist">${SVG_EDIT}</button><button class="saved-pl-btn" onclick="MediaPlayer.deleteSavedPlaylist(${d})" style="color:red" title="Hapus">${SVG_TRASH}</button></div>`;div.addEventListener('dragstart',this.handlePlaylistDragStart);div.addEventListener('dragover',this.handlePlaylistDragOver);div.addEventListener('drop',this.handlePlaylistDrop);a.appendChild(div)});return}a.innerHTML=html;a.style.display='block'},
    draggedPlIndex:null,
    handlePlaylistDragStart:function(e){MediaPlayer.draggedPlIndex=this.getAttribute('data-pl-index');this.classList.add('dragging');e.dataTransfer.effectAllowed='move'},
    handlePlaylistDragOver:function(e){e.preventDefault();e.dataTransfer.dropEffect='move';return false},
    handlePlaylistDrop:function(e){e.stopPropagation();this.classList.remove('dragging');document.querySelectorAll('.saved-pl-item').forEach(el=>el.classList.remove('dragging'));const srcIdx=parseInt(MediaPlayer.draggedPlIndex);const targetIdx=parseInt(this.getAttribute('data-pl-index'));if(srcIdx!==targetIdx&&!isNaN(srcIdx)&&!isNaN(targetIdx)){let playlists=JSON.parse(getLocal('playlists')||'[]');const movedItem=playlists.splice(srcIdx,1)[0];playlists.splice(targetIdx,0,movedItem);setLocal('playlists',JSON.stringify(playlists));MediaPlayer.loadPlaylistMenu()}return false},
    editSavedPlaylist: async function(a){
        const b = JSON.parse(getLocal('playlists') || '[]');
        if(!b[a]) return;
        
        const c = await customPrompt("Ubah Nama Playlist:", b[a].name);
        if(c !== null && c.trim() !== ''){
            b[a].name = c.trim();
            setLocal('playlists', JSON.stringify(b));
            this.loadPlaylistMenu();
        }
    },

    deleteSavedPlaylist:async function(a){if(await customConfirm("Hapus playlist ini?")){let b=JSON.parse(getLocal('playlists')||'[]');b.splice(a,1);setLocal('playlists',JSON.stringify(b));this.loadPlaylistMenu()}},

    openCurrentQueue:function(){this.activeViewIndex='queue';document.getElementById('plViewDefault').style.display='none';document.getElementById('plViewInside').style.display='flex';document.getElementById('plPlayName').innerText="Antrian";document.getElementById('savedPlaylistArea').style.display='none';document.getElementById('mpPlaylistList').style.display='block';this.renderViewingPlaylist(this.queue,'queue')},
    openSavedPlaylist:function(a){const b=JSON.parse(getLocal('playlists')||'[]');if(!b[a])return;this.activeViewIndex=a;document.getElementById('plViewDefault').style.display='none';document.getElementById('plViewInside').style.display='flex';document.getElementById('plPlayName').innerText=b[a].name;document.getElementById('savedPlaylistArea').style.display='none';document.getElementById('mpPlaylistList').style.display='block';this.renderViewingPlaylist(b[a].items,a)},
    playCurrentPlaylist:function(){if(this.activeViewIndex===null)return;if(this.activeViewIndex==='queue'){if(this.queue.length>0){this.currentIndex=0;this.loadTrack();}else{alert("Antrian kosong!")}return}const b=JSON.parse(getLocal('playlists')||'[]');const pl=b[this.activeViewIndex];if(!pl||pl.items.length===0)return alert("Playlist kosong!");this.queue=[...pl.items];this.currentIndex=0;this.loadTrack();},
    addMediaToCurrentPlaylist:function(){window.targetPlaylistIndexForAdd=this.activeViewIndex;this.togglePlaylist();this.minimize();isAddMediaMode=true;isSelectionMode=true;document.body.classList.add('action-mode');document.body.classList.add('add-media-mode');setFilter(0,'audiovideo')},
    addTemporaryLink: async function() {
        const url = await customPrompt("Masukkan tautan media (YouTube/URL Video/Audio):", "", "url");
        if (url === null || url.trim() === "") return;
        
        const cleanUrl = url.trim();
        
        // Ekstrak nama domain dari URL sebagai judul sementara agar antrian terlihat rapi
        let tempName = "Tautan Eksternal";
        try { tempName = new URL(cleanUrl).hostname; } catch(e){}

        const tempItem = {
            id: 'temp_' + Date.now(),
            name: tempName,
            img: cleanUrl,
            year: new Date().getFullYear().toString(),
            isDrive: !!getDriveId(cleanUrl),
            isLocal: false,
            customCover: false
        };

        const isTargetingSaved = (this.activeViewIndex !== null && this.activeViewIndex !== 'queue');
        
        if (isTargetingSaved) {
            // Tambahkan ke Saved Playlist
            let playlists = JSON.parse(getLocal('playlists') || '[]');
            playlists[this.activeViewIndex].items.push(tempItem);
            setLocal('playlists', JSON.stringify(playlists));
            
            this.renderViewingPlaylist(playlists[this.activeViewIndex].items, this.activeViewIndex);
            alert("1 Tautan diproses ke dalam '" + playlists[this.activeViewIndex].name + "'.\n\nSilakan klik tautan tersebut di daftar putar untuk memutarnya.");
        } else {
            // Tambahkan ke Current Queue (Antrian Saat Ini)
            this.addToPlaylist(tempItem, false); // Parameter 'false' mencegah autoplay paksa
            this.renderViewingPlaylist(this.queue, 'queue');
            alert("1 Tautan diproses ke Antrian Saat Ini.\n\nSilakan klik tautan tersebut di daftar putar untuk memutarnya.");
        }
    },

    renderViewingPlaylist:function(items,listIndex){const a=document.getElementById('mpPlaylistList');a.innerHTML='';if(items.length===0){a.innerHTML='<div style="padding:20px; text-align:center; color:#888;">Playlist Kosong</div>';return}const frag=document.createDocumentFragment();let currentEl=null;items.forEach((b,c)=>{const isCurrent=(listIndex==='queue'&&c===this.currentIndex)||(listIndex!=='queue'&&this.queue.length===items.length&&this.queue[c]&&this.queue[c].id===b.id&&c===this.currentIndex);const d=document.createElement('div');d.className=`pl-item ${isCurrent?'active':''}`;d.setAttribute('draggable','true');d.setAttribute('data-index',c);d.setAttribute('data-list-index',listIndex);d.addEventListener('dragstart',this.itemDragStart);d.addEventListener('dragover',this.itemDragOver);d.addEventListener('drop',this.itemDrop);
    const downloadBtnHtml = b.isLocal ? '' : `<button class="pl-ctx-btn" style="display:flex; align-items:center; gap:5px;" onclick="MediaPlayer.downloadItemView('${listIndex}', ${c})">${SVG_DOWNLOAD} Download</button>`;
    const storageIco = getStorageIcon(b.originalImg || b.img);
d.innerHTML=`<div class="pl-info" onclick="MediaPlayer.playFromView('${listIndex}', ${c})"><div class="pl-name" style="display:flex; align-items:center;">${storageIco}<span style="white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${b.name}</span></div><div class="pl-dur">${b.year||''}</div></div><button class="pl-action" onclick="MediaPlayer.toggleCtxMenu(event, ${c})">${SVG_MORE_VERT}</button><div id="ctxMenu_${c}" class="pl-ctx-menu">${downloadBtnHtml}<button class="pl-ctx-btn" style="color:red; display:flex; align-items:center; gap:5px;" onclick="MediaPlayer.removeItemView('${listIndex}', ${c})">${SVG_TRASH} Hapus</button><button class="pl-ctx-btn" style="display:flex; align-items:center; gap:5px;" onclick="event.stopPropagation(); this.parentElement.classList.remove('show');">${SVG_CANCEL} Batal</button></div>`;frag.appendChild(d);if(isCurrent)currentEl=d;});a.appendChild(frag);if(currentEl)setTimeout(()=>currentEl.scrollIntoView({behavior:'smooth',block:'center'}),200)},


    playFromView:function(listIndex,itemIndex){if(listIndex==='queue'){this.currentIndex=itemIndex;this.loadTrack();}else{const b=JSON.parse(getLocal('playlists')||'[]');this.queue=[...b[listIndex].items];this.currentIndex=itemIndex;this.loadTrack();}},
    removeItemView:function(listIndex,itemIndex){if(listIndex==='queue'){this.removeFromQueue(itemIndex)}else{const b=JSON.parse(getLocal('playlists')||'[]');b[listIndex].items.splice(itemIndex,1);setLocal('playlists',JSON.stringify(b));this.openSavedPlaylist(listIndex)}},
    downloadItemView: async function(listIndex, itemIndex) {
        let item;
        if (listIndex === 'queue') {
            item = this.queue[itemIndex];
        } else {
            const b = JSON.parse(getLocal('playlists') || '[]');
            item = b[listIndex].items[itemIndex];
        }
        if (!item) return;

        document.querySelectorAll('.pl-ctx-menu').forEach(el => el.classList.remove('show'));

        const ytId = getYoutubeId(item.img);
        
        // 1. LOGIKA KHUSUS YOUTUBE DENGAN YT1S
        if (ytId) {
            const isConfirmed = await customConfirm(`Unduh "${item.name}" dari YouTube?\n\nAnda akan diarahkan ke tab baru untuk memilih kualitas MP3/MP4.`);
            if (!isConfirmed) return;
            
            const ytUrl = `https://www.youtube.com/watch?v=${ytId}`;
            const externalConverterUrl = `https://yt1s.com.co/en193/?q=${encodeURIComponent(ytUrl)}`; 
            
            // Failsafe UX: Salin link ke clipboard perangkat
            try {
                await navigator.clipboard.writeText(ytUrl);
                alert("Tautan video telah disalin otomatis ke clipboard!\n\nJika halaman downloader terlihat kosong, silakan klik 'Tempel/Paste' di kolom pencarian mereka.");
            } catch (err) {
                console.log("Clipboard API tidak diizinkan oleh browser", err);
            }

            window.open(externalConverterUrl, '_blank');
            return;
        }

        // 2. LOGIKA DEFAULT UNTUK FILE LOKAL & GOOGLE DRIVE
        const link = document.createElement('a');
        link.download = item.name;
        if (item.isLocal && item.img.startsWith('blob:')) {
            link.href = item.img;
            link.click();
        } else {
            link.href = getDownloadUrl(item.img);
            link.target = '_blank';
            link.click();
        }
    },

    toggleCtxMenu:function(e,idx){e.stopPropagation();document.querySelectorAll('.pl-ctx-menu').forEach(el=>el.classList.remove('show'));const menu=document.getElementById(`ctxMenu_${idx}`);if(menu)menu.classList.toggle('show')},
    drawVisualizer:function(){
        const a=document.getElementById('visualizerCanvas'),b=a.getContext('2d');
        const miniA=document.getElementById('miniVisualizer'),miniB=miniA.getContext('2d');
        const c=this.analyser.frequencyBinCount,d=new Uint8Array(c);
        a.width=a.offsetWidth||300;a.height=a.offsetHeight||150;
        miniA.width=miniA.offsetWidth||40;miniA.height=miniA.offsetHeight||40;
        
        const e=()=>{
            // [DIOPTIMASI]: Hentikan perputaran 60fps jika sedang tidak aktif/pause
            if(this.ui.classList.contains('hidden') || !this.isPlaying || 'block'===this.vEl.style.display) {
                setTimeout(e, 500); // Mode hemat baterai (2fps) saat standby
                return;
            }
            
            // Mode performa penuh (60fps) hanya saat lagu menyala
            requestAnimationFrame(e);
            this.analyser.getByteFrequencyData(d);

            // ... (Biarkan kode di bawahnya tetap sama tanpa perubahan)
            if(!this.minimized){b.clearRect(0,0,a.width,a.height);const gradient=b.createLinearGradient(0,a.height,0,0);gradient.addColorStop(0,'#ffff00');gradient.addColorStop(1,'#ff0000');b.fillStyle=gradient;const barWidth=(a.width/c)*2.5;let x=0;for(let i=0;i<c;i++){let barHeight=(d[i]/255)*a.height;b.fillRect(x,a.height-barHeight,barWidth,barHeight);x+=barWidth+1}}if(this.minimized&&'block'===miniA.style.display){miniB.clearRect(0,0,miniA.width,miniA.height);miniB.fillStyle='#ff4500';const step=4;const barWidthMini=(miniA.width/(c/step))*1.5;let x=0;for(let i=0;i<c;i+=step){let val=d[i];let h=(val/255)*miniA.height;let y=(miniA.height-h)/2;miniB.fillRect(x,y,barWidthMini,h);x+=barWidthMini+1}}};e()},dragSrcEl:null,itemDragStart:function(a){MediaPlayer.dragSrcEl=this;a.dataTransfer.effectAllowed='move';a.dataTransfer.setData('text/html',this.getAttribute('data-index'));this.classList.add('dragging')},itemDragOver:function(a){return a.preventDefault(),a.dataTransfer.dropEffect='move',false},itemDrop:function(a){a.stopPropagation();const srcEl=MediaPlayer.dragSrcEl;if(srcEl)srcEl.classList.remove('dragging');if(srcEl===this)return;const b=parseInt(srcEl.getAttribute('data-index'));const c=parseInt(this.getAttribute('data-index'));const listIndex=this.getAttribute('data-list-index');if(listIndex==='queue'){const d=MediaPlayer.queue.splice(b,1)[0];MediaPlayer.queue.splice(c,0,d);if(MediaPlayer.currentIndex===b)MediaPlayer.currentIndex=c;else if(MediaPlayer.currentIndex>b&&MediaPlayer.currentIndex<=c)MediaPlayer.currentIndex--;else if(MediaPlayer.currentIndex<b&&MediaPlayer.currentIndex>=c)MediaPlayer.currentIndex++;MediaPlayer.renderViewingPlaylist(MediaPlayer.queue,'queue')}else{const playlists=JSON.parse(getLocal('playlists')||'[]');const playlist=playlists[listIndex];if(!playlist)return;const d=playlist.items.splice(b,1)[0];playlist.items.splice(c,0,d);setLocal('playlists',JSON.stringify(playlists));MediaPlayer.renderViewingPlaylist(playlist.items,listIndex)}return false}};

function simpanKeLokal(){const a=[];document.querySelectorAll('.card').forEach(b=>a.push({id:b.getAttribute('data-id'),itemType:b.getAttribute('data-itemType'),folderId:b.getAttribute('data-folderId'),name:b.querySelector('.file-info').textContent,year:b.getAttribute('data-year'),note:b.getAttribute('data-note'),img:b.getAttribute('data-img'),cat:b.getAttribute('data-cat'),sub:b.getAttribute('data-sub'),type:b.getAttribute('data-type'),detail:b.getAttribute('data-detail'),hidden:b.getAttribute('data-hidden'),font:b.getAttribute('data-font'),customCover:b.getAttribute('data-customCover'),related:b.getAttribute('data-related'),descaura:b.getAttribute('data-descaura'),favorite:b.getAttribute('data-favorite')||'false'})),setLocal('files_db',JSON.stringify(a))}

function muatDariLokal(){const a=getLocal('files_db');if(a){const grid=document.getElementById('fileGrid');grid.innerHTML='';const frag=document.createDocumentFragment();JSON.parse(a).reverse().forEach(b=>buatKartu(b,!1,frag));grid.appendChild(frag);updateStats();filterFiles()}}

function updateStats() {
    const a = document.querySelectorAll('.card[data-itemType="file"]');
    const counts = { total: 0, img: 0, vid: 0, aud: 0, app: 0, doc: 0, txt: 0 };
    
    a.forEach(i => {
        if ('true' === i.getAttribute('data-hidden') && 'master' !== currentRole) return;
        counts.total++;
        // PERBAIKAN: Ekstraksi tipe ekstensi via cache atribut untuk mencegah pemborosan CPU
        const j = i.getAttribute('data-cat'), k = i.getAttribute('data-mediatype');

        if ('aplikasi' === j || 'app' === k || 'archive' === k) counts.app++;
        else if ('dokumen' === j || 'doc' === k) counts.doc++;
        else if ('catatan' === j || 'text' === k) counts.txt++;
        else if ('image' === k) counts.img++;
        else if ('video' === k) counts.vid++;
        else if ('audio' === k) counts.aud++;
    });

    const map = { statTotal: counts.total, statGambar: counts.img, statVideo: counts.vid, statAudio: counts.aud, statApp: counts.app, statDokumen: counts.doc, statCatatan: counts.txt };
    Object.entries(map).forEach(([id, val]) => document.getElementById(id).innerText = val);
    // --- CEK KUOTA STORAGE DOM (DIOPTIMASI) ---
    const storageItemDOM = document.getElementById('statStorageItem');
    if (navigator.storage && navigator.storage.estimate) {
        navigator.storage.estimate().then(estimate => {
            // Langsung gunakan kalkulasi bawaan sistem (Cepat & 0 Beban RAM)
            const usedMB = (estimate.usage / (1024 * 1024)).toFixed(1);
            const totalGB = (estimate.quota / (1024 * 1024 * 1024)).toFixed(1);
            document.getElementById('statStorage').innerText = `${usedMB}MB / ${totalGB}GB`;
        }).catch(() => {
            storageItemDOM.style.display = 'none';
        });
    } else {
        storageItemDOM.style.display = 'none';
    }
}

let fileKameraTertunda = null;

function bukaModalBaru(){if(curFilter.l0 === 'all' || curFilter.l0 === 'audiovideo' || curFilter.l0 === 'favorite') return alert("Buka folder atau kategori spesifik terlebih dahulu untuk membuat item baru."); editingCard=null,fileKameraTertunda=null,document.getElementById('formTitle').innerText="Tambah Baru",gantiTabUpload('file'),
['fName','fImgUrl','fNote','fYear','fLocalFile','fCustomCover'].forEach(a=>document.getElementById(a).value=''),
document.getElementById('btnHapusCover').style.display='none',document.getElementById('fHapusCoverFlag').value='false',document.getElementById('fDescAura').checked=false,document.getElementById('fFavorite').value='false',document.getElementById('btnFavoriteToggle').innerHTML='☆',document.getElementById('btnFavoriteToggle').style.color='#ccc',document.getElementById('btnFavoriteToggle').style.textShadow='none',document.getElementById('fFontStyle').value="'Segoe UI', sans-serif",toggleModal('modalForm', true)}

function tutupModal() {
    toggleModal('modalForm', false);
    editingCard = null;

    // KUNCI PERBAIKAN: Bersihkan cache input kamera agar event onchange tidak terblokir di pengambilan berikutnya
    document.getElementById('fPhotoCapture').value = '';
    document.getElementById('fVideoCapture').value = '';

    // KUNCI PERBAIKAN: Pulihkan kembali tombol Tab Folder
    document.getElementById('tabFolder').style.pointerEvents = 'auto';
    document.getElementById('tabFolder').style.opacity = '1';

    // KUNCI PERBAIKAN: Pulihkan kembali tombol Simpan
    const btnSimpan = document.getElementById('btnSimpan');
    btnSimpan.disabled = false;
    btnSimpan.innerText = "Simpan";
    btnSimpan.classList.remove('btn-gray');
    btnSimpan.classList.add('btn-blue');
    btnSimpan.style.cursor = 'pointer';

    // === TAMBAHKAN KODE INI DI SINI ===
    const btnFoto = document.getElementById('btnPhotoCaptureUI');
    const btnVideo = document.getElementById('btnVideoCaptureUI');
    if (btnFoto && btnVideo) {
        // Kembalikan warna dan teks asli tanpa mengganggu properti 'display'
        btnFoto.innerHTML = '📸 Ambil Foto';
        btnFoto.style.background = '';
        btnFoto.style.color = '';
        btnFoto.style.borderColor = '';
        
        btnVideo.innerHTML = '🎥 Rekam Video';
        btnVideo.style.background = 'linear-gradient(to bottom, #ffbcaf, #ff9800)';
        btnVideo.style.color = '#8d6206';
        btnVideo.style.borderColor = '#c68e17';
    }
    // ==================================
}

function tutupSemuaMenu(){document.querySelectorAll('.pl-ctx-menu').forEach(a=>a.classList.remove('show'))}

function bukaEdit(a){
    tutupSemuaMenu();
    editingCard=a;
    const b='folder'===a.getAttribute('data-itemType');
    const cImg=a.getAttribute('data-img');
    const fName=a.querySelector('.file-info').innerText;
    const mediaType=getMediaType(cImg, fName);
    const isCat=a.getAttribute('data-cat')==='catatan' || mediaType==='text';
    
    document.getElementById('formTitle').innerText=b?"Edit Folder":"Edit Memori";
    gantiTabUpload(b?'folder':'file', isCat);
    
    document.getElementById('fName').value=fName;
    document.getElementById('fCustomCover').value='';
    const hasCover=a.getAttribute('data-customCover')==='true';
    document.getElementById('btnHapusCover').style.display=hasCover?'block':'none';
    document.getElementById('fHapusCoverFlag').value='false';
    document.getElementById('fDescAura').checked = a.getAttribute('data-descaura') === 'true';
    const isFav = a.getAttribute('data-favorite') === 'true';
document.getElementById('fFavorite').value = isFav ? 'true' : 'false';
const favBtn = document.getElementById('btnFavoriteToggle');
favBtn.innerHTML = isFav ? '★' : '☆';
favBtn.style.color = isFav ? '#FFD700' : '#ccc';
favBtn.style.textShadow = isFav ? '0 1px 2px rgba(0,0,0,0.5)' : 'none';

    
    if('LOCAL_FILE'===cImg){
        document.getElementById('fSourceType').value='local';
    }else{
        document.getElementById('fSourceType').value='url';
        document.getElementById('fImgUrl').value=cImg;
    }
    
    // Cegat pemanggilan toggleSourceType jika ini adalah catatan, agar input URL/File tidak kembali terlihat
    if(!isCat && !b){
        toggleSourceType();
    }
    
    document.getElementById('fYear').value=a.getAttribute('data-year');
    if(!b){
        document.getElementById('fNote').value=a.getAttribute('data-note')||"";
        document.getElementById('fFontStyle').value=a.getAttribute('data-font')||"'Segoe UI', sans-serif";
    }
    toggleModal('modalForm', true);
}

async function eksporData() {
    if (!await customConfirm("Export data?")) return;
    
    let filesData = [];
    try {
        filesData = JSON.parse(getLocal('files_db') || '[]');
    } catch (err) {
        alert("Peringatan: Ada data lokal yang korup. Melanjutkan ekspor data yang utuh...");
    }

    // FITUR BARU: Ekstraksi Cover dari IndexedDB
    let coversData = {};
    try {
        if (dbInstance) {
            const tx = dbInstance.transaction('covers', 'readonly');
            const store = tx.objectStore('covers');
            const reqKeys = store.getAllKeys();
            const reqVals = store.getAll();
            
            await new Promise((resolve) => {
                reqKeys.onsuccess = () => {
                    reqVals.onsuccess = async () => {
                        const keys = reqKeys.result;
                        const vals = reqVals.result;
                        for (let i = 0; i < keys.length; i++) {
                            coversData[keys[i]] = await new Promise(res => {
                                const reader = new FileReader();
                                reader.onloadend = () => res(reader.result);
                                reader.readAsDataURL(vals[i]); // Konversi ke Base64
                            });
                        }
                        resolve();
                    };
                };
            });
        }
    } catch(e) { console.warn("Gagal mengekstrak cover", e); }

    const backupData = JSON.stringify({
        files: filesData,
        config: config,
        covers: coversData // Menyisipkan data cover
    }, null, 2);
    
    const dateStr = new Date().toISOString().split('T')[0];
    const timeStr = new Date().getHours() + "-" + new Date().getMinutes() + "-" + new Date().getSeconds();
    const defaultFileName = `Feathera_Backup_${dateStr}_${timeStr}.json`;

    const isNative = window.Capacitor && window.Capacitor.isNative;

    let pesanSukses = "";

    if (isNative) {
        // JALUR NATIVE: Menyimpan ke HP (Documents)
        try {
            await window.Capacitor.Plugins.Filesystem.writeFile({
                path: defaultFileName,
                data: backupData,
                directory: 'DOCUMENTS',
                encoding: 'utf8'
            });
            pesanSukses += "Data berhasil diekspor ke folder 'Documents' memori internal.\n";
        } catch (err) {
            console.error("Gagal export native:", err);
            pesanSukses += "Gagal menyimpan file ke perangkat lokal: " + err.message + "\n";
        }
    } else {
        // JALUR BROWSER: Download klasik
        const blob = new Blob([backupData], { type: 'application/json' });
        const a = document.createElement('a');
        const url = URL.createObjectURL(blob);
        a.href = url;
        a.download = defaultFileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a); 
        
        requestAnimationFrame(() => {
            setTimeout(() => URL.revokeObjectURL(url), 30000);
        });
        pesanSukses += "Data lokal diekspor (Periksa folder Download).\n";
    }

    // JALUR CLOUD: Upload JSON ke Google Drive menggunakan token Capacitor/Firebase
    const gToken = localStorage.getItem('feathera_gdrive_token');
    const driveJsonUrl = getLocal('drive_folder_json');

    if (gToken && currentUser !== 'Guest') {
        try {
            const jsonBlob = new Blob([backupData], { type: 'application/json' });
            const resMedia = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=media', {
                method: 'POST',
                headers: {
                    'Authorization': 'Bearer ' + gToken,
                    'Content-Type': 'application/json',
                    'Content-Length': jsonBlob.size
                },
                body: jsonBlob
            });

            const dataMedia = await resMedia.json();
            if (resMedia.ok && dataMedia.id) {
                let patchUrl = `https://www.googleapis.com/drive/v3/files/${dataMedia.id}`;
                if (driveJsonUrl) {
                    const folderId = driveJsonUrl.includes('folders/') ? driveJsonUrl.split('folders/')[1].split(/[?&/]/)[0] : driveJsonUrl;
                    patchUrl += `?addParents=${folderId}&removeParents=root`;
                }

                await fetch(patchUrl, {
                    method: 'PATCH',
                    headers: { 'Authorization': 'Bearer ' + gToken, 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name: defaultFileName })
                });
                pesanSukses += "☁️ Salinan Backup berhasil diunggah ke Google Drive Anda!";
            } else {
                pesanSukses += "☁️ Gagal upload ke Drive (API Ditolak).";
            }
        } catch (errDrive) {
            console.warn("Koneksi gagal ke Drive", errDrive);
            pesanSukses += "☁️ Gagal upload ke Drive (Jaringan/Timeout).";
        }
    }

    alert(pesanSukses);
}

function imporData(a) {
    // Meminta izin storage saat impor agar Absolute Path file native langsung terbaca OS
    if (window.Capacitor && window.Capacitor.isNative && window.Capacitor.Plugins.Filesystem) {
        window.Capacitor.Plugins.Filesystem.requestPermissions().catch(()=>{});
    }

    const b = a.files[0];
    if (!b) return;

    // 1. Validasi Ekstensi File
    if (!b.name.toLowerCase().endsWith('.json')) {
        alert("Gagal: Format file tidak didukung. Harap masukkan file .json!");
        a.value = '';
        return;
    }

    // 2. Deteksi file kosong akibat gagal download di sesi sebelumnya
    if (b.size === 0) {
        alert("Gagal: File kosong (0 bytes)! Ekspor sebelumnya gagal tersimpan sempurna di memori HP.");
        a.value = '';
        return;
    }

    const c = new FileReader();
    
    // 3. Penanganan error jika memori perangkat tiba-tiba menolak akses baca
    c.onerror = () => {
        alert("Terjadi kesalahan saat membaca file dari penyimpanan perangkat.");
        a.value = '';
    };

    c.onload = async (d) => { // PERBAIKAN: Menambahkan 'async'
        try {
            const e = JSON.parse(d.target.result);

            if (e && Array.isArray(e.files) && Array.isArray(e.config)) {
                const isFromLogin = !document.getElementById('authPage').classList.contains('hidden');

                if (isFromLogin) {
                    currentUser = 'RestoredUser';
                    localStorage.setItem('feathera_session', currentUser);
                }

                setLocal('files_db', JSON.stringify(e.files));
                setLocal('config_v1', JSON.stringify(e.config));

                // FITUR BARU: Memulihkan Cover dari JSON ke IndexedDB
                if (e.covers && dbInstance) {
                    for (const [key, base64Str] of Object.entries(e.covers)) {
                        try {
                            const res = await fetch(base64Str);
                            const blob = await res.blob();
                            await dbSimpanCover(key, blob);
                        } catch(err) { console.warn("Gagal memulihkan cover:", key); }
                    }
                }

                if (isFromLogin) {
                    tampilkanApp();
                } else {
                    loadConfig();
                    muatDariLokal();
                }
                alert("Backup & Cover Dipulihkan Secara Penuh! (File lokal DB tidak termasuk)");
            } else {
                alert("Struktur data backup tidak dikenali oleh Feathera Gallery!");
            }
        } catch (f) {
            alert("Format JSON tidak valid! Detail: " + f.message);
        } finally {
            a.value = ''; 
        }
    };

    c.readAsText(b);
}

['touchstart','mousedown'].forEach(a=>window.addEventListener(a,b=>{
    const target = b.target;
    if(document.body.classList.contains('no-scroll') || ['INPUT','TEXTAREA','BUTTON','SELECT'].includes(target.tagName)) return;
    
    const cardTarget = target.closest('.card');

    if(cardTarget){
        pressTimer=setTimeout(()=>{
            if(currentRole !== 'none') {
                isLongPressTriggered = true; // Variabel ini sekarang aman dan tidak akan memicu crash
                cardHoldHandler(cardTarget);
            }
        }, 600);
        return;
    }

    pressTimer=setTimeout(async ()=>{
        try { navigator.vibrate&&navigator.vibrate(50); } catch(e){}

        if (!isMovePending) return;

        if(curFilter.l0 === 'all' || curFilter.l0 === 'audiovideo' || curFilter.l0 === 'favorite') {
            alert("Buka folder atau kategori spesifik terlebih dahulu untuk menempelkan (paste) item.");
            return;
        }

        if('user'===currentRole||'master'===currentRole){
            toggleModal('pasteMenu', true);
        } else if ('none' === currentRole) {
            const isConfirmed = await customConfirm("Silakan buka kunci terlebih dahulu untuk menempelkan item. Masukkan PIN sekarang?");
            if (isConfirmed) {
                requestPin((role) => {
                    setAppRole(role);
                    toggleModal('pasteMenu', true);
                }, "Unlock Akses");
            }
        }
    }, 800)

},{passive:true}));

// 'touchcancel' vital di Android untuk menghentikan timer jika OS mendeteksi jari bergeser sedikit
['touchend','touchmove','mouseup','touchcancel'].forEach(a=>window.addEventListener(a,(e)=>{
    if(pressTimer){ clearTimeout(pressTimer); pressTimer = null; }
    // Failsafe: Reset status long-press setelah jari diangkat agar klik tunggal selanjutnya tidak terblokir
    if ((a === 'touchend' || a === 'mouseup') && isLongPressTriggered) {
        setTimeout(() => { isLongPressTriggered = false; }, 300);
    }
}, {passive: true}));

// --- MANAJEMEN MODAL HUBUNG BARU ---
let activeHubungGroupId = null;
let isSelectingForGroup = false;
let targetGroupForSelection = null;

function getLinkGroups() { return JSON.parse(getLocal('link_groups') || '[]'); }
function setLinkGroups(groups) { setLocal('link_groups', JSON.stringify(groups)); }

function bukaModalHubung() {
    if ('master' !== currentRole && 'user' !== currentRole) return alert("Hanya Master & Admin yang bisa mengatur relasi.");

    // SKENARIO 2: Konfirmasi penambahan file setelah memilih (sembunyi-sementara)
    if (isSelectingForGroup && targetGroupForSelection) {
        const items = document.querySelectorAll('.card.selected');
        if (items.length === 0) {
            alert("Tidak ada file yang dipilih! Pemilihan dibatalkan.");
            isSelectingForGroup = false;
            targetGroupForSelection = null;
            toggleModal('modalHubung', true);
            return;
        }
        prosesTambahFileKeGrup(targetGroupForSelection);
        return;
    }

    // SKENARIO 1: Buka modal secara normal (tanpa perlu menyeleksi file terlebih dahulu)
    toggleModal('modalHubung', true);
    kembaliKeDaftarHubung();
}

function renderGroupList() {
    const list = document.getElementById('hubungGroupList');
    const groups = getLinkGroups();
    
    if (groups.length === 0) {
        list.innerHTML = '<div style="text-align:center; color:#999; padding: 20px; font-weight:bold;">Belum ada grup relasi. Buat grup baru untuk mulai menghubungkan file.</div>';
        return;
    }
    
    let html = '';
    groups.forEach(g => {
        html += `
        <div class="saved-pl-item" style="margin-bottom: 0; align-items: center;">
            <span style="flex: 1; cursor: pointer;" onclick="bukaDetailHubung('${g.id}')">${g.name} (${g.items.length} file)</span>
            <div style="display:flex; gap:5px; margin-left: 5px;">
                <button class="saved-pl-btn" style="color:var(--primary-dark); border-color:var(--primary-dark);" onclick="editNamaGrupHubung('${g.id}')" title="Edit Nama Grup">${SVG_EDIT}</button>
                <button class="saved-pl-btn" style="color:red;" onclick="hapusGrupHubung('${g.id}')" title="Hapus Grup">${SVG_TRASH}</button>
            </div>
        </div>`;
    });
    list.innerHTML = html;
}

function kembaliKeDaftarHubung() {
    activeHubungGroupId = null;
    document.getElementById('hubungViewGroups').style.display = 'block';
    document.getElementById('hubungViewDetail').style.display = 'none';
    
    // Memanggil variabel SVG_LINK untuk dirender ke dalam DOM
    document.getElementById('hubungTitle').innerHTML = `${SVG_LINK} Kelola Hubungan`;
    renderGroupList();
}

function bukaDetailHubung(groupId) {
    activeHubungGroupId = groupId;
    const group = getLinkGroups().find(g => g.id === groupId);
    if (!group) return kembaliKeDaftarHubung();

    // Memanggil variabel SVG_LINK dan menggabungkannya dengan nama grup
    document.getElementById('hubungTitle').innerHTML = `${SVG_LINK} ${group.name}`;
    document.getElementById('hubungViewGroups').style.display = 'none';
    document.getElementById('hubungViewDetail').style.display = 'flex';
    renderItemList(group);
}

async function buatGrupHubungBaru() {
    // Sembunyikan modul utama agar dialog prompt custom tidak terhalang
    toggleModal('modalHubung', false); 
    
    const name = await customPrompt("Nama Grup Relasi Baru:", "Grup Relasi " + new Date().toLocaleDateString());
    
    // Sesuai instruksi: Modul otomatis tampil kembali setelah pembuatan grup baru (baik sukses atau batal)
    toggleModal('modalHubung', true); 

    if (!name || name.trim() === "") return;

    let groups = getLinkGroups();
    const newGroup = { id: 'grp_' + Date.now(), name: name.trim(), items: [] };
    
    groups.unshift(newGroup); // Masukkan ke paling atas
    setLinkGroups(groups);
    simpanKeLokal();
    
    logActivity('Hubung', `Membuat grup relasi kosong: "${name}".`);
    renderGroupList();
}

async function editNamaGrupHubung(groupId) {
    let groups = getLinkGroups();
    const groupIndex = groups.findIndex(g => g.id === groupId);
    if (groupIndex === -1) return;

    // Sembunyikan modul utama sementara
    toggleModal('modalHubung', false); 

    const newName = await customPrompt("Ubah Nama Grup:", groups[groupIndex].name);
    
    // Tampilkan kembali modul utama setelah proses input selesai
    toggleModal('modalHubung', true); 

    if (newName && newName.trim() !== "") {
        groups[groupIndex].name = newName.trim();
        setLinkGroups(groups);
        simpanKeLokal();
        renderGroupList();
    }
}

async function hapusGrupHubung(groupId) {
    // Sembunyikan modul utama sementara agar dialog konfirmasi terlihat jelas di HP
    toggleModal('modalHubung', false); 
    
    const konfirmasi = await customConfirm("Hapus grup ini? Semua file di dalamnya otomatis akan terputus hubungannya.");
    
    // Tampilkan kembali modul utama setelah user memilih 'OK' atau 'Batal'
    toggleModal('modalHubung', true); 

    if (!konfirmasi) return;
    
    let groups = getLinkGroups();
    const group = groups.find(g => g.id === groupId);
    if (!group) return;

    group.items.forEach(fileId => {
        const card = document.querySelector(`.card[data-id="${fileId}"]`);
        if (card) card.setAttribute('data-related', 'none');
    });

    groups = groups.filter(g => g.id !== groupId);
    setLinkGroups(groups);
    simpanKeLokal();
    logActivity('Hubung', `Menghapus relasi grup: ${group.name}`);
    renderGroupList();
}

function renderItemList(group) {
    const list = document.getElementById('hubungItemList');
    if (group.items.length === 0) {
        list.innerHTML = '<div style="text-align:center; color:#999; padding: 20px; font-weight:bold;">Grup ini kosong. Klik tombol di atas untuk memasukkan file.</div>';
        return;
    }

    let html = '';
    group.items.forEach(fileId => {
        const card = document.querySelector(`.card[data-id="${fileId}"]`);
        const name = card ? card.querySelector('.file-info').innerText : "File Tidak Ditemukan (Orphan)";
        const img = card ? card.getAttribute('data-img') : "none";
        const icon = card ? getStorageIcon(img) : '📄';

        html += `
        <div class="saved-pl-item" style="margin-bottom: 0;">
            <span style="display:flex; align-items:center; gap:5px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; pointer-events: none;">
                ${icon} ${name}
            </span>
            <button class="saved-pl-btn" style="color:red; flex-shrink:0;" onclick="unlinkFile('${fileId}')" title="Putuskan Relasi (Unlink)">${SVG_UNLINK}</button>
        </div>`;
    });
    list.innerHTML = html;
}

function mulaiPilihFileUntukGrup(groupId) {
    isSelectingForGroup = true;
    targetGroupForSelection = groupId;
    toggleModal('modalHubung', false); // Sembunyikan modal sementara

    // Nyalakan mode seleksi jika belum menyala
    if (!isSelectionMode) {
        toggleSelectionMode(true);
    }

    alert("Pilih/ceklis file yang ingin dihubungkan, lalu klik icon 'Hubung' di navigasi bawah untuk mengonfirmasi.");
}

function prosesTambahFileKeGrup(groupId) {
    const items = document.querySelectorAll('.card.selected');
    let groups = getLinkGroups();
    let groupIndex = groups.findIndex(g => g.id === groupId);
    if(groupIndex === -1) return;

    let added = 0;
    items.forEach(card => {
        const id = card.getAttribute('data-id');
        if(!groups[groupIndex].items.includes(id)) {
            groups[groupIndex].items.push(id);
            card.setAttribute('data-related', groupId);
            added++;
        }
    });

    if (added === 0) {
        alert("Semua file yang Anda pilih sudah berada di dalam grup ini.");
    } else {
        setLinkGroups(groups);
        simpanKeLokal();
        logActivity('Hubung', `Menambahkan ${added} file ke relasi: ${groups[groupIndex].name}`);
        alert(`Berhasil menambahkan ${added} file ke dalam grup!`);
    }

    // Pembersihan status & pengembalian UI
    batalBatchAksi(); 
    isSelectingForGroup = false;
    targetGroupForSelection = null;
    
    toggleModal('modalHubung', true);
    bukaDetailHubung(groupId);
}

function unlinkFile(fileId) {
    let groups = getLinkGroups();
    let groupIndex = groups.findIndex(g => g.id === activeHubungGroupId);
    if(groupIndex === -1) return;

    groups[groupIndex].items = groups[groupIndex].items.filter(id => id !== fileId);
    setLinkGroups(groups);
    
    const card = document.querySelector(`.card[data-id="${fileId}"]`);
    if(card) card.setAttribute('data-related', 'none');
    
    simpanKeLokal();
    logActivity('Hubung', `Unlink file dari relasi: ${groups[groupIndex].name}`);
    renderItemList(groups[groupIndex]);
}

async function spawnRelatedAnimations(triggerId) {
    // 1. Bersihkan animasi sebelumnya
    stopRelatedAnimations();

    const triggerCard = document.querySelector(`.card[data-id="${triggerId}"]`);
    if(!triggerCard) return;

    // 2. Ambil data Relasi & Status Toggle Deskripsi
    const relatedStr = triggerCard.getAttribute('data-related');
    const isDescAuraOn = triggerCard.getAttribute('data-descaura') === 'true';
    const noteText = triggerCard.getAttribute('data-note');

    let relatedIds = [];
    if (relatedStr && relatedStr !== 'none') {
        if (relatedStr.startsWith('grp_')) {
            // Skema Baru: Baca ID dari Grup
            const groups = JSON.parse(getLocal('link_groups') || '[]');
            const group = groups.find(g => g.id === relatedStr);
            if (group) relatedIds = group.items;
        } else {
            // Fallback (Skema Lama): Jika relasi dipisah koma
            relatedIds = relatedStr.split(',');
        }
    }
    const targets = relatedIds.filter(id => id !== triggerId);

    // Jika tidak ada aura deskripsi DAN tidak ada file terhubung, batalkan eksekusi
    if(targets.length === 0 && (!isDescAuraOn || !noteText || noteText === 'none')) return;

    const wrapper = document.createElement('div');
    wrapper.id = 'relatedAnimWrapper';
    wrapper.className = 'related-anim-container';
    document.body.appendChild(wrapper);

    let animIndex = 0; // Indeks dinamis untuk menentukan giliran waktu (Delay)

    // 3. Eksekusi Aura Deskripsi (Sebagai Urutan Pertama jika Aktif)
    if(isDescAuraOn && noteText && noteText !== 'none') {
        const floatDesc = document.createElement('div');
        floatDesc.className = 'related-floating-card';
        floatDesc.style.animationDelay = `${(animIndex * 10) + 5}s`; 
        floatDesc.style.cursor = 'default';
        floatDesc.style.pointerEvents = 'auto';
        floatDesc.style.position = 'relative';
        floatDesc.style.zIndex = '999999';
        
        // CSS line-clamp untuk memotong teks & text-transform: none agar tidak kapital otomatis
        const svgClock = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#FFD700" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>`;
        floatDesc.innerHTML = `
            <div class="rfc-thumb"><span style="display:flex; align-items:center; justify-content:center; width:100%; height:100%;">${svgClock}</span></div>
            <div class="rfc-name" style="white-space: normal; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; line-height: 1.2; text-transform: none;">${noteText}</div>
        `;
        wrapper.appendChild(floatDesc);
        animIndex++; // Tambah antrean waktu untuk file berikutnya
    }

    // 4. Eksekusi Aura File Terkait
    const fragAura = document.createDocumentFragment();
    for(let i=0; i<targets.length; i++) {
        const card = document.querySelector(`.card[data-id="${targets[i]}"]`);
        if(!card) continue;
        const fileName = card.querySelector('.file-info').innerText;
        const thumbContainer = card.querySelector('.thumb-container');
        let thumbHtml = '📄';
        if (thumbContainer) {
            const imgThumb = thumbContainer.querySelector('.img-thumb');
            const ytIcon = thumbContainer.querySelector('.yt-icon');
            if (imgThumb && !ytIcon) thumbHtml = imgThumb.outerHTML;
            else if (ytIcon) thumbHtml = `<span class="icon" style="display:flex; align-items:center; justify-content:center; width:100%; height:100%;">${SVG_ICON_YOUTUBE}</span>`;
            else {
                const fallbackIcon = thumbContainer.querySelector('.icon:not(.img-icon):not(.yt-icon)');
                thumbHtml = fallbackIcon ? fallbackIcon.outerHTML : thumbContainer.innerHTML;
            }
        }

        const floatItem = document.createElement('div');
        floatItem.className = 'related-floating-card';
        // Gunakan animIndex sebagai pengatur delay lanjutan
        floatItem.style.animationDelay = `${(animIndex * 10) + 5}s`; 
        floatItem.style.cursor = 'pointer';
        floatItem.style.pointerEvents = 'auto';
        floatItem.style.position = 'relative';
        floatItem.style.zIndex = '999999';
        floatItem.innerHTML = `
            <div class="rfc-thumb">${thumbHtml}</div>
            <div class="rfc-name" style="text-transform: none;">${fileName}</div>
        `;

        floatItem.onclick = (e) => {
            e.stopPropagation();
            if (!MediaPlayer.ui.classList.contains('hidden') && !MediaPlayer.minimized) {
                MediaPlayer.minimize();
            }
            card.click();
        };
        
        fragAura.appendChild(floatItem);
    animIndex++;
}
        wrapper.appendChild(fragAura);
    // 5. Pembersihan DOM dinamis mengikuti total antrean (animIndex)
    setTimeout(() => {
        stopRelatedAnimations();
    }, ((animIndex * 10000) + 1000));
}

// --- FITUR GESTUR SWIPE KIRI/KANAN UNTUK PINDAH HALAMAN/TAB ---
let swipeStartX = 0;
let swipeStartY = 0;

function abaikanSwipe(target) {
    return target.closest('.modal, #mainNav, .chip-container, .stats-bar, .mp-progress, .card.is-dragging') || 
           ['INPUT', 'TEXTAREA', 'BUTTON'].includes(target.tagName) || 
           document.body.classList.contains('no-scroll');
}

window.addEventListener('touchstart', e => {
    if (abaikanSwipe(e.target)) return;
    swipeStartX = e.changedTouches[0].screenX;
    swipeStartY = e.changedTouches[0].screenY;
}, {passive: true});

window.addEventListener('touchend', e => {
    if (swipeStartX === 0 && swipeStartY === 0) return; 

    let swipeEndX = e.changedTouches[0].screenX;

    let swipeEndY = e.changedTouches[0].screenY;
    
    let diffX = swipeStartX - swipeEndX;
    let diffY = Math.abs(swipeStartY - swipeEndY);

    // Syarat swipe: Jarak X harus lebih dari 60px (usapan cukup panjang), 
    // dan deviasi Y kurang dari 50px (agar tidak bentrok saat user sedang scroll ke bawah/atas)
    if (Math.abs(diffX) > 60 && diffY < 50) {
        geserHalaman(diffX > 0 ? 'next' : 'prev');
    }
    
    // Reset koordinat setelah dieksekusi
    swipeStartX = 0;
    swipeStartY = 0;
}, {passive: true});

function geserHalaman(arah) {
    let urutanTab = [];
    if (isAddMediaMode) {
        urutanTab = ['audiovideo'];
        ['video', 'audio'].forEach(id => { if (config.find(c => c.id === id)) urutanTab.push(id); });
    } else {
        urutanTab = ['all', 'audiovideo', 'favorite', ...config.map(c => c.id)];
    }

    let indexSaatIni = urutanTab.indexOf(curFilter.l0);
    if (indexSaatIni === -1) indexSaatIni = 0;

    let indexBaru = indexSaatIni;
    if (arah === 'next' && indexSaatIni < urutanTab.length - 1) {
        indexBaru++;
    } else if (arah === 'prev' && indexSaatIni > 0) {
        indexBaru--;
    }

    if (indexBaru !== indexSaatIni) {
        const grid = document.getElementById('fileGrid');
        const emptyState = document.getElementById('emptyState');
        const animOut = arah === 'next' ? 'slide-out-left' : 'slide-out-right';
        const animIn = arah === 'next' ? 'slide-in-right' : 'slide-in-left';
        
        setFilter(0, urutanTab[indexBaru]);

        grid.classList.remove('slide-out-left', 'slide-out-right', 'slide-in-left', 'slide-in-right');
        emptyState.classList.remove('slide-out-left', 'slide-out-right', 'slide-in-left', 'slide-in-right');
        
        void grid.offsetWidth; 
        
        grid.classList.add(animIn);
        emptyState.classList.add(animIn);
        setTimeout(() => {
            grid.classList.remove(animIn);
            emptyState.classList.remove(animIn);
        }, 250);
    }
}

let isTicking = false;
const btnTopCache = document.getElementById('btnScrollTop');
window.addEventListener('scroll', () => {
    if (!isTicking) {
        window.requestAnimationFrame(() => {
            if (btnTopCache) btnTopCache.classList.toggle('visible', window.scrollY > 300);
            isTicking = false;
        });
        isTicking = true;
    }
}, {passive: true});

// --- MODUL RECYCLE BIN ---
function bukaRecycleBin() {
    if ('master' !== currentRole) return alert("Hanya Master Admin.");
    renderRecycleBinList();
    toggleModal('modalSettings', false);
    toggleModal('modalRecycleBin', true);
}

function renderRecycleBinList() {
    const rbData = JSON.parse(getLocal('recycle_bin') || '[]');
    const rbList = document.getElementById('rbList');
    document.getElementById('rbCount').innerText = `${rbData.length} item`;
    document.getElementById('rbCheckAll').checked = false;
    
    if (rbData.length === 0) {
        rbList.innerHTML = '<div style="text-align:center; padding:20px; color:#999; font-weight:bold;">Recycle Bin bersih.</div>';
        return;
    }

    let htmlStr = '';
    rbData.sort((a,b) => b.deletedAt - a.deletedAt).forEach(item => {
        const dateStr = new Date(item.deletedAt).toLocaleDateString('id-ID', {day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute:'2-digit'});
        const iconStr = item.itemType === 'folder' ? '📁' : '📄';
        htmlStr += `
        <label class="log-item" style="display:flex; align-items:center; gap:12px; cursor:pointer; padding: 12px 10px;">
            <input type="checkbox" class="rb-checkbox" value="${item.id}" onchange="updateRbCheckAllState()" style="width:16px; height:16px; margin:0;">
            <div class="log-content-wrapper">
                <div class="log-meta"><span>${dateStr}</span></div>
                <div class="log-desc" style="font-weight:bold;">${iconStr} <span style="text-transform:capitalize;">${item.name}</span></div>
            </div>
        </label>`;
    });
    rbList.innerHTML = htmlStr;
}

function toggleRbCheckAll() {
    const isChecked = document.getElementById('rbCheckAll').checked;
    document.querySelectorAll('.rb-checkbox').forEach(cb => cb.checked = isChecked);
}

function updateRbCheckAllState() {
    const total = document.querySelectorAll('.rb-checkbox').length;
    const checked = document.querySelectorAll('.rb-checkbox:checked').length;
    document.getElementById('rbCheckAll').checked = (total > 0 && total === checked);
}

async function restoreRbSelected() {
    const checkedBoxes = Array.from(document.querySelectorAll('.rb-checkbox:checked'));
    if (checkedBoxes.length === 0) return alert("Pilih minimal satu item untuk dikembalikan.");

    let rbData = JSON.parse(getLocal('recycle_bin') || '[]');
    const idsToRestore = checkedBoxes.map(cb => cb.value);

    let restoredCount = 0;
    idsToRestore.forEach(id => {
        const itemIndex = rbData.findIndex(x => x.id === id);
        if (itemIndex > -1) {
            const itemData = rbData.splice(itemIndex, 1)[0];
            delete itemData.deletedAt;
            buatKartu(itemData, false);
            restoredCount++;
        }
    });

    if (restoredCount > 0) {
        setLocal('recycle_bin', JSON.stringify(rbData));
        simpanKeLokal();
        filterFiles();
        updateStats();
        renderRecycleBinList();
        logActivity('Restore Data', `Mengembalikan ${restoredCount} item dari keranjang sampah`);
        alert(`${restoredCount} item berhasil dikembalikan ke posisi asal.`);
    }
}

async function hapusRbSelected() {
    const checkedBoxes = Array.from(document.querySelectorAll('.rb-checkbox:checked'));
    if (checkedBoxes.length === 0) return alert("Pilih minimal satu item untuk dimusnahkan.");

    if (!await customConfirm("Hapus file yang dipilih secara permanen? Data akan dimusnahkan dari memori dan tidak dapat dipulihkan lagi.")) return;

    let rbData = JSON.parse(getLocal('recycle_bin') || '[]');
    const idsToDelete = checkedBoxes.map(cb => cb.value);

    let deletedCount = 0;
    for (const id of idsToDelete) {
        const itemIndex = rbData.findIndex(x => x.id === id);
        if (itemIndex > -1) {
            const itemData = rbData[itemIndex];
            // --- PEMUSNAHAN AKTUAL DARI INDEXED DB ---
            await dbHapusCover(itemData.id);
            await dbHapusFile(itemData.id).catch(e => console.warn(e));
            
            rbData.splice(itemIndex, 1);
            deletedCount++;
        }
    }

            if (deletedCount > 0) {
                setLocal('recycle_bin', JSON.stringify(rbData));
                renderRecycleBinList(); 
                
                logActivity('Musnahkan File', `Menghapus permanen ${deletedCount} item`);
                
                // [PEMBARUAN]: Memberi tahu pengguna bahwa sistem sedang menyinkronkan data fisik.
                alert(`${deletedCount} item dimusnahkan. Menyinkronkan ulang memori...`);
                setTimeout(() => {
                    if (dbInstance) {
                        dbInstance.close();
                    }
                    window.location.reload();
                }, 2000);
            }
        }

// --- HELPER KAMERA ---
function getExtFromMime(mimeType) {
    if (mimeType.startsWith('video/')) {
        if (mimeType === 'video/webm') return '.webm';
        if (mimeType === 'video/quicktime') return '.mov';
        if (mimeType === 'video/x-matroska') return '.mkv';
        return '.mp4';
    }
    return '.jpg';
}
// ----------------------

function tampungFileKamera(inputEl) {
    fileKameraTertunda = inputEl.files[0];
    if (!fileKameraTertunda) return;
    const isVideo = fileKameraTertunda.type.startsWith('video/');
    const trueExt = getExtFromMime(fileKameraTertunda.type) || (isVideo ? '.mp4' : '.jpg');
    const now = new Date();
    const pad = n => String(n).padStart(2, '0');
    const judulOtomatis = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}${trueExt}`;
    document.getElementById('fName').value = judulOtomatis;
    document.getElementById('fYear').value = now.getFullYear();
    document.getElementById('tabFolder').style.pointerEvents = 'none';
    document.getElementById('tabFolder').style.opacity = '0.5';
    const btnFoto = document.getElementById('btnPhotoCaptureUI');
    const btnVideo = document.getElementById('btnVideoCaptureUI');
    
    if (isVideo) {
        btnVideo.innerHTML = '✅ Video Siap (Klik Simpan)';
        btnVideo.style.background = '#e8f5e9';
        btnVideo.style.color = '#2e7d32';
        btnVideo.style.borderColor = '#8bc34a';
        btnFoto.style.display = 'none'; 
    } else {
        btnFoto.innerHTML = '✅ Foto Siap (Klik Simpan)';
        btnFoto.style.background = '#e8f5e9';
        btnFoto.style.color = '#2e7d32';
        btnFoto.style.borderColor = '#8bc34a';
        btnVideo.style.display = 'none';
    }

    window.alert(`✅ Media tertangkap!\nSilakan lengkapi catatan (opsional) lalu klik tombol "Simpan".`);
}
