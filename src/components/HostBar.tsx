import React from "react";
import { ArrowLeft } from "lucide-react";

// Slim bar linking back to the host site when the app is embedded under one
// (e.g. served at /predictor/ on a host's domain alongside VITE_BASE_PATH).
// Configured via VITE_HOST_APP_NAME + VITE_HOST_APP_URL; renders nothing in
// the normal standalone flow where neither is set.
const hostName = import.meta.env.VITE_HOST_APP_NAME;
const hostUrl = import.meta.env.VITE_HOST_APP_URL;

export default function HostBar() {
  if (!hostName || !hostUrl) return null;

  return (
    <div className="bg-[#041014] border-b border-[#113a4b]/40">
      <a
        href={hostUrl}
        className="max-w-7xl mx-auto px-2 sm:px-6 h-8 flex items-center gap-1.5 text-slate-400 hover:text-teal-300 text-xs font-mono transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        <span>Back to {hostName}</span>
      </a>
    </div>
  );
}
