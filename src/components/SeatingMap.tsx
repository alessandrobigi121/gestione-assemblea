"use client";

import { useState, useEffect, useRef } from "react";
import { X, Download, RefreshCw, ChevronLeft, ChevronRight } from "lucide-react";
import { AssemblyEntry } from "@/lib/parsers";

interface SeatingMapProps {
    shifts: { [key: string]: AssemblyEntry[] };
    initialShift: string;
    onClose: () => void;
}

const ROWS = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "L", "M", "N", "O", "P", "Q", "R", "S"];

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
    side: "left" | "right";
}

interface SeatPath {
    element: Element;
    centerX: number;
    centerY: number;
    row: string;
    seat: number;
    side: "left" | "right";
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
        if (svgContent && assignments.length >= 0) {
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

    // Parse path d attribute to get center point
    const getPathCenter = (d: string): { x: number; y: number } | null => {
        // Parse the path command to extract points
        // Format: M x1,y1 L x2,y2 L x3,y3 L x4,y4 Z
        const coords: { x: number; y: number }[] = [];
        const parts = d.split(/[MLHVCSQTAZ]/i).filter(p => p.trim());

        for (const part of parts) {
            const nums = part.split(/[,\s]+/).map(n => parseFloat(n.trim())).filter(n => !isNaN(n));
            for (let i = 0; i < nums.length - 1; i += 2) {
                coords.push({ x: nums[i], y: nums[i + 1] });
            }
        }

        if (coords.length === 0) return null;

        // Calculate center
        const sumX = coords.reduce((sum, c) => sum + c.x, 0);
        const sumY = coords.reduce((sum, c) => sum + c.y, 0);
        return { x: sumX / coords.length, y: sumY / coords.length };
    };

    // Determine row and seat from position
    const determineRowAndSeat = (centerX: number, centerY: number, allPaths: SeatPath[]): { row: string; seat: number; side: "left" | "right" } | null => {
        // Determine side based on X position (left < 400, right >= 400)
        const side: "left" | "right" = centerX < 400 ? "left" : "right";

        // Group by approximate Y to find rows
        // Paths with similar Y are in the same row
        const yTolerance = 20;

        // Find all paths on this side with similar Y
        const sameRowPaths = allPaths.filter(p =>
            p.side === side && Math.abs(p.centerY - centerY) < yTolerance
        );

        // Sort by X to get seat number
        sameRowPaths.sort((a, b) => a.centerX - b.centerX);

        const seatIndex = sameRowPaths.findIndex(p =>
            Math.abs(p.centerX - centerX) < 5 && Math.abs(p.centerY - centerY) < 5
        );

        if (seatIndex === -1) return null;

        // Determine row based on Y position
        // Higher Y = closer to palco = row A
        // We need to map Y ranges to rows
        const rowYRanges = [
            { row: "A", minY: 700, maxY: 800 },
            { row: "B", minY: 650, maxY: 700 },
            { row: "C", minY: 600, maxY: 650 },
            { row: "D", minY: 560, maxY: 600 },
            { row: "E", minY: 520, maxY: 560 },
            { row: "F", minY: 480, maxY: 520 },
            { row: "G", minY: 440, maxY: 480 },
            { row: "H", minY: 400, maxY: 440 },
            { row: "I", minY: 360, maxY: 400 },
            { row: "L", minY: 320, maxY: 360 },
            { row: "M", minY: 290, maxY: 320 },
            { row: "N", minY: 260, maxY: 290 },
            { row: "O", minY: 230, maxY: 260 },
            { row: "P", minY: 200, maxY: 230 },
            { row: "Q", minY: 170, maxY: 200 },
            { row: "R", minY: 140, maxY: 170 },
            { row: "S", minY: 100, maxY: 140 },
        ];

        const rowMatch = rowYRanges.find(r => centerY >= r.minY && centerY < r.maxY);
        const row = rowMatch?.row || "A";

        const seat = side === "left" ? seatIndex + 1 : seatIndex + 16;

        return { row, seat, side };
    };

    const updateSvgColors = () => {
        if (!svgContent) return;

        // Create a map of which seats belong to which class
        const seatColorMap = new Map<string, string>();
        assignments.forEach(a => {
            seatColorMap.set(`${a.row}-${a.side}-${a.seat}`, a.color);
        });

        // Parse the SVG
        const parser = new DOMParser();
        const doc = parser.parseFromString(svgContent, "image/svg+xml");

        // Find all path elements that represent seats (stroke-width: 0.27px)
        const allPaths = doc.querySelectorAll("path");
        const seatPaths: SeatPath[] = [];

        allPaths.forEach((path) => {
            const style = path.getAttribute("style") || "";
            // Seat paths have stroke-width:0.27px
            if (style.includes("stroke-width:0.27px") || style.includes("stroke-width: 0.27px")) {
                const d = path.getAttribute("d") || "";
                const center = getPathCenter(d);
                if (center) {
                    // Apply transform if exists
                    let transformedX = center.x;
                    let transformedY = center.y;

                    // Check parent for transform
                    const parent = path.parentElement;
                    if (parent) {
                        const transform = parent.getAttribute("transform");
                        if (transform) {
                            // Handle matrix(-1,0,0,1,771.305,0) = flip horizontally
                            const matrixMatch = transform.match(/matrix\(([-\d.]+),([-\d.]+),([-\d.]+),([-\d.]+),([-\d.]+),([-\d.]+)\)/);
                            if (matrixMatch) {
                                const [, a, b, c, d, e, f] = matrixMatch.map(Number);
                                transformedX = a * center.x + c * center.y + e;
                                transformedY = b * center.x + d * center.y + f;
                            }
                        }
                    }

                    const side: "left" | "right" = transformedX < 400 ? "left" : "right";
                    seatPaths.push({
                        element: path,
                        centerX: transformedX,
                        centerY: transformedY,
                        row: "",
                        seat: 0,
                        side
                    });
                }
            }
        });

        // Sort paths by Y (row) then X (seat)
        seatPaths.sort((a, b) => {
            // First by Y descending (higher Y = row A)
            if (Math.abs(a.centerY - b.centerY) > 15) {
                return b.centerY - a.centerY;
            }
            // Then by X
            return a.centerX - b.centerX;
        });

        // Group by approximate Y to assign rows
        let currentRowIndex = 0;
        let lastY = seatPaths[0]?.centerY || 0;

        seatPaths.forEach((sp, index) => {
            if (Math.abs(sp.centerY - lastY) > 20) {
                currentRowIndex++;
                lastY = sp.centerY;
            }

            if (currentRowIndex < ROWS.length) {
                sp.row = ROWS[currentRowIndex];
            }
        });

        // Within each row, assign seat numbers
        const rowGroups = new Map<string, SeatPath[]>();
        seatPaths.forEach(sp => {
            if (!rowGroups.has(sp.row)) {
                rowGroups.set(sp.row, []);
            }
            rowGroups.get(sp.row)!.push(sp);
        });

        rowGroups.forEach((paths, row) => {
            // Separate left and right
            const leftPaths = paths.filter(p => p.side === "left").sort((a, b) => a.centerX - b.centerX);
            const rightPaths = paths.filter(p => p.side === "right").sort((a, b) => a.centerX - b.centerX);

            leftPaths.forEach((p, i) => {
                p.seat = i + 1;
            });

            rightPaths.forEach((p, i) => {
                p.seat = i + 16;
            });
        });

        // Apply colors
        seatPaths.forEach(sp => {
            const key = `${sp.row}-${sp.side}-${sp.seat}`;
            const color = seatColorMap.get(key);
            if (color) {
                // Change fill color
                const currentStyle = sp.element.getAttribute("style") || "";
                const newStyle = currentStyle.replace("fill:none", `fill:${color}`);
                sp.element.setAttribute("style", newStyle);
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
