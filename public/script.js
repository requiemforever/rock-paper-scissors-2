// Просте хешування паролів (небезпечно для продакшену)
function hashPassword(password) {
  return btoa(password);
}

let users = JSON.parse(localStorage.getItem("users")) || {};
let currentUser = null;
let gameLog = [];
gameLog = JSON.parse(localStorage.getItem("gameLog")) || [];
let userStats = JSON.parse(localStorage.getItem("userStats")) || {};

// --- Реєстрація ---
document.getElementById("registerForm").onsubmit = function (e) {
  e.preventDefault();
  const form = e.target;
  const login = form.login.value;
  if (users[login]) return alert("Користувач уже існує");

  users[login] = {
    fullname: form.fullname.value,
    dob: form.dob.value,
    email: form.email.value,
    password: hashPassword(form.password.value),
  };
  localStorage.setItem("users", JSON.stringify(users));
  alert("Успішна реєстрація. Увійдіть до гри.");
  form.reset();
};

// --- Вхід ---
document.getElementById("loginForm").onsubmit = function (e) {
  e.preventDefault();
  const form = e.target;
  const login = form.login.value;
  const password = form.password.value;

  if (!users[login] || users[login].password !== hashPassword(password)) {
    return alert("Невірний логін або пароль");
  }

  currentUser = login;
  document.getElementById("registration").style.display = "none";
  document.getElementById("login").style.display = "none";
  document.getElementById("gameSettings").style.display = "block";
  document.getElementById("history").style.display = "block";

  gameLog = JSON.parse(localStorage.getItem("gameLog")) || [];
  userStats = JSON.parse(localStorage.getItem("userStats")) || {};

  showGreeting();
  showHistory();
};

// --- Привітання ---
function showGreeting() {
  const greeting = document.getElementById("greeting");
  if (!userStats[currentUser]) {
    userStats[currentUser] = { easy: [0, 0, 0], medium: [0, 0, 0], hard: [0, 0, 0], impossible: [0, 0, 0] };
  }
  const stats = userStats[currentUser];
  greeting.style.display = "block";
  greeting.innerText = `Вітаємо знову, ${currentUser}!
Перемог: простий=${stats.easy[0]}, середній=${stats.medium[0]}, складний=${stats.hard[0]}, неможливий=${stats.impossible[0]}`;
}

// --- Початок гри ---
document.getElementById("startGame").onclick = () => {
  roundsLeft = parseInt(document.getElementById("rounds").value);
  botLevel = document.getElementById("botLevel").value;
  userScore = 0;
  botScore = 0;
  history = [];
  document.getElementById("result").innerText = "";
  document.getElementById("game").style.display = "block";
};

// --- Гра ---
const choices = ["rock", "paper", "scissors"];
let userScore = 0;
let botScore = 0;
let roundsLeft = 0;
let botLevel = "easy";
let history = [];

document.querySelectorAll("#choices button").forEach((btn) => {
  btn.onclick = () => {
    if (roundsLeft <= 0) return;
    const userChoice = btn.dataset.choice;
    let botChoice;
    if (botLevel === "impossible") {
      if (userChoice === "rock") botChoice = "paper";
      else if (userChoice === "paper") botChoice = "scissors";
      else botChoice = "rock";
    } else {
      botChoice = getBotChoice(botLevel, history.map((x) => x.user));
    }
    const outcome = getOutcome(userChoice, botChoice);
    history.push({ user: userChoice, bot: botChoice, outcome });
    updateScores(outcome);
    roundsLeft--;

    document.getElementById("result").innerText = `Ви: ${userChoice}, 🤖: ${botChoice} → ${outcome}`;

    if (roundsLeft === 0) endGame();
  };
});

function getOutcome(user, bot) {
  if (user === bot) return "нічия";
  if (
    (user === "rock" && bot === "scissors") ||
    (user === "paper" && bot === "rock") ||
    (user === "scissors" && bot === "paper")
  )
    return "перемога";
  return "поразка";
}

