"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
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

type PageEntry = {
  page: number;
  book: string | null;
  chapter: number | null;
  text: string;
};

const allPages = pages as PageEntry[];

const findNextChapter = (currentBook: string, currentChapter: number) => {
  let inCurrent = false;
  for (const p of allPages) {
    if (!p.book || !p.chapter) continue;
    const isCurrent = p.book === currentBook && p.chapter === currentChapter;
    if (!inCurrent) {
      if (isCurrent) inCurrent = true;
      continue;
    }
    if (!isCurrent) return { book: p.book, chapter: p.chapter };
  }
  return null;
};

const findPrevChapter = (currentBook: string, currentChapter: number) => {
  let prev: { book: string; chapter: number } | null = null;
  for (const p of allPages) {
    if (!p.book || !p.chapter) continue;
    if (p.book === currentBook && p.chapter === currentChapter) return prev;
    prev = { book: p.book, chapter: p.chapter };
  }
  return null;
};

const findPageIndexByBookChapter = (targetBook: string, targetChapter: number) => {
  return allPages.findIndex((p) => p.book === targetBook && p.chapter === targetChapter);
};

const ANTIGUO_TESTAMENTO = [
  "Génesis","Éxodo","Levítico","Números","Deuteronomio","Josué","Jueces","Rut",
  "I Samuel","II Samuel","I Reyes","II Reyes","I Crónicas","II Crónicas","Esdras",
  "Nehemías","Ester","Job","Salmos","Proverbios","Eclesiastés","Cantares","Isaías",
  "Jeremías","Lamentaciones","Ezequiel","Daniel","Oseias","Joel","Amós","Abdías",
  "Jonás","Miqueias","Nahúm","Habacuc","Sofonías","Hageo","Zacarías","Malaquías",
];
const NUEVO_TESTAMENTO = [
  "Mateo","Marcos","Lucas","Juan","Hechos","Romanos","I Corintios","II Corintios",
  "Gálatas","Efesios","Filipenses","Colosenses","I Tesalonicenses","II Tesalonicenses",
  "I Timoteo","II Timoteo","Tito","Filemón","Hebreos","Santiago","I Pedro","II Pedro",
  "I Juan","II Juan","III Juan","Judas","Apocalipsis",
];

