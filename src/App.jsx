import React, { useState, useEffect } from "react";
import { Plus, Trash2, Download, Upload, X, Users, BookOpen, AlertCircle, CheckCircle2, Circle, ChevronDown, GripVertical, RotateCcw } from "lucide-react";
import { DndContext, DragOverlay, closestCorners, pointerWithin, rectIntersection, MouseSensor, TouchSensor, useSensor, useSensors, useDraggable, MeasuringStrategy } from "@dnd-kit/core";
import { SortableContext, useSortable, rectSortingStrategy, verticalListSortingStrategy, arrayMove } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

const STANDARD_FAG = [
  "Dansk", "Matematik", "Engelsk", "Tysk", "Fransk",
  "Historie", "Samfundsfag", "Kristendom", "Idræt",
  "Musik", "Billedkunst", "Håndværk og design", "Madkundskab",
  "Natur/teknologi", "Biologi", "Geografi", "Fysik/kemi",
  "Klassens tid", "Understøttende undervisning",
];

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
  "fysik/kemi": "F/K",
  "f/k": "F/K",
  "natur/teknologi": "N/T",
  "natur og teknologi": "N/T",
  "n/t": "N/T",
  "samfundsfag": "Sam",
  "religion": "Rel",
  "kristendom": "Kri",
  "kristendomskundskab": "Kri",
  "musik": "Mus",
  "billedkunst": "BK",
  "håndværk og design": "H&D",
  "håndværk/design": "H&D",
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

// Module-level map fra normaliseret navn → farve. Opdateres af Fagfordeling
// før render baseret på lærer-listens position, så de første 15 lærere
// garanteret får unikke farver (ingen hash-kollisioner). Fallback: simpel hash
// for navne der ikke er i listen (fx tomme/nye lærere under redigering).
let LAERER_FARVE_MAP = new Map();

