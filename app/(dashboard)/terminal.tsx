"use client";

import { useState, useEffect } from "react";
import { Copy, Check } from "lucide-react";

export function Terminal() {
  const [terminalStep, setTerminalStep] = useState(0);
  const [copied, setCopied] = useState(false);
  const terminalSteps = [
    "dok.so Audit : KFZ 🚚 Beschaffung.",
    "Der Bieter-Audit für TransportPro GmbH wird durchgeführt...",
    "Prüfung auf Vollständigkeit der Unterlagen: ⏳ 95%.",
    "Es wird noch ein Dokument 📄 benötigt: Versicherungsnachweis.",
    "Die Prüfung der Eignungskriterien ist zu 100% erfolgt.",
    "Die Freigabe durch Mag. Müller wurde erteilt. ✅ Alles bereit!",
  ];

  useEffect(() => {
    const timer = setTimeout(() => {
      setTerminalStep((prev) =>
        prev < terminalSteps.length - 1 ? prev + 1 : prev
      );
    }, 1200); // Increased delay for a more natural chat feel

    return () => clearTimeout(timer);
  }, [terminalStep]);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(terminalSteps.join("\n"));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="w-full rounded-lg shadow-lg overflow-hidden bg-gray-100 text-gray-800 font-sans text-sm relative">
      <div className="p-4">
        <div className="flex justify-end items-center mb-4">
          {/* Removed traffic light buttons */}
          <button
            onClick={copyToClipboard}
            className="text-gray-500 hover:text-gray-700 transition-colors"
            aria-label="Copy to clipboard">
            {copied ? (
              <Check className="h-5 w-5 text-blue-500" />
            ) : (
              <Copy className="h-5 w-5" />
            )}
          </button>
        </div>
        <div className="space-y-3">
          {terminalSteps.map((step, index) => (
            <div
              key={index}
              className={`flex ${
                index > terminalStep ? "opacity-0" : "opacity-100"
              } transition-opacity duration-500 ease-in-out`}>
              <div className="bg-blue-500 text-white p-3 rounded-lg rounded-bl-none shadow max-w-md">
                {step}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
