const suits = ["C", "D", "H", "S"];
const ranks = [
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  "10",
  "J",
  "Q",
  "K",
  "A",
];

const baseDeck = suits.flatMap((suit) => ranks.map((rank) => `${rank}${suit}`));
const fullDeck = [...baseDeck, "JOKER1", "JOKER2"];

function parseCard(code, index, trumpSuit, trumpRank) {
  if (code === "JOKER1" || code === "JOKER2") {
    return {
      id: `${code}-${index}`,
      code,
      suit: "trump",
      rank: code === "JOKER1" ? 54 : 55,
      points: 0,
    };
  }

  const rank = code.substring(0, code.length - 1);
  const suit = code[code.length - 1];

  const isTrumpNumber = rank === trumpRank;
  const isTrumpSuit = suit === trumpSuit;

  // Determine rank
  let numericRank;
  const adjustedSuitOrder = suits.filter((s) => s !== trumpSuit);
  const suitIndex = adjustedSuitOrder.indexOf(suit);
  const adjustedRankOrder = ranks.filter((r) => r !== trumpRank);
  const rankIndex = adjustedRankOrder.indexOf(rank);

  if (isTrumpNumber && suit !== trumpSuit) {
    // Offsuit 9s
    numericRank = 52;
  } else if (isTrumpNumber && suit === trumpSuit) {
    // Trump 9 (e.g. 9S)
    numericRank = 53;
  } else if (isTrumpSuit) {
    // Trump suit (non-trump-number)
    numericRank = 40 + rankIndex;
  } else {
    // Offsuit non-trump
    numericRank = suitIndex * 13 + rankIndex + 1;
  }

  return {
    id: `${code}-${index}`,
    code,
    suit: isTrumpSuit || isTrumpNumber ? "trump" : suit,
    rank: numericRank,
    points: rank === "5" ? 5 : rank === "10" || rank === "K" ? 10 : 0,
  };
}

function getTwoDecksShuffled(count = 108, trumpSuit, trumpRank) {
  const twoDecks = [...fullDeck, ...fullDeck];
  const deckWithComponents = twoDecks.map((code, index) =>
    parseCard(code, index, trumpSuit, trumpRank)
  );

  const shuffled_init = deckWithComponents.sort(() => Math.random() - 0.5);
  const shuffled = shuffled_init.sort(() => Math.random() - 0.5);

  /////////////////////////////////////////
  const debugDeck = {
    0: [],
    1: [], //["AH", "AH", "KH", "KH", "QH", "QH", "JH", "JH"],
    2: [],
    3: [],
  };

  for (let playerIndex = 0; playerIndex < 4; playerIndex++) {
    for (let i = 0; i < debugDeck[playerIndex].length; i++) {
      const cardCode = debugDeck[playerIndex][i];
      const cardIndex = shuffled.findIndex(
        (card, idx) =>
          card.code === cardCode &&
          ((idx - playerIndex) % 4 !== 0 || idx > playerIndex + (i - 1) * 4)
      );
      const temp = shuffled[playerIndex + i * 4];
      shuffled[playerIndex + i * 4] = shuffled[cardIndex];
      shuffled[cardIndex] = temp;
    }
  }
  ///////////////////////////////////////////////

  return shuffled.slice(0, count);
}

function findLargestTractor(cards, tractorLength) {
  const sortedCards = [...cards].sort((a, b) => a.rank - b.rank);
  let highestTractor = null;
  // tractor means every two adjacent cards in it have same rank ie [8, 8, 9, 9,10, 10]
  for (let i = 0; i <= sortedCards.length - tractorLength; i++) {
    const tractor = sortedCards.slice(i, i + tractorLength);
    // if not all same suit return
    if (!tractor.every((c) => c.suit === tractor[0].suit)) continue;
    // check every adjacent pair has same code
    if (
      tractor.every(
        (c, idx) => idx % 2 === 0 || c.code === tractor[idx - 1].code
      )
    ) {
      // check every card has rank of two cards down + 1
      const ranks = tractor.map((c) => c.rank);
      if (ranks.every((r, idx) => idx <= 1 || r === ranks[idx - 2] + 1)) {
        highestTractor = tractor;
      }
    }
  }
  return highestTractor;
}

