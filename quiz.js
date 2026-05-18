// Pokemon guessing game with score persistence in PHP + SQLite.
let score = 0;
let currentCorrectName = "";

const api = {
  users: "api/users.php",
  scores: "api/scores.php",
  reports: "api/reports.php",
};

function getRandomNumber() {
  return Math.floor(Math.random() * 151) + 1;
}

async function fetchPokemon(id) {
  const url = `https://pokeapi.co/api/v2/pokemon/${id}`;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return await res.json();
  } catch (e) {
    return null;
  }
}

async function fetchJson(url, options = {}) {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  const contentType = res.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    throw new Error("El servidor PHP no respondió JSON. Ejecuta la app con PHP, no como archivo estático.");
  }

  const data = await res.json();
  if (!res.ok || data.ok === false) {
    throw new Error(data.error || "No se pudo completar la solicitud.");
  }
  return data;
}

async function startNewQuestion() {
  const count = 4;
  const ids = new Set();
  while (ids.size < count) ids.add(getRandomNumber());

  const pokemons = await Promise.all(Array.from(ids).map(id => fetchPokemon(id)));
  const list = pokemons.filter(p => p);

  if (list.length < count) {
    return startNewQuestion();
  }

  const correctIndex = Math.floor(Math.random() * count);
  const correct = list[correctIndex];
  currentCorrectName = correct.name;

  const img = document.getElementById("quiz-pic");
  img.src = correct?.sprites?.front_default || "";
  img.alt = `Silueta de ${correct.name}`;

  const optionsDiv = document.getElementById("quiz-options");
  optionsDiv.innerHTML = "";
  shuffle(list).forEach(p => {
    const btn = document.createElement("button");
    btn.className = "quiz-option";
    btn.type = "button";
    btn.textContent = p.name;
    btn.onclick = () => onOptionSelected(p.name);
    optionsDiv.appendChild(btn);
  });

  document.getElementById("quiz-status").textContent = "¿Quién es este Pokémon?";
  document.getElementById("next-btn").style.display = "none";
}

function onOptionSelected(selectedName) {
  const status = document.getElementById("quiz-status");
  if (selectedName === currentCorrectName) {
    status.textContent = "¡Correcto!";
    score += 1;
    renderScore();
  } else {
    status.textContent = `Incorrecto. Era ${currentCorrectName}.`;
  }

  document.getElementById("next-btn").style.display = "inline-block";
  document.querySelectorAll(".quiz-option").forEach(button => {
    button.disabled = true;
    button.classList.toggle("is-correct", button.textContent === currentCorrectName);
    button.classList.toggle("is-wrong", button.textContent === selectedName && selectedName !== currentCorrectName);
  });
}

function renderScore() {
  document.getElementById("quiz-score").textContent = `Puntos: ${score}`;
}

function shuffle(items) {
  return [...items].sort(() => Math.random() - 0.5);
}

async function loadUsers() {
  const select = document.getElementById("user-select");
  select.innerHTML = "<option value=''>Cargando usuarios...</option>";

  try {
    const data = await fetchJson(api.users);
    select.innerHTML = "";
    data.users.forEach(user => {
      const option = document.createElement("option");
      option.value = user.id;
      option.textContent = user.name;
      select.appendChild(option);
    });
  } catch (error) {
    select.innerHTML = "<option value=''>Sin usuarios disponibles</option>";
    setSaveStatus(error.message, true);
  }
}

async function saveScore() {
  const userId = document.getElementById("user-select").value;
  if (!userId) {
    setSaveStatus("Selecciona un usuario antes de guardar.", true);
    return;
  }

  try {
    await fetchJson(api.scores, {
      method: "POST",
      body: JSON.stringify({ user_id: Number(userId), score }),
    });
    setSaveStatus("Puntaje guardado correctamente.");
    await Promise.all([loadHistory(), loadReport()]);
  } catch (error) {
    setSaveStatus(error.message, true);
  }
}

function setSaveStatus(message, isError = false) {
  const status = document.getElementById("save-status");
  status.textContent = message;
  status.classList.toggle("is-error", isError);
}

async function loadHistory() {
  const userId = document.getElementById("user-select").value;
  const container = document.getElementById("history-container");

  if (!userId) {
    container.innerHTML = "<p>Selecciona un usuario para consultar.</p>";
    return;
  }

  try {
    const data = await fetchJson(`${api.scores}?user_id=${encodeURIComponent(userId)}`);
    container.innerHTML = renderTable(
      ["Usuario", "Puntaje", "Fecha"],
      data.scores.map(row => [row.user_name, row.score, formatDate(row.created_at)]),
      "Este usuario aún no tiene puntajes guardados."
    );
  } catch (error) {
    container.innerHTML = `<p class="save-status is-error">${error.message}</p>`;
  }
}

async function loadReport() {
  const period = document.getElementById("period-select").value;
  const container = document.getElementById("report-container");

  try {
    const data = await fetchJson(`${api.reports}?period=${encodeURIComponent(period)}`);
    container.innerHTML = renderTable(
      ["Periodo", "Usuario", "Partidas", "Total", "Promedio", "Mejor"],
      data.rows.map(row => [
        row.period,
        row.user_name,
        row.games,
        row.total_score,
        row.average_score,
        row.best_score,
      ]),
      "Todavía no hay puntajes para reportar."
    );
  } catch (error) {
    container.innerHTML = `<p class="save-status is-error">${error.message}</p>`;
  }
}

function renderTable(headers, rows, emptyMessage) {
  if (!rows.length) {
    return `<p>${emptyMessage}</p>`;
  }

  const head = headers.map(header => `<th>${escapeHtml(header)}</th>`).join("");
  const body = rows
    .map(row => `<tr>${row.map(cell => `<td>${escapeHtml(cell ?? "")}</td>`).join("")}</tr>`)
    .join("");

  return `<table class="report-table"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`;
}

function escapeHtml(value) {
  const div = document.createElement("div");
  div.textContent = String(value);
  return div.innerHTML;
}

function formatDate(value) {
  return new Date(`${value.replace(" ", "T")}Z`).toLocaleString("es-CO", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

document.addEventListener("DOMContentLoaded", async () => {
  renderScore();
  await loadUsers();
  await Promise.all([startNewQuestion(), loadHistory(), loadReport()]);

  document.getElementById("save-score-btn").addEventListener("click", saveScore);
  document.getElementById("load-history-btn").addEventListener("click", loadHistory);
  document.getElementById("user-select").addEventListener("change", loadHistory);
  document.getElementById("period-select").addEventListener("change", loadReport);
});
