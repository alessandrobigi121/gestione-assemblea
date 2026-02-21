import { ScheduleEntry, AssemblyEntry, parseScheduleCsv, parseAssemblyCsv } from './parsers';
import { TeacherSchedule, parseTeacherCsv } from './teacherParser';

export class AssemblyManager {
    schedule: ScheduleEntry[] = [];
    classes: AssemblyEntry[] = [];
    teacherSchedule: TeacherSchedule = {};

    constructor() { }

    async loadData(scheduleCsv: string, assemblyCsv: string, teachersCsv: string) {
        this.schedule = parseScheduleCsv(scheduleCsv);
        this.classes = parseAssemblyCsv(assemblyCsv);
        this.teacherSchedule = parseTeacherCsv(teachersCsv);
    }

    getClasses() {
        return this.classes;
    }

    getShiftTeachers(shiftName: string, classId: string, day: string) {
        const s = shiftName.toLowerCase();
        let goHour = 1;
        let retHour = 2;

        if (s.includes("primo")) { goHour = 1; retHour = 2; }
        else if (s.includes("secondo")) { goHour = 2; retHour = 3; }
        else if (s.includes("terzo")) {
            // User Rule: "docenti terza ora accompagnano... quinta ora riaccompagnano"
            goHour = 3; retHour = 5;
        }
        else if (s.includes("quarto")) {
            // User Rule: "docenti quinta ora accompagnano... sesta riaccompagnano"
            goHour = 5; retHour = 6;
        }

        const normalizedDay = day.charAt(0).toUpperCase() + day.slice(1).toLowerCase(); // Ensure title case

        // Case-insensitive class lookup
        const targetKey = Object.keys(this.teacherSchedule).find(k => k.toLowerCase() === classId.toLowerCase()) || classId;
        const daySchedule = this.teacherSchedule[targetKey]?.[normalizedDay] || {};

        const going = daySchedule[goHour] || ["Non trovato"];
        const returning = daySchedule[retHour] || ["Non trovato"];

        return { going, returning };
    }

    // Deprecated but kept for compatibility if needed, though replaced logic preferred
    // getTeacher(classId: string, day: string, hour: string): string { ... }

    // Calculate stats for a shift
    getShiftStats(shiftName: string, assignedClasses: string[], day: string) {
        const classes = this.classes.filter(c => assignedClasses.includes(c.classId));

        // Calculate capacity including teachers
        let totalPeople = 0;

        classes.forEach(c => {
            const teachers = this.getShiftTeachers(shiftName, c.classId, day);
            // Count students + Going Teachers
            // Logic: Filter out "Non trovato". Count result. If result is 0 (missing data), assume 1 for safety.
            const validTeachers = teachers.going.filter(t => t && !t.toLowerCase().includes("non trovato"));
            const teacherCount = validTeachers.length > 0 ? validTeachers.length : 1;

            totalPeople += c.students + teacherCount;
        });

        return { totalPeople, maxCapacity: 499 };
    }

    validateShift(shiftName: string, assignedClasses: string[], day: string) {
        const classes = this.classes.filter(c => assignedClasses.includes(c.classId));
        const errors: string[] = [];

        // 1. Capacity Check
        const stats = this.getShiftStats(shiftName, assignedClasses, day);
        if (stats.totalPeople > 499) {
            errors.push(`Capienza superata! ${stats.totalPeople}/499`);
        }

        // 2. Week Type Check
        if (shiftName.toLowerCase().includes("quarto")) {
            const illegalClasses = classes.filter(c => c.weekType && c.weekType.toLowerCase().includes("lunga"));
            if (illegalClasses.length > 0) {
                errors.push(`Classi "Settimana Lunga" nel Quarto Turno: ${illegalClasses.map(c => c.classId).join(", ")}`);
            }
        }

        return errors;
    }

