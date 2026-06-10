package com.oxid.feathera;

import android.content.Intent;
import android.net.Uri;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "PersistPermission")
public class PersistPermissionPlugin extends Plugin {

    @PluginMethod
    public void takePermission(PluginCall call) {
        String uriString = call.getString("uri");
        if (uriString == null) {
            call.reject("URI kosong");
            return;
        }

        try {
            Uri uri = Uri.parse(uriString);
            // Meminta Android agar izin akses file ini dijadikan permanen
            int takeFlags = Intent.FLAG_GRANT_READ_URI_PERMISSION;
            getContext().getContentResolver().takePersistableUriPermission(uri, takeFlags);
            
            call.resolve();
        } catch (Exception e) {
            call.reject("Gagal mengunci file: " + e.getMessage());
        }
    }
}
