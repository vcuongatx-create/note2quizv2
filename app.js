// ==========================================
// NOTE2QUIZ - POLLINATIONS API v0.3.0
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
let timerInterval = null;
let timeLeft = 30;
let flashcards = [];
let fcIndex = 0;

// ============ TAB SWITCHING (MAIN) ============
document.querySelectorAll(".nav-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".nav-btn").forEach(b => b.classList.remove("active"));
    document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
    btn.classList.add("active");
    document.getElementById("tab-" + btn.dataset.tab).classList.add("active");
  });
});

// ============ SUB-NAV GAME SWITCHING ============
document.querySelectorAll(".subnav-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".subnav-btn").forEach(b => b.classList.remove("active"));
    document.querySelectorAll(".game-panel").forEach(p => p.style.display = "none");
    btn.classList.add("active");
    const game = btn.dataset.game;
    document.getElementById("panel-" + game).style.display = "block";

    // Init game khi chọn
    const quiz = getStoredQuiz();
    if (!quiz) return;
    setTimeout(() => {
      try {
        if (game === "snake" && window.SnakeGame) SnakeGame.init(quiz, "snakeCanvas");
        else if (game === "zombie" && window.ZombieGame) ZombieGame.init(quiz, "zombieCanvas");
        else if (game === "runner" && window.RunnerGame) RunnerGame.init(quiz, "runnerCanvas");
        else if (game === "memory" && window.MemoryGame) MemoryGame.init(quiz);
        else if (game === "speed" && window.SpeedGame) SpeedGame.init(quiz);
        else if (game === "quiz") {
          currentQuiz = quiz;
          startQuiz();
        }
      } catch (err) {
        console.warn("Lỗi init game:", err);
      }
    }, 100);
  });
});

