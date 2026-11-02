package id.bsa.app

import android.Manifest
import android.util.Base64
import android.app.Activity
import android.content.ClipData
import android.content.ContentValues
import android.content.ActivityNotFoundException
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.os.Environment
import android.os.Bundle
import android.provider.MediaStore
import org.json.JSONObject
import android.webkit.*
import android.widget.Toast
import androidx.activity.ComponentActivity
import androidx.activity.result.contract.ActivityResultContracts
import androidx.core.content.ContextCompat
import androidx.core.content.FileProvider
import androidx.documentfile.provider.DocumentFile
import androidx.webkit.WebViewAssetLoader
import java.io.File

class MainActivity : ComponentActivity() {
    private lateinit var webView: WebView
    private var fileCallback: ValueCallback<Array<Uri>>? = null
    private var pendingWebPermission: PermissionRequest? = null
    private var pendingCameraUri: Uri? = null
    private var pendingCameraFile: File? = null
    private var pendingNativeCameraPermission = false
private val sdCardFolderPicker = registerForActivityResult(
        ActivityResultContracts.OpenDocumentTree()
    ) { uri ->
        if (uri != null) {
            try {
                contentResolver.takePersistableUriPermission(
                    uri,
                    Intent.FLAG_GRANT_READ_URI_PERMISSION or Intent.FLAG_GRANT_WRITE_URI_PERMISSION
                )
                getSharedPreferences("bsa_settings", MODE_PRIVATE)
                    .edit().putString("sdcard_tree_uri", uri.toString()).apply()
                Toast.makeText(this, "Folder SD Card berhasil dipilih", Toast.LENGTH_LONG).show()
            } catch (error: Exception) {
                Toast.makeText(this, "Gagal menyimpan izin folder: ${error.message}", Toast.LENGTH_LONG).show()
            }
        } else {
            Toast.makeText(this, "Pemilihan folder SD Card dibatalkan", Toast.LENGTH_SHORT).show()
        }
    }

    private val cameraPermission = registerForActivityResult(
        ActivityResultContracts.RequestPermission()
    ) { granted ->
        val request = pendingWebPermission
        pendingWebPermission = null

        if (pendingNativeCameraPermission) {
            pendingNativeCameraPermission = false
            if (granted) {
                launchNativeCameraForWebView()
            } else {
                fileCallback?.onReceiveValue(null)
                fileCallback = null
                Toast.makeText(
                    this,
                    "Izin kamera diperlukan untuk mengambil foto di BSA. Aktifkan izin Kamera melalui Pengaturan aplikasi jika ingin menggunakan fitur ini.",
                    Toast.LENGTH_LONG
                ).show()
            }
        } else if (granted) {
            request?.grant(arrayOf(PermissionRequest.RESOURCE_VIDEO_CAPTURE))
        } else {
            request?.deny()
            Toast.makeText(this, "Izin kamera tidak diberikan", Toast.LENGTH_SHORT).show()
        }
    }

    private val nativeCameraLauncher = registerForActivityResult(
        ActivityResultContracts.StartActivityForResult()
    ) { result ->
        val callback = fileCallback
        fileCallback = null
        val photoUri = pendingCameraUri
        val photoFile = pendingCameraFile
        pendingCameraUri = null
        pendingCameraFile = null

        if (result.resultCode == Activity.RESULT_OK &&
            photoUri != null && photoFile != null && photoFile.exists() && photoFile.length() > 0L
        ) {
            callback?.onReceiveValue(arrayOf(photoUri))
        } else {
            photoFile?.delete()
            callback?.onReceiveValue(null)
        }
    }

    private val filePicker = registerForActivityResult(
        ActivityResultContracts.StartActivityForResult()
    ) { result ->
        val callback = fileCallback
        fileCallback = null
        if (result.resultCode == Activity.RESULT_OK) {
            val data = result.data
            val uris = when {
                data?.clipData != null -> {
                    val clip = data.clipData!!
                    Array(clip.itemCount) { i -> clip.getItemAt(i).uri }
                }
                data?.data != null -> arrayOf(data.data!!)
                else -> emptyArray()
            }
            callback?.onReceiveValue(uris)
        } else callback?.onReceiveValue(null)
    }

