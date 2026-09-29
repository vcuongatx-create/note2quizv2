// ==========================================
// NOTE2QUIZ - FULL FIXED v3
// ==========================================

const POLLINATIONS_API_KEY = "sk_X08niFv1nHXXe3oxTfmh2QWJnBkbmaqW";
const POLLINATIONS_URL = "https://gen.pollinations.ai/v1/chat/completions";
const POLLINATIONS_MODEL = "openai/gpt-5.4-nano";

pdfjsLib.GlobalWorkerOptions.workerSrc =
  "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";

let currentQuiz = null;
let currentIndex = 0;
let userAnswers = {};
let score = 0;
let combo = 0;
let maxCombo = 0;
let flashcards = [];
let fcIndex = 0;

function $(id) { return document.getElementById(id); }
function setText(id, text) { const el = $(id); if (el) el.textContent = text; }
function setHtml(id, html) { const el = $(id); if (el) el.innerHTML = html; }
function setDisplay(id, d) { const el = $(id); if (el) el.style.display = d; }

function showStatus(id, msg, type = "info") {
  const el = $(id);
  if (!el) return;
  el.textContent = msg;
  el.className = "status " + type;
}

function escapeHtml(str) {
  return String(str || "").replace(/[&<>"']/g, c => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[c]);
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function getStoredQuiz() {
  try {
    const raw = sessionStorage.getItem("n2q_currentQuiz");
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

// ============ MAIN TAB SWITCHING ============
document.querySelectorAll(".nav-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".nav-btn").forEach(b => b.classList.remove("active"));
    document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
    btn.classList.add("active");
    const tabEl = $("tab-" + btn.dataset.tab);
    if (tabEl) tabEl.classList.add("active");
  });
});

// ============ ACTIVATE GAME ============
function activateGame(game) {
  document.querySelectorAll(".subnav-btn").forEach(b => b.classList.remove("active"));
  const targetSub = document.querySelector(`.subnav-btn[data-game="${game}"]`);
  if (targetSub) targetSub.classList.add("active");

  document.querySelectorAll(".game-panel").forEach(p => p.style.display = "none");
  const panel = $("panel-" + game);
  if (panel) panel.style.display = "block";

  const quiz = getStoredQuiz();
  if (!quiz) {
    console.warn("Không có quiz trong sessionStorage");
    return;
  }

  console.log("activateGame:", game, "có", quiz.questions.length, "câu");

  setTimeout(() => {
    try {
      if (game === "snake" && window.SnakeGame) {
        console.log("Gọi SnakeGame.init");
        window.SnakeGame.init(quiz, "snakeCanvas");
      } else if (game === "zombie" && window.ZombieGame) {
        window.ZombieGame.init(quiz, "zombieCanvas");
      } else if (game === "runner" && window.RunnerGame) {
        window.RunnerGame.init(quiz, "runnerCanvas");
      } else if (game === "memory" && window.MemoryGame) {
        window.MemoryGame.init(quiz);
      } else if (game === "speed" && window.SpeedGame) {
        window.SpeedGame.init(quiz);
      } else if (game === "quiz") {
        currentQuiz = quiz;
        startQuiz();
      }
    } catch (err) {
      console.error("Lỗi init game " + game + ":", err);
    }
  }, 150);
}

document.querySelectorAll(".subnav-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    activateGame(btn.dataset.game);
  });
});

function switchToGame(gameName) {
  const playTabBtn = document.querySelector('[data-tab="play"]');
  if (playTabBtn) playTabBtn.click();
  setTimeout(() => activateGame(gameName), 250);
}

