package com.notas.app;

import android.app.Activity;
import android.content.ClipData;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.Matrix;
import android.graphics.Paint;
import android.graphics.Typeface;
import android.media.ExifInterface;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.print.PrintManager;
import android.provider.MediaStore;
import android.util.Base64;
import android.view.View;
import android.webkit.JavascriptInterface;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;

public class MainActivity extends Activity {
    private static final int CHOOSE_PRODUCT_IMAGE = 1001;
    private static final int CREATE_BACKUP = 1002;
    private static final int TAKE_PRODUCT_IMAGE = 1003;
    private static final int BUNDLED_VERSION_CODE = 9;
    private static final String BUNDLED_VERSION_NAME = "1.7.2";
    private static final String PREFS_NAME = "notas_local";
    private static final String KEY_STATE = "state";
    private static final String KEY_OTA_CODE = "ota_version_code";
    private static final String KEY_OTA_WEB = "ota_web_version";
    private static final String KEY_PENDING_CAMERA_PATH = "camera_pending_path";
    private static final String KEY_PENDING_CAMERA_DATA = "camera_pending_data";
    private static final String KEY_TEMP_DRAFT = "temp_product_draft";

    private WebView webView;
    private ValueCallback<Uri[]> pendingImageChooser;
    private ValueCallback<Uri[]> pendingCameraChooser;
    private File pendingCameraFile;
    private String pendingBackup;
    private volatile boolean webPageLoaded = false;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            getWindow().setStatusBarColor(Color.parseColor("#f5f7f3"));
            getWindow().setNavigationBarColor(Color.WHITE);
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            View decor = getWindow().getDecorView();
            int flags = decor.getSystemUiVisibility() | View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                flags |= View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR;
            }
            decor.setSystemUiVisibility(flags);
        }

        webView = new WebView(this);
        webView.setBackgroundColor(Color.parseColor("#f5f7f3"));

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setAllowFileAccess(true);
        settings.setAllowContentAccess(true);
        settings.setJavaScriptCanOpenWindowsAutomatically(true);

        webView.addJavascriptInterface(new NotasBridge(), "NotasApp");

        webView.setWebViewClient(new WebViewClient() {
            @Override
            public void onPageFinished(WebView view, String url) {
                super.onPageFinished(view, url);
                webPageLoaded = true;
                view.evaluateJavascript("window.notasReceiveCameraResult && window.notasReceiveCameraResult()", null);
            }

            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri uri = request != null ? request.getUrl() : null;
                if (uri == null) return false;
                String scheme = uri.getScheme();
                if ("file".equals(scheme)) {
                    return false;
                }
                try {
                    startActivity(new Intent(Intent.ACTION_VIEW, uri));
                    return true;
                } catch (Exception e) {
                    return false;
                }
            }
        });

        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onShowFileChooser(WebView view, ValueCallback<Uri[]> filePathCallback, FileChooserParams fileChooserParams) {
                if (fileChooserParams != null && fileChooserParams.isCaptureEnabled()) {
                    if (pendingImageChooser != null) {
                        pendingImageChooser.onReceiveValue(null);
                        pendingImageChooser = null;
                    }
                    launchNativeCamera(filePathCallback);
                    return true;
                }
                if (pendingImageChooser != null) {
                    pendingImageChooser.onReceiveValue(null);
                }
                pendingImageChooser = filePathCallback;
                try {
                    Intent intent = fileChooserParams != null
                            ? fileChooserParams.createIntent()
                            : new Intent(Intent.ACTION_GET_CONTENT).setType("image/*");
                    startActivityForResult(intent, CHOOSE_PRODUCT_IMAGE);
                    return true;
                } catch (Exception e) {
                    pendingImageChooser = null;
                    Toast.makeText(MainActivity.this, "No se pudo abrir la galería", Toast.LENGTH_SHORT).show();
                    return false;
                }
            }
        });

        setContentView(webView);
        webView.loadUrl(resolveStartUrl());
    }

    private String resolveStartUrl() {
        SharedPreferences prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        int otaCode = prefs.getInt(KEY_OTA_CODE, 0);
        File otaIndex = new File(new File(getFilesDir(), "www"), "index.html");
        if (otaCode >= BUNDLED_VERSION_CODE && otaIndex.exists() && otaIndex.isFile()) {
            return Uri.fromFile(otaIndex).toString();
        }
        return "file:///android_asset/www/index.html";
    }

    private void downloadToFile(String urlStr, File dest) throws Exception {
        HttpURLConnection conn = (HttpURLConnection) new URL(urlStr).openConnection();
        conn.setConnectTimeout(15000);
        conn.setReadTimeout(30000);
        conn.setInstanceFollowRedirects(true);
        int code = conn.getResponseCode();
        if (code < 200 || code >= 300) {
            throw new IllegalStateException("HTTP " + code);
        }
        File parent = dest.getParentFile();
        if (parent != null && !parent.exists()) parent.mkdirs();
        try (InputStream in = conn.getInputStream(); FileOutputStream out = new FileOutputStream(dest)) {
            byte[] buf = new byte[8192];
            int n;
            while ((n = in.read(buf)) != -1) {
                out.write(buf, 0, n);
            }
            out.flush();
        } finally {
            conn.disconnect();
        }
        if (dest.length() == 0) {
            throw new IllegalStateException("Archivo vacío");
        }
    }

    private void deleteRecursive(File file) {
        if (file == null || !file.exists()) return;
        if (file.isDirectory()) {
            File[] children = file.listFiles();
            if (children != null) {
                for (File child : children) deleteRecursive(child);
            }
        }
        file.delete();
    }

    @Override
    public void onBackPressed() {
        if (webView == null) {
            super.onBackPressed();
            return;
        }
        webView.evaluateJavascript("window.notasBack ? window.notasBack() : false", value -> {
            if (!"true".equals(value)) {
                MainActivity.super.onBackPressed();
            }
        });
    }

    private void saveCameraPendingResult(String result) {
        getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
                .edit()
                .putString(KEY_PENDING_CAMERA_DATA, result)
                .commit();
        runOnUiThread(() -> {
            if (webView != null && webPageLoaded) {
                webView.evaluateJavascript("window.notasReceiveCameraResult && window.notasReceiveCameraResult()", null);
            }
        });
    }

    private void launchNativeCamera(ValueCallback<Uri[]> chooserCallback) {
        if (pendingCameraChooser != null) {
            pendingCameraChooser.onReceiveValue(null);
            pendingCameraChooser = null;
        }
        pendingCameraChooser = chooserCallback;
        SharedPreferences prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        try {
            File dir = new File(getCacheDir(), "camera");
            if (!dir.exists()) dir.mkdirs();
            pendingCameraFile = new File(dir, "capture-" + System.currentTimeMillis() + ".jpg");
            prefs.edit()
                    .putString(KEY_PENDING_CAMERA_PATH, pendingCameraFile.getAbsolutePath())
                    .remove(KEY_PENDING_CAMERA_DATA)
                    .commit();
            Uri uri = ShareFileProvider.uriForCamera(this, pendingCameraFile);
            Intent intent = new Intent(MediaStore.ACTION_IMAGE_CAPTURE);
            intent.putExtra(MediaStore.EXTRA_OUTPUT, uri);
            intent.setClipData(ClipData.newRawUri("photo", uri));
            intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_GRANT_WRITE_URI_PERMISSION);
            startActivityForResult(intent, TAKE_PRODUCT_IMAGE);
        } catch (Exception e) {
            if (pendingCameraFile != null && pendingCameraFile.exists()) {
                pendingCameraFile.delete();
            }
            pendingCameraFile = null;
            prefs.edit().remove(KEY_PENDING_CAMERA_PATH).commit();
            if (pendingCameraChooser != null) {
                pendingCameraChooser.onReceiveValue(null);
                pendingCameraChooser = null;
            } else {
                saveCameraPendingResult("ERR");
            }
            Toast.makeText(this, "No se pudo abrir la cámara", Toast.LENGTH_SHORT).show();
        }
    }

    private String encodeCapturedBitmap(File file) {
        try {
            BitmapFactory.Options bounds = new BitmapFactory.Options();
            bounds.inJustDecodeBounds = true;
            BitmapFactory.decodeFile(file.getAbsolutePath(), bounds);
            int maxDim = Math.max(bounds.outWidth, bounds.outHeight);
            int sample = 1;
            while (maxDim / sample > 960) {
                sample *= 2;
            }
            BitmapFactory.Options opts = new BitmapFactory.Options();
            opts.inSampleSize = sample;
            Bitmap raw = BitmapFactory.decodeFile(file.getAbsolutePath(), opts);
            if (raw == null) return "";

            int rotate = 0;
            try {
                ExifInterface exif = new ExifInterface(file.getAbsolutePath());
                int orientation = exif.getAttributeInt(ExifInterface.TAG_ORIENTATION, ExifInterface.ORIENTATION_NORMAL);
                if (orientation == ExifInterface.ORIENTATION_ROTATE_90) rotate = 90;
                else if (orientation == ExifInterface.ORIENTATION_ROTATE_180) rotate = 180;
                else if (orientation == ExifInterface.ORIENTATION_ROTATE_270) rotate = 270;
            } catch (Exception ignored) {
            }

            Bitmap oriented = raw;
            if (rotate != 0) {
                Matrix m = new Matrix();
                m.postRotate(rotate);
                oriented = Bitmap.createBitmap(raw, 0, 0, raw.getWidth(), raw.getHeight(), m, true);
                if (oriented != raw) raw.recycle();
            }

            Bitmap square = Bitmap.createBitmap(320, 320, Bitmap.Config.ARGB_8888);
            Canvas canvas = new Canvas(square);
            canvas.drawColor(Color.WHITE);
            float scale = Math.min(320f / oriented.getWidth(), 320f / oriented.getHeight());
            float w = Math.max(1f, oriented.getWidth() * scale);
            float h = Math.max(1f, oriented.getHeight() * scale);
            float left = (320f - w) / 2f;
            float top = (320f - h) / 2f;
            canvas.drawBitmap(oriented, null, new android.graphics.RectF(left, top, left + w, top + h), new Paint(Paint.FILTER_BITMAP_FLAG));
            oriented.recycle();

            ByteArrayOutputStream baos = new ByteArrayOutputStream();
            square.compress(Bitmap.CompressFormat.JPEG, 72, baos);
            square.recycle();
            return "data:image/jpeg;base64," + Base64.encodeToString(baos.toByteArray(), Base64.NO_WRAP);
        } catch (Exception e) {
            return "";
        }
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);

        if (requestCode == TAKE_PRODUCT_IMAGE) {
            SharedPreferences prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
            File photoFile = pendingCameraFile;
            if (photoFile == null) {
                String savedPath = prefs.getString(KEY_PENDING_CAMERA_PATH, "");
                if (savedPath != null && !savedPath.isEmpty()) {
                    photoFile = new File(savedPath);
                }
            }
            pendingCameraFile = null;
            prefs.edit().remove(KEY_PENDING_CAMERA_PATH).commit();
            ValueCallback<Uri[]> chooser = pendingCameraChooser;
            pendingCameraChooser = null;

            if (chooser != null) {
                if (resultCode == RESULT_OK && photoFile != null && photoFile.exists() && photoFile.length() > 0) {
                    chooser.onReceiveValue(new Uri[]{Uri.fromFile(photoFile)});
                } else {
                    if (photoFile != null && photoFile.exists()) photoFile.delete();
                    chooser.onReceiveValue(null);
                }
                return;
            }

            if (resultCode != RESULT_OK) {
                if (photoFile != null && photoFile.exists()) photoFile.delete();
                saveCameraPendingResult("CANCELLED");
                return;
            }

            final File targetFile = photoFile;
            final Bitmap fallbackThumb = (data != null && data.getExtras() != null && data.getExtras().get("data") instanceof Bitmap)
                    ? (Bitmap) data.getExtras().get("data")
                    : null;

            if ((targetFile == null || !targetFile.exists() || targetFile.length() == 0) && fallbackThumb == null) {
                if (targetFile != null && targetFile.exists()) targetFile.delete();
                saveCameraPendingResult("ERR");
                return;
            }

            new Thread(() -> {
                String dataUrl = "";
                if (targetFile != null && targetFile.exists() && targetFile.length() > 0) {
                    dataUrl = encodeCapturedBitmap(targetFile);
                    targetFile.delete();
                } else if (fallbackThumb != null) {
                    Bitmap square = Bitmap.createBitmap(320, 320, Bitmap.Config.ARGB_8888);
                    Canvas canvas = new Canvas(square);
                    canvas.drawColor(Color.WHITE);
                    float scale = Math.min(320f / fallbackThumb.getWidth(), 320f / fallbackThumb.getHeight());
                    float w = Math.max(1f, fallbackThumb.getWidth() * scale);
                    float h = Math.max(1f, fallbackThumb.getHeight() * scale);
                    canvas.drawBitmap(fallbackThumb, null, new android.graphics.RectF((320f - w) / 2f, (320f - h) / 2f, (320f + w) / 2f, (320f + h) / 2f), new Paint(Paint.FILTER_BITMAP_FLAG));
                    ByteArrayOutputStream baos = new ByteArrayOutputStream();
                    square.compress(Bitmap.CompressFormat.JPEG, 72, baos);
                    square.recycle();
                    dataUrl = "data:image/jpeg;base64," + Base64.encodeToString(baos.toByteArray(), Base64.NO_WRAP);
                }
                saveCameraPendingResult(dataUrl.isEmpty() ? "ERR" : dataUrl);
            }).start();
            return;
        }

        if (requestCode == CHOOSE_PRODUCT_IMAGE) {
            ValueCallback<Uri[]> callback = pendingImageChooser;
            pendingImageChooser = null;
            if (callback != null) {
                Uri[] results = WebChromeClient.FileChooserParams.parseResult(resultCode, data);
                if (results == null && resultCode == RESULT_OK && data != null && data.getData() != null) {
                    results = new Uri[]{data.getData()};
                }
                callback.onReceiveValue(results);
            }
            return;
        }

        if (requestCode == CREATE_BACKUP) {
            String contents = pendingBackup;
            pendingBackup = null;
            if (resultCode != RESULT_OK || data == null || data.getData() == null || contents == null) {
                return;
            }
            try (OutputStream out = getContentResolver().openOutputStream(data.getData())) {
                if (out == null) {
                    Toast.makeText(this, "No se pudo abrir el archivo", Toast.LENGTH_SHORT).show();
                    return;
                }
                out.write(contents.getBytes(StandardCharsets.UTF_8));
                out.flush();
                Toast.makeText(this, "Copia de seguridad guardada", Toast.LENGTH_SHORT).show();
            } catch (Exception e) {
                Toast.makeText(this, "No se pudo guardar la copia", Toast.LENGTH_SHORT).show();
            }
        }
    }

    private File productImageFile(String id) {
        if (id == null || !id.matches("[A-Za-z0-9_-]{1,64}")) {
            throw new IllegalArgumentException("Identificador de producto no válido");
        }
        File dir = new File(getFilesDir(), "product-images");
        if (!dir.exists()) {
            dir.mkdirs();
        }
        return new File(dir, "product-" + id + ".jpg");
    }

    private String storeProductImage(String id, String dataUrl) {
        try {
            if (dataUrl == null || dataUrl.isEmpty()) return "";
            String base64 = dataUrl;
            int comma = dataUrl.indexOf(',');
            if (comma >= 0) {
                base64 = dataUrl.substring(comma + 1);
            }
            byte[] bytes = Base64.decode(base64, Base64.DEFAULT);
            File target = productImageFile(id);
            File tmp = new File(target.getParentFile(), target.getName() + ".tmp");
            try (FileOutputStream fos = new FileOutputStream(tmp)) {
                fos.write(bytes);
                fos.flush();
            }
            if (target.exists()) {
                target.delete();
            }
            if (!tmp.renameTo(target)) {
                return "";
            }
            return ShareFileProvider.uriForProduct(this, target).toString() + "?v=" + System.currentTimeMillis();
        } catch (Exception e) {
            return "";
        }
    }

    private String readProductImage(String id) {
        try {
            File file = productImageFile(id);
            if (!file.exists()) return "";
            ByteArrayOutputStream baos = new ByteArrayOutputStream();
            try (FileInputStream fis = new FileInputStream(file)) {
                byte[] buf = new byte[8192];
                int read;
                while ((read = fis.read(buf)) != -1) {
                    baos.write(buf, 0, read);
                }
            }
            return "data:image/jpeg;base64," + Base64.encodeToString(baos.toByteArray(), Base64.NO_WRAP);
        } catch (Exception e) {
            return "";
        }
    }

    private void createAndShareReceiptImage(String invoiceJson) {
        try {
            JSONObject invoice = new JSONObject(invoiceJson);
            Bitmap bitmap = renderInvoiceImage(invoice);
            if (bitmap == null) {
                Toast.makeText(this, "No se pudo crear la imagen. Usa Imprimir / Guardar PDF para esta nota larga.", Toast.LENGTH_LONG).show();
                return;
            }
            File dir = new File(getCacheDir(), "receipts");
            if (!dir.exists()) {
                dir.mkdirs();
            }
            String folio = invoice.optString("folio", "0001").replaceAll("[^A-Za-z0-9_-]", "");
            if (folio.isEmpty()) folio = "nota";
            File file = new File(dir, "nota-" + folio + ".png");
            try (FileOutputStream fos = new FileOutputStream(file)) {
                if (!bitmap.compress(Bitmap.CompressFormat.PNG, 100, fos)) {
                    Toast.makeText(this, "No se pudo codificar la imagen", Toast.LENGTH_SHORT).show();
                    return;
                }
                fos.flush();
            } finally {
                bitmap.recycle();
            }
            shareImage(file);
        } catch (Exception e) {
            Toast.makeText(this, "No se pudo preparar la imagen", Toast.LENGTH_SHORT).show();
        }
    }

    private void shareImage(File file) {
        try {
            Uri uri = ShareFileProvider.uriFor(this, file);
            Intent intent = new Intent(Intent.ACTION_SEND);
            intent.setType("image/png");
            intent.putExtra(Intent.EXTRA_STREAM, uri);
            intent.setClipData(ClipData.newRawUri("nota", uri));
            intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
            startActivity(Intent.createChooser(intent, "Compartir nota como imagen"));
        } catch (Exception e) {
            Toast.makeText(this, "No se pudo abrir el menú para compartir", Toast.LENGTH_SHORT).show();
        }
    }

    private Paint textPaint(float size, boolean bold, int color) {
        Paint paint = new Paint(Paint.ANTI_ALIAS_FLAG);
        paint.setTextSize(size);
        paint.setColor(color);
        if (bold) {
            paint.setTypeface(Typeface.create(Typeface.DEFAULT, Typeface.BOLD));
        }
        return paint;
    }

    private List<String> wrapText(String text, Paint paint, float maxWidth) {
        List<String> lines = new ArrayList<>();
        if (text == null || text.isEmpty()) {
            lines.add("");
            return lines;
        }
        String[] words = text.trim().split("\\s+");
        StringBuilder current = new StringBuilder();
        for (String word : words) {
            String candidate = current.length() == 0 ? word : current + " " + word;
            if (paint.measureText(candidate) <= maxWidth) {
                current.setLength(0);
                current.append(candidate);
            } else {
                if (current.length() > 0) {
                    lines.add(current.toString());
                    current.setLength(0);
                }
                current.append(word);
            }
        }
        if (current.length() > 0) {
            lines.add(current.toString());
        }
        return lines;
    }

    private int drawWrapped(Canvas canvas, String text, float x, float y, float maxWidth, Paint paint, int lineHeight) {
        List<String> lines = wrapText(text, paint, maxWidth);
        int cursor = (int) y;
        for (String line : lines) {
            canvas.drawText(line, x, cursor, paint);
            cursor += lineHeight;
        }
        return cursor;
    }

    private void drawRight(Canvas canvas, String text, float rightX, float y, Paint paint) {
        float w = paint.measureText(text);
        canvas.drawText(text, rightX - w, y, paint);
    }

    private void drawMeta(Canvas canvas, String label, String value, float left, float right, float y, Paint labelPaint, Paint valuePaint) {
        canvas.drawText(label, left, y, labelPaint);
        drawRight(canvas, value, right, y, valuePaint);
    }

    private void drawTableHeader(Canvas canvas, int left, int right, int y, Paint headerPaint, Paint linePaint) {
        canvas.drawLine(left, y - 28, right, y - 28, linePaint);
        canvas.drawText("Productos", left, y, headerPaint);
        drawRight(canvas, "Cant.", left + 530, y, headerPaint);
        drawRight(canvas, "Precio", left + 730, y, headerPaint);
        drawRight(canvas, "Valor", right, y, headerPaint);
        canvas.drawLine(left, y + 16, right, y + 16, linePaint);
    }

    private Bitmap renderInvoiceImage(JSONObject invoice) {
        int width = 960;
        int pad = 56;
        int contentWidth = width - pad * 2;

        Paint titlePaint = textPaint(40, true, Color.rgb(32, 39, 32));
        Paint subPaint = textPaint(24, false, Color.rgb(72, 81, 74));
        Paint labelPaint = textPaint(24, false, Color.rgb(76, 85, 79));
        Paint valuePaint = textPaint(24, true, Color.rgb(32, 39, 32));
        Paint headerPaint = textPaint(22, true, Color.rgb(48, 58, 51));
        Paint totalLabelPaint = textPaint(36, true, Color.rgb(32, 39, 32));
        Paint totalValuePaint = textPaint(42, true, Color.rgb(32, 39, 32));
        Paint linePaint = new Paint();
        linePaint.setColor(Color.rgb(223, 227, 223));
        linePaint.setStrokeWidth(2f);

        JSONArray items = invoice.optJSONArray("items");
        int itemCount = items != null ? items.length() : 0;
        int estimatedHeight = 620 + itemCount * 68;
        if (estimatedHeight > 6000) {
            return null;
        }

        Bitmap measureBitmap = Bitmap.createBitmap(width, estimatedHeight, Bitmap.Config.ARGB_8888);
        Canvas canvas = new Canvas(measureBitmap);
        canvas.drawColor(Color.WHITE);

        int y = 76;
        y = drawWrapped(canvas, invoice.optString("business", "Mi negocio"), pad, y, contentWidth, titlePaint, 48);
        String address = invoice.optString("address", "");
        if (!address.isEmpty()) {
            y = drawWrapped(canvas, address, pad, y + 4, contentWidth, subPaint, 32);
        }
        String phone = invoice.optString("phone", "");
        String email = invoice.optString("email", "");
        StringBuilder contact = new StringBuilder();
        if (!phone.isEmpty()) contact.append("Tel. ").append(phone);
        if (!email.isEmpty()) {
            if (contact.length() > 0) contact.append("   ·   ");
            contact.append(email);
        }
        if (contact.length() > 0) {
            y = drawWrapped(canvas, contact.toString(), pad, y + 4, contentWidth, subPaint, 32);
        }

        y += 18;
        canvas.drawLine(pad, y, width - pad, y, linePaint);
        y += 42;

        drawMeta(canvas, "Fecha", invoice.optString("date", ""), pad, width - pad, y, labelPaint, valuePaint); y += 38;
        drawMeta(canvas, "Vendedor", invoice.optString("seller", "—"), pad, width - pad, y, labelPaint, valuePaint); y += 38;
        drawMeta(canvas, "Método de pago", invoice.optString("payment", "—"), pad, width - pad, y, labelPaint, valuePaint); y += 38;
        drawMeta(canvas, "Estado", invoice.optString("status", "Pagada"), pad, width - pad, y, labelPaint, valuePaint); y += 38;
        drawMeta(canvas, "Número de transacción", invoice.optString("folio", "0001"), pad, width - pad, y, labelPaint, valuePaint); y += 38;
        String customer = invoice.optString("customer", "");
        if (!customer.isEmpty()) {
            drawMeta(canvas, "Cliente", customer, pad, width - pad, y, labelPaint, valuePaint);
            y += 38;
        }

        y += 26;
        drawTableHeader(canvas, pad, width - pad, y, headerPaint, linePaint);
        y += 46;

        if (items != null) {
            for (int i = 0; i < items.length(); i++) {
                JSONObject item = items.optJSONObject(i);
                if (item == null) continue;
                String product = item.optString("product", "Producto");
                String qty = item.optString("qty", "1");
                String unitPrice = item.optString("unitPrice", "");
                String total = item.optString("total", "");

                int nextY = drawWrapped(canvas, product, pad, y, 420, subPaint, 32);
                drawRight(canvas, qty, pad + 530, y, subPaint);
                drawRight(canvas, unitPrice, pad + 730, y, subPaint);
                drawRight(canvas, total, width - pad, y, valuePaint);
                y = Math.max(nextY, y + 32) + 14;
                canvas.drawLine(pad, y - 8, width - pad, y - 8, linePaint);
            }
        }

        y += 34;
        canvas.drawText("Total:", pad, y, totalLabelPaint);
        drawRight(canvas, invoice.optString("total", "$0"), width - pad, y, totalValuePaint);

        String pending = invoice.optString("pending", "");
        if (!pending.isEmpty()) {
            y += 40;
            drawMeta(canvas, "Pagado " + invoice.optString("paid", "$0"), "Saldo pendiente " + pending, pad, width - pad, y, labelPaint, valuePaint);
        }

        int finalHeight = Math.min(estimatedHeight, y + 60);
        Bitmap cropped = Bitmap.createBitmap(measureBitmap, 0, 0, width, finalHeight);
        measureBitmap.recycle();
        return cropped;
    }

    private class NotasBridge {
        @JavascriptInterface
        public String loadState() {
            SharedPreferences prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
            return prefs.getString(KEY_STATE, "");
        }

        @JavascriptInterface
        public void saveState(String value) {
            SharedPreferences prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
            prefs.edit().putString(KEY_STATE, value != null ? value : "").apply();
        }

        @JavascriptInterface
        public String saveProductImage(String id, String dataUrl) {
            return storeProductImage(id, dataUrl);
        }

        @JavascriptInterface
        public String loadProductImage(String id) {
            return readProductImage(id);
        }

        @JavascriptInterface
        public boolean removeProductImage(String id) {
            try {
                File file = productImageFile(id);
                return !file.exists() || file.delete();
            } catch (Exception e) {
                return false;
            }
        }

        @JavascriptInterface
        public void takeProductPhoto() {
            runOnUiThread(() -> launchNativeCamera(null));
        }

        @JavascriptInterface
        public String consumePendingCameraPhoto() {
            SharedPreferences prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
            String result = prefs.getString(KEY_PENDING_CAMERA_DATA, "");
            if (result != null && !result.isEmpty()) {
                prefs.edit().remove(KEY_PENDING_CAMERA_DATA).commit();
                return result;
            }
            return "";
        }

        @JavascriptInterface
        public void saveTempDraft(String value) {
            SharedPreferences prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
            if (value == null || value.isEmpty()) {
                prefs.edit().remove(KEY_TEMP_DRAFT).commit();
            } else {
                prefs.edit().putString(KEY_TEMP_DRAFT, value).commit();
            }
        }

        @JavascriptInterface
        public String loadTempDraft() {
            SharedPreferences prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
            return prefs.getString(KEY_TEMP_DRAFT, "");
        }

        @JavascriptInterface
        public void saveBackup(String contents) {
            runOnUiThread(() -> {
                pendingBackup = contents;
                Intent intent = new Intent(Intent.ACTION_CREATE_DOCUMENT);
                intent.addCategory(Intent.CATEGORY_OPENABLE);
                intent.setType("application/json");
                intent.putExtra(Intent.EXTRA_TITLE, "notas-respaldo.json");
                startActivityForResult(intent, CREATE_BACKUP);
            });
        }

        @JavascriptInterface
        public void shareText(String text) {
            runOnUiThread(() -> {
                try {
                    Intent intent = new Intent(Intent.ACTION_SEND);
                    intent.setType("text/plain");
                    intent.putExtra(Intent.EXTRA_TEXT, text);
                    startActivity(Intent.createChooser(intent, "Compartir"));
                } catch (Exception e) {
                    Toast.makeText(MainActivity.this, "No se pudo abrir el menú para compartir", Toast.LENGTH_SHORT).show();
                }
            });
        }

        @JavascriptInterface
        public void shareReceiptImage(String invoiceJson) {
            runOnUiThread(() -> createAndShareReceiptImage(invoiceJson));
        }

        @JavascriptInterface
        public void printPage() {
            runOnUiThread(() -> {
                PrintManager printManager = (PrintManager) getSystemService(Context.PRINT_SERVICE);
                if (printManager != null && webView != null) {
                    printManager.print("Notas - comprobante", webView.createPrintDocumentAdapter("Notas - comprobante"), null);
                }
            });
        }

        @JavascriptInterface
        public String getAppVersion() {
            SharedPreferences prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
            int otaCode = prefs.getInt(KEY_OTA_CODE, 0);
            File otaIndex = new File(new File(getFilesDir(), "www"), "index.html");
            String webVer = (otaCode >= BUNDLED_VERSION_CODE && otaIndex.exists())
                    ? prefs.getString(KEY_OTA_WEB, BUNDLED_VERSION_NAME)
                    : BUNDLED_VERSION_NAME;
            return "{\"versionCode\":" + BUNDLED_VERSION_CODE + ",\"versionName\":\"" + BUNDLED_VERSION_NAME + "\",\"webVersion\":\"" + webVer + "\",\"platform\":\"android\"}";
        }

        @JavascriptInterface
        public void applyWebUpdate(String baseUrl, int targetVersionCode, String targetWebVersion) {
            if (baseUrl == null || !baseUrl.startsWith("https://")) {
                runOnUiThread(() -> Toast.makeText(MainActivity.this, "URL de actualización no válida", Toast.LENGTH_SHORT).show());
                return;
            }
            String normalized = baseUrl.endsWith("/") ? baseUrl : baseUrl + "/";
            new Thread(() -> {
                File staging = new File(getFilesDir(), "www_staging");
                File target = new File(getFilesDir(), "www");
                try {
                    deleteRecursive(staging);
                    staging.mkdirs();
                    String[] files = {"index.html", "styles.css", "app.js", "manifest.webmanifest", "version.json", "icon.svg", "icon-180.png", "icon-192.png", "icon-512.png"};
                    for (String name : files) {
                        downloadToFile(normalized + name, new File(staging, name));
                    }
                    deleteRecursive(target);
                    if (!staging.renameTo(target)) {
                        throw new IllegalStateException("No se pudo activar la actualización");
                    }
                    getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
                            .edit()
                            .putInt(KEY_OTA_CODE, Math.max(targetVersionCode, BUNDLED_VERSION_CODE))
                            .putString(KEY_OTA_WEB, targetWebVersion != null ? targetWebVersion : BUNDLED_VERSION_NAME)
                            .apply();
                    runOnUiThread(() -> {
                        Toast.makeText(MainActivity.this, "Notas actualizada a v" + targetWebVersion, Toast.LENGTH_SHORT).show();
                        if (webView != null) {
                            webView.loadUrl(resolveStartUrl());
                        }
                    });
                } catch (Exception e) {
                    deleteRecursive(staging);
                    runOnUiThread(() -> Toast.makeText(MainActivity.this, "No se pudo descargar la actualización", Toast.LENGTH_SHORT).show());
                }
            }).start();
        }

        @JavascriptInterface
        public void installApkUpdate(String apkUrl) {
            if (apkUrl == null || !apkUrl.startsWith("https://")) {
                runOnUiThread(() -> Toast.makeText(MainActivity.this, "Enlace de APK no válido", Toast.LENGTH_SHORT).show());
                return;
            }
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && !getPackageManager().canRequestPackageInstalls()) {
                runOnUiThread(() -> {
                    Toast.makeText(MainActivity.this, "Permite instalar actualizaciones de Notas y vuelve a intentarlo", Toast.LENGTH_LONG).show();
                    Intent permIntent = new Intent(android.provider.Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES, Uri.parse("package:" + getPackageName()));
                    startActivity(permIntent);
                });
                return;
            }
            runOnUiThread(() -> Toast.makeText(MainActivity.this, "Descargando nueva versión…", Toast.LENGTH_SHORT).show());
            new Thread(() -> {
                try {
                    File dir = new File(getCacheDir(), "updates");
                    if (!dir.exists()) dir.mkdirs();
                    File apkFile = new File(dir, "notas-update.apk");
                    downloadToFile(apkUrl, apkFile);
                    Uri apkUri = ShareFileProvider.uriForUpdate(MainActivity.this, apkFile);
                    runOnUiThread(() -> {
                        Intent intent = new Intent(Intent.ACTION_VIEW);
                        intent.setDataAndType(apkUri, "application/vnd.android.package-archive");
                        intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_ACTIVITY_NEW_TASK);
                        startActivity(intent);
                    });
                } catch (Exception e) {
                    runOnUiThread(() -> Toast.makeText(MainActivity.this, "Error al descargar el APK", Toast.LENGTH_SHORT).show());
                }
            }).start();
        }
    }
}
