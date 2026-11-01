package id.bsa.app

import android.Manifest
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
import android.util.Base64
import android.webkit.*
import android.widget.Toast
import androidx.activity.ComponentActivity
import androidx.activity.result.contract.ActivityResultContracts
import androidx.core.content.ContextCompat
import androidx.core.content.FileProvider
import androidx.webkit.WebViewAssetLoader
import java.io.File

class MainActivity : ComponentActivity() {
    private lateinit var webView: WebView
    private var fileCallback: ValueCallback<Array<Uri>>? = null
    private var pendingWebPermission: PermissionRequest? = null
    private var pendingCameraUri: Uri? = null
    private var pendingCameraFile: File? = null

    private val cameraPermission = registerForActivityResult(
        ActivityResultContracts.RequestPermission()
    ) { granted ->
        val request = pendingWebPermission
        pendingWebPermission = null
        if (granted) request?.grant(arrayOf(PermissionRequest.RESOURCE_VIDEO_CAPTURE))
        else request?.deny()
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
                    launchNativeCameraForWebView()
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

    /** Simpan PNG ke galeri pada Android 10+, tanpa meminta izin storage umum. */
    private inner class AndroidDownloadBridge {
        @JavascriptInterface
        fun saveImage(dataUrl: String, requestedName: String): Boolean {
            return try {
                require(dataUrl.startsWith("data:image/png;base64,")) {
                    "Format gambar bukan PNG"
                }
                val encoded = dataUrl.substringAfter(",", "")
                require(encoded.isNotBlank() && encoded.length <= 25_000_000) {
                    "Ukuran gambar tidak valid"
                }
                val bytes = Base64.decode(encoded, Base64.DEFAULT)
                val safeName = requestedName
                    .replace(Regex("[^A-Za-z0-9._-]"), "_")
                    .let { if (it.endsWith(".png", ignoreCase = true)) it else "$it.png" }

                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                    val values = ContentValues().apply {
                        put(MediaStore.Images.Media.DISPLAY_NAME, safeName)
                        put(MediaStore.Images.Media.MIME_TYPE, "image/png")
                        put(
                            MediaStore.Images.Media.RELATIVE_PATH,
                            Environment.DIRECTORY_PICTURES + "/Budak Sunda Asli"
                        )
                        put(MediaStore.Images.Media.IS_PENDING, 1)
                    }

                    val uri = contentResolver.insert(
                        MediaStore.Images.Media.EXTERNAL_CONTENT_URI,
                        values
                    ) ?: error("Tidak dapat membuat file gambar")

                    try {
                        contentResolver.openOutputStream(uri, "w")?.use { it.write(bytes) }
                            ?: error("Tidak dapat membuka file gambar")
                        val publish = ContentValues().apply {
                            put(MediaStore.Images.Media.IS_PENDING, 0)
                        }
                        contentResolver.update(uri, publish, null, null)
                    } catch (error: Exception) {
                        contentResolver.delete(uri, null, null)
                        throw error
                    }
                } else {
                    // Untuk Android 9 ke bawah, simpan di folder Pictures milik aplikasi.
                    val directory = getExternalFilesDir(Environment.DIRECTORY_PICTURES)
                        ?: error("Folder penyimpanan tidak tersedia")
                    if (!directory.exists() && !directory.mkdirs()) {
                        error("Tidak dapat membuat folder penyimpanan")
                    }
                    File(directory, safeName).writeBytes(bytes)
                }

                val saveLocationMessage = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                    "PNG berhasil disimpan di Pictures/Budak Sunda Asli"
                } else {
                    "PNG berhasil disimpan di folder Gambar aplikasi BSA"
                }
                runOnUiThread {
                    Toast.makeText(
                        this@MainActivity,
                        saveLocationMessage,
                        Toast.LENGTH_LONG
                    ).show()
                }
                true
            } catch (error: Exception) {
                runOnUiThread {
                    Toast.makeText(
                        this@MainActivity,
                        "Gagal menyimpan PNG: ${error.message}",
                        Toast.LENGTH_LONG
                    ).show()
                }
                false
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
