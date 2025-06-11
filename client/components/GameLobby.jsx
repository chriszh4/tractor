import React, { useState, useEffect } from "react";
import { User, Users, Plus, Gamepad2 } from "lucide-react";
import ErrorDisplay from "./ErrorDisplay";

const GameLobby = ({
  socket,
  setInGameLobby,
  onSetPlayerName,
  onSetRoomCode,
  isHost,
}) => {
  const [playerName, setPlayerName] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [activeTab, setActiveTab] = useState("join"); // 'join' or 'create'
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    socket.on("error", (error) => {
      setErrorMsg(error);
    });

    socket.on("accept_join_room", ({ playerName, roomCode }) => {
      onSetPlayerName(playerName);
      onSetRoomCode(roomCode);
      setInGameLobby(false);
      console.log("Joined room successfully:", roomCode);
    });
  }, []);

  const handleJoinRoom = () => {
    if (!playerName.trim()) {
      setErrorMsg("Please enter your name");
      return;
    }
    if (!roomCode.trim()) {
      setErrorMsg("Please enter a room code");
      return;
    }

    setIsLoading(true);
    // Remove any dashes from room code
    const cleanedRoomCode = roomCode.toUpperCase();
    console.log("Joining room:", cleanedRoomCode, "as", playerName);
    if (cleanedRoomCode.length !== 6) {
      setErrorMsg("Invalid room code. Please enter a 6-character code.");
      setIsLoading(false);
      return;
    }

    socket.emit("join_room", {
      roomName: cleanedRoomCode,
      name: playerName,
    });
    setPlayerName("");

    setIsLoading(false);
  };

  const handleCreateRoom = async (e) => {
    e.preventDefault();
    if (!playerName.trim()) {
      setErrorMsg("Please enter your name");
      return;
    }

    setIsLoading(true);
    console.log("Creating room for:", playerName);
    // length 6 random string of numbers and letters
    const randomRoomName = Math.random()
      .toString(36)
      .substring(2, 8)
      .toUpperCase();

    setRoomCode(randomRoomName);

    socket.emit("create_room", {
      roomName: randomRoomName,
      name: playerName,
    });

    setPlayerName("");

    setIsLoading(false);
    isHost.current = true;
  };

  const handleRoomCodeChange = (e) => {
    const value = e.target.value.replace(/\s+/g, ""); // removes all spaces
    setRoomCode(value);
  };

  const styles = {
    container: {
      minHeight: "100vh",
      background: "#158573",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "16px",
      fontFamily:
        '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      position: "relative",
    },
    backgroundPattern: {
      position: "absolute",
      inset: 0,
      opacity: 0.1,
      backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
    },
    mainCard: {
      position: "relative",
      width: "100%",
      maxWidth: "448px",
      zIndex: 1,
    },
    logoSection: {
      textAlign: "center",
      marginBottom: "32px",
      animation: "fadeIn 0.6s ease-out",
    },
    logoIcon: {
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      width: "80px",
      height: "80px",
      background: "linear-gradient(135deg, #fbbf24 0%, #f97316 100%)",
      borderRadius: "16px",
      boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
      marginBottom: "16px",
      cursor: "pointer",
      transition: "transform 0.3s ease",
    },
    logoIconHover: {
      transform: "scale(1.05)",
    },
    title: {
      fontSize: "36px",
      fontWeight: "bold",
      color: "white",
      marginBottom: "8px",
      background: "linear-gradient(to right, #fbbf24, #f97316)",
      WebkitBackgroundClip: "text",
      WebkitTextFillColor: "transparent",
      backgroundClip: "text",
    },
    subtitle: {
      color: "#bfdbfe",
      fontSize: "18px",
    },
    card: {
      background: "rgba(255, 255, 255, 0.1)",
      backdropFilter: "blur(16px)",
      borderRadius: "24px",
      boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
      border: "1px solid rgba(255, 255, 255, 0.2)",
      padding: "32px",
      transition: "transform 0.3s ease",
    },
    cardHover: {
      transform: "scale(1.02)",
    },
    inputGroup: {
      marginBottom: "24px",
    },
    label: {
      display: "block",
      color: "white",
      fontSize: "14px",
      fontWeight: "500",
      marginBottom: "12px",
    },
    inputWrapper: {
      position: "relative",
    },
    inputIcon: {
      position: "absolute",
      left: "16px",
      top: "50%",
      transform: "translateY(-50%)",
      color: "rgba(255, 255, 255, 0.6)",
      zIndex: 1,
    },
    input: {
      width: "80%",
      background: "rgba(255, 255, 255, 0.2)",
      border: "1px solid rgba(255, 255, 255, 0.3)",
      borderRadius: "12px",
      padding: "12px 16px",
      paddingLeft: "48px",
      color: "white",
      fontSize: "16px",
      outline: "none",
      transition: "all 0.2s ease",
    },
    inputFocus: {
      boxShadow: "0 0 0 2px #fbbf24",
      borderColor: "transparent",
    },
    roomCodeInput: {
      width: "80%",
      background: "rgba(255, 255, 255, 0.2)",
      border: "1px solid rgba(255, 255, 255, 0.3)",
      borderRadius: "12px",
      padding: "12px 16px",
      color: "white",
      fontSize: "18px",
      fontFamily: "monospace",
      letterSpacing: "2px",
      textAlign: "center",
      outline: "none",
      transition: "all 0.2s ease",
    },
    tabContainer: {
      display: "flex",
      background: "rgba(255, 255, 255, 0.2)",
      borderRadius: "12px",
      padding: "4px",
      marginBottom: "24px",
    },
    tab: {
      flex: 1,
      padding: "12px 16px",
      borderRadius: "8px",
      fontSize: "14px",
      fontWeight: "500",
      transition: "all 0.2s ease",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: "8px",
      cursor: "pointer",
      border: "none",
      background: "transparent",
    },
    activeTab: {
      background: "rgba(255, 255, 255, 0.3)",
      color: "white",
      boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
    },
    inactiveTab: {
      color: "rgba(255, 255, 255, 0.7)",
    },
    button: {
      width: "100%",
      fontWeight: "600",
      padding: "16px 24px",
      borderRadius: "12px",
      transition: "all 0.2s ease",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: "8px",
      cursor: "pointer",
      border: "none",
      fontSize: "16px",
    },
    joinButton: {
      background: "linear-gradient(to right, #10b981, #059669)",
      color: "white",
      boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
    },
    createButton: {
      background: "linear-gradient(to right, #3b82f6, #8b5cf6)",
      color: "white",
      boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
    },
    disabledButton: {
      background: "linear-gradient(to right, #6b7280, #6b7280)",
      cursor: "not-allowed",
    },
    buttonHover: {
      transform: "scale(1.02)",
    },
    infoBox: {
      background: "rgba(255, 255, 255, 0.1)",
      borderRadius: "12px",
      padding: "16px",
      border: "1px solid rgba(255, 255, 255, 0.2)",
      marginBottom: "24px",
    },
    infoTitle: {
      color: "white",
      fontWeight: "500",
      marginBottom: "8px",
    },
    infoText: {
      color: "rgba(255, 255, 255, 0.7)",
      fontSize: "14px",
    },
    helpText: {
      color: "rgba(255, 255, 255, 0.6)",
      fontSize: "12px",
      marginTop: "8px",
      textAlign: "center",
    },
    statsContainer: {
      marginTop: "32px",
      paddingTop: "24px",
      borderTop: "1px solid rgba(255, 255, 255, 0.2)",
    },
    statsGrid: {
      display: "flex",
      justifyContent: "space-between",
      textAlign: "center",
    },
    statNumber: {
      fontSize: "24px",
      fontWeight: "bold",
      marginBottom: "4px",
    },
    statLabel: {
      color: "rgba(255, 255, 255, 0.6)",
      fontSize: "12px",
    },
    footer: {
      textAlign: "center",
      marginTop: "24px",
    },
    footerText: {
      color: "rgba(255, 255, 255, 0.6)",
      fontSize: "14px",
    },
    footerLink: {
      color: "#fbbf24",
      textDecoration: "underline",
      cursor: "pointer",
      border: "none",
      background: "transparent",
      fontSize: "14px",
    },
    spinner: {
      width: "20px",
      height: "20px",
      border: "2px solid rgba(255, 255, 255, 0.3)",
      borderTop: "2px solid white",
      borderRadius: "50%",
      animation: "spin 1s linear infinite",
    },
  };

  return (
    <>
      <ErrorDisplay message={errorMsg} onClose={() => setErrorMsg(null)} />
      <div style={styles.container}>
        <div style={styles.backgroundPattern} />

        <div style={styles.mainCard}>
          {/* Game Logo & Title */}
          <div style={styles.logoSection}>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: "150px",
                height: "150px",
                background: "linear-gradient(135deg, #fbbf24 0%, #f97316 100%)",
                borderRadius: "16px",
                boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
                marginBottom: "16px",
                cursor: "pointer",
                transition: "transform 0.3s ease",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.transform = "scale(1.05)")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.transform = "scale(1)")
              }
            >
              <img
                src="/logo.png"
                alt="Tractor Logo"
                style={{
                  width: "150px",
                  height: "150px",
                  objectFit: "contain",
                }}
              />
            </div>

            <h1 style={styles.title}>Tractor</h1>
            <p style={styles.subtitle}>4-Player Card Game</p>
          </div>

          {/* Main Card */}
          <div style={styles.card}>
            {/* Player Name Input */}
            <div style={styles.inputGroup}>
              <label style={styles.label}>Your Name</label>
              <div style={styles.inputWrapper}>
                <User style={styles.inputIcon} size={10} />
                <input
                  type="text"
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  placeholder="Enter your name"
                  style={styles.input}
                  maxLength={10}
                  onFocus={(e) =>
                    (e.target.style.boxShadow = "0 0 0 2px #fbbf24")
                  }
                  onBlur={(e) => (e.target.style.boxShadow = "none")}
                />
              </div>
            </div>

            {/* Tab Navigation */}
            <div style={styles.tabContainer}>
              <button
                onClick={() => setActiveTab("join")}
                style={{
                  ...styles.tab,
                  ...(activeTab === "join"
                    ? styles.activeTab
                    : styles.inactiveTab),
                }}
              >
                <Users size={18} />
                Join Room
              </button>
              <button
                onClick={() => setActiveTab("create")}
                style={{
                  ...styles.tab,
                  ...(activeTab === "create"
                    ? styles.activeTab
                    : styles.inactiveTab),
                }}
              >
                <Plus size={18} />
                Create Room
              </button>
            </div>

            {/* Join Room Section */}
            {activeTab === "join" && (
              <div>
                <div style={styles.inputGroup}>
                  <label style={styles.label}>Room Code</label>
                  <input
                    type="text"
                    value={roomCode}
                    onChange={handleRoomCodeChange}
                    placeholder="ABC123"
                    style={styles.roomCodeInput}
                    maxLength={8}
                    onFocus={(e) =>
                      (e.target.style.boxShadow = "0 0 0 2px #fbbf24")
                    }
                    onBlur={(e) => (e.target.style.boxShadow = "none")}
                  />
                  <p style={styles.helpText}>Enter the 6-character room code</p>
                </div>

                <button
                  onClick={() => handleJoinRoom()}
                  disabled={isLoading || !playerName.trim() || !roomCode.trim()}
                  style={{
                    ...styles.button,
                    ...styles.joinButton,
                    ...(isLoading || !playerName.trim() || !roomCode.trim()
                      ? styles.disabledButton
                      : {}),
                  }}
                  onMouseEnter={(e) => {
                    if (!e.target.disabled) {
                      e.target.style.transform = "scale(1.02)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.transform = "scale(1)";
                  }}
                >
                  {isLoading ? (
                    <>
                      <div style={styles.spinner} />
                      Joining...
                    </>
                  ) : (
                    <>
                      <Users size={20} />
                      Join Game Room
                    </>
                  )}
                </button>
              </div>
            )}

            {/* Create Room Section */}
            {activeTab === "create" && (
              <div>
                <div style={styles.infoBox}>
                  <h3 style={styles.infoTitle}>Room Settings</h3>
                  <p style={styles.infoText}>
                    Invite up to 3 other players or add bots to fill empty
                    slots.
                  </p>
                </div>

                <button
                  onClick={handleCreateRoom}
                  disabled={isLoading || !playerName.trim()}
                  style={{
                    ...styles.button,
                    ...styles.createButton,
                    ...(isLoading || !playerName.trim()
                      ? styles.disabledButton
                      : {}),
                  }}
                  onMouseEnter={(e) => {
                    if (!e.target.disabled) {
                      e.target.style.transform = "scale(1.02)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.transform = "scale(1)";
                  }}
                >
                  {isLoading ? (
                    <>
                      <div style={styles.spinner} />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Plus size={20} />
                      Create New Room
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>

        <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(-20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
        
        input::placeholder {
          color: rgba(255, 255, 255, 0.6);
        }
      `}</style>
      </div>
    </>
  );
};

export default GameLobby;
