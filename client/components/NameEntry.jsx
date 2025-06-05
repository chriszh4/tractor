import React, { useState } from "react";

export default function NameEntry({ onSubmit }) {
  const [name, setName] = useState("");

  const handleSubmit = () => {
    if (name.trim()) {
      onSubmit(name.trim());
    }
  };

  return (
    <div
      style={{
        color: "white",
        height: "100vh",
        width: "100vw",
        backgroundColor: "#111",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <h2>Enter your name to join the game</h2>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Your name"
        style={{ padding: "10px", fontSize: "16px", marginBottom: "10px" }}
      />
      <button
        onClick={handleSubmit}
        style={{
          padding: "10px 20px",
          fontSize: "16px",
          cursor: "pointer",
          backgroundColor: "#28a745",
          color: "white",
          border: "none",
          borderRadius: "5px",
        }}
      >
        Join Game
      </button>
    </div>
  );
}
