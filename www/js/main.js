// =====================================================
// SECTION 1: INISIALISASI DASAR & GESTUR GLOBAL
// =====================================================
document.addEventListener("DOMContentLoaded",()=>{
    initAuth();

    window.history.pushState({ noBackExitsApp: true }, '');
    window.addEventListener('popstate', async function(event) {
        window.history.pushState({ noBackExitsApp: true }, '');
        const isConfirmed = await customConfirm("Apakah Anda yakin ingin keluar dari Feathera Gallery?");
        if (isConfirmed) {
            window.history.go(-2);
            setTimeout(() => window.close(), 300);
        }
    });

    document.getElementById('btnScrollTop').innerHTML=SVG_CHEVRON_UP;
    document.getElementById('btnDownloadTxt').innerHTML = SVG_DOWNLOAD + ' Download';
    document.getElementById('btnShareTxt').innerHTML = SVG_SHARE + ' Bagikan';
    document.body.addEventListener('click', tutupSemuaMenu);
    document.getElementById('btnFsDownload').innerHTML = SVG_DOWNLOAD;
    document.getElementById('btnFsClose').innerHTML = SVG_CANCEL;

    document.getElementById('pasteMenu').addEventListener('click', function(e) {
        if (e.target === this) {
            toggleModal('pasteMenu', false);
        }
    });

    const fileGrid = document.getElementById('fileGrid');
    fileGrid.addEventListener('click', (e) => {
        if (isLongPressTriggered) {
            isLongPressTriggered = false;
            e.preventDefault();
            e.stopPropagation();
            return;
        }
        const card = e.target.closest('.card');
        if(card && !e.target.closest('.menu-dots')) cardClickHandler(card);
    });
    
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
    
    document.getElementById('fImgUrl').addEventListener('input', async function(e) {
        const url = this.value.trim();
        const nameInput = document.getElementById('fName');
        if (url.includes('/v1/storage/buckets/') && url.includes('/files/')) {
            try {
                const apiUrl = url.replace(/\/files\/([^\/]+)\/(view|download)/, '/files/$1');
                const response = await fetch(apiUrl);
                if (response.ok) {
                    const data = await response.json();
                    if (data.name) {
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

    setTimeout(() => {
        const splash = document.getElementById('splashScreen');
        if (splash) {
            splash.classList.add('fade-out');
            setTimeout(() => splash.remove(), 600);
        }
    }, 2200); 

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
});

function tampilkanApp() {     
    const loginLoad = document.getElementById('loginLoading');
    if(loginLoad) loginLoad.classList.add('hidden');
    
    document.getElementById('authPage').classList.add('hidden');   
    document.getElementById('mainHeader').classList.remove('hidden');
    document.getElementById('mainContent').classList.remove('hidden');
    document.getElementById('mainNav').classList.remove('hidden');
    document.getElementById('dynamicChipsArea').classList.remove('hidden');

    const savedGoogleName = localStorage.getItem('feathera_google_name');
    let displayName = savedGoogleName ? savedGoogleName.split(' ')[0] : (currentUser === 'RestoredUser' ? 'Guest' : currentUser);

    document.querySelector('.header-title h1').innerHTML = `<span style="text-transform: capitalize; max-width: 150px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; display: inline-block; vertical-align: bottom;">${displayName}</span> <span class="gallery-style">Gallery</span>`;     
    document.getElementById('sortOption').value = currentSortOpt; 
    if(currentViewMode === 'list') document.getElementById('fileGrid').classList.add('list-view');
    
    const profileNameEl = document.getElementById('userProfileName');
    const profileEmailEl = document.getElementById('userProfileEmail');
    const profilePicEl = document.getElementById('userProfilePic');
    const profileFallbackEl = document.getElementById('userProfileIconFallback');
    const btnPin = document.getElementById('btnGantiPinSettings');
    const btnLog = document.getElementById('btnLogAktifitasSettings');
    const btnDrive = document.getElementById('btnDriveSettings'); 

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
        if(btnPin) btnPin.style.display = 'flex';
        if(btnLog) btnLog.style.display = 'flex';
        if(btnDrive) btnDrive.style.display = 'flex'; 
    } else {
        let guestName = currentUser === 'RestoredUser' ? 'Guest' : currentUser;
        profileNameEl.innerText = guestName;
        profileEmailEl.style.display = 'none';
        profilePicEl.style.display = 'none';
        profileFallbackEl.style.display = 'flex';
        if(btnPin) btnPin.style.display = 'none';
        if(btnLog) btnLog.style.display = 'none';
        if(btnDrive) btnDrive.style.display = 'none'; 
    }

    setTimeout(() => document.body.classList.add('app-ready'), 100);     
    
    initDB().then(() => {
        initLockState();     
        initDarkMode();     
        loadConfig();     
        muatDariLokal();     
        MediaPlayer.init(); 
    }).catch(err => console.error("Gagal inisialisasi database:", err));
}

function abaikanSwipe(target) {
    return target.closest('.modal, #mainNav, .chip-container, .stats-bar, .mp-progress, .card.is-dragging') || 
           ['INPUT', 'TEXTAREA', 'BUTTON'].includes(target.tagName) || 
           document.body.classList.contains('no-scroll');
}

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
    if (arah === 'next' && indexSaatIni < urutanTab.length - 1) { indexBaru++; } 
    else if (arah === 'prev' && indexSaatIni > 0) { indexBaru--; }

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

    if (Math.abs(diffX) > 60 && diffY < 50) {
        geserHalaman(diffX > 0 ? 'next' : 'prev');
    }
    swipeStartX = 0; swipeStartY = 0;
}, {passive: true});

window.addEventListener('scroll', () => {
    if (!isTicking) {
        window.requestAnimationFrame(() => {
            if (btnTopCache) btnTopCache.classList.toggle('visible', window.scrollY > 300);
            isTicking = false;
        });
        isTicking = true;
    }
}, {passive: true});

const btnTopCache = document.getElementById('btnScrollTop');

['touchstart','mousedown'].forEach(a=>window.addEventListener(a,b=>{
    const target = b.target;
    if(document.body.classList.contains('no-scroll') || ['INPUT','TEXTAREA','BUTTON','SELECT'].includes(target.tagName)) return;
    const cardTarget = target.closest('.card');
    if(cardTarget){
        pressTimer=setTimeout(()=>{
            if(currentRole !== 'none') {
                isLongPressTriggered = true; 
                cardHoldHandler(cardTarget);
            }
        }, 600);
        return;
    }
    pressTimer=setTimeout(async ()=>{
        try { navigator.vibrate&&navigator.vibrate(50); } catch(e){}
        if (!isMovePending) return;
        if(curFilter.l0 === 'all' || curFilter.l0 === 'audiovideo' || curFilter.l0 === 'favorite') {
            alert("Buka folder atau kategori spesifik terlebih dahulu untuk menempelkan (paste) item."); return;
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

['touchend','touchmove','mouseup','touchcancel'].forEach(a=>window.addEventListener(a,(e)=>{
    if(pressTimer){ clearTimeout(pressTimer); pressTimer = null; }
    if ((a === 'touchend' || a === 'mouseup') && isLongPressTriggered) {
        setTimeout(() => { isLongPressTriggered = false; }, 300);
    }
}, {passive: true}));

// =====================================================
// SECTION 2: PENGATURAN APLIKASI, TEMA & LOG AKTIFITAS
// =====================================================
function loadConfig(){config=JSON.parse(getLocal('config_v1')||JSON.stringify(defaultConfig)),flattenConfig(),renderNav(),renderChips(),initMasterTree()}

function flattenConfig(){flatConfig={};const a=(b,c=null)=>{b&&b.forEach(d=>{flatConfig[d.id]={...d,parentId:c},d.children&&a(d.children,d.id)})};a(config)}

function saveConfig(){
    setLocal('config_v1',JSON.stringify(config));
    flattenConfig(); renderNav(); renderChips();
}

function updateStats() {
    const a = document.querySelectorAll('.card[data-itemType="file"]');
    const counts = { total: 0, img: 0, vid: 0, aud: 0, app: 0, doc: 0, txt: 0 };
    
    a.forEach(i => {
        if ('true' === i.getAttribute('data-hidden') && 'master' !== currentRole) return;
        counts.total++;
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
    const storageItemDOM = document.getElementById('statStorageItem');
    if (navigator.storage && navigator.storage.estimate) {
        navigator.storage.estimate().then(estimate => {
            const usedMB = (estimate.usage / (1024 * 1024)).toFixed(1);
            const totalGB = (estimate.quota / (1024 * 1024 * 1024)).toFixed(1);
            document.getElementById('statStorage').innerText = `${usedMB}MB / ${totalGB}GB`;
        }).catch(() => { storageItemDOM.style.display = 'none'; });
    } else { storageItemDOM.style.display = 'none'; }
}

function initDarkMode(){isDarkMode=('true'===localStorage.getItem('feathera_dark_mode')),applyDarkMode()}

function toggleDarkMode(){isDarkMode=!isDarkMode,localStorage.setItem('feathera_dark_mode',isDarkMode),applyDarkMode()}

function applyDarkMode(){const a=document.getElementById('darkModeIcon');isDarkMode?(document.body.classList.add('dark-mode'),a.innerText="☀️"):(document.body.classList.remove('dark-mode'),a.innerText="🌙")}

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

// =====================================================
// SECTION 3: UI RENDERING, NAVIGASI FOLDER & GLOBAL UI
// =====================================================
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
        const visibleCardsLength = document.querySelectorAll('.card:not([style*="display: none"])').length;
        const selectedCount = document.querySelectorAll('.card.selected:not([style*="display: none"])').length;
        const isAllSelected = visibleCardsLength > 0 && selectedCount === visibleCardsLength;
        const svgIcon = isAllSelected ? SVG_SELECT_ACTIVE : SVG_SELECT_INACTIVE;

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
    const oldScrolls = Array.from(a.querySelectorAll('.chip-container')).map(el => el.scrollLeft);
    a.innerHTML='';
    if(curFilter.l0==='audiovideo'){
        document.body.style.paddingBottom = '150px'; 
        filterFiles();
        return;
    }
    let containerIndex = 0;
    const b=(c,d,e,f)=>{
        if(c&&c.length){
            const g=document.createElement('div');
            g.className='chip-container';
            let chipHtml=`<div class="chip ${'all'===e?'active':''}" onclick="setFilter(${d}, 'all')">✨ Semua ${f}</div>`;
            c.forEach(h=>chipHtml+=`<div class="chip ${e===h.id?'active':''}" onclick="setFilter(${d}, '${h.id}')">${h.icon?h.icon+' ':''}${h.name}</div>`);
            g.innerHTML=chipHtml;
            a.appendChild(g);
            
            if(oldScrolls[containerIndex] !== undefined) {
                g.scrollLeft = oldScrolls[containerIndex];
            }
            containerIndex++;
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
    setTimeout(() => {
        const chipsHeight = a.offsetHeight || 0;
        document.body.style.paddingBottom = chipsHeight > 0 ? (100 + chipsHeight) + 'px' : '150px';
        updateSelectCount(); 
    }, 50);
    filterFiles();
}

function renderBreadcrumbs(){
    const a=document.getElementById('folderBreadcrumbs'),b=document.getElementById('searchName').value||document.getElementById('searchYear').value;
    let crumbHtml = '';
    if(!b && currentFolderId && currentFolderId !== 'none') {
        crumbHtml += `<span class="crumb-item" onclick="bukaFolder(null)">Home</span>`;
        let c=currentFolderId,d=[];
        while(c&&'none'!==c){
            const f=document.querySelector(`.card[data-id="${c}"]`);
            if(f){
                d.unshift({id:c,name:f.querySelector('.file-info').innerText});
                c=f.getAttribute('data-folderId');
            } else {
                if (c === 'not_found_dummy' && activeSearchFolderName) {
                    const displayGhostName = activeSearchFolderName.replace(/\b\w/g, char => char.toUpperCase());
                    d.unshift({id:c, name: displayGhostName}); 
                }
                break;
            }
        }
        const svgSearchTiny = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#FF9800" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" style="margin-left:6px; vertical-align:middle; filter: drop-shadow(0 1px 2px rgba(255, 152, 0, 0.5));"><circle cx="10" cy="10" r="7"></circle><line x1="23" y1="23" x2="14.95" y2="14.95"></line></svg>`;
        d.forEach((f,g) => {
            let isLast = g === d.length - 1;
            crumbHtml += `<span class="crumb-sep">></span><span class="${isLast?'':'crumb-item'}" ${!isLast?`onclick="bukaFolder('${f.id}')"`:''}>${f.name}${isLast ? svgSearchTiny : ''}</span>`;
        });
    } else { crumbHtml += `<span class="crumb-item" onclick="bukaFolder(null)">Home</span>`; }

    const svgGrid = `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M4 4h6v6H4zm10 0h6v6h-6zM4 14h6v6H4zm10 0h6v6h-6z"/></svg>`;
    const svgList = `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M4 6h2v2H4zm0 5h2v2H4zm0 5h2v2H4zm4-10h12v2H8zm0 5h12v2H8zm0 5h12v2H8z"/></svg>`;
    const toggleHtml = `<button class="view-toggle-btn ${currentViewMode==='grid'?'active':''}" onclick="setViewMode('grid')" title="Grid View">${svgGrid}</button><button class="view-toggle-btn ${currentViewMode==='list'?'active':''}" onclick="setViewMode('list')" title="List View">${svgList}</button>`;
    a.innerHTML = `<div class="crumb-left">${crumbHtml}</div><div class="crumb-right">${toggleHtml}</div>`;
}

function setViewMode(mode) {
    currentViewMode = mode;
    localStorage.setItem('feathera_view_mode', mode);
    const gridEl = document.getElementById('fileGrid');
    if(mode === 'list') gridEl.classList.add('list-view');
    else gridEl.classList.remove('list-view');
    renderBreadcrumbs();
}

function bukaFolder(a){
    currentFolderId=a;
    if (a && a !== 'none') {
        const fld = document.querySelector(`.card[data-id="${a}"]`);
        if (fld) activeSearchFolderName = fld.getAttribute('data-name');
    } else { activeSearchFolderName = null; }
    filterFiles(); updateSelectCount(); window.scrollTo(0, 0);
}

function goUpFolder() {
    if(currentFolderId && currentFolderId !== 'none') {
        const fld = document.querySelector(`.card[data-id="${currentFolderId}"]`);
        const pId = fld ? fld.getAttribute('data-folderId') : null;
        bukaFolder(!pId || pId === 'none' ? null : pId);
    }
}

function tutupSemuaMenu(){document.querySelectorAll('.pl-ctx-menu').forEach(a=>a.classList.remove('show'))}

// =====================================================
// SECTION 4: MESIN PENCARI & FILTERING (CORE DISPLAY LOGIC)
// =====================================================
function setFilter(a, b) {
    if (b === 'all') {
        0 === a ? curFilter = { l0: 'all', l1: 'all', l2: 'all', l3: 'all' } : 
        1 === a ? (curFilter.l1 = 'all', curFilter.l2 = 'all', curFilter.l3 = 'all') : 
        2 === a ? (curFilter.l2 = 'all', curFilter.l3 = 'all') : 
        (curFilter.l3 = 'all');
    } else if (curFilter['l' + a] === b) {
        0 === a ? (curFilter.l1 = 'all', curFilter.l2 = 'all', curFilter.l3 = 'all') : 
        1 === a ? (curFilter.l2 = 'all', curFilter.l3 = 'all') : 
        2 === a && (curFilter.l3 = 'all');
    } else {
        const activeNames = {
            l1: curFilter.l1 !== 'all' && flatConfig[curFilter.l1] ? flatConfig[curFilter.l1].name : null,
            l2: curFilter.l2 !== 'all' && flatConfig[curFilter.l2] ? flatConfig[curFilter.l2].name : null,
            l3: curFilter.l3 !== 'all' && flatConfig[curFilter.l3] ? flatConfig[curFilter.l3].name : null
        };
        curFilter['l' + a] = b; 
        0 === a ? (curFilter.l1 = 'all', curFilter.l2 = 'all', curFilter.l3 = 'all') : 
        1 === a ? (curFilter.l2 = 'all', curFilter.l3 = 'all') : 
        2 === a && (curFilter.l3 = 'all');
        let currNode = flatConfig[b];
        if (currNode && currNode.children) {
            if (a < 1 && activeNames.l1) {
                let m1 = currNode.children.find(c => c.name === activeNames.l1);
                if (m1) {
                    curFilter.l1 = m1.id;
                    if (m1.children && activeNames.l2) {
                        let m2 = m1.children.find(c => c.name === activeNames.l2);
                        if (m2) {
                            curFilter.l2 = m2.id;
                            if (m2.children && activeNames.l3) {
                                let m3 = m2.children.find(c => c.name === activeNames.l3);
                                if (m3) curFilter.l3 = m3.id;
                            }
                        }
                    }
                }
            } else if (a === 1 && activeNames.l2) {
                let m2 = currNode.children.find(c => c.name === activeNames.l2);
                if (m2) {
                    curFilter.l2 = m2.id;
                    if (m2.children && activeNames.l3) {
                        let m3 = m2.children.find(c => c.name === activeNames.l3);
                        if (m3) curFilter.l3 = m3.id;
                    }
                }
            } else if (a === 2 && activeNames.l3) {
                let m3 = currNode.children.find(c => c.name === activeNames.l3);
                if (m3) curFilter.l3 = m3.id;
            }
        }
    }
    
    if (1 > a) renderNav(); 

    if (activeSearchFolderName) {
        const allFolders = Array.from(document.querySelectorAll('.card[data-itemType="folder"]'));
        const matchingFolder = allFolders.find(f => {
            if (f.getAttribute('data-name') !== activeSearchFolderName) return false;
            const cCat = f.getAttribute('data-cat'), cSub = f.getAttribute('data-sub'), cTyp = f.getAttribute('data-type'), cDet = f.getAttribute('data-detail');
            return ('all' === curFilter.l0 || cCat === curFilter.l0) && ('all' === curFilter.l1 || cSub === curFilter.l1) && ('all' === curFilter.l2 || cTyp === curFilter.l2) && ('all' === curFilter.l3 || cDet === curFilter.l3);
        });
        currentFolderId = matchingFolder ? matchingFolder.getAttribute('data-id') : 'not_found_dummy';
    } else {
        currentFolderId = null;
    }

    renderChips();
    updateSelectCount(); 
    window.scrollTo(0, 0);
}

function filterFiles(){
    const a=document.getElementById('searchName').value.toLowerCase(),b=document.getElementById('searchYear').value,c=(a||b);
    renderBreadcrumbs();
    let e=[];
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
        
        const itemType = f.getAttribute('data-itemType');
        const imgStr = f.getAttribute('data-img');
        const nameStr = f.getAttribute('data-name'); 
        const fileYear = f.getAttribute('data-year');
        
        if (isAddMediaMode && itemType === 'file') {
            const typeStr = getMediaType(imgStr, nameStr);
            if (typeStr !== 'audio' && typeStr !== 'video') {
                f.style.display = 'none';
                return;
            }
        }

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

        const h = (curFilter.l0 === 'audiovideo' || curFilter.l0 === 'favorite') ? true : (c ? true : (currentFolderId ? f.getAttribute('data-folderId') === currentFolderId : (!f.getAttribute('data-folderId') || 'none' === f.getAttribute('data-folderId'))));
        const i = !a || nameStr.includes(a);
        const j = !b || fileYear.includes(b);
        
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
                    matchesSource = false; 
                } else {
                    if (currentSourceFilter === 'local' && !stats.local) matchesSource = false;
                    if (currentSourceFilter === 'online' && !stats.online) matchesSource = false;
                }
            }
        }
        
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
        return j!==k ? k-j : nameF.localeCompare(nameG);
    });
   
    e.forEach((g, index) => {
        g.style.order = index;
    });
   
    const emptyStateText = document.querySelector('#emptyState p');
    if (curFilter.l0 === 'favorite') {
        emptyStateText.innerHTML = 'Belum ada memori tersimpan.<br>Silakan edit data spesifik, tandai (✩) lalu simpan.';
    } else if (curFilter.l0 === 'all' || curFilter.l0 === 'audiovideo') {
        emptyStateText.innerHTML = 'Belum ada memori tersimpan.<br>Buka kategori spesifik untuk menambah data.';
    } else if (currentRole === 'none') {
        emptyStateText.innerHTML = 'Belum ada memori disini.<br>Silakan pergi ke Pengaturan (⚙️) dan buka kunci terlebih dahulu untuk menambah data.';
    } else {
        emptyStateText.innerHTML = 'Belum ada memori disini.<br>Tekan tombol ➕ untuk upload.';
    }

    document.getElementById('emptyState').style.display = e.length === 0 ? "flex" : "none";
}

function debounceSearch() {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
        filterFiles();
    }, 300);
}

function clearInput(inputId) {
    const input = document.getElementById(inputId);
    if (input) {
        input.value = '';
        toggleClearBtn(inputId);
        debounceSearch(); 
    }
}

function toggleClearBtn(inputId) {
    const input = document.getElementById(inputId);
    const btnId = 'clear' + inputId.charAt(0).toUpperCase() + inputId.slice(1);
    const btn = document.getElementById(btnId);
    if (btn) {
        btn.style.display = input.value.length > 0 ? 'inline-flex' : 'none';
    }
}

function gantiUrutan(val){currentSortOpt=val;localStorage.setItem('feathera_sort_opt', val);filterFiles();}

function toggleSourceFilter() {
    const btn = document.getElementById('btnSourceFilter');
    if (currentSourceFilter === 'all') {
        currentSourceFilter = 'local';
        btn.innerHTML = SVG_FILTER_LOCAL;
        btn.style.color = ''; 
        window.alert("Filter Aktif: Hanya menampilkan file Internal HP");
    } else if (currentSourceFilter === 'local') {
        currentSourceFilter = 'online';
        btn.innerHTML = SVG_FILTER_ONLINE;
        btn.style.color = '#2196F3'; 
        window.alert("Filter Aktif: Hanya menampilkan file Internet / URL");
    } else {
        currentSourceFilter = 'all';
        btn.innerHTML = SVG_FILTER_ALL;
        btn.style.color = '#4CAF50'; 
        window.alert("Filter Nonaktif: Menampilkan semua file");
    }
    filterFiles(); 
}

// =====================================================
// SECTION 5: MANAJEMEN KARTU & INTERAKSI (DOM)
// =====================================================
function buatKartu(a, b = !1, wadahFragment = null) {
    const c = document.createElement('div');
    c.className = 'card';
    const cachedMediaType = getMediaType(a.img, a.name);
    ['cat', 'sub', 'type', 'detail', 'year', 'img', 'note', 'id', 'itemType', 'folderId', 'font', 'customCover', 'related', 'descaura', 'favorite', 'android'].forEach(d => c.setAttribute(`data-${d}`, a[d] || 'none'));
    c.setAttribute('data-format', a.format || 'auto');
    c.setAttribute('data-mediatype', cachedMediaType);
    c.setAttribute('data-name', a.name.toLowerCase());
    'true' === a.hidden && (c.setAttribute('data-hidden', 'true'), c.classList.add('is-hidden-file'));

    const isLocal = a.img === 'LOCAL_FILE' || (typeof a.img === 'string' && a.img.startsWith('NATIVE:'));
    const isDrive = !isLocal && typeof a.img === 'string' && !!getDriveId(a.img);
    const isSupabase = !isLocal && !isDrive && typeof a.img === 'string' && a.img.includes('supabase.co');
    const isAppwrite = !isLocal && !isDrive && !isSupabase && typeof a.img === 'string' && a.img.includes('appwrite.io');
    const isDropbox = !isLocal && !isDrive && !isSupabase && !isAppwrite && typeof a.img === 'string' && a.img.includes('dropbox.com');
   
    let statusIconHtml = '';
    if (isLocal) statusIconHtml = `<div class="local-storage-icon" title="Tersimpan di Memori Lokal"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2h9l5 5v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z"></path><path d="M8 2v4"></path><path d="M12 2v4"></path><path d="M16 4v2"></path></svg></div>`;
    else if (isDrive) statusIconHtml = `<div class="local-storage-icon" style="opacity: 0.85;" title="Tersimpan di Google Drive"><img src="https://upload.wikimedia.org/wikipedia/commons/1/12/Google_Drive_icon_%282020%29.svg" style="width: 11px; height: 11px; object-fit: contain; filter: drop-shadow(0 0px 0px rgba(0,0,0,0.2));" alt="Drive"></div>`;
    else if (isSupabase) statusIconHtml = `<div class="local-storage-icon" style="opacity: 0.85;" title="Tersimpan di Supabase"><svg width="12" height="12" viewBox="0 0 24 24" fill="#3ECF8E" style="filter: drop-shadow(0 0px 0px rgba(0,0,0,0.2));"><path d="M11.99 2.21L2.83 11.36h7.24v10.42l9.16-9.15h-7.24V2.21z"/></svg></div>`;
    else if (isAppwrite) statusIconHtml = `<div class="local-storage-icon" style="opacity: 0.85;" title="Tersimpan di Appwrite"><img src="https://www.google.com/s2/favicons?domain=appwrite.io&sz=32" style="width: 10px; height: 10px; object-fit: contain; filter: drop-shadow(0 0px 0px rgba(0,0,0,0.2));" alt="Appwrite"></div>`;
    else if (isDropbox) statusIconHtml = `<div class="local-storage-icon" style="opacity: 0.85;" title="Tersimpan di Dropbox"><img src="https://upload.wikimedia.org/wikipedia/commons/7/78/Dropbox_Icon.svg" style="width: 11px; height: 11px; object-fit: contain; filter: drop-shadow(0 0px 0px rgba(0,0,0,0.2));" alt="Dropbox"></div>`;
    
    if (a.cat === 'aplikasi') statusIconHtml = '';

    c.innerHTML = `${statusIconHtml}<button class="menu-dots" onclick="wrapBukaEdit(event, this)">${SVG_EDIT}</button><div class="thumb-container"></div><span class="file-info">${a.name}</span><span class="file-year">${a.year || ''}</span>`;

    const d = wadahFragment || document.getElementById('fileGrid');
    b ? d.prepend(c) : d.appendChild(c);
    lazyLoadObserver.observe(c);
}

const lazyLoadObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            const card = entry.target;
            if (typeof refreshCardIcon === 'function') refreshCardIcon(card);
            observer.unobserve(card); 
        }
    });
}, { rootMargin: '300px 0px', threshold: 0.01 });

