const fs = require('fs');
const path = 'd:\\Aplikasi\\APP\\DAKU\\App.tsx';

try {
    const content = fs.readFileSync(path, 'utf8');
    // Handle potentially different line endings by splitting on \n and cleaning \r later if needed, 
    // but usually split(/\r?\n/) is safest.
    const lines = content.split(/\r?\n/);

    // Target: Remove lines 564 to 606 (1-based indices)
    // Array indices: 563 to 605
    // Count: 606 - 564 + 1 = 43 lines.

    // Verification
    console.log(`Deleting block start (Line 564): ${lines[563]}`);
    console.log(`Deleting block end (Line 606): ${lines[605]}`);

    // splice(start, deleteCount)
    lines.splice(563, 43);

    // Join back with standard newline
    const newContent = lines.join('\n');
    fs.writeFileSync(path, newContent, 'utf8');
    console.log('App.tsx cleaned successfully.');
} catch (e) {
    console.error('Error:', e);
    process.exit(1);
}
