// Detail view for a single Pokemon and its evolutions
const BASE_POKEMON = "https://pokeapi.co/api/v2/pokemon/";
const BASE_SPECIES = "https://pokeapi.co/api/v2/pokemon-species/";

function getParam(name) {
  const url = new URL(window.location.href);
  return url.searchParams.get(name);
}

// Ensure type badges exist in detail pages as standalone utility
function createTypeBadge(typeName) {
  const span = document.createElement("span");
  span.className = `type-badge type-${typeName}`;
  span.innerText = typeName;
  return span;
}

async function fetchPokemon(identifier) {
  const url = BASE_POKEMON + identifier;
  try {
    const res = await fetch(url);
    if (!res.ok) {
      console.error("Pokemon fetch failed", identifier);
      return null;
    }
    return await res.json();
  } catch (e) {
    console.error("Network error fetching pokemon", identifier, e);
    return null;
  }
}

function createDetailSection(pokemon) {
  const container = document.getElementById("detail-container");
  container.innerHTML = "";

  // Left image
  const img = document.createElement("img");
  const large = pokemon?.sprites?.other?.["official-artwork"]?.front_default || pokemon?.sprites?.front_default || "";
  img.src = large;
  img.alt = pokemon?.name ?? "pokemon";
  img.style.maxWidth = "420px";
  const left = document.createElement("div");
  left.style.flex = "0 0 auto";
  left.appendChild(img);

  // Right info
  const info = document.createElement("div");
  info.style.textAlign = "left";
  const hName = document.createElement("h2");
  hName.textContent = pokemon?.name ?? "";
  const pId = document.createElement("p");
  pId.textContent = `ID: ${pokemon?.id ?? ""}`;

  // Types
  const typesDiv = document.createElement("div");
  if (Array.isArray(pokemon?.types)) {
    pokemon.types.forEach(t => {
      if (t?.type?.name) typesDiv.appendChild(createTypeBadge(t.type.name));
    });
  }

  // Stats table
  const statsTable = document.createElement("table");
  if (Array.isArray(pokemon?.stats)) {
    pokemon.stats.forEach(s => {
      const tr = document.createElement("tr");
      const tdName = document.createElement("td");
      tdName.textContent = s?.stat?.name ?? "";
      const tdValue = document.createElement("td");
      tdValue.textContent = s?.base_stat ?? "";
      tr.appendChild(tdName);
      tr.appendChild(tdValue);
      statsTable.appendChild(tr);
    });
  }

  // Abilities
  const abilitiesDiv = document.createElement("div");
  if (Array.isArray(pokemon?.abilities)) {
    pokemon.abilities.forEach(a => {
      const span = document.createElement("span");
      span.textContent = a?.ability?.name ?? "";
      span.style.marginRight = "6px";
      abilitiesDiv.appendChild(span);
    });
  }

  info.appendChild(hName);
  info.appendChild(pId);
  info.appendChild(typesDiv);
  info.appendChild(document.createElement("hr"));
  const statsHeader = document.createElement("strong");
  statsHeader.textContent = "Stats";
  info.appendChild(statsHeader);
  info.appendChild(statsTable);
  info.appendChild(document.createElement("hr"));
  const abHeader = document.createElement("strong");
  abHeader.textContent = "Abilities";
  info.appendChild(abHeader);
  info.appendChild(abilitiesDiv);

  const layout = document.createElement("div");
  layout.className = "detail-layout";
  layout.appendChild(left);
  layout.appendChild(info);
  container.appendChild(layout);
}

async function renderEvolutions(pokemon) {
  const evolutionsContainer = document.getElementById("evolutions-container");
  evolutionsContainer.innerHTML = "";
  // Fetch species to get evolution chain URL
  const species = await fetch(`https://pokeapi.co/api/v2/pokemon-species/${pokemon.id}`)
    .then(r => r.ok ? r.json() : null);
  if (!species || !species.evolution_chain?.url) {
    return;
  }
  const chain = await fetch(species.evolution_chain.url).then(r => r.ok ? r.json() : null);
  const names = [];
  function traverse(node) {
    if (!node) return;
    if (node.species?.name) names.push(node.species.name);
    if (node.evolves_to && node.evolves_to.length > 0) {
      node.evolves_to.forEach(e => traverse(e));
    }
  }
  traverse(chain?.chain);
  // Deduplicate preserving order
  const uniqueNames = Array.from(new Set(names));
  // Exclude the base Pokemon from evolutions to avoid duplication
  const evolNames = uniqueNames.filter(n => n && pokemon?.name && n.toLowerCase() !== pokemon.name.toLowerCase());
  // Fetch data for evolutions to show image and name
  const evolutions = await Promise.all(evolNames.map(n => fetchPokemon(n)));
  evolutions.forEach(e => {
    if (!e) return;
    const a = document.createElement("a");
    a.href = `detail.html?id=${e.name}`;
    a.target = "_blank";
    a.className = "pokemon-card";
    const img = document.createElement("img");
    img.src = e.sprites?.front_default || "";
    img.alt = e.name;
    const n = document.createElement("div");
    n.textContent = e.name;
    a.appendChild(img);
    a.appendChild(n);
    evolutionsContainer.appendChild(a);
  });
  // Show evolutions section if we have any
  document.getElementById("evolutions").style.display = evolNames.length > 0 ? "block" : "none";
}

async function loadDetail() {
  const idOrName = getParam("id");
  if (!idOrName) return;
  const pokemon = await fetchPokemon(idOrName);
  if (!pokemon) return;
  createDetailSection(pokemon);
  renderEvolutions(pokemon);
}

window.onload = loadDetail;