function farveForNavn(navn) {
  if (!navn || !navn.trim()) return "#cdc5b8"; // tom-tilstand
  const norm = navn.trim().toLowerCase();
  if (LAERER_FARVE_MAP.has(norm)) return LAERER_FARVE_MAP.get(norm);
  // Fallback hash for navne der endnu ikke er i listen
  let hash = 0;
  for (let i = 0; i < norm.length; i++) {
    hash = ((hash * 31) + norm.charCodeAt(i)) >>> 0;
  }
  return AVATAR_PALETTE[hash % AVATAR_PALETTE.length];
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

function GhostInput({ value, onChange, suggestions = [], style, wrapperStyle, className, onKeyDown, onFocus, onBlur, onAccept, ...rest }) {
  const inputRef = React.useRef(null);
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
  const [klasseNavn, setKlasseNavn] = useState("Min klasse");
  const [fag, setFag] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [importFejl, setImportFejl] = useState("");
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
        setKlasseNavn(data.klasseNavn || "Min klasse");
        // Migrér eksisterende data: ældre fag har ikke forventedeLaerere — default 2
        const migreredeFag = (data.fag || []).map((f) => ({
          ...f,
          forventedeLaerere: f.forventedeLaerere ?? 2,
        }));
        setFag(migreredeFag);
      }
    } catch (e) {
      // ingen data endnu eller korrupt — det er fint
    }
    setLoaded(true);
  }, []);

  // Gem automatisk når data ændrer sig
  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(
        "fagfordeling-data",
        JSON.stringify({ klasseNavn, fag })
      );
    } catch (e) {
      console.error("Kunne ikke gemme:", e);
    }
  }, [klasseNavn, fag, loaded]);

  const tilfoejFag = () => {
    const nytId = Date.now();
    setFag([
      ...fag,
      {
        id: nytId,
        navn: "",
        lektioner: 1,
        forventedeLaerere: 2,
        laerere: [{ id: nytId + 1, navn: "", lektioner: 1 }],
      },
    ]);
    // Fold automatisk ud
    setUdfoldede(new Set([...udfoldede, nytId]));
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
                { id: Date.now(), navn: "", lektioner: parseInt(f.lektioner) || 1 },
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
  };

  const sletLaererInternal = (fagId, laererId) => {
    setFag(
      fag.map((f) => {
        if (f.id !== fagId) return f;
        const nyeLaerere = f.laerere.filter((l) => l.id !== laererId);
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
    const antal = f.laerere.length;
    const harNavne = antal > 0 && f.laerere.every((l) => l.navn.trim() !== "");
    const sum = f.laerere.reduce((s, l) => s + (parseInt(l.lektioner) || 0), 0);
    const manglerLaerere = Math.max(0, forventedeLaerere - antal);
    const krav = fagLekt; // minimum sum for "dækket" (sharing-model)
    const maxKrav = fagLekt * Math.max(antal, 1); // maksimum sum (team-teaching med alle assigned)

    // Tom eller mangler navne
    if (antal === 0 || sum === 0 || !harNavne) {
      return { status: "rød", krav, sum, manglerLaerere };
    }

    // Mangler lærere (færre end forventet)
    if (manglerLaerere > 0) {
      return { status: "gul", krav, sum, manglerLaerere };
    }

    // Over-dækning: sum overskrider selv team-teaching
    if (sum > maxKrav) {
      return { status: "over", krav, sum, manglerLaerere: 0 };
    }

    // Mangler lektioner: sum dækker ikke engang sharing-niveau
    if (sum < fagLekt) {
      return { status: "gul", krav, sum, manglerLaerere: 0 };
    }

    // Alt OK: antal ≥ forventede og sum er i [fagLekt, fagLekt × antal]
    return { status: "grøn", krav, sum, manglerLaerere: 0 };
  };

  // Lærer-oversigt på tværs
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
    return Object.values(map).sort((a, b) => b.total - a.total);
  };

  const samletLektioner = fag.reduce(
    (sum, f) => sum + (parseInt(f.lektioner) || 0),
    0
  );
  const dækketLektioner = fag.reduce(
    (sum, f) =>
      sum + f.laerere.reduce((s, l) => s + (parseInt(l.lektioner) || 0), 0),
    0
  );
  const fuldtDækkede = fag.filter((f) => fagStatus(f).status === "grøn").length;

  // Samlet manglende lærer-lektioner: for hvert fag, kombinerer manglende lektioner
  // (sum < fagLekt) og manglende lærere (hver manglende lærer ≈ fagLekt).
  const samletMangler = fag.reduce((acc, f) => {
    const info = fagStatus(f);
    const fagLekt = parseInt(f.lektioner) || 0;
    const lektionDeficit = Math.max(0, fagLekt - info.sum);
    const laererDeficit = info.manglerLaerere * fagLekt;
    return acc + lektionDeficit + laererDeficit;
  }, 0);

  // Samlet overdækning: hvor mange lektioner sum overskrider team-teaching-loftet
  const samletOver = fag.reduce((acc, f) => {
    const fagLekt = parseInt(f.lektioner) || 0;
    const sum = f.laerere.reduce((s, l) => s + (parseInt(l.lektioner) || 0), 0);
    const maxKrav = fagLekt * Math.max(f.laerere.length, 1);
    return acc + Math.max(0, sum - maxKrav);
  }, 0);

  // Eksport / import
  const eksporter = () => {
    const data = JSON.stringify({ klasseNavn, fag }, null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `fagfordeling-${klasseNavn.replace(/\s+/g, "-")}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importerData = (jsonString) => {
    try {
      const data = JSON.parse(jsonString);
      if (!data.fag) {
        setImportFejl("Filen ser ikke ud til at være en fagfordeling.");
        return;
      }
      setKlasseNavn(data.klasseNavn || "Min klasse");
      setFag(data.fag);
      setShowImport(false);
      setImportFejl("");
    } catch (e) {
      setImportFejl("Kunne ikke læse filen. Tjek at det er en gyldig fagfordelings-fil.");
    }
  };

  const nulstilAlt = () => {
    setBekraeftSlet({
      titel: "Start forfra?",
      tekst: "Slet alt indhold (klassenavn, fag og lærere) og start fra bunden? Det kan ikke fortrydes.",
      bekraeftTekst: "Start forfra",
      onConfirm: () => {
        setKlasseNavn("Min klasse");
        setFag([]);
        setUdfoldede(new Set());
        try { localStorage.removeItem("fagfordeling-data"); } catch (e) {}
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

  const oversigt = laererOversigt();
  // Opdatér farve-map FØR render — så alle avatar-komponenter (sidebar, fag-kort,
  // drag-overlay, mobil) ser samme position-baserede farve under samme render.
  // Dette eliminerer hash-kollisioner mellem synlige lærere.
  LAERER_FARVE_MAP = buildLaererFarveMap(oversigt);

  // Unikke eksisterende lærere (normaliseret, dedupliceret, sorteret) til autosuggest
  const eksisterendeLaerere = (() => {
    const map = new Map();
    fag.forEach(f => f.laerere.forEach(l => {
      const norm = normalizeNavn(l.navn);
      if (norm) map.set(norm.toLowerCase(), norm);
    }));
    return [...map.values()].sort((a, b) => a.localeCompare(b, "da"));
  })();

  // Drag-and-drop sensors: musen skal trække 8px før drag starter (forhindrer
  // utilsigtede drags ved klik på inputs); touch venter 200ms (long-press),
  // så scroll og tryk på inputs ikke aktiverer drag.
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 6 } }),
  );

  // closestCorners alene — den finder altid den nærmeste retning, så de
  // andre kort begynder at glide LIDT FØR musen rammer destinationen.
  // Det giver en blød "forhandlet" overgang i stedet for et brat snap når
  // tærsklen krydses. MeasuringStrategy.Always (på DndContext) sikrer at
  // målingerne er friske, så der ikke kommer flip-back-glitch.
  const collisionDetectionStrategy = closestCorners;

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

    // Skip sidebar-drag — den håndteres som "tilføj lærer til fag" i handleDragEnd
    const isSidebarDrag = typeof active.id === "string" && active.id.startsWith("sidebar:");
    if (isSidebarDrag) return;

    const overIsFag = fag.some((f) => f.id === over.id);

    // Find current source (kan være ændret af tidligere drag-over events)
    const currentSource = fag.find((f) => f.laerere.some((l) => l.id === active.id));
    if (!currentSource) return;

    // Find target fag
    const target = overIsFag
      ? fag.find((f) => f.id === over.id)
      : fag.find((f) => f.laerere.some((l) => l.id === over.id));
    if (!target) return;

    // Samme fag — lad SortableContext håndtere within-fag shuffle
    if (target.id === currentSource.id) return;

    // Cross-fag flytning
    const movingLaerer = currentSource.laerere.find((l) => l.id === active.id);
    let destIndex = overIsFag
      ? target.laerere.length
      : target.laerere.findIndex((l) => l.id === over.id);
    if (destIndex < 0) destIndex = target.laerere.length;

    setFag((prev) => prev.map((f) => {
      if (f.id === currentSource.id) {
        return { ...f, laerere: f.laerere.filter((l) => l.id !== active.id) };
      }
      if (f.id === target.id) {
        // Forhindrer dobbelt-indsættelse ved hurtige drag-over events
        if (f.laerere.some((l) => l.id === active.id)) return f;
        const newLaerere = [...f.laerere];
        newLaerere.splice(destIndex, 0, movingLaerer);
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

    // Sidebar-drag: tilføj lærer til target-fag (med lektioner = fagets lektioner).
    // Skip hvis lærer allerede er på faget.
    if (typeof activeId === "string" && activeId.startsWith("sidebar:")) {
      const sidebarNavn = activeId.slice("sidebar:".length);
      let targetFagId = null;
      if (overIsFag) {
        targetFagId = over.id;
      } else {
        const overFag = fag.find((f) => f.laerere.some((l) => l.id === over.id));
        if (overFag) targetFagId = overFag.id;
      }
      if (!targetFagId) return;
      setFag((prev) => prev.map((f) => {
        if (f.id !== targetFagId) return f;
        const norm = normalizeNavn(sidebarNavn).toLowerCase();
        if (f.laerere.some((l) => normalizeNavn(l.navn).toLowerCase() === norm)) {
          return f; // allerede på faget — no-op
        }
        const fagLekt = parseInt(f.lektioner) || 0;
        return {
          ...f,
          laerere: [...f.laerere, { id: Date.now(), navn: sidebarNavn, lektioner: fagLekt }],
        };
      }));
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
    // Vi håndterer her: (a) within-fag reorder, (b) lektionstal-justering ved cross-fag.
    const currentFag = fag.find((f) => f.laerere.some((l) => l.id === activeId));
    if (!currentFag) return;

    // Within-fag reorder (drop på en anden lærer i samme fag)
    if (!overIsFag) {
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
        input:focus { outline: 2px solid #2d5016; outline-offset: 1px; }
        .fag-input::placeholder { color: #9a9387; }
        .icon-btn { transition: all 0.15s ease; }
        .icon-btn:hover { background: rgba(0,0,0,0.06); }
        .laerer-row { transition: background 0.15s ease; }
        .laerer-row:hover { background: rgba(0,0,0,0.02); }
        .header-btn { transition: all 0.15s ease; }
        .header-btn:hover { background: #2d5016; color: #f5f1ea; }
        .add-fag-btn { transition: all 0.2s ease; }
        .add-fag-btn:hover { background: #2d5016; color: #f5f1ea; transform: translateY(-1px); }
        input[type=number]::-webkit-inner-spin-button,
        input[type=number]::-webkit-outer-spin-button {
          -webkit-appearance: none; margin: 0;
        }
        input[type=number] { -moz-appearance: textfield; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes sheetFade { from { opacity: 0; } to { opacity: 1; } }
        @keyframes sheetSlide { from { transform: translateY(100%); } to { transform: translateY(0); } }
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
      `}</style>

      <div className="page-wrap" style={{ maxWidth: "1280px", margin: "0 auto", padding: "24px 24px 64px" }}>
        {/* Header */}
        <header style={{ marginBottom: "20px" }}>
          {/* Klassenavn + import/eksport på samme linje */}
          <div style={{
            display: "flex", justifyContent: "space-between",
            alignItems: "center", gap: "16px",
          }}>
            <input
              className="klasse-titel"
              type="text"
              value={klasseNavn}
              onChange={(e) => setKlasseNavn(e.target.value)}
              style={{
                fontFamily: "'Fraunces', Georgia, serif",
                fontSize: "44px",
                fontWeight: 600,
                letterSpacing: "-0.02em",
                color: "#1a1a1a",
                background: "transparent",
                border: "none",
                padding: "0",
                lineHeight: 1,
                fieldSizing: "content",
                minWidth: "60px",
                maxWidth: "100%",
                flex: "0 1 auto",
              }}
            />
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
              <button
                onClick={eksporter}
                className="header-btn header-io-btn"
                aria-label="Eksportér"
                title="Eksportér"
                style={{
                  display: "flex", alignItems: "center", gap: "6px",
                  padding: "8px 12px", fontSize: "13px", fontWeight: 500,
                  background: "transparent", border: "1px solid #1a1a1a",
                  color: "#1a1a1a", borderRadius: "0", cursor: "pointer",
                }}
              >
                <Download size={14} /> <span className="header-btn-label">Eksportér</span>
              </button>
              <button
                onClick={nulstilAlt}
                className="header-btn header-io-btn"
                aria-label="Start forfra"
                title="Start forfra — slet alt"
                style={{
                  display: "flex", alignItems: "center", gap: "6px",
                  padding: "8px 10px", fontSize: "13px",
                  background: "transparent", border: "1px solid #cdc5b8",
                  color: "#9a9387", borderRadius: "0", cursor: "pointer",
                }}
              >
                <RotateCcw size={14} />
              </button>
            </div>
          </div>
        </header>

        {/* === MOBIL-LAYOUT === */}
        {isMobile && (
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
        {!isMobile && (
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
        <div className="main-grid" style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) 264px", gap: "16px", alignItems: "start" }}>
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
                padding: "48px 24px", textAlign: "center",
                background: "#fff", border: "1px dashed #cdc5b8",
                color: "#7a7367",
              }}>
                <BookOpen size={32} style={{ marginBottom: "12px", opacity: 0.5 }} />
                <div style={{ fontSize: "14px" }}>Ingen fag endnu. Tilføj dit første fag nedenfor.</div>
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
              <span style={{ fontSize: "12px", color: "#9a9387", fontWeight: 500 }}>
                {oversigt.length} i alt
              </span>
            </div>

            <div style={{ background: "transparent" }}>
              {oversigt.length === 0 ? (
                <div style={{ padding: "32px 14px", textAlign: "center", color: "#9a9387" }}>
                  <Users size={24} style={{ marginBottom: "8px", opacity: 0.5 }} />
                  <div style={{ fontSize: "13px" }}>Ingen lærere endnu</div>
                </div>
              ) : (
                oversigt.map((l) => (
                  <SidebarLaererRow key={l.navn} l={l} />
                ))
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
              <p style={{ fontSize: "13px", color: "#5a5448", marginTop: 0, marginBottom: "16px" }}>
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
    talFarve = "#9a9387";
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
    statusFarve = "#9a9387";
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
            fontSize: "13px", color: "#5a5448", margin: 0, lineHeight: 1.5,
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
              color: "#9a9387",
              fontWeight: 400,
              lineHeight: 1.3,
              whiteSpace: "nowrap",
            }}>
              {fagForkortelse(fa.fagNavn)}{" "}
              <span style={{ color: "#5a5448" }}>
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
  l, fagId, mode,
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
    const lekt = parseInt(l.lektioner) || 0;
    return (
      <div ref={setNodeRef} {...attributes} style={{
        display: "flex", alignItems: "center", gap: "8px",
        padding: "3px 0",
        ...sortStyle,
      }}>
        <div {...listeners} style={{
          width: "18px", height: "18px", borderRadius: "50%",
          background: farveForNavn(l.navn),
          color: "#fff", fontSize: "10px", fontWeight: 600,
          display: "flex", alignItems: "center", justifyContent: "center",
          flexShrink: 0,
          cursor: "grab", touchAction: "none",
        }}>
          {l.navn.charAt(0).toUpperCase()}
        </div>
        <span style={{
          flex: 1, minWidth: 0,
          fontSize: "13px", color: "#1a1a1a",
          fontStyle: "normal",
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        }}>
          {l.navn}
        </span>
        <span style={{
          fontSize: "11px", color: "#9a9387",
          flexShrink: 0,
        }}>
          {lekt} lek
        </span>
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
      <span style={{ fontSize: "12px", color: "#9a9387", flexShrink: 0 }}>lek</span>
      {allowDelete && (
        <button
          onClick={() => sletLaerer(fagId, l.id)}
          className="icon-btn"
          style={{
            padding: "4px", background: "transparent",
            border: "none", cursor: "pointer", color: "#9a9387",
            flexShrink: 0,
          }}
        >
          <X size={14} />
        </button>
      )}
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
  // Auto-jump fra fagnavn → lektion sker kun første gang fagnavnet skrives.
  // Hvis kortet allerede har et navn ved mount (loadet fra storage), springer vi over.
  const [hasJumpedToLekt, setHasJumpedToLekt] = React.useState(() => f.navn.trim().length > 0);

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
        {/* Fagnavn — auto-bredde, kun teksten er klikbar */}
        <GhostInput
          className="fag-input fag-card-fagnavn"
          type="text"
          placeholder="Fagnavn"
          value={f.navn}
          onChange={(navn) => opdaterFag(f.id, { navn })}
          suggestions={STANDARD_FAG}
          onAccept={focusLektFirstTime}
          onBlur={() => {
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
            onBlur={() => {
              if (f.lektioner === "" || f.lektioner === undefined) {
                opdaterFag(f.id, { lektioner: 0 });
              }
            }}
            style={{
              fontFamily: "'Fraunces', Georgia, serif",
              fontSize: "16px", fontWeight: 500, color: "#5a5448",
              background: "transparent", border: "none",
              padding: "0", textAlign: "left",
            }}
          />
          <span className="fag-card-lekt-label" style={{
            fontSize: "12px", color: "#9a9387",
          }}>
            lektioner
          </span>
        </div>

        {/* Status-ikon */}
        <div style={{
          flexShrink: 0, display: "flex",
          alignItems: "center", justifyContent: "center",
          color: farve.border,
        }}
          title={status === "grøn" ? (statusInfo.delt ? "Dækket (delt)" : "Dækket") :
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
        </div>

        {/* Toggle-knap */}
        <button
          onClick={() => toggleUdfoldet(f.id)}
          className="icon-btn"
          style={{
            padding: "4px", background: "transparent",
            border: "none", cursor: "pointer", color: "#9a9387",
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
          Tomme pladser fyldes op til forventedeLaerere, så kort med 1 lærer
          har samme højde som kort med 2 lærere. */}
      {!erUdfoldet && f.laerere.some((l) => l.navn.trim()) && (() => {
        const namedLaerere = f.laerere.filter((l) => l.navn.trim());
        const forventede = parseInt(f.forventedeLaerere) || 2;
        const emptyCount = Math.max(0, forventede - namedLaerere.length);
        return (
          <div style={{ borderTop: "1px solid #f0ead9", padding: "6px 14px 10px" }}>
            <SortableContext
              items={namedLaerere.map((l) => l.id)}
              strategy={verticalListSortingStrategy}
            >
              {namedLaerere.map((l) => (
                <SortableLaererRow key={l.id} l={l} fagId={f.id} mode="compact" />
              ))}
            </SortableContext>
            {Array.from({ length: emptyCount }).map((_, i) => (
              <div key={`empty-${i}`} style={{ height: "26px" }} />
            ))}
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
                      color: aktiv ? "#f5f1ea" : "#5a5448",
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
                  fontSize: "13px", fontWeight: 500, color: "#5a5448",
                  background: "transparent", border: "none", cursor: "pointer",
                }}
              >
                <Plus size={14} /> Tilføj lærer
                {f.laerere.length === 2 && <span style={{ color: "#9a9387", fontWeight: 400 }}>(3. lærer)</span>}
              </button>
            ) : <div />}
            <button
              onClick={() => sletFag(f.id)}
              style={{
                display: "flex", alignItems: "center", gap: "6px",
                padding: "4px 8px",
                fontSize: "12px", color: "#9a9387",
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
        Fag <span style={{ fontSize: "12px", color: "#9a9387", fontWeight: 500 }}>{fagAntal}</span>
      </button>
      <button onClick={() => setTab("laerere")} style={tabStyle(tab === "laerere")}>
        Lærere <span style={{ fontSize: "12px", color: "#9a9387", fontWeight: 500 }}>{laererAntal}</span>
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
          padding: "6px", cursor: "pointer", color: "#9a9387",
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
