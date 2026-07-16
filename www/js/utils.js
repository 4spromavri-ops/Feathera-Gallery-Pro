// ======================================================
// SECTION 1: CORE DOM & TREE TRAVERSAL (STRUKTUR DATA & POHON)
// ======================================================
function findNode(a,b){for(let c of a){if(c.id===b)return c;if(c.children){const d=findNode(c.children,b);if(d)return d}}return null}

function findNodeAndParent(a,b,c){for(let d=0;d<a.length;d++){if(a[d].id===b)return{node:a[d],parent:c,index:d,array:a};if(a[d].children){const e=findNodeAndParent(a[d].children,b,a[d]);if(e)return e}}return null}

function isDescendant(a,b){
    if(a===b) return true;
    const pMap = getParentMap(); 
    let currId=a;
    while(currId && currId !== 'none'){
        const parentId = pMap[currId];
        if(!parentId) break;
        if(parentId === b) return true;
        currId = parentId;
    }
    return false;
}

function isDescendantConfig(a,b){if(!a.children)return false;for(let c of a.children){if(c.id===b||isDescendantConfig(c,b))return true}return false}

function getAllDescendantIds(a){let b=[];const map=getChildrenMap();const d=e=>{if(map[e]){map[e].forEach(child=>{b.push(child.id);if(child.type==='folder')d(child.id)})}};return d(a),b}

function getParentMap() {
    if(_parentCache) return _parentCache;
    _parentCache = {};
    document.querySelectorAll('.card').forEach(c => _parentCache[c.getAttribute('data-id')] = c.getAttribute('data-folderId'));
    clearTimeout(_parentCacheTimer);
    _parentCacheTimer = setTimeout(() => _parentCache = null, 50); 
    return _parentCache;
}

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

// ======================================================
// SECTION 2: URL PARSING & CLOUD STORAGE RESOLVERS (EKSTRAKSI LINK)
// ======================================================
function getYoutubeId(a){
    if(!a||'LOCAL_FILE'===a)return null;
    const b=a.match(/^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/);
    return b&&11===b[2].length?b[2]:null
}

function getDriveId(a){
    if(!a||'LOCAL_FILE'===a)return null;
    const b=a.match(/(?:file\/d\/|id=|open\?id=)([^/&?]+)/);
    return b?b[1]:null
}

function getDirectUrl(a){
    if(!a||'LOCAL_FILE'===a)return a;
    let b=a.trim();
    if(b.includes('supabase.co')){
        b = b.replace(/[?&]download(=[^&]*)?(?=&|$)/, '');
        b = b.replace(/ /g, '%20');
    }
    if(b.includes('dropbox.com'))return b.replace('www.dropbox.com','dl.dropboxusercontent.com').replace(/[?&]dl=[01]/,"");
    const c=getDriveId(b);
    if(c&&(b.includes('drive.google.com')||b.includes('googleusercontent.com'))){
        return `https://www.googleapis.com/drive/v3/files/${c}?alt=media&key=${firebaseConfig.apiKey}&acknowledgeAbuse=true`;
    }
    return b;
}

function getDownloadUrl(a){
    if(!a||'LOCAL_FILE'===a)return"#";
    const b=getDriveId(a);
    return b?`https://drive.google.com/uc?export=download&id=${b}`:a.includes('dropbox.com')?a.replace('www.dropbox.com','dl.dropboxusercontent.com').replace(/[?&]dl=[01]/,""):a.includes('appwrite.io')?a.replace('/view','/download'):(a.includes('supabase.co')&&!a.includes('download'))?(a.includes('?')?a+'&download=':a+'?download='):a
}

function getThumbUrl(a){
    if('LOCAL_FILE'===a)return'LOCAL_FILE';
    const b=getDriveId(a);
    if(b&&a.includes('drive.google.com'))return `https://drive.google.com/thumbnail?id=${b}&sz=w400`;
    if(a.includes('dropbox.com'))return a.replace('www.dropbox.com','dl.dropboxusercontent.com').replace(/[?&]dl=[01]/,"");
    return a;
}

function getPreviewUrl(a){
    const b=getDriveId(a);
    return b?`https://drive.google.com/file/d/${b}/preview`:a
}

// ======================================================
// SECTION 3: FILE VALIDATION & MEDIA COMPRESSION (VALIDASI & KOMPRESI)
// ======================================================
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

function getExtFromMime(mimeType) {
    if (mimeType.startsWith('video/')) {
        if (mimeType === 'video/webm') return '.webm';
        if (mimeType === 'video/quicktime') return '.mov';
        if (mimeType === 'video/x-matroska') return '.mkv';
        return '.mp4';
    }
    return '.jpg';
}

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

