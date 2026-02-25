# 📁 Images Folder

Drop your images here and they go live on the website automatically after pushing to GitHub.

## Folder Structure

| Folder | Used for |
|--------|----------|
| `home/` | Homepage images (hero, features, testimonials) |
| `about/` | About page photos (team, office, story) |
| `blog/` | Blog post cover images |
| `product/` | Product page screenshots and demos |

## How to use an image in a page

Once you put `my-photo.jpg` into `public/images/home/`, reference it like this in any Vue page:

```html
<img src="/images/home/my-photo.jpg" alt="Description of photo" />
```

## Tips

- **Supported formats**: `.jpg`, `.jpeg`, `.png`, `.webp`, `.svg`, `.gif`
- **Best format**: Use `.webp` for smallest file size and best quality
- **Recommended max size**: Keep images under 500KB for fast loading
- **Naming**: Use lowercase with hyphens, e.g. `hero-mockup.jpg` not `Hero Mockup.jpg`