async function refreshCardIcon(a){
    const b=a.getAttribute('data-img'),c=a.getAttribute('data-id'),d=a.getAttribute('data-name'),e='folder'===a.getAttribute('data-itemType'),f=a.querySelector('.thumb-container');
    const hasCover=a.getAttribute('data-customCover')==='true';
    const h=getMediaType(b,d);
    if(hasCover && !['app', 'archive', 'doc', 'other', 'unknown_local'].includes(h)){
        try{const blob=await dbAmbilCover(c);if(blob){const url=URL.createObjectURL(blob);f.innerHTML=`<img src="${url}" class="img-thumb" loading="lazy" decoding="async" onload="URL.revokeObjectURL(this.src)" style="object-fit:cover; width:100%; height:100%;"><span class="icon img-icon">${SVG_COVER}</span>`;return}}catch(err){}
    }
    if(e)return f.innerHTML=`<span class="icon"></span>`;
    const g=getYoutubeId(b);
    if(g)return f.innerHTML=`<span class="icon yt-icon">${SVG_ICON_YOUTUBE}</span>`;
    if(b && b.startsWith('NATIVE:')){
        const nativePath = b.replace('NATIVE:', '');
        const webSrc = window.Capacitor.convertFileSrc(nativePath); 
        if('image'===h){ f.innerHTML=`<img src="${webSrc}" class="img-thumb" loading="lazy" decoding="async"><span class="icon img-icon">${SVG_COVER}</span>`; }
        else { f.innerHTML=`<span class="icon">${getExtIcon(h,d)}</span>`; }
        return;
    }
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
            updateSelectCount(); return; 
        }
    }

    if(isAddMediaMode){
        if(a.getAttribute('data-itemType')==='folder') bukaFolder(a.getAttribute('data-id'));
        else toggleSelectCard(a);
        return;
    }

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
            if(movePendingIds.length === 0){ batalBatchAksi(); } return;
        } else {
            if (a.getAttribute('data-itemType') !== 'folder') {
                a.classList.add('move-pending');
                movePendingIds.push(a.getAttribute('data-id'));
                updateSelectCount(); return;
            }
        }
    }
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
            updateSelectCount(); return;
        }
        return toggleSelectCard(a);
    }

    if(isFolder) return bukaFolder(a.getAttribute('data-id'));
    const b=a.getAttribute('data-img'),c=a.getAttribute('data-note'),d=a.querySelector('.file-info').innerText,e=a.getAttribute('data-font'),f=a.getAttribute('data-id'),g=getMediaType(b,d),h=getDriveId(b);
    let i=b;
    
    if('LOCAL_FILE'===b && !['image', 'audio', 'video'].includes(g)){
        try{const j=await dbAmbilFile(f);if(j)i=URL.createObjectURL(j);else return alert("File lokal tidak ditemukan.")}catch(k){return alert("Error: "+k)}
    } else if(b && b.startsWith('NATIVE:')) {
        const nativePath = b.replace('NATIVE:', '');
        i = window.Capacitor.convertFileSrc(nativePath);
    } else {
        i=h?getPreviewUrl(b):getDirectUrl(b);
    }
    const isDescAura = a.getAttribute('data-descaura') === 'true';
    const displayNote = isDescAura ? "" : c;
    const linkAndroid = a.getAttribute('data-android');
    if(['app','archive','doc','other','unknown_local'].includes(g))return showFileViewer(d,displayNote,i,g,b,f,a.getAttribute('data-customCover')==='true', linkAndroid);
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
    }else showFileViewer(d,displayNote,i,'unknown',b,f,a.getAttribute('data-customCover')==='true', linkAndroid)
}

