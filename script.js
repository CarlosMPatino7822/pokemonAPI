const POKE_API_BASE = "https://pokeapi.co/api/v2/pokemon/";

function getRandomNumber() {
  // First generation (151 en el comportamiento actual)
  return Math.floor(Math.random() * 151) + 1;
}

// Fetch a single Pokemon by id, with simple error handling
async function fetchPokemon(id) {
  const url = POKE_API_BASE + id;
  try {
    const res = await fetch(url);
    if (!res.ok) {
      console.error(`Error fetching Pokemon ${id}: ${res.status}`);
      return null;
    }
    const data = await res.json();
    return data;
  } catch (err) {
    console.error(`Network error fetching Pokemon ${id}:`, err);
    return null;
  }
}

// Create a type badge element
function createTypeBadge(typeName) {
  const span = document.createElement("span");
  span.className = `type-badge type-${typeName}`;
  span.innerText = typeName;
  return span;
}

// Render a Pokemon card as a clickable link (opens detail in new tab)
function renderPokemonCard(pokemon) {
  if (!pokemon) return;
  const container = document.getElementById("pokemon-container");

  const link = document.createElement("a");
  const id = pokemon.id;
  // Determine detail page path robustly depending on server root
  const parts = window.location.pathname.split('/').filter(p => p);
  const idx = parts.indexOf('web_api_pokemon');
  let detailHref = '';
  if (idx >= 0) {
    const base = '/' + parts.slice(0, idx + 1).join('/'); // e.g. /repo/web_api_pokemon
    detailHref = base + '/detail.html?id=' + id;
  } else {
    detailHref = 'detail.html?id=' + id;
  }
  console.log('Detail link for', id, ':', detailHref);
  link.href = detailHref;
  link.target = "_blank";
  link.className = "pokemon-card";

  const img = document.createElement("img");
  img.src = pokemon.sprites?.front_default || "";
  img.alt = pokemon.name;

  const name = document.createElement("p");
  name.innerText = pokemon.name;

  // Types
  const typesRow = document.createElement("div");
  typesRow.style.marginTop = "6px";
  if (Array.isArray(pokemon.types)) {
    pokemon.types.forEach(t => {
      if (t?.type?.name) {
        typesRow.appendChild(createTypeBadge(t.type.name));
      }
    });
  }

  link.appendChild(img);
  link.appendChild(name);
  link.appendChild(typesRow);

  container.appendChild(link);
}

// Main function
async function getRandomPokemon() {
  const container = document.getElementById("pokemon-container");
  container.innerHTML = "";
  // Optional loading indicator
  const loading = document.createElement("div");
  loading.textContent = "Cargando Pokémon...";
  loading.style.fontStyle = "italic";
  container.appendChild(loading);

  // Get number of random pokemon (parallel fetch)
  const countInput = document.getElementById('count');
  const count = (countInput && Number(countInput.value)) || 5;
  const ids = Array.from({ length: count }, () => getRandomNumber());
  const results = await Promise.all(ids.map(id => fetchPokemon(id)));

  // Clear loading and render
  container.innerHTML = "";
  results.forEach(p => renderPokemonCard(p));
}