    // Updated Conflict Logic: Check Ritorno(N) vs Andata(N+1), Andata(N) vs Andata(N+1), Ritorno(N) vs Ritorno(N+1)
    getTeacherConflicts(day: string, shifts: { [key: string]: string[] }): { [classId: string]: string[] } {
        const conflictMap: { [classId: string]: string[] } = {};
        const shiftNames = Object.keys(shifts); // Assumes order: Primo, Secondo, Terzo, Quarto

        // Helper to register conflict
        const addConflict = (id: string, msg: string) => {
            if (!conflictMap[id]) conflictMap[id] = [];
            // Avoid duplicate messages
            if (!conflictMap[id].includes(msg)) {
                conflictMap[id].push(msg);
            }
        };

        for (let i = 0; i < shiftNames.length - 1; i++) {
            const currentShift = shiftNames[i];
            const nextShift = shiftNames[i + 1];

            const classesCurrent = shifts[currentShift];
            const classesNext = shifts[nextShift];

            // Build Maps for Current Shift: Teacher -> ClassIds[]
            const goingCurrent: { [teacher: string]: string[] } = {};
            const returningCurrent: { [teacher: string]: string[] } = {};

            classesCurrent.forEach(cId => {
                const teachers = this.getShiftTeachers(currentShift, cId, day);
                teachers.going.forEach(t => {
                    if (t && t !== 'Non trovato') {
                        if (!goingCurrent[t]) goingCurrent[t] = [];
                        goingCurrent[t].push(cId);
                    }
                });
                teachers.returning.forEach(t => {
                    if (t && t !== 'Non trovato') {
                        if (!returningCurrent[t]) returningCurrent[t] = [];
                        returningCurrent[t].push(cId);
                    }
                });
            });

            // Build Maps for Next Shift: Teacher -> ClassIds[]
            const goingNext: { [teacher: string]: string[] } = {};
            const returningNext: { [teacher: string]: string[] } = {};

            classesNext.forEach(cId => {
                const teachers = this.getShiftTeachers(nextShift, cId, day);
                teachers.going.forEach(t => {
                    if (t && t !== 'Non trovato') {
                        if (!goingNext[t]) goingNext[t] = [];
                        goingNext[t].push(cId);
                    }
                });
                teachers.returning.forEach(t => {
                    if (t && t !== 'Non trovato') {
                        if (!returningNext[t]) returningNext[t] = [];
                        returningNext[t].push(cId);
                    }
                });
            });

            // --- CHECK 1: Ritorno(N) vs Andata(N+1) (original check) ---
            const crossConflicts = Object.keys(returningCurrent).filter(t => goingNext[t]);
            crossConflicts.forEach(t => {
                const prevClasses = returningCurrent[t];
                const nextClasses = goingNext[t];
                prevClasses.forEach(p => {
                    nextClasses.forEach(n => {
                        addConflict(p, `Conflitto con ${n} (${t})`);
                        addConflict(n, `Conflitto con ${p} (${t})`);
                    });
                });
            });

            // --- CHECK 2: Andata(N) vs Andata(N+1) for DIFFERENT classes ---
            const goGoConflicts = Object.keys(goingCurrent).filter(t => goingNext[t]);
            goGoConflicts.forEach(t => {
                const currClasses = goingCurrent[t];
                const nextClasses = goingNext[t];
                currClasses.forEach(c => {
                    nextClasses.forEach(n => {
                        if (c !== n) {
                            addConflict(c, `Doppia Andata consecutiva (${t}) con ${n}`);
                            addConflict(n, `Doppia Andata consecutiva (${t}) con ${c}`);
                        }
                    });
                });
            });

            // --- CHECK 3: Ritorno(N) vs Ritorno(N+1) for DIFFERENT classes ---
            const retRetConflicts = Object.keys(returningCurrent).filter(t => returningNext[t]);
            retRetConflicts.forEach(t => {
                const currClasses = returningCurrent[t];
                const nextClasses = returningNext[t];
                currClasses.forEach(c => {
                    nextClasses.forEach(n => {
                        if (c !== n) {
                            addConflict(c, `Doppio Ritorno consecutivo (${t}) con ${n}`);
                            addConflict(n, `Doppio Ritorno consecutivo (${t}) con ${c}`);
                        }
                    });
                });
            });
        }

        return conflictMap;
    }
}
