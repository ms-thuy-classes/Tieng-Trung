// ======================= BIẾN TOÀN CỤC =======================
let vocab = [];
let currentCard = 0, isFlipped = false;
let learnedSet = new Set();
let currentGame = null, gameQuestions = [], gameCurrentQ = 0, gameCorrect = 0, gameAnswered = false;
let scores = {};
let matchPairs = [], matchSelectedWord = null, matchSelectedMeaning = null, matchScore = 0, matchTotal = 0;
let currentLessonId = null;

// ======================= HÀM TIỆN ÍCH =======================
function shuffle(arr) { for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; } return arr; }
function speak(text, isChinese = true) { if (!window.speechSynthesis) return; window.speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(text); u.lang = isChinese ? 'zh-CN' : 'vi'; u.rate = 0.8; window.speechSynthesis.speak(u); }
function speakWord() { if(vocab[currentCard]) speak(vocab[currentCard].word); }
function speakSentence() { if(vocab[currentCard]) speak(formatExampleText(vocab[currentCard].example)); }
function formatExampleText(example) { return example.replace(/_([^_]+)_/g, '$1'); }
function formatExampleHTML(example) { return example.replace(/_([^_]+)_/g, '<span class="collocation">$1</span>'); }

// ======================= RENDER FLASHCARD & TABLE =======================
function renderCard() {
  if(!vocab.length) return;
  const v = vocab[currentCard];
  document.getElementById('cardWord').textContent = v.word;
  document.getElementById('cardIpa').textContent = v.ipa;
  document.getElementById('cardMeaning').textContent = v.meaning;
  document.getElementById('cardExample').innerHTML = formatExampleHTML(v.example);
  document.getElementById('cardExamplePinyin').innerHTML = `<span class="pinyin-text">📢 ${v.examplePinyin}</span>`;
  document.getElementById('cardExampleVi').textContent = v.exampleVi;
  document.getElementById('cardProgress').textContent = `${currentCard+1}/${vocab.length}`;
  document.getElementById('cardProgressBar').style.width = `${((currentCard+1)/vocab.length)*100}%`;
  const lb = document.getElementById('learnedBtn');
  if(learnedSet.has(v.word)) { lb.textContent = '✓ Đã thuộc'; lb.className = 'px-5 py-2.5 rounded-full bg-gradient-to-r from-gray-200 to-gray-300 text-gray-500 font-black text-sm shadow transition hover:scale-105'; }
  else { lb.textContent = '✓ Đánh dấu thuộc'; lb.className = 'px-5 py-2.5 rounded-full bg-gradient-to-r from-green-300 to-teal-300 hover:from-green-400 hover:to-teal-400 text-white font-black text-sm shadow transition hover:scale-105'; }
  if(isFlipped) { isFlipped = false; document.getElementById('flashcardInner').classList.remove('flipped'); }
}
function flipCard() { isFlipped = !isFlipped; document.getElementById('flashcardInner').classList.toggle('flipped', isFlipped); if(isFlipped) speakWord(); }
function nextCard() { if(vocab.length) { currentCard = (currentCard+1)%vocab.length; renderCard(); } }
function prevCard() { if(vocab.length) { currentCard = (currentCard-1+vocab.length)%vocab.length; renderCard(); } }
function markLearned() {
  if(!vocab.length) return;
  let w = vocab[currentCard].word;
  if(learnedSet.has(w)) learnedSet.delete(w);
  else learnedSet.add(w);
  localStorage.setItem(`learned_${currentLessonId}`, JSON.stringify([...learnedSet]));
  renderCard();
  filterTable();
}

function renderTable(filter='all', search='') {
  if(!vocab.length) return;
  const tbody = document.getElementById('vocabTableBody');
  if(!tbody) return;
  tbody.innerHTML = '';
  let filtered = vocab.filter(v => (v.word.toLowerCase().includes(search.toLowerCase()) || v.meaning.toLowerCase().includes(search.toLowerCase())) && (filter==='all' || (filter==='learned' && learnedSet.has(v.word)) || (filter==='unlearned' && !learnedSet.has(v.word))));
  filtered.forEach((v) => {
    let tr = document.createElement('tr');
    tr.innerHTML = `<td class="px-4 py-3 font-bold text-gray-400">${vocab.indexOf(v)+1}</td>
    <td class="px-4 py-3"><div class="flex items-center gap-2"><span class="hanzi-cell text-purple-700">${v.word}</span><button onclick="speak('${v.word}')" class="text-purple-300 hover:text-purple-500 ml-1">🔊</button>${learnedSet.has(v.word)?'<span class="text-xs bg-green-100 text-green-600 px-2 rounded-full ml-1">✓</span>':''}</div></td>
    <td class="px-4 py-3 text-blue-500 font-mono text-sm">${v.ipa}</td>
    <td class="px-4 py-3 font-semibold text-gray-600">${v.meaning}</td>
    <td class="px-4 py-3"><div class="italic text-gray-700">${formatExampleHTML(v.example)}</div><div class="text-xs text-gray-400 font-mono mt-1">${v.examplePinyin}</div><div class="text-xs text-gray-500">${v.exampleVi}</div></td>`;
    tbody.appendChild(tr);
  });
}
function filterTable() { renderTable(document.getElementById('filterSelect')?.value || 'all', document.getElementById('searchInput')?.value || ''); }

