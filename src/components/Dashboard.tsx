
"use client";

import { useState, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import { AssemblyManager } from "@/lib/scheduler";
import { AssemblyEntry } from "@/lib/parsers";
import SeatingMap from "./SeatingMap";
import StatsHeader from "./StatsHeader";
import ShiftColumn from "./ShiftColumn";
import ConstraintsModal from "./ConstraintsModal";
import ErrorPanel, { generateErrorsFromState } from "./ErrorPanel";
import StatisticsPanel from "./StatisticsPanel";
import { toast } from "sonner";

// Dynamic import for PDFExport to avoid SSR issues
const PDFExportButton = dynamic(() => import("./PDFExport"), { ssr: false });

interface HistoryState {
    shifts: { [key: string]: AssemblyEntry[] };
    unassignedClasses: AssemblyEntry[];
    constraints: { [classId: string]: string[] };
}

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

    // Constraints
    const [constraints, setConstraints] = useState<{ [classId: string]: string[] }>({});
    const [showConstraintsModal, setShowConstraintsModal] = useState(false);
    const [showSeatingMap, setShowSeatingMap] = useState(false);
    const [showStatistics, setShowStatistics] = useState(false);
    const [maxCapacity, setMaxCapacity] = useState(499);

    // Auto-Assign Progress State
    const [isAssigning, setIsAssigning] = useState(false);
    const [assignProgress, setAssignProgress] = useState(0);
    const [assignBestConflicts, setAssignBestConflicts] = useState<number | null>(null);

    useEffect(() => {
        const saved = localStorage.getItem("assemblea_settings");
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                if (parsed.maxCapacity) setMaxCapacity(parsed.maxCapacity);
            } catch (e) {
                console.error("Error loading settings", e);
            }
        }
    }, []);// History for Undo/Redo
    const [history, setHistory] = useState<HistoryState[]>([]);
    const [future, setFuture] = useState<HistoryState[]>([]);

    const saveStateToHistory = useCallback(() => {
        setHistory(prev => {
            const newState = {
                shifts: JSON.parse(JSON.stringify(shifts)),
                unassignedClasses: JSON.parse(JSON.stringify(unassignedClasses)),
                constraints: JSON.parse(JSON.stringify(constraints))
            };
            return [...prev, newState];
        });
        setFuture([]); // Clear future on new action
    }, [shifts, unassignedClasses, constraints]);

    const handleUndo = () => {
        if (history.length === 0) return;

        const previousState = history[history.length - 1];
        const newHistory = history.slice(0, -1);

        // Save current to future
        setFuture(prev => [{
            shifts: JSON.parse(JSON.stringify(shifts)),
            unassignedClasses: JSON.parse(JSON.stringify(unassignedClasses)),
            constraints: JSON.parse(JSON.stringify(constraints))
        }, ...prev]);

        setShifts(previousState.shifts);
        setUnassignedClasses(previousState.unassignedClasses);
        setConstraints(previousState.constraints);
        setHistory(newHistory);
        toast.info("Annullato");
    };

    // Initialization
    useEffect(() => {
        async function init() {
            setLoading(true);
            try {
                const [scheduleRes, assemblyRes, teachersRes] = await Promise.all([
                    fetch("/orario.csv"),
                    fetch("/assemblea.csv"),
                    fetch("/orario_prof.csv")
                ]);

                if (!scheduleRes.ok || !assemblyRes.ok || !teachersRes.ok) {
                    throw new Error("Failed to fetch CSV files");
                }

                const [scheduleText, assemblyText, teachersText] = await Promise.all([
                    scheduleRes.text(),
                    assemblyRes.text(),
                    teachersRes.text()
                ]);

                await manager.loadData(scheduleText, assemblyText, teachersText);
                const classes = manager.getClasses();

                // Load from localStorage
                const savedData = localStorage.getItem('assemblea_autosave');
                if (savedData) {
                    try {
                        const parsed = JSON.parse(savedData);
                        // Validate classes existence (basic check)
                        const validClassIds = new Set(classes.map(c => c.classId));

                        // Reconstruct state
                        const rebuiltShifts: any = { "Primo turno": [], "Secondo turno": [], "Terzo turno": [], "Quarto turno": [] };
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

                        const rebuiltUnassigned = classes.filter(c => !assignedIds.has(c.classId));

                        setShifts(rebuiltShifts);
                        setUnassignedClasses(rebuiltUnassigned);
                        if (parsed.selectedDay) setSelectedDay(parsed.selectedDay);
                        if (parsed.constraints) setConstraints(parsed.constraints);

                        toast.success("Dati caricati dal salvataggio automatico");
                        setLoading(false);
                        return;
                    } catch (e) {
                        console.warn("Error loading autosave", e);
                        toast.error("Errore caricamento salvataggio, uso dati default");
                    }
                }

                // Default loading from CSV
                const mapped: any = { "Primo turno": [], "Secondo turno": [], "Terzo turno": [], "Quarto turno": [] };
                const unassigned: AssemblyEntry[] = [];

                classes.forEach(cls => {
                    if (cls.shiftName) {
                        const key = Object.keys(mapped).find(k => k.toLowerCase().includes(cls.shiftName.toLowerCase()));
                        if (key) mapped[key].push(cls);
                        else unassigned.push(cls);
                    } else {
                        unassigned.push(cls);
                    }
                });

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
                toast.error("Errore caricamento dati");
                setLoading(false);
            }
        }
        init();
    }, []);

    // Auto-save
    useEffect(() => {
        if (loading) return;
        const dataToSave = { shifts, unassignedClasses, selectedDay, constraints, savedAt: new Date().toISOString() };
        localStorage.setItem('assemblea_autosave', JSON.stringify(dataToSave));
    }, [shifts, unassignedClasses, selectedDay, constraints, loading]);

    // Validation
    useEffect(() => {
        if (loading) return;
        const newShiftErrors: any = {};
        Object.keys(shifts).forEach(shiftName => {
            const classIds = shifts[shiftName].map(c => c.classId);
            const errs = manager.validateShift(shiftName, classIds, selectedDay);
            if (errs.length > 0) newShiftErrors[shiftName] = errs;
        });

        const shiftMap: any = {};
        Object.keys(shifts).forEach(k => shiftMap[k] = shifts[k].map(c => c.classId));
        const conflicts = manager.getTeacherConflicts(selectedDay, shiftMap);

        setShiftErrors(newShiftErrors);
        setGlobalErrors([]); // Add global errors if needed
        setConflictMap(conflicts);
    }, [shifts, selectedDay, manager, loading]);

    const addConstraint = (classId: string, forbiddenShifts: string[]) => {
        saveStateToHistory();
        setConstraints(prev => ({ ...prev, [classId]: forbiddenShifts }));
        toast.success(`Vincolo aggiunto per ${classId}`);
    };

    const removeConstraint = (classId: string) => {
        saveStateToHistory();
        const newC = { ...constraints };
        delete newC[classId];
        setConstraints(newC);
        toast.success(`Vincolo rimosso per ${classId}`);
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

        saveStateToHistory();

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

    const handleReset = () => {
        if (!confirm("Sei sicuro di voler resettare tutto?")) return;
        saveStateToHistory();
        const all = [...unassignedClasses];
        Object.values(shifts).forEach(list => all.push(...list));
        all.sort((a, b) => a.classId.localeCompare(b.classId));

        setUnassignedClasses(all);
        setShifts({
            "Primo turno": [],
            "Secondo turno": [],
            "Terzo turno": [],
            "Quarto turno": [],
        });
        toast.info("Reset completato");
    };

    const handleExport = () => {
        const data = { shifts, unassignedClasses, selectedDay, constraints };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `assemblea_config_${selectedDay}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast.success("Esportazione completata");
    };

    const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const json = JSON.parse(e.target?.result as string);
                if (json.shifts && json.unassignedClasses) {
                    saveStateToHistory();
                    setShifts(json.shifts);
                    setUnassignedClasses(json.unassignedClasses);
                    if (json.selectedDay) setSelectedDay(json.selectedDay);
                    if (json.constraints) setConstraints(json.constraints);
                    toast.success("Importazione completata");
                } else {
                    toast.error("File non valido");
                }
            } catch (err) {
                console.error("Error parsing JSON", err);
                toast.error("Errore lettura file");
            }
        };
        reader.readAsText(file);
    };

    const sortClasses = (classes: AssemblyEntry[]) => {
        return [...classes].sort((a, b) => a.classId.localeCompare(b.classId));
    };

    const handleAutoAssign = () => {
        saveStateToHistory();
        // Get all classes (assigned + unassigned)
        const allClasses = [...unassignedClasses];
        Object.values(shifts).forEach(list => allClasses.push(...list));

        const MAX_CAPACITY = maxCapacity;
        const MAX_ATTEMPTS = 500000;

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

        // Check if class is in Borgo
        const isBorgo = (cls: AssemblyEntry): boolean => {
            return cls.location?.toLowerCase().includes('borgo') ?? false;
        };

        // Only first 3 shifts for settimana lunga classes
        const shiftsForLunga = ["Primo turno", "Secondo turno", "Terzo turno"];
        const allShiftNames = ["Primo turno", "Secondo turno", "Terzo turno", "Quarto turno"];

        const getShiftStudents = (shift: string, newShifts: { [key: string]: AssemblyEntry[] }): number => {
            return newShifts[shift].reduce((sum, c) => sum + c.students, 0);
        };

        // Check basic constraints (not capacity)
        const checkConstraint = (cls: AssemblyEntry, shift: string): boolean => {
            if (constraints[cls.classId]?.includes(shift)) return false;
            if (shift === "Quarto turno" && !isSettimanaCorta(cls)) return false;
            // NOTE: We don't make Borgo in Primo Turno a hard 'false' here because it might be physically impossible
            // to avoid it completely if capacity is extremely tight. Instead, we penalize it in the scoring phase.
            // But we can lightly prefer avoiding it by removing it from valid random choices if space allows elsewhere.
            return true;
        };

        // Check if adding class would exceed capacity
        const hasCapacity = (shift: string, students: number, newShifts: { [key: string]: AssemblyEntry[] }): boolean => {
            return getShiftStudents(shift, newShifts) + students <= MAX_CAPACITY;
        };

        // Count total conflicts for a candidate assignment
        const countConflicts = (candidateShifts: { [key: string]: AssemblyEntry[] }): number => {
            const shiftMap: { [key: string]: string[] } = {};
            Object.keys(candidateShifts).forEach(k => shiftMap[k] = candidateShifts[k].map(c => c.classId));
            const conflicts = manager.getTeacherConflicts(selectedDay, shiftMap);
            return Object.values(conflicts).reduce((sum, arr) => sum + arr.length, 0);
        };

        // Count validation errors
        const countErrors = (candidateShifts: { [key: string]: AssemblyEntry[] }): number => {
            let errors = 0;
            Object.keys(candidateShifts).forEach(shiftName => {
                const classIds = candidateShifts[shiftName].map(c => c.classId);
                errors += manager.validateShift(shiftName, classIds, selectedDay).length;
            });
            return errors;
        };

        // Count soft constraints violations (Borgo in Primo turno)
        const countSoftViolations = (candidateShifts: { [key: string]: AssemblyEntry[] }): number => {
            let violations = 0;
            if (candidateShifts["Primo turno"]) {
                violations += candidateShifts["Primo turno"].filter(c => isBorgo(c)).length;
            }
            return violations;
        };

        // Single attempt: generate a random assignment
        const tryAssignment = (): { shifts: { [key: string]: AssemblyEntry[] }; leftover: AssemblyEntry[]; score: number } => {
            const newShifts: { [key: string]: AssemblyEntry[] } = {
                "Primo turno": [],
                "Secondo turno": [],
                "Terzo turno": [],
                "Quarto turno": []
            };

            const cortaClassesList = allClasses.filter(c => isSettimanaCorta(c));
            const lungaClassesList = allClasses.filter(c => !isSettimanaCorta(c));

            // Shuffle them independently, but we will process CORTA classes first
            const shuffledCorta = shuffle(cortaClassesList);
            const shuffledLunga = shuffle(lungaClassesList);
            const prioritizedClasses = [...shuffledCorta, ...shuffledLunga];

            const leftover: AssemblyEntry[] = [];

            prioritizedClasses.forEach(cls => {
                const year = getYear(cls.classId);
                const canDoQuarto = isSettimanaCorta(cls);
                let preferredOrder: string[];

                if (canDoQuarto) {
                    // For Settimana Corta, Quarto Turno is always the absolute priority #1 to free up space
                    const remainingShifts = shuffle(["Primo turno", "Secondo turno", "Terzo turno"]);
                    preferredOrder = ["Quarto turno", ...remainingShifts];
                } else {
                    // Settimana Lunga
                    if (year <= 2) {
                        preferredOrder = Math.random() < 0.6
                            ? ["Primo turno", "Secondo turno", "Terzo turno"]
                            : ["Secondo turno", "Primo turno", "Terzo turno"];
                    } else if (year >= 4) {
                        preferredOrder = Math.random() < 0.6
                            ? ["Terzo turno", "Secondo turno", "Primo turno"]
                            : ["Secondo turno", "Terzo turno", "Primo turno"];
                    } else {
                        // year 3 random
                        preferredOrder = shuffle(shiftsForLunga);
                    }
                }

                // Push "Primo turno" to the back of preferredOrder if class is Borgo
                if (isBorgo(cls)) {
                    preferredOrder = preferredOrder.filter(s => s !== "Primo turno");
                    preferredOrder.push("Primo turno"); // fallback only
                }

                // CRITICAL: Ensure manual constraints are strictly respected by fully removing forbidden shifts
                if (constraints[cls.classId]) {
                    preferredOrder = preferredOrder.filter(s => !constraints[cls.classId].includes(s));
                }

                // Find best shift considering preference and balance
                let bestShift: string | null = null;
                for (const shift of preferredOrder) {
                    if (checkConstraint(cls, shift) && hasCapacity(shift, cls.students, newShifts)) {
                        bestShift = shift;
                        break;
                    }
                }
                if (!bestShift) {
                    const validShifts = (canDoQuarto ? allShiftNames : shiftsForLunga)
                        .filter(s => checkConstraint(cls, s) && hasCapacity(s, cls.students, newShifts));
                    if (validShifts.length > 0) {
                        bestShift = validShifts.reduce((a, b) =>
                            getShiftStudents(a, newShifts) <= getShiftStudents(b, newShifts) ? a : b
                        );
                    }
                }

                if (bestShift) {
                    newShifts[bestShift].push(cls);
                } else {
                    leftover.push(cls);
                }
            });

            const conflictScore = countConflicts(newShifts);
            const errorScore = countErrors(newShifts);
            const borgoViolationScore = countSoftViolations(newShifts) * 1000; // heavy penalty
            const leftoverPenalty = leftover.length * 5000; // extremely heavy penalty
            const score = conflictScore + (errorScore * 10) + borgoViolationScore + leftoverPenalty;

            return { shifts: newShifts, leftover, score };
        };

        // --- Run iterative search ---
        setIsAssigning(true);
        setAssignProgress(0);
        setAssignBestConflicts(null);

        let bestResult = tryAssignment();
        let bestScore = bestResult.score;
        setAssignBestConflicts(countConflicts(bestResult.shifts));

        let currentIteration = 1;
        const chunkSize = 1500; // Do 1500 attempts per tick

        const processChunk = () => {
            let chunkRemaining = chunkSize;
            while (chunkRemaining > 0 && currentIteration <= MAX_ATTEMPTS) {
                if (bestScore === 0) break; // Perfect solution found!

                const candidate = tryAssignment();
                if (candidate.score < bestScore) {
                    bestResult = candidate;
                    bestScore = candidate.score;
                    setAssignBestConflicts(countConflicts(bestResult.shifts));
                }

                currentIteration++;
                chunkRemaining--;
            }

            // Update progress
            const progress = Math.min(100, Math.floor((currentIteration / MAX_ATTEMPTS) * 100));
            setAssignProgress(progress);

            if (bestScore === 0 || currentIteration > MAX_ATTEMPTS) {
                // Done
                setShifts(bestResult.shifts);
                setUnassignedClasses(bestResult.leftover);
                setIsAssigning(false);

                if (bestScore === 0) {
                    toast.success(`✅ Perfetto! Zero Conflitti e no Borgo al Primo Turno. (${currentIteration - 1} iterazioni)`);
                } else {
                    const conflictsLeft = countConflicts(bestResult.shifts);
                    const borgoLeft = countSoftViolations(bestResult.shifts);
                    if (borgoLeft > 0) {
                        toast.warning(`⚠️ Trovato compromesso. Conflitti: ${conflictsLeft}. Classi Borgo in Primo Turno: ${borgoLeft}.`);
                    } else {
                        toast.warning(`⚠️ Miglior soluzione in ${MAX_ATTEMPTS} tentativi. Conflitti rimasti: ${conflictsLeft}.`);
                    }
                }
            } else {
                // Queue next chunk
                setTimeout(processChunk, 1);
            }
        };

        // Start first chunk
        setTimeout(processChunk, 50);
    };

    const handleCopyList = () => {
        const lines: string[] = [];
        ["Primo turno", "Secondo turno", "Terzo turno", "Quarto turno"].forEach(shiftName => {
            const classIds = sortClasses(shifts[shiftName]).map(c => c.classId);
            lines.push(`${shiftName}:`);
            lines.push(classIds.join(", "));
            lines.push("");
        });
        const text = lines.join("\n");
        navigator.clipboard.writeText(text).then(() => {
            toast.success("📋 Elenco copiato negli appunti!");
        }).catch(err => {
            console.error("Errore copia:", err);
            toast.error("Errore durante la copia");
        });
    };

    if (loading) return <div className="container text-2xl">Caricamento dati...</div>;

    return (
        <div className="container" style={{ maxWidth: '100%', paddingBottom: showUnassigned ? '280px' : '2rem' }}>
            {isAssigning && (
                <div style={{
                    position: 'fixed',
                    top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(15, 23, 42, 0.8)',
                    backdropFilter: 'blur(8px)',
                    zIndex: 9999,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center'
                }}>
                    <div className="glass-panel" style={{
                        maxWidth: '400px',
                        width: '90%',
                        padding: '2rem',
                        textAlign: 'center',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '1.5rem'
                    }}>
                        <h2 style={{ fontSize: '1.5rem', fontWeight: 600, margin: 0 }}>
                            Ricerca Ottimizzazione Turni
                        </h2>
                        <p style={{ opacity: 0.8, fontSize: '0.9rem', margin: 0 }}>
                            Analisi fino a 500.000 combinazioni per azzerare i conflitti docenti e rispettare i vincoli...
                        </p>

                        <div style={{
                            width: '100%',
                            height: '12px',
                            background: 'rgba(0,0,0,0.3)',
                            borderRadius: '999px',
                            overflow: 'hidden',
                            position: 'relative'
                        }}>
                            <div style={{
                                position: 'absolute',
                                left: 0, top: 0, bottom: 0,
                                width: `${assignProgress}%`,
                                background: 'linear-gradient(90deg, #6366f1, #a855f7)',
                                transition: 'width 0.1s linear'
                            }} />
                        </div>

                        <div className="flex-row justify-between" style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                            <span>{assignProgress}%</span>
                            <span style={{ color: assignBestConflicts === 0 ? '#4ade80' : '#facc15' }}>
                                Miglior risultato finora: {assignBestConflicts ?? '?'} conflitti
                            </span>
                        </div>
                    </div>
                </div>
            )}

            <StatsHeader
                selectedDay={selectedDay}
                showUnassigned={showUnassigned}
                hasGlobalErrors={globalErrors.length > 0}
                globalErrors={globalErrors}
                onDayChange={setSelectedDay}
                onToggleUnassigned={() => setShowUnassigned(!showUnassigned)}
                onImport={handleImport}
                onExport={handleExport}
                onShowConstraints={() => setShowConstraintsModal(true)}
                onAutoAssign={handleAutoAssign}
                onCopyList={handleCopyList}
                onShowMap={() => setShowSeatingMap(true)}
                onShowStats={() => setShowStatistics(true)}
                onReset={handleReset}
                onUndo={handleUndo}
                canUndo={history.length > 0}
                pdfExportElement={
                    <PDFExportButton
                        shifts={shifts}
                        selectedDay={selectedDay}
                        getTeachers={(shift, classId) => manager.getShiftTeachers(shift, classId, selectedDay)}
                    />
                }
            />

            <ErrorPanel
                errors={generateErrorsFromState(shifts, conflictMap, unassignedClasses.length, maxCapacity)}
            />

            <div className="grid grid-cols-4 gap-4">
                {Object.keys(shifts).map((shift) => (
                    <ShiftColumn
                        key={shift}
                        shift={shift}
                        classes={shifts[shift]}
                        manager={manager}
                        selectedDay={selectedDay}
                        shiftErrors={shiftErrors[shift] || []}
                        constraints={constraints}
                        conflictMap={conflictMap}
                        onDrop={handleDrop}
                        onDragOver={handleDragOver}
                        onDragStart={handleDragStart}
                    />
                ))}
            </div>

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

            {showConstraintsModal && (
                <ConstraintsModal
                    manager={manager}
                    constraints={constraints}
                    onClose={() => setShowConstraintsModal(false)}
                    onAddConstraint={addConstraint}
                    onRemoveConstraint={removeConstraint}
                />
            )}

            {showSeatingMap && (
                <SeatingMap
                    shifts={shifts}
                    initialShift={Object.keys(shifts).find(s => shifts[s].length > 0) || "Primo turno"}
                    onClose={() => setShowSeatingMap(false)}
                />
            )}

            {showStatistics && (
                <StatisticsPanel
                    shifts={shifts}
                    maxCapacity={maxCapacity}
                    conflictMap={conflictMap}
                    onClose={() => setShowStatistics(false)}
                />
            )}
        </div>
    );
}
