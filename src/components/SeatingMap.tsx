"use client";

import { useState, useEffect } from "react";
import { X, RefreshCw, ChevronLeft, ChevronRight } from "lucide-react";
import { AssemblyEntry } from "@/lib/parsers";

interface SeatingMapProps {
    shifts: { [key: string]: AssemblyEntry[] };
    initialShift: string;
    onClose: () => void;
}

// Row groups - classes cannot be split across groups
const ROW_GROUPS = [
    ["A", "B", "C"],
    ["D", "E", "F", "G", "H", "I", "L"],
    ["M", "N", "O", "P", "Q", "R", "S"]
];

const ROWS = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "L", "M", "N", "O", "P", "Q", "R", "S"];

// Available seats per row and side
const SEATS_CONFIG: { [row: string]: { left: number[]; right: number[] } } = {
    "A": { left: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15], right: [16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30] },
    "B": { left: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15], right: [16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30] },
    "C": { left: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15], right: [16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30] },
    "D": { left: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], right: [19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30] },
    "E": { left: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15], right: [16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30] },
    "F": { left: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15], right: [16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30] },
    "G": { left: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15], right: [16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30] },
    "H": { left: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15], right: [16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30] },
    "I": { left: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15], right: [16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30] },
    "L": { left: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15], right: [16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30] },
    "M": { left: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15], right: [16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30] },
    "N": { left: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15], right: [16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30] },
    "O": { left: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15], right: [16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30] },
    "P": { left: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15], right: [16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30] },
    "Q": { left: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15], right: [16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30] },
    "R": { left: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15], right: [16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30] },
    "S": { left: [2, 3, 4, 5, 6, 7, 8, 9, 10, 13, 14, 15], right: [16, 17, 18, 21, 22, 23, 24, 25, 26, 27, 28, 29] },
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

    useEffect(() => {
        fetch("/planimetria.svg")
            .then(res => res.text())
            .then(text => setSvgContent(text))
            .catch(err => console.error("Error loading SVG:", err));
    }, []);

    useEffect(() => {
        autoAssignSeats();
    }, [selectedShift, shifts]);

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

        // Sort classes by size descending for better packing
        const sortedClasses = [...classes].sort((a, b) => (b.students + 1) - (a.students + 1));

        const colors: { [classId: string]: string } = {};
        classes.forEach((cls, i) => {
            colors[cls.classId] = COLORS[i % COLORS.length];
        });
        setClassColors(colors);

        const occupied: Set<string> = new Set();
        const newAssignments: SeatAssignment[] = [];
        const notAssigned: string[] = [];

        const seatKey = (row: string, seat: number) => `${row}-${seat}`;

        // Get available seats for a specific row and side
        const getRowSeats = (row: string, side: "left" | "right"): number[] => {
            return SEATS_CONFIG[row][side].filter(seat => !occupied.has(seatKey(row, seat)));
        };

        // Try to assign a class using max 2 rows within a group and side
        // Returns true if successfully assigned
        const tryAssignClass = (
            cls: AssemblyEntry,
            group: string[],
            side: "left" | "right",
            startRowIndex: number
        ): { success: boolean; nextRowIndex: number } => {
            const seatsNeeded = cls.students + 1;

            // Collect seats from up to 2 consecutive rows
            const availableSeats: { row: string; seat: number }[] = [];
            let rowsUsed = 0;

            for (let i = startRowIndex; i < group.length && rowsUsed < 2; i++) {
                const row = group[i];
                const rowSeats = getRowSeats(row, side);

                if (rowSeats.length > 0) {
                    rowsUsed++;
                    for (const seat of rowSeats) {
                        availableSeats.push({ row, seat });
                        if (availableSeats.length >= seatsNeeded) break;
                    }
                }

                if (availableSeats.length >= seatsNeeded) break;
            }

            // Check if we have enough seats in max 2 rows
            if (availableSeats.length >= seatsNeeded) {
                const assignedSeats = availableSeats.slice(0, seatsNeeded);

                // Count how many rows we're actually using
                const rowsInAssignment = new Set(assignedSeats.map(s => s.row)).size;

                // If we're using 2 rows but not filling the first one completely,
                // check if the second row has very few seats (isolated students)
                if (rowsInAssignment === 2) {
                    const firstRow = assignedSeats[0].row;
                    const seatsInFirstRow = assignedSeats.filter(s => s.row === firstRow).length;
                    const seatsInSecondRow = assignedSeats.filter(s => s.row !== firstRow).length;

                    // If second row has less than 5 seats, skip this position
                    // (to avoid isolated students)
                    if (seatsInSecondRow > 0 && seatsInSecondRow < 5) {
                        // Check if we can fit the whole class starting from next row
                        const nextRowIndex = group.indexOf(firstRow) + 1;
                        if (nextRowIndex < group.length) {
                            // Try to fit starting from next row
                            let seatsFromNextRow = 0;
                            for (let i = nextRowIndex; i < Math.min(nextRowIndex + 2, group.length); i++) {
                                seatsFromNextRow += getRowSeats(group[i], side).length;
                            }
                            if (seatsFromNextRow >= seatsNeeded) {
                                // Skip current position, class will fit better in next rows
                                return { success: false, nextRowIndex: nextRowIndex };
                            }
                        }
                    }
                }

                // Assign the seats
                assignedSeats.forEach(({ row, seat }) => {
                    occupied.add(seatKey(row, seat));
                    newAssignments.push({
                        row,
                        seat,
                        classId: cls.classId,
                        color: colors[cls.classId]
                    });
                });

                // Calculate next available row index
                const lastRowUsed = assignedSeats[assignedSeats.length - 1].row;
                const lastRowIndex = group.indexOf(lastRowUsed);
                const lastRowSeatsRemaining = getRowSeats(lastRowUsed, side).length;

                // If the last row is fully used, move to next row
                const nextRowIndex = lastRowSeatsRemaining === 0 ? lastRowIndex + 1 : lastRowIndex;

                return { success: true, nextRowIndex };
            }

            return { success: false, nextRowIndex: startRowIndex };
        };

        // Process each group
        let classQueue = [...sortedClasses];

        for (const group of ROW_GROUPS) {
            let leftRowIndex = 0;
            let rightRowIndex = 0;
            let side: "left" | "right" = "left";

            while (classQueue.length > 0) {
                const cls = classQueue[0];
                const currentRowIndex = side === "left" ? leftRowIndex : rightRowIndex;

                if (currentRowIndex >= group.length) {
                    // No more rows in this side of this group, try other side
                    if (side === "left") {
                        side = "right";
                        continue;
                    } else {
                        // Both sides exhausted for this group
                        break;
                    }
                }

                const result = tryAssignClass(cls, group, side, currentRowIndex);

                if (result.success) {
                    classQueue.shift(); // Remove assigned class

                    // Update row index for this side
                    if (side === "left") {
                        leftRowIndex = result.nextRowIndex;
                    } else {
                        rightRowIndex = result.nextRowIndex;
                    }

                    // Alternate sides
                    side = side === "left" ? "right" : "left";
                } else {
                    // Could not fit, try next row or other side
                    if (side === "left") {
                        leftRowIndex = result.nextRowIndex + 1;
                        side = "right";
                    } else {
                        rightRowIndex = result.nextRowIndex + 1;
                        side = "left";
                    }

                    // If both sides are exhausted, move to next group
                    if (leftRowIndex >= group.length && rightRowIndex >= group.length) {
                        break;
                    }
                }
            }
        }

        // Any remaining classes couldn't be assigned
        notAssigned.push(...classQueue.map(c => c.classId));

        setAssignments(newAssignments);
        setUnassignedClasses(notAssigned);
    };

    const updateSvgColors = () => {
        if (!svgContent) return;

        const seatColorMap = new Map<string, string>();
        assignments.forEach(a => {
            seatColorMap.set(`${a.row}-${a.seat}`, a.color);
        });

        const parser = new DOMParser();
        const doc = parser.parseFromString(svgContent, "image/svg+xml");

        ROWS.forEach(row => {
            const rowGroup = doc.getElementById(row);
            if (!rowGroup) return;

            const allElements = rowGroup.querySelectorAll('g, path');

            allElements.forEach(el => {
                const serifId = el.getAttribute('serif:id');
                if (!serifId) return;

                const seatNum = parseInt(serifId);
                if (isNaN(seatNum) || seatNum < 1 || seatNum > 30) return;

                const color = seatColorMap.get(`${row}-${seatNum}`);
                if (!color) return;

                const pathElement = el.tagName === 'path'
                    ? el
                    : el.querySelector('path');

                if (pathElement) {
                    const currentStyle = pathElement.getAttribute("style") || "";
                    const newStyle = currentStyle.replace("fill:none", `fill:${color}`);
                    pathElement.setAttribute("style", newStyle);
                }
            });
        });

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

                <div style={{
                    flex: 1,
                    display: 'flex',
                    overflow: 'hidden'
                }}>
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
                                style={{ width: '100%', minWidth: '900px', height: 'auto' }}
                            />
                        ) : (
                            <div style={{ padding: '2rem', color: '#6b7280' }}>
                                Caricamento mappa...
                            </div>
                        )}
                    </div>

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
