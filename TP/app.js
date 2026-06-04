// ===============================
// IMPORTS
// ===============================

// readline permet de lire ce que l'utilisateur tape dans le terminal
const readline = require("node:readline");

// Si tu es sur Node 18+, fetch existe déjà.
// Si fetch n'existe pas, on utilise node-fetch.
const fetchFn =
  global.fetch || ((...args) => import("node-fetch").then(({ default: fetch }) => fetch(...args)));


// ===============================
// READLINE SETUP
// ===============================

// On crée une interface pour lire les entrées utilisateur
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

// Petite fonction utilitaire pour poser une question et attendre la réponse
function ask(question) {
  return new Promise((resolve) => {
    rl.question(question, resolve);
  });
}


// ===============================
// CONSTANTES DU JEU
// ===============================

// Chaque joueur commence avec 300 HP
const STARTING_HP = 300;

// Nombre maximum d'attaques conservées par Pokémon
const MAX_MOVES = 5;


// ===============================
// FONCTIONS API
// ===============================

// Cette fonction récupère les données d'un Pokémon depuis la PokeAPI
async function fetchPokemon(pokemonName) {
  const url = `https://pokeapi.co/api/v2/pokemon/${pokemonName.toLowerCase()}`;

  const response = await fetchFn(url);

  // Si le Pokémon n'existe pas, on lance une erreur
  if (!response.ok) {
    throw new Error(`Pokémon "${pokemonName}" introuvable.`);
  }

  const data = await response.json();
  return data;
}

// Cette fonction récupère les détails complets d'un move
async function fetchMove(moveUrl) {
  const response = await fetchFn(moveUrl);

  if (!response.ok) {
    throw new Error("Impossible de récupérer les données du move.");
  }

  const data = await response.json();
  return data;
}


// ===============================
// OUTILS DE TRANSFORMATION
// ===============================

// La PokeAPI contient beaucoup de moves.
// On prend seulement les moves qui ont power, accuracy et pp définis.
async function getValidMoves(pokemonData) {
  const allMoves = pokemonData.moves;

  const detailedMoves = [];

  // On parcourt les moves du Pokémon
  for (const moveEntry of allMoves) {
    try {
      // On récupère les détails du move
      const moveData = await fetchMove(moveEntry.move.url);

      // On ne garde que les moves utilisables
      if (
        moveData.power !== null &&
        moveData.accuracy !== null &&
        moveData.pp !== null
      ) {
        detailedMoves.push({
          name: moveData.name,
          power: moveData.power,
          accuracy: moveData.accuracy,
          pp: moveData.pp,
        });
      }
    } catch (error) {
      // Si un move échoue, on l'ignore
    }

    // On peut s'arrêter si on a déjà beaucoup de moves valides
    // pour éviter d'attendre trop longtemps
    if (detailedMoves.length >= 15) {
      break;
    }
  }

  // Si on n'a pas assez de moves, on lance une erreur
  if (detailedMoves.length < MAX_MOVES) {
    throw new Error(`Pas assez de moves valides pour ${pokemonData.name}.`);
  }

  // On mélange les moves
  shuffleArray(detailedMoves);

  // On garde seulement 5 moves
  return detailedMoves.slice(0, MAX_MOVES);
}

// Cette fonction mélange un tableau aléatoirement
function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    // index aléatoire entre 0 et i
    const j = Math.floor(Math.random() * (i + 1));

    // échange des éléments
    [array[i], array[j]] = [array[j], array[i]];
  }
}

// Cette fonction choisit un Pokémon aléatoire pour le bot
function getRandomPokemonName() {
  const possiblePokemons = [
    "pikachu",
    "charizard",
    "blastoise",
    "venusaur",
    "gengar",
    "alakazam",
    "snorlax",
    "dragonite",
    "machamp",
    "arcanine",
  ];

  const randomIndex = Math.floor(Math.random() * possiblePokemons.length);
  return possiblePokemons[randomIndex];
}


// ===============================
// CRÉATION DES COMBATTANTS
// ===============================

// Cette fonction transforme les données API en objet "combattant"
async function createFighter(pokemonName) {
  const pokemonData = await fetchPokemon(pokemonName);
  const moves = await getValidMoves(pokemonData);

  return {
    name: pokemonData.name,
    hp: STARTING_HP,
    moves: moves,
  };
}


// ===============================
// AFFICHAGE
// ===============================

// Affiche les infos d'un combattant
function displayFighter(fighter) {
  console.log(`\n=== ${fighter.name.toUpperCase()} ===`);
  console.log(`HP: ${fighter.hp}`);
  console.log("Moves :");

  fighter.moves.forEach((move, index) => {
    console.log(
      `${index + 1}. ${move.name} | power=${move.power} | accuracy=${move.accuracy} | pp=${move.pp}`
    );
  });
}