function cardHoldHandler(a){
    if(currentRole === 'none') return; 
    try { navigator.vibrate && navigator.vibrate(50); } catch(e){}
    
    if (a.classList.contains('selected') && !isMovePending) {
        if (!isSelectionMode) toggleSelectionMode(true); 
        return; 
    }

    if (isMovePending) {
        if (!a.classList.contains('move-pending')) {
            a.classList.add('move-pending');
            const idToAdd = a.getAttribute('data-id');
            if (!movePendingIds.includes(idToAdd)) movePendingIds.push(idToAdd);
            
            if (a.getAttribute('data-itemType') === 'folder') {
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

    const isFolder = a.getAttribute('data-itemType') === 'folder';
    const hasExistingSelection = document.querySelectorAll('.card.selected').length > 0;

    if (isSelectionMode || isAddMediaMode || hasExistingSelection) {
        if (!isFolder) {
            document.querySelectorAll('.card.selected').forEach(c => c.classList.remove('selected'));
            a.classList.add('selected');
            updateSelectCount(); return;
        }
    }
    toggleSelectCard(a);
    if(isFolder){
        const isSelected = a.classList.contains('selected');
        setTimeout(() => {
            getAllDescendantIds(a.getAttribute('data-id')).forEach(id => {
                const child = document.querySelector(`.card[data-id="${id}"]`);
                if (child) child.classList.toggle('selected', isSelected);
            });
            updateSelectCount();
        }, 10);
    }
}

// =====================================================
// SECTION 6: MODE MULTI-SELEKSI & AKSI BATCH
// =====================================================
function toggleSelectionMode(force){
    isSelectionMode = typeof force === 'boolean' ? force : !isSelectionMode;
    if (!isSelectionMode) { isSelectingForGroup = false; targetGroupForSelection = null; }
    const a = document.getElementById('btnSelectMode');
    a.classList.toggle('active-mode', isSelectionMode);
    a.innerHTML = isSelectionMode ? SVG_WRENCH : SVG_SELECT_INACTIVE;
    document.body.classList.toggle('action-mode', isSelectionMode);
    updateSelectCount();
}

function updateSelectCount() {
    const rawSelected = document.querySelectorAll('.card.selected, .card.move-pending');
    const globalSelectedCards = Array.from(rawSelected);
    const gridContainer = document.getElementById('fileGrid');
    const visibleCards = Array.from(gridContainer.children).filter(c => c.style.display !== 'none');
    const totalVisible = visibleCards.length;
    let foldersCount = 0;
    const totalSelected = globalSelectedCards.length; 

    globalSelectedCards.forEach(card => { if (card.getAttribute('data-itemType') === 'folder') foldersCount++; });
    const filesCount = totalSelected - foldersCount;
    const selText = document.getElementById('selTextInfo');
    if (selText) {
        if (isMovePending) selText.innerText = `${foldersCount} folder ${filesCount} file akan dipindah`;
        else if (isAddMediaMode) selText.innerText = `${filesCount} file dipilih`;
        else selText.innerText = `${foldersCount} folder ${filesCount} file dipilih`;
    }

    const btnFloatingSelectAll = document.getElementById('btnFloatingSelectAll');
    if (btnFloatingSelectAll) {
        const visibleSelectedCount = visibleCards.filter(card => card.classList.contains('selected') || card.classList.contains('move-pending')).length;
        const isAllSelected = totalVisible > 0 && totalVisible === visibleSelectedCount;
        btnFloatingSelectAll.innerHTML = isAllSelected ? SVG_SELECT_ACTIVE : SVG_SELECT_INACTIVE;
    }

    const btnHide = document.getElementById('btnToggleHide');
    if (btnHide) btnHide.innerHTML = globalSelectedCards.some(b => 'true' === b.getAttribute('data-hidden')) ? `<span>${SVG_EYE_OPEN}</span> Tampilkan` : `<span>${SVG_EYE_CLOSED}</span> Sembunyi`;
    
    const floatingInfo = document.getElementById('floatingSelectionInfo');
    const chipsArea = document.getElementById('dynamicChipsArea');
    const baseBottom = (70 + (chipsArea ? chipsArea.offsetHeight : 0) + 10) + 'px';
    const isFloatingInfoVisible = totalSelected > 0 || isMovePending || isSelectionMode || isAddMediaMode;
    const floatingInfoBottom = (isSelectionMode && !isAddMediaMode) ? '75px' : baseBottom;

    if (floatingInfo) {
        if (isFloatingInfoVisible) { floatingInfo.classList.add('visible'); floatingInfo.style.bottom = floatingInfoBottom; } 
        else { floatingInfo.classList.remove('visible'); floatingInfo.style.bottom = '-60px'; }
    }

    const fab = document.getElementById('fabAddMemori');
    const fabBack = document.getElementById('fabBackFolder');
    const fabPaste = document.getElementById('fabPasteMemori'); 
    
    if (fab) {
        const isRestrictedPage = curFilter.l0 === 'all' || curFilter.l0 === 'audiovideo' || curFilter.l0 === 'favorite';
        const hideFabAdd = currentRole === 'none' || isRestrictedPage || isFloatingInfoVisible;
        if (hideFabAdd) { fab.classList.remove('visible'); fab.style.bottom = '-60px'; } 
        else { fab.classList.add('visible'); fab.style.bottom = baseBottom; }

        let titikTumpuk = parseInt(baseBottom, 10);
        if (isFloatingInfoVisible) { titikTumpuk = parseInt(floatingInfoBottom, 10) + 50; } 
        else if (!hideFabAdd) { titikTumpuk += 60; }

        if (fabPaste) {
            if (isMovePending) { fabPaste.classList.add('visible'); fabPaste.style.bottom = titikTumpuk + 'px'; titikTumpuk += 60; } 
            else { fabPaste.classList.remove('visible'); fabPaste.style.bottom = '-60px'; }
        }

        if (fabBack) {
            const inFolder = currentFolderId && currentFolderId !== 'none';
            if (inFolder) { fabBack.classList.add('visible'); fabBack.style.bottom = titikTumpuk + 'px'; } 
            else { fabBack.classList.remove('visible'); fabBack.style.bottom = '-60px'; }
        }
    }
}

function toggleSelectCard(a){a.classList.toggle('selected'),updateSelectCount()}

function togglePilihSemua() {
    const gridContainer = document.getElementById('fileGrid');
    const visibleCards = Array.from(gridContainer.children).filter(c => c.style.display !== 'none' && c.classList.contains('card'));
    if (visibleCards.length === 0) return alert("Tidak ada item yang dapat dipilih di tampilan saat ini.");
    const isMoveMode = typeof isMovePending !== 'undefined' && isMovePending;
    const targetClass = isMoveMode ? 'move-pending' : 'selected';
    const selectedCount = visibleCards.filter(card => card.classList.contains(targetClass)).length;
    const isAllSelected = selectedCount === visibleCards.length;

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
        prosesKartu(card, isAllSelected);
        if (card.getAttribute('data-itemType') === 'folder') {
            const folderId = card.getAttribute('data-id');
            const descendants = getAllDescendantIds(folderId);
            descendants.forEach(descId => {
                const childCard = document.querySelector(`.card[data-id="${descId}"]`);
                if (childCard) prosesKartu(childCard, isAllSelected);
            });
        }
    });

    if (isMoveMode && isAllSelected) batalBatchAksi(); 
    else updateSelectCount();
}

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
    batalBatchAksi(); 
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
        const imgTag = el.querySelector('.thumb-container img');
        if (imgTag && imgTag.src.startsWith('blob:')) URL.revokeObjectURL(imgTag.src);
        if (typeof MediaPlayer !== 'undefined' && MediaPlayer.queue.length > 0) {
            const currentMedia = MediaPlayer.queue[MediaPlayer.currentIndex];
            if (currentMedia && currentMedia.id === itemId) MediaPlayer.clearPlaylist(); 
        }
        
        const fileData = {
            id: itemId, itemType: el.getAttribute('data-itemType'), folderId: el.getAttribute('data-folderId'), name: el.getAttribute('data-name'), year: el.getAttribute('data-year'), note: el.getAttribute('data-note'), img: el.getAttribute('data-img'), cat: el.getAttribute('data-cat'), sub: el.getAttribute('data-sub'), type: el.getAttribute('data-type'), detail: el.getAttribute('data-detail'), hidden: el.getAttribute('data-hidden'), font: el.getAttribute('data-font'), customCover: el.getAttribute('data-customCover'), related: el.getAttribute('data-related'), descaura: el.getAttribute('data-descaura'), favorite: el.getAttribute('data-favorite'), deletedAt: new Date().getTime()
        };
        
        if(!rbDataCache.find(x => x.id === itemId)) rbDataCache.push(fileData);
        el.setAttribute('data-archived', 'true');
        el.remove();
    };

    const idsToRemove = new Set();
    a.forEach(f => {
        const id = f.getAttribute('data-id');
        idsToRemove.add(id);
        if ('folder' === f.getAttribute('data-itemType')) getAllDescendantIds(id).forEach(descId => idsToRemove.add(descId));
    });

    let rbDataCache = JSON.parse(getLocal('recycle_bin') || '[]');
    idsToRemove.forEach(id => {
        const el = document.querySelector(`.card[data-id="${id}"]`);
        if (el) hapusElemen(el);
    });

    if (rbDataCache.length > 0) setLocal('recycle_bin', JSON.stringify(rbDataCache));
    logActivity('Hapus',`Menghapus: ${names}`);
    simpanKeLokal(); updateStats(); filterFiles(); batalBatchAksi();
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
            toggleModal('pasteMenu', false); return;
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
    simpanKeLokal(); filterFiles(); updateStats(); batalBatchAksi();
}

function updateCategoryRecursive(a,b,c,d,e,allCards){
    a.setAttribute('data-cat',b),a.setAttribute('data-sub',c),a.setAttribute('data-type',d),a.setAttribute('data-detail',e),refreshCardIcon(a);
    if('folder'===a.getAttribute('data-itemType')){
        if(!allCards)allCards=document.querySelectorAll('.card');
        const targetId=a.getAttribute('data-id');
        allCards.forEach(f=>{if(f.getAttribute('data-folderId')===targetId)updateCategoryRecursive(f,b,c,d,e,allCards)});
    }
}

function batalBatchAksi() {
    document.querySelectorAll('.card.move-pending').forEach(b => {
        b.classList.remove('move-pending');
        b.classList.add('selected'); 
    });
    isMovePending = false;
    movePendingIds = [];
    isSelectingForGroup = false; 
    targetGroupForSelection = null; 
    toggleModal('pasteMenu', false);
    if (isSelectionMode) toggleSelectionMode(false); else updateSelectCount();
}

function keluarModeAddMedia() {
    isAddMediaMode = false;
    document.body.classList.remove('action-mode', 'add-media-mode');
    isSelectionMode = false; 
    document.querySelectorAll('.card.selected').forEach(c => c.classList.remove('selected'));
    updateSelectCount();
    const btnMode = document.getElementById('btnSelectMode');
    if (btnMode) { btnMode.classList.remove('active-mode'); btnMode.innerHTML = SVG_SELECT_INACTIVE; }
    setFilter(0, 'all'); 
    if (!MediaPlayer.ui.classList.contains('hidden')) {
        MediaPlayer.maximize();
        const drawer = document.getElementById('mpPlaylistDrawer');
        if(!drawer.classList.contains('open')) drawer.classList.add('open');
    } else { document.body.classList.remove('no-scroll', 'has-mini-player'); }
}

function bersihkanSeleksiAnak(folderId) {
    document.querySelectorAll('.card.selected').forEach(childCard => {
        if (isDescendant(childCard.getAttribute('data-id'), folderId)) { childCard.classList.remove('selected'); }
    });
}

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
    
    let validItems = new Map();
    a.forEach(c => {
        if (c.getAttribute('data-itemType') === 'file') {
            const img = c.getAttribute('data-img');
            const name = c.querySelector('.file-info').textContent;
            const type = getMediaType(img, name);
            if (type === 'audio' || type === 'video') validItems.set(c.getAttribute('data-id'), c);
        }
    });

    if(validItems.size === 0) return alert("Tidak ada file media (Audio/Video) di dalam seleksi!");

    for(const [id, c] of validItems){
        const d=c.getAttribute('data-img'),e=c.querySelector('.file-info').textContent,g=getDriveId(d);
        let h=d;
        if('LOCAL_FILE'===d){try{const i=await dbAmbilFile(id);if(i)h=URL.createObjectURL(i)}catch(j){}}
        const itemData={name:e,img:h,originalImg:d,year:c.getAttribute('data-year'),isDrive:!!g,isLocal:'LOCAL_FILE'===d,id:id,customCover:c.getAttribute('data-customCover')==='true'};
        
        if(isTargetingSaved&&targetPlaylist){ targetPlaylist.items.push(itemData);b++; }
        else{ MediaPlayer.addToPlaylist(itemData,false,true);b++; }
    }
    
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
        if(isTargetingSaved && targetPlaylist) { alert(`${b} item ditambahkan ke playlist '${targetPlaylist.name}'.`); } 
        else {
            if(MediaPlayer.activeViewIndex==='queue') MediaPlayer.renderViewingPlaylist(MediaPlayer.queue,'queue'); else MediaPlayer.loadPlaylistMenu();
            alert(`${b} item diproses ke Antrian Saat Ini.`);
        }
        batalBatchAksi(); 
    }
    window.targetPlaylistIndexForAdd = null;
}

// =====================================================
// SECTION 7: MODAL FORMULIR & PROSES UPLOAD
// =====================================================
function bukaModalBaru(){
    if(curFilter.l0 === 'all' || curFilter.l0 === 'audiovideo' || curFilter.l0 === 'favorite') return alert("Buka folder atau kategori spesifik terlebih dahulu untuk membuat item baru."); 
    
    editingCard=null,fileKameraTertunda=null,document.getElementById('formTitle').innerText="Tambah Baru",gantiTabUpload('file');
    
    ['fName','fImgUrl','fImgUrlWin','fImgUrlAnd','fNote','fYear','fLocalFile','fCustomCover'].forEach(a=>{const el=document.getElementById(a); if(el) el.value='';});
    
    document.getElementById('btnHapusCover').style.display='none',
    document.getElementById('fHapusCoverFlag').value='false',
    document.getElementById('fDescAura').checked=false,
    document.getElementById('fFavorite').value='false',
    document.getElementById('btnFavoriteToggle').innerHTML='☆',
    document.getElementById('btnFavoriteToggle').style.color='#ccc',
    document.getElementById('btnFavoriteToggle').style.textShadow='none',
    document.getElementById('fFontStyle').value="'Segoe UI', sans-serif";
    
    const dropdownContainer = document.getElementById('formatDropdownContainer');
    if (dropdownContainer) {
        dropdownContainer.style.display = (curFilter.l0 === 'catatan') ? 'none' : 'block';
    }
    
    const fFormatDropdown = document.getElementById('fFormatType');
    if (fFormatDropdown) {
        fFormatDropdown.value = 'auto'; 
    }
    
    toggleModal('modalForm', true);
}

