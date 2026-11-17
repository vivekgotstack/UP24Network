package com.up24.news.media.internal;

import org.springframework.stereotype.Component;
import java.io.*;
import java.nio.file.*;
import java.util.Map;
import java.util.UUID;

@Component
class LocalVideoObjects implements VideoObjects {
    private final VideoSettings settings;
    LocalVideoObjects(VideoSettings settings) { this.settings=settings; }
    @Override public String backend() { return "LOCAL"; }
    @Override public StorageLocation source(UUID id) { return new StorageLocation("LOCAL","",".video-work/"+id+"/original.mp4"); }
    @Override public SignedUpload signedUpload(StorageLocation source,long bytes) { return new SignedUpload("",Map.of()); }
    private Path path(StorageLocation location) {
        if(!location.backend().equals("LOCAL") || !location.bucket().isEmpty()
                || !location.key().matches("(?:\\.video-work/[a-f0-9-]{36}/original|videos/[a-f0-9-]{36}/[a-f0-9]{64})\\.mp4"))
            throw new IllegalArgumentException("Invalid video object location.");
        Path value=settings.directory.resolve(location.key()).normalize();
        if(!value.startsWith(settings.directory)) throw new IllegalArgumentException("Invalid video path.");
        return value;
    }
    @Override public void receive(UUID id,InputStream input,long expected) throws IOException {
        Path target=path(source(id));Files.createDirectories(target.getParent());
        if(Files.isRegularFile(target)) throw new IOException("The video source was already uploaded.");
        if(Files.getFileStore(target.getParent()).getUsableSpace()<expected+67108864) throw new IOException("Insufficient staging space.");
        Path temporary=Files.createTempFile(target.getParent(),"upload-",".tmp");
        try {
            try(var output=Files.newOutputStream(temporary)) { copy(input,output,expected); }
            try { Files.move(temporary,target,StandardCopyOption.ATOMIC_MOVE); }
            catch(AtomicMoveNotSupportedException exception) { Files.move(temporary,target); }
        } finally { Files.deleteIfExists(temporary); }
    }
    static void copy(InputStream input,OutputStream output,long expected) throws IOException {
        byte[] buffer=new byte[65536];long written=0;
        for(int count;(count=input.read(buffer))!=-1;) { written+=count;if(written>expected) throw new IOException("Video upload exceeded its reserved length.");output.write(buffer,0,count); }
        if(written!=expected) throw new IOException("The video upload was incomplete.");
    }
    @Override public void verifySource(VideoStore.Stored video) throws IOException {
        if(!Files.isRegularFile(path(video.source())) || Files.size(path(video.source()))!=video.view().originalBytes()) throw new IOException("Upload the complete video before submitting it.");
    }
    @Override public Path materialize(VideoStore.Stored video,UUID token) throws IOException { verifySource(video);return path(video.source()); }
    @Override public StorageLocation publish(UUID id,Path encoded,String checksum) throws IOException {
        var location=new StorageLocation("LOCAL","","videos/"+id+"/"+checksum+".mp4");
        Path target=path(location);Files.createDirectories(target.getParent());
        if(!Files.exists(target)) {
            Path temporary=Files.createTempFile(target.getParent(),"encoded-",".tmp");
            try { Files.copy(encoded,temporary,StandardCopyOption.REPLACE_EXISTING);Files.move(temporary,target,StandardCopyOption.REPLACE_EXISTING); }
            finally { Files.deleteIfExists(temporary); }
        }
        return location;
    }
    @Override public BinaryStorage.Delivery delivery(StorageLocation location) { return new BinaryStorage.Delivery(path(location),null); }
    @Override public void delete(StorageLocation location) throws IOException { Files.deleteIfExists(path(location)); }
}