function getStoredQuiz() {
  try {
    const raw = sessionStorage.getItem("n2q_currentQuiz");
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

// Hàm chuyển sang game cụ thể
function switchToGame(gameName) {
  // Chuyển sang tab "play" trước
  document.querySelectorAll(".nav-btn").forEach(b => b.classList.remove("active"));
  document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
  document.querySelector('[data-tab="play"]').classList.add("active");
  document.getElementById("tab-play").classList.add("active");

  // Sau đó chọn sub-nav game
  const subBtn = document.querySelector(`.subnav-btn[data-game="${gameName}"]`);
  if (subBtn) subBtn.click();
}

// ============ UTILS ============
function showStatus(id, msg, type = "info") {
  const el = document.getElementById(id);
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
const generateBtn = document.getElementById("generateBtn");
if (generateBtn) {
  generateBtn.addEventListener("click", generateQuiz);
}

async function generateQuiz() {
  const btn = document.getElementById("generateBtn");
  if (!btn) return;
  btn.disabled = true;
  btn.innerHTML = '<span class="loader"></span>Đang phân tích...';
  showStatus("generateStatus", "⏳ Đang xử lý...", "info");

  try {
    const numQ = parseInt(document.getElementById("numQuestions").value) || 10;
    const difficulty = document.getElementById("difficulty").value;
    const selectedGame = document.getElementById("selectedGame").value;

    let sourceText = "";
    const files = document.getElementById("fileInput").files;
    const pasted = document.getElementById("pasteInput").value.trim();
    const topic = document.getElementById("topicInput").value.trim();

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

    document.getElementById("flashcardEmpty").style.display = "none";
    document.getElementById("flashcardArea").style.display = "block";
    document.getElementById("quizEmpty").style.display = "none";

    showStatus("generateStatus", `✅ Đã tạo ${quiz.questions.length} câu! Đang vào game...`, "success");

    // TỰ ĐỘNG CHUYỂN SANG GAME
    setTimeout(() => {
      switchToGame(selectedGame);

      setTimeout(() => {
        try {
          if (selectedGame === "snake" && window.SnakeGame) SnakeGame.init(quiz, "snakeCanvas");
          else if (selectedGame === "zombie" && window.ZombieGame) ZombieGame.init(quiz, "zombieCanvas");
          else if (selectedGame === "runner" && window.RunnerGame) RunnerGame.init(quiz, "runnerCanvas");
          else if (selectedGame === "memory" && window.MemoryGame) MemoryGame.init(quiz);
          else if (selectedGame === "speed" && window.SpeedGame) SpeedGame.init(quiz);
          else if (selectedGame === "quiz") {
            currentQuiz = quiz;
            startQuiz();
          }
        } catch (err) {
          console.error("Lỗi khởi tạo game:", err);
        }
      }, 200);
    }, 700);

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
  document.getElementById("quizEmpty").style.display = "none";
  document.getElementById("quizContainer").style.display = "block";
  document.getElementById("resultCard").style.display = "none";
  document.getElementById("gameHeader").style.display = "grid";
  document.getElementById("scoreDisplay").textContent = "0";
  document.getElementById("comboDisplay").textContent = "x1";
  document.getElementById("comboDisplay").classList.remove("combo-fire");
  currentIndex = 0;
  userAnswers = {};
  score = 0;
  combo = 0;
  maxCombo = 0;
  showQuestion(0);
}

function showQuestion(idx) {
  if (idx >= currentQuiz.questions.length) { endGame(); return; }
  currentIndex = idx;
  const q = currentQuiz.questions[idx];
  const area = document.getElementById("questionArea");
  document.getElementById("questionCounter").textContent = `${idx + 1}/${currentQuiz.questions.length}`;

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

  document.getElementById("nextBtn").style.display = "none";
  document.getElementById("finishBtn").style.display = "none";

  area.querySelectorAll(".option").forEach(opt => {
    opt.addEventListener("click", () => selectAnswer(parseInt(opt.dataset.o)));
  });
}

function selectAnswer(chosen) {
  clearInterval(timerInterval);
  const q = currentQuiz.questions[currentIndex];
  const isCorrect = chosen === q.correctIndex;

  document.querySelectorAll(".option").forEach(opt => {
    opt.classList.add("disabled");
    const oIdx = parseInt(opt.dataset.o);
    if (oIdx === q.correctIndex) opt.classList.add("correct-answer");
    if (oIdx === chosen && !isCorrect) opt.classList.add("wrong-answer");
  });

  const exp = document.getElementById("explanation");
  exp.classList.add("show");
  exp.innerHTML = `
    <b>${isCorrect ? "✅ Đúng!" : "❌ Sai."}</b>
    Đáp án đúng: <b>${String.fromCharCode(65 + q.correctIndex)}. ${escapeHtml(q.options[q.correctIndex])}</b><br/>
    <b>Giải thích:</b> ${escapeHtml(q.explanation || "")}
  `;

  if (isCorrect) {
    combo++;
    maxCombo = Math.max(maxCombo, combo);
    let points = 10;
    if (combo >= 5) points = 30;
    else if (combo >= 3) points = 20;
    else if (combo >= 2) points = 15;
    score += points;
    if (combo >= 2) showComboPopup(`x${combo} COMBO! +${points}`);
    document.getElementById("comboDisplay").textContent = `x${combo}`;
    if (combo >= 3) document.getElementById("comboDisplay").classList.add("combo-fire");
  } else {
    combo = 0;
    score = Math.max(0, score - 5);
    document.getElementById("comboDisplay").textContent = "x1";
    document.getElementById("comboDisplay").classList.remove("combo-fire");
  }

  document.getElementById("scoreDisplay").textContent = score;
  userAnswers[currentIndex] = chosen;
  const isLast = currentIndex >= currentQuiz.questions.length - 1;
  document.getElementById(isLast ? "finishBtn" : "nextBtn").style.display = "block";
}

function showComboPopup(text) {
  const popup = document.createElement("div");
  popup.className = "combo-popup";
  popup.textContent = text;
  document.body.appendChild(popup);
  setTimeout(() => popup.remove(), 1000);
}

document.getElementById("nextBtn").addEventListener("click", () => showQuestion(currentIndex + 1));
document.getElementById("finishBtn").addEventListener("click", endGame);

function endGame() {
  clearInterval(timerInterval);
  document.getElementById("quizContainer").style.display = "none";
  document.getElementById("gameHeader").style.display = "none";
  document.getElementById("resultCard").style.display = "block";

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
  document.getElementById("finalScore").innerHTML = `
    ${score} điểm
    <small>${correct}/${
