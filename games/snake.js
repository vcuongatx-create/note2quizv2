// ==========================================
// SNAKE GAME - FULLY FIXED KEYBOARD CONTROLS
// ==========================================

const SnakeGame = {
  canvas: null, ctx: null, snake: [], direction: { x: 1, y: 0 }, nextDirection: { x: 1, y: 0 },
  food: { x: 5, y: 5 }, gridSize: 20, tileSize: 20, score: 0, correctAnswers: 0,
  questions: [], currentQuestion: null, currentQuestionIndex: 0, gameLoop: null,
  speed: 150, isWaitingAnswer: false, answered: false,
  _keyBound: false, _mobileBound: false, isRunning: false,

  init(quiz, canvasId) {
    console.log("🐍 SnakeGame.init() called");

    if (!quiz?.questions?.length) {
      console.warn("🐍 Không có quiz");
      return;
    }

    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) {
      console.warn("🐍 Không tìm thấy canvas #" + canvasId);
      return;
    }

    console.log("🐍 Canvas found:", this.canvas);
    this.ctx = this.canvas.getContext("2d");
    this.tileSize = this.canvas.width / this.gridSize;
    this.questions = [...quiz.questions];
    this.currentQuestionIndex = 0;
    this.snake = [{ x: 5, y: 10 }, { x: 4, y: 10 }, { x: 3, y: 10 }];
    this.direction = { x: 1, y: 0 };
    this.nextDirection = { x: 1, y: 0 };
    this.score = 0;
    this.correctAnswers = 0;
    this.speed = 150;
    this.isWaitingAnswer = false;
    this.isRunning = true;

    document.getElementById("snakeGameOverModal")?.classList.remove("show");
    document.getElementById("snakeQuestionModal")?.classList.remove("show");

    this.spawnFood();
    this.updateHUD();
    this.render();
    this.start();

    // Bind phím và nút
    this.bindKeyboard();
    this.bindMobile();

    // Focus canvas
    this.canvas.setAttribute("tabindex", "0");
    setTimeout(() => {
      try { this.canvas.focus(); } catch(e) {}
    }, 100);
    this.canvas.addEventListener("click", () => this.canvas.focus());

    console.log("🐍 Init xong. Sẵn sàng chơi. Bấm phím mũi tên hoặc WASD");
  },

  start() {
    clearInterval(this.gameLoop);
    this.gameLoop = setInterval(() => this.tick(), this.speed);
  },

  tick() {
    if (!this.isRunning || this.isWaitingAnswer) return;

    this.direction = { ...this.nextDirection };
    const head = {
      x: this.snake[0].x + this.direction.x,
      y: this.snake[0].y + this.direction.y
    };

    if (head.x < 0 || head.x >= this.gridSize || head.y < 0 || head.y >= this.gridSize) {
      return this.gameOver("Đâm tường!");
    }

    for (let i = 0; i < this.snake.length; i++) {
      if (this.snake[i].x === head.x && this.snake[i].y === head.y) {
        return this.gameOver("Cắn thân!");
      }
    }

    this.snake.unshift(head);

    if (head.x === this.food.x && head.y === this.food.y) {
      this.score += 10;
      this.isWaitingAnswer = true;
      this.showQuestion();
    } else {
      this.snake.pop();
    }

    this.render();
    this.updateHUD();
  },

  spawnFood() {
    let pos, tries = 0;
    do {
      pos = {
        x: Math.floor(Math.random() * this.gridSize),
        y: Math.floor(Math.random() * this.gridSize)
      };
      tries++;
    } while (this.snake.some(s => s.x === pos.x && s.y === pos.y) && tries < 300);
    this.food = pos;
  },

  showQuestion() {
    if (this.currentQuestionIndex >= this.questions.length) {
      this.win();
      return;
    }
    this.currentQuestion = this.questions[this.currentQuestionIndex];
    this.answered = false;

    const qText = document.getElementById("snakeQuestionText");
    const qProg = document.getElementById("snakeQuestionProgress");
    const qOptions = document.getElementById("snakeOptions");

    if (qText) qText.textContent = this.currentQuestion.question;
    if (qProg) qProg.textContent = `Câu ${this.currentQuestionIndex + 1}/${this.questions.length}`;
    if (qOptions) {
      qOptions.innerHTML = "";
      this.currentQuestion.options.forEach((opt, idx) => {
        const btn = document.createElement("button");
        btn.className = "snake-option-btn";
        btn.textContent = `${String.fromCharCode(65 + idx)}. ${opt}`;
        btn.onclick = () => this.answer(idx);
        qOptions.appendChild(btn);
      });
    }

    document.getElementById("snakeQuestionModal")?.classList.add("show");
  },

  answer(chosenIdx) {
    if (this.answered) return;
    this.answered = true;
    const isCorrect = chosenIdx === this.currentQuestion.correctIndex;

    document.querySelectorAll("#snakeOptions .snake-option-btn").forEach((btn, idx) => {
      btn.disabled = true;
      if (idx === this.currentQuestion.correctIndex) btn.classList.add("correct");
      if (idx === chosenIdx && !isCorrect) btn.classList.add("wrong");
    });

    if (isCorrect) {
      this.correctAnswers++;
      this.score += 20;
      this.speed = Math.max(70, this.speed - 5);
    } else {
      if (this.snake.length > 3) this.snake.pop();
    }

    setTimeout(() => {
      const exp = document.getElementById("snakeExplanation");
      if (exp) {
        exp.innerHTML = `<b>${isCorrect ? "✅ Đúng!" : "❌ Sai."}</b> Đáp án: <b>${String.fromCharCode(65 + this.currentQuestion.correctIndex)}</b><br/>${this.currentQuestion.explanation || ""}`;
        exp.classList.add("show");
      }

      setTimeout(() => {
        document.getElementById("snakeQuestionModal")?.classList.remove("show");
        const exp2 = document.getElementById("snakeExplanation");
        if (exp2) {
          exp2.classList.remove("show");
          exp2.innerHTML = "";
        }

        this.currentQuestionIndex++;
        this.isWaitingAnswer = false;
        this.spawnFood();
        this.start();
        this.render();
        this.updateHUD();

        setTimeout(() => {
          try { this.canvas?.focus(); } catch(e) {}
        }, 50);

        if (this.currentQuestionIndex >= this.questions.length) {
          this.win();
        }
      }, 1500);
    }, 400);
  },

  render() {
    if (!this.ctx) return;
    this.ctx.fillStyle = "#0f172a";
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    this.ctx.strokeStyle = "rgba(99,102,241,0.08)";
    this.ctx.lineWidth = 1;
    for (let i = 0; i <= this.gridSize; i++) {
      this.ctx.beginPath();
      this.ctx.moveTo(i * this.tileSize, 0);
      this.ctx.lineTo(i * this.tileSize, this.canvas.height);
      this.ctx.stroke();
      this.ctx.beginPath();
      this.ctx.moveTo(0, i * this.tileSize);
      this.ctx.lineTo(this.canvas.width, i * this.tileSize);
      this.ctx.stroke();
    }

    this.ctx.font = `${this.tileSize + 2}px serif`;
    this.ctx.textAlign = "center";
    this.ctx.textBaseline = "middle";
    this.ctx.fillText("🍎", this.food.x * this.tileSize + this.tileSize / 2, this.food.y * this.tileSize + this.tileSize / 2);

    this.snake.forEach((seg, i) => {
      const x = seg.x * this.tileSize;
      const y = seg.y * this.tileSize;
      if (i === 0) {
        this.ctx.fillStyle = "#6366f1";
        this.ctx.beginPath();
        this.ctx.arc(x + this.tileSize / 2, y + this.tileSize / 2, this.tileSize / 2 - 1, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.fillStyle = "white";
        this.ctx.beginPath();
        this.ctx.arc(x + this.tileSize * 0.7, y + this.tileSize * 0.35, 2.5, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.beginPath();
        this.ctx.arc(x + this.tileSize * 0.7, y + this.tileSize * 0.7, 2.5, 0, Math.PI * 2);
        this.ctx.fill();
      } else {
        const gradient = i / this.snake.length;
        this.ctx.fillStyle = `rgba(99,102,241,${1 - gradient * 0.6})`;
        this.ctx.fillRect(x + 1, y + 1, this.tileSize - 2, this.tileSize - 2);
      }
    });
  },

  updateHUD() {
    const s = document.getElementById("snakeScore");
    if (s) s.textContent = this.score;
    const l = document.getElementById("snakeLength");
    if (l) l.textContent = this.snake.length;
    const c = document.getElementById("snakeCorrect");
    if (c) c.textContent = `${this.correctAnswers}/${this.questions.length}`;
    const sp = document.getElementById("snakeSpeed");
    if (sp) sp.textContent = `${Math.round((150 - this.speed) / 10 + 1)}x`;
  },

  bindKeyboard() {
    if (this._keyBound) return;
    this._keyBound = true;

    console.log("🐍 Binding keyboard listener");

    document.addEventListener("keydown", (e) => {
      const playTab = document.getElementById("tab-play");
      if (!playTab?.classList.contains("active")) return;

      const panel = document.getElementById("panel-snake");
      if (!panel || panel.style.display === "none") return;

      if (this.isWaitingAnswer) return;

      const keyMap = {
        "ArrowUp": { x: 0, y: -1 },
        "ArrowDown": { x: 0, y: 1 },
        "ArrowLeft": { x: -1, y: 0 },
        "ArrowRight": { x: 1, y: 0 },
        "w": { x: 0, y: -1 }, "W": { x: 0, y: -1 },
        "s": { x: 0, y: 1 }, "S": { x: 0, y: 1 },
        "a": { x: -1, y: 0 }, "A": { x: -1, y: 0 },
        "d": { x: 1, y: 0 }, "D": { x: 1, y: 0 }
      };

      const newDir = keyMap[e.key];
      if (newDir) {
        e.preventDefault();
        if (newDir.x !== -this.direction.x || newDir.y !== -this.direction.y) {
          this.nextDirection = newDir;
          console.log("🐍 Hướng mới:", newDir);
        }
      }
    }, true);
  },

  bindMobile() {
    if (this._mobileBound) return;
    this._mobileBound = true;

    document.querySelectorAll("[data-snake-dir]").forEach(btn => {
      if (btn.dataset.bound === "1") return;
      btn.dataset.bound = "1";

      btn.addEventListener("click", (e) => {
        e.preventDefault();
        if (this.isWaitingAnswer) return;
        const dir = btn.dataset.snakeDir;
        const dirs = {
          up: { x: 0, y: -1 },
          down: { x: 0, y: 1 },
          left: { x: -1, y: 0 },
          right: { x: 1, y: 0 }
        };
        const newDir = dirs[dir];
        if (newDir && (newDir.x !== -this.direction.x || newDir.y !== -this.direction.y)) {
          this.nextDirection = newDir;
        }
      });
    });
  },

  gameOver(reason) {
    clearInterval(this.gameLoop);
    this.isRunning = false;
    this.isWaitingAnswer = true;

    const total = this.questions.length;
    const percent = Math.round((this.correctAnswers / total) * 100);

    const title = document.getElementById("snakeGameOverTitle");
    const stats = document.getElementById("snakeGameOverStats");
    if (title) title.textContent = `💀 ${reason}`;
    if (stats) stats.innerHTML = `
      🏆 Điểm: <b>${this.score}</b><br/>
      ✅ Đúng: <b>${this.correctAnswers}/${total}</b> (${percent}%)<br/>
      🐍 Dài: <b>${this.snake.length}</b> đốt<br/>
      🎯 Đã làm: <b>${this.currentQuestionIndex}/${total}</b> câu
    `;
    document.getElementById("snakeGameOverModal")?.classList.add("show");
  },

  win() {
    clearInterval(this.gameLoop);
    this.isRunning = false;
    this.isWaitingAnswer = true;

    const total = this.questions.length;
    const percent = Math.round((this.correctAnswers / total) * 100);
    let rank = percent >= 90 ? "🏆 THIÊN TÀI" : percent >= 70 ? "⭐ GIỎI" : percent >= 50 ? "💪 KHÁ" : "📖 CẦN CỐ";

    const title = document.getElementById("snakeGameOverTitle");
    const stats = document.getElementById("snakeGameOverStats");
    if (title) title.textContent = `🎉 HOÀN THÀNH! ${rank}`;
    if (stats) stats.innerHTML = `
      🏆 Điểm: <b>${this.score}</b><br/>
      ✅ Đúng: <b>${this.correctAnswers}/${total}</b> (${percent}%)<br/>
      🐍 Dài: <b>${this.snake.length}</b> đốt
    `;
    document.getElementById("snakeGameOverModal")?.classList.add("show");
  },

  restart() {
    document.getElementById("snakeGameOverModal")?.classList.remove("show");
    const quiz = (() => {
      try { return JSON.parse(sessionStorage.getItem("n2q_currentQuiz")); }
      catch { return null; }
    })();
    if (quiz) this.init(quiz, "snakeCanvas");
  }
};

window.SnakeGame = SnakeGame;
console.log("🐍 SnakeGame loaded into window");