function wrapBukaEdit(a,b){a.stopPropagation(),'none'===currentRole?requestPin(c=>{setAppRole(c),bukaEdit(b.parentElement)}):bukaEdit(b.parentElement)}

function bukaEdit(a){
    tutupSemuaMenu();
    editingCard=a;
    const b='folder'===a.getAttribute('data-itemType');
    const cImg=a.getAttribute('data-img');
    const fName=a.querySelector('.file-info').innerText;
    const mediaType=getMediaType(cImg, fName);
    const isCat=a.getAttribute('data-cat')==='catatan' || mediaType==='text';
    const dropdownContainer = document.getElementById('formatDropdownContainer');
    if (dropdownContainer) {
        const isCatatan = editingCard.getAttribute('data-cat') === 'catatan';
        dropdownContainer.style.display = isCatatan ? 'none' : 'block';
    }
    
    const fFormatDropdown = document.getElementById('fFormatType');
    if (fFormatDropdown) {
        const savedFormat = editingCard.getAttribute('data-format');
        fFormatDropdown.value = (savedFormat && savedFormat !== 'null' && savedFormat !== 'none') ? savedFormat : 'auto';
    }
    
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

    if('LOCAL_FILE'===cImg){ document.getElementById('fSourceType').value='local'; }
    else { 
        document.getElementById('fSourceType').value='url'; 
        if (a.getAttribute('data-cat') === 'aplikasi') {
            document.getElementById('fImgUrlWin').value = cImg !== 'none' ? cImg : ''; 
            document.getElementById('fImgUrlAnd').value = a.getAttribute('data-android') !== 'none' ? a.getAttribute('data-android') : ''; 
        } else {
            document.getElementById('fImgUrl').value = cImg !== 'none' ? cImg : ''; 
        }
    }

    if(!isCat && !b){ toggleSourceType(); }
    
    document.getElementById('fYear').value=a.getAttribute('data-year');
    if(!b){
        document.getElementById('fNote').value=a.getAttribute('data-note')||"";
        document.getElementById('fFontStyle').value=a.getAttribute('data-font')||"'Segoe UI', sans-serif";
    }
    toggleModal('modalForm', true);
}

function gantiTabUpload(a, isCatatan = false){
    uploadMode=a;
    const b=isCatatan||(curFilter&&'catatan'===curFilter.l0),isAplikasi=(curFilter&&'aplikasi'===curFilter.l0),c=document.getElementById('tabFile'),dUrl=document.getElementById('fImgUrl'),dApp=document.getElementById('urlInputGroupApp'),e=document.getElementById('fNote'),f=document.getElementById('inputForFile'),g=document.getElementById('fFontStyle'),h=document.getElementById('fSourceType'),aura=document.getElementById('descAuraToggleArea');
    const tabText=document.getElementById('tabFileText'),tabIcon=document.getElementById('tabFileIcon');
    if(tabText&&tabIcon){
        if(b){ tabText.innerText="Buat Memori"; tabIcon.innerHTML=SVG_TAB_NOTE; }
        else{ tabText.innerText="Memori"; tabIcon.innerHTML=SVG_TAB_MEMORI; }
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
        const optCam = document.getElementById('optCameraSource');
        if (optCam) {
            if (curFilter.l0 === 'foto') {
                optCam.style.display = 'block'; optCam.innerText = '📸 Ambil Langsung dari Kamera';
            } else if (curFilter.l0 === 'video') {
                optCam.style.display = 'block'; optCam.innerText = '🎥 Rekam Langsung dari Kamera';
            } else { optCam.style.display = 'none'; }
        }
        h.value='url';
        toggleSourceType();
        if(b){
            g.style.display='block'; h.style.display='none'; dUrl.style.display='none'; dApp.style.display='none';
            document.getElementById('fLocalFile').style.display='none'; e.style.display='block'; aura.style.display='none';
        }else if(isAplikasi){
            g.style.display='none'; h.style.display='none'; e.style.display='block'; aura.style.display='flex';
            dUrl.style.display='none'; dApp.style.display='flex';
        }else{
            g.style.display='none'; h.style.display='block'; e.style.display='block'; aura.style.display='flex';
            dUrl.style.display='block'; dApp.style.display='none';
        }
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
        const isAplikasi = (curFilter && curFilter.l0 === 'aplikasi');
        if (isAplikasi && urlDisp === 'block') {
            document.getElementById('fImgUrl').style.display = 'none';
            document.getElementById('urlInputGroupApp').style.display = 'flex';
        } else {
            document.getElementById('fImgUrl').style.display = urlDisp;
            if (document.getElementById('urlInputGroupApp')) document.getElementById('urlInputGroupApp').style.display = 'none';
        }
        document.getElementById('fLocalFile').style.display = locWebDisp;
        if (btnNative) btnNative.style.display = locNatDisp;
        if (btnCamGroup) btnCamGroup.style.display = camDisp;
    };

    if (tipe === 'url') {
        setTampil('block', 'none', 'none', 'none');
    } else if (tipe === 'camera') {
        setTampil('none', 'none', 'none', 'flex');
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

async function pilihFileNative() {
    try {
        if (window.Capacitor && window.Capacitor.isNative && window.Capacitor.Plugins.Filesystem) {
            await window.Capacitor.Plugins.Filesystem.requestPermissions().catch(()=>{});
        }
        const { PersistPermission } = window.Capacitor.Plugins;
        const result = await PersistPermission.pickFile();
        document.getElementById('fNativePath').value = result.uri;
        document.getElementById('fName').value = result.name;
        document.getElementById('btnNativePicker').innerHTML = `✅ ${result.name}`;
        document.getElementById('btnNativePicker').style.background = '#e8f5e9';
    } catch (e) {
        alert("Batal / Error: " + (e.message || "Akses ditolak sistem."));
    }
}

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

function hapusCoverLokal(){document.getElementById('fCustomCover').value='';document.getElementById('fHapusCoverFlag').value='true';document.getElementById('btnHapusCover').style.display='none'}

async function prosesSimpan(){
    const btnSimpan = document.getElementById('btnSimpan');
    if (btnSimpan.disabled) return; 
    
    btnSimpan.disabled = true;
    btnSimpan.innerText = "⏳ Memproses...";
    btnSimpan.classList.remove('btn-blue');
    btnSimpan.classList.add('btn-gray');
    btnSimpan.style.cursor = 'not-allowed';
    
    const gagalkanSimpan = (pesan) => {
        btnSimpan.disabled = false;
        btnSimpan.innerText = "Simpan";
        btnSimpan.classList.remove('btn-gray');
        btnSimpan.classList.add('btn-blue');
        btnSimpan.style.cursor = 'pointer';
        if (pesan) {
            typeof showToast === 'function' ? showToast(pesan) : (typeof tampilkanToast === 'function' ? tampilkanToast(pesan) : alert(pesan));
        }
    };

    const a=document.getElementById('fName').value||('folder'===uploadMode?"Folder Baru":"Memori Baru"),
          b=document.getElementById('fSourceType').value,
          c=document.getElementById('fYear').value,
          d=document.getElementById('fFontStyle').value, // Sesuai sistem Anda, font diambil saat simpan/modal
          e=document.getElementById('fNote').value,
          fT = document.getElementById('fFormatType') ? document.getElementById('fFormatType').value : 'auto'; 
    
    let finalName = a;
    const hasExt = /\.[a-z0-9]+$/i.test(finalName);
    if (!hasExt && fT !== 'auto') {
        const extMap = { app: '.exe', apk: '.apk', audio: '.mp3', video: '.mp4', image: '.jpg', pdf: '.pdf', doc: '.doc', xls: '.xls', ppt: '.ppt', zip: '.zip', rar: '.rar', '7z': '.7z' };
        if (extMap[fT]) finalName += extMap[fT];
    }

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
    
    const f={cat:tCat,sub:tSub,type:tTyp,detail:tDet,folderId:currentFolderId, descaura: document.getElementById('fDescAura').checked ? 'true' : 'false', favorite: document.getElementById('fFavorite').value, android: (tCat === 'aplikasi') ? (document.getElementById('fImgUrlAnd').value || 'none') : 'none', format: fT};
    const coverInput=document.getElementById('fCustomCover');

    if(editingCard){
        const g='folder'===editingCard.getAttribute('data-itemType');
        editingCard.setAttribute('data-name', finalName.toLowerCase()),editingCard.setAttribute('data-year',c);
        editingCard.setAttribute('data-descaura', document.getElementById('fDescAura').checked ? 'true' : 'false');
        editingCard.setAttribute('data-favorite', document.getElementById('fFavorite').value);
        editingCard.setAttribute('data-format', fT);
        
        if(!g){
            editingCard.setAttribute('data-note',e),editingCard.setAttribute('data-font',d);
            if('url'===b || tCat==='aplikasi'){
                let h = '';
                if(tCat === 'aplikasi'){
                    h = document.getElementById('fImgUrlWin').value;
                    editingCard.setAttribute('data-android', document.getElementById('fImgUrlAnd').value || 'none');
                } else {
                    h = document.getElementById('fImgUrl').value;
                }
                h&&editingCard.setAttribute('data-img',h);
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

        editingCard.querySelector('.file-year').innerText=c,editingCard.querySelector('.file-info').innerText=finalName,refreshCardIcon(editingCard);
        logActivity('Edit',`Mengedit ${g?'Folder':'Item'}: ${finalName}`);
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
        }catch(err){ console.error("Gagal simpan cover: "+err); }
    }

    if('folder'===uploadMode){
        buatKartu({id:newItemId,itemType:'folder',name:a,img:'none',year:c,customCover:hasCustomCover?'true':'false',...f},!0);
        logActivity('Upload',`Membuat Folder: ${a}`);
        tutupModal(); simpanKeLokal(); updateStats(); filterFiles();
    } else {
        if ('camera' === b) {
            if (!fileKameraTertunda) return gagalkanSimpan("Silakan ambil foto/video terlebih dahulu menggunakan tombol kamera!");
            const isVideo = fileKameraTertunda.type.startsWith('video/');
            let finalNameCamera = finalName; 
            const trueExt = getExtFromMime(fileKameraTertunda.type);

            if (trueExt && !finalNameCamera.toLowerCase().endsWith(trueExt)) {
                finalNameCamera = finalNameCamera.replace(/\.[^/.]+$/, "") + trueExt;
            }

            try {
                let safeBlob = fileKameraTertunda;
                if (!safeBlob.type || safeBlob.type === 'application/octet-stream' || safeBlob.type === '') {
                    const correctMime = isVideo ? 'video/mp4' : 'image/jpeg';
                    safeBlob = new Blob([fileKameraTertunda], { type: correctMime });
                }
                
                await dbSimpanFile(newItemId, safeBlob);
                let linkAset = 'LOCAL_FILE';
                let driveErrorMsg = null;
                const gToken = await dapatkanTokenDriveAktif();

                if (gToken && currentUser !== 'Guest') {
                    try {
                        const bufferData = await fileKameraTertunda.arrayBuffer();
                        const resMedia = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=media', {
                            method: 'POST',
                            headers: { 'Authorization': 'Bearer ' + gToken, 'Content-Type': fileKameraTertunda.type || (isVideo ? 'video/mp4' : 'image/jpeg'), 'Content-Length': bufferData.byteLength },
                            body: bufferData
                        });
                        
                        const dataMedia = await resMedia.json();
                        if (resMedia.ok && dataMedia.id) {
                            let patchUrl = `https://www.googleapis.com/drive/v3/files/${dataMedia.id}`;
                            const inputFolder = isVideo ? (getLocal('drive_folder_video') || '') : (getLocal('drive_folder_foto') || '');
                            if (inputFolder) {
                                const folderId = inputFolder.includes('folders/') ? inputFolder.split('folders/')[1].split(/[?&/]/)[0] : inputFolder;
                                patchUrl += `?addParents=${folderId}&removeParents=root`;
                            }
                            await fetch(patchUrl, { method: 'PATCH', headers: { 'Authorization': 'Bearer ' + await dapatkanTokenDriveAktif(), 'Content-Type': 'application/json' }, body: JSON.stringify({ name: finalNameCamera }) });
                            await fetch(`https://www.googleapis.com/drive/v3/files/${dataMedia.id}/permissions`, { method: 'POST', headers: { 'Authorization': 'Bearer ' + await dapatkanTokenDriveAktif(), 'Content-Type': 'application/json' }, body: JSON.stringify({ role: 'reader', type: 'anyone' }) });
                            linkAset = `https://drive.google.com/file/d/${dataMedia.id}/view`;
                        } else { driveErrorMsg = dataMedia.error ? `${dataMedia.error.code}: ${dataMedia.error.message}` : `HTTP Status ${resMedia.status}`; }
                    } catch (errDrive) { driveErrorMsg = errDrive.message || "Koneksi terputus saat mengirim binary"; }
                }

                let tCatFinal = (curFilter.l0 === 'all' || curFilter.l0 === 'audiovideo') ? (isVideo ? 'video' : 'foto') : curFilter.l0;
                if (isVideo) tCatFinal = 'video';
                buatKartu({ id: newItemId, itemType: 'file', name: finalNameCamera, year: c, note: e, img: linkAset, font: d, customCover: hasCustomCover ? 'true' : 'false', ...f, cat: tCatFinal }, true);
                logActivity('Kamera', `Menambah ${isVideo ? 'video' : 'foto'}: ${finalNameCamera}`);
                fileKameraTertunda = null;
                tutupModal(); simpanKeLokal(); updateStats(); filterFiles();
                if (linkAset === 'LOCAL_FILE' && currentUser !== 'Guest') { 
                    const msgDrive = `⚠️ Tersimpan di Aplikasi saja. Gagal ke Drive:\n"${driveErrorMsg || 'Akses ditolak Google'}"`;
                    typeof showModal === 'function' ? showModal('Gagal ke Drive', msgDrive) : window.alert(msgDrive); 
                } 
            } catch (error) { return gagalkanSimpan(`❌ Gagal memproses: ${error.message}`); }
        } else if ('catatan' !== curFilter.l0 && 'local' === b) {
            const isNative = window.Capacitor && window.Capacitor.isNative;
            
            if (isNative) {
                const nativePath = document.getElementById('fNativePath').value;
                if (!nativePath) return gagalkanSimpan("Pilih file dari HP Anda!");
                buatKartu({id: newItemId, itemType: 'file', name: finalName, year: c, note: e, img: 'NATIVE:' + nativePath, font: d, customCover: hasCustomCover ? 'true' : 'false', ...f}, true);
                document.getElementById('fNativePath').value = '';
                document.getElementById('btnNativePicker').innerHTML = '📁 Pilih File dari HP (Native)';
                document.getElementById('btnNativePicker').style.background = 'var(--btn-bg)';
                logActivity('Upload', `Menambah Item Native: ${finalName}`);
                tutupModal(); simpanKeLokal(); updateStats(); filterFiles();
            } else {
                const i = document.getElementById('fLocalFile');
                if (0 === i.files.length) return gagalkanSimpan("Pilih file lokal!");
                let successCount = 0;
                for (let idx = 0; idx < i.files.length; idx++) {
                    let currentFile = i.files[idx];
                    let loopItemId = 'file_' + Date.now() + '_' + idx;
                    let loopItemName = finalName ? (i.files.length > 1 ? finalName + " (" + (idx + 1) + ")" : finalName) : currentFile.name;
                    try {
                        await dbSimpanFile(loopItemId, currentFile);
                        buatKartu({id: loopItemId, itemType: 'file', name: loopItemName, year: c, note: e, img: 'LOCAL_FILE', font: d, customCover: hasCustomCover ? 'true' : 'false', ...f}, true);
                        successCount++;
                    } catch (j) { console.error("Gagal menyimpan file lokal: " + j); }
                }
                if(successCount > 0) { logActivity('Upload', `Menambah ${successCount} Item`); tutupModal(); simpanKeLokal(); updateStats(); filterFiles(); } 
                else { return gagalkanSimpan("Gagal mengupload file lokal."); }
            }
        } else {
            let g = 'none';
            if ('catatan' !== curFilter.l0) {
                if (tCat === 'aplikasi') {
                    g = document.getElementById('fImgUrlWin').value || 'none';
                } else {
                    g = document.getElementById('fImgUrl').value || 'none';
                    if (g.includes('drive.google.com') && !/\.[a-z0-9]+$/i.test(finalName)) {
                        const validExts = ['.mp4', '.mov', '.avi', '.mkv', '.webm', '.mp3', '.wav', '.ogg', '.m4a', '.aac'];
                        const hasExtension = validExts.some(ext => finalName.toLowerCase().endsWith(ext));
                        if (!hasExtension) {
                            if (tCat === 'audio' || curFilter.l0 === 'audio') finalName += '.mp3';
                            else if (tCat === 'video' || curFilter.l0 === 'video' || curFilter.l0 === 'audiovideo') finalName += '.mp4';
                        }
                    }
                }
            }
            buatKartu({ id: newItemId, itemType: 'file', name: finalName, year: c, note: e, img: g, font: d, customCover: hasCustomCover ? 'true' : 'false', ...f }, true);
            logActivity('Upload', `Menambah Item: ${finalName}`);
            tutupModal(); simpanKeLokal(); updateStats(); filterFiles();
        }
    }
}

function tutupModal() {
    toggleModal('modalForm', false);
    editingCard = null;
    document.getElementById('fPhotoCapture').value = '';
    document.getElementById('fVideoCapture').value = '';
    document.getElementById('tabFolder').style.pointerEvents = 'auto';
    document.getElementById('tabFolder').style.opacity = '1';

    const btnSimpan = document.getElementById('btnSimpan');
    btnSimpan.disabled = false;
    btnSimpan.innerText = "Simpan";
    btnSimpan.classList.remove('btn-gray');
    btnSimpan.classList.add('btn-blue');
    btnSimpan.style.cursor = 'pointer';

    const btnFoto = document.getElementById('btnPhotoCaptureUI');
    const btnVideo = document.getElementById('btnVideoCaptureUI');
    if (btnFoto && btnVideo) {
        btnFoto.innerHTML = '📸 Ambil Foto';
        btnFoto.style.background = '';
        btnFoto.style.color = '';
        btnFoto.style.borderColor = '';
        
        btnVideo.innerHTML = '🎥 Rekam Video';
        btnVideo.style.background = 'linear-gradient(to bottom, #ffbcaf, #ff9800)';
        btnVideo.style.color = '#8d6206';
        btnVideo.style.borderColor = '#c68e17';
    }
}

// ==============≈=================≈==============≈=====
// SECTION 8: PEMUTAR MEDIA & PENAMPIL FILE (VIEWERS)
// =====================================================
function cekScrollLayar() {
    const anyModalOpen = Array.from(document.querySelectorAll('.modal')).some(m => m.style.display === 'flex' || m.style.display === 'block');
    const isPlayerMaximized = (typeof MediaPlayer !== 'undefined' && MediaPlayer.ui) && !MediaPlayer.ui.classList.contains('hidden') && !MediaPlayer.minimized;
    const shouldLock = anyModalOpen || isPlayerMaximized;
    
    if (shouldLock) {
        if (!document.body.classList.contains('no-scroll')) {
            savedScrollY = window.scrollY;
            document.body.style.position = 'fixed';
            document.body.style.top = `-${savedScrollY}px`;
            document.body.style.width = '100%';
            document.body.classList.add('no-scroll');
        }
    } else {
        if (document.body.classList.contains('no-scroll')) {
            document.body.style.position = '';
            document.body.style.top = '';
            document.body.style.width = '';
            document.body.classList.remove('no-scroll');
            window.scrollTo(0, savedScrollY);
        }
    }
    document.body.classList.toggle('player-maximized', isPlayerMaximized);
}

async function showFileViewer(a,b,c,d,origImg,fileId,hasCover,linkAndroid){
    document.getElementById('fileTitleDisplay').innerHTML=`<span style="white-space:nowrap; overflow:hidden; text-overflow:ellipsis; padding-left:5px;">${a}</span>`;
    document.getElementById('fileDesc').innerHTML=linkify(b)||"Tidak ada deskripsi.";
    document.getElementById('fileIconDisplay').innerHTML=getExtIcon(d,a);

    if(hasCover && fileId) {
        try {
            const blob = await dbAmbilCover(fileId);
            if (blob) {
                const url = URL.createObjectURL(blob);
                document.getElementById('fileIconDisplay').innerHTML = `<img src="${url}" onload="URL.revokeObjectURL(this.src)">`;
            }
        } catch(err){}
    }

    const btnContainer = document.getElementById('downloadBtnContainer');
    const f=document.getElementById('iframeContainer'),g=document.getElementById('fileIframe'),h=getDownloadUrl(c);
    f.style.display='none'; g.removeAttribute('src'); btnContainer.style.display='flex';
    
    const isLocal = origImg === 'LOCAL_FILE' || (origImg && origImg.startsWith('NATIVE:'));
    
    if (c && c !== 'none' && linkAndroid && linkAndroid !== 'none' && !isLocal) {
        const andUrl = getDownloadUrl(linkAndroid);
        btnContainer.innerHTML = `
            <div style="text-align:center; font-size:16px; font-weight:bold; margin-bottom:12px; width:100%; letter-spacing:1.5px; color:var(--primary-dark); display:flex; align-items:center; justify-content:center; gap:6px;">${SVG_DOWNLOAD} DOWNLOAD</div>
            <div style="display:flex; gap:10px; width:100%;">
                <button class="btn-full btn-blue" onclick="window.open('${h}', '_blank')" style="display:flex; align-items:center; justify-content:center; gap:5px; flex:1; margin-top:0;">
                    <svg width="18" height="18" viewBox="0 0 48 48" fill="#fff"><path d="M0 7.32l16.89-2.4v18.06h-16.89zM18.89 4.31l29.11-4.31v22.98h-29.11zM0 24.96h16.89v18.06l-16.89-2.4zM18.89 24.96h29.11v22.98l-29.11-4.31z"/></svg> Windows
                </button>
                <button class="btn-full btn-real-blue" onclick="window.open('${andUrl}', '_blank')" style="display:flex; align-items:center; justify-content:center; gap:5px; flex:1; margin-top:0; background:linear-gradient(to bottom, #444, #222); border-color:#111; color:#fff;">
                    <svg width="18" height="18" viewBox="0 0 50 50"><use href="#icon-apk-def"></use></svg> Android
                </button>
            </div>
        `;
    } else {
        btnContainer.innerHTML = `<button id="btnDownloadFile" class="btn-full btn-blue" style="display:flex; align-items:center; justify-content:center; gap:5px;">Download / Buka File</button>`;
        const e = document.getElementById('btnDownloadFile');
        if('doc'===d && c.includes('drive.google.com')){
            f.style.display='block'; g.src=getPreviewUrl(c);
            e.innerHTML=SVG_SHARE + " Buka di Tab Baru"; e.onclick=()=>window.open(c,'_blank');
        } else {
            e.innerHTML=SVG_DOWNLOAD + " Download / Buka File";
            e.onclick = () => {
                const link = document.createElement('a');
                link.download = a; 
                if (isLocal) {
                    link.href = c; 
                    document.body.appendChild(link); link.click(); document.body.removeChild(link);
                } else {
                    link.href = h; link.target = '_blank';
                    document.body.appendChild(link); link.click(); document.body.removeChild(link);
                }
            };
        }
    }
    
    spawnRelatedAnimations(fileId);
    toggleModal('modalFileViewer', true);
}

function downloadText(){if(!currentTextContent)return alert("Kosong!");const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([currentTextContent],{type:'text/plain'})),a.download=(document.getElementById('textTitleDisplay').innerText||'Catatan')+'.txt',a.click()}

