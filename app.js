// ==========================================
// CirCode — Circular QR Hybrid System
// ==========================================
const CHARSET = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz:/.?=&-_#%@+*()[]{}<>!$";
const SECTORS = 36;
const BITS_PER_CHAR = 7;
const MIN_DATA_RINGS = 3;

// URL pattern detection
const URL_PATTERN = /^(https?:\/\/|www\.|ftp:\/\/)/i;

function isURL(text) {
    return URL_PATTERN.test(text);
}

// ==========================================
// ENCODING / DECODING
// ==========================================
function textToBits(text) {
    let filtered = text.split('').filter(c => CHARSET.includes(c)).join('');
    if (!filtered) return { bits: [], filtered: '', numRings: 0 };
    let bits = [];
    // Header: 6 bits = length (max 63 chars)
    bits.push(...filtered.length.toString(2).padStart(6, '0').split('').map(Number));
    let checksum = 0;
    for (let ch of filtered) {
        let idx = CHARSET.indexOf(ch);
        checksum = (checksum + idx) % 64;
        bits.push(...idx.toString(2).padStart(BITS_PER_CHAR, '0').split('').map(Number));
    }
    // Checksum: 6 bits (fixed at 6 regardless of BITS_PER_CHAR)
    bits.push(...checksum.toString(2).padStart(6, '0').split('').map(Number));
    let numRings = Math.max(MIN_DATA_RINGS, Math.ceil(bits.length / SECTORS));
    while (bits.length < numRings * SECTORS) bits.push(0);
    return { bits, filtered, numRings };
}

function bitsToText(bits) {
    if (bits.length < 13) return null; // Header(6) + at least 1 char(7)
    let len = 0;
    for (let i = 0; i < 6; i++) len = (len << 1) | bits[i];
    if (len === 0 || len > 63) return null;
    let need = 6 + len * 7 + 6;
    if (bits.length < need) return null;
    let result = '', checksum = 0;
    for (let i = 0; i < len; i++) {
        let val = 0;
        let offset = 6 + i * 7;
        for (let j = 0; j < 7; j++) val = (val << 1) | bits[offset + j];
        if (val >= CHARSET.length) return null;
        result += CHARSET[val];
        checksum = (checksum + val) % 64;
    }
    let csOff = 6 + len * 7, csVal = 0;
    // Read 6 bits for checksum
    for (let i = 0; i < 6; i++) {
        if (csOff + i < bits.length) {
            csVal = (csVal << 1) | bits[csOff + i];
        }
    }
    if (csVal !== checksum) return null;
    return result;
}

// ==========================================
// TAB SWITCHING
// ==========================================
document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.tab-btn').forEach(b => {
            b.classList.remove('active');
            b.setAttribute('aria-selected', 'false');
        });
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        btn.classList.add('active');
        btn.setAttribute('aria-selected', 'true');
        document.getElementById(btn.dataset.target).classList.add('active');

        if (btn.dataset.target !== 'scanner') {
            stopCamera();
        }
    });
});

// ==========================================
// GENERATOR
// ==========================================
const canvas = document.getElementById('barcodeCanvas');
const ctx = canvas.getContext('2d');
const textInput = document.getElementById('textInput');
const charCount = document.getElementById('charCount');

function updateCharCount(filtered, numRings) {
    charCount.textContent = `${filtered.length} chars · ${numRings} rings`;
}