// ======================= CÁC TRÒ CHƠI =======================
function openGame(type) {
  if(!vocab.length) return;
  currentGame = type; gameCurrentQ = 0; gameCorrect = 0; gameAnswered = false;
  gameQuestions = shuffle([...vocab]);
  document.getElementById('gameTitle').innerHTML = { quiz:'📝 Trắc nghiệm', listenWord:'🎧 Nghe từ', typing:'⌨️ Gõ từ', matching:'🔗 Ghép cặp', listenSentence:'🎙️ Nghe câu' }[type];
  if(type === 'matching') startMatching();
  else { document.getElementById('gameProgressWrap').style.display = 'block'; renderGameQuestion(); }
  document.getElementById('gameModal').classList.add('active');
}
function closeModal() { document.getElementById('gameModal').classList.remove('active'); window.speechSynthesis?.cancel(); }
function updateGameProgress() { let total = gameQuestions.length; document.getElementById('gameProgressLabel').innerHTML = `Câu ${Math.min(gameCurrentQ+1,total)}/${total}`; document.getElementById('gameScoreLabel').innerHTML = `Đúng: ${gameCorrect}`; document.getElementById('gameProgressBar').style.width = `${((gameCurrentQ)/total)*100}%`; }
function renderGameQuestion() { if(gameCurrentQ >= gameQuestions.length) { showGameSummary(); return; } updateGameProgress(); gameAnswered = false; let q = gameQuestions[gameCurrentQ]; if(currentGame === 'quiz') renderQuizQ(q); else if(currentGame === 'listenWord') renderListenWordQ(q); else if(currentGame === 'typing') renderTypingQ(q); else if(currentGame === 'listenSentence') renderListenSentenceQ(q); }
function renderQuizQ(q) { let exampleHTML = q.example.replace(/_([^_]+)_/g, '<span class="bg-purple-100 border-b-2 border-dashed border-purple-400 px-2 rounded font-bold">___</span>'); let opts = shuffle([q.word, ...shuffle(vocab.filter(v=>v.word!==q.word)).slice(0,3).map(v=>v.word)]); document.getElementById('gameContent').innerHTML = `<div><p class="text-sm font-bold">Điền từ phù hợp:</p><div class="bg-purple-50 p-4 rounded-2xl my-3 italic">${exampleHTML}</div><div class="flex items-center gap-2 mb-3"><button onclick="toggleQuizHint(this,'${q.examplePinyin.replace(/'/g,"\\'")}')" class="quiz-hint-btn flex items-center gap-1.5 px-3 py-1.5 rounded-full border-2 border-dashed border-purple-300 bg-white text-purple-400 font-bold text-xs hover:border-purple-500 hover:text-purple-600 transition"><span>💡</span><span>Xem phiên âm</span></button><span id="hintText" class="text-xs text-blue-400 font-mono hidden"></span></div><div id="optionGrid" class="grid grid-cols-2 gap-2">${opts.map((opt,i)=>`<button class="option-btn" onclick="checkQuiz('${opt}','${q.word}',this)">${opt}</button>`).join('')}</div><div id="feedbackArea"></div></div>`; }
window.toggleQuizHint = function(btn, pinyin) { let hint = document.getElementById('hintText'); if(hint.classList.contains('hidden')){ hint.textContent = pinyin; hint.classList.remove('hidden'); btn.innerHTML = '<span>💡</span><span>Ẩn phiên âm</span>'; btn.classList.add('border-purple-500','text-purple-600'); } else { hint.classList.add('hidden'); btn.innerHTML = '<span>💡</span><span>Xem phiên âm</span>'; btn.classList.remove('border-purple-500','text-purple-600'); } };
window.checkQuiz = function(chosen, correct, btn) { if(gameAnswered) return; gameAnswered=true; let all=document.querySelectorAll('#optionGrid .option-btn'); all.forEach(b=>b.disabled=true); if(chosen===correct){ btn.classList.add('correct'); gameCorrect++; playSound(true); } else { btn.classList.add('wrong'); playSound(false); all.forEach(b=>{ if(b.innerText===correct) b.classList.add('correct'); }); } showFeedback(chosen===correct, gameQuestions[gameCurrentQ]); };
function renderListenWordQ(q) { let opts = shuffle([q.word, ...shuffle(vocab.filter(v=>v.word!==q.word)).slice(0,3).map(v=>v.word)]); document.getElementById('gameContent').innerHTML = `<div><div class="flex justify-center"><button onclick="speak('${q.word}')" class="w-24 h-24 rounded-full bg-blue-200 flex flex-col items-center justify-center"><span class="text-3xl">🎧</span><span class="text-xs">Nghe</span></button></div><div id="optionGrid" class="grid grid-cols-2 gap-2 mt-4">${opts.map(opt=>`<button class="option-btn" onclick="checkListenWord('${opt}','${q.word}',this)">${opt}</button>`).join('')}</div><div id="feedbackArea"></div></div>`; setTimeout(()=>speak(q.word),300); }
window.checkListenWord = function(chosen, correct, btn) { if(gameAnswered) return; gameAnswered=true; let all=document.querySelectorAll('#optionGrid .option-btn'); all.forEach(b=>b.disabled=true); if(chosen===correct){ btn.classList.add('correct'); gameCorrect++; playSound(true); } else { btn.classList.add('wrong'); playSound(false); all.forEach(b=>{ if(b.innerText===correct) b.classList.add('correct'); }); } showFeedback(chosen===correct, gameQuestions[gameCurrentQ]); };
function renderTypingQ(q) { document.getElementById('gameContent').innerHTML = `<div><div class="bg-yellow-50 p-5 rounded-2xl text-center"><p class="font-black text-2xl">${q.meaning}</p><p class="text-sm text-blue-500">${q.ipa}</p></div><input id="typingInput" type="text" placeholder="Nhập chữ Hán..." class="w-full mt-4 p-3 border rounded-2xl"><button onclick="checkTyping('${q.word}')" class="w-full mt-3 py-2 bg-yellow-400 rounded-2xl font-bold">Kiểm tra</button><div id="feedbackArea"></div></div>`; setTimeout(()=>document.getElementById('typingInput')?.focus(),50); }
window.checkTyping = function(correct) { if(gameAnswered) return; let input = document.getElementById('typingInput'); if(!input) return; let val = input.value.trim(); gameAnswered=true; input.disabled=true; let isCorrect = val === correct; if(isCorrect) gameCorrect++; playSound(isCorrect); showFeedback(isCorrect, gameQuestions[gameCurrentQ]); };
function renderListenSentenceQ(q) { let sentenceRaw = formatExampleText(q.example); document.getElementById('gameContent').innerHTML = `<div><div class="flex justify-center"><button onclick="speak('${sentenceRaw.replace(/'/g,"\\'")}')" class="w-24 h-24 rounded-full bg-pink-200 flex flex-col items-center justify-center"><span class="text-3xl">🎙️</span><span>Nghe câu</span></button></div><textarea id="sentenceInput" rows="3" placeholder="Gõ lại câu tiếng Trung..." class="w-full mt-4 p-3 border rounded-2xl"></textarea><button onclick="checkSentence('${sentenceRaw.replace(/'/g,"\\'")}')" class="w-full mt-3 py-2 bg-pink-400 rounded-2xl font-bold">Kiểm tra</button><div id="feedbackArea"></div></div>`; setTimeout(()=>speak(sentenceRaw),500); }
function sentenceSimilarity(a, b) {
    a = a.trim().replace(/\s+/g, "");
    b = b.trim().replace(/\s+/g, "");

    const m = a.length;
    const n = b.length;

    if (m === 0 && n === 0) return 1;

    const dp = Array.from({ length: m + 1 }, () =>
        Array(n + 1).fill(0)
    );

    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;

    for (let i = 1; i <= m; i++) {
        for (let j = 1; j <= n; j++) {
            const cost = a[i - 1] === b[j - 1] ? 0 : 1;

            dp[i][j] = Math.min(
                dp[i - 1][j] + 1,
                dp[i][j - 1] + 1,
                dp[i - 1][j - 1] + cost
            );
        }
    }

    const distance = dp[m][n];
    return 1 - distance / Math.max(m, n);
}

