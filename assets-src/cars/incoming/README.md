# Incoming 3D car models (staging — not committed)

Drop downloaded car models here, one subfolder per car id:

```
incoming/
├── nodegent/        # Porsche 993 / RUF CTR2 / 959
├── tripweaver/      # McLaren F1 GTR (Longtail)
├── credence/        # Mercedes CLK GTR
└── benefitfinder/   # Ferrari F40 / F40 LM
```

Accepted formats: `.blend`, `.glb`/`.gltf` (+ textures), `.fbx`, `.obj` (+ `.mtl` + textures).
Keep the archive's original file names so textures resolve.

**Include a `source.txt` in each folder** with:
- Model page URL
- Author name
- License as stated on the page (e.g. CC BY 4.0)

The import pipeline (Blender → normalize scale/orientation → material pass →
compressed `.glb` in `public/models/`) picks it up from there. Attribution is
rendered on the garage page from `modelCredit` in `content/cars.ts`.

Only the processed `.blend` in `assets-src/cars/` and the final `.glb` are
committed — this folder is gitignored (except this README).