function drawBarcode(targetCtx, targetCanvas, bits, numRings, bgMode) {
    const size = targetCanvas.width;
    const C = size / 2;
    const isTransparent = bgMode.startsWith('transparent');
    const isWhite = bgMode.startsWith('white');

    const finderDist = C * 0.82;
    const refR = C * 0.085, smallR = C * 0.065;
    const dataOuterR = finderDist - refR - 12;
    const dataInnerR = C * 0.13;
    const ringW = (dataOuterR - dataInnerR) / numRings;
    const sectorAng = (2 * Math.PI) / SECTORS;

    // Background
    if (isTransparent) {
        targetCtx.clearRect(0, 0, size, size);
    } else if (isWhite) {
        targetCtx.fillStyle = '#FFF';
        targetCtx.fillRect(0, 0, size, size);
    } else {
        targetCtx.fillStyle = '#000';
        targetCtx.fillRect(0, 0, size, size);
    }

    const DATA_COLOR = isWhite ? '#000000' : '#FFFFFF';

    // Subtle outer guide ring (only for solid bg)
    if (!isTransparent) {
        targetCtx.strokeStyle = isWhite ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.08)';
        targetCtx.lineWidth = 1;
        targetCtx.beginPath();
        targetCtx.arc(C, C, finderDist + refR + 8, 0, 2 * Math.PI);
        targetCtx.stroke();
    }

    // DATA CELLS
    targetCtx.fillStyle = DATA_COLOR;
    for (let ring = 0; ring < numRings; ring++) {
        let oR = dataOuterR - ring * ringW;
        let iR = oR - ringW + 2;
        for (let sec = 0; sec < SECTORS; sec++) {
            if (bits[ring * SECTORS + sec] === 1) {
                let a1 = sec * sectorAng - Math.PI / 2 + 0.012;
                let a2 = a1 + sectorAng - 0.024;
                targetCtx.beginPath();
                targetCtx.arc(C, C, oR, a1, a2);
                targetCtx.arc(C, C, Math.max(iR, dataInnerR + 2), a2, a1, true);
                targetCtx.closePath();
                targetCtx.fill();
            }
        }
    }

    // TIMING RING
    targetCtx.fillStyle = DATA_COLOR;
    for (let s = 0; s < SECTORS; s++) {
        if (s % 2 === 0) {
            let tR = dataOuterR + 5, tW = 5;
            let a1 = s * sectorAng - Math.PI / 2;
            targetCtx.beginPath();
            targetCtx.arc(C, C, tR + tW, a1, a1 + sectorAng);
            targetCtx.arc(C, C, tR, a1 + sectorAng, a1, true);
            targetCtx.closePath(); targetCtx.fill();
        }
    }

    // 3 FINDER BULLSEYES
    const angles = [-Math.PI / 2, -Math.PI / 2 + 2 * Math.PI / 3, -Math.PI / 2 + 4 * Math.PI / 3];
    const radii = [refR, smallR, smallR];
    for (let i = 0; i < 3; i++) {
        let fx = C + finderDist * Math.cos(angles[i]);
        let fy = C + finderDist * Math.sin(angles[i]);
        let r = radii[i];

        // Outer White/Black circle
        targetCtx.fillStyle = DATA_COLOR;
        targetCtx.beginPath(); targetCtx.arc(fx, fy, r, 0, 2 * Math.PI); targetCtx.fill();

        // Inner Hole (Ring effect)
        if (isTransparent) {
            targetCtx.globalCompositeOperation = 'destination-out';
            targetCtx.beginPath(); targetCtx.arc(fx, fy, r * 0.62, 0, 2 * Math.PI); targetCtx.fill();
            targetCtx.globalCompositeOperation = 'source-over';
        } else {
            targetCtx.fillStyle = isWhite ? '#FFF' : '#000';
            targetCtx.beginPath(); targetCtx.arc(fx, fy, r * 0.62, 0, 2 * Math.PI); targetCtx.fill();
        }

        // Center Dot
        targetCtx.fillStyle = DATA_COLOR;
        targetCtx.beginPath(); targetCtx.arc(fx, fy, r * 0.3, 0, 2 * Math.PI); targetCtx.fill();
    }

    // Center dot
    targetCtx.fillStyle = isWhite ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.5)';
    targetCtx.beginPath(); targetCtx.arc(C, C, 5, 0, 2 * Math.PI); targetCtx.fill();

    // Label Text
    if (bgMode.includes('label')) {
        const text = textInput.value;
        const displayWidth = size * 0.9;
        targetCtx.font = "bold 36px 'Space Mono', monospace";
        targetCtx.fillStyle = DATA_COLOR;
        targetCtx.textAlign = "center";

        let displayUrl = text;
        if (targetCtx.measureText(text).width > displayWidth) {
            displayUrl = text.substring(0, 35) + "...";
        }
        targetCtx.fillText(displayUrl, C, size - 40);
    }
}

