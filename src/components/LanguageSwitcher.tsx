import { useLanguage } from '../contexts/LanguageContext';

export function LanguageSwitcher() {
    const { language, setLanguage } = useLanguage();

    return (
        <div style={{ display: 'flex', gap: 'var(--spacing-xs)', width: '100%' }}>
            <button
                onClick={() => setLanguage('en')}
                className={`btn btn-sm ${language === 'en' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ flex: 1, padding: '4px 8px', fontSize: '1.2rem', lineHeight: 1, justifyContent: 'center' }}
                title="English"
            >
                🇬🇧
            </button>
            <button
                onClick={() => setLanguage('pl')}
                className={`btn btn-sm ${language === 'pl' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ flex: 1, padding: '4px 8px', fontSize: '1.2rem', lineHeight: 1, justifyContent: 'center' }}
                title="Polski"
            >
                🇵🇱
            </button>
        </div>
    );
}
