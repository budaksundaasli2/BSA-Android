// Mengambil referensi elemen DOM
const bgInput = document.getElementById("bgInput");
const background = document.getElementById("background");
const logo = document.getElementById("logo");
const originalBsa = document.getElementById("original-bsa");
const text = document.getElementById("text");
const saveBtn = document.getElementById("saveBtn");
const cropModal = document.getElementById("cropModal");
const cropImage = document.getElementById("cropImage");
const cropBtn = document.getElementById("cropBtn");
const cancelCropBtn = document.getElementById("cancelCropBtn");
const previewModal = document.getElementById("previewModal");
const previewImage = document.getElementById("previewImage");
const downloadBtn = document.getElementById("downloadBtn");
const cancelPreviewBtn = document.getElementById("cancelPreviewBtn");
const previewBtn = document.getElementById("previewBtn");
const shareTiktokBtn = document.getElementById("shareTiktokBtn");
const navHome = document.getElementById("navHome");
const navTersimpan = document.getElementById("navTersimpan");
let cropper = null;

// Kontrol kamera (kamera langsung jika HTTPS/localhost, fallback kamera bawaan HP)
const openCameraBtn = document.getElementById('openCameraBtn');
const cameraCaptureInput = document.getElementById('cameraCaptureInput');
const cameraModal = document.getElementById('cameraModal');
const cameraVideo = document.getElementById('cameraVideo');
const cameraMessage = document.getElementById('cameraMessage');
const capturePhotoBtn = document.getElementById('capturePhotoBtn');
const switchCameraBtn = document.getElementById('switchCameraBtn');
const closeCameraBtn = document.getElementById('closeCameraBtn');
let cameraStream = null;
let cameraFacingMode = 'environment';

// Modal untuk daftar tersimpan
let modalTersimpan = null;
function buatModalTersimpan() {
    if (modalTersimpan) return modalTersimpan;
    modalTersimpan = document.createElement('div');
    modalTersimpan.id = 'modalTersimpan';
    modalTersimpan.style.position = 'fixed';
    modalTersimpan.style.top = '0';
    modalTersimpan.style.left = '0';
    modalTersimpan.style.width = '100vw';
    modalTersimpan.style.height = '100vh';
    modalTersimpan.style.background = '#000';
    modalTersimpan.style.display = 'flex';
    modalTersimpan.style.justifyContent = 'center';
    modalTersimpan.style.alignItems = 'center';
    modalTersimpan.style.zIndex = '2000';
    modalTersimpan.innerHTML = `
        <div style=\"background:#111;padding:24px 16px;max-width:90vw;max-height:80vh;overflow:auto;border-radius:12px;position:relative;display:flex;flex-direction:column;align-items:center;\">
            <div style=\"display:flex;justify-content:center;align-items:center;margin-bottom:16px;\">
                <svg width=\"28\" height=\"28\" viewBox=\"0 0 24 24\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\"><path d=\"M19 21L12 17L5 21V5C5 4.44772 5.44772 4 6 4H18C18.5523 4 19 4.44772 19 5V21Z\" stroke=\"#fff\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/></svg>
            </div>
            <div id=\"listTersimpan\" style=\"display:grid;grid-template-columns:repeat(4,1fr);gap:12px;\"></div>
            <button id=\"closeTersimpan\" style=\"margin:32px auto 0 auto;display:block;background:none;border:none;\">
                <svg width=\"32\" height=\"32\" viewBox=\"0 0 24 24\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\"><circle cx=\"12\" cy=\"12\" r=\"10\" stroke=\"#fff\" stroke-width=\"2\"/><path d=\"M15 9L9 15M9 9l6 6\" stroke=\"#fff\" stroke-width=\"2\" stroke-linecap=\"round\"/></svg>
            </button>
        </div>
    `;
    document.body.appendChild(modalTersimpan);
    modalTersimpan.querySelector('#closeTersimpan').onclick = () => {
        modalTersimpan.style.display = 'none';
    };
    return modalTersimpan;
}

