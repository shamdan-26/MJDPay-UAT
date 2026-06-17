import { writeFileSync } from 'fs';

async function globalTeardown() {
    // Clear session.json so no authenticated state persists between runs
    writeFileSync('session.json', JSON.stringify({ cookies: [], origins: [] }));
}

export default globalTeardown;