    private fun isImageCaptureRequest(params: WebChromeClient.FileChooserParams?): Boolean {
        if (params?.isCaptureEnabled != true) return false
        val acceptedTypes = params.acceptTypes
            .filter { it.isNotBlank() }
            .map { it.trim().lowercase() }
        return acceptedTypes.isEmpty() || acceptedTypes.any {
            it == "*/*" || it.startsWith("image/")
        }
    }

    private fun launchNativeCameraForWebView() {
        val cameraIntent = Intent(MediaStore.ACTION_IMAGE_CAPTURE)
        if (cameraIntent.resolveActivity(packageManager) == null) {
            fileCallback?.onReceiveValue(null)
            fileCallback = null
            Toast.makeText(this, "Aplikasi kamera tidak ditemukan", Toast.LENGTH_LONG).show()
            return
        }

        try {
            val cameraDirectory = File(cacheDir, "bsa-camera")
            if (!cameraDirectory.exists() && !cameraDirectory.mkdirs()) {
                error("Folder foto sementara tidak dapat dibuat")
            }
            val photoFile = File(cameraDirectory, "BSA_${System.currentTimeMillis()}.jpg")
            val photoUri = FileProvider.getUriForFile(
                this,
                "$packageName.fileprovider",
                photoFile
            )

            cameraIntent.putExtra(MediaStore.EXTRA_OUTPUT, photoUri)
            cameraIntent.addFlags(
                Intent.FLAG_GRANT_READ_URI_PERMISSION or
                    Intent.FLAG_GRANT_WRITE_URI_PERMISSION
            )
            cameraIntent.clipData = ClipData.newUri(contentResolver, "BSA camera photo", photoUri)

            pendingCameraFile = photoFile
            pendingCameraUri = photoUri
            nativeCameraLauncher.launch(cameraIntent)
        } catch (error: ActivityNotFoundException) {
            fileCallback?.onReceiveValue(null)
            fileCallback = null
            Toast.makeText(this, "Tidak dapat membuka kamera: ${error.message}", Toast.LENGTH_LONG).show()
        } catch (error: Exception) {
            pendingCameraFile?.delete()
            pendingCameraFile = null
            pendingCameraUri = null
            fileCallback?.onReceiveValue(null)
            fileCallback = null
            Toast.makeText(this, "Gagal menyiapkan kamera: ${error.message}", Toast.LENGTH_LONG).show()
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        webView = WebView(this)
        setContentView(webView)

        val assetLoader = WebViewAssetLoader.Builder()
            .addPathHandler("/assets/", WebViewAssetLoader.AssetsPathHandler(this))
            .build()

        webView.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            allowFileAccess = false
            allowContentAccess = true
            mediaPlaybackRequiresUserGesture = true
            setSupportZoom(false)
            builtInZoomControls = false
            displayZoomControls = false
        }

        // Kode web lokal memanggil bridge ini untuk menyimpan PNG lewat MediaStore Android.
        webView.addJavascriptInterface(AndroidDownloadBridge(), "AndroidBridge")

        webView.webViewClient = object : WebViewClient() {
            override fun shouldInterceptRequest(
                view: WebView,
                request: WebResourceRequest
            ): WebResourceResponse? {
                return assetLoader.shouldInterceptRequest(request.url)
            }

            override fun shouldOverrideUrlLoading(
                view: WebView,
                request: WebResourceRequest
            ): Boolean {
                val url = request.url.toString()
                return if (url.startsWith("https://appassets.androidplatform.net/")) {
                    false
                } else {
                    if (url.startsWith("https://") || url.startsWith("http://")) {
                        startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(url)))
                    }
                    true
                }
            }
        }

        webView.webChromeClient = object : WebChromeClient() {
            override fun onPermissionRequest(request: PermissionRequest) {
                runOnUiThread {
                    if (request.resources.contains(PermissionRequest.RESOURCE_VIDEO_CAPTURE)) {
                        if (ContextCompat.checkSelfPermission(
                                this@MainActivity,
                                Manifest.permission.CAMERA
                            ) == PackageManager.PERMISSION_GRANTED
                        ) {
                            request.grant(arrayOf(PermissionRequest.RESOURCE_VIDEO_CAPTURE))
                        } else {
                            pendingWebPermission = request
                            cameraPermission.launch(Manifest.permission.CAMERA)
                        }
                    } else request.deny()
                }
            }

            override fun onShowFileChooser(
                webView: WebView?,
                callback: ValueCallback<Array<Uri>>?,
                params: FileChooserParams?
            ): Boolean {
                fileCallback?.onReceiveValue(null)
                fileCallback = callback

                // Input capture dari tombol Ambil Foto membuka aplikasi kamera Android.
                if (isImageCaptureRequest(params)) {
                    // Minta izin kamera Android sebelum membuka fitur Ambil Foto.
                    if (ContextCompat.checkSelfPermission(
                            this@MainActivity,
                            Manifest.permission.CAMERA
                        ) == PackageManager.PERMISSION_GRANTED
                    ) {
                        launchNativeCameraForWebView()
                    } else {
                        pendingNativeCameraPermission = true
                        cameraPermission.launch(Manifest.permission.CAMERA)
                    }
                    return true
                }

                // Input biasa tetap membuka pemilih gambar/galeri.
                val intent = Intent(Intent.ACTION_GET_CONTENT).apply {
                    addCategory(Intent.CATEGORY_OPENABLE)
                    type = "image/*"
                    putExtra(Intent.EXTRA_ALLOW_MULTIPLE, true)
                }
                filePicker.launch(Intent.createChooser(intent, "Pilih gambar"))
                return true
            }
        }

        webView.loadUrl("https://appassets.androidplatform.net/assets/index.html")
    }

    private fun pilihFolderSdCard() {
        sdCardFolderPicker.launch(null)
    }

    /** Bridge untuk pengaturan dan penyimpanan gambar aplikasi. */
    private inner class AndroidDownloadBridge {
        @JavascriptInterface


        private fun sendOcrResult(callbackId: String, recognizedText: String, errorMessage: String?) {
            val safeId = JSONObject.quote(callbackId)
            val safeText = JSONObject.quote(recognizedText)
            val safeError = if (errorMessage == null) "null" else JSONObject.quote(errorMessage)
            runOnUiThread {
                webView.evaluateJavascript(
                    "window.onBsaOcrResult && window.onBsaOcrResult($safeId, $safeText, $safeError)",
                    null
                )
            }
        }

        @JavascriptInterface
        fun chooseSdCardFolder() {
            runOnUiThread { pilihFolderSdCard() }
        }

        @JavascriptInterface
        fun listImages(requestedLocation: String): String {
            return try {
                val result = org.json.JSONArray()
                val imageFiles = mutableListOf<Pair<String, ByteArray>>()

                if (requestedLocation == "sdcard") {
                    val prefs = getSharedPreferences("bsa_settings", MODE_PRIVATE)
                    val treeUriString = prefs.getString("sdcard_tree_uri", null)
                        ?: return org.json.JSONObject()
                            .put("error", "Folder Kartu SD belum dipilih. Buka Pengaturan lalu pilih folder.")
                            .toString()
                    val treeUri = Uri.parse(treeUriString)

                    // Jangan membandingkan Uri secara mentah saja. Beberapa penyedia dokumen
                    // mengembalikan representasi Uri yang berbeda meski menunjuk folder yang sama.
                    val persisted = contentResolver.persistedUriPermissions.any { permission ->
                        permission.isReadPermission &&
                            permission.uri.authority == treeUri.authority &&
                            permission.uri.toString().trimEnd('/') == treeUri.toString().trimEnd('/')
                    }
                    if (!persisted) {
                        return org.json.JSONObject()
                            .put("error", "Izin baca Kartu SD belum tersimpan. Pilih ulang folder Kartu SD di Pengaturan.")
                            .toString()
                    }

                    val tree = DocumentFile.fromTreeUri(this@MainActivity, treeUri)
                        ?: return org.json.JSONObject().put("error", "Folder Kartu SD tidak dapat dibuka. Pilih ulang foldernya.").toString()
                    if (!tree.canRead()) {
                        return org.json.JSONObject().put("error", "Android tidak memberikan izin baca pada folder ini. Pilih folder lain.").toString()
                    }

                    fun collectImages(folder: DocumentFile, depth: Int) {
                        folder.listFiles().forEach { entry ->
                            if (entry.isFile) {
                                val ext = entry.name?.substringAfterLast('.', "")?.lowercase()
                                if (ext in listOf("png", "jpg", "jpeg", "webp")) {
                                    try {
                                        contentResolver.openInputStream(entry.uri)?.use { input ->
                                            imageFiles.add((entry.name ?: "Gambar") to input.readBytes())
                                        }
                                    } catch (readError: Exception) {
                                        android.util.Log.w("BSA-Koleksi", "Gagal membaca ${entry.name}", readError)
                                    }
                                }
                            } else if (entry.isDirectory && depth < 2 &&
                                (depth == 0 || entry.name.equals("BSA", ignoreCase = true))) {
                                collectImages(entry, depth + 1)
                            }
                        }
                    }
                    collectImages(tree, 0)
                } else {
                    val folder = File(filesDir, "BSA")
                    if (folder.exists() && !folder.isDirectory) {
                        return org.json.JSONObject().put("error", "Lokasi penyimpanan internal BSA tidak valid.").toString()
                    }
                    folder.listFiles()?.filter {
                        it.isFile && it.extension.lowercase() in listOf("png", "jpg", "jpeg", "webp")
                    }?.sortedByDescending { it.lastModified() }?.forEach { file ->
                        imageFiles.add(file.name to file.readBytes())
                    }
                }

                imageFiles.forEach { (name, bytes) ->
                    val item = JSONObject()
                    item.put("id", name)
                    item.put("name", name)
                    val mime = when (name.substringAfterLast('.', "").lowercase()) {
                        "jpg", "jpeg" -> "image/jpeg"
                        "webp" -> "image/webp"
                        else -> "image/png"
                    }
                    item.put("dataUrl", "data:$mime;base64," + Base64.encodeToString(bytes, Base64.NO_WRAP))
                    result.put(item)
                }
                result.toString()
            } catch (error: Exception) {
                android.util.Log.e("BSA-Koleksi", "Gagal membaca lokasi $requestedLocation", error)
                org.json.JSONObject()
                    .put("error", "Gagal membaca penyimpanan: ${error.message ?: "izin atau folder tidak tersedia"}")
                    .toString()
            }
        }

        @JavascriptInterface
        fun deleteImage(imageId: String, requestedLocation: String): Boolean {
            return try {
                if (requestedLocation == "sdcard") {
                    val treeUri = getSharedPreferences("bsa_settings", MODE_PRIVATE).getString("sdcard_tree_uri", null) ?: return false
                    val tree = DocumentFile.fromTreeUri(this@MainActivity, Uri.parse(treeUri)) ?: return false
                    tree.findFile(imageId)?.delete() == true
                } else {
                    val safeName = File(imageId).name
                    val file = File(File(filesDir, "BSA"), safeName)
                    file.isFile && file.delete()
                }
            } catch (_: Exception) { false }
        }

        @JavascriptInterface
        fun saveImage(dataUrl: String, requestedName: String, requestedLocation: String): String {
            return try {
                require(dataUrl.startsWith("data:image/png;base64,")) {
                    "Format gambar bukan PNG"
                }
                val encoded = dataUrl.substringAfter(",", "")
                require(encoded.isNotBlank()) { "Data gambar kosong" }
                val bytes = Base64.decode(encoded, Base64.DEFAULT)
                val safeName = requestedName
                    .replace(Regex("[^A-Za-z0-9._-]"), "_")
                    .let { if (it.endsWith(".png", ignoreCase = true)) it else "$it.png" }

                val useInternalStorage = requestedLocation == "internal"
                val useSdCard = requestedLocation == "sdcard"
                if (useInternalStorage) {
                    val directory = File(filesDir, "BSA")
                    if (!directory.exists() && !directory.mkdirs()) {
                        error("Folder penyimpanan internal tidak dapat dibuat")
                    }
                    val output = File(directory, safeName)
                    val temporary = File(directory, "$safeName.tmp")
                    temporary.outputStream().use { stream -> stream.write(bytes); stream.flush() }
                    if (output.exists() && !output.delete()) error("File lama tidak dapat diganti")
                    if (!temporary.renameTo(output)) {
                        temporary.copyTo(output, overwrite = true)
                        temporary.delete()
                    }
                    if (!output.exists() || output.length() != bytes.size.toLong()) error("Verifikasi file hasil simpan gagal")
                } else if (useSdCard) {
                    val treeUriString = getSharedPreferences("bsa_settings", MODE_PRIVATE)
                        .getString("sdcard_tree_uri", null)
                        ?: error("Pilih folder SD Card terlebih dahulu melalui Pengaturan")
                    val tree = DocumentFile.fromTreeUri(this@MainActivity, Uri.parse(treeUriString))
                        ?: error("Folder SD Card tidak dapat diakses. Pilih ulang foldernya")
                    if (!tree.canWrite()) error("Folder SD Card tidak memiliki izin tulis. Pilih folder lain")
                    tree.findFile(safeName)?.delete()
                    val outputFile = tree.createFile("image/png", safeName)
                        ?: error("Tidak dapat membuat file di SD Card")
                    contentResolver.openOutputStream(outputFile.uri, "w")?.use { it.write(bytes) }
                        ?: error("Tidak dapat menulis file ke SD Card")
                } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                    val values = ContentValues().apply {
                        put(MediaStore.Images.Media.DISPLAY_NAME, safeName)
                        put(MediaStore.Images.Media.MIME_TYPE, "image/png")
                        put(MediaStore.Images.Media.RELATIVE_PATH, Environment.DIRECTORY_PICTURES + "/Budak Sunda Asli")
                        put(MediaStore.Images.Media.IS_PENDING, 1)
                    }
                    val uri = contentResolver.insert(MediaStore.Images.Media.EXTERNAL_CONTENT_URI, values)
                        ?: error("Tidak dapat membuat file gambar")
                    try {
                        contentResolver.openOutputStream(uri, "w")?.use { it.write(bytes) }
                            ?: error("Tidak dapat membuka file gambar")
                        val publish = ContentValues().apply { put(MediaStore.Images.Media.IS_PENDING, 0) }
                        contentResolver.update(uri, publish, null, null)
                    } catch (error: Exception) {
                        contentResolver.delete(uri, null, null)
                        throw error
                    }
                } else {
                    val directory = File(getExternalFilesDir(Environment.DIRECTORY_PICTURES), "Budak Sunda Asli")
                    if (!directory.exists() && !directory.mkdirs()) {
                        error("Tidak dapat membuat folder penyimpanan")
                    }
                    File(directory, safeName).writeBytes(bytes)
                }

                val saveLocationMessage = when {
                    useInternalStorage -> "PNG disimpan di penyimpanan internal aplikasi BSA"
                    useSdCard -> "PNG berhasil disimpan ke folder SD Card pilihan Anda"
                    else -> "PNG berhasil disimpan di Pictures/Budak Sunda Asli"
                }

                runOnUiThread {
                    Toast.makeText(
                        this@MainActivity,
                        saveLocationMessage,
                        Toast.LENGTH_LONG
                    ).show()
                }
                "OK"
            } catch (error: Exception) {
                runOnUiThread {
                    Toast.makeText(
                        this@MainActivity,
                        "Gagal menyimpan PNG: ${error.message}",
                        Toast.LENGTH_LONG
                    ).show()
                }
                "ERROR: ${error.message ?: "Kesalahan penyimpanan tidak diketahui"}"
            }
        }
    }

    @Deprecated("Deprecated in Java")
    override fun onBackPressed() {
        if (::webView.isInitialized && webView.canGoBack()) webView.goBack()
        else super.onBackPressed()
    }

    override fun onDestroy() {
        if (::webView.isInitialized) {
            webView.loadUrl("about:blank")
            webView.destroy()
        }
        super.onDestroy()
    }
}