window.checkSentence = function(correctRaw) {
    if(gameAnswered) return;

    let input = document.getElementById('sentenceInput');
    if(!input) return;

    let user = input.value.trim();

    // Tính mức độ giống nhau
    let similarity = sentenceSimilarity(user, correctRaw);

    // Đúng nếu giống từ 70% trở lên
    let isCorrect = similarity >= 0.70;

    gameAnswered = true;

    if(isCorrect) gameCorrect++;

    playSound(isCorrect);
    showFeedback(isCorrect, gameQuestions[gameCurrentQ]);
};
function showFeedback(correct, q) { let fb = document.getElementById('feedbackArea'); fb.innerHTML = `<div class="${correct?'feedback-correct':'feedback-wrong'}"><div class="font-bold">${correct?'✓ Chính xác!':'✗ Sai'}</div><div class="font-bold text-base">${q.word} (${q.ipa})</div><div class="text-sm">${q.meaning}</div><div class="italic text-sm mt-1">${formatExampleHTML(q.example)}</div><div class="text-xs text-gray-500">${q.examplePinyin}</div><div class="text-xs">${q.exampleVi}</div><button onclick="nextGameQuestion()" class="mt-2 w-full py-2 bg-purple-500 text-white rounded-xl font-bold">Tiếp theo</button></div>`; }
function nextGameQuestion() { gameCurrentQ++; if(gameCurrentQ >= gameQuestions.length) showGameSummary(); else renderGameQuestion(); }
function showGameSummary() { let total = gameQuestions.length; let pct = Math.round((gameCorrect/total)*100); scores[currentGame] = { correct: gameCorrect, total }; localStorage.setItem(`scores_${currentLessonId}`, JSON.stringify(scores)); updateScoreDisplay(); document.getElementById('gameContent').innerHTML = `<div class="text-center"><div class="text-5xl">${pct>=80?'🏆':'😊'}</div><h3 class="font-black text-2xl">Kết quả: ${gameCorrect}/${total} (${pct}%)</h3><div class="w-full h-3 bg-gray-200 rounded-full mt-3"><div style="width:${pct}%" class="h-full bg-purple-500 rounded-full"></div></div><button onclick="closeModal()" class="mt-5 px-6 py-2 bg-purple-500 text-white rounded-full">Đóng</button><button onclick="openGame('${currentGame}')" class="ml-2 px-6 py-2 bg-white border rounded-full">Chơi lại</button></div>`; document.getElementById('gameProgressWrap').style.display = 'block'; document.getElementById('gameProgressBar').style.width='100%'; }
function startMatching() { matchSelectedWord=null; matchSelectedMeaning=null; matchScore=0; matchTotal=0; matchPairs = shuffle([...vocab]).slice(0,12); document.getElementById('gameProgressWrap').style.display='none'; renderMatchingBoard(); }
function renderMatchingBoard() { let words = shuffle([...matchPairs]), meanings = shuffle([...matchPairs]); document.getElementById('gameContent').innerHTML = `<div><div class="flex gap-3"><div class="flex-1 space-y-2" id="wordCol">${words.map(p=>`<div class="match-item match-word" data-word="${p.word}" onclick="selectMatch('word','${p.word}')">${p.word}</div>`).join('')}</div><div class="flex-1 space-y-2" id="meaningCol">${meanings.map(p=>`<div class="match-item match-meaning" data-meaning="${p.word}" onclick="selectMatch('meaning','${p.word}')">${p.meaning}</div>`).join('')}</div></div><div id="matchStatus" class="text-center mt-4 font-bold"></div></div>`; }
window.selectMatch = function(type, key) {
  if(type==='word'){ if(matchSelectedWord) document.querySelector(`.match-word[data-word="${matchSelectedWord}"]`)?.classList.remove('selected'); matchSelectedWord=key; document.querySelector(`.match-word[data-word="${key}"]`)?.classList.add('selected'); }
  else { if(matchSelectedMeaning) document.querySelector(`.match-meaning[data-meaning="${matchSelectedMeaning}"]`)?.classList.remove('selected'); matchSelectedMeaning=key; document.querySelector(`.match-meaning[data-meaning="${key}"]`)?.classList.add('selected'); }
  if(matchSelectedWord && matchSelectedMeaning) { matchTotal++; if(matchSelectedWord === matchSelectedMeaning) { let wEl = document.querySelector(`.match-word[data-word="${matchSelectedWord}"]`); let mEl = document.querySelector(`.match-meaning[data-meaning="${matchSelectedMeaning}"]`); if(wEl && mEl) { wEl.remove(); mEl.remove(); matchScore++; playSound(true); document.getElementById('matchStatus').innerHTML='✓ Đúng! +1'; if(document.querySelectorAll('#wordCol .match-item').length===0) { gameCorrect=matchScore; gameQuestions=Array(matchTotal).fill(null); setTimeout(()=>showMatchSummary(),600); } } } else { let wEl = document.querySelector(`.match-word[data-word="${matchSelectedWord}"]`); let mEl = document.querySelector(`.match-meaning[data-meaning="${matchSelectedMeaning}"]`); if(wEl && mEl) { wEl.classList.add('matched-wrong'); mEl.classList.add('matched-wrong'); playSound(false); document.getElementById('matchStatus').innerHTML='✗ Sai, thử lại'; setTimeout(()=>{ wEl?.classList.remove('matched-wrong','selected'); mEl?.classList.remove('matched-wrong','selected'); document.getElementById('matchStatus').innerHTML=''; },800); } } matchSelectedWord=null; matchSelectedMeaning=null; } };