// ======================================================
// SECTION 4: TEXT FORMATTING & DYNAMIC ICONS (FORMATTER & IKON UI)
// ======================================================
function linkify(a){
    return a?a.replace(/(https?:\/\/[^\s]+)/g,b=>{
        try{
            const c=new URL(b).hostname;
            return `<a href="${b}" target="_blank" style="display:inline-flex; align-items:center; gap:4px; text-decoration:none; vertical-align:middle;"><img src="https://www.google.com/s2/favicons?domain=${c}&sz=32" style="width:1em; height:1em; border-radius:2px;" onerror="this.style.display='none'"><span style="text-decoration:underline;">${b}</span></a>`
        }catch(d){
            return `<a href="${b}" target="_blank">${b}</a>`
        }
    }):""
}

function formatTimeMedia(sec){
    if(isNaN(sec)||!isFinite(sec))return "0:00";
    const m=Math.floor(sec/60),s=Math.floor(sec%60);
    return `${m}:${s<10?'0':''}${s}`;
}

function getStorageIcon(imgStr) {
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
    if('app'===a){
        if(c.endsWith('.apk')) return SVG_ICON_APK;
        if(c.endsWith('.exe')) return SVG_ICON_EXE;
        return '📦';
    }
    if('doc'===a){
        if(c.endsWith('.pdf')) return SVG_ICON_PDF;
        if(c.match(/\.(doc|docx)$/)) return SVG_ICON_DOC_MS;
        if(c.match(/\.(xls|xlsx)$/)) return SVG_ICON_XLS;
        if(c.match(/\.(ppt|pptx)$/)) return SVG_ICON_PPT;
        return SVG_ICON_DOC_FALLBACK;
    }
    return 'archive'===a ? SVG_ICON_ZIP : 'video'===a ? SVG_ICON_VIDEO : 'audio'===a ? SVG_ICON_AUDIO : 'text'===a ? SVG_ICON_TXT : SVG_ICON_DEFAULT;
}

// ======================================================
// SECTION 5: CUSTOM UI COMPONENT OVERRIDES (TOASTS, MODALS & PROMPTS)
// ======================================================
const toggleModal = (id, show) => { 
    document.getElementById(id).style.display = show ? 'flex' : 'none'; 
    cekScrollLayar(); 
};

window.alert = function(message) {
    const container = document.getElementById('toastContainer');
    if (!container) {
        console.log("Alert Fallback:", message);
        return;
    }

    const toast = document.createElement('div');
    toast.className = 'toast-msg';
    
    const strMsg = String(message).toLowerCase();
    const isError = strMsg.includes('error') || strMsg.includes('gagal') || strMsg.includes('salah') || strMsg.includes('ditolak') || strMsg.includes('peringatan');
    
    if(isError) toast.classList.add('error');

    toast.innerHTML = `<span style="font-size: 18px;">${isError ? '⚠️' : 'ℹ️'}</span> <div>${message}</div>`;
    container.appendChild(toast);

    setTimeout(() => {
        toast.classList.add('fadeOut');
        toast.addEventListener('animationend', () => toast.remove());
    }, 3000);
};

function customConfirm(message) {
    return new Promise((resolve) => {
        const modal = document.getElementById('modalConfirm');
        document.getElementById('confirmMessage').innerText = message;
        
        modal.style.display = 'flex';
        document.body.classList.add('no-scroll');

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

function customPrompt(message, defaultValue = "", inputType = "text") {
    return new Promise((resolve) => {
        const modal = document.getElementById('modalPrompt');
        const input = document.getElementById('promptInput');
        
        document.getElementById('promptMessage').innerText = message;
        input.type = inputType;
        input.value = defaultValue;
        
        modal.style.display = 'flex';
        document.body.classList.add('no-scroll');
        input.focus(); 

        const btnOk = document.getElementById('btnPromptOk');
        const btnCancel = document.getElementById('btnPromptCancel');

        const bersihkanModal = () => {
            toggleModal('modalPrompt', false);
            btnOk.onclick = null;
            btnCancel.onclick = null;
        };

        btnOk.onclick = () => { bersihkanModal(); resolve(input.value); };
        btnCancel.onclick = () => { bersihkanModal(); resolve(null); }; 
    });
}

// ======================================================
// SECTION 6: SYSTEM LOGGING & ACTIVITY TRACKING (PENCATATAN LOG)
// ======================================================
function logActivity(a, b){
    const c = JSON.parse(getLocal('activity_log') || '[]');
    c.unshift({ id: Date.now(), date: new Date().toLocaleString('id-ID'), action: a, desc: b });
    c.length > 50 && c.pop();
    setLocal('activity_log', JSON.stringify(c));
}
