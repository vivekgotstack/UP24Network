package com.up24.news.media.internal;

import java.io.IOException;
import java.nio.file.Path;

interface BinaryStorage {
    void put(String id,byte[] bytes) throws IOException;
    Path path(String id);
    void delete(String id) throws IOException;
}
