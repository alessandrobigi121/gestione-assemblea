
"use client";

import { useState } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { X, ChartPie, BarChart3 } from "lucide-react";
import { AssemblyEntry } from "@/lib/parsers";

interface StatisticsPanelProps {
    shifts: { [key: string]: AssemblyEntry[] };
    maxCapacity?: number;
    conflictMap: { [classId: string]: string[] };
    onClose: () => void;
}

const COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#ec4899'];

export default function StatisticsPanel({ shifts, maxCapacity = 499, conflictMap, onClose }: StatisticsPanelProps) {
    const [activeTab, setActiveTab] = useState<'overview' | 'distribution' | 'conflicts'>('overview');

    // Calculate statistics
    const shiftStats = Object.entries(shifts).map(([name, classes], index) => {
        const students = classes.reduce((sum, c) => sum + c.students, 0);
        const settimanaCorta = classes.filter(c => c.weekType?.toLowerCase().includes('corta')).length;
        const settimanaLunga = classes.length - settimanaCorta;
        const occupancy = Math.round((students / maxCapacity) * 100);

        return {
            name: name.replace(' turno', ''),
            students,
            classes: classes.length,
            settimanaCorta,
            settimanaLunga,
            occupancy,
            fill: COLORS[index % COLORS.length]
        };
    });

    const totalStudents = shiftStats.reduce((sum, s) => sum + s.students, 0);
    const totalClasses = shiftStats.reduce((sum, s) => sum + s.classes, 0);
    const totalConflicts = Object.values(conflictMap).flat().length;

    // Distribution by year
    const yearDistribution = Object.values(shifts).flat().reduce((acc, cls) => {
        const year = cls.classId.match(/^(\d)/)?.[1] || 'Altro';
        acc[year] = (acc[year] || 0) + 1;
        return acc;
    }, {} as { [key: string]: number });

    const yearData = Object.entries(yearDistribution).map(([year, count]) => ({
        name: `Anno ${year}`,
        value: count
    }));

    // Conflict data by shift
    const conflictData = Object.entries(shifts).map(([shiftName, classes]) => {
        const conflictCount = classes.filter(c => conflictMap[c.classId]?.length > 0).length;
        return {
            name: shiftName.replace(' turno', ''),
            conflicts: conflictCount
        };
    });

    return (
        <div style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.8)',
            backdropFilter: 'blur(8px)',
            zIndex: 100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '2rem'
        }}>
            <div className="glass-panel" style={{
                width: '100%',
                maxWidth: '1000px',
                maxHeight: '90vh',
                overflow: 'auto',
                padding: '1.5rem'
            }}>
                {/* Header */}
                <div className="flex-row justify-between items-center" style={{ marginBottom: '1.5rem' }}>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        📊 Statistiche Assemblea
                    </h2>
                    <button
                        onClick={onClose}
                        className="glass-panel hover:bg-white/10"
                        style={{ padding: '0.5rem', cursor: 'pointer' }}
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Stats Summary */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
                    <div className="glass-panel" style={{ padding: '1rem', textAlign: 'center' }}>
                        <div style={{ fontSize: '2rem', fontWeight: 700, color: '#6366f1' }}>{totalClasses}</div>
                        <div style={{ fontSize: '0.85rem', opacity: 0.7 }}>Classi Totali</div>
                    </div>
                    <div className="glass-panel" style={{ padding: '1rem', textAlign: 'center' }}>
                        <div style={{ fontSize: '2rem', fontWeight: 700, color: '#22c55e' }}>{totalStudents}</div>
                        <div style={{ fontSize: '0.85rem', opacity: 0.7 }}>Studenti Totali</div>
                    </div>
                    <div className="glass-panel" style={{ padding: '1rem', textAlign: 'center' }}>
                        <div style={{ fontSize: '2rem', fontWeight: 700, color: '#f59e0b' }}>{shiftStats.filter(s => s.classes > 0).length}</div>
                        <div style={{ fontSize: '0.85rem', opacity: 0.7 }}>Turni Attivi</div>
                    </div>
                    <div className="glass-panel" style={{ padding: '1rem', textAlign: 'center' }}>
                        <div style={{ fontSize: '2rem', fontWeight: 700, color: totalConflicts > 0 ? '#ef4444' : '#22c55e' }}>{totalConflicts}</div>
                        <div style={{ fontSize: '0.85rem', opacity: 0.7 }}>Conflitti</div>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex-row gap-2" style={{ marginBottom: '1.5rem' }}>
                    <button
                        onClick={() => setActiveTab('overview')}
                        className={`glass-panel ${activeTab === 'overview' ? '' : 'hover:bg-white/10'}`}
                        style={{
                            padding: '0.5rem 1rem',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            background: activeTab === 'overview' ? 'rgba(99, 102, 241, 0.2)' : undefined,
                            borderColor: activeTab === 'overview' ? 'rgba(99, 102, 241, 0.5)' : undefined
                        }}
                    >
                        <BarChart3 size={16} /> Occupazione
                    </button>
                    <button
                        onClick={() => setActiveTab('distribution')}
                        className={`glass-panel ${activeTab === 'distribution' ? '' : 'hover:bg-white/10'}`}
                        style={{
                            padding: '0.5rem 1rem',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            background: activeTab === 'distribution' ? 'rgba(99, 102, 241, 0.2)' : undefined,
                            borderColor: activeTab === 'distribution' ? 'rgba(99, 102, 241, 0.5)' : undefined
                        }}
                    >
                        <ChartPie size={16} /> Distribuzione
                    </button>
                </div>

                {/* Chart Area */}
                <div style={{ height: '350px' }}>
                    {activeTab === 'overview' && (
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={shiftStats} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                                <XAxis dataKey="name" stroke="rgba(255,255,255,0.5)" />
                                <YAxis stroke="rgba(255,255,255,0.5)" />
                                <Tooltip
                                    contentStyle={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                                    labelStyle={{ color: 'white' }}
                                />
                                <Bar dataKey="students" name="Studenti" radius={[4, 4, 0, 0]}>
                                    {shiftStats.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.fill} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    )}

                    {activeTab === 'distribution' && (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', height: '100%' }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={shiftStats}
                                        dataKey="students"
                                        nameKey="name"
                                        cx="50%"
                                        cy="50%"
                                        outerRadius={100}
                                        label={({ name, percent }) => `${name} (${((percent ?? 0) * 100).toFixed(0)}%)`}
                                    >
                                        {shiftStats.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }} />
                                </PieChart>
                            </ResponsiveContainer>
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={yearData}
                                        dataKey="value"
                                        nameKey="name"
                                        cx="50%"
                                        cy="50%"
                                        outerRadius={100}
                                        label={({ name, value }) => `${name}: ${value}`}
                                    >
                                        {yearData.map((_, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }} />
                                    <Legend />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
