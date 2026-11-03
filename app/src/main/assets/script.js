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

// Pengaturan aplikasi BSA (tersimpan di perangkat).
const settingsPanel = document.getElementById('settingsPanel');
const darkModeToggle = document.getElementById('darkModeToggle');
const watermarkToggle = document.getElementById('watermarkToggle');
const storageLocation = document.getElementById('storageLocation');
const storageDescription = document.getElementById('storageDescription');
const chooseSdCardFolderBtn = document.getElementById('chooseSdCardFolderBtn');

function muatPengaturanBSA() {
    const dark = localStorage.getItem('bsa_dark_mode') !== 'false';
    const watermark = localStorage.getItem('bsa_watermark') !== 'false';
    const location = localStorage.getItem('bsa_storage_location') || 'internal';
    darkModeToggle.checked = dark;
    watermarkToggle.checked = watermark;
    storageLocation.value = location;
    document.body.classList.toggle('light-mode', !dark);
    if (logo) logo.style.display = watermark ? '' : 'none';
    perbaruiDeskripsiPenyimpanan();
}
function perbaruiDeskripsiPenyimpanan() {
    const isSdCard = storageLocation.value === 'sdcard';
    chooseSdCardFolderBtn.hidden = !isSdCard;
    storageDescription.textContent = isSdCard
        ? 'Tekan tombol Pilih folder SD Card, lalu pilih folder pada kartu microSD. BSA akan menyimpan hasil unduhan ke folder yang Anda izinkan.'
        : 'Hasil PNG disimpan di memori internal HP, folder Pictures/BSA, dan dapat dilihat melalui Galeri atau File Manager.';
}
function bukaPengaturan() {
    settingsPanel.hidden = false;
    // Memastikan browser menerapkan posisi awal sebelum animasi masuk.
    settingsPanel.classList.remove('settings-panel-open');
    requestAnimationFrame(() => settingsPanel.classList.add('settings-panel-open'));
}
function tutupPengaturan() {
    settingsPanel.classList.remove('settings-panel-open');
    window.setTimeout(() => {
        if (!settingsPanel.classList.contains('settings-panel-open')) {
            settingsPanel.hidden = true;
        }
    }, 300);
}
// Navigasi Pengaturan menggunakan gesture geser (swipe), tanpa tombol.
let swipeStartX = 0;
let swipeStartY = 0;
let swipeTracking = false;
document.addEventListener('touchstart', (event) => {
    if (!event.touches || event.touches.length !== 1) return;
    const touch = event.touches[0];
    const panelTerbuka = !settingsPanel.hidden && settingsPanel.classList.contains('settings-panel-open');
    // Saat tertutup, gesture dimulai dari tepi kiri layar.
    // Saat terbuka, gesture dapat dimulai dari area panel untuk menutupnya.
    if ((!panelTerbuka && touch.clientX <= 32) || (panelTerbuka && settingsPanel.contains(event.target))) {
        swipeStartX = touch.clientX;
        swipeStartY = touch.clientY;
        swipeTracking = true;
    } else {
        swipeTracking = false;
    }
}, { passive: true });

document.addEventListener('touchend', (event) => {
    if (!swipeTracking || !event.changedTouches || !event.changedTouches.length) return;
    const touch = event.changedTouches[0];
    const deltaX = touch.clientX - swipeStartX;
    const deltaY = touch.clientY - swipeStartY;
    // Abaikan scroll vertikal dan geseran pendek.
    if (Math.abs(deltaX) >= 70 && Math.abs(deltaX) > Math.abs(deltaY) * 1.3) {
        const panelTerbuka = !settingsPanel.hidden && settingsPanel.classList.contains('settings-panel-open');
        if (!panelTerbuka && deltaX > 0) bukaPengaturan();
        else if (panelTerbuka && deltaX < 0) tutupPengaturan();
    }
    swipeTracking = false;
}, { passive: true });

document.addEventListener('touchcancel', () => { swipeTracking = false; }, { passive: true });
darkModeToggle.addEventListener('change', () => {
    localStorage.setItem('bsa_dark_mode', String(darkModeToggle.checked));
    document.body.classList.toggle('light-mode', !darkModeToggle.checked);
});
watermarkToggle.addEventListener('change', () => {
    localStorage.setItem('bsa_watermark', String(watermarkToggle.checked));
    if (logo) logo.style.display = watermarkToggle.checked ? '' : 'none';
});
storageLocation.addEventListener('change', () => {
    localStorage.setItem('bsa_storage_location', storageLocation.value);
    perbaruiDeskripsiPenyimpanan();
});
chooseSdCardFolderBtn.addEventListener('click', () => {
    if (window.AndroidBridge?.chooseSdCardFolder) window.AndroidBridge.chooseSdCardFolder();
    else alert('Pemilihan folder SD Card hanya tersedia di aplikasi Android BSA.');
});
muatPengaturanBSA();


