# Food For Free

This GitHub repository contains the code behind [Food For Free](https://foodforfree.org/)'s recipient partner portal.

**Project Manager (PM):** Riddhi Sahni
**Technical Lead (TL):** Benjamin Li

---

## 1. Install Prerequisites

Make sure you have the following installed:

* **Node.js** (LTS recommended) → [Download here](https://nodejs.org/en/download)
  Verify installation:

  ```bash
  node -v
  npm -v
  ```
* **Git** → [Download here](https://git-scm.com/downloads)
  Verify installation:

  ```bash
  git --version
  ```

---

## 2. Clone the Repository

```bash
git clone https://github.com/JumboCode/food-for-free.git
cd food-for-free
```

---

## 3. Install Dependencies

Inside the project folder:

```bash
npm install
```

---

## 4. Stay Up To Date

Before starting development for each sprint, make sure you pull the latest changes and install new dependencies:

```bash
git pull origin main
npm install
```

---

## 5. Start the Development Server

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Then open [http://localhost:3000](http://localhost:3000) in your browser.

You can edit the app by modifying `app/page.tsx`. The page auto-updates as you edit the file.

---

## 6. Workflow Notes

* Always `git pull` before making changes.
* Create a new branch for your work:

  ```bash
  git checkout -b <branch-name>
  ```
* Commit and push your branch, then open a Pull Request (PR) for review.

### Branch Naming Convention

Branches should follow this format:

`<sprintnumber>/<feature-name>`
**Sprint Number:** the sprint number (starting at 0 for the first week's sprint, then incrementing).
**Feature name:** short, descriptive, and use dashes between words.

**Examples:**

0/add-weather-button
1/create-login-page

---

## Learn More

* [Node.js Docs](https://nodejs.org/docs)
* [Git Docs](https://git-scm.com/doc)
* [Next.js Docs](https://nextjs.org/docs)
* [Interactive Next.js Tutorial](https://nextjs.org/learn)

---

## Deploy on Vercel

We use [Vercel](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) for deployment.
See [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for details.
