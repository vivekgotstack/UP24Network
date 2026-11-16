package com.up24.news.media.internal;

import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Primary;
import org.springframework.core.env.Environment;
import org.springframework.core.env.Profiles;
import org.springframework.stereotype.Component;
import java.io.IOException;

/** Routes each persisted location to its provider, including pre-S3 local files. */
@Component
@Primary
class MediaStorage implements BinaryStorage {
    private final FileBinaryStorage local;
    private final ObjectProvider<S3BinaryStorage> s3;
    private final String backend;
    MediaStorage(FileBinaryStorage local,ObjectProvider<S3BinaryStorage> s3,Environment environment,
            @Value("${up24.media.storage:local}") String configured) {
        if(!configured.equalsIgnoreCase("local") && !configured.equalsIgnoreCase("s3")) throw new IllegalStateException("UP24_MEDIA_STORAGE must be local or s3.");
        this.local=local;this.s3=s3;
        backend=environment.acceptsProfiles(Profiles.of("local-preview"))?"LOCAL":configured.toUpperCase(java.util.Locale.ROOT);
    }
    @Override public String backend() { return backend; }
    private BinaryStorage provider(String backend) {
        if(backend.equals("LOCAL")) return local;
        var cloud=s3.getIfAvailable();
        if(cloud==null) throw new MediaProblem(MediaProblem.Reason.STORAGE,"S3 media storage is not configured on this server.");
        return cloud;
    }
    @Override public StorageLocation target(String id) { return provider(backend).target(id); }
    @Override public void put(StorageLocation location,byte[] bytes) throws IOException { provider(location.backend()).put(location,bytes); }
    @Override public Delivery delivery(StorageLocation location) throws IOException { return provider(location.backend()).delivery(location); }
    @Override public void delete(StorageLocation location) throws IOException { provider(location.backend()).delete(location); }
}
