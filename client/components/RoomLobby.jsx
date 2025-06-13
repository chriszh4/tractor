import React, { useState, useEffect } from "react";
import { Users, Bot, Play, UserPlus } from "lucide-react";
import ErrorDisplay from "./ErrorDisplay";

const RoomLobby = ({
  socket,
  playerName,
  roomCode,
  setGameStarted,
  playerList,
  isHost,
}) => {
  const [teams, setTeams] = useState({
    team1: [],
    team2: [],
  });
  const [playerTeam, setPlayerTeam] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");

  const botDifficulties = ["Medium"];

  useEffect(() => {
    const handleBeforeUnload = () => {
      if (isHost.current)
        socket.emit("leave_room", { roomName: roomCode, name: playerName });
    };
    window.addEventListener("beforeunload", handleBeforeUnload);

    socket.on("error", (error) => {
      setErrorMsg(error);
    });

    socket.on("update_team", ({ updatedTeams }) => {
      let newTeams = {
        team1: updatedTeams.team1 || [],
        team2: updatedTeams.team2 || [],
      };
      // Add ourself in the correct team if not already present
      if (playerTeam) {
        newTeams[playerTeam] = newTeams[playerTeam].filter(
          (member) => member.name !== playerName
        );
        newTeams[playerTeam].push({ name: playerName, type: "player" });
      }
      setTeams(newTeams);
      console.log("Updated teams:", newTeams);
    });

    socket.on("confirm_start_game", ({ teams }) => {
      console.log("Game started with teams:", teams);
      console.log("setting player list", [...teams.team1, ...teams.team2]);
      playerList.current = [...teams.team1, ...teams.team2].map((member) => ({
        name: member.name,
        type: member.type,
      }));
      setGameStarted(true);
    });
  }, [socket]);

  const joinTeam = (teamId) => {
    if (playerTeam) return; // Already joined a team

    const team = teams[teamId];
    if (team.length >= 2) return; // Team is full

    const newTeams = {
      ...teams,
      [teamId]: [...team, { name: playerName, type: "player" }],
    };
    socket.emit("update_team", { roomCode, updatedTeams: newTeams });
    setTeams((prev) => ({
      ...prev,
      [teamId]: [...prev[teamId], { name: playerName, type: "player" }],
    }));
    setPlayerTeam(teamId);
  };

  const leaveTeam = () => {
    if (!playerTeam) return;

    const newTeams = {
      ...teams,
    };
    newTeams[playerTeam] = newTeams[playerTeam].filter(
      (member) => member.name !== playerName
    );
    console.log("updated teams", newTeams);
    socket.emit("update_team", { roomCode: roomCode, updatedTeams: newTeams });
    setTeams((prev) => ({
      ...newTeams,
    }));
    setPlayerTeam(null);
  };

  const addBot = (teamId, difficulty) => {
    const team = teams[teamId];
    if (team.length >= 2) return; // Team is full

    // set random string of 5 characters as bot name
    const randomString = Math.random().toString(36).substring(2, 7);
    const botName = `Bot ${randomString} (${difficulty})`;
    const newTeams = {
      ...teams,
      [teamId]: [...team, { name: botName, type: "bot", difficulty }],
    };
    socket.emit("update_team", { roomCode, updatedTeams: newTeams });
    setTeams((prev) => ({
      ...newTeams,
    }));
  };

  const removeBot = (teamId, botIndex) => {
    const newTeams = {
      ...teams,
      [teamId]: teams[teamId].filter(
        (member, index) => !(member.type === "bot" && index === botIndex)
      ),
    };
    socket.emit("update_team", { roomCode, updatedTeams: newTeams });
    setTeams((prev) => ({
      ...newTeams,
    }));
  };

  const getTotalPlayers = () => {
    return teams.team1.length + teams.team2.length;
  };

  const isRoomFull = () => {
    return getTotalPlayers() === 4;
  };

  const canStartGame = () => {
    return isRoomFull() && teams.team1.length === 2 && teams.team2.length === 2;
  };

  const startGame = () => {
    // check if all bots
    const allBots = Object.values(teams).every((team) =>
      team.every((member) => member.type === "bot")
    );
    if (allBots) {
      setErrorMsg("Cannot start game with only bots. Please add players.");
      return;
    }
    socket.emit("request_start_game", {
      roomName: roomCode,
      playerName: playerName,
      teams: teams,
    });
    setTimeout(() => {
      socket.emit("deal_cards", {
        roomName: roomCode,
        playerName: playerName,
      });
    }, 500);
  };

  const styles = {
    container: {
      margin: "0 auto",
      padding: "24px",
      background: "#5ebdae",
      minHeight: "100vh",
      fontFamily: "Arial, sans-serif",
    },
    header: {
      background: "white",
      borderRadius: "12px",
      boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
      padding: "24px",
      marginBottom: "24px",
      textAlign: "center",
    },
    title: {
      fontSize: "2rem",
      fontWeight: "bold",
      color: "#1f2937",
      margin: "0 0 12px 0",
    },
    headerInfo: {
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: "16px",
      color: "#6b7280",
    },
    badge: {
      padding: "6px 12px",
      borderRadius: "20px",
      fontWeight: "500",
      fontSize: "14px",
    },
    roomBadge: {
      backgroundColor: "#dbeafe",
      color: "#1e40af",
    },
    playerBadge: {
      backgroundColor: "#dcfce7",
      color: "#166534",
    },
    teamsGrid: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
      gap: "24px",
      marginBottom: "24px",
    },
    teamCard: {
      background: "white",
      borderRadius: "12px",
      boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
      padding: "24px",
      border: "2px solid",
      transition: "border-color 0.2s ease",
    },
    team1Card: {
      borderColor: "#fca5a5",
    },
    team2Card: {
      borderColor: "#93c5fd",
    },
    teamHeader: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: "16px",
    },
    teamName: {
      fontSize: "1.25rem",
      fontWeight: "bold",
      color: "#1f2937",
      margin: 0,
    },
    teamCount: {
      display: "flex",
      alignItems: "center",
      gap: "8px",
      color: "#6b7280",
    },
    membersContainer: {
      marginBottom: "16px",
      minHeight: "120px",
    },
    memberItem: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      backgroundColor: "#f9fafb",
      padding: "12px",
      borderRadius: "8px",
      marginBottom: "8px",
    },
    memberInfo: {
      display: "flex",
      alignItems: "center",
      gap: "8px",
    },
    memberName: {
      fontWeight: "500",
      margin: 0,
    },
    emptyState: {
      color: "#9ca3af",
      textAlign: "center",
      padding: "32px 0",
      fontStyle: "italic",
    },
    button: {
      border: "none",
      borderRadius: "8px",
      padding: "12px 16px",
      fontWeight: "500",
      cursor: "pointer",
      transition: "background-color 0.2s ease",
      fontSize: "14px",
      width: "100%",
      marginBottom: "8px",
    },
    joinButton: {
      backgroundColor: "#3b82f6",
      color: "white",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: "8px",
    },
    joinButtonHover: {
      backgroundColor: "#2563eb",
    },
    leaveButton: {
      backgroundColor: "#ef4444",
      color: "white",
    },
    leaveButtonHover: {
      backgroundColor: "#dc2626",
    },
    botButtons: {
      display: "flex",
      gap: "4px",
    },
    botButton: {
      flex: 1,
      backgroundColor: "#e5e7eb",
      color: "#374151",
      border: "none",
      borderRadius: "6px",
      padding: "8px 4px",
      fontSize: "12px",
      fontWeight: "500",
      cursor: "pointer",
      transition: "background-color 0.2s ease",
    },
    botButtonHover: {
      backgroundColor: "#d1d5db",
    },
    removeButton: {
      backgroundColor: "transparent",
      border: "none",
      color: "#ef4444",
      fontSize: "12px",
      fontWeight: "500",
      cursor: "pointer",
      padding: "4px 8px",
    },
    footer: {
      background: "white",
      borderRadius: "12px",
      boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
      padding: "24px",
    },
    footerContent: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: "12px",
    },
    statusText: {
      color: "#6b7280",
    },
    fullRoomText: {
      marginLeft: "16px",
      color: "#059669",
      fontWeight: "500",
    },
    startButton: {
      backgroundColor: "#10b981",
      color: "white",
      border: "none",
      borderRadius: "8px",
      padding: "12px 24px",
      fontWeight: "bold",
      cursor: "pointer",
      display: "flex",
      alignItems: "center",
      gap: "8px",
      transition: "background-color 0.2s ease",
    },
    startButtonHover: {
      backgroundColor: "#059669",
    },
    disabledButton: {
      backgroundColor: "#d1d5db",
      color: "#9ca3af",
      cursor: "not-allowed",
    },
    helpText: {
      fontSize: "14px",
      color: "#9ca3af",
      marginTop: "12px",
    },
  };

  const TeamCard = ({ teamId, teamName, isTeam1 }) => {
    const team = teams[teamId];
    const isEmpty = team.length === 0;
    const isFull = team.length === 2;

    return (
      <div
        style={{
          ...styles.teamCard,
          ...(isTeam1 ? styles.team1Card : styles.team2Card),
        }}
      >
        <ErrorDisplay message={errorMsg} onClose={() => setErrorMsg(null)} />
        <div style={styles.teamHeader}>
          <h3 style={styles.teamName}>{teamName}</h3>
          <div style={styles.teamCount}>
            <Users size={20} />
            <span>{team.length}/2</span>
          </div>
        </div>

        <div style={styles.membersContainer}>
          {team.map((member, index) => (
            <div key={index} style={styles.memberItem}>
              <div style={styles.memberInfo}>
                {member.type === "bot" ? (
                  <Bot size={18} style={{ color: "#3b82f6" }} />
                ) : (
                  <Users size={18} style={{ color: "#10b981" }} />
                )}
                <span style={styles.memberName}>{member.name}</span>
              </div>
              {member.type === "bot" && (
                <button
                  onClick={() => removeBot(teamId, index)}
                  style={styles.removeButton}
                >
                  Remove
                </button>
              )}
            </div>
          ))}

          {isEmpty && <div style={styles.emptyState}>No players yet</div>}
        </div>

        <div>
          {!playerTeam && !isFull && (
            <button
              onClick={() => joinTeam(teamId)}
              style={{ ...styles.button, ...styles.joinButton }}
              onMouseOver={(e) =>
                (e.target.style.backgroundColor =
                  styles.joinButtonHover.backgroundColor)
              }
              onMouseOut={(e) =>
                (e.target.style.backgroundColor =
                  styles.joinButton.backgroundColor)
              }
            >
              <UserPlus size={18} />
              Join Team
            </button>
          )}

          {playerTeam === teamId && (
            <button
              onClick={leaveTeam}
              style={{ ...styles.button, ...styles.leaveButton }}
              onMouseOver={(e) =>
                (e.target.style.backgroundColor =
                  styles.leaveButtonHover.backgroundColor)
              }
              onMouseOut={(e) =>
                (e.target.style.backgroundColor =
                  styles.leaveButton.backgroundColor)
              }
            >
              Leave Team
            </button>
          )}

          {!isFull && (
            <div style={styles.botButtons}>
              {botDifficulties.map((difficulty) => (
                <button
                  key={difficulty}
                  onClick={() => addBot(teamId, difficulty)}
                  style={styles.botButton}
                  onMouseOver={(e) =>
                    (e.target.style.backgroundColor =
                      styles.botButtonHover.backgroundColor)
                  }
                  onMouseOut={(e) =>
                    (e.target.style.backgroundColor =
                      styles.botButton.backgroundColor)
                  }
                  title={`Add ${difficulty} Bot`}
                >
                  + {difficulty} Bot
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>Tractor Room Lobby</h1>
        <div style={styles.headerInfo}>
          <span style={{ ...styles.badge, ...styles.roomBadge }}>
            Room: {roomCode}
          </span>
          <span style={{ ...styles.badge, ...styles.playerBadge }}>
            Player: {playerName}
          </span>
        </div>
      </div>

      <div style={styles.teamsGrid}>
        <TeamCard teamId="team1" teamName="Team A" isTeam1={true} />
        <TeamCard teamId="team2" teamName="Team B" isTeam1={false} />
      </div>

      <div style={styles.footer}>
        <div style={styles.footerContent}>
          <div>
            <span style={styles.statusText}>
              Players: {getTotalPlayers()}/4
            </span>
            {isRoomFull() && (
              <span style={styles.fullRoomText}>Room is full!</span>
            )}
          </div>

          {canStartGame() ? (
            <button
              onClick={startGame}
              style={styles.startButton}
              onMouseOver={(e) =>
                (e.target.style.backgroundColor =
                  styles.startButtonHover.backgroundColor)
              }
              onMouseOut={(e) =>
                (e.target.style.backgroundColor =
                  styles.startButton.backgroundColor)
              }
            >
              <Play size={20} />
              Start Game
            </button>
          ) : (
            <button
              disabled
              style={{ ...styles.startButton, ...styles.disabledButton }}
            >
              <Play size={20} />
              Waiting for Players
            </button>
          )}
        </div>

        {!canStartGame() && (
          <div style={styles.helpText}>
            {getTotalPlayers() < 4
              ? `Need ${4 - getTotalPlayers()} more players to start`
              : "Teams must have exactly 2 members each"}
          </div>
        )}
      </div>
    </div>
  );
};

export default RoomLobby;