function showMatchSummary() { let pct=matchTotal?Math.round((matchScore/matchTotal)*100):0; scores.matching={correct:matchScore,total:matchTotal}; localStorage.setItem(`scores_${currentLessonId}`, JSON.stringify(scores)); updateScoreDisplay(); document.getElementById('gameContent').innerHTML=`<div class="text-center"><div class="text-6xl">🏆</div><h3 class="font-black">Kết quả ghép cặp: ${matchScore}/${matchTotal}</h3><button onclick="closeModal()" class="mt-4 px-6 py-2 bg-purple-500 text-white rounded-full">Đóng</button><button onclick="openGame('matching')" class="ml-2 px-6 py-2 bg-white border rounded-full">Chơi lại</button></div>`; }
function updateScoreDisplay() {
  ['quiz','listenWord','typing','matching','listenSentence'].forEach(k=>{
    let el=document.getElementById(`score-${k}`);
    if(el && scores[k]) el.textContent=`${scores[k].correct}/${scores[k].total} (${Math.round((scores[k].correct/scores[k].total)*100)}%)`;
    else if(el) el.textContent='';
  });
}
function playSound(correct) { try{ let ctx=new (window.AudioContext||window.webkitAudioContext)(); let o=ctx.createOscillator(); let g=ctx.createGain(); o.connect(g); g.connect(ctx.destination); correct?(o.frequency.setValueAtTime(600,ctx.currentTime),o.frequency.setValueAtTime(900,ctx.currentTime+0.1)):(o.frequency.setValueAtTime(250,ctx.currentTime),o.frequency.setValueAtTime(180,ctx.currentTime+0.15)); g.gain.setValueAtTime(0.15,ctx.currentTime); g.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+0.3); o.start(ctx.currentTime); o.stop(ctx.currentTime+0.3); } catch(e){} }
function showSummary() {
  let keys=['quiz','listenWord','typing','matching','listenSentence'], names={quiz:'Trắc nghiệm',listenWord:'Nghe từ',typing:'Gõ từ',matching:'Ghép cặp',listenSentence:'Nghe câu'}, colors={quiz:'#a78bfa',listenWord:'#60a5fa',typing:'#fbbf24',matching:'#34d399',listenSentence:'#f472b6'};
  let played=keys.filter(k=>scores[k]);
  if(!played.length){ document.getElementById('summaryContent').innerHTML='<p class="text-sm">Chưa có dữ liệu. Hãy chơi ít nhất 1 trò chơi!</p>'; return; }
  let totalCorrect=0,totalQ=0; played.forEach(k=>{totalCorrect+=scores[k].correct; totalQ+=scores[k].total;});
  let avgPct=totalQ?Math.round((totalCorrect/totalQ)*100):0;
  let pieData=played.map(k=>({name:names[k],pct:Math.round((scores[k].correct/scores[k].total)*100),color:colors[k]}));
  let r=60,cx=70,cy=70; let offset=0,circ=2*Math.PI*r;
  let slices=pieData.map(d=>{let dash=(d.pct/100)*circ; let s=`<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${d.color}" stroke-width="14" stroke-dasharray="${dash} ${circ-dash}" stroke-dashoffset="${-offset*circ/100}" transform="rotate(-90 ${cx} ${cy})" opacity="0.85"/>`; offset+=d.pct/pieData.length; return s; });
  let pieSVG=`<svg width="140" height="140" viewBox="0 0 140 140"><circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#f3f4f6" stroke-width="14"/>${slices.join('')}<text x="${cx}" y="${cy-4}" text-anchor="middle" font-weight="900" font-size="20" fill="#7c3aed">${avgPct}%</text><text x="${cx}" y="${cy+14}" text-anchor="middle" font-size="10" fill="#9ca3af">chính xác</text></svg>`;
  let gameRows=keys.map(k=>{if(!scores[k]) return `<tr><td class="p-2 font-bold">${names[k]}</td><td class="p-2 text-gray-300">Chưa chơi</td>`; let p=Math.round((scores[k].correct/scores[k].total)*100); return `<tr><td class="p-2 font-bold" style="color:${colors[k]}">${names[k]}</td><td class="p-2 font-black">${scores[k].correct}/${scores[k].total} (${p}%)</td>`;}).join('');
  document.getElementById('summaryContent').innerHTML=`<div class="flex flex-col sm:flex-row gap-4 items-center"><div>${pieSVG}</div><div><table class="w-full">${gameRows}</table></div></div>`;
}

// ======================= TEST MODULE =======================
let testQuestions = [];
let testCurrentIdx = 0;
let testCorrectCount = 0;
let testStudentName = '';
let testResults = []; // {q, correct, userAnswer}

// Sort question state
let sortAnswerArr = [];
let sortPoolArr = [];
let sortAnswered = false;

function openTestScreen() {
  if(!vocab.length) return;
  document.getElementById('testOverlay').classList.add('show');
  document.getElementById('testNameScreen').style.display = 'flex';
  document.getElementById('testQuestionScreen').style.display = 'none';
  document.getElementById('testSummaryScreen').style.display = 'none';
  document.getElementById('testSubtitle').textContent = `${vocab.length} từ vựng · ${vocab.length} câu hỏi`;
  document.getElementById('testStudentName').value = '';
}

function closeTest() {
  document.getElementById('testOverlay').classList.remove('show');
}

function confirmExitTest() {
  if(confirm('Thoát bài kiểm tra? Kết quả sẽ không được lưu.')) closeTest();
}

function restartTest() {
  document.getElementById('testNameScreen').style.display = 'flex';
  document.getElementById('testQuestionScreen').style.display = 'none';
  document.getElementById('testSummaryScreen').style.display = 'none';
}

function startTest() {
  let name = document.getElementById('testStudentName').value.trim();
  if(!name) { document.getElementById('testStudentName').focus(); document.getElementById('testStudentName').style.borderColor = '#f87171'; return; }
  document.getElementById('testStudentName').style.borderColor = '';
  testStudentName = name;
  testResults = [];
  testCorrectCount = 0;
  testCurrentIdx = 0;
  testQuestions = buildTestQuestions();
  document.getElementById('testNameScreen').style.display = 'none';
  document.getElementById('testQuestionScreen').style.display = 'flex';
  document.getElementById('testSummaryScreen').style.display = 'none';
  renderTestQuestion();
}

function buildTestQuestions() {
  // Distribute: 50% MC (fill-blank), 25% sort, 25% translate
  let shuffled = shuffle([...vocab]);
  let n = shuffled.length;
  let nMC = Math.ceil(n * 0.5);
  let nSort = Math.ceil(n * 0.25);
  let nTrans = n - nMC - nSort;
  if(nTrans < 0) nTrans = 0;

  let questions = [];
  let idx = 0;
  for(let i = 0; i < nMC && idx < n; i++, idx++) {
    questions.push({ type: 'mc', vocab: shuffled[idx] });
  }
  for(let i = 0; i < nSort && idx < n; i++, idx++) {
    questions.push({ type: 'sort', vocab: shuffled[idx] });
  }
  for(let i = 0; i < nTrans && idx < n; i++, idx++) {
    questions.push({ type: 'translate', vocab: shuffled[idx] });
  }
  return shuffle(questions);
}

// Toggle hint function for test
function toggleTestHint(btnId, pinyin) {
  let hintSpan = document.getElementById(btnId);
  if(hintSpan.classList.contains('show')) {
    hintSpan.classList.remove('show');
    hintSpan.textContent = '';
  } else {
    hintSpan.textContent = pinyin;
    hintSpan.classList.add('show');
  }
}

function renderTestQuestion() {
  let total = testQuestions.length;
  let pct = Math.round((testCurrentIdx / total) * 100);
  document.getElementById('testProgressFill').style.width = pct + '%';
  document.getElementById('testQCounter').textContent = `${testCurrentIdx + 1} / ${total}`;
  document.getElementById('testScoreLive').textContent = `✓ ${testCorrectCount}`;

  let q = testQuestions[testCurrentIdx];
  let card = document.getElementById('testQuestionCard');

  if(q.type === 'mc') renderTestMC(q, card);
  else if(q.type === 'sort') renderTestSort(q, card);
  else if(q.type === 'translate') renderTestTranslate(q, card);
}

