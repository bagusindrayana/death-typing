import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

// Pool of random words for typing practice
const WORD_POOL = [
    // Common words
    'the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'had', 'her', 'was', 'one', 'our', 'out', 'day', 'get', 'has', 'him', 'his', 'how', 'man', 'new', 'now', 'old', 'see', 'two', 'way', 'who', 'boy', 'did', 'its', 'let', 'put', 'say', 'she', 'too', 'use',
    
    // Action words
    'run', 'jump', 'walk', 'talk', 'think', 'write', 'read', 'play', 'work', 'help', 'look', 'find', 'give', 'take', 'come', 'make', 'know', 'tell', 'keep', 'turn', 'move', 'live', 'feel', 'show', 'hear', 'leave', 'ask', 'need', 'try', 'call', 'back', 'open', 'close', 'start', 'stop',
    
    // Objects
    'book', 'door', 'window', 'table', 'chair', 'computer', 'phone', 'house', 'car', 'tree', 'water', 'food', 'paper', 'pen', 'light', 'fire', 'music', 'money', 'time', 'place', 'world', 'life', 'hand', 'eye', 'head', 'face', 'body', 'heart', 'mind', 'voice', 'word', 'line', 'right', 'left',
    
    // Descriptive words
    'good', 'great', 'small', 'large', 'long', 'short', 'high', 'low', 'fast', 'slow', 'hot', 'cold', 'warm', 'cool', 'dark', 'light', 'bright', 'beautiful', 'ugly', 'strong', 'weak', 'easy', 'hard', 'soft', 'loud', 'quiet', 'clean', 'dirty', 'fresh', 'old', 'young', 'happy', 'sad', 'angry', 'calm'
];

export const GET: RequestHandler = async ({ url }) => {
    const countParam = url.searchParams.get('count');
    const count = countParam ? parseInt(countParam, 10) : 10;
    
    // Validate count parameter
    if (isNaN(count) || count < 1 || count > 50) {
        return json({ 
            error: 'Invalid count parameter. Must be between 1 and 50.' 
        }, { status: 400 });
    }
    
    // Generate random words
    const randomWords: string[] = [];
    for (let i = 0; i < count; i++) {
        const randomIndex = Math.floor(Math.random() * WORD_POOL.length);
        randomWords.push(WORD_POOL[randomIndex]);
    }
    
    return json({
        words: randomWords,
        count: randomWords.length,
        timestamp: new Date().toISOString()
    });
};