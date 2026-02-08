
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Save, RotateCcw } from "lucide-react";
import { toast } from "sonner";

interface AppSettings {
    maxCapacity: number;
    alertThreshold: number; // percentage (0.8 = 80%)
    shiftTimes: {
        [key: string]: { start: string; end: string };
    };
    shiftColors: {
        [key: string]: string;
    };
}

const defaultSettings: AppSettings = {
    maxCapacity: 499,
    alertThreshold: 0.8,
    shiftTimes: {
        "Primo turno": { start: "08:00", end: "09:00" },
        "Secondo turno": { start: "09:15", end: "10:15" },
        "Terzo turno": { start: "10:30", end: "11:30" },
        "Quarto turno": { start: "11:45", end: "12:45" },
    },
    shiftColors: {
        "Primo turno": "#6366f1",
        "Secondo turno": "#22c55e",
        "Terzo turno": "#f59e0b",
        "Quarto turno": "#ec4899",
    },
};

const STORAGE_KEY = "assemblea_settings";

export default function SettingsPage() {
    const [settings, setSettings] = useState<AppSettings>(defaultSettings);
    const [hasChanges, setHasChanges] = useState(false);

    useEffect(() => {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                setSettings({ ...defaultSettings, ...parsed });
            } catch (e) {
                console.warn("Error loading settings", e);
            }
        }
    }, []);

    const handleSave = () => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
        setHasChanges(false);
        toast.success("Impostazioni salvate!");
    };

    const handleReset = () => {
        if (confirm("Sei sicuro di voler ripristinare le impostazioni predefinite?")) {
            setSettings(defaultSettings);
            localStorage.removeItem(STORAGE_KEY);
            setHasChanges(false);
            toast.info("Impostazioni ripristinate");
        }
    };

    const updateSetting = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
        setSettings(prev => ({ ...prev, [key]: value }));
        setHasChanges(true);
    };

    const updateShiftTime = (shift: string, field: 'start' | 'end', value: string) => {
        setSettings(prev => ({
            ...prev,
            shiftTimes: {
                ...prev.shiftTimes,
                [shift]: { ...prev.shiftTimes[shift], [field]: value }
            }
        }));
        setHasChanges(true);
    };

    const updateShiftColor = (shift: string, color: string) => {
        setSettings(prev => ({
            ...prev,
            shiftColors: { ...prev.shiftColors, [shift]: color }
        }));
        setHasChanges(true);
    };

    return (
        <div className="container" style={{ maxWidth: '800px', margin: '0 auto', padding: '2rem' }}>
            {/* Header */}
            <header className="flex-row justify-between items-center" style={{ marginBottom: '2rem' }}>
                <div className="flex-row items-center gap-3">
                    <Link href="/" className="glass-panel hover:bg-white/10" style={{ padding: '0.5rem', cursor: 'pointer', display: 'flex' }}>
                        <ArrowLeft size={20} />
                    </Link>
                    <h1 style={{ fontSize: '1.75rem', fontWeight: 700 }}>⚙️ Impostazioni</h1>
                </div>
                <div className="flex-row gap-2">
                    <button
                        onClick={handleReset}
                        className="glass-panel hover:bg-white/10"
                        style={{ padding: '0.5rem 1rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                    >
                        <RotateCcw size={16} /> Ripristina
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={!hasChanges}
                        className="glass-panel"
                        style={{
                            padding: '0.5rem 1rem',
                            cursor: hasChanges ? 'pointer' : 'not-allowed',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            background: hasChanges ? 'rgba(34, 197, 94, 0.2)' : 'transparent',
                            borderColor: hasChanges ? 'rgba(34, 197, 94, 0.5)' : undefined,
                            opacity: hasChanges ? 1 : 0.5
                        }}
                    >
                        <Save size={16} /> Salva
                    </button>
                </div>
            </header>

            {/* Capacity Section */}
            <section className="glass-panel" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1rem' }}>🏛️ Capienza Auditorium</h2>
                <div className="flex-row items-center gap-4">
                    <label style={{ flex: 1 }}>
                        <span style={{ display: 'block', marginBottom: '0.5rem', opacity: 0.7 }}>Capienza Massima</span>
                        <input
                            type="number"
                            value={settings.maxCapacity}
                            onChange={(e) => updateSetting('maxCapacity', parseInt(e.target.value) || 0)}
                            style={{
                                width: '100%',
                                padding: '0.75rem',
                                background: 'rgba(255,255,255,0.05)',
                                border: '1px solid rgba(255,255,255,0.1)',
                                borderRadius: 'var(--radius)',
                                color: 'white',
                                fontSize: '1rem'
                            }}
                        />
                    </label>
                    <label style={{ flex: 1 }}>
                        <span style={{ display: 'block', marginBottom: '0.5rem', opacity: 0.7 }}>Soglia Allerta (%)</span>
                        <input
                            type="number"
                            min="0"
                            max="100"
                            value={Math.round(settings.alertThreshold * 100)}
                            onChange={(e) => updateSetting('alertThreshold', (parseInt(e.target.value) || 0) / 100)}
                            style={{
                                width: '100%',
                                padding: '0.75rem',
                                background: 'rgba(255,255,255,0.05)',
                                border: '1px solid rgba(255,255,255,0.1)',
                                borderRadius: 'var(--radius)',
                                color: 'white',
                                fontSize: '1rem'
                            }}
                        />
                    </label>
                </div>
            </section>

            {/* Shift Times Section */}
            <section className="glass-panel" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1rem' }}>⏰ Orari Turni</h2>
                <div style={{ display: 'grid', gap: '1rem' }}>
                    {Object.keys(settings.shiftTimes).map((shift) => (
                        <div key={shift} className="flex-row items-center gap-4">
                            <span style={{ width: '140px', fontWeight: 500 }}>{shift}</span>
                            <input
                                type="time"
                                value={settings.shiftTimes[shift].start}
                                onChange={(e) => updateShiftTime(shift, 'start', e.target.value)}
                                style={{
                                    padding: '0.5rem',
                                    background: 'rgba(255,255,255,0.05)',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    borderRadius: 'var(--radius)',
                                    color: 'white'
                                }}
                            />
                            <span style={{ opacity: 0.5 }}>→</span>
                            <input
                                type="time"
                                value={settings.shiftTimes[shift].end}
                                onChange={(e) => updateShiftTime(shift, 'end', e.target.value)}
                                style={{
                                    padding: '0.5rem',
                                    background: 'rgba(255,255,255,0.05)',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    borderRadius: 'var(--radius)',
                                    color: 'white'
                                }}
                            />
                        </div>
                    ))}
                </div>
            </section>

            {/* Colors Section */}
            <section className="glass-panel" style={{ padding: '1.5rem' }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1rem' }}>🎨 Colori Turni</h2>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
                    {Object.keys(settings.shiftColors).map((shift) => (
                        <div key={shift} className="flex-row items-center gap-3">
                            <input
                                type="color"
                                value={settings.shiftColors[shift]}
                                onChange={(e) => updateShiftColor(shift, e.target.value)}
                                style={{
                                    width: '40px',
                                    height: '40px',
                                    border: 'none',
                                    borderRadius: 'var(--radius)',
                                    cursor: 'pointer'
                                }}
                            />
                            <span>{shift}</span>
                        </div>
                    ))}
                </div>
            </section>
        </div>
    );
}