// --- MC (fill blank from example sentence) - NO PINYIN, ONLY HINT BUTTON ---
function renderTestMC(q, card) {
  let v = q.vocab;
  // Build sentence with blank
  let sentenceWithBlank = v.example.replace(/_([^_]+)_/g, function(match, p1) {
    return `<span style="background:#ede9fe;border-bottom:3px solid #a78bfa;padding:0 8px;border-radius:4px;font-weight:900;color:#6d28d9;letter-spacing:2px;font-family:'KaiTi','楷体',serif;">＿＿</span>`;
  });
  // Options: 4 choices
  let distractors = shuffle(vocab.filter(vv => vv.word !== v.word)).slice(0, 3).map(vv => vv.word);
  let opts = shuffle([v.word, ...distractors]);
  let hintId = 'hintMc_' + Date.now() + '_' + Math.random();

  card.innerHTML = `
    <div class="test-q-badge badge-mc">📝 Trắc nghiệm · Điền từ</div>
    <p class="font-bold text-gray-500 text-sm mb-3">Chọn từ phù hợp để hoàn thành câu:</p>
    <div style="background:#faf5ff;border-radius:16px;padding:16px 18px;margin-bottom:16px;font-family:'KaiTi','楷体','Noto Serif SC',serif;font-size:1.2rem;line-height:1.8;color:#3b3b5c;">
      ${sentenceWithBlank}
    </div>
    <div class="flex items-center gap-2 mb-4">
      <button class="hint-test-btn" onclick="toggleTestHint('${hintId}','${v.examplePinyin.replace(/'/g,"\\'")}')">💡 Xem phiên âm</button>
      <span id="${hintId}" class="hint-pinyin-text"></span>
    </div>
    <div id="testOptGrid">
      ${opts.map(opt => `<button class="test-opt" style="font-family:'KaiTi','楷体','Noto Serif SC',serif;font-size:1.1rem;" onclick="checkTestMC(this,'${escQ(opt)}','${escQ(v.word)}')">${opt}</button>`).join('')}
    </div>
    <div id="testFeedbackZone"></div>
  `;
}

window.checkTestMC = function(btn, chosen, correct) {
  let all = document.querySelectorAll('#testOptGrid .test-opt');
  all.forEach(b => { b.disabled = true; });
  let isCorrect = (chosen === correct);
  btn.classList.add(isCorrect ? 't-correct' : 't-wrong');
  playSound(isCorrect);
  if(isCorrect) testCorrectCount++;
  testResults.push({ q: testQuestions[testCurrentIdx], correct: isCorrect, userAnswer: chosen });
  document.getElementById('testScoreLive').textContent = `✓ ${testCorrectCount}`;
  showTestNext(isCorrect);
};

// --- Sort (sắp xếp) - NO PINYIN DISPLAYED, Pinyin only in hint ---
function renderTestSort(q, card) {
  let v = q.vocab;
  let sentence = formatExampleText(v.example);
  let chars = sentence.split('');
  sortAnswerArr = [];
  sortPoolArr = shuffle([...chars]);
  sortAnswered = false;
  let hintId = 'hintSort_' + Date.now() + '_' + Math.random();

  card.innerHTML = `
    <div class="test-q-badge badge-sort">🔀 Sắp xếp · Ghép câu</div>
    <p class="font-bold text-gray-500 text-sm mb-2">Nhấn vào từng chữ để xếp thành câu đúng:</p>
    <p class="text-xs text-gray-400 mb-1 font-semibold">💡 Nghĩa: <span class="text-purple-600">${v.exampleVi}</span></p>
    <div class="flex items-center gap-2 mb-3">
      <button class="hint-test-btn" onclick="toggleTestHint('${hintId}','${v.examplePinyin.replace(/'/g,"\\'")}')">💡 Xem phiên âm</button>
      <span id="${hintId}" class="hint-pinyin-text"></span>
    </div>
    <div class="sort-answer-row" id="sortAnswerRow" style="min-height:52px;"></div>
    <div class="sort-pool" id="sortPool"></div>
    <div class="flex gap-2 mb-2">
      <button onclick="undoSortToken()" style="padding:7px 16px;border-radius:10px;background:#ede9fe;color:#6d28d9;font-weight:800;border:none;cursor:pointer;font-size:0.85rem;">↩ Undo</button>
      <button onclick="clearSortAnswer()" style="padding:7px 16px;border-radius:10px;background:#fef3c7;color:#92400e;font-weight:800;border:none;cursor:pointer;font-size:0.85rem;">✕ Xóa hết</button>
    </div>
    <button class="test-next-btn" onclick="checkTestSort('${escQ(sentence)}')">Kiểm tra ✓</button>
    <div id="testFeedbackZone"></div>
  `;
  renderSortTokens();
}

function renderSortTokens() {
  let pool = document.getElementById('sortPool');
  let answer = document.getElementById('sortAnswerRow');
  if(!pool || !answer) return;

  pool.innerHTML = '';
  sortPoolArr.forEach((ch, i) => {
    if(ch === '') return;
    let t = document.createElement('span');
    t.className = 'sort-token';
    t.textContent = ch;
    t.dataset.idx = i;
    t.onclick = () => moveSortToAnswer(i);
    pool.appendChild(t);
  });

  answer.innerHTML = '';
  sortAnswerArr.forEach((item, i) => {
    let t = document.createElement('span');
    t.className = 'sort-token in-answer';
    t.textContent = item.ch;
    t.dataset.pos = i;
    t.onclick = () => removeSortFromAnswer(i);
    answer.appendChild(t);
  });
  if(sortAnswerArr.length === 0) {
    answer.innerHTML = '<span style="color:#c4b5fd;font-size:0.85rem;font-weight:600;">Nhấn chữ bên dưới để chọn...</span>';
  }
}

function moveSortToAnswer(poolIdx) {
  if(sortAnswered) return;
  let ch = sortPoolArr[poolIdx];
  if(!ch && ch !== '0') return;
  sortAnswerArr.push({ ch, poolIdx });
  sortPoolArr[poolIdx] = '';
  renderSortTokens();
}

function removeSortFromAnswer(ansIdx) {
  if(sortAnswered) return;
  let item = sortAnswerArr[ansIdx];
  if(!item) return;
  sortPoolArr[item.poolIdx] = item.ch;
  sortAnswerArr.splice(ansIdx, 1);
  renderSortTokens();
}

window.undoSortToken = function() {
  if(sortAnswered || sortAnswerArr.length === 0) return;
  let last = sortAnswerArr.pop();
  sortPoolArr[last.poolIdx] = last.ch;
  renderSortTokens();
};

