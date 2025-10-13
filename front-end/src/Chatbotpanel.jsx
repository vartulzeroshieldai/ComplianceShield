// src/Chatbotpanel.jsx
import React, { useState, useRef, useEffect } from "react";
import { useAuth } from "./AuthContext";
import {
  FaTimes,
  FaShieldAlt,
  FaPaperclip,
  FaMicrophone,
  FaChartBar,
  FaClipboardList,
  FaSearch,
  FaFileAlt,
  FaRobot,
} from "react-icons/fa";

export default function Chatbotpanel({ onClose }) {
  const { fetchWithAuth } = useAuth();
  const [messages, setMessages] = useState([
    {
      from: "bot",
      text: "👋 Hi! I'm your Compliance Assistant. Nice to meet you.",
      timestamp: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    },
  ]);
  const [input, setInput] = useState("");
  const [showQuickActions, setShowQuickActions] = useState(true);
  const [isTyping, setIsTyping] = useState(false);
  const containerRef = useRef(null);

  const quickActions = [
    {
      id: 1,
      icon: <FaChartBar className="text-lg" />,
      text: "Check Compliance Risks",
      action: () =>
        handleQuickAction("I want to check compliance risks for my project"),
    },
    {
      id: 2,
      icon: <FaClipboardList className="text-lg" />,
      text: "View ISO Controls",
      action: () => handleQuickAction("Show me ISO 27001 controls"),
    },
    {
      id: 3,
      icon: <FaSearch className="text-lg" />,
      text: "Audit Checklist",
      action: () => handleQuickAction("Generate an audit checklist"),
    },
    {
      id: 4,
      icon: <FaFileAlt className="text-lg" />,
      text: "GDPR & HIPAA Requirements",
      action: () =>
        handleQuickAction("Tell me about GDPR and HIPAA requirements"),
    },
  ];

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [messages]);

  const handleQuickAction = (actionText) => {
    setShowQuickActions(false);
    handleSendMessage(actionText);
  };

  const handleSendMessage = async (messageText = input.trim()) => {
    const text = messageText;
    if (!text) return;

    const last = messages[messages.length - 1];
    if (last?.from === "user" && last?.text === text) {
      setInput("");
      return;
    }

    setMessages((prev) => [
      ...prev,
      {
        from: "user",
        text,
        timestamp: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      },
    ]);
    setInput("");
    setIsTyping(true);

    try {
      const res = await fetchWithAuth("/api/chat/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      });

      const data = await res.json();
      setIsTyping(false);

      if (data && data.length > 0) {
        data.forEach((msg) => {
          const entry = {
            from: "bot",
            text: msg.text || `[Image] ${msg.image}`,
            timestamp: new Date().toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            }),
          };
          setMessages((prev) => [...prev, entry]);
        });
      } else {
        setMessages((prev) => [
          ...prev,
          {
            from: "bot",
            text: "Sorry, I didn't understand that.",
            timestamp: new Date().toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            }),
          },
        ]);
      }
    } catch (err) {
      console.error("Error connecting to Django API:", err);
      setIsTyping(false);
      setMessages((prev) => [
        ...prev,
        {
          from: "bot",
          text: "⚠️ Server error. Please try again later.",
          timestamp: new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
        },
      ]);
    }
  };

  const handleSend = () => {
    handleSendMessage();
  };

  return (
    <div
      className="fixed bottom-6 right-6 w-112 max-w-[calc(100vw-3rem)] bg-white rounded-2xl shadow-2xl flex flex-col z-50 border border-gray-200 overflow-hidden"
      style={{ height: "620px", maxHeight: "calc(100vh - 3rem)" }}
    >
      {/* Header */}
      <div className="bg-gradient-to-r from-teal-500 via-cyan-600 to-indigo-600 p-5 flex items-center justify-between text-white relative overflow-hidden flex-shrink-0">
        <div className="absolute inset-0 bg-gradient-to-r from-teal-400/20 to-indigo-500/20 animate-pulse"></div>
        <div className="absolute -top-6 -right-6 w-28 h-28 bg-white/10 rounded-full blur-xl"></div>
        <div className="absolute -bottom-3 -left-3 w-20 h-20 bg-white/5 rounded-full blur-lg"></div>

        <div className="flex items-center space-x-4 relative z-10 min-w-0 flex-1 mr-3">
          <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center shadow-lg border border-white/20 flex-shrink-0">
            <FaShieldAlt className="text-white text-lg" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-bold text-lg truncate">Compliance Assistant</h3>
            <p className="text-teal-100 text-sm font-medium truncate">
              Your AI Compliance Expert
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="text-white/80 hover:text-white p-2 hover:bg-white/20 rounded-full relative z-10 flex-shrink-0 cursor-pointer transition-all duration-200"
        >
          <FaTimes className="text-xl" />
        </button>
      </div>

      {/* Messages */}
      <div
        ref={containerRef}
        className="flex-1 overflow-y-scroll [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] overflow-x-hidden p-5 bg-gradient-to-b from-gray-50/50 to-white min-h-0"
      >
        {messages.map((msg, idx) => (
          <div key={idx} className="mb-6">
            {msg.from === "bot" ? (
              <div className="flex items-start space-x-3">
                <div className="w-9 h-9 bg-gradient-to-r from-teal-500 to-indigo-600 rounded-full flex items-center justify-center shadow-lg border-2 border-white flex-shrink-0">
                  <FaRobot className="text-white text-sm" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-2">
                    <span className="text-sm font-bold bg-gradient-to-r from-teal-600 to-indigo-600 bg-clip-text text-transparent truncate">
                      Compliance Assistant
                    </span>
                    <span className="text-gray-400 text-xs flex-shrink-0">
                      • {msg.timestamp}
                    </span>
                  </div>
                  <div className="bg-white rounded-2xl rounded-tl-md p-4 shadow-md border border-gray-100 relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-teal-50/60 to-indigo-50/60 opacity-40"></div>
                    <div className="relative z-10 text-gray-800 text-sm leading-relaxed break-words whitespace-pre-wrap">
                      {msg.text}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex justify-end">
                <div className="max-w-xs min-w-0">
                  <div className="bg-gradient-to-r from-teal-500 via-cyan-600 to-indigo-600 text-white rounded-2xl rounded-br-md p-4 shadow-lg relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 to-indigo-700/20"></div>
                    <div className="relative z-10 text-sm font-medium break-words whitespace-pre-wrap">
                      {msg.text}
                    </div>
                  </div>
                  <div className="text-right mt-1">
                    <span className="text-gray-400 text-xs">
                      {msg.timestamp}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}

        {isTyping && (
          <div className="flex items-start space-x-3 mb-6">
            <div className="w-9 h-9 bg-gradient-to-r from-teal-500 to-indigo-600 rounded-full flex items-center justify-center shadow-lg border-2 border-white flex-shrink-0">
              <FaRobot className="text-white text-sm" />
            </div>
            <div className="bg-white rounded-2xl rounded-tl-md p-4 shadow-md border border-gray-100 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-teal-50/60 to-indigo-50/60 opacity-40"></div>
              <div className="flex space-x-2 relative z-10">
                <div className="w-2.5 h-2.5 bg-gradient-to-r from-teal-500 to-cyan-500 rounded-full animate-bounce"></div>
                <div
                  className="w-2.5 h-2.5 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full animate-bounce"
                  style={{ animationDelay: "0.1s" }}
                ></div>
                <div
                  className="w-2.5 h-2.5 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full animate-bounce"
                  style={{ animationDelay: "0.2s" }}
                ></div>
              </div>
            </div>
          </div>
        )}

        {showQuickActions && messages.length === 1 && (
          <div className="mt-8">
            <p className="text-gray-600 text-sm mb-6 leading-relaxed font-medium">
              How can I assist you with compliance monitoring today?
            </p>
            <div className="space-y-3">
              {quickActions.map((action) => (
                <button
                  key={action.id}
                  onClick={action.action}
                  className="group w-full flex items-center space-x-4 p-4 bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-lg transition-all duration-300 hover:scale-105 hover:bg-gradient-to-r hover:from-teal-400 hover:via-cyan-500 hover:to-indigo-400 cursor-pointer"
                >
                  {/* Icon with gradient color that becomes white on hover */}
                  <div className="relative z-10 bg-gradient-to-r from-teal-500 to-indigo-600 bg-clip-text text-teal-500 group-hover:text-white transition-all duration-300 flex-shrink-0">
                    {action.icon}
                  </div>

                  {/* Text with gradient color that becomes white on hover */}
                  <span className="relative z-10 text-sm font-semibold bg-gradient-to-r from-teal-600 to-indigo-600 bg-clip-text text-transparent group-hover:text-white transition-all duration-300 text-left break-words min-w-0 flex-1">
                    {action.text}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="p-5 bg-white  border-gray-150 relative flex-shrink-0">
        {/* Subtle gradient divider */}
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent"></div>

        <form
          className="flex items-center space-x-3"
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
        >
          {/* Attachment button */}
          <button
            type="button"
            className="p-2.5 text-gray-400 hover:text-teal-600 transition-colors rounded-xl hover:bg-teal-50 flex-shrink-0 cursor-pointer"
          >
            <FaPaperclip className="text-lg" />
          </button>

          {/* Enhanced Input Container */}
          <div className="relative flex-1 group">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="w-full px-5 py-3.5 bg-gray-50 text-gray-800 placeholder-gray-500 rounded-2xl border border-gray-300 outline-none focus:border-transparent focus:ring-2 focus:ring-transparent transition-all duration-300 focus:bg-white focus:shadow-sm group-hover:border-gray-400"
              placeholder="Type your compliance question..."
              style={{
                background:
                  "linear-gradient(white, white) padding-box, linear-gradient(135deg, #14B8A6, #4F46E5) border-box",
                border: "1px solid transparent",
              }}
              onFocus={(e) => {
                e.target.style.background =
                  "linear-gradient(white, white) padding-box, linear-gradient(135deg, #14B8A6, #4F46E5) border-box";
                e.target.style.border = "2px solid transparent";
              }}
              onBlur={(e) => {
                e.target.style.background = "";
                e.target.style.border = "1px solid #d1d5db";
              }}
            />
          </div>

          {/* Microphone button */}
          <button
            type="button"
            className="p-2.5 text-gray-400 hover:text-indigo-600 transition-colors rounded-xl hover:bg-indigo-50 flex-shrink-0 cursor-pointer"
          >
            <FaMicrophone className="text-lg" />
          </button>
        </form>

        {/* Enhanced footer text */}
        <div className="text-center mt-4">
          <p className="text-xs bg-gradient-to-r from-teal-600 to-indigo-600 bg-clip-text text-transparent font-semibold">
            ⚡ Powered by Advanced Compliance Engine
          </p>
        </div>
      </div>
    </div>
  );
}
