# Pitta Vision Website

## VS Code me chalane ke steps
1. Node.js (LTS) aur MongoDB install hona chahiye. MongoDB chalu rakho (Windows me service apne aap chalti hai, ya `mongod` chalao).
2. VS Code me ye folder kholo: File > Open Folder.
3. Terminal kholo (Ctrl + `) aur chalao: `npm install`
4. `.env.example` ko copy karke `.env` naam do. Usme `ADMIN_PASSWORD` aur `JWT_SECRET` apna likho.
5. Email ke liye `MAIL_PASS` me pittavision@gmail.com ka Gmail App Password daalo
   (Google Account > Security > 2-Step Verification on > App passwords).
   Ye khali rahe to forms save honge par email nahi jayegi.
6. `npm start` chalao aur browser me http://localhost:3000 kholo.
7. Admin: http://localhost:3000/#/admin (password wahi jo .env me likha).

## Kya kya hai
- Public site: 7 pages + footer. Forms ka data MongoDB (database: `pittavision`) me save hota hai aur pittavision@gmail.com par email jata hai.
- Admin: portfolio projects photo ke saath add/delete, inquiries aur messages dekhna/delete karna (JWT login).
- Photos `public/uploads` me save hoti hain.
- Database: MongoDB (mongoose). Atlas use karna ho to `.env` me `MONGO_URI` badal do.
