import { useState, useRef, useEffect } from "react";

function App() {
  const [token, setToken] = useState(localStorage.getItem("token"));
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const [message, setMessage] = useState("");
  const [chat, setChat] = useState([]);
  const [listening, setListening] = useState(false);
  const [voiceMode, setVoiceMode] = useState(false);

  const chatEndRef = useRef(null);

  const API_BASE = "https://parents-english-backend.onrender.com";

  // ---------------- LOGIN ----------------
  const handleLogin = async () => {
    const res = await fetch(`${API_BASE}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });

    if (!res.ok) {
      alert("Login failed");
      return;
    }

    const data = await res.json();
    localStorage.setItem("token", data.access_token);
    setToken(data.access_token);
  };

  const logout = () => {
    localStorage.removeItem("token");
    setToken(null);
    setChat([]);
  };

  // ---------------- SPEECH SYNTHESIS ----------------
  const speak = (text) => {
    if (!voiceMode) return;

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-US";
    utterance.rate = 0.9;

    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  };

  // ---------------- CHAT ----------------
  const sendMessage = async () => {
    if (!message.trim()) return;

    const newChat = [...chat, { role: "user", content: message }];
    setChat(newChat);
    setMessage("");

    const res = await fetch(`${API_BASE}/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        message: message,
        history: newChat,
      }),
    });

    if (res.status === 401) {
      alert("Session expired.");
      logout();
      return;
    }

    const data = await res.json();

    const updatedChat = [
      ...newChat,
      { role: "assistant", content: data.reply },
    ];

    setChat(updatedChat);

    speak(data.reply);
  };

  // ---------------- SPEECH TO TEXT ----------------
  const startListening = () => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert("Speech recognition not supported.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.interimResults = false;

    recognition.start();
    setListening(true);

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setMessage(transcript);
    };

    recognition.onend = () => {
      setListening(false);
    };
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chat]);

  // ---------------- LOGIN SCREEN ----------------
  if (!token) {
    return (
      <div style={{ maxWidth: "400px", margin: "100px auto", textAlign: "center" }}>
        <h2>Parent Login</h2>

        <input
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          style={{ width: "100%", padding: "10px", marginBottom: "10px" }}
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={{ width: "100%", padding: "10px", marginBottom: "10px" }}
        />

        <button
          onClick={handleLogin}
          style={{
            width: "100%",
            padding: "10px",
            backgroundColor: "#007bff",
            color: "white",
            border: "none",
          }}
        >
          Login
        </button>
      </div>
    );
  }

  // ---------------- CHAT UI ----------------
  return (
    <div style={{ maxWidth: "700px", margin: "40px auto", padding: "20px" }}>
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <h2>English Practice</h2>
        <button onClick={logout}>Logout</button>
      </div>

      <div style={{ textAlign: "center", marginBottom: "10px" }}>
        <label>
          <input
            type="checkbox"
            checked={voiceMode}
            onChange={() => setVoiceMode(!voiceMode)}
            style={{ marginRight: "6px" }}
          />
          Voice Replies
        </label>
      </div>

      <div
        style={{
          border: "1px solid #ddd",
          borderRadius: "12px",
          padding: "20px",
          height: "400px",
          overflowY: "auto",
          marginBottom: "15px",
          backgroundColor: "#f9f9f9",
        }}
      >
        {chat.map((msg, index) => (
          <div key={index} style={{ marginBottom: "10px" }}>
            <strong>{msg.role === "user" ? "You" : "Assistant"}:</strong>{" "}
            {msg.content}
          </div>
        ))}
        <div ref={chatEndRef} />
      </div>

      <div style={{ display: "flex", alignItems: "center" }}>
        <input
          style={{ flex: 1, padding: "10px" }}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Type or use mic..."
        />

        <button
          onClick={startListening}
          style={{
            marginLeft: "10px",
            padding: "10px",
            backgroundColor: listening ? "red" : "#28a745",
            color: "white",
            border: "none",
          }}
        >
          🎤
        </button>

        <button
          style={{ marginLeft: "10px", padding: "10px" }}
          onClick={sendMessage}
        >
          Send
        </button>
      </div>
    </div>
  );
}

export default App;