function tampilkanTersimpan() {
    const modal = buatModalTersimpan();
    const listDiv = modal.querySelector('#listTersimpan');
    listDiv.innerHTML = '';
    const data = JSON.parse(localStorage.getItem('bsaTersimpan') || '[]');
    if (data.length === 0) {
        listDiv.innerHTML = '';
    } else {
        data.forEach((img, i) => {
            const wrap = document.createElement('div');
            wrap.style.display = 'flex';
            wrap.style.flexDirection = 'column';
            wrap.style.alignItems = 'center';
            wrap.innerHTML = `<img src="${img}" style="width:100px;height:100px;object-fit:cover;border:1px solid #ccc;border-radius:8px;cursor:pointer;" data-index="${i}"/>`;
            wrap.querySelector('img').onclick = function() {
                tampilkanModalGambarTersimpan(img, i);
            };
            listDiv.appendChild(wrap);
        });
    }
    modal.style.display = 'flex';
}

function tampilkanModalGambarTersimpan(img, index) {
    let modalGambar = document.getElementById('modalGambarTersimpan');
    if (!modalGambar) {
        modalGambar = document.createElement('div');
        modalGambar.id = 'modalGambarTersimpan';
        modalGambar.style.position = 'fixed';
        modalGambar.style.top = '0';
        modalGambar.style.left = '0';
        modalGambar.style.width = '100vw';
        modalGambar.style.height = '100vh';
        modalGambar.style.background = '#000';
        modalGambar.style.display = 'flex';
        modalGambar.style.justifyContent = 'center';
        modalGambar.style.alignItems = 'center';
        modalGambar.style.zIndex = '3000';
        document.body.appendChild(modalGambar);
    }
    modalGambar.innerHTML = `
        <div style=\"background:#111;padding:24px 16px;max-width:95vw;max-height:90vh;overflow:auto;border-radius:12px;position:relative;display:flex;flex-direction:column;align-items:center;\">
            <img src=\"${img}\" style=\"max-width:70vw;max-height:60vh;border-radius:8px;border:1px solid #ccc;\"/>
            <div style=\"margin-top:16px;display:flex;gap:18px;\">
                <button id=\"unduhGambarTersimpan\" style=\"background:none;border:none;\">
                    <svg width=\"28\" height=\"28\" viewBox=\"0 0 24 24\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\"><path d=\"M12 5v14M5 12l7 7 7-7\" stroke=\"#fff\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/></svg>
                </button>
                <button id=\"hapusGambarTersimpan\" style=\"background:none;border:none;\">
                    <svg width=\"28\" height=\"28\" viewBox=\"0 0 24 24\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\"><path d=\"M3 6h18M8 6v12a2 2 0 002 2h4a2 2 0 002-2V6m-6 0V4a2 2 0 012-2h0a2 2 0 012 2v2\" stroke=\"#fff\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/></svg>
                </button>
                <button id=\"tutupGambarTersimpan\" style=\"background:none;border:none;\">
                    <svg width=\"28\" height=\"28\" viewBox=\"0 0 24 24\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\"><circle cx=\"12\" cy=\"12\" r=\"10\" stroke=\"#fff\" stroke-width=\"2\"/><path d=\"M15 9L9 15M9 9l6 6\" stroke=\"#fff\" stroke-width=\"2\" stroke-linecap=\"round\"/></svg>
                </button>
            </div>
        </div>
    `;
    modalGambar.querySelector('#unduhGambarTersimpan').onclick = function() {
        const link = document.createElement('a');
        link.href = img;
        link.download = 'Gambar_BSA.png';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };
    modalGambar.querySelector('#hapusGambarTersimpan').onclick = function() {
        let data = JSON.parse(localStorage.getItem('bsaTersimpan') || '[]');
        data.splice(index, 1);
        localStorage.setItem('bsaTersimpan', JSON.stringify(data));
        modalGambar.style.display = 'none';
        tampilkanTersimpan();
    };
    modalGambar.querySelector('#tutupGambarTersimpan').onclick = function() {
        modalGambar.style.display = 'none';
    };
    modalGambar.style.display = 'flex';
}

navHome.addEventListener('click', () => {
    window.location.reload();
});
//BSAwaktu
function generateFileName() {
    const now = new Date();

    const tanggal = String(now.getDate()).padStart(2, '0');
    const bulan = String(now.getMonth() + 1).padStart(2, '0');
    const tahun = now.getFullYear();

    const jam = String(now.getHours()).padStart(2, '0');
    const menit = String(now.getMinutes()).padStart(2, '0');

    return `BSA_${tanggal}-${bulan}-${tahun}_${jam}-${menit}.png`;
}

// Simpan gambar lokal dengan batas jumlah agar penyimpanan WebView tidak cepat penuh.
function simpanKeTersimpan(imageData) {
    try {
        const data = JSON.parse(localStorage.getItem('bsaTersimpan') || '[]');
        data.unshift(imageData);
        localStorage.setItem('bsaTersimpan', JSON.stringify(data.slice(0, 3)));
    } catch (error) {
        console.warn('Gambar tidak dapat disimpan ke daftar lokal:', error);
    }
}

