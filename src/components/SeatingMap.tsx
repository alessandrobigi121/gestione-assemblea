"use client";

import { useState, useEffect } from "react";
import { X, RefreshCw, ChevronLeft, ChevronRight } from "lucide-react";
import { AssemblyEntry } from "@/lib/parsers";

interface SeatingMapProps {
    shifts: { [key: string]: AssemblyEntry[] };
    initialShift: string;
    onClose: () => void;
}

const ROWS = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "L", "M", "N", "O", "P", "Q", "R", "S"];

// Seats per side for each row (left = 1-15, right = 16-30)
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

export default function SeatingMap({ shifts, initialShift, onClose }: SeatingMapProps) {
    const [selectedShift, setSelectedShift] = useState(initialShift);
    const [assignments, setAssignments] = useState<SeatAssignment[]>([]);
    const [classColors, setClassColors] = useState<{ [classId: string]: string }>({});
    const [unassignedClasses, setUnassignedClasses] = useState<string[]>([]);
    const [svgContent, setSvgContent] = useState<string>("");
    const [modifiedSvg, setModifiedSvg] = useState<string>("");

    const shiftNames = ["Primo turno", "Secondo turno", "Terzo turno", "Quarto turno"];

    // Load SVG on mount
    useEffect(() => {
        fetch("/planimetria.svg")
            .then(res => res.text())
            .then(text => setSvgContent(text))
            .catch(err => console.error("Error loading SVG:", err));
    }, []);

    // Auto-assign when shift changes
    useEffect(() => {
        autoAssignSeats();
    }, [selectedShift, shifts]);

    // Update SVG when assignments change
    useEffect(() => {
        if (svgContent) {
            updateSvgColors();
        }
    }, [svgContent, assignments]);

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

        const seatKey = (row: string, seat: number) => `${row}-${seat}`;
        const isFree = (row: string, seat: number) => !occupied.has(seatKey(row, seat));

        // Try to assign a class to seats on one side
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
                tempAssignments.forEach(a => {
                    occupied.add(seatKey(a.row, a.seat));
                    newAssignments.push(a);
                });
                return true;
            }
            return false;
        };

        // Assign each class - try left side first, then right
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

    const updateSvgColors = () => {
        if (!svgContent) return;

        // Create a map: row-seat -> color
        const seatColorMap = new Map<string, string>();
        assignments.forEach(a => {
            seatColorMap.set(`${a.row}-${a.seat}`, a.color);
        });

        // Parse the SVG
        const parser = new DOMParser();
        const doc = parser.parseFromString(svgContent, "image/svg+xml");

        // For each row, find the group and color the seats
        ROWS.forEach(row => {
            const rowGroup = doc.getElementById(row);
            if (!rowGroup) return;

            // Find all seat elements in this row
            // They have IDs like "_1", "_2", ... "_30"
            for (let seat = 1; seat <= 30; seat++) {
                const seatId = `_${seat}`;
                const color = seatColorMap.get(`${row}-${seat}`);

                if (color) {
                    // Find element with this ID within the row group
                    const seatElement = rowGroup.querySelector(`#${CSS.escape(seatId)}`);

                    if (seatElement) {
                        // It could be a <g> containing a <path> or a <path> directly
                        const pathElement = seatElement.tagName === 'path'
                            ? seatElement
                            : seatElement.querySelector('path');

                        if (pathElement) {
                            // Change fill color
                            const currentStyle = pathElement.getAttribute("style") || "";
                            const newStyle = currentStyle.replace("fill:none", `fill:${color}`);
                            pathElement.setAttribute("style", newStyle);
                        }
                    }
                }
            }
        });

        // Serialize back to string
        const serializer = new XMLSerializer();
        const newSvg = serializer.serializeToString(doc);
        setModifiedSvg(newSvg);
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
                    <div style={{
                        flex: 1,
                        overflow: 'auto',
                        background: 'white',
                        display: 'flex',
                        alignItems: 'flex-start',
                        justifyContent: 'center',
                        padding: '1rem'
                    }}>
                        {modifiedSvg ? (
                            <div
                                dangerouslySetInnerHTML={{ __html: modifiedSvg }}
                                style={{ maxWidth: '100%', height: 'auto' }}
                            />
                        ) : (
                            <div style={{ padding: '2rem', color: '#6b7280' }}>
                                Caricamento mappa...
                            </div>
                        )}
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
