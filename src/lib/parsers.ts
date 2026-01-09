import Papa from 'papaparse';

export interface ScheduleEntry {
    classId: string;
    day: string;
    hour: string; // "8h10", "9h10", etc.
    teacher: string;
    room: string;
}

export interface AssemblyEntry {
    shiftName: string; // "Primo turno", "Secondo turno"
    classId: string;
    students: number;
    seats: number;
    weekType: string; // "Lunga" | "Corta"
    location: string; // "Sede"
}

// Map "Lunedì" -> 0, "Martedì" -> 1, etc. if needed, or keep string
// The CSV structure for Schedule is complex.
// It lists classes as blocks.
// Example:
// ,1Ac,,,,,
// ,Lunedì,Martedì,Mercoledì,Giovedì,Venerdì,Sabato
// 8h10,DATA,DATA...

export const parseScheduleCsv = (csvText: string): ScheduleEntry[] => {
    const lines = csvText.split('\n');
    const entries: ScheduleEntry[] = [];

    let currentClass = '';
    let days: string[] = [];

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        // Detect Class Header: e.g. ",1Ac,,,,,"
        // Only the second column has data and it matches Class regex?
        // Let's use a simpler heuristic: if line starts with "," and 2nd col is short alphanumeric.
        const cols = (Papa.parse(line).data[0] as string[]) || []; // Custom simple parser or use Papa for line?

        // Papa parse is safer for quoted fields
        const parsedLine = Papa.parse(line, { header: false }).data[0] as string[];

        // Heuristic for Class Header: 2nd col is like "1Ac" or "5Gu" and others empty
        if (parsedLine[1] && /^\d[A-Z][a-z]$/.test(parsedLine[1]) && !parsedLine[0]) {
            currentClass = parsedLine[1];
            continue;
        }

        // Detect Days Header: ",Lunedì,Martedì..."
        if (parsedLine[1] === 'Lunedì') {
            days = parsedLine.slice(1, 7); // Lun..Sab
            continue;
        }

        // Detect Time Row: "8h10",...
        if (/^\d{1,2}h\d{2}$/.test(parsedLine[0]) && currentClass) {
            const hour = parsedLine[0];
            // Columns 1 to 6 correspond to Days
            for (let d = 0; d < 6; d++) {
                const content = parsedLine[d + 1];
                if (!content) continue;

                // Content might be "MAT-INF b c,u,Luvisutto E.\n Borgo S. Antonio"
                // We want the teacher name.
                // Format seems to be: "SUBJECT, Teacher Name\n Room" or similar.
                // Sometimes "SUBJECT\n Teacher\n Room"

                // Naive extraction: try to find the teacher's name.
                // It generally looks like "Surname N."

                const teacherMatch = content.match(/([A-Z][a-z]+(\s[A-Z][a-z]+)*\s[A-Z]\.?\s?[A-Z]?\.?)/);
                // This regex is tricky. 
                // Let's look at examples: "Morassutto F.", "Di Iorio E.", "Bortolin D D."

                // Also sometimes multiple lines.
                // Let's just store the raw content for now and refine if needed, or try to split by comma/newline.

                // Strategy: Split by newline. Usually 2nd line is teacher or part of first line after comma.
                let teacher = 'Unknown';

                // Remove quotes if any (handled by PapaParse usually)
                const cleanContent = content;

                if (cleanContent.includes(',')) {
                    const parts = cleanContent.split(',');
                    // Often "SUBJECT, Teacher"
                    if (parts.length > 1) {
                        // Check if the part after comma looks like a name
                        const candidate = parts[1].trim().split('\n')[0];
                        teacher = candidate;
                    }
                } else if (cleanContent.includes('\n')) {
                    const parts = cleanContent.split('\n');
                    // 2nd line often teacher
                    if (parts.length > 1) {
                        teacher = parts[1].trim();
                    }
                }

                // Cleanup teacher name: remove trailing chars, Room names etc if they leaked
                // Known Rooms: "Borgo S. Antonio", "Sede Centrale"
                teacher = teacher.replace(/Borgo S\. Antonio|Sede Centrale/g, '').trim();

                if (days[d]) {
                    entries.push({
                        classId: currentClass,
                        day: days[d],
                        hour: hour,
                        teacher: teacher,
                        room: '' // tough to extract reliably without strict format
                    });
                }
            }
        }
    }
    return entries;
};

export interface AssemblyEntry {
    shiftName: string; // "Primo turno", "Secondo turno"
    classId: string;
    students: number;
    seats: number;
    weekType: string; // "Lunga" | "Corta"
    location: string; // "Sede"
}

// ... existing parseScheduleCsv ... (omitted in tool call, but I need to target the right lines)
// wait, I can just replace the interface and the function at the end.

export const parseAssemblyCsv = (csvText: string): AssemblyEntry[] => {
    const { data } = Papa.parse(csvText, { header: true, skipEmptyLines: true });
    // Map fields: "Classe" -> classId, "Alunni" -> students, "Posti" -> seats, "Turno" -> shiftName
    // "Settimana" -> weekType, "Sede" -> location

    return data.map((row: any) => ({
        shiftName: row['Turno'] || '',
        classId: row['Classe'] || '',
        students: parseInt(row['Alunni'] || '0', 10),
        seats: parseInt(row['Posti'] || '0', 10),
        weekType: row['Settimana'] || '',
        location: row['Sede'] || ''
    })).filter((e: AssemblyEntry) => e.classId);
};