window.clearSortAnswer = function() {
  if(sortAnswered) return;
  sortAnswerArr.forEach(item => { sortPoolArr[item.poolIdx] = item.ch; });
  sortAnswerArr = [];
  renderSortTokens();
};

window.checkTestSort = function(correct) {
  if(sortAnswered) return;
  sortAnswered = true;
  let userSentence = sortAnswerArr.map(i => i.ch).join('');
  let isCorrect = (userSentence === correct);
  let answerRow = document.getElementById('sortAnswerRow');
  if(answerRow) {
    answerRow.classList.add(isCorrect ? 't-correct-bg' : 't-wrong-bg');
  }
  document.querySelectorAll('#sortPool .sort-token').forEach(t => { t.style.pointerEvents = 'none'; t.style.opacity = '0.5'; });
  document.querySelectorAll('#sortAnswerRow .sort-token').forEach(t => { t.style.pointerEvents = 'none'; });
  playSound(isCorrect);
  if(isCorrect) testCorrectCount++;
  testResults.push({ q: testQuestions[testCurrentIdx], correct: isCorrect, userAnswer: userSentence });
  document.getElementById('testScoreLive').textContent = `✓ ${testCorrectCount}`;
  showTestNext(isCorrect);
};

// --- Translate (Vietnamese sentence → Chinese) - NO PINYIN, only hint button ---
function renderTestTranslate(q, card) {
  let v = q.vocab;
  let hintId = 'hintTrans_' + Date.now() + '_' + Math.random();

  card.innerHTML = `
    <div class="test-q-badge badge-sort" style="background:#dcfce7;color:#166534;">🈳 Dịch câu</div>
    <p class="font-bold text-gray-500 text-sm mb-3">Dịch câu sau sang tiếng Trung:</p>
    <div style="background:#f0fdf4;border-radius:16px;padding:16px 18px;margin-bottom:16px;font-size:1.1rem;font-weight:800;color:#166534;line-height:1.7;">
      ${v.exampleVi}
    </div>
    <div class="flex items-center gap-2 mb-3">
      <button class="hint-test-btn" onclick="toggleTestHint('${hintId}','${v.examplePinyin.replace(/'/g,"\\'")}')">💡 Xem phiên âm</button>
      <span id="${hintId}" class="hint-pinyin-text"></span>
    </div>
    <input class="translate-input" id="translateInput" placeholder="Nhập câu tiếng Trung..." autocomplete="off" autocorrect="off" spellcheck="false" />
    <button class="test-next-btn" style="margin-top:12px;" onclick="checkTestTranslate('${escQ(formatExampleText(v.example))}')">Kiểm tra ✓</button>
    <div id="testFeedbackZone"></div>
  `;
  setTimeout(() => document.getElementById('translateInput')?.focus(), 80);
  document.getElementById('translateInput').addEventListener('keydown', function(e) {
    if(e.key === 'Enter') checkTestTranslate(formatExampleText(v.example));
  });
}

window.checkTestTranslate = function(correct) {
  let inp = document.getElementById('translateInput');
  if(!inp || inp.disabled) return;
  let user = inp.value.trim();
  let similarity = sentenceSimilarity(user, correct);
let isCorrect = similarity >= 0.70;
  inp.disabled = true;
  inp.classList.add(isCorrect ? 't-correct' : 't-wrong');
  playSound(isCorrect);
  if(isCorrect) testCorrectCount++;
  testResults.push({ q: testQuestions[testCurrentIdx], correct: isCorrect, userAnswer: user });
  document.getElementById('testScoreLive').textContent = `✓ ${testCorrectCount}`;
  showTestNext(isCorrect);
};

// --- Shared: show next button after answering ---
function showTestNext(isCorrect) {
  let zone = document.getElementById('testFeedbackZone');
  if(!zone) return;
  let isLast = (testCurrentIdx >= testQuestions.length - 1);
  zone.innerHTML = `
    <div style="margin-top:14px;padding:12px 16px;border-radius:14px;background:${isCorrect?'#f0fdf4':'#fff1f2'};border:2px solid ${isCorrect?'#86efac':'#fca5a5'};">
      <span style="font-weight:900;color:${isCorrect?'#15803d':'#be123c'};">${isCorrect ? '✓ Chính xác!' : '✗ Chưa đúng'}</span>
    </div>
    <button class="test-next-btn" style="background:${isLast?'linear-gradient(135deg,#f59e0b,#ef4444)':'linear-gradient(135deg,#a78bfa,#60a5fa)'};" onclick="${isLast ? 'showTestSummary()' : 'advanceTestQuestion()'}">
      ${isLast ? '🏁 Xem kết quả' : 'Tiếp theo →'}
    </button>
  `;
}

window.advanceTestQuestion = function() {
  testCurrentIdx++;
  if(testCurrentIdx >= testQuestions.length) { showTestSummary(); return; }
  renderTestQuestion();
};

window.showTestSummary = function() {
  let total = testQuestions.length;
  let correct = testCorrectCount;
  let wrong = total - correct;
  let pct = total ? Math.round((correct / total) * 100) : 0;
  let deg = Math.round(pct * 3.6);

  document.getElementById('testQuestionScreen').style.display = 'none';
  document.getElementById('testSummaryScreen').style.display = 'block';
  document.getElementById('summStudentName').textContent = '👤 ' + testStudentName;
  document.getElementById('summPct').textContent = pct + '%';
  document.getElementById('summTotal').textContent = total;
  document.getElementById('summCorrect').textContent = correct;
  document.getElementById('summWrong').textContent = wrong;

  let ring = document.getElementById('summRing');
  ring.style.setProperty('--pct-deg', deg + 'deg');
  ring.style.background = `conic-gradient(#a78bfa 0deg, #60a5fa ${deg}deg, #ede9fe ${deg}deg)`;

  let emoji = pct >= 90 ? '🏆' : pct >= 70 ? '🎉' : pct >= 50 ? '💪' : '📖';
  let msg = pct >= 90 ? 'Xuất sắc! Bạn thành thạo bài học này!' : pct >= 70 ? 'Tốt lắm! Ôn thêm một chút nữa nhé!' : pct >= 50 ? 'Cố lên! Luyện tập thêm để cải thiện!' : 'Hãy ôn lại bài học và thử lại!';
  document.getElementById('summEmoji').textContent = emoji;
  document.getElementById('summMsg').textContent = msg;

  // Review section: show wrong answers
  let wrongItems = testResults.filter(r => !r.correct);
  let reviewHTML = '';
  if(wrongItems.length > 0) {
    reviewHTML += `<h3 class="font-black text-red-500 mb-3 mt-2">📌 Cần ôn lại (${wrongItems.length} câu):</h3>`;
    wrongItems.forEach(r => {
      let v = r.q.vocab;
      let typeLabel = r.q.type === 'mc' ? '📝 Trắc nghiệm' : r.q.type === 'sort' ? '🔀 Sắp xếp' : '🈳 Dịch câu';
      reviewHTML += `
        <div class="review-item review-wrong">
          <div class="flex items-center gap-2 mb-1">
            <span class="text-xs font-bold bg-red-100 text-red-600 px-2 rounded-full">${typeLabel}</span>
          </div>
          <div style="font-family:'KaiTi','楷体','Noto Serif SC',serif;font-size:1.2rem;font-weight:800;color:#7c3aed;">${v.word} <span style="font-size:0.85rem;color:#6b7280;font-family:'Nunito',sans-serif;font-weight:600;">${v.ipa}</span></div>
          <div class="font-bold text-gray-700 text-sm">${v.meaning}</div>
          <div class="text-xs text-gray-500 mt-1 italic">${formatExampleText(v.example)}</div>
          <div class="text-xs text-gray-400">${v.exampleVi}</div>
        </div>
      `;
    });
  } else {
    reviewHTML = `<div class="review-item" style="background:#f0fdf4;border-color:#86efac;text-align:center;"><span class="font-black text-green-700">🌟 Tuyệt vời! Bạn trả lời đúng tất cả các câu!</span></div>`;
  }
  document.getElementById('summReviewSection').innerHTML = reviewHTML;
};

