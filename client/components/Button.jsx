// components/Button.jsx
import React from "react";

export default function Button({ onClick, children, disabled }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: "10px 20px",
        backgroundColor: disabled ? "#888" : "#28a745",
        color: "white",
        border: "none",
        borderRadius: "6px",
        cursor: disabled ? "not-allowed" : "pointer",
        fontWeight: "bold",
        fontSize: "1rem",
        marginTop: "16px",
      }}
    >
      {children}
    </button>
  );
}