// Modal untuk daftar tersimpan
let modalTersimpan = null;
function buatModalTersimpan() {
    if (modalTersimpan) return modalTersimpan;
    modalTersimpan = document.createElement('section');
    modalTersimpan.id = 'modalTersimpan';
    modalTersimpan.className = 'bsa-collection-overlay';
    modalTersimpan.innerHTML = `
      <div class="bsa-collection-panel" role="dialog" aria-modal="true" aria-labelledby="koleksiTitle">
        <header class="bsa-collection-header">
          <div>
            <div class="bsa-collection-eyebrow">GALERI LOKAL BSA</div>
            <h2 id="koleksiTitle">Koleksi</h2>
            <p id="koleksiLocation">Penyimpanan aktif</p>
          </div>
          <div class="bsa-collection-actions">
            <button id="refreshTersimpan" class="bsa-collection-iconbtn" aria-label="Muat ulang koleksi" title="Muat ulang">↻</button>
            <button id="closeTersimpan" class="bsa-collection-iconbtn" aria-label="Tutup koleksi" title="Tutup">×</button>
          </div>
        </header>
        <div class="bsa-collection-toolbar">
          <span id="koleksiCount">Memuat daftar gambar</span>
          <span class="bsa-collection-format">PNG · JPG · WEBP</span>
        </div>
        <div id="koleksiLoading" class="koleksi-loading" role="status" aria-live="polite">
          <span class="koleksi-spinner"></span><span>Memuat gambar...</span>
        </div>
        <div id="listTersimpan" class="bsa-collection-grid"></div>
      </div>`;
    document.body.appendChild(modalTersimpan);
    modalTersimpan.querySelector('#closeTersimpan').onclick = () => {
        modalTersimpan.style.display = 'none';
        setBsaNav('home');
    };
    modalTersimpan.querySelector('#refreshTersimpan').onclick = () => tampilkanTersimpan();
    return modalTersimpan;
}

function ambilDaftarKoleksi() {
    if (window.AndroidBridge && typeof window.AndroidBridge.listImages === 'function') {
        try { return JSON.parse(window.AndroidBridge.listImages(localStorage.getItem('bsa_storage_location') || 'internal') || '[]'); }
        catch (error) {
            console.error('Gagal membaca folder BSA:', error);
            return { error: 'Koleksi gagal menghubungi penyimpanan Android. Tutup Koleksi, buka kembali, lalu periksa izin folder di Pengaturan.' };
        }
    }
    return JSON.parse(localStorage.getItem('bsaTersimpan') || '[]').map((dataUrl, i) => ({ id: String(i), dataUrl, name: 'Gambar BSA' }));
}

async function tampilkanTersimpan() {
    const modal = buatModalTersimpan();
    const listDiv = modal.querySelector('#listTersimpan');
    const loading = modal.querySelector('#koleksiLoading');
    listDiv.innerHTML = '';
    modal.querySelector('#koleksiCount').textContent = 'Memuat daftar gambar';
    const activeLocation = localStorage.getItem('bsa_storage_location') || 'internal';
    modal.querySelector('#koleksiLocation').textContent = activeLocation === 'sdcard' ? 'Lokasi: Kartu SD' : 'Lokasi: Penyimpanan internal';
    loading.style.display = 'flex';
    modal.style.display = 'flex';
    await new Promise(resolve => requestAnimationFrame(() => setTimeout(resolve, 40)));
    try {
        const data = ambilDaftarKoleksi();
        if (data && !Array.isArray(data) && data.error) {
            listDiv.innerHTML = '<div style="grid-column:1/-1;color:#ff8a8a;text-align:center;padding:24px 8px;">' +
                String(data.error).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])) +
                '</div>';
            return;
        }
        if (!data || data.length === 0) {
            modal.querySelector('#koleksiCount').textContent = '0 gambar';
            listDiv.innerHTML = '<div class="bsa-collection-empty"><div class="bsa-collection-empty-icon">▧</div><strong>Belum ada gambar</strong><span>Simpan gambar ke lokasi ini untuk melihatnya di Koleksi.</span></div>';
            return;
        }
        modal.querySelector('#koleksiCount').textContent = `${data.length} gambar`;
        const waits = data.map((item, i) => new Promise(resolve => {
            const card = document.createElement('button');
            card.type = 'button';
            card.className = 'bsa-collection-card';
            card.setAttribute('aria-label', `Buka ${item.name || 'gambar ' + (i + 1)}`);
            const image = document.createElement('img');
            image.alt = item.name || 'Gambar BSA';
            image.loading = 'eager';
            const caption = document.createElement('span');
            caption.className = 'bsa-collection-filename';
            caption.textContent = item.name || `Gambar ${i + 1}`;
            card.append(image, caption);
            card.onclick = () => tampilkanModalGambarTersimpan(item, i);
            image.onload = resolve;
            image.onerror = resolve;
            listDiv.appendChild(card);
            image.src = item.dataUrl;
            if (image.complete) resolve();
        }));
        await Promise.all(waits);
    } catch (error) {
        console.error('Gagal memuat gambar koleksi:', error);
        listDiv.innerHTML = '<div style="grid-column:1/-1;color:#ff8a8a;text-align:center;padding:24px 8px;">Gambar gagal dimuat. Periksa izin dan lokasi penyimpanan.</div>';
    } finally {
        loading.style.display = 'none';
    }
}

