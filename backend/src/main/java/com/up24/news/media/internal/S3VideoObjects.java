package com.up24.news.media.internal;

import org.springframework.beans.factory.ObjectProvider;
import org.springframework.stereotype.Component;
import software.amazon.awssdk.auth.credentials.AwsCredentialsProvider;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.http.urlconnection.UrlConnectionHttpClient;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.retries.StandardRetryStrategy;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.*;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.services.s3.presigner.model.PutObjectPresignRequest;
import java.io.*;
import java.nio.file.*;
import java.time.Duration;
import java.util.*;

@Component
class S3VideoObjects implements VideoObjects,AutoCloseable {
    private final S3Client client;
    private final S3Presigner signer;
    private final S3Settings cloud;
    private final VideoSettings settings;
    S3VideoObjects(ObjectProvider<S3Settings> cloud,ObjectProvider<AwsCredentialsProvider> credentials,VideoSettings settings) {
        this.cloud=cloud.getIfAvailable();this.settings=settings;
        var provider=credentials.getIfAvailable();
        if(this.cloud==null || provider==null) { client=null;signer=null;return; }
        this.cloud.validate();
        client=S3Client.builder().region(Region.of(this.cloud.region())).credentialsProvider(provider)
                .serviceConfiguration(software.amazon.awssdk.services.s3.S3Configuration.builder().pathStyleAccessEnabled(this.cloud.bucket().contains(".")).build())
                .httpClientBuilder(UrlConnectionHttpClient.builder().connectionTimeout(Duration.ofSeconds(5)).socketTimeout(Duration.ofSeconds(30)))
                .overrideConfiguration(config->config.apiCallTimeout(Duration.ofMinutes(5)).apiCallAttemptTimeout(Duration.ofMinutes(3))
                        .retryStrategy(StandardRetryStrategy.builder().maxAttempts(2).build())).build();
        signer=S3Presigner.builder().region(Region.of(this.cloud.region())).credentialsProvider(provider)
                .serviceConfiguration(software.amazon.awssdk.services.s3.S3Configuration.builder().pathStyleAccessEnabled(this.cloud.bucket().contains(".")).build()).build();
    }
    private void configured() { if(client==null) throw new MediaProblem(MediaProblem.Reason.STORAGE,"S3 video storage is not configured."); }
    private void valid(StorageLocation location) {
        configured();
        if(!location.backend().equals("S3") || !location.bucket().equals(cloud.bucket())
                || !(location.key().startsWith(cloud.videoPrefix()) || location.key().startsWith(cloud.stagingPrefix())))
            throw new MediaProblem(MediaProblem.Reason.STORAGE,"This video needs its original S3 bucket configuration.");
    }
    @Override public String backend() { return "S3"; }
    @Override public StorageLocation source(UUID id) { configured();return new StorageLocation("S3",cloud.bucket(),cloud.stagingPrefix()+id+".mp4"); }
    @Override public SignedUpload signedUpload(StorageLocation source,long bytes) {
        valid(source);
        var request=signer.presignPutObject(PutObjectPresignRequest.builder().signatureDuration(Duration.ofMinutes(15))
                .putObjectRequest(PutObjectRequest.builder().bucket(source.bucket()).key(source.key()).contentLength(bytes).contentType("video/mp4")
                        .ifNoneMatch("*").build()).build());
        var headers=new LinkedHashMap<String,String>();
        request.signedHeaders().forEach((name,values)->{
            // The browser supplies these two headers from the destination and File size.
            if(!name.equalsIgnoreCase("host") && !name.equalsIgnoreCase("content-length")) headers.put(name,String.join(",",values));
        });
        return new SignedUpload(request.url().toString(),Map.copyOf(headers));
    }
    @Override public void receive(UUID id,InputStream input,long expected) { throw new MediaProblem(MediaProblem.Reason.INVALID,"Use the signed direct upload URL for S3 video sources."); }
    @Override public void verifySource(VideoStore.Stored video) throws IOException {
        valid(video.source());
        try {
            var result=client.headObject(HeadObjectRequest.builder().bucket(video.source().bucket()).key(video.source().key()).build());
            if(result.contentLength()!=video.view().originalBytes()) throw new IOException("The video source size does not match the reserved upload.");
        } catch(RuntimeException exception) { throw new IOException("The complete S3 source could not be verified."); }
    }
    @Override public Path materialize(VideoStore.Stored video,UUID token) throws IOException {
        verifySource(video);Path directory=settings.work(video.view().id());Files.createDirectories(directory);
        if(Files.getFileStore(directory).getUsableSpace()<video.view().originalBytes()+settings.maxUploadBytes+67108864) throw new IOException("Insufficient video processing space.");
        Path target=directory.resolve("source-"+token+".mp4");
        try(var input=client.getObject(GetObjectRequest.builder().bucket(video.source().bucket()).key(video.source().key()).build());var output=Files.newOutputStream(target)) {
            LocalVideoObjects.copy(input,output,video.view().originalBytes());return target;
        } catch(RuntimeException|IOException exception) { Files.deleteIfExists(target);throw new IOException("The private video source could not be downloaded."); }
    }
    @Override public StorageLocation publish(UUID id,Path encoded,String checksum) throws IOException {
        configured();var output=new StorageLocation("S3",cloud.bucket(),cloud.videoPrefix()+id+"/"+checksum+".mp4");
        try {
            client.putObject(PutObjectRequest.builder().bucket(output.bucket()).key(output.key()).contentType("video/mp4").contentLength(Files.size(encoded))
                    .storageClass(StorageClass.STANDARD).checksumSHA256(Base64.getEncoder().encodeToString(HexFormat.of().parseHex(checksum)))
                    .cacheControl("public,max-age=31536000,immutable").tagging("up24-retention=gir-eligible").ifNoneMatch("*").build(),RequestBody.fromFile(encoded));
            return output;
        } catch(S3Exception exception) {
            if(exception.statusCode()==412) {
                var existing=client.headObject(HeadObjectRequest.builder().bucket(output.bucket()).key(output.key()).checksumMode(ChecksumMode.ENABLED).build());
                if(existing.contentLength()==Files.size(encoded) && Base64.getEncoder().encodeToString(HexFormat.of().parseHex(checksum)).equals(existing.checksumSHA256())) return output;
            }
            throw new IOException("The encoded video could not be stored in S3.");
        } catch(RuntimeException exception) { throw new IOException("The encoded video could not be stored in S3."); }
    }
    @Override public BinaryStorage.Delivery delivery(StorageLocation location) { valid(location);return new BinaryStorage.Delivery(null,cloud.address(location.key())); }
    @Override public void delete(StorageLocation location) throws IOException {
        valid(location);
        try { client.deleteObject(DeleteObjectRequest.builder().bucket(location.bucket()).key(location.key()).build()); }
        catch(RuntimeException exception) { throw new IOException("The S3 video object could not be removed."); }
    }
    @Override public void close() { if(signer!=null) signer.close();if(client!=null) client.close(); }
}
