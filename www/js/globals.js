// ======================================================
// SECTION 1: SYSTEM CONFIGURATIONS & CONSTANTS
// ======================================================
// [Konfigurasi utama dan konstanta statis aplikasi]
const firebaseConfig = {
  apiKey: "AIzaSyDO_AmQ3EHZX-1td2SBcXl9xZKXQ7WgwXM",
  authDomain: "feathera-pro.firebaseapp.com",
  projectId: "feathera-pro",
  storageBucket: "feathera-pro.firebasestorage.app",
  messagingSenderId: "324693466741",
  appId: "1:324693466741:web:b44d677c3af3967effe23c"
};

const DB_NAME = 'FeatheraDB', 
      DB_VERSION = 2, 
      defaultConfig = [
          {id:'foto',name:'Foto',icon:'🖼️',children:[]},
          {id:'video',name:'Video',icon:'🎬',children:[]},
          {id:'audio',name:'Audio',icon:'🎧',children:[]},
          {id:'aplikasi',name:'Aplikasi',icon:'📦',children:[]},
          {id:'dokumen',name:'Dokumen',icon:'📄',children:[]},
          {id:'catatan',name:'Catatan',icon:'📝',children:[]}
      ];

const MEDIA_EXTS = {
    video: ['mp4','mkv','mov','avi','webm','3gp','flv','m4v'],
    audio: ['mp3','wav','ogg','m4a','aac','flac','wma'],
    image: ['jpeg','jpg','gif','png','webp','bmp','svg','ico','tiff'],
    text: ['txt','json','md','js','css','html','xml','log','csv'],
    app: ['apk','exe','dmg','iso','bat','sh','bin','msi'],
    archive: ['zip','rar','7z','tar','gz','bz2'],
    doc: ['pdf','doc','docx','xls','xlsx','ppt','pptx']
};

// ======================================================
// SECTION 2: GLOBAL STATE & SESSION VARIABLES
// ======================================================

// --- 2A. Auth & Security State ---
let googleUserName = null; 
let currentUser = null;
let currentRole = 'none';
let pinActionCallback = null, isChangingPin = false, pinChangeTarget = 'master', isForgotPinReset = false, isVerifyingOldPin = false;

// --- 2B. UI, Filter & View State ---
let isDarkMode = false;
let currentViewMode = localStorage.getItem('feathera_view_mode') || 'grid';
let currentSortOpt = localStorage.getItem('feathera_sort_opt') || 'year_desc';
let currentSourceFilter = 'all';
let curFilter = {l0:'all', l1:'all', l2:'all', l3:'all'};
let savedScrollY = 0;

// --- 2C. File, Folder & Editor State ---
let config = [], flatConfig = {}, tempMasterConfig = [];
let currentFolderId = null, activeSearchFolderName = null;
let editingCard = null, nodeToEdit = null, currentTextContent = "";
let uploadMode = 'file', isAddMediaMode = false, fileKameraTertunda = null;
window.targetPlaylistIndexForAdd = null;

// --- 2D. Interaction, Drag & Selection State ---
let isSelectionMode = false, isSelectingForGroup = false, targetGroupForSelection = null, activeHubungGroupId = null;
let dragSrcId = null;
let movePendingIds = [], isMovePending = false;
let isLongPressTriggered = false, pressTimer, swipeStartX = 0, swipeStartY = 0, isTicking = false;

// --- 2E. System Services & Caching ---
let dbInstance = null;
let ytPlayer = null, ytInterval = null;
let searchTimeout;
let _childrenCache = null, _childrenCacheTimer = null;
let _parentCache = null, _parentCacheTimer = null;

