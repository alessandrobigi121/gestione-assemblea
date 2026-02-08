
"use client";

import { useState } from "react";
import { AlertTriangle, X, ChevronDown, ChevronUp } from "lucide-react";

interface ErrorItem {
    id: string;
    type: 'capacity' | 'conflict' | 'constraint' | 'unassigned';
    message: string;
    severity: 'error' | 'warning' | 'info';
    classId?: string;
    shiftName?: string;
    onFix?: () => void;
}

interface ErrorPanelProps {
    errors: ErrorItem[];
    onDismiss?: (id: string) => void;
    onFixAll?: () => void;
}

const severityColors = {
    error: { bg: 'rgba(239, 68, 68, 0.1)', border: 'rgba(239, 68, 68, 0.3)', text: '#fca5a5', icon: '#ef4444' },
    warning: { bg: 'rgba(234, 179, 8, 0.1)', border: 'rgba(234, 179, 8, 0.3)', text: '#fde047', icon: '#eab308' },
    info: { bg: 'rgba(59, 130, 246, 0.1)', border: 'rgba(59, 130, 246, 0.3)', text: '#93c5fd', icon: '#3b82f6' },
};

const typeLabels = {
    capacity: '⚡ Sovraffollamento',
    conflict: '👥 Conflitto Docenti',
    constraint: '🚫 Vincolo Violato',
    unassigned: '📦 Classe Non Assegnata',
};

export default function ErrorPanel({ errors, onDismiss, onFixAll }: ErrorPanelProps) {
    const [isExpanded, setIsExpanded] = useState(true);

    if (errors.length === 0) return null;

    const errorCount = errors.filter(e => e.severity === 'error').length;
    const warningCount = errors.filter(e => e.severity === 'warning').length;

    return (
        <div
            className="glass-panel"
            style={{
                marginBottom: '1.5rem',
                border: errorCount > 0 ? '1px solid rgba(239, 68, 68, 0.4)' : '1px solid rgba(234, 179, 8, 0.4)',
                background: errorCount > 0 ? 'rgba(239, 68, 68, 0.05)' : 'rgba(234, 179, 8, 0.05)',
            }}
        >
            {/* Header */}
            <div
                className="flex-row justify-between items-center"
                style={{ padding: '1rem', cursor: 'pointer' }}
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <div className="flex-row items-center gap-3">
                    <AlertTriangle size={20} color={errorCount > 0 ? '#ef4444' : '#eab308'} />
                    <span style={{ fontWeight: 600 }}>
                        {errorCount > 0 && <span style={{ color: '#fca5a5' }}>{errorCount} errori</span>}
                        {errorCount > 0 && warningCount > 0 && ' • '}
                        {warningCount > 0 && <span style={{ color: '#fde047' }}>{warningCount} avvisi</span>}
                    </span>
                </div>
                <div className="flex-row items-center gap-2">
                    {onFixAll && (
                        <button
                            onClick={(e) => { e.stopPropagation(); onFixAll(); }}
                            className="glass-panel hover:bg-white/10"
                            style={{ padding: '0.25rem 0.75rem', fontSize: '0.8rem', cursor: 'pointer' }}
                        >
                            Risolvi Tutto
                        </button>
                    )}
                    {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                </div>
            </div>

            {/* Error List */}
            {isExpanded && (
                <div style={{ padding: '0 1rem 1rem', maxHeight: '300px', overflowY: 'auto' }}>
                    {errors.map((error) => {
                        const colors = severityColors[error.severity];
                        return (
                            <div
                                key={error.id}
                                className="flex-row justify-between items-center"
                                style={{
                                    padding: '0.75rem',
                                    marginBottom: '0.5rem',
                                    borderRadius: 'var(--radius)',
                                    background: colors.bg,
                                    border: `1px solid ${colors.border}`,
                                }}
                            >
                                <div className="flex-row items-center gap-3" style={{ flex: 1 }}>
                                    <span style={{ fontSize: '0.75rem', opacity: 0.8 }}>
                                        {typeLabels[error.type]}
                                    </span>
                                    <span style={{ color: colors.text }}>
                                        {error.message}
                                    </span>
                                </div>
                                <div className="flex-row items-center gap-2">
                                    {error.onFix && (
                                        <button
                                            onClick={error.onFix}
                                            className="glass-panel hover:bg-white/10"
                                            style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', cursor: 'pointer' }}
                                        >
                                            Fix
                                        </button>
                                    )}
                                    {onDismiss && (
                                        <button
                                            onClick={() => onDismiss(error.id)}
                                            style={{ background: 'transparent', border: 'none', cursor: 'pointer', opacity: 0.6 }}
                                        >
                                            <X size={14} />
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

// Helper function to generate errors from dashboard state
export function generateErrorsFromState(
    shifts: { [key: string]: { classId: string; students: number }[] },
    conflicts: { [classId: string]: string[] },
    unassignedCount: number,
    maxCapacity: number = 499
): ErrorItem[] {
    const errors: ErrorItem[] = [];
    let idCounter = 0;

    // Capacity errors
    Object.entries(shifts).forEach(([shiftName, classes]) => {
        const totalStudents = classes.reduce((sum, c) => sum + c.students, 0);
        if (totalStudents > maxCapacity) {
            errors.push({
                id: `cap-${idCounter++}`,
                type: 'capacity',
                severity: 'error',
                message: `${shiftName}: ${totalStudents}/${maxCapacity} studenti (supera capienza)`,
                shiftName,
            });
        } else if (totalStudents > maxCapacity * 0.9) {
            errors.push({
                id: `cap-${idCounter++}`,
                type: 'capacity',
                severity: 'warning',
                message: `${shiftName}: ${totalStudents}/${maxCapacity} studenti (quasi pieno)`,
                shiftName,
            });
        }
    });

    // Conflict errors
    Object.entries(conflicts).forEach(([classId, conflictMessages]) => {
        conflictMessages.forEach((msg) => {
            errors.push({
                id: `conf-${idCounter++}`,
                type: 'conflict',
                severity: 'warning',
                message: `${classId}: ${msg}`,
                classId,
            });
        });
    });

    // Unassigned warnings
    if (unassignedCount > 0) {
        errors.push({
            id: `unas-${idCounter++}`,
            type: 'unassigned',
            severity: unassignedCount > 5 ? 'error' : 'warning',
            message: `${unassignedCount} classi non assegnate`,
        });
    }

    return errors;
}
