import { useState, useRef, useEffect } from "react";

function App() {
  const [hasStarted, setHasStarted] = useState(false);
  const [token, setToken] = useState(localStorage.getItem("token"));
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const [message, setMessage] = useState("");
  const [chat, setChat] = useState([]);
  const [listening, setListening] = useState(false);
  const [voiceMode, setVoiceMode] = useState(false);
  const [showPersian, setShowPersian] = useState(true);
  const [correctMe, setCorrectMe] = useState(false);
  const [loading, setLoading] = useState(false);

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

    utterance.onend = () => {
      startListening();
    };

    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  };

  // ---------------- CHAT ----------------
const sendMessage = async () => {
  if (!message.trim() || loading) return;

  setLoading(true);

  const newChat = [...chat, { role: "user", content: message }];
  setChat(newChat);
  setMessage("");

  try {
    const res = await fetch(`${API_BASE}/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        message: message,
        history: newChat, 
        correct: correctMe,
        persian: showPersian
      }),
    });

    if (res.status === 401) {
      console.warn("Unauthorized - keeping user logged in");
      return;
    }

    const data = await res.json();

    const updatedChat = [
      ...newChat,
      { role: "assistant", content: data.reply },
    ];

    setChat(updatedChat);

    const englishOnly = data.reply.split("\n")[0];
    speak(englishOnly);

  } catch (err) {
    alert("Network error. Please try again.");
  }

  setLoading(false);
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

  useEffect(() => {
    if (!token) return;
    if (chat.length > 0) return;
    if (hasStarted) return;

    const startConversation = async () => {
      setHasStarted(true);

      const starter = `Let's talk about this: ${todayTopic}. Ask me a simple question to start the conversation.`;

      setLoading(true);

      const instruction = showPersian
        ? "Please include Persian translation."
        : "Do not include Persian translation.";

      try {
        const res = await fetch(`${API_BASE}/chat`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            message: instruction + "\n" + message,
            history: newChat,
            correct: correctMe,
            persian: showPersian
          }),
        });

        const data = await res.json();

        const firstMessage = {
          role: "assistant",
          content: data.reply,
        };

        setChat([firstMessage]);

        const englishOnly = data.reply.split("\n")[0];
        speak(englishOnly);

      } catch (err) {
        console.error("Auto-start failed");
      }

      setLoading(false);
    };

    startConversation();
  }, [token]);

const topics = [
  "Talk about your favorite food",
  "Talk about your morning routine",
  "Talk about your favorite movie",
  "Talk about your childhood",
  "Talk about your favorite place",
  "Talk about your hobbies",
];

const todayTopic =
  topics[new Date().getDate() % topics.length];

// ---------------- LOGIN SCREEN ----------------
if (!token) {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#111",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <div
        style={{
          width: "420px",
          padding: "40px",
          borderRadius: "16px",
          backgroundColor: "#1e1e1e",
          textAlign: "center",
          boxShadow: "0 8px 30px rgba(0,0,0,0.5)",
        }}
      >
        <h1
          style={{
            fontSize: "34px",
            color: "#ffffff",
            marginBottom: "18px",
          }}
        >
          English Practice
        </h1>

        <p
          style={{
            fontSize: "20px",
            color: "#dddddd",
            marginBottom: "35px",
          }}
        >
          Login to start practicing English
        </p>

        <input
          autoFocus
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          style={{
            width: "100%",
            padding: "16px",
            fontSize: "18px",
            fontWeight: "600",
            marginBottom: "18px",
            borderRadius: "10px",
            border: "1px solid #444",
            backgroundColor: "#2a2a2a",
            color: "white",
          }}
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleLogin();
          }}
          style={{
            width: "100%",
            padding: "16px",
            fontSize: "18px",
            fontWeight: "600",
            marginBottom: "30px",
            borderRadius: "10px",
            border: "1px solid #444",
            backgroundColor: "#2a2a2a",
            color: "white",
          }}
        />

        <button
          onClick={handleLogin}
          style={{
            width: "100%",
            padding: "18px",
            fontSize: "20px",
            fontWeight: "bold",
            backgroundColor: "#2563eb",
            color: "white",
            border: "none",
            borderRadius: "12px",
            cursor: "pointer",
          }}
        >
          Login
        </button>
      </div>
    </div>
  );
}


  // ---------------- CHAT UI ----------------
  return (
    <div style={{ maxWidth: "680px", width: "95%", margin: "40px auto", padding: "20px" }}>
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <h2>English Practice</h2>
        <button onClick={logout}>Logout</button>
      </div>

      <div
      style={{
        backgroundColor: "#1e293b",
        color: "white",
        padding: "12px",
        borderRadius: "10px",
        marginBottom: "12px",
        textAlign: "center",
        fontWeight: "bold",
      }}
      >
        Today's Topic: {todayTopic}
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
      <div style={{ textAlign: "center", marginBottom: "10px" }}>
        <label style={{ fontSize: "16px", cursor: "pointer" }}>
          <input
            type="checkbox"
            checked={correctMe}
            onChange={() => setCorrectMe(!correctMe)}
            style={{ marginRight: "6px" }}
          />
          Correct me!
        </label>
      </div>
      <div style={{ textAlign: "center", marginBottom: "10px" }}>
        <label style={{ fontSize: "16px", cursor: "pointer" }}>
          <input
            type="checkbox"
            checked={showPersian}
            onChange={() => setShowPersian(!showPersian)}
            style={{ marginRight: "6px" }}
          />
          ترجمه ی فارسی
        </label>
      </div>

      <div
        style={{
          border: "1px solid #ddd",
          borderRadius: "12px",
          padding: "20px",
          height: "500px",
          fontSize: "18px",
          overflowY: "auto",
          marginBottom: "15px",
          backgroundColor: "#f9f9f9",
        }}
      >
        {chat.map((msg, index) => {
          const isUser = msg.role === "user";

          return (
            <div
              key={index}
              style={{
                display: "flex",
                justifyContent: isUser ? "flex-end" : "flex-start",
                marginBottom: "10px",
              }}
            >
              <div
                style={{
                  maxWidth: "75%",
                  padding: "14px 18px",
                  borderRadius: "18px",
                  fontSize: "18px",
                  lineHeight: "1.4",
                  backgroundColor: isUser ? "#2563eb" : "#e5e5ea",
                  color: isUser ? "white" : "black",
                }}
              >
                {msg.content}
              </div>
            </div>
          );
        })}

        <div ref={chatEndRef} />
      </div>

      <div style={{ display: "flex", alignItems: "center" }}>
        <input
          style={{ flex: 1, padding: "10px" }}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Type or use mic..."
          onKeyDown={(e) => {
            if (e.key === "Enter") sendMessage();
          }}
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
          disabled={loading}
        >
          {loading ? "Thinking..." : "Send"}
        </button>
      </div>
    </div>
  );
}

export default App;