// Store last bits/numRings for re-download without regenerate
let _lastBits = null, _lastNumRings = 0;

function generateCode(text) {
    const { bits, filtered, numRings } = textToBits(text);
    if (!filtered) { charCount.textContent = 'No valid characters'; return; }

    const size = 1000;
    canvas.width = size; canvas.height = size;

    _lastBits = bits;
    _lastNumRings = numRings;

    const showLabel = document.getElementById('labelOn').checked;
    const finalMode = showLabel ? 'black-label' : 'black';

    drawBarcode(ctx, canvas, bits, numRings, finalMode);
    updateCharCount(filtered, numRings);
}

function downloadBarcode(bgMode) {
    if (!_lastBits) return;
    const showLabel = document.getElementById('labelOn').checked;
    const finalMode = showLabel ? bgMode + '-label' : bgMode;
    const filename = `circode-${bgMode}.png`;

    const offC = document.createElement('canvas');
    offC.width = 1000; offC.height = 1000;
    const offCtx2 = offC.getContext('2d');
    drawBarcode(offCtx2, offC, _lastBits, _lastNumRings, finalMode);

    let a = document.createElement('a');
    a.download = filename;
    a.href = offC.toURL ? offC.toURL('image/png') : offC.toDataURL('image/png');
    a.click();
}

document.getElementById('generateBtn').addEventListener('click', () => generateCode(textInput.value));
textInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') generateCode(textInput.value); });
document.getElementById('labelOn').addEventListener('change', () => generateCode(textInput.value));
document.getElementById('downloadBlackBtn').addEventListener('click', () => downloadBarcode('black'));
document.getElementById('downloadWhiteBtn').addEventListener('click', () => downloadBarcode('white'));
document.getElementById('downloadTransparentBtn').addEventListener('click', () => downloadBarcode('transparent'));
generateCode(textInput.value);

// ==========================================
// SCANNER STATE
// ==========================================
let cvReady = false, streaming = false, isStarting = false, stream = null;
let scanActive = false;
let lastDecodeTime = 0;
const DECODE_INTERVAL = 200; // ms between decode attempts for performance

let video = document.getElementById('videoElement');
let scanCanvas = document.getElementById('scannerOverlay');
let scanCtx = scanCanvas.getContext('2d', { willReadFrequently: true });
let startBtn = document.getElementById('startCameraBtn');
let stopBtn = document.getElementById('stopCameraBtn');
let statusDot = document.getElementById('statusDot');
let cvStatus = document.getElementById('cvStatus');

// Off-screen canvas for fast processing (smaller resolution)
let offscreen = document.createElement('canvas');
let offCtx = offscreen.getContext('2d', { willReadFrequently: true });
const PROCESS_SIZE = 480; // Process at 480px for speed

function setStatus(state, text) {
    cvStatus.textContent = text;
    statusDot.className = 'status-dot ' + state;
}

function onOpenCvReady() {
    cvReady = true;
    setStatus('ready', 'System Ready');
    startBtn.disabled = false;
}

