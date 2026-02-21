import { Calendar, Eye, EyeOff, Upload, Download, Ban, Map, RefreshCw, Copy, RotateCcw, Settings, BarChart3, Sun, Moon } from "lucide-react";
import { useRef, useState, useEffect } from "react";
import Link from "next/link";

interface StatsHeaderProps {
    selectedDay: string;
    showUnassigned: boolean;
    hasGlobalErrors: boolean;
    globalErrors: string[];
    onDayChange: (day: string) => void;
    onToggleUnassigned: () => void;
    onImport: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onExport: () => void;
    onShowConstraints: () => void;
    onAutoAssign: () => void;
    onCopyList: () => void;
    onShowMap: () => void;
    onShowStats?: () => void;
    onReset: () => void;
    onUndo?: () => void;
    canUndo?: boolean;
    pdfExportElement?: React.ReactNode;
}

export default function StatsHeader({
    selectedDay,
    showUnassigned,
    hasGlobalErrors,
    globalErrors,
    onDayChange,
    onToggleUnassigned,
    onImport,
    onExport,
    onShowConstraints,
    onAutoAssign,
    onCopyList,
    onShowMap,
    onShowStats,
    onReset,
    onUndo,
    canUndo,
    pdfExportElement
}: StatsHeaderProps) {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isLightMode, setIsLightMode] = useState(false);

    // Initialize theme from localStorage on mount
    useEffect(() => {
        const savedTheme = localStorage.getItem('assemblea_theme');
        if (savedTheme === 'light') {
            setIsLightMode(true);
            document.body.classList.add('light-theme');
        }
    }, []);

    const toggleTheme = () => {
        setIsLightMode(prev => {
            const next = !prev;
            if (next) {
                document.body.classList.add('light-theme');
                localStorage.setItem('assemblea_theme', 'light');
            } else {
                document.body.classList.remove('light-theme');
                localStorage.setItem('assemblea_theme', 'dark');
            }
            return next;
        });
    };

    return (
        <header className="flex-row justify-between items-center print:hidden" style={{ marginBottom: '2rem', marginTop: '1.5rem', paddingBottom: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
            <div>
                <h1 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '0.25rem', background: 'linear-gradient(135deg, #6366f1, #38bdf8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                    📋 Gestione Assemblea
                </h1>
                <p className="text-sm" style={{ opacity: 0.7 }}>A cura di Alessandro Bigi</p>
            </div>

            <div className="flex-row gap-2" style={{ flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                <input
                    type="file"
                    ref={fileInputRef}
                    style={{ display: 'none' }}
                    accept=".json"
                    onChange={onImport}
                />

                {/* Day Selector */}
                <div className="glass-panel flex-row items-center gap-2" style={{ padding: '0.5rem 1rem', background: 'rgba(99, 102, 241, 0.1)', borderColor: 'rgba(99, 102, 241, 0.3)' }}>
                    <Calendar size={16} style={{ color: '#818cf8' }} />
                    <select
                        value={selectedDay}
                        onChange={(e) => onDayChange(e.target.value)}
                        style={{ background: 'transparent', color: 'inherit', border: 'none', fontWeight: 'bold', cursor: 'pointer' }}
                    >
                        {["Lunedì", "Martedì", "Mercoledì", "Giovedì", "Venerdì", "Sabato"].map(d => (
                            <option key={d} value={d} style={{ color: 'black' }}>{d}</option>
                        ))}
                    </select>
                </div>

                <button
                    onClick={onToggleUnassigned}
                    className="glass-panel hover:bg-white/10"
                    style={{ padding: '0.5rem 1rem', cursor: 'pointer', display: 'flex', gap: '0.5rem', alignItems: 'center' }}
                    title={showUnassigned ? "Nascondi Classi" : "Mostra Classi"}
                >
                    {showUnassigned ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>

                <button
                    onClick={() => fileInputRef.current?.click()}
                    className="glass-panel hover:bg-white/10"
                    style={{ padding: '0.5rem 1rem', cursor: 'pointer', display: 'flex', gap: '0.5rem', alignItems: 'center' }}
                    title="Importa"
                >
                    <Upload size={16} />
                </button>

                <button
                    onClick={onExport}
                    className="glass-panel hover:bg-white/10"
                    style={{ padding: '0.5rem 1rem', cursor: 'pointer', display: 'flex', gap: '0.5rem', alignItems: 'center' }}
                    title="Esporta"
                >
                    <Download size={16} />
                </button>

                <button
                    onClick={onShowConstraints}
                    className="glass-panel hover:bg-white/10"
                    style={{ padding: '0.5rem 1rem', cursor: 'pointer', display: 'flex', gap: '0.5rem', alignItems: 'center' }}
                    title="Vincoli"
                >
                    <Ban size={16} />
                </button>

                <button
                    onClick={onAutoAssign}
                    className="glass-panel hover:bg-white/10"
                    style={{ padding: '0.5rem 1rem', cursor: 'pointer', display: 'flex', gap: '0.5rem', alignItems: 'center', background: 'rgba(34, 197, 94, 0.1)', borderColor: 'rgba(34, 197, 94, 0.3)', color: '#86efac' }}
                    title="Auto Assegna"
                >
                    🎲 Auto
                </button>

                <button
                    onClick={onCopyList}
                    className="glass-panel hover:bg-white/10"
                    style={{ padding: '0.5rem 1rem', cursor: 'pointer', display: 'flex', gap: '0.5rem', alignItems: 'center', background: 'rgba(99, 102, 241, 0.1)', borderColor: 'rgba(99, 102, 241, 0.3)', color: '#a5b4fc' }}
                    title="Copia elenco turni"
                >
                    <Copy size={16} /> Copia
                </button>

                <button
                    onClick={onShowMap}
                    className="glass-panel hover:bg-white/10"
                    style={{ padding: '0.5rem 1rem', cursor: 'pointer', display: 'flex', gap: '0.5rem', alignItems: 'center', background: 'rgba(236, 72, 153, 0.1)', borderColor: 'rgba(236, 72, 153, 0.3)', color: '#f9a8d4' }}
                    title="Mappa Posti Auditorium"
                >
                    <Map size={16} /> Mappa
                </button>

                {onShowStats && (
                    <button
                        onClick={onShowStats}
                        className="glass-panel hover:bg-white/10"
                        style={{ padding: '0.5rem 1rem', cursor: 'pointer', display: 'flex', gap: '0.5rem', alignItems: 'center', background: 'rgba(59, 130, 246, 0.1)', borderColor: 'rgba(59, 130, 246, 0.3)', color: '#93c5fd' }}
                        title="Statistiche"
                    >
                        <BarChart3 size={16} /> Stats
                    </button>
                )}

                {pdfExportElement}

                {onUndo && (
                    <button
                        onClick={onUndo}
                        disabled={!canUndo}
                        className="glass-panel hover:bg-white/10"
                        style={{
                            padding: '0.5rem 1rem',
                            cursor: canUndo ? 'pointer' : 'not-allowed',
                            display: 'flex',
                            gap: '0.5rem',
                            alignItems: 'center',
                            opacity: canUndo ? 1 : 0.5
                        }}
                        title="Annulla ultima azione"
                    >
                        <RotateCcw size={16} />
                    </button>
                )}

                {hasGlobalErrors && (
                    <div className="glass-panel" style={{ padding: '0.5rem 1rem', borderColor: '#ef4444', color: '#ef4444' }}>
                        {globalErrors.map((e, i) => <div key={i}>⚠️ {e}</div>)}
                    </div>
                )}

                <button
                    onClick={onReset}
                    className="glass-panel"
                    style={{ padding: '0.5rem 1rem', cursor: 'pointer', background: 'rgba(239, 68, 68, 0.1)', borderColor: 'rgba(239, 68, 68, 0.3)', color: '#fca5a5' }}
                    title="Reset"
                >
                    <RefreshCw size={16} />
                </button>

                {/* Theme Toggle Button */}
                <button
                    onClick={toggleTheme}
                    className="glass-panel hover:bg-white/10"
                    style={{ padding: '0.5rem 1rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', color: isLightMode ? '#f59e0b' : '#fcd34d' }}
                    title={isLightMode ? "Passa al tema Scuro" : "Passa al tema Chiaro"}
                >
                    {isLightMode ? <Sun size={16} /> : <Moon size={16} />}
                </button>

                <Link
                    href="/settings"
                    className="glass-panel hover:bg-white/10"
                    style={{ padding: '0.5rem 1rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                    title="Impostazioni"
                >
                    <Settings size={16} />
                </Link>
            </div>
        </header>
    );
}
