document.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('game-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  const scoreEl = document.getElementById('score');
  const levelEl = document.getElementById('level');
  const livesEl = document.getElementById('lives');
  const bestEl = document.getElementById('best');
  const levelProgressEl = document.getElementById('level-progress');
  const overlay = document.getElementById('game-overlay');
  const overlayTitle = document.getElementById('overlay-title');
  const overlayText = document.getElementById('overlay-text');
  const startBtn = document.getElementById('start-btn');
  const difficultySelect = document.getElementById('difficulty');

  let score = 0;
  let level = 1;
  let lives = 3;
  let bestScore = parseInt(localStorage.getItem('fruit_slash_best') || '0', 10);
  bestEl.textContent = bestScore;

  let isPlaying = false;
  let animationId = null;
  let spawnTimer = 0;
  let mouseTrail = [];

  const FRUIT_TYPES = [
    { name: 'Watermelon', emoji: '🍉', radius: 50, score: 10 },
    { name: 'Orange', emoji: '🍊', radius: 44, score: 15 },
    { name: 'Apple', emoji: '🍎', radius: 43, score: 15 },
    { name: 'Lemon', emoji: '🍋', radius: 38, score: 20 },
    { name: 'Banana', emoji: '🍌', radius: 46, score: 20 },
    { name: 'Bomb', emoji: '💣', radius: 42, isBomb: true }
  ];

  const DIFFICULTY_SETTINGS = {
    easy: { spawnInterval: 90, speedMult: 0.85, bombRatio: 0.1 },
    medium: { spawnInterval: 70, speedMult: 1.0, bombRatio: 0.18 },
    hard: { spawnInterval: 50, speedMult: 1.2, bombRatio: 0.28 }
  };

  let currentDifficulty = 'medium';
  let items = [];
  let particles = [];

  function resizeCanvas() {
    const rect = canvas.parentElement.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;
  }
  window.addEventListener('resize', resizeCanvas);
  resizeCanvas();

  function updatePointerPos(e) {
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    mouseTrail.push({ x, y, time: Date.now() });
    checkSlice(x, y);
  }

  canvas.addEventListener('mousemove', updatePointerPos);
  canvas.addEventListener('touchmove', updatePointerPos);

  function startGame() {
    score = 0;
    level = 1;
    lives = 3;
    items = [];
    particles = [];
    mouseTrail = [];
    spawnTimer = 0;
    isPlaying = true;

    currentDifficulty = difficultySelect ? difficultySelect.value : 'medium';

    scoreEl.textContent = score;
    levelEl.textContent = level;
    livesEl.textContent = lives;
    updateLevelProgress();

    overlay.classList.add('hidden');

    if (animationId) cancelAnimationFrame(animationId);
    gameLoop();
  }

  function gameOver() {
    isPlaying = false;
    if (score > bestScore) {
      bestScore = score;
      localStorage.setItem('fruit_slash_best', bestScore);
      bestEl.textContent = bestScore;
    }
    saveRanking(score, level);

    overlayTitle.textContent = 'GAME OVER!';
    overlayText.textContent = `Bạn đạt được ${score} điểm ở Cấp độ ${level}.`;
    startBtn.textContent = 'CHƠI LẠI';
    overlay.classList.remove('hidden');
  }

  function spawnItem() {
    const settings = DIFFICULTY_SETTINGS[currentDifficulty];
    const isBomb = Math.random() < settings.bombRatio;
    
    let type;
    if (isBomb) {
      type = FRUIT_TYPES.find(f => f.isBomb);
    } else {
      const nonBombs = FRUIT_TYPES.filter(f => !f.isBomb);
      type = nonBombs[Math.floor(Math.random() * nonBombs.length)];
    }

    const margin = 60;
    const x = margin + Math.random() * (canvas.width - margin * 2);
    const y = canvas.height + 40;

    const baseVy = -(14.5 + Math.random() * 4.5);
    const vy = baseVy * (canvas.height / 500) * settings.speedMult;
    const vx = (Math.random() - 0.5) * 4;

    items.push({
      x, y, vx, vy,
      gravity: 0.28,
      type,
      radius: type.radius,
      rotation: Math.random() * Math.PI * 2,
      vRot: (Math.random() - 0.5) * 0.1,
      sliced: false
    });
  }

  function checkSlice(px, py) {
    if (!isPlaying) return;

    items.forEach(item => {
      if (item.sliced) return;

      const dist = Math.hypot(item.x - px, item.y - py);
      if (dist < item.radius + 18) {
        item.sliced = true;

        if (item.type.isBomb) {
          createExplosion(item.x, item.y, '#ff4757');
          lives--;
          livesEl.textContent = lives;
          if (lives <= 0) gameOver();
        } else {
          score += item.type.score;
          scoreEl.textContent = score;
          createSplash(item.x, item.y, item.type.emoji);
          checkLevelUp();
        }
      }
    });
  }

  function checkLevelUp() {
    const nextLevelScore = level * 150;
    if (score >= nextLevelScore) {
      level++;
      levelEl.textContent = level;
      showLevelToast(`LEVEL ${level}!`);
    }
    updateLevelProgress();
  }

  function updateLevelProgress() {
    const currentBase = (level - 1) * 150;
    const target = level * 150;
    const pct = Math.min(100, Math.max(0, ((score - currentBase) / (target - currentBase)) * 100));
    levelProgressEl.style.width = `${pct}%`;
  }

  function showLevelToast(msg) {
    const toast = document.createElement('div');
    toast.className = 'level-toast';
    toast.textContent = msg;
    document.getElementById('game-stage').appendChild(toast);
    setTimeout(() => toast.remove(), 1100);
  }

  function createSplash(x, y, emoji) {
    for (let i = 0; i < 8; i++) {
      particles.push({
        x, y,
        vx: (Math.random() - 0.5) * 8,
        vy: (Math.random() - 0.5) * 8,
        life: 1.0,
        size: 14 + Math.random() * 10,
        text: emoji
      });
    }
  }

  function createExplosion(x, y, color) {
    for (let i = 0; i < 15; i++) {
      particles.push({
        x, y,
        vx: (Math.random() - 0.5) * 12,
        vy: (Math.random() - 0.5) * 12,
        life: 1.0,
        size: 6 + Math.random() * 8,
        color
      });
    }
  }

  function gameLoop() {
    if (!isPlaying) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const settings = DIFFICULTY_SETTINGS[currentDifficulty];
    spawnTimer++;
    if (spawnTimer >= Math.max(30, settings.spawnInterval - level * 3)) {
      spawnItem();
      spawnTimer = 0;
    }

    for (let i = items.length - 1; i >= 0; i--) {
      const item = items[i];
      item.x += item.vx;
      item.y += item.vy;
      item.vy += item.gravity;
      item.rotation += item.vRot;

      if (!item.sliced) {
        ctx.save();
        ctx.translate(item.x, item.y);
        ctx.rotate(item.rotation);
        ctx.font = `${item.radius * 1.75}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(item.type.emoji, 0, 0);
        ctx.restore();
      }

      if (item.y > canvas.height + 60) {
        if (!item.sliced && !item.type.isBomb) {
          lives--;
          livesEl.textContent = lives;
          if (lives <= 0) {
            gameOver();
            return;
          }
        }
        items.splice(i, 1);
      }
    }

    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.life -= 0.03;

      if (p.life <= 0) {
        particles.splice(i, 1);
        continue;
      }

      ctx.save();
      ctx.globalAlpha = p.life;
      if (p.text) {
        ctx.font = `${p.size}px Arial`;
        ctx.fillText(p.text, p.x, p.y);
      } else {
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    const now = Date.now();
    mouseTrail = mouseTrail.filter(pt => now - pt.time < 150);

    if (mouseTrail.length > 1) {
      ctx.beginPath();
      ctx.moveTo(mouseTrail[0].x, mouseTrail[0].y);
      for (let i = 1; i < mouseTrail.length; i++) {
        ctx.lineTo(mouseTrail[i].x, mouseTrail[i].y);
      }
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 5;
      ctx.lineCap = 'round';
      ctx.shadowColor = '#ffd34e';
      ctx.shadowBlur = 10;
      ctx.stroke();
      ctx.shadowBlur = 0;
    }

    animationId = requestAnimationFrame(gameLoop);
  }

  function saveRanking(finalScore, finalLevel) {
    const list = JSON.parse(localStorage.getItem('fruit_slash_ranking') || '[]');
    list.push({
      name: 'Người chơi',
      score: finalScore,
      level: finalLevel,
      date: new Date().toLocaleDateString('vi-VN')
    });
    list.sort((a, b) => b.score - a.score);
    localStorage.setItem('fruit_slash_ranking', JSON.stringify(list.slice(0, 10)));
  }

  startBtn.addEventListener('click', startGame);
});
