import React from "react";

export default function GameEndInfo({ gameEndInfo, gameOver }) {
  const {
    pointsInBottomPile,
    totalPointsWon,
    throneCedes,
    throneRankDelta,
    opposingRankDelta,
  } = gameEndInfo;

  const baseStyle = {
    position: "fixed",
    bottom: "32px",
    left: "50%",
    transform: "translateX(-50%)",
    backgroundColor: gameOver ? "#e74c3c" : "#2c3e50",
    color: "white",
    padding: "12px 16px",
    borderRadius: "10px",
    fontSize: "0.95rem",
    textAlign: "right", // you had this already
    minWidth: "200px",
    zIndex: 9999,
    boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
  };

  if (gameOver) {
    return (
      <div style={baseStyle}>
        <strong>Game Over!</strong>
      </div>
    );
  }

  return (
    <div style={baseStyle}>
      <div>
        <strong>Points in Bottom Pile:</strong> {pointsInBottomPile}
      </div>
      <div>
        <strong>Points Total:</strong> {totalPointsWon}
      </div>
      <div>
        <strong>Opposing Ascends:</strong> {throneCedes ? "Yes" : "No"}
      </div>
      <div>
        <strong>Throne Rank: +</strong> {throneRankDelta}
      </div>
      <div>
        <strong>Opposing Rank: +</strong> {opposingRankDelta}
      </div>
    </div>
  );
}
