import React, { useState, useMemo, useEffect, Fragment } from 'react';
import { Player, DailyGame, Group, GameResult } from '../types/types';
import { useLanguage } from '../contexts/LanguageContext';
import { loadMonthGames } from '../utils/supabaseStorage';

interface PrintableTableProps {
    players: Player[];
    availableMonths: string[];
}

export const PrintableTable: React.FC<PrintableTableProps> = ({ players, availableMonths }) => {
    const { t, language } = useLanguage();
    const [selectedMonth, setSelectedMonth] = useState(availableMonths[0] || new Date().toISOString().slice(0, 7));
    const [selectedPlayerIds, setSelectedPlayerIds] = useState<string[]>([]);
    const [games, setGames] = useState<DailyGame[]>([]);

    useEffect(() => {
        let isMounted = true;
        loadMonthGames(selectedMonth, false)
            .then(loadedGames => {
                if (isMounted) {
                    setGames(loadedGames);
                }
            })
            .catch(err => {
                console.error('Error loading games for printable table:', err);
            });
        return () => { isMounted = false; };
    }, [selectedMonth]);

    const getResult = (date: Date, playerId: string) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const formattedDate = `${year}-${month}-${day}`;
        
        const matchingGames = games.filter((g: DailyGame) => g.date === formattedDate);
        if (matchingGames.length === 0) return null;

        let wins = 0;
        let losses = 0;
        let found = false;
        let isCompleted = false;

        matchingGames.forEach(game => {
            if (game.completed) isCompleted = true;
            game.groups.forEach((group: Group) => {
                const result = group.results?.find((r: GameResult) => r.playerId === playerId);
                if (result) {
                    wins += result.wins;
                    losses += result.losses;
                    found = true;
                }
            });
        });

        // Only return numbers if the game is completed, otherwise return null for placeholders
        return (found && isCompleted) ? { wins, losses } : null;
    };

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

    const densityStyles = useMemo(() => {
        const playerCount = selectedPlayers.length;
        const dayCount = monthDays.length;
        
        // Thresholds for scaling
        let fontSize = '10pt';
        let padding = '6px 4px';
        let wlWidth = '35px';
        let nameFontSize = '11pt';
        let dateWidth = '130px';

        if (playerCount > 6 || dayCount > 21) {
            fontSize = '9pt';
            padding = '4px 3px';
            wlWidth = '30px';
            nameFontSize = '10pt';
            dateWidth = '110px';
        }
        
        if (playerCount > 10) {
            fontSize = '8pt';
            padding = '3px 2px';
            wlWidth = '25px';
            nameFontSize = '9pt';
            dateWidth = '100px';
        }

        return {
            '--print-font-size': fontSize,
            '--print-padding': padding,
            '--print-wl-width': wlWidth,
            '--print-name-font-size': nameFontSize,
            '--print-date-width': dateWidth,
        } as React.CSSProperties;
    }, [selectedPlayers.length, monthDays.length]);

    const handleTogglePlayer = (id: string) => {
        setSelectedPlayerIds((prev: string[]) =>
            prev.includes(id) ? prev.filter((p: string) => p !== id) : [...prev, id]
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
                            {players.sort((a, b) => a.name.localeCompare(b.name)).map((player: Player) => (
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
                <div className="printable-sheet" style={densityStyles}>
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
                                margin: 3mm;
                            }
                            html, body {
                                background: white !important;
                                padding: 0 !important;
                                margin: 0 !important;
                                height: 100%;
                                overflow: hidden;
                            }
                            .no-print, header, footer, .container > header, .btn, .card-header, .title-banner.no-print {
                                display: none !important;
                            }
                            .printable-sheet {
                                visibility: visible !important;
                                position: relative;
                                width: 100%;
                                height: calc(210mm - 10mm); /* Stretch to fit A4 landscape height */
                                display: flex;
                                flex-direction: column;
                                page-break-after: avoid;
                                break-after: avoid;
                                overflow: hidden;
                            }
                            .card {
                                border: none !important;
                                box-shadow: none !important;
                                background: transparent !important;
                                padding: 0 !important;
                                margin: 0 !important;
                            }
                        }
                        
                        .print-table {
                            width: 100%;
                            height: 100%;
                            flex: 1;
                            border-collapse: collapse;
                            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                            font-size: var(--print-font-size);
                            color: black;
                            table-layout: auto;
                        }

                        .print-table th, .print-table td {
                            border: 1.5px solid #333;
                            padding: var(--print-padding);
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
                            font-size: var(--print-name-font-size);
                            white-space: nowrap;
                            min-width: 60px;
                        }

                        .date-col {
                            text-align: left;
                            padding-left: 8px;
                            font-weight: 600;
                            background-color: #f8f9fa !important;
                            white-space: nowrap;
                            width: var(--print-date-width);
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
                            width: var(--print-wl-width);
                            background-color: white !important;
                        }

                        .title-banner {
                            text-align: center;
                            margin-bottom: 20px;
                        }

                        .title-banner h1 {
                            margin: 0;
                            font-size: 18pt;
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
                                <th style={{ width: '30px' }}>#</th>
                                <th style={{ width: 'var(--print-date-width)' }}>{t('print.date')}</th>
                                {selectedPlayers.map(player => (
                                    <th key={player.id} colSpan={2} className="player-name">
                                        {player.name}
                                    </th>
                                ))}
                            </tr>
                            <tr className="header-row-3">
                                <td className="empty-header-label"></td>
                                <td className="wl-header-label">W / L:</td>
                                {selectedPlayers.map(player => (
                                    <React.Fragment key={player.id}>
                                        <td className="wl-cell">W</td>
                                        <td className="wl-cell">L</td>
                                    </React.Fragment>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {monthDays.map((date: Date, index: number) => (
                                <tr key={date.toISOString()}>
                                    <td className="index-col">{index + 1}</td>
                                    <td className="date-col">
                                        {date.toLocaleDateString(language === 'pl' ? 'pl-PL' : 'en-US', {
                                            day: '2-digit',
                                            month: '2-digit',
                                            year: 'numeric'
                                        })}
                                    </td>
                                    {selectedPlayers.map((player: Player) => {
                                        const result = getResult(date, player.id);
                                        return (
                                            <Fragment key={player.id}>
                                                <td className="wl-cell">{result !== null ? result.wins : ''}</td>
                                                <td className="wl-cell">{result !== null ? result.losses : ''}</td>
                                            </Fragment>
                                        );
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};
