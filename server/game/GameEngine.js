// server/game/GameEngine.js
const {
  getTwoDecksShuffled,
  isPlayableFirst,
  isPlayableFollows,
  determineTrickWinner,
  decomposeHand,
  parseCard,
  incrementRank,
} = require("./cardUtils");

const DECK_SIZE = 16; //108;
class GameEngine {
  constructor(roomName, io, playerNames) {
    this.roomName = roomName;
    this.io = io;
    this.trumpRank = "2"; // Default trump rank
    this.trumpSuit = null;
    this.deck = getTwoDecksShuffled(DECK_SIZE, this.trumpSuit, this.trumpRank); // 108
    this.bottomPile = this.deck.slice(-8);
    this.deck = this.deck.slice(0, -8);
    this.hands = {};
    this.turnIndex = 0;
    this.trickStarter = playerNames[0];
    this.trickWinner = null;
    this.playedThisTrick = 0;
    this.playerOrder = [...playerNames];
    this.playerNames = playerNames;
    this.playZones = {};
    this.resetPlayZones();
    this.pointsWon = 0;
    // this.dealtCards = false;
    this.activeBid = [];
    this.activeBidder = null;
    this.throneIndex = null;
    this.throneName = null;
    this.throneTeammateName = null;
    this.firstRound = true;
    this.teamRank = {};
    this.playerNames.forEach((name) => {
      this.teamRank[name] = "2";
    });
    this.totalPointsWon = 0;
    this.readyToPlay = false;
    //
    this.undoMove = this.undoMove.bind(this);
    this.playCards = this.playCards.bind(this);
    //
    this.gameOver = false;
  }

  setThronePlayer(playerName) {
    this.throneName = playerName;
    this.throneIndex = this.playerOrder.indexOf(playerName);
    this.throneTeammateName =
      this.playerOrder[(this.throneIndex + 2) % this.playerOrder.length];
  }

  bidCards(playerName, bid) {
    if (playerName !== this.activeBidder) {
      // First, return previous bids to hands
      if (this.activeBid.length > 0) {
        this.activeBid.forEach((card) => {
          this.hands[this.activeBidder].push(card);
        });
        this.playZones[this.activeBidder] = [];
      }
      this.activeBid = bid;
      this.activeBidder = playerName;
      // Remove the bid cards from the player's hand
      this.hands[playerName] = this.hands[playerName].filter(
        (card) => !bid.some((b) => b.id === card.id)
      );
      // Add the bid cards to the play zone for the active bidder
      this.playZones[playerName] = bid;
    } else {
      // Reinforce the bid
      this.playZones[playerName] = [...this.playZones[playerName], ...bid];
      this.hands[playerName] = this.hands[playerName].filter(
        (card) => !bid.some((b) => b.id === card.id)
      );
      this.activeBid = [...this.activeBid, ...bid];
    }

    if (bid[0].code.startsWith("JOKER")) this.trumpSuit = null;
    else this.trumpSuit = bid[0].code.slice(-1);
  }

  playCards(playerName, cards) {
    if (this.turnIndex !== this.playerOrder.indexOf(playerName)) {
      throw new Error("Not your turn!");
    }

    const hand = this.hands[playerName];
    const cardsToPlay = hand.filter((c) =>
      cards.some((card) => card.id === c.id)
    );

    if (cardsToPlay.length !== cards.length) {
      throw new Error("Invalid card selection.");
    }

    if (this.playedThisTrick == 0) {
      // Reset previous trick if needed
      if (
        !isPlayableFirst(
          cardsToPlay,
          playerName,
          this.hands,
          this.undoMove,
          this.playCards,
          this.io,
          this.roomName,
          this.getPublicState.bind(this)
        )
      ) {
        throw new Error("Selected cards are not playable.");
      }
      this.resetPlayZones();
      if (this.trickWinner !== null) {
        // we don't update if this is the first round of the game
        this.trickStarter = this.trickWinner; // updated here, from refactor
      }
      this.trickWinner = null;
      this.pointsWon = 0;
    } else {
      const firstHand = this.playZones[this.trickStarter];
      const remainingCards = hand.filter(
        (c) => !cardsToPlay.some((played) => played.id === c.id)
      );
      if (!isPlayableFollows(cardsToPlay, remainingCards, firstHand)) {
        throw new Error("Selected cards do not follow the first hand.");
      }
    }

    this.playZones[playerName] = cards;
    this.hands[playerName] = hand.filter(
      (c) => !cards.some((played) => played.id === c.id)
    );

    this.playedThisTrick++;
    this.turnIndex = (this.turnIndex + 1) % this.playerOrder.length;

    this.trickWinner = determineTrickWinner(
      this.playZones,
      this.trickStarter,
      this.playerOrder
    );

    if (this.playedThisTrick >= this.playerOrder.length) {
      return this.endTrick();
    } else {
      // If not all players have played, just update the game state
      //this.io.to(this.roomName).emit("update_game", this.getPublicState());
    }
    return false;
  }

  endTrick() {
    //this.trickStarter = this.trickWinner;
    // DONT UPDATE TRICKSTARTER BECAUSE BOT NEEDS old value to update out of suits properly
    // instead we will update trickstarter on the first play of the next hand
    this.playedThisTrick = 0;
    this.turnIndex = this.playerOrder.indexOf(this.trickWinner);
    if (
      this.trickWinner !== this.throneName &&
      this.trickWinner !== this.throneTeammateName
    ) {
      const pointsWon = Object.values(this.playZones).reduce(
        (sum, cards) => sum + cards.reduce((acc, card) => acc + card.points, 0),
        0
      );
      this.pointsWon = pointsWon; // points won in this trick NOT total points won
    }

    this.totalPointsWon += this.pointsWon;
    // check if the game is over and add points with multiplier
    if (this.hands[this.trickWinner].length === 0) {
      this.endGame();
      return true;
    }
    return false;
  }

