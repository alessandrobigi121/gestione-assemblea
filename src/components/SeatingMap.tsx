"use client";

import { useState, useEffect, DragEvent } from "react";
import { X, RefreshCw, ChevronLeft, ChevronRight, Download, Wand2, Hand, Save } from "lucide-react";
import { AssemblyEntry } from "@/lib/parsers";

interface SeatingMapProps {
    shifts: { [key: string]: AssemblyEntry[] };
    initialShift: string;
    onClose: () => void;
}

const STORAGE_KEY_PREFIX = "assembly_map_";

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

    const sortedClasses = [...classes].sort((a, b) => (b.students + 1) - (a.students + 1));

    bins.forEach(bin => {
        bin.classes = [];
        bin.usedCapacity = 0;
    });

    const leftBins = bins.filter(b => b.side === "left");
    const rightBins = bins.filter(b => b.side === "right");

    let useLeft = true;

    for (const cls of sortedClasses) {
        const seatsNeeded = cls.students + 1;

        const primaryBins = useLeft ? leftBins : rightBins;
        const secondaryBins = useLeft ? rightBins : leftBins;

        let bestBin: Bin | null = null;
        let bestRemaining = Infinity;

        for (const bin of primaryBins) {
            const remaining = bin.capacity - bin.usedCapacity - seatsNeeded;
            if (remaining >= 0 && remaining < bestRemaining) {
                bestBin = bin;
                bestRemaining = remaining;
            }
        }

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
            useLeft = !useLeft;
        } else {
            unassigned.push(cls);
        }
    }

    if (unassigned.length > 0) {
        for (let i = unassigned.length - 1; i >= 0; i--) {
            const cls = unassigned[i];
            const seatsNeeded = cls.students + 1;

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

// Helper: Get all seats for a block/side in order
function getBlockSeats(blockIdx: number, side: "left" | "right", occupied: Set<string>): { row: string; seat: number }[] {
    const block = BLOCKS[blockIdx];
    const seats: { row: string; seat: number }[] = [];
    for (const row of block.rows) {
        for (const seat of SEATS_CONFIG[row][side]) {
            if (!occupied.has(`${row}-${seat}`)) {
                seats.push({ row, seat });
            }
        }
    }
    return seats;
}

// Helper: Given a seat, find its block and side
function findBlockAndSide(row: string, seat: number): { blockIdx: number; side: "left" | "right" } | null {
    const side: "left" | "right" = seat <= 15 ? "left" : "right";
    for (let i = 0; i < BLOCKS.length; i++) {
        if (BLOCKS[i].rows.includes(row)) {
            return { blockIdx: i, side };
        }
    }
    return null;
}

// Smart Snake Fill: Starting from a seat, fill N seats using a snake pattern.
// First fills right in the current row, then left if needed, then moves to the
// next row starting from the same side where the previous row ended.
function smartSnakeFill(
    startRow: string,
    startSeat: number,
    seatsNeeded: number,
    currentAssignments: SeatAssignment[]
): { row: string; seat: number }[] {
    const location = findBlockAndSide(startRow, startSeat);
    if (!location) return [];

    const block = BLOCKS[location.blockIdx];
    const side = location.side;
    const occupied = new Set(currentAssignments.map(a => `${a.row}-${a.seat}`));

    const result: { row: string; seat: number }[] = [];

    // Get the rows of the block in order, starting from the startRow
    const rowStartIdx = block.rows.indexOf(startRow);
    if (rowStartIdx === -1) return [];
    const orderedRows = block.rows.slice(rowStartIdx);

    // Direction: +1 means fill towards higher seat numbers (right), -1 means left
    let fillDirection: 1 | -1 = 1; // start filling to the right

    for (const row of orderedRows) {
        if (result.length >= seatsNeeded) break;

        // Get available seats in this row for this side, sorted ascending
        const availableSeats = SEATS_CONFIG[row][side]
            .filter(s => !occupied.has(`${row}-${s}`))
            .sort((a, b) => a - b);

        if (availableSeats.length === 0) continue;

        if (row === startRow) {
            // First row: start from startSeat, fill right first, then left
            const rightSeats = availableSeats.filter(s => s >= startSeat).sort((a, b) => a - b);
            const leftSeats = availableSeats.filter(s => s < startSeat).sort((a, b) => b - a); // descending

            for (const s of rightSeats) {
                if (result.length >= seatsNeeded) break;
                result.push({ row, seat: s });
            }

            if (result.length < seatsNeeded) {
                for (const s of leftSeats) {
                    if (result.length >= seatsNeeded) break;
                    result.push({ row, seat: s });
                }
                // Ended filling to the left, so next row starts from left
                fillDirection = -1;
            } else {
                // Ended filling to the right, so next row starts from right
                fillDirection = 1;
            }
        } else {
            // Subsequent rows: fill in the current direction, then reverse if needed
            let sorted: number[];
            if (fillDirection === 1) {
                // Fill left to right (ascending)
                sorted = [...availableSeats].sort((a, b) => a - b);
            } else {
                // Fill right to left (descending)
                sorted = [...availableSeats].sort((a, b) => b - a);
            }

            const countBefore = result.length;
            for (const s of sorted) {
                if (result.length >= seatsNeeded) break;
                result.push({ row, seat: s });
            }

            // If we used all seats in this row, flip direction for next row (snake)
            if (result.length - countBefore === availableSeats.length) {
                fillDirection = fillDirection === 1 ? -1 : 1;
            }
            // If we didn't use all seats, direction stays the same (we finished)
        }
    }

    return result.slice(0, seatsNeeded);
}

export default function SeatingMap({ shifts, initialShift, onClose }: SeatingMapProps) {
    const [selectedShift, setSelectedShift] = useState(initialShift);
    const [assignments, setAssignments] = useState<SeatAssignment[]>([]);
    const [classColors, setClassColors] = useState<{ [classId: string]: string }>({});
    const [unassignedClasses, setUnassignedClasses] = useState<string[]>([]);
    const [svgContent, setSvgContent] = useState<string>("");
    const [modifiedSvg, setModifiedSvg] = useState<string>("");

    // Mode State
    const [mode, setMode] = useState<"auto" | "manual">("auto");
    const [isEditMode, setIsEditMode] = useState(false);
    const [selectedSeat, setSelectedSeat] = useState<{ row: string, seat: number } | null>(null);

    // Drag & Drop State
    const [draggingClass, setDraggingClass] = useState<string | null>(null);
    const [dropTargetSeat, setDropTargetSeat] = useState<{ row: string, seat: number } | null>(null);

    const shiftNames = ["Primo turno", "Secondo turno", "Terzo turno", "Quarto turno"];

    useEffect(() => {
        fetch("/planimetria_def.svg")
            .then(res => res.text())
            .then(text => setSvgContent(text))
            .catch(err => console.error("Error loading SVG:", err));
    }, []);

    useEffect(() => {
        const savedData = loadFromLocalStorage(selectedShift);
        if (savedData) {
            setAssignments(savedData.assignments);
            setClassColors(savedData.classColors);
            setUnassignedClasses(savedData.unassignedClasses || []);
            setMode(savedData.mode || "auto");
        } else {
            autoAssignSeats();
        }
    }, [selectedShift, shifts]);

    const saveToLocalStorage = (currentAssignments: SeatAssignment[], currentColors: { [id: string]: string }, currentUnassigned: string[], currentMode: "auto" | "manual") => {
        try {
            const data = {
                assignments: currentAssignments,
                classColors: currentColors,
                unassignedClasses: currentUnassigned,
                mode: currentMode,
                timestamp: Date.now()
            };
            localStorage.setItem(STORAGE_KEY_PREFIX + selectedShift, JSON.stringify(data));
        } catch (e) {
            console.error("Failed to save to localStorage", e);
        }
    };

    const loadFromLocalStorage = (shiftName: string) => {
        try {
            const raw = localStorage.getItem(STORAGE_KEY_PREFIX + shiftName);
            if (!raw) return null;
            return JSON.parse(raw);
        } catch (e) {
            console.error("Failed to load from localStorage", e);
            return null;
        }
    };

    useEffect(() => {
        if (svgContent) {
            updateSvgColors();
        }
    }, [svgContent, assignments, isEditMode, selectedSeat, dropTargetSeat]);

    const autoAssignSeats = () => {
        const classes = shifts[selectedShift] || [];
        if (classes.length === 0) {
            setAssignments([]);
            setClassColors({});
            setUnassignedClasses([]);
            return;
        }

        const colors: { [classId: string]: string } = {};
        classes.forEach((cls, i) => {
            colors[cls.classId] = COLORS[i % COLORS.length];
        });
        setClassColors(colors);

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

        const { assigned, unassigned } = findBestAssignment(classes, bins);

        const occupied: Set<string> = new Set();
        const newAssignments: SeatAssignment[] = [];
        const seatKey = (row: string, seat: number) => `${row}-${seat}`;

        for (const bin of bins) {
            const block = BLOCKS[bin.blockIdx];

            const binSeats: { row: string; seat: number }[] = [];
            for (const row of block.rows) {
                for (const seat of SEATS_CONFIG[row][bin.side]) {
                    if (!occupied.has(seatKey(row, seat))) {
                        binSeats.push({ row, seat });
                    }
                }
            }

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

        setAssignments(newAssignments);
        setUnassignedClasses(unassigned.map(c => c.classId));
        setMode("auto");
        saveToLocalStorage(newAssignments, colors, unassigned.map(c => c.classId), "auto");
    };

    const clearAllAssignments = () => {
        const classes = shifts[selectedShift] || [];
        const colors: { [classId: string]: string } = {};
        classes.forEach((cls, i) => {
            colors[cls.classId] = COLORS[i % COLORS.length];
        });
        setClassColors(colors);
        setAssignments([]);
        setUnassignedClasses(classes.map(c => c.classId));
        setMode("manual");
        saveToLocalStorage([], colors, classes.map(c => c.classId), "manual");
    };

    // Reset current shift (clears corrupted localStorage and re-runs auto)
    const resetCurrentShift = () => {
        localStorage.removeItem(STORAGE_KEY_PREFIX + selectedShift);
        autoAssignSeats();
    };

    // Export all shifts to JSON file
    const exportToJsonFile = () => {
        const allData: { [shift: string]: any } = {};
        shiftNames.forEach(shiftName => {
            const raw = localStorage.getItem(STORAGE_KEY_PREFIX + shiftName);
            if (raw) {
                allData[shiftName] = JSON.parse(raw);
            }
        });
        const blob = new Blob([JSON.stringify(allData, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `seating_map_config_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    // Import from JSON file
    const importFromJsonFile = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const data = JSON.parse(event.target?.result as string);
                // Save each shift
                Object.entries(data).forEach(([shiftName, shiftData]) => {
                    localStorage.setItem(STORAGE_KEY_PREFIX + shiftName, JSON.stringify(shiftData));
                });
                // Reload current shift
                const savedData = loadFromLocalStorage(selectedShift);
                if (savedData) {
                    setAssignments(savedData.assignments);
                    setClassColors(savedData.classColors);
                    setUnassignedClasses(savedData.unassignedClasses || []);
                    setMode(savedData.mode || "auto");
                }
                alert('✅ Configurazione importata con successo!');
            } catch (err) {
                alert('❌ Errore nel file JSON');
                console.error(err);
            }
        };
        reader.readAsText(file);
        e.target.value = ''; // Reset input
    };

    // Drag & Drop Handlers
    const handleDragStart = (e: DragEvent<HTMLDivElement>, classId: string) => {
        e.dataTransfer.setData("text/plain", classId);
        setDraggingClass(classId);
    };

    const handleDragEnd = () => {
        setDraggingClass(null);
        setDropTargetSeat(null);
    };

    const handleSvgDrop = (row: string, seat: number) => {
        if (!draggingClass) return;

        const cls = shifts[selectedShift]?.find(c => c.classId === draggingClass);
        if (!cls) return;

        const seatsNeeded = cls.students + 1;
        const seatsToAssign = smartSnakeFill(row, seat, seatsNeeded, assignments);

        if (seatsToAssign.length === 0) {
            console.warn("No available seats in this block/side");
            return;
        }

        const color = classColors[draggingClass] || COLORS[0];
        const newAssignments: SeatAssignment[] = [
            ...assignments,
            ...seatsToAssign.map(s => ({
                row: s.row,
                seat: s.seat,
                classId: draggingClass,
                color
            }))
        ];

        const newUnassigned = unassignedClasses.filter(id => id !== draggingClass);

        setAssignments(newAssignments);
        setUnassignedClasses(newUnassigned);
        setDraggingClass(null);
        setDropTargetSeat(null);
        saveToLocalStorage(newAssignments, classColors, newUnassigned, mode);
    };

    // Remove a class from the map (send back to unassigned)
    const removeClassFromMap = (classId: string) => {
        const newAssignments = assignments.filter(a => a.classId !== classId);
        const newUnassigned = [...unassignedClasses, classId];

        setAssignments(newAssignments);
        setUnassignedClasses(newUnassigned);
        saveToLocalStorage(newAssignments, classColors, newUnassigned, mode);
    };

    const handleSeatClick = (row: string, seat: number) => {
        // If dragging, drop here
        if (draggingClass) {
            handleSvgDrop(row, seat);
            return;
        }

        if (!isEditMode) return;

        const assignmentIndex = assignments.findIndex(a => a.row === row && a.seat === seat);
        const assignment = assignmentIndex !== -1 ? assignments[assignmentIndex] : null;

        if (selectedSeat) {
            if (selectedSeat.row === row && selectedSeat.seat === seat) {
                setSelectedSeat(null);
                return;
            }

            const newAssignments = [...assignments];
            const selectedIndex = newAssignments.findIndex(a => a.row === selectedSeat.row && a.seat === selectedSeat.seat);

            if (selectedIndex === -1) {
                setSelectedSeat(null);
                return;
            }

            if (assignment) {
                newAssignments[assignmentIndex] = {
                    ...newAssignments[assignmentIndex],
                    row: selectedSeat.row,
                    seat: selectedSeat.seat
                };
                newAssignments[selectedIndex] = {
                    ...newAssignments[selectedIndex],
                    row: row,
                    seat: seat
                };
            } else {
                newAssignments[selectedIndex] = {
                    ...newAssignments[selectedIndex],
                    row: row,
                    seat: seat
                };
            }

            setAssignments(newAssignments);
            setSelectedSeat(null);
            saveToLocalStorage(newAssignments, classColors, unassignedClasses, mode);
        } else {
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

        ROWS.forEach(row => {
            const rowGroup = doc.getElementById(row);
            if (!rowGroup) return;

            const allElements = rowGroup.querySelectorAll('g, path');

            allElements.forEach(el => {
                const serifId = el.getAttribute('serif:id');
                if (!serifId) return;

                const seatNum = parseInt(serifId);
                if (isNaN(seatNum) || seatNum < 1 || seatNum > 30) return;

                const color = seatColorMap.get(`${row}-${seatNum}`) || 'transparent';

                const pathElement = el.tagName === 'path'
                    ? el
                    : el.querySelector('path');

                if (pathElement) {
                    const currentStyle = pathElement.getAttribute("style") || "";
                    let newStyle = currentStyle.replace(/fill:[^;]+;?/g, "");
                    // Ensure transparent fills still capture pointer events
                    if (color === 'transparent') {
                        newStyle += `fill:transparent;pointer-events:all;`;
                    } else {
                        newStyle += `fill:${color};pointer-events:all;`;
                    }

                    // Highlight drop target
                    if (dropTargetSeat && dropTargetSeat.row === row && dropTargetSeat.seat === seatNum) {
                        newStyle += "stroke:#22c55e;stroke-width:3px;";
                    } else if (isEditMode && selectedSeat && selectedSeat.row === row && selectedSeat.seat === seatNum) {
                        newStyle += "stroke:black;stroke-width:2px;";
                    } else if (isEditMode || draggingClass) {
                        newStyle += "cursor:pointer;";
                    }

                    pathElement.setAttribute("style", newStyle);

                    if (el !== pathElement) {
                        el.setAttribute("style", "cursor: pointer;");
                        el.setAttribute("data-row", row);
                        el.setAttribute("data-seat", seatNum.toString());
                        el.setAttribute("class", "seat-element");
                    } else {
                        pathElement.setAttribute("class", "seat-element");
                    }

                    pathElement.setAttribute("data-row", row);
                    pathElement.setAttribute("data-seat", seatNum.toString());
                }
            });
        });

        // Legend update logic
        const getContrastColor = (hex: string) => {
            if (!hex) return 'black';
            const r = parseInt(hex.substr(1, 2), 16);
            const g = parseInt(hex.substr(3, 2), 16);
            const b = parseInt(hex.substr(5, 2), 16);
            const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
            return (yiq >= 128) ? 'black' : 'white';
        };

        const getClassSectorIndex = (className: string) => {
            const classSeats = assignments.filter(a => a.classId === className);
            if (classSeats.length === 0) return 8;
            const representative = classSeats[0];
            const r = representative.row;
            const s = representative.seat;
            const isRight = s > 15;
            if (['A', 'B', 'C'].includes(r)) return isRight ? 1 : 0;
            if (['D', 'E', 'F', 'G'].includes(r)) return isRight ? 3 : 2;
            if (['H', 'I', 'L'].includes(r)) return isRight ? 5 : 4;
            if (['M', 'N', 'O', 'P', 'Q', 'R', 'S'].includes(r)) return isRight ? 7 : 6;
            return 8;
        };

        const sectors: string[][] = Array(9).fill(null).map(() => []);
        Object.keys(classColors).forEach(className => {
            if (!unassignedClasses.includes(className)) {
                const idx = getClassSectorIndex(className);
                sectors[idx].push(className);
            }
        });

        const legendMap = new Map<number, { className: string, color: string }>();
        sectors.forEach((sectorClasses, sectorIdx) => {
            sectorClasses.sort();
            const startSlot = (sectorIdx * 4) + 1;
            sectorClasses.forEach((className, i) => {
                if (i < 4) {
                    legendMap.set(startSlot + i, {
                        className,
                        color: classColors[className]
                    });
                }
            });
        });

        const slotIndices = Array.from({ length: 32 }, (_, i) => i + 1);
        slotIndices.forEach((idx) => {
            const data = legendMap.get(idx);
            const classId = data ? data.className : "";
            const color = data ? data.color : "";

            const textId = `legend_text_${idx}`;
            const textGroup = doc.getElementById(textId);
            if (textGroup) {
                const textNode = textGroup.tagName === 'g' ? textGroup.querySelector('text, tspan') : textGroup;
                if (textNode) {
                    if (data) {
                        const contrast = getContrastColor(data.color);
                        textNode.textContent = classId;
                        textNode.setAttribute("style", `fill:${contrast}; font-weight:bold; font-size:10px; display:block;`);
                        if (textGroup !== textNode) textGroup.setAttribute("style", "display:block");
                    } else {
                        textNode.textContent = "";
                        if (textGroup !== textNode) textGroup.setAttribute("style", "display:none");
                    }
                }
            }

            const rectId = `legend_rect_${idx}`;
            const rectGroup = doc.getElementById(rectId);
            if (rectGroup) {
                const rectNode = rectGroup.tagName === 'g' ? rectGroup.querySelector('rect, path') : rectGroup;
                if (rectNode) {
                    if (data) {
                        rectNode.setAttribute("style", `fill:${color}; stroke:black; stroke-width:1px; display:block;`);
                        if (rectGroup !== rectNode) rectGroup.setAttribute("style", "display:block");
                    } else {
                        if (rectGroup !== rectNode) rectGroup.setAttribute("style", "display:none");
                    }
                }
            }
        });

        for (let i = 33; i <= 50; i++) {
            const textId = `legend_text_${i}`;
            const rectId = `legend_rect_${i}`;
            const textGroup = doc.getElementById(textId);
            const rectGroup = doc.getElementById(rectId);
            if (textGroup) textGroup.setAttribute("style", "display:none");
            if (rectGroup) rectGroup.setAttribute("style", "display:none");
        }

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
        setSelectedSeat(null);
    };

    // Unassigned classes for the sidebar
    const unassignedClassObjects = (shifts[selectedShift] || []).filter(c => unassignedClasses.includes(c.classId));

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
                maxWidth: '1600px',
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
                        {/* Mode indicator */}
                        <span style={{
                            padding: '0.25rem 0.75rem',
                            borderRadius: '999px',
                            fontSize: '0.75rem',
                            fontWeight: 'bold',
                            background: mode === 'auto' ? '#dbeafe' : '#fef9c3',
                            color: mode === 'auto' ? '#1d4ed8' : '#a16207'
                        }}>
                            {mode === 'auto' ? '🤖 Auto' : '✋ Manuale'}
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
                                background: mode === 'auto' ? '#dbeafe' : 'white',
                                border: '1px solid #d1d5db',
                                borderRadius: '6px'
                            }}
                            title="Assegnazione automatica"
                        >
                            <Wand2 size={16} /> Auto
                        </button>

                        <button
                            onClick={clearAllAssignments}
                            style={{
                                padding: '0.5rem 1rem',
                                cursor: 'pointer',
                                display: 'flex',
                                gap: '0.5rem',
                                alignItems: 'center',
                                background: mode === 'manual' ? '#fef9c3' : 'white',
                                border: '1px solid #d1d5db',
                                borderRadius: '6px'
                            }}
                            title="Svuota tutto e gestisci manualmente"
                        >
                            <Hand size={16} /> Manuale
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
                                border: isEditMode ? '1px solid #ef4444' : '1px solid #d1d5db',
                                color: isEditMode ? '#b91c1c' : 'inherit',
                                borderRadius: '6px'
                            }}
                        >
                            ✏️ {isEditMode ? 'Fine Modifica' : 'Modifica Singoli'}
                        </button>

                        <button
                            onClick={() => {
                                saveToLocalStorage(assignments, classColors, unassignedClasses, mode);
                                alert('✅ Mappa salvata con successo!');
                            }}
                            style={{
                                padding: '0.5rem 1rem',
                                cursor: 'pointer',
                                display: 'flex',
                                gap: '0.5rem',
                                alignItems: 'center',
                                background: '#dcfce7',
                                border: '1px solid #86efac',
                                color: '#166534',
                                borderRadius: '6px'
                            }}
                        >
                            <Save size={16} /> Salva
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
                            onClick={exportToJsonFile}
                            style={{
                                padding: '0.5rem 1rem',
                                cursor: 'pointer',
                                display: 'flex',
                                gap: '0.5rem',
                                alignItems: 'center',
                                background: '#fef3c7',
                                border: '1px solid #fcd34d',
                                color: '#92400e',
                                borderRadius: '6px'
                            }}
                            title="Esporta configurazione JSON"
                        >
                            📤 Export
                        </button>

                        <label style={{
                            padding: '0.5rem 1rem',
                            cursor: 'pointer',
                            display: 'flex',
                            gap: '0.5rem',
                            alignItems: 'center',
                            background: '#e0e7ff',
                            border: '1px solid #a5b4fc',
                            color: '#3730a3',
                            borderRadius: '6px'
                        }}>
                            📥 Import
                            <input
                                type="file"
                                accept=".json"
                                onChange={importFromJsonFile}
                                style={{ display: 'none' }}
                            />
                        </label>

                        <button
                            onClick={() => {
                                if (confirm('Vuoi resettare la mappa di questo turno?')) {
                                    resetCurrentShift();
                                }
                            }}
                            style={{
                                padding: '0.5rem 1rem',
                                cursor: 'pointer',
                                display: 'flex',
                                gap: '0.5rem',
                                alignItems: 'center',
                                background: '#fee2e2',
                                border: '1px solid #fca5a5',
                                color: '#b91c1c',
                                borderRadius: '6px'
                            }}
                            title="Reset mappa turno corrente"
                        >
                            🔄 Reset
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

                {/* Main content: Sidebar + Map */}
                <div style={{
                    flex: 1,
                    display: 'flex',
                    overflow: 'hidden'
                }}>
                    {/* LEFT SIDEBAR: Unassigned Classes */}
                    <div style={{
                        width: '320px',
                        minWidth: '320px',
                        borderRight: '1px solid #e5e7eb',
                        padding: '1rem',
                        overflowY: 'auto',
                        background: '#f9fafb',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '1rem'
                    }}>
                        <div>
                            <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '0.875rem', color: '#374151', fontWeight: 'bold' }}>
                                📦 Classi da Piazzare ({unassignedClassObjects.length})
                            </h3>
                            <p style={{ margin: 0, fontSize: '0.75rem', color: '#6b7280' }}>
                                Trascina una classe sulla mappa per piazzarla.
                            </p>
                        </div>

                        {unassignedClassObjects.length === 0 ? (
                            <div style={{
                                padding: '2rem 1rem',
                                textAlign: 'center',
                                color: '#6b7280',
                                fontSize: '0.875rem',
                                border: '2px dashed #d1d5db',
                                borderRadius: '8px'
                            }}>
                                ✅ Tutte le classi sono piazzate!
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                {unassignedClassObjects.map(cls => (
                                    <div
                                        key={cls.classId}
                                        draggable
                                        onDragStart={(e) => handleDragStart(e, cls.classId)}
                                        onDragEnd={handleDragEnd}
                                        style={{
                                            padding: '0.75rem',
                                            background: draggingClass === cls.classId ? '#dbeafe' : 'white',
                                            border: '1px solid #d1d5db',
                                            borderRadius: '8px',
                                            cursor: 'grab',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '0.75rem',
                                            transition: 'all 0.2s',
                                            boxShadow: draggingClass === cls.classId ? '0 4px 12px rgba(0,0,0,0.15)' : undefined
                                        }}
                                    >
                                        <div style={{
                                            width: 24,
                                            height: 24,
                                            borderRadius: 4,
                                            background: classColors[cls.classId] || '#ccc',
                                            flexShrink: 0
                                        }} />
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ fontWeight: 'bold', fontSize: '0.875rem', color: '#111827', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                {cls.classId}
                                            </div>
                                            <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                                                {cls.students + 1} posti necessari
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Assigned classes (for reference and removal) */}
                        <div style={{ marginTop: '1rem' }}>
                            <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '0.875rem', color: '#374151', fontWeight: 'bold' }}>
                                ✅ Classi Piazzate
                            </h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                {Object.entries(classColors)
                                    .filter(([classId]) => !unassignedClasses.includes(classId))
                                    .map(([classId, color]) => {
                                        const seatsUsed = assignments.filter(a => a.classId === classId).length;
                                        return (
                                            <div
                                                key={classId}
                                                style={{
                                                    padding: '0.5rem 0.75rem',
                                                    background: 'white',
                                                    border: '1px solid #d1d5db',
                                                    borderRadius: '8px',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '0.5rem'
                                                }}
                                            >
                                                <div style={{
                                                    width: 16,
                                                    height: 16,
                                                    borderRadius: 4,
                                                    background: color,
                                                    flexShrink: 0
                                                }} />
                                                <div style={{ flex: 1, fontSize: '0.75rem', minWidth: 0 }}>
                                                    <span style={{ fontWeight: 'bold', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block' }}>{classId}</span>
                                                    <span style={{ color: '#6b7280' }}> ({seatsUsed})</span>
                                                </div>
                                                <button
                                                    onClick={() => removeClassFromMap(classId)}
                                                    style={{
                                                        padding: '0.25rem',
                                                        background: '#fee2e2',
                                                        border: 'none',
                                                        borderRadius: '4px',
                                                        cursor: 'pointer',
                                                        color: '#dc2626',
                                                        fontSize: '0.75rem'
                                                    }}
                                                    title="Rimuovi dalla mappa"
                                                >
                                                    ✕
                                                </button>
                                            </div>
                                        );
                                    })}
                            </div>
                        </div>
                    </div>

                    {/* MAP AREA */}
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
                        {/* Instructions banner */}
                        {(isEditMode || draggingClass) && (
                            <div style={{
                                position: 'absolute',
                                top: '1rem',
                                left: '50%',
                                transform: 'translateX(-50%)',
                                background: draggingClass ? '#dcfce7' : '#fee2e2',
                                color: draggingClass ? '#166534' : '#b91c1c',
                                padding: '0.5rem 1rem',
                                borderRadius: '999px',
                                boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                                zIndex: 10,
                                fontWeight: 'bold',
                                fontSize: '0.875rem',
                                border: draggingClass ? '1px solid #86efac' : '1px solid #fca5a5'
                            }}>
                                {draggingClass
                                    ? `Rilascia "${draggingClass}" su un posto per piazzarla (Smart Fill attivo)`
                                    : selectedSeat
                                        ? `Posto ${selectedSeat.row}-${selectedSeat.seat} selezionato. Clicca su un altro posto per SCAMBIARE.`
                                        : "Clicca su un posto per SELEZIONARLO, poi clicca su un altro per SPOSTARE."}
                            </div>
                        )}

                        {modifiedSvg ? (
                            <div
                                dangerouslySetInnerHTML={{ __html: modifiedSvg }}
                                style={{ width: '100%', minWidth: '900px', height: 'auto' }}
                                onClick={(e) => {
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
                                onDragOver={(e) => {
                                    e.preventDefault();
                                    const target = e.target as HTMLElement;
                                    const seatEl = target.closest('[data-row]');
                                    if (seatEl) {
                                        const row = seatEl.getAttribute('data-row');
                                        const seat = parseInt(seatEl.getAttribute('data-seat') || "0");
                                        if (row && seat) {
                                            setDropTargetSeat({ row, seat });
                                        }
                                    }
                                }}
                                onDragLeave={() => setDropTargetSeat(null)}
                                onDrop={(e) => {
                                    e.preventDefault();
                                    if (dropTargetSeat) {
                                        handleSvgDrop(dropTargetSeat.row, dropTargetSeat.seat);
                                    }
                                }}
                            />
                        ) : (
                            <div style={{ padding: '2rem', color: '#6b7280' }}>
                                Caricamento mappa...
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
