"use client";

import { useState, useEffect, useRef } from "react";
import { Upload, Users, Calendar, ArrowRight, Download, Eye, EyeOff, Ban, X, Plus, Trash2 } from "lucide-react";
import { AssemblyManager } from "@/lib/scheduler";
import { AssemblyEntry } from "@/lib/parsers";

export default function Dashboard() {
    const [manager] = useState(new AssemblyManager());
    const [loading, setLoading] = useState(true);
    const [selectedDay, setSelectedDay] = useState("Mercoledì");
    const [shifts, setShifts] = useState<{ [key: string]: AssemblyEntry[] }>({
        "Primo turno": [],
        "Secondo turno": [],
        "Terzo turno": [],
        "Quarto turno": [],
    });
    const [unassignedClasses, setUnassignedClasses] = useState<AssemblyEntry[]>([]);
    const [globalErrors, setGlobalErrors] = useState<string[]>([]);
    const [shiftErrors, setShiftErrors] = useState<{ [key: string]: string[] }>({});
    const [conflictMap, setConflictMap] = useState<{ [classId: string]: string[] }>({});
    const [showUnassigned, setShowUnassigned] = useState(true);

    // Constraints: Key = classId, Value = Array of forbidden shifts
    const [constraints, setConstraints] = useState<{ [classId: string]: string[] }>({});
    const [showConstraintsModal, setShowConstraintsModal] = useState(false);

    // For the modal form
    const [selectedConstraintClass, setSelectedConstraintClass] = useState("");
    const [selectedConstraintShifts, setSelectedConstraintShifts] = useState<string[]>([]);

    // Re-implementing init to ensure state consistency
    useEffect(() => {
        async function init() {
            setLoading(true); // Ensure loading state
            try {
                // Fetch all CSVs
                const scheduleRes = await fetch("/orario.csv");
                const assemblyRes = await fetch("/assemblea.csv");
                const teachersRes = await fetch("/orario_prof.csv");

                if (!scheduleRes.ok || !assemblyRes.ok || !teachersRes.ok) {
                    throw new Error("Failed to fetch one or more CSV files");
                }

                const scheduleText = await scheduleRes.text();
                const assemblyText = await assemblyRes.text();
                const teachersText = await teachersRes.text();

                // Load all data into manager
                await manager.loadData(scheduleText, assemblyText, teachersText);

                const classes = manager.getClasses();
                const mapped: any = {
                    "Primo turno": [],
                    "Secondo turno": [],
                    "Terzo turno": [],
                    "Quarto turno": []
                };
                const unassigned: AssemblyEntry[] = [];

                classes.forEach(cls => {
                    // Normalize shift name from CSV if present
                    if (cls.shiftName) {
                        // Simple matching
                        const key = Object.keys(mapped).find(k => k.toLowerCase().includes(cls.shiftName.toLowerCase()));
                        if (key) {
                            mapped[key].push(cls);
                        } else {
                            unassigned.push(cls);
                        }
                    } else {
                        unassigned.push(cls);
                    }
                });

                // Logic: If everything is unassigned (CSV has no shifts), keep it so.
                // If CSV had assignments, use them.
                const hasAssignments = Object.values(mapped).some((ary: any) => ary.length > 0);

                if (hasAssignments) {
                    setShifts(mapped);
                    setUnassignedClasses(unassigned);
                } else {
                    setUnassignedClasses(classes);
                }

                setLoading(false);
            } catch (e) {
                console.error(e);
                setLoading(false);
            }
        }
        init();
    }, []);

    // Validation Effect
    useEffect(() => {
        if (loading) return;

        const newShiftErrors: any = {};

        // Validate each shift
        Object.keys(shifts).forEach(shiftName => {
            const classIds = shifts[shiftName].map(c => c.classId);
            const errs = manager.validateShift(shiftName, classIds, selectedDay);
            if (errs.length > 0) {
                newShiftErrors[shiftName] = errs;
            }
        });

        // Check teacher conflicts
        const shiftMap: { [key: string]: string[] } = {};
        Object.keys(shifts).forEach(k => shiftMap[k] = shifts[k].map(c => c.classId));

        const conflicts = manager.getTeacherConflicts(selectedDay, shiftMap);

        setShiftErrors(newShiftErrors);
        setGlobalErrors([]);
        setConflictMap(conflicts);
    }, [shifts, selectedDay, manager, loading]);

    const addConstraint = () => {
        if (!selectedConstraintClass || selectedConstraintShifts.length === 0) return;

        setConstraints(prev => ({
            ...prev,
            [selectedConstraintClass]: selectedConstraintShifts
        }));

        // Reset form
        setSelectedConstraintClass("");
        setSelectedConstraintShifts([]);
    };

    const removeConstraint = (classId: string) => {
        const newC = { ...constraints };
        delete newC[classId];
        setConstraints(newC);
    };

    const toggleConstraintShift = (shift: string) => {
        if (selectedConstraintShifts.includes(shift)) {
            setSelectedConstraintShifts(prev => prev.filter(s => s !== shift));
        } else {
            setSelectedConstraintShifts(prev => [...prev, shift]);
        }
    };

    const handleDragStart = (e: React.DragEvent, classId: string, source: string) => {
        e.dataTransfer.setData("classId", classId);
        e.dataTransfer.setData("source", source);
    };

    const handleDrop = (e: React.DragEvent, targetShift: string) => {
        e.preventDefault();
        const classId = e.dataTransfer.getData("classId");
        const source = e.dataTransfer.getData("source");

        if (source === targetShift) return;

        let classObj: AssemblyEntry | undefined;

        if (source === "unassigned") {
            classObj = unassignedClasses.find(c => c.classId === classId);
            setUnassignedClasses(prev => prev.filter(c => c.classId !== classId));
        } else {
            classObj = shifts[source].find(c => c.classId === classId);
            setShifts(prev => ({
                ...prev,
                [source]: prev[source].filter(c => c.classId !== classId)
            }));
        }

        if (classObj) {
            if (targetShift === "unassigned") {
                setUnassignedClasses(prev => [...prev, classObj!]);
            } else {
                setShifts(prev => ({
                    ...prev,
                    [targetShift]: [...prev[targetShift], classObj!]
                }));
            }
        }
    };

    const handleDragOver = (e: React.DragEvent) => e.preventDefault();

    const getShiftTime = (shift: string) => {
        if (shift.toLowerCase().includes("primo")) return "8h10";
        if (shift.toLowerCase().includes("secondo")) return "9h10";
        if (shift.toLowerCase().includes("terzo")) return "11h10";
        if (shift.toLowerCase().includes("quarto")) return "12h10";
        return "8h10";
    };

    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleReset = () => {
        const all = [...unassignedClasses];
        Object.values(shifts).forEach(list => all.push(...list));
        // Sort
        all.sort((a, b) => a.classId.localeCompare(b.classId));

        setUnassignedClasses(all);
        setShifts({
            "Primo turno": [],
            "Secondo turno": [],
            "Terzo turno": [],
            "Quarto turno": [],
        });
    };

    const handleExport = () => {
        const data = {
            shifts,
            unassignedClasses,
            selectedDay,
            constraints
        };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `assemblea_config_${selectedDay}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const json = JSON.parse(e.target?.result as string);
                if (json.shifts && json.unassignedClasses) {
                    setShifts(json.shifts);
                    setUnassignedClasses(json.unassignedClasses);
                    if (json.selectedDay) setSelectedDay(json.selectedDay);
                    if (json.constraints) setConstraints(json.constraints);
                } else {
                    alert("File non valido");
                }
            } catch (err) {
                console.error("Error parsing JSON", err);
                alert("Errore durante la lettura del file");
            }
        };
        reader.readAsText(file);
    };

    // Auto-sort helper
    const sortClasses = (classes: AssemblyEntry[]) => {
        return [...classes].sort((a, b) => a.classId.localeCompare(b.classId));
    };

    if (loading) return <div className="container text-2xl">Caricamento dati...</div>;

    return (
        <div className="container" style={{ maxWidth: '100%', paddingBottom: showUnassigned ? '250px' : '2rem' }}> {/* Padding bottom for footer */}
            <header className="flex-row justify-between items-center mb-24 mt-8 print:hidden"> {/* Increased spacing */}
                <div>
                    <h1 className="text-2xl" style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>
                        Gestione Assemblea
                    </h1>
                </div>

                <div className="flex-row gap-4">
                    {/* Hidden Import Input */}
                    <input
                        type="file"
                        ref={fileInputRef}
                        style={{ display: 'none' }}
                        accept=".json"
                        onChange={handleImport}
                    />

                    <button
                        onClick={() => setShowUnassigned(!showUnassigned)}
                        className="glass-panel hover:bg-white/10"
                        style={{ padding: '0.5rem 1rem', cursor: 'pointer', display: 'flex', gap: '0.5rem', alignItems: 'center' }}
                        title={showUnassigned ? "Nascondi Classi" : "Mostra Classi"}
                    >
                        {showUnassigned ? <EyeOff size={18} /> : <Eye size={18} />} {showUnassigned ? "Nascondi Classi" : "Mostra Classi"}
                    </button>

                    <button
                        onClick={() => fileInputRef.current?.click()}
                        className="glass-panel hover:bg-white/10"
                        style={{ padding: '0.5rem 1rem', cursor: 'pointer', display: 'flex', gap: '0.5rem', alignItems: 'center' }}
                        title="Importa Configurazione"
                    >
                        <Upload size={18} /> Importa
                    </button>

                    <button
                        onClick={handleExport}
                        className="glass-panel hover:bg-white/10"
                        style={{ padding: '0.5rem 1rem', cursor: 'pointer', display: 'flex', gap: '0.5rem', alignItems: 'center' }}
                        title="Esporta Configurazione"
                    >
                        <Download size={18} /> Esporta
                    </button>

                    <button
                        onClick={() => setShowConstraintsModal(true)}
                        className="glass-panel hover:bg-white/10"
                        style={{ padding: '0.5rem 1rem', cursor: 'pointer', display: 'flex', gap: '0.5rem', alignItems: 'center' }}
                        title="Gestisci Vincoli"
                    >
                        <Ban size={18} /> Vincoli
                    </button>

                    {globalErrors.length > 0 && (
                        <div className="glass-panel" style={{ padding: '0.5rem 1rem', borderColor: '#ef4444', color: '#ef4444' }}>
                            {globalErrors.map((e, i) => <div key={i}>⚠️ {e}</div>)}
                        </div>
                    )}

                    <button
                        onClick={handleReset}
                        className="glass-panel"
                        style={{ padding: '0.5rem 1rem', cursor: 'pointer', background: 'rgba(239, 68, 68, 0.1)', borderColor: 'rgba(239, 68, 68, 0.3)', color: '#fca5a5' }}
                    >
                        Reset Tutto
                    </button>

                    <div className="glass-panel" style={{ padding: '0.5rem 1rem' }}>
                        <label className="text-sm mr-2">Giorno:</label>
                        <select
                            value={selectedDay}
                            onChange={(e) => setSelectedDay(e.target.value)}
                            style={{ background: 'transparent', color: 'white', border: 'none', fontWeight: 'bold' }}
                        >
                            {["Lunedì", "Martedì", "Mercoledì", "Giovedì", "Venerdì", "Sabato"].map(d => (
                                <option key={d} value={d}>{d}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </header>

            <div className="grid grid-cols-4 gap-4"> {/* Horizontal row of 4 */}
                {Object.keys(shifts).map((shift) => {
                    // Sort classes for display
                    const sortedShiftClasses = sortClasses(shifts[shift]);
                    // PASS SELECTED DAY
                    const stats = manager.getShiftStats(shift, sortedShiftClasses.map(c => c.classId), selectedDay);
                    const capacityPct = (stats.totalPeople / 499) * 100;
                    const isOverCapacity = stats.totalPeople > 499;

                    return (
                        <div
                            key={shift}
                            className="glass-panel drop-zone flex-col gap-4"
                            onDrop={(e) => handleDrop(e, shift)}
                            onDragOver={handleDragOver}
                            style={{ borderColor: shiftErrors[shift] ? '#ef4444' : '', minHeight: '400px' }}
                        >
                            <div className="flex-row justify-between items-center">
                                <h2 className="text-xl">{shift}</h2>
                                <div className="text-right">
                                    {/* Time removed as requested */}
                                    <span className="text-xs" style={{ color: isOverCapacity ? '#ef4444' : '#94a3b8' }}>{stats.totalPeople} / 499</span>
                                </div>
                            </div>

                            {shiftErrors[shift] && (
                                <div className="text-sm" style={{ color: '#ef4444' }}>
                                    {shiftErrors[shift].map((e, i) => <div key={i}>{e}</div>)}
                                </div>
                            )}

                            {/* Capacity Bar */}
                            <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px', overflow: 'hidden' }}>
                                <div style={{
                                    width: `${Math.min(capacityPct, 100)}%`,
                                    height: '100%',
                                    background: isOverCapacity ? '#ef4444' : '#22c55e',
                                    transition: 'width 0.3s ease'
                                }} />
                            </div>

                            <div className="flex-col gap-2">
                                {sortedShiftClasses.map(c => {
                                    const teachers = manager.getShiftTeachers(shift, c.classId, selectedDay);
                                    // Clean up labels
                                    const locationMap: any = { "Borgo S. Antonio": "Borgo", "Sede Centrale": "Centrale", "Via Colvera": "Colvera" };
                                    const displayLocation = locationMap[c.location] || c.location;
                                    const displayWeek = c.weekType.includes("Lunga") ? "Sett. Lunga" : "Sett. Corta";

                                    // Conflict Logic
                                    const conflicts = conflictMap[c.classId] || [];
                                    const hasConflict = conflicts.length > 0;

                                    // Constraint Logic
                                    const isForbidden = constraints[c.classId]?.includes(shift);

                                    // Missing Teacher Check (Red if "Non trovato")
                                    const missingGoing = teachers.going.some(t => t.toLowerCase() === "non trovato");
                                    const missingReturning = teachers.returning.some(t => t.toLowerCase() === "non trovato");
                                    const hasMissing = missingGoing || missingReturning;

                                    const isError = hasConflict || hasMissing || isForbidden;

                                    const cardStyle = isError ? {
                                        borderColor: '#ef4444',
                                        background: 'rgba(239, 68, 68, 0.1)'
                                    } : {};

                                    return (
                                        <div
                                            key={c.classId}
                                            draggable
                                            onDragStart={(e) => handleDragStart(e, c.classId, shift)}
                                            className="drag-item"
                                            style={cardStyle}
                                        >
                                            <div className="flex-row justify-between">
                                                <strong>{c.classId}</strong>
                                                <span className="text-sm flex-row items-center gap-2">
                                                    <Users size={14} /> {c.students}
                                                </span>
                                            </div>
                                            <div className="flex-row justify-between text-sm" style={{ marginTop: '0.25rem', fontSize: '0.75rem', opacity: 0.8 }}>
                                                <span>{displayLocation}</span>
                                                <span>{displayWeek}</span>
                                            </div>

                                            {isForbidden && (
                                                <div className="text-xs p-1 mt-1 rounded font-bold" style={{ background: '#ef4444', color: 'white', border: '1px solid rgba(255,255,255,0.2)' }}>
                                                    ⛔ Non disponibile
                                                </div>
                                            )}

                                            {hasConflict && (
                                                <div className="text-xs p-1 mt-1 rounded" style={{ background: 'rgba(56, 189, 248, 0.2)', color: '#bae6fd', border: '1px solid rgba(56, 189, 248, 0.4)' }}>
                                                    {conflicts.map((msg, i) => <div key={i}>{msg}</div>)}
                                                </div>
                                            )}

                                            <div className="text-xs flex-col gap-1" style={{ color: isError ? '#fca5a5' : '#94a3b8', marginTop: '0.5rem', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '0.25rem' }}>
                                                <div className="flex-row justify-between">
                                                    <span>Andata:</span>
                                                    <span className={missingGoing ? "text-red-400 font-bold" : (isError ? "text-red-200" : "text-white")} style={{ textAlign: 'right' }}>{teachers.going.join(", ")}</span>
                                                </div>
                                                <div className="flex-row justify-between">
                                                    <span>Ritorno:</span>
                                                    <span className={missingReturning ? "text-red-400 font-bold" : (isError ? "text-red-200" : "text-white")} style={{ textAlign: 'right' }}>{teachers.returning.join(", ")}</span>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )
                })}
            </div>

            {/* Sticky Footer */}
            {/* Sticky Footer */}
            {showUnassigned && (
                <div className="glass-panel" style={{
                    position: 'fixed',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    width: '100%',
                    height: '220px',
                    background: 'rgba(15, 23, 42, 0.95)',
                    backdropFilter: 'blur(10px)',
                    borderTop: '1px solid rgba(255, 255, 255, 0.1)',
                    zIndex: 50,
                    padding: '1rem 2rem',
                    borderLeft: 'none',
                    borderRight: 'none',
                    borderBottom: 'none',
                    borderRadius: 0
                }}>
                    <h3 className="text-xl mb-4 text-white">Classi Non Assegnate ({unassignedClasses.length})</h3>
                    <div
                        className="flex-row gap-4 drop-zone"
                        style={{
                            height: '140px',
                            border: 'none',
                            background: 'transparent',
                            overflowX: 'auto',
                            padding: '0.5rem',
                            alignItems: 'center',
                            justifyContent: 'flex-start'
                        }}
                        onDrop={(e) => handleDrop(e, "unassigned")}
                        onDragOver={handleDragOver}
                    >
                        {sortClasses(unassignedClasses).map(c => {
                            const locationMap: any = { "Borgo S. Antonio": "Borgo", "Sede Centrale": "Centrale", "Via Colvera": "Colvera" };
                            const displayLocation = locationMap[c.location] || c.location;
                            const displayWeek = c.weekType.includes("Lunga") ? "Lunga" : "Corta";

                            return (
                                <div
                                    key={c.classId}
                                    draggable
                                    onDragStart={(e) => handleDragStart(e, c.classId, "unassigned")}
                                    className="drag-item"
                                    style={{ minWidth: '140px' }}
                                >
                                    <div className="flex-row justify-between">
                                        <strong>{c.classId}</strong>
                                        <span className="text-sm">{c.students}</span>
                                    </div>
                                    <div className="flex-row justify-between text-sm" style={{ marginTop: '0.25rem', fontSize: '0.75rem', opacity: 0.8 }}>
                                        <span>{displayLocation}</span>
                                        <span>{displayWeek}</span>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>
            )}
            {/* Constraint Modal */}
            {showConstraintsModal && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'rgba(0,0,0,0.85)',
                    backdropFilter: 'blur(12px)',
                    zIndex: 100,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                }}>
                    <div className="glass-panel" style={{
                        width: '700px',
                        padding: '3rem',
                        background: '#0f172a', // Darker slate
                        border: '1px solid rgba(255,255,255,0.08)',
                        boxShadow: '0 40px 80px -20px rgba(0, 0, 0, 0.7)',
                        maxHeight: '85vh',
                        display: 'flex',
                        flexDirection: 'column',
                        borderRadius: '2rem' // Very round corners
                    }}>
                        <div className="flex-row justify-between items-center mb-10 border-b border-slate-800 pb-6">
                            <div>
                                <h2 className="text-3xl font-bold text-white mb-2">
                                    Gestione Vincoli
                                </h2>
                                <p className="text-slate-400">Impedisci a certe classi di frequentare turni specifici.</p>
                            </div>
                            <button
                                onClick={() => setShowConstraintsModal(false)}
                                className="p-3 hover:bg-slate-800 rounded-full transition-colors cursor-pointer text-slate-400 hover:text-white"
                                style={{ background: 'transparent', border: 'none' }}
                            >
                                <X size={28} />
                            </button>
                        </div>

                        {/* Add New Constraint */}
                        <div className="flex-col gap-10 mb-10 p-10 rounded-3xl" style={{ background: 'rgba(30, 41, 59, 0.5)', border: '1px solid rgba(255,255,255,0.05)' }}>
                            <div className="flex-col gap-4">
                                <label className="text-sm font-bold text-slate-400 tracking-[0.2em] uppercase">Seleziona Classe</label>
                                <select
                                    value={selectedConstraintClass}
                                    onChange={(e) => setSelectedConstraintClass(e.target.value)}
                                    className="w-full rounded-2xl outline-none transition-all focus:ring-2 focus:ring-blue-500/50"
                                    style={{
                                        padding: '1.25rem 1.5rem',
                                        backgroundColor: '#1e293b',
                                        color: 'white',
                                        border: '1px solid #334155',
                                        fontSize: '1.25rem',
                                        appearance: 'auto',
                                        cursor: 'pointer',
                                        lineHeight: '1.75rem' // More breathing room
                                    }}
                                >
                                    <option value="" style={{ background: '#1e293b', color: 'white' }}>-- Seleziona una classe --</option>
                                    {[...manager.getClasses()].sort((a, b) => a.classId.localeCompare(b.classId)).map(c => (
                                        <option key={c.classId} value={c.classId} style={{ background: '#1e293b', color: 'white' }}>
                                            {c.classId} ({c.students} studenti)
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="flex-col gap-5">
                                <label className="text-sm font-bold text-slate-400 tracking-[0.2em] uppercase">Turni Vietati</label>
                                <div className="grid gap-5" style={{ gridTemplateColumns: '1fr 1fr' }}>
                                    {["Primo turno", "Secondo turno", "Terzo turno", "Quarto turno"].map(s => {
                                        const isSelected = selectedConstraintShifts.includes(s);
                                        return (
                                            <button
                                                key={s}
                                                onClick={() => toggleConstraintShift(s)}
                                                className="rounded-2xl text-xl font-medium transition-all duration-300 cursor-pointer flex items-center justify-center gap-4 shadow-lg group relative overflow-hidden"
                                                style={{
                                                    padding: '2rem 1.5rem', // Taller buttons
                                                    backgroundColor: isSelected ? '#dc2626' : 'rgba(30, 41, 59, 0.6)',
                                                    color: isSelected ? 'white' : '#cbd5e1',
                                                    border: isSelected ? '2px solid #ef4444' : '2px solid #475569',
                                                    transform: isSelected ? 'scale(1.02)' : 'none',
                                                    boxShadow: isSelected ? '0 0 25px rgba(220, 38, 38, 0.4)' : 'none',
                                                    letterSpacing: '0.05em' // Tracking wider
                                                }}
                                            >
                                                {/* Hover effect overlay */}
                                                <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

                                                {isSelected ? <Ban size={28} /> : <div style={{ width: 28 }} />}
                                                <span className="leading-none">{s}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            <button
                                onClick={addConstraint}
                                disabled={!selectedConstraintClass || selectedConstraintShifts.length === 0}
                                className="mt-6 p-6 rounded-2xl flex items-center justify-center gap-4 font-bold text-xl transition-all duration-300 cursor-pointer shadow-xl tracking-wide uppercase"
                                style={{
                                    background: (!selectedConstraintClass || selectedConstraintShifts.length === 0)
                                        ? '#334155'
                                        : 'linear-gradient(135deg, #2563eb, #4f46e5)',
                                    color: (!selectedConstraintClass || selectedConstraintShifts.length === 0)
                                        ? '#64748b'
                                        : 'white',
                                    border: 'none',
                                    opacity: (!selectedConstraintClass || selectedConstraintShifts.length === 0) ? 0.5 : 1,
                                    cursor: (!selectedConstraintClass || selectedConstraintShifts.length === 0) ? 'not-allowed' : 'pointer',
                                    boxShadow: (!selectedConstraintClass || selectedConstraintShifts.length === 0) ? 'none' : '0 10px 30px -10px rgba(79, 70, 229, 0.5)'
                                }}
                            >
                                <Plus size={32} /> AGGIUNGI VINCOLO
                            </button>
                        </div>

                        {/* List Existing Limits */}
                        <div className="flex-col gap-4 flex-1 overflow-hidden">
                            <h3 className="text-sm font-bold text-slate-500 tracking-widest mb-2">VINCOLI ATTIVI ({Object.keys(constraints).length})</h3>
                            <div className="flex-col gap-3 pr-2 custom-scrollbar" style={{ overflowY: 'auto' }}>
                                {Object.keys(constraints).length === 0 && (
                                    <div className="text-center p-10 text-slate-600 italic border-2 border-dashed border-slate-800 rounded-3xl">
                                        Nessun vincolo impostato.
                                    </div>
                                )}

                                {Object.entries(constraints).map(([cId, shifts]) => (
                                    <div key={cId} className="group flex-row justify-between items-center p-4 rounded-2xl transition-all" style={{ background: 'rgba(30, 41, 59, 0.8)', border: '1px solid rgba(51, 65, 85, 0.5)' }}>
                                        <div className="flex-col gap-2">
                                            <strong className="text-xl text-white pl-1">{cId}</strong>
                                            <div className="flex-row gap-2 flex-wrap">
                                                {shifts.map(s => (
                                                    <span key={s} className="text-xs px-3 py-1.5 rounded-full font-medium tracking-wide" style={{ background: 'rgba(127, 29, 29, 0.3)', color: '#fca5a5', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                                                        {s}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => removeConstraint(cId)}
                                            className="p-3 text-slate-500 hover:text-red-400 hover:bg-red-400/10 rounded-xl transition-all cursor-pointer"
                                            title="Rimuovi vincolo"
                                            style={{ background: 'transparent', border: 'none' }}
                                        >
                                            <Trash2 size={22} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
