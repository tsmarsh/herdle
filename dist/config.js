export const DEFAULT_CONFIG = {
    dogs: [
        { id: 'ace', name: 'Ace', key: 'a', color: '#FF8A8A', personality: { speed: 1.0, obedience: 0.8, distractibility: 0.2 } },
        { id: 'shep', name: 'Shep', key: 's', color: '#8AA4FF', personality: { speed: 1.3, obedience: 0.65, distractibility: 0.5 } },
        { id: 'duke', name: 'Duke', key: 'd', color: '#FFD88A', personality: { speed: 0.9, obedience: 0.85, distractibility: 0.15 } },
        { id: 'fido', name: 'Fido', key: 'f', color: '#C98AFF', personality: { speed: 0.65, obedience: 0.95, distractibility: 0.05 } },
    ],
    settings: {
        sheepCount: 20,
        sheepPanicRadius: 60,
        sheepFlockRadius: 150,
        obstacleCount: 5,
        penSize: 200,
    }
};
const STORAGE_KEY = 'herdle-config';
export function loadConfig() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw)
            return structuredClone(DEFAULT_CONFIG);
        const saved = JSON.parse(raw);
        const config = structuredClone(DEFAULT_CONFIG);
        if (saved.dogs && Array.isArray(saved.dogs)) {
            for (const def of config.dogs) {
                const match = saved.dogs.find(d => d.id === def.id);
                if (match?.personality) {
                    def.personality.speed = match.personality.speed ?? def.personality.speed;
                    def.personality.obedience = match.personality.obedience ?? def.personality.obedience;
                    def.personality.distractibility = match.personality.distractibility ?? def.personality.distractibility;
                }
            }
        }
        if (saved.settings) {
            for (const key of Object.keys(config.settings)) {
                if (typeof saved.settings[key] === 'number') {
                    config.settings[key] = saved.settings[key];
                }
            }
        }
        return config;
    }
    catch {
        return structuredClone(DEFAULT_CONFIG);
    }
}
export function saveConfig(config) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
}
