# Puzzle Design

## Principles
- Puzzles must feel like investigation, not unrelated escape-room riddles.
- Passwords come from character knowledge, not arbitrary cipher trivia.
- The player should ask 'what does this person value/remember?' rather than 'what random number fits?'
- Forensics are simplified but internally consistent.

## Puzzle families

### 1. Contextual locks
Use birthdays, remembered phrases, project codes, device patterns, or relationship facts.
Avoid excessive four-digit PIN repetition.

### 2. Metadata contradictions
Compare photo creation/modification time, device, location, upload history.

### 3. Message chronology
Recover deleted/archived messages and place them around known events.

### 4. GRAPH correlations
Choose which evidence actually supports an edge. False correlations can raise confidence temporarily but cannot complete authored deductions.

### 5. Identity deduction
F17 = Maral should be the showcase multi-clue deduction.

### 6. Decoy topology
Late puzzle: identify that suspicious edges point to Tenuun because edge sources were intentionally arranged, not because he is an actual criminal coordinator.

## Difficulty curve
- opening: trivial familiarity / learn UI;
- early: 2-source comparisons;
- middle: 3-source contradictions;
- reveal: cross-app multi-clue deduction;
- finale: moral consequence + system understanding, not a harder cipher.

## Anti-patterns
- no Sudoku-like inserts;
- no unexplained cryptography expertise;
- no 'guess the author's pun' gating;
- no clue hidden behind pixel hunting without accessibility alternative.
