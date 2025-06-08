// components/cardUtils.js
const suitOrder = ["C", "D", "H", "S"];
const rankOrder = [
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

export function decomposeHand(cards = [], checkTractors = true) {
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

/**
 * Sorts hand by suit, trump, rank — expects card.rank & card.suit to be present
 */
export function sortHand(cards) {
  return [...cards].sort((a, b) => {
    // Jokers last
    if (a.code.startsWith("JOKER2")) return 1;
    if (b.code.startsWith("JOKER2")) return -1;
    if (a.code.startsWith("JOKER1")) return 1;
    if (a.code.startsWith("JOKER1")) return -1;

    const aIsTrump = a.suit == "trump";
    const bIsTrump = b.suit == "trump";
    if (aIsTrump && !bIsTrump) return 1;
    if (!aIsTrump && bIsTrump) return -1;
    if (a.rank !== b.rank) return a.rank - b.rank;
    return a.code.localeCompare(b.code);
  });
}

/**
 * Validates if selected cards are playable (same suit + single or consecutive pairs)
 */
export function isPlayableFirst(cards) {
  if (cards.length === 0) return false;

  // All cards must share the same suit
  const baseSuit = cards[0].suit;
  if (!cards.every((c) => c.suit === baseSuit)) return false;

  return true;
}

export function canBid(playerName, bid, trumpRank, activeBid, activeBidder) {
  if (playerName === activeBidder) {
    return (
      activeBid.length === 1 &&
      bid.length === 1 &&
      activeBid[0].code === bid[0].code
    );
  }

  if (
    bid.length === 1 &&
    (!bid[0].code.startsWith(trumpRank) || bid[0].code.startsWith("JOKER"))
  ) {
    return false;
  }

  if (
    bid.length === 2 &&
    (!(bid[0].code === bid[1].code) || !(bid[0].suit === "trump"))
  ) {
    return false;
  }

  if (bid.length > 2) {
    return false;
  }

  if (!activeBid) {
    return true;
  }

  if (activeBid.length < bid.length) {
    return true;
  }

  if (
    bid[0].code.startsWith("JOKER") &&
    !activeBid[0].code.startsWith("JOKER")
  ) {
    return true;
  }

  return false;
}
