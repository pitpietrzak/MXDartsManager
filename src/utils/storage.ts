import { AppState, MonthData } from '../types/types';

const STORAGE_KEY = 'macrix-dart-competition-data';

/**
 * Load app state from localStorage
 */
export function loadState(): AppState | null {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (!stored) return null;
        return JSON.parse(stored);
    } catch (error) {
        console.error('Error loading state:', error);
        return null;
    }
}

/**
 * Save app state to localStorage
 */
export function saveState(state: AppState): void {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
        console.error('Error saving state:', error);
    }
}

/**
 * Export data as JSON file
 */
export function exportData(state: AppState): void {
    const dataStr = JSON.stringify(state, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = `macrix-dart-competition-${new Date().toISOString().split('T')[0]}.json`;
    link.click();

    URL.revokeObjectURL(url);
}

/**
 * Import data from JSON file
 */
export function importData(file: File): Promise<AppState> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target?.result as string);
                resolve(data);
            } catch (error) {
                reject(new Error('Invalid JSON file'));
            }
        };

        reader.onerror = () => reject(new Error('Error reading file'));
        reader.readAsText(file);
    });
}

/**
 * Get current month string (YYYY-MM format)
 */
export function getCurrentMonth(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
}

/**
 * Create initial empty month data
 */
export function createEmptyMonthData(month: string): MonthData {
    return {
        month,
        games: [],
        stats: []
    };
}
