# Gumudavelli Vikram — Portfolio

Personal portfolio site: UI/UX work, projects, education and contact.

Static site — plain HTML, CSS and JavaScript. No build step, no dependencies.

## Run locally

Open `index.html` in a browser, or serve the folder:

```bash
npx serve .
```

## Deploy on Vercel

1. Push this repository to GitHub.
2. In Vercel, click **Add New → Project**, import the repository.
3. Framework preset: **Other**. Leave build command and output directory empty.
4. Deploy.

## Contact form

The form posts to [FormSubmit](https://formsubmit.co). The first time someone submits, FormSubmit sends a one-time activation email to the address in the form; click the link in it and every later message lands in your inbox.

After sending, FormSubmit redirects back to the page the form was sent from (`js/main.js` builds that URL from the current address), so there is no URL to fill in after deploying.

## Structure

```
index.html          page content
css/style.css       design tokens (dark + light), layout, motion, responsive rules
js/main.js          theme switch, grid toggle, mobile menu, active nav, scroll reveals,
                    custom cursor, magnetic buttons, card spotlight, tilt, copy email, form state
assets/             profile photo, CV, favicon
assets/projects/    project illustrations
```

## Editing

- Content: edit the sections in `index.html`.
- Colours, spacing and type: the `:root` block (dark theme) and `:root[data-theme="light"]` block at the top of `css/style.css`.
- The sun/moon button switches themes; the choice is remembered per visitor.
- Motion respects the visitor's "reduce motion" setting: animations, the custom cursor and pointer effects turn off and all content shows immediately.
- Press `G` on the page (or use the Grid button) to see the 8-pt grid and 12-column layout the page is built on.
