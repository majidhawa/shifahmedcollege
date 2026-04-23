# Shifaah Medical Training College - Next.js Starter

This is a full starter project for the medical college website.

## What is included
- Next.js App Router structure
- Separate page folders/files
- Hero slider on the homepage
- Marquee bar for intake and updates
- Courses, admissions, departments, partners, contact, and apply pages
- Demo forms with API routes for UI testing
- Local images placed in `public/images`
- Centralized content in `data/site.ts`

## Before you start
Make sure you have these installed on your laptop:
1. Node.js 18 or newer
2. VS Code
3. Git (optional but helpful)

## Step-by-step setup
1. Download and extract the zip file.
2. Open the extracted folder in VS Code.
3. Open the terminal inside VS Code.
4. Run:

```bash
npm install
```

5. After installation finishes, run:

```bash
npm run dev
```

6. Open your browser and go to:

```text
http://localhost:3000
```

## Build for production
When you want to test a production build:

```bash
npm run build
npm start
```

## Where to edit things
### Main content
Edit all text and structured data here:

```text
data/site.ts
```

This includes:
- school name
- phone/email/location
- intake text
- mission and vision
- core values
- departments
- partner names
- course details

### Homepage
Edit here:

```text
app/page.tsx
```

### About page
```text
app/about/page.tsx
```

### Courses overview
```text
app/courses/page.tsx
```

### Individual course pages
```text
app/courses/caregiving/page.tsx
app/courses/phlebotomy/page.tsx
app/courses/dialysis/page.tsx
```

### Admissions page
```text
app/admissions/page.tsx
```

### Departments page
```text
app/departments/page.tsx
```

### Partners page
```text
app/partners/page.tsx
```

### Contact page
```text
app/contact/page.tsx
```

### Apply page
```text
app/apply/page.tsx
```

## Images
All current local images are inside:

```text
public/images
```

To replace an image:
1. Add your new image in `public/images`
2. Update the path in `data/site.ts` or the relevant page/component file

## Important notes
- Contact and application forms are currently in **demo mode**.
- They are good for UI testing now.
- Later, you can connect them to email using Formspree, Resend, Nodemailer, or your own backend.
- Phone, WhatsApp, and email in `data/site.ts` still need your final real details.
- Some fees and admin details can still be refined without changing the full structure.

## Suggested next edits after running
1. Replace placeholder phone, WhatsApp, and email
2. Confirm final fee wording
3. Replace or add more course images
4. Add real partner logos if needed
5. Connect forms to real email
6. Deploy to Vercel later