function findLargestPair(cards) {
  const sortedCards = [...cards].sort((a, b) => a.rank - b.rank);
  let highestPair = null;
  for (let i = 0; i < sortedCards.length - 1; i++) {
    if (
      sortedCards[i].code === sortedCards[i + 1].code &&
      sortedCards[i].suit === sortedCards[i + 1].suit
    ) {
      highestPair = [sortedCards[i], sortedCards[i + 1]];
      i++; // skip next card as it's part of the pair
    }
  }
  return highestPair;
}

function decomposeHandToMatch(cards, decompToMatch) {
  // same number of cards in cards and decompToMatch
  const result = {
    tractors: [], // array of arrays
    pairs: [], // array of arrays
    singles: [], // array of single cards
  };
  // iterate through all tractors in cards
  for (const tractor of decompToMatch.tractors) {
    const tractorLength = tractor.length;
    // find largest tractor of this length in cards
    const foundTractor = findLargestTractor(cards, tractorLength);
    if (!foundTractor) return null;
    result.tractors.push(foundTractor);
    // remove found tractor from cards, can't use include instead use .some has id
    cards = cards.filter((c) => !foundTractor.some((f) => f.id === c.id));
  }
  // sort tractors
  result.tractors.sort((a, b) => {
    if (b.length !== a.length) return b.length - a.length;
    const bMax = Math.max(...b.map((c) => c.rank));
    const aMax = Math.max(...a.map((c) => c.rank));
    return bMax - aMax;
  });

  for (const pair of decompToMatch.pairs) {
    const foundPair = findLargestPair(cards);
    if (!foundPair) return null;
    result.pairs.push(foundPair);
    cards = cards.filter((c) => !foundPair.some((f) => f.id === c.id));
  }
  // sort pairs
  result.pairs.sort((a, b) => a[0].rank - b[0].rank);
  // remaining cards are singles
  result.singles = cards.sort((a, b) => a.rank - b.rank);
  return result;
}

function decomposeHand(cards = [], checkTractors = true) {
  if (cards.length === 0) return { tractors: [], pairs: [], singles: [] };

  const result = {
    tractors: [], // array of arrays
    pairs: [], // array of arrays
    singles: [], // array of single cards
  };

  // Group cards by code
  const codeGroups = {};
  for (const card of cards) {
    if (!codeGroups[card.code]) codeGroups[card.code] = [];
    codeGroups[card.code].push(card);
  }

  // Extract all actual pairs
  let allPairs = [];
  for (const group of Object.values(codeGroups)) {
    const numPairs = Math.floor(group.length / 2);
    for (let i = 0; i < numPairs; i++) {
      allPairs.push([group[2 * i], group[2 * i + 1]]);
    }
  }

  // Sort pairs by card rank ascending
  allPairs.sort((a, b) => a[0].rank - b[0].rank);

  // Detect tractors if enabled
  const usedPairs = new Set();
  if (checkTractors) {
    let i = 0;
    while (i < allPairs.length) {
      const tractor = [allPairs[i]];
      let j = i + 1;
      while (
        j < allPairs.length &&
        !usedPairs.has(j) &&
        allPairs[j][0].rank === allPairs[j - 1][0].rank + 1
      ) {
        tractor.push(allPairs[j]);
        j++;
      }

      if (tractor.length >= 2) {
        tractor.forEach((_, k) => usedPairs.add(i + k));
        result.tractors.push(tractor.flat());
        i = j;
      } else {
        i++;
      }
    }

    // Sort tractors: first by length descending, then by highest rank descending
    result.tractors.sort((a, b) => {
      if (b.length !== a.length) return b.length - a.length;
      const bMax = Math.max(...b.map((c) => c.rank));
      const aMax = Math.max(...a.map((c) => c.rank));
      return bMax - aMax;
    });
  }

  // Remaining pairs not in tractors
  allPairs.forEach((pair, idx) => {
    if (!usedPairs.has(idx)) result.pairs.push(pair);
  });

  // Sort remaining pairs by ascending rank
  result.pairs.sort((a, b) => a[0].rank - b[0].rank);

  // Mark remaining singles
  const usedIds = new Set([
    ...result.tractors.flat().map((c) => c.id),
    ...result.pairs.flat().map((c) => c.id),
  ]);
  result.singles = cards
    .filter((card) => !usedIds.has(card.id))
    .sort((a, b) => a.rank - b.rank);

  return result;
}

