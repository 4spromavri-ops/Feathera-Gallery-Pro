// --- INDEXED DB LOGIC ---
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
