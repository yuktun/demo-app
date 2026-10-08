export const MAX_CHUNK = 140;
export const SAMPLE = `第一章 雨到窗前
午後的雨落在窗台上，一滴接着一滴。阿澄把書翻到上次折角的一頁，卻沒有急着讀下去。
街角的麵包店亮起暖黃的燈。有人收起雨傘，有人慢慢走過，整條街像是把腳步放輕了。
她泡了一杯茶，坐回窗邊。今天還有很多事情未做，但這一刻，她只想聽一個故事。

第二章 留一盞燈
祖母以前說，雨天最適合讀書。字句不需要趕路，只要沿着聲音，一句一句地走。
阿澄想起那間小小的舊屋。木椅旁總有一盞燈，晚飯後，祖母就坐在那裏，把報紙上的故事讀給她聽。
如今窗外是另一條街，身旁是另一張椅子。可是一個溫柔的聲音，仍然能讓陌生的地方變成家。

第三章 下一頁
雨停的時候，茶也涼了。遠處傳來巴士靠站的聲音，傍晚的城市重新熱鬧起來。
阿澄沒有急着關上書。她把最後一句再讀一遍，在心裏留一個小小的記號。
故事可以在這裏暫停。下一次回來，下一頁還在等她。`;
const CN_NUMBER = '零〇一二三四五六七八九十百千萬万兩两壹貳贰參叁肆伍陸陆柒捌玖拾佰仟廿卅';
const chapterPattern = new RegExp(`^(?:第[\\s${CN_NUMBER}0-9０-９]+[章回節节卷部篇集](?:[\\s:：、.．—－-].*|[^章回節节卷部篇集\\d]{0,55})?|(?:Chapter|CHAPTER)\\s+\\d+(?:\\s.*)?|(?:序章|序言|楔子|引子|前言|後記|后记|尾聲|尾声|終章|终章|番外)(?:[\\s:：、—－-].*)?)$`, 'i');
export function normalizeText(text) {
  if (typeof text !== 'string') throw new Error('請匯入文字檔案。');
  return text.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n').replace(/\u0000/g, '').trim();
}
export function splitSegments(text, max = MAX_CHUNK) {
  const result = [];
  for (const paragraph of text.split(/\n+/).map(s=>s.trim()).filter(Boolean)) {
    let rest = paragraph;
    while (rest.length) {
      let cut = Math.min(max, rest.length);
      if (cut < rest.length) {
        const head = rest.slice(0, cut);
        const punctuation = [...head.matchAll(/[。！？!?；;，,、：:\s]/g)].filter(m=>m.index >= Math.floor(max * .3));
        if (punctuation.length) cut = punctuation.at(-1).index + 1;
        if (/^[\uDC00-\uDFFF]$/.test(rest[cut])) cut--;
      }
      const piece=rest.slice(0,cut).trim();
      if(piece) result.push({text:piece, paragraphEnd:cut>=rest.length});
      rest=rest.slice(cut).trimStart();
    }
  }
  return result;
}
export function parseBook(text, title = '未命名的書') {
  const normalized = normalizeText(text);
  if (!normalized) throw new Error('檔案沒有可閱讀的文字。');
  if (normalized.length > 8000000) throw new Error('這本書太大，請分成少於 800 萬字的文字檔。');
  if ((normalized.match(/\uFFFD/g)||[]).length > Math.max(3,normalized.length*.005)) throw new Error('文字似乎有亂碼，請選擇另一種編碼再匯入。');
  const lines = normalized.split('\n');
  const raw=[]; let current={title:'開始閱讀',lines:[]};
  const flush=()=>{ if(current.lines.some(s=>s.trim())) raw.push(current); };
  for(const line of lines) {
    const trimmed=line.trim().replace(/^#{1,6}\s+/, '');
    if(trimmed.length<=80 && chapterPattern.test(trimmed)) {
      flush(); current={title:trimmed,lines:[]};
    } else current.lines.push(line);
  }
  flush();
  // A heading with no body is still readable, including an all-heading file.
  if(!raw.length) raw.push({title:'開始閱讀',lines:[normalized]});
  const chapters=raw.map((ch,i)=>({id:i,title:ch.title,segments:splitSegments(ch.lines.join('\n'))})).filter(ch=>ch.segments.length);
  const count=chapters.reduce((n,ch)=>n+ch.segments.length,0);
  return {title:String(title||'未命名的書').replace(/\.(txt|md)$/i,'').slice(0,120),text:normalized,chapters,count,characters:normalized.length};
}
export function clampPosition(book, position={}) {
  const chapter = Math.max(0,Math.min(book.chapters.length-1,Number.isInteger(position.chapter)?position.chapter:0));
  const segment = Math.max(0,Math.min(book.chapters[chapter].segments.length-1,Number.isInteger(position.segment)?position.segment:0));
  return {chapter,segment};
}
export function nextPosition(book,pos,direction=1) {
  const {chapter,segment}=clampPosition(book,pos);
  if(direction>0) {
    if(segment+1<book.chapters[chapter].segments.length) return {chapter,segment:segment+1};
    if(chapter+1<book.chapters.length) return {chapter:chapter+1,segment:0};
  } else {
    if(segment>0) return {chapter,segment:segment-1};
    if(chapter>0) return {chapter:chapter-1,segment:book.chapters[chapter-1].segments.length-1};
  }
  return null;
}
export function bookProgress(book,pos,ended=false) {
  if(ended) return 100;
  return Math.round(100*(book.chapters.slice(0,pos.chapter).reduce((n,ch)=>n+ch.segments.length,0)+pos.segment)/book.count);
}
export function localChineseVoices(voices) {
  return voices.filter(v=>v.localService===true && /^(zh|yue|cmn)([-_]|$)/i.test(v.lang));
}
export function chooseVoice(voices,saved='') {
  const allowed=localChineseVoices(voices);
  return allowed.find(v=>v.voiceURI===saved) || allowed.find(v=>/^zh[-_]HK|^yue/i.test(v.lang)) || allowed.find(v=>v.default) || allowed[0] || null;
}
export class SpeechPlayer {
  constructor({synth,Utterance,getVoice,getRate,onChange=()=>{},onPosition=()=>{},onError=()=>{},setTimer=setTimeout,clearTimer=clearTimeout}) {
    Object.assign(this,{synth,Utterance,getVoice,getRate,onChange,onPosition,onError,setTimer,clearTimer});
    this.epoch=0;this.state='idle';this.current=null;this.timer=null;this.boundary=0;this.resumeOffset=0;this.book=null;this.pos={chapter:0,segment:0};
  }
  emit(state) { this.state=state;this.onChange(state); }
  invalidate() { this.epoch++; if(this.timer!==null)this.clearTimer(this.timer);this.timer=null;this.current=null;try{this.synth?.cancel();}catch{} }
  load(book,pos) { this.invalidate();this.book=book;this.pos=clampPosition(book,pos);this.resumeOffset=0;this.boundary=0;this.onPosition(this.pos);this.emit('idle'); }
  play() {
    if(!this.book) return;
    if(!this.synth||!this.Utterance){this.onError('這個瀏覽器未支援語音朗讀。你仍可閱讀文字。');return;}
    const voice=this.getVoice();
    if(!voice||voice.localService!==true||!localChineseVoices([voice]).length){this.onError('未找到可用的裝置中文語音，請在語音設定查看說明。');return;}
    if(this.state==='playing'||this.state==='loading')return;
    if(this.state==='ended'){this.pos={chapter:0,segment:0};this.resumeOffset=0;this.onPosition(this.pos);}
    this.invalidate();this.emit('loading');this.speak(this.epoch);
  }
  speak(epoch) {
    if(epoch!==this.epoch)return;
    const voice=this.getVoice();
    if(!voice||voice.localService!==true){this.fail('裝置語音已不可用。請重新選擇語音。',epoch);return;}
    const full=this.book.chapters[this.pos.chapter].segments[this.pos.segment].text;
    this.resumeOffset=Math.max(0,Math.min(this.resumeOffset,full.length-1));
    const startOffset=this.resumeOffset;
    const utterance=new this.Utterance(full.slice(startOffset));
    this.current=utterance;this.boundary=startOffset;
    utterance.voice=voice;utterance.lang=voice.lang;utterance.rate=this.getRate();utterance.pitch=1;utterance.volume=1;
    const valid=()=>epoch===this.epoch&&this.current===utterance;
    const watchdog=()=>{ if(valid())this.fail('朗讀似乎中斷了。位置已保留，按播放可繼續。',epoch); };
    // No boundary-event dependence: some engines never emit one. The generous
    // whole-utterance timeout also covers slow rates without duplicate auto-retry.
    this.timer=this.setTimer(watchdog,Math.max(45000,utterance.text.length/Math.max(.5,utterance.rate)*1200+15000));
    utterance.onstart=()=>{if(valid())this.emit('playing');};
    utterance.onboundary=e=>{if(valid()&&Number.isFinite(e.charIndex)) this.boundary=Math.max(this.boundary,startOffset,Math.min(full.length-1,startOffset+Math.floor(e.charIndex)));};
    utterance.onend=()=>{
      if(!valid())return;
      this.clearTimer(this.timer);this.timer=null;this.current=null;this.resumeOffset=0;this.boundary=0;
      const next=nextPosition(this.book,this.pos);
      if(!next){this.emit('ended');this.onPosition(this.pos);return;}
      this.pos=next;this.onPosition(this.pos);this.speak(epoch);
    };
    utterance.onerror=e=>{ if(valid())this.fail(e.error==='not-allowed'?'瀏覽器未允許播放。請再次按播放，並保持頁面開啟。':'朗讀中斷了。位置已保留，按播放可重試。',epoch); };
    try { this.synth.speak(utterance); }catch{this.fail('未能啟動語音。請重新選擇語音後再試。',epoch);}
  }
  fail(message,epoch){if(epoch!==this.epoch)return;this.resumeOffset=this.boundary;this.invalidate();this.emit('paused');this.onError(message);}
  pause(){ if(!['playing','loading'].includes(this.state))return; this.resumeOffset=this.boundary;this.invalidate();this.emit('paused'); }
  stop(){this.invalidate();this.resumeOffset=0;this.boundary=0;this.emit('idle');}
  seek(pos,keepPlaying=false){this.invalidate();this.pos=clampPosition(this.book,pos);this.resumeOffset=0;this.boundary=0;this.onPosition(this.pos);this.emit('paused');if(keepPlaying)this.play();}
  step(direction){const next=nextPosition(this.book,this.pos,direction);if(next)this.seek(next,['playing','loading'].includes(this.state));}
  reconfigure(){if(['playing','loading'].includes(this.state)){this.pause();this.play();}}
}