// Android menggunakan MediaStore melalui bridge native. Browser biasa memakai Blob URL.
async function unduhGambar(imageData) {
    if (!imageData || !imageData.startsWith('data:image/png;base64,')) {
        throw new Error('Gambar belum siap. Silakan tekan Preview lalu coba lagi.');
    }

    const fileName = generateFileName();
    if (window.AndroidBridge && typeof window.AndroidBridge.saveImage === 'function') {
        const berhasil = window.AndroidBridge.saveImage(imageData, fileName);
        if (!berhasil) throw new Error('Android gagal menyimpan gambar. Periksa ruang penyimpanan lalu coba lagi.');
        return;
    }

    const response = await fetch(imageData);
    const blob = await response.blob();
    const blobUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = fileName;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(blobUrl), 30000);
}

// Event listener untuk text yang bisa diedit
text.addEventListener("input", function() {
    if (previewModal.style.display === "block") {
        generateImage((imageData) => {
            previewImage.src = imageData;
        });
    }
});

// File dari galeri maupun kamera diproses melalui crop yang sama.
function bukaCropDariFile(file) {
    if (!file || !file.type || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = function(event) {
        cropImage.onload = function() {
            cropModal.style.display = 'block';
            if (cropper) cropper.destroy();
            cropper = new Cropper(cropImage, {
                aspectRatio: 1,
                viewMode: 1,
                dragMode: 'move',
                autoCropArea: 1,
                restore: false,
                guides: true,
                center: true,
                highlight: false,
                cropBoxMovable: false,
                cropBoxResizable: false,
                toggleDragModeOnDblclick: false,
                imageSmoothingEnabled: true,
                imageSmoothingQuality: 'high'
            });
            cropImage.onload = null;
        };
        cropImage.src = event.target.result;
    };
    reader.onerror = () => alert('Foto tidak dapat dibaca. Silakan coba foto lain.');
    reader.readAsDataURL(file);
}

bgInput.addEventListener('change', function(e) {
    bukaCropDariFile(e.target.files && e.target.files[0]);
    e.target.value = '';
});
cameraCaptureInput.addEventListener('change', function(e) {
    bukaCropDariFile(e.target.files && e.target.files[0]);
    e.target.value = '';
});

function hentikanKamera() {
    if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
        cameraStream = null;
    }
    cameraVideo.pause();
    cameraVideo.srcObject = null;
    cameraModal.style.display = 'none';
    cameraModal.setAttribute('aria-hidden', 'true');
}

async function mulaiKamera() {
    // Alamat LAN seperti http://192.168.x.x bukan secure context di Chrome Android.
    // Dalam kondisi ini, gunakan kamera bawaan Android melalui input capture.
    const dukungKameraLangsung = !!(
        window.isSecureContext &&
        navigator.mediaDevices &&
        typeof navigator.mediaDevices.getUserMedia === 'function'
    );

    if (!dukungKameraLangsung) {
        hentikanKamera();
        cameraMessage.textContent = 'Membuka kamera bawaan HP…';
        cameraCaptureInput.setAttribute('capture', cameraFacingMode);
        cameraCaptureInput.click();
        return;
    }

    try {
        if (cameraStream) cameraStream.getTracks().forEach(track => track.stop());
        cameraStream = await navigator.mediaDevices.getUserMedia({
            audio: false,
            video: {
                facingMode: { ideal: cameraFacingMode },
                width: { ideal: 1920 },
                height: { ideal: 1080 }
            }
        });
        cameraVideo.srcObject = cameraStream;
        cameraModal.style.display = 'block';
        cameraModal.setAttribute('aria-hidden', 'false');
        cameraMessage.textContent = cameraFacingMode === 'environment'
            ? 'Kamera belakang aktif.' : 'Kamera depan aktif.';
        await cameraVideo.play();
    } catch (error) {
        console.warn('Kamera langsung tidak tersedia:', error);
        hentikanKamera();
        if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
            alert('Izin kamera ditolak. Izinkan akses kamera untuk situs ini di pengaturan Chrome, lalu coba lagi.');
        } else {
            // Fallback ke aplikasi kamera bawaan Android.
            cameraCaptureInput.setAttribute('capture', cameraFacingMode);
            cameraCaptureInput.click();
        }
    }
}

