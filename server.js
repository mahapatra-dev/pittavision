require("dotenv").config();
const express = require("express"), fs = require("fs"), path = require("path"), crypto = require("crypto");
const mongoose = require("mongoose"), multer = require("multer"), jwt = require("jsonwebtoken"), nodemailer = require("nodemailer");

const { ADMIN_PASSWORD, JWT_SECRET, MAIL_PASS } = process.env;
if (!ADMIN_PASSWORD || !JWT_SECRET) {
  console.error("Missing .env file. Copy .env.example to .env and fill ADMIN_PASSWORD and JWT_SECRET.");
  process.exit(1);
}
const MAIL = "pittavision@gmail.com", PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/pittavision";
const UP = path.join(__dirname, "public", "uploads");
fs.mkdirSync(UP, { recursive: true });

const opts = { versionKey: false, timestamps: { createdAt: "date", updatedAt: false }, toJSON: { virtuals: true, transform: (d, r) => { delete r._id; } } };
const str = { type: String, default: "" };
const Inquiry = mongoose.model("Inquiry", new mongoose.Schema({ name: str, contact: str, type: str, package: str, details: str }, opts));
const Message = mongoose.model("Message", new mongoose.Schema({ name: str, contact: str, details: str }, opts));
const Project = mongoose.model("Project", new mongoose.Schema({ title: str, description: str, link: str, image: str }, opts));
const Models = { inquiries: Inquiry, messages: Message, projects: Project };
const h = f => (q, s, n) => f(q, s).catch(n);
const hash = s => crypto.createHash("sha256").update(String(s)).digest();

const mailer = MAIL_PASS ? nodemailer.createTransport({ service: "gmail", auth: { user: MAIL, pass: MAIL_PASS } }) : null;
function notify(subject, o) {
  if (!mailer) return console.warn("MAIL_PASS not set: email skipped (entry is still saved).");
  mailer.sendMail({
    from: MAIL, to: MAIL, subject,
    replyTo: /^\S+@\S+$/.test(o.contact) ? o.contact : undefined,
    text: Object.entries(o).map(([k, v]) => k + ": " + v).join("\n")
  }).catch(e => console.error("Email failed:", e.message));
}

const app = express();
app.disable("x-powered-by");
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

const auth = (q, s, n) => {
  try { jwt.verify((q.headers.authorization || "").slice(7), JWT_SECRET); n(); }
  catch (e) { s.status(401).json({ error: "Please log in again." }); }
};

app.post("/api/login", (q, s) => {
  if (!crypto.timingSafeEqual(hash(q.body.password), hash(ADMIN_PASSWORD))) return s.status(401).json({ error: "Wrong password." });
  s.json({ token: jwt.sign({ admin: true }, JWT_SECRET, { expiresIn: "8h" }) });
});

const clean = (b, keys) => Object.fromEntries(keys.map(k => [k, String(b[k] || "").slice(0, 2000)]));
const add = (kind, keys, label) => app.post("/api/" + kind, h(async (q, s) => {
  const r = clean(q.body, keys);
  if (!r.name || !r.contact) return s.status(400).json({ error: "Name and contact are required." });
  await Models[kind].create(r);
  notify(label + " from " + r.name, r);
  s.json({ ok: true });
}));
add("inquiries", ["name", "contact", "type", "package", "details"], "New website request");
add("messages", ["name", "contact", "details"], "New contact message");

app.get("/api/projects", h(async (q, s) => s.json(await Project.find().sort({ date: -1 }))));
app.get("/api/:kind(inquiries|messages)", auth, h(async (q, s) => s.json(await Models[q.params.kind].find().sort({ date: -1 }))));

const ext = { "image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp" };
const up = multer({
  storage: multer.diskStorage({ destination: UP, filename: (q, f, cb) => cb(null, crypto.randomUUID() + ext[f.mimetype]) }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (q, f, cb) => cb(null, !!ext[f.mimetype])
});
app.post("/api/projects", auth, up.single("photo"), h(async (q, s) => {
  const r = clean(q.body, ["title", "description", "link"]);
  if (!r.title) return s.status(400).json({ error: "Project title is required." });
  r.image = q.file ? "/uploads/" + q.file.filename : "";
  s.json(await Project.create(r));
}));

app.delete("/api/:kind(inquiries|messages|projects)/:id", auth, h(async (q, s) => {
  const item = await Models[q.params.kind].findByIdAndDelete(q.params.id);
  if (item && item.image) fs.unlink(path.join(UP, path.basename(item.image)), () => {});
  s.json({ ok: true });
}));

app.use((e, q, s, n) => s.status(400).json({ error: e.message }));
mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 5000 })
  .then(() => app.listen(PORT, () => console.log("Pitta Vision running at http://localhost:" + PORT)))
  .catch(e => { console.error("Cannot connect to MongoDB (" + MONGO_URI + "). Is MongoDB running?\n" + e.message); process.exit(1); });
