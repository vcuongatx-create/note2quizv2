// ==========================================
// NOTE2QUIZ - POLLINATIONS API v0.3.0
// Endpoint mới: gen.pollinations.ai (cần key)
// ==========================================

const POLLINATIONS_API_KEY = "sk_X08niFv1nHXXe3oxTfmh2QWJnBkbmaqW";
const POLLINATIONS_URL = "https://gen.pollinations.ai/v1/chat/completions";
const POLLINATIONS_MODEL = "openai/gpt-5.4-nano";

pdfjsLib.GlobalWorkerOptions.workerSrc =
  "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";

// ============ STATE ============
let currentQuiz = null;
let currentIndex = 0;
let userAnswers = {};
let score = 0;
let combo = 0;
let maxCombo = 0;
let mode = "combo";
let timerInterval = null;
let timeLeft = 30;
let flashcards = [];
let fcIndex = 0;

// ============ TAB SWITCHING ============
document.querySelectorAll(".nav-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".nav-btn").forEach(b => b.classList.remove("active"));
    document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
    btn.classList.add("active");
    document.getElementById("tab-" + btn.dataset.tab).classList.add("active");
  });
});

// ============ UTILS ============
function showStatus(id, msg, type = "info") {
  const el = document.getElementById(id);
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

// ============ GỌI AI (ENDPOINT MỚI CÓ KEY) ============
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
        console.warn(`Lần ${i + 1} lỗi ${res.status}:`, errText.slice(0, 300));

        if (res.status === 401 || res.status === 403) {
          throw new Error("API key sai hoặc hết hạn. Vào enter.pollinations.ai tạo key mới.");
        }
        if (res.status === 402) {
          throw new Error("Hết Pollen. Vào enter.pollinations.ai → Quests kiếm thêm.");
        }
        if (res.status === 429) {
          throw new Error("AI đang bận. Đợi 30 giây rồi thử lại.");
        }
        throw new Error(`HTTP ${res.status}: ${errText.slice(0, 100)}`);
      }

      const data = await res.json();
      const text = data.choices?.[0]?.message?.content;
      if (!text || text.length < 5) throw new Error("AI trả lời rỗng.");
      return text;
    } catch (e) {
      console.warn(`Lần thử ${i + 1} thất bại:`, e.message);
      if (i === retries) throw new Error(e.message || "AI đang bận, thử lại sau.");
      await new Promise(r => setTimeout(r, 2000 + i * 1000));
    }
  }
}

function parseJsonLoose(text) {
  let cleaned = String(text).replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
  const first = cleaned.indexOf("{");
  const last = cleaned.lastIndexOf("}");
  if (first === -1 || last === -1) {
    throw new Error("AI trả về dữ liệu không đúng định dạng. Thử lại nhé!");
  }
  cleaned = cleaned.slice(first, last + 1);
  try {
    return JSON.parse(cleaned);
  } catch (e) {
    throw new Error("Không đọc được JSON từ AI. Thử lại nhé!");
  }
}

