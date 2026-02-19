
import { useState, useEffect } from 'react';
import { getPlayerAbsences, togglePlayerAbsence } from '../utils/supabaseStorage';
import { useLanguage } from '../contexts/LanguageContext';

interface AbsenceCalendarProps {
    playerId: string;
    isScriptPlayingToday?: boolean; // Prop to sync with "I'm playing today" switch
    onAbsenceChange?: (date: string, isAbsent: boolean) => void;
}

export const AbsenceCalendar: React.FC<AbsenceCalendarProps> = ({
    playerId,
    isScriptPlayingToday,
    onAbsenceChange
}) => {
    const { t, language } = useLanguage();
    const [viewDate, setViewDate] = useState(new Date());
    const [absences, setAbsences] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);

    // Initial load and sync with prop
    useEffect(() => {
        if (isExpanded) {
            loadAbsences();
        }
    }, [viewDate, playerId, isExpanded]);

    // Handle prop sync: if isScriptPlayingToday changes, we might need to update today's absence visually
    useEffect(() => {
        if (isScriptPlayingToday !== undefined) {
            const today = new Date();
            const year = today.getFullYear();
            const month = today.getMonth() + 1;
            const day = today.getDate();
            const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

            setAbsences(prev => {
                const next = new Set(prev);
                if (isScriptPlayingToday) {
                    next.delete(dateStr); // Playing = Not Absent
                } else {
                    next.add(dateStr); // Not Playing = Absent
                }
                return next;
            });
        }
    }, [isScriptPlayingToday]);


    const loadAbsences = async () => {
        setLoading(true);
        const year = viewDate.getFullYear();
        const month = viewDate.getMonth() + 1;

        // Calculate start and end of month
        const startOfMonth = `${year}-${String(month).padStart(2, '0')}-01`;
        // Get last day of month
        const lastDay = new Date(year, month, 0).getDate();
        const endOfMonth = `${year}-${String(month).padStart(2, '0')}-${lastDay}`;

        const absenceDates = await getPlayerAbsences(playerId, startOfMonth, endOfMonth);
        setAbsences(new Set(absenceDates));
        setLoading(false);
    };

    const handlePrevMonth = (e: React.MouseEvent) => {
        e.stopPropagation();
        const newDate = new Date(viewDate);
        newDate.setMonth(newDate.getMonth() - 1);
        setViewDate(newDate);
    };

    const handleNextMonth = (e: React.MouseEvent) => {
        e.stopPropagation();
        const newDate = new Date(viewDate);
        newDate.setMonth(newDate.getMonth() + 1);
        setViewDate(newDate);
    };

    const handleDayClick = async (day: number) => {
        const year = viewDate.getFullYear();
        const month = viewDate.getMonth() + 1;
        const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

        // Optimistic update locally
        const newAbsences = new Set(absences);
        const wasAbsent = newAbsences.has(dateStr);
        const isNowAbsent = !wasAbsent;

        if (wasAbsent) {
            newAbsences.delete(dateStr);
        } else {
            newAbsences.add(dateStr);
        }
        setAbsences(newAbsences);

        // Notify parent
        if (onAbsenceChange) {
            onAbsenceChange(dateStr, isNowAbsent);
        }

        const success = await togglePlayerAbsence(playerId, dateStr);

        if (success === null) {
            loadAbsences(); // Reload on error
        }
    };

    // Calendar generation helpers
    const getDaysInMonth = (date: Date) => {
        return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
    };

    const getFirstDayOfMonth = (date: Date) => {
        // 0 = Sunday, 1 = Monday, etc.
        const day = new Date(date.getFullYear(), date.getMonth(), 1).getDay();
        return day === 0 ? 6 : day - 1;
    };

    const daysInMonth = getDaysInMonth(viewDate);
    const firstDay = getFirstDayOfMonth(viewDate);

    // Create empty slots for days before the first day of the month
    const blanks = Array(firstDay).fill(null);
    const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

    const weekDays = language === 'pl'
        ? ['Pon', 'Wt', 'Śr', 'Czw', 'Pt', 'Sob', 'Ndz']
        : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

    const monthName = viewDate.toLocaleDateString(language === 'pl' ? 'pl-PL' : 'en-US', { month: 'long', year: 'numeric' });

    // Check if a day is today
    const isToday = (day: number) => {
        const today = new Date();
        return day === today.getDate() &&
            viewDate.getMonth() === today.getMonth() &&
            viewDate.getFullYear() === today.getFullYear();
    };

    // Check if a day is in the past
    const isPast = (day: number) => {
        const today = new Date();
        const checkDate = new Date(viewDate.getFullYear(), viewDate.getMonth(), day);
        today.setHours(0, 0, 0, 0);
        checkDate.setHours(0, 0, 0, 0);
        return checkDate < today;
    };

    return (
        <div className="card fade-in">
            <div
                className="card-header"
                style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    cursor: 'pointer',
                    marginBottom: isExpanded ? 'var(--spacing-lg)' : 0,
                    borderBottom: isExpanded ? '1px solid var(--color-border)' : 'none',
                    paddingBottom: isExpanded ? 'var(--spacing-md)' : 0
                }}
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
                    <h3 className="card-title" style={{ margin: 0 }}>📅 {t('profile.absenceSchedule') || 'Absence Schedule'}</h3>
                    <span style={{ fontSize: '0.8rem', opacity: 0.7 }}>
                        {isExpanded ? '▼' : '▶'}
                    </span>
                </div>

                {isExpanded && (
                    <div style={{ display: 'flex', gap: 'var(--spacing-sm)', alignItems: 'center' }} onClick={e => e.stopPropagation()}>
                        <button onClick={handlePrevMonth} className="btn btn-sm btn-secondary">←</button>
                        <span style={{ fontWeight: 600, minWidth: '140px', textAlign: 'center' }}>{monthName}</span>
                        <button onClick={handleNextMonth} className="btn btn-sm btn-secondary">→</button>
                    </div>
                )}
            </div>

            {isExpanded && (
                <div className="fade-in">
                    <p className="text-muted" style={{ marginBottom: 'var(--spacing-md)', fontSize: '0.875rem' }}>
                        {t('profile.absenceDescription') || 'Click dates to mark when you are absent. Use this to help organizers plan games.'}
                    </p>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 'var(--spacing-xs)', textAlign: 'center' }}>
                        {/* Weekday headers */}
                        {weekDays.map(day => (
                            <div key={day} style={{
                                padding: 'var(--spacing-xs)',
                                fontSize: '0.75rem',
                                fontWeight: 600,
                                color: 'var(--color-text-muted)'
                            }}>
                                {day}
                            </div>
                        ))}

                        {/* Blank slots */}
                        {blanks.map((_, i) => (
                            <div key={`blank-${i}`} style={{ padding: 'var(--spacing-sm)' }}></div>
                        ))}

                        {/* Days */}
                        {days.map(day => {
                            const year = viewDate.getFullYear();
                            const month = viewDate.getMonth() + 1;
                            const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                            const isAbsent = absences.has(dateStr);
                            const isPassed = isPast(day);
                            const isCurrentDay = isToday(day);

                            return (
                                <div
                                    key={day}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        if (!isPassed && !loading) handleDayClick(day);
                                    }}
                                    style={{
                                        aspectRatio: '1/1',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        borderRadius: 'var(--radius-md)',
                                        cursor: isPassed ? 'default' : 'pointer',
                                        background: isAbsent
                                            ? 'var(--color-accent-danger)' // Red for absence
                                            : isCurrentDay
                                                ? 'rgba(245, 158, 11, 0.2)' // Orange tint for today
                                                : 'var(--color-bg-secondary)', // Normal
                                        color: isAbsent ? 'white' : isCurrentDay ? 'var(--color-accent-primary)' : 'inherit',
                                        border: isCurrentDay ? '1px solid var(--color-accent-primary)' : '1px solid transparent',
                                        opacity: isPassed ? 0.3 : 1,
                                        transition: 'all 0.2s',
                                        position: 'relative'
                                    }}
                                    title={isAbsent ? (t('profile.absent') || 'Absent') : ''}
                                >
                                    <span style={{ fontWeight: 600 }}>{day}</span>
                                    {isAbsent && (
                                        <span style={{ fontSize: '0.7rem' }}>✖</span>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    <div style={{ display: 'flex', gap: 'var(--spacing-lg)', marginTop: 'var(--spacing-md)', justifyContent: 'center', fontSize: '0.75rem' }} className="text-muted">
                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)' }}>
                            <div style={{ width: '12px', height: '12px', background: 'var(--color-bg-secondary)', borderRadius: '2px', border: '1px solid var(--color-border-light)' }}></div>
                            <span>{t('profile.available') || 'Available'}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)' }}>
                            <div style={{ width: '12px', height: '12px', background: 'var(--color-accent-danger)', borderRadius: '2px' }}></div>
                            <span>{t('profile.absent') || 'Absent'}</span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
