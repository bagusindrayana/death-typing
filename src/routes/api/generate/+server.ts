import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

// Word pools for sentence generation
const COMMON_WORDS = [
    'the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'had', 'her', 'was', 'one', 'our', 'out', 'day', 'get', 'has', 'him', 'his', 'how', 'man', 'new', 'now', 'old', 'see', 'two', 'way', 'who', 'boy', 'did', 'its', 'let', 'put', 'say', 'she', 'too', 'use',
    'run', 'jump', 'walk', 'talk', 'think', 'write', 'read', 'play', 'work', 'help', 'look', 'find', 'give', 'take', 'come', 'make', 'know', 'tell', 'keep', 'turn', 'move', 'live', 'feel', 'show', 'hear', 'leave', 'ask', 'need', 'try', 'call', 'back', 'open', 'close', 'start', 'stop'
];

const PERSON_NAMES = [
    "Satori",
    "Eko Patrio",
    "Uya Kuya",
    "Heri Gunawan",
    "Ahmad Sahroni",
    "Immanuel Ebenezer Gerungan (Noel Ebenezer)",
    "Yusril Ihza Mahendra",
    "Yandri Susanto",
    "Natalius Pigai",
    "Teddy Indra Widaya",
    "Giring Ganesha",
    "Bahlil Lahadalia",
    "Ario Bimo Nandito Ariotedjo (Dito Ariotedjo)",
    "Rini Widyantini",
    "Sri Mulyani"
];

const SPECIAL_WORDS = [
    'dpr','komdigi','kemenag','kemendagri','kementerian kesehatan','kementerian keuangan', 'kementerian pendidikan dan kebudayaan','bumn','presiden'
];

interface GeneratedContent {
    sentence: string;
    words: string[];
    specialWords: string[];
    metadata: {
        commonWordCount: number;
        nameCount: number;
        specialWordCount: number;
        totalWords: number;
    };
}

function generateRandomSentence(wordCount: number = 12): GeneratedContent {
    const sentence: string[] = [];
    const specialWordsInSentence: string[] = [];
    let commonWordCount = 0;
    let nameCount = 0;
    let specialWordCount = 0;
    
    // Ensure at least 1 name and 1-2 special words per sentence
    const targetSpecialWords = Math.min(Math.floor(wordCount * 0.2) + 1, 3);
    const minNames = 1; // Guarantee at least 1 name per sentence
    const targetNames = Math.max(minNames, Math.min(Math.floor(wordCount * 0.15), 2));
    
    for (let i = 0; i < wordCount; i++) {
        const rand = Math.random();
        const wordsRemaining = wordCount - i;
        const namesNeeded = targetNames - nameCount;
        const specialWordsNeeded = targetSpecialWords - specialWordCount;
        
        // Force adding a name if we're running out of words and haven't met the minimum
        if (namesNeeded > 0 && wordsRemaining <= namesNeeded) {
            // Add person name
            const name = PERSON_NAMES[Math.floor(Math.random() * PERSON_NAMES.length)];
            sentence.push(name);
            nameCount++;
        } else if (specialWordsNeeded > 0 && wordsRemaining <= specialWordsNeeded && nameCount >= minNames) {
            // Add special word (only if we already have minimum names)
            const specialWord = SPECIAL_WORDS[Math.floor(Math.random() * SPECIAL_WORDS.length)];
            sentence.push(specialWord);
            specialWordsInSentence.push(specialWord);
            specialWordCount++;
        } else {
            // Normal random distribution
            if (specialWordCount < targetSpecialWords && rand < 0.25) {
                // Add special word
                const specialWord = SPECIAL_WORDS[Math.floor(Math.random() * SPECIAL_WORDS.length)];
                sentence.push(specialWord);
                specialWordsInSentence.push(specialWord);
                specialWordCount++;
            } else if (nameCount < targetNames && rand < 0.3) {
                // Add person name (increased probability to 0.3)
                const name = PERSON_NAMES[Math.floor(Math.random() * PERSON_NAMES.length)];
                sentence.push(name);
                nameCount++;
            } else {
                // Add common word
                const commonWord = COMMON_WORDS[Math.floor(Math.random() * COMMON_WORDS.length)];
                sentence.push(commonWord);
                commonWordCount++;
            }
        }
    }
    
    // Capitalize first word and add punctuation
    if (sentence.length > 0) {
        sentence[0] = sentence[0].charAt(0).toUpperCase() + sentence[0].slice(1);
    }
    
    const sentenceText = sentence.join(' ');
    const punctuation = Math.random() < 0.7 ? '.' : (Math.random() < 0.5 ? '!' : '?');
    
    return {
        sentence: sentenceText + punctuation,
        words: sentence,
        specialWords: specialWordsInSentence,
        metadata: {
            commonWordCount,
            nameCount,
            specialWordCount,
            totalWords: sentence.length
        }
    };
}

export const GET: RequestHandler = async ({ url }) => {
    const countParam = url.searchParams.get('count');
    const wordsPerSentenceParam = url.searchParams.get('wordsPerSentence');
    
    const count = countParam ? parseInt(countParam, 10) : 5;
    const wordsPerSentence = wordsPerSentenceParam ? parseInt(wordsPerSentenceParam, 10) : 12;
    
    // Validate parameters
    if (isNaN(count) || count < 1 || count > 20) {
        return json({ 
            error: 'Invalid count parameter. Must be between 1 and 20.' 
        }, { status: 400 });
    }
    
    if (isNaN(wordsPerSentence) || wordsPerSentence < 5 || wordsPerSentence > 25) {
        return json({ 
            error: 'Invalid wordsPerSentence parameter. Must be between 5 and 25.' 
        }, { status: 400 });
    }
    
    // Generate sentences
    const generatedContent: GeneratedContent[] = [];
    for (let i = 0; i < count; i++) {
        generatedContent.push(generateRandomSentence(wordsPerSentence));
    }
    
    // Combine all special words for easy reference
    const allSpecialWords = [...new Set(generatedContent.flatMap(content => content.specialWords))];
    
    return json({
        sentences: generatedContent.map(content => content.sentence),
        generatedContent,
        specialWords: allSpecialWords,
        personNames: PERSON_NAMES, // Include person names for client-side validation
        statistics: {
            totalSentences: generatedContent.length,
            averageWordsPerSentence: generatedContent.reduce((sum, content) => sum + content.metadata.totalWords, 0) / generatedContent.length,
            totalSpecialWords: allSpecialWords.length
        },
        timestamp: new Date().toISOString()
    });
};