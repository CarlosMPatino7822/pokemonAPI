// Simple Pokemon Guessing Game (MVP)
let score = 0;

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

async function startNewQuestion() {
  const count = 4; // 4 options (MVP)
  // Pick 4 unique random Pokemon
  const ids = new Set();
  while (ids.size < count) ids.add(getRandomNumber());
  const pokemons = await Promise.all(Array.from(ids).map(id => fetchPokemon(id)));
  const list = pokemons.filter(p => p);
  if (list.length < count) {
    return startNewQuestion();
  }
  // Choose one as the correct answer
  const correctIndex = Math.floor(Math.random() * count);
  const correct = list[correctIndex];
  const img = document.getElementById('quiz-pic');
  img.src = correct?.sprites?.front_default || '';

  // Render options
  const optionsDiv = document.getElementById('quiz-options');
  optionsDiv.innerHTML = '';
  list.forEach(p => {
    const btn = document.createElement('button');
    btn.className = 'quiz-option';
    btn.textContent = p.name;
    btn.onclick = () => onOptionSelected(p.name, correct.name);
    optionsDiv.appendChild(btn);
  });

  // Status and next button
  document.getElementById('quiz-status').textContent = '¿Quién es este Pokémon?';
  document.getElementById('next-btn').style.display = 'none';
  // store current correct for quick access
  window.__QUIZ_CORRECT = correct.name;
}

function onOptionSelected(selectedName, correctName) {
  const status = document.getElementById('quiz-status');
  if (selectedName === correctName) {
    status.textContent = '¡Correcto!';
    score += 1;
    document.getElementById('quiz-score').textContent = `Puntos: ${score}`;
  } else {
    status.textContent = `Incorrecto. Era ${correctName}.`;
  }
  document.getElementById('next-btn').style.display = 'inline-block';
  // disable all options
  document.querySelectorAll('.quiz-option').forEach(b => b.disabled = true);
}

// Init on load
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('quiz-score').textContent = `Puntos: ${score}`;
  startNewQuestion();
});