  endGame() {
    const winningHand = this.playZones[this.trickWinner];
    const pointsInBottomPile = this.bottomPile.reduce(
      (sum, card) => sum + card.points,
      0
    );
    const winningHandDecomp = decomposeHand(winningHand);
    let pointMultiplier = 2;
    if (winningHandDecomp.tractors.length > 0) {
      pointMultiplier = 2 * winningHandDecomp.tractors[0].length;
    } else if (winningHandDecomp.pairs.length > 0) {
      pointMultiplier = 4;
    }
    const pointsWonBottomPile = pointMultiplier * pointsInBottomPile;
    if (
      this.trickWinner !== this.throneName &&
      this.trickWinner !== this.throneTeammateName
    ) {
      this.totalPointsWon += pointsWonBottomPile;
    }

    this.gameEndInfo = {
      pointsInBottomPile: pointsInBottomPile,
      totalPointsWon: this.totalPointsWon,
      throneCedes: false,
      throneRankDelta: 0,
      opposingRankDelta: 0,
    };

    if (this.totalPointsWon === 0) {
      this.gameEndInfo.throneRankDelta = 3;
    } else if (this.totalPointsWon < 40) {
      this.gameEndInfo.throneRankDelta = 2;
    } else if (this.totalPointsWon < 80) {
      this.gameEndInfo.throneRankDelta = 1;
    } else if (this.totalPointsWon < 120) {
      this.gameEndInfo.throneCedes = true;
    } else if (this.totalPointsWon < 160) {
      this.gameEndInfo.opposingRankDelta = 1;
      this.gameEndInfo.throneCedes = true;
    } else if (this.totalPointsWon < 200) {
      this.gameEndInfo.opposingRankDelta = 2;
      this.gameEndInfo.throneCedes = true;
    } else {
      this.gameEndInfo.opposingRankDelta = 3;
      this.gameEndInfo.throneCedes = true;
    }

    // update team ranks
    this.teamRank[this.throneName] = incrementRank(
      this.teamRank[this.throneName],
      this.gameEndInfo.throneRankDelta
    );
    this.teamRank[this.throneTeammateName] = incrementRank(
      this.teamRank[this.throneTeammateName],
      this.gameEndInfo.throneRankDelta
    );
    this.playerOrder.forEach((player) => {
      if (player !== this.throneName && player !== this.throneTeammateName) {
        this.teamRank[player] = incrementRank(
          this.teamRank[player],
          this.gameEndInfo.opposingRankDelta
        );
      }
    });

    // check if anyone's rank is null
    const nullPlayers = this.playerOrder.filter(
      (player) => this.teamRank[player] === null
    );
    if (nullPlayers.length > 0) {
      this.gameOver = true;
      return;
    }

    // update throne
    if (this.gameEndInfo.throneCedes) {
      const throneIndex = this.playerOrder.indexOf(this.throneName);
      this.setThronePlayer(
        this.playerOrder[(throneIndex + 1) % this.playerOrder.length]
      );
    } else {
      this.setThronePlayer(this.throneTeammateName);
    }
  }

  reparseCard(card) {
    const index = card.id.substring(card.id.indexOf("-") + 1);
    return parseCard(card.code, index, this.trumpSuit, this.trumpRank);
  }

  resetPlayZones() {
    this.playerOrder.forEach((id) => {
      this.playZones[id] = [];
    });
  }

  undoMove() {
    // Undo last move
    this.playedThisTrick--;
    this.turnIndex =
      (this.turnIndex - 1 + this.playerOrder.length) % this.playerOrder.length;

    // Remove the last played cards from the play zones
    const lastPlayer = this.playerOrder[this.turnIndex];
    const lastPlayedCards = this.playZones[lastPlayer];
    this.hands[lastPlayer] = [...this.hands[lastPlayer], ...lastPlayedCards];
    this.playZones[lastPlayer] = [];
    this.io.to(this.roomName).emit("update_game", this.getPublicState());
  }

  resetRound() {
    // assume throne has been properly set
    this.activeBid = [];
    this.activeBidder = null;
    this.trumpSuit = null;
    this.trumpRank = this.teamRank[this.throneName];
    this.trickWinner = null;
    this.trickStarter = this.throneName;
    this.pointsWon = 0;
    this.totalPointsWon = 0;
    this.playedThisTrick = 0;
    this.turnIndex = this.playerOrder.indexOf(this.throneName);
    this.resetPlayZones();
    this.hands = {};
    this.deck = getTwoDecksShuffled(108, this.trumpSuit, this.trumpRank);
    this.bottomPile = this.deck.slice(-8);
    this.deck = this.deck.slice(0, -8);
    this.hands = {};
    this.readyToPlay = false;
  }

  getPublicState() {
    return {
      hands: this.hands,
      turn: this.playerOrder[this.turnIndex],
      playerNames: this.playerNames,
      playZones: this.playZones,
      trickWinner: this.trickWinner,
      pointsWon: this.pointsWon,
      activeBid: this.activeBid,
      activeBidder: this.activeBidder,
      trumpSuit: this.trumpSuit,
      throneName: this.throneName,
      throneTeammateName: this.throneTeammateName,
      teamRank: this.teamRank,
      trickStarter: this.trickStarter,
    };
  }
}

module.exports = GameEngine;
