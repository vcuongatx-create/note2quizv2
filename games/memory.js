const MemoryGame = {
  questions: [], cards: [], flipped: [], matched: 0, moves: 0, score: 0,
  timer: null, seconds: 0, locked: false, totalPairs: 0,

  init(quiz) {
    if (!quiz?.questions?.length) return;
    this.questions = [...quiz.questions].slice(0, 8); // max 8 cặp
    this.totalPairs = this.questions.length;
    this.matched = 0;
    this.moves = 0;
    this.score = 0;
    this.seconds = 0;
    this.flipped = [];
    this.locked = false;

    // Build cards: mỗi câu tạo 2 thẻ (câu hỏi + đáp án)
    this.cards = [];
    this.questions.forEach((q, i) => {
      this.cards.push({
        pairId: i,
        type: "question",
        text: q.question,
        content: q.options[q.correctIndex]
      });
      this.cards.push({
        pairId: i,
        type: "answer",
        text: `Đáp án: ${q.options[q.correctIndex]}`,
        content: q.question
      });
    });

    this.cards = this.shuffle(this.cards);
    this.render();
    this.updateHUD();
    this.startTimer();
  },

  startTimer() {
    clearInterval(this.timer);
    this.seconds = 0;
    this.timer = setInterval(() => {
      this.seconds++;
      const t = document.getElementById("memoryTime");
      if (t) t.textContent = this.seconds + "s";
    }, 1000);
  },

  render() {
    const grid = document.getElementById("memoryGrid");
    if (!grid) return;
    grid.innerHTML = "";

    this.cards.forEach((card, i) => {
      const div = document.createElement("div");
      div.className = "memory-card";
      div.dataset.idx = i;
      div.textContent = card.text;
      div.onclick = () => this.flip(i);
      grid.appendChild(div);
    });
  },

  flip(idx) {
    if (this.locked) return;
    const cardEl = document.querySelector(`.memory-card[data-idx="${idx}"]`);
    if (!cardEl || cardEl.classList.contains("flipped") || cardEl.classList.contains("matched")) return;

    cardEl.classList.add("flipped");
    this.flipped.push(idx);

    if (this.flipped.length === 2) {
      this.moves++;
      const m = document.getElementById("memoryMoves");
      if (m) m.textContent = this.moves;
      this.checkMatch();
    }
  },

  checkMatch() {
    const [i1, i2] = this.flipped;
    const c1 = this.cards[i1];
    const c2 = this.cards[i2];

    if (c1.pairId === c2.pairId && c1.type !== c2.type) {
      // Match
      setTimeout(() => {
        document.querySelector(`.memory-card[data-idx="${i1}"]`).classList.add("matched");
        document.querySelector(`.memory-card[data-idx="${i2}"]`).classList.add("matched");
        this.matched++;
        this.score += 100;
        this.flipped = [];
        this.updateHUD();

        if (this.matched === this.totalPairs) this.win();
      }, 400);
    } else {
      // No match
      this.locked = true;
      setTimeout(() => {
        document.querySelector(`.memory-card[data-idx="${i1}"]`).classList.remove("flipped");
        document.querySelector(`.memory-card[data-idx="${i2}"]`).classList.remove("flipped");
        this.flipped = [];
        this.locked = false;
      }, 800);
    }
  },

  updateHUD() {
    const s = document.getElementById("memoryScore");
    if (s) s.textContent = this.score;
    const m = document.getElementById("memoryMoves");
    if (m) m.textContent = this.moves;
    const p = document.getElementById("memoryPairs");
    if (p) p.textContent = `${this.matched}/${this.totalPairs}`;
  },

  win() {
    clearInterval(this.timer);
    setTimeout(() => {
      alert(`🎉 HOÀN THÀNH!\n\nĐiểm: ${this.score}\nLượt: ${this.moves}\nThời gian: ${this.seconds}s`);
    }, 500);
  },

  shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  },

  restart() {
    const quiz = (() => { try { return JSON.parse(sessionStorage.getItem("n2q_currentQuiz")); } catch { return null; } })();
    if (quiz) this.init(quiz);
  }
};

window.MemoryGame = MemoryGame;