function updateScores(outcome) {
  if (outcome === "перемога") userScore++;
  else if (outcome === "поразка") botScore++;
}

// --- Бот ---
function getBotChoice(level, userMoves) {
  if (level === "easy") return choices[userMoves.length % 3];
  if (level === "medium") return choices[Math.floor(Math.random() * 3)];
  if (level === "hard") {
    const freq = { rock: 0, paper: 0, scissors: 0 };
    userMoves.forEach((m) => freq[m]++);
    const predict = Object.keys(freq).reduce((a, b) => (freq[a] > freq[b] ? a : b));
    if (predict === "rock") return "paper";
    if (predict === "paper") return "scissors";
    return "rock";
  }
  if (level === "impossible") {
    // Бот обирає завжди виграшний варіант
    const lastUserMove = userMoves[userMoves.length - 1] || choices[Math.floor(Math.random() * 3)];
    if (lastUserMove === "rock") return "paper";
    if (lastUserMove === "paper") return "scissors";
    return "rock";
  }
}

// --- Кінець гри ---
function endGame() {
  const res = userScore > botScore ? "перемога" : userScore < botScore ? "поразка" : "нічия";
  const stats = userStats[currentUser] || { easy: [0, 0, 0], medium: [0, 0, 0], hard: [0, 0, 0], impossible: [0, 0, 0] };
  const idx = res === "перемога" ? 0 : res === "поразка" ? 1 : 2;
  if (!stats[botLevel]) stats[botLevel] = [0, 0, 0];
  stats[botLevel][idx]++;
  userStats[currentUser] = stats;
  localStorage.setItem("userStats", JSON.stringify(userStats));

  const entry = {
    user: currentUser,
    level: botLevel,
    result: res,
    history,
    date: new Date().toISOString(),
  };
  gameLog.push(entry);
  localStorage.setItem("gameLog", JSON.stringify(gameLog));
  showHistory();
  fetch('/save-game', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({
      login: currentUser,
      fullname: users[currentUser].fullname,
      dob: users[currentUser].dob,
      email: users[currentUser].email,
      game: {
        date: new Date().toISOString(),
        level: botLevel,
        result: res,
        rounds: history
      }
    })
  });
  }

// --- Журнал ---
function showHistory() {
  const log = gameLog || JSON.parse(localStorage.getItem("gameLog")) || [];
  const userGames = log.filter((g) => g.user === currentUser);
  const ul = document.getElementById("log");
  ul.innerHTML = "";
  userGames.reverse().slice(0, 10).forEach((g) => {
    const li = document.createElement("li");
    li.textContent = `${g.date.split("T")[0]} — Рівень: ${g.level.toUpperCase()} — Результат: ${g.result}`;
    ul.appendChild(li);
  });
}

// --- Експорт результатів ---
document.getElementById("exportJSON").onclick = () => {
  // Виводимо всі ігри поточного користувача
  const log = JSON.parse(localStorage.getItem("gameLog")) || [];
  const userGames = log.filter((g) => g.user === currentUser);
  const jsonData = JSON.stringify(userGames, null, 2);
  const blob = new Blob([jsonData], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = "results.json";
  link.click();
};

document.getElementById("exportXML").onclick = () => {
  const log = JSON.parse(localStorage.getItem("gameLog")) || [];
  const userGames = log.filter((g) => g.user === currentUser);
  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n<games>\n`;
  userGames.forEach(entry => {
    xml += `  <game>\n`;
    xml += `    <user>${entry.user}</user>\n`;
    xml += `    <level>${entry.level}</level>\n`;
    xml += `    <result>${entry.result}</result>\n`;
    xml += `    <date>${entry.date}</date>\n`;
    xml += `  </game>\n`;
  });
  xml += `</games>`;

  const blob = new Blob([xml], { type: "application/xml" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = "results.xml";
  link.click();
};
