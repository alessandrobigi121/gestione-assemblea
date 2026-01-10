"use client";

import { useState, useEffect, useRef } from "react";
import { X, Download, RefreshCw } from "lucide-react";
import { AssemblyEntry } from "@/lib/parsers";

interface SeatingMapProps {
    shifts: { [key: string]: AssemblyEntry[] };
    selectedShift: string;
    onClose: () => void;
}

// Auditorium seat configuration
// Rows from bottom (near palco) to top
const ROWS = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "L", "M", "N", "O", "P", "Q", "R", "S"];

// Seats per row per side (some rows have fewer seats)
const SEATS_CONFIG: { [row: string]: { left: number; right: number } } = {
    "A": { left: 15, right: 15 },
    "B": { left: 15, right: 15 },
    "C": { left: 15, right: 15 },
    "D": { left: 12, right: 12 }, // D has fewer seats (wheelchair space)
    "E": { left: 15, right: 12 },
    "F": { left: 15, right: 15 },
    "G": { left: 15, right: 15 },
    "H": { left: 15, right: 15 },
    "I": { left: 15, right: 15 },
    "L": { left: 15, right: 15 },
    "M": { left: 15, right: 15 },
    "N": { left: 15, right: 15 },
    "O": { left: 15, right: 15 },
    "P": { left: 15, right: 15 },
    "Q": { left: 15, right: 15 },
    "R": { left: 15, right: 15 },
    "S": { left: 10, right: 9 }, // S has fewer seats at the back
};

// Color palette for classes
const COLORS = [
    "#ef4444", "#f97316", "#f59e0b", "#eab308", "#84cc16",
    "#22c55e", "#14b8a6", "#06b6d4", "#0ea5e9", "#3b82f6",
    "#6366f1", "#8b5cf6", "#a855f7", "#d946ef", "#ec4899",
    "#f43f5e", "#78716c", "#71717a", "#64748b", "#0d9488",
    "#059669", "#16a34a", "#65a30d", "#ca8a04", "#d97706"
];

interface SeatAssignment {
    row: string;
    seat: number;
    classId: string;
    color: string;
}

