import React from "react";

export default function GameEndInfo({ gameEndInfo }) {
  const {
    pointsInBottomPile,
    totalPointsWon,
    throneCedes,
    throneRankDelta,
    opposingRankDelta,
  } = gameEndInfo;

  return (
    <div
      style={{
        backgroundColor: "#2c3e50",
        color: "white",
        padding: "12px 16px",
        borderRadius: "10px",
        marginBottom: "16px",
        fontSize: "0.95rem",
        textAlign: "left",
        minWidth: "200px",
      }}
    >
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
