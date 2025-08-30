import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

// Pool of special words that give higher scores
const SPECIAL_WORDS = [
    // Death Note themed words (highest value)
    'death', 'note', 'notebook', 'shinigami', 'ryuk', 'rem', 'kira', 'justice', 'god', 'detective',
    'light', 'yagami', 'lawliet', 'misa', 'amane', 'near', 'mello', 'watari', 'matsuda', 'aizawa',
    'task', 'force', 'investigation', 'criminal', 'judgment', 'punishment', 'sacrifice', 'rules',
    'human', 'world', 'power', 'control', 'fear', 'heart', 'attack', 'name', 'face', 'eyes',
    
    // High-scoring conceptual words
    'wisdom', 'knowledge', 'intelligence', 'strategy', 'mystery', 'secret', 'truth', 'revelation',
    'destiny', 'fate', 'purpose', 'mission', 'quest', 'challenge', 'victory', 'defeat',
    'strength', 'courage', 'bravery', 'honor', 'loyalty', 'betrayal', 'sacrifice', 'redemption',
    'darkness', 'shadow', 'light', 'bright', 'brilliant', 'genius', 'master', 'legend',
    
    // Action and emotion words
    'fight', 'battle', 'struggle', 'overcome', 'achieve', 'accomplish', 'succeed', 'triumph',
    'passion', 'emotion', 'feeling', 'desire', 'ambition', 'dream', 'hope', 'despair',
    'love', 'hate', 'anger', 'peace', 'calm', 'storm', 'chaos', 'order',
    'create', 'destroy', 'build', 'break', 'heal', 'hurt', 'protect', 'attack'
];

// Categories for special words
const CATEGORIES = {
    'death-note': [
        'death', 'note', 'notebook', 'shinigami', 'ryuk', 'rem', 'kira', 'justice', 'god', 'detective',
        'light', 'yagami', 'lawliet', 'misa', 'amane', 'near', 'mello', 'watari', 'matsuda', 'aizawa'
    ],
    'power': [
        'wisdom', 'knowledge', 'intelligence', 'strategy', 'mystery', 'secret', 'truth', 'revelation',
        'strength', 'courage', 'bravery', 'power', 'control', 'master', 'genius', 'brilliant'
    ],
    'action': [
        'fight', 'battle', 'struggle', 'overcome', 'achieve', 'accomplish', 'succeed', 'triumph',
        'create', 'destroy', 'build', 'break', 'heal', 'hurt', 'protect', 'attack'
    ],
    'emotion': [
        'passion', 'emotion', 'feeling', 'desire', 'ambition', 'dream', 'hope', 'despair',
        'love', 'hate', 'anger', 'peace', 'calm', 'fear', 'heart'
    ]
};

export const GET: RequestHandler = async ({ url }) => {
    const countParam = url.searchParams.get('count');
    const categoryParam = url.searchParams.get('category');
    
    const count = countParam ? parseInt(countParam, 10) : 8;
    const category = categoryParam || 'all';
    
    // Validate parameters
    if (isNaN(count) || count < 1 || count > 25) {
        return json({ 
            error: 'Invalid count parameter. Must be between 1 and 25.' 
        }, { status: 400 });
    }
    
    const validCategories = ['all', ...Object.keys(CATEGORIES)];
    if (!validCategories.includes(category)) {
        return json({ 
            error: `Invalid category parameter. Must be one of: ${validCategories.join(', ')}.` 
        }, { status: 400 });
    }
    
    // Select word pool based on category
    let wordPool: string[];
    if (category === 'all') {
        wordPool = SPECIAL_WORDS;
    } else {
        wordPool = CATEGORIES[category as keyof typeof CATEGORIES];
    }
    
    // Generate random special words
    const specialWords: string[] = [];
    const usedIndices = new Set<number>();
    
    for (let i = 0; i < Math.min(count, wordPool.length); i++) {
        let randomIndex: number;
        do {
            randomIndex = Math.floor(Math.random() * wordPool.length);
        } while (usedIndices.has(randomIndex));
        
        usedIndices.add(randomIndex);
        specialWords.push(wordPool[randomIndex]);
    }
    
    return json({
        words: specialWords,
        count: specialWords.length,
        category,
        availableCategories: Object.keys(CATEGORIES),
        scoreMultiplier: 2.5, // Special words give 2.5x score
        timestamp: new Date().toISOString()
    });
};