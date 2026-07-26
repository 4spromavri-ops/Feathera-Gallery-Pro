// ======================================================
// SECTION 1: UTAS UTILITY & LOCAL STORAGE HELPERS
// ======================================================
// Bagian ini menangani penyimpanan data kecil berbasis key-value.
function getLocal(key) { return localStorage.getItem('feathera_' + key + '_' + currentUser); }
function setLocal(key, val) { localStorage.setItem('feathera_' + key + '_' + currentUser, val); }
function delLocal(key) { localStorage.removeItem('feathera_' + key + '_' + currentUser); }
function getLinkGroups() { return JSON.parse(getLocal('link_groups') || '[]'); }
function setLinkGroups(groups) { setLocal('link_groups', JSON.stringify(groups)); }

// ======================================================
// SECTION 2: STRUKTUR & INISIALISASI INDEXEDDB (CORE)
// ======================================================
// Bagian ini bertanggung jawab atas koneksi awal dan transaksi utama IndexedDB.
function initDB() {
    return new Promise((resolve, reject) => {
        const dbName = currentUser ? 'FeatheraDB_' + currentUser : 'FeatheraDB_Guest'; 
        const request = indexedDB.open(dbName, DB_VERSION);
        
        request.onupgradeneeded = event => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains('files')) {
                db.createObjectStore('files');
            }
            if (!db.objectStoreNames.contains('covers')) {
                db.createObjectStore('covers');
            }
        };
        
        request.onsuccess = event => {
            dbInstance = event.target.result;
            resolve(dbInstance);
        };
        
        request.onerror = event => {
            reject(event);
        };
    });
}

function dbOp(storeName, operation, key, value) {
    return new Promise((resolve, reject) => {
        if (!dbInstance) return reject("DB not ready"); 
        
        const mode = operation === 'get' ? 'readonly' : 'readwrite';
        const tx = dbInstance.transaction([storeName], mode);
        const store = tx.objectStore(storeName);
        let request;
        
        if (operation === 'put') {
            request = store.put(value, key);
        } else if (operation === 'get') {
            request = store.get(key);
            request.onsuccess = () => resolve(request.result);
        } else {
            request = store.delete(key);
        }
        
        tx.oncomplete = () => {
            if (operation !== 'get') resolve();
        };
        
        tx.onerror = (e) => reject(e);
    });
}

// ======================================================
// SECTION 3: OPERASI TABEL INDEXEDDB (FILES & COVERS)
// ======================================================
// Fungsi pembungkus (wrapper) untuk mempermudah operasi CRUD file fisik dan cover.
function dbSimpanFile(key, blob) {
    return dbOp('files', 'put', key, blob);
}

function dbAmbilFile(key) {
    return dbOp('files', 'get', key);
}

function dbHapusFile(key) {
    return dbOp('files', 'delete', key).catch((e) => { 
        window.alert("Peringatan: Gagal menghapus file fisik lokal. Penyimpanan mungkin penuh/terkunci. Info: " + e); 
    });
}

function dbSimpanCover(key, blob) {
    return dbOp('covers', 'put', key, blob);
}

function dbAmbilCover(key) {
    return dbOp('covers', 'get', key);
}

function dbHapusCover(key) {
    return dbOp('covers', 'delete', key).catch((e) => { 
        window.alert("Peringatan: Gagal menghapus thumbnail lokal. Penyimpanan mungkin penuh/terkunci. Info: " + e); 
    });
}

// ======================================================
// SECTION 4: SINKRONISASI STATE DATA & DOM (LOCAL STORAGE)
// ======================================================
// Logika untuk menyimpan/memuat daftar file ke struktur kartu HTML (UI/UX).
function simpanKeLokal(){
    const a=[];
    document.querySelectorAll('.card').forEach(b=>a.push({id:b.getAttribute('data-id'),itemType:b.getAttribute('data-itemType'),folderId:b.getAttribute('data-folderId'),name:b.querySelector('.file-info').textContent,year:b.getAttribute('data-year'),note:b.getAttribute('data-note'),img:b.getAttribute('data-img'),cat:b.getAttribute('data-cat'),sub:b.getAttribute('data-sub'),type:b.getAttribute('data-type'),detail:b.getAttribute('data-detail'),hidden:b.getAttribute('data-hidden'),font:b.getAttribute('data-font'),customCover:b.getAttribute('data-customCover'),related:b.getAttribute('data-related'),descaura:b.getAttribute('data-descaura'),favorite:b.getAttribute('data-favorite')||'false',android:b.getAttribute('data-android')||'none',format:b.getAttribute('data-format')||'auto'}));
    setLocal('files_db',JSON.stringify(a));
}

function muatDariLokal(){
    const a=getLocal('files_db');
    if(a){
        const grid=document.getElementById('fileGrid');
        grid.innerHTML='';
        const frag=document.createDocumentFragment();
        JSON.parse(a).reverse().forEach(b=>buatKartu(b,!1,frag));
        grid.appendChild(frag);
        updateStats(); filterFiles();
    }
}

