package com.up24.news.media.internal;

import java.io.IOException;
import java.nio.file.Path;
import java.net.URI;

interface BinaryStorage {
    record Delivery(Path file,URI redirect) {}
    String backend();
    StorageLocation target(String id);
    void put(StorageLocation location,byte[] bytes) throws IOException;
    Delivery delivery(StorageLocation location) throws IOException;
    void delete(StorageLocation location) throws IOException;
}
