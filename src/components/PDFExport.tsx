
"use client";

import { Document, Page, Text, View, StyleSheet, PDFDownloadLink } from "@react-pdf/renderer";
import { AssemblyEntry } from "@/lib/parsers";


// Using built-in Helvetica font to avoid font loading issues
const styles = StyleSheet.create({
    page: {
        flexDirection: 'column',
        backgroundColor: '#FFFFFF',
        fontFamily: 'Helvetica',
        paddingBottom: 60,
    },
    headerBackground: {
        backgroundColor: '#6366f1',
        height: 15,
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
    },
    headerContainer: {
        padding: 40,
        paddingBottom: 20,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        borderBottom: '1 solid #e2e8f0',
        marginBottom: 20,
    },
    headerTitleBlock: {
        flexDirection: 'column',
    },
    title: {
        fontSize: 28,
        fontWeight: 700,
        color: '#1e293b',
        marginBottom: 4,
    },
    subtitle: {
        fontSize: 12,
        color: '#64748b',
    },
    dateBlock: {
        alignItems: 'flex-end',
    },
    dateLabel: {
        fontSize: 8,
        color: '#94a3b8',
        textTransform: 'uppercase',
        marginBottom: 2,
    },
    dateValue: {
        fontSize: 10,
        color: '#334155',
        fontWeight: 700,
    },
    statsContainer: {
        flexDirection: 'row',
        marginHorizontal: 40,
        marginBottom: 30,
        backgroundColor: '#f8fafc',
        borderRadius: 8,
        padding: 15,
        border: '1 solid #f1f5f9',
    },
    statItem: {
        flex: 1,
        alignItems: 'center',
        borderRight: '1 solid #e2e8f0',
    },
    statItemLast: {
        flex: 1,
        alignItems: 'center',
    },
    statValue: {
        fontSize: 20,
        fontWeight: 700,
        color: '#6366f1',
        marginBottom: 2,
    },
    statLabel: {
        fontSize: 8,
        color: '#64748b',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    shiftSection: {
        marginHorizontal: 40,
        marginBottom: 25,
        breakInside: 'avoid',
    },
    shiftHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
        borderLeft: '4 solid #6366f1',
        paddingLeft: 10,
    },
    shiftTitle: {
        fontSize: 14,
        fontWeight: 700,
        color: '#1e293b',
    },
    shiftSummary: {
        fontSize: 10,
        color: '#64748b',
    },
    table: {
        display: 'flex',
        width: 'auto',
        borderRadius: 4,
        overflow: 'hidden',
    },
    tableHeaderRow: {
        flexDirection: 'row',
        backgroundColor: '#6366f1',
        paddingVertical: 8,
        paddingHorizontal: 4,
        alignItems: 'center',
    },
    tableRow: {
        flexDirection: 'row',
        paddingVertical: 6,
        paddingHorizontal: 4,
        borderBottomWidth: 1,
        borderBottomColor: '#f1f5f9',
        alignItems: 'center',
    },
    tableRowAlt: {
        flexDirection: 'row',
        paddingVertical: 6,
        paddingHorizontal: 4,
        borderBottomWidth: 1,
        borderBottomColor: '#f1f5f9',
        backgroundColor: '#f8fafc',
        alignItems: 'center',
    },
    colClass: { width: '15%', paddingLeft: 4 },
    colStudents: { width: '15%', textAlign: 'center' },
    colLoc: { width: '20%' },
    colTeachers: { width: '50%' },

    headerText: {
        fontSize: 9,
        fontWeight: 700,
        color: '#ffffff',
    },
    cellText: {
        fontSize: 9,
        color: '#334155',
    },
    cellTextBold: {
        fontSize: 9,
        fontWeight: 700,
        color: '#1e293b',
    },
    cellTextSecondary: {
        fontSize: 9,
        color: '#64748b',
    },
    footer: {
        position: 'absolute',
        bottom: 20,
        left: 40,
        right: 40,
        paddingTop: 10,
        borderTop: '1 solid #e2e8f0',
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    footerText: {
        fontSize: 8,
        color: '#94a3b8',
    },
});

interface ShiftData {
    [key: string]: AssemblyEntry[];
}

interface PDFReportProps {
    shifts: ShiftData;
    selectedDay: string;
    getTeachers?: (shift: string, classId: string) => { going: string[]; returning: string[] };
}

const ShiftTable = ({ shiftName, classes, getTeachers }: { shiftName: string; classes: AssemblyEntry[]; getTeachers?: (shift: string, classId: string) => { going: string[]; returning: string[] } }) => {
    const sortedClasses = [...classes].sort((a, b) => a.classId.localeCompare(b.classId));
    const totalStudents = classes.reduce((sum, c) => sum + c.students, 0);

    return (
        <View style={styles.shiftSection} wrap={false}>
            <View style={styles.shiftHeader}>
                <Text style={styles.shiftTitle}>{shiftName}</Text>
                <Text style={styles.shiftSummary}>{classes.length} classi • {totalStudents} studenti</Text>
            </View>
            <View style={styles.table}>
                <View style={styles.tableHeaderRow}>
                    <View style={styles.colClass}><Text style={styles.headerText}>Classe</Text></View>
                    <View style={styles.colStudents}><Text style={styles.headerText}>Stud.</Text></View>
                    <View style={styles.colLoc}><Text style={styles.headerText}>Sede</Text></View>
                    <View style={styles.colTeachers}><Text style={styles.headerText}>Docenti (A / R)</Text></View>
                </View>
                {sortedClasses.map((c, index) => {
                    const teachers = getTeachers ? getTeachers(shiftName, c.classId) : { going: ['-'], returning: ['-'] };
                    const isAlt = index % 2 === 1;
                    return (
                        <View style={isAlt ? styles.tableRowAlt : styles.tableRow} key={index}>
                            <View style={styles.colClass}>
                                <Text style={styles.cellTextBold}>{c.classId}</Text>
                            </View>
                            <View style={styles.colStudents}>
                                <Text style={styles.cellText}>{c.students}</Text>
                            </View>
                            <View style={styles.colLoc}>
                                <Text style={styles.cellTextSecondary}>{c.location || '-'}</Text>
                            </View>
                            <View style={styles.colTeachers}>
                                <Text style={styles.cellText}>
                                    {teachers.going.join(', ')} / {teachers.returning.join(', ')}
                                </Text>
                            </View>
                        </View>
                    );
                })}
            </View>
        </View>
    );
};

export const AssemblyReportDocument = ({ shifts, selectedDay, getTeachers }: PDFReportProps) => {
    const shiftOrder = ["Primo turno", "Secondo turno", "Terzo turno", "Quarto turno"];
    const totalClasses = Object.values(shifts).flat().length;
    const totalStudents = Object.values(shifts).flat().reduce((sum, c) => sum + c.students, 0);
    const activeShifts = shiftOrder.filter(s => shifts[s]?.length > 0).length;

    return (
        <Document>
            <Page size="A4" style={styles.page}>
                <View style={styles.headerBackground} fixed />

                <View style={styles.headerContainer}>
                    <View style={styles.headerTitleBlock}>
                        <Text style={styles.title}>Assemblea d'Istituto</Text>
                        <Text style={styles.subtitle}>Report Organizzazione Turni</Text>
                    </View>
                    <View style={styles.dateBlock}>
                        <Text style={styles.dateLabel}>Giorno</Text>
                        <Text style={styles.dateValue}>{selectedDay}</Text>
                        <Text style={[styles.dateLabel, { marginTop: 5 }]}>Generato il</Text>
                        <Text style={styles.dateValue}>{new Date().toLocaleDateString('it-IT')}</Text>
                    </View>
                </View>

                <View style={styles.statsContainer}>
                    <View style={styles.statItem}>
                        <Text style={styles.statValue}>{totalClasses}</Text>
                        <Text style={styles.statLabel}>Classi</Text>
                    </View>
                    <View style={styles.statItem}>
                        <Text style={styles.statValue}>{totalStudents}</Text>
                        <Text style={styles.statLabel}>Studenti</Text>
                    </View>
                    <View style={styles.statItemLast}>
                        <Text style={styles.statValue}>{activeShifts}</Text>
                        <Text style={styles.statLabel}>Turni Attivi</Text>
                    </View>
                </View>

                {shiftOrder.map(shiftName => (
                    shifts[shiftName] && shifts[shiftName].length > 0 && (
                        <ShiftTable
                            key={shiftName}
                            shiftName={shiftName}
                            classes={shifts[shiftName]}
                            getTeachers={getTeachers}
                        />
                    )
                ))}

                <View style={styles.footer} fixed>
                    <Text style={styles.footerText}>Assembly Manager • A cura di Alessandro Bigi</Text>
                    <Text style={styles.footerText} render={({ pageNumber, totalPages }) => (
                        `Pagina ${pageNumber} di ${totalPages}`
                    )} />
                </View>
            </Page>
        </Document>
    );
};

// This component renders a button that triggers the PDF download
interface PDFExportButtonProps {
    shifts: ShiftData;
    selectedDay: string;
    getTeachers?: (shift: string, classId: string) => { going: string[]; returning: string[] };
}

export default function PDFExportButton({ shifts, selectedDay, getTeachers }: PDFExportButtonProps) {
    return (
        <PDFDownloadLink
            document={<AssemblyReportDocument shifts={shifts} selectedDay={selectedDay} getTeachers={getTeachers} />}
            fileName={`report_assemblea_${selectedDay.toLowerCase()}.pdf`}
            style={{
                textDecoration: 'none',
                padding: '0.5rem 1rem',
                background: 'rgba(239, 68, 68, 0.1)',
                borderRadius: '8px',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                color: '#fca5a5',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                cursor: 'pointer',
                fontSize: '0.9rem',
            }}
        >
            {({ loading }: { loading: boolean }) => (loading ? '⏳ Generazione...' : '📄 Scarica PDF')}
        </PDFDownloadLink>
    );
}
