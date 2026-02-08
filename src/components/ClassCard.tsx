
import { Users } from "lucide-react";
import { AssemblyEntry } from "@/lib/parsers";

interface ClassCardProps {
    c: AssemblyEntry;
    shift: string;
    isError: boolean;
    isForbidden: boolean;
    hasConflict: boolean;
    conflicts: string[];
    teachers: { going: string[]; returning: string[] };
    missingGoing: boolean;
    missingReturning: boolean;
    onDragStart: (e: React.DragEvent, classId: string, source: string) => void;
}

export default function ClassCard({
    c,
    shift,
    isError,
    isForbidden,
    hasConflict,
    conflicts,
    teachers,
    missingGoing,
    missingReturning,
    onDragStart
}: ClassCardProps) {
    const locationMap: any = { "Borgo S. Antonio": "Borgo", "Sede Centrale": "Centrale", "Via Colvera": "Colvera" };
    const displayLocation = locationMap[c.location] || c.location;
    const displayWeek = c.weekType.includes("Lunga") ? "Sett. Lunga" : "Sett. Corta";

    const cardStyle = isError ? {
        borderColor: '#ef4444',
        background: 'rgba(239, 68, 68, 0.1)'
    } : {};

    return (
        <div
            draggable
            onDragStart={(e) => onDragStart(e, c.classId, shift)}
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
}