// ============ ĐỌC FILE ============
async function extractTextFromFile(file) {
  const name = file.name.toLowerCase();

  if (name.endsWith(".txt") || name.endsWith(".md")) {
    return await file.text();
  }

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
document.getElementById("generateBtn").addEventListener("click", generateQuiz);

async function generateQuiz() {
  const btn = document.getElementById("generateBtn");
  btn.disabled = true;
  btn.innerHTML = '<span class="loader"></span>Đang phân tích...';
  showStatus("generateStatus", "⏳ Đang xử lý tài liệu...", "info");

  try {
    const numQ = parseInt(document.getElementById("numQuestions").value) || 10;
    const difficulty = document.getElementById("difficulty").value;
    mode = document.getElementById("gameMode").value;

    let sourceText = "";
    const files = document.getElementById("fileInput").files;
    const pasted = document.getElementById("pasteInput").value.trim();
    const topic = document.getElementById("topicInput").value.trim();

    if (files.length > 0) {
      showStatus("generateStatus", `⏳ Đang đọc ${files.length} file...`, "info");
      for (const f of files) {
        try {
          const t = await extractTextFromFile(f);
          sourceText += `\n\n${t}`;
        } catch (e) {
          console.warn("Lỗi đọc file", f.name, e);
        }
      }
    }

    if (pasted) sourceText += `\n\n${pasted}`;

    if (!sourceText && !topic) {
      throw new Error("Vui lòng upload file, dán văn bản, hoặc nhập chủ đề.");
    }

    showStatus("generateStatus", "🤖 AI đang tạo đề... (10-30 giây)", "info");

    const contextPart = sourceText
      ? `TÀI LIỆU:\n${sourceText.slice(0, 8000)}`
      : `CHỦ ĐỀ: ${topic}`;

    const prompt = `Tạo ${numQ} câu hỏi trắc nghiệm về ${topic || "nội dung tài liệu"} dưới đây, độ khó ${difficulty}.

${contextPart}

TRẢ VỀ DUY NHẤT JSON (KHÔNG giải thích, KHÔNG bọc dấu \`\`\`):
{
  "title": "Tiêu đề ngắn",
  "questions": [
    {
      "question": "Câu hỏi?",
      "options": ["A", "B", "C", "D"],
      "correctIndex": 0,
      "explanation": "Giải thích đáp án.",
      "topic": "Chủ đề con"
    }
  ]
}

QUY TẮC:
- Đúng ${numQ} câu
- Mỗi câu 4 lựa chọn
- correctIndex từ 0-3
- topic ngắn 2-5 từ
- explanation ngắn gọn 1-2 câu`;

    const raw = await callAI(prompt);
    const quiz = parseJsonLoose(raw);

    if (!quiz.questions || !Array.isArray(quiz.questions) || quiz.questions.length === 0) {
      throw new Error("AI không trả về câu hỏi nào.");
    }

    currentQuiz = quiz;
    currentIndex = 0;
    userAnswers = {};
    score = 0;
    combo = 0;
    maxCombo = 0;

    flashcards = quiz.questions.map(q => ({
      front: q.question,
      back: `${q.options[q.correctIndex]}\n\n💡 ${q.explanation || ""}`
    }));

    showStatus("generateStatus", `✅ Đã tạo ${quiz.questions.length} câu hỏi!`, "success");

    document.querySelector('[data-tab="quiz"]').click();
    setTimeout(() => startQuiz(), 300);

  } catch (e) {
    console.error(e);
    showStatus("generateStatus", "❌ " + e.message, "error");
  } finally {
    btn.disabled = false;
    btn.innerHTML = "✨ Tạo đề & Bắt đầu chơi";
  }
}

// ============ GAME ============
function startQuiz() {
  document.getElementById("quizEmpty").style.display = "none";
  document.getElementById("quizContainer").style.display = "block";
  document.getElementById("resultCard").style.display = "none";
  document.getElementById("gameHeader").style.display = "grid";
  document.getElementById("timerStat").style.display = mode === "survival" ? "block" : "none";
  document.getElementById("scoreDisplay").textContent = "0";
  document.getElementById("comboDisplay").textContent = "x1";
  document.getElementById("comboDisplay").classList.remove("combo-fire");

  showQuestion(0);
}

function showQuestion(idx) {
  if (idx >= currentQuiz.questions.length) {
    endGame();
    return;
  }

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

  if (mode === "survival") {
    timeLeft = 30;
    document.getElementById("timerDisplay").textContent = timeLeft;
    document.getElementById("timerDisplay").classList.remove("warning");
    clearInterval(timerInterval);
    timerInterval = setInterval(() => {
      timeLeft--;
      document.getElementById("timerDisplay").textContent = timeLeft;
      if (timeLeft <= 10) document.getElementById("timerDisplay").classList.add("warning");
      if (timeLeft <= 0) {
        clearInterval(timerInterval);
        selectAnswer(-1);
      }
    }, 1000);
  }
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
    <b>${isCorrect ? "✅ Đúng!" : chosen === -1 ? "⏰ Hết giờ!" : "❌ Sai."}</b>
    Đáp án đúng: <b>${String.fromCharCode(65 + q.correctIndex)}. ${escapeHtml(q.options[q.correctIndex])}</b><br/>
    <b>Giải thích:</b> ${escapeHtml(q.explanation || "")}
  `;

  if (isCorrect) {
    combo++;
    maxCombo = Math.max(maxCombo, combo);

    let points = 10;
    if (mode === "combo") {
      if (combo >= 5) points = 30;
      else if (combo >= 3) points = 20;
      else if (combo >= 2) points = 15;
    }
    score += points;

    if (mode === "combo" && combo >= 2) {
      showComboPopup(`x${combo} COMBO! +${points}`);
    }

    document.getElementById("comboDisplay").textContent = `x${combo}`;
    if (combo >= 3) document.getElementById("comboDisplay").classList.add("combo-fire");
  } else {
    combo = 0;
    if (mode === "combo" && chosen !== -1) score = Math.max(0, score - 5);
    document.getElementById("comboDisplay").textContent = "x1";
    document.getElementById("comboDisplay").classList.remove("combo-fire");
  }

  document.getElementById("scoreDisplay").textContent = score;
  document.getElementById("scoreDisplay").parentElement.classList.add("pulse");
  setTimeout(() => document.getElementById("scoreDisplay").parentElement.classList.remove("pulse"), 400);

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

document.getElementById("nextBtn").addEventListener("click", () => {
  showQuestion(currentIndex + 1);
});

document.getElementById("finishBtn").addEventListener("click", endGame);

// ============ KẾT THÚC ============
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
    <small>${correct}/${total} câu đúng (${percent}%) • Combo cao nhất: x${maxCombo}</small>
  `;

  let rank, rankColor;
  if (percent >= 90) { rank = "🏆 THIÊN TÀI"; rankColor = "linear-gradient(135deg, #fbbf24, #f59e0b)"; }
  else if (percent >= 70) { rank = "⭐ GIỎI"; rankColor = "linear-gradient(135deg, #10b981, #059669)"; }
  else if (percent >= 50) { rank = "💪 KHÁ"; rankColor = "linear-gradient(135deg, #6366f1, #8b5cf6)"; }
  else if (percent >= 30) { rank = "📖 CẦN CỐ"; rankColor = "linear-gradient(135deg, #f59e0b, #ef4444)"; }
  else { rank = "🌱 MỚI BẮT ĐẦU"; rankColor = "linear-gradient(135deg, #94a3b8, #64748b)"; }

  const badge = document.getElementById("rankBadge");
  badge.textContent = rank;
  badge.style.background = rankColor;

  document.getElementById("analysisBox").innerHTML = `
    <b>📊 Phân tích:</b><br/>
    Bạn trả lời đúng <b>${correct}</b>/${total} câu (${percent}%).<br/>
    ${percent >= 80
      ? "🎉 Bạn nắm rất vững! Thử độ khó cao hơn xem sao."
      : percent >= 50
      ? "💪 Bạn hiểu cơ bản nhưng còn lỗ hổng. Xem chủ đề yếu bên dưới."
      : "📖 Cần ôn lại từ đầu. Đọc lại tài liệu rồi chơi lại nhé!"}
  `;

  const weakTopics = Object.entries(topicStats)
    .filter(([_, s]) => s.correct / s.total < 0.7)
    .sort((a, b) => a[1].correct / a[1].total - b[1].correct / b[1].total);

  const weakBox = document.getElementById("weakTopicsBox");
  if (weakTopics.length === 0) {
    weakBox.style.background = "#d1fae5";
    weakBox.style.borderLeftColor = "var(--success)";
    weakBox.innerHTML = `<b>✅ Không có chủ đề yếu!</b> Bạn nắm tốt tất cả phần.`;
  } else {
    weakBox.style.background = "#fef3c7";
    weakBox.style.borderLeftColor = "var(--warning)";
    weakBox.innerHTML = `
      <b>⚠️ Chủ đề bạn YẾU (cần ôn lại):</b><br/><br/>
      ${weakTopics.map(([topic, s]) => `
        <div style="margin-bottom:8px">
          <span class="topic-tag">${escapeHtml(topic)}</span>
          Đúng ${s.correct}/${s.total} (${Math.round(s.correct / s.total * 100)}%)
        </div>
      `).join("")}
      <br/><b>💡 Gợi ý:</b> Đọc lại phần tài liệu liên quan, rồi bấm "Chơi lại" để kiểm tra.
    `;
  }

  window.scrollTo({ top: 0, behavior: "smooth" });
}

document.getElementById("replayBtn").addEventListener("click", () => {
  currentIndex = 0;
  userAnswers = {};
  score = 0;
  combo = 0;
  maxCombo = 0;
  startQuiz();
  window.scrollTo({ top: 0, behavior: "smooth" });
});

document.getElementById("newQuizBtn").addEventListener("click", () => {
  document.querySelector('[data-tab="generate"]').click();
});

// ============ FLASHCARD ============
document.querySelector('[data-tab="flashcard"]').addEventListener("click", () => {
  if (flashcards.length === 0) return;
  document.getElementById("flashcardEmpty").style.display = "none";
  document.getElementById("flashcardArea").style.display = "block";
  fcIndex = 0;
  renderFlashcard();
});

function renderFlashcard() {
  if (flashcards.length === 0) return;
  const fc = flashcards[fcIndex];
  document.getElementById("fcFront").textContent = fc.front;
  document.getElementById("fcBack").textContent = fc.back;
  document.getElementById("fcProgress").textContent = `${fcIndex + 1}/${flashcards.length}`;
  document.getElementById("flashcard").classList.remove("flipped");
}

document.getElementById("flashcard").addEventListener("click", () => {
  document.getElementById("flashcard").classList.toggle("flipped");
});

document.getElementById("fcPrev").addEventListener("click", () => {
  fcIndex = (fcIndex - 1 + flashcards.length) % flashcards.length;
  renderFlashcard();
});

document.getElementById("fcNext").addEventListener("click", () => {
  fcIndex = (fcIndex + 1) % flashcards.length;
  renderFlashcard();
});

document.getElementById("fcShuffle").addEventListener("click", () => {
  flashcards = shuffle(flashcards);
  fcIndex = 0;
  renderFlashcard();
});

// ============ CHAT ============
document.getElementById("chatSendBtn").addEventListener("click", sendChat);
document.getElementById("chatInput").addEventListener("keydown", e => {
  if (e.key === "Enter") sendChat();
});

async function sendChat() {
  const input = document.getElementById("chatInput");
  const text = input.value.trim();
  if (!text) return;

  input.value = "";
  appendMsg(escapeHtml(text), "user");

  const loadingId = "loading-" + Date.now();
  appendMsg(`<span class="loader"></span>Đang suy nghĩ...`, "bot", loadingId);

  try {
    const reply = await callAI(`Trả lời câu hỏi sau bằng tiếng Việt, ngắn gọn, dễ hiểu, có ví dụ nếu cần:\n\n${text}`);
    document.getElementById(loadingId)?.remove();
    appendMsg(escapeHtml(reply), "bot");
  } catch (e) {
    document.getElementById(loadingId)?.remove();
    appendMsg("❌ Lỗi: " + escapeHtml(e.message), "bot");
  }
}

function appendMsg(html, role, id = null) {
  const box = document.getElementById("chatMessages");
  const div = document.createElement("div");
  div.className = "msg " + role;
  if (id) div.id = id;
  div.innerHTML = html;
  box.appendChild(div);
  box.scrollTop = box.scrollHeight;
}
