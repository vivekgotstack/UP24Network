package com.up24.news.media.internal;

record StorageLocation(String backend,String bucket,String key) {
    StorageLocation {
        if(!backend.equals("LOCAL") && !backend.equals("S3")) throw new IllegalArgumentException("Unsupported storage backend.");
        if(bucket==null || key==null || key.isBlank() || key.length()>500 || key.startsWith("/") || key.contains("..")
                || !key.matches("[a-zA-Z0-9._/-]+")) throw new IllegalArgumentException("Invalid media storage location.");
    }
}
