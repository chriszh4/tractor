import { useEffect, useState, useRef } from "react";
import io from "socket.io-client";
import { decomposeHand } from "./cardUtils";

export default function BotPlayer({ roomName, nthPlayer = 4 }) {
  const [myName] = useState(
    "Bot_" + Math.random().toString(36).substring(2, 6)
  );
  const [joined, setJoined] = useState(false);
  const dealtCardsRef = useRef(false);
  const myHandRef = useRef([]);
  const trumpRankRef = useRef(null);
  const outOfSuitsRef = useRef({});
  const bottomPileDoneRef = useRef(false);
  const myRoomName = useRef(null);

  useEffect(() => {
    const socket = io(
      import.meta.env.VITE_SOCKET_URL || "http://localhost:3001"
    );
    myRoomName.ref = roomName;
    socket.emit("listen_room", myRoomName.ref);

    socket.on("join_order", ({ playerJoinOrder }) => {
      const count = Object.keys(playerJoinOrder).length;
      console.log(
        `[${myName}] Current player count: ${count}, nthPlayer: ${nthPlayer}`
      );

      if (!joined && count + 1 === nthPlayer) {
        console.log(`[${myName}] joining as player #${nthPlayer}`);
        socket.emit("join_room", { roomName: myRoomName.ref, name: myName });
        setJoined(true);
      }
    });

    socket.on("start_game", ({ trumpRank, playerNames }) => {
      console.log(`[${myName}] Game started. Trump rank: ${trumpRank}`);
      dealtCardsRef.current = false;
      bottomPileDoneRef.current = false;
      myHandRef.current = [];
      trumpRankRef.current = trumpRank;
      // Set outOfSuits to empty for all players (so when game starts, it is always initialized and empty)
      const newOutOfSuits = {};
      for (let i = 0; i < 4; i++) {
        newOutOfSuits[playerNames[i]] = [];
      }
      outOfSuitsRef.current = newOutOfSuits;
    });

    socket.on("dealt_cards", () => {
      dealtCardsRef.current = true;
    });

    socket.on("bottom_pile_done", (data) => {
      bottomPileDoneRef.current = true;
    });

    socket.on("bottom_pile", (bottomPile, throneName, throneCards) => {
      if (throneName !== myName) return;

      console.log(`[${myName}] Returning bottom pile with weakest cards`);

      let allCards = [...bottomPile, ...throneCards];
      // Sort by points, then by rankasstrength
      allCards.sort((a, b) => {
        const pointsA = a.points;
        const pointsB = b.points;
        if (pointsA !== pointsB) return pointsA - pointsB;
        return rankAsStrength(a) - rankAsStrength(b);
      });

      const selected = allCards.slice(0, 8);

      socket.emit("bottom_pile_done", {
        roomName: myRoomName.ref,
        playerName: myName,
        bottomPile: selected,
      });
    });

    socket.on("update_game", (data) => {
      // maybe refactor data -> {all fields}
      if (!dealtCardsRef.current) {
        const prevHand = myHandRef.current || [];
        const newHand = data.hands[myName] || [];

        // console.log(`[${myName}] My hand:`, prevHand);
        // console.log(`[${myName}] New hand: `, newHand);

        if (newHand.length > prevHand.length) {
          const newCard = newHand.find(
            (card) => !prevHand.some((c) => c.id === card.id)
          );
          if (newCard) {
            // console.log(`[${myName}] New card received: ${newCard.code}`);
            const anyPlayerHasPlayed = Object.values(data.playZones).some(
              (cards) => cards.length > 0
            );
            if (
              newCard.code.startsWith(trumpRankRef.current) &&
              !anyPlayerHasPlayed &&
              (Math.random() < 0.3 || trumpRankRef.current === "2")
            ) {
              console.log(`[${myName}] Bidding card: ${newCard.code}`);
              socket.emit("bid_cards", {
                roomName: myRoomName.ref,
                playerName: myName,
                bid: [newCard],
              });
            }
          }
        }

        myHandRef.current = [...newHand];
        return;
      }
      if (!bottomPileDoneRef.current || data.hands[myName].length === 0) {
        return;
      }
      const handNow = data.hands[myName] || [];
      const zones = data.playZones || {};
      const names = data.playerNames || [];
      const trickWinner = data.trickWinner || "";

      checkOutOfSuits(
        data.playZones,
        myName,
        data.playerNames,
        data.trickStarter
      );
      if (data.turn === myName) {
        setTimeout(() => {
          playSmartly(handNow, zones, names, myName, trickWinner, socket);
        }, 2000);
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [myName, joined, nthPlayer]);

  function playCardsToServer(myName, selectedCards, socket) {
    console.log(
      `[${myName}] Playing cards: ${selectedCards
        .map((c) => c.code)
        .join(", ")}`
    );
    socket.emit("play_cards", {
      roomName: myRoomName.ref,
      playerName: myName,
      selectedCards,
    });
  }

  function checkOutOfSuits(playZones, myName, playerNames, trickStarter) {
    // If playzones empty, return
    const allEmpty = Object.values(playZones).every(
      (cards) => cards.length === 0
    );
    if (allEmpty) {
      return;
    }

    // Identify the lead player
    let leadIndex = playerNames.indexOf(trickStarter);
    const leadPlayer = playerNames[leadIndex]; // trickStarter
    const leadCards = playZones[leadPlayer] || [];
    const leadSuit = leadCards[0]?.suit;
    // Now iterate through all hands played
    for (const player of playerNames) {
      if (playZones[player].length === 0) continue;
      const hand = playZones[player];
      // Check if not all cards played by player are in lead suit
      const cardsNotInLeadSuit = hand.filter((c) => c.suit !== leadSuit);
      if (cardsNotInLeadSuit.length !== 0) {
        // Player is out of LeadSuit
        if (!outOfSuitsRef.current[player].includes(leadSuit)) {
          console.log(
            `[${myName}] Player ${player} is out of suit: ${leadSuit}`
          );
          outOfSuitsRef.current[player].push(leadSuit);
        }
      }
    }
  }

  function playLead(hand, myName, playerNames, socket) {
    const myIndex = playerNames.indexOf(myName);
    const opposingIndex1 = (myIndex + 1) % playerNames.length;
    const teammateIndex = (myIndex + 2) % playerNames.length;
    const opposingIndex2 = (myIndex + 3) % playerNames.length;
    const teammateName = playerNames[teammateIndex];
    const teammateOutOfSuits = outOfSuitsRef.current[teammateName] || [];
    const opposingOutOfSuits = [
      ...(outOfSuitsRef.current[playerNames[opposingIndex1]] || []),
      ...(outOfSuitsRef.current[playerNames[opposingIndex2]] || []),
    ];

    const handDecomp = decomposeHand(hand, true);
    // First, play any possible tractors (exception for SUPER large trump ones)
    if (handDecomp.tractors.length > 0) {
      for (const tractor of handDecomp.tractors) {
        const selected = tractor;
        const maxRank = Math.max(...selected.map((c) => c.rank));
        if (maxRank >= 52) {
          continue;
        }
        console.log(`[${myName}] Playing lead with tractor`);
        playCardsToServer(myName, selected, socket);
        return;
      }
    }
    // Now look for non trump Aces that are not in opponent's out suit
    const nonTrumpAces = hand.filter(
      (c) =>
        c.code[0] === "A" &&
        c.suit !== "trump" &&
        opposingOutOfSuits.indexOf(c.suit) === -1
    );
    if (nonTrumpAces.length > 0) {
      const selected = nonTrumpAces[0];
      // check if there is another one of the same suit with different id
      const sameSuitAces = hand.filter(
        (c) => c.code[0] === "A" && c.suit === selected.suit
      );
      console.log(`[${myName}] Playing lead with Ace`);
      playCardsToServer(myName, sameSuitAces, socket);
      return;
    }
    // Now look for non trump pairs J, Q, K, A
    const leadPairs = handDecomp.pairs.filter(
      (pair) =>
        pair[0].suit !== "trump" &&
        ["J", "Q", "K", "A"].includes(pair[0].code[0])
    );
    if (leadPairs.length > 0) {
      const selected = leadPairs[0];
      console.log(`[${myName}] Playing lead with pair`);
      playCardsToServer(myName, selected, socket);
      return;
    }
    // If teammate is out of something that opposing isn't out (excluding trump)
    console.log(
      `[${myName}] Teammate out of suits: ${teammateOutOfSuits.join(", ")}`
    );
    const teammateOutOfSuitsNotInOpposing = teammateOutOfSuits.filter(
      (suit) => !opposingOutOfSuits.includes(suit) && suit !== "trump"
    );
    console.log(
      `[${myName}] Teammate out of suits not in opposing: ${teammateOutOfSuitsNotInOpposing.join(
        ", "
      )}`
    );
    if (teammateOutOfSuitsNotInOpposing.length > 0) {
      for (const suit of teammateOutOfSuitsNotInOpposing) {
        const cardsInSuit = hand
          .filter((c) => c.suit === suit)
          .sort(
            // sort by points first, then rank (all largest to smallest)
            (a, b) => {
              const pointsA = a.points;
              const pointsB = b.points;
              if (pointsA !== pointsB) return pointsB - pointsA;
              return b.rank - a.rank;
            }
          );
        if (cardsInSuit.length > 0) {
          const selected = cardsInSuit[0];
          console.log(
            `[${myName}] Playing lead with card in teammate's out suit: ${suit}`
          );
          playCardsToServer(myName, [selected], socket);
          return;
        }
      }
    }
    // Otherwise, play a trump card with the smallest rank
    const fishTrumpProb = 0.6;
    if (Math.random() < fishTrumpProb) {
      const trumpCards = hand.filter((c) => c.suit === "trump");
      if (trumpCards.length > 0) {
        const selected = trumpCards.sort((a, b) => a.rank - b.rank)[0];
        console.log(`[${myName}] Playing lead with trump card`);
        playCardsToServer(myName, [selected], socket);
        return;
      }
    }
    // Play any trump pair with 20% probability
    if (Math.random() < 0.2) {
      const trumpPairs = handDecomp.pairs.filter(
        (pair) => pair[0].suit === "trump"
      );
      if (trumpPairs.length > 0) {
        const selected = trumpPairs[0];
        console.log(`[${myName}] Playing lead with trump pair`);
        playCardsToServer(myName, selected, socket);
        return;
      }
    }
    // Now play largest remaining pair in offsuit, sorting by rankAsStrength
    const playPairProb = 0.8;
    if (Math.random() < playPairProb) {
      const offsuitPairs = handDecomp.pairs
        .filter((pair) => pair[0].suit !== "trump")
        .sort((a, b) => {
          return rankAsStrength(b[0]) - rankAsStrength(a[0]);
        });
      if (offsuitPairs.length > 0) {
        const selected = offsuitPairs[0];
        console.log(`[${myName}] Playing lead with offsuit pair`);
        playCardsToServer(myName, selected, socket);
        return;
      }
    }

    // If no valid lead found, play the first card in hand that opponent is not out of
    console.log(`[${myName}] Playing lead with first card`);
    for (const card of hand) {
      if (opposingOutOfSuits.indexOf(card.suit) === -1) {
        playCardsToServer(myName, [card], socket);
        return;
      }
    }
    // Play first card in hand
    if (hand.length > 0) {
      console.log(`[${myName}] Playing lead with first card in hand`);
      playCardsToServer(myName, [hand[0]], socket);
      return;
    }
    console.warn(`[${myName}] No valid lead found, playing nothing`);
  }

  function playFollowTeammate(
    hand,
    myName,
    playerNames,
    trickWinner,
    trickWinnerCards,
    leadPlayer,
    leadCards,
    socket,
    playersPlayedSoFar,
    playZones
  ) {
    // check if teammate is winning
    const myIndex = playerNames.indexOf(myName);
    const leadIndex = playerNames.indexOf(leadPlayer);
    const teammateIndex = (myIndex + 2) % playerNames.length;
    const teammateName = playerNames[teammateIndex];
    const leadSuit = leadCards[0]?.suit;
    if (teammateName === trickWinner) {
      console.log(`[${myName}] Teammate ${teammateName} is winning`);
      const strength = evaluateHandStrength(trickWinnerCards, leadCards);
      if (strength >= 7 || playersPlayedSoFar === 3) {
        // Feed points
        playToFeed(
          hand,
          myName,
          leadPlayer,
          leadCards,
          trickWinnerCards,
          socket
        );
      } else if (leadSuit !== "trump" || Math.random() < 0.7) {
        // 70% chance to play to beat IF in trump
        console.log("[${myName}] Teammate is winning, choosing to try to beat");
        playToBeat(
          hand,
          myName,
          leadPlayer,
          leadCards,
          trickWinnerCards,
          socket
        );
      } else {
        playSmall(hand, myName, leadPlayer, leadCards, socket);
      }
    } else {
      console.log(
        `[${myName}] Teammate ${teammateName} is not winning, playing to beat`
      );
      // Teammate is not winning, play to beat if not last to act
      if (playersPlayedSoFar !== 3) {
        playToBeat(
          hand,
          myName,
          leadPlayer,
          leadCards,
          trickWinnerCards,
          socket
        );
      }
      // Otherwise we are last to act, beat if sufficient points inside
      // count all points in playzone
      const pointsInTrick =
        Object.values(playZones).reduce(
          (sum, cards) =>
            sum + cards.reduce((acc, card) => acc + card.points, 0),
          0
        ) || 0;

      const probToBeatIfFewPoints = 0.3;
      if (pointsInTrick >= 10 || Math.random() < probToBeatIfFewPoints) {
        console.log(
          `[${myName}] Playing to beat with points in trick: ${pointsInTrick}`
        );
        playToBeat(
          hand,
          myName,
          leadPlayer,
          leadCards,
          trickWinnerCards,
          socket
        );
      } else {
        playSmall(hand, myName, leadPlayer, leadCards, socket);
      }
    }
  }

  function evaluateHandStrength(cards, leadCards) {
    if (cards[0].suit === "trump" && leadCards[0].suit !== "trump") {
      return 9; // teammate trumped
    }

    if (cards.length >= 3) {
      return 10;
    }

    if (cards.length == 2) {
      if (["J", "Q", "K", "A"].includes(cards[0].code[0])) {
        return 8; // Strong pair
      } else {
        return 5;
      }
    }
    const card = cards[0];
    if (card.suit === "trump") {
      if (card.rank >= 52) {
        // At least offsuit trump rank
        return 10; // Strong trump card
      }
      return 5; // Weak trump card
    }

    if (card.code[0] === "A") {
      return 9;
    }

    return 4;
  }

  function playToFeed(
    hand,
    myName,
    leadPlayer,
    leadCards,
    trickWinnerCards,
    socket
  ) {
    const myHandDecomp = decomposeHand(hand, false);
    const leadHandDecomp = decomposeHand(leadCards, false);
    const pairsToPlay = leadHandDecomp.pairs.length;
    const leadSuit = leadCards[0]?.suit;
    let selectedCards = [];
    // First play all pairs within lead suit
    let pairsInLeadSuit = myHandDecomp.pairs.filter(
      (pair) => pair[0].suit === leadSuit
    );

    // sort by points then choosing lowest rank
    pairsInLeadSuit.sort((a, b) => {
      const pointsA = a.reduce((sum, card) => sum + card.points, 0);
      const pointsB = b.reduce((sum, card) => sum + card.points, 0);
      if (pointsA !== pointsB) return pointsB - pointsA;
      return a[0].rank - b[0].rank;
    });
    for (let i = 0; i < pairsToPlay && i < pairsInLeadSuit.length; i++) {
      if (selectedCards.length / 2 < pairsToPlay) {
        selectedCards.push(...pairsInLeadSuit[i]);
      }
    }

    let unplayedCardsInSuit = hand.filter(
      (c) => c.suit === leadSuit && !selectedCards.some((sc) => sc.id === c.id)
    );

    // Now play singles within suit, sort by points then choosing lowest rank
    unplayedCardsInSuit.sort((a, b) => {
      const pointsA = a.points;
      const pointsB = b.points;
      if (pointsA !== pointsB) return pointsB - pointsA;
      return a.rank - b.rank;
    });

    for (let i = 0; i < unplayedCardsInSuit.length; i++) {
      if (selectedCards.length + 1 <= leadCards.length) {
        selectedCards.push(unplayedCardsInSuit[i]);
      }
    }

    // Now fill with points from remaining cards
    let remainingCards = hand.filter(
      (c) => !selectedCards.some((sc) => sc.id === c.id)
    );
    remainingCards.sort((a, b) => {
      const pointsA = a.points;
      const pointsB = b.points;
      if (pointsA !== pointsB) return pointsB - pointsA;
      return a.rank - b.rank;
    });
    for (const card of remainingCards) {
      if (selectedCards.length < leadCards.length) {
        selectedCards.push(card);
      } else {
        break;
      }
    }
    console.log(`[${myName}] Playing to feed`);
    playCardsToServer(myName, selectedCards, socket);
  }

  // Return null if we can't beat it
  // Otherwise return beating hand
  function checkCanBeat(hand, leadCards, trickWinnerCards) {
    let effectiveLeadCards = leadCards;
    if (trickWinnerCards[0].suit === leadCards[0].suit) {
      effectiveLeadCards = trickWinnerCards;
    } else {
      // Don't know if we can trump the lead because we might not be out
      const haveCardsInLeadSuit = hand.some(
        (c) => c.suit === leadCards[0].suit
      );
      if (haveCardsInLeadSuit) {
        return null;
      }
      effectiveLeadCards = trickWinnerCards;
      console.assert(
        effectiveLeadCards[0].suit === "trump",
        "Current trick winner should be trumps"
      );
    }
    // CURRENTLY NOT ABLE TO TRUMP TRACTORS AND PAIRS
    const leadDecomp = decomposeHand(effectiveLeadCards, true);
    const leadSuit = effectiveLeadCards[0]?.suit;
    const cardsInLeadSuit = hand.filter((c) => c.suit === leadSuit);
    let myleadSuitDecomp = decomposeHand(cardsInLeadSuit, true);
    // First process if any tractors were led
    if (leadDecomp.tractors.length > 0) {
      if (
        leadDecomp.tractors.length > 1 ||
        myleadSuitDecomp.tractors.length === 0
      ) {
        return null;
      }
      const ourTractor = myleadSuitDecomp.tractors[0];
      const ourTractorRank = Math.max(...ourTractor.map((c) => c.rank));
      const leadTractor = leadDecomp.tractors[0];
      const leadTractorRank = Math.max(...leadTractor.map((c) => c.rank));
      if (ourTractorRank > leadTractorRank) {
        return ourTractor.splice(0, leadTractor.length);
      } else {
        return null;
      }
    }
    // Now process pairs
    myleadSuitDecomp = decomposeHand(cardsInLeadSuit, false);
    // Check if we have at least as many pairs as lead
    if (leadDecomp.pairs.length > myleadSuitDecomp.pairs.length) {
      return null;
    }
    // Check if my first pair is bigger than lead's first pair
    if (leadDecomp.pairs.length > 0) {
      const leadPair = leadDecomp.pairs[0];
      const myPair = myleadSuitDecomp.pairs[0];
      const selectedCards = [];
      if (myPair[0].rank > leadPair[0].rank) {
        for (let i = 0; i < leadDecomp.pairs.length; i++) {
          selectedCards.push(myleadSuitDecomp.pairs[i][0]);
          selectedCards.push(myleadSuitDecomp.pairs[i][1]);
        }
      } else {
        return null;
      }
      // Fill the rest with cards in my lead suit
      const unplayedCardsInLeadSuit = hand.filter(
        (c) =>
          c.suit === leadSuit && !selectedCards.some((sc) => sc.id === c.id)
      );
      unplayedCardsInLeadSuit.sort((a, b) => a.rank - b.rank);
      for (const card of unplayedCardsInLeadSuit) {
        if (selectedCards.length < leadCards.length) {
          selectedCards.push(card);
        } else {
          break;
        }
      }
      if (selectedCards.length === leadCards.length) {
        return selectedCards;
      } else {
        return null;
      }
    }

    // Now assume we are dealing with a single card(s)
    const cardsToPlay = effectiveLeadCards.length;
    console.assert(
      cardsToPlay === leadDecomp.singles.length,
      "Single cards should be played"
    );
    const cardsInLeadSuitSingle = hand.filter((c) => c.suit === leadSuit);
    if (cardsInLeadSuitSingle.length === 0) {
      // No cards in lead suit, we can beat with a trump card
      const trumpCards = hand.filter((c) => c.suit === "trump");
      if (trumpCards.length >= cardsToPlay) {
        return trumpCards.splice(0, cardsToPlay);
      } else {
        return null;
      }
    } else if (cardsToPlay > 1) {
      console.log(
        `[${myName}] Can't beat throw within suit and still have cards in suit`
      );
      return null;
    } else {
      // Has to be ONE card because otherwise throw not legal
      console.assert(cardsToPlay === 1, "Should be one card to beat");
      const leadCard = effectiveLeadCards[0];
      const cardsThatCanBeat = cardsInLeadSuitSingle.filter(
        (c) => c.rank > leadCard.rank
      );
      if (cardsThatCanBeat.length === 0) {
        // No cards that can beat, we can't beat
        return null;
      }

      if (leadSuit !== "trump") {
        // Choose largest one
        cardsThatCanBeat.sort((a, b) => b.rank - a.rank);
        return [cardsThatCanBeat[0]];
      } else {
        // Choose any random trump with rank at least  51 ("A" of trump)
        const bigCardsThatCanBeat = cardsThatCanBeat.filter(
          (c) => c.rank >= 51
        );
        if (bigCardsThatCanBeat.length > 0) {
          const randomBigCard =
            bigCardsThatCanBeat[
              Math.floor(Math.random() * bigCardsThatCanBeat.length)
            ];
          return [randomBigCard];
        } else {
          // No big cards, choose any trump card
          return [cardsThatCanBeat[0]];
        }
      }
    }
  }

  function playToBeat(
    hand,
    myName,
    leadPlayer,
    leadCards,
    trickWinnerCards,
    socket
  ) {
    const beatingHand = checkCanBeat(hand, leadCards, trickWinnerCards);
    if (beatingHand !== null) {
      console.log(`[${myName}] Playing to beat`);
      playCardsToServer(myName, beatingHand, socket);
    } else {
      console.log(`[${myName}] Cannot beat, playing small`);
      playSmall(hand, myName, leadPlayer, leadCards, socket);
    }
  }

  function playSmartly(
    hand,
    playZones,
    playerNames,
    myName,
    trickWinner,
    socket
  ) {
    const playerIndexPlayed = Object.keys(playZones)
      .filter((player) => playZones[player].length > 0)
      .map((player) => playerNames.indexOf(player));
    if (playerIndexPlayed.length % 4 === 0) {
      playLead(hand, myName, playerNames, socket);
      return;
    }
    const myIndex = playerNames.indexOf(myName);
    let nextPlayerIndex = (myIndex + 1) % playerNames.length;
    while (
      nextPlayerIndex !== myIndex &&
      !playerIndexPlayed.includes(nextPlayerIndex)
    ) {
      nextPlayerIndex = (nextPlayerIndex + 1) % playerNames.length;
    }

    const leadPlayer = playerNames[nextPlayerIndex];
    const leadCards = playZones[leadPlayer] || [];
    const playersPlayedSoFar = playerIndexPlayed.length;
    const pointsPlayed =
      Object.values(playZones).reduce(
        (sum, cards) => sum + cards.reduce((acc, card) => acc + card.points, 0),
        0
      ) || 0;
    if (playersPlayedSoFar >= 2) {
      playFollowTeammate(
        hand,
        myName,
        playerNames,
        trickWinner,
        playZones[trickWinner] || [],
        leadPlayer,
        leadCards,
        socket,
        playersPlayedSoFar,
        playZones
      );
    } else if (playersPlayedSoFar === 1 && pointsPlayed >= 10) {
      console.log(
        `[${myName}] Decided to play to beat because points played so far: ${pointsPlayed}`
      );
      playToBeat(
        hand,
        myName,
        leadPlayer,
        leadCards,
        playZones[trickWinner] || [],
        socket
      );
    } else if (playersPlayedSoFar === 1 && leadCards[0].suit === "trump") {
      const probToBeat = 0.4;
      if (Math.random() < probToBeat) {
        console.log(
          `[${myName}] Decided to beat with ${probToBeat * 100}% probability`
        );
        playToBeat(
          hand,
          myName,
          leadPlayer,
          leadCards,
          playZones[trickWinner] || [],
          socket
        );
      } else {
        console.log(
          `[${myName}] Decided to play small with ${
            100 - probToBeat * 100
          }% probability`
        );
        playSmall(hand, myName, leadPlayer, leadCards, socket);
      }
    } else {
      playToBeat(
        hand,
        myName,
        leadPlayer,
        leadCards,
        playZones[trickWinner] || [],
        socket
      );
    }
  }

  function rankAsStrength(card) {
    // Non trumps are assigned 1 to 12
    if (card.suit !== "trump") {
      const rank = card.code.slice(0, -1);
      return (
        [
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
        ].indexOf(rank) + 1
      );
    }
    return card.rank;
  }

  function playSmall(hand, myName, leadPlayer, leadCards, socket) {
    console.log(`[${myName}] Playing small`);

    const leadSuit = leadCards[0]?.suit;
    const requiredLength = leadCards.length;

    const inSuitCards = hand
      .filter((c) => c.suit === leadSuit)
      .sort((a, b) => {
        const pointsA = a.points;
        const pointsB = b.points;
        if (pointsA !== pointsB) return pointsA - pointsB;
        return a.rank - b.rank;
      });
    const outSuitCards = hand
      .filter((c) => c.suit !== leadSuit)
      .sort((a, b) => {
        const pointsA = a.points;
        const pointsB = b.points;
        if (pointsA !== pointsB) return pointsA - pointsB;
        return rankAsStrength(a) - rankAsStrength(b);
      });
    const selected = [];
    const usedIds = new Set();

    // Step 1: Group in-suit pairs
    const rankMap = {};
    for (const card of inSuitCards) {
      if (!rankMap[card.code]) rankMap[card.code] = [];
      rankMap[card.code].push(card);
    }
    // Step 2: REMOVED. not filling tractors

    // Step 3: Fill with other in-suit pairs
    for (const group of Object.values(rankMap)) {
      if (selected.length + 1 >= requiredLength) break;
      const unused = group.filter((c) => !usedIds.has(c.id));
      if (unused.length >= 2) {
        selected.push(unused[0], unused[1]);
        usedIds.add(unused[0].id);
        usedIds.add(unused[1].id);
      }
    }

    // Step 4: Fill with in-suit singles
    for (const card of inSuitCards) {
      if (selected.length >= requiredLength) break;
      if (!usedIds.has(card.id)) {
        selected.push(card);
        usedIds.add(card.id);
      }
    }

    // Step 5: Fill with off-suit singles
    for (const card of outSuitCards) {
      if (selected.length >= requiredLength) break;
      selected.push(card);
    }
    console.log(
      `[${myName}] Selected cards: ${selected.map((c) => c.code).join(", ")}`
    );

    if (selected.length === requiredLength) {
      socket.emit("play_cards", {
        roomName: myRoomName.ref,
        playerName: myName,
        selectedCards: selected,
      });
    } else {
      console.warn(
        `[${myName}] Could not find ${requiredLength} legal cards to play.`
      );
    }
  }
  return null; // Headless bot
}
