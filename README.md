# Gumudavelli Vikram — Portfolio

Personal portfolio: work, capabilities, record and contact.

Static site — plain HTML, CSS and JavaScript, no build step. Motion uses [GSAP](https://gsap.com) + ScrollTrigger and [Lenis](https://lenis.darkroom.engineering) smooth scrolling, loaded from public CDNs. If those fail to load, or the visitor has "reduce motion" turned on, the page shows everything without animation.

## Run locally

Serve the folder (opening `index.html` directly also works):

```bash
npx serve .
```

## Deploy

The site is deployed on Vercel from this repository. Every push to `main` goes live automatically.

## Contact form

The form posts to [FormSubmit](https://formsubmit.co). The first time someone submits, FormSubmit sends a one-time activation email to the address in the form; click the link in it and every later message lands in your inbox.

After sending, FormSubmit redirects back to the page the form was sent from (`js/main.js` builds that URL from the current address), so there is no URL to fill in after deploying.

## Structure

```
index.html          page content, including the four case studies (shown in a sheet)
css/style.css       tokens, type, layout, responsive rules
js/main.js          intro, smooth scroll, reveals, project preview, case sheet,
                    cursor, menu, local clock, copy email, form state
assets/vikram.webp  portrait (background removed)
assets/projects/    project illustrations
assets/             CV, favicon
```

## Editing

- Content: edit the sections in `index.html`. Each project has a row in the work list and an `<article class="case">` in the case sheet.
- Colours, spacing and type: the `:root` block at the top of `css/style.css`.
