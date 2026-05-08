import React, { useState, useEffect, useMemo } from "react";
import { Plus, Trash2, Download, Upload, X, Users, BookOpen, AlertCircle, CheckCircle2, Circle, ChevronDown, RotateCcw, Menu, Pencil, Undo2, HelpCircle } from "lucide-react";
import { DndContext, DragOverlay, closestCorners, pointerWithin, MouseSensor, TouchSensor, useSensor, useSensors, useDraggable, useDroppable, MeasuringStrategy } from "@dnd-kit/core";
import { SortableContext, useSortable, rectSortingStrategy, verticalListSortingStrategy, arrayMove } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

// ID-generator: garanterer unikke id'er selv ved hurtige successive kald
// (Date.now() alene kollidere når to opretter sker i samme millisekund).
let _idCounter = 0;
function nytId() {
  return Date.now() * 1000 + (++_idCounter % 1000);
}

const STANDARD_FAG = [
  "Dansk", "Matematik", "Engelsk", "Tysk", "Fransk",
  "Historie", "Samfundsfag", "Kristendom", "Idræt",
  "Musik", "Billedkunst", "Håndværk og design", "Madkundskab",
  "Natur/teknologi", "Biologi", "Geografi", "Fysik/kemi",
  "Klassens tid", "Understøttende undervisning",
];

// Fagrække-skabeloner pr. klassetrin baseret på UVM's "Timetal for fagene i
// folkeskolen — skoleåret 2025/2026". Kun obligatoriske fag med klare
// timetal — tysk/fransk, valgfag og kristendom 7./8. (konfirmation-twisten)
// er bevidst udeladt, da de varierer fra skole til skole. Brugeren kan
// tilføje dem selv. Tallene er ugentlige lektioner (UVM-årligt-timetal / 30).
const FAGRAEKKE_TEMPLATES = {
  1: [
    { navn: "Dansk", lektioner: 11 },
    { navn: "Matematik", lektioner: 5 },
    { navn: "Idræt", lektioner: 2 },
    { navn: "Kristendom", lektioner: 2 },
    { navn: "Musik", lektioner: 2 },
    { navn: "Natur/teknologi", lektioner: 1 },
  ],
  2: [
    { navn: "Dansk", lektioner: 11 },
    { navn: "Matematik", lektioner: 5 },
    { navn: "Engelsk", lektioner: 1 },
    { navn: "Idræt", lektioner: 2 },
    { navn: "Kristendom", lektioner: 1 },
    { navn: "Musik", lektioner: 2 },
    { navn: "Billedkunst", lektioner: 2 },
    { navn: "Natur/teknologi", lektioner: 1 },
  ],
  3: [
    { navn: "Dansk", lektioner: 8 },
    { navn: "Matematik", lektioner: 5 },
    { navn: "Engelsk", lektioner: 2 },
    { navn: "Historie", lektioner: 1 },
    { navn: "Idræt", lektioner: 2 },
    { navn: "Kristendom", lektioner: 1 },
    { navn: "Musik", lektioner: 2 },
    { navn: "Billedkunst", lektioner: 2 },
    { navn: "Håndværk og design", lektioner: 2 },
    { navn: "Natur/teknologi", lektioner: 2 },
  ],
  4: [
    { navn: "Dansk", lektioner: 7 },
    { navn: "Matematik", lektioner: 5 },
    { navn: "Engelsk", lektioner: 2 },
    { navn: "Historie", lektioner: 2 },
    { navn: "Idræt", lektioner: 2 },
    { navn: "Kristendom", lektioner: 1 },
    { navn: "Musik", lektioner: 2 },
    { navn: "Billedkunst", lektioner: 2 },
    { navn: "Håndværk og design", lektioner: 2 },
    { navn: "Natur/teknologi", lektioner: 3 },
  ],
  5: [
    { navn: "Dansk", lektioner: 7 },
    { navn: "Matematik", lektioner: 5 },
    { navn: "Engelsk", lektioner: 4 },
    { navn: "Historie", lektioner: 2 },
    { navn: "Idræt", lektioner: 2 },
    { navn: "Kristendom", lektioner: 1 },
    { navn: "Musik", lektioner: 2 },
    { navn: "Billedkunst", lektioner: 1 },
    { navn: "Håndværk og design", lektioner: 2 },
    { navn: "Madkundskab", lektioner: 2 },
    { navn: "Natur/teknologi", lektioner: 2 },
  ],
  6: [
    { navn: "Dansk", lektioner: 7 },
    { navn: "Matematik", lektioner: 5 },
    { navn: "Engelsk", lektioner: 3 },
    { navn: "Historie", lektioner: 2 },
    { navn: "Idræt", lektioner: 2 },
    { navn: "Kristendom", lektioner: 2 },
    { navn: "Musik", lektioner: 1 },
    { navn: "Billedkunst", lektioner: 1 },
    { navn: "Håndværk og design", lektioner: 2 },
    { navn: "Madkundskab", lektioner: 2 },
    { navn: "Natur/teknologi", lektioner: 2 },
  ],
  7: [
    { navn: "Dansk", lektioner: 7 },
    { navn: "Matematik", lektioner: 5 },
    { navn: "Engelsk", lektioner: 3 },
    { navn: "Historie", lektioner: 2 },
    { navn: "Idræt", lektioner: 2 },
    { navn: "Geografi", lektioner: 2 },
    { navn: "Biologi", lektioner: 2 },
    { navn: "Fysik/kemi", lektioner: 2 },
  ],
  8: [
    { navn: "Dansk", lektioner: 7 },
    { navn: "Matematik", lektioner: 5 },
    { navn: "Engelsk", lektioner: 3 },
    { navn: "Historie", lektioner: 2 },
    { navn: "Samfundsfag", lektioner: 2 },
    { navn: "Idræt", lektioner: 2 },
    { navn: "Geografi", lektioner: 1 },
    { navn: "Biologi", lektioner: 1 },
    { navn: "Fysik/kemi", lektioner: 2 },
  ],
  9: [
    { navn: "Dansk", lektioner: 7 },
    { navn: "Matematik", lektioner: 5 },
    { navn: "Engelsk", lektioner: 3 },
    { navn: "Historie", lektioner: 2 },
    { navn: "Samfundsfag", lektioner: 2 },
    { navn: "Idræt", lektioner: 2 },
    { navn: "Kristendom", lektioner: 1 },
    { navn: "Geografi", lektioner: 1 },
    { navn: "Biologi", lektioner: 1 },
    { navn: "Fysik/kemi", lektioner: 3 },
  ],
};

function normalizeNavn(navn) {
  if (!navn) return "";
  return navn.trim().split(/\s+/).map(word =>
    word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
  ).join(" ");
}

// 15 dæmpede jordfarver til avatarer. Mørke nok til at hvid tekst er læselig.
// 20 dæmpede men levende farver. Designet efter reglen:
//   "2 farver i samme hue-familie er kun OK hvis lightness adskiller sig med
//    ≥20 punkter ELLER saturation er markant anderledes."
// Det betyder: hvis Daniel er mørkeblå (L=28) og Imran er sky blue (L=50),
// er de garanteret skelnelige fordi L-forskel er 22 punkter.
//
// De første 10 positioner har hver sin unikke hue-familie (rød, teal, gul,
// indigo, grøn, magenta, blå, orange, oliven, pink). Fra position 11 og frem
// gentages hue-familier, men ALTID med klar L-forskel fra den eksisterende.
const AVATAR_PALETTE = [
  // Hver position: hex, hue-familie, L (lightness 0-100)
  "#b04a44", // 1:  brick red           — rød,    L=45
  "#3a8389", // 2:  teal                — teal,   L=40
  "#c4a52a", // 3:  ochre               — gul,    L=46
  "#5247a3", // 4:  indigo              — lilla,  L=42
  "#4a7d3e", // 5:  forest green        — grøn,   L=37
  "#a3479c", // 6:  magenta             — pink,   L=46
  "#3d8aa9", // 7:  sky blue            — blå,    L=50
  "#cc6e3a", // 8:  coral orange        — orange, L=51
  "#7a8a3c", // 9:  oliven              — oliven, L=39
  "#c4789a", // 10: pink-rose light     — pink,   L=62 (vs magenta L=46, diff=16; OK fordi H også 30° fra magenta)
  "#2c3d65", // 11: navy deep           — blå,    L=28 (vs sky blue L=50, diff=22 ✓)
  "#82c0a0", // 12: mint light          — grøn,   L=63 (vs forest green L=37, diff=26 ✓)
  "#9a76c4", // 13: violet light        — lilla,  L=62 (vs indigo L=42, diff=20 ✓)
  "#6e2530", // 14: burgundy deep       — rød,    L=29 (vs brick red L=45, diff=16; OK fordi H 12° fra brick red og S forskellig)
  "#3a8a5e", // 15: emerald             — teal,   L=38 (vs teal H differ med 4°, men S markant højere)
  "#807034", // 16: mustard dark        — gul,    L=35 (vs ochre L=46, diff=11; OK fordi S forskellig — ochre er meget mere mættet)
  "#82c4cc", // 17: cyan light          — teal,   L=65 (vs teal L=40, diff=25 ✓)
  "#a07a5c", // 18: warm tan            — orange, L=49 (vs coral orange S markant lavere — tan er dæmpet, coral er bright)
  "#424242", // 19: charcoal            — neutral, L=26
  "#b8b0a8", // 20: warm light gray     — neutral, L=69 (vs charcoal L=26, diff=43 ✓)
];

// Forkortelser til fag-tags i lærersidebaren — max 3 tegn (fx Mat, Idr, F/K).
// Falder tilbage til de første 3 bogstaver af fagnavnet hvis ikke i tabellen.
const FAG_FORKORTELSER = {
  "matematik": "Mat",
  "dansk": "Dan",
  "engelsk": "Eng",
  "tysk": "Tys",
  "fransk": "Fra",
  "spansk": "Spa",
  "idræt": "Idr",
  "idret": "Idr",
  "historie": "His",
  "geografi": "Geo",
  "biologi": "Bio",
  "fysik": "Fys",
  "kemi": "Kem",
  "fysik/kemi": "Fys/Kem",
  "f/k": "Fys/Kem",
  "natur/teknologi": "Nat/Tek",
  "natur og teknologi": "Nat/Tek",
  "n/t": "Nat/Tek",
  "samfundsfag": "Sam",
  "religion": "Rel",
  "kristendom": "Kri",
  "kristendomskundskab": "Kri",
  "musik": "Mus",
  "billedkunst": "BK",
  "håndværk og design": "HDS",
  "håndværk/design": "HDS",
  "håndværk": "Hå",
  "sløjd": "Slø",
  "håndarbejde": "Hå",
  "madkundskab": "Mad",
  "klassens tid": "KT",
  "klassen": "Kl",
  "understøttende undervisning": "USU",
  "valgfag": "Val",
};

function fagForkortelse(navn) {
  if (!navn) return "";
  const key = navn.trim().toLowerCase();
  if (FAG_FORKORTELSER[key]) return FAG_FORKORTELSER[key];
  // Fallback: første 3 tegn, første bogstav stort
  const trimmed = navn.trim();
  if (trimmed.length <= 3) return trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase();
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1, 3).toLowerCase();
}

// Display-navn til fag-kort header: korte navne ("Dansk", "Matematik") vises
// uændret, men lange navne ("Håndværk og design", "Natur og teknologi")
// vises som forkortelse ("HDS", "Nat/Tek") så header ikke presser status-
// ikon og chevron ud. Det fulde navn bevares i data og vises i edit-mode.
function fagDisplayNavn(navn) {
  if (!navn) return "";
  const trimmed = navn.trim();
  if (trimmed.length <= 12) return trimmed;
  const forkort = FAG_FORKORTELSER[trimmed.toLowerCase()];
  return forkort || trimmed;
}

// Module-level maps fra normaliseret navn → farve. Bygges via useMemo i
// Fagfordeling-komponenten, så de kun rebygges når input ændrer sig.
// Position-baseret tildeling sikrer ingen hash-kollisioner mellem synlige.
// Fallback (hash) bruges kun for navne der endnu ikke er i listen.
let LAERER_FARVE_MAP = new Map();
let KLASSE_FARVE_MAP = new Map();

function hashFarve(norm) {
  let hash = 0;
  for (let i = 0; i < norm.length; i++) {
    hash = ((hash * 31) + norm.charCodeAt(i)) >>> 0;
  }
  return AVATAR_PALETTE[hash % AVATAR_PALETTE.length];
}

function farveForNavn(navn) {
  if (!navn || !navn.trim()) return "#cdc5b8"; // tom-tilstand
  const norm = navn.trim().toLowerCase();
  if (LAERER_FARVE_MAP.has(norm)) return LAERER_FARVE_MAP.get(norm);
  return hashFarve(norm);
}

function farveForKlasse(klasse) {
  if (!klasse || !klasse.trim()) return "#cdc5b8";
  const norm = klasse.trim().toLowerCase();
  if (KLASSE_FARVE_MAP.has(norm)) return KLASSE_FARVE_MAP.get(norm);
  return hashFarve(norm);
}

function buildLaererFarveMap(oversigt) {
  const map = new Map();
  oversigt.forEach((l, i) => {
    if (l.navn) {
      map.set(l.navn.trim().toLowerCase(), AVATAR_PALETTE[i % AVATAR_PALETTE.length]);
    }
  });
  return map;
}

function buildKlasseFarveMap(klasseNavne) {
  const map = new Map();
  klasseNavne.forEach((navn, i) => {
    if (navn) {
      map.set(navn.trim().toLowerCase(), AVATAR_PALETTE[i % AVATAR_PALETTE.length]);
    }
  });
  return map;
}

function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState(() =>
    typeof window !== "undefined" && window.matchMedia("(max-width: 768px)").matches
  );
  React.useEffect(() => {
    const mq = window.matchMedia("(max-width: 768px)");
    const handler = (e) => setIsMobile(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);
  return isMobile;
}

function findSuggestion(value, options) {
  if (!value) return null;
  const lower = value.toLowerCase();
  return options.find(o =>
    o && o.toLowerCase().startsWith(lower) && o.toLowerCase() !== lower
  );
}

function GhostInput({ value, onChange, suggestions = [], style, wrapperStyle, className, onKeyDown, onFocus, onBlur, onAccept, inputRef: externalRef, ...rest }) {
  const innerRef = React.useRef(null);
  const inputRef = externalRef || innerRef;
  const [focused, setFocused] = React.useState(false);
  const suggestion = findSuggestion(value, suggestions);
  const showChip = focused && !!suggestion;

  const accept = () => {
    if (suggestion) {
      onChange(suggestion);
      if (onAccept) {
        onAccept();
      } else {
        inputRef.current?.focus();
      }
    }
  };

  const handleKeyDown = (e) => {
    if (suggestion && (e.key === "Tab" || e.key === "Enter")) {
      e.preventDefault();
      accept();
      return;
    }
    onKeyDown?.(e);
  };

  return (
    <div style={{ position: "relative", display: "block", ...wrapperStyle }}>
      <input
        {...rest}
        ref={inputRef}
        className={className}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        onFocus={(e) => { setFocused(true); onFocus?.(e); }}
        onBlur={(e) => {
          setTimeout(() => setFocused(false), 150);
          onBlur?.(e);
        }}
        style={{ ...style, background: "transparent", position: "relative" }}
      />
      {showChip && (
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={accept}
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            left: 0,
            background: "#1a1a1a",
            color: "#f5f1ea",
            border: "none",
            padding: "6px 12px",
            fontSize: "12px",
            fontFamily: "'Inter', system-ui, sans-serif",
            fontWeight: 500,
            letterSpacing: "0.01em",
            cursor: "pointer",
            zIndex: 20,
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            whiteSpace: "nowrap",
            boxShadow: "0 2px 6px rgba(26,26,26,0.12)",
          }}
        >
          {suggestion}
        </button>
      )}
    </div>
  );
}

