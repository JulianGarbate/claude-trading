"use client";

import { useState } from "react";
import { MODEL_OPTIONS, type ModelOption } from "@/lib/llm-models";

const PROVIDER_LABEL: Record<ModelOption["provider"], string> = {
  gemini: "Gemini",
  groq: "Groq",
  openrouter: "OpenRouter",
};

interface Props {
  selected: string[];
  onChange: (ids: string[]) => void;
}

export function ModelPicker({ selected, onChange }: Props) {
  const [open, setOpen] = useState(false);

  function toggle(id: string) {
    if (selected.includes(id)) {
      if (selected.length === 1) return; // al menos uno seleccionado siempre
      onChange(selected.filter((s) => s !== id));
    } else {
      onChange([...selected, id]);
    }
  }

  const groups = (["gemini", "groq", "openrouter"] as const).map((provider) => ({
    provider,
    models: MODEL_OPTIONS.filter((m) => m.provider === provider),
  }));

  return (
    <div className="space-y-2">
      <button
        onClick={() => setOpen((v) => !v)}
        className="text-[11px] text-on-surface-variant hover:text-primary flex items-center gap-1 transition-colors duration-150"
      >
        <span className="material-symbols-outlined text-[14px]">{open ? "expand_less" : "tune"}</span>
        Modelos de IA ({selected.length} seleccionados)
      </button>

      {open && (
        <div className="animate-fade-in-up bg-surface-low border border-outline-variant rounded-lg p-3 space-y-3">
          {groups.map(({ provider, models }) => (
            <div key={provider}>
              <p className="text-[10px] text-on-surface-variant uppercase tracking-wider mb-1.5">
                {PROVIDER_LABEL[provider]}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {models.map((m) => {
                  const isSelected = selected.includes(m.id);
                  return (
                    <button
                      key={m.id}
                      onClick={() => toggle(m.id)}
                      className={`px-2.5 py-1 rounded-full text-[11px] border motion-safe:active:scale-95 transition-[transform,background-color,color,border-color] duration-150 ease-snappy flex items-center gap-1 ${
                        isSelected
                          ? "bg-primary/15 border-primary text-primary"
                          : "bg-surface-container border-outline-variant text-on-surface-variant hover:border-primary/50"
                      }`}
                    >
                      <span className="material-symbols-outlined text-[13px]">
                        {isSelected ? "check_circle" : "radio_button_unchecked"}
                      </span>
                      {m.label}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
          <p className="text-[10px] text-on-surface-variant/70 pt-1 border-t border-outline-variant">
            Más modelos = más diversidad de opiniones, pero cada uno gasta cuota gratuita propia.
          </p>
        </div>
      )}
    </div>
  );
}
