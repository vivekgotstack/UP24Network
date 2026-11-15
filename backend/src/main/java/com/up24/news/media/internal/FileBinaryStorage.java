package com.up24.news.media.internal;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import java.io.IOException;
import java.nio.file.*;

@Component
class FileBinaryStorage implements BinaryStorage {
    private final Path directory;
    FileBinaryStorage(@Value("${up24.media.directory}") String directory) { this.directory=Path.of(directory).toAbsolutePath().normalize(); }
    @Override public Path path(String id) {
        if (!id.matches("[a-f0-9]{64}")) throw new IllegalArgumentException("Invalid image identifier");
        return directory.resolve(id+".webp");
    }
    @Override public void put(String id,byte[] bytes) throws IOException {
        Files.createDirectories(directory);
        var target=path(id);
        if (Files.exists(target)) return;
        var temporary=Files.createTempFile(directory,"upload-",".tmp");
        try {
            Files.write(temporary,bytes);
            try { Files.move(temporary,target,StandardCopyOption.ATOMIC_MOVE); }
            catch (AtomicMoveNotSupportedException ignored) { Files.move(temporary,target); }
            catch (FileAlreadyExistsException ignored) { /* A concurrent identical upload won. */ }
        } finally { Files.deleteIfExists(temporary); }
    }
    @Override public void delete(String id) throws IOException { Files.deleteIfExists(path(id)); }
}
