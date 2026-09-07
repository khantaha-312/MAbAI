"use client";

import { useState, useRef, useEffect } from "react";
import { Bot, ChevronUp, Send } from "lucide-react";
import { useAuth } from "@clerk/nextjs";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

const SUGGESTED_QUESTIONS = [
  "What are the key risks in this report?",
  "Explain what RSI means here.",
  "What does the trend direction tell me?",
];

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export default function AiMarketAssistant() {
  const { getToken } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: "assistant", content: "Hi! 👋 I can explain any part of this report for you." },
  ]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, sending]);

  async function sendMessage(question: string) {
    const trimmed = question.trim();
    if (!trimmed || sending) return;

    setMessages((prev) => [...prev, { role: "user", content: trimmed }]);
    setInput("");
    setSending(true);
    setError(null);

    try {
      const token = await getToken();
      if (!token) throw new Error("No auth token available — user may not be signed in");

      const res = await fetch(`${API_BASE}/chat/ask`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ question: trimmed }),
      });

      if (!res.ok) throw new Error(`chat request failed: ${res.status}`);

      const json = await res.json();
      // Confirmed real shape from ChatController: { data: { answer, retrievedContextCount } }
      const answer: string = json.data?.answer ?? "No answer returned.";
      setMessages((prev) => [...prev, { role: "assistant", content: answer }]);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      setError(message);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: `Sorry, I couldn't get a response: ${message}` },
      ]);
    } finally {
      setSending(false);
    }
  }

  return (
    <aside className="flex h-full min-h-0 flex-col overflow-hidden rounded-xl bg-slate-300 border border-slate-500">
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between border-b border-slate-100 bg-slate-800 text-slate-100 p-1">
        <div className="flex items-center gap-3">
          <div className="rounded-full bg-indigo-50 p-2">
            <Bot size={20} className="text-indigo-600" />
          </div>
          <h2 className="text-sm font-semibold">AI Market Assistant</h2>
        </div>
        <ChevronUp size={18} className="text-slate-500" />
      </div>

      {/* Scrollable chat area */}
      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto px-2 py-1">
        {messages.map((msg, i) =>
          msg.role === "user" ? (
            <div
              key={i}
              className="mt-6 ml-auto w-fit max-w-[90%] rounded-lg bg-indigo-700 px-4 py-3 text-sm text-white"
            >
              {msg.content}
            </div>
          ) : (
            <div
              key={i}
              className="mt-5 max-w-[90%] rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm leading-7 text-slate-700 whitespace-pre-wrap"
            >
              {msg.content}
            </div>
          ),
        )}

        {sending && (
          <div className="mt-5 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-400">
            Thinking…
          </div>
        )}

        {/* Suggested questions — only shown before the first real exchange */}
        {messages.length === 1 && !sending && (
          <div className="mt-5 space-y-3">
            {SUGGESTED_QUESTIONS.map((q) => (
              <button
                key={q}
                onClick={() => sendMessage(q)}
                className="w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-left text-sm text-slate-600 hover:bg-slate-50"
              >
                {q}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Input stays at bottom */}
      <div className="shrink-0 p-0">
        <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-400 p-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") sendMessage(input);
            }}
            placeholder="Ask anything..."
            disabled={sending}
            className="min-w-0 flex-1 px-2 py-2 text-sm outline-none bg-transparent disabled:opacity-50"
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={sending || !input.trim()}
            className="shrink-0 rounded-md bg-indigo-700 p-2.5 text-white disabled:opacity-50"
          >
            <Send size={17} />
          </button>
        </div>
      </div>
    </aside>
  );
}




























// "use client";

// import { Bot, ChevronUp, Send } from "lucide-react";

// export default function AiMarketAssistant() {

  
//   return (
  
//     <aside className="flex h-full flex-col rounded-xl border border-slate-900 bg-white p-4 ">
      
//       {/* Assistant heading */}
//       <div className="flex items-center justify-between border-b border-slate-100 pb-4">
        
//         <div className="flex items-center gap-3">
//           <div className="rounded-full bg-indigo-50 p-2">
//             <Bot size={20} className="text-indigo-600" />
//           </div>

//           <h2 className="text-sm font-semibold text-slate-800">
//             AI Market Assistant
//           </h2>
//         </div>

//         <ChevronUp size={18} className="text-slate-500" />
//       </div>

//       {/* Welcome message */}
//       <div className="mt-5 max-w-[220px] rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-700">
//         Hi Umer! 👋
//         <br />
//         I can explain any part of this report for you.
//       </div>

//       {/* User message */}
//       <div className="mt-6 self-end rounded-lg bg-indigo-700 px-4 py-3 text-sm text-white">
//         Why is AAPL rated bullish technically?
//       </div>

//       {/* AI response */}
//       <div className="mt-5 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm leading-7 text-slate-700">
//         <p>AAPL is rated bullish because:</p>

//         <ul className="mt-3 space-y-2">
//           <li>• RSI is above 50 and trending up</li>
//           <li>• Price is above 50 & 200 EMA</li>
//           <li>• MACD shows bullish crossover</li>
//           <li>• Strong volume support</li>
//         </ul>

//         <p className="mt-4">
//           These indicate upward momentum.
//         </p>
//       </div>

//       {/* Suggested questions */}
//       <div className="mt-5 space-y-3">
//         <button className="w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-left text-sm text-slate-600">
//           How does AAPL compare to industry peers?
//         </button>

//         <button className="w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-left text-sm text-slate-600">
//           What are the key risks?
//         </button>

//         <button className="w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-left text-sm text-slate-600">
//           Show key support & resistance levels.
//         </button>
//       </div>

//       {/* Chat input */}
//       <div className="mt-auto flex items-center gap-2 rounded-lg border border-slate-200 p-2">
//         <input
//           type="text"
//           placeholder="Ask anything..."
//           className="min-w-0 flex-1 bg-transparent px-2 py-2 text-sm outline-none"
//         />

//         <button className="rounded-md bg-indigo-700 p-2.5 text-white">
//           <Send size={17} />
//         </button>
//       </div>
//     </aside>
//   );
// }