export default function Home() {
  const [testament, setTestament] = useState<"antiguo" | "nuevo" | "todos">("todos");
  const bookList = useMemo(() => {
    const seen = new Set<string>();
    const list: string[] = [];
    for (const p of allPages) {
      if (p.book && !seen.has(p.book)) {
        let include = true;
        if (testament === "antiguo") include = ANTIGUO_TESTAMENTO.includes(p.book);
        else if (testament === "nuevo") include = NUEVO_TESTAMENTO.includes(p.book);
        if (include) {
          seen.add(p.book);
          list.push(p.book);
        }
      }
    }
    return list;
  }, [testament]);
  const [book, setBook] = useState<string | null>(null);
  const [chapter, setChapter] = useState<number | null>(null);
  const [localIdx, setLocalIdx] = useState(0);
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

  const chapterList = useMemo(() => {
    if (!book) return [];
    const chs = new Set<number>();
    for (const p of allPages) {
      if (p.book === book && p.chapter != null) chs.add(p.chapter);
    }
    return Array.from(chs).sort((a, b) => a - b);
  }, [book]);

  const chapterPages = useMemo(() => {
    if (!book || chapter == null) return [];
    return allPages.filter((p) => p.book === book && p.chapter === chapter);
  }, [book, chapter]);

  const introPages = useMemo(() => allPages.filter((p) => p.book == null), []);

  const isIntro = book === null || book === "Introducción";
  const effectivePages = useMemo(() => (isIntro ? introPages : chapterPages), [isIntro, introPages, chapterPages]);

  const handleNext = () => {
    if (!book || chapter == null) return;
    if (localIdx < effectivePages.length - 1) {
      gotoLocal(localIdx + 1);
    } else {
      const next = findNextChapter(book, chapter);
      if (next) {
        const idx = findPageIndexByBookChapter(next.book, next.chapter);
        if (idx >= 0) {
          setBook(next.book);
          setChapter(next.chapter);
          setLocalIdx(0);
        }
      }
    }
  };

  const handlePrev = () => {
    if (!book || chapter == null) return;
    if (localIdx > 0) {
      gotoLocal(localIdx - 1);
    } else {
      const prev = findPrevChapter(book, chapter);
      if (prev) {
        const prevPages = allPages.filter((p) => p.book === prev.book && p.chapter === prev.chapter);
        setBook(prev.book);
        setChapter(prev.chapter);
        setLocalIdx(prevPages.length - 1);
      }
    }
  };

  const hasNextChapter = useMemo(() => {
    if (!book || chapter == null) return false;
    return findNextChapter(book, chapter) != null;
  }, [book, chapter]);

  const hasPrevChapter = useMemo(() => {
    if (!book || chapter == null) return false;
    return findPrevChapter(book, chapter) != null;
  }, [book, chapter]);

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

  const startReading = (pages: PageEntry[], pageIdx: number, currentBook: string | null, currentChapter: number | null) => {
    const p = pages[pageIdx];
    if (!p) return;
    const session = ++sessionRef.current;
    readingRef.current = true;
    setReading(true);
    setLocalIdx(pageIdx);
    if (currentBook) setBook(currentBook);
    if (currentChapter != null) setChapter(currentChapter);
    window.speechSynthesis.cancel();
    animateScrollTo(0);
    readChapter(pages, pageIdx, session, currentBook, currentChapter);
  };

  const readChapter = (pages: PageEntry[], pageIdx: number, session: number, currentBook: string | null, currentChapter: number | null) => {
    const p = pages[pageIdx];
    if (!p) return;
    const chunks = splitText(p.text);
    const estimates = chunks.map((t) => Math.max(6000, t.length * 150));
    const totalEst = estimates.reduce((a, b) => a + b, 0) || 1;
    let ci = 0;
    let elapsed = 0;
    const next = () => {
      if (session !== sessionRef.current || !readingRef.current) return;
      if (ci >= chunks.length) {
        animateScrollTo(maxScroll());
        if (autoRef.current) {
          if (pageIdx + 1 < pages.length) {
            startReading(pages, pageIdx + 1, currentBook, currentChapter);
          } else if (currentBook && currentChapter != null) {
            const nextChap = findNextChapter(currentBook, currentChapter);
            if (nextChap) {
              const chapPages = allPages.filter(
                (x) => x.book === nextChap.book && x.chapter === nextChap.chapter,
              );
              setBook(nextChap.book);
              setChapter(nextChap.chapter);
              setLocalIdx(0);
              startReading(chapPages, 0, nextChap.book, nextChap.chapter);
              return;
            }
            stopReading();
          } else {
            stopReading();
          }
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
    if (idx < 0 || idx >= effectivePages.length) {
      stopReading();
      return;
    }
    const p = effectivePages[idx];
    startReading(effectivePages, idx, p.book, p.chapter);
  };

  const gotoLocal = (idx: number) => {
    if (idx < 0 || idx >= effectivePages.length) return;
    if (readingRef.current) {
      speakPage(idx);
    } else {
      setLocalIdx(idx);
    }
  };

  const handleBookChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const b = e.target.value;
    setBook(b || null);
    setChapter(null);
    setLocalIdx(0);
  };

  const handleChapterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setChapter(Number(e.target.value));
    setLocalIdx(0);
  };

  const p = effectivePages[localIdx] ?? allPages.find((x) => x.page === 1);

  return (
    <main className="flex min-h-screen flex-col items-center gap-2 p-2">
      <h1 className="text-2xl font-bold">Biblia el oso</h1>
      <p className="text-sm opacity-70" suppressHydrationWarning>
        {book && book !== "Introducción" && chapter != null
          ? `${book} — Capítulo ${chapter}`
          : book === "Introducción"
            ? "Introducción"
            : "Selecciona un libro y capítulo"}
      </p>
      {unsupported && (
        <p className="text-sm text-red-600">
          Tu navegador no soporta la API de síntesis de voz (speechSynthesis).
        </p>
      )}
      <div className="flex gap-2 items-center flex-wrap justify-center">
        <select
          value={testament}
          onChange={(e) => setTestament(e.target.value as "antiguo" | "nuevo" | "todos")}
          className="border rounded px-3 py-2 text-base"
          aria-label="Seleccionar testamento"
        >
          <option value="todos">Todos</option>
          <option value="antiguo">Antiguo Testamento</option>
          <option value="nuevo">Nuevo Testamento</option>
        </select>
        <select
          value={book ?? ""}
          onChange={handleBookChange}
          className="border rounded px-3 py-2 text-base"
          aria-label="Seleccionar libro"
        >
          <option value="">Libro</option>
          <option value="Introducción">Introducción</option>
          {bookList.map((b) => (
            <option key={b} value={b}>
              {b}
            </option>
          ))}
        </select>
        {book && book !== "Introducción" ? (
          <>
            <select
              value={chapter != null ? chapter : ""}
              onChange={handleChapterChange}
              className="border rounded px-3 py-2 text-base"
              aria-label="Seleccionar capítulo"
              disabled={chapterList.length === 0}
            >
              <option value="">Capítulo</option>
              {chapterList.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <button
              disabled={localIdx === 0 && !hasPrevChapter}
              onClick={handlePrev}
              className="px-4 py-2 border rounded text-base"
            >
              Anterior
            </button>
            <select
              value={localIdx}
              onChange={(e) => gotoLocal(Number(e.target.value))}
              className="border rounded px-3 py-2 text-base"
              aria-label="Seleccionar página"
              disabled={effectivePages.length === 0}
            >
              {effectivePages.map((cp, idx) => (
                <option key={cp.page} value={idx}>
                  Página {cp.page}
                </option>
              ))}
            </select>
            <button
              disabled={localIdx === effectivePages.length - 1 && !hasNextChapter}
              onClick={handleNext}
              className="px-4 py-2 border rounded text-base"
            >
              Siguiente
            </button>
            <span className="text-xs opacity-60">
              {localIdx + 1} / {effectivePages.length}
            </span>
          </>
        ) : null}
        <select
          value={voiceName}
          onChange={(e) => {
            setVoiceName(e.target.value);
            voiceNameRef.current = e.target.value;
            if (readingRef.current) speakPage(localIdx);
          }}
          className="border rounded px-3 py-2 text-base"
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
        <button
          disabled={!p}
          onClick={() => p && speakPage(localIdx)}
          className="px-4 py-2 border rounded text-base"
        >
          Leer
        </button>
        <button onClick={stopReading} className="px-4 py-2 border rounded text-base">
          Detener
        </button>
        <a
          href="https://drive.google.com/file/d/1U3YfnsAf2DhEw8mFQNlLl2vFdylSN127/view?usp=sharing"
          target="_blank"
          rel="noopener noreferrer"
          className="px-4 py-2 border rounded text-base"
        >
          Descargar PDF
        </a>
        {reading && <span className="text-sm text-green-600">Leyendo…</span>}
      </div>
      {p && (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element -- páginas escaneadas del PDF */}
          <img
            src={pageSrc(p.page)}
            alt={`Página ${p.page}`}
            className="w-full max-w-[96vw] object-contain border"
          />
        </>
      )}
    </main>
  );
}