function shareText(){currentTextContent?navigator.share?navigator.share({title:document.getElementById('textTitleDisplay').innerText,text:currentTextContent}):alert("Browser tidak mendukung share."):alert("Kosong!")}

const ImgViewer={
    list:[],index:0,timer:null,zoom:1,lastDist:0,
    open:async function(a){
        this.list=[];const b=document.querySelectorAll('.card[data-itemType="file"]');
        for (const c of b) {
            if ('none' !== c.style.display && 'image' === getMediaType(c.getAttribute('data-img'), c.querySelector('.file-info').innerText)) {
                let d = c.getAttribute('data-img');
                if ('LOCAL_FILE' === d) { d = 'LOCAL_FILE'; } 
                else if (d && d.startsWith('NATIVE:')) { const nativePath = d.replace('NATIVE:', ''); d = window.Capacitor.convertFileSrc(nativePath); } 
                else { d = (getDriveId(d) ? `https://drive.google.com/thumbnail?id=${getDriveId(d)}&sz=w4000` : getDirectUrl(d)); }
                
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
            try{ const file = await dbAmbilFile(a.id); if(file){ viewSrc = URL.createObjectURL(file); this._activeBlob = viewSrc; } }catch(e){}
        }
        b.src=viewSrc; b.style.transform='scale(1)'; this.zoom=1; spawnRelatedAnimations(a.id);
        let cText=`${this.index+1}/${this.list.length} - ${a.name}`;
        a.year&&'none'!==a.year&&(cText+=` (${a.year})`); a.note&&'none'!==a.note&&(cText+=`\n${a.note}`);
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
    if(this._activeBlob){ URL.revokeObjectURL(this._activeBlob); this._activeBlob=null; } this.list = [];}
};

// --- KODE PENANGANAN SHARE INTENT CAPACITOR -->
document.addEventListener('DOMContentLoaded', () => {
    // Memberikan jeda 1 detik agar DOM, UI MediaPlayer, dan Native Bridge benar-benar siap
    setTimeout(() => {
        if (window.Capacitor && window.Capacitor.Plugins) {
            const { App, SendIntent } = window.Capacitor.Plugins;

            const cekShareIntent = async (sumberKondisi) => {
                if (!SendIntent) {
                    alert("Gagal: Plugin SendIntent tidak terdeteksi oleh JavaScript.");
                    return;
                }
                
                try {
                    const result = await SendIntent.checkSendIntentReceived();
                    
                    // Hapus tanda komentar (//) di bawah ini jika ingin melihat isi data mentah dari Android
                    // alert(`Data masuk via (${sumberKondisi}): ` + JSON.stringify(result));
                    
                    if (result && result.value) {
                        prosesLinkYouTubeMasuk(result.value);
                    } else if (result && result.title) {
                        prosesLinkYouTubeMasuk(result.title);
                    }
                } catch (error) {
                    alert("Error saat membaca intent: " + error.message);
                }
            };

            // 1. Eksekusi saat aplikasi pertama kali dibuka (Cold Start)
            cekShareIntent('Cold Start');

            // 2. Eksekusi saat aplikasi di-resume dari background
            if (App) {
                App.addListener('appStateChange', (state) => {
                    if (state.isActive) {
                        // Beri sedikit jeda saat resume agar intent baru dari sistem operasi sempat masuk
                        setTimeout(() => cekShareIntent('Resume Background'), 500);
                    }
                });
            }
        } else {
            alert("Gagal: Capacitor tidak berjalan.");
        }
    }, 1000); 
});

// Fungsi untuk mendeteksi dan memutar link YouTube/Shorts
function prosesLinkYouTubeMasuk(url) {
    alert("Berhasil menerima teks dari YouTube:\n" + url); // <--- PELACAK 1
    
    const ytRegex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?|shorts)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i;
    const match = url.match(ytRegex);

    if (match && match[1]) {
        const videoId = match[1];
        const cleanUrl = `https://www.youtube.com/watch?v=${videoId}`;
        
        alert("ID Video Valid: " + videoId + "\nMenyiapkan pemutar..."); // <--- PELACAK 2
        
        const fileItem = {
            id: 'yt_' + Date.now(),
            name: 'YouTube Shared Video',
            format: 'video',
            source: 'url',
            url: cleanUrl,
            year: new Date().getFullYear()
        };

        if (typeof MediaPlayer !== 'undefined') {
            if (MediaPlayer.ui && MediaPlayer.ui.classList) {
                if (MediaPlayer.ui.classList.contains('minimized')) {
                    MediaPlayer.maximize();
                } else {
                    MediaPlayer.show();
                }
            }
            
            if(typeof MediaPlayer.addToQueueAndPlay === 'function') {
                MediaPlayer.addToQueueAndPlay(fileItem);
            } else {
                alert("Gagal: Fungsi addToQueueAndPlay tidak ditemukan di MediaPlayer.");
            }
        } else {
            alert("Gagal: Komponen MediaPlayer belum siap atau undefined.");
        }
    } else {
        alert("URL tidak valid atau bukan dari YouTube.");
    }
}

