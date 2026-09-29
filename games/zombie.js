// ==========================================
// ZOMBIE GAME - FIXED
// ==========================================
const ZombieGame = {
  canvas: null, ctx: null, zombies: [], particles: [],
  score: 0, correct: 0, lives: 3, wave: 1, questions: [], currentQuestion: null,
  currentQuestionIndex: 0, gameLoop: null, isWaiting: false, answered: false,
  playerX: 80, playerY: 280,

  init(quiz, canvasId) {
    if (!quiz?.questions?.length) {
      console.warn("Zombie: Không có quiz");
      return;
    }
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) {
      console.warn("Zombie: Không tìm thấy canvas");
      return;
    }
    this.ctx = this.canvas.getContext("2d");
    this.questions = [...quiz.questions];
    this.currentQuestionIndex = 0;
    this.score = 0;
    this.correct = 0;
    this.lives = 3;
    this.wave = 1;
    this.zombies = [];
    this.particles = [];
    this.isWaiting = false;
    this.playerX = 80;
    this.playerY = this.canvas.height - 60;

    // Xóa zombie cũ + reset HUD
    this.updateHUD();

    // Render câu hỏi đầu tiên
    this.renderQuestion();

    // Bắt đầu vòng lặp
    clearInterval(this.gameLoop);
    this.gameLoop = setInterval(() => this.tick(), 40);

    // Render khung
    this.render();
  },

  start() {
    clearInterval(this.gameLoop);
    this.gameLoop = setInterval(() => this.tick(), 40);
  },

  tick() {
    if (this.isWaiting) return;

    // Spawn zombie ngẫu nhiên
    if (Math.random() < 0.008 && this.zombies.length < 5) {
      this.zombies.push({
        x: this.canvas.width + 20,
        y: this.canvas.height - 60 - Math.random() * 20,
        speed: 0.5 + Math.random() * 0.3 + this.wave * 0.1,
        wobble: Math.random() * Math.PI * 2
      });
    }

    // Di chuyển zombie
    this.zombies.forEach(z => {
      z.x -= z.speed;
      z.wobble += 0.1;
    });

    // Check zombie tới player
    this.zombies = this.zombies.filter(z => {
      if (z.x < this.playerX + 30) {
        this.lives--;
        this.updateHUD();
        this.spawnParticles(z.x, z.y, "#ef4444");
        if (this.lives <= 0) { this.gameOver(); return false; }
        return false;
      }
      return true;
    });

    // Particles
    this.particles.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.life--;
    });
    this.particles = this.particles.filter(p => p.life > 0);

    this.render();
  },

  render() {
    if (!this.ctx) return;
    const W = this.canvas.width, H = this.canvas.height;

    const grad = this.ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, "#1a1a2e");
    grad.addColorStop(1, "#16213e");
    this.ctx.fillStyle = grad;
    this.ctx.fillRect(0, 0, W, H);

    // Moon
    this.ctx.fillStyle = "rgba(255,255,255,0.15)";
    this.ctx.beginPath();
    this.ctx.arc(W - 100, 60, 30, 0, Math.PI * 2);
    this.ctx.fill();

    // Ground
    this.ctx.fillStyle = "#0f0f1a";
    this.ctx.fillRect(0, H - 40, W, 40);

    // Player
    this.ctx.font = "48px serif";
    this.ctx.textAlign = "center";
    this.ctx.fillText("🧑‍🚀", this.playerX, this.playerY + 20);

    // Zombies
    this.zombies.forEach(z => {
      const wobbleY = Math.sin(z.wobble) * 3;
      this.ctx.font = "40px serif";
      this.ctx.fillText("🧟", z.x, z.y + wobbleY);
    });

    // Particles
    this.particles.forEach(p => {
      this.ctx.fillStyle = p.color;
      this.ctx.globalAlpha = p.life / 30;
      this.ctx.fillRect(p.x, p.y, 4, 4);
      this.ctx.globalAlpha = 1;
    });
  },

  renderQuestion() {
    if (this.currentQuestionIndex >= this.questions.length) {
      this.win();
      return;
    }
    this.currentQuestion = this.questions[this.currentQuestionIndex];
    this.answered = false;
    this.isWaiting = true;

    const area = document.getElementById("zombieQuestionArea");
    if (!area) return;

    area.innerHTML = `
      <div class="game-question-box">
        <div style="font-size:15px;color:#64748b;margin-bottom:10px;font-weight:700">
          Câu ${this.currentQuestionIndex + 1}/${this.questions.length}
        </div>
        <h3>${this.escape(this.currentQuestion.question)}</h3>
        <div class="game-options-grid">
          ${this.currentQuestion.options.map((opt, i) => `
            <button class="game-option-btn" data-idx="${i}">
              ${String.fromCharCode(65 + i)}. ${this.escape(opt)}
            </button>
          `).join("")}
        </div>
        <div id="zombieExp" class="explanation"></div>
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

    document.querySelectorAll("#zombieQuestionArea .game-option-btn").forEach((btn, idx) => {
      btn.disabled = true;
      if (idx === this.currentQuestion.correctIndex) btn.classList.add("correct");
      if (idx === chosen && !isCorrect) btn.classList.add("wrong");
    });

    if (isCorrect) {
      this.correct++;
      this.score += 100;
      // Diệt zombie
      if (this.zombies.length > 0) {
        const z = this.zombies[0];
        this.spawnParticles(z.x, z.y, "#fbbf24");
        this.zombies.shift();
      }
      this.wave++;
    } else {
      this.lives--;
      this.spawnParticles(this.canvas.width / 2, this.canvas.height / 2, "#ef4444");
    }

    this.updateHUD();

    const exp = document.getElementById("zombieExp");
    if (exp) {
      exp.innerHTML = `<b>${isCorrect ? "✅ Đúng!" : "❌ Sai."}</b> Đáp án: <b>${String.fromCharCode(65 + this.currentQuestion.correctIndex)}</b><br/>${this.currentQuestion.explanation || ""}`;
      exp.classList.add("show");
    }

    setTimeout(() => {
      this.currentQuestionIndex++;
      this.isWaiting = false;
      if (this.lives <= 0) return this.gameOver();
      this.renderQuestion();
    }, 1500);
  },

  spawnParticles(x, y, color) {
    for (let i = 0; i < 12; i++) {
      const angle = (Math.PI * 2 * i) / 12;
      this.particles.push({
        x, y,
        vx: Math.cos(angle) * 3,
        vy: Math.sin(angle) * 3,
        life: 30,
        color
      });
    }
  },

  updateHUD() {
    const s = document.getElementById("zombieScore");
    if (s) s.textContent = this.score;
    const l = document.getElementById("zombieLives");
    if (l) l.textContent = "❤️".repeat(Math.max(0, this.lives)) || "💀";
    const c = document.getElementById("zombieCorrect");
    if (c) c.textContent = `${this.correct}/${this.questions.length}`;
    const w = document.getElementById("zombieWave");
    if (w) w.textContent = this.wave;
  },

  gameOver() {
    clearInterval(this.gameLoop);
    this.isWaiting = true;
    const total = this.questions.length;
    const percent = Math.round((this.correct / total) * 100);
    alert(`💀 Game Over!\n\nĐiểm: ${this.score}\nĐúng: ${this.correct}/${total} (${percent}%)\nWave: ${this.wave}`);
  },

  win() {
    clearInterval(this.gameLoop);
    this.isWaiting = true;
    const total = this.questions.length;
    const percent = Math.round((this.correct / total) * 100);
    alert(`🎉 HOÀN THÀNH!\n\nĐiểm: ${this.score}\nĐúng: ${this.correct}/${total} (${percent}%)`);
  },

  escape(str) {
    return String(str || "").replace(/[&<>"']/g, c => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    })[c]);
  },

  restart() {
    const quiz = (() => { try { return JSON.parse(sessionStorage.getItem("n2q_currentQuiz")); } catch { return null; } })();
    if (quiz) this.init(quiz, "zombieCanvas");
  }
};

window.ZombieGame = ZombieGame;
