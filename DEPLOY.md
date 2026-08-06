# Deploy to cPanel (GoDaddy hosting)

## 1. Upload
1. Zip everything in this folder **except `netlify.toml`** (Netlify-only, unused here).
2. cPanel → File Manager → open `public_html` (your domain's document root).
3. Upload the zip, then extract it so `index.html` sits directly in `public_html` (not in a subfolder).

## 2. Domain / SEO placeholders
Replace `YOURDOMAIN` with your real domain in `robots.txt` and `sitemap.xml`.

## 3. Leads: storage + email (already wired)
`send-lead.php` runs on your cPanel PHP (no setup needed, cPanel hosting supports PHP + `mail()` out of the box):
- Every contact-form and booking submission is appended to `leads.csv` in the site root (protected from public access by `.htaccess`).
- An email is sent to **care@jphospitals.in** for every lead. To change the recipient, open `send-lead.php` and edit `$HOSPITAL_EMAIL` near the top.
- To review leads, open `leads.csv` from cPanel File Manager, or download it periodically (columns: timestamp, type, name, email, phone, topic, date, time, message, source, ip).
- If GoDaddy's `mail()` lands in spam, set up an SPF/DKIM record for your domain in cPanel → Email Deliverability, or switch to an SMTP-based mailer (ask and I'll wire PHPMailer + your SMTP creds).

Forms still redirect to their thank-you page immediately either way, the email/storage happens in the background.

## 4. HTTPS + caching
`.htaccess` (already included) forces HTTPS, redirects `www` → non-www, blocks direct access to `leads.csv`, and adds basic caching/compression. GoDaddy issues a free SSL cert automatically on most plans, if yours doesn't have one yet, cPanel → SSL/TLS Status → Run AutoSSL.

## 5. Analytics
Add your real GA4 measurement ID and Google Ads conversion snippet in the `<head>` of each page (currently placeholders). `thank-you.html` and `thank-you-booking.html` already push `appointment_request_submitted` / `appointment_booked_confirmed` events to `window.dataLayer` for conversion tracking.

## Pages
- `/` → Home
- `/about.html`
- `/contact.html`
- `/thank-you.html`, `/thank-you-booking.html` (noindex, conversion pages)

## What loads from the internet
three.js (esm.sh), Inter (Google Fonts), the Google Maps embed, Dr. Garg's photo hosted on jphospitals.in.
