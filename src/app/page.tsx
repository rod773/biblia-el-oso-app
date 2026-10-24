"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import pages from "@/pages.json";

const supported =
  typeof window !== "undefined" && "speechSynthesis" in window;

const subscribe = () => () => {};
const unsupportedClient = () => !supported;
const unsupportedServer = () => false;

const splitText = (text: string): string[] => {
  const lines = text
    .split(/\n+/)
    .map((l) => l.trim())
    .filter(Boolean);
  const chunks: string[] = [];
  for (const line of lines) {
    if (line.length <= 300) {
      chunks.push(line);
      continue;
    }
    const parts = line.match(/[^.!?;:]+[.!?;:]*\s*/g) || [line];
    for (const p of parts) {
      const t = p.trim();
      if (t) chunks.push(t);
    }
  }
  return chunks;
};

const pageSrc = (page: number) =>
  `/pages/page-${String(page).padStart(3, "0")}.png`;

export default function Home() {
  const [i, setI] = useState(0);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [voiceName, setVoiceName] = useState("");
  const [volume, setVolume] = useState(1);
  const [auto, setAuto] = useState(true);
  const [reading, setReading] = useState(false);
  const unsupported = useSyncExternalStore(
    subscribe,
    unsupportedClient,
    unsupportedServer,
  );

  const readingRef = useRef(false);
  const sessionRef = useRef(0);
  const voiceNameRef = useRef("");
  const volumeRef = useRef(1);
  const autoRef = useRef(true);
  const scrollRaf = useRef(0);

  const maxScroll = () =>
    Math.max(0, document.documentElement.scrollHeight - window.innerHeight);

  const animateScrollTo = (target: number) => {
    const startY = window.scrollY;
    const distance = target - startY;
    if (Math.abs(distance) < 1) return;
    const startTime = performance.now();
    const duration = 700;
    cancelAnimationFrame(scrollRaf.current);
    const step = (now: number) => {
      const t = Math.min(1, (now - startTime) / duration);
      const ease = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
      window.scrollTo(0, startY + distance * ease);
      if (t < 1) scrollRaf.current = requestAnimationFrame(step);
    };
    scrollRaf.current = requestAnimationFrame(step);
  };

  useEffect(() => {
    if (!supported) return;
    const load = () => {
      const v = window.speechSynthesis.getVoices().filter((x) => /^es/i.test(x.lang));
      setVoices(v);
      setVoiceName((prev) => {
        const next =
          prev ||
          v.find((x) => /raul/i.test(x.name))?.name ||
          v.find((x) => /^es[-_]MX/i.test(x.lang))?.name ||
          v.find((x) => /sebastian/i.test(x.name))?.name ||
          v.find((x) => /^es[-_]ES/i.test(x.lang))?.name ||
          v.find((x) => /^es/i.test(x.lang))?.name ||
          v[0]?.name ||
          "";
        voiceNameRef.current = next;
        return next;
      });
    };
    load();
    window.speechSynthesis.onvoiceschanged = load;
    return () => {
      window.speechSynthesis.onvoiceschanged = null;
    };
  }, []);

  const pickVoice = () => {
    const vs = window.speechSynthesis.getVoices();
    return (
      vs.find((v) => v.name === voiceNameRef.current) ||
      vs.find((v) => /raul/i.test(v.name)) ||
      vs.find((v) => /^es[-_]MX/i.test(v.lang)) ||
      vs.find((v) => /^es/i.test(v.lang) && /sebastian/i.test(v.name)) ||
      vs.find((v) => /^es[-_]ES/i.test(v.lang)) ||
      vs.find((v) => /^es/i.test(v.lang)) ||
      null
    );
  };

  const stopReading = () => {
    readingRef.current = false;
    setReading(false);
    sessionRef.current++;
    cancelAnimationFrame(scrollRaf.current);
    if (supported) window.speechSynthesis.cancel();
  };

  const readPage = (pageIdx: number, session: number) => {
    const chunks = splitText(pages[pageIdx].text);
    const estimates = chunks.map((t) => Math.max(6000, t.length * 150));
    const totalEst = estimates.reduce((a, b) => a + b, 0) || 1;
    let ci = 0;
    let elapsed = 0;
    const next = () => {
      if (session !== sessionRef.current || !readingRef.current) return;
      if (ci >= chunks.length) {
        animateScrollTo(maxScroll());
        if (autoRef.current && pageIdx + 1 < pages.length) {
          setI(pageIdx + 1);
          speakPage(pageIdx + 1);
        } else {
          stopReading();
        }
        return;
      }
      const text = chunks[ci];
      animateScrollTo((elapsed / totalEst) * maxScroll());
      const u = new SpeechSynthesisUtterance(text);
      const voice = pickVoice();
      if (voice) {
        u.voice = voice;
        u.lang = voice.lang || "es-ES";
      } else {
        u.lang = "es-ES";
      }
      u.volume = volumeRef.current;

      let done = false;
      let timer = 0;
      const finish = () => {
        if (done) return;
        done = true;
        window.clearTimeout(timer);
        elapsed += estimates[ci] || 0;
        ci++;
        next();
      };
      u.onend = finish;
      u.onerror = (e) => {
        if (session !== sessionRef.current) return;
        if (e.error === "canceled" || e.error === "interrupted") return;
        finish();
      };
      window.speechSynthesis.speak(u);
      timer = window.setTimeout(() => {
        if (!done) finish();
      }, Math.max(6000, text.length * 150));
    };
    next();
  };

  const speakPage = (idx: number) => {
    if (!supported) return;
    if (idx >= pages.length) {
      stopReading();
      return;
    }
    const session = ++sessionRef.current;
    readingRef.current = true;
    setReading(true);
    setI(idx);
    window.speechSynthesis.cancel();
    animateScrollTo(0);
    readPage(idx, session);
  };

  const goto = (idx: number) => {
    if (idx < 0 || idx >= pages.length) return;
    if (readingRef.current) {
      speakPage(idx);
    } else {
      setI(idx);
    }
  };

  const page = pages[i];

  return (
    <main className="flex min-h-screen flex-col items-center gap-4 p-4">
      <h1 className="text-2xl font-bold">Biblia el oso</h1>
      <p className="text-sm opacity-70">Biblia (1654 páginas)</p>
      {unsupported && (
        <p className="text-sm text-red-600">
          Tu navegador no soporta la API de síntesis de voz (speechSynthesis).
        </p>
      )}
      <div className="flex gap-2 items-center flex-wrap justify-center">
        <button disabled={i === 0} onClick={() => goto(i - 1)} className="px-3 py-1 border rounded">
          Anterior
        </button>
        <select
          value={i}
          onChange={(e) => goto(Number(e.target.value))}
          className="border rounded px-2 py-1 text-sm"
          aria-label="Seleccionar página"
        >
          {pages.map((p, idx) => (
            <option key={p.page} value={idx}>
              Página {p.page} / {pages.length}
            </option>
          ))}
        </select>
        <button disabled={i === pages.length - 1} onClick={() => goto(i + 1)} className="px-3 py-1 border rounded">
          Siguiente
        </button>
        <select
          value={voiceName}
          onChange={(e) => {
            setVoiceName(e.target.value);
            voiceNameRef.current = e.target.value;
            if (readingRef.current) speakPage(i);
          }}
          className="border rounded px-2 py-1 text-sm"
        >
          {voices.map((v) => (
            <option key={v.name} value={v.name}>
              {v.name} ({v.lang})
            </option>
          ))}
        </select>
        <input
          type="range"
          min={0}
          max={1}
          step={0.1}
          value={volume}
          onChange={(e) => {
            setVolume(Number(e.target.value));
            volumeRef.current = Number(e.target.value);
          }}
          className="w-24"
        />
        <label className="flex items-center gap-1 text-sm">
          <input
            type="checkbox"
            checked={auto}
            onChange={(e) => {
              setAuto(e.target.checked);
              autoRef.current = e.target.checked;
            }}
          />
          Auto-avance
        </label>
        <button onClick={() => speakPage(i)} className="px-3 py-1 border rounded">
          Leer
        </button>
        <button onClick={stopReading} className="px-3 py-1 border rounded">
          Detener
        </button>
        {reading && <span className="text-sm text-green-600">Leyendo…</span>}
      </div>
      {/* eslint-disable-next-line @next/next/no-img-element -- páginas escaneadas del PDF */}
      <img
        src={pageSrc(page.page)}
        alt={`Página ${page.page}`}
        className="max-w-full border"
      />
    </main>
  );
}
