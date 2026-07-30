const express = require('express');
const router = express.Router();
const HeroSection = require('../models/HeroSection');
const auth = require('../middleware/auth');
const upload = require('../middleware/upload');

// Normalizes a HeroSection document so the response always has a `slides`
// array, even for legacy documents that only have the old top-level
// image/title/subtitle/buttonName/buttonLink fields.
function withNormalizedSlides(heroDoc) {
  const hero = heroDoc.toObject ? heroDoc.toObject() : heroDoc;

  if (Array.isArray(hero.slides) && hero.slides.length > 0) {
    return hero;
  }

  if (hero.image) {
    hero.slides = [{
      media: hero.image,
      mediaType: 'image',
      title: hero.title || '',
      subtitle: hero.subtitle || '',
      buttonName: hero.buttonName || '',
      buttonLink: hero.buttonLink || ''
    }];
  } else {
    hero.slides = [];
  }

  return hero;
}

// @route   GET /api/hero
// @desc    Get hero section (always returns a `slides` array)
// @access  Public
router.get('/', async (req, res) => {
  try {
    const hero = await HeroSection.findOne();
    res.json(hero ? withNormalizedSlides(hero) : { slides: [] });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   PUT /api/hero
// @desc    Replace all hero slides
// @access  Private
// Body: multipart/form-data
//   - slides: JSON string, array of
//       { media, mediaType, title, subtitle, buttonName, buttonLink }
//     `media` is either an existing media URL to keep, or a placeholder
//     `__file__<fieldname>` referencing a file uploaded in this same
//     request under that fieldname (e.g. `slideMedia_0`).
//   - one file field per new/replaced slide media, named to match the
//     placeholder above.
router.put('/', auth, upload.any(), async (req, res) => {
  try {
    let hero = await HeroSection.findOne();
    if (!hero) {
      hero = new HeroSection();
    }

    if (req.body.slides !== undefined) {
      let parsedSlides;
      try {
        parsedSlides = JSON.parse(req.body.slides);
      } catch {
        return res.status(400).json({ message: 'Format slides tidak valid' });
      }

      if (!Array.isArray(parsedSlides)) {
        return res.status(400).json({ message: 'slides harus berupa array' });
      }

      const files = req.files || [];

      const resolvedSlides = parsedSlides.map((slide) => {
        let media = slide.media || '';

        if (media.startsWith('__file__')) {
          const fieldname = media.replace('__file__', '');
          const file = files.find((f) => f.fieldname === fieldname);
          media = file ? file.path : '';
        }

        return {
          media,
          mediaType: slide.mediaType === 'video' ? 'video' : 'image',
          title: slide.title || '',
          subtitle: slide.subtitle || '',
          buttonName: slide.buttonName || '',
          buttonLink: slide.buttonLink || ''
        };
      });

      hero.slides = resolvedSlides;

      // Keep legacy top-level fields in sync with the first slide so any
      // remaining consumer of the old shape does not break.
      const first = resolvedSlides[0];
      if (first) {
        hero.image = first.mediaType === 'image' ? first.media : hero.image;
        hero.title = first.title;
        hero.subtitle = first.subtitle;
        hero.buttonName = first.buttonName;
        hero.buttonLink = first.buttonLink;
      }
    }

    await hero.save();
    res.json(withNormalizedSlides(hero));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
