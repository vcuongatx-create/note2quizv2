const SnakeGame = {
  canvas: null, ctx: null, snake: [], direction: { x: 1, y: 0 }, nextDirection: { x: 1, y: 0 },
  food: { x: 5, y: 5 }, gridSize: 20, tileSize: 20, score: 0, correctAnswers: 0,
  questions: [], currentQuestion: null, currentQuestionIndex: 0, gameLoop: null,
  speed: 150, isWaitingAnswer: false, answered: false, _controlsBound: false,

  init(quiz, canvasId) {
    if (!quiz?.questions?.length) return;
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) return;
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
    document.getElementById("snakeGameOverModal").classList.remove("show");
    document.getElementById("snakeQuestionModal").classList.remove("show");
    this.spawnFood();
    this.updateHUD();
    this.start();
    this.bindControls();
    this.render();
  },

  start() {
    clearInterval(this.gameLoop);
    this.gameLoop = setInterval(() => this.tick(), this.speed);
  },

  tick() {
    if (this.isWaitingAnswer) return;
    this.direction = { ...this.nextDirection };
    const head = {
      x: this.snake[0].x + this.direction.x,
      y: this.snake[0].y + this.direction.y
    };

    if (head.x < 0 || head.x >= this.gridSize || head.y < 0 || head.y >= this.gridSize) {
      return this.gameOver("Đâm tường!");
    }
    if (this.snake.some(s => s.x === head.x && s.y === head.y)) {
      return this.gameOver("Cắn thân!");
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
    } while (this.snake.some(s => s.x === pos.x && s.y === pos.y) && tries < 200);
    this.food = pos;
  },

  showQuestion() {
    if (this.currentQuestionIndex >= this.questions.length) { this.win(); return; }
    this.currentQuestion = this.questions[this.currentQuestionIndex];
    this.answered = false;

    document.getElementById("snakeQuestionText").textContent = this.currentQuestion.question;
    document.getElementById("snakeQuestionProgress").textContent =
      `Câu ${this.currentQuestionIndex + 1}/${this.questions.length}`;

    const optionsDiv = document.getElementById("snakeOptions");
    optionsDiv.innerHTML = "";
    this.currentQuestion.options.forEach((opt, idx) => {
      const btn = document.createElement("button");
      btn.className = "snake-option-btn";
      btn.textContent = `${String.fromCharCode(65 + idx)}. ${opt}`;
      btn.onclick = () => this.answer(idx);
      optionsDiv.appendChild(btn);
    });

    document.getElementById("snakeQuestionModal").classList.add("show");
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
      this.speed = Math.max(80, this.speed - 5);
    } else {
      if (this.snake.length > 3) this.snake.pop();
      this.speed = Math.max(80, this.speed - 3);
    }

    setTimeout(() => {
      const exp = document.getElementById("snakeExplanation");
      exp.innerHTML = `<b>${isCorrect ? "✅ Đúng!" : "❌ Sai."}</b> Đáp án: <b>${String.fromCharCode(65 + this.currentQuestion.correctIndex)}</b><br/>${this.currentQuestion.explanation || ""}`;
      exp.classList.add("show");

      setTimeout(() => {
        document.getElementById("snakeQuestionModal").classList.remove("show");
        exp.classList.remove("show");
        exp.innerHTML = "";
        this.currentQuestionIndex++;
        this.isWaitingAnswer = false;
        this.spawnFood();
        this.render();
        this.updateHUD();

        if (this.currentQuestionIndex >= this.questions.length) this.win();
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

    this.ctx.font = `${this.tileSize - 2}px serif`;
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
        this.ctx.arc(x + this.tileSize * 0.65, y + this.tileSize * 0.4, 2, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.beginPath();
        this.ctx.arc(x + this.tileSize * 0.65, y + this.tileSize * 0.65, 2, 0, Math.PI * 2);
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

  bindControls() {
    if (this._controlsBound) return;
    this._controlsBound = true;

    document.addEventListener("keydown", (e) => {
      if (!document.getElementById("tab-snake")?.classList.contains("active")) return;
      if (this.isWaitingAnswer) return;

      const dirs = {
        ArrowUp: { x: 0, y: -1 }, ArrowDown: { x: 0, y: 1 },
        ArrowLeft: { x: -1, y: 0 }, ArrowRight: { x: 1, y: 0 },
        w: { x: 0, y: -1 }, s: { x: 0, y: 1 }, a: { x: -1, y: 0 }, d: { x: 1, y: 0 }
      };
      const newDir = dirs[e.key];
      if (newDir) {
        e.preventDefault();
        if (newDir.x !== -this.direction.x || newDir.y !== -this.direction.y) {
          this.nextDirection = newDir;
        }
      }
    });

    document.querySelectorAll("[data-snake-dir]").forEach(btn => {
      btn.addEventListener("click", () => {
        if (this.isWaitingAnswer) return;
        const dir = btn.dataset.snakeDir;
        const dirs = {
          up: { x: 0, y: -1 }, down: { x: 0, y: 1 },
          left: { x: -1, y: 0 }, right: { x: 1, y: 0 }
        };
        const newDir = dirs[dir];
        if (newDir.x !== -this.direction.x || newDir.y !== -this.direction.y) {
          this.nextDirection = newDir;
        }
      });
    });
  },

  gameOver(reason) {
    clearInterval(this.gameLoop);
    this.isWaitingAnswer = true;
    const total = this.questions.length;
    const percent = Math.round((this.correctAnswers / total) * 100);

    document.getElementById("snakeGameOverTitle").textContent = `💀 ${reason}`;
    document.getElementById("snakeGameOverStats").innerHTML = `
      🏆 Điểm: <b>${this.score}</b><br/>
      ✅ Đúng: <b>${this.correctAnswers}/${total}</b> (${percent}%)<br/>
      🐍 Dài: <b>${this.snake.length}</b> đốt<br/>
      🎯 Đã làm: <b>${this.currentQuestionIndex}/${total}</b> câu
    `;
    document.getElementById("snakeGameOverModal").classList.add("show");
  },

  win() {
    clearInterval(this.gameLoop);
    this.isWaitingAnswer = true;
    const total = this.questions.length;
    const percent = Math.round((this.correctAnswers / total) * 100);
    let rank = percent >= 90 ? "🏆 THIÊN TÀI" : percent >= 70 ? "⭐ GIỎI" : percent >= 50 ? "💪 KHÁ" : "📖 CẦN CỐ";

    document.getElementById("snakeGameOverTitle").textContent = `🎉 HOÀN THÀNH! ${rank}`;
    document.getElementById("snakeGameOverStats").innerHTML = `
      🏆 Điểm: <b>${this.score}</b><br/>
      ✅ Đúng: <b>${this.correctAnswers}/${total}</b> (${percent}%)<br/>
      🐍 Dài: <b>${this.snake.length}</b> đốt
    `;
    document.getElementById("snakeGameOverModal").classList.add("show");
  },

  restart() {
    const quiz = (() => {
      try { return JSON.parse(sessionStorage.getItem("n2q_currentQuiz")); }
      catch { return null; }
    })();
    if (quiz) this.init(quiz, "snakeCanvas");
  }
};

window.SnakeGame = SnakeGame;
