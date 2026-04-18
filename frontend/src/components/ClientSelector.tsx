import { type ClientSummary } from "../api";
import { ChevronDown, Search } from "lucide-react";
import { getInitials } from "../lib/format";
import { useState, useRef, useEffect } from "react";

interface Props {
  clients: ClientSummary[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  loading: boolean;
}

export default function ClientSelector({ clients, selectedId, onSelect, loading }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  const selected = clients.find((c) => c.client_id === selectedId);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const filtered = clients.filter((c) => {
    const q = query.toLowerCase();
    return (
      c.prenom.toLowerCase().includes(q) ||
      c.nom.toLowerCase().includes(q) ||
      c.archetype.toLowerCase().includes(q)
    );
  });

  return (
    <div ref={ref} className="relative w-full sm:w-auto">
      <button
        onClick={() => setOpen(!open)}
        disabled={loading}
        className="w-full flex items-center gap-2 sm:gap-3 bg-white border border-slate-200 rounded-xl px-2.5 sm:px-3 py-1.5 sm:py-2 hover:border-slate-300 transition-colors sm:min-w-[280px] text-left"
      >
        {selected ? (
          <>
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-[#009E60]/10 text-[#009E60] flex items-center justify-center text-xs font-semibold flex-shrink-0">
              {getInitials(selected.prenom, selected.nom)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-900 truncate leading-tight">
                {selected.prenom} {selected.nom}
              </p>
              <p className="text-[11px] sm:text-xs text-slate-500 truncate leading-tight">{selected.archetype}</p>
            </div>
          </>
        ) : (
          <span className="text-sm text-slate-500 flex-1 truncate">
            {loading ? "Chargement…" : "Sélectionner un client"}
          </span>
        )}
        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform flex-shrink-0 ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-xl shadow-lg z-20 overflow-hidden">
          <div className="p-2 border-b border-slate-100">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input
                autoFocus
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Rechercher un client…"
                className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-transparent rounded-lg focus:outline-none focus:bg-white focus:border-slate-200"
              />
            </div>
          </div>
          <div className="max-h-80 overflow-y-auto scrollbar-thin">
            {filtered.length === 0 ? (
              <p className="px-4 py-6 text-sm text-center text-slate-400">Aucun client trouvé</p>
            ) : (
              filtered.map((c) => (
                <button
                  key={c.client_id}
                  onClick={() => {
                    onSelect(c.client_id);
                    setOpen(false);
                    setQuery("");
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-slate-50 transition-colors ${
                    c.client_id === selectedId ? "bg-[#009E60]/5" : ""
                  }`}
                >
                  <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center text-xs font-semibold flex-shrink-0">
                    {getInitials(c.prenom, c.nom)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">
                      {c.prenom} {c.nom}
                    </p>
                    <p className="text-xs text-slate-500 truncate">{c.archetype}</p>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
