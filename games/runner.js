const RunnerGame = {
  canvas: null, ctx: null, questions: [], currentQuestion: null,
  currentQuestionIndex: 0, score: 0, correct: 0, lives: 3, distance: 0,
  gameLoop: null, isWaiting: false, answered: false, playerY: 0, jumping: false,
  jumpV: 0, obstacles: [], speed: 3,

  init(quiz, canvasId) {
    if (!quiz?.questions?.length) return;
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext("2d");
    this.questions = [...quiz.questions];
    this.currentQuestionIndex = 0;
    this.score = 0;
    this.correct = 0;
    this.lives = 3;
    this.distance = 0;
    this.isWaiting = false;
    this.playerY = this.canvas.height - 80;
    this.jumping = false;
    this.jumpV = 0;
    this.obstacles = [];
    this.speed = 3;

    this.renderQuestion();
    this.updateHUD();
    this.start();
    this.render();
  },

  start() {
    clearInterval(this.gameLoop);
    this.gameLoop = setInterval(() => this.tick(), 30);
  },

  tick() {
    if (this.isWaiting) return;
    this.distance += this.speed;
    this.updateHUD();

    // Jump physics
    if (this.jumping) {
      this.jumpV += 0.6;
      this.playerY += this.jumpV;
      if (this.playerY >= this.canvas.height - 80) {
        this.playerY = this.canvas.height - 80;
        this.jumping = false;
        this.jumpV = 0;
      }
    }

    // Obstacles
    this.obstacles.forEach(o => { o.x -= this.speed; });
    this.obstacles = this.obstacles.filter(o => o.x > -100);

    // Hit detection
    this.obstacles.forEach(o => {
      if (!o.hit && o.x < 130 && o.x > 60 && this.playerY > this.canvas.height - 100) {
        o.hit = true;
        this.lives--;
        this.updateHUD();
        if (this.lives <= 0) this.gameOver();
      }
    });

    this.render();
  },

  render() {
    if (!this.ctx) return;
    const W = this.canvas.width, H = this.canvas.height;

    // Sky
    const grad = this.ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, "#fbbf24");
    grad.addColorStop(1, "#f59e0b");
    this.ctx.fillStyle = grad;
    this.ctx.fillRect(0, 0, W, H);

    // Clouds
    this.ctx.fillStyle = "rgba(255,255,255,0.6)";
    for (let i = 0; i < 3; i++) {
      const x = ((this.distance * 0.2 + i * 300) % (W + 200)) - 100;
      this.ctx.beginPath();
      this.ctx.arc(x, 60 + i * 20, 30, 0, Math.PI * 2);
      this.ctx.arc(x + 30, 60 + i * 20, 25, 0, Math.PI * 2);
      this.ctx.fill();
    }

    // Ground
    this.ctx.fillStyle = "#92400e";
    this.ctx.fillRect(0, H - 40, W, 40);
    this.ctx.fillStyle = "#78350f";
    for (let i = 0; i < W; i += 40) {
      const x = (i - this.distance) % W;
      this.ctx.fillRect(x, H - 40, 2, 40);
    }

    // Obstacles
    this.obstacles.forEach(o => {
      this.ctx.font = "40px serif";
      this.ctx.textAlign = "center";
      this.ctx.fillText("🪨", o.x, H - 50);
    });

    // Player
    this.ctx.font = "44px serif";
    this.ctx.fillText("🏃", 100, this.playerY + 20);
  },

  renderQuestion() {
    if (this.currentQuestionIndex >= this.questions.length) { this.win(); return; }
    this.currentQuestion = this.questions[this.currentQuestionIndex];
    this.answered = false;
    this.isWaiting = true;
    this.jumping = false;
    this.playerY = this.canvas.height - 80;

    // Spawn obstacle
    this.obstacles = [{ x: this.canvas.width - 50, hit: false }];

    const area = document.getElementById("runnerQuestionArea");
    area.innerHTML = `
      <div class="game-question-box">
        <div style="font-size:13px;color:#64748b;margin-bottom:6px;font-weight:600">
          Câu ${this.currentQuestionIndex + 1}/${this.questions.length} — Trả lời đúng để nhảy qua 🪨
        </div>
        <h3>${this.escape(this.currentQuestion.question)}</h3>
        <div class="game-options-grid">
          ${this.currentQuestion.options.map((opt, i) => `
            <button class="game-option-btn" data-idx="${i}">
              ${String.fromCharCode(65 + i)}. ${this.escape(opt)}
            </button>
          `).join("")}
        </div>
        <div id="runnerExp" class="explanation"></div>
      </div>
    `;

    area.querySelectorAll(".game-option-btn").forEach(btn => {
      btn.onclick = () => this.answer(parseInt(btn.dataset.idx));
    });
  },

  answer(chosen) {
    if (this.answered) return;
    this.answered = true;
    const isCorrect = chosen === this.currentQuestion.correctIndex;

    document.querySelectorAll("#runnerQuestionArea .game-option-btn").forEach((btn, idx) => {
      btn.disabled = true;
      if (idx === this.currentQuestion.correctIndex) btn.classList.add("correct");
      if (idx === chosen && !isCorrect) btn.classList.add("wrong");
    });

    if (isCorrect) {
      this.correct++;
      this.score += 100;
      // Jump
      this.jumping = true;
      this.jumpV = -12;
      this.speed = Math.min(8, this.speed + 0.3);
      // Remove obstacle
      this.obstacles = [];
    } else {
      this.lives--;
      this.updateHUD();
    }

    const exp = document.getElementById("runnerExp");
    exp.innerHTML = `<b>${isCorrect ? "✅ Đúng! Nhảy qua 🪨" : "❌ Sai."}</b> Đáp án: <b>${String.fromCharCode(65 + this.currentQuestion.correctIndex)}</b><br/>${this.currentQuestion.explanation || ""}`;
    exp.classList.add("show");

    setTimeout(() => {
      this.currentQuestionIndex++;
      if (this.lives <= 0) return this.gameOver();
      this.renderQuestion();
    }, 1500);
  },

  updateHUD() {
    const s = document.getElementById("runnerScore");
    if (s) s.textContent = this.score;
    const d = document.getElementById("runnerDistance");
    if (d) d.textContent = Math.floor(this.distance / 10) + "m";
    const l = document.getElementById("runnerLives");
    if (l) l.textContent = "❤️".repeat(Math.max(0, this.lives)) || "💀";
    const c = document.getElementById("runnerCorrect");
    if (c) c.textContent = `${this.correct}/${this.questions.length}`;
  },

  gameOver() {
    clearInterval(this.gameLoop);
    this.isWaiting = true;
    const total = this.questions.length;
    const percent = Math.round((this.correct / total) * 100);
    alert(`💀 Game Over!\n\nĐiểm: ${this.score}\nĐúng: ${this.correct}/${total} (${percent}%)\nQuãng đường: ${Math.floor(this.distance / 10)}m`);
    const quiz = (() => { try { return JSON.parse(sessionStorage.getItem("n2q_currentQuiz")); } catch { return null; } })();
    if (quiz && confirm("Chơi lại?")) this.init(quiz, "runnerCanvas");
  },

  win() {
    clearInterval(this.gameLoop);
    this.isWaiting = true;
    const total = this.questions.length;
    const percent = Math.round((this.correct / total) * 100);
    alert(`🎉 HOÀN THÀNH!\n\nĐiểm: ${this.score}\nĐúng: ${this.correct}/${total} (${percent}%)\nQuãng đường: ${Math.floor(this.distance / 10)}m`);
  },

  escape(str) {
    return String(str || "").replace(/[&<>"']/g, c => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    })[c]);
  },

  restart() {
    const quiz = (() => { try { return JSON.parse(sessionStorage.getItem("n2q_currentQuiz")); } catch { return null; } })();
    if (quiz) this.init(quiz, "runnerCanvas");
  }
};

window.RunnerGame = RunnerGame;