function existsHigherTractor(tractor, otherHand, leadSuit) {
  const otherHandDecomp = decomposeHand(otherHand, true);
  for (const otherTractor of otherHandDecomp.tractors) {
    if (
      otherTractor[0].suit === leadSuit &&
      otherTractor.length >= tractor.length &&
      Math.max(...otherTractor.map((c) => c.rank)) >
        Math.max(...tractor.map((c) => c.rank))
    ) {
      return true;
    }
  }
  return false;
}

function existsHigherPair(pair, otherHand, leadSuit) {
  const otherHandDecomp = decomposeHand(otherHand, false);
  for (const otherPair of otherHandDecomp.pairs) {
    if (
      otherPair[0].suit === leadSuit &&
      otherPair[0].rank > pair[0].rank &&
      otherPair[1].rank > pair[1].rank
    ) {
      return true;
    }
  }
  return false;
}

function existsHigherSingle(single, otherHand, leadSuit) {
  for (const card of otherHand) {
    if (card.suit === leadSuit && card.rank > single.rank) {
      return true;
    }
  }
  return false;
}

/**
 *  Returns any beatable component (list of cards), otherwise null
 */
function checkThrow(cards, playerName, allHands) {
  const handDecomp = decomposeHand(cards, true);
  const leadSuit = cards[0].suit;
  // Now check against all other players one at a time
  for (const [otherPlayer, otherHand] of Object.entries(allHands)) {
    if (otherPlayer === playerName) continue;

    for (const tractor of handDecomp.tractors) {
      if (existsHigherTractor(tractor, otherHand, leadSuit)) {
        return tractor;
      }
    }
    for (const pair of handDecomp.pairs) {
      if (existsHigherPair(pair, otherHand, leadSuit)) {
        return pair;
      }
    }
    for (const single of handDecomp.singles) {
      if (existsHigherSingle(single, otherHand, leadSuit)) {
        return [single];
      }
    }
  }
}

/**
 * Validates if selected cards are playable (same suit + single or consecutive pairs)
 */
function isPlayableFirst(
  cards,
  playerName,
  allHands,
  undoMove,
  playCards,
  io,
  roomName,
  getPublicState
) {
  if (cards.length === 0) return false;

  // Must be same suit
  const baseSuit = cards[0].suit;
  if (!cards.every((c) => c.suit === baseSuit)) return false;

  const handDecomp = decomposeHand(cards, true);
  // Playable if only one component
  if (
    handDecomp.tractors.length +
      handDecomp.pairs.length +
      handDecomp.singles.length ===
    1
  )
    return true;

  // Now, this hand must be a throw attempt
  // return true now, then check after 1 second if we need to fix it
  setTimeout(() => {
    const beatableComponent = checkThrow(cards, playerName, allHands);
    if (beatableComponent) {
      undoMove();
      console.error("Invalid throw attempt:", cards);
      playCards(playerName, beatableComponent);
      // Update game state
      io.to(roomName).emit("update_game", getPublicState());
    }
  }, 1000);
  return true;
}

/**
 * Validates if selected cards follow the first played hand
 */
function isPlayableFollows(cardsToPlay, remainingCards, firstHand) {
  if (!cardsToPlay || cardsToPlay.length === 0) return false;
  if (!firstHand || firstHand.length === 0) return true;
  if (cardsToPlay.length !== firstHand.length) return false;

  // Get suit of first play
  const leadSuit = firstHand[0].suit;

  // If our cardsToPlay are not of that suit, check if we could have followed
  const fullHand = [...cardsToPlay, ...remainingCards];

  const fullDecomp = decomposeHand(fullHand, false);
  const playedDecomp = decomposeHand(cardsToPlay, false);

  // 1. If we played cards not in the lead suit, but we had lead suit — illegal
  const numCardsInFullHandInLeadSuit = fullHand.filter(
    (c) => c.suit === leadSuit
  ).length;
  const numCardsPlayedInLeadSuit = cardsToPlay.filter(
    (c) => c.suit === leadSuit
  ).length;

  if (
    numCardsPlayedInLeadSuit <
    Math.min(numCardsInFullHandInLeadSuit, firstHand.length)
  ) {
    console.log("Played off-suit when we had lead suit");
    return false;
  }

  // 2. If firstHand is pair(s), we must match as far as possible
  const firstDecomp = decomposeHand(firstHand, false);

  const numPairsLead = firstDecomp.pairs.length;

  if (numPairsLead > 0) {
    const numPairsPlayedInLeadSuit = playedDecomp.pairs.filter(
      (pair) => pair[0].suit === leadSuit
    ).length;
    const numPairsInHandInLeadSuit = fullDecomp.pairs.filter(
      (pair) => pair[0].suit === leadSuit
    ).length;
    if (
      numPairsPlayedInLeadSuit < numPairsInHandInLeadSuit &&
      numPairsPlayedInLeadSuit < numPairsLead
    ) {
      // We could have played more pairs, but didn't
      return false;
    }
  }

  return true;
}

