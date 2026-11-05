/**
 * Client-Side Smart Background Removal Tool for Logos & Graphics
 *
 * Removes white, light, solid, or baked-in checkerboard (grey/white grid) backgrounds
 * from logos completely on the client side, converting them to clean, transparent PNGs
 * with smooth anti-aliased edges, inner letter-hole clearing, and color decontamination.
 */

import { getCachedUploadUrl, resolveUploadUrl } from './fileUploader';

export interface BgRemovalOptions {
  tolerance?: number; // 10 - 80 (default 35)
  mode?: 'flood' | 'all'; // 'flood' = smart border + letter holes, 'all' = remove all white/checkerboard everywhere
  customColor?: { r: number; g: number; b: number } | null;
  feather?: boolean;
}

interface ColorCluster {
  r: number;
  g: number;
  b: number;
  count: number;
}

// Perceptual color distance (0 to ~765)
const perceptualColorDist = (
  r1: number,
  g1: number,
  b1: number,
  r2: number,
  g2: number,
  b2: number
): number => {
  const rmean = (r1 + r2) >> 1;
  const rDiff = r1 - r2;
  const gDiff = g1 - g2;
  const bDiff = b1 - b2;
  return Math.sqrt(
    (((512 + rmean) * rDiff * rDiff) >> 8) +
      4 * gDiff * gDiff +
      (((767 - rmean) * bDiff * bDiff) >> 8)
  );
};

/**
 * Resolves any image source (including virtual `/uploads/...` Firestore paths,
 * cached blob URLs, or remote URLs) into a loadable URL for off-DOM `new Image()`.
 */
export const resolveImageSourceForCanvas = async (imageSrc: string): Promise<string> => {
  if (!imageSrc) return '';
  const trimmed = imageSrc.trim();

  if (trimmed.startsWith('data:') || trimmed.startsWith('blob:')) {
    return trimmed;
  }

  // 1. Check synchronous memory cache first
  const cached = getCachedUploadUrl(trimmed);
  if (cached && (cached.startsWith('blob:') || cached.startsWith('data:'))) {
    return cached;
  }

  // 2. Resolve `/uploads/...` from Firestore `uploaded_files`
  if (trimmed.startsWith('/uploads/') || trimmed.includes('/uploads/')) {
    try {
      const resolved = await resolveUploadUrl(trimmed);
      if (resolved && (resolved.startsWith('blob:') || resolved.startsWith('data:'))) {
        return resolved;
      }
    } catch (e) {
      console.warn('Failed to resolve upload URL from Firestore:', e);
    }
  }

  // 3. Try fetching as a Blob so canvas never suffers CORS tainting or path issues
  try {
    const resp = await fetch(trimmed);
    if (resp.ok) {
      const contentType = resp.headers.get('content-type') || '';
      if (contentType.startsWith('image/')) {
        const blob = await resp.blob();
        return URL.createObjectURL(blob);
      }
    }
  } catch {
    // Ignore fetch error and fall back to original string
  }

  return trimmed;
};

