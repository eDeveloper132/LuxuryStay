const EMAIL_RE = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i;
const DATE_RE = /\b(20\d{2}-\d{2}-\d{2})\b/g;
// Room ID (24 hex) and Room Number (words+digs) regexes:
const ROOM_ID_RE = /\b([0-9a-fA-F]{24})\b/;
const ROOM_NUMBER_RE = /\b(?:room(?:\s*number)?|rm|#)\s*([A-Za-z0-9\-]{1,8})\b/i;
const GUESTS_RE = /\b(?:guests?|people|persons|pax)\s*(?:\:|\-)?\s*(\d{1,2})\b/i;
export function parseBookingFromPrompt(prompt) {
    const out = {};
    if (!prompt)
        return out;
    // email
    const emailMatch = prompt.match(EMAIL_RE);
    if (emailMatch)
        out.email = emailMatch[1].toLowerCase();
    // dates (first two yyyy-mm-dd)
    const dates = [...(prompt.matchAll(DATE_RE))].map(m => m[1]);
    if (dates.length >= 1)
        out.checkIn = dates[0];
    if (dates.length >= 2)
        out.checkOut = dates[1];
    // room id (24-hex)
    const roomMatch = prompt.match(ROOM_ID_RE);
    if (roomMatch)
        out.room = roomMatch[1];
    // room number (human number like "room 101" or "#101" or "rm 101")
    const roomNumMatch = prompt.match(ROOM_NUMBER_RE);
    if (roomNumMatch)
        out.roomNumber = roomNumMatch[1];
    // guests
    const guestsMatch = prompt.match(GUESTS_RE);
    if (guestsMatch)
        out.guests = Number(guestsMatch[1]);
    // name: try text preceding email or "name ..." patterns
    if (out.email) {
        const idx = prompt.indexOf(out.email);
        if (idx > -1) {
            const before = prompt.slice(Math.max(0, idx - 60), idx);
            const nameRe = /(?:name\s*(?:is)?\s*[:\-]?\s*)([A-Za-z\s'.-]{2,50})$/i;
            const nm = before.match(nameRe);
            if (nm)
                out.name = nm[1].trim();
            else {
                const tokens = before.trim().split(/\s+/).filter(Boolean);
                if (tokens.length >= 2) {
                    const candidate = tokens.slice(-2).join(' ');
                    if (/^[A-Za-z\s'.-]{2,50}$/.test(candidate))
                        out.name = candidate;
                }
            }
        }
    }
    else {
        const nameAnywhere = prompt.match(/name\s*(?:is)?\s*[:\-]?\s*([A-Za-z\s'.-]{2,50})/i);
        if (nameAnywhere)
            out.name = nameAnywhere[1].trim();
    }
    return out;
}
