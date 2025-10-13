// src/Chatbotpanel.jsx
import React, { useState, useRef, useEffect } from "react";
import { FaTimes } from "react-icons/fa";
import { useAuth } from "./AuthContext";

export default function Chatbotpanel({ onClose }) {
  const { fetchWithAuth } = useAuth();
  const [messages, setMessages] = useState([
    { from: "bot", text: "Hi! How can I help you with compliance today?" },
  ]);
  const [input, setInput] = useState("");
  const containerRef = useRef(null);

  // Scroll to bottom every time messages change
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text) return;

    // Prevent duplicate user messages
    const last = messages[messages.length - 1];
    if (last?.from === "user" && last?.text === text) {
      setInput("");
      return;
    }

    // Add user message immediately
    setMessages((prev) => [...prev, { from: "user", text }]);
    setInput("");

    try {
      // Call Django API instead of Rasa
      const res = await fetchWithAuth("/api/chat/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      });

      const data = await res.json();

      if (data && data.length > 0) {
        data.forEach((msg) => {
          if (msg.text) {
            setMessages((prev) => [...prev, { from: "bot", text: msg.text }]);
          }
          if (msg.image) {
            setMessages((prev) => [
              ...prev,
              { from: "bot", text: `[Image] ${msg.image}` },
            ]);
          }
        });
      } else {
        setMessages((prev) => [
          ...prev,
          { from: "bot", text: "Sorry, I didn’t understand that." },
        ]);
      }
    } catch (err) {
      console.error("Error connecting to Django API:", err);
      setMessages((prev) => [
        ...prev,
        { from: "bot", text: "⚠️ Server error. Please try again later." },
      ]);
    }
  };

  return (
    <div
      className="fixed bottom-24 right-6 w-80 bg-white rounded-lg shadow-lg flex flex-col z-50"
      style={{ maxHeight: "70vh" }}
    >
      <div className="flex justify-between items-center p-3 border-b">
        <span className="font-semibold text-blue-800">Compliance Chatbot</span>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-blue-600 text-xl"
        >
          <FaTimes />
        </button>
      </div>

      {/* Message list */}
      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto p-3 space-y-2"
        style={{ minHeight: "200px" }}
      >
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`text-sm ${
              msg.from === "bot"
                ? "text-left text-blue-600"
                : "text-right text-gray-800"
            }`}
          >
            <div
              className={`inline-block px-3 py-2 rounded-lg ${
                msg.from === "bot" ? "bg-blue-100" : "bg-gray-200"
              }`}
            >
              {msg.text}
            </div>
          </div>
        ))}
      </div>

      {/* Input */}
      <div className="p-2 border-t">
        <form
          className="flex w-full"
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="flex-1 px-3 py-2 rounded-l bg-gray-100 border border-r-0 focus:outline-none"
            placeholder="Type your question…"
          />
          <button
            type="submit"
            className="bg-blue-600 text-white px-4 py-2 rounded-r hover:bg-blue-700"
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
}