export default function Fagfordeling() {
  // MULTI-CLASS: Source of truth er `klasser` + `aktivKlasseId`. `klasseNavn` og
  // `fag` er afledte views af den aktive klasse, og `setKlasseNavn` / `setFag`
  // er wrappere der opdaterer den aktive klasse inde i `klasser`-arrayet. På
  // den måde virker al eksisterende kode der kalder setFag / setKlasseNavn
  // uden ændringer.
  const [klasser, setKlasser] = useState([]);
  const [aktivKlasseId, setAktivKlasseId] = useState(null);
  const [loaded, setLoaded] = useState(false);

  const aktivKlasse = klasser.find(k => k.id === aktivKlasseId) || klasser[0] || null;
  const klasseNavn = aktivKlasse?.navn ?? "Min klasse";
  const fag = aktivKlasse?.fag ?? [];

  const setKlasseNavn = (nytNavn) => {
    setKlasser(prev => prev.map(k =>
      k.id === aktivKlasseId
        ? { ...k, navn: typeof nytNavn === "function" ? nytNavn(k.navn) : nytNavn }
        : k
    ));
  };

  const setFag = (nytFag) => {
    setKlasser(prev => prev.map(k =>
      k.id === aktivKlasseId
        ? { ...k, fag: typeof nytFag === "function" ? nytFag(k.fag) : nytFag }
        : k
    ));
  };

  // Empty-state-flow: når brugeren har valgt klassetrin men endnu ikke
  // valgt typisk antal lærere, viser vi spørgsmålet i stedet for klassetrin-grid.
  const [valgtKlassetrin, setValgtKlassetrin] = useState(null);
  const [showImport, setShowImport] = useState(false);
  // MULTI-CLASS: Hamburger-menu state
  const [menuAaben, setMenuAaben] = useState(false);
  const [omdoeberKlasseId, setOmdoeberKlasseId] = useState(null);
  const [omdoebNavn, setOmdoebNavn] = useState("");
  // EXPORT-MENU: dropdown med valg mellem JSON-fil og PDF (browser-print)
  const [eksportMenuAaben, setEksportMenuAaben] = useState(false);

  // MULTI-LAERER: en liste af lærere, hver med navn, mål-lektioner og fag-liste.
  // Den aktive lærer vises i lærer-visning og er det `mig` peger på (alias for
  // backwards compat — al eksisterende kode der kalder mig.x / setMig() virker
  // uændret mod den aktive lærer).
  // visning: "klasse" = klasse-view, "laerer" = aktiv-lærer-view.
  const [laerere, setLaerere] = useState([]);
  const [aktivLaererId, setAktivLaererId] = useState(null);
  const [visning, setVisning] = useState("klasse");
  const [laererMaalInput, setLaererMaalInput] = useState("");

  // MULTI-LAERER: aktiv-lærer derivation + mig/setMig alias (backwards compat
  // for al kode skrevet før multi-lærer). Hvis ingen lærere findes, peger mig
  // på et tomt placeholder-objekt så .navn / .fag-reads ikke crasher.
  const aktivLaerer = laerere.find(l => l.id === aktivLaererId) || laerere[0] || null;
  const mig = aktivLaerer || { navn: "", maalLektioner: null, fag: [] };
  const setMig = (updater) => {
    if (!aktivLaerer) return;
    setLaerere(prev => prev.map(l =>
      l.id === aktivLaerer.id
        ? (typeof updater === "function" ? updater(l) : updater)
        : l
    ));
  };
  // Inline-edit af navn og mål i headeren
  const [redigerMigNavn, setRedigerMigNavn] = useState(false);
  const [redigerMigMaal, setRedigerMigMaal] = useState(false);
  // Pending klasser i Min oversigt-sidebar — tilføjet via "+ Tilføj klasse"-flow
  // men endnu ikke knyttet til et fag. Trækkes fra sidebar til fag-kort.
  const [pendingKlasser, setPendingKlasser] = useState([]);
  const [tilfoejKlasseAaben, setTilfoejKlasseAaben] = useState(false);
  const [nyKlasseInput, setNyKlasseInput] = useState("");
  // Active drag state til DragOverlay i min-visning
  const [activeMinDrag, setActiveMinDrag] = useState(null);
  // Pending lærer-navne: tilføjet via sidebar-knappen, men endnu ikke placeret
  // på et fag. Vises i sidebaren med total=0 så de kan trækkes til fag.
  const [pendingNavne, setPendingNavne] = useState([]);
  // Kontrollerer om "Tilføj lærer"-input feltet i sidebaren er åbent.
  const [tilfoejNavnAaben, setTilfoejNavnAaben] = useState(false);
  const [nytLaererNavn, setNytLaererNavn] = useState("");
  const [importFejl, setImportFejl] = useState("");
  // MULTI-LAERER: hamburger-menu state for ny klasse / ny lærer (dashed-style
  // input-flow ligesom i sidebaren). Erstatter den gamle instant-create på
  // "+ Tilføj klasse".
  const [hamburgerNyKlasseAaben, setHamburgerNyKlasseAaben] = useState(false);
  const [hamburgerNyKlasseNavn, setHamburgerNyKlasseNavn] = useState("");
  const [hamburgerNyLaererAaben, setHamburgerNyLaererAaben] = useState(false);
  const [hamburgerNyLaererNavn, setHamburgerNyLaererNavn] = useState("");
  const [omdoeberLaererId, setOmdoeberLaererId] = useState(null);
  const [omdoebLaererNavn, setOmdoebLaererNavn] = useState("");
  // Collapse-state for hamburger-sektioner — klik på eyebrow toggler
  const [klasserKollapset, setKlasserKollapset] = useState(false);
  const [laerereKollapset, setLaerereKollapset] = useState(false);
  const [visHowTo, setVisHowTo] = useState(false);
  // Vises som toast nederst hvis localStorage.setItem fejler (typisk quota fyldt
  // eller Safari Privat tilstand). Rydder selv efter 6 sekunder.
  const [gemFejlet, setGemFejlet] = useState(false);
  // Undo: snapshot-stack af tidligere data-tilstande (klasser, aktivKlasseId,
  // mig, pendingNavne, pendingKlasser). Snapshots commiteres efter 500ms idle
  // så typing samles til ét undo-skridt. Stack-størrelse: 30.
  const historyRef = React.useRef([]);
  const previousSnapshotRef = React.useRef(null);
  const skipNextHistoryRef = React.useRef(false);
  const historyInitializedRef = React.useRef(false);
  const historyDebounceRef = React.useRef(null);
  const [canUndo, setCanUndo] = useState(false);
  const importFilRef = React.useRef(null);
  const [udfoldede, setUdfoldede] = useState(new Set());

  // Mobil-state: hvilken tab er aktiv og hvilket fag er åbnet i bottom-sheet
  const isMobile = useIsMobile();
  const [mobileTab, setMobileTab] = useState("fag"); // "fag" | "laerere"
  const [mobileSheetFagId, setMobileSheetFagId] = useState(null);

  // Hent fra storage ved opstart
  useEffect(() => {
    try {
      const raw = localStorage.getItem("fagfordeling-data");
      if (raw) {
        const data = JSON.parse(raw);
        // MULTI-CLASS: Migration fra gammel shape `{ klasseNavn, fag }` til ny
        // `{ klasser: [...], aktivKlasseId }`. Pak gammel data ind som første klasse.
        if (Array.isArray(data.klasser) && data.klasser.length > 0) {
          const migreredeKlasser = data.klasser.map(k => ({
            ...k,
            fag: (k.fag || []).map(f => ({
              ...f,
              forventedeLaerere: f.forventedeLaerere ?? 2,
            })),
          }));
          setKlasser(migreredeKlasser);
          const aktivId = data.aktivKlasseId && migreredeKlasser.some(k => k.id === data.aktivKlasseId)
            ? data.aktivKlasseId
            : migreredeKlasser[0].id;
          setAktivKlasseId(aktivId);
        } else if (data.fag) {
          // Gammel shape — wrap som første klasse
          const id = nytId();
          const migreredeFag = (data.fag || []).map(f => ({
            ...f,
            forventedeLaerere: f.forventedeLaerere ?? 2,
          }));
          const klasseEn = { id, navn: data.klasseNavn || "Min klasse", fag: migreredeFag };
          setKlasser([klasseEn]);
          setAktivKlasseId(id);
        }
        // Hvis hverken klasser eller mig/laerere findes, lad listerne være tomme —
        // empty-state-screen vil vise klasse/lærer-valget.
        // MULTI-LAERER: load laerere + aktivLaererId. Migration: hvis kun gammel
        // `mig` findes, konvertér den til laerere[0]. Hvis intet, start med tom
        // lærer-liste — brugeren tilføjer selv via "+ Tilføj lærer".
        if (Array.isArray(data.laerere) && data.laerere.length > 0) {
          const migreredeLaerere = data.laerere.map(l => ({
            id: l.id ?? nytId(),
            navn: l.navn || "",
            maalLektioner: l.maalLektioner ?? null,
            fag: Array.isArray(l.fag) ? l.fag : [],
          }));
          setLaerere(migreredeLaerere);
          const aktivLId = data.aktivLaererId && migreredeLaerere.some(l => l.id === data.aktivLaererId)
            ? data.aktivLaererId
            : migreredeLaerere[0].id;
          setAktivLaererId(aktivLId);
        } else if (data.mig && typeof data.mig === "object") {
          // Legacy: en enkelt `mig` → første lærer i listen
          const harData = (data.mig.navn || "").trim() ||
            (Array.isArray(data.mig.fag) && data.mig.fag.length > 0) ||
            data.mig.maalLektioner != null;
          if (harData) {
            const id = nytId();
            const navn = (data.mig.navn || "").trim() || "Lærer 1";
            setLaerere([{
              id,
              navn,
              maalLektioner: data.mig.maalLektioner ?? null,
              fag: Array.isArray(data.mig.fag) ? data.mig.fag : [],
            }]);
            setAktivLaererId(id);
          }
        }
        // visning: "min" (legacy) → "laerer"
        if (data.visning === "klasse" || data.visning === "laerer") {
          setVisning(data.visning);
        } else if (data.visning === "min") {
          setVisning("laerer");
        }
      }
      // Første gang (eller korrupt data) — listerne forbliver tomme.
      // Empty-state-screen viser klasse/lærer-valget.
    } catch (e) {
      // Korrupt JSON — start tomt
    }
    setLoaded(true);
  }, []);

  // Gem automatisk når data ændrer sig
  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(
        "fagfordeling-data",
        JSON.stringify({ version: 3, klasser, aktivKlasseId, laerere, aktivLaererId, visning })
      );
      if (gemFejlet) setGemFejlet(false);
    } catch (e) {
      console.error("Kunne ikke gemme:", e);
      setGemFejlet(true);
    }
  }, [klasser, aktivKlasseId, laerere, aktivLaererId, visning, loaded]);

  // Auto-skjul gem-fejl-toast efter 6 sekunder
  useEffect(() => {
    if (!gemFejlet) return;
    const t = setTimeout(() => setGemFejlet(false), 6000);
    return () => clearTimeout(t);
  }, [gemFejlet]);

  // Auto-fald-tilbage mellem visninger ved tomme lister:
  // - lærer-view + 0 lærere → klasse-view
  // - klasse-view + 0 klasser + 1+ lærere → lærer-view
  // - 0 klasser + 0 lærere håndteres af empty-state choice-screen
  useEffect(() => {
    if (!loaded) return;
    if (visning === "laerer" && laerere.length === 0 && klasser.length > 0) {
      setVisning("klasse");
    } else if (visning === "klasse" && klasser.length === 0 && laerere.length > 0) {
      setVisning("laerer");
    }
  }, [loaded, visning, laerere.length, klasser.length]);

  // Undo: spor data-ændringer og commit tidligere snapshot efter 500ms idle
  // (så typing-bursts ikke fylder stack'en).
  useEffect(() => {
    if (!loaded) return;
    const current = { klasser, aktivKlasseId, laerere, aktivLaererId, pendingNavne, pendingKlasser };
    if (skipNextHistoryRef.current) {
      skipNextHistoryRef.current = false;
      previousSnapshotRef.current = current;
      return;
    }
    if (!historyInitializedRef.current) {
      historyInitializedRef.current = true;
      previousSnapshotRef.current = current;
      return;
    }
    if (historyDebounceRef.current) clearTimeout(historyDebounceRef.current);
    const snapToCommit = previousSnapshotRef.current;
    historyDebounceRef.current = setTimeout(() => {
      historyRef.current.push(snapToCommit);
      if (historyRef.current.length > 30) historyRef.current.shift();
      setCanUndo(true);
      previousSnapshotRef.current = current;
    }, 500);
  }, [klasser, aktivKlasseId, laerere, aktivLaererId, pendingNavne, pendingKlasser, loaded]);

  const undo = React.useCallback(() => {
    // Commit pending debounce nu, så seneste burst bliver et fortrydbart skridt
    if (historyDebounceRef.current) {
      clearTimeout(historyDebounceRef.current);
      historyDebounceRef.current = null;
      if (previousSnapshotRef.current) {
        historyRef.current.push(previousSnapshotRef.current);
        if (historyRef.current.length > 30) historyRef.current.shift();
      }
    }
    if (historyRef.current.length === 0) {
      setCanUndo(false);
      return;
    }
    const snap = historyRef.current.pop();
    skipNextHistoryRef.current = true;
    setKlasser(snap.klasser);
    setAktivKlasseId(snap.aktivKlasseId);
    setLaerere(snap.laerere);
    setAktivLaererId(snap.aktivLaererId);
    setPendingNavne(snap.pendingNavne);
    setPendingKlasser(snap.pendingKlasser);
    setCanUndo(historyRef.current.length > 0);
  }, []);

  // Keyboard: Cmd+Z (Mac) / Ctrl+Z (Windows) — fortryd. Skipper i tekst-felter
  // så browseren kan håndtere tegn-niveau undo mens man skriver.
  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && !e.shiftKey && !e.altKey && e.key === "z") {
        const tag = e.target && e.target.tagName;
        const isTypingField =
          (tag === "INPUT" && e.target.type !== "checkbox" && e.target.type !== "button") ||
          tag === "TEXTAREA" ||
          (e.target && e.target.isContentEditable);
        if (isTypingField) return;
        e.preventDefault();
        undo();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [undo]);

  const tilfoejFag = () => {
    const fagId = nytId();
    setFag([
      ...fag,
      {
        id: fagId,
        navn: "",
        lektioner: 1,
        forventedeLaerere: 2,
        laerere: [{ id: nytId(), navn: "", lektioner: 1 }],
      },
    ]);
    // Fold automatisk ud
    setUdfoldede(new Set([...udfoldede, fagId]));
  };

  // Indlæser fagrække for et givent klassetrin med valgt antal lærere som
  // default. Tomme lærer-pladser oprettes (op til antalLaerere) klar til
  // navngivning. Brugeren kan altid justere senere.
  const indlaesSkabelon = (klassetrin, antalLaerere) => {
    const skabelon = FAGRAEKKE_TEMPLATES[klassetrin];
    if (!skabelon) return;
    const antal = Math.max(1, Math.min(3, antalLaerere || 2));
    const baseId = nytId();
    const nyeFag = skabelon.map((s, i) => {
      const fagId = baseId + i * 10;
      const laerere = Array.from({ length: antal }).map((_, j) => ({
        id: fagId + 1 + j,
        navn: "",
        lektioner: s.lektioner,
      }));
      return {
        id: fagId,
        navn: s.navn,
        lektioner: s.lektioner,
        forventedeLaerere: antal,
        laerere,
      };
    });
    setKlasseNavn(`${klassetrin}. klasse`);
    setFag(nyeFag);
    setUdfoldede(new Set());
    setValgtKlassetrin(null); // Reset så empty-state er klar igen efter "Start forfra"
  };

  const toggleUdfoldet = (id) => {
    const ny = new Set(udfoldede);
    if (ny.has(id)) ny.delete(id);
    else ny.add(id);
    setUdfoldede(ny);
  };

  const opdaterFag = (id, opdateringer) => {
    setFag(fag.map((f) => {
      if (f.id !== id) return f;
      const opdateret = { ...f, ...opdateringer };
      // Hvis lektionsantallet ændres, opdater lærere der havde det gamle antal
      // (så vi bevarer "alle har samme" som default, men lader manuelle afvigelser stå)
      // Og clamp alle lærere så ingen har mere end fagets nye antal
      if (opdateringer.lektioner !== undefined && opdateringer.lektioner !== f.lektioner) {
        const nytAntal = parseInt(opdateringer.lektioner) || 0;
        const gammeltAntal = parseInt(f.lektioner) || 0;
        opdateret.laerere = f.laerere.map((l) => {
          const lekt = parseInt(l.lektioner) || 0;
          if (lekt === gammeltAntal) {
            return { ...l, lektioner: nytAntal };
          }
          // Clamp så ingen har mere end fagets nye antal
          if (lekt > nytAntal) {
            return { ...l, lektioner: nytAntal };
          }
          return l;
        });
      }
      return opdateret;
    }));
  };

  // Modal-bekræftelse for sletninger
  const [bekraeftSlet, setBekraeftSlet] = useState(null);

  const sletFagInternal = (id) => {
    setFag(fag.filter((f) => f.id !== id));
  };

  const sletFag = (id) => {
    const f = fag.find((x) => x.id === id);
    if (!f) return;
    const visningsnavn = f.navn.trim() || "fag uden navn";
    setBekraeftSlet({
      titel: "Slet fag?",
      tekst: `Slet ${visningsnavn} med alle dets lærere? Det kan ikke fortrydes.`,
      bekraeftTekst: "Slet fag",
      onConfirm: () => {
        sletFagInternal(id);
        setBekraeftSlet(null);
      },
    });
  };

  const tilfoejLaerer = (fagId) => {
    setFag(
      fag.map((f) =>
        f.id === fagId
          ? {
              ...f,
              laerere: [
                ...f.laerere,
                { id: nytId(), navn: "", lektioner: parseInt(f.lektioner) || 1 },
              ],
            }
          : f
      )
    );
  };

  const opdaterLaerer = (fagId, laererId, opdateringer) => {
    setFag(
      fag.map((f) => {
        if (f.id !== fagId) return f;
        const fagLekt = parseInt(f.lektioner) || 0;
        return {
          ...f,
          laerere: f.laerere.map((l) => {
            if (l.id !== laererId) return l;
            const opdateret = { ...l, ...opdateringer };
            // Clamp lektioner til fagets antal — ingen kan have mere end der er
            if (opdateringer.lektioner !== undefined && fagLekt > 0) {
              opdateret.lektioner = Math.min(parseInt(opdateringer.lektioner) || 0, fagLekt);
            }
            return opdateret;
          }),
        };
      })
    );
    // Hvis nyt navn matcher en pending lærer, fjern fra pendingNavne
    if (opdateringer.navn !== undefined) {
      const norm = normalizeNavn(opdateringer.navn).toLowerCase();
      if (norm) {
        setPendingNavne((prev) => prev.filter((n) => normalizeNavn(n).toLowerCase() !== norm));
      }
    }
  };

  const sletLaererInternal = (fagId, laererId) => {
    setFag(
      fag.map((f) => {
        if (f.id !== fagId) return f;
        let nyeLaerere = f.laerere.filter((l) => l.id !== laererId);
        // Hvis ingen navngivne lærere er tilbage, ryd arrayet helt — ellers
        // efterlader slot-padding "ghost"-empties som ser forvirrende ud.
        // Forventet padding genvises via virtuelle DroppableEmptySlot'er.
        const harNogenNavngiven = nyeLaerere.some((l) => l.navn?.trim());
        if (!harNogenNavngiven) nyeLaerere = [];
        // Hvis sletning bringer lærer-antal under forventedeLaerere, sænk forventede
        // så kortet skrumper naturligt (default minimum 2). Brugeren kan eksplicit
        // sætte forventede højere igen via 1/2/3-knapperne hvis de vil holde plads.
        const forventede = parseInt(f.forventedeLaerere) || 2;
        const nyForventede = Math.max(2, Math.min(forventede, nyeLaerere.length));
        return { ...f, laerere: nyeLaerere, forventedeLaerere: nyForventede };
      })
    );
  };

  const sletLaerer = (fagId, laererId) => {
    const f = fag.find((x) => x.id === fagId);
    if (!f) return;
    const l = f.laerere.find((x) => x.id === laererId);
    if (!l) return;
    const laerernavn = l.navn.trim();
    // Hvis læreren er uden navn, slet uden bekræftelse (der er intet at miste)
    if (!laerernavn) {
      sletLaererInternal(fagId, laererId);
      return;
    }
    const fagnavn = f.navn.trim() || "faget";
    setBekraeftSlet({
      titel: "Fjern lærer?",
      tekst: `Fjern ${laerernavn} fra ${fagnavn}? Det kan ikke fortrydes.`,
      bekraeftTekst: "Fjern lærer",
      onConfirm: () => {
        sletLaererInternal(fagId, laererId);
        setBekraeftSlet(null);
      },
    });
  };

  // Status pr. fag.
  // Modellen accepterer både "sharing" (lærere deler fagLekt mellem sig) og
  // "team-teaching" (alle lærere er på alle lektioner — sum = fagLekt × antal).
  // Grøn = sum er mellem fagLekt (mindst sharing) og fagLekt × antal (max team-teaching),
  // og antal-lærere ≥ forventede.
  const fagStatus = (f) => {
    const fagLekt = parseInt(f.lektioner) || 0;
    const forventedeLaerere = parseInt(f.forventedeLaerere) || 2;
    // Kun navngivne lærere tæller — placeholder-rækker (fra skabelon eller
    // manuelt tomme) regnes ikke med, så et fag uden navngivne lærere er "tom"
    // i stedet for "rød/mangler".
    const navngivne = f.laerere.filter((l) => l.navn.trim());
    const navngivneAntal = navngivne.length;
    const navngivneSum = navngivne.reduce((s, l) => s + (parseInt(l.lektioner) || 0), 0);
    const manglerLaerere = Math.max(0, forventedeLaerere - navngivneAntal);
    const krav = fagLekt;
    const maxKrav = fagLekt * Math.max(navngivneAntal, 1);

    // Tom: ingen navngivne lærere endnu — vises UDEN status-ikon (neutral)
    if (navngivneAntal === 0) {
      return { status: "tom", krav, sum: 0, manglerLaerere };
    }

    // Mangler lærere (færre navngivne end forventet)
    if (manglerLaerere > 0) {
      return { status: "gul", krav, sum: navngivneSum, manglerLaerere };
    }

    // Over-dækning
    if (navngivneSum > maxKrav) {
      return { status: "over", krav, sum: navngivneSum, manglerLaerere: 0 };
    }

    // Mangler lektioner
    if (navngivneSum < fagLekt) {
      return { status: "gul", krav, sum: navngivneSum, manglerLaerere: 0 };
    }

    // Alt OK
    return { status: "grøn", krav, sum: navngivneSum, manglerLaerere: 0 };
  };

  // Lærer-oversigt på tværs. Aggregerer fra fag + tilføjer pending navne
  // (tilføjet via sidebar-knappen men endnu ikke placeret på et fag).
  const laererOversigt = () => {
    const map = {};
    fag.forEach((f) => {
      f.laerere.forEach((l) => {
        const navn = l.navn.trim();
        if (!navn) return;
        if (!map[navn]) map[navn] = { navn, total: 0, fag: [] };
        const lekt = parseInt(l.lektioner) || 0;
        map[navn].total += lekt;
        map[navn].fag.push({
          fagNavn: f.navn || "Uden navn",
          lektioner: lekt,
        });
      });
    });
    // Pending navne — vises med total 0 og ingen fag-chips
    pendingNavne.forEach((navn) => {
      if (!map[navn]) map[navn] = { navn, total: 0, fag: [] };
    });
    return Object.values(map).sort((a, b) => b.total - a.total);
  };

  const samletLektioner = fag.reduce(
    (sum, f) => sum + (parseInt(f.lektioner) || 0),
    0
  );

  // Samlet manglende lærer-lektioner: team-teaching-model.
  // Target pr. fag = fagLekt × antal lærere (forventede eller faktisk navngivne, alt efter
  // hvad der er størst). Mangler = target − sum af navngivne lærer-lektioner.
  // Eksempel: 27 lektioner i alt, 2 forventede lærere pr. fag, ingen navngivne → 2×27 = 54 mangler.
  const samletMangler = fag.reduce((acc, f) => {
    const fagLekt = parseInt(f.lektioner) || 0;
    const forventedeLaerere = parseInt(f.forventedeLaerere) || 2;
    const navngivne = f.laerere.filter(l => l.navn.trim());
    const navngivneSum = navngivne.reduce((s, l) => s + (parseInt(l.lektioner) || 0), 0);
    const antalLaerere = Math.max(forventedeLaerere, navngivne.length);
    const target = fagLekt * antalLaerere;
    return acc + Math.max(0, target - navngivneSum);
  }, 0);

  // Samlet overdækning: hvor mange lektioner sum overskrider team-teaching-loftet
  const samletOver = fag.reduce((acc, f) => {
    const fagLekt = parseInt(f.lektioner) || 0;
    const sum = f.laerere.reduce((s, l) => s + (parseInt(l.lektioner) || 0), 0);
    const maxKrav = fagLekt * Math.max(f.laerere.length, 1);
    return acc + Math.max(0, sum - maxKrav);
  }, 0);

  // Eksport / import
  // MULTI-CLASS: JSON-eksport tager hele state-objektet med (klasser + mig), så man
  // kan dele alt på én gang.
  const eksportSomJSON = () => {
    const data = JSON.stringify({ version: 3, klasser, aktivKlasseId, laerere, aktivLaererId, visning }, null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `fagfordeling-${klasseNavn.replace(/\s+/g, "-")}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setEksportMenuAaben(false);
  };

  // PDF-eksport: bruger browserens print-dialog. CSS @media print fjerner UI-chrome
  // (hamburger, header-knapper, drag-handles, "+ Tilføj"-knapper) så kun selve
  // skemaet med fag og lærere printes. Brugeren vælger "Save as PDF" i dialogen.
  const eksportSomPDF = () => {
    setEksportMenuAaben(false);
    // Lille delay så dropdown'en når at lukke før print-dialogen åbnes
    setTimeout(() => window.print(), 50);
  };

  const importerData = (jsonString) => {
    try {
      const data = JSON.parse(jsonString);
      // Schema-validering: tjek at data har den forventede struktur før vi
      // overskriver app-state. Forhindrer at en korrupt fil crasher appen.
      if (!data || typeof data !== "object" || Array.isArray(data)) {
        setImportFejl("Filen er ikke en gyldig fagfordeling (forventer et JSON-objekt).");
        return;
      }
      const harKlasserShape = Array.isArray(data.klasser) && data.klasser.length > 0;
      const harGammelShape = Array.isArray(data.fag);
      const harLaerereShape = Array.isArray(data.laerere);
      const harGammelMig = data.mig && typeof data.mig === "object" && !Array.isArray(data.mig);
      if (!harKlasserShape && !harGammelShape && !harLaerereShape && !harGammelMig) {
        setImportFejl("Filen ser ikke ud til at være en fagfordeling.");
        return;
      }
      // Valider hver klasse + dens fag
      if (harKlasserShape) {
        for (const k of data.klasser) {
          if (!k || typeof k !== "object" || typeof k.navn !== "string") {
            setImportFejl("En af klasserne i filen mangler navn eller har forkert form.");
            return;
          }
          if (k.fag !== undefined && !Array.isArray(k.fag)) {
            setImportFejl(`Klasse "${k.navn}" har en ugyldig fag-liste.`);
            return;
          }
          for (const f of (k.fag || [])) {
            if (!f || typeof f !== "object" || typeof f.navn !== "string") {
              setImportFejl(`Et fag i klasse "${k.navn}" har forkert form.`);
              return;
            }
            if (f.laerere !== undefined && !Array.isArray(f.laerere)) {
              setImportFejl(`Faget "${f.navn}" i "${k.navn}" har en ugyldig lærer-liste.`);
              return;
            }
          }
        }
      }
      // Valider lærere
      if (harLaerereShape) {
        for (const l of data.laerere) {
          if (!l || typeof l !== "object" || typeof l.navn !== "string") {
            setImportFejl("En af lærerne i filen mangler navn eller har forkert form.");
            return;
          }
          if (l.fag !== undefined && !Array.isArray(l.fag)) {
            setImportFejl(`Lærer "${l.navn}" har en ugyldig fag-liste.`);
            return;
          }
        }
      }
      // Valideret — anvend data
      if (harKlasserShape) {
        const migreredeKlasser = data.klasser.map(k => ({
          ...k,
          id: k.id ?? nytId(),
          fag: (k.fag || []).map(f => ({
            ...f,
            id: f.id ?? nytId(),
            forventedeLaerere: f.forventedeLaerere ?? 2,
            laerere: Array.isArray(f.laerere) ? f.laerere : [],
          })),
        }));
        setKlasser(migreredeKlasser);
        const aktivId = data.aktivKlasseId && migreredeKlasser.some(k => k.id === data.aktivKlasseId)
          ? data.aktivKlasseId
          : migreredeKlasser[0].id;
        setAktivKlasseId(aktivId);
      } else if (harGammelShape) {
        const id = nytId();
        const migreredeFag = data.fag.map(f => ({
          ...f,
          id: f.id ?? nytId(),
          forventedeLaerere: f.forventedeLaerere ?? 2,
          laerere: Array.isArray(f.laerere) ? f.laerere : [],
        }));
        setKlasser([{ id, navn: data.klasseNavn || "Min klasse", fag: migreredeFag }]);
        setAktivKlasseId(id);
      }
      // MULTI-LAERER: importer laerere/aktivLaererId + visning hvis de findes
      if (Array.isArray(data.laerere)) {
        const importeredeLaerere = data.laerere.map(l => ({
          id: l.id ?? nytId(),
          navn: l.navn || "",
          maalLektioner: l.maalLektioner ?? null,
          fag: Array.isArray(l.fag) ? l.fag : [],
        }));
        setLaerere(importeredeLaerere);
        const aktivLId = data.aktivLaererId && importeredeLaerere.some(l => l.id === data.aktivLaererId)
          ? data.aktivLaererId
          : (importeredeLaerere[0]?.id ?? null);
        setAktivLaererId(aktivLId);
      } else if (data.mig && typeof data.mig === "object") {
        // Legacy: en enkelt mig
        const harData = (data.mig.navn || "").trim() ||
          (Array.isArray(data.mig.fag) && data.mig.fag.length > 0) ||
          data.mig.maalLektioner != null;
        if (harData) {
          const id = nytId();
          const navn = (data.mig.navn || "").trim() || "Lærer 1";
          setLaerere([{
            id,
            navn,
            maalLektioner: data.mig.maalLektioner ?? null,
            fag: Array.isArray(data.mig.fag) ? data.mig.fag : [],
          }]);
          setAktivLaererId(id);
        } else {
          setLaerere([]);
          setAktivLaererId(null);
        }
      }
      if (data.visning === "klasse" || data.visning === "laerer") {
        setVisning(data.visning);
      } else if (data.visning === "min") {
        setVisning("laerer");
      }
      setShowImport(false);
      setImportFejl("");
    } catch (e) {
      setImportFejl("Kunne ikke læse filen. Tjek at det er en gyldig fagfordelings-fil.");
    }
  };

  // MULTI-CLASS / MULTI-LAERER: "Nulstil"-knappen er kontekst-følsom.
  // I klasse-visning: nulstiller den AKTIVE klasse (fag og lærere). Andre klasser påvirkes ikke.
  // I lærer-visning: nulstiller den AKTIVE lærers data (mål og fag) men beholder navnet.
  const nulstilAlt = () => {
    if (visning === "laerer" && aktivLaerer) {
      setBekraeftSlet({
        titel: `Nulstil ${aktivLaerer.navn || "lærer"}?`,
        tekst: `Slet mål og alle fag for ${aktivLaerer.navn || "denne lærer"}. Andre lærere og klasser påvirkes ikke. Det kan ikke fortrydes.`,
        bekraeftTekst: "Nulstil",
        onConfirm: () => {
          setMig(prev => ({ ...prev, maalLektioner: null, fag: [] }));
          setLaererMaalInput("");
          setRedigerMigNavn(false);
          setRedigerMigMaal(false);
          setBekraeftSlet(null);
        },
      });
      return;
    }
    setBekraeftSlet({
      titel: "Nulstil denne klasse?",
      tekst: `Slet alt indhold i "${klasseNavn}" (fag og lærere). Andre klasser påvirkes ikke. Det kan ikke fortrydes.`,
      bekraeftTekst: "Nulstil",
      onConfirm: () => {
        setKlasseNavn("Min klasse");
        setFag([]);
        setUdfoldede(new Set());
        setValgtKlassetrin(null);
        setPendingNavne([]);
        setTilfoejNavnAaben(false);
        setNytLaererNavn("");
        setBekraeftSlet(null);
      },
    });
  };

  // Empty-state-valg ved første åbning: bruger vælger om de vil starte med
  // klasse-overblik eller lærer-overblik. Begge muligheder kan kombineres
  // bagefter, men start-pointen sætter konteksten.
  // autofokusKlasseTitel triggrer auto-focus + select på titel-input når en
  // klasse er lige oprettet — så bruger ser cursor i titlen og kan straks
  // taste sit navn uden at lede efter affordancen.
  const klasseTitelRef = React.useRef(null);
  const [autofokusKlasseTitel, setAutofokusKlasseTitel] = useState(false);
  const [klasseTitelHover, setKlasseTitelHover] = useState(false);
  const [klasseTitelFocus, setKlasseTitelFocus] = useState(false);

  const startMedKlasse = () => {
    const id = nytId();
    setKlasser([{ id, navn: "Min klasse", fag: [] }]);
    setAktivKlasseId(id);
    setVisning("klasse");
    setMenuAaben(false);
    setAutofokusKlasseTitel(true);
  };

  const startMedLaerer = () => {
    const id = nytId();
    setLaerere([{
      id, navn: "Lærer 1", maalLektioner: null,
      fag: [{ id: nytId(), navn: "", klasse: "", lektioner: 1 }],
    }]);
    setAktivLaererId(id);
    setVisning("laerer");
    setMenuAaben(false);
  };

  useEffect(() => {
    if (autofokusKlasseTitel && klasseTitelRef.current) {
      klasseTitelRef.current.focus();
      klasseTitelRef.current.select();
      setAutofokusKlasseTitel(false);
    }
  }, [autofokusKlasseTitel]);

  // MULTI-CLASS: operationer på klasse-arrayet. Tilfoej accepterer nu et navn
  // fra hamburger-input-flowet (dashed-style); falder tilbage til "Klasse N"
  // hvis tomt så brugeren ikke ender med en navnløs klasse.
  const tilfoejKlasse = (raaNavn) => {
    const trimmet = (raaNavn || "").trim();
    const navn = trimmet ? normaliserKlasse(trimmet) : `Klasse ${klasser.length + 1}`;
    const id = nytId();
    const nyKlasse = { id, navn, fag: [] };
    setKlasser(prev => [...prev, nyKlasse]);
    setAktivKlasseId(id);
    setVisning("klasse");
    setUdfoldede(new Set());
    setValgtKlassetrin(null);
    setPendingNavne([]);
    setTilfoejNavnAaben(false);
    setNytLaererNavn("");
    setHamburgerNyKlasseAaben(false);
    setHamburgerNyKlasseNavn("");
  };

  const skiftAktivKlasse = (id) => {
    // Skift også visning tilbage til klasse hvis vi er i lærer-visning.
    // Menuen forbliver åben — brugeren lukker den selv ved klik udenfor / Escape.
    setVisning("klasse");
    if (id === aktivKlasseId && visning === "klasse") return;
    setAktivKlasseId(id);
    setUdfoldede(new Set());
    setValgtKlassetrin(null);
    setPendingNavne([]);
    setTilfoejNavnAaben(false);
    setNytLaererNavn("");
  };

  const startOmdoeb = (k) => {
    setOmdoeberKlasseId(k.id);
    setOmdoebNavn(k.navn);
  };

  const gemOmdoeb = () => {
    const navn = normaliserKlasse(omdoebNavn);
    if (!navn) {
      setOmdoeberKlasseId(null);
      return;
    }
    setKlasser(prev => prev.map(k =>
      k.id === omdoeberKlasseId ? { ...k, navn } : k
    ));
    setOmdoeberKlasseId(null);
    setOmdoebNavn("");
  };

  const annullerOmdoeb = () => {
    setOmdoeberKlasseId(null);
    setOmdoebNavn("");
  };

  // MULTI-LAERER: opret ny lærer fra hamburger-input-flowet. navn kommer fra
  // input-feltet; falder tilbage til "Lærer N" hvis tomt. Pre-loader et tomt
  // fag-kort så brugeren har noget at skrive i straks (matcher klasse-empty-
  // state-skabelonen).
  const tilfoejNyLaerer = (raaNavn) => {
    const trimmed = (raaNavn || "").trim();
    const navn = trimmed || `Lærer ${laerere.length + 1}`;
    const id = nytId();
    setLaerere(prev => [...prev, {
      id,
      navn,
      maalLektioner: null,
      fag: [{ id: nytId(), navn: "", klasse: "", lektioner: 1 }],
    }]);
    setAktivLaererId(id);
    setVisning("laerer");
    setHamburgerNyLaererAaben(false);
    setHamburgerNyLaererNavn("");
    setLaererMaalInput("");
  };

  const skiftAktivLaerer = (id) => {
    // Menuen forbliver åben — brugeren lukker den selv ved klik udenfor / Escape.
    setAktivLaererId(id);
    setVisning("laerer");
    setRedigerMigNavn(false);
    setRedigerMigMaal(false);
  };

  const omdoebLaerer = (id, nytNavn) => {
    const navnTrimmet = (nytNavn || "").trim();
    if (!navnTrimmet) return;
    setLaerere(prev => prev.map(l => l.id === id ? { ...l, navn: navnTrimmet } : l));
    setOmdoeberLaererId(null);
    setOmdoebLaererNavn("");
  };

  const sletLaererHelt = (id) => {
    const laerer = laerere.find(l => l.id === id);
    if (!laerer) return;
    setBekraeftSlet({
      titel: `Slet ${laerer.navn || "lærer"}?`,
      tekst: `Sletter alle data for "${laerer.navn || "denne lærer"}". Klasser og andre lærere påvirkes ikke. Det kan ikke fortrydes.`,
      bekraeftTekst: "Slet",
      onConfirm: () => {
        setLaerere(prev => {
          const næste = prev.filter(l => l.id !== id);
          // Hvis vi sletter den aktive, skift til første tilbageværende eller klasse-view
          if (id === aktivLaererId) {
            if (næste.length > 0) {
              setAktivLaererId(næste[0].id);
            } else {
              setAktivLaererId(null);
              setVisning("klasse");
            }
          }
          return næste;
        });
        setBekraeftSlet(null);
      },
    });
  };

  const tilfoejMigFag = () => {
    setMig(prev => ({
      ...prev,
      fag: [...prev.fag, { id: nytId(), navn: "", klasse: "", lektioner: 1 }],
    }));
  };

  const opdaterMigFag = (id, felt, vaerdi) => {
    setMig(prev => ({
      ...prev,
      fag: prev.fag.map(f => f.id === id ? { ...f, [felt]: vaerdi } : f),
    }));
  };

  const sletMigFag = (id) => {
    const fag = mig.fag.find(f => f.id === id);
    const tomt = fag && !fag.navn.trim() && !fag.klasse.trim();
    if (tomt) {
      setMig(prev => ({ ...prev, fag: prev.fag.filter(f => f.id !== id) }));
      return;
    }
    setBekraeftSlet({
      titel: "Slet fag fra din oversigt?",
      tekst: `"${fag?.navn || "Uden navn"}" i ${fag?.klasse || "ingen klasse"} fjernes fra din oversigt.`,
      bekraeftTekst: "Slet",
      onConfirm: () => {
        setMig(prev => ({ ...prev, fag: prev.fag.filter(f => f.id !== id) }));
        setBekraeftSlet(null);
      },
    });
  };

  // MULTI-LAERER: skiftTilMinOversigt erstattet af skiftAktivLaerer ovenfor.

  // MIN-OVERSIGT: drag handlers
  // Active.id konventioner:
  //   - number: et fag.id (drag for reorder)
  //   - string "klasse:<navn>": en klasse fra sidebar (drag til fag-kort for at sætte klasse)
  const handleMinDragStart = (e) => {
    setActiveMinDrag(e.active.id);
  };
  const handleMinDragEnd = (e) => {
    const { active, over } = e;
    setActiveMinDrag(null);
    if (!over) return;

    // Klasse fra sidebar droppes på et fag-kort → sæt fag.klasse
    if (typeof active.id === "string" && active.id.startsWith("klasse:") && typeof over.id === "number") {
      const klasse = active.id.slice("klasse:".length);
      setMig(prev => ({
        ...prev,
        fag: prev.fag.map(f => f.id === over.id ? { ...f, klasse } : f),
      }));
      setPendingKlasser(prev => prev.filter(k => k !== klasse));
      return;
    }

    // Fag-kort reorder
    if (typeof active.id === "number" && typeof over.id === "number") {
      if (active.id === over.id) return;
      setMig(prev => {
        const oldIdx = prev.fag.findIndex(f => f.id === active.id);
        const newIdx = prev.fag.findIndex(f => f.id === over.id);
        if (oldIdx < 0 || newIdx < 0) return prev;
        return { ...prev, fag: arrayMove(prev.fag, oldIdx, newIdx) };
      });
    }
  };

  // Tilføj en pending klasse fra sidebar-input. Normaliseres ("8a" → "8.A").
  // Skipper tomme og dubletter (allerede i pending eller allerede brugt på et fag).
  const tilfoejPendingKlasse = () => {
    const normaliseret = normaliserKlasse(nyKlasseInput);
    if (!normaliseret) return;
    const allerede = pendingKlasser.includes(normaliseret) ||
      mig.fag.some(f => normaliserKlasse(f.klasse) === normaliseret);
    if (!allerede) {
      setPendingKlasser(prev => [...prev, normaliseret]);
    }
    setNyKlasseInput("");
  };

  // MIN-OVERSIGT: derived data
  const migOversigt = useMemo(() => {
    const map = {};
    mig.fag.forEach(f => {
      const klasse = (f.klasse || "").trim();
      if (!klasse) return;
      if (!map[klasse]) map[klasse] = { klasse, total: 0, fag: [] };
      const lekt = parseInt(f.lektioner) || 0;
      map[klasse].total += lekt;
      map[klasse].fag.push({ navn: f.navn || "Uden navn", lektioner: lekt });
    });
    return Object.values(map).sort((a, b) => b.total - a.total);
  }, [mig.fag]);
  const migSamletLektioner = mig.fag.reduce((s, f) => s + (parseInt(f.lektioner) || 0), 0);
  const migAntalKlasser = migOversigt.length;
  const migMangler = mig.maalLektioner !== null ? mig.maalLektioner - migSamletLektioner : null;

  const sletKlasse = (k) => {
    setBekraeftSlet({
      titel: `Slet "${k.navn}"?`,
      tekst: `Hele klassen og alle dens fag og lærere slettes. Det kan ikke fortrydes.`,
      bekraeftTekst: "Slet klasse",
      onConfirm: () => {
        const tilbage = klasser.filter(x => x.id !== k.id);
        setKlasser(tilbage);
        if (k.id === aktivKlasseId) {
          if (tilbage.length > 0) {
            setAktivKlasseId(tilbage[0].id);
          } else {
            // Sidste klasse slettet — lad aktivKlasseId være, og hvis der er
            // lærere, skift til lærer-view; ellers viser empty-state-skærmen.
            setAktivKlasseId(null);
            if (laerere.length > 0) setVisning("laerer");
          }
          setUdfoldede(new Set());
          setValgtKlassetrin(null);
          setPendingNavne([]);
        }
        setBekraeftSlet(null);
      },
    });
  };

  const haandterFil = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => importerData(ev.target.result);
    reader.readAsText(file);
    // Nulstil input så samme fil kan vælges igen efter en fejl
    e.target.value = "";
  };

  const oversigt = useMemo(() => laererOversigt(), [fag, pendingNavne]);
  // Byg farve-maps via useMemo — kun når input faktisk ændrer sig.
  // Position-baseret tildeling sikrer at de første 20 lærere/klasser har
  // unikke farver. Mutation af module-level maps sker indenfor useMemo så
  // child-komponenter ser samme værdier i samme render-pass.
  const laererFarveMap = useMemo(() => buildLaererFarveMap(oversigt), [oversigt]);
  const klasseNavneFraMin = useMemo(() => {
    const set = new Set();
    const ordnet = [];
    migOversigt.forEach(o => {
      const k = (o.klasse || "").trim().toLowerCase();
      if (k && !set.has(k)) { set.add(k); ordnet.push(o.klasse); }
    });
    pendingKlasser.forEach(k => {
      const n = (k || "").trim().toLowerCase();
      if (n && !set.has(n)) { set.add(n); ordnet.push(k); }
    });
    return ordnet;
  }, [migOversigt, pendingKlasser]);
  const klasseFarveMap = useMemo(() => buildKlasseFarveMap(klasseNavneFraMin), [klasseNavneFraMin]);
  LAERER_FARVE_MAP = laererFarveMap;
  KLASSE_FARVE_MAP = klasseFarveMap;

  // Unikke eksisterende lærere (normaliseret, dedupliceret, sorteret) til autosuggest
  const eksisterendeLaerere = useMemo(() => {
    const map = new Map();
    fag.forEach(f => f.laerere.forEach(l => {
      const norm = normalizeNavn(l.navn);
      if (norm) map.set(norm.toLowerCase(), norm);
    }));
    return [...map.values()].sort((a, b) => a.localeCompare(b, "da"));
  }, [fag]);

  // Drag-and-drop sensors: musen skal trække 8px før drag starter (forhindrer
  // utilsigtede drags ved klik på inputs); touch venter 200ms (long-press),
  // så scroll og tryk på inputs ikke aktiverer drag.
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 6 } }),
  );

  // Composed collision detection: pointerWithin først (kun targets musen
  // faktisk er INDE i), fallback til closestCorners KUN for fag-drag (så
  // fag-kort kan reorderes selvom musen er i mellemrummet mellem dem).
  // Fanger to bugs: (1) drop udenfor fag-kort triggrede tidligere alligevel
  // et drop på det nærmeste, fordi closestCorners aldrig returnerer tom.
  // (2) lærer-kort kan ikke længere "snape" til distant cards.
  const collisionDetectionStrategy = React.useCallback((args) => {
    const pointerCollisions = pointerWithin(args);
    const activeId = args.active?.id;
    const isFagDrag = fag.some((f) => f.id === activeId);
    const fagIds = new Set(fag.map((f) => f.id));
    if (isFagDrag) {
      if (pointerCollisions.length > 0) return pointerCollisions;
      return closestCorners(args);
    }
    // Lærer/sidebar-drag: vi vil aldrig have fag-kortet selv som target,
    // og vi må aldrig returnere det aktive element selv (ellers ender
    // sortable-shuffled drops med at "ramme sig selv" = no-op). Filtrér
    // begge fra både pointerWithin og closestCorners-fallback.
    const reject = (c) => fagIds.has(c.id) || c.id === activeId;
    const innerPointer = pointerCollisions.filter((c) => !reject(c));
    if (innerPointer.length > 0) return innerPointer;
    const innerCC = closestCorners(args).filter((c) => !reject(c));
    return innerCC;
  }, [fag]);

  // Samme strategi for Min oversigt: drop kun valid hvis musen er INDE i
  // et fag-kort eller en klasse-row. Fag-reorder bruger closestCorners.
  const collisionMinStrategy = React.useCallback((args) => {
    const pointerCollisions = pointerWithin(args);
    if (pointerCollisions.length > 0) return pointerCollisions;
    const activeId = args.active?.id;
    const isFagDrag = mig.fag.some((f) => f.id === activeId);
    if (isFagDrag) return closestCorners(args);
    return [];
  }, [mig.fag]);

  // Aktiv drag-id til DragOverlay (sørger for at trukket lærer altid er øverst)
  const [activeDragId, setActiveDragId] = useState(null);
  // Track origin-fag for lærer-drag, så vi ved hvor læreren startede når vi
  // skal justere lektionstal ved cross-fag drop. Ref undgår re-renders.
  const dragStartFagIdRef = React.useRef(null);

  const activeDragLaerer = (() => {
    if (!activeDragId) return null;
    // Sidebar-drag: ID format "sidebar:<navn>"
    if (typeof activeDragId === "string" && activeDragId.startsWith("sidebar:")) {
      return { navn: activeDragId.slice("sidebar:".length), lektioner: 0 };
    }
    if (fag.some((f) => f.id === activeDragId)) return null; // fag-drag
    for (const f of fag) {
      const l = f.laerere.find((l) => l.id === activeDragId);
      if (l) return l;
    }
    return null;
  })();

  const handleDragStart = ({ active }) => {
    setActiveDragId(active.id);
    // Track origin for lærer-drags inde i fag-kortene (til lektionstal-justering).
    // Sidebar-drags har ingen enkelt origin-fag.
    const isSidebarDrag = typeof active.id === "string" && active.id.startsWith("sidebar:");
    const isFagDrag = fag.some((f) => f.id === active.id);
    if (!isFagDrag && !isSidebarDrag) {
      const origin = fag.find((f) => f.laerere.some((l) => l.id === active.id));
      dragStartFagIdRef.current = origin?.id ?? null;
    } else {
      dragStartFagIdRef.current = null;
    }
  };

  // handleDragOver: realtime cross-fag flytning af lærere.
  // Når man trækker en lærer hen over et andet fag, flyttes læreren til
  // destinationens array med det samme — så eksisterende lærere på destination
  // shifter naturligt via SortableContext + verticalListSortingStrategy.
  const handleDragOver = ({ active, over }) => {
    if (!over || active.id === over.id) return;

    // Skip fag-drag — gridets SortableContext + rectSortingStrategy håndterer
    const activeIsFag = fag.some((f) => f.id === active.id);
    if (activeIsFag) return;

    // Skip sidebar-drag — den håndteres som "tilføj lærer til fag" i handleDragEnd.
    // (Ghost-insert med samme id ville kollidere med sidebarens useDraggable.)
    const isSidebarDrag = typeof active.id === "string" && active.id.startsWith("sidebar:");
    if (isSidebarDrag) return;

    const overIsFag = fag.some((f) => f.id === over.id);
    const overIsSlot = typeof over.id === "string" && over.id.startsWith("slot:");
    const currentSource = fag.find((f) => f.laerere.some((l) => l.id === active.id));
    if (!currentSource) return;

    let target;
    if (overIsFag) {
      target = fag.find((f) => f.id === over.id);
    } else if (overIsSlot) {
      const targetFagId = over.id.split(":")[1];
      target = fag.find((f) => f.id === targetFagId);
    } else {
      target = fag.find((f) => f.laerere.some((l) => l.id === over.id));
    }
    if (!target) return;

    if (target.id === currentSource.id) return;

    const movingLaerer = currentSource.laerere.find((l) => l.id === active.id);
    let destIndex;
    // replaceMode: drop på en eksisterende tom (unnamed) entry skal *erstatte*
    // den, ikke indsættes før — ellers vokser arrayet ud over forventedeLaerere.
    // (Skabelon-init opretter unnamed entries, så cards har præ-fyldte slots
    // brugeren kan udfylde eller droppe lærere på.)
    let replaceMode = false;
    if (overIsFag) {
      // Drop på selve fag-kortet (ikke en specifik række): hvis der er tomme
      // entries, erstat den FØRSTE — så kortet "fyldes op" oppefra.
      const firstUnnamedIdx = target.laerere.findIndex((l) => !l.navn?.trim());
      if (firstUnnamedIdx >= 0) {
        destIndex = firstUnnamedIdx;
        replaceMode = true;
      } else {
        destIndex = target.laerere.length;
      }
    } else if (overIsSlot) {
      // Virtuel slot — endelig position sættes i handleDragEnd. Indtil da
      // placerer vi læreren sidst i target, så drag-preview viser læreren i
      // det rigtige fag-kort.
      destIndex = target.laerere.length;
    } else {
      destIndex = target.laerere.findIndex((l) => l.id === over.id);
      if (destIndex < 0) destIndex = target.laerere.length;
      const overLaerer = target.laerere.find((l) => l.id === over.id);
      if (overLaerer && !overLaerer.navn?.trim()) {
        replaceMode = true;
      }
    }

    setFag((prev) => prev.map((f) => {
      if (f.id === currentSource.id) {
        return { ...f, laerere: f.laerere.filter((l) => l.id !== active.id) };
      }
      if (f.id === target.id) {
        if (f.laerere.some((l) => l.id === active.id)) return f;
        const newLaerere = [...f.laerere];
        if (replaceMode) {
          newLaerere.splice(destIndex, 1, movingLaerer);
        } else {
          newLaerere.splice(destIndex, 0, movingLaerer);
        }
        return { ...f, laerere: newLaerere };
      }
      return f;
    }));
  };

  const handleDragEnd = ({ active, over }) => {
    const activeId = active.id;
    const startFagId = dragStartFagIdRef.current;
    setActiveDragId(null);
    dragStartFagIdRef.current = null;

    if (!over) return;

    const activeIsFag = fag.some((f) => f.id === activeId);
    const overIsFag = fag.some((f) => f.id === over.id);
    const overIsSlot = typeof over.id === "string" && over.id.startsWith("slot:");

    // Slot-drop info (bruges af både sidebar- og lærer-drag)
    let slotTargetFagId = null;
    let slotTargetIdx = null;
    if (overIsSlot) {
      const parts = over.id.split(":");
      slotTargetFagId = parts[1];
      slotTargetIdx = parseInt(parts[2]);
    }

    // Sidebar-drag: tilføj lærer til target-fag (med lektioner = fagets lektioner).
    // Skip hvis lærer allerede er på faget.
    if (typeof activeId === "string" && activeId.startsWith("sidebar:")) {
      const sidebarNavn = activeId.slice("sidebar:".length);
      let targetFagId = null;
      let targetLaererId = null;
      if (overIsFag) {
        targetFagId = over.id;
      } else if (overIsSlot) {
        targetFagId = slotTargetFagId;
      } else {
        const overFag = fag.find((f) => f.laerere.some((l) => l.id === over.id));
        if (overFag) {
          targetFagId = overFag.id;
          targetLaererId = over.id;
        }
      }
      if (!targetFagId) return;
      setFag((prev) => prev.map((f) => {
        if (f.id !== targetFagId) return f;
        const norm = normalizeNavn(sidebarNavn).toLowerCase();
        if (f.laerere.some((l) => normalizeNavn(l.navn).toLowerCase() === norm)) {
          return f;
        }
        const fagLekt = parseInt(f.lektioner) || 0;
        const nyLaerer = { id: nytId(), navn: sidebarNavn, lektioner: fagLekt };
        if (overIsSlot && slotTargetIdx !== null && !Number.isNaN(slotTargetIdx)) {
          // Pad med tomme entries op til slot-index, så lærer lander på det
          // valgte slot — ikke bare sidst.
          const newLaerere = [...f.laerere];
          while (newLaerere.length < slotTargetIdx) {
            newLaerere.push({ id: nytId(), navn: "", lektioner: 0 });
          }
          newLaerere.splice(slotTargetIdx, 0, nyLaerer);
          return { ...f, laerere: newLaerere };
        }
        // Drop på en specifik lærer-række: erstat hvis den er tom.
        if (targetLaererId) {
          const idx = f.laerere.findIndex((l) => l.id === targetLaererId);
          if (idx >= 0 && !f.laerere[idx].navn?.trim()) {
            const newLaerere = [...f.laerere];
            newLaerere.splice(idx, 1, nyLaerer);
            return { ...f, laerere: newLaerere };
          }
        }
        // Drop på fag-kortet: erstat første tomme entry hvis der er en.
        if (overIsFag) {
          const firstUnnamedIdx = f.laerere.findIndex((l) => !l.navn?.trim());
          if (firstUnnamedIdx >= 0) {
            const newLaerere = [...f.laerere];
            newLaerere.splice(firstUnnamedIdx, 1, nyLaerer);
            return { ...f, laerere: newLaerere };
          }
        }
        return { ...f, laerere: [...f.laerere, nyLaerer] };
      }));
      setPendingNavne((prev) => prev.filter((n) => n !== sidebarNavn));
      return;
    }

    // Fag-drag: reorder i grid
    if (activeIsFag) {
      if (overIsFag && activeId !== over.id) {
        const oldIndex = fag.findIndex((f) => f.id === activeId);
        const newIndex = fag.findIndex((f) => f.id === over.id);
        if (oldIndex >= 0 && newIndex >= 0) {
          setFag(arrayMove(fag, oldIndex, newIndex));
        }
      }
      return;
    }

    // Lærer-drag: handleDragOver har allerede flyttet læreren til destination.
    // Vi håndterer her: (a) slot-drop (pad + flyt til præcis slot-index),
    // (b) within-fag reorder, (c) lektionstal-justering ved cross-fag.
    const currentFag = fag.find((f) => f.laerere.some((l) => l.id === activeId));
    if (!currentFag) return;

    // Slot-drop: flyt læreren til det valgte slot-index, padding med tomme
    // entries hvis nødvendigt så positionen holder.
    if (overIsSlot && slotTargetFagId && currentFag.id === slotTargetFagId
        && slotTargetIdx !== null && !Number.isNaN(slotTargetIdx)) {
      setFag((prev) => prev.map((f) => {
        if (f.id !== currentFag.id) return f;
        const movingLaerer = f.laerere.find((l) => l.id === activeId);
        if (!movingLaerer) return f;
        const without = f.laerere.filter((l) => l.id !== activeId);
        const padded = [...without];
        while (padded.length < slotTargetIdx) {
          padded.push({ id: nytId(), navn: "", lektioner: 0 });
        }
        padded.splice(slotTargetIdx, 0, movingLaerer);
        return { ...f, laerere: padded };
      }));
    }

    // Within-fag reorder (drop på en anden lærer i samme fag)
    if (!overIsFag && !overIsSlot) {
      const overFag = fag.find((f) => f.laerere.some((l) => l.id === over.id));
      if (overFag && overFag.id === currentFag.id) {
        const sourceIdx = currentFag.laerere.findIndex((l) => l.id === activeId);
        const destIdx = currentFag.laerere.findIndex((l) => l.id === over.id);
        if (sourceIdx >= 0 && destIdx >= 0 && sourceIdx !== destIdx) {
          setFag((prev) => prev.map((f) =>
            f.id === currentFag.id
              ? { ...f, laerere: arrayMove(f.laerere, sourceIdx, destIdx) }
              : f
          ));
        }
      }
    }

    // Cross-fag → sæt lærerens lektioner til destination-fagets lektionsantal
    if (startFagId && currentFag.id !== startFagId) {
      const fagLekt = parseInt(currentFag.lektioner) || 0;
      setFag((prev) => prev.map((f) =>
        f.id === currentFag.id
          ? {
              ...f,
              laerere: f.laerere.map((l) =>
                l.id === activeId ? { ...l, lektioner: fagLekt } : l
              ),
            }
          : f
      ));
    }
  };

  const statusFarver = {
    tom: { bg: "#fff", border: "#cdc5b8", tekst: "#7a7367", label: "Tom" },
    rød: { bg: "#fce8e6", border: "#d93025", tekst: "#9d2517", label: "Mangler" },
    gul: { bg: "#fef7e0", border: "#e8a317", tekst: "#7a5400", label: "Delvis" },
    grøn: { bg: "#e6f4ea", border: "#1e8e3e", tekst: "#0d652d", label: "OK" },
    over: { bg: "#fef7e0", border: "#e8a317", tekst: "#7a5400", label: "Over" },
  };

  return (
    <div style={{ minHeight: "100vh", background: "#f5f1ea", fontFamily: "'Inter', system-ui, sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600;9..144,700&family=Inter:wght@400;500;600&display=swap');
        * { box-sizing: border-box; }
        input, button { font-family: inherit; }
        input:focus { outline: 2px solid #1a1a1a; outline-offset: 1px; }
        .fag-input::placeholder { color: #7a7367; }
        .icon-btn { transition: all 0.15s ease; }
        .icon-btn:hover { background: rgba(0,0,0,0.06); }
        .laerer-row { transition: background 0.15s ease; }
        .laerer-row:hover { background: rgba(0,0,0,0.02); }
        .header-btn { transition: all 0.15s ease; }
        .header-btn:hover:not(:disabled) { background: #1a1a1a; color: #f5f1ea; }
        .header-btn:disabled { background: transparent !important; }
        .add-fag-btn { transition: all 0.2s ease; }
        .add-fag-btn:hover { background: #1a1a1a; color: #f5f1ea; transform: translateY(-1px); }
        input[type=number]::-webkit-inner-spin-button,
        input[type=number]::-webkit-outer-spin-button {
          -webkit-appearance: none; margin: 0;
        }
        input[type=number] { -moz-appearance: textfield; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes sheetFade { from { opacity: 0; } to { opacity: 1; } }
        @keyframes sheetSlide { from { transform: translateY(100%); } to { transform: translateY(0); } }
        /* MULTI-CLASS: animation for klasse-menu slide-in fra venstre.
           translate3d tvinger GPU-laget, så animationen ikke hakker selv med
           mange listeelementer der mounter samtidig. */
        @keyframes panelSlideLeft {
          from { transform: translate3d(-100%, 0, 0); opacity: 0; }
          to { transform: translate3d(0, 0, 0); opacity: 1; }
        }
        /* MULTI-CLASS: blød fade-in — menuen sidder bare ovenpå siden,
           ingen slide, ingen wash. */
        @keyframes panelFadeIn {
          from { opacity: 0; transform: translate3d(-4px, 0, 0); }
          to { opacity: 1; transform: translate3d(0, 0, 0); }
        }
        @keyframes backdropFade { from { opacity: 0; } to { opacity: 1; } }
        .klasse-menu-aside { will-change: transform, opacity; backface-visibility: hidden; }
        .klasse-menu-row { transition: background 0.12s ease; }
        .klasse-menu-row:hover { background: rgba(0,0,0,0.03); }
        .klasse-menu-row:hover .klasse-menu-actions { opacity: 1 !important; }
        .klasse-menu-row:hover .klasse-menu-navn { color: #1a1a1a !important; }
        /* Aktiv klasse/lærer: bold vægt + sort tekst. Ingen bar, ingen kasse —
           lad typografien bære signalet. */
        .klasse-menu-row.aktiv .klasse-menu-navn { font-weight: 600 !important; color: #1a1a1a !important; }
        .klasse-menu-add { color: #cdc5b8; transition: background 0.12s, color 0.12s; }
        .klasse-menu-add:hover { background: rgba(0,0,0,0.03); color: #1a1a1a !important; }
        .fag-card { animation: fadeIn 0.25s ease; }
        .mobile-fag-tile:active { transform: scale(0.97); transition: transform 0.1s; }
        .fag-card-fagnavn { field-sizing: content; min-width: 60px; max-width: 100%; }
        .fag-card-lekt-input { field-sizing: content; min-width: 16px; }

        .stat-line { display: none; }

        @media (max-width: 768px) {
          .page-wrap { padding: 20px 16px 40px !important; }
          .klasse-titel { font-size: 30px !important; }

          /* Stat-bar: skjul desktop, vis kompakt mobil-linje */
          .stat-bar { display: none !important; }
          .stat-line { display: flex !important; }

          /* Hovedlayout: én kolonne, mindre gap */
          .main-grid { grid-template-columns: 1fr !important; gap: 24px !important; }
          .laerere-aside { position: static !important; }

          /* Kompakt fag-kort */
          .fag-card-header { padding: 10px 12px !important; gap: 8px !important; }
          .fag-card-fagnavn { font-size: 17px !important; padding: 0 !important; }
          .fag-card-laerere { display: none !important; }
          .fag-card-lekt-input { font-size: 17px !important; }
          .fag-card-lekt-label { display: none !important; }

          /* Header import/export bliver kompakte ikon-knapper */
          .header-btn-label { display: none !important; }
          .header-io-btn { padding: 9px 11px !important; gap: 0 !important; }

          /* Kompakt lærer-række */
          .laerer-item { padding: 8px 12px !important; }
          .laerer-item-row { margin-bottom: 0 !important; gap: 10px !important; }
          .laerer-fag-tags { display: none !important; }
          .laerer-extra { display: none !important; }
          .laerer-avatar { width: 26px !important; height: 26px !important; font-size: 11px !important; }
          .laerer-navn { font-size: 13px !important; }
          .laerer-total { font-size: 16px !important; }
        }

        /* === PRINT-STYLESHEET ===
           Skal ligne en render af siden, ikke en print-renset version. Bevarer alle
           farver, baggrunde og layout — fjerner KUN interaktive UI-elementer (knapper,
           menu, drag-handles). Brugeren får browser-print-dialog og vælger "Save as PDF". */
        @media print {
          @page { size: A4 landscape; margin: 8mm; }

          /* Skaler hele page-wrap'en så 11 fag + sidebar fylder én A4-side.
             transform-origin: top left + width-kompensation gør at det skalerede
             indhold fylder hele siden uden hvidt overflow. */
          .page-wrap {
            transform: scale(0.72) !important;
            transform-origin: top left !important;
            width: 138.9% !important;
          }
          /* Forhindre side-brud overhovedet i indholdet */
          .page-wrap, .main-grid, .fag-grid, .stat-bar {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }

          /* Tving browseren til at bevare farver og baggrunde — ellers stripper Chrome dem */
          *, *::before, *::after {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }

          /* Stop animationer og transitions — de skal ikke "flashe" når print snapshottes */
          *, *::before, *::after {
            animation: none !important;
            transition: none !important;
          }

          /* Skjul UI-chrome der ikke giver mening i et delbart artefakt */
          .no-print,
          [data-no-print="true"],
          .header-io-btn,
          .header-btn,
          .klasse-menu-aside,
          .mobile-tabs,
          .mobile-summary-bar,
          .stat-line,
          .add-fag-btn,
          .add-laerer-btn,
          button[aria-label*="Skift klasse"],
          button[aria-label="Luk menu"],
          button[aria-label*="Tilføj fag"],
          button[aria-label*="Tilføj lærer"],
          [role="dialog"]
          { display: none !important; }

          /* Skjul slet-knapper og lignende inde i fag-kortene */
          .fag-card button[aria-label*="Slet"],
          .fag-card button[aria-label*="Fold"],
          .fag-card .drag-handle
          { display: none !important; }

          /* Sidebar lærere: behold listen og dens visuelle stil, fjern kun knapper */
          .laerere-aside button { display: none !important; }

          /* Fasthold layoutet som på desktop: fag til venstre, lærere i sidebar til højre.
             Override mobile-stacking-rule der ellers kunne kicke ind ved smal print-bredde. */
          .main-grid {
            display: grid !important;
            grid-template-columns: minmax(0, 1fr) 264px !important;
            gap: 14px !important;
            align-items: start !important;
          }
          .laerere-aside {
            position: static !important;
            display: block !important;
          }

          /* Klassenavn-input er kun "input"-shell — skal stadig se ud som tekst på print */
          .klasse-titel {
            border: none !important;
            background: transparent !important;
            outline: none !important;
          }

          /* Page-wrap holder sin look, men må ikke clippes af viewport */
          .page-wrap {
            max-width: none !important;
          }

          /* Forhindre at fag-kort splittes over sider midt i indholdet */
          .fag-card {
            page-break-inside: avoid;
            break-inside: avoid;
          }
          .stat-bar { page-break-inside: avoid; }
        }
      `}</style>

      {/* Empty-state choice screen — vises kun ved første åbning når der hverken
          er klasser eller lærere. Bruger vælger startpunkt; alt kan kombineres
          bagefter. Overlay dækker hele skærmen så underliggende UI ikke flimrer. */}
      {loaded && klasser.length === 0 && laerere.length === 0 && (
        <div style={{
          position: "fixed", inset: 0, background: "#f5f1ea",
          zIndex: 200,
          display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center",
          padding: "40px 20px",
        }}>
          <div style={{ maxWidth: "560px", width: "100%", textAlign: "center" }}>
            <h1 style={{
              fontFamily: "'Fraunces', Georgia, serif",
              fontSize: "36px", fontWeight: 600,
              letterSpacing: "-0.02em",
              color: "#1a1a1a",
              margin: "0 0 12px",
            }}>
              Skab overblik for klasse eller lærer?
            </h1>
            <p style={{
              fontSize: "14px", color: "#7a7367",
              lineHeight: 1.5,
              margin: "0 0 36px",
            }}>
              Vælg et startpunkt — du kan rette og tilføje mere bagefter.
            </p>
            <div style={{ display: "flex", gap: "12px", justifyContent: "center", flexWrap: "wrap" }}>
              <button
                onClick={startMedKlasse}
                style={{
                  padding: "16px 32px",
                  fontFamily: "'Fraunces', Georgia, serif",
                  fontSize: "18px", fontWeight: 500,
                  background: "#1a1a1a", color: "#f5f1ea",
                  border: "1px solid #1a1a1a",
                  cursor: "pointer",
                  minWidth: "160px",
                }}
              >
                Klasse
              </button>
              <button
                onClick={startMedLaerer}
                style={{
                  padding: "16px 32px",
                  fontFamily: "'Fraunces', Georgia, serif",
                  fontSize: "18px", fontWeight: 500,
                  background: "transparent", color: "#1a1a1a",
                  border: "1px solid #1a1a1a",
                  cursor: "pointer",
                  minWidth: "160px",
                }}
              >
                Lærer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MULTI-CLASS: Hamburger som global affordance — fixed top-left i viewport,
          udenfor page-wrap. Står alene som signal om "her er der noget mere".
          Kun synlig på desktop; mobil bruger sit eget tab/bottom-sheet system. */}
      {!isMobile && (
        <button
          onClick={() => {
            // Toggle: åben → luk, luk → åben. Når der lukkes, skal evt. omdøb-state nulstilles.
            if (menuAaben) {
              setMenuAaben(false);
              annullerOmdoeb();
            } else {
              setMenuAaben(true);
            }
          }}
          aria-label={menuAaben ? "Luk menu" : `Skift klasse (nuværende: ${klasseNavn}). ${klasser.length} klasse${klasser.length === 1 ? "" : "r"} i alt.`}
          title={menuAaben ? "Luk menu" : "Skift klasse"}
          style={{
            position: "fixed",
            top: "20px", left: "20px",
            width: "44px", height: "44px",
            display: "flex", alignItems: "center", justifyContent: "center",
            background: "transparent", border: "none",
            color: "#1a1a1a", cursor: "pointer",
            borderRadius: 0, padding: 0,
            transition: "background 0.12s",
            // Skal ligge over click-catcher (zIndex 90), så klik på hamburgeren
            // rammer knappen direkte og ikke bliver fanget af baggrunds-overlayet.
            zIndex: 95,
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = "#ece5d4"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
        >
          <Menu size={24} strokeWidth={1.75} />
        </button>
      )}

      <div className="page-wrap" style={{ maxWidth: "1280px", margin: "0 auto", padding: "24px 24px 64px" }}>
        {/* Header */}
        <header style={{ marginBottom: "20px" }}>
          {/* Klassenavn + import/eksport på samme linje */}
          <div style={{
            display: "flex", justifyContent: "space-between",
            alignItems: "center", gap: "16px",
          }}>
            {visning === "klasse" ? (
              <div
                onMouseEnter={() => setKlasseTitelHover(true)}
                onMouseLeave={() => setKlasseTitelHover(false)}
                style={{
                  display: "inline-flex", alignItems: "center", gap: "10px",
                  flex: "0 1 auto", minWidth: 0, maxWidth: "100%",
                }}
              >
                <input
                  ref={klasseTitelRef}
                  className="klasse-titel"
                  type="text"
                  value={klasseNavn}
                  onChange={(e) => setKlasseNavn(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === "Escape") e.target.blur(); }}
                  onFocus={() => setKlasseTitelFocus(true)}
                  onBlur={() => {
                    setKlasseTitelFocus(false);
                    const normaliseret = normaliserKlasse(klasseNavn);
                    if (normaliseret && normaliseret !== klasseNavn) setKlasseNavn(normaliseret);
                  }}
                  title="Klik for at omdøbe"
                  style={{
                    fontFamily: "'Fraunces', Georgia, serif",
                    fontSize: "44px",
                    fontWeight: 600,
                    letterSpacing: "-0.02em",
                    color: "#1a1a1a",
                    background: "transparent",
                    border: "none",
                    borderBottom: klasseTitelFocus
                      ? "1px solid #1a1a1a"
                      : (klasseTitelHover ? "1px dashed #cdc5b8" : "1px dashed transparent"),
                    padding: "0 0 2px",
                    lineHeight: 1,
                    fieldSizing: "content",
                    minWidth: "60px",
                    maxWidth: "100%",
                    transition: "border-color 0.12s",
                  }}
                />
                <Pencil
                  size={16}
                  aria-hidden="true"
                  style={{
                    color: "#cdc5b8",
                    opacity: klasseTitelHover && !klasseTitelFocus ? 1 : 0,
                    transition: "opacity 0.15s",
                    flexShrink: 0,
                  }}
                />
              </div>
            ) : (
              /* MULTI-LAERER: header viser aktiv-lærers navn + lille mål-undertekst */
              <div style={{ display: "flex", flexDirection: "column", gap: "4px", flex: "0 1 auto", minWidth: 0 }}>
                {redigerMigNavn ? (
                  <input
                    autoFocus
                    type="text"
                    value={mig.navn}
                    onChange={(e) => setMig(prev => ({ ...prev, navn: e.target.value }))}
                    onBlur={() => setRedigerMigNavn(false)}
                    onKeyDown={(e) => { if (e.key === "Enter" || e.key === "Escape") setRedigerMigNavn(false); }}
                    className="klasse-titel"
                    style={{
                      fontFamily: "'Fraunces', Georgia, serif",
                      fontSize: "44px", fontWeight: 600,
                      letterSpacing: "-0.02em", color: "#1a1a1a",
                      background: "transparent",
                      border: "none", borderBottom: "1px solid #1a1a1a",
                      padding: "0", lineHeight: 1,
                      outline: "none", fieldSizing: "content",
                      minWidth: "60px", maxWidth: "100%",
                    }}
                  />
                ) : (
                  <button
                    onClick={() => setRedigerMigNavn(true)}
                    className="klasse-titel"
                    style={{
                      fontFamily: "'Fraunces', Georgia, serif",
                      fontSize: "44px", fontWeight: 600,
                      letterSpacing: "-0.02em", color: "#1a1a1a",
                      background: "transparent", border: "none",
                      padding: 0, cursor: "text", textAlign: "left",
                      lineHeight: 1,
                    }}
                    title="Klik for at redigere navn"
                  >
                    {mig.navn || "Min oversigt"}
                  </button>
                )}
                {redigerMigMaal ? (
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <span style={{ fontSize: "13px", color: "#7a7367" }}>Mål:</span>
                    <input
                      autoFocus
                      type="number" min="1" max="40"
                      value={mig.maalLektioner ?? ""}
                      onChange={(e) => setMig(prev => ({ ...prev, maalLektioner: parseInt(e.target.value) || null }))}
                      onBlur={() => setRedigerMigMaal(false)}
                      onKeyDown={(e) => { if (e.key === "Enter" || e.key === "Escape") setRedigerMigMaal(false); }}
                      style={{
                        fontSize: "13px", color: "#1a1a1a",
                        background: "transparent",
                        border: "none", borderBottom: "1px solid #1a1a1a",
                        padding: "1px 4px", outline: "none",
                        width: "50px", fontVariantNumeric: "tabular-nums",
                      }}
                    />
                    <span style={{ fontSize: "13px", color: "#7a7367" }}>lektioner</span>
                  </div>
                ) : (
                  <button
                    onClick={() => setRedigerMigMaal(true)}
                    style={{
                      fontSize: "13px", color: "#7a7367",
                      background: "transparent", border: "none",
                      padding: 0, cursor: "pointer", textAlign: "left",
                      display: "flex", alignItems: "center", gap: "6px",
                    }}
                    title="Klik for at redigere mål"
                  >
                    Mål: {mig.maalLektioner ? `${mig.maalLektioner} lektioner` : "ikke sat"}
                    <Pencil size={11} strokeWidth={1.75} style={{ opacity: 0.5 }} />
                  </button>
                )}
              </div>
            )}
            <div style={{
              display: "flex", gap: "8px",
              flexShrink: 0,
            }}>
              <button
                onClick={() => setShowImport(true)}
                className="header-btn header-io-btn"
                aria-label="Importér"
                title="Importér"
                style={{
                  display: "flex", alignItems: "center", gap: "6px",
                  padding: "8px 12px", fontSize: "13px", fontWeight: 500,
                  background: "transparent", border: "1px solid #1a1a1a",
                  color: "#1a1a1a", borderRadius: "0", cursor: "pointer",
                }}
              >
                <Upload size={14} /> <span className="header-btn-label">Importér</span>
              </button>
              <div style={{ position: "relative" }}>
                <button
                  onClick={() => setEksportMenuAaben(prev => !prev)}
                  className="header-btn header-io-btn"
                  aria-label="Eksportér"
                  aria-expanded={eksportMenuAaben}
                  title="Eksportér"
                  style={{
                    display: "flex", alignItems: "center", gap: "6px",
                    padding: "8px 12px", fontSize: "13px", fontWeight: 500,
                    background: eksportMenuAaben ? "#1a1a1a" : "transparent",
                    color: eksportMenuAaben ? "#f5f1ea" : "#1a1a1a",
                    border: "1px solid #1a1a1a",
                    borderRadius: "0", cursor: "pointer",
                    position: "relative", zIndex: 71,
                  }}
                >
                  <Download size={14} /> <span className="header-btn-label">Eksportér</span>
                  <ChevronDown size={12} style={{
                    transition: "transform 0.15s",
                    transform: eksportMenuAaben ? "rotate(180deg)" : "rotate(0deg)",
                  }} />
                </button>
                {eksportMenuAaben && (
                  <>
                    {/* Click-catcher der lukker dropdown ved klik udenfor */}
                    <div
                      onClick={() => setEksportMenuAaben(false)}
                      style={{ position: "fixed", inset: 0, zIndex: 69 }}
                    />
                    <div
                      role="menu"
                      style={{
                        position: "absolute",
                        top: "calc(100% + 4px)", right: 0,
                        minWidth: "220px",
                        background: "#f5f1ea",
                        border: "1px solid #1a1a1a",
                        zIndex: 70,
                        animation: "panelFadeIn 0.14s ease",
                      }}
                    >
                      <button
                        onClick={eksportSomPDF}
                        role="menuitem"
                        className="eksport-menu-item"
                        style={{
                          display: "flex", alignItems: "center", gap: "10px",
                          width: "100%", padding: "12px 14px",
                          background: "transparent", border: "none",
                          textAlign: "left", cursor: "pointer",
                          fontSize: "13px", color: "#1a1a1a",
                          transition: "background 0.12s",
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = "#ece5d4"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                      >
                        <div style={{
                          fontFamily: "'Fraunces', Georgia, serif",
                          fontSize: "15px", fontWeight: 500, lineHeight: 1.2,
                        }}>
                          Som PDF
                        </div>
                        <div style={{ marginLeft: "auto", fontSize: "11px", color: "#7a7367" }}>
                          print →
                        </div>
                      </button>
                      <div style={{ height: "1px", background: "#e0d9ca" }} />
                      <button
                        onClick={eksportSomJSON}
                        role="menuitem"
                        className="eksport-menu-item"
                        style={{
                          display: "flex", alignItems: "center", gap: "10px",
                          width: "100%", padding: "12px 14px",
                          background: "transparent", border: "none",
                          textAlign: "left", cursor: "pointer",
                          fontSize: "13px", color: "#1a1a1a",
                          transition: "background 0.12s",
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = "#ece5d4"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                      >
                        <div style={{
                          fontFamily: "'Fraunces', Georgia, serif",
                          fontSize: "15px", fontWeight: 500, lineHeight: 1.2,
                        }}>
                          Som data-fil
                        </div>
                        <div style={{ marginLeft: "auto", fontSize: "11px", color: "#7a7367" }}>
                          .json
                        </div>
                      </button>
                    </div>
                  </>
                )}
              </div>
              <button
                onClick={undo}
                disabled={!canUndo}
                className="header-btn header-io-btn"
                aria-label="Fortryd seneste ændring"
                title={canUndo ? "Fortryd (Cmd/Ctrl+Z)" : "Intet at fortryde"}
                style={{
                  display: "flex", alignItems: "center", gap: "6px",
                  padding: "8px 10px", fontSize: "13px",
                  background: "transparent", border: "1px solid #cdc5b8",
                  color: canUndo ? "#7a7367" : "#cdc5b8",
                  borderRadius: "0",
                  cursor: canUndo ? "pointer" : "not-allowed",
                  opacity: canUndo ? 1 : 0.6,
                }}
              >
                <Undo2 size={14} />
              </button>
              <button
                onClick={nulstilAlt}
                className="header-btn header-io-btn"
                aria-label={visning === "laerer" ? `Nulstil ${aktivLaerer?.navn || "lærer"}` : "Nulstil denne klasse"}
                title={visning === "laerer" ? `Nulstil ${aktivLaerer?.navn || "lærer"}` : "Nulstil denne klasse"}
                style={{
                  display: "flex", alignItems: "center", gap: "6px",
                  padding: "8px 10px", fontSize: "13px",
                  background: "transparent", border: "1px solid #cdc5b8",
                  color: "#7a7367", borderRadius: "0", cursor: "pointer",
                }}
              >
                <RotateCcw size={14} />
              </button>
              <button
                onClick={() => setVisHowTo(true)}
                className="header-btn header-io-btn"
                aria-label="Sådan bruger du appen"
                title="Sådan bruger du appen"
                style={{
                  display: "flex", alignItems: "center", gap: "6px",
                  padding: "8px 10px", fontSize: "13px",
                  background: "transparent", border: "1px solid #cdc5b8",
                  color: "#7a7367", borderRadius: "0", cursor: "pointer",
                }}
              >
                <HelpCircle size={14} />
              </button>
            </div>
          </div>
        </header>

        {/* === MOBIL-LAYOUT === */}
        {isMobile && visning === "klasse" && (
          <div style={{ margin: "0 -16px" }}>
            <MobileSummaryBar oversigt={oversigt} fag={fag} fagStatus={fagStatus} />
            <MobileTabs
              tab={mobileTab} setTab={setMobileTab}
              fagAntal={fag.length} laererAntal={oversigt.length}
            />

            {mobileTab === "fag" && (
              <div style={{ padding: "12px 12px 96px" }}>
                {fag.length === 0 ? (
                  <div style={{
                    padding: "48px 24px", textAlign: "center",
                    background: "#fff", border: "1px dashed #cdc5b8",
                    color: "#7a7367",
                  }}>
                    <BookOpen size={28} style={{ marginBottom: "10px", opacity: 0.5 }} />
                    <div style={{ fontSize: "13px" }}>Ingen fag endnu — tap + for at tilføje</div>
                  </div>
                ) : (
                  <div style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(3, 1fr)",
                    gap: "6px",
                  }}>
                    {fag.map((f) => {
                      const statusInfo = fagStatus(f);
                      return (
                        <MobileFagTile
                          key={f.id}
                          f={f}
                          statusInfo={statusInfo}
                          status={statusInfo.status}
                          farve={statusFarver[statusInfo.status]}
                          onTap={() => setMobileSheetFagId(f.id)}
                        />
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {mobileTab === "laerere" && (
              <div style={{ padding: "12px 16px 96px" }}>
                {oversigt.length === 0 ? (
                  <div style={{
                    padding: "48px 24px", textAlign: "center",
                    background: "#fff", border: "1px dashed #cdc5b8",
                    color: "#7a7367",
                  }}>
                    <Users size={28} style={{ marginBottom: "10px", opacity: 0.5 }} />
                    <div style={{ fontSize: "13px" }}>Ingen lærere endnu</div>
                  </div>
                ) : (
                  <div style={{ background: "#fff", border: "1px solid #e0d9ca" }}>
                    {oversigt.map((l, i) => (
                      <div key={l.navn} style={{
                        padding: "12px 16px",
                        borderBottom: i < oversigt.length - 1 ? "1px solid #f0ead9" : "none",
                        display: "flex", alignItems: "center", gap: "12px",
                      }}>
                        <div style={{
                          width: "32px", height: "32px", borderRadius: "50%",
                          background: farveForNavn(l.navn), color: "#fff",
                          fontSize: "13px", fontWeight: 600,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          flexShrink: 0,
                        }}>
                          {l.navn.charAt(0).toUpperCase()}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{
                            fontSize: "14px", fontWeight: 600, color: "#1a1a1a",
                            marginBottom: "2px",
                            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                          }}>
                            {l.navn}
                          </div>
                          <div style={{
                            fontSize: "11px", color: "#7a7367",
                            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                          }}>
                            {l.fag.map(fa => fa.fagNavn).join(" · ")}
                          </div>
                        </div>
                        <div style={{
                          fontFamily: "'Fraunces', Georgia, serif",
                          fontSize: "20px", fontWeight: 600, color: "#1a1a1a",
                        }}>
                          {l.total}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* FAB — kun på fag-tab */}
            {mobileTab === "fag" && (
              <button
                onClick={tilfoejFag}
                aria-label="Tilføj fag"
                style={{
                  position: "fixed",
                  bottom: "24px", right: "24px",
                  width: "56px", height: "56px",
                  borderRadius: "50%",
                  background: "#1a1a1a", color: "#f5f1ea",
                  border: "none", cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  boxShadow: "0 6px 20px rgba(26,26,26,0.28)",
                  zIndex: 40,
                }}
              >
                <Plus size={24} />
              </button>
            )}
          </div>
        )}

        {/* === DESKTOP-LAYOUT === */}
        {!isMobile && visning === "klasse" && (
          <>
        {/* Mobil: kompakt stat-linje */}
        <StatLine
          fag={fag}
          samletLektioner={samletLektioner}
          oversigt={oversigt}
          samletMangler={samletMangler}
          samletOver={samletOver}
        />

        {/* Status bar (desktop): lærere (1/3) + status (2/3) */}
        <div className="stat-bar" style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          gap: "1px", background: "#1a1a1a", border: "1px solid #1a1a1a",
          marginBottom: "24px",
        }}>
          <StatBox label="Lærere på klassen" value={oversigt.length} sub="i alt" />
          <StatBox label="Lektioner" value={samletLektioner} sub="i alt" />
          <StatusBox samletMangler={samletMangler} samletOver={samletOver} antalFag={fag.length} />
        </div>

        {/* Hovedindhold: 2 kolonner — fag fylder, lærer-sidebar er kompakt fast bredde.
            DndContext omslutter begge kolonner så lærere kan trækkes både mellem fag-kort
            og fra sidebaren ind på et fag. */}
        <DndContext
          sensors={sensors}
          collisionDetection={collisionDetectionStrategy}
          measuring={{ droppable: { strategy: MeasuringStrategy.Always } }}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
        <div className="main-grid" style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) 264px", gap: "14px", alignItems: "start" }}>
          {/* Venstre: Fag */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "10px" }}>
              <h2 style={{
                fontFamily: "'Fraunces', Georgia, serif", fontSize: "20px",
                fontWeight: 600, color: "#1a1a1a", margin: 0,
              }}>
                Fag
              </h2>
              <span style={{ fontSize: "12px", color: "#7a7367", fontWeight: 500 }}>
                {fag.length} {fag.length === 1 ? "fag" : "fag"}
              </span>
            </div>

            {fag.length === 0 && (
              <div style={{
                padding: "32px 28px",
                background: "#fff", border: "1px solid #e0d9ca",
              }}>
                <div style={{ textAlign: "center", marginBottom: "20px" }}>
                  <BookOpen size={28} style={{ marginBottom: "10px", opacity: 0.4, color: "#7a7367" }} />
                  {valgtKlassetrin === null ? (
                    <>
                      <div style={{
                        fontFamily: "'Fraunces', Georgia, serif",
                        fontSize: "20px", fontWeight: 500, color: "#1a1a1a",
                        marginBottom: "6px",
                      }}>
                        Vælg klassetrin
                      </div>
                      <div style={{ fontSize: "13px", color: "#7a7367", lineHeight: 1.5 }}>
                        Tilføj selv tysk/fransk og evt. valgfag bagefter.
                      </div>
                    </>
                  ) : (
                    <>
                      <div style={{
                        fontFamily: "'Fraunces', Georgia, serif",
                        fontSize: "20px", fontWeight: 500, color: "#1a1a1a",
                        marginBottom: "6px",
                      }}>
                        Hvor mange lærere er der typisk på et fag?
                      </div>
                      <div style={{ fontSize: "13px", color: "#7a7367", lineHeight: 1.5 }}>
                        Hvert fag i {valgtKlassetrin}. klasse får så mange tomme lærer-pladser klar til at få navne.<br/>
                        Du kan altid justere senere pr. fag.
                      </div>
                    </>
                  )}
                </div>
                {valgtKlassetrin === null ? (
                  <div style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(72px, 1fr))",
                    gap: "8px",
                    marginBottom: "16px",
                  }}>
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((k) => (
                      <button
                        key={k}
                        onClick={() => setValgtKlassetrin(k)}
                        style={{
                          padding: "12px 8px",
                          fontFamily: "'Fraunces', Georgia, serif",
                          fontSize: "16px", fontWeight: 500, color: "#1a1a1a",
                          background: "#f5f1ea", border: "1px solid #e0d9ca",
                          cursor: "pointer",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = "#1a1a1a";
                          e.currentTarget.style.color = "#f5f1ea";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = "#f5f1ea";
                          e.currentTarget.style.color = "#1a1a1a";
                        }}
                      >
                        {k}.
                      </button>
                    ))}
                  </div>
                ) : (
                  <div style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(3, 1fr)",
                    gap: "8px",
                    marginBottom: "16px",
                    maxWidth: "320px",
                    margin: "0 auto 16px",
                  }}>
                    {[1, 2, 3].map((n) => (
                      <button
                        key={n}
                        onClick={() => indlaesSkabelon(valgtKlassetrin, n)}
                        style={{
                          padding: "16px 8px",
                          fontFamily: "'Fraunces', Georgia, serif",
                          fontSize: "20px", fontWeight: 500, color: "#1a1a1a",
                          background: "#f5f1ea", border: "1px solid #e0d9ca",
                          cursor: "pointer",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = "#1a1a1a";
                          e.currentTarget.style.color = "#f5f1ea";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = "#f5f1ea";
                          e.currentTarget.style.color = "#1a1a1a";
                        }}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                )}
                <div style={{
                  textAlign: "center", fontSize: "12px", color: "#7a7367",
                  paddingTop: "16px", borderTop: "1px solid #f0ead9",
                }}>
                  {valgtKlassetrin === null ? (
                    <>
                      eller{" "}
                      <button
                        onClick={tilfoejFag}
                        style={{
                          background: "transparent", border: "none",
                          color: "#7a7367", cursor: "pointer",
                          fontSize: "12px", textDecoration: "underline",
                          padding: 0,
                        }}
                      >
                        start tom og byg selv
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => setValgtKlassetrin(null)}
                      style={{
                        background: "transparent", border: "none",
                        color: "#7a7367", cursor: "pointer",
                        fontSize: "12px", textDecoration: "underline",
                        padding: 0,
                      }}
                    >
                      ← tilbage og vælg andet klassetrin
                    </button>
                  )}
                </div>
              </div>
            )}

              <SortableContext items={fag.map((f) => f.id)} strategy={rectSortingStrategy}>
                <div className="fag-grid" style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
                  gap: "14px",
                  alignItems: "start",
                }}>
                  {fag.map((f) => {
                    const statusInfo = fagStatus(f);
                    const status = statusInfo.status;
                    const farve = statusFarver[status];
                    const erUdfoldet = udfoldede.has(f.id);
                    return (
                      <SortableFagCard
                        key={f.id}
                        f={f}
                        statusInfo={statusInfo}
                        status={status}
                        farve={farve}
                        erUdfoldet={erUdfoldet}
                        toggleUdfoldet={toggleUdfoldet}
                        opdaterFag={opdaterFag}
                        sletFag={sletFag}
                        tilfoejLaerer={tilfoejLaerer}
                        opdaterLaerer={opdaterLaerer}
                        sletLaerer={sletLaerer}
                        eksisterendeLaerere={eksisterendeLaerere}
                      />
                    );
                  })}
                </div>
              </SortableContext>


            <button
              onClick={tilfoejFag}
              className="add-fag-btn"
              data-no-print="true"
              style={{
                marginTop: "16px", width: "100%", padding: "14px",
                fontSize: "14px", fontWeight: 500, color: "#1a1a1a",
                background: "transparent", border: "1px dashed #1a1a1a",
                cursor: "pointer", display: "flex", alignItems: "center",
                justifyContent: "center", gap: "8px",
              }}
            >
              <Plus size={16} /> Tilføj fag
            </button>
          </div>

          {/* Højre: Lærer-oversigt */}
          <aside className="laerere-aside" style={{ position: "sticky", top: "24px" }}>
            <div style={{
              display: "flex", justifyContent: "space-between", alignItems: "baseline",
              padding: "0 14px", marginBottom: "4px",
            }}>
              <h2 style={{
                fontFamily: "'Fraunces', Georgia, serif", fontSize: "20px",
                fontWeight: 600, color: "#1a1a1a", margin: 0,
              }}>
                Lærere
              </h2>
              <span style={{ fontSize: "12px", color: "#7a7367", fontWeight: 500 }}>
                {oversigt.length} i alt
              </span>
            </div>

            <div style={{ background: "transparent" }}>
              {oversigt.length === 0 && !tilfoejNavnAaben ? (
                <div style={{ padding: "32px 14px", textAlign: "center", color: "#7a7367" }}>
                  <Users size={24} style={{ marginBottom: "8px", opacity: 0.5 }} />
                  <div style={{ fontSize: "13px" }}>Ingen lærere endnu</div>
                </div>
              ) : (
                oversigt.map((l) => (
                  <SidebarLaererRow key={l.navn} l={l} />
                ))
              )}
            </div>

            {/* Tilføj lærer-flow: knap åbner input. Enter → tilføjer til
                pendingNavne og resetter feltet for hurtigt at indtaste flere
                navne i træk. Esc eller blur uden tekst → lukker input. */}
            <div style={{ marginTop: "10px", padding: "0 14px" }}>
              {tilfoejNavnAaben ? (
                <input
                  autoFocus
                  type="text"
                  value={nytLaererNavn}
                  onChange={(e) => setNytLaererNavn(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      const navn = normalizeNavn(nytLaererNavn);
                      if (navn) {
                        // Skip hvis navnet allerede findes (på fag eller pending)
                        const findes =
                          pendingNavne.some((n) => normalizeNavn(n).toLowerCase() === navn.toLowerCase()) ||
                          fag.some((f) => f.laerere.some((l) => normalizeNavn(l.navn).toLowerCase() === navn.toLowerCase()));
                        if (!findes) {
                          setPendingNavne([...pendingNavne, navn]);
                        }
                      }
                      setNytLaererNavn("");
                    } else if (e.key === "Escape") {
                      setTilfoejNavnAaben(false);
                      setNytLaererNavn("");
                    }
                  }}
                  onBlur={() => {
                    // Luk hvis feltet er tomt
                    if (!nytLaererNavn.trim()) {
                      setTilfoejNavnAaben(false);
                    }
                  }}
                  placeholder="Lærerens navn — tryk enter"
                  style={{
                    width: "100%", padding: "8px 10px",
                    fontSize: "13px", color: "#1a1a1a",
                    background: "#fff", border: "1px solid #1a1a1a",
                  }}
                />
              ) : (
                <button
                  onClick={() => setTilfoejNavnAaben(true)}
                  className="add-laerer-btn"
                  data-no-print="true"
                  style={{
                    width: "100%", padding: "8px 10px",
                    fontSize: "13px", fontWeight: 500, color: "#7a7367",
                    background: "transparent", border: "1px dashed #cdc5b8",
                    cursor: "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center", gap: "6px",
                  }}
                >
                  <Plus size={12} /> Tilføj lærer
                </button>
              )}
            </div>
          </aside>
        </div>
        {/* DragOverlay sikrer at trukket lærer altid er øverst, også over inputs */}
        <DragOverlay dropAnimation={null}>
          {activeDragLaerer ? (
            <div style={{
              display: "inline-flex", alignItems: "center", gap: "8px",
              cursor: "grabbing",
              filter: "drop-shadow(0 6px 14px rgba(0,0,0,0.18))",
            }}>
              <div style={{
                width: "22px", height: "22px", borderRadius: "50%",
                background: farveForNavn(activeDragLaerer.navn),
                color: "#fff", fontSize: "11px", fontWeight: 600,
                display: "flex", alignItems: "center", justifyContent: "center",
                flexShrink: 0,
              }}>
                {activeDragLaerer.navn ? activeDragLaerer.navn.charAt(0).toUpperCase() : "?"}
              </div>
              <span style={{
                fontSize: "13px", fontWeight: 500, color: "#1a1a1a",
                fontStyle: "normal",
                whiteSpace: "nowrap",
              }}>
                {activeDragLaerer.navn}
              </span>
            </div>
          ) : null}
        </DragOverlay>
        </DndContext>
          </>
        )}

        {/* === LÆRER-VISNING === */}
        {visning === "laerer" && aktivLaerer && (
          <>
            {/* Status-bar */}
            <div className="stat-bar" style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr",
              gap: "1px", background: "#1a1a1a", border: "1px solid #1a1a1a",
              marginBottom: "24px",
            }}>
              <StatBox label="Klasser" value={migAntalKlasser} sub={migAntalKlasser === 1 ? "klasse" : "klasser"} />
              <StatBox label="Lektioner" value={migSamletLektioner} sub="i alt" />
              <MinManglerBox mangler={migMangler} maal={mig.maalLektioner} antalFag={mig.fag.length} />
            </div>

            <DndContext
              sensors={sensors}
              collisionDetection={collisionMinStrategy}
              measuring={{ droppable: { strategy: MeasuringStrategy.Always } }}
              onDragStart={handleMinDragStart}
              onDragEnd={handleMinDragEnd}
            >
              <div className="main-grid" style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) 264px", gap: "14px", alignItems: "start" }}>
                {/* Venstre: dine fag */}
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "10px" }}>
                    <h2 style={{
                      fontFamily: "'Fraunces', Georgia, serif", fontSize: "20px",
                      fontWeight: 600, color: "#1a1a1a", margin: 0,
                    }}>
                      Mine fag
                    </h2>
                    <span style={{ fontSize: "12px", color: "#7a7367", fontWeight: 500 }}>
                      {mig.fag.length} fag
                    </span>
                  </div>
                  <SortableContext items={mig.fag.map(f => f.id)} strategy={rectSortingStrategy}>
                    <div className="fag-grid" style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
                      gap: "14px",
                      alignItems: "start",
                    }}>
                      {mig.fag.map((f) => (
                        <MinFagCard
                          key={f.id}
                          f={f}
                          opdater={(felt, vaerdi) => opdaterMigFag(f.id, felt, vaerdi)}
                          slet={() => sletMigFag(f.id)}
                        />
                      ))}
                    </div>
                  </SortableContext>
                  <button
                    onClick={tilfoejMigFag}
                    className="add-fag-btn"
                    data-no-print="true"
                    style={{
                      marginTop: "16px", width: "100%", padding: "14px",
                      fontSize: "14px", fontWeight: 500, color: "#1a1a1a",
                      background: "transparent", border: "1px dashed #1a1a1a",
                      cursor: "pointer", display: "flex", alignItems: "center",
                      justifyContent: "center", gap: "8px",
                    }}
                  >
                    <Plus size={16} /> Tilføj fag
                  </button>
                </div>

                {/* Højre: klasser (draggable rows + tilføj klasse-flow) */}
                <aside className="laerere-aside" style={{ position: "sticky", top: "24px" }}>
                  <div style={{
                    display: "flex", justifyContent: "space-between", alignItems: "baseline",
                    padding: "0 14px", marginBottom: "4px",
                  }}>
                    <h2 style={{
                      fontFamily: "'Fraunces', Georgia, serif", fontSize: "20px",
                      fontWeight: 600, color: "#1a1a1a", margin: 0,
                    }}>
                      Klasser
                    </h2>
                    <span style={{ fontSize: "12px", color: "#7a7367", fontWeight: 500 }}>
                      {migAntalKlasser + pendingKlasser.length} i alt
                    </span>
                  </div>
                  {(migOversigt.length === 0 && pendingKlasser.length === 0) && (
                    <div style={{
                      padding: "16px 14px", fontSize: "13px",
                      color: "#7a7367", fontStyle: "italic",
                    }}>
                      Tilføj klasser herunder eller skriv direkte i et fag-kort.
                    </div>
                  )}
                  {migOversigt.map((k) => (
                    <SidebarKlasseRow
                      key={k.klasse}
                      klasse={k.klasse}
                      total={k.total}
                      fag={k.fag}
                    />
                  ))}
                  {pendingKlasser.map((klasse) => (
                    <SidebarKlasseRow
                      key={`pending:${klasse}`}
                      klasse={klasse}
                      total={0}
                      fag={[]}
                      pending
                    />
                  ))}
                  <div data-no-print="true" style={{ padding: "12px 14px 0" }}>
                    {tilfoejKlasseAaben ? (
                      <input
                        autoFocus
                        type="text"
                        value={nyKlasseInput}
                        onChange={(e) => setNyKlasseInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") tilfoejPendingKlasse();
                          if (e.key === "Escape") {
                            setTilfoejKlasseAaben(false);
                            setNyKlasseInput("");
                          }
                        }}
                        onBlur={() => {
                          if (nyKlasseInput.trim()) tilfoejPendingKlasse();
                          setTilfoejKlasseAaben(false);
                        }}
                        placeholder="fx 9.S"
                        className="add-laerer-btn"
                        style={{
                          width: "100%", padding: "8px 10px",
                          fontSize: "13px", color: "#1a1a1a",
                          background: "#fff", border: "1px solid #1a1a1a",
                          outline: "none", boxSizing: "border-box",
                        }}
                      />
                    ) : (
                      <button
                        onClick={() => setTilfoejKlasseAaben(true)}
                        className="add-laerer-btn"
                        style={{
                          width: "100%", padding: "8px 10px",
                          fontSize: "13px", fontWeight: 500, color: "#7a7367",
                          background: "transparent", border: "1px dashed #cdc5b8",
                          cursor: "pointer",
                          display: "flex", alignItems: "center", justifyContent: "center", gap: "6px",
                        }}
                      >
                        <Plus size={12} /> Tilføj klasse
                      </button>
                    )}
                  </div>
                </aside>
              </div>
              {/* DragOverlay: viser den klasse-chip der trækkes — samme stil som
                  lærer-overlay i klasse-visning (ingen baggrund, kun avatar + navn). */}
              <DragOverlay dropAnimation={null}>
                {activeMinDrag && typeof activeMinDrag === "string" && activeMinDrag.startsWith("klasse:") ? (
                  <div style={{
                    display: "inline-flex", alignItems: "center", gap: "8px",
                    cursor: "grabbing",
                    filter: "drop-shadow(0 6px 14px rgba(0,0,0,0.18))",
                  }}>
                    <div style={{
                      width: "22px", height: "22px", borderRadius: "50%",
                      background: farveForKlasse(activeMinDrag.slice("klasse:".length)),
                      color: "#fff", fontSize: "11px", fontWeight: 600,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      flexShrink: 0,
                      letterSpacing: "-0.02em",
                    }}>
                      {klasseAvatarTekst(activeMinDrag.slice("klasse:".length))}
                    </div>
                    <span style={{
                      fontSize: "13px", fontWeight: 500, color: "#1a1a1a",
                      fontStyle: "normal",
                      whiteSpace: "nowrap",
                    }}>
                      {activeMinDrag.slice("klasse:".length)}
                    </span>
                  </div>
                ) : null}
              </DragOverlay>
            </DndContext>
          </>
        )}
      </div>

      {/* Mobile bottom-sheet for fag-redigering */}
      {isMobile && mobileSheetFagId !== null && (() => {
        const f = fag.find((x) => x.id === mobileSheetFagId);
        if (!f) return null;
        const statusInfo = fagStatus(f);
        return (
          <MobileFagSheet
            f={f}
            statusInfo={statusInfo}
            status={statusInfo.status}
            farve={statusFarver[statusInfo.status]}
            opdaterFag={opdaterFag}
            sletFag={(id) => { sletFag(id); setMobileSheetFagId(null); }}
            tilfoejLaerer={tilfoejLaerer}
            opdaterLaerer={opdaterLaerer}
            sletLaerer={sletLaerer}
            eksisterendeLaerere={eksisterendeLaerere}
            onClose={() => setMobileSheetFagId(null)}
          />
        );
      })()}

      {/* Import modal */}
      {showImport && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(26,26,26,0.6)",
          display: "flex", alignItems: "center", justifyContent: "center",
          padding: "24px", zIndex: 50,
        }}>
          <div style={{
            background: "#f5f1ea", maxWidth: "480px", width: "100%",
            border: "1px solid #1a1a1a",
          }}>
            <div style={{
              padding: "16px 20px", borderBottom: "1px solid #e0d9ca",
              display: "flex", justifyContent: "space-between", alignItems: "center",
            }}>
              <h3 style={{
                fontFamily: "'Fraunces', Georgia, serif", fontSize: "20px",
                fontWeight: 600, margin: 0,
              }}>
                Importér fagfordeling
              </h3>
              <button
                onClick={() => { setShowImport(false); setImportFejl(""); }}
                style={{ background: "transparent", border: "none", cursor: "pointer", padding: "4px" }}
              >
                <X size={18} />
              </button>
            </div>
            <div style={{ padding: "20px" }}>
              <p style={{ fontSize: "13px", color: "#7a7367", marginTop: 0, marginBottom: "16px" }}>
                Vælg en tidligere eksporteret fagfordelings-fil (.json).
                Den nuværende klasse bliver erstattet.
              </p>
              <input
                ref={importFilRef}
                type="file" accept=".json,application/json"
                onChange={haandterFil}
                style={{ display: "none" }}
              />
              <button
                onClick={() => importFilRef.current?.click()}
                style={{
                  width: "100%", padding: "14px 16px", fontSize: "14px", fontWeight: 500,
                  background: "#1a1a1a", border: "1px solid #1a1a1a", color: "#f5f1ea",
                  cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
                }}
              >
                <Upload size={16} /> Vælg arkiv
              </button>
              {importFejl && (
                <div style={{
                  marginTop: "12px", padding: "10px 12px",
                  background: "#fbe9e7", border: "1px solid #c9442f",
                  fontSize: "12px", color: "#7a2517",
                }}>
                  {importFejl}
                </div>
              )}
              <div style={{ display: "flex", gap: "8px", marginTop: "16px", justifyContent: "flex-end" }}>
                <button
                  onClick={() => { setShowImport(false); setImportFejl(""); }}
                  style={{
                    padding: "10px 16px", fontSize: "13px", fontWeight: 500,
                    background: "transparent", border: "1px solid #1a1a1a",
                    color: "#1a1a1a", cursor: "pointer",
                  }}
                >
                  Annullér
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MULTI-CLASS: Klasse-menu — minimal, ingen chrome.
          Backdrop dæmper baggrunden let; panelet selv har samme cremefarve som siden,
          så det føles som indhold der glider ind, ikke en kasse der lægger sig ovenpå.
          Ingen borders, shadows eller dividers — kun whitespace og typografi. */}
      {menuAaben && (
        <div
          onClick={() => { setMenuAaben(false); annullerOmdoeb(); }}
          style={{
            // Usynlig click-catcher: dækker siden, men ingen wash, ingen blur,
            // ingen dim. Klik et hvilket som helst sted lukker menuen.
            position: "fixed", inset: 0,
            background: "transparent",
            zIndex: 90,
          }}
          onKeyDown={(e) => { if (e.key === "Escape") setMenuAaben(false); }}
        >
          <aside
            onClick={(e) => e.stopPropagation()}
            className="klasse-menu-aside"
            style={{
              position: "fixed", top: 0, left: 0, bottom: 0,
              width: "240px", maxWidth: "70vw",
              background: "transparent",
              borderRight: "1px solid #e0d9ca",
              display: "flex", flexDirection: "column",
              animation: "panelFadeIn 0.18s ease",
              zIndex: 91,
              padding: "80px 0 32px",
            }}
          >
            {/* KLASSER-sektion — flex: 1 når foldet ud, flex: none når foldet ind */}
            <div style={{
              flex: klasserKollapset ? "none" : 1,
              display: "flex", flexDirection: "column", minHeight: 0,
            }}>
            {/* Eyebrow — klik for at folde sektionen ind/ud */}
            <button
              onClick={() => setKlasserKollapset((v) => !v)}
              style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                fontSize: "11px", letterSpacing: "0.14em", textTransform: "uppercase",
                color: "#1a1a1a", fontWeight: 700, fontFamily: "inherit",
                padding: "4px 24px",
                marginBottom: "8px",
                width: "100%",
                background: "transparent", border: "none",
                cursor: "pointer", textAlign: "left",
              }}
              aria-expanded={!klasserKollapset}
              aria-label={klasserKollapset ? "Vis klasser" : "Skjul klasser"}
            >
              <span>Klasser</span>
              <ChevronDown
                size={11}
                style={{
                  transform: klasserKollapset ? "rotate(-90deg)" : "rotate(0deg)",
                  transition: "transform 0.15s ease",
                  flexShrink: 0,
                }}
              />
            </button>

            {/* Klasse-liste — skjules ved kollaps, scroller internt ellers */}
            <div style={{
              flex: 1, overflowY: "auto", minHeight: 0,
              display: klasserKollapset ? "none" : "block",
            }}>
              {[...klasser].sort((a, b) => {
                // Sortér: ciffer-præfix først (lavest tal øverst), derefter
                // bogstavet. Klasser uden "C.B"-format ryger sidst alfabetisk.
                const ka = (a.navn || "").trim().match(/^(\d+)\.?([a-zæøåA-ZÆØÅ])?/);
                const kb = (b.navn || "").trim().match(/^(\d+)\.?([a-zæøåA-ZÆØÅ])?/);
                if (ka && !kb) return -1;
                if (!ka && kb) return 1;
                if (ka && kb) {
                  const na = parseInt(ka[1], 10);
                  const nb = parseInt(kb[1], 10);
                  if (na !== nb) return na - nb;
                  const la = (ka[2] || "").toUpperCase();
                  const lb = (kb[2] || "").toUpperCase();
                  if (la !== lb) return la.localeCompare(lb, "da");
                }
                return (a.navn || "").localeCompare(b.navn || "", "da");
              }).map((k) => {
                const erAktiv = k.id === aktivKlasseId;
                const erUnderOmdoeb = k.id === omdoeberKlasseId;
                const fagAntal = k.fag.length;
                return (
                  <div
                    key={k.id}
                    className={`klasse-menu-row${erAktiv ? " aktiv" : ""}`}
                    style={{
                      display: "flex", alignItems: "center",
                      padding: "8px 24px",
                      cursor: erUnderOmdoeb ? "default" : "pointer",
                      gap: "12px",
                      minHeight: "36px",
                    }}
                    onClick={() => { if (!erUnderOmdoeb) skiftAktivKlasse(k.id); }}
                  >
                    {erUnderOmdoeb ? (
                      <input
                        autoFocus
                        type="text"
                        value={omdoebNavn}
                        onChange={(e) => setOmdoebNavn(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") gemOmdoeb();
                          if (e.key === "Escape") annullerOmdoeb();
                        }}
                        onClick={(e) => e.stopPropagation()}
                        onBlur={gemOmdoeb}
                        style={{
                          flex: 1,
                          fontSize: "13px", fontWeight: 600, color: "#1a1a1a",
                          background: "transparent",
                          border: "none",
                          borderBottom: "1px solid #1a1a1a",
                          padding: "2px 0",
                          outline: "none",
                          minWidth: 0,
                        }}
                      />
                    ) : (
                      <>
                        <span className="klasse-menu-navn" style={{
                          flex: 1, minWidth: 0,
                          fontSize: "13px", fontWeight: 600,
                          color: "#7a7367",
                          transition: "color 0.12s",
                          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                        }}>
                          {k.navn}
                        </span>
                        <div className="klasse-menu-actions" style={{
                          display: "flex", gap: "4px",
                          opacity: 0,
                          transition: "opacity 0.15s",
                          flexShrink: 0,
                        }}>
                          <button
                            onClick={(e) => { e.stopPropagation(); startOmdoeb(k); }}
                            aria-label={`Omdøb ${k.navn}`}
                            title="Omdøb"
                            style={{
                              background: "transparent", border: "none",
                              color: "#7a7367",
                              cursor: "pointer", padding: "2px",
                              display: "flex",
                            }}
                          >
                            <Pencil size={12} />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); sletKlasse(k); }}
                            aria-label={`Slet ${k.navn}`}
                            title="Slet klasse"
                            style={{
                              background: "transparent", border: "none",
                              color: "#7a7367",
                              cursor: "pointer",
                              padding: "2px",
                              display: "flex",
                            }}
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            {/* "+ Tilføj klasse" — sidder lige under sidste entry, scroller
                med listen. Input ved klik bruger samme bottom-border-line. */}
            {hamburgerNyKlasseAaben ? (
              <div style={{
                display: "flex", alignItems: "center",
                padding: "8px 24px",
                gap: "12px",
                minHeight: "36px",
              }}>
                <input
                  autoFocus
                  type="text"
                  value={hamburgerNyKlasseNavn}
                  onChange={(e) => setHamburgerNyKlasseNavn(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      tilfoejKlasse(hamburgerNyKlasseNavn);
                    } else if (e.key === "Escape") {
                      setHamburgerNyKlasseAaben(false);
                      setHamburgerNyKlasseNavn("");
                    }
                  }}
                  onBlur={() => {
                    if (hamburgerNyKlasseNavn.trim()) {
                      tilfoejKlasse(hamburgerNyKlasseNavn);
                    } else {
                      setHamburgerNyKlasseAaben(false);
                    }
                  }}
                  style={{
                    flex: 1,
                    fontSize: "13px", fontWeight: 600, color: "#1a1a1a",
                    background: "transparent",
                    border: "none",
                    borderBottom: "1px solid #1a1a1a",
                    padding: "2px 0",
                    outline: "none",
                    minWidth: 0,
                  }}
                />
              </div>
            ) : (
              <button
                onClick={() => { setHamburgerNyKlasseAaben(true); setHamburgerNyKlasseNavn(""); }}
                className="klasse-menu-add"
                style={{
                  display: "flex", alignItems: "center",
                  gap: "8px",
                  padding: "6px 24px",
                  minHeight: "30px",
                  marginTop: "4px",
                  width: "100%",
                  fontSize: "12px", fontWeight: 500,
                  color: "#cdc5b8",
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  textAlign: "left",
                }}
              >
                <Plus size={12} /> Tilføj klasse
              </button>
            )}
            </div>
            </div>

            {/* LÆRERE-sektion — flex: 1 når foldet ud, flex: none når foldet ind */}
            <div style={{
              flex: laerereKollapset ? "none" : 1,
              display: "flex", flexDirection: "column", minHeight: 0, marginTop: "32px",
            }}>
            <button
              onClick={() => setLaerereKollapset((v) => !v)}
              style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                fontSize: "11px", letterSpacing: "0.14em", textTransform: "uppercase",
                color: "#1a1a1a", fontWeight: 700, fontFamily: "inherit",
                padding: "4px 24px",
                marginBottom: "8px",
                width: "100%",
                background: "transparent", border: "none",
                cursor: "pointer", textAlign: "left",
              }}
              aria-expanded={!laerereKollapset}
              aria-label={laerereKollapset ? "Vis lærere" : "Skjul lærere"}
            >
              <span>Lærere</span>
              <ChevronDown
                size={11}
                style={{
                  transform: laerereKollapset ? "rotate(-90deg)" : "rotate(0deg)",
                  transition: "transform 0.15s ease",
                  flexShrink: 0,
                }}
              />
            </button>

            {/* Lærer-liste — skjules ved kollaps, scroller internt ellers */}
            <div style={{
              flex: 1, overflowY: "auto", minHeight: 0,
              display: laerereKollapset ? "none" : "block",
            }}>
              {laerere.map((l) => {
                const erAktiv = l.id === aktivLaererId && visning === "laerer";
                const erUnderOmdoeb = l.id === omdoeberLaererId;
                const fagAntal = l.fag.length;
                return (
                  <div
                    key={l.id}
                    className={`klasse-menu-row${erAktiv ? " aktiv" : ""}`}
                    style={{
                      display: "flex", alignItems: "center",
                      padding: "8px 24px",
                      cursor: erUnderOmdoeb ? "default" : "pointer",
                      gap: "12px",
                      minHeight: "36px",
                    }}
                    onClick={() => { if (!erUnderOmdoeb) skiftAktivLaerer(l.id); }}
                  >
                    {erUnderOmdoeb ? (
                      <input
                        autoFocus
                        type="text"
                        value={omdoebLaererNavn}
                        onChange={(e) => setOmdoebLaererNavn(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") omdoebLaerer(l.id, omdoebLaererNavn);
                          if (e.key === "Escape") { setOmdoeberLaererId(null); setOmdoebLaererNavn(""); }
                        }}
                        onClick={(e) => e.stopPropagation()}
                        onBlur={() => omdoebLaerer(l.id, omdoebLaererNavn)}
                        style={{
                          flex: 1,
                          fontSize: "13px", fontWeight: 600, color: "#1a1a1a",
                          background: "transparent",
                          border: "none",
                          borderBottom: "1px solid #1a1a1a",
                          padding: "2px 0",
                          outline: "none",
                          minWidth: 0,
                        }}
                      />
                    ) : (
                      <>
                        <span className="klasse-menu-navn" style={{
                          flex: 1, minWidth: 0,
                          fontSize: "13px", fontWeight: 600,
                          color: "#7a7367",
                          transition: "color 0.12s",
                          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                        }}>
                          {l.navn}
                        </span>
                        <div className="klasse-menu-actions" style={{
                          display: "flex", gap: "4px",
                          opacity: 0,
                          transition: "opacity 0.15s",
                          flexShrink: 0,
                        }}>
                          <button
                            onClick={(e) => { e.stopPropagation(); setOmdoeberLaererId(l.id); setOmdoebLaererNavn(l.navn); }}
                            aria-label={`Omdøb ${l.navn}`}
                            title="Omdøb"
                            style={{
                              background: "transparent", border: "none",
                              color: "#7a7367",
                              cursor: "pointer", padding: "2px",
                              display: "flex",
                            }}
                          >
                            <Pencil size={12} />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); sletLaererHelt(l.id); }}
                            aria-label={`Slet ${l.navn}`}
                            title="Slet lærer"
                            style={{
                              background: "transparent", border: "none",
                              color: "#7a7367",
                              cursor: "pointer", padding: "2px",
                              display: "flex",
                            }}
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            {/* "+ Tilføj lærer" — sidder lige under sidste entry, scroller med listen */}
            {hamburgerNyLaererAaben ? (
              <div style={{
                display: "flex", alignItems: "center",
                padding: "8px 24px",
                gap: "12px",
                minHeight: "36px",
              }}>
                <input
                  autoFocus
                  type="text"
                  value={hamburgerNyLaererNavn}
                  onChange={(e) => setHamburgerNyLaererNavn(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      tilfoejNyLaerer(hamburgerNyLaererNavn);
                    } else if (e.key === "Escape") {
                      setHamburgerNyLaererAaben(false);
                      setHamburgerNyLaererNavn("");
                    }
                  }}
                  onBlur={() => {
                    if (hamburgerNyLaererNavn.trim()) {
                      tilfoejNyLaerer(hamburgerNyLaererNavn);
                    } else {
                      setHamburgerNyLaererAaben(false);
                    }
                  }}
                  style={{
                    flex: 1,
                    fontSize: "13px", fontWeight: 600, color: "#1a1a1a",
                    background: "transparent",
                    border: "none",
                    borderBottom: "1px solid #1a1a1a",
                    padding: "2px 0",
                    outline: "none",
                    minWidth: 0,
                  }}
                />
              </div>
            ) : (
              <button
                onClick={() => { setHamburgerNyLaererAaben(true); setHamburgerNyLaererNavn(""); }}
                className="klasse-menu-add"
                style={{
                  display: "flex", alignItems: "center",
                  gap: "8px",
                  padding: "6px 24px",
                  minHeight: "30px",
                  marginTop: "4px",
                  width: "100%",
                  fontSize: "12px", fontWeight: 500,
                  color: "#cdc5b8",
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  textAlign: "left",
                }}
              >
                <Plus size={12} /> Tilføj lærer
              </button>
            )}
            </div>
            </div>
          </aside>
        </div>
      )}

      {/* How-to modal — kort guide til hvordan appen bruges */}
      {visHowTo && <HowToModal onLuk={() => setVisHowTo(false)} />}

      {/* Bekræftelses-modal for sletninger */}
      {bekraeftSlet && (
        <ConfirmModal
          titel={bekraeftSlet.titel}
          tekst={bekraeftSlet.tekst}
          bekraeftTekst={bekraeftSlet.bekraeftTekst}
          onBekraeft={bekraeftSlet.onConfirm}
          onAnnuller={() => setBekraeftSlet(null)}
          farligt
        />
      )}

      {/* Toast: gem-fejl (localStorage quota / Safari Privat) */}
      {gemFejlet && (
        <div
          role="status"
          style={{
            position: "fixed",
            bottom: "20px",
            left: "50%",
            transform: "translateX(-50%)",
            background: "#1a1a1a",
            color: "#f5f1ea",
            padding: "12px 18px",
            fontSize: "13px",
            fontWeight: 500,
            display: "flex",
            alignItems: "center",
            gap: "10px",
            boxShadow: "0 8px 24px rgba(0,0,0,0.18)",
            zIndex: 1000,
            animation: "fadeIn 0.2s ease",
            maxWidth: "90vw",
          }}
        >
          <AlertCircle size={16} />
          <span>Kunne ikke gemme — eksportér som backup eller frigør plads.</span>
          <button
            onClick={() => setGemFejlet(false)}
            aria-label="Luk"
            style={{
              background: "transparent",
              border: "none",
              color: "#f5f1ea",
              cursor: "pointer",
              padding: "0 0 0 6px",
              display: "flex",
              alignItems: "center",
            }}
          >
            <X size={14} />
          </button>
        </div>
      )}
    </div>
  );
}

