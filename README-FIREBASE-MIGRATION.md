# RankOutbid — Firebase Migration

Express + SQLite backend hata diya gaya hai. Ab pura app client-side hai,
Firebase handle karta hai: real-time DB, file storage, aur admin auth.

## Kya badla

| Pehle (Express/SQLite)        | Ab (Firebase)                          |
|--------------------------------|------------------------------------------|
| `server/index.js` (Express API)| Deleted — no server needed              |
| SQLite `submissions` table     | Firestore `submissions` collection      |
| JWT admin login                | Firebase Auth (email/password)          |
| `multer` local file upload     | Firebase Storage (`payment_screenshots/`)|
| Polling every 5s on frontend   | Real-time `onSnapshot` listener          |
| YouTube oEmbed via server      | Fetched directly from client             |

## Setup

1. **Firebase project banao** → console.firebase.google.com → Add project.
2. **Firestore Database** enable karo (production mode).
3. **Storage** enable karo.
4. **Authentication** → Email/Password provider enable karo.
5. Firebase console se **Web app** add karo, config values `.env` mein daalo
   (`.env.example` ko `.env` mein copy karke):
   ```
   cp .env.example .env
   ```
6. **Admin banane ke liye:**
   - Authentication tab mein ek user create karo (email/password).
   - Firestore mein manually ek document banao: collection `admins`,
     document ID = us user ka **UID** (Authentication tab se copy karo), fields khaali chhod sakte ho.
   - Yehi doc ki presence hi admin access decide karti hai — client-side kuch bhi trust nahi hota.
7. **Rules deploy karo** (Firebase CLI se):
   ```
   firebase deploy --only firestore:rules,storage:rules
   ```
   (`firestore.rules` aur `storage.rules` already is repo mein hain.)
8. Install & run:
   ```
   npm install
   npm run dev
   ```
9. **Deploy/hosting**: ab ye pure static site hai (`npm run build` → `dist/`),
   Firebase Hosting, Vercel, Netlify — kahin bhi deploy ho sakta hai.

## Security notes

- Public users sirf `status: 'approved'` waali entries padh sakte hain — pending/rejected
  sirf admin ko dikhti hain (Firestore rules se enforce).
- Payment screenshots sirf admin read kar sakta hai (Storage rules se enforce) — public URL
  ban to jaata hai upload ke baad, par rules ke bina koi access nahi milta.
- Bid amount minimum ₹10 aur required fields — Firestore rules mein bhi validate hote hain,
  sirf client-side JS validation pe depend nahi karte (kyunki client-side checks bypass ho sakte hain).
- Admin status sirf `admins/{uid}` collection ki presence se decide hota hai, kabhi bhi
  client-side flag/localStorage se nahi.

## Abhi bhi manual step hai

Payment verification abhi bhi **manual** hai (UTR dekh ke admin approve karta hai) —
ye Firebase migration sirf infra badalta hai, payment gateway integrate nahi karta.
Agar chaho to isse aage Cashfree jaisa real payment gateway add kar sakte hain
taaki UTR manually na daalna pade aur payment automatically verify ho.