// ==========================================
// CAMERA
// ==========================================
async function startCamera() {
    if (!cvReady || streaming || isStarting) return;
    isStarting = true;
    setStatus('', 'Opening Camera...');

    try {
        if (stream) { stream.getTracks().forEach(t => t.stop()); stream = null; }

        stream = await navigator.mediaDevices.getUserMedia({
            video: {
                facingMode: { ideal: 'environment' },
                width: { ideal: 1280 },
                height: { ideal: 720 }
            },
            audio: false
        });

        video.srcObject = stream;
        video.style.display = 'block';

        await new Promise(resolve => {
            video.onloadedmetadata = () => { video.play(); resolve(); };
        });

        streaming = true;
        startBtn.disabled = true;
        stopBtn.disabled = false;
        setStatus('active', 'Live Scan Active');

        // Show scanner UI elements
        document.getElementById('scannerPlaceholder').style.display = 'none';
        document.getElementById('scannerOverlay').style.display = 'block';
        document.querySelector('.scanner-frame').classList.add('active');

        scanCanvas.width = video.videoWidth;
        scanCanvas.height = video.videoHeight;
        // Keep aspect ratio in offscreen processing canvas
        let aspect = video.videoWidth / video.videoHeight;
        offscreen.width = PROCESS_SIZE;
        offscreen.height = Math.round(PROCESS_SIZE / aspect);

        scanActive = true;
        requestAnimationFrame(processFrame);

    } catch (e) {
        console.error('Camera Error:', e);
        setStatus('error', 'Camera Error: ' + (e.message || e.name));
    } finally {
        isStarting = false;
    }
}

function stopCamera() {
    scanActive = false;
    if (stream) { stream.getTracks().forEach(t => t.stop()); stream = null; }
    streaming = false; isStarting = false;
    video.srcObject = null;
    video.style.display = 'none';
    startBtn.disabled = false;
    stopBtn.disabled = true;
    document.querySelector('.scanner-frame').classList.remove('active');
    document.getElementById('scannerPlaceholder').style.display = 'flex';
    scanCtx.clearRect(0, 0, scanCanvas.width, scanCanvas.height);
    setStatus('ready', 'System Ready');
}

startBtn.addEventListener('click', startCamera);
stopBtn.addEventListener('click', stopCamera);

// File Upload
document.getElementById('fileInput').addEventListener('change', (e) => {
    let file = e.target.files[0];
    if (!file || !cvReady) return;
    let reader = new FileReader();
    reader.onload = (ev) => {
        let img = new Image();
        img.onload = () => {
            if (streaming) stopCamera();
            document.getElementById('scannerPlaceholder').style.display = 'none';
            scanCanvas.width = img.width; scanCanvas.height = img.height;
            // Force black background for transparency support
            scanCtx.fillStyle = '#000';
            scanCtx.fillRect(0, 0, scanCanvas.width, scanCanvas.height);
            scanCtx.drawImage(img, 0, 0);
            decodeFrame(true);
        };
        img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
    e.target.value = ''; // reset so same file can be re-uploaded
});

// ==========================================
// PROCESS LOOP (throttled for performance)
// ==========================================
function processFrame(timestamp) {
    if (!scanActive || !streaming) return;

    // Draw camera frame to overlay canvas
    scanCtx.drawImage(video, 0, 0, scanCanvas.width, scanCanvas.height);

    // Throttle decode for performance
    if (timestamp - lastDecodeTime > DECODE_INTERVAL) {
        lastDecodeTime = timestamp;
        decodeFrame(false);
    }

    requestAnimationFrame(processFrame);
}

// ==========================================
// BULLSEYE FINDER DETECTION
// ==========================================
function findBullseyes(thresh, hierarchy) {
    let contours = new cv.MatVector();
    let hier = new cv.Mat();
    cv.findContours(thresh, contours, hier, cv.RETR_TREE, cv.CHAIN_APPROX_SIMPLE);

    let bulls = [];
    let hData = hier.data32S;

    for (let i = 0; i < contours.size(); i++) {
        let child = hData[i * 4 + 2];
        if (child < 0) continue;
        let grandchild = hData[child * 4 + 2];
        if (grandchild < 0) continue;

        let c1 = contours.get(i);
        let a1 = cv.contourArea(c1);
        if (a1 < 30) continue;

        let p1 = cv.arcLength(c1, true);
        if (p1 < 1) continue;
        let circ = 4 * Math.PI * a1 / (p1 * p1);
        if (circ < 0.45) continue;

        let M = cv.moments(c1);
        if (M.m00 === 0) continue;
        bulls.push({
            x: M.m10 / M.m00,
            y: M.m01 / M.m00,
            area: a1,
            radius: Math.sqrt(a1 / Math.PI)
        });
    }

    contours.delete(); hier.delete();
    return bulls;
}

// ==========================================
// RESULT DISPLAY (with Go to Link)
// ==========================================
let lastResult = null;

// Web Audio API Beep
function playBeep() {
    try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();

        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(2000, audioCtx.currentTime); // 880Hz (Note A5) for a crisp scanner beep

        gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime); // Set volume
        gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.1); // Quick fade out

        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);

        oscillator.start();
        oscillator.stop(audioCtx.currentTime + 0.1);
    } catch (e) {
        // Silently ignore if Audio API is blocked or unsupported
    }
}

