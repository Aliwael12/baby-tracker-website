"use client";

import { useState } from "react";

interface NamePromptProps {
  onNameSet: (name: string) => void;
}

export default function NamePrompt({ onNameSet }: NamePromptProps) {
  const [name, setName] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (trimmed) {
      localStorage.setItem("babytracker_username", trimmed);
      onNameSet(trimmed);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-baby-50/90 backdrop-blur-sm p-4">
      <div className="animate-slide-up w-full max-w-sm rounded-3xl bg-white p-8 shadow-xl">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 text-5xl">👶</div>
          <h1 className="text-2xl font-bold text-baby-600">Baby Tracker</h1>
          <p className="mt-2 text-sm text-gray-500">
            Welcome! Enter your name to get started.
          </p>
        </div>
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
            autoFocus
            className="w-full rounded-2xl border-2 border-baby-200 bg-baby-50 px-4 py-3 text-center text-lg outline-none transition-colors focus:border-baby-400 placeholder:text-baby-300"
          />
          <button
            type="submit"
            disabled={!name.trim()}
            className="mt-4 w-full rounded-2xl bg-baby-400 py-3 text-lg font-semibold text-white shadow-md transition-all active:scale-[0.97] disabled:opacity-40 disabled:active:scale-100"
          >
            Let&apos;s Go!
          </button>
        </form>
      </div>
    </div>
  );
}
