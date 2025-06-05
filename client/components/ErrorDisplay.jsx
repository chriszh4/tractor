// components/ErrorDisplay.jsx
import React, { useEffect, useState } from "react";

export default function ErrorDisplay({ message, onClose }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (message) {
      setVisible(true);
      const timeout = setTimeout(() => {
        setVisible(false);
        if (onClose) onClose();
      }, 3000); // display for 3 seconds total
      return () => clearTimeout(timeout);
    }
  }, [message]);

  if (!message || !visible) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: "40%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        padding: "20px 40px",
        backgroundColor: "rgba(220, 53, 69, 0.9)", // Bootstrap red-ish
        color: "white",
        borderRadius: "12px",
        fontSize: "1.2rem",
        zIndex: 10000,
        opacity: visible ? 1 : 0,
        transition: "opacity 2s ease-in-out",
        boxShadow: "0 4px 10px rgba(0,0,0,0.3)",
      }}
    >
      {message}
    </div>
  );
}
