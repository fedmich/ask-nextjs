'use client'

import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Send, Mic } from "lucide-react";
import { useState } from "react";

export default function Home() {
  const [input, setInput] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    // Handle AI query
    console.log("Query:", input);
    setInput("");
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-start p-4 md:p-8">
      {/* Header */}
      <h1 className="text-4xl md:text-6xl font-bold mb-8 text-center bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-300">
        Ask A.I.
      </h1>

      {/* Chat Area */}
      <form onSubmit={handleSubmit} className="w-full max-w-2xl space-y-4">
        <div className="relative">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask anything..."
            className="min-h-24 pl-12 pr-20 rounded-xl bg-white/10 backdrop-blur-sm border-white/20 text-white placeholder:text-white/60"
            autoFocus
          />
          <button
            type="button"
            className="absolute left-3 top-3 text-white/70 hover:text-white transition-colors"
          >
            <Mic className="h-5 w-5" />
          </button>
          <button
            type="submit"
            disabled={!input.trim()}
            className="absolute right-3 top-3 text-white/70 hover:text-white transition-colors disabled:opacity-50"
          >
            <Send className="h-5 w-5" />
          </button>
        </div>
      </form>
    </div>
  );
}   