// Affiche les HP des deux joueurs
function displayBattleStatus(player, bot) {
  console.log("\n---------------------------");
  console.log(`${player.name} HP: ${player.hp}`);
  console.log(`${bot.name} HP: ${bot.hp}`);
  console.log("---------------------------");
}


// ===============================
// LOGIQUE DE COMBAT
// ===============================

// Cette fonction teste si une attaque touche selon l'accuracy
function attackHits(accuracy) {
  // nombre aléatoire de 1 à 100
  const roll = Math.floor(Math.random() * 100) + 1;

  // si roll <= accuracy, l'attaque touche
  return roll <= accuracy;
}

// Cette fonction applique le dégâts à la cible
function applyDamage(target, damage) {
  target.hp -= damage;

  // on évite d'avoir des HP négatifs
  if (target.hp < 0) {
    target.hp = 0;
  }
}

// Cette fonction résout un tour complet
function resolveTurn(player, bot, playerMove, botMove) {
  console.log(`\n${player.name} choisit ${playerMove.name}`);
  console.log(`${bot.name} choisit ${botMove.name}`);

  let playerCanAttack = true;
  let botCanAttack = true;

  // Règle du sujet : si le pp est inférieur à celui de l'ennemi, l'attaque ne part pas
  if (playerMove.pp < botMove.pp) {
    playerCanAttack = false;
    console.log(`${player.name} ne peut pas attaquer car son PP est inférieur à celui du bot.`);
  }

  if (botMove.pp < playerMove.pp) {
    botCanAttack = false;
    console.log(`${bot.name} ne peut pas attaquer car son PP est inférieur à celui du joueur.`);
  }

  // Attaque du joueur
  if (playerCanAttack) {
    if (attackHits(playerMove.accuracy)) {
      console.log(`${player.name} touche avec ${playerMove.name} et inflige ${playerMove.power} dégâts.`);
      applyDamage(bot, playerMove.power);
    } else {
      console.log(`${player.name} rate son attaque (${playerMove.name}).`);
    }
  }

  // Attaque du bot
  if (botCanAttack) {
    if (attackHits(botMove.accuracy)) {
      console.log(`${bot.name} touche avec ${botMove.name} et inflige ${botMove.power} dégâts.`);
      applyDamage(player, botMove.power);
    } else {
      console.log(`${bot.name} rate son attaque (${botMove.name}).`);
    }
  }
}


// ===============================
// BOUCLE PRINCIPALE DU JEU
// ===============================

async function game() {
  try {
    console.log("Bienvenue dans le mini jeu Pokémon !");
    console.log("Choisis un Pokémon pour commencer.");
    console.log("Exemples : pikachu, charizard, gengar, blastoise...\n");

    // L'utilisateur choisit son Pokémon
    const playerChoice = await ask("Ton Pokémon : ");

    // Création du joueur
    const player = await createFighter(playerChoice);

    // Création du bot avec un Pokémon aléatoire
    let botName = getRandomPokemonName();

    // On évite que le bot ait exactement le même Pokémon si possible
    while (botName.toLowerCase() === player.name.toLowerCase()) {
      botName = getRandomPokemonName();
    }

    const bot = await createFighter(botName);

    console.log("\nTon Pokémon a bien été chargé.");
    console.log(`Le bot a choisi : ${bot.name}`);

    // On affiche les données des deux Pokémon
    displayFighter(player);
    displayFighter(bot);

    // Boucle du combat
    while (player.hp > 0 && bot.hp > 0) {
      displayBattleStatus(player, bot);

      console.log("\nChoisis une attaque :");
      player.moves.forEach((move, index) => {
        console.log(
          `${index + 1}. ${move.name} | power=${move.power} | accuracy=${move.accuracy} | pp=${move.pp}`
        );
      });

      // Le joueur choisit un move
      const answer = await ask("Numéro du move : ");
      const moveIndex = Number(answer) - 1;

      // Vérification du choix
      if (
        Number.isNaN(moveIndex) ||
        moveIndex < 0 ||
        moveIndex >= player.moves.length
      ) {
        console.log("Choix invalide, recommence.");
        continue;
      }

      const playerMove = player.moves[moveIndex];

      // Le bot choisit un move aléatoire
      const botMoveIndex = Math.floor(Math.random() * bot.moves.length);
      const botMove = bot.moves[botMoveIndex];

      // On joue le tour
      resolveTurn(player, bot, playerMove, botMove);
    }

    // Fin de partie
    console.log("\n===== FIN DU JEU =====");
    if (player.hp <= 0 && bot.hp <= 0) {
      console.log("Égalité !");
    } else if (player.hp <= 0) {
      console.log(`Tu as perdu. ${bot.name} gagne.`);
    } else {
      console.log(`Bravo ! ${player.name} gagne.`);
    }
  } catch (error) {
    console.error("\nErreur :", error.message);
  } finally {
    rl.close();
  }
}

// On lance le jeu
game();