export const removeImageBackground = async (
  imageSrc: string,
  options: BgRemovalOptions = {}
): Promise<string> => {
  if (!imageSrc) return '';

  const loadableSrc = await resolveImageSourceForCanvas(imageSrc);

  return new Promise((resolve) => {
    const img = new Image();
    if (!loadableSrc.startsWith('data:') && !loadableSrc.startsWith('blob:')) {
      img.crossOrigin = 'anonymous';
    }

    img.onload = () => {
      try {
        let width = img.naturalWidth || img.width;
        let height = img.naturalHeight || img.height;

        if (!width || !height) {
          resolve(loadableSrc);
          return;
        }

        // Cap dimension for fast client-side processing while preserving crisp HD quality
        const maxDim = 1200;
        if (width > maxDim || height > maxDim) {
          if (width >= height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, width);
        canvas.height = Math.max(1, height);
        const ctx = canvas.getContext('2d', { willReadFrequently: true });

        if (!ctx) {
          resolve(loadableSrc);
          return;
        }

        ctx.clearRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        const imgData = ctx.getImageData(0, 0, width, height);
        const data = imgData.data;
        const totalPixels = width * height;

        const tolerance = options.tolerance ?? 35;
        const mode = options.mode ?? 'flood';
        const feather = options.feather ?? true;

        // 1. Sample border pixels along all 4 edges (and 2px inset) to build a multi-color background palette
        // This handles both solid backgrounds AND baked-in grey/white checkerboard grids!
        const clusters: ColorCluster[] = [];
        let neutralBorderSamples = 0;
        let totalBorderSamples = 0;

        const addSample = (x: number, y: number) => {
          if (x < 0 || x >= width || y < 0 || y >= height) return;
          const idx = (y * width + x) * 4;
          const a = data[idx + 3];
          if (a < 128) return; // Already transparent

          const r = data[idx];
          const g = data[idx + 1];
          const b = data[idx + 2];

          totalBorderSamples++;
          const maxC = Math.max(r, g, b);
          const minC = Math.min(r, g, b);
          const chroma = maxC - minC;
          const luma = 0.299 * r + 0.587 * g + 0.114 * b;
          if (chroma <= 30 && luma >= 135) {
            neutralBorderSamples++;
          }

          // Find closest existing cluster within perceptual distance 45
          for (let i = 0; i < clusters.length; i++) {
            const c = clusters[i];
            if (perceptualColorDist(r, g, b, c.r, c.g, c.b) <= 45) {
              c.r = Math.round((c.r * c.count + r) / (c.count + 1));
              c.g = Math.round((c.g * c.count + g) / (c.count + 1));
              c.b = Math.round((c.b * c.count + b) / (c.count + 1));
              c.count++;
              return;
            }
          }
          clusters.push({ r, g, b, count: 1 });
        };

        if (options.customColor) {
          clusters.push({
            r: options.customColor.r,
            g: options.customColor.g,
            b: options.customColor.b,
            count: 100,
          });
        } else {
          const stepX = Math.max(1, Math.floor(width / 80));
          const stepY = Math.max(1, Math.floor(height / 80));
          const insetX = Math.min(3, Math.floor(width / 20));
          const insetY = Math.min(3, Math.floor(height / 20));

          for (let x = 0; x < width; x += stepX) {
            addSample(x, 0);
            addSample(x, height - 1);
            addSample(x, insetY);
            addSample(x, height - 1 - insetY);
          }
          for (let y = 0; y < height; y += stepY) {
            addSample(0, y);
            addSample(width - 1, y);
            addSample(insetX, y);
            addSample(width - 1 - insetX, y);
          }
        }

        // Sort clusters by frequency and keep topclusters that represent at least 3% of border samples
        clusters.sort((a, b) => b.count - a.count);
        const minClusterCount = Math.max(2, Math.floor(totalBorderSamples * 0.03));
        const activeClusters = clusters
          .filter((c, idx) => idx === 0 || c.count >= minClusterCount)
          .slice(0, 6);

        if (activeClusters.length === 0) {
          activeClusters.push({ r: 255, g: 255, b: 255, count: 1 });
        }

        // Determine if the background is neutral (white, light grey, or grey/white checkerboard)
        const isNeutralBg =
          totalBorderSamples === 0 || neutralBorderSamples / totalBorderSamples >= 0.55;

        // If neutral/checkerboard background, ensure pure white (255,255,255) and standard checkerboard grey (204,204,204 & 230,230,230) are covered
        if (isNeutralBg && !options.customColor) {
          const ensureCluster = (r: number, g: number, b: number) => {
            if (!activeClusters.some((c) => perceptualColorDist(r, g, b, c.r, c.g, c.b) <= 35)) {
              activeClusters.push({ r, g, b, count: 1 });
            }
          };
          ensureCluster(255, 255, 255);
          ensureCluster(235, 235, 235);
          ensureCluster(204, 204, 204);
        }

        // Perceptual tolerance distance threshold
        const tolDist = tolerance * 4.5;
        const maxNeutralChroma = Math.min(65, Math.round(14 + tolerance * 0.65));
        const minNeutralLuma = Math.max(115, Math.round(215 - tolerance * 1.35));

        /**
         * Computes how closely a pixel (r,g,b) matches the background.
         * Returns a normalized ratio where:
         *   <= 1.0 means background match
         *   > 1.0 means foreground
         */
        const getBgRatio = (r: number, g: number, b: number): number => {
          const maxC = Math.max(r, g, b);
          const minC = Math.min(r, g, b);
          const chroma = maxC - minC;
          const luma = 0.299 * r + 0.587 * g + 0.114 * b;

          // Strongly protect vivid colored foreground pixels (like red "HB" logo) when background is neutral
          if (isNeutralBg && chroma > maxNeutralChroma + 18) {
            return 2.5;
          }

          let minDist = Infinity;
          for (let i = 0; i < activeClusters.length; i++) {
            const c = activeClusters[i];
            const d = perceptualColorDist(r, g, b, c.r, c.g, c.b);
            if (d < minDist) minDist = d;
          }

          let ratio = minDist / Math.max(1, tolDist);

          // Special handling for neutral/checkerboard backgrounds (white & grey grid squares + anti-aliased transitions between squares)
          if (isNeutralBg && chroma <= maxNeutralChroma && luma >= minNeutralLuma) {
            const chromaRatio = chroma / Math.max(1, maxNeutralChroma);
            const lumaRatio =
              luma >= 200
                ? 0
                : (200 - luma) / Math.max(1, 200 - minNeutralLuma);
            const neutralRatio = Math.max(chromaRatio * 0.85, lumaRatio * 0.85);
            if (neutralRatio < ratio) {
              ratio = neutralRatio;
            }
          }

          return ratio;
        };

        // Background mask: 1 = removed background, 0 = foreground
        const bgMask = new Uint8Array(totalPixels);
        const bgRatioMap = new Float32Array(totalPixels);

        for (let i = 0; i < totalPixels; i++) {
          const idx = i * 4;
          if (data[idx + 3] === 0) {
            bgRatioMap[i] = 0;
          } else {
            bgRatioMap[i] = getBgRatio(data[idx], data[idx + 1], data[idx + 2]);
          }
        }

        if (mode === 'flood') {
          // Step A: 8-connected Flood Fill from all 4 outer edges
          const visited = new Uint8Array(totalPixels);
          const queue = new Int32Array(totalPixels);
          let head = 0;
          let tail = 0;

          const enqueueIfCandidate = (p: number) => {
            if (visited[p]) return;
            visited[p] = 1;
            if (bgRatioMap[p] <= 1.0) {
              bgMask[p] = 1;
              queue[tail++] = p;
            }
          };

          for (let x = 0; x < width; x++) {
            enqueueIfCandidate(x);
            enqueueIfCandidate((height - 1) * width + x);
          }
          for (let y = 1; y < height - 1; y++) {
            enqueueIfCandidate(y * width);
            enqueueIfCandidate(y * width + (width - 1));
          }

          while (head < tail) {
            const p = queue[head++];
            const px = p % width;
            const py = Math.floor(p / width);

            // 8-connected neighbors so diagonal checkerboard corners never block flood fill
            for (let dy = -1; dy <= 1; dy++) {
              const ny = py + dy;
              if (ny < 0 || ny >= height) continue;
              for (let dx = -1; dx <= 1; dx++) {
                if (dx === 0 && dy === 0) continue;
                const nx = px + dx;
                if (nx < 0 || nx >= width) continue;
                enqueueIfCandidate(ny * width + nx);
              }
            }
          }

          // Step B: Enclosed Counter-Holes Detection (e.g. inside the two loops of the letter 'B')
          // Any enclosed region of background-matching pixels that is a distinct hole (>= 12px)
          // and has a strong match to the background/checkerboard palette is also cleared!
          const holeVisited = new Uint8Array(totalPixels);
          const componentBuf = new Int32Array(totalPixels);
          const minHolePixels = Math.max(10, Math.round(totalPixels * 0.00018));

          for (let i = 0; i < totalPixels; i++) {
            if (bgMask[i] || holeVisited[i] || bgRatioMap[i] > 0.92) continue;

            // BFS to measure enclosed candidate island
            let cHead = 0;
            let cTail = 0;
            let strictMatchCount = 0;
            let hasCheckerboardVariance = false;
            let minLumaInHole = 255;
            let maxLumaInHole = 0;

            holeVisited[i] = 1;
            componentBuf[cTail++] = i;

            while (cHead < cTail) {
              const curr = componentBuf[cHead++];
              const cx = curr % width;
              const cy = Math.floor(curr / width);
              const cIdx = curr * 4;
              const luma =
                0.299 * data[cIdx] + 0.587 * data[cIdx + 1] + 0.114 * data[cIdx + 2];
              if (luma < minLumaInHole) minLumaInHole = luma;
              if (luma > maxLumaInHole) maxLumaInHole = luma;

              if (bgRatioMap[curr] <= 0.65) {
                strictMatchCount++;
              }

              // 4-connected for interior holes
              if (cx > 0) {
                const n = curr - 1;
                if (!bgMask[n] && !holeVisited[n] && bgRatioMap[n] <= 0.95) {
                  holeVisited[n] = 1;
                  componentBuf[cTail++] = n;
                }
              }
              if (cx < width - 1) {
                const n = curr + 1;
                if (!bgMask[n] && !holeVisited[n] && bgRatioMap[n] <= 0.95) {
                  holeVisited[n] = 1;
                  componentBuf[cTail++] = n;
                }
              }
              if (cy > 0) {
                const n = curr - width;
                if (!bgMask[n] && !holeVisited[n] && bgRatioMap[n] <= 0.95) {
                  holeVisited[n] = 1;
                  componentBuf[cTail++] = n;
                }
              }
              if (cy < height - 1) {
                const n = curr + width;
                if (!bgMask[n] && !holeVisited[n] && bgRatioMap[n] <= 0.95) {
                  holeVisited[n] = 1;
                  componentBuf[cTail++] = n;
                }
              }
            }

            if (maxLumaInHole - minLumaInHole >= 15) {
              hasCheckerboardVariance = true;
            }

            // Clear the enclosed hole if it's large enough and strongly matches the background
            if (
              cTail >= minHolePixels &&
              (strictMatchCount / cTail >= 0.6 || hasCheckerboardVariance)
            ) {
              for (let k = 0; k < cTail; k++) {
                bgMask[componentBuf[k]] = 1;
              }
            }
          }
        } else {
          // Global removal mode ('all'): remove all matching background/white/checkerboard pixels everywhere
          for (let i = 0; i < totalPixels; i++) {
            if (bgRatioMap[i] <= 1.0) {
              bgMask[i] = 1;
            }
          }
        }

        // Apply transparency to all masked background pixels
        for (let i = 0; i < totalPixels; i++) {
          if (bgMask[i]) {
            data[i * 4 + 3] = 0;
          }
        }

        // 3. Edge Anti-Aliasing & Color Decontamination (Anti-Halo Defringing)
        // Removes the 1-2px white/grey fringe around colored logos (e.g. red "HB")
        if (feather) {
          const primaryBg = activeClusters[0];
          const edgeAlpha = new Int16Array(totalPixels);
          edgeAlpha.fill(-1);

          for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
              const p = y * width + x;
              if (bgMask[p]) continue;

              // Check if adjacent to a removed background pixel
              let transparentNeighbors = 0;
              let bestFgIdx = -1;
              let bestFgChroma = -1;

              for (let dy = -2; dy <= 2; dy++) {
                const ny = y + dy;
                if (ny < 0 || ny >= height) continue;
                for (let dx = -2; dx <= 2; dx++) {
                  if (dx === 0 && dy === 0) continue;
                  const nx = x + dx;
                  if (nx < 0 || nx >= width) continue;
                  const np = ny * width + nx;

                  if (Math.abs(dx) <= 1 && Math.abs(dy) <= 1 && bgMask[np]) {
                    transparentNeighbors++;
                  } else if (!bgMask[np]) {
                    const nIdx = np * 4;
                    const nr = data[nIdx];
                    const ng = data[nIdx + 1];
                    const nb = data[nIdx + 2];
                    const nChroma = Math.max(nr, ng, nb) - Math.min(nr, ng, nb);
                    if (nChroma > bestFgChroma) {
                      bestFgChroma = nChroma;
                      bestFgIdx = nIdx;
                    }
                  }
                }
              }

              if (transparentNeighbors > 0) {
                const idx = p * 4;
                const r = data[idx];
                const g = data[idx + 1];
                const b = data[idx + 2];
                const a = data[idx + 3];
                const ratio = bgRatioMap[p];

                // If boundary pixel is a semi-bright blend between background and foreground
                if (ratio < 1.45) {
                  // Smooth alpha ramp
                  const ramp = Math.max(0.08, Math.min(1, (ratio - 0.75) / 0.7));
                  edgeAlpha[p] = Math.round(a * ramp);

                  // Color decontamination: replace washed-out edge RGB with pure interior foreground color
                  if (bestFgIdx !== -1 && bestFgChroma > 30) {
                    const blend = 0.65;
                    data[idx] = Math.round(r * (1 - blend) + data[bestFgIdx] * blend);
                    data[idx + 1] = Math.round(
                      g * (1 - blend) + data[bestFgIdx + 1] * blend
                    );
                    data[idx + 2] = Math.round(
                      b * (1 - blend) + data[bestFgIdx + 2] * blend
                    );
                  } else if (edgeAlpha[p] > 20) {
                    // Unmix primary background color
                    const alphaNorm = Math.max(0.25, ramp);
                    data[idx] = Math.min(
                      255,
                      Math.max(
                        0,
                        Math.round((r - (1 - alphaNorm) * primaryBg.r) / alphaNorm)
                      )
                    );
                    data[idx + 1] = Math.min(
                      255,
                      Math.max(
                        0,
                        Math.round((g - (1 - alphaNorm) * primaryBg.g) / alphaNorm)
                      )
                    );
                    data[idx + 2] = Math.min(
                      255,
                      Math.max(
                        0,
                        Math.round((b - (1 - alphaNorm) * primaryBg.b) / alphaNorm)
                      )
                    );
                  }
                }
              }
            }
          }

          for (let i = 0; i < totalPixels; i++) {
            if (edgeAlpha[i] >= 0) {
              data[i * 4 + 3] = edgeAlpha[i];
            }
          }
        }

        ctx.putImageData(imgData, 0, 0);
        const resultUrl = canvas.toDataURL('image/png');
        resolve(resultUrl);
      } catch (err) {
        console.warn('Background removal error:', err);
        resolve(loadableSrc);
      }
    };

    img.onerror = (err) => {
      console.warn('Image load error during bg removal:', err);
      resolve(loadableSrc);
    };

    img.src = loadableSrc;
  });
};
