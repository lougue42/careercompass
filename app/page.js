"use client";
import { useState } from "react";

export default function Home() {
  const [name, setName] = useState("");
  const [interests, setInterests] = useState("");
  const [message, setMessage] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    setMessage(`Thanks ${name}, we'll explore paths related to "${interests}".`);
    setName("");
    setInterests("");
  };

  return (
    <main className="min-h-screen bg-white flex items-center justify-center">
      <div className="p-8 rounded-2xl shadow-lg border w-full max-w-md">
        <h1 className="text-2xl font-bold mb-4 text-center">Career Compass</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            placeholder="Your name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full border px-3 py-2 rounded-lg"
          />
          <input
            type="text"
            placeholder="Your interests"
            value={interests}
            onChange={(e) => setInterests(e.target.value)}
            className="w-full border px-3 py-2 rounded-lg"
          />
          <button
            type="submit"
            className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700"
          >
            Find My Path
          </button>
        </form>
        {message && <p className="mt-4 text-center text-green-600">{message}</p>}
      </div>
    </main>
  );
}
