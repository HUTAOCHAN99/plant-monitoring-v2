"use client";

import { useState } from "react";

export default function CameraTabs() {
  const streams = {
    kamera1:
      "https://swiftness-undecided-empower.ngrok-free.dev/stream.html?src=tapo_kamera&mode=mse",
    kamera2:
      "http://192.168.14.47:18090/?viewIndex=0#Live",
  };

  const [activeTab, setActiveTab] = useState("kamera1");

  return (
    <div className="w-full">
      {/* Navigasi tab */}
      <div className="flex gap-2 mb-3">
        <button
          onClick={() => setActiveTab("kamera1")}
          className={`px-4 py-2 rounded-md text-sm transition ${
            activeTab === "kamera1"
              ? "bg-gray-700 text-white"
              : "bg-gray-900 text-white hover:bg-gray-800"
          }`}
        >
          Live 
        </button>

        <button
          onClick={() => setActiveTab("kamera2")}
          className={`px-4 py-2 rounded-md text-sm transition ${
            activeTab === "kamera2"
              ? "bg-gray-700 text-white"
              : "bg-gray-900 text-white hover:bg-gray-800"
          }`}
        >
          Playback
        </button>
      </div>

      {/* Frame */}
      <div
        className="relative pb-[56.25%] h-0 border rounded-md overflow-hidden"
        style={{ minHeight: "450px" }}
      >
        <iframe
          key={activeTab}
          className="absolute top-0 left-0 w-full h-full"
          src={streams[activeTab]}
          title={activeTab}
          allow="autoplay; fullscreen"
          onLoad={() => console.log(`${activeTab} loaded`)}
        />
      </div>
    </div>
  );
}