// ======================================================
// SECTION 3: STATIC UI ASSETS (SVG ICONS)
// ======================================================
const SVG_PLAY_CIRCLE = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>`,
      SVG_PAUSE_CIRCLE = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>`,
      SVG_TRASH = `<svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle;"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>`,
      SVG_DOWNLOAD = `<svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle;"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>`, 
      SVG_SHARE = `<svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle;"><circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line></svg>`,
      SVG_EDIT = `<svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle;"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>`,
      SVG_LYRICS = `<svg width="28px" height="28px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" d="M2.25 6C2.25 5.58579 2.58579 5.25 3 5.25H15C15.4142 5.25 15.75 5.58579 15.75 6C15.75 6.41421 15.4142 6.75 15 6.75H3C2.58579 6.75 2.25 6.41421 2.25 6ZM17 7.25C17.4142 7.25 17.75 7.58579 17.75 8C17.75 9.79493 19.2051 11.25 21 11.25C21.4142 11.25 21.75 11.5858 21.75 12C21.75 12.4142 21.4142 12.75 21 12.75C19.7428 12.75 18.5997 12.2616 17.75 11.4641V16.5C17.75 18.2949 16.2949 19.75 14.5 19.75C12.7051 19.75 11.25 18.2949 11.25 16.5C11.25 14.7051 12.7051 13.25 14.5 13.25C15.1443 13.25 15.7449 13.4375 16.25 13.7609V8C16.25 7.58579 16.5858 7.25 17 7.25ZM16.25 16.5C16.25 15.5335 15.4665 14.75 14.5 14.75C13.5335 14.75 12.75 15.5335 12.75 16.5C12.75 17.4665 13.5335 18.25 14.5 18.25C15.4665 18.25 16.25 17.4665 16.25 16.5ZM2.25 10C2.25 9.58579 2.58579 9.25 3 9.25H13C13.4142 9.25 13.75 9.58579 13.75 10C13.75 10.4142 13.4142 10.75 13 10.75H3C2.58579 10.75 2.25 10.4142 2.25 10ZM2.25 14C2.25 13.5858 2.58579 13.25 3 13.25H9C9.41421 13.25 9.75 13.5858 9.75 14C9.75 14.4142 9.41421 14.75 9 14.75H3C2.58579 14.75 2.25 14.4142 2.25 14ZM2.25 18C2.25 17.5858 2.58579 17.25 3 17.25H8C8.41421 17.25 8.75 17.5858 8.75 18C8.75 18.4142 8.41421 18.75 8 18.75H3C2.58579 18.75 2.25 18.4142 2.25 18Z" fill="#999"/></svg>`,
      SVG_COVER = `<svg width="24px" height="24px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M2 6C2 3.79086 3.79086 2 6 2H18C20.2091 2 22 3.79086 22 6V18C22 20.2091 20.2091 22 18 22H6C3.79086 22 2 20.2091 2 18V6Z" stroke="#999" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><circle cx="8.5" cy="8.5" r="2.5" stroke="#999" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M14.5262 12.6211L6 22H18.1328C20.2686 22 22 20.2686 22 18.1328V18C22 17.5335 21.8251 17.3547 21.5099 17.0108L17.4804 12.615C16.6855 11.7479 15.3176 11.7507 14.5262 12.6211Z" stroke="#999" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
      SVG_LOOP = `<svg viewBox="0 0 24 24"><path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z"/></svg>`,
      SVG_SHUFFLE = `<svg viewBox="0 0 24 24"><path d="M10.59 9.17L5.41 4 4 5.41l5.17 5.17 1.42-1.41zM14.5 4l2.04 2.04L4 18.59 5.41 20 17.96 7.46 20 9.5V4h-5.5zm.33 9.41l-1.41 1.41 3.13 3.13L14.5 20H20v-5.5l-2.04 2.04-3.13-3.13z"/></svg>`,
      SVG_ONE = `<svg viewBox="0 0 24 24"><path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4zm-4-2V9h-1l-2 1v1h1.5v4H13z"/></svg>`,
      SVG_EYE_OPEN = `<svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle;"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>`,
      SVG_EYE_CLOSED = `<svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle;"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>`,
      SVG_WRENCH = `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="pointer-events: none;"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path></svg>`,
      SVG_SELECT_ACTIVE = `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#4CAF50" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="pointer-events: none;"><circle cx="12" cy="12" r="10" fill="transparent"></circle><path d="M7 12.5l3.5 3.5 7-8"></path></svg>`,
      SVG_SELECT_INACTIVE = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="11" fill="#4CAF50"/><path d="M7 12.5L10.5 16L17 8" stroke="#ffffff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
      SVG_CANCEL = `<svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle;"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`,
      SVG_MORE_VERT = `<svg viewBox="0 0 24 24" style="width:18px;height:18px;fill:currentColor"><path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/></svg>`,
      SVG_TAB_NOTE = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>`,
      SVG_TAB_FILE = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>`,
      SVG_TAB_MEMORI = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>`,
      SVG_ICON_APK = `<svg class="feather-icon" viewBox="0 0 50 50"><use href="#icon-apk-def"></use></svg>`,
      SVG_ICON_EXE = `<svg class="feather-icon" width="24" height="24" viewBox="0 0 24 24"><use href="#icon-exe-def"></use></svg>`,
      SVG_ICON_PDF = `<svg style="margin-top:5px" width="44px" height="44px" viewBox="0 0 24 24"><use href="#icon-pdf-def"></use></svg>`,
      SVG_ICON_DOC_MS = `<svg width="50" height="48" viewBox="-0.12979372698077785 0 32.12979372698078 32"><use href="#icon-doc-ms-def"></use></svg>`,
      SVG_ICON_XLS = `<svg width="50" height="48" viewBox="-0.12979372698077785 0 32.12979372698078 32"><use href="#icon-xls-def"></use></svg>`,
      SVG_ICON_PPT = `<svg width="50" height="48" viewBox="-0.12979372698077785 0 32.152389301176754 32"><use href="#icon-ppt-def"></use></svg>`,
      SVG_ICON_DOC_FALLBACK = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" class="feather-icon"><path d="M14 2H6C4.9 2 4 2.9 4 4V20C4 21.1 4.9 22 6 22H18C19.1 22 20 21.1 20 20V8L14 2Z" fill="#757575"/><path d="M14 2V8H20" fill="#424242"/><path d="M8 13H16M8 17H16M8 9H11" stroke="white" stroke-width="2" stroke-linecap="round"/></svg>`,
      SVG_ICON_TXT = `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" class="feather-icon"><path d="M15 3H9C7.8954 3 7 3.8954 7 5V19C7 20.1046 7.8954 21 9 21H15C16.1046 21 17 20.1046 17 19V5C17 3.8954 16.1046 3 15 3Z" fill="#e0e0e0" stroke="#757575" stroke-width="1.5"/><line x1="9.5" y1="8.5" x2="14.5" y2="8.5" stroke="#9e9e9e" stroke-width="1.5" stroke-linecap="round"/><line x1="9.5" y1="12.5" x2="14.5" y2="12.5" stroke="#9e9e9e" stroke-width="1.5" stroke-linecap="round"/><line x1="9.5" y1="16.5" x2="12.5" y2="16.5" stroke="#9e9e9e" stroke-width="1.5" stroke-linecap="round"/><path d="M9 2V4M12 2V4M15 2V4" stroke="#616161" stroke-width="2" stroke-linecap="round"/></svg>`,
      SVG_ICON_DEFAULT = `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" class="feather-icon"><path d="M15 3H9C7.8954 3 7 3.8954 7 5V19C7 20.1046 7.8954 21 9 21H15C16.1046 21 17 20.1046 17 19V5C17 3.8954 16.1046 3 15 3Z" fill="#e0e0e0" stroke="#757575" stroke-width="1.5"/><line x1="9.5" y1="8.5" x2="14.5" y2="8.5" stroke="#9e9e9e" stroke-width="1.5" stroke-linecap="round"/><line x1="9.5" y1="12.5" x2="14.5" y2="12.5" stroke="#9e9e9e" stroke-width="1.5" stroke-linecap="round"/><line x1="9.5" y1="16.5" x2="12.5" y2="16.5" stroke="#9e9e9e" stroke-width="1.5" stroke-linecap="round"/><path d="M9 2V4M12 2V4M15 2V4" stroke="#616161" stroke-width="2" stroke-linecap="round"/></svg>`,
      SVG_ICON_ZIP = `<svg class="feather-icon" viewBox="0 0 24 24" fill="none" stroke="#9E9E9E" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"></rect><path d="M12 4v7"></path><path d="M10 11h4v4h-4z"></path></svg>`,
      SVG_ICON_VIDEO = `<svg version="1.1" id="Layer_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="44" height="44" x="20px" y="20px" viewBox="0 0 512 512" style="enable-background:new 0 0 512 512;" xml:space="preserve"><g><path d="M512,125.4h-52.2v52.2H512v52.2h-52.2v52.2H512v52.2h-52.2v52.2H512V418c0,5.6-2.1,10.4-6.3,14.6 c-4.2,4.2-9.1,6.3-14.6,6.3H20.9c-5.6,0-10.4-2.1-14.6-6.3C2.1,428.4,0,423.5,0,418v-31.3h52.2v-52.2H0v-52.2h52.2v-52.2H0v-52.2 h52.2v-52.2H0V94c0-6.3,2.1-11.3,6.3-15.2s9.1-5.7,14.6-5.7h470.2c5.6,0,10.4,1.9,14.6,5.7S512,87.8,512,94V125.4 M198.5,334.4 L329.1,256l-130.6-78.4V334.4" fill="rgba(180,180,180,0.3)"/></g></svg>`,
      SVG_ICON_AUDIO = `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" class="feather-icon" style="width: 50px; height: 50px;"><path d="M3 10V14" stroke="#29465B" stroke-width="1.2" stroke-linecap="round"/><path d="M6 7V17" stroke="#29465B" stroke-width="1.2" stroke-linecap="round"/><path d="M9 4V20" stroke="#29465B" stroke-width="1.2" stroke-linecap="round"/><path d="M12 9V15" stroke="#29465B" stroke-width="1.2" stroke-linecap="round"/><path d="M15 6V18" stroke="#29465B" stroke-width="1.2" stroke-linecap="round"/><path d="M18 10V14" stroke="#29465B" stroke-width="1.2" stroke-linecap="round"/><path d="M21 11V13" stroke="#29465B" stroke-width="1.2" stroke-linecap="round"/></svg>`,
      SVG_CHEVRON_UP = `<svg viewBox="0 0 24 24" width="24" height="24" fill="rgba(180,180,180,1)"><path d="M7.41 15.41L12 10.83l4.59 4.58L18 14l-6-6-6 6z"/></svg>`, 
      SVG_ICON_UNKNOWN = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather-icon" style="opacity:0.8;"><circle cx="12" cy="12" r="10"></circle><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>`,
      SVG_ICON_YOUTUBE = `<svg width="55" height="55" viewBox="0 0 24 24" style="filter: drop-shadow(0 1px 2px rgba(0,0,0,0.3));"><path fill="#FF0000" d="M21.58 7.19c-.23-.86-.91-1.54-1.77-1.77C18.25 5 12 5 12 5s-6.25 0-7.81.42c-.86.23-1.54.91-1.77 1.77C2 8.75 2 12 2 12s0 3.25.42 4.81c.23.86.91 1.54 1.77 1.77C5.75 19 12 19 12 19s6.25 0 7.81-.42c.86-.23 1.54-.91 1.77-1.77C22 15.25 22 12 22 12s0-3.25-.42-4.81z"/><path fill="#FFFFFF" d="M10 15V9l5.2 3-5.2 3z"/></svg>`,
      SVG_LINK = `<svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle;"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>`,
      SVG_UNLINK = `<svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle;"><path d="M18.84 12.25l1.72-1.71h-.01a5 5 0 0 0-7.07-7.07l-1.72 1.71v.01"></path><path d="M5.17 11.75l-1.71 1.71a5 5 0 0 0 7.07 7.07l1.71-1.71"></path><line x1="8" y1="2" x2="8" y2="5"></line><line x1="2" y1="8" x2="5" y2="8"></line><line x1="16" y1="19" x2="16" y2="22"></line><line x1="19" y1="16" x2="22" y2="16"></line></svg>`,
      SVG_FILTER_ALL = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon></svg>`,
      SVG_FILTER_LOCAL = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2h9l5 5v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z"></path><path d="M8 2v4"></path><path d="M12 2v4"></path><path d="M16 4v2"></path></svg>`,
      SVG_FILTER_ONLINE = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>`;
