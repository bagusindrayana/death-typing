import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

// Pool of person names for typing practice
const FIRST_NAMES = [
    // Death Note inspired names
    'Light', 'L', 'Misa', 'Near', 'Mello', 'Ryuk', 'Rem', 'Watari', 'Matsuda', 'Aizawa',
    
    // Common first names
    'John', 'Jane', 'Michael', 'Sarah', 'David', 'Lisa', 'Chris', 'Emma', 'Alex', 'Anna',
    'James', 'Mary', 'Robert', 'Patricia', 'William', 'Jennifer', 'Richard', 'Linda', 'Joseph', 'Elizabeth',
    'Thomas', 'Barbara', 'Charles', 'Susan', 'Christopher', 'Jessica', 'Daniel', 'Nancy', 'Matthew', 'Dorothy',
    'Anthony', 'Helen', 'Mark', 'Sharon', 'Donald', 'Michelle', 'Steven', 'Laura', 'Paul', 'Sarah',
    'Andrew', 'Kimberly', 'Kenneth', 'Deborah', 'Joshua', 'Dorothy', 'Kevin', 'Amy', 'Brian', 'Angela'
];

const LAST_NAMES = [
    // Death Note inspired surnames
    'Yagami', 'Lawliet', 'Amane', 'River', 'Keehl', 'Mikami', 'Takada', 'Misora', 'Penber', 'Raye',
    
    // Common surnames
    'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez',
    'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin',
    'Lee', 'Perez', 'Thompson', 'White', 'Harris', 'Sanchez', 'Clark', 'Ramirez', 'Lewis', 'Robinson',
    'Walker', 'Young', 'Allen', 'King', 'Wright', 'Scott', 'Torres', 'Nguyen', 'Hill', 'Flores'
];

export const GET: RequestHandler = async ({ url }) => {
    const countParam = url.searchParams.get('count');
    const formatParam = url.searchParams.get('format'); // 'full', 'first', 'last'
    
    const count = countParam ? parseInt(countParam, 10) : 5;
    const format = formatParam || 'full';
    
    // Validate parameters
    if (isNaN(count) || count < 1 || count > 20) {
        return json({ 
            error: 'Invalid count parameter. Must be between 1 and 20.' 
        }, { status: 400 });
    }
    
    if (!['full', 'first', 'last'].includes(format)) {
        return json({ 
            error: 'Invalid format parameter. Must be "full", "first", or "last".' 
        }, { status: 400 });
    }
    
    // Generate random names
    const names: string[] = [];
    for (let i = 0; i < count; i++) {
        const firstName = FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)];
        const lastName = LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)];
        
        switch (format) {
            case 'first':
                names.push(firstName);
                break;
            case 'last':
                names.push(lastName);
                break;
            case 'full':
            default:
                names.push(`${firstName} ${lastName}`);
                break;
        }
    }
    
    return json({
        names,
        count: names.length,
        format,
        timestamp: new Date().toISOString()
    });
};