package com.up24.news.media.internal;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import java.io.IOException;
import java.nio.file.*;

@Component
class FileBinaryStorage implements BinaryStorage {
    private final Path directory;
    FileBinaryStorage(@Value("${up24.media.directory}") String directory) { this.directory=Path.of(directory).toAbsolutePath().normalize(); }
    @Override public String backend() { return "LOCAL"; }
    @Override public StorageLocation target(String id) {
        if (!id.matches("[a-f0-9]{64}")) throw new IllegalArgumentException("Invalid image identifier");
        return new StorageLocation("LOCAL","",id+".webp");
    }
    private Path path(StorageLocation location) {
        if(!location.backend().equals("LOCAL") || !location.bucket().isEmpty() || !location.key().matches("[a-f0-9]{64}\\.webp"))
            throw new IllegalArgumentException("Invalid local media location.");
        return directory.resolve(location.key());
    }
    @Override public Delivery delivery(StorageLocation location) { return new Delivery(path(location),null); }
    @Override public void put(StorageLocation location,byte[] bytes) throws IOException {
        Files.createDirectories(directory);
        var target=path(location);
        if (Files.exists(target)) return;
        var temporary=Files.createTempFile(directory,"upload-",".tmp");
        try {
            Files.write(temporary,bytes);
            try { Files.move(temporary,target,StandardCopyOption.ATOMIC_MOVE); }
            catch (AtomicMoveNotSupportedException ignored) { Files.move(temporary,target); }
            catch (FileAlreadyExistsException ignored) { /* A concurrent identical upload won. */ }
        } finally { Files.deleteIfExists(temporary); }
    }
    @Override public void delete(StorageLocation location) throws IOException { Files.deleteIfExists(path(location)); }
}