function tampilkanModalGambarTersimpan(item, index) {
    const img = typeof item === 'string' ? item : item.dataUrl;
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
        if (window.AndroidBridge && typeof window.AndroidBridge.deleteImage === 'function' && typeof item !== 'string') {
            if (!window.AndroidBridge.deleteImage(String(item.id), localStorage.getItem('bsa_storage_location') || 'internal')) { alert('Gambar gagal dihapus dari penyimpanan.'); return; }
        } else {
            let data = JSON.parse(localStorage.getItem('bsaTersimpan') || '[]');
            data.splice(index, 1);
            localStorage.setItem('bsaTersimpan', JSON.stringify(data));
        }
        modalGambar.style.display = 'none';
        tampilkanTersimpan();
    };
    modalGambar.querySelector('#tutupGambarTersimpan').onclick = function() {
        modalGambar.style.display = 'none';
    };
    modalGambar.style.display = 'flex';
}

// Navigasi bawah BSA: Home dan Pengaturan.
const bsaNavItems = document.querySelectorAll('.bsa-nav-item');

function setBsaNav(page) {
    bsaNavItems.forEach(item => {
        item.classList.toggle('active', item.dataset.page === page);
        item.setAttribute('aria-current', item.dataset.page === page ? 'page' : 'false');
    });
}

function tutupKoleksi() {
    const modal = document.getElementById('modalTersimpan');
    if (modal) modal.style.display = 'none';
    const modalGambar = document.getElementById('modalGambarTersimpan');
    if (modalGambar) modalGambar.style.display = 'none';
}

function bukaHome() {
    // Home selalu mengembalikan aplikasi ke kondisi awal dengan memuat ulang halaman.
    // Preferensi yang disimpan di localStorage (tema, watermark, lokasi penyimpanan)
    // tetap dipertahankan setelah halaman dimuat ulang.
    window.location.reload();
}

const closeSettingsBtn = document.getElementById('closeSettingsBtn');
if (closeSettingsBtn) closeSettingsBtn.addEventListener('click', () => { tutupPengaturan(); setBsaNav('home'); });

const navCamera = document.getElementById('navCamera');
if (navCamera) {
    navCamera.addEventListener('click', () => {
        const cameraButton = document.getElementById('openCameraBtn');
        if (cameraButton) cameraButton.click();
    });
}

bsaNavItems.forEach(item => {
    item.addEventListener('click', () => {
        const page = item.dataset.page;
        if (page === 'home') {
            bukaHome();
        } else if (page === 'settings') {
            tutupKoleksi();
            setBsaNav('settings');
            bukaPengaturan();
            settingsPanel.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    });
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
        const hasilSimpan = window.AndroidBridge.saveImage(imageData, fileName, localStorage.getItem('bsa_storage_location') || 'internal');
        if (hasilSimpan !== 'OK') {
            const detail = String(hasilSimpan || '').replace(/^ERROR:\s*/, '');
            throw new Error(detail || 'Android gagal menyimpan gambar. Periksa lokasi dan ruang penyimpanan.');
        }
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

// Panggil kamera bawaan Android. WebView akan meneruskan input capture
// ke ACTION_IMAGE_CAPTURE melalui onShowFileChooser di MainActivity.
openCameraBtn.addEventListener('click', () => {
    cameraFacingMode = 'environment';
    cameraCaptureInput.setAttribute('capture', 'environment');
    cameraCaptureInput.click();
});
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

            if (localStorage.getItem('bsa_watermark') === 'false') {
                callback(canvas.toDataURL("image/png", 1.0));
                return;
            }
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
        if (!(window.AndroidBridge && typeof window.AndroidBridge.saveImage === 'function')) simpanKeTersimpan(imageData);
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
        if (!(window.AndroidBridge && typeof window.AndroidBridge.saveImage === 'function')) simpanKeTersimpan(imageData);
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
