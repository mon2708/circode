// ==========================================
// CirCode — Circular QR Hybrid System
// ==========================================
const CHARSET = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz:/.?=&-_#%@+*()[]{}<>!$";
const SECTORS = 36;
const BITS_PER_CHAR = 7;
const MIN_DATA_RINGS = 3;

// URL pattern detection
const URL_PATTERN = /^(https?:\/\/|www\.|ftp:\/\/)/i;
function isURL(text) { return URL_PATTERN.test(text); }

// ==========================================
// ENCODING / DECODING (Standard Checksum)
// ==========================================
function textToBits(text) {
    let filtered = text.split('').filter(c => CHARSET.includes(c)).join('');
    if (!filtered) return { bits: [], filtered: '', numRings: 0 };
    let bits = [];
    // Header: 6 bits = length
    bits.push(...filtered.length.toString(2).padStart(6, '0').split('').map(Number));
    let checksum = 0;
    for (let ch of filtered) {
        let idx = CHARSET.indexOf(ch);
        checksum = (checksum + idx) % 64;
        bits.push(...idx.toString(2).padStart(BITS_PER_CHAR, '0').split('').map(Number));
    }
    // Checksum: 6 bits
    bits.push(...checksum.toString(2).padStart(6, '0').split('').map(Number));
    let numRings = Math.max(MIN_DATA_RINGS, Math.ceil(bits.length / SECTORS));
    while (bits.length < numRings * SECTORS) bits.push(0);
    return { bits, filtered, numRings };
}

function bitsToText(bits) {
    if (bits.length < 13) return null;
    let len = 0;
    for (let i = 0; i < 6; i++) len = (len << 1) | bits[i];
    if (len === 0 || len > 63) return null;
    let need = 6 + len * BITS_PER_CHAR + 6;
    if (bits.length < need) return null;
    let result = '', checksum = 0;
    for (let i = 0; i < len; i++) {
        let val = 0, offset = 6 + i * BITS_PER_CHAR;
        for (let j = 0; j < BITS_PER_CHAR; j++) val = (val << 1) | bits[offset + j];
        if (val >= CHARSET.length) return null;
        result += CHARSET[val];
        checksum = (checksum + val) % 64;
    }
    let csOff = 6 + len * BITS_PER_CHAR, csVal = 0;
    for (let i = 0; i < 6; i++) {
        if (csOff + i < bits.length) csVal = (csVal << 1) | bits[csOff + i];
    }
    if (csVal !== checksum) return null;
    return result;
}

// ==========================================
// SCANNER STATE
// ==========================================
let cvReady = false, streaming = false, isStarting = false, scanActive = false;
let stream = null, scanInterval = null;

const canvas = document.getElementById('barcodeCanvas');
const ctx = canvas.getContext('2d');
const textInput = document.getElementById('textInput');
const charCount = document.getElementById('charCount');

function updateCharCount(filtered, numRings) {
    charCount.textContent = `Chars: ${filtered.length}/63 | Rings: ${numRings}`;
}

