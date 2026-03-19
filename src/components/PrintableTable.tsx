import React, { useState, useMemo } from 'react';
import { Player } from '../types/types';
import { useLanguage } from '../contexts/LanguageContext';

interface PrintableTableProps {
    players: Player[];
    availableMonths: string[];
}

export const PrintableTable: React.FC<PrintableTableProps> = ({ players, availableMonths }) => {
    const { t, language } = useLanguage();
    const [selectedMonth, setSelectedMonth] = useState(availableMonths[0] || new Date().toISOString().slice(0, 7));
    const [selectedPlayerIds, setSelectedPlayerIds] = useState<string[]>([]);

    const selectedPlayers = useMemo(() => {
        return players.filter(p => selectedPlayerIds.includes(p.id)).sort((a, b) => a.name.localeCompare(b.name));
    }, [players, selectedPlayerIds]);

    const monthDays = useMemo(() => {
        const [year, month] = selectedMonth.split('-').map(Number);
        const days: Date[] = [];
        const date = new Date(year, month - 1, 1);
        while (date.getMonth() === month - 1) {
            const dayOfWeek = date.getDay();
            if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Skip weekends
                days.push(new Date(date));
            }
            date.setDate(date.getDate() + 1);
        }
        return days;
    }, [selectedMonth]);

    const handleTogglePlayer = (id: string) => {
        setSelectedPlayerIds(prev => 
            prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
        );
    };

    const handlePrint = () => {
        window.print();
    };

    return (
        <div className="card fade-in">
            <div className="no-print">
                <h2 style={{ marginBottom: 'var(--spacing-md)' }}>{t('print.title')}</h2>
                
                <div style={{ display: 'grid', gap: 'var(--spacing-lg)', marginBottom: 'var(--spacing-xl)' }}>
                    <div>
                        <label className="text-muted" style={{ display: 'block', marginBottom: 'var(--spacing-xs)', fontSize: '0.875rem' }}>
                            {t('print.selectMonth')}
                        </label>
                        <select 
                            value={selectedMonth} 
                            onChange={(e) => setSelectedMonth(e.target.value)}
                            className="input"
                            style={{ maxWidth: '300px' }}
                        >
                            {availableMonths.map(m => (
                                <option key={m} value={m}>{m}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="text-muted" style={{ display: 'block', marginBottom: 'var(--spacing-sm)', fontSize: '0.875rem' }}>
                            {t('print.selectPlayers')} ({selectedPlayerIds.length})
                        </label>
                        <div style={{ 
                            display: 'grid', 
                            gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', 
                            gap: 'var(--spacing-xs)',
                            maxHeight: '200px',
                            overflowY: 'auto',
                            padding: 'var(--spacing-sm)',
                            background: 'var(--color-bg-secondary)',
                            borderRadius: 'var(--radius-md)'
                        }}>
                            {players.sort((a,b) => a.name.localeCompare(b.name)).map(player => (
                                <label 
                                    key={player.id} 
                                    style={{ 
                                        display: 'flex', 
                                        alignItems: 'center', 
                                        gap: '8px', 
                                        fontSize: '0.875rem',
                                        cursor: 'pointer',
                                        padding: '4px',
                                        borderRadius: '4px',
                                        background: selectedPlayerIds.includes(player.id) ? 'var(--color-bg-tertiary)' : 'transparent'
                                    }}
                                >
                                    <input 
                                        type="checkbox" 
                                        checked={selectedPlayerIds.includes(player.id)}
                                        onChange={() => handleTogglePlayer(player.id)}
                                    />
                                    {player.name}
                                </label>
                            ))}
                        </div>
                    </div>

                    {selectedPlayerIds.length > 0 && (
                        <button onClick={handlePrint} className="btn btn-primary btn-lg" style={{ alignSelf: 'start' }}>
                            🖨️ {t('print.print')}
                        </button>
                    )}
                </div>
            </div>

            {/* Printable Area */}
            {selectedPlayerIds.length > 0 && (
                <div className="printable-sheet">
                    <style>{`
                        @media screen {
                            .printable-sheet {
                                margin-top: var(--spacing-lg);
                                padding: var(--spacing-md);
                                background: white;
                                color: black;
                                border-radius: var(--radius-md);
                                box-shadow: var(--shadow-sm);
                                overflow-x: auto;
                            }
                        }

                        @media print {
                            @page {
                                size: A4 landscape;
                                margin: 5mm;
                            }
                            body {
                                background: white !important;
                                padding: 0 !important;
                                margin: 0 !important;
                            }
                            .no-print, header, footer, .container > header, .btn, .card-header, .title-banner {
                                display: none !important;
                            }
                            .printable-sheet {
                                visibility: visible !important;
                                position: absolute;
                                left: 0;
                                top: 0;
                                width: 100%;
                            }
                            .card {
                                border: none !important;
                                box-shadow: none !important;
                                background: transparent !important;
                                padding: 0 !important;
                            }
                        }
                        
                        .print-table {
                            width: 100%;
                            border-collapse: collapse;
                            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                            font-size: 10pt;
                            color: black;
                        }

                        .print-table th, .print-table td {
                            border: 1.5px solid #333;
                            padding: 6px 4px;
                            text-align: center;
                        }

                        .header-row-1 {
                            background-color: #2f5597 !important;
                            color: white !important;
                            font-size: 14pt;
                            text-transform: uppercase;
                            letter-spacing: 0.1em;
                        }

                        .header-row-2 {
                            background-color: #8faadc !important;
                            color: #000 !important;
                            font-weight: bold;
                        }

                        .header-row-3 {
                            background-color: #d9e1f2 !important;
                            font-weight: bold;
                            font-size: 9pt;
                        }

                        .player-name {
                            font-size: 11pt;
                            white-space: nowrap;
                            min-width: 80px;
                        }

                        .date-col {
                            text-align: left;
                            padding-left: 10px;
                            font-weight: 600;
                            background-color: #f8f9fa !important;
                            white-space: nowrap;
                            width: 130px;
                        }

                        .index-col {
                            width: 40px;
                            color: #666;
                            font-size: 9pt;
                            background-color: #f8f9fa !important;
                        }

                        .wl-header-label {
                            text-align: right;
                            padding-right: 12px;
                            font-weight: bold;
                        }

                        .wl-cell {
                            width: 35px;
                            background-color: white !important;
                        }

                        .title-banner {
                            text-align: center;
                            margin-bottom: 20px;
                        }

                        .title-banner h1 {
                            margin: 0;
                            font-size: 24pt;
                            color: #2f5597;
                        }

                        .title-banner p {
                            margin: 5px 0 0;
                            font-size: 12pt;
                            color: #666;
                        }
                    `}</style>

                    <div className="title-banner no-print">
                         <h3 style={{ margin: 0, color: 'var(--color-accent-primary)' }}>{t('print.title')}</h3>
                         <p style={{ margin: 0, fontSize: '0.875rem' }}>{selectedMonth}</p>
                    </div>

                    <table className="print-table">
                        <thead>
                            <tr className="header-row-1">
                                <th colSpan={selectedPlayers.length * 2 + 2}>
                                    {t('app.title')} - {selectedMonth}
                                </th>
                            </tr>
                            <tr className="header-row-2">
                                <th style={{ width: '40px' }}>#</th>
                                <th style={{ width: '130px' }}>{t('print.date')}</th>
                                {selectedPlayers.map(player => (
                                    <th key={player.id} colSpan={2} className="player-name">
                                        {player.name}
                                    </th>
                                ))}
                            </tr>
                            <tr className="header-row-3">
                                <td colSpan={2} className="wl-header-label">W / L:</td>
                                {selectedPlayers.map(player => (
                                    <React.Fragment key={player.id}>
                                        <td className="wl-cell">W</td>
                                        <td className="wl-cell">L</td>
                                    </React.Fragment>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {monthDays.map((date, index) => (
                                <tr key={date.toISOString()}>
                                    <td className="index-col">{index + 1}</td>
                                    <td className="date-col">
                                        {date.toLocaleDateString(language === 'pl' ? 'pl-PL' : 'en-US', {
                                            day: '2-digit',
                                            month: '2-digit',
                                            year: 'numeric'
                                        })}
                                    </td>
                                    {selectedPlayers.map(player => (
                                        <React.Fragment key={player.id}>
                                            <td className="wl-cell"></td>
                                            <td className="wl-cell"></td>
                                        </React.Fragment>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};