openCameraBtn.addEventListener('click', mulaiKamera);
switchCameraBtn.addEventListener('click', async () => {
    cameraFacingMode = cameraFacingMode === 'environment' ? 'user' : 'environment';
    cameraCaptureInput.setAttribute('capture', cameraFacingMode);
    await mulaiKamera();
});
closeCameraBtn.addEventListener('click', hentikanKamera);
cameraModal.addEventListener('click', event => {
    if (event.target === cameraModal) hentikanKamera();
});
capturePhotoBtn.addEventListener('click', () => {
    if (!cameraStream || !cameraVideo.videoWidth) return;
    const canvas = document.createElement('canvas');
    canvas.width = cameraVideo.videoWidth;
    canvas.height = cameraVideo.videoHeight;
    const context = canvas.getContext('2d');
    context.drawImage(cameraVideo, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(blob => {
        if (blob) {
            hentikanKamera();
            bukaCropDariFile(new File([blob], 'foto-bsa.jpg', { type: 'image/jpeg' }));
        } else {
            alert('Gagal mengambil foto. Silakan coba lagi.');
        }
    }, 'image/jpeg', 0.95);
});

cropBtn.addEventListener("click", function() {
    if (cropper) {
        const canvas = cropper.getCroppedCanvas({
            width: 1080,
            height: 1080,
            imageSmoothingEnabled: true,
            imageSmoothingQuality: 'high'
        });
        background.src = canvas.toDataURL('image/jpeg', 1.0);
        cropModal.style.display = "none";
        cropper.destroy();
        cropper = null;
        if (previewModal.style.display === "block") {
            generateImage((imageData) => {
                previewImage.src = imageData;
            });
        }
    }
});

cancelCropBtn.addEventListener("click", function() {
    cropModal.style.display = "none";
    if (cropper) {
        cropper.destroy();
        cropper = null;
    }
});

function generateImage(callback) {
    document.fonts.ready.then(() => {
        const canvas = document.createElement("canvas");
        const hdSize = 1080;
        canvas.width = hdSize;
        canvas.height = hdSize;
        const ctx = canvas.getContext("2d", { alpha: false });

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        // Gunakan font yang sama persis dengan CSS
        const fontSize = Math.floor(hdSize * 0.055);
        ctx.font = `bold ${fontSize}px 'Amaranth', 'Inter', sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillStyle = "white";
        ctx.strokeStyle = "black";
        ctx.lineWidth = Math.ceil(hdSize * 0.005);

        const lineHeight = fontSize * 1.3;

        // Word wrap yang benar, pertahankan \n
        function smartWordWrap(text, maxWidth) {
            if (!text) return [''];
            const paragraphs = text.split('\n');
            const result = [];
            paragraphs.forEach(paragraph => {
                const words = paragraph.split(' ');
                let currentLine = '';
                words.forEach((word, i) => {
                    const testLine = currentLine ? currentLine + ' ' + word : word;
                    const testWidth = ctx.measureText(testLine).width;
                    if (testWidth > maxWidth && currentLine) {
                        result.push(currentLine);
                        currentLine = word;
                    } else {
                        currentLine = testLine;
                    }
                });
                if (currentLine) result.push(currentLine);
            });
            return result;
        }

        function drawElementsToCanvas() {
            if (background.src && background.src !== window.location.href) {
                const bgImg = new Image();
                bgImg.src = background.src;
                bgImg.onload = () => {
                    ctx.drawImage(bgImg, 0, 0, hdSize, hdSize);
                    drawOverlays();
                };
                bgImg.onerror = () => {
                    ctx.fillStyle = "black";
                    ctx.fillRect(0, 0, hdSize, hdSize);
                    drawOverlays();
                };
            } else {
                ctx.fillStyle = "black";
                ctx.fillRect(0, 0, hdSize, hdSize);
                drawOverlays();
            }
        }

        function drawOverlays() {
            const gradientHeight = hdSize * 0.22;
            const gradTop = ctx.createLinearGradient(0, 0, 0, gradientHeight);
            gradTop.addColorStop(0, "rgba(0, 0, 0, 0.8)");
            gradTop.addColorStop(1, "transparent");
            ctx.fillStyle = gradTop;
            ctx.fillRect(0, 0, hdSize, gradientHeight);
            const gradBottom = ctx.createLinearGradient(0, hdSize - gradientHeight, 0, hdSize);
            gradBottom.addColorStop(0, "transparent");
            gradBottom.addColorStop(1, "rgba(0, 0, 0, 0.8)");
            ctx.fillStyle = gradBottom;
            ctx.fillRect(0, hdSize - gradientHeight, hdSize, gradientHeight);

            // Gambar original-bsa
            // Blur area kiri bawah tanpa PNG
const blurWidth = Math.floor(hdSize * 0.20);
const blurHeight = Math.floor(hdSize * 0.14);
const x = hdSize - blurWidth;
const y = hdSize - blurHeight;

ctx.save();
ctx.filter = "blur(10px)";

// ambil potongan background lalu gambar ulang dengan blur
ctx.drawImage(
    canvas,
    x,
    y,
    blurWidth,
    blurHeight,
    x,
    y,
    blurWidth,
    blurHeight
);

ctx.restore();


            const maxTextWidth = hdSize - (hdSize * 0.167);
            const wrappedLines = smartWordWrap(text.innerText, maxTextWidth);
            const totalTextHeight = wrappedLines.length * lineHeight;
            const startY = (hdSize / 2) - (totalTextHeight / 2) + (lineHeight / 2);

            // Ambil warna teks dari editor
            const computedColor = getComputedStyle(text).color;
            ctx.fillStyle = computedColor;
            ctx.strokeStyle = "black";

            wrappedLines.forEach((line, index) => {
                const y = startY + (index * lineHeight);
                ctx.globalAlpha = 0.6;
                ctx.strokeText(line, hdSize / 2, y);
                ctx.globalAlpha = 1;
                ctx.fillText(line, hdSize / 2, y);
            });

            const logoImg = new Image();
            logoImg.crossOrigin = "anonymous";
            logoImg.src = "logo-bsa.png";
            logoImg.onload = () => {
                const logoWidth = Math.floor(hdSize * 0.194);
                const aspectRatio = logoImg.height / logoImg.width;
                const logoHeight = logoWidth * aspectRatio;
                const x = hdSize / 2 - logoWidth / 2;
                const y = hdSize - logoHeight;
                ctx.globalAlpha = 0.6;
                ctx.drawImage(logoImg, x, y, logoWidth, logoHeight);
                ctx.globalAlpha = 1.0;
                callback(canvas.toDataURL("image/png", 1.0));
            };
            logoImg.onerror = () => {
                callback(canvas.toDataURL("image/png", 1.0));
            };
        }

        drawElementsToCanvas();
    });
}

previewBtn.addEventListener("click", () => {
    generateImage((imageData) => {
        previewImage.src = imageData;
        previewModal.style.display = "block";
    });
});

saveBtn.addEventListener("click", async () => {
    saveBtn.disabled = true;
    const labelAwal = saveBtn.textContent;
    saveBtn.textContent = "Menyiapkan…";
    try {
        const imageData = await new Promise((resolve, reject) => {
            try { generateImage(resolve); } catch (error) { reject(error); }
        });
        await unduhGambar(imageData);
        simpanKeTersimpan(imageData);
    } catch (error) {
        console.error('Unduhan BSA gagal:', error);
        alert(error.message || 'Gagal mengunduh gambar. Silakan coba lagi.');
    } finally {
        saveBtn.disabled = false;
        saveBtn.textContent = labelAwal;
    }
});

downloadBtn.addEventListener("click", async () => {
    downloadBtn.disabled = true;
    const labelAwal = downloadBtn.textContent;
    downloadBtn.textContent = "Menyiapkan…";
    try {
        // Buat ulang hasil terbaru agar preview kosong atau kedaluwarsa tidak ikut diunduh.
        const imageData = await new Promise((resolve, reject) => {
            try { generateImage(resolve); } catch (error) { reject(error); }
        });
        previewImage.src = imageData;
        await unduhGambar(imageData);
        simpanKeTersimpan(imageData);
        previewModal.style.display = "none";
    } catch (error) {
        console.error('Unduhan preview BSA gagal:', error);
        alert(error.message || 'Gagal mengunduh gambar. Silakan coba lagi.');
    } finally {
        downloadBtn.disabled = false;
        downloadBtn.textContent = labelAwal;
    }
});

cancelPreviewBtn.addEventListener("click", () => {
    previewModal.style.display = "none";
});

previewModal.addEventListener("click", (e) => {
    if (e.target === previewModal) {
        previewModal.style.display = "none";
    }
});

window.addEventListener('pagehide', hentikanKamera);
