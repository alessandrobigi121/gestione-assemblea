"use client";

import { useState, useEffect, useRef } from "react";
import { X, Download, RefreshCw, ChevronLeft, ChevronRight } from "lucide-react";
import { AssemblyEntry } from "@/lib/parsers";

interface SeatingMapProps {
    shifts: { [key: string]: AssemblyEntry[] };
    initialShift: string;
    onClose: () => void;
}

// Auditorium configuration based on the original SVG
// Coordinates are in the SVG viewBox coordinate system (0 0 794 1123)
// The SVG has a scale of 1.33333, so actual positions need adjustment

const ROWS = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "L", "M", "N", "O", "P", "Q", "R", "S"];

// Row Y positions (approximate from SVG analysis)
// Starting from bottom (A near palco) going up
const ROW_Y_POSITIONS: { [row: string]: number } = {
    "A": 580, "B": 555, "C": 530, "D": 505, "E": 477,
    "F": 448, "G": 430, "H": 412, "I": 394, "L": 376,
    "M": 345, "N": 327, "O": 309, "P": 291, "Q": 273, "R": 255, "S": 237
};

// X position ranges for left and right sections
const LEFT_START_X = 52;  // Left section starts around x=52
const LEFT_END_X = 265;   // Left section ends around x=265
const RIGHT_START_X = 315; // Right section starts around x=315
const RIGHT_END_X = 545;  // Right section ends around x=545

// Seats per side for each row
const SEATS_CONFIG: { [row: string]: { left: number; right: number } } = {
    "A": { left: 15, right: 15 },
    "B": { left: 15, right: 15 },
    "C": { left: 15, right: 15 },
    "D": { left: 12, right: 12 },
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
    "S": { left: 10, right: 9 },
};

// Color palette
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
    side: "left" | "right";
}