// ==========================================
// RENDERING
// ==========================================
function drawBarcode(targetCtx, targetCanvas, bits, numRings, bgMode) {
    const size = targetCanvas.width;
    const C = size / 2;
    const isWhite = bgMode === 'white';
    const isTransparent = bgMode === 'transparent';
    const DATA_COLOR = isWhite ? '#000' : '#FFF';

    targetCtx.clearRect(0, 0, size, size);
    if (!isTransparent) {
        targetCtx.fillStyle = isWhite ? '#FFF' : '#000';
        targetCtx.fillRect(0, 0, size, size);
    }

    const finderDist = C * 0.82;
    const refR = C * 0.085, smallR = C * 0.065;
    const dataOuterR = finderDist - refR - 12;
    const dataInnerR = C * 0.13;
    const ringW = (dataOuterR - dataInnerR) / numRings;
    const sectorAng = (2 * Math.PI) / SECTORS;

    // DATA
    for (let ring = 0; ring < numRings; ring++) {
        let oR = dataOuterR - ring * ringW;
        let iR = Math.max(oR - ringW + 2, dataInnerR + 2);
        for (let sec = 0; sec < SECTORS; sec++) {
            if (bits[ring * SECTORS + sec] === 1) {
                // Add 0.5 degree padding like Python
                let pad = 0.008; // approx 0.5 degree in radians
                let a1 = sec * sectorAng - Math.PI / 2 + pad;
                let a2 = a1 + sectorAng - pad * 2;
                
                targetCtx.fillStyle = DATA_COLOR;
                targetCtx.beginPath();
                targetCtx.arc(C, C, oR, a1, a2);
                targetCtx.arc(C, C, iR, a2, a1, true);
                targetCtx.closePath(); targetCtx.fill();
            }
        }
    }

    // TIMING RING (Merapatkan jarak ke data agar tipis)
    let tR_center = dataOuterR + 3.5, tW = 5;
    let t_oR = tR_center + tW/2;
    let t_iR = tR_center - tW/2;
    for (let s = 0; s < SECTORS; s++) {
        if (s % 2 === 0) {
            let a1 = s * sectorAng - Math.PI / 2;
            targetCtx.fillStyle = DATA_COLOR;
            targetCtx.beginPath();
            targetCtx.arc(C, C, t_oR, a1, a1 + sectorAng);
            targetCtx.arc(C, C, t_iR, a1 + sectorAng, a1, true);
            targetCtx.closePath(); targetCtx.fill();
        }
    }

    // 3 BULLSEYES
    const angles = [-Math.PI / 2, -Math.PI / 2 + (2 * Math.PI / 3), -Math.PI / 2 + (4 * Math.PI / 3)];
    const radii = [refR, smallR, smallR];
    for (let i = 0; i < 3; i++) {
        let fx = C + finderDist * Math.cos(angles[i]);
        let fy = C + finderDist * Math.sin(angles[i]);
        let r = radii[i];
        
        targetCtx.fillStyle = DATA_COLOR;
        targetCtx.beginPath(); targetCtx.arc(fx, fy, r, 0, 2*Math.PI); targetCtx.fill();
        
        if (isTransparent) {
            targetCtx.globalCompositeOperation = 'destination-out';
            targetCtx.beginPath(); targetCtx.arc(fx, fy, r*0.62, 0, 2*Math.PI); targetCtx.fill();
            targetCtx.globalCompositeOperation = 'source-over';
        } else {
            targetCtx.fillStyle = isWhite ? '#FFF' : '#000';
            targetCtx.beginPath(); targetCtx.arc(fx, fy, r*0.62, 0, 2*Math.PI); targetCtx.fill();
        }
        
        targetCtx.fillStyle = DATA_COLOR;
        targetCtx.beginPath(); targetCtx.arc(fx, fy, r*0.3, 0, 2*Math.PI); targetCtx.fill();
    }

    // Center dot
    targetCtx.fillStyle = isWhite ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.5)';
    targetCtx.beginPath(); targetCtx.arc(C, C, 5, 0, 2*Math.PI); targetCtx.fill();

    // Label Text
    if (bgMode.includes('label')) {
        const text = textInput.value;
        const displayWidth = size * 0.9;
        targetCtx.font = "bold 36px 'Space Mono', monospace";
        targetCtx.fillStyle = DATA_COLOR;
        targetCtx.textAlign = "center";
        let displayUrl = text.length > 35 ? text.substring(0, 35) + "..." : text;
        targetCtx.fillText(displayUrl, C, size - 40);
    }
}

// Store last bits/numRings for re-download
let _lastBits = null, _lastNumRings = 0;

function generateCode(text) {
    const { bits, filtered, numRings } = textToBits(text);
    if (!filtered) { charCount.textContent = 'No valid characters'; return; }
    const size = 1000;
    canvas.width = size; canvas.height = size;
    _lastBits = bits; _lastNumRings = numRings;
    drawBarcode(ctx, canvas, bits, numRings, 'black');
    updateCharCount(filtered, numRings);
}

function downloadBarcode(bgMode) {
    if (!_lastBits) return;
    const showLabel = document.getElementById('showLabelToggle').checked;
    const finalMode = showLabel ? bgMode + '-label' : bgMode;
    const filename = `circode-${textInput.value.substring(0, 20).replace(/[^a-z0-9]/gi, '_')}-${bgMode}.png`;
    const offC = document.createElement('canvas');
    offC.width = 1000; offC.height = 1000;
    const offCtx2 = offC.getContext('2d');
    drawBarcode(offCtx2, offC, _lastBits, _lastNumRings, finalMode);
    let a = document.createElement('a');
    a.download = filename;
    a.href = offC.toDataURL('image/png');
    a.click();
}

