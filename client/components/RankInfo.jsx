import React from "react";

export default function RankInfo({ throneName, throneTeammateName, teamRank }) {
  return (
    <div
      style={{
        position: "absolute",
        top: "10px",
        left: "20px",
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
        <strong>Throne:</strong> {throneName ? throneName : "None"}
      </div>
      <div>
        <strong>Ranks:</strong>
        <ul style={{ margin: "4px 0 0 12px", padding: 0 }}>
          {Object.entries(teamRank).map(([name, rank], index) => (
            <li key={name} style={{ listStyleType: "disc" }}>
              {name}:{" "}
              <span style={{ color: index % 2 === 0 ? "red" : "yellow" }}>
                {rank}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