function determineTrickWinner(playZones, trickStarter, playerOrder) {
  const trickStarterIndex = playerOrder.indexOf(trickStarter);
  let winningPlayer = trickStarter;
  let winningPlayedCards = playZones[trickStarter] || [];
  let winningDecomp = decomposeHand(winningPlayedCards, true);
  console.log("Winning decomp:");
  console.dir(winningDecomp, { depth: null });

  // Determine the suit only if all cards match
  const winningSuit = winningPlayedCards.every(
    (c) => c.suit === winningPlayedCards[0].suit
  )
    ? winningPlayedCards[0].suit
    : null;

  console.assert(winningSuit, "Winning suit should be determined");

  for (let offset = 1; offset < 4; offset++) {
    const currentIndex = (trickStarterIndex + offset) % playerOrder.length;
    const challengerId = playerOrder[currentIndex];
    const challengerCards = playZones[challengerId] || [];
    const challengerDecomp = decomposeHandToMatch(
      challengerCards,
      winningDecomp
    );

    if (challengerDecomp === null) continue;
    console.log("Challenger decomp:");
    console.dir(challengerDecomp, { depth: null });

    const challengerSuit = challengerCards.every(
      (c) => c.suit === challengerCards[0]?.suit
    )
      ? challengerCards[0]?.suit
      : null;

    if (!challengerSuit) continue;
    if (challengerSuit !== winningSuit && challengerSuit !== "trump") continue;

    // Always use compareDecomp to resolve
    const cmp = compareDecomp(challengerDecomp, winningDecomp);
    if (cmp > 0) {
      winningPlayer = challengerId;
      winningDecomp = challengerDecomp;
      winningPlayedCards = challengerCards;
    }
  }

  return winningPlayer;
}

// Check if d1 decomp can beat d2 decomp
// Returns negative if d1 < d2, positive if d1 > d2, 0 if equal
// Suits have already been checked, supposedly
function compareDecomp(d1, d2) {
  console.assert(
    d1.tractors.length === d2.tractors.length,
    "Tractors length mismatch"
  );
  console.assert(d1.pairs.length === d2.pairs.length, "Pairs length mismatch");
  console.assert(
    d1.singles.length === d2.singles.length,
    "Singles length mismatch"
  );

  let firstComponentLarger = null;
  for (let i = 0; i < d1.tractors.length; i++) {
    console.assert(d1.tractors[i].length === d2.tractors[i].length);
    if (
      d1.tractors[i][0].rank < d2.tractors[i][0].rank &&
      firstComponentLarger === null
    ) {
      return -1;
    }
    firstComponentLarger = true;
  }
  for (let i = 0; i < d1.pairs.length; i++) {
    if (
      d1.pairs[i][0].rank <= d2.pairs[i][0].rank &&
      firstComponentLarger === null
    ) {
      return -1;
    }
    firstComponentLarger = true;
  }
  for (let i = 0; i < d1.singles.length; i++) {
    if (
      d1.singles[i].rank <= d2.singles[i].rank &&
      firstComponentLarger === null
    ) {
      return -1;
    }
    firstComponentLarger = true;
  }

  // If made it here, than we have all components in d1
  console.assert(firstComponentLarger, "First component larger should be set");
  return true;
}

function incrementRank(oldRank, delta) {
  const prevRankIndex = ranks.indexOf(oldRank);
  const newRankIndex = Math.min(prevRankIndex + delta, ranks.length - 1);
  return ranks[newRankIndex];
}

module.exports = {
  ranks,
  getTwoDecksShuffled,
  isPlayableFirst,
  isPlayableFollows,
  determineTrickWinner,
  decomposeHand,
  parseCard,
  incrementRank,
};