export default function SeatingMap({ shifts, selectedShift, onClose }: SeatingMapProps) {
    const [assignments, setAssignments] = useState<SeatAssignment[]>([]);
    const [classColors, setClassColors] = useState<{ [classId: string]: string }>({});
    const [unassignedClasses, setUnassignedClasses] = useState<string[]>([]);
    const mapRef = useRef<HTMLDivElement>(null);

    // Auto-assign seats when component mounts or shift changes
    useEffect(() => {
        autoAssignSeats();
    }, [selectedShift, shifts]);

    const autoAssignSeats = () => {
        const classes = shifts[selectedShift] || [];
        if (classes.length === 0) {
            setAssignments([]);
            setClassColors({});
            return;
        }

        // Sort classes by name
        const sortedClasses = [...classes].sort((a, b) => a.classId.localeCompare(b.classId));

        // Assign colors
        const colors: { [classId: string]: string } = {};
        sortedClasses.forEach((cls, i) => {
            colors[cls.classId] = COLORS[i % COLORS.length];
        });
        setClassColors(colors);

        // Track occupied seats
        const occupied: Set<string> = new Set(); // "A-1", "A-2", etc.
        const newAssignments: SeatAssignment[] = [];
        const notAssigned: string[] = [];

        // Helper to get seat key
        const seatKey = (row: string, seat: number) => `${row}-${seat}`;

        // Helper to check if seat is free
        const isFree = (row: string, seat: number) => !occupied.has(seatKey(row, seat));

        // Try to assign a class to contiguous seats on one side
        const tryAssign = (cls: AssemblyEntry, side: "left" | "right"): boolean => {
            const seatsNeeded = cls.students + 1; // +1 for professor
            let seatsAssigned = 0;
            const tempAssignments: SeatAssignment[] = [];

            for (const row of ROWS) {
                const maxSeats = SEATS_CONFIG[row][side];
                const startSeat = side === "left" ? 1 : 16;
                const endSeat = side === "left" ? maxSeats : 15 + maxSeats;

                for (let seat = startSeat; seat <= endSeat && seatsAssigned < seatsNeeded; seat++) {
                    if (isFree(row, seat)) {
                        tempAssignments.push({
                            row,
                            seat,
                            classId: cls.classId,
                            color: colors[cls.classId]
                        });
                        seatsAssigned++;
                    }
                }

                if (seatsAssigned >= seatsNeeded) break;
            }

            if (seatsAssigned >= seatsNeeded) {
                // Mark as occupied and add to assignments
                tempAssignments.forEach(a => {
                    occupied.add(seatKey(a.row, a.seat));
                    newAssignments.push(a);
                });
                return true;
            }

            return false;
        };

        // Assign each class
        sortedClasses.forEach(cls => {
            // Try left side first
            if (!tryAssign(cls, "left")) {
                // Try right side
                if (!tryAssign(cls, "right")) {
                    notAssigned.push(cls.classId);
                }
            }
        });

        setAssignments(newAssignments);
        setUnassignedClasses(notAssigned);
    };

    // Get assignment for a specific seat
    const getAssignment = (row: string, seat: number): SeatAssignment | undefined => {
        return assignments.find(a => a.row === row && a.seat === seat);
    };

    // Render a single seat
    const renderSeat = (row: string, seat: number) => {
        const assignment = getAssignment(row, seat);
        const size = 18;

        return (
            <div
                key={`${row}-${seat}`}
                style={{
                    width: size,
                    height: size,
                    borderRadius: 3,
                    background: assignment ? assignment.color : 'rgba(255,255,255,0.1)',
                    border: assignment ? `2px solid ${assignment.color}` : '1px solid rgba(255,255,255,0.2)',
                    fontSize: 8,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                }}
                title={assignment ? `${assignment.classId} - ${row}${seat}` : `${row}${seat}`}
            >
                {seat}
            </div>
        );
    };

    // Render a row
    const renderRow = (row: string) => {
        const config = SEATS_CONFIG[row];
        const leftSeats = Array.from({ length: config.left }, (_, i) => i + 1);
        const rightSeats = Array.from({ length: config.right }, (_, i) => i + 16);

        return (
            <div key={row} className="flex-row items-center gap-2" style={{ marginBottom: 4 }}>
                {/* Left seats */}
                <div className="flex-row gap-1">
                    {leftSeats.map(seat => renderSeat(row, seat))}
                </div>

                {/* Row label */}
                <div style={{
                    width: 24,
                    textAlign: 'center',
                    fontWeight: 'bold',
                    color: '#818cf8'
                }}>
                    {row}
                </div>

                {/* Right seats */}
                <div className="flex-row gap-1">
                    {rightSeats.map(seat => renderSeat(row, seat))}
                </div>
            </div>
        );
    };

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.9)',
            backdropFilter: 'blur(8px)',
            zIndex: 200,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '2rem'
        }}>
            <div className="glass-panel" style={{
                width: '95%',
                maxWidth: '1200px',
                maxHeight: '95vh',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden'
            }}>
                {/* Header */}
                <div className="flex-row justify-between items-center" style={{
                    padding: '1rem 1.5rem',
                    borderBottom: '1px solid rgba(255,255,255,0.1)'
                }}>
                    <div>
                        <h2 className="text-xl" style={{ marginBottom: '0.25rem' }}>
                            🗺️ Mappa Posti - {selectedShift}
                        </h2>
                        <p className="text-sm" style={{ opacity: 0.7 }}>
                            {shifts[selectedShift]?.length || 0} classi • {assignments.length} posti assegnati
                        </p>
                    </div>
                    <div className="flex-row gap-2">
                        <button
                            onClick={autoAssignSeats}
                            className="glass-panel hover:bg-white/10"
                            style={{ padding: '0.5rem 1rem', cursor: 'pointer', display: 'flex', gap: '0.5rem', alignItems: 'center' }}
                        >
                            <RefreshCw size={16} /> Riassegna
                        </button>
                        <button
                            onClick={onClose}
                            className="glass-panel hover:bg-white/10"
                            style={{ padding: '0.5rem', cursor: 'pointer' }}
                        >
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div style={{
                    flex: 1,
                    overflow: 'auto',
                    padding: '1.5rem',
                    display: 'flex',
                    gap: '2rem'
                }}>
                    {/* Map */}
                    <div ref={mapRef} style={{ flex: 1 }}>
                        {/* Palco */}
                        <div style={{
                            textAlign: 'center',
                            padding: '1rem',
                            marginBottom: '1rem',
                            background: 'rgba(99, 102, 241, 0.2)',
                            borderRadius: 8,
                            border: '2px solid rgba(99, 102, 241, 0.4)',
                            fontWeight: 'bold',
                            color: '#a5b4fc'
                        }}>
                            PALCO
                        </div>

                        {/* Rows */}
                        <div className="flex-col items-center">
                            {ROWS.map(row => renderRow(row))}
                        </div>
                    </div>

                    {/* Legend */}
                    <div style={{ width: '200px', flexShrink: 0 }}>
                        <h3 className="text-sm" style={{ marginBottom: '1rem', fontWeight: 'bold' }}>
                            Legenda Classi
                        </h3>
                        <div className="flex-col gap-2" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
                            {Object.entries(classColors).map(([classId, color]) => {
                                const cls = shifts[selectedShift]?.find(c => c.classId === classId);
                                const seatsUsed = assignments.filter(a => a.classId === classId).length;

                                return (
                                    <div key={classId} className="flex-row items-center gap-2">
                                        <div style={{
                                            width: 20,
                                            height: 20,
                                            borderRadius: 4,
                                            background: color
                                        }} />
                                        <div>
                                            <div style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>{classId}</div>
                                            <div className="text-sm" style={{ opacity: 0.6 }}>
                                                {seatsUsed} posti
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {unassignedClasses.length > 0 && (
                            <div style={{ marginTop: '1rem', padding: '0.5rem', background: 'rgba(239, 68, 68, 0.1)', borderRadius: 8, border: '1px solid rgba(239, 68, 68, 0.3)' }}>
                                <div className="text-sm" style={{ color: '#fca5a5', fontWeight: 'bold' }}>
                                    ⚠️ Non assegnate:
                                </div>
                                <div className="text-sm" style={{ color: '#fca5a5' }}>
                                    {unassignedClasses.join(", ")}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
