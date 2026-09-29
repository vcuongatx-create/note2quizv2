const SpeedGame = {
  questions: [], currentQuestion: null, currentIndex: 0,
  p1Score: 0, p2Score: 0, p1Correct: 0, p2Correct: 0,
  answered: false, p1Key: null, p2Key: null, _bound: false,

  init(quiz) {
    if (!quiz?.questions?.length) return;
    this.questions = [...quiz.questions];
    this.currentIndex = 0;
    this.p1Score = 0;
    this.p2Score = 0;
    this.p1Correct = 0;
    this.p2Correct = 0;
    this.updateHUD();
    this.bindKeys();
    this.showQuestion();
  },

  bindKeys() {
    if (this._bound) return;
    this._bound = true;

    const p1Keys = { a: 0, s: 1, d: 2, f: 3 };
    const p2Keys = { j: 0, k: 1, l: 2, ";": 3 };

    document.addEventListener("keydown", (e) => {
      if (!document.getElementById("tab-speed")?.classList.contains("active")) return;
      if (this.answered || !this.currentQuestion) return;

      const key = e.key.toLowerCase();

      if (key in p1Keys) {
        e.preventDefault();
        if (this.p1Key === null) {
          this.p1Key = p1Keys[key];
          this.handleAnswer(1, p1Keys[key]);
        }
      } else if (key in p2Keys) {
        e.preventDefault();
        if (this.p2Key === null) {
          this.p2Key = p2Keys[key];
          this.handleAnswer(2, p2Keys[key]);
        }
      }
    });
  },

  showQuestion() {
    if (this.currentIndex >= this.questions.length) { this.endGame(); return; }
    this.currentQuestion = this.questions[this.currentIndex];
    this.answered = false;
    this.p1Key = null;
    this.p2Key = null;

    const area = document.getElementById("speedQuestionArea");
    area.innerHTML = `
      <div class="game-question-box">
        <div style="font-size:13px;color:#64748b;margin-bottom:6px;font-weight:600;text-align:center">
          Câu ${this.currentIndex + 1}/${this.questions.length}
        </div>
        <h3 style="text-align:center">${this.escape(this.currentQuestion.question)}</h3>
        <div class="game-options-grid">
          ${this.currentQuestion.options.map((opt, i) => `
            <button class="game-option-btn" data-idx="${i}">
              <b>${String.fromCharCode(65 + i)}.</b> ${this.escape(opt)}
              <div style="font-size:11px;color:#64748b;margin-top:4px">
                ${["A","S","D","F"][i]} (P1) • ${["J","K","L",";"][i]} (P2)
              </div>
            </button>
          `).join("")}
        </div>
        <div id="speedExp" class="explanation"></div>
      </div>
    `;
  },

  handleAnswer(player, choice) {
    if (this.answered) return;

    const isCorrect = choice === this.currentQuestion.correctIndex;

    if (isCorrect) {
      this.answered = true;
      if (player === 1) {
        this.p1Score += 100;
        this.p1Correct++;
      } else {
        this.p2Score += 100;
        this.p2Correct++;
      }

      document.querySelectorAll("#speedQuestionArea .game-option-btn").forEach((btn, idx) => {
        btn.disabled = true;
        if (idx === this.currentQuestion.correctIndex) btn.classList.add("correct");
      });

      const exp = document.getElementById("speedExp");
      exp.innerHTML = `<b>⚡ P${player} thắng câu này!</b> Đáp án: <b>${String.fromCharCode(65 + this.currentQuestion.correctIndex)}</b><br/>${this.currentQuestion.explanation || ""}`;
      exp.classList.add("show");

      this.updateHUD();

      setTimeout(() => {
        this.currentIndex++;
        this.showQuestion();
      }, 1500);
    } else {
      // Sai → trừ điểm
      if (player === 1) this.p1Score = Math.max(0, this.p1Score - 30);
      else this.p2Score = Math.max(0, this.p2Score - 30);
      this.updateHUD();
    }
  },

  updateHUD() {
    const s1 = document.getElementById("speedP1Score");
    if (s1) s1.textContent = this.p1Score;
    const s2 = document.getElementById("speedP2Score");
    if (s2) s2.textContent = this.p2Score;
  },

  endGame() {
    let winner = "HÒA";
    if (this.p1Score > this.p2Score) winner = "🔵 P1 THẮNG!";
    else if (this.p2Score > this.p1Score) winner = "🔴 P2 THẮNG!";

    alert(`🏆 KẾT THÚC!\n\n${winner}\n\nP1: ${this.p1Score} điểm (${this.p1Correct} đúng)\nP2: ${this.p2Score} điểm (${this.p2Correct} đúng)`);
  },

  escape(str) {
    return String(str || "").replace(/[&<>"']/g, c => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    })[c]);
  },

  restart() {
    const quiz = (() => { try { return JSON.parse(sessionStorage.getItem("n2q_currentQuiz")); } catch { return null; } })();
    if (quiz) this.init(quiz);
  }
};

window.SpeedGame = SpeedGame;
