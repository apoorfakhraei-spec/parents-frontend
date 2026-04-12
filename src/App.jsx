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
  const [todayTopic, setTodayTopic] = useState("");

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
    setTodayTopic("");
    setHasStarted(false);
  };

  // ---------------- SPEECH ----------------
  const speak = (text) => {
    if (!voiceMode) return;

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-US";
    utterance.rate = 0.9;

    utterance.onend = () => startListening();

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
          persian: showPersian,
        }),
      });

      const data = await res.json();

      const updatedChat = [
        ...newChat,
        { role: "assistant", content: data.reply },
      ];

      setChat(updatedChat);

      speak(data.reply.split("\n")[0]);
    } catch {
      alert("Network error.");
    }

    setLoading(false);
  };

  // ---------------- SPEECH TO TEXT ----------------
  const startListening = () => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";

    recognition.start();
    setListening(true);

    recognition.onresult = (e) => {
      setMessage(e.results[0][0].transcript);
    };

    recognition.onend = () => setListening(false);
  };

  // ---------------- SCROLL ----------------
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chat]);

  // ---------------- GENERATE TOPIC ----------------
  useEffect(() => {
    if (!token) return;
    if (todayTopic) return;

    const generateTopic = async () => {
      try {
        const res = await fetch(`${API_BASE}/chat`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            message: `
Give ONE random topic.

Rules:
- ONLY 2 to 4 words
- NO explanation
- NOT food

Examples:
morning walk
family time
watching TV

Return ONLY the topic.
            `,
            history: [],
            correct: false,
            persian: false,
          }),
        });

        const data = await res.json();

        let topic = data.reply?.trim().toLowerCase();

        topic = topic.replace(/[".]/g, "");

        const fallbackTopics = [
          "morning routine",
          "family",
          "walking outside",
          "music",
          "weekend plans",
          "shopping",
          "weather",
          "friends",
        ];

        if (!topic || topic.includes("food") || topic.split(" ").length > 5) {
          topic =
            fallbackTopics[
              Math.floor(Math.random() * fallbackTopics.length)
            ];
        }

        setTodayTopic(topic);
      } catch {
        console.error("Topic generation failed");
      }
    };

    generateTopic();
  }, [token, todayTopic]);

  // ---------------- AUTO START ----------------
  useEffect(() => {
    if (!token || !todayTopic || hasStarted || chat.length > 0) return;

    const startConversation = async () => {
      setHasStarted(true);
      setLoading(true);

      try {
        const res = await fetch(`${API_BASE}/chat`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            message: `
You MUST follow the topic.

Start with greeting.
Say the topic.
Ask ONE simple question.

Do NOT change topic.

Topic: ${todayTopic}
            `,
            history: [],
            correct: correctMe,
            persian: showPersian,
          }),
        });

        const data = await res.json();

        setChat([{ role: "assistant", content: data.reply }]);

        speak(data.reply.split("\n")[0]);
      } catch {
        console.error("Auto-start failed");
      }

      setLoading(false);
    };

    startConversation();
  }, [token, todayTopic, hasStarted, chat.length]);

  // ---------------- LOGIN UI ----------------
  if (!token) {
    return (
      <div style={{ display: "flex", justifyContent: "center", marginTop: 100 }}>
        <div>
          <h2>Login</h2>
          <input placeholder="Username" onChange={(e) => setUsername(e.target.value)} />
          <input type="password" onChange={(e) => setPassword(e.target.value)} />
          <button onClick={handleLogin}>Login</button>
        </div>
      </div>
    );
  }

  // ---------------- CHAT UI ----------------
  return (
    <div style={{ maxWidth: 600, margin: "auto" }}>
      <h2>English Practice</h2>
      <button onClick={logout}>Logout</button>

      <div style={{ height: 400, overflowY: "auto" }}>
        {chat.map((msg, i) => (
          <div key={i} style={{ textAlign: msg.role === "user" ? "right" : "left" }}>
            {msg.content}
          </div>
        ))}
        <div ref={chatEndRef} />
      </div>

      <input
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && sendMessage()}
      />

      <button onClick={startListening}>🎤</button>
      <button onClick={sendMessage}>{loading ? "..." : "Send"}</button>
    </div>
  );
}

export default App;