function displayResult(text, info) {
    if (text === lastResult) return;
    lastResult = text;

    // Visual Flash Feedback
    const container = document.getElementById('scannerContainer');
    if (container) {
        container.style.boxShadow = '0 0 30px rgba(34, 211, 165, 0.4)';
        setTimeout(() => container.style.boxShadow = '', 400);
    }

    // Audio & Haptic feedback
    playBeep();
    if (navigator.vibrate) {
        try { navigator.vibrate(50); } catch (e) { }
    }

    const resultTextEl = document.getElementById('scanResult');
    resultTextEl.textContent = text;
    resultTextEl.classList.remove('waiting');
    document.getElementById('scanInfo').textContent = info;

    // Link detection and normalization
    const linkBtn = document.getElementById('gotoLinkBtn');
    if (isURL(text)) {
        let url = text;
        // CirCode characters are often uppercase, normalize for protocol
        if (!/^(https?:\/\/|ftp:\/\/)/i.test(url)) {
            url = 'https://' + url;
        }
        linkBtn.href = url;
        linkBtn.style.display = 'flex';
    } else {
        linkBtn.style.display = 'none';
    }

    document.getElementById('scanConfidence').textContent = '✓ OK';
}

// ==========================================
// DECODE FRAME
// ==========================================
function decodeFrame(isStaticImage) {
    try {
        let src, scale = 1;

        if (isStaticImage) {
            src = cv.imread(scanCanvas);
        } else {
            // Live: preserve aspect ratio when downsampling for speed
            let aspect = video.videoWidth / video.videoHeight;
            let pw = PROCESS_SIZE;
            let ph = Math.round(PROCESS_SIZE / aspect);
            if (offscreen.width !== pw || offscreen.height !== ph) {
                offscreen.width = pw; offscreen.height = ph;
            }
            offCtx.drawImage(video, 0, 0, pw, ph);
            src = cv.imread(offscreen);
            scale = scanCanvas.width / pw;
        }

        let gray = new cv.Mat();
        cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);

        let blurred = new cv.Mat();
        cv.GaussianBlur(gray, blurred, new cv.Size(3, 3), 0);

        let thresh = new cv.Mat();
        if (isStaticImage) {
            cv.threshold(blurred, thresh, 0, 255, cv.THRESH_BINARY | cv.THRESH_OTSU);
        } else {
            cv.adaptiveThreshold(blurred, thresh, 255,
                cv.ADAPTIVE_THRESH_GAUSSIAN_C, cv.THRESH_BINARY, 31, -8);
        }

        let bulls = findBullseyes(thresh, null);

        if (bulls.length >= 3) {
            // Pick the 3 bulls that form the most equilateral triangle
            bulls.sort((a, b) => b.area - a.area);
            let candidates = bulls.slice(0, Math.min(6, bulls.length));
            let bestSet = null, bestScore = Infinity;
            for (let i = 0; i < candidates.length - 2; i++) {
                for (let j = i + 1; j < candidates.length - 1; j++) {
                    for (let k = j + 1; k < candidates.length; k++) {
                        let [a, b, c] = [candidates[i], candidates[j], candidates[k]];
                        let d0 = Math.hypot(a.x - b.x, a.y - b.y);
                        let d1 = Math.hypot(b.x - c.x, b.y - c.y);
                        let d2 = Math.hypot(a.x - c.x, a.y - c.y);
                        let avg = (d0 + d1 + d2) / 3;
                        // Score = variance from equilateral
                        let score = Math.abs(d0 - avg) + Math.abs(d1 - avg) + Math.abs(d2 - avg);
                        if (score < bestScore) { bestScore = score; bestSet = [a, b, c]; }
                    }
                }
            }
            bulls = bestSet;

            // Compute barcode center + geometry
            let cx = (bulls[0].x + bulls[1].x + bulls[2].x) / 3;
            let cy = (bulls[0].y + bulls[1].y + bulls[2].y) / 3;
            let ref = bulls[0]; // largest = orientation reference (top, 0°)
            let rotation = Math.atan2(ref.y - cy, ref.x - cx) - (-Math.PI / 2);
            let finderDist = Math.hypot(ref.x - cx, ref.y - cy);
            let dataOuterR = (finderDist - ref.radius) * 0.96;
            let dataInnerR = (finderDist * 0.13 / 0.82);

            // Draw visual feedback (scaled back to overlay canvas)
            if (!isStaticImage) {
                scanCtx.clearRect(0, 0, scanCanvas.width, scanCanvas.height);
                scanCtx.drawImage(video, 0, 0, scanCanvas.width, scanCanvas.height);
            }
            for (let b of bulls) {
                let bx = isStaticImage ? b.x : b.x * scale;
                let by = isStaticImage ? b.y : b.y * scale;
                let br = isStaticImage ? b.radius : b.radius * scale;
                scanCtx.strokeStyle = 'rgba(124,111,247,0.9)';
                scanCtx.lineWidth = 2;
                scanCtx.beginPath(); scanCtx.arc(bx, by, br, 0, 2 * Math.PI); scanCtx.stroke();
            }
            let ccx = isStaticImage ? cx : cx * scale;
            let ccy = isStaticImage ? cy : cy * scale;
            scanCtx.fillStyle = 'rgba(34,211,165,0.9)';
            scanCtx.beginPath(); scanCtx.arc(ccx, ccy, 5, 0, 2 * Math.PI); scanCtx.fill();

            // Try to decode at different ring counts, both normal and inverted bit
            let sectorAng = (2 * Math.PI) / SECTORS;
            let found = false;

            for (let numRings = MIN_DATA_RINGS; numRings <= 12 && !found; numRings++) {
                let ringW = (dataOuterR - dataInnerR) / numRings;
                if (ringW < 2) break;

                let bits = [];
                for (let ring = 0; ring < numRings; ring++) {
                    let sampleR = dataOuterR - ring * ringW - ringW / 2;
                    for (let sec = 0; sec < SECTORS; sec++) {
                        let angle = sec * sectorAng - Math.PI / 2 + rotation + sectorAng / 2;
                        let px = Math.round(cx + sampleR * Math.cos(angle));
                        let py = Math.round(cy + sampleR * Math.sin(angle));
                        px = Math.max(0, Math.min(gray.cols - 1, px));
                        py = Math.max(0, Math.min(gray.rows - 1, py));
                        bits.push(gray.ucharAt(py, px) > 128 ? 1 : 0);
                    }
                }

                // Try normal bits
                let decoded = bitsToText(bits);
                if (decoded) {
                    displayResult(decoded, `✓ Checksum OK · ${numRings} rings · ${decoded.length} chars`);
                    found = true; break;
                }
                // Try inverted bits (in case threshold flipped black/white)
                let invBits = bits.map(b => 1 - b);
                decoded = bitsToText(invBits);
                if (decoded) {
                    displayResult(decoded, `✓ Checksum OK · ${numRings} rings · ${decoded.length} chars`);
                    found = true; break;
                }
            }

            if (!found) {
                document.getElementById('scanInfo').textContent = `Finders: 3/3 · Decoding...`;
            }
        } else {
            if (!isStaticImage && bulls.length > 0) {
                document.getElementById('scanInfo').textContent = `Finders: ${bulls.length}/3 found...`;
            }
        }

        src.delete(); gray.delete(); blurred.delete(); thresh.delete();

    } catch (e) {
        console.error('Decode error:', e);
    }
}
