"use client";

import { useState, useEffect, useRef } from "react";
import { Upload, Users, Calendar, ArrowRight, Download, Eye, EyeOff, Ban, X, Plus, Trash2, ChevronDown, Map } from "lucide-react";
import { AssemblyManager } from "@/lib/scheduler";
import { AssemblyEntry } from "@/lib/parsers";
import SeatingMap from "./SeatingMap";

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
    const [showSeatingMap, setShowSeatingMap] = useState(false);

    // For the modal form
    const [selectedConstraintClass, setSelectedConstraintClass] = useState("");
    const [selectedConstraintShifts, setSelectedConstraintShifts] = useState<string[]>([]);

    // Time-based constraint selection
    const [busyFrom, setBusyFrom] = useState("");
    const [busyTo, setBusyTo] = useState("");

    // Shift times definition
    const SHIFT_TIMES: { [key: string]: { start: string; end: string } } = {
        "Primo turno": { start: "08:20", end: "09:45" },
        "Secondo turno": { start: "09:45", end: "11:10" },
        "Terzo turno": { start: "11:10", end: "12:30" },
        "Quarto turno": { start: "12:30", end: "13:50" }
    };

    // Function to convert time string to minutes for comparison
    const timeToMinutes = (time: string): number => {
        const [hours, minutes] = time.split(':').map(Number);
        return hours * 60 + minutes;
    };

    // Function to calculate which shifts overlap with a given time range
    const calculateOverlappingShifts = (from: string, to: string): string[] => {
        if (!from || !to) return [];

        const fromMinutes = timeToMinutes(from);
        const toMinutes = timeToMinutes(to);

        if (fromMinutes >= toMinutes) return []; // Invalid range

        const overlapping: string[] = [];

        Object.entries(SHIFT_TIMES).forEach(([shiftName, times]) => {
            const shiftStart = timeToMinutes(times.start);
            const shiftEnd = timeToMinutes(times.end);

            // Check if there's any overlap: busy period overlaps with shift if
            // busy starts before shift ends AND busy ends after shift starts
            if (fromMinutes < shiftEnd && toMinutes > shiftStart) {
                overlapping.push(shiftName);
            }
        });

        return overlapping;
    };

    // Auto-select shifts when time changes
    const handleTimeChange = (type: 'from' | 'to', value: string) => {
        const newFrom = type === 'from' ? value : busyFrom;
        const newTo = type === 'to' ? value : busyTo;

        if (type === 'from') setBusyFrom(value);
        if (type === 'to') setBusyTo(value);

        if (newFrom && newTo) {
            const overlapping = calculateOverlappingShifts(newFrom, newTo);
            setSelectedConstraintShifts(overlapping);
        }
    };

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

                // Try to load from localStorage first
                const savedData = localStorage.getItem('assemblea_autosave');
                if (savedData) {
                    try {
                        const parsed = JSON.parse(savedData);
                        // Validate that saved classIds still exist
                        const validClassIds = new Set(classes.map(c => c.classId));

                        // Rebuild shifts with valid classes
                        const rebuiltShifts: { [key: string]: AssemblyEntry[] } = {
                            "Primo turno": [],
                            "Secondo turno": [],
                            "Terzo turno": [],
                            "Quarto turno": []
                        };
                        const assignedIds = new Set<string>();

                        if (parsed.shifts) {
                            Object.keys(rebuiltShifts).forEach(shiftName => {
                                if (parsed.shifts[shiftName]) {
                                    parsed.shifts[shiftName].forEach((savedClass: any) => {
                                        const fullClass = classes.find(c => c.classId === savedClass.classId);
                                        if (fullClass) {
                                            rebuiltShifts[shiftName].push(fullClass);
                                            assignedIds.add(fullClass.classId);
                                        }
                                    });
                                }
                            });
                        }

                        // Unassigned = all classes not in any shift
                        const rebuiltUnassigned = classes.filter(c => !assignedIds.has(c.classId));

                        setShifts(rebuiltShifts);
                        setUnassignedClasses(rebuiltUnassigned);
                        if (parsed.selectedDay) setSelectedDay(parsed.selectedDay);
                        if (parsed.constraints) setConstraints(parsed.constraints);

                        console.log("✅ Dati caricati dal salvataggio automatico");
                        setLoading(false);
                        return;
                    } catch (e) {
                        console.warn("Errore nel caricamento del salvataggio automatico, uso dati CSV", e);
                    }
                }

                // No saved data or error - use CSV data
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

    // Auto-save to localStorage
    useEffect(() => {
        if (loading) return; // Don't save during initial load

        const dataToSave = {
            shifts,
            unassignedClasses,
            selectedDay,
            constraints,
            savedAt: new Date().toISOString()
        };

        localStorage.setItem('assemblea_autosave', JSON.stringify(dataToSave));
        console.log("💾 Salvataggio automatico...");
    }, [shifts, unassignedClasses, selectedDay, constraints, loading]);

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

    // Auto-assign function
    const handleAutoAssign = () => {
        // Get all classes (assigned + unassigned)
        const allClasses = [...unassignedClasses];
        Object.values(shifts).forEach(list => allClasses.push(...list));

        const MAX_CAPACITY = 499;

        // Shuffle array helper
        const shuffle = <T,>(array: T[]): T[] => {
            const arr = [...array];
            for (let i = arr.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [arr[i], arr[j]] = [arr[j], arr[i]];
            }
            return arr;
        };

        // Extract year from classId (e.g., "1A" -> 1, "5B" -> 5)
        const getYear = (classId: string): number => {
            const match = classId.match(/^(\d)/);
            return match ? parseInt(match[1]) : 3;
        };

        // Check if class is settimana corta
        const isSettimanaCorta = (cls: AssemblyEntry): boolean => {
            return cls.weekType?.toLowerCase().includes('corta') ?? false;
        };

        // Create new shifts with student counts
        const newShifts: { [key: string]: AssemblyEntry[] } = {
            "Primo turno": [],
            "Secondo turno": [],
            "Terzo turno": [],
            "Quarto turno": []
        };

        // Only first 3 shifts for settimana lunga classes
        const shiftsForLunga = ["Primo turno", "Secondo turno", "Terzo turno"];
        const allShifts = ["Primo turno", "Secondo turno", "Terzo turno", "Quarto turno"];

        const getShiftStudents = (shift: string): number => {
            return newShifts[shift].reduce((sum, c) => sum + c.students, 0);
        };

        // Check basic constraints (not capacity)
        const checkConstraint = (cls: AssemblyEntry, shift: string): boolean => {
            if (constraints[cls.classId]?.includes(shift)) return false;
            if (shift === "Quarto turno" && !isSettimanaCorta(cls)) return false;
            return true;
        };

        // Check if adding class would exceed capacity
        const hasCapacity = (shift: string, students: number): boolean => {
            return getShiftStudents(shift) + students <= MAX_CAPACITY;
        };

        // Find best shift considering preference and balance
        const findBestShift = (cls: AssemblyEntry, preferredOrder: string[]): string | null => {
            // First try preferred shifts in order (if they have capacity)
            for (const shift of preferredOrder) {
                if (checkConstraint(cls, shift) && hasCapacity(shift, cls.students)) {
                    return shift;
                }
            }

            // If all preferred are full, find the least-filled valid shift
            const validShifts = (isSettimanaCorta(cls) ? allShifts : shiftsForLunga)
                .filter(s => checkConstraint(cls, s) && hasCapacity(s, cls.students));

            if (validShifts.length === 0) return null;

            // Return the one with least students
            return validShifts.reduce((a, b) =>
                getShiftStudents(a) <= getShiftStudents(b) ? a : b
            );
        };

        // Shuffle all classes for randomness
        const shuffledClasses = shuffle(allClasses);

        // Track unassignable classes
        const leftover: AssemblyEntry[] = [];

        // Assign each class
        shuffledClasses.forEach(cls => {
            const year = getYear(cls.classId);
            const canDoQuarto = isSettimanaCorta(cls);

            // Define preferred order based on year (with slight randomization)
            let preferredOrder: string[];

            if (year <= 2) {
                // 1st, 2nd prefer early
                preferredOrder = Math.random() < 0.6
                    ? ["Primo turno", "Secondo turno", "Terzo turno"]
                    : ["Secondo turno", "Primo turno", "Terzo turno"];
                if (canDoQuarto) preferredOrder.push("Quarto turno");
            } else if (year >= 4) {
                // 4th, 5th prefer late
                if (canDoQuarto) {
                    preferredOrder = Math.random() < 0.6
                        ? ["Quarto turno", "Terzo turno", "Secondo turno", "Primo turno"]
                        : ["Terzo turno", "Quarto turno", "Secondo turno", "Primo turno"];
                } else {
                    preferredOrder = Math.random() < 0.6
                        ? ["Terzo turno", "Secondo turno", "Primo turno"]
                        : ["Secondo turno", "Terzo turno", "Primo turno"];
                }
            } else {
                // 3rd year - balanced
                preferredOrder = shuffle(canDoQuarto ? allShifts : shiftsForLunga);
            }

            const bestShift = findBestShift(cls, preferredOrder);

            if (bestShift) {
                newShifts[bestShift].push(cls);
            } else {
                leftover.push(cls);
            }
        });

        setShifts(newShifts);
        setUnassignedClasses(leftover);

        if (leftover.length > 0) {
            console.log(`⚠️ ${leftover.length} classi non assegnate (vincoli o capacità)`);
        }
    };

    // Copy list to clipboard
    const handleCopyList = () => {
        const lines: string[] = [];

        ["Primo turno", "Secondo turno", "Terzo turno", "Quarto turno"].forEach(shiftName => {
            const classIds = sortClasses(shifts[shiftName]).map(c => c.classId);
            lines.push(`${shiftName}:`);
            lines.push(classIds.join(", "));
            lines.push(""); // Empty line between shifts
        });

        const text = lines.join("\n");
        navigator.clipboard.writeText(text).then(() => {
            alert("📋 Elenco copiato negli appunti!");
        }).catch(err => {
            console.error("Errore copia:", err);
            alert("Errore durante la copia");
        });
    };

    if (loading) return <div className="container text-2xl">Caricamento dati...</div>;

    return (
        <div className="container" style={{ maxWidth: '100%', paddingBottom: showUnassigned ? '280px' : '2rem' }}>
            {/* Header */}
            <header className="flex-row justify-between items-center print:hidden" style={{ marginBottom: '2rem', marginTop: '1.5rem', paddingBottom: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                <div>
                    <h1 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '0.25rem', background: 'linear-gradient(135deg, #6366f1, #38bdf8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                        📋 Gestione Assemblea
                    </h1>
                    <p className="text-sm" style={{ opacity: 0.7 }}>Trascina le classi nei turni per organizzare l'assemblea</p>
                </div>

                <div className="flex-row gap-2" style={{ flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                    <input
                        type="file"
                        ref={fileInputRef}
                        style={{ display: 'none' }}
                        accept=".json"
                        onChange={handleImport}
                    />

                    {/* Day Selector - Prominent */}
                    <div className="glass-panel flex-row items-center gap-2" style={{ padding: '0.5rem 1rem', background: 'rgba(99, 102, 241, 0.1)', borderColor: 'rgba(99, 102, 241, 0.3)' }}>
                        <Calendar size={16} style={{ color: '#818cf8' }} />
                        <select
                            value={selectedDay}
                            onChange={(e) => setSelectedDay(e.target.value)}
                            style={{ background: 'transparent', color: 'white', border: 'none', fontWeight: 'bold', cursor: 'pointer' }}
                        >
                            {["Lunedì", "Martedì", "Mercoledì", "Giovedì", "Venerdì", "Sabato"].map(d => (
                                <option key={d} value={d} style={{ background: '#1e293b' }}>{d}</option>
                            ))}
                        </select>
                    </div>

                    <button
                        onClick={() => setShowUnassigned(!showUnassigned)}
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
                        onClick={handleExport}
                        className="glass-panel hover:bg-white/10"
                        style={{ padding: '0.5rem 1rem', cursor: 'pointer', display: 'flex', gap: '0.5rem', alignItems: 'center' }}
                        title="Esporta"
                    >
                        <Download size={16} />
                    </button>

                    <button
                        onClick={() => setShowConstraintsModal(true)}
                        className="glass-panel hover:bg-white/10"
                        style={{ padding: '0.5rem 1rem', cursor: 'pointer', display: 'flex', gap: '0.5rem', alignItems: 'center' }}
                        title="Vincoli"
                    >
                        <Ban size={16} />
                    </button>

                    <button
                        onClick={handleAutoAssign}
                        className="glass-panel hover:bg-white/10"
                        style={{ padding: '0.5rem 1rem', cursor: 'pointer', display: 'flex', gap: '0.5rem', alignItems: 'center', background: 'rgba(34, 197, 94, 0.1)', borderColor: 'rgba(34, 197, 94, 0.3)', color: '#86efac' }}
                        title="Auto Assegna (1°-2° primi turni, 4°-5° ultimi turni)"
                    >
                        🎲 Auto
                    </button>

                    <button
                        onClick={handleCopyList}
                        className="glass-panel hover:bg-white/10"
                        style={{ padding: '0.5rem 1rem', cursor: 'pointer', display: 'flex', gap: '0.5rem', alignItems: 'center', background: 'rgba(99, 102, 241, 0.1)', borderColor: 'rgba(99, 102, 241, 0.3)', color: '#a5b4fc' }}
                        title="Copia elenco turni"
                    >
                        📋 Copia
                    </button>

                    <button
                        onClick={() => setShowSeatingMap(true)}
                        className="glass-panel hover:bg-white/10"
                        style={{ padding: '0.5rem 1rem', cursor: 'pointer', display: 'flex', gap: '0.5rem', alignItems: 'center', background: 'rgba(236, 72, 153, 0.1)', borderColor: 'rgba(236, 72, 153, 0.3)', color: '#f9a8d4' }}
                        title="Mappa Posti Auditorium"
                    >
                        <Map size={16} /> Mappa
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
                        title="Reset"
                    >
                        🔄
                    </button>
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
                            style={{
                                borderColor: shiftErrors[shift] ? '#ef4444' : 'rgba(255,255,255,0.1)',
                                minHeight: '450px',
                                transition: 'all 0.2s ease'
                            }}
                        >
                            {/* Shift Header */}
                            <div style={{ marginBottom: '0.5rem' }}>
                                <div className="flex-row justify-between items-center">
                                    <h2 style={{ fontSize: '1.1rem', fontWeight: 700 }}>{shift}</h2>
                                    <div className="flex-row items-center gap-2">
                                        <Users size={14} style={{ opacity: 0.5 }} />
                                        <span style={{
                                            fontSize: '0.85rem',
                                            fontWeight: 600,
                                            color: isOverCapacity ? '#ef4444' : '#22c55e'
                                        }}>
                                            {stats.totalPeople}
                                        </span>
                                        <span className="text-sm" style={{ opacity: 0.5 }}>/ 499</span>
                                    </div>
                                </div>

                                {shiftErrors[shift] && (
                                    <div className="text-sm" style={{ color: '#ef4444', marginTop: '0.5rem' }}>
                                        {shiftErrors[shift].map((e, i) => <div key={i}>{e}</div>)}
                                    </div>
                                )}

                                {/* Capacity Bar */}
                                <div style={{ width: '100%', height: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px', overflow: 'hidden', marginTop: '0.75rem' }}>
                                    <div style={{
                                        width: `${Math.min(capacityPct, 100)}%`,
                                        height: '100%',
                                        background: isOverCapacity ? 'linear-gradient(90deg, #ef4444, #dc2626)' : 'linear-gradient(90deg, #22c55e, #16a34a)',
                                        transition: 'width 0.3s ease',
                                        borderRadius: '2px'
                                    }} />
                                </div>
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
                <div style={{
                    position: 'fixed',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    width: '100%',
                    background: 'linear-gradient(to top, rgba(15, 23, 42, 0.98), rgba(15, 23, 42, 0.95))',
                    backdropFilter: 'blur(12px)',
                    borderTop: '1px solid rgba(99, 102, 241, 0.2)',
                    zIndex: 50,
                    padding: '1.5rem 2rem',
                    boxShadow: '0 -10px 40px rgba(0,0,0,0.3)'
                }}>
                    <div className="flex-row justify-between items-center" style={{ marginBottom: '1rem' }}>
                        <h3 style={{ fontSize: '1rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            📦 Classi Non Assegnate
                            <span style={{
                                background: 'rgba(99, 102, 241, 0.2)',
                                padding: '0.25rem 0.75rem',
                                borderRadius: '999px',
                                fontSize: '0.85rem',
                                color: '#818cf8'
                            }}>
                                {unassignedClasses.length}
                            </span>
                        </h3>
                        <button
                            onClick={() => setShowUnassigned(false)}
                            className="glass-panel hover:bg-white/10"
                            style={{ padding: '0.25rem 0.5rem', cursor: 'pointer', fontSize: '0.75rem' }}
                        >
                            Nascondi ↓
                        </button>
                    </div>
                    <div
                        className="flex-row gap-3 drop-zone"
                        style={{
                            height: '120px',
                            border: '2px dashed rgba(255,255,255,0.1)',
                            borderRadius: 'var(--radius)',
                            background: 'rgba(0,0,0,0.2)',
                            overflowX: 'auto',
                            padding: '0.75rem',
                            alignItems: 'flex-start'
                        }}
                        onDrop={(e) => handleDrop(e, "unassigned")}
                        onDragOver={handleDragOver}
                    >
                        {unassignedClasses.length === 0 ? (
                            <div style={{ width: '100%', textAlign: 'center', opacity: 0.4, paddingTop: '2rem' }}>
                                ✅ Tutte le classi sono state assegnate!
                            </div>
                        ) : sortClasses(unassignedClasses).map(c => {
                            const locationMap: any = { "Borgo S. Antonio": "Borgo", "Sede Centrale": "Centrale", "Via Colvera": "Colvera" };
                            const displayLocation = locationMap[c.location] || c.location;

                            return (
                                <div
                                    key={c.classId}
                                    draggable
                                    onDragStart={(e) => handleDragStart(e, c.classId, "unassigned")}
                                    className="drag-item"
                                    style={{ minWidth: '100px', padding: '0.5rem 0.75rem' }}
                                >
                                    <div className="flex-row justify-between items-center" style={{ gap: '0.5rem' }}>
                                        <strong style={{ fontSize: '0.9rem' }}>{c.classId}</strong>
                                        <span className="text-sm" style={{ opacity: 0.6 }}>{c.students}</span>
                                    </div>
                                    <div className="text-sm" style={{ fontSize: '0.7rem', opacity: 0.5, marginTop: '0.25rem' }}>
                                        {displayLocation}
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
                    background: 'rgba(0,0,0,0.7)',
                    backdropFilter: 'blur(8px)',
                    zIndex: 100,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                }}>
                    <div className="glass-panel" style={{ width: '600px', maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}>
                        {/* Header */}
                        <div className="flex-row justify-between items-center" style={{ padding: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                            <div>
                                <h2 className="text-xl" style={{ marginBottom: '0.25rem' }}>Gestione Vincoli</h2>
                                <p className="text-sm">Impedisci a certe classi di frequentare turni specifici.</p>
                            </div>
                            <button
                                onClick={() => setShowConstraintsModal(false)}
                                className="glass-panel hover:bg-white/10"
                                style={{ padding: '0.5rem', cursor: 'pointer', border: 'none' }}
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Body */}
                        <div style={{ padding: '1.5rem', overflowY: 'auto', flex: 1 }}>
                            {/* Add Constraint Section */}
                            <div className="flex-col gap-4" style={{ marginBottom: '2rem' }}>
                                {/* Class Selector */}
                                <div className="flex-col gap-2">
                                    <label className="text-sm">Seleziona Classe:</label>
                                    <div className="glass-panel" style={{ padding: '0.75rem 1rem' }}>
                                        <select
                                            value={selectedConstraintClass}
                                            onChange={(e) => setSelectedConstraintClass(e.target.value)}
                                            style={{ background: 'transparent', color: 'white', border: 'none', width: '100%', fontSize: '1rem', cursor: 'pointer' }}
                                        >
                                            <option value="" style={{ background: '#1e293b' }}>-- Seleziona --</option>
                                            {[...manager.getClasses()].sort((a, b) => a.classId.localeCompare(b.classId)).map(c => (
                                                <option key={c.classId} value={c.classId} style={{ background: '#1e293b' }}>
                                                    {c.classId} ({c.students} studenti)
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                {/* Time-based Selection */}
                                <div className="flex-col gap-2">
                                    <label className="text-sm">⏰ Orario Impegno (auto-seleziona turni):</label>
                                    <div className="flex-row gap-2">
                                        <div className="glass-panel flex-row items-center gap-2" style={{ padding: '0.5rem 1rem', flex: 1 }}>
                                            <span className="text-sm" style={{ opacity: 0.6 }}>Dalle</span>
                                            <input
                                                type="time"
                                                value={busyFrom}
                                                onChange={(e) => handleTimeChange('from', e.target.value)}
                                                style={{
                                                    background: 'transparent',
                                                    color: 'white',
                                                    border: 'none',
                                                    fontSize: '1rem',
                                                    cursor: 'pointer'
                                                }}
                                            />
                                        </div>
                                        <div className="glass-panel flex-row items-center gap-2" style={{ padding: '0.5rem 1rem', flex: 1 }}>
                                            <span className="text-sm" style={{ opacity: 0.6 }}>Alle</span>
                                            <input
                                                type="time"
                                                value={busyTo}
                                                onChange={(e) => handleTimeChange('to', e.target.value)}
                                                style={{
                                                    background: 'transparent',
                                                    color: 'white',
                                                    border: 'none',
                                                    fontSize: '1rem',
                                                    cursor: 'pointer'
                                                }}
                                            />
                                        </div>
                                        {busyFrom && busyTo && (
                                            <button
                                                onClick={() => { setBusyFrom(''); setBusyTo(''); setSelectedConstraintShifts([]); }}
                                                className="glass-panel hover:bg-white/10"
                                                style={{ padding: '0.5rem', cursor: 'pointer' }}
                                                title="Reset orari"
                                            >
                                                ✕
                                            </button>
                                        )}
                                    </div>
                                    {busyFrom && busyTo && selectedConstraintShifts.length > 0 && (
                                        <div className="text-sm" style={{ color: '#818cf8', marginTop: '0.25rem' }}>
                                            → Turni in conflitto: {selectedConstraintShifts.join(', ')}
                                        </div>
                                    )}
                                </div>

                                {/* Shift Selection */}
                                <div className="flex-col gap-2">
                                    <label className="text-sm">Turni Vietati:</label>
                                    <div className="grid grid-cols-2 gap-2">
                                        {["Primo turno", "Secondo turno", "Terzo turno", "Quarto turno"].map(s => {
                                            const isSelected = selectedConstraintShifts.includes(s);
                                            const times = SHIFT_TIMES[s];
                                            return (
                                                <button
                                                    key={s}
                                                    onClick={() => toggleConstraintShift(s)}
                                                    className="glass-panel"
                                                    style={{
                                                        padding: '0.75rem',
                                                        cursor: 'pointer',
                                                        display: 'flex',
                                                        flexDirection: 'column',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        gap: '0.25rem',
                                                        background: isSelected ? 'rgba(239, 68, 68, 0.2)' : undefined,
                                                        borderColor: isSelected ? 'rgba(239, 68, 68, 0.5)' : undefined,
                                                        color: isSelected ? '#fca5a5' : undefined
                                                    }}
                                                >
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                        {isSelected && <Ban size={14} />}
                                                        {s}
                                                    </div>
                                                    <span className="text-sm" style={{ opacity: 0.5, fontSize: '0.7rem' }}>
                                                        {times.start} - {times.end}
                                                    </span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Add Button */}
                                <button
                                    onClick={addConstraint}
                                    disabled={!selectedConstraintClass || selectedConstraintShifts.length === 0}
                                    className="btn btn-primary"
                                    style={{
                                        marginTop: '0.5rem',
                                        opacity: (!selectedConstraintClass || selectedConstraintShifts.length === 0) ? 0.5 : 1,
                                        cursor: (!selectedConstraintClass || selectedConstraintShifts.length === 0) ? 'not-allowed' : 'pointer'
                                    }}
                                >
                                    <Plus size={18} /> Aggiungi Vincolo
                                </button>
                            </div>

                            {/* Active Constraints List */}
                            <div className="flex-col gap-2">
                                <h3 className="text-sm" style={{ marginBottom: '0.5rem' }}>Vincoli Attivi ({Object.keys(constraints).length})</h3>

                                {Object.keys(constraints).length === 0 ? (
                                    <div className="text-sm" style={{ padding: '2rem', textAlign: 'center', opacity: 0.5, borderStyle: 'dashed', borderWidth: '1px', borderColor: 'rgba(255,255,255,0.1)', borderRadius: 'var(--radius)' }}>
                                        Nessun vincolo impostato.
                                    </div>
                                ) : (
                                    <div className="flex-col gap-2">
                                        {Object.entries(constraints).map(([cId, shiftList]) => (
                                            <div key={cId} className="glass-panel flex-row justify-between items-center" style={{ padding: '0.75rem 1rem' }}>
                                                <div className="flex-col gap-1">
                                                    <strong>{cId}</strong>
                                                    <div className="flex-row gap-2" style={{ flexWrap: 'wrap' }}>
                                                        {shiftList.map(s => (
                                                            <span key={s} className="text-sm" style={{
                                                                padding: '0.25rem 0.5rem',
                                                                background: 'rgba(239, 68, 68, 0.1)',
                                                                borderRadius: '4px',
                                                                color: '#fca5a5',
                                                                fontSize: '0.75rem'
                                                            }}>
                                                                {s}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => removeConstraint(cId)}
                                                    className="glass-panel hover:bg-white/10"
                                                    style={{
                                                        padding: '0.5rem',
                                                        cursor: 'pointer',
                                                        background: 'rgba(239, 68, 68, 0.1)',
                                                        borderColor: 'rgba(239, 68, 68, 0.3)',
                                                        color: '#fca5a5'
                                                    }}
                                                    title="Rimuovi"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Seating Map Modal */}
            {showSeatingMap && (
                <SeatingMap
                    shifts={shifts}
                    initialShift={Object.keys(shifts).find(s => shifts[s].length > 0) || "Primo turno"}
                    onClose={() => setShowSeatingMap(false)}
                />
            )}
        </div>
    );
}