function escQ(s) {
  return s.replace(/\\/g,'\\\\').replace(/'/g,"\\'").replace(/"/g,'&quot;');
}

// ======================= TẢI DỮ LIỆU TỪ ARTICLES.JSON VÀ LESSON JSON =======================
async function loadLessonData() {
  const urlParams = new URLSearchParams(window.location.search);
  let idParam = urlParams.get('id');
  if (!idParam) {
    document.getElementById('mainContent').innerHTML = `<div class="error-container"><div class="text-4xl mb-3">❓</div><p class="text-red-500 font-bold">Không có mã bài học.</p><p>Vui lòng quay lại trang chủ và chọn bài học.</p><a href="index.html" class="inline-block mt-4 px-4 py-2 bg-purple-500 text-white rounded-full">← Về trang chủ</a></div>`;
    return;
  }
  if (/^\d+$/.test(idParam)) {
    idParam = `lesson-${String(idParam).padStart(2, '0')}`;
  }
  currentLessonId = idParam;

  try {
    const articlesRes = await fetch('data/articles.json');
    if (!articlesRes.ok) throw new Error('Không thể tải data/articles.json');
    const articles = await articlesRes.json();
    const article = articles.find(a => a.id === idParam || a.Id === idParam);
    if (!article) throw new Error(`Không tìm thấy bài học với id = ${idParam}`);
    const dataFile = article.dataFile;
    if (!dataFile) throw new Error('Article thiếu trường dataFile');

    const lessonRes = await fetch(`data/${dataFile}`);
    if (!lessonRes.ok) throw new Error(`Không thể tải ${dataFile}`);
    const lessonData = await lessonRes.json();

    vocab = lessonData.vocab || [];
    if (vocab.length === 0) throw new Error('File bài học không có từ vựng');

    const storedLearned = localStorage.getItem(`learned_${currentLessonId}`);
    learnedSet = new Set(storedLearned ? JSON.parse(storedLearned) : []);
    const storedScores = localStorage.getItem(`scores_${currentLessonId}`);
    scores = storedScores ? JSON.parse(storedScores) : {};

    const mainHTML = `
      <section>
        <div class="flex items-center justify-between mb-4">
          <h2 class="font-black text-2xl text-purple-700">📚 Thẻ ghi nhớ</h2>
          <span id="cardProgress" class="font-bold text-sm text-purple-400 bg-purple-50 px-3 py-1 rounded-full">1 / ${vocab.length}</span>
        </div>
        <div class="w-full h-1.5 bg-purple-100 rounded-full mb-5 overflow-hidden">
          <div id="cardProgressBar" class="progress-bar-fill" style="width:3.3%"></div>
        </div>
        <div class="flashcard-scene" id="flashcardScene" onclick="flipCard()">
          <div class="flashcard-inner" id="flashcardInner">
            <div class="flashcard-front">
              <p class="text-xs font-bold text-purple-300 uppercase tracking-widest mb-3">Nhấn để xem nghĩa</p>
              <h1 id="cardWord" class="font-black text-4xl text-purple-700 mb-2">${vocab[0]?.word || ''}</h1>
              <p id="cardIpa" class="font-medium text-lg text-blue-400 font-mono">${vocab[0]?.ipa || ''}</p>
              <div class="mt-5 flex items-center gap-2">
                <button onclick="event.stopPropagation(); speakWord()" class="bg-purple-100 hover:bg-purple-200 text-purple-600 rounded-full p-2 transition" title="Phát âm">
                  <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.536 8.464a5 5 0 010 7.072M12 6v12m-3.536-9.536a5 5 0 000 7.072"/></svg>
                </button>
                <span class="text-xs text-purple-300 font-semibold">Nghe từ</span>
              </div>
            </div>
            <div class="flashcard-back">
              <p class="text-xs font-bold text-green-400 uppercase tracking-widest mb-2">Nghĩa + Ví dụ</p>
              <h2 id="cardMeaning" class="font-black text-3xl text-green-700 mb-3">${vocab[0]?.meaning || ''}</h2>
              <div class="bg-white/60 rounded-2xl px-4 py-3 w-full">
                <p id="cardExample" class="font-semibold text-base text-gray-700 mb-1 italic" style="font-family:'Lora',serif"></p>
                <div id="cardExamplePinyin" class="text-xs text-gray-500 font-mono mt-1 mb-1"></div>
                <p id="cardExampleVi" class="text-sm text-gray-400 font-medium"></p>
              </div>
              <button onclick="event.stopPropagation(); speakSentence()" class="mt-3 bg-green-100 hover:bg-green-200 text-green-600 rounded-full px-4 py-2 text-xs font-bold flex items-center gap-1 transition">
                <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z"/></svg>
                Nghe câu ví dụ
              </button>
            </div>
          </div>
        </div>
        <p class="swipe-hint text-center mt-3">👆 Nhấn thẻ để lật · Vuốt hoặc mũi tên chuyển thẻ</p>
        <div class="flex justify-center items-center gap-5 mt-4">
          <button onclick="prevCard()" class="w-12 h-12 rounded-full bg-purple-100 hover:bg-purple-200 text-purple-600 font-bold text-xl transition hover:scale-110 flex items-center justify-center shadow">‹</button>
          <button onclick="markLearned()" id="learnedBtn" class="px-5 py-2.5 rounded-full bg-gradient-to-r from-green-300 to-teal-300 hover:from-green-400 hover:to-teal-400 text-white font-black text-sm shadow transition hover:scale-105">✓ Đánh dấu thuộc</button>
          <button onclick="nextCard()" class="w-12 h-12 rounded-full bg-purple-100 hover:bg-purple-200 text-purple-600 font-bold text-xl transition hover:scale-110 flex items-center justify-center shadow">›</button>
        </div>
      </section>

      <section>
        <h2 class="font-black text-2xl text-purple-700 mb-4">🎮 Luyện tập</h2>
        <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          <button class="practice-card pc-quiz" onclick="openGame('quiz')"><div class="text-3xl mb-2">📝</div><div class="font-black text-sm">Trắc nghiệm</div><div class="text-xs font-semibold opacity-60">Chọn từ đúng</div><div id="score-quiz" class="mt-2 text-xs font-bold text-purple-600"></div></button>
          <button class="practice-card pc-listen" onclick="openGame('listenWord')"><div class="text-3xl mb-2">🎧</div><div class="font-black text-sm">Nghe từ</div><div class="text-xs font-semibold opacity-60">Chọn Hán tự</div><div id="score-listenWord" class="mt-2 text-xs font-bold text-blue-600"></div></button>
          <button class="practice-card pc-type" onclick="openGame('typing')"><div class="text-3xl mb-2">⌨️</div><div class="font-black text-sm">Gõ từ</div><div class="text-xs font-semibold opacity-60">Dựa theo nghĩa</div><div id="score-typing" class="mt-2 text-xs font-bold text-yellow-600"></div></button>
          <button class="practice-card pc-match" onclick="openGame('matching')"><div class="text-3xl mb-2">🔗</div><div class="font-black text-sm">Ghép cặp</div><div class="text-xs font-semibold opacity-60">Từ & Nghĩa</div><div id="score-matching" class="mt-2 text-xs font-bold text-green-600"></div></button>
          <button class="practice-card pc-sentence col-span-2 sm:col-span-1" onclick="openGame('listenSentence')"><div class="text-3xl mb-2">🎙️</div><div class="font-black text-sm">Nghe câu</div><div class="text-xs font-semibold opacity-60">Gõ lại câu</div><div id="score-listenSentence" class="mt-2 text-xs font-bold text-pink-600"></div></button>
        </div>
      </section>

      <section>
        <div class="summary-card p-6">
          <div class="flex items-center justify-between mb-4">
            <h2 class="font-black text-2xl text-orange-600">🏆 Tổng kết trò chơi</h2>
            <button onclick="showSummary()" class="px-4 py-2 bg-gradient-to-r from-orange-400 to-pink-400 hover:from-orange-500 hover:to-pink-500 text-white font-black rounded-full text-sm shadow transition hover:scale-105">Xem kết quả</button>
          </div>
          <div id="summaryContent"><p class="text-sm font-semibold text-gray-400">Hoàn thành ít nhất 1 trò chơi để xem tổng kết.</p></div>
        </div>
      </section>

      <section>
        <div class="summary-card p-6" style="background:linear-gradient(135deg,#fffbeb,#fff7ed,#fef3c7);">
          <div class="flex items-center justify-between mb-4">
            <h2 class="font-black text-2xl text-amber-700">📋 Bài kiểm tra</h2>
            <button onclick="openTestScreen()" class="px-5 py-2.5 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-black text-sm shadow transition hover:scale-105">🚀 Làm bài kiểm tra</button>
          </div>
          <p class="font-semibold text-gray-600 text-sm">📝 Trắc nghiệm + 🔀 Sắp xếp + 🈳 Dịch câu • Ôn tập toàn bộ từ vựng</p>
          <div class="flex flex-wrap gap-2 mt-3">
            <span class="text-xs font-bold bg-purple-100 text-purple-700 px-3 py-1 rounded-full">50% Trắc nghiệm</span>
            <span class="text-xs font-bold bg-amber-100 text-amber-700 px-3 py-1 rounded-full">25% Sắp xếp</span>
            <span class="text-xs font-bold bg-green-100 text-green-700 px-3 py-1 rounded-full">25% Dịch câu</span>
          </div>
        </div>
      </section>

      <section>
        <h2 class="font-black text-2xl text-purple-700 mb-4">📖 Danh sách từ vựng</h2>
        <div class="vocab-table overflow-x-auto" style="max-height:500px; overflow-y:auto;">
          <table class="w-full min-w-[750px] text-sm">
            <thead><tr><th class="px-4 py-3 text-left font-black text-purple-700">STT</th><th class="px-4 py-3 text-left font-black text-purple-700">Từ (Hán)</th><th class="px-4 py-3 text-left font-black text-purple-700">Pinyin</th><th class="px-4 py-3 text-left font-black text-purple-700">Nghĩa</th><th class="px-4 py-3 text-left font-black text-purple-700">Câu ví dụ + Phiên âm</th></tr></thead>
            <tbody id="vocabTableBody"></tbody>
          </table>
        </div>
      </section>
    `;
    document.getElementById('mainContent').innerHTML = mainHTML;

    currentCard = 0;
    isFlipped = false;
    renderCard();
    renderTable();
    updateScoreDisplay();

    const flashcardScene = document.getElementById('flashcardScene');
    if (flashcardScene) {
      flashcardScene.removeEventListener('touchstart', touchStartHandler);
      flashcardScene.removeEventListener('touchend', touchEndHandler);
      flashcardScene.addEventListener('touchstart', touchStartHandler, {passive: true});
      flashcardScene.addEventListener('touchend', touchEndHandler, {passive: true});
    }
    document.removeEventListener('keydown', keydownHandler);
    document.addEventListener('keydown', keydownHandler);

  } catch (error) {
    console.error(error);
    document.getElementById('mainContent').innerHTML = `<div class="error-container"><div class="text-4xl mb-3">⚠️</div><p class="text-red-500 font-bold">Lỗi: ${error.message}</p><p>Vui lòng kiểm tra file data/articles.json và file dữ liệu tương ứng.</p><a href="index.html" class="inline-block mt-4 px-4 py-2 bg-purple-500 text-white rounded-full">← Về trang chủ</a></div>`;
  }
}

let touchStartX = 0;
function touchStartHandler(e) { touchStartX = e.touches[0].clientX; }
function touchEndHandler(e) { let dx = e.changedTouches[0].clientX - touchStartX; if(Math.abs(dx)>50) dx>0?prevCard():nextCard(); }
function keydownHandler(e) {
  if(document.getElementById('gameModal')?.classList.contains('active')) return;
  if(document.getElementById('testOverlay')?.classList.contains('show')) return;
  if(e.key==='ArrowRight') nextCard();
  else if(e.key==='ArrowLeft') prevCard();
  else if(e.key===' ') { e.preventDefault(); flipCard(); }
}

loadLessonData();
