
import { Users } from "lucide-react";
import { AssemblyEntry } from "@/lib/parsers";
import { AssemblyManager } from "@/lib/scheduler";
import ClassCard from "./ClassCard";

interface ShiftColumnProps {
    shift: string;
    classes: AssemblyEntry[];
    manager: AssemblyManager;
    selectedDay: string;
    shiftErrors: string[];
    constraints: { [classId: string]: string[] };
    conflictMap: { [classId: string]: string[] };
    onDrop: (e: React.DragEvent, targetShift: string) => void;
    onDragOver: (e: React.DragEvent) => void;
    onDragStart: (e: React.DragEvent, classId: string, source: string) => void;
}

export default function ShiftColumn({
    shift,
    classes,
    manager,
    selectedDay,
    shiftErrors,
    constraints,
    conflictMap,
    onDrop,
    onDragOver,
    onDragStart
}: ShiftColumnProps) {
    // Sort classes for display
    const sortedShiftClasses = [...classes].sort((a, b) => a.classId.localeCompare(b.classId));

    // Calculate stats
    const stats = manager.getShiftStats(shift, sortedShiftClasses.map(c => c.classId), selectedDay);
    const capacityPct = (stats.totalPeople / 499) * 100;
    const isOverCapacity = stats.totalPeople > 499;

    return (
        <div
            className="glass-panel drop-zone flex-col gap-4"
            onDrop={(e) => onDrop(e, shift)}
            onDragOver={onDragOver}
            style={{
                borderColor: shiftErrors && shiftErrors.length > 0 ? '#ef4444' : 'rgba(255,255,255,0.1)',
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

                {shiftErrors && shiftErrors.length > 0 && (
                    <div className="text-sm" style={{ color: '#ef4444', marginTop: '0.5rem' }}>
                        {shiftErrors.map((e, i) => <div key={i}>{e}</div>)}
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

                    // Conflict Logic
                    const conflicts = conflictMap[c.classId] || [];
                    const hasConflict = conflicts.length > 0;

                    // Constraint Logic
                    const isForbidden = constraints[c.classId]?.includes(shift) || false;

                    // Missing Teacher Check
                    const missingGoing = teachers.going.some(t => t.toLowerCase() === "non trovato");
                    const missingReturning = teachers.returning.some(t => t.toLowerCase() === "non trovato");
                    const hasMissing = missingGoing || missingReturning;

                    const isError = hasConflict || hasMissing || isForbidden;

                    return (
                        <ClassCard
                            key={c.classId}
                            c={c}
                            shift={shift}
                            isError={isError}
                            isForbidden={isForbidden}
                            hasConflict={hasConflict}
                            conflicts={conflicts}
                            teachers={teachers}
                            missingGoing={missingGoing}
                            missingReturning={missingReturning}
                            onDragStart={onDragStart}
                        />
                    );
                })}
            </div>
        </div>
    );
}