// MIN-OVERSIGT: stat-box til "Mangler" — viser mål-undertekst og håndterer over/under-states.
function MinManglerBox({ mangler, maal, antalFag }) {
  let label = "Mangler";
  let hovedTal;
  let undertekst;
  let talFarve = "#1a1a1a";
  if (maal === null || maal === undefined) {
    label = "Mål";
    hovedTal = "—";
    undertekst = "Sæt et mål i headeren";
    talFarve = "#7a7367";
  } else if (antalFag === 0) {
    hovedTal = maal;
    undertekst = "Tilføj fag for at fordele";
    talFarve = "#7a7367";
  } else if (mangler > 0) {
    hovedTal = mangler;
    undertekst = mangler === 1 ? `1 lektion mangler · mål ${maal}` : `${mangler} lektioner mangler · mål ${maal}`;
  } else if (mangler < 0) {
    label = "Over";
    hovedTal = -mangler;
    undertekst = -mangler === 1 ? `1 over mål ${maal}` : `${-mangler} over mål ${maal}`;
    talFarve = "#a07820";
  } else {
    hovedTal = 0;
    undertekst = `Du har præcis ${maal}. Det går op.`;
    talFarve = "#3d7a4e";
  }
  return (
    <div style={{ background: "#f5f1ea", padding: "14px 20px" }}>
      <div style={{
        fontSize: "11px", letterSpacing: "0.1em", textTransform: "uppercase",
        color: "#7a7367", fontWeight: 500, marginBottom: "4px",
      }}>
        {label}
      </div>
      <div style={{
        fontFamily: "'Fraunces', Georgia, serif", fontSize: "28px",
        fontWeight: 600, color: talFarve, lineHeight: 1, marginBottom: "2px",
      }}>
        {hovedTal}
      </div>
      <div style={{ fontSize: "12px", color: "#7a7367" }}>{undertekst}</div>
    </div>
  );
}

