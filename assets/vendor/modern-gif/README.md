# modern-gif 2.1.0

Vendored browser distribution from [qq15725/modern-gif](https://github.com/qq15725/modern-gif), licensed under MIT (see `LICENSE`).

This project uses one focused dependency for GIF89a parsing, frame decoding, palette quantization, dithering, and encoding. The library's dedicated worker build decodes uploaded GIFs away from the UI thread. Final export runs inside the editor's own worker, where `modern-gif` performs palette generation and encoding without a network request.

The files are stored locally so the static GitHub Pages editor has no runtime CDN dependency and uploaded images never leave the browser.
