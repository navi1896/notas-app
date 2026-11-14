package com.notas.app;

import android.content.ContentProvider;
import android.content.ContentValues;
import android.content.Context;
import android.database.Cursor;
import android.database.MatrixCursor;
import android.net.Uri;
import android.os.ParcelFileDescriptor;
import android.provider.OpenableColumns;

import java.io.File;
import java.io.FileNotFoundException;
import java.util.List;

public class ShareFileProvider extends ContentProvider {
    public static final String AUTHORITY = "com.notas.app.share";

    public static Uri uriFor(Context context, File file) {
        return new Uri.Builder()
                .scheme("content")
                .authority(AUTHORITY)
                .appendPath("receipts")
                .appendPath(file.getName())
                .build();
    }

    public static Uri uriForProduct(Context context, File file) {
        return new Uri.Builder()
                .scheme("content")
                .authority(AUTHORITY)
                .appendPath("product-images")
                .appendPath(file.getName())
                .build();
    }

    public static Uri uriForUpdate(Context context, File file) {
        return new Uri.Builder()
                .scheme("content")
                .authority(AUTHORITY)
                .appendPath("updates")
                .appendPath(file.getName())
                .build();
    }

    public static Uri uriForCamera(Context context, File file) {
        return new Uri.Builder()
                .scheme("content")
                .authority(AUTHORITY)
                .appendPath("camera")
                .appendPath(file.getName())
                .build();
    }

    @Override
    public boolean onCreate() {
        return true;
    }

    private File resolve(Uri uri, boolean allowMissing) throws FileNotFoundException {
        Context context = getContext();
        if (context == null || uri == null) {
            throw new FileNotFoundException("Ruta de archivo no válida");
        }
        List<String> segments = uri.getPathSegments();
        if (segments.size() != 2) {
            throw new FileNotFoundException("Ruta de archivo no válida");
        }

        String folder = segments.get(0);
        String name = segments.get(1);
        File dir;

        if ("receipts".equals(folder)) {
            if (!name.matches("nota-[A-Za-z0-9_-]+\\.png")) {
                throw new FileNotFoundException("Nombre de archivo no válido");
            }
            dir = new File(context.getCacheDir(), "receipts");
        } else if ("product-images".equals(folder)) {
            if (!name.matches("product-[A-Za-z0-9_-]{1,64}\\.jpg")) {
                throw new FileNotFoundException("Nombre de archivo no válido");
            }
            dir = new File(context.getFilesDir(), "product-images");
        } else if ("updates".equals(folder)) {
            if (!name.matches("[A-Za-z0-9_-]{1,64}\\.apk")) {
                throw new FileNotFoundException("Nombre de archivo no válido");
            }
            dir = new File(context.getCacheDir(), "updates");
        } else if ("camera".equals(folder)) {
            if (!name.matches("capture-[A-Za-z0-9_-]{1,64}\\.jpg")) {
                throw new FileNotFoundException("Nombre de archivo no válido");
            }
            dir = new File(context.getCacheDir(), "camera");
            if (allowMissing && !dir.exists()) {
                dir.mkdirs();
            }
        } else {
            throw new FileNotFoundException("Ruta de archivo no válida");
        }

        File target = new File(dir, name);
        if (!allowMissing && (!target.exists() || !target.isFile())) {
            throw new FileNotFoundException("Archivo no encontrado");
        }
        return target;
    }

    @Override
    public ParcelFileDescriptor openFile(Uri uri, String mode) throws FileNotFoundException {
        boolean isCamera = uri != null && uri.getPathSegments().size() == 2 && "camera".equals(uri.getPathSegments().get(0));
        if (!isCamera && !"r".equals(mode)) {
            throw new SecurityException("Solo lectura");
        }
        boolean writeMode = isCamera && mode != null && mode.contains("w");
        int pfdMode = ParcelFileDescriptor.parseMode(mode != null ? mode : "r");
        return ParcelFileDescriptor.open(resolve(uri, writeMode), pfdMode);
    }

    @Override
    public Cursor query(Uri uri, String[] projection, String selection, String[] selectionArgs, String sortOrder) {
        try {
            File file = resolve(uri, false);
            String[] cols = projection != null ? projection : new String[]{OpenableColumns.DISPLAY_NAME, OpenableColumns.SIZE};
            MatrixCursor cursor = new MatrixCursor(cols, 1);
            Object[] row = new Object[cols.length];
            for (int i = 0; i < cols.length; i++) {
                if (OpenableColumns.DISPLAY_NAME.equals(cols[i])) {
                    row[i] = file.getName();
                } else if (OpenableColumns.SIZE.equals(cols[i])) {
                    row[i] = file.length();
                }
            }
            cursor.addRow(row);
            return cursor;
        } catch (FileNotFoundException e) {
            return null;
        }
    }

    @Override
    public String getType(Uri uri) {
        String path = uri != null ? uri.getLastPathSegment() : null;
        if (path != null && path.endsWith(".jpg")) {
            return "image/jpeg";
        }
        if (path != null && path.endsWith(".apk")) {
            return "application/vnd.android.package-archive";
        }
        return "image/png";
    }

    @Override
    public Uri insert(Uri uri, ContentValues values) {
        throw new UnsupportedOperationException("Solo lectura");
    }

    @Override
    public int delete(Uri uri, String selection, String[] selectionArgs) {
        throw new UnsupportedOperationException("Solo lectura");
    }

    @Override
    public int update(Uri uri, ContentValues values, String selection, String[] selectionArgs) {
        throw new UnsupportedOperationException("Solo lectura");
    }
}
