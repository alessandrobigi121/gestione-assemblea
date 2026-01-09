"use client";

import { useState, useEffect, useRef } from "react";
import { Upload, Users, Calendar, ArrowRight, Download, Eye, EyeOff } from "lucide-react";
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

                // Load all data into manager // 40c7ea68
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
            // Pass selectedDay to validation // 74ddaa7f
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
        setGlobalErrors([]); // Removed global banner for conflicts as requested
        setConflictMap(conflicts);
    }, [shifts, selectedDay, manager, loading]);


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
        // call manager helper if public or duplicate logic
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
            selectedDay
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

                                    // Missing Teacher Check (Red if "Non trovato")
                                    const missingGoing = teachers.going.some(t => t.toLowerCase() === "non trovato");
                                    const missingReturning = teachers.returning.some(t => t.toLowerCase() === "non trovato");
                                    const hasMissing = missingGoing || missingReturning;

                                    const isError = hasConflict || hasMissing;

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
        </div>
    );
}
