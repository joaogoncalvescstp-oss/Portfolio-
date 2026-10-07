# João Lleto — Portfolio

A static portfolio site (no build step) rendered with [three.js](https://threejs.org) `WebGPURenderer`. It falls back to WebGL 2 automatically on browsers without WebGPU.

- **Hero:** a GPU-animated particle wave written in TSL (`js/hero.js`)
- **3D viewer:** an interactive model with orbit/zoom/pan, auto-rotate, wireframe, material swatches and fullscreen (`js/viewer.js`)

## Run locally

```sh
python3 -m http.server 8000
# open http://localhost:8000   (add ?webgl to force the WebGL 2 backend)
```

## Deploy

Push to GitHub and enable **Settings → Pages → Deploy from branch** (root folder). Netlify, Vercel and Cloudflare Pages also work with no configuration.

## The model

`assets/models/ring.glb` was converted from the original Vectary export (`Project Name.obj`, 176 MB, 821k triangles) with:

```sh
npx obj2gltf -i "Project Name.obj" -o raw.glb
# UVs removed (the export had no textures), then:
npx @gltf-transform/cli join raw.glb b.glb
npx @gltf-transform/cli weld b.glb c.glb
npx @gltf-transform/cli simplify c.glb d.glb --ratio 0.35 --error 0.0005
npx @gltf-transform/cli meshopt d.glb ring.glb
```

The result is 1.8 MB with about 290k triangles. To show a different model, replace the file or edit `MODELS` in `js/viewer.js`.

## Editing content

Text placeholders are marked `TODO` in `index.html` (bio, contact email). Project photos live in `assets/img/` as WebP (full size plus an 800px `-thumb`), resized and stripped of metadata from the originals.

`assets/models/cabinet.glb` (the mosaic cabinet) came from a second Vectary export. Its studio backdrop was removed, the two diffuse textures it uses were resized to 1024 px, and it was compressed with `gltf-transform meshopt` (1.1 MB). It keeps its original materials, so the colour swatches are hidden for it.
