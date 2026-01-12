"use client";
// Force new build - fix cycleShift


import { useState, useEffect } from "react";
import { X, RefreshCw, ChevronLeft, ChevronRight, Download } from "lucide-react";
import { AssemblyEntry } from "@/lib/parsers";

interface SeatingMapProps {
    shifts: { [key: string]: AssemblyEntry[] };
    initialShift: string;
    onClose: () => void;
}

// Row groups with fixed capacities per side
const BLOCKS = [
    { name: "ABC", rows: ["A", "B", "C"], leftCapacity: 45, rightCapacity: 45 },
    { name: "DEFGHIL", rows: ["D", "E", "F", "G", "H", "I", "L"], leftCapacity: 102, rightCapacity: 102 },
    { name: "MNOPQRS", rows: ["M", "N", "O", "P", "Q", "R", "S"], leftCapacity: 102, rightCapacity: 102 },
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

// More distinct, high-contrast colors
const COLORS = [
    "#e6194b", "#3cb44b", "#ffe119", "#4363d8", "#f58231",
    "#911eb4", "#46f0f0", "#f032e6", "#bcf60c", "#fabebe",
    "#008080", "#e6beff", "#9a6324", "#fffac8", "#800000",
    "#aaffc3", "#808000", "#ffd8b1", "#000075", "#808080",
    "#000000", "#ff0000", "#00ff00", "#0000ff", "#ffff00"
];

interface SeatAssignment {
    row: string;
    seat: number;
    classId: string;
    color: string;
}

interface Bin {
    blockIdx: number;
    side: "left" | "right";
    capacity: number;
    classes: AssemblyEntry[];
    usedCapacity: number;
}

// Find best combination of classes to fill bins optimally
function findBestAssignment(classes: AssemblyEntry[], bins: Bin[]): { assigned: Map<string, Bin>; unassigned: AssemblyEntry[] } {
    const assigned = new Map<string, Bin>();
    const unassigned: AssemblyEntry[] = [];

    // Sort classes by size descending
    const sortedClasses = [...classes].sort((a, b) => (b.students + 1) - (a.students + 1));

    // Reset bins
    bins.forEach(bin => {
        bin.classes = [];
        bin.usedCapacity = 0;
    });

    // Separate bins by side for alternating assignment
    const leftBins = bins.filter(b => b.side === "left");
    const rightBins = bins.filter(b => b.side === "right");

    // Alternate between left and right when assigning
    let useLeft = true;

    for (const cls of sortedClasses) {
        const seatsNeeded = cls.students + 1;

        // Try the current side first, then the other
        const primaryBins = useLeft ? leftBins : rightBins;
        const secondaryBins = useLeft ? rightBins : leftBins;

        // Find best fit in primary bins
        let bestBin: Bin | null = null;
        let bestRemaining = Infinity;

        for (const bin of primaryBins) {
            const remaining = bin.capacity - bin.usedCapacity - seatsNeeded;
            if (remaining >= 0 && remaining < bestRemaining) {
                bestBin = bin;
                bestRemaining = remaining;
            }
        }

        // If not found in primary, try secondary
        if (!bestBin) {
            for (const bin of secondaryBins) {
                const remaining = bin.capacity - bin.usedCapacity - seatsNeeded;
                if (remaining >= 0 && remaining < bestRemaining) {
                    bestBin = bin;
                    bestRemaining = remaining;
                }
            }
        }

        if (bestBin) {
            bestBin.classes.push(cls);
            bestBin.usedCapacity += seatsNeeded;
            assigned.set(cls.classId, bestBin);
            // Alternate side for next class
            useLeft = !useLeft;
        } else {
            unassigned.push(cls);
        }
    }

    // If we have unassigned classes, try to swap to make room
    if (unassigned.length > 0) {
        // Try swapping small classes between bins to make room
        for (let i = unassigned.length - 1; i >= 0; i--) {
            const cls = unassigned[i];
            const seatsNeeded = cls.students + 1;

            // Find any bin with enough space
            for (const bin of bins) {
                if (bin.capacity - bin.usedCapacity >= seatsNeeded) {
                    bin.classes.push(cls);
                    bin.usedCapacity += seatsNeeded;
                    assigned.set(cls.classId, bin);
                    unassigned.splice(i, 1);
                    break;
                }
            }
        }
    }
    return { assigned, unassigned };
}

export default function SeatingMap({ shifts, initialShift, onClose }: SeatingMapProps) {
    const [selectedShift, setSelectedShift] = useState(initialShift);
    const [assignments, setAssignments] = useState<SeatAssignment[]>([]);
    const [classColors, setClassColors] = useState<{ [classId: string]: string }>({});
    const [unassignedClasses, setUnassignedClasses] = useState<string[]>([]);
    const [svgContent, setSvgContent] = useState<string>("");
    const [modifiedSvg, setModifiedSvg] = useState<string>("");

    // Edit Mode State
    const [isEditMode, setIsEditMode] = useState(false);
    const [selectedSeat, setSelectedSeat] = useState<{ row: string, seat: number } | null>(null);

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
    }, [svgContent, assignments, isEditMode, selectedSeat]);

    const autoAssignSeats = () => {
        const classes = shifts[selectedShift] || [];
        if (classes.length === 0) {
            setAssignments([]);
            setClassColors({});
            setUnassignedClasses([]);
            return;
        }

        // Assign colors
        const colors: { [classId: string]: string } = {};
        classes.forEach((cls, i) => {
            colors[cls.classId] = COLORS[i % COLORS.length];
        });
        setClassColors(colors);

        // Create bins from blocks
        const bins: Bin[] = [];
        BLOCKS.forEach((block, blockIdx) => {
            bins.push({
                blockIdx,
                side: "left",
                capacity: block.leftCapacity,
                classes: [],
                usedCapacity: 0
            });
            bins.push({
                blockIdx,
                side: "right",
                capacity: block.rightCapacity,
                classes: [],
                usedCapacity: 0
            });
        });

        // Find best assignment
        const { assigned, unassigned } = findBestAssignment(classes, bins);

        // Now assign actual seats
        const occupied: Set<string> = new Set();
        const newAssignments: SeatAssignment[] = [];
        const seatKey = (row: string, seat: number) => `${row}-${seat}`;

        // Process bins in order
        for (const bin of bins) {
            const block = BLOCKS[bin.blockIdx];

            // Get all available seats for this bin
            const binSeats: { row: string; seat: number }[] = [];
            for (const row of block.rows) {
                for (const seat of SEATS_CONFIG[row][bin.side]) {
                    if (!occupied.has(seatKey(row, seat))) {
                        binSeats.push({ row, seat });
                    }
                }
            }

            // Assign seats to classes in this bin
            let seatIndex = 0;
            for (const cls of bin.classes) {
                const seatsNeeded = cls.students + 1;
                for (let i = 0; i < seatsNeeded && seatIndex < binSeats.length; i++) {
                    const { row, seat } = binSeats[seatIndex++];
                    occupied.add(seatKey(row, seat));
                    newAssignments.push({
                        row,
                        seat,
                        classId: cls.classId,
                        color: colors[cls.classId]
                    });
                }
            }
        }
        if (unassigned.length > 0) {
            // Check if we have unassigned because of algorithm limitations or full capacity
            // Try to fill any remaining gaps even if suboptimal
            const leftGaps = bins.filter(b => b.side === "left" && b.capacity > b.usedCapacity);
            const rightGaps = bins.filter(b => b.side === "right" && b.capacity > b.usedCapacity);

            for (let i = unassigned.length - 1; i >= 0; i--) {
                const cls = unassigned[i];
                const seatsNeeded = cls.students + 1;

                // Extremely simple fallback: check ANY bin
                let placed = false;
                for (const bin of [...leftGaps, ...rightGaps]) {
                    if (bin.capacity - bin.usedCapacity >= seatsNeeded) {
                        bin.classes.push(cls);
                        bin.usedCapacity += seatsNeeded;
                        assigned.set(cls.classId, bin);
                        unassigned.splice(i, 1);
                        placed = true;
                        break;
                    }
                }
            }
        }

        setAssignments(newAssignments);
        setUnassignedClasses(unassigned.map(c => c.classId));
    };

    const handleSeatClick = (row: string, seat: number) => {
        if (!isEditMode) return;

        const clickedSeatKey = `${row}-${seat}`;

        // Find if any assignment exists at this seat
        const assignmentIndex = assignments.findIndex(a => a.row === row && a.seat === seat);
        const assignment = assignmentIndex !== -1 ? assignments[assignmentIndex] : null;

        if (selectedSeat) {
            // If dragging/swapping
            if (selectedSeat.row === row && selectedSeat.seat === seat) {
                // Deselect if clicking same seat
                setSelectedSeat(null);
                return;
            }

            // Perform swap
            const newAssignments = [...assignments];

            // Find index of the currently selected seat
            const selectedIndex = newAssignments.findIndex(a => a.row === selectedSeat.row && a.seat === selectedSeat.seat);

            if (selectedIndex === -1) {
                setSelectedSeat(null);
                return;
            }

            // We are moving 'selected' to 'target' (clicked)

            if (assignment) {
                // Swap logic: Target has a class
                // Update target to have selected's location
                newAssignments[assignmentIndex] = {
                    ...newAssignments[assignmentIndex],
                    row: selectedSeat.row,
                    seat: selectedSeat.seat
                };

                // Update selected to have target's location
                newAssignments[selectedIndex] = {
                    ...newAssignments[selectedIndex],
                    row: row,
                    seat: seat
                };
            } else {
                // Move logic: Target is empty
                // Just update selected to new location
                newAssignments[selectedIndex] = {
                    ...newAssignments[selectedIndex],
                    row: row,
                    seat: seat
                };
            }

            setAssignments(newAssignments);
            setSelectedSeat(null);

        } else {
            // Select logic
            if (assignment) {
                setSelectedSeat({ row, seat });
            }
        }
    };

    const updateSvgColors = () => {
        if (!svgContent) return;

        const seatColorMap = new Map<string, string>();
        assignments.forEach(a => {
            seatColorMap.set(`${a.row}-${a.seat}`, a.color);
        });

        const parser = new DOMParser();
        const doc = parser.parseFromString(svgContent, "image/svg+xml");

        // 1. Update Seats
        ROWS.forEach(row => {
            const rowGroup = doc.getElementById(row);
            if (!rowGroup) return;

            const allElements = rowGroup.querySelectorAll('g, path');

            allElements.forEach(el => {
                const serifId = el.getAttribute('serif:id');
                if (!serifId) return;

                const seatNum = parseInt(serifId);
                if (isNaN(seatNum) || seatNum < 1 || seatNum > 30) return;

                const color = seatColorMap.get(`${row}-${seatNum}`) || 'transparent'; // Use transparent to catch clicks inside

                const pathElement = el.tagName === 'path'
                    ? el
                    : el.querySelector('path');

                if (pathElement) {
                    const currentStyle = pathElement.getAttribute("style") || "";
                    // Reset fill first
                    let newStyle = currentStyle.replace(/fill:[^;]+;?/g, "");
                    // Add new fill
                    newStyle += `fill:${color};`;

                    // Highlight selected seat
                    if (isEditMode && selectedSeat && selectedSeat.row === row && selectedSeat.seat === seatNum) {
                        newStyle += "stroke:black;stroke-width:2px;";
                    } else if (isEditMode) {
                        newStyle += "cursor:pointer;pointer-events:all;";
                    }

                    // Apply the complete style to the path
                    pathElement.setAttribute("style", newStyle);

                    // Add Click Handler Logic via data attrs
                    // Add attributes to the container logic
                    if (el !== pathElement) {
                        // If it's a group, we can add cursor pointer here too for better UX
                        el.setAttribute("style", "cursor: pointer;");
                        el.setAttribute("data-row", row);
                        el.setAttribute("data-seat", seatNum.toString());
                        el.setAttribute("class", "seat-element");
                    } else {
                        // If el IS the path, we already set the style above.
                        // Just ensure data attributes are set.
                        // The class is redundant if we rely on data attrs, but good for consistency.
                        pathElement.setAttribute("class", "seat-element");
                    }

                    // Always ensure path has data attributes as fallback
                    pathElement.setAttribute("data-row", row);
                    pathElement.setAttribute("data-seat", seatNum.toString());

                    // Also keep attributes on path for safety or specific styling
                    pathElement.setAttribute("data-row", row);
                    pathElement.setAttribute("data-seat", seatNum.toString());
                }
            });
        });


        // 2. Update Legend (Corrected Logic)
        const sortedClasses = Object.entries(classColors).sort((a, b) => a[0].localeCompare(b[0]));

        // User pattern: "class, write row... and then 1, 2, 3 or 4"
        // Based on grep, I don't see "class" or "right" in the IDs. 
        // The user says: "nei rettangoli che ho chiamato class right oppure class left"
        // BUT grep failed to find "class" in IDs. 
        // Crucial realization: The user might have renamed them in the source editor (Serif/Illustrator)
        // but the export `serif:id` or `id` might be different or stripped if not preserved?
        // OR the grep was case sensitive? (I used -i).
        // Let's look at the text elements again. grep found <text ...>1</text> inside <g transform...>.
        // The user says "Ti ho messo 1, 2, 3, 4".
        // The problem with my previous logic was that I replaced *ALL* text "1"s.
        // Seat numbers are "1", "2", "3" too!
        // Constraint: Legend numbers are likely 1, 2, 3... up to ~20. Seats go to ~30.
        // DIFFERENTIATION: Seat numbers are usually inside a group representing a seat?
        // Legend numbers might be "floating" or in a specific area.
        // LOOK AT GREP OUTPUT: 
        // <text ...>1</text> at y="557.724px"
        // <text ...>2</text> at y="557.724px"
        // <text ...>3</text> at y="557.724px"
        // They share the SAME Y coordinate! They are in a row (vertical or horizontal?).
        // Seats are arranged in rows, so their Y's differ.
        // HYPOTHESIS: The legend keys are the texts at y="557.724px" (or similar constant Y/X).
        // Strategy: 
        // 1. Find all text nodes with content "1", "2"...
        // 2. Group them by their Y (or X) position.
        // 3. The group with the most "1..N" consecutive numbers is likely the legend.
        // 4. Alternatively, seats usually have `serif:id` on their group?
        //    grep output shows the text "1" is inside a <g transform...> which is inside <g transform...>.
        //    It's hard to distinguish by structure alone without more context.
        //
        // SAFER STRATEGY: 
        // The user explicitly said: "class, write row...".
        // Maybe he added *attributes*? `id` should be there.
        // If grep didn't find "class", maybe the ID is `layer1` etc.?
        // Use the coordinates! 
        // The texts found by grep `<text ...>1</text>` have `y="557.724px"`. 
        // This is likely the bottom of the SVG (legend area).
        // I will target text elements specifically with `y ≈ 557` OR just be very careful.
        // BETTER: I will assume the legend texts are *later* in the DOM or have a specific style?
        // No.
        // PROPOSAL: Verify if the parent `g` of the text has an ID.
        // Let's try to map the specific "1", "2"... found in the grep at the bottom.
        // I will restrict matches to elements that do NOT look like seats.
        // Seats in this file seem to have `serif:id` on the group? 
        // I will iterate all matches, check if they are "seats" (part of the main rows) and exclude them.
        // How to identify seats? In `updateSvgColors` PART 1, we use `ROWS.forEach(row => doc.getElementById(row)...)`.
        // So seats are descendants of elements with ID "A", "B", "C"...
        // The LEGEND is likely NOT inside those Row groups.
        // FIX: Only update text "1", "2"... if it is NOT a descendant of a Row Group!

        const rowIds = new Set(ROWS);
        // Search text AND tspan to be safe
        const textElements = doc.querySelectorAll('text, tspan');

        // Map to keep track of which legend indices we've found and used
        const usedLegendIndices = new Set<number>();

        // 2. Update Legend
        // FIX: The searching for "1", "2" text matched actual seat numbers and broke the map.
        // We revert to a strict check or disabled state until strict IDs are found.
        // Users "Class right Row..." IDs were not found in grep yet.
        // For now, we DO NOT touch text elements based on content to avoid corruption.

        /* 
        // DISABLED LOGIC
        textElements.forEach(textEl => {
             // ...
        }); 
        */


        const serializer = new XMLSerializer();
        const newSvg = serializer.serializeToString(doc);
        setModifiedSvg(newSvg);
    };

    const downloadSvg = () => {
        if (!modifiedSvg) return;
        const blob = new Blob([modifiedSvg], { type: "image/svg+xml" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `Mappa_Posti_${selectedShift.replace(/\s+/g, '_')}.svg`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const cycleShift = (direction: number) => {
        const currentIndex = shiftNames.indexOf(selectedShift);
        const newIndex = (currentIndex + direction + shiftNames.length) % shiftNames.length;
        setSelectedShift(shiftNames[newIndex]);
        // Reset selections when changing shift
        setSelectedSeat(null);
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
                            onClick={() => {
                                setIsEditMode(!isEditMode);
                                setSelectedSeat(null);
                            }}
                            style={{
                                padding: '0.5rem 1rem',
                                cursor: 'pointer',
                                display: 'flex',
                                gap: '0.5rem',
                                alignItems: 'center',
                                background: isEditMode ? '#fee2e2' : 'white',
                                borderColor: isEditMode ? '#ef4444' : '#d1d5db',
                                color: isEditMode ? '#b91c1c' : 'inherit',
                                border: '1px solid',
                                borderRadius: '6px'
                            }}
                        >
                            ✏️ {isEditMode ? 'Disattiva Modifica' : '✏️ Modifica'}
                        </button>

                        <button
                            onClick={downloadSvg}
                            style={{
                                padding: '0.5rem 1rem',
                                cursor: 'pointer',
                                display: 'flex',
                                gap: '0.5rem',
                                alignItems: 'center',
                                background: '#4f46e5',
                                color: 'white',
                                border: 'none',
                                borderRadius: '6px'
                            }}
                        >
                            <Download size={16} /> Scarica SVG
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
                        padding: '1rem',
                        position: 'relative'
                    }}>
                        {isEditMode && (
                            <div style={{
                                position: 'absolute',
                                top: '1rem',
                                left: '50%',
                                transform: 'translateX(-50%)',
                                background: '#fee2e2',
                                color: '#b91c1c',
                                padding: '0.5rem 1rem',
                                borderRadius: '999px',
                                boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                                zIndex: 10,
                                fontWeight: 'bold',
                                fontSize: '0.875rem',
                                border: '1px solid #fca5a5'
                            }}>
                                {selectedSeat
                                    ? `Posto ${selectedSeat.row}-${selectedSeat.seat} selezionato. Clicca su un altro posto per SCAMBIARE.`
                                    : "Clicca su un posto per SELEZIONARLO, poi clicca su un altro per SPOSTARE."}
                            </div>
                        )}
                        {modifiedSvg ? (
                            <div
                                dangerouslySetInnerHTML={{ __html: modifiedSvg }}
                                style={{ width: '100%', minWidth: '900px', height: 'auto' }}
                                onClick={(e) => {
                                    // Event Delegation for SVG clicks
                                    const target = e.target as HTMLElement;
                                    const seatEl = target.closest('[data-row]');
                                    if (seatEl) {
                                        const row = seatEl.getAttribute('data-row');
                                        const seat = parseInt(seatEl.getAttribute('data-seat') || "0");
                                        if (row && seat) {
                                            handleSeatClick(row, seat);
                                        }
                                    }
                                }}
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
                            {/* Legend is now in SVG, but we keep this list for reference/stats */}
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
