// components/PlayerView.jsx
import React from "react";
import Hand from "./Hand";
import PlayZone from "./PlayZone";

export default function PlayerView({
  name,
  handSize = 5,
  playZone = [],
  position,
  winsTrick,
  myJoinOrder,
}) {
  // Dummy red-back cards to simulate hand size
  const hand = Array.from({ length: handSize }, (_, i) => ({
    id: `RED_BACK-${i}`,
    code: "RED_BACK",
  }));

  const positionStyles = {
    top: {
      position: "absolute",
      top: "10px",
      left: "50%",
      transform: "translateX(-50%)",
      flexDirection: "row",
    },
    left: {
      position: "absolute",
      top: "50%",
      left: "10px",
      transform: "translateY(-50%)",
      flexDirection: "row",
    },
    right: {
      position: "absolute",
      top: "50%",
      right: "10px",
      transform: "translateY(-50%)",
      flexDirection: "row",
    },
  };

  const rotationByPosition = {
    top: "rotate(180deg)",
    left: "rotate(90deg)",
    right: "rotate(-90deg)",
  };

  const positionStyle = positionStyles[position];
  const rotation = rotationByPosition[position];

  return (
    <div
      style={{
        ...positionStyle,
        display: "flex",
        alignItems: "center",
        padding: "10px",
      }}
    >
      {/* Name (upright) */}
      <div
        style={{
          fontWeight: "bold",
          color: "white",
          marginRight: "12px",
          whiteSpace: "nowrap",
        }}
      >
        {/*"Player_" + myJoinOrder}{" "*/}
        {name /*CHANGE THIS PART ONLY TO REMOVE ID FROM DEBUG */}
      </div>

      {/* Rotated hand and play zone */}
      <div
        style={{
          transform: rotation,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        <div style={{ marginBottom: "-20px" }}>
          <PlayZone cards={playZone || []} winsTrick={winsTrick} />
        </div>
        <Hand
          cards={hand}
          selectedCards={[]}
          toggleCard={() => {}}
          stackMargin="-85px"
        />
      </div>
    </div>
  );
}