export default function SeatingMap({ shifts, initialShift, onClose }: SeatingMapProps) {
    const [selectedShift, setSelectedShift] = useState(initialShift);
    const [assignments, setAssignments] = useState<SeatAssignment[]>([]);
    const [classColors, setClassColors] = useState<{ [classId: string]: string }>({});
    const [unassignedClasses, setUnassignedClasses] = useState<string[]>([]);
    const svgContainerRef = useRef<HTMLDivElement>(null);

    const shiftNames = ["Primo turno", "Secondo turno", "Terzo turno", "Quarto turno"];

    useEffect(() => {
        autoAssignSeats();
    }, [selectedShift, shifts]);

    const autoAssignSeats = () => {
        const classes = shifts[selectedShift] || [];
        if (classes.length === 0) {
            setAssignments([]);
            setClassColors({});
            setUnassignedClasses([]);
            return;
        }

        const sortedClasses = [...classes].sort((a, b) => a.classId.localeCompare(b.classId));

        const colors: { [classId: string]: string } = {};
        sortedClasses.forEach((cls, i) => {
            colors[cls.classId] = COLORS[i % COLORS.length];
        });
        setClassColors(colors);

        const occupied: Set<string> = new Set();
        const newAssignments: SeatAssignment[] = [];
        const notAssigned: string[] = [];

        const seatKey = (row: string, seat: number, side: "left" | "right") => `${row}-${side}-${seat}`;
        const isFree = (row: string, seat: number, side: "left" | "right") => !occupied.has(seatKey(row, seat, side));

        const tryAssign = (cls: AssemblyEntry, side: "left" | "right"): boolean => {
            const seatsNeeded = cls.students + 1;
            let seatsAssigned = 0;
            const tempAssignments: SeatAssignment[] = [];

            for (const row of ROWS) {
                const maxSeats = SEATS_CONFIG[row][side];
                const startSeat = side === "left" ? 1 : 16;
                const endSeat = side === "left" ? maxSeats : 15 + maxSeats;

                for (let seat = startSeat; seat <= endSeat && seatsAssigned < seatsNeeded; seat++) {
                    if (isFree(row, seat, side)) {
                        tempAssignments.push({
                            row,
                            seat,
                            classId: cls.classId,
                            color: colors[cls.classId],
                            side
                        });
                        seatsAssigned++;
                    }
                }

                if (seatsAssigned >= seatsNeeded) break;
            }

            if (seatsAssigned >= seatsNeeded) {
                tempAssignments.forEach(a => {
                    occupied.add(seatKey(a.row, a.seat, a.side));
                    newAssignments.push(a);
                });
                return true;
            }
            return false;
        };

        sortedClasses.forEach(cls => {
            if (!tryAssign(cls, "left")) {
                if (!tryAssign(cls, "right")) {
                    notAssigned.push(cls.classId);
                }
            }
        });

        setAssignments(newAssignments);
        setUnassignedClasses(notAssigned);
    };

    // Calculate pixel position for a seat on the SVG
    const getSeatPosition = (row: string, seat: number, side: "left" | "right") => {
        const y = ROW_Y_POSITIONS[row] || 400;
        const maxSeats = SEATS_CONFIG[row][side];

        let x: number;
        if (side === "left") {
            const seatIndex = seat - 1;
            const seatWidth = (LEFT_END_X - LEFT_START_X) / maxSeats;
            x = LEFT_START_X + seatIndex * seatWidth + seatWidth / 2;
        } else {
            const seatIndex = seat - 16;
            const seatWidth = (RIGHT_END_X - RIGHT_START_X) / maxSeats;
            x = RIGHT_START_X + seatIndex * seatWidth + seatWidth / 2;
        }

        return { x, y };
    };

    const cycleShift = (direction: number) => {
        const currentIndex = shiftNames.indexOf(selectedShift);
        const newIndex = (currentIndex + direction + shiftNames.length) % shiftNames.length;
        setSelectedShift(shiftNames[newIndex]);
    };

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.95)',
            zIndex: 200,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem'
        }}>
            <div style={{
                width: '100%',
                maxWidth: '1400px',
                height: '95vh',
                display: 'flex',
                flexDirection: 'column',
                background: 'white',
                borderRadius: '12px',
                overflow: 'hidden'
            }}>
                {/* Header */}
                <div style={{
                    padding: '1rem 1.5rem',
                    borderBottom: '1px solid #e5e7eb',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    background: '#f9fafb'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <h2 style={{ margin: 0, fontSize: '1.25rem', color: '#111827' }}>
                            🗺️ Mappa Posti Auditorium
                        </h2>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <button
                                onClick={() => cycleShift(-1)}
                                style={{ padding: '0.25rem', cursor: 'pointer', background: 'none', border: 'none' }}
                            >
                                <ChevronLeft size={20} color="#6b7280" />
                            </button>
                            <span style={{
                                fontWeight: 'bold',
                                color: '#4f46e5',
                                minWidth: '140px',
                                textAlign: 'center'
                            }}>
                                {selectedShift}
                            </span>
                            <button
                                onClick={() => cycleShift(1)}
                                style={{ padding: '0.25rem', cursor: 'pointer', background: 'none', border: 'none' }}
                            >
                                <ChevronRight size={20} color="#6b7280" />
                            </button>
                        </div>
                        <span style={{ color: '#6b7280', fontSize: '0.875rem' }}>
                            {shifts[selectedShift]?.length || 0} classi • {assignments.length} posti
                        </span>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button
                            onClick={autoAssignSeats}
                            style={{
                                padding: '0.5rem 1rem',
                                cursor: 'pointer',
                                display: 'flex',
                                gap: '0.5rem',
                                alignItems: 'center',
                                background: 'white',
                                border: '1px solid #d1d5db',
                                borderRadius: '6px'
                            }}
                        >
                            <RefreshCw size={16} /> Riassegna
                        </button>
                        <button
                            onClick={onClose}
                            style={{
                                padding: '0.5rem',
                                cursor: 'pointer',
                                background: 'white',
                                border: '1px solid #d1d5db',
                                borderRadius: '6px'
                            }}
                        >
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div style={{
                    flex: 1,
                    display: 'flex',
                    overflow: 'hidden'
                }}>
                    {/* SVG Map */}
                    <div
                        ref={svgContainerRef}
                        style={{
                            flex: 1,
                            position: 'relative',
                            overflow: 'auto',
                            background: 'white',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: '1rem'
                        }}
                    >
                        <div style={{ position: 'relative', width: '100%', maxWidth: '600px' }}>
                            {/* Original SVG as base */}
                            <img
                                src="/planimetria.svg"
                                alt="Planimetria Auditorium Concordia"
                                style={{ width: '100%', height: 'auto' }}
                            />

                            {/* Overlay container - positioned absolutely over the SVG */}
                            <svg
                                viewBox="0 0 595 842"
                                style={{
                                    position: 'absolute',
                                    top: 0,
                                    left: 0,
                                    width: '100%',
                                    height: '100%',
                                    pointerEvents: 'none'
                                }}
                            >
                                {/* Draw colored rectangles for each assigned seat */}
                                {assignments.map((a, i) => {
                                    const pos = getSeatPosition(a.row, a.seat, a.side);
                                    const seatWidth = 12;
                                    const seatHeight = 14;

                                    return (
                                        <rect
                                            key={`${a.row}-${a.seat}-${i}`}
                                            x={pos.x - seatWidth / 2}
                                            y={pos.y - seatHeight / 2}
                                            width={seatWidth}
                                            height={seatHeight}
                                            fill={a.color}
                                            opacity={0.7}
                                            rx={2}
                                        />
                                    );
                                })}
                            </svg>
                        </div>
                    </div>

                    {/* Legend */}
                    <div style={{
                        width: '220px',
                        borderLeft: '1px solid #e5e7eb',
                        padding: '1rem',
                        overflowY: 'auto',
                        background: '#f9fafb'
                    }}>
                        <h3 style={{ margin: '0 0 1rem 0', fontSize: '0.875rem', color: '#374151', fontWeight: 'bold' }}>
                            Legenda Classi
                        </h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            {Object.entries(classColors).map(([classId, color]) => {
                                const cls = shifts[selectedShift]?.find(c => c.classId === classId);
                                const seatsUsed = assignments.filter(a => a.classId === classId).length;

                                return (
                                    <div key={classId} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <div style={{
                                            width: 20,
                                            height: 20,
                                            borderRadius: 4,
                                            background: color,
                                            flexShrink: 0
                                        }} />
                                        <div>
                                            <div style={{ fontWeight: 'bold', fontSize: '0.875rem', color: '#111827' }}>
                                                {classId}
                                            </div>
                                            <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                                                {seatsUsed} posti ({cls?.students || 0} studenti)
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {unassignedClasses.length > 0 && (
                            <div style={{
                                marginTop: '1rem',
                                padding: '0.75rem',
                                background: '#fef2f2',
                                borderRadius: 8,
                                border: '1px solid #fecaca'
                            }}>
                                <div style={{ fontSize: '0.75rem', color: '#dc2626', fontWeight: 'bold' }}>
                                    ⚠️ Non assegnate:
                                </div>
                                <div style={{ fontSize: '0.75rem', color: '#dc2626' }}>
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
