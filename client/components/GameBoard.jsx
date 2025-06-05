import React, { useState, useEffect } from "react";
import io from "socket.io-client";
import Hand from "./Hand";
import PlayZone from "./PlayZone";
import PlayButton from "./PlayButton";
import BidButton from "./BidButton";
import PlayerView from "./PlayerView";
import InfoCorner from "./InfoCorner";
import NameEntry from "./NameEntry";
import BottomPileButton from "./BottomPileButton";
import DealButton from "./DealButton";
import RankInfo from "./RankInfo";
import GameEndInfo from "./GameEndInfo";
import ErrorDisplay from "./ErrorDisplay";

// Connect oncec
const socket = io(import.meta.env.VITE_SOCKET_URL || "http://localhost:3001");
// const socket = io("http://localhost:3001");

export default function GameBoard({ roomName }) {
  // hardcode name for now for testing convenience
  const [myName, setMyName] = useState(
    "Player_" + Math.random().toString(36).substring(2, 7)
  );
  const [nameSubmitted, setNameSubmitted] = useState(true);
  const [allHands, setAllHands] = useState({});
  const [hand, setHand] = useState([]);
  const [selectedCards, setSelectedCards] = useState([]);
  const [playZones, setPlayZones] = useState({});
  const [currentPlayer, setCurrentPlayer] = useState(null);
  const [statusMessage, setStatusMessage] = useState("Joining room...");
  const [playerNames, setPlayerNames] = useState({});
  const [relativePlayerOrder, setRelativePlayerOrder] = useState([]);
  const [trickWinner, setTrickWinner] = useState(null);
  const [currentPoints, setCurrentPoints] = useState(0);
  const [trumpRank, setTrumpRank] = useState(null); // Tracks when game has started to, reset after game
  const [trumpSuit, setTrumpSuit] = useState(null);
  const [dealtCards, setDealtCards] = useState(false);
  const [bottomPileDone, setBottomPileDone] = useState(false);
  const [activeBid, setActiveBid] = useState([]);
  const [activeBidder, setActiveBidder] = useState(null);
  const [throneName, setThroneName] = useState(null);
  const [bidSecondsLeft, setBidSecondsLeft] = useState(null);
  const [teamRank, setTeamRank] = useState({});
  const [throneTeammateName, setThroneTeammateName] = useState(null);
  const [roundStarted, setRoundStarted] = useState(false);
  const [gameEndInfo, setGameEndInfo] = useState(null);
  const [playerJoinOrder, setPlayerJoinOrder] = useState({}); // for debugging, displays id
  const [errorMsg, setErrorMsg] = useState(null);
  const [myRoomName, setMyRoomName] = useState(null);

  useEffect(() => {
    if (!nameSubmitted) return;
    console.log("Joining room with name:", myName);
    socket.emit("join_room", { roomName: roomName, name: myName });
    setMyRoomName(roomName);
    console.log(roomName);

    const handleBeforeUnload = () => {
      socket.emit("leave_room", { roomName, name: myName });
    };
    window.addEventListener("beforeunload", handleBeforeUnload);

    // Game state updates
    socket.on("status", (data) => {
      setStatusMessage(data.message);
    });

    socket.on("ready_game", ({ throneName, throneTeammateName, teamRank }) => {
      console.log("Game is ready with throne:", throneName);
      setThroneName(throneName);
      setThroneTeammateName(throneTeammateName);
      setTeamRank(teamRank);
      setStatusMessage("");
      setBidSecondsLeft(null);
    });

    socket.on("bottom_pile", (bottomPile, throneName, throneCards) => {
      console.log(
        `Bottom pile for throne ${throneName}:`,
        bottomPile.map((c) => c.id)
      );
      // Add bottom pile to throne's hand
      setThroneName(throneName);
      if (throneName === myName) {
        setHand((prevHand) => [...prevHand, ...bottomPile]);
      } // Can add to other player's but doesn't really matter
    });

    socket.on("bottom_pile_done", () => {
      console.log("Bottom pile done by", myName);
      setBottomPileDone(true);
    });

    socket.on("bid_ends", ({ secondsLeft }) => {
      setBidSecondsLeft(secondsLeft);
    });

    socket.on("dealt_cards", () => {
      setDealtCards(true);
    });

    socket.on("start_game", ({ trumpRank, playerNames }) => {
      console.log("Starting game");
      setTrumpRank(trumpRank);
      setRoundStarted(true);
      setCurrentPoints(0);
      setActiveBid([]);
      setActiveBidder(null);
      setBidSecondsLeft(null);
    });

    socket.on("end_round", ({ gameEndInfo }) => {
      setRoundStarted(false);
      setGameEndInfo(gameEndInfo);
      setDealtCards(false);
      setBottomPileDone(false);
    });

    socket.on(
      "update_game",
      ({
        hands,
        turn,
        playerNames,
        playZones,
        trickWinner,
        pointsWon,
        activeBid,
        activeBidder,
        trumpSuit,
        throneName,
        throneTeammateName,
        teamRank,
        trickStarter,
      }) => {
        setHand(hands[myName] || []);
        setAllHands(hands || {});
        setCurrentPlayer(turn);
        setPlayerNames(playerNames || {});
        setStatusMessage("");
        setPlayZones(playZones || {});
        setTrickWinner(trickWinner || null);
        setActiveBid(activeBid || []);
        setActiveBidder(activeBidder || null);
        setTrumpSuit(trumpSuit);
        const dupPlayers = [...playerNames, ...playerNames];
        const myIndex = dupPlayers.indexOf(myName);
        setRelativePlayerOrder(dupPlayers.slice(myIndex + 1, myIndex + 4));
        setCurrentPoints((prevPoints) => prevPoints + pointsWon);
        setThroneName(throneName || null);
        setThroneTeammateName(throneTeammateName || null);
        setTeamRank(teamRank || {});
      }
    );

    socket.on("error", (msg) => {
      setErrorMsg(msg);
    });

    socket.on("join_order", ({ playerJoinOrder }) => {
      setPlayerJoinOrder(playerJoinOrder);
    });

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      socket.off("status");
      socket.off("update_game");
      socket.off("error");
      // Emit leave_room manually on component unmount as a fallback
      socket.emit("leave_room", { roomName, name: myName });
    };
  }, [nameSubmitted]);

  const toggleCard = (card) => {
    setSelectedCards((prev) =>
      prev.some((c) => c.id === card.id)
        ? prev.filter((c) => c.id !== card.id)
        : [...prev, card]
    );
  };

  const playSelected = () => {
    socket.emit("play_cards", {
      roomName: myRoomName,
      playerName: myName,
      selectedCards,
    });
    setSelectedCards([]);
  };

  const bidSelected = () => {
    socket.emit("bid_cards", {
      roomName: myRoomName,
      playerName: myName,
      bid: selectedCards,
    });
    setSelectedCards([]);
  };

  const onSelectBottomPile = (selectedCards) => {
    setSelectedCards([]);
    socket.emit("bottom_pile_done", {
      roomName: myRoomName,
      playerName: myName,
      bottomPile: selectedCards,
    });
  };

  if (!nameSubmitted) {
    return (
      <NameEntry
        onSubmit={(name) => {
          setMyName(name);
          setNameSubmitted(true);
        }}
      />
    );
  }

  if (statusMessage) {
    return (
      <div
        style={{
          height: "100vh",
          width: "100vw",
          display: "flex",
          flexDirection: "column",
          justifyContent: "flex-end",
          alignItems: "center",
          backgroundColor: "#158573",
          paddingBottom: "20px",
          boxSizing: "border-box",
          position: "relative",
        }}
      >
        <div
          style={{ color: "white", fontSize: "1.2rem", marginBottom: "2rem" }}
        >
          {statusMessage}
        </div>
      </div>
    );
  }

  if (!roundStarted) {
    return (
      <div
        style={{
          height: "100vh",
          width: "100vw",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "#158573",
        }}
      >
        <RankInfo
          throneName={throneName}
          throneTeammateName={throneTeammateName}
          teamRank={teamRank}
        />
        {gameEndInfo && (
          <>
            <GameEndInfo gameEndInfo={gameEndInfo} />

            {Object.entries(relativePlayerOrder).map(([id, name], i) => {
              const positions = ["right", "top", "left"];
              return (
                <PlayerView
                  key={id}
                  name={name}
                  handSize={allHands[name].length}
                  playZone={playZones[name] || []}
                  position={positions[i % 3]}
                  // check all players have played in playzone
                  winsTrick={
                    trickWinner === name &&
                    playerNames.every(
                      (name) => (playZones[name] || []).length > 0
                    )
                  }
                />
              );
            })}

            <PlayZone
              cards={playZones[myName] || []}
              winsTrick={
                trickWinner === myName &&
                playerNames.every((name) => (playZones[name] || []).length > 0)
              }
            />
          </>
        )}

        <DealButton
          onDeal={() => {
            socket.emit("deal_cards", {
              roomName: myRoomName,
              playerName: myName,
            });
          }}
        />
      </div>
    );
  }

  return (
    <div
      style={{
        height: "100vh",
        width: "100vw",
        display: "flex",
        flexDirection: "column",
        justifyContent: "flex-end",
        alignItems: "center",
        backgroundColor: "#158573",
        paddingBottom: "20px",
        boxSizing: "border-box",
        position: "relative",
      }}
    >
      <RankInfo
        throneName={throneName}
        throneTeammateName={throneTeammateName}
        teamRank={teamRank}
      />
      <InfoCorner
        currentPlayer={currentPlayer}
        playerNames={playerNames}
        myName={myName}
        points={currentPoints}
        trumpNumber={trumpRank}
        trumpSuit={trumpSuit}
        bidSecondsLeft={bidSecondsLeft}
      />

      <>
        <ErrorDisplay message={errorMsg} onClose={() => setErrorMsg(null)} />

        {/* Other players */}
        {Object.entries(relativePlayerOrder).map(([id, name], i) => {
          const positions = ["right", "top", "left"];
          return (
            <PlayerView
              key={id}
              name={name}
              handSize={allHands[name].length}
              playZone={playZones[name] || []}
              position={positions[i % 3]}
              winsTrick={
                trickWinner === name &&
                playerNames.every((name) => (playZones[name] || []).length > 0)
              }
              myJoinOrder={playerJoinOrder[name] || -1}
            />
          );
        })}

        <PlayZone
          cards={playZones[myName] || []}
          winsTrick={
            trickWinner == myName &&
            playerNames.every((name) => (playZones[name] || []).length > 0)
          }
        />
        <Hand
          cards={hand}
          selectedCards={selectedCards}
          toggleCard={toggleCard}
          stackMargin="-60px"
        />
        {
          // show play only if cards have been dealt otherwise bid button
          dealtCards && bottomPileDone ? (
            <PlayButton
              selectedCards={selectedCards}
              playSelected={playSelected}
              bottomPileDone={bottomPileDone}
            />
          ) : dealtCards ? (
            <BottomPileButton
              throneName={throneName}
              myName={myName}
              selectedCards={selectedCards}
              selectBottomPile={onSelectBottomPile}
            />
          ) : (
            <BidButton
              playerName={myName}
              selectedCards={selectedCards}
              bidSelected={bidSelected}
              trumpRank={trumpRank}
              activeBid={activeBid}
              activeBidder={activeBidder}
              bidSecondsLeft={bidSecondsLeft}
            />
          )
        }
      </>
    </div>
  );
}
