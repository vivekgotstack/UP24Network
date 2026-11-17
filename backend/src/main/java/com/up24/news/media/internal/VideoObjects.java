package com.up24.news.media.internal;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Path;
import java.util.Map;
import java.util.UUID;

interface VideoObjects {
    record SignedUpload(String url,Map<String,String> headers) {}
    String backend();
    StorageLocation source(UUID id);
    SignedUpload signedUpload(StorageLocation source,long bytes);
    void receive(UUID id,InputStream input,long expectedBytes) throws IOException;
    void verifySource(VideoStore.Stored video) throws IOException;
    Path materialize(VideoStore.Stored video,UUID token) throws IOException;
    StorageLocation publish(UUID id,Path encoded,String checksum) throws IOException;
    BinaryStorage.Delivery delivery(StorageLocation location);
    void delete(StorageLocation location) throws IOException;
}
