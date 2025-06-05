// components/InfoCorner.jsx
import React from "react";

export default function InfoCorner({
  currentPlayer,
  playerNames,
  myName,
  points,
  trumpNumber,
  trumpSuit,
  bidSecondsLeft,
}) {
  if (!currentPlayer) return null;

  const suitSymbols = {
    S: "♠️",
    H: "♥️",
    D: "♦️",
    C: "♣️",
  };

  return (
    <div
      style={{
        position: "absolute",
        top: "10px",
        right: "20px",
        color: "white",
        backgroundColor: "#1b3a6b",
        padding: "12px",
        borderRadius: "12px",
        fontSize: "0.95rem",
        minWidth: "150px",
        display: "flex",
        flexDirection: "column",
        gap: "6px",
      }}
    >
      <div>
        <strong>
          {currentPlayer === myName ? "Your Turn!" : `Turn: ${currentPlayer}`}
        </strong>
      </div>
      <div>
        <strong>Points:</strong> {points}
      </div>
      <div>
        <strong>Trump:</strong> {trumpNumber}{" "}
        {trumpSuit !== null ? suitSymbols[trumpSuit] : "None"}
      </div>
      {bidSecondsLeft > 0 && (
        <div>
          <strong>Time Left To Bid:</strong> {bidSecondsLeft} seconds
        </div>
      )}
    </div>
  );
}