// MIN-OVERSIGT: sidebar-række for en klasse — draggable mod fag-kort.
// ID format "klasse:<navn>" så drag-handler kan skille det fra fag-id'er.
// Pending klasser vises mere dæmpet (total = 0, ingen chips).
function SidebarKlasseRow({ klasse, total, fag, pending = false }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `klasse:${klasse}`,
  });
  return (
    <div
      ref={setNodeRef}
      {...attributes}
      className="laerer-item"
      style={{
        padding: "10px 14px",
        opacity: isDragging ? 0.4 : 1,
      }}
    >
      <div className="laerer-item-row" style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        gap: "10px", marginBottom: "2px",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: 0, flex: 1 }}>
          <div
            {...listeners}
            className="laerer-avatar"
            style={{
              width: "24px", height: "24px", borderRadius: "50%",
              background: farveForKlasse(klasse), color: "#fff",
              fontSize: "11px", fontWeight: 600,
              display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0,
              letterSpacing: "-0.02em",
              cursor: "grab", touchAction: "none",
            }}
          >
            {klasseAvatarTekst(klasse)}
          </div>
          <span className="laerer-navn" style={{
            fontSize: "13px", fontWeight: 600,
            color: pending ? "#7a7367" : "#1a1a1a",
            lineHeight: 1.2,
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          }}>
            {klasse}
          </span>
        </div>
        <span className="laerer-total" style={{
          fontSize: "13px", fontWeight: 500,
          color: pending ? "#cdc5b8" : "#1a1a1a",
          fontVariantNumeric: "tabular-nums",
          flexShrink: 0,
        }}>
          {total}
        </span>
      </div>
      {fag.length > 0 && (
        <div className="laerer-fag-tags" style={{
          fontSize: "11px", color: "#7a7367",
          display: "flex", flexWrap: "wrap", gap: "6px",
          paddingLeft: "34px",
        }}>
          {fag.map((f, i) => (
            <span key={i}>
              {fagForkortelse(f.navn)} {f.lektioner}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// MIN-OVERSIGT: udleder en kort avatar-tekst fra klassenavn (fx "9.S" → "9S",
// "8.A" → "8A"). Bevarer både cifre og bogstaver — meningsfuld initial.
function klasseAvatarTekst(klasse) {
  const renset = (klasse || "").replace(/[\s.]/g, "");
  return renset.slice(0, 2).toUpperCase() || "?";
}

// Normaliserer klasse-input til kanonisk form.
// Kortform: ciffer + valgfri . eller , + ét bogstav UDEN whitespace mellem
//   "8a", "8A", "8.a", "8.A", "8,a", "8,A" → "8.A"
// Langform: ciffer + . + whitespace + ord (fx "4. klasse")
//   → uppercase første bogstav af ordet: "4. Klasse"
// Andet: trimmes uændret (fx "Lille klasse", "8.AB", "8 A").
function normaliserKlasse(input) {
  if (!input) return "";
  const trimmed = input.trim();
  if (!trimmed) return "";
  const kortForm = trimmed.match(/^(\d+)[.,]?([a-zæøåA-ZÆØÅ])$/);
  if (kortForm) return `${kortForm[1]}.${kortForm[2].toUpperCase()}`;
  const langForm = trimmed.match(/^(\d+)\.\s+(\S.*)$/);
  if (langForm) {
    const ord = langForm[2];
    return `${langForm[1]}. ${ord.charAt(0).toUpperCase()}${ord.slice(1)}`;
  }
  return trimmed;
}

// MIN-OVERSIGT: normaliserer fag-input så "dansk" → "Dansk", "MATEMATIK" → "Matematik",
// "natur/teknologi" → "Natur/teknologi". Match mod STANDARD_FAG case-insensitivt for
// kanonisk capitalisation (især vigtig for fag med skråstreger og "og"). Ellers bare
// første bogstav stort.
function normaliserFag(input) {
  if (!input) return "";
  const trimmed = input.trim();
  if (!trimmed) return "";
  const canonical = STANDARD_FAG.find(s => s.toLowerCase() === trimmed.toLowerCase());
  if (canonical) return canonical;
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}

// MIN-OVERSIGT: fag-kort der spejler klasse-visningens struktur — fag-navn +
// lektioner i header, klasse-avatar + klasse-navn nedenunder (i stedet for lærere).
// Sortable: kortet kan trækkes for at omarrangere; drag-zonen er den ledige plads
// i headeren mellem fag-navn og lektion-tal (samme mønster som klasse-visning).
function MinFagCard({ f, opdater, slet }) {
  const [hover, setHover] = React.useState(false);
  const harKlasse = !!(f.klasse && f.klasse.trim());
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: f.id,
    transition: { duration: 280, easing: "cubic-bezier(0.25, 1, 0.5, 1)" },
  });
  const sortableStyle = {
    transform: CSS.Transform.toString(transform),
    transition: isDragging ? undefined : transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : "auto",
    boxShadow: isDragging ? "0 12px 32px rgba(26,26,26,0.22)" : "none",
  };
  return (
    <div
      ref={setNodeRef}
      {...attributes}
      className="fag-card"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        background: "#fff", border: "1px solid #e0d9ca",
        position: "relative",
        display: "flex", flexDirection: "column",
        ...sortableStyle,
      }}
    >
      <button
        onClick={slet}
        aria-label="Slet fag"
        data-no-print="true"
        style={{
          position: "absolute", top: "8px", right: "8px",
          background: "transparent", border: "none",
          color: "#7a7367", cursor: "pointer", padding: "4px",
          opacity: hover ? 1 : 0, transition: "opacity 0.12s",
          display: "flex", zIndex: 2,
        }}
      >
        <Trash2 size={14} />
      </button>
      {/* Header: fag-navn + drag-zone + lektion-tal (samme grid + stil som klasse-visning) */}
      <div className="fag-card-header" style={{
        padding: "14px 10px 10px 14px",
        display: "flex", alignItems: "center", gap: "4px",
      }}>
        <GhostInput
          type="text"
          value={f.navn}
          onChange={(navn) => opdater("navn", navn)}
          suggestions={STANDARD_FAG}
          placeholder="Fag"
          className="fag-card-fagnavn"
          wrapperStyle={{ flexShrink: 1, minWidth: 0 }}
          onAccept={() => document.activeElement?.blur?.()}
          onKeyDown={(e) => {
            if (e.key === "Enter") document.activeElement?.blur?.();
          }}
          onBlur={() => {
            const normaliseret = normaliserFag(f.navn);
            if (normaliseret !== f.navn) opdater("navn", normaliseret);
          }}
          style={{
            fontFamily: "'Fraunces', Georgia, serif",
            fontSize: "20px", fontWeight: 500, color: "#1a1a1a",
            background: "transparent", border: "none",
            padding: "2px 0", outline: "none", lineHeight: 1.2,
            fieldSizing: "content",
            minWidth: "60px",
            maxWidth: "100%",
          }}
        />
        {/* Drag-zone — usynlig, fylder ledig plads, kun her starter drag */}
        <div
          {...listeners}
          aria-label="Træk for at flytte fag"
          style={{
            flex: 1, alignSelf: "stretch", minWidth: "20px",
            cursor: "grab",
            touchAction: "none",
          }}
        />
        {/* Lektionsantal — samme stil som klasse-visningens fag-kort */}
        <div className="fag-card-lekt-group" style={{
          display: "flex", alignItems: "baseline", gap: "2px",
          flexShrink: 0,
        }}>
          <input
            type="number" min="0" max="40"
            value={f.lektioner === "" || f.lektioner === undefined ? "" : f.lektioner}
            onChange={(e) => {
              const v = e.target.value;
              opdater("lektioner", v === "" ? "" : (parseInt(v) || 0));
            }}
            onFocus={(e) => e.target.select()}
            onKeyDown={(e) => { if (e.key === "Enter") e.target.blur(); }}
            onBlur={() => {
              if (f.lektioner === "" || f.lektioner === undefined) opdater("lektioner", 0);
            }}
            className="fag-card-lekt-input"
            style={{
              fontFamily: "'Fraunces', Georgia, serif",
              fontSize: "16px", fontWeight: 500, color: "#7a7367",
              background: "transparent", border: "none",
              padding: 0, textAlign: "left",
              outline: "none",
            }}
          />
          <span className="fag-card-lekt-label" style={{
            fontSize: "12px", color: "#7a7367",
          }}>
            lektioner
          </span>
        </div>
      </div>
      {/* Body: klasse-avatar + klasse-input (lærer-rolle) */}
      <div className="fag-card-laerere" style={{
        padding: "10px 14px 14px",
        borderTop: "1px solid #f0ead9",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div
            className="laerer-avatar"
            style={{
              width: "26px", height: "26px", borderRadius: "50%",
              background: harKlasse ? farveForKlasse(f.klasse) : "transparent",
              color: "#fff",
              fontSize: "10px", fontWeight: 600,
              display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0,
              border: harKlasse ? "none" : "1px dashed #cdc5b8",
            }}
          >
            {harKlasse ? klasseAvatarTekst(f.klasse) : ""}
          </div>
          <input
            type="text"
            value={f.klasse}
            onChange={(e) => opdater("klasse", e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") e.target.blur(); }}
            onBlur={(e) => {
              const normaliseret = normaliserKlasse(e.target.value);
              if (normaliseret !== e.target.value) opdater("klasse", normaliseret);
            }}
            placeholder="Klasse"
            style={{
              flex: 1, minWidth: 0,
              fontSize: "14px", color: "#1a1a1a",
              background: "transparent", border: "none",
              padding: 0, outline: "none",
            }}
          />
        </div>
      </div>
    </div>
  );
}

function StatBox({ label, value, sub }) {
  return (
    <div style={{ background: "#f5f1ea", padding: "14px 20px" }}>
      <div style={{
        fontSize: "11px", letterSpacing: "0.1em", textTransform: "uppercase",
        color: "#7a7367", fontWeight: 500, marginBottom: "4px",
      }}>
        {label}
      </div>
      <div style={{
        fontFamily: "'Fraunces', Georgia, serif", fontSize: "28px",
        fontWeight: 600, color: "#1a1a1a", lineHeight: 1, marginBottom: "2px",
      }}>
        {value}
      </div>
      <div style={{ fontSize: "12px", color: "#7a7367" }}>{sub}</div>
    </div>
  );
}

function StatusBox({ samletMangler, samletOver, antalFag }) {
  const erFærdig = samletMangler === 0 && samletOver === 0 && antalFag > 0;
  const harOver = samletOver > 0;

  let talFarve, label, hovedTal, undertekst;
  if (antalFag === 0) {
    talFarve = "#7a7367";
    label = "Status";
    hovedTal = "—";
    undertekst = "Tilføj dit første fag for at komme i gang";
  } else if (erFærdig) {
    talFarve = "#3d7a4e";
    label = "Status";
    hovedTal = "0";
    undertekst = "Alle fag er dækket. Puslespillet går op.";
  } else if (harOver && samletMangler === 0) {
    talFarve = "#a07820";
    label = "Overdækket";
    hovedTal = samletOver;
    undertekst = samletOver === 1 ? "1 lektion er tildelt for meget" : `${samletOver} lektioner er tildelt for meget`;
  } else {
    talFarve = "#1a1a1a";
    label = "Mangler";
    hovedTal = samletMangler;
    undertekst = samletMangler === 1 ? "1 lærer-lektion mangler at blive fordelt" : `${samletMangler} lærer-lektioner mangler at blive fordelt`;
    if (harOver) {
      undertekst += ` · ${samletOver} overdækket`;
    }
  }

  return (
    <div style={{
      background: "#f5f1ea", padding: "14px 20px", height: "100%",
    }}>
      <div style={{
        fontSize: "11px", letterSpacing: "0.1em", textTransform: "uppercase",
        color: "#7a7367", fontWeight: 500, marginBottom: "4px",
      }}>
        {label}
      </div>
      <div style={{
        fontFamily: "'Fraunces', Georgia, serif", fontSize: "28px",
        fontWeight: 600, color: talFarve, lineHeight: 1, marginBottom: "2px",
        transition: "color 0.3s ease",
      }}>
        {hovedTal}
      </div>
      <div style={{ fontSize: "12px", color: "#7a7367" }}>
        {undertekst}
      </div>
    </div>
  );
}

function StatLine({ fag, samletLektioner, oversigt, samletMangler, samletOver }) {
  let statusTekst, statusFarve;
  if (fag.length === 0) {
    statusTekst = "Tom";
    statusFarve = "#7a7367";
  } else if (samletMangler === 0 && samletOver === 0) {
    statusTekst = "Alt går op";
    statusFarve = "#3d7a4e";
  } else if (samletMangler > 0 && samletOver > 0) {
    statusTekst = `${samletMangler} mangler · ${samletOver} over`;
    statusFarve = "#1a1a1a";
  } else if (samletMangler > 0) {
    statusTekst = `${samletMangler} mangler`;
    statusFarve = "#1a1a1a";
  } else {
    statusTekst = `${samletOver} over`;
    statusFarve = "#a07820";
  }

  const numStyle = {
    fontFamily: "'Fraunces', Georgia, serif",
    fontSize: "20px",
    fontWeight: 600,
    color: "#1a1a1a",
    lineHeight: 1,
  };
  const labelStyle = {
    fontSize: "11px",
    color: "#7a7367",
    letterSpacing: "0.06em",
    textTransform: "uppercase",
    fontWeight: 500,
    marginLeft: "4px",
  };

  return (
    <div className="stat-line" style={{
      padding: "12px 14px",
      background: "#fff",
      border: "1px solid #1a1a1a",
      marginBottom: "20px",
      alignItems: "center",
      gap: "16px",
      flexWrap: "wrap",
    }}>
      <span style={{ display: "inline-flex", alignItems: "baseline" }}>
        <span style={numStyle}>{fag.length}</span>
        <span style={labelStyle}>fag</span>
      </span>
      <span style={{ display: "inline-flex", alignItems: "baseline" }}>
        <span style={numStyle}>{samletLektioner}</span>
        <span style={labelStyle}>lekt</span>
      </span>
      <span style={{ display: "inline-flex", alignItems: "baseline" }}>
        <span style={numStyle}>{oversigt.length}</span>
        <span style={labelStyle}>lærere</span>
      </span>
      <span style={{
        marginLeft: "auto",
        fontSize: "13px",
        fontWeight: 600,
        color: statusFarve,
      }}>
        {statusTekst}
      </span>
    </div>
  );
}

function HowToModal({ onLuk }) {
  const trin = [
    {
      titel: "Vælg klasse eller lærer",
      tekst: "Start med ét overblik. Du kan tilføje begge dele bagefter via menuen øverst-til-venstre.",
    },
    {
      titel: "Vælg klassetrin",
      tekst: "Få vejledende UVM-fag automatisk indlæst. Tilføj selv tysk/fransk og evt. valgfag.",
    },
    {
      titel: "Tilføj lærere",
      tekst: "Brug \"+ Tilføj lærer\" i sidebaren og træk dem direkte til et fag. Eksisterende navne dukker op som forslag mens du skriver.",
    },
    {
      titel: "Skift mellem klasser og lærere",
      tekst: "Hamburger-menuen øverst-til-venstre viser alle klasser og lærere. Klik på en for at åbne dens overblik.",
    },
    {
      titel: "Eksportér eller fortryd",
      tekst: "Print som PDF når du er færdig — eller gem som backup-fil. Cmd/Ctrl+Z fortryder seneste ændring.",
    },
  ];
  return (
    <div
      onClick={onLuk}
      style={{
        position: "fixed", inset: 0,
        background: "rgba(26,26,26,0.4)",
        display: "flex", alignItems: "center", justifyContent: "center",
        zIndex: 200, padding: "20px",
        animation: "fadeIn 0.15s ease",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#f5f1ea", maxWidth: "520px", width: "100%",
          maxHeight: "85vh", overflowY: "auto",
          border: "1px solid #1a1a1a",
        }}
      >
        <div style={{
          padding: "24px 28px 16px",
          display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "16px",
        }}>
          <h3 style={{
            fontFamily: "'Fraunces', Georgia, serif", fontSize: "24px",
            fontWeight: 600, margin: 0,
            color: "#1a1a1a", letterSpacing: "-0.01em",
          }}>
            Sådan bruger du appen
          </h3>
          <button
            onClick={onLuk}
            aria-label="Luk"
            style={{
              background: "transparent", border: "none",
              color: "#7a7367", cursor: "pointer",
              padding: "4px", display: "flex", flexShrink: 0,
            }}
          >
            <X size={18} />
          </button>
        </div>
        <ol style={{
          margin: 0, padding: "0 28px 8px",
          listStyle: "none", counterReset: "trin",
        }}>
          {trin.map((t, i) => (
            <li
              key={i}
              style={{
                counterIncrement: "trin",
                position: "relative",
                paddingLeft: "36px",
                paddingBottom: "20px",
                borderLeft: i < trin.length - 1 ? "1px dashed #cdc5b8" : "none",
                marginLeft: "12px",
              }}
            >
              <div style={{
                position: "absolute",
                left: "-13px", top: 0,
                width: "26px", height: "26px",
                borderRadius: "50%",
                background: "#1a1a1a", color: "#f5f1ea",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontFamily: "'Fraunces', Georgia, serif",
                fontSize: "13px", fontWeight: 500,
              }}>
                {i + 1}
              </div>
              <div style={{
                fontFamily: "'Fraunces', Georgia, serif",
                fontSize: "16px", fontWeight: 500, color: "#1a1a1a",
                marginBottom: "4px",
              }}>
                {t.titel}
              </div>
              <div style={{
                fontSize: "13px", color: "#7a7367",
                lineHeight: 1.5,
              }}>
                {t.tekst}
              </div>
            </li>
          ))}
        </ol>
        <div style={{
          padding: "12px 28px 24px",
          display: "flex", justifyContent: "flex-end",
        }}>
          <button
            onClick={onLuk}
            style={{
              padding: "10px 20px",
              fontFamily: "'Fraunces', Georgia, serif",
              fontSize: "15px", fontWeight: 500,
              background: "#1a1a1a", color: "#f5f1ea",
              border: "1px solid #1a1a1a",
              cursor: "pointer",
            }}
          >
            Forstået
          </button>
        </div>
      </div>
    </div>
  );
}

function ConfirmModal({ titel, tekst, bekraeftTekst = "Slet", onBekraeft, onAnnuller, farligt = true }) {
  return (
    <div
      onClick={onAnnuller}
      style={{
        position: "fixed", inset: 0, background: "rgba(26,26,26,0.6)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "24px", zIndex: 100,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#f5f1ea", maxWidth: "420px", width: "100%",
          border: "1px solid #1a1a1a",
        }}
      >
        <div style={{ padding: "20px 24px 16px" }}>
          <h3 style={{
            fontFamily: "'Fraunces', Georgia, serif", fontSize: "20px",
            fontWeight: 600, margin: 0, marginBottom: "8px",
            color: "#1a1a1a",
          }}>
            {titel}
          </h3>
          <p style={{
            fontSize: "13px", color: "#7a7367", margin: 0, lineHeight: 1.5,
          }}>
            {tekst}
          </p>
        </div>
        <div style={{
          padding: "12px 24px 20px", display: "flex",
          gap: "8px", justifyContent: "flex-end",
        }}>
          <button
            onClick={onAnnuller}
            style={{
              padding: "8px 14px", fontSize: "13px", fontWeight: 500,
              background: "transparent", border: "1px solid #1a1a1a",
              color: "#1a1a1a", cursor: "pointer",
            }}
          >
            Annullér
          </button>
          <button
            onClick={onBekraeft}
            style={{
              padding: "8px 14px", fontSize: "13px", fontWeight: 500,
              background: farligt ? "#9d2517" : "#1a1a1a",
              border: `1px solid ${farligt ? "#9d2517" : "#1a1a1a"}`,
              color: "#f5f1ea", cursor: "pointer",
            }}
          >
            {bekraeftTekst}
          </button>
        </div>
      </div>
    </div>
  );
}

// Sidebar-lærer: draggable mod fag-kort. ID format "sidebar:<navn>" for at
// skille det fra fag- og laerer-instans-IDs. Drop håndteres i handleDragEnd.
function SidebarLaererRow({ l }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `sidebar:${l.navn}`,
  });
  return (
    <div
      ref={setNodeRef}
      {...attributes}
      className="laerer-item"
      style={{
        padding: "10px 14px",
        opacity: isDragging ? 0.4 : 1,
      }}
    >
      <div className="laerer-item-row" style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        <div
          {...listeners}
          className="laerer-avatar"
          style={{
            width: "18px", height: "18px", borderRadius: "50%",
            background: farveForNavn(l.navn), color: "#fff",
            fontSize: "10px", fontWeight: 600,
            display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0,
            alignSelf: "flex-start",
            marginTop: "1px",
            cursor: "grab",
            touchAction: "none",
          }}
        >
          {l.navn.charAt(0).toUpperCase()}
        </div>

        <div style={{
          flex: 1, minWidth: 0,
          display: "flex", flexWrap: "wrap", alignItems: "center",
          gap: "6px 8px",
        }}>
          <span className="laerer-navn" style={{
            fontSize: "13px", fontWeight: 600, color: "#1a1a1a",
            lineHeight: 1.2,
          }}>
            {l.navn}
          </span>
          {l.fag.map((fa, j) => (
            <span key={j} title={fa.fagNavn} style={{
              fontSize: "11px",
              color: "#7a7367",
              fontWeight: 400,
              lineHeight: 1.3,
              whiteSpace: "nowrap",
            }}>
              {fagForkortelse(fa.fagNavn)}{" "}
              <span style={{ color: "#7a7367" }}>
                {fa.lektioner}
              </span>
            </span>
          ))}
        </div>
        <div className="laerer-total" style={{
          fontSize: "13px", fontWeight: 500, color: "#1a1a1a",
          lineHeight: 1.2,
          fontVariantNumeric: "tabular-nums",
          minWidth: "28px", textAlign: "right",
          alignSelf: "flex-start",
          marginTop: "1px",
        }}>
          {l.total}
        </div>
      </div>
    </div>
  );
}

function SortableLaererRow({
  l, fagId, mode, placeholderLabel,
  // expanded-only props:
  lektTal, status, opdaterLaerer, sletLaerer, eksisterendeLaerere, allowDelete,
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: l.id });
  const sortStyle = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0 : 1,
    zIndex: isDragging ? 5 : "auto",
  };

  if (mode === "compact") {
    const harNavn = !!l.navn.trim();
    const lekt = parseInt(l.lektioner) || 0;
    return (
      <div ref={setNodeRef} {...attributes} style={{
        display: "flex", alignItems: "center", gap: "8px",
        padding: "3px 0",
        ...sortStyle,
      }}>
        <div {...listeners} style={{
          width: "18px", height: "18px", borderRadius: "50%",
          background: harNavn ? farveForNavn(l.navn) : "transparent",
          border: harNavn ? "none" : "1.5px dashed #cdc5b8",
          color: "#fff", fontSize: "10px", fontWeight: 600,
          display: "flex", alignItems: "center", justifyContent: "center",
          flexShrink: 0,
          cursor: "grab", touchAction: "none",
        }}>
          {harNavn ? l.navn.charAt(0).toUpperCase() : ""}
        </div>
        <span style={{
          flex: 1, minWidth: 0,
          fontSize: "13px",
          color: harNavn ? "#1a1a1a" : "#cdc5b8",
          fontStyle: "normal",
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        }}>
          {harNavn ? l.navn : (placeholderLabel || "Lærer")}
        </span>
        {harNavn && (
          <span style={{
            fontSize: "11px", color: "#7a7367",
            flexShrink: 0,
          }}>
            {lekt} lek
          </span>
        )}
      </div>
    );
  }

  // Expanded mode
  return (
    <div ref={setNodeRef} {...attributes} className="laerer-row" style={{
      display: "flex", alignItems: "center", gap: "10px",
      padding: "6px 0",
      ...sortStyle,
    }}>
      <div {...listeners} style={{
        width: "18px", height: "18px", borderRadius: "50%",
        background: l.navn ? farveForNavn(l.navn) : "#cdc5b8",
        color: "#fff", fontSize: "10px", fontWeight: 600,
        display: "flex", alignItems: "center", justifyContent: "center",
        flexShrink: 0,
        cursor: "grab", touchAction: "none",
      }}>
        {l.navn ? l.navn.charAt(0).toUpperCase() : "?"}
      </div>
      <GhostInput
        type="text"
        placeholder="Lærerens navn"
        value={l.navn}
        onChange={(navn) => opdaterLaerer(fagId, l.id, { navn })}
        suggestions={eksisterendeLaerere}
        wrapperStyle={{ flex: 1, minWidth: 0 }}
        style={{
          width: "100%",
          fontSize: "14px", color: "#1a1a1a",
          background: "transparent", border: "none",
          borderBottom: "1px solid transparent", padding: "4px 0",
          lineHeight: 1.4,
        }}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === "Escape") e.target.blur(); }}
        onFocus={(e) => e.target.style.borderBottomColor = "#cdc5b8"}
        onBlur={(e) => {
          e.target.style.borderBottomColor = "transparent";
          const normalized = normalizeNavn(l.navn);
          if (normalized !== l.navn) {
            opdaterLaerer(fagId, l.id, { navn: normalized });
          }
        }}
      />
      <input
        type="number" min="0" max={lektTal}
        value={l.lektioner === "" || l.lektioner === undefined ? "" : l.lektioner}
        onChange={(e) => {
          const v = e.target.value;
          opdaterLaerer(fagId, l.id, { lektioner: v === "" ? "" : (parseInt(v) || 0) });
        }}
        onFocus={(e) => e.target.select()}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === "Escape") e.target.blur(); }}
        onBlur={() => {
          if (l.lektioner === "" || l.lektioner === undefined) {
            opdaterLaerer(fagId, l.id, { lektioner: 0 });
          }
        }}
        style={{
          width: "44px", padding: "4px 6px", textAlign: "center",
          fontSize: "13px", fontWeight: 500,
          color: "#1a1a1a",
          background: "#f5f1ea",
          border: "1px solid #e0d9ca",
          flexShrink: 0,
        }}
      />
      <span style={{ fontSize: "12px", color: "#7a7367", flexShrink: 0 }}>lek</span>
      {allowDelete && (
        <button
          onClick={() => sletLaerer(fagId, l.id)}
          className="icon-btn"
          style={{
            padding: "4px", background: "transparent",
            border: "none", cursor: "pointer", color: "#7a7367",
            flexShrink: 0,
          }}
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
}

// Droppable virtual slot — fag-kort har visuel padding op til forventedeLaerere
// når der er færre lærere i data end forventet. Hvert padding-felt er nu en
// rigtig droppable, så brugeren kan slippe en lærer på slot 1, 2 eller 3 frit.
// Drop håndteres i handleDragEnd via id-prefix "slot:<fagId>:<index>".
function DroppableEmptySlot({ slotId, label }) {
  const { setNodeRef, isOver } = useDroppable({ id: slotId });
  return (
    <div ref={setNodeRef} style={{
      display: "flex", alignItems: "center", gap: "8px",
      padding: "3px 0",
      transition: "background 0.12s ease",
    }}>
      <div style={{
        width: "18px", height: "18px", borderRadius: "50%",
        background: "transparent",
        border: `1.5px dashed ${isOver ? "#1a1a1a" : "#cdc5b8"}`,
        flexShrink: 0,
        transition: "border-color 0.12s ease",
      }} />
      <span style={{
        flex: 1, minWidth: 0,
        fontSize: "13px",
        color: isOver ? "#1a1a1a" : "#cdc5b8",
        fontWeight: isOver ? 500 : 400,
        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        transition: "color 0.12s ease, font-weight 0.12s ease",
      }}>
        {label}
      </span>
    </div>
  );
}

function SortableFagCard({
  f, statusInfo, status, farve, erUdfoldet,
  toggleUdfoldet, opdaterFag, sletFag,
  tilfoejLaerer, opdaterLaerer, sletLaerer,
  eksisterendeLaerere,
}) {
  const lektTal = parseInt(f.lektioner) || 0;
  const lektInputRef = React.useRef(null);
  const navnInputRef = React.useRef(null);
  // Auto-jump fra fagnavn → lektion sker kun første gang fagnavnet skrives.
  // Hvis kortet allerede har et navn ved mount (loadet fra storage), springer vi over.
  const [hasJumpedToLekt, setHasJumpedToLekt] = React.useState(() => f.navn.trim().length > 0);
  // Display/edit-toggle for fagnavnet: korte navne ("Dansk") vises uændret
  // som et span; lange navne ("Håndværk og design") vises som forkortelse
  // ("HDS"). Klik på spannet aktiverer edit-mode med fuldt navn i input.
  // Tomme/nye kort starter direkte i edit-mode så brugeren kan taste straks.
  const [editingNavn, setEditingNavn] = React.useState(() => !f.navn.trim());
  const aabnNavnEdit = () => {
    setEditingNavn(true);
    setTimeout(() => {
      const inp = navnInputRef.current;
      if (inp) { inp.focus(); inp.select?.(); }
    }, 0);
  };

  const focusLektFirstTime = () => {
    if (hasJumpedToLekt) return;
    setHasJumpedToLekt(true);
    // setTimeout giver React tid til at færdig-rendere før vi flytter fokus
    setTimeout(() => {
      const inp = lektInputRef.current;
      if (inp) {
        inp.focus();
        inp.select();
      }
    }, 30);
  };

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: f.id,
    // Blødere overgang når andre kort glider på plads — føles "forhandlet"
    // i stedet for snappy.
    transition: { duration: 280, easing: "cubic-bezier(0.25, 1, 0.5, 1)" },
  });
  const sortableStyle = {
    // Standard sortable-grid: det aktive kort følger musen via transform.
    // De andre kort animerer blødt til nye positioner via `transition`.
    // Det aktive kort skal IKKE have transition på sig selv (ellers laggrer
    // det bagefter musen med 280ms).
    transform: CSS.Transform.toString(transform),
    transition: isDragging ? undefined : transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : "auto",
    boxShadow: isDragging ? "0 12px 32px rgba(26,26,26,0.22)" : "none",
  };

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      className="fag-card"
      style={{
        background: "#fff",
        border: "1px solid #e0d9ca",
        ...sortableStyle,
      }}
    >
      {/* Header — fagnavn (auto-bredde), drag-zone, lektionstal, status, chevron */}
      <div className="fag-card-header" style={{
        padding: "14px 10px 10px 14px",
        display: "flex", alignItems: "center", gap: "4px",
      }}>
        {/* Fagnavn — display/edit toggle. Lange navne vises som forkortelse
            ("Håndværk og design" → "HDS"). Klik aktiverer edit med fuldt navn. */}
        {editingNavn ? (
          <GhostInput
            autoFocus
            inputRef={navnInputRef}
            className="fag-input fag-card-fagnavn"
            type="text"
            placeholder="Fagnavn"
            value={f.navn}
            onChange={(navn) => opdaterFag(f.id, { navn })}
            suggestions={STANDARD_FAG}
            onAccept={() => { setEditingNavn(false); focusLektFirstTime(); }}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === "Escape") e.target.blur(); }}
            onBlur={() => {
              setEditingNavn(false);
              if (f.navn.trim().length > 0) focusLektFirstTime();
            }}
            wrapperStyle={{ flexShrink: 1, minWidth: 0 }}
            style={{
              fontFamily: "'Fraunces', Georgia, serif",
              fontSize: "20px", fontWeight: 500, color: "#1a1a1a",
              background: "transparent", border: "none",
              padding: "2px 0", lineHeight: 1.2,
              fieldSizing: "content",
              minWidth: "60px",
              maxWidth: "100%",
            }}
          />
        ) : (
          <span
            onClick={aabnNavnEdit}
            title={f.navn.trim()}
            className="fag-card-fagnavn"
            style={{
              fontFamily: "'Fraunces', Georgia, serif",
              fontSize: "20px", fontWeight: 500, color: "#1a1a1a",
              padding: "2px 0", lineHeight: 1.2,
              cursor: "text",
              flexShrink: 1, minWidth: 0,
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            }}
          >
            {fagDisplayNavn(f.navn)}
          </span>
        )}

        {/* Drag-zone — usynlig, fylder ledig plads, kun her starter drag */}
        <div
          {...listeners}
          aria-label="Træk for at flytte fag"
          style={{
            flex: 1, alignSelf: "stretch", minWidth: "20px",
            cursor: "grab",
            touchAction: "none",
          }}
        />

        {/* Lektionsantal — bundet sammen med "lektioner" som ét metadata-stykke */}
        <div className="fag-card-lekt-group" style={{
          display: "flex", alignItems: "baseline", gap: "2px",
          flexShrink: 0,
        }}>
          <input
            ref={lektInputRef}
            className="fag-card-lekt-input"
            type="number" min="0"
            value={f.lektioner === "" || f.lektioner === undefined ? "" : f.lektioner}
            onChange={(e) => {
              const v = e.target.value;
              opdaterFag(f.id, { lektioner: v === "" ? "" : (parseInt(v) || 0) });
            }}
            onFocus={(e) => e.target.select()}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === "Escape") e.target.blur(); }}
            onBlur={() => {
              if (f.lektioner === "" || f.lektioner === undefined) {
                opdaterFag(f.id, { lektioner: 0 });
              }
            }}
            style={{
              fontFamily: "'Fraunces', Georgia, serif",
              fontSize: "16px", fontWeight: 500, color: "#7a7367",
              background: "transparent", border: "none",
              padding: "0", textAlign: "left",
            }}
          />
          <span className="fag-card-lekt-label" style={{
            fontSize: "12px", color: "#7a7367",
          }}>
            lektioner
          </span>
        </div>

        {/* Status-ikon */}
        <div style={{
          flexShrink: 0, display: "flex",
          alignItems: "center", justifyContent: "center",
          color: farve.border,
          // Reservér samme bredde som ikonerne så header-layout ikke shifter
          // når status går fra "tom" til andet
          width: "18px", height: "18px",
        }}
          title={status === "tom" ? "Ingen lærere endnu — tilføj fra højre eller skriv ind i kortet" :
                 status === "grøn" ? (statusInfo.delt ? "Dækket (delt)" : "Dækket") :
                 status === "rød" ? "Tomt — tilføj lærere og lektioner" :
                 status === "gul" ? (statusInfo.manglerLaerere > 0
                   ? `Mangler ${statusInfo.manglerLaerere} lærer${statusInfo.manglerLaerere === 1 ? "" : "e"}`
                   : "Mangler lektioner")
                 : "Overdækket"}
        >
          {status === "grøn" && <CheckCircle2 size={18} />}
          {status === "rød" && <AlertCircle size={18} />}
          {status === "gul" && <Circle size={18} strokeWidth={2} />}
          {status === "over" && <AlertCircle size={18} />}
          {/* status === "tom" → ingen ikon (neutralt udgangspunkt) */}
        </div>

        {/* Toggle-knap */}
        <button
          onClick={() => toggleUdfoldet(f.id)}
          className="icon-btn"
          style={{
            padding: "4px", background: "transparent",
            border: "none", cursor: "pointer", color: "#7a7367",
            flexShrink: 0,
          }}
          title={erUdfoldet ? "Fold sammen" : "Fold ud"}
        >
          <ChevronDown
            size={16}
            style={{
              transform: erUdfoldet ? "rotate(180deg)" : "rotate(0deg)",
              transition: "transform 0.2s ease",
            }}
          />
        </button>
      </div>

      {/* Kollapset: kompakte lærer-rækker (avatar + navn + svag "X lek").
          Vi renderer alle f.laerere i rækkefølge (navngivne + tomme entries
          fra slot-padding). Hvis f.laerere.length < forventedeLaerere, fyldes
          de manglende slots op med droppable virtuelle pladser, så brugeren
          kan slippe en lærer på slot 1, 2 eller 3 frit. */}
      {!erUdfoldet && (() => {
        const forventede = parseInt(f.forventedeLaerere) || 2;
        const slotsCount = Math.max(forventede, f.laerere.length);
        const virtualCount = Math.max(0, slotsCount - f.laerere.length);
        return (
          <div style={{ borderTop: "1px solid #f0ead9", padding: "6px 14px 10px" }}>
            <SortableContext
              items={f.laerere.map((l) => l.id)}
              strategy={verticalListSortingStrategy}
            >
              {f.laerere.map((l, idx) => (
                <SortableLaererRow
                  key={l.id}
                  l={l}
                  fagId={f.id}
                  mode="compact"
                  placeholderLabel={`Lærer ${idx + 1}`}
                />
              ))}
            </SortableContext>
            {Array.from({ length: virtualCount }).map((_, i) => {
              const slotIndex = f.laerere.length + i;
              return (
                <DroppableEmptySlot
                  key={`slot-${slotIndex}`}
                  slotId={`slot:${f.id}:${slotIndex}`}
                  label={`Lærer ${slotIndex + 1}`}
                />
              );
            })}
          </div>
        );
      })()}

      {/* Udfoldet indhold */}
      {erUdfoldet && (
        <div style={{ borderTop: "1px solid #f0ead9", padding: "10px 14px 12px" }}>
          {/* Antal lærere forventet på faget */}
          <div style={{
            display: "flex", alignItems: "center", gap: "10px",
            paddingBottom: "10px", marginBottom: "10px",
            borderBottom: "1px solid #f0ead9",
          }}>
            <span style={{ fontSize: "12px", color: "#7a7367", flexShrink: 0 }}>
              Antal lærere på faget:
            </span>
            <div style={{ display: "flex", gap: "4px" }}>
              {[1, 2, 3].map((n) => {
                const aktiv = (parseInt(f.forventedeLaerere) || 2) === n;
                return (
                  <button
                    key={n}
                    onClick={() => opdaterFag(f.id, { forventedeLaerere: n })}
                    style={{
                      width: "28px", height: "28px",
                      background: aktiv ? "#1a1a1a" : "transparent",
                      color: aktiv ? "#f5f1ea" : "#7a7367",
                      border: `1px solid ${aktiv ? "#1a1a1a" : "#cdc5b8"}`,
                      cursor: "pointer",
                      fontSize: "13px", fontWeight: 600,
                      padding: 0,
                    }}
                  >
                    {n}
                  </button>
                );
              })}
            </div>
          </div>

          <SortableContext
            items={f.laerere.map((l) => l.id)}
            strategy={verticalListSortingStrategy}
          >
            {f.laerere.map((l) => (
              <SortableLaererRow
                key={l.id}
                l={l}
                fagId={f.id}
                mode="expanded"
                lektTal={lektTal}
                status={status}
                opdaterLaerer={opdaterLaerer}
                sletLaerer={sletLaerer}
                eksisterendeLaerere={eksisterendeLaerere}
                allowDelete={f.laerere.length > 1}
              />
            ))}
          </SortableContext>

          <div style={{
            display: "flex", justifyContent: "space-between",
            alignItems: "center", marginTop: "10px",
            paddingTop: "10px", borderTop: "1px solid #f0ead9",
          }}>
            {f.laerere.length < 3 ? (
              <button
                onClick={() => tilfoejLaerer(f.id)}
                style={{
                  display: "flex", alignItems: "center", gap: "6px",
                  padding: "4px 0",
                  fontSize: "13px", fontWeight: 500, color: "#7a7367",
                  background: "transparent", border: "none", cursor: "pointer",
                }}
              >
                <Plus size={12} /> Tilføj lærer
                {f.laerere.length === 2 && <span style={{ color: "#7a7367", fontWeight: 400 }}>(3. lærer)</span>}
              </button>
            ) : <div />}
            <button
              onClick={() => sletFag(f.id)}
              style={{
                display: "flex", alignItems: "center", gap: "6px",
                padding: "4px 8px",
                fontSize: "12px", color: "#7a7367",
                background: "transparent", border: "none", cursor: "pointer",
              }}
              title="Slet fag"
            >
              <Trash2 size={12} /> Slet fag
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// Mobile components
// ============================================================

function MobileSummaryBar({ oversigt, fag, fagStatus }) {
  const counts = fag.reduce(
    (acc, f) => {
      const s = fagStatus(f).status;
      if (s === "grøn") acc.gron += 1;
      else if (s === "gul") acc.gul += 1;
      else if (s === "rød") acc.rod += 1;
      else if (s === "over") acc.gul += 1; // over tæller som problem
      return acc;
    },
    { gron: 0, gul: 0, rod: 0 }
  );
  return (
    <div style={{
      display: "flex", gap: "14px", alignItems: "center",
      padding: "10px 16px",
      background: "#fff",
      borderTop: "1px solid #e0d9ca",
      borderBottom: "1px solid #e0d9ca",
      fontSize: "12px",
      color: "#4a463e",
    }}>
      <span style={{ display: "inline-flex", alignItems: "center", gap: "5px" }}>
        <CheckCircle2 size={13} style={{ color: "#1e8e3e" }} /> {counts.gron}
      </span>
      <span style={{ display: "inline-flex", alignItems: "center", gap: "5px" }}>
        <Circle size={13} fill="#e8a317" strokeWidth={0} /> {counts.gul}
      </span>
      <span style={{ display: "inline-flex", alignItems: "center", gap: "5px" }}>
        <AlertCircle size={13} style={{ color: "#d93025" }} /> {counts.rod}
      </span>
      <span style={{ marginLeft: "auto", color: "#7a7367" }}>
        {oversigt.length} {oversigt.length === 1 ? "lærer" : "lærere"}
      </span>
    </div>
  );
}

function MobileTabs({ tab, setTab, fagAntal, laererAntal }) {
  const tabStyle = (active) => ({
    flex: 1,
    padding: "12px 8px",
    background: "transparent",
    border: "none",
    borderBottom: active ? "2px solid #1a1a1a" : "2px solid transparent",
    color: active ? "#1a1a1a" : "#7a7367",
    fontSize: "14px",
    fontWeight: active ? 600 : 500,
    cursor: "pointer",
    fontFamily: "inherit",
    display: "flex",
    justifyContent: "center",
    alignItems: "baseline",
    gap: "6px",
  });
  return (
    <div style={{ display: "flex", borderBottom: "1px solid #e0d9ca", background: "#fff" }}>
      <button onClick={() => setTab("fag")} style={tabStyle(tab === "fag")}>
        Fag <span style={{ fontSize: "12px", color: "#7a7367", fontWeight: 500 }}>{fagAntal}</span>
      </button>
      <button onClick={() => setTab("laerere")} style={tabStyle(tab === "laerere")}>
        Lærere <span style={{ fontSize: "12px", color: "#7a7367", fontWeight: 500 }}>{laererAntal}</span>
      </button>
    </div>
  );
}

function MobileFagTile({ f, statusInfo, status, farve, onTap }) {
  const lektTal = parseInt(f.lektioner) || 0;
  const navn = f.navn.trim() || "Uden navn";
  const namedLaerere = f.laerere.filter((l) => l.navn.trim());
  const forventede = parseInt(f.forventedeLaerere) || 2;
  const emptyCount = Math.max(0, forventede - namedLaerere.length);

  return (
    <button
      onClick={onTap}
      className="mobile-fag-tile"
      style={{
        background: "#fff",
        border: "1px solid #e0d9ca",
        borderRadius: "6px",
        padding: "10px 8px 10px",
        textAlign: "left",
        cursor: "pointer",
        position: "relative",
        display: "flex",
        flexDirection: "column",
        font: "inherit",
        color: "inherit",
      }}
    >
      <div style={{
        position: "absolute", top: "6px", right: "6px",
        color: farve.border, display: "flex", alignItems: "center",
      }}>
        {status === "grøn" && <CheckCircle2 size={14} />}
        {status === "rød" && <AlertCircle size={14} />}
        {status === "gul" && <Circle size={14} fill={farve.border} strokeWidth={0} />}
        {status === "over" && <AlertCircle size={14} />}
      </div>

      <div style={{
        fontSize: "11px", fontWeight: 600, color: "#1a1a1a",
        lineHeight: 1.2, paddingRight: "16px", marginBottom: "4px",
        overflow: "hidden",
        display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical",
        wordBreak: "break-word",
      }}>
        {navn}
      </div>

      <div style={{
        fontFamily: "'Fraunces', Georgia, serif",
        fontSize: "20px", fontWeight: 600, color: "#1a1a1a",
        lineHeight: 1, letterSpacing: "-0.02em",
        marginBottom: "10px",
      }}>
        {lektTal}
        <span style={{
          fontSize: "9px", fontWeight: 500, color: "#7a7367",
          letterSpacing: 0, marginLeft: "3px",
          fontFamily: "'Inter', system-ui, sans-serif",
        }}>
          lek
        </span>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
        {namedLaerere.map((l) => (
          <div key={l.id} style={{
            display: "flex", alignItems: "center", gap: "5px", minWidth: 0,
          }}>
            <div style={{
              width: "16px", height: "16px", borderRadius: "50%",
              background: farveForNavn(l.navn), color: "#fff",
              fontSize: "8px", fontWeight: 600,
              display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0,
            }}>
              {l.navn.charAt(0).toUpperCase()}
            </div>
            <div style={{
              fontSize: "11px", fontWeight: 500, color: "#1a1a1a",
              lineHeight: 1.2, minWidth: 0, flex: 1,
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            }}>
              {l.navn}
            </div>
          </div>
        ))}
        {Array.from({ length: emptyCount }).map((_, i) => (
          <div key={`e${i}`} style={{
            display: "flex", alignItems: "center", gap: "5px",
          }}>
            <div style={{
              width: "16px", height: "16px", borderRadius: "50%",
              background: "transparent",
              border: "1.5px dashed #cdc5b8",
              color: "#cdc5b8",
              fontSize: "10px", fontWeight: 500,
              display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0,
            }}>
              +
            </div>
            <div style={{
              fontSize: "11px", fontWeight: 500, color: "#cdc5b8",
              lineHeight: 1.2, fontStyle: "italic",
            }}>
              tom
            </div>
          </div>
        ))}
      </div>
    </button>
  );
}

function MobileLaererRowEdit({ fag, laerer, opdaterLaerer, sletLaerer, eksisterendeLaerere }) {
  const harNavn = laerer.navn.trim().length > 0;
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: "10px",
      padding: "10px 16px", borderTop: "1px solid #f0ead9",
    }}>
      <div style={{
        width: "28px", height: "28px", borderRadius: "50%",
        background: harNavn ? farveForNavn(laerer.navn) : "transparent",
        border: harNavn ? "none" : "1px dashed #cdc5b8",
        color: "#fff", fontSize: "12px", fontWeight: 600,
        display: "flex", alignItems: "center", justifyContent: "center",
        flexShrink: 0,
      }}>
        {harNavn ? laerer.navn.charAt(0).toUpperCase() : ""}
      </div>
      <GhostInput
        value={laerer.navn}
        onChange={(navn) => opdaterLaerer(fag.id, laerer.id, { navn })}
        suggestions={eksisterendeLaerere}
        placeholder="Navn"
        wrapperStyle={{ flex: 1, minWidth: 0 }}
        style={{
          width: "100%",
          fontSize: "14px", fontWeight: 500, color: "#1a1a1a",
          background: "transparent", border: "none",
          padding: "6px 0",
        }}
      />
      <input
        type="number" min="0"
        value={laerer.lektioner === "" || laerer.lektioner === undefined ? "" : laerer.lektioner}
        onChange={(e) => {
          const v = e.target.value;
          opdaterLaerer(fag.id, laerer.id, { lektioner: v === "" ? "" : (parseInt(v) || 0) });
        }}
        onFocus={(e) => e.target.select()}
        style={{
          width: "44px", textAlign: "right",
          fontFamily: "'Fraunces', Georgia, serif",
          fontSize: "16px", fontWeight: 600, color: "#1a1a1a",
          background: "transparent", border: "none",
          padding: "6px 0",
        }}
      />
      <button
        onClick={() => sletLaerer(fag.id, laerer.id)}
        style={{
          background: "transparent", border: "none",
          padding: "6px", cursor: "pointer", color: "#7a7367",
          flexShrink: 0,
        }}
        aria-label="Fjern lærer"
      >
        <X size={14} />
      </button>
    </div>
  );
}

