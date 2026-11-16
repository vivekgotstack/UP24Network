package com.up24.news.media.internal;

import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.*;
import java.io.IOException;
import java.util.Base64;
import java.util.HexFormat;

final class S3BinaryStorage implements BinaryStorage {
    private final S3Client client;
    private final S3Settings settings;
    S3BinaryStorage(S3Client client,S3Settings settings) { this.client=client;this.settings=settings; }
    @Override public String backend() { return "S3"; }
    @Override public StorageLocation target(String id) {
        if(!id.matches("[a-f0-9]{64}")) throw new IllegalArgumentException("Invalid media identifier.");
        return new StorageLocation("S3",settings.bucket(),settings.prefix()+id+".webp");
    }
    private void validate(StorageLocation location) {
        if(!location.backend().equals("S3") || !location.bucket().equals(settings.bucket()) || !location.key().startsWith(settings.prefix()))
            throw new MediaProblem(MediaProblem.Reason.STORAGE,"This media location requires its original S3 bucket configuration.");
    }
    @Override public void put(StorageLocation location,byte[] bytes) throws IOException {
        validate(location);
        String id=location.key().substring(location.key().lastIndexOf('/')+1).replace(".webp","");
        try {
            client.putObject(PutObjectRequest.builder().bucket(location.bucket()).key(location.key()).contentType("image/webp")
                    .contentLength((long)bytes.length).storageClass(StorageClass.STANDARD).ifNoneMatch("*")
                    .checksumSHA256(Base64.getEncoder().encodeToString(HexFormat.of().parseHex(id)))
                    .cacheControl("public,max-age=31536000,immutable").tagging("up24-retention=gir-eligible").build(),RequestBody.fromBytes(bytes));
        } catch(S3Exception exception) {
            // Content-addressed keys are immutable. An earlier identical write may
            // survive a DB rollback; verify it before reusing it.
            if(exception.statusCode()==412) {
                try {
                    var existing=client.headObject(HeadObjectRequest.builder().bucket(location.bucket()).key(location.key())
                            .checksumMode(ChecksumMode.ENABLED).build());
                    if(existing.contentLength()==bytes.length && Base64.getEncoder().encodeToString(HexFormat.of().parseHex(id)).equals(existing.checksumSHA256())) return;
                } catch(RuntimeException ignored) { }
            }
            throw new IOException("S3 upload could not be completed.");
        } catch(RuntimeException exception) { throw new IOException("S3 upload could not be completed."); }
    }
    @Override public Delivery delivery(StorageLocation location) { validate(location);return new Delivery(null,settings.address(location.key())); }
    @Override public void delete(StorageLocation location) throws IOException {
        validate(location);
        try { client.deleteObject(DeleteObjectRequest.builder().bucket(location.bucket()).key(location.key()).build()); }
        catch(RuntimeException exception) { throw new IOException("S3 removal could not be completed."); }
    }
    void eligibility(StorageLocation location,boolean eligible) {
        validate(location);
        // Preserve unrelated tags; the UP24 key alone controls the managed rule.
        var current=client.getObjectTagging(GetObjectTaggingRequest.builder().bucket(location.bucket()).key(location.key()).build());
        var tags=new java.util.ArrayList<>(current.tagSet().stream().filter(tag -> !tag.key().equals("up24-retention")).toList());
        tags.add(Tag.builder().key("up24-retention").value(eligible?"gir-eligible":"excluded").build());
        client.putObjectTagging(PutObjectTaggingRequest.builder().bucket(location.bucket()).key(location.key())
                .tagging(Tagging.builder().tagSet(tags).build()).build());
    }
    S3Client client() { return client; }
    S3Settings settings() { return settings; }
}
