export class LocalStore {
  constructor(factory) { this.factory = factory; this.revision = 0; }
  async open() {
    this.db = await new Promise((resolve, reject) => {
      const r = (this.factory || globalThis.indexedDB).open('keyboard-practice-v1', 1);
      r.onupgradeneeded = () => r.result.createObjectStore('practice');
      r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error);
      r.onblocked = () => reject(new Error('儲存空間被另一分頁佔用。'));
    });
    this.db.onversionchange = () => this.db.close();
    return new Promise((resolve, reject) => {
      const r = this.db.transaction('practice').objectStore('practice').get('state');
      r.onsuccess = () => { this.revision = r.result?.revision || 0; resolve(r.result?.state || null); }; r.onerror = () => reject(r.error);
    });
  }
  save(state) {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction('practice', 'readwrite'), store = tx.objectStore('practice');
      let conflict = false;
      const r = store.get('state');
      r.onsuccess = () => {
        if ((r.result?.revision || 0) !== this.revision) { conflict = true; tx.abort(); return; }
        try { store.put({ revision: this.revision + 1, state }, 'state'); }
        catch { tx.abort(); }
      };
      tx.oncomplete = () => { this.revision++; resolve(); };
      tx.onabort = tx.onerror = () => reject(new Error(conflict ? '另一分頁已更新資料。請先匯出本頁備份，再重新整理。' : '本機儲存失敗。請立即匯出備份；重新整理可能遺失本次更改。'));
    });
  }
}