document.getElementById('generateBtn').addEventListener('click', () => generateCode(textInput.value));
textInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') generateCode(textInput.value); });
document.getElementById('downloadBlackBtn').addEventListener('click', () => downloadBarcode('black'));
document.getElementById('downloadWhiteBtn').addEventListener('click', () => downloadBarcode('white'));
document.getElementById('downloadTransparentBtn').addEventListener('click', () => downloadBarcode('transparent'));
generateCode(textInput.value);

// ==========================================
// SCANNER LOGIC
// ==========================================
let lastDecodeTime = 0;
const DECODE_INTERVAL = 200;
let video = document.getElementById('videoElement');
let scanCanvas = document.getElementById('scannerOverlay');
let scanCtx = scanCanvas.getContext('2d', { willReadFrequently: true });
let startBtn = document.getElementById('startCameraBtn');
let stopBtn = document.getElementById('stopCameraBtn');
let statusDot = document.getElementById('statusDot');
let cvStatus = document.getElementById('cvStatus');

function setStatus(state, text) {
    cvStatus.textContent = text;
    statusDot.className = 'status-dot ' + state;
}

function onOpenCvReady() {
    cvReady = true; setStatus('ready', 'System Ready');
    startBtn.disabled = false;
}

async function startCamera() {
    if (!cvReady || streaming || isStarting) return;
    isStarting = true; setStatus('', 'Opening Camera...');
    try {
        if (stream) { stream.getTracks().forEach(t => t.stop()); }
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false });
        video.srcObject = stream;
        video.style.display = 'block';
        await new Promise(resolve => { video.onloadedmetadata = () => { video.play(); resolve(); }; });
        streaming = true; startBtn.disabled = true; stopBtn.disabled = false;
        document.querySelector('.scanner-frame').classList.add('active');
        scanActive = true; requestAnimationFrame(processFrame);
    } catch (e) {
        setStatus('error', 'Camera Error: ' + e.message);
    } finally { isStarting = false; }
}

function stopCamera() {
    scanActive = false;
    if (stream) { stream.getTracks().forEach(t => t.stop()); stream = null; }
    streaming = false; video.srcObject = null; video.style.display = 'none';
    startBtn.disabled = false; stopBtn.disabled = true;
    document.querySelector('.scanner-frame').classList.remove('active');
    document.getElementById('scannerPlaceholder').style.display = 'flex';
    scanCtx.clearRect(0, 0, scanCanvas.width, scanCanvas.height);
    setStatus('ready', 'System Ready');
}

startBtn.addEventListener('click', startCamera);
stopBtn.addEventListener('click', stopCamera);

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
            scanCtx.fillStyle = '#000';
            scanCtx.fillRect(0, 0, scanCanvas.width, scanCanvas.height);
            scanCtx.drawImage(img, 0, 0);
            decodeFrame(true);
        };
        img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
});

function processFrame() {
    if (!scanActive) return;
    if (Date.now() - lastDecodeTime > DECODE_INTERVAL) {
        scanCanvas.width = video.videoWidth; scanCanvas.height = video.videoHeight;
        scanCtx.drawImage(video, 0, 0);
        decodeFrame(false);
        lastDecodeTime = Date.now();
    }
    requestAnimationFrame(processFrame);
}

