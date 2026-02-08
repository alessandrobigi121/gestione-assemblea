
import { X, Ban, Plus, Trash2 } from "lucide-react";
import { AssemblyManager } from "@/lib/scheduler";
import { useState } from "react";

interface ConstraintsModalProps {
    manager: AssemblyManager;
    constraints: { [classId: string]: string[] };
    onClose: () => void;
    onAddConstraint: (classId: string, shifts: string[]) => void;
    onRemoveConstraint: (classId: string) => void;
}

const SHIFT_TIMES: { [key: string]: { start: string; end: string } } = {
    "Primo turno": { start: "08:20", end: "09:45" },
    "Secondo turno": { start: "09:45", end: "11:10" },
    "Terzo turno": { start: "11:10", end: "12:30" },
    "Quarto turno": { start: "12:30", end: "13:50" }
};

export default function ConstraintsModal({
    manager,
    constraints,
    onClose,
    onAddConstraint,
    onRemoveConstraint
}: ConstraintsModalProps) {
    const [selectedConstraintClass, setSelectedConstraintClass] = useState("");
    const [selectedConstraintShifts, setSelectedConstraintShifts] = useState<string[]>([]);
    const [busyFrom, setBusyFrom] = useState("");
    const [busyTo, setBusyTo] = useState("");

    const timeToMinutes = (time: string): number => {
        const [hours, minutes] = time.split(':').map(Number);
        return hours * 60 + minutes;
    };

    const calculateOverlappingShifts = (from: string, to: string): string[] => {
        if (!from || !to) return [];
        const fromMinutes = timeToMinutes(from);
        const toMinutes = timeToMinutes(to);
        if (fromMinutes >= toMinutes) return [];

        const overlapping: string[] = [];
        Object.entries(SHIFT_TIMES).forEach(([shiftName, times]) => {
            const shiftStart = timeToMinutes(times.start);
            const shiftEnd = timeToMinutes(times.end);
            if (fromMinutes < shiftEnd && toMinutes > shiftStart) {
                overlapping.push(shiftName);
            }
        });
        return overlapping;
    };

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

    const toggleConstraintShift = (shift: string) => {
        if (selectedConstraintShifts.includes(shift)) {
            setSelectedConstraintShifts(prev => prev.filter(s => s !== shift));
        } else {
            setSelectedConstraintShifts(prev => [...prev, shift]);
        }
    };

    const handleAdd = () => {
        if (!selectedConstraintClass || selectedConstraintShifts.length === 0) return;
        onAddConstraint(selectedConstraintClass, selectedConstraintShifts);
        setSelectedConstraintClass("");
        setSelectedConstraintShifts([]);
        setBusyFrom("");
        setBusyTo("");
    };

    return (
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
                <div className="flex-row justify-between items-center" style={{ padding: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                    <div>
                        <h2 className="text-xl" style={{ marginBottom: '0.25rem' }}>Gestione Vincoli</h2>
                        <p className="text-sm">Impedisci a certe classi di frequentare turni specifici.</p>
                    </div>
                    <button onClick={onClose} className="glass-panel hover:bg-white/10" style={{ padding: '0.5rem', cursor: 'pointer', border: 'none' }}>
                        <X size={20} />
                    </button>
                </div>

                <div style={{ padding: '1.5rem', overflowY: 'auto', flex: 1 }}>
                    <div className="flex-col gap-4" style={{ marginBottom: '2rem' }}>
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

                        <div className="flex-col gap-2">
                            <label className="text-sm">⏰ Orario Impegno (auto-seleziona turni):</label>
                            <div className="flex-row gap-2">
                                <div className="glass-panel flex-row items-center gap-2" style={{ padding: '0.5rem 1rem', flex: 1 }}>
                                    <span className="text-sm" style={{ opacity: 0.6 }}>Dalle</span>
                                    <input type="time" value={busyFrom} onChange={(e) => handleTimeChange('from', e.target.value)} style={{ background: 'transparent', color: 'white', border: 'none', fontSize: '1rem', cursor: 'pointer' }} />
                                </div>
                                <div className="glass-panel flex-row items-center gap-2" style={{ padding: '0.5rem 1rem', flex: 1 }}>
                                    <span className="text-sm" style={{ opacity: 0.6 }}>Alle</span>
                                    <input type="time" value={busyTo} onChange={(e) => handleTimeChange('to', e.target.value)} style={{ background: 'transparent', color: 'white', border: 'none', fontSize: '1rem', cursor: 'pointer' }} />
                                </div>
                                {busyFrom && busyTo && (
                                    <button onClick={() => { setBusyFrom(''); setBusyTo(''); setSelectedConstraintShifts([]); }} className="glass-panel hover:bg-white/10" style={{ padding: '0.5rem', cursor: 'pointer' }}>✕</button>
                                )}
                            </div>
                            {busyFrom && busyTo && selectedConstraintShifts.length > 0 && (
                                <div className="text-sm" style={{ color: '#818cf8', marginTop: '0.25rem' }}>
                                    → Turni in conflitto: {selectedConstraintShifts.join(', ')}
                                </div>
                            )}
                        </div>

                        <div className="flex-col gap-2">
                            <label className="text-sm">Turni Vietati:</label>
                            <div className="grid grid-cols-2 gap-2">
                                {Object.keys(SHIFT_TIMES).map(s => {
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

                        <button
                            onClick={handleAdd}
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
                                        <button onClick={() => onRemoveConstraint(cId)} className="glass-panel hover:bg-white/10" style={{ padding: '0.5rem', cursor: 'pointer', background: 'rgba(239, 68, 68, 0.1)', borderColor: 'rgba(239, 68, 68, 0.3)', color: '#fca5a5' }} title="Rimuovi">
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
    );
}