function MobileFagSheet({
  f, statusInfo, status, farve,
  opdaterFag, sletFag,
  tilfoejLaerer, opdaterLaerer, sletLaerer,
  eksisterendeLaerere,
  onClose,
}) {
  if (!f) return null;
  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 60,
      display: "flex", flexDirection: "column", justifyContent: "flex-end",
    }}>
      <div onClick={onClose} style={{
        position: "absolute", inset: 0, background: "rgba(26,26,26,0.45)",
        animation: "sheetFade 0.2s ease",
      }} />

      <div style={{
        position: "relative", background: "#f5f1ea",
        borderTopLeftRadius: "16px", borderTopRightRadius: "16px",
        maxHeight: "88vh", overflowY: "auto",
        animation: "sheetSlide 0.25s ease",
        boxShadow: "0 -8px 24px rgba(26,26,26,0.18)",
      }}>
        <div style={{ display: "flex", justifyContent: "center", padding: "10px 0 4px" }}>
          <div style={{ width: "36px", height: "4px", borderRadius: "2px", background: "#cdc5b8" }} />
        </div>

        <div style={{ padding: "8px 16px 16px", display: "flex", alignItems: "center", gap: "10px" }}>
          <div style={{ color: farve.border, flexShrink: 0, display: "flex" }}>
            {status === "grøn" && <CheckCircle2 size={20} />}
            {status === "rød" && <AlertCircle size={20} />}
            {status === "gul" && <Circle size={20} fill={farve.border} strokeWidth={0} />}
            {status === "over" && <AlertCircle size={20} />}
          </div>
          <input
            value={f.navn}
            onChange={(e) => opdaterFag(f.id, { navn: e.target.value })}
            placeholder="Fagnavn"
            style={{
              flex: 1, minWidth: 0,
              fontFamily: "'Fraunces', Georgia, serif",
              fontSize: "22px", fontWeight: 600, color: "#1a1a1a",
              background: "transparent", border: "none",
              padding: "4px 0",
            }}
          />
          <button onClick={onClose} style={{
            background: "transparent", border: "none", cursor: "pointer",
            padding: "8px", color: "#7a7367", flexShrink: 0,
          }} aria-label="Luk">
            <X size={20} />
          </button>
        </div>

        <div style={{
          padding: "0 16px 16px", display: "grid",
          gridTemplateColumns: "1fr 1fr", gap: "12px",
        }}>
          <label style={{ display: "block" }}>
            <div style={{
              fontSize: "10px", color: "#7a7367", marginBottom: "4px",
              fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em",
            }}>Lektioner</div>
            <input
              type="number" min="0"
              value={f.lektioner === "" || f.lektioner === undefined ? "" : f.lektioner}
              onChange={(e) => opdaterFag(f.id, { lektioner: e.target.value === "" ? "" : (parseInt(e.target.value) || 0) })}
              onFocus={(e) => e.target.select()}
              style={{
                width: "100%", fontFamily: "'Fraunces', Georgia, serif",
                fontSize: "20px", fontWeight: 500, color: "#1a1a1a",
                background: "#fff", border: "1px solid #e0d9ca",
                padding: "10px 12px",
              }}
            />
          </label>
          <label style={{ display: "block" }}>
            <div style={{
              fontSize: "10px", color: "#7a7367", marginBottom: "4px",
              fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em",
            }}>Forventede lærere</div>
            <input
              type="number" min="1"
              value={f.forventedeLaerere || 2}
              onChange={(e) => opdaterFag(f.id, { forventedeLaerere: parseInt(e.target.value) || 1 })}
              onFocus={(e) => e.target.select()}
              style={{
                width: "100%", fontFamily: "'Fraunces', Georgia, serif",
                fontSize: "20px", fontWeight: 500, color: "#1a1a1a",
                background: "#fff", border: "1px solid #e0d9ca",
                padding: "10px 12px",
              }}
            />
          </label>
        </div>

        <div style={{ background: "#fff", borderTop: "1px solid #e0d9ca", borderBottom: "1px solid #e0d9ca" }}>
          <div style={{
            padding: "12px 16px 6px", fontSize: "10px",
            color: "#7a7367", fontWeight: 600,
            textTransform: "uppercase", letterSpacing: "0.06em",
          }}>
            Lærere
          </div>
          {f.laerere.map((l) => (
            <MobileLaererRowEdit
              key={l.id} fag={f} laerer={l}
              opdaterLaerer={opdaterLaerer}
              sletLaerer={sletLaerer}
              eksisterendeLaerere={eksisterendeLaerere}
            />
          ))}
          <button
            onClick={() => tilfoejLaerer(f.id)}
            style={{
              width: "100%", padding: "12px 16px",
              background: "transparent", border: "none",
              borderTop: "1px dashed #e0d9ca",
              fontSize: "13px", color: "#1a1a1a", fontWeight: 500,
              cursor: "pointer", textAlign: "left",
              display: "flex", alignItems: "center", gap: "8px",
              fontFamily: "inherit",
            }}
          >
            <Plus size={16} /> Tilføj lærer
          </button>
        </div>

        <div style={{ padding: "16px 16px 24px" }}>
          <button
            onClick={() => { sletFag(f.id); onClose(); }}
            style={{
              width: "100%", padding: "12px",
              background: "transparent",
              border: "1px solid #d93025", color: "#d93025",
              fontSize: "13px", fontWeight: 500, cursor: "pointer",
              fontFamily: "inherit",
              display: "flex", alignItems: "center", justifyContent: "center", gap: "6px",
            }}
          >
            <Trash2 size={14} /> Slet fag
          </button>
        </div>
      </div>
    </div>
  );
}