const MediaPlayer={
    queue:[],currentIndex:0,isPlaying:false,mode:0,audioCtx:null,analyser:null,source:null,minimized:false,driveFrame:null,ui:null,aEl:null,vEl:null,progBar:null,currTimeEl:null,durTimeEl:null,lyricsData:[],currentLyricIndex:-1,isShowingLyrics:false,isLyricsSynced:false,sleepMode:false,wakeLockSentinel:null,activeViewIndex:null,currentLocalBlobUrl:null,currentSpeed:1.0,pressTimer:null,
    init:function(){
        this.ui=document.getElementById('mediaPlayerUI'),this.aEl=document.getElementById('html5Audio'),this.vEl=document.getElementById('html5Video'),this.driveFrame=document.getElementById('drivePlayerFrame'),this.miniVid=document.getElementById('miniVideoPreview'),this.btnPlay=document.getElementById('btnPlayPause'),this.btnMiniPlay=document.getElementById('btnMiniPlay'),this.progBar=document.getElementById('mpProgressBar'),this.currTimeEl=document.getElementById('mpCurrTime'),this.durTimeEl=document.getElementById('mpDurTime');this.handleEmptyState();
        [this.aEl, this.vEl].forEach(media => {         media.onended = () => this.onTrackEnd();         media.ontimeupdate = () => this.updateTime(media);         media.onplay = () => { this.syncPlayState(true); if(media === this.vEl) this.miniVid.play().catch(()=>{}); };         media.onpause = () => { this.syncPlayState(false); if(media === this.vEl) this.miniVid.pause(); };     });document.getElementById('btnToggleLyrics').onclick=()=>this.toggleLyricsView();    document.getElementById('chkKeepScreen').addEventListener('change',()=>{this.toggleWakeLock()});if(!this.audioCtx)try{const b=window.AudioContext||window.webkitAudioContext;this.audioCtx=new b,this.analyser=this.audioCtx.createAnalyser(),this.source=this.audioCtx.createMediaElementSource(this.aEl),this.source.connect(this.analyser),this.analyser.connect(this.audioCtx.destination),this.drawVisualizer()}catch(b){}if(!window.YT){var c=document.createElement('script');c.src="https://www.youtube.com/iframe_api",document.body.appendChild(c)}
        const visualArea = document.querySelector('.mp-visual');
        const speedPopup = document.getElementById('speedPopup');
        visualArea.addEventListener('touchstart', (e) => {
            if(e.target.closest('button') || e.target.closest('.switch') || e.target.closest('#speedPopup')) return;
            this.pressTimer = setTimeout(() => { speedPopup.style.display = 'flex'; try { navigator.vibrate && navigator.vibrate(50); } catch(err){} }, 600); 
        }, {passive: true});
        const cancelPress = () => { clearTimeout(this.pressTimer); };
        visualArea.addEventListener('touchend', cancelPress, {passive: true});
        visualArea.addEventListener('touchcancel', cancelPress, {passive: true});
        visualArea.addEventListener('touchmove', cancelPress, {passive: true}); 
    },
    toggleFullScreen:function(){const elem=document.getElementById('mpVideoBox');if(!document.fullscreenElement){elem.requestFullscreen().catch(err=>{alert(`Error trying to enable full-screen mode: ${err.message} (${err.name})`)})}else{document.exitFullscreen()}},
    toggleWakeLock:async function(){const checkbox=document.getElementById('chkKeepScreen');try{if(checkbox.checked){if('wakeLock'in navigator){this.wakeLockSentinel=await navigator.wakeLock.request('screen');console.log('Screen Wake Lock active')}else{alert('Browser tidak mendukung Wake Lock');checkbox.checked=false}}else{if(this.wakeLockSentinel){await this.wakeLockSentinel.release();this.wakeLockSentinel=null;console.log('Screen Wake Lock released')}}}catch(err){console.error(`${err.name}, ${err.message}`);checkbox.checked=false}},
    syncPlayState:function(state){this.isPlaying=state;this.updatePlayBtn()},
    changeMode:function(){this.mode=(this.mode+1)%3;const a=document.getElementById('btnMode');0===this.mode?(a.innerHTML=SVG_LOOP,a.title="Loop All"):1===this.mode?(a.innerHTML=SVG_SHUFFLE,a.title="Shuffle"):(a.innerHTML=SVG_ONE,a.title="Repeat One")},
    setSpeed:function(speed){
        this.currentSpeed = parseFloat(speed);
        if(this.aEl) this.aEl.playbackRate = this.currentSpeed;
        if(this.vEl) this.vEl.playbackRate = this.currentSpeed;
        if(typeof ytPlayer !== 'undefined' && ytPlayer && ytPlayer.setPlaybackRate) { try { ytPlayer.setPlaybackRate(this.currentSpeed); } catch(err){} }
        const popup = document.getElementById('speedPopup');
        if (popup) {
            popup.querySelectorAll('.speed-btn').forEach(btn => { btn.classList.toggle('active', parseFloat(btn.dataset.speed) === this.currentSpeed); });
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
        if(this.aEl) { this.aEl.pause(); this.aEl.src = ""; this.aEl.load(); }
        if(this.vEl) { this.vEl.pause(); this.vEl.src = ""; this.vEl.load(); }
        if(typeof ytPlayer !== 'undefined' && ytPlayer && ytPlayer.stopVideo) ytPlayer.stopVideo();
        if(this.driveFrame) this.driveFrame.removeAttribute('src');
        document.querySelector('#mpHeaderTitle .marquee-text').innerHTML = `<svg width="14" height="14" viewBox="0 0 394 462" fill="currentColor" style="vertical-align: text-bottom; margin-right: 4px;"><use href="#feather-icon-def"></use></svg>Feathera Player`;
        document.querySelector('#miniTitle.marquee-text').innerText = "Tidak ada lagu";
        document.getElementById('miniSub').innerText="Antrian kosong";
        if(this.progBar) this.progBar.style.width = '0%';
        if(this.currTimeEl) this.currTimeEl.innerText = '0:00';
        if(this.durTimeEl) this.durTimeEl.innerText = '0:00';
    },
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
        let hasLocalBlob = false;
        try {
            if (b.id) {
                const freshBlob = await dbAmbilFile(b.id);
                if (freshBlob) {
                    let mimeType = freshBlob.type;
                    if (!mimeType || mimeType === 'application/octet-stream' || mimeType === '') {
                        if (b.name.toLowerCase().endsWith('.mp4')) mimeType = 'video/mp4';
                        else if (b.name.toLowerCase().endsWith('.webm')) mimeType = 'video/webm';
                        else if (b.name.toLowerCase().endsWith('.mov')) mimeType = 'video/quicktime';
                    }
                    const typedBlob = (mimeType && mimeType !== freshBlob.type) ? new Blob([freshBlob], { type: mimeType }) : freshBlob;
                    playSrc = URL.createObjectURL(typedBlob);
                    b.img = playSrc; this.currentLocalBlobUrl = playSrc; b.isLocal = true; hasLocalBlob = true;
                }
            }
        } catch(err) { console.error("Gagal intersep file lokal:", err) }

        if(!hasLocalBlob && b.img && typeof b.img === 'string' && b.img.startsWith('NATIVE:')) {
            const nativePath = b.img.replace('NATIVE:', '');
            playSrc = window.Capacitor.convertFileSrc(nativePath);
            b.isLocal = false; 
        }
        
        document.querySelector('.vid-fs-btn').style.display='none';
        if(d){document.querySelector('.vid-fs-btn').style.display='flex';document.getElementById('ytVideoPlayer').style.display='block';document.getElementById('mpVideoBox').style.display='flex';document.getElementById('visualizerCanvas').style.display='none';document.querySelector('.mp-time').innerHTML='<span id="mpCurrTime">0:00</span><span id="mpDurTime">0:00</span>'}else if('video'===c){document.querySelector('.vid-fs-btn').style.display='flex';document.getElementById('mpVideoBox').style.display='flex',this.vEl.style.display='block',this.vEl.src=playSrc,a&&this.vEl.play().then(()=>this.syncPlayState(true)).catch(()=>{this.syncPlayState(false)});this.isPlaying=a;document.getElementById('visualizerCanvas').style.display='none';document.querySelector('.mp-time').innerHTML='<span id="mpCurrTime">0:00</span><span id="mpDurTime">0:00</span>';miniVid.src=playSrc;miniVid.style.display='block';if(a)miniVid.play().catch(()=>{})}else{document.getElementById('mpVideoBox').style.display='none',this.aEl.src=playSrc,a&&this.audioCtx.resume().then(()=>this.aEl.play().then(()=>this.syncPlayState(true)).catch(()=>{this.syncPlayState(false)}));this.isPlaying=a;document.querySelector('.mp-time').innerHTML='<span id="mpCurrTime">0:00</span><span id="mpDurTime">0:00</span>';miniVis.style.display='block';if(!this.sleepMode)document.getElementById('visualizerCanvas').style.display='block'}this.currTimeEl=document.getElementById('mpCurrTime'); this.durTimeEl=document.getElementById('mpDurTime'); const setCoverAndLyrics=async()=>{let coverUrl=null;let isLocalBlob=false;this.parseLyrics("");if(b.customCover&&b.id){try{const blob=await dbAmbilCover(b.id);if(blob)coverUrl=URL.createObjectURL(blob)}catch(err){}}if('audio'===c){if(b.isLocal&&b.id){try{const audioBlob=await dbAmbilFile(b.id);if(audioBlob){MediaPlayer.readID3(audioBlob,this.currentIndex);isLocalBlob=true}}catch(err){}}else if(playSrc&&playSrc!=='LOCAL_FILE'){MediaPlayer.readID3(playSrc,this.currentIndex);isLocalBlob=true}}if(!coverUrl&&!isLocalBlob&&'video'===c&&b.img&&b.img!=='LOCAL_FILE')coverUrl=getThumbUrl(b.img);if(!coverUrl&&!isLocalBlob&&'audio'===c&&b.img&&b.img!=='LOCAL_FILE')coverUrl=getThumbUrl(b.img);if(coverUrl){g.style.backgroundImage=`url('${coverUrl}')`;g.innerHTML='';h.style.backgroundImage=`url('${coverUrl}')`;h.innerHTML=''}else if(!isLocalBlob){g.style.backgroundImage='none';h.style.backgroundImage='none';if('audio'===c||'video'===c){g.innerHTML='';h.innerHTML=''}}};await setCoverAndLyrics();
        const headerTitleEl = document.querySelector('#mpHeaderTitle .marquee-text');
        if(headerTitleEl) headerTitleEl.innerText = b.name;
        const miniTitleEl = document.querySelector('#miniTitle.marquee-text');
        if(miniTitleEl) miniTitleEl.innerText = b.name;
        document.getElementById('miniSub').innerText=b.year||'Unknown';
        if(d){this.isPlaying=a,ytPlayer?(ytPlayer.loadVideoById(d),a?ytPlayer.playVideo():ytPlayer.pauseVideo()):ytPlayer=new YT.Player('ytVideoPlayer',{height:'100%',width:'100%',videoId:d,playerVars:{'autoplay':a?1:0,'controls':0,'rel':0},events:{'onStateChange':this.onPlayerStateChange,'onReady':k=>{a&&k.target.playVideo()}}});ytInterval=setInterval(()=>this.syncYoutubeTime(),500)}this.updatePlayBtn();if(this.activeViewIndex!==null){if(this.activeViewIndex==='queue')this.renderViewingPlaylist(this.queue,'queue');else{const bArray=JSON.parse(getLocal('playlists')||'[]');if(bArray[this.activeViewIndex])this.renderViewingPlaylist(bArray[this.activeViewIndex].items,this.activeViewIndex)}}this.setSpeed(this.currentSpeed);
    },
    onPlayerStateChange:function(a){MediaPlayer.isPlaying=a.data==YT.PlayerState.PLAYING,a.data==YT.PlayerState.ENDED&&MediaPlayer.onTrackEnd(),MediaPlayer.updatePlayBtn()},
    renderProgressUI: function(cur, dur) {         
          if(this.progBar) this.progBar.style.width = (cur / dur * 100) + '%';         
          if(this.currTimeEl) this.currTimeEl.innerText = formatTimeMedia(cur);         
          if(this.durTimeEl) this.durTimeEl.innerText = formatTimeMedia(dur);
    },
    syncYoutubeTime:function(){if(ytPlayer&&ytPlayer.getCurrentTime){const a=ytPlayer.getCurrentTime(),b=ytPlayer.getDuration();if(b){this.renderProgressUI(a, b);}}},    
    togglePlay:function(){const a=this.queue[this.currentIndex];if(!a)return;if(getYoutubeId(a.img)&&ytPlayer){ytPlayer.getPlayerState()===YT.PlayerState.PLAYING?ytPlayer.pauseVideo():ytPlayer.playVideo()}else if(this.aEl.src&&this.aEl.src!==window.location.href){this.aEl.paused?this.aEl.play().then(()=>this.syncPlayState(true)).catch(e=>{alert("Gagal memutar Audio. Kemungkinan besar API Key Google Cloud Anda dibatasi (Restricted) atau file tidak bersifat Publik. Detil: "+e.message);this.syncPlayState(false)}):this.aEl.pause()}else if(this.vEl.src&&this.vEl.src!==window.location.href){if(this.vEl.paused){this.vEl.play().then(()=>this.syncPlayState(true)).catch(e=>{alert("Gagal memutar Video. Kemungkinan besar API Key Google Cloud Anda dibatasi (Restricted) atau file tidak bersifat Publik. Detil: "+e.message);this.syncPlayState(false)});this.miniVid.play().catch(()=>{})}else{this.vEl.pause();this.miniVid.pause()}}this.updatePlayBtn()},
    next:function(){0!==this.queue.length&&(this.currentIndex=1===this.mode?Math.floor(Math.random()*this.queue.length):(this.currentIndex+1)%this.queue.length,this.loadTrack())},
    prev:function(){0!==this.queue.length&&(this.currentIndex=(this.currentIndex-1+this.queue.length)%this.queue.length,this.loadTrack())},
    onTrackEnd:function(){2===this.mode?this.loadTrack(true):(this.queue.length<=1?(this.isPlaying=false,this.updatePlayBtn()):this.next())},
    seek:function(a){if(0===this.queue.length||(this.queue[this.currentIndex].isDrive&&!getDirectUrl(this.queue[this.currentIndex].img).includes('export=download')))return;const b=a.offsetX/a.currentTarget.offsetWidth;if(getYoutubeId(this.queue[this.currentIndex].img)&&ytPlayer){ytPlayer.seekTo(ytPlayer.getDuration()*b,true)}else{if(this.aEl.duration)this.aEl.currentTime=this.aEl.duration*b;if(this.vEl.duration){this.vEl.currentTime=this.vEl.duration*b;document.getElementById('miniVideoPreview').currentTime=this.vEl.duration*b;}}},    
    updateTime:function(a){if(!a.duration)return;const b=a.currentTime,c=a.duration;this.renderProgressUI(b, c);if(a===this.vEl){if(Math.abs(this.miniVid.currentTime-b)>0.5)this.miniVid.currentTime=b;}if(a===this.aEl){this.updateLyricsSync(b);}},
    updatePlayBtn:function(){this.btnPlay.innerHTML=this.isPlaying?SVG_PAUSE_CIRCLE:SVG_PLAY_CIRCLE;this.btnMiniPlay.innerHTML=this.isPlaying?SVG_PAUSE_CIRCLE:SVG_PLAY_CIRCLE;this.btnMiniPlay.classList.toggle('is-playing-state',this.isPlaying)},
    show:function(){
        this.ui.classList.remove('hidden');
        if(this.minimized){ document.body.classList.add('has-mini-player'); this.ui.style.top = document.getElementById('mainHeader').offsetHeight + 'px'; } 
        else { cekScrollLayar(); }
    },
    close:function(){
        this.aEl.pause(); this.vEl.pause();
        if(typeof ytPlayer !== 'undefined' && ytPlayer && ytPlayer.pauseVideo) ytPlayer.pauseVideo();
        if(typeof ytInterval !== 'undefined' && ytInterval) clearInterval(ytInterval);
        this.driveFrame.removeAttribute('src');
        this.ui.classList.add('hidden'); this.ui.classList.remove('minimized'); this.minimized=false; this.ui.style.top='0';
        document.body.classList.remove('has-mini-player'); cekScrollLayar(); stopRelatedAnimations(); this.isPlaying=false; this.updatePlayBtn();
        if(typeof isAddMediaMode !== 'undefined' && isAddMediaMode) { keluarModeAddMedia(); }
    },
    minimize:function(){
        this.minimized=true,this.ui.classList.add('minimized'),cekScrollLayar();this.ui.style.top=document.getElementById('mainHeader').offsetHeight+'px';document.body.classList.add('has-mini-player');
        const a=this.queue[this.currentIndex];if(a){const b=getYoutubeId(a.img);b&&(document.getElementById('miniYtPlayer').style.display='block');}
    },
    maximize:function(){
        if(!isAddMediaMode && (isSelectionMode || document.querySelectorAll('.card.selected').length > 0)) { alert("Selesaikan atau batalkan seleksi terlebih dahulu!"); return; }
        this.minimized = false; this.ui.classList.remove('minimized'); this.ui.style.top = '0'; document.body.classList.remove('has-mini-player'); document.getElementById('miniDriveFrame').removeAttribute('src'); document.getElementById('miniDriveFrame').style.display = 'none'; cekScrollLayar();
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
    loadPlaylistMenu:function(){const a=document.getElementById('savedPlaylistArea');const b=JSON.parse(getLocal('playlists')||'[]');let html=`<div class="saved-pl-item" style="border: 1px solid var(--primary); background: var(--primary-light);"><span onclick="MediaPlayer.openCurrentQueue()">🎶 Antrian Saat Ini (${this.queue.length})</span></div>`;if(b.length===0){html+='<div style="padding:10px; color:#999; text-align:center;">Belum ada Playlist Tersimpan.</div>'}else{a.innerHTML=html;b.forEach((c,d)=>{const div=document.createElement('div');div.className='saved-pl-item';div.setAttribute('draggable','true');div.setAttribute('data-pl-index',d);div.innerHTML=`<span onclick="MediaPlayer.openSavedPlaylist(${d})">📂 ${c.name} (${c.items.length})</span><div style="display:flex; gap:5px; margin-left: 5px;"><button class="saved-pl-btn" style="color:white;" onclick="MediaPlayer.editSavedPlaylist(${d})" title="Edit Playlist">${SVG_EDIT}</button><button class="saved-pl-btn" onclick="MediaPlayer.deleteSavedPlaylist(${d})" style="color:red" title="Hapus">${SVG_TRASH}</button></div>`;div.addEventListener('dragstart',this.handlePlaylistDragStart);div.addEventListener('dragover',this.handlePlaylistDragOver);div.addEventListener('drop',this.handlePlaylistDrop);a.appendChild(div)});return}a.innerHTML=html;a.style.display='block'},
    draggedPlIndex:null,
    handlePlaylistDragStart:function(e){MediaPlayer.draggedPlIndex=this.getAttribute('data-pl-index');this.classList.add('dragging');e.dataTransfer.effectAllowed='move'},
    handlePlaylistDragOver:function(e){e.preventDefault();e.dataTransfer.dropEffect='move';return false},
    handlePlaylistDrop:function(e){e.stopPropagation();this.classList.remove('dragging');document.querySelectorAll('.saved-pl-item').forEach(el=>el.classList.remove('dragging'));const srcIdx=parseInt(MediaPlayer.draggedPlIndex);const targetIdx=parseInt(this.getAttribute('data-pl-index'));if(srcIdx!==targetIdx&&!isNaN(srcIdx)&&!isNaN(targetIdx)){let playlists=JSON.parse(getLocal('playlists')||'[]');const movedItem=playlists.splice(srcIdx,1)[0];playlists.splice(targetIdx,0,movedItem);setLocal('playlists',JSON.stringify(playlists));MediaPlayer.loadPlaylistMenu()}return false},
    editSavedPlaylist: async function(a){
        const b = JSON.parse(getLocal('playlists') || '[]');
        if(!b[a]) return;
        const c = await customPrompt("Ubah Nama Playlist:", b[a].name);
        if(c !== null && c.trim() !== ''){ b[a].name = c.trim(); setLocal('playlists', JSON.stringify(b)); this.loadPlaylistMenu(); }
    },
    deleteSavedPlaylist:async function(a){if(await customConfirm("Hapus playlist ini?")){let b=JSON.parse(getLocal('playlists')||'[]');b.splice(a,1);setLocal('playlists',JSON.stringify(b));this.loadPlaylistMenu()}},
    openCurrentQueue:function(){this.activeViewIndex='queue';document.getElementById('plViewDefault').style.display='none';document.getElementById('plViewInside').style.display='flex';document.getElementById('plPlayName').innerText="Antrian";document.getElementById('savedPlaylistArea').style.display='none';document.getElementById('mpPlaylistList').style.display='block';this.renderViewingPlaylist(this.queue,'queue')},
    openSavedPlaylist:function(a){const b=JSON.parse(getLocal('playlists')||'[]');if(!b[a])return;this.activeViewIndex=a;document.getElementById('plViewDefault').style.display='none';document.getElementById('plViewInside').style.display='flex';document.getElementById('plPlayName').innerText=b[a].name;document.getElementById('savedPlaylistArea').style.display='none';document.getElementById('mpPlaylistList').style.display='block';this.renderViewingPlaylist(b[a].items,a)},
    playCurrentPlaylist:function(){if(this.activeViewIndex===null)return;if(this.activeViewIndex==='queue'){if(this.queue.length>0){this.currentIndex=0;this.loadTrack();}else{alert("Antrian kosong!")}return}const b=JSON.parse(getLocal('playlists')||'[]');const pl=b[this.activeViewIndex];if(!pl||pl.items.length===0)return alert("Playlist kosong!");this.queue=[...pl.items];this.currentIndex=0;this.loadTrack();},
    addMediaToCurrentPlaylist:function(){window.targetPlaylistIndexForAdd=this.activeViewIndex;this.togglePlaylist();this.minimize();isAddMediaMode=true;isSelectionMode=true;document.body.classList.add('action-mode');document.body.classList.add('add-media-mode');setFilter(0,'audiovideo')},
    renderViewingPlaylist:function(items,listIndex){const a=document.getElementById('mpPlaylistList');a.innerHTML='';if(items.length===0){a.innerHTML='<div style="padding:20px; text-align:center; color:#888;">Playlist Kosong</div>';return}const frag=document.createDocumentFragment();let currentEl=null;items.forEach((b,c)=>{const isCurrent=(listIndex==='queue'&&c===this.currentIndex)||(listIndex!=='queue'&&this.queue.length===items.length&&this.queue[c]&&this.queue[c].id===b.id&&c===this.currentIndex);const d=document.createElement('div');d.className=`pl-item ${isCurrent?'active':''}`;d.setAttribute('draggable','true');d.setAttribute('data-index',c);d.setAttribute('data-list-index',listIndex);d.addEventListener('dragstart',this.itemDragStart);d.addEventListener('dragover',this.itemDragOver);d.addEventListener('drop',this.itemDrop);
    const downloadBtnHtml = b.isLocal ? '' : `<button class="pl-ctx-btn" style="display:flex; align-items:center; gap:5px;" onclick="MediaPlayer.downloadItemView('${listIndex}', ${c})">${SVG_DOWNLOAD} Download</button>`;
    const storageIco = getStorageIcon(b.originalImg || b.img);
d.innerHTML=`<div class="pl-info" onclick="MediaPlayer.playFromView('${listIndex}', ${c})"><div class="pl-name" style="display:flex; align-items:center;">${storageIco}<span style="white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${b.name}</span></div><div class="pl-dur">${b.year||''}</div></div><button class="pl-action" onclick="MediaPlayer.toggleCtxMenu(event, ${c})">${SVG_MORE_VERT}</button><div id="ctxMenu_${c}" class="pl-ctx-menu">${downloadBtnHtml}<button class="pl-ctx-btn" style="color:red; display:flex; align-items:center; gap:5px;" onclick="MediaPlayer.removeItemView('${listIndex}', ${c})">${SVG_TRASH} Hapus</button><button class="pl-ctx-btn" style="display:flex; align-items:center; gap:5px;" onclick="event.stopPropagation(); this.parentElement.classList.remove('show');">${SVG_CANCEL} Batal</button></div>`;frag.appendChild(d);if(isCurrent)currentEl=d;});a.appendChild(frag);if(currentEl)setTimeout(()=>currentEl.scrollIntoView({behavior:'smooth',block:'center'}),200)},
    playFromView:function(listIndex,itemIndex){if(listIndex==='queue'){this.currentIndex=itemIndex;this.loadTrack();}else{const b=JSON.parse(getLocal('playlists')||'[]');this.queue=[...b[listIndex].items];this.currentIndex=itemIndex;this.loadTrack();}},
    removeItemView:function(listIndex,itemIndex){if(listIndex==='queue'){this.removeFromQueue(itemIndex)}else{const b=JSON.parse(getLocal('playlists')||'[]');b[listIndex].items.splice(itemIndex,1);setLocal('playlists',JSON.stringify(b));this.openSavedPlaylist(listIndex)}},
    downloadItemView: async function(listIndex, itemIndex) {
        let item;
        if (listIndex === 'queue') { item = this.queue[itemIndex]; } 
        else { const b = JSON.parse(getLocal('playlists') || '[]'); item = b[listIndex].items[itemIndex]; }
        if (!item) return;
        document.querySelectorAll('.pl-ctx-menu').forEach(el => el.classList.remove('show'));
        const ytId = getYoutubeId(item.img);
        if (ytId) {
            const isConfirmed = await customConfirm(`Unduh "${item.name}" dari YouTube?\n\nAnda akan diarahkan ke tab baru untuk memilih kualitas MP3/MP4.`);
            if (!isConfirmed) return;
            const ytUrl = `https://www.youtube.com/watch?v=${ytId}`;
            const externalConverterUrl = `https://yt1s.com.co/en193/?q=${encodeURIComponent(ytUrl)}`; 
            try { await navigator.clipboard.writeText(ytUrl); alert("Tautan video telah disalin otomatis ke clipboard!\n\nJika halaman downloader terlihat kosong, silakan klik 'Tempel/Paste' di kolom pencarian mereka."); } catch (err) { console.log("Clipboard API tidak diizinkan oleh browser", err); }
            window.open(externalConverterUrl, '_blank');
            return;
        }
        const link = document.createElement('a');
        link.download = item.name;
        if (item.isLocal && item.img.startsWith('blob:')) { link.href = item.img; link.click(); } 
        else { link.href = getDownloadUrl(item.img); link.target = '_blank'; link.click(); }
    },
    toggleCtxMenu:function(e,idx){e.stopPropagation();document.querySelectorAll('.pl-ctx-menu').forEach(el=>el.classList.remove('show'));const menu=document.getElementById(`ctxMenu_${idx}`);if(menu)menu.classList.toggle('show')},
    drawVisualizer:function(){
        const a=document.getElementById('visualizerCanvas'),b=a.getContext('2d');
        const miniA=document.getElementById('miniVisualizer'),miniB=miniA.getContext('2d');
        const c=this.analyser.frequencyBinCount,d=new Uint8Array(c);
        a.width=a.offsetWidth||300;a.height=a.offsetHeight||150;
        miniA.width=miniA.offsetWidth||40;miniA.height=miniA.offsetHeight||40;
        const e=()=>{
            if(this.ui.classList.contains('hidden') || !this.isPlaying || 'block'===this.vEl.style.display) { setTimeout(e, 500); return; }
            requestAnimationFrame(e);
            this.analyser.getByteFrequencyData(d);
            if(!this.minimized){b.clearRect(0,0,a.width,a.height);const gradient=b.createLinearGradient(0,a.height,0,0);gradient.addColorStop(0,'#ffff00');gradient.addColorStop(1,'#ff0000');b.fillStyle=gradient;const barWidth=(a.width/c)*2.5;let x=0;for(let i=0;i<c;i++){let barHeight=(d[i]/255)*a.height;b.fillRect(x,a.height-barHeight,barWidth,barHeight);x+=barWidth+1}}if(this.minimized&&'block'===miniA.style.display){miniB.clearRect(0,0,miniA.width,miniA.height);miniB.fillStyle='#ff4500';const step=4;const barWidthMini=(miniA.width/(c/step))*1.5;let x=0;for(let i=0;i<c;i+=step){let val=d[i];let h=(val/255)*miniA.height;let y=(miniA.height-h)/2;miniB.fillRect(x,y,barWidthMini,h);x+=barWidthMini+1}}};e()},dragSrcEl:null,itemDragStart:function(a){MediaPlayer.dragSrcEl=this;a.dataTransfer.effectAllowed='move';a.dataTransfer.setData('text/html',this.getAttribute('data-index'));this.classList.add('dragging')},itemDragOver:function(a){return a.preventDefault(),a.dataTransfer.dropEffect='move',false},itemDrop:function(a){a.stopPropagation();const srcEl=MediaPlayer.dragSrcEl;if(srcEl)srcEl.classList.remove('dragging');if(srcEl===this)return;const b=parseInt(srcEl.getAttribute('data-index'));const c=parseInt(this.getAttribute('data-index'));const listIndex=this.getAttribute('data-list-index');if(listIndex==='queue'){const d=MediaPlayer.queue.splice(b,1)[0];MediaPlayer.queue.splice(c,0,d);if(MediaPlayer.currentIndex===b)MediaPlayer.currentIndex=c;else if(MediaPlayer.currentIndex>b&&MediaPlayer.currentIndex<=c)MediaPlayer.currentIndex--;else if(MediaPlayer.currentIndex<b&&MediaPlayer.currentIndex>=c)MediaPlayer.currentIndex++;MediaPlayer.renderViewingPlaylist(MediaPlayer.queue,'queue')}else{const playlists=JSON.parse(getLocal('playlists')||'[]');const playlist=playlists[listIndex];if(!playlist)return;const d=playlist.items.splice(b,1)[0];playlist.items.splice(c,0,d);setLocal('playlists',JSON.stringify(playlists));MediaPlayer.renderViewingPlaylist(playlist.items,listIndex)}return false}
};

// =====================================================
// SECTION 9: HUBUNGAN MEMORI & ANIMASI (RELATIONS)
// =====================================================
function bukaModalHubung() {
    if ('master' !== currentRole && 'user' !== currentRole) return alert("Hanya Master & Admin yang bisa mengatur relasi.");

    if (isSelectingForGroup && targetGroupForSelection) {
        const items = document.querySelectorAll('.card.selected');
        if (items.length === 0) {
            alert("Tidak ada file yang dipilih! Pemilihan dibatalkan.");
            isSelectingForGroup = false; targetGroupForSelection = null;
            toggleModal('modalHubung', true); return;
        }
        prosesTambahFileKeGrup(targetGroupForSelection); return;
    }

    toggleModal('modalHubung', true);
    kembaliKeDaftarHubung();
}

function renderGroupList() {
    const list = document.getElementById('hubungGroupList');
    const groups = getLinkGroups();
    
    if (groups.length === 0) {
        list.innerHTML = '<div style="text-align:center; color:#999; padding: 20px; font-weight:bold;">Belum ada grup relasi. Buat grup baru untuk mulai menghubungkan file.</div>'; return;
    }
    
    let html = '';
    groups.forEach(g => {
        html += `
        <div class="saved-pl-item" style="margin-bottom: 0; align-items: center;">
            <span style="flex: 1; cursor: pointer;" onclick="bukaDetailHubung('${g.id}')">${g.name} (${g.items.length} file)</span>
            <div style="display:flex; gap:5px; margin-left: 5px;">
                <button class="saved-pl-btn" style="color:white;" onclick="editNamaGrupHubung('${g.id}')" title="Edit Nama Grup">${SVG_EDIT}</button>
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
    document.getElementById('hubungTitle').innerHTML = `${SVG_LINK} Kelola Hubungan`;
    renderGroupList();
}

function bukaDetailHubung(groupId) {
    activeHubungGroupId = groupId;
    const group = getLinkGroups().find(g => g.id === groupId);
    if (!group) return kembaliKeDaftarHubung();
    document.getElementById('hubungTitle').innerHTML = `${SVG_LINK} ${group.name}`;
    document.getElementById('hubungViewGroups').style.display = 'none';
    document.getElementById('hubungViewDetail').style.display = 'flex';
    renderItemList(group);
}

async function buatGrupHubungBaru() {
    toggleModal('modalHubung', false); 
    const name = await customPrompt("Nama Grup Relasi Baru:", "Grup Relasi " + new Date().toLocaleDateString());
    toggleModal('modalHubung', true); 
    if (!name || name.trim() === "") return;

    let groups = getLinkGroups();
    const newGroup = { id: 'grp_' + Date.now(), name: name.trim(), items: [] };
    groups.unshift(newGroup); 
    setLinkGroups(groups); simpanKeLokal();
    logActivity('Hubung', `Membuat grup relasi kosong: "${name}".`);
    renderGroupList();
}

async function editNamaGrupHubung(groupId) {
    let groups = getLinkGroups();
    const groupIndex = groups.findIndex(g => g.id === groupId);
    if (groupIndex === -1) return;
    toggleModal('modalHubung', false); 
    const newName = await customPrompt("Ubah Nama Grup:", groups[groupIndex].name);
    toggleModal('modalHubung', true); 

    if (newName && newName.trim() !== "") {
        groups[groupIndex].name = newName.trim();
        setLinkGroups(groups); simpanKeLokal(); renderGroupList();
    }
}

async function hapusGrupHubung(groupId) {
    toggleModal('modalHubung', false); 
    const konfirmasi = await customConfirm("Hapus grup ini? Semua file di dalamnya otomatis akan terputus hubungannya.");
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
    setLinkGroups(groups); simpanKeLokal();
    logActivity('Hubung', `Menghapus relasi grup: ${group.name}`);
    renderGroupList();
}

function renderItemList(group) {
    const list = document.getElementById('hubungItemList');
    if (group.items.length === 0) {
        list.innerHTML = '<div style="text-align:center; color:#999; padding: 20px; font-weight:bold;">Grup ini kosong. Klik tombol di atas untuk memasukkan file.</div>'; return;
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
    toggleModal('modalHubung', false); 
    if (!isSelectionMode) { toggleSelectionMode(true); }
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

    if (added === 0) { alert("Semua file yang Anda pilih sudah berada di dalam grup ini."); } 
    else {
        setLinkGroups(groups); simpanKeLokal();
        logActivity('Hubung', `Menambahkan ${added} file ke relasi: ${groups[groupIndex].name}`);
        alert(`Berhasil menambahkan ${added} file ke dalam grup!`);
    }

    batalBatchAksi(); 
    isSelectingForGroup = false; targetGroupForSelection = null;
    toggleModal('modalHubung', true); bukaDetailHubung(groupId);
}

function unlinkFile(fileId) {
    let groups = getLinkGroups();
    let groupIndex = groups.findIndex(g => g.id === activeHubungGroupId);
    if(groupIndex === -1) return;

    groups[groupIndex].items = groups[groupIndex].items.filter(id => id !== fileId);
    setLinkGroups(groups);
    
    const card = document.querySelector(`.card[data-id="${fileId}"]`);
    if(card) card.setAttribute('data-related', 'none');
    
    simpanKeLokal(); logActivity('Hubung', `Unlink file dari relasi: ${groups[groupIndex].name}`);
    renderItemList(groups[groupIndex]);
}

async function spawnRelatedAnimations(triggerId) {
    stopRelatedAnimations();
    const triggerCard = document.querySelector(`.card[data-id="${triggerId}"]`);
    if(!triggerCard) return;

    const relatedStr = triggerCard.getAttribute('data-related');
    const isDescAuraOn = triggerCard.getAttribute('data-descaura') === 'true';
    const noteText = triggerCard.getAttribute('data-note');
    let relatedIds = [];
    if (relatedStr && relatedStr !== 'none') {
        if (relatedStr.startsWith('grp_')) {
            const groups = JSON.parse(getLocal('link_groups') || '[]');
            const group = groups.find(g => g.id === relatedStr);
            if (group) relatedIds = group.items;
        } else { relatedIds = relatedStr.split(','); }
    }
    const targets = relatedIds.filter(id => id !== triggerId);

    if(targets.length === 0 && (!isDescAuraOn || !noteText || noteText === 'none')) return;
    const wrapper = document.createElement('div');
    wrapper.id = 'relatedAnimWrapper'; wrapper.className = 'related-anim-container';
    document.body.appendChild(wrapper);

    let animIndex = 0; 
    if(isDescAuraOn && noteText && noteText !== 'none') {
        const floatDesc = document.createElement('div');
        floatDesc.className = 'related-floating-card';
        floatDesc.style.animationDelay = `${(animIndex * 10) + 5}s`; 
        floatDesc.style.cursor = 'default'; floatDesc.style.pointerEvents = 'auto'; floatDesc.style.position = 'relative'; floatDesc.style.zIndex = '999999';
        
        const svgClock = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#FFD700" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>`;
        floatDesc.innerHTML = `<div class="rfc-thumb"><span style="display:flex; align-items:center; justify-content:center; width:100%; height:100%;">${svgClock}</span></div><div class="rfc-name" style="white-space: normal; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; line-height: 1.2; text-transform: none;">${noteText}</div>`;
        wrapper.appendChild(floatDesc);
        animIndex++; 
    }

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
            else { const fallbackIcon = thumbContainer.querySelector('.icon:not(.img-icon):not(.yt-icon)'); thumbHtml = fallbackIcon ? fallbackIcon.outerHTML : thumbContainer.innerHTML; }
        }

        const floatItem = document.createElement('div');
        floatItem.className = 'related-floating-card';
        floatItem.style.animationDelay = `${(animIndex * 10) + 5}s`; 
        floatItem.style.cursor = 'pointer'; floatItem.style.pointerEvents = 'auto'; floatItem.style.position = 'relative'; floatItem.style.zIndex = '999999';
        floatItem.innerHTML = `<div class="rfc-thumb">${thumbHtml}</div><div class="rfc-name" style="text-transform: none;">${fileName}</div>`;

        floatItem.onclick = (e) => {
            e.stopPropagation();
            if (!MediaPlayer.ui.classList.contains('hidden') && !MediaPlayer.minimized) { MediaPlayer.minimize(); }
            card.click();
        };
        fragAura.appendChild(floatItem);
        animIndex++;
    }
    wrapper.appendChild(fragAura);
    setTimeout(() => { stopRelatedAnimations(); }, ((animIndex * 10000) + 1000));
}