// ======================================================
// SECTION 5: MANAJEMEN EKSPOR, IMPOR & BACKUP DATA
// ======================================================
// Fitur pencadangan data lokal, integrasi Capacitor Filesystem, dan Google Drive.
async function eksporData() {
    if (!await customConfirm("Export data?")) return;
    
    let filesData = [];
    try { filesData = JSON.parse(getLocal('files_db') || '[]'); } 
    catch (err) { alert("Peringatan: Ada data lokal yang korup. Melanjutkan ekspor data yang utuh..."); }

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
                                reader.readAsDataURL(vals[i]); 
                            });
                        }
                        resolve();
                    };
                };
            });
        }
    } catch(e) { console.warn("Gagal mengekstrak cover", e); }

    const backupData = JSON.stringify({ files: filesData, config: config, covers: coversData }, null, 2);
    const dateStr = new Date().toISOString().split('T')[0];
    const timeStr = new Date().getHours() + "-" + new Date().getMinutes() + "-" + new Date().getSeconds();
    const defaultFileName = `Feathera_Backup_${dateStr}_${timeStr}.json`;
    const isNative = window.Capacitor && window.Capacitor.isNative;
    let pesanSukses = "";

    if (isNative) {
        try {
            await window.Capacitor.Plugins.Filesystem.writeFile({ path: defaultFileName, data: backupData, directory: 'DOCUMENTS', encoding: 'utf8' });
            pesanSukses += "Data berhasil diekspor ke folder 'Documents' memori internal.\n";
        } catch (err) {
            console.error("Gagal export native:", err);
            pesanSukses += "Gagal menyimpan file ke perangkat lokal: " + err.message + "\n";
        }
    } else {
        const blob = new Blob([backupData], { type: 'application/json' });
        const a = document.createElement('a');
        const url = URL.createObjectURL(blob);
        a.href = url; a.download = defaultFileName; document.body.appendChild(a); a.click(); document.body.removeChild(a); 
        requestAnimationFrame(() => { setTimeout(() => URL.revokeObjectURL(url), 30000); });
        pesanSukses += "Data lokal diekspor (Periksa folder Download).\n";
    }

    const gToken = await dapatkanTokenDriveAktif();
    const driveJsonUrl = getLocal('drive_folder_json');

    if (gToken && currentUser !== 'Guest') {
        try {
            const jsonBlob = new Blob([backupData], { type: 'application/json' });
            const resMedia = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=media', {
                method: 'POST',
                headers: { 'Authorization': 'Bearer ' + gToken, 'Content-Type': 'application/json', 'Content-Length': jsonBlob.size },
                body: jsonBlob
            });

            const dataMedia = await resMedia.json();
            if (resMedia.ok && dataMedia.id) {
                let patchUrl = `https://www.googleapis.com/drive/v3/files/${dataMedia.id}`;
                if (driveJsonUrl) {
                    const folderId = driveJsonUrl.includes('folders/') ? driveJsonUrl.split('folders/')[1].split(/[?&/]/)[0] : driveJsonUrl;
                    patchUrl += `?addParents=${folderId}&removeParents=root`;
                }
                await fetch(patchUrl, { method: 'PATCH', headers: { 'Authorization': 'Bearer ' + await dapatkanTokenDriveAktif(), 'Content-Type': 'application/json' }, body: JSON.stringify({ name: defaultFileName }) });
                pesanSukses += "☁️ Salinan Backup berhasil diunggah ke Google Drive Anda!";
            } else { pesanSukses += "☁️ Gagal upload ke Drive (API Ditolak)."; }
        } catch (errDrive) {
            console.warn("Koneksi gagal ke Drive", errDrive);
            pesanSukses += "☁️ Gagal upload ke Drive (Jaringan/Timeout).";
        }
    }
    alert(pesanSukses);
}

function imporData(a) {
    if (window.Capacitor && window.Capacitor.isNative && window.Capacitor.Plugins.Filesystem) {
        window.Capacitor.Plugins.Filesystem.requestPermissions().catch(()=>{});
    }

    const b = a.files[0];
    if (!b) return;

    if (!b.name.toLowerCase().endsWith('.json')) {
        alert("Gagal: Format file tidak didukung. Harap masukkan file .json!");
        a.value = ''; return;
    }
    if (b.size === 0) {
        alert("Gagal: File kosong (0 bytes)! Ekspor sebelumnya gagal tersimpan sempurna di memori HP.");
        a.value = ''; return;
    }

    const c = new FileReader();
    c.onerror = () => { alert("Terjadi kesalahan saat membaca file dari penyimpanan perangkat."); a.value = ''; };

    c.onload = async (d) => { 
        try {
            const e = JSON.parse(d.target.result);
            if (e && Array.isArray(e.files) && Array.isArray(e.config)) {
                const isFromLogin = !document.getElementById('authPage').classList.contains('hidden');
                if (isFromLogin) { currentUser = 'RestoredUser'; localStorage.setItem('feathera_session', currentUser); }
                setLocal('files_db', JSON.stringify(e.files));
                setLocal('config_v1', JSON.stringify(e.config));

                if (e.covers && dbInstance) {
                    for (const [key, base64Str] of Object.entries(e.covers)) {
                        try {
                            const res = await fetch(base64Str);
                            const blob = await res.blob();
                            await dbSimpanCover(key, blob);
                        } catch(err) { console.warn("Gagal memulihkan cover:", key); }
                    }
                }
                if (isFromLogin) { tampilkanApp(); } 
                else { loadConfig(); muatDariLokal(); }
                alert("Backup & Cover Dipulihkan Secara Penuh! (File lokal DB tidak termasuk)");
            } else { alert("Struktur data backup tidak dikenali oleh Feathera Gallery!"); }
        } catch (f) { alert("Format JSON tidak valid! Detail: " + f.message); } 
        finally { a.value = ''; }
    };
    c.readAsText(b);
}