// ============ GỌI AI ============
async function callAI(prompt, retries = 2) {
  for (let i = 0; i <= retries; i++) {
    try {
      const res = await fetch(POLLINATIONS_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${POLLINATIONS_API_KEY}`
        },
        body: JSON.stringify({
          model: POLLINATIONS_MODEL,
          messages: [
            { role: "system", content: "Bạn là trợ lý AI thông minh, luôn trả lời bằng tiếng Việt, chính xác và ngắn gọn." },
            { role: "user", content: prompt }
          ],
          temperature: 0.7
        })
      });

      if (!res.ok) {
        const errText = await res.text();
        if (res.status === 401 || res.status === 403) throw new Error("API key sai hoặc hết hạn.");
        if (res.status === 402) throw new Error("Hết Pollen. Vào enter.pollinations.ai → Quests.");
        if (res.status === 429) throw new Error("AI đang bận. Đợi 30s thử lại.");
        throw new Error(`HTTP ${res.status}`);
      }

      const data = await res.json();
      const text = data.choices?.[0]?.message?.content;
      if (!text || text.length < 5) throw new Error("AI trả lời rỗng.");
      return text;
    } catch (e) {
      if (i === retries) throw new Error(e.message || "AI đang bận.");
      await new Promise(r => setTimeout(r, 2000 + i * 1000));
    }
  }
}

function parseJsonLoose(text) {
  let cleaned = String(text).replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
  const first = cleaned.indexOf("{");
  const last = cleaned.lastIndexOf("}");
  if (first === -1 || last === -1) throw new Error("AI trả về dữ liệu sai định dạng.");
  cleaned = cleaned.slice(first, last + 1);
  try { return JSON.parse(cleaned); }
  catch { throw new Error("Không đọc được JSON từ AI."); }
}

// ============ ĐỌC FILE ============
async function extractTextFromFile(file) {
  const name = file.name.toLowerCase();
  if (name.endsWith(".txt") || name.endsWith(".md")) return await file.text();
  if (name.endsWith(".pdf")) {
    const buf = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
    let out = "";
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      out += content.items.map(it => it.str).join(" ") + "\n";
    }
    return out;
  }
  if (name.endsWith(".docx")) {
    const buf = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer: buf });
    return result.value;
  }
  throw new Error("Định dạng không hỗ trợ: " + name);
}

// ============ TẠO ĐỀ ============
window.addEventListener("DOMContentLoaded", () => {
  const btn = $("generateBtn");
  if (btn) btn.addEventListener("click", generateQuiz);
});

async function generateQuiz() {
  const btn = $("generateBtn");
  if (!btn) return;

  const numQEl = $("numQuestions");
  const difficultyEl = $("difficulty");
  const selectedGameEl = $("selectedGame");

  const numQ = numQEl ? (parseInt(numQEl.value) || 10) : 10;
  const difficulty = difficultyEl ? difficultyEl.value : "trung bình";
  const selectedGame = selectedGameEl ? selectedGameEl.value : "snake";

  btn.disabled = true;
  btn.innerHTML = '<span class="loader"></span>Đang phân tích...';
  showStatus("generateStatus", "⏳ Đang xử lý...", "info");

  try {
    let sourceText = "";
    const fileEl = $("fileInput");
    const pasteEl = $("pasteInput");
    const topicEl = $("topicInput");

    const files = fileEl?.files || [];
    const pasted = pasteEl?.value.trim() || "";
    const topic = topicEl?.value.trim() || "";

    if (files.length > 0) {
      showStatus("generateStatus", `⏳ Đang đọc ${files.length} file...`, "info");
      for (const f of files) {
        try { sourceText += `\n\n${await extractTextFromFile(f)}`; }
        catch (e) { console.warn("Lỗi file", f.name, e); }
      }
    }

    if (pasted) sourceText += `\n\n${pasted}`;
    if (!sourceText && !topic) throw new Error("Vui lòng upload file, dán text, hoặc nhập chủ đề.");

    showStatus("generateStatus", "🤖 AI đang tạo đề... (10-30s)", "info");

    const contextPart = sourceText
      ? `TÀI LIỆU:\n${sourceText.slice(0, 8000)}`
      : `CHỦ ĐỀ: ${topic}`;

    const prompt = `Tạo ${numQ} câu hỏi trắc nghiệm về ${topic || "nội dung tài liệu"}, độ khó ${difficulty}.

${contextPart}

TRẢ VỀ DUY NHẤT JSON (KHÔNG giải thích, KHÔNG bọc \`\`\`):
{
  "title": "Tiêu đề ngắn",
  "questions": [
    {
      "question": "Câu hỏi?",
      "options": ["A", "B", "C", "D"],
      "correctIndex": 0,
      "explanation": "Giải thích.",
      "topic": "Chủ đề con"
    }
  ]
}

QUY TẮC:
- Đúng ${numQ} câu
- 4 lựa chọn/câu
- correctIndex 0-3
- topic 2-5 từ
- explanation 1-2 câu`;

    const raw = await callAI(prompt);
    const quiz = parseJsonLoose(raw);

    if (!quiz.questions?.length) throw new Error("AI không trả về câu hỏi.");

    currentQuiz = quiz;
    sessionStorage.setItem("n2q_currentQuiz", JSON.stringify(quiz));

    currentIndex = 0;
    userAnswers = {};
    score = 0;
    combo = 0;
    maxCombo = 0;

    flashcards = quiz.questions.map(q => ({
      front: q.question,
      back: `${q.options[q.correctIndex]}\n\n💡 ${q.explanation || ""}`
    }));

    setDisplay("flashcardEmpty", "none");
    setDisplay("flashcardArea", "block");
    setDisplay("quizEmpty", "none");

    showStatus("generateStatus", `✅ Đã tạo ${quiz.questions.length} câu! Đang vào game...`, "success");

    setTimeout(() => {
      switchToGame(selectedGame);
    }, 600);

  } catch (e) {
    console.error(e);
    showStatus("generateStatus", "❌ " + e.message, "error");
  } finally {
    btn.disabled = false;
    btn.innerHTML = "✨ Tạo đề & Vào game luôn";
  }
}

// ============ QUIZ ============
function startQuiz() {
  if (!currentQuiz?.questions?.length) return;
  setDisplay("quizEmpty", "none");
  setDisplay("quizContainer", "block");
  setDisplay("resultCard", "none");
  setDisplay("gameHeader", "grid");
  setText("scoreDisplay", "0");
  setText("comboDisplay", "x1");
  const cd = $("comboDisplay");
  if (cd) cd.classList.remove("combo-fire");
  currentIndex = 0;
  userAnswers = {};
  score = 0;
  combo = 0;
  maxCombo = 0;
  showQuestion(0);
}

function showQuestion(idx) {
  if (!currentQuiz?.questions) return;
  if (idx >= currentQuiz.questions.length) { endGame(); return; }
  currentIndex = idx;
  const q = currentQuiz.questions[idx];
  const area = $("questionArea");
  if (!area) return;
  setText("questionCounter", `${idx + 1}/${currentQuiz.questions.length}`);

  area.innerHTML = `
    <div class="question">
      <div class="question-text">Câu ${idx + 1}: ${escapeHtml(q.question)}</div>
      <div id="optionsList">
        ${q.options.map((opt, j) => `
          <label class="option" data-o="${j}">
            <input type="radio" name="q${idx}" value="${j}" />
            <span>${String.fromCharCode(65 + j)}. ${escapeHtml(opt)}</span>
          </label>
        `).join("")}
      </div>
      <div class="explanation" id="explanation"></div>
    </div>
  `;

  setDisplay("nextBtn", "none");
  setDisplay("finishBtn", "none");

  area.querySelectorAll(".option").forEach(opt => {
    opt.addEventListener("click", () => selectAnswer(parseInt(opt.dataset.o)));
  });
}

function selectAnswer(chosen) {
  const q = currentQuiz.questions[currentIndex];
  const isCorrect = chosen === q.correctIndex;

  document.querySelectorAll(".option").forEach(opt => {
    opt.classList.add("disabled");
    const oIdx = parseInt(opt.dataset.o);
    if (oIdx === q.correctIndex) opt.classList.add("correct-answer");
    if (oIdx === chosen && !isCorrect) opt.classList.add("wrong-answer");
  });

  const exp = $("explanation");
  if (exp) {
    exp.classList.add("show");
    exp.innerHTML = `
      <b>${isCorrect ? "✅ Đúng!" : "❌ Sai."}</b>
      Đáp án đúng: <b>${String.fromCharCode(65 + q.correctIndex)}. ${escapeHtml(q.options[q.correctIndex])}</b><br/>
      <b>Giải thích:</b> ${escapeHtml(q.explanation || "")}
    `;
  }

  if (isCorrect) {
    combo++;
    maxCombo = Math.max(maxCombo, combo);
    let points = 10;
    if (combo >= 5) points = 30;
    else if (combo >= 3) points = 20;
    else if (combo >= 2) points = 15;
    score += points;
    if (combo >= 2) showComboPopup(`x${combo} COMBO! +${points}`);
    setText("comboDisplay", `x${combo}`);
    const cd = $("comboDisplay");
    if (cd && combo >= 3) cd.classList.add("combo-fire");
  } else {
    combo = 0;
    score = Math.max(0, score - 5);
    setText("comboDisplay", "x1");
    const cd = $("comboDisplay");
    if (cd) cd.classList.remove("combo-fire");
  }

  setText("scoreDisplay", score);
  userAnswers[currentIndex] = chosen;
  const isLast = currentIndex >= currentQuiz.questions.length - 1;
  setDisplay(isLast ? "finishBtn" : "nextBtn", "block");
}

function showComboPopup(text) {
  const popup = document.createElement("div");
  popup.className = "combo-popup";
  popup.textContent = text;
  document.body.appendChild(popup);
  setTimeout(() => popup.remove(), 1200);
}

document.addEventListener("DOMContentLoaded", () => {
  const nb = $("nextBtn");
  const fb = $("finishBtn");
  if (nb) nb.addEventListener("click", () => showQuestion(currentIndex + 1));
  if (fb) fb.addEventListener("click", endGame);
  const rb = $("replayBtn");
  const nq = $("newQuizBtn");
  if (rb) rb.addEventListener("click", startQuiz);
  if (nq) nq.addEventListener("click", () => {
    const t = document.querySelector('[data-tab="generate"]');
    if (t) t.click();
  });
});

function endGame() {
  setDisplay("quizContainer", "none");
  setDisplay("gameHeader", "none");
  setDisplay("resultCard", "block");

  const total = currentQuiz.questions.length;
  let correct = 0;
  const topicStats = {};

  currentQuiz.questions.forEach((q, i) => {
    const chosen = userAnswers[i];
    const ok = chosen === q.correctIndex;
    if (ok) correct++;
    const t = q.topic || "Khác";
    if (!topicStats[t]) topicStats[t] = { correct: 0, total: 0 };
    topicStats[t].total++;
    if (ok) topicStats[t].correct++;
  });

  const percent = Math.round((correct / total) * 100);
  setHtml("finalScore", `
    ${score} điểm
    <small>${correct}/${total} câu đúng (${percent}%) • Combo cao nhất: x${maxCombo}</small>
  `);

  let rank, rankColor;
  if (percent >= 90) { rank = "🏆 THIÊN TÀI"; rankColor = "linear-gradient(135deg, #fbbf24, #f59e0b)"; }
  else if (percent >= 70) { rank = "⭐ GIỎI"; rankColor = "linear-gradient(135deg, #10b981, #059669)"; }
  else if (percent >= 50) { rank = "💪 KHÁ"; rankColor = "linear-gradient(135deg, #6366f1, #8b5cf6)"; }
  else if (percent >= 30) { rank = "📖 CẦN CỐ"; rankColor = "linear-gradient(135deg, #f59e0b, #ef4444)"; }
  else { rank = "🌱 MỚI BẮT ĐẦU"; rankColor = "linear-gradient(135deg, #94a3b8, #64748b)"; }

  const badge = $("rankBadge");
  if (badge) {
    badge.textContent = rank;
    badge.style.background = rankColor;
  }

  setHtml("analysisBox", `
    <b>📊 Phân tích:</b><br/>
    Bạn trả lời đúng <b>${correct}</b>/${total} câu (${percent}%).<br/>
    ${percent >= 80 ? "🎉 Nắm rất vững!" : percent >= 50 ? "💪 Còn lỗ hổng. Xem chủ đề yếu bên dưới." : "📖 Cần ôn lại."}
  `);

  const weakTopics = Object.entries(topicStats)
    .filter(([_, s]) => s.correct / s.total < 0.7)
    .sort((a, b) => a[1].correct / a[1].total - b[1].correct / b[1].total);

  const weakBox = $("weakTopicsBox");
  if (weakBox) {
    if (weakTopics.length === 0) {
      weakBox.style.background = "#d1fae5";
      weakBox.innerHTML = `<b>✅ Không có chủ đề yếu!</b>`;
    } else {
      weakBox.style.background = "#fef3c7";
      weakBox.innerHTML = `
        <b>⚠️ Chủ đề YẾU:</b><br/><br/>
        ${weakTopics.map(([topic, s]) => `
          <div style="margin-bottom:8px">
            <span class="topic-tag">${escapeHtml(topic)}</span>
            Đúng ${s.correct}/${s.total} (${Math.round(s.correct / s.total * 100)}%)
          </div>
        `).join("")}
      `;
    }
  }

  window.scrollTo({ top: 0, behavior: "smooth" });
}

// ============ FLASHCARD ============
document.addEventListener("DOMContentLoaded", () => {
  const fTab = document.querySelector('[data-tab="flashcard"]');
  if (fTab) {
    fTab.addEventListener("click", () => {
      if (flashcards.length === 0) {
        const quiz = getStoredQuiz();
        if (quiz) {
          flashcards = quiz.questions.map(q => ({
            front: q.question,
            back: `${q.options[q.correctIndex]}\n\n💡 ${q.explanation || ""}`
          }));
        }
      }
      if (flashcards.length === 0) return;
      setDisplay("flashcardEmpty", "none");
      setDisplay("flashcardArea", "block");
      fcIndex = 0;
      renderFlashcard();
    });
  }

  const fc = $("flashcard");
  if (fc) fc.addEventListener("click", () => fc.classList.toggle("flipped"));

  const prev = $("fcPrev");
  const next = $("fcNext");
  const shuf = $("fcShuffle");
  if (prev) prev.addEventListener("click", () => { fcIndex = (fcIndex - 1 + flashcards.length) % flashcards.length; renderFlashcard(); });
  if (next) next.addEventListener("click", () => { fcIndex = (fcIndex + 1) % flashcards.length; renderFlashcard(); });
  if (shuf) shuf.addEventListener("click", () => { flashcards = shuffle(flashcards); fcIndex = 0; renderFlashcard(); });
});

function renderFlashcard() {
  if (flashcards.length === 0) return;
  const fc = flashcards[fcIndex];
  setText("fcFront", fc.front);
  setText("fcBack", fc.back);
  setText("fcProgress", `${fcIndex + 1}/${flashcards.length}`);
  const card = $("flashcard");
  if (card) card.classList.remove("flipped");
}

// ============ CHAT ============
document.addEventListener("DOMContentLoaded", () => {
  const btn = $("chatSendBtn");
  const inp = $("chatInput");
  if (btn) btn.addEventListener("click", sendChat);
  if (inp) inp.addEventListener("keydown", e => { if (e.key === "Enter") sendChat(); });
});

async function sendChat() {
  const input = $("chatInput");
  if (!input) return;
  const text = input.value.trim();
  if (!text) return;
  input.value = "";
  appendMsg(escapeHtml(text), "user");
  const loadingId = "loading-" + Date.now();
  appendMsg(`<span class="loader"></span>Đang suy nghĩ...`, "bot", loadingId);
  try {
    const reply = await callAI(`Trả lời câu hỏi sau bằng tiếng Việt, ngắn gọn, dễ hiểu:\n\n${text}`);
    const l = $(loadingId);
    if (l) l.remove();
    appendMsg(escapeHtml(reply), "bot");
  } catch (e) {
    const l = $(loadingId);
    if (l) l.remove();
    appendMsg("❌ Lỗi: " + escapeHtml(e.message), "bot");
  }
}

function appendMsg(html, role, id = null) {
  const box = $("chatMessages");
  if (!box) return;
  const div = document.createElement("div");
  div.className = "msg " + role;
  if (id) div.id = id;
  div.innerHTML = html;
  box.appendChild(div);
  box.scrollTop = box.scrollHeight;
}