function stopRelatedAnimations() {
    const wrapper = document.getElementById('relatedAnimWrapper');
    if (wrapper) wrapper.remove();
}

// =====================================================
// SECTION 10: RECYCLE BIN (TONG SAMPAH)
// =====================================================
function bukaRecycleBin() {
    if ('master' !== currentRole) return alert("Hanya Master Admin.");
    renderRecycleBinList();
    toggleModal('modalSettings', false); toggleModal('modalRecycleBin', true);
}

function renderRecycleBinList() {
    const rbData = JSON.parse(getLocal('recycle_bin') || '[]');
    const rbList = document.getElementById('rbList');
    document.getElementById('rbCount').innerText = `${rbData.length} item`;
    document.getElementById('rbCheckAll').checked = false;
    
    if (rbData.length === 0) {
        rbList.innerHTML = '<div style="text-align:center; padding:20px; color:#999; font-weight:bold;">Recycle Bin bersih.</div>'; return;
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
        simpanKeLokal(); filterFiles(); updateStats(); renderRecycleBinList();
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
        alert(`${deletedCount} item dimusnahkan. Menyinkronkan ulang memori...`);
        setTimeout(() => { if (dbInstance) { dbInstance.close(); } window.location.reload(); }, 2000);
    }
}

// =====================================================
// SECTION 11: PANEL MASTER ADMIN (MANAJEMEN KATEGORI TREE)
// =====================================================
function bukaMaster() {
    tempMasterConfig = JSON.parse(JSON.stringify(config));
    toggleModal('modalMaster', true);
    initMasterTree();
    masterResetForm();
}