function decodeFrame(isStaticImage) {
    let src = cv.imread(scanCanvas);
    let gray = new cv.Mat();
    cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);
    cv.GaussianBlur(gray, gray, new cv.Size(3, 3), 0);
    
    let decodedText = null;
    for (let mode of ['normal', 'inv']) {
        let thresh = new cv.Mat();
        if (mode === 'normal') cv.threshold(gray, thresh, 0, 255, cv.THRESH_BINARY + cv.THRESH_OTSU);
        else cv.threshold(gray, thresh, 0, 255, cv.THRESH_BINARY_INV + cv.THRESH_OTSU);
        
        let contours = new cv.MatVector();
        let hierarchy = new cv.Mat();
        cv.findContours(thresh, contours, hierarchy, cv.RETR_TREE, cv.CHAIN_APPROX_SIMPLE);
        
        let bulls = [];
        for (let i = 0; i < contours.size(); i++) {
            let h = hierarchy.intPtr(0, i);
            if (h[2] >= 0) {
                let childIdx = h[2];
                let hChild = hierarchy.intPtr(0, childIdx);
                if (hChild[2] >= 0) {
                    let cnt = contours.get(i);
                    let area = cv.contourArea(cnt);
                    let peri = cv.arcLength(cnt, true);
                    let circ = (4 * Math.PI * area) / (peri * peri);
                    if (area > 30 && circ > 0.5) {
                        let M = cv.moments(cnt);
                        bulls.append({ x: M.m10 / M.m00, y: M.m01 / M.m00, area, radius: Math.sqrt(area / Math.PI) });
                    }
                }
            }
        }
        
        if (bulls.length >= 3) {
            bulls.sort((a, b) => b.area - a.area);
            let candidates = bulls.slice(0, 6);
            let bestSet = null, minScore = Infinity;
            for (let i = 0; i < candidates.length; i++) {
                for (let j = i + 1; j < candidates.length; j++) {
                    for (let k = j + 1; k < candidates.length; k++) {
                        let d1 = Math.hypot(candidates[i].x - candidates[j].x, candidates[i].y - candidates[j].y);
                        let d2 = Math.hypot(candidates[j].x - candidates[k].x, candidates[j].y - candidates[k].y);
                        let d3 = Math.hypot(candidates[i].x - candidates[k].x, candidates[i].y - candidates[k].y);
                        let avg = (d1 + d2 + d3) / 3;
                        let score = Math.abs(d1 - avg) + Math.abs(d2 - avg) + Math.abs(d3 - avg);
                        if (score < minScore) { minScore = score; bestSet = [candidates[i], candidates[j], candidates[k]]; }
                    }
                }
            }
            if (bestSet) {
                let cx = (bestSet[0].x + bestSet[1].x + bestSet[2].x) / 3;
                let cy = (bestSet[0].y + bestSet[1].y + bestSet[2].y) / 3;
                let ref = bestSet.sort((a, b) => b.area - a.area)[0];
                let rotation = Math.atan2(ref.y - cy, ref.x - cx) - (-Math.PI / 2);
                let finderDist = Math.hypot(ref.x - cx, ref.y - cy);
                let dataOuterR = (finderDist - ref.radius) * 0.96;
                let dataInnerR = (finderDist * 0.13 / 0.82);
                let sectorAng = (2 * Math.PI) / SECTORS;
                
                for (let rCount = MIN_DATA_RINGS; rCount <= 12; rCount++) {
                    let rW = (dataOuterR - dataInnerR) / rCount;
                    if (rW < 2) break;
                    let bits = [];
                    for (let r = 0; r < rCount; r++) {
                        let sampleR = dataOuterR - r * rW - rW / 2;
                        for (let s = 0; s < SECTORS; s++) {
                            let angle = s * sectorAng - Math.PI / 2 + rotation + sectorAng / 2;
                            let px = Math.round(cx + sampleR * Math.cos(angle));
                            let py = Math.round(cy + sampleR * Math.sin(angle));
                            if (py >= 0 && py < thresh.rows && px >= 0 && px < thresh.cols) {
                                bits.push(thresh.ucharAt(py, px) > 127 ? 1 : 0);
                            } else bits.push(0);
                        }
                    }
                    let res = bitsToText(bits);
                    if (res) { decodedText = res; break; }
                    let invBits = bits.map(b => 1 - b);
                    res = bitsToText(invBits);
                    if (res) { decodedText = res; break; }
                }
            }
        }
        thresh.delete(); contours.delete(); hierarchy.delete();
        if (decodedText) break;
    }
    
    if (decodedText) {
        if (!isStaticImage) showResult(decodedText);
        else { alert("Decoded: " + decodedText); showResult(decodedText); }
    }
    src.delete(); gray.delete();
}

function showResult(text) {
    const resultOverlay = document.getElementById('resultOverlay');
    const resultText = document.getElementById('resultText');
    const linkBtn = document.getElementById('linkBtn');
    resultText.textContent = text;
    resultOverlay.classList.add('active');
    if (isURL(text)) {
        let url = text.startsWith('www.') ? 'https://' + text : text;
        linkBtn.onclick = () => window.open(url, '_blank');
        linkBtn.style.display = 'flex';
    } else linkBtn.style.display = 'none';
}

document.getElementById('closeResult').onclick = () => {
    document.getElementById('resultOverlay').classList.remove('active');
};
