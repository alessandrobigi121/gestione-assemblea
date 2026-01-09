
export interface TeacherSchedule {
    [classId: string]: {
        [day: string]: {
            [hour: number]: string[];
        };
    };
}

export function parseTeacherCsv(csv: string): TeacherSchedule {
    const lines = csv.split(/\r?\n/).map(l => l.trim()).filter(l => l);
    const schedule: TeacherSchedule = {};

    let currentClass = "";
    let headers: string[] = [];

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        // Detect Class Header
        if (line.toLowerCase().startsWith("classe")) {
            // Format: "Classe 1Ac,,,,," or similar. split by ',' or space
            // Extract "1Ac"
            const parts = line.split(/[,\s]+/);
            // parts[0] = "Classe", parts[1] = "1Ac" etc.
            // Need to be careful. Let's start by splitting by comma to be safe about columns
            const cols = line.split(',');
            const classLabel = cols[0]; // "Classe 1Ac"
            currentClass = classLabel.replace(/classe/i, "").trim();
            schedule[currentClass] = {};
            continue;
        }

        if (!currentClass) continue;

        // Detect Day Header
        if (line.toLowerCase().startsWith("ora")) {
            // Ora, Lunedì, Martedì ...
            headers = line.split(',').map(h => h.trim());
            continue;
        }

        // Parse Hour Rows
        // Expected format: "8h10,Prof A,Prof B..."
        const cols = line.split(',');
        const hourLabel = cols[0];
        let hourIndex = -1;

        if (hourLabel.includes("8h10")) hourIndex = 1;
        else if (hourLabel.includes("9h10")) hourIndex = 2;
        else if (hourLabel.includes("10h10")) hourIndex = 3;
        else if (hourLabel.includes("11h10")) hourIndex = 4;
        else if (hourLabel.includes("12h10")) hourIndex = 5;
        else if (hourLabel.includes("13h10")) hourIndex = 6;
        else if (hourLabel.includes("14h00")) hourIndex = 7;
        // Add more if needed

        if (hourIndex !== -1) {
            // Iterate columns corresponding to days
            // headers[1] = Lunedì, cols[1] = Teacher
            for (let c = 1; c < cols.length; c++) {
                const dayName = headers[c];
                if (!dayName) continue;

                const teacherCell = cols[c]?.trim();
                if (teacherCell) {
                    // Split by '/' for multiple teachers
                    // Need to handle "Prof A / Prof B"
                    const teachers = teacherCell.split('/').map(t => t.trim()).filter(t => t !== "");

                    if (!schedule[currentClass][dayName]) {
                        schedule[currentClass][dayName] = {};
                    }
                    schedule[currentClass][dayName][hourIndex] = teachers;
                }
            }
        }
    }

    return schedule;
}