function simpanMasterKeseluruhan() {
    config = JSON.parse(JSON.stringify(tempMasterConfig));
    saveConfig();
    toggleModal('modalMaster', false);
    alert("Perubahan kategori berhasil disimpan!");
}

function batalMaster() {
    tempMasterConfig = [];
    toggleModal('modalMaster', false);
}

function initMasterTree(){
    const a=document.getElementById('masterTreeList'),b=document.getElementById('mstParent');
    a.innerHTML='';
    b.innerHTML='<option value="ROOT">Sebagai Kategori Utama</option>';
    const c=(d,e)=>{
        d&&d.forEach(f=>{
            const g=document.createElement('option');
            g.value=f.id;
            g.innerHTML="  ".repeat(e)+(f.icon||'')+" "+f.name;
            b.appendChild(g);
            const h=document.createElement('div');
            h.className='tree-item';
            h.setAttribute('draggable','true');
            h.setAttribute('data-id',f.id);
            h.setAttribute('ondragstart','masterDragStart(event)');
            h.setAttribute('ondragover','masterDragOver(event)');
            h.setAttribute('ondrop','masterDrop(event)');
            h.setAttribute('ondragleave','masterDragLeave(event)');
            h.innerHTML=`<div class="tree-label level-${e}" onclick="isiFormMaster('${f.id}')">${f.icon||'📄'} ${f.name}</div><div class="tree-actions"><button onclick="hapusNode('${f.id}')" style="color:red; display:inline-flex; align-items:center;">${SVG_TRASH}</button></div>`;
            a.appendChild(h);
            f.children&&c(f.children,e+1);
        });
    };
    c(tempMasterConfig,0);
}

function masterDragStart(a){
    dragSrcId=a.currentTarget.getAttribute('data-id');
    a.currentTarget.classList.add('dragging');
    a.dataTransfer.effectAllowed='move';
}

function masterDragOver(a){
    a.preventDefault();
    if(a.currentTarget.getAttribute('data-id') !== dragSrcId) {
        a.currentTarget.classList.add('drag-over');
    }
    a.dataTransfer.dropEffect='move';
    return false;
}

function masterDragLeave(a){
    a.currentTarget.classList.remove('drag-over');
}

function masterDrop(a){
    a.stopPropagation();
    a.currentTarget.classList.remove('drag-over');
    const b=a.currentTarget.getAttribute('data-id');
    document.querySelectorAll('.tree-item').forEach(c=>c.classList.remove('dragging'));
    if(dragSrcId && b && dragSrcId !== b) reorderNodes(dragSrcId, b);
    return false;
}

function reorderNodes(a,b){
    const c=findNodeAndParent(tempMasterConfig,a,null), d=findNodeAndParent(tempMasterConfig,b,null);
    if(c&&d){
        if(isDescendantConfig(c.node,b)) return alert("Tidak bisa memindahkan folder induk ke dalam sub-folder sendiri!");
        c.array.splice(c.index,1);
        const e=findNodeAndParent(tempMasterConfig,b,null);
        e.array.splice(e.index,0,c.node);
        initMasterTree();
    }
}

function masterTambah(){
    const a=document.getElementById('mstId').value.trim().toLowerCase(), b=document.getElementById('mstName').value.trim(), c=document.getElementById('mstIcon').value.trim(), d=document.getElementById('mstParent').value;
    if(!a||!b||a.includes(" "))return alert("ID invalid!");
    if(findNode(tempMasterConfig, a))return alert("ID terpakai!");
    const e={id:a,name:b,icon:c,children:[]}, f='ROOT'===d?null:findNode(tempMasterConfig,d);
    f?(f.children=f.children||[],f.children.push(e)):tempMasterConfig.push(e);
    initMasterTree(); masterResetForm();
}

function masterUpdate(){
    if(!nodeToEdit) return;
    const newName = document.getElementById('mstName').value.trim();
    const newIcon = document.getElementById('mstIcon').value.trim();
    const newParentId = document.getElementById('mstParent').value;
    nodeToEdit.node.name = newName; nodeToEdit.node.icon = newIcon;
    const currentInfo = findNodeAndParent(tempMasterConfig, nodeToEdit.node.id, null);
    const currentParentId = currentInfo.parent ? currentInfo.parent.id : 'ROOT';
    
    if (currentParentId !== newParentId) {
        if (newParentId !== 'ROOT' && (nodeToEdit.node.id === newParentId || isDescendantConfig(nodeToEdit.node, newParentId))) {
            alert("Tidak bisa memindahkan ke dalam sub-kategorinya sendiri!"); return;
        }
        currentInfo.array.splice(currentInfo.index, 1);
        if (newParentId === 'ROOT') { tempMasterConfig.push(nodeToEdit.node); } 
        else { const targetParent = findNode(tempMasterConfig, newParentId); if (targetParent) { targetParent.children = targetParent.children || []; targetParent.children.push(nodeToEdit.node); } }
    }
    initMasterTree(); masterResetForm();
}

async function hapusNode(a){
    const node = findNode(tempMasterConfig, a);
    const catName = node ? node.name : "Kategori Ini";
    if(await customConfirm(`Yakin menghapus kategori: ${catName}?`)){
        const b=c=>{
            const d=c.findIndex(e=>e.id===a);
            if(d>-1)return c.splice(d,1),true;
            for(let e of c)if(e.children&&b(e.children))return true;
        };
        b(tempMasterConfig);
        initMasterTree(); masterResetForm();
    }
}

function isiFormMaster(a){
    const b=findNode(tempMasterConfig, a);
    if(!b) return;
    const parentInfo = findNodeAndParent(tempMasterConfig, a, null);
    nodeToEdit={node:b};
    document.getElementById('mstId').value=b.id;
    document.getElementById('mstId').disabled=true;
    document.getElementById('mstName').value=b.name;
    document.getElementById('mstIcon').value=b.icon||'';
    document.getElementById('mstParent').value = parentInfo.parent ? parentInfo.parent.id : 'ROOT';
    document.getElementById('btnAddNode').classList.add('hidden');
    document.getElementById('btnUpdateNode').classList.remove('hidden');
    document.getElementById('btnCancelNode').classList.remove('hidden');
}

function masterResetForm(){
    nodeToEdit=null;
    document.getElementById('mstId').value='';
    document.getElementById('mstId').disabled=false;
    document.getElementById('mstName').value='';
    document.getElementById('mstIcon').value='';
    document.getElementById('mstParent').value='ROOT';
    document.getElementById('btnAddNode').classList.remove('hidden');
    document.getElementById('btnUpdateNode').classList.add('hidden');
    document.getElementById('btnCancelNode').classList.add('hidden');
}
