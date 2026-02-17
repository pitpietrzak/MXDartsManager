import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface UserPreferences {
    highlightYourGames: boolean;
}

interface UserPreferencesContextType {
    preferences: UserPreferences;
    toggleHighlightYourGames: () => void;
}

const defaultPreferences: UserPreferences = {
    highlightYourGames: true
};

const UserPreferencesContext = createContext<UserPreferencesContextType | undefined>(undefined);

export const UserPreferencesProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [preferences, setPreferences] = useState<UserPreferences>(() => {
        const saved = localStorage.getItem('userPreferences');
        return saved ? JSON.parse(saved) : defaultPreferences;
    });

    useEffect(() => {
        localStorage.setItem('userPreferences', JSON.stringify(preferences));
    }, [preferences]);

    const toggleHighlightYourGames = () => {
        setPreferences(prev => ({
            ...prev,
            highlightYourGames: !prev.highlightYourGames
        }));
    };

    return (
        <UserPreferencesContext.Provider value={{
            preferences,
            toggleHighlightYourGames
        }}>
            {children}
        </UserPreferencesContext.Provider>
    );
};

export const useUserPreferences = (): UserPreferencesContextType => {
    const context = useContext(UserPreferencesContext);
    if (context === undefined) {
        throw new Error('useUserPreferences must be used within a UserPreferencesProvider');
    }
    return